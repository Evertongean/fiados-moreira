import { AppDatabaseError, mapDatabaseError } from '@/database/errors/DatabaseError';
import type { VehicleRow } from '@/database/schema';
import type { SqlExecutor } from '@/database/types/executor';
import {
  createVehicleSchema,
  updateVehicleSchema,
  type CreateVehicleInput,
  type NormalizedVehicleInput,
  type UpdateVehicleInput,
} from '@/features/vehicles/domain/vehicleSchemas';
import type {
  PotentialVehicleDuplicate,
  VehicleListFilters,
} from '@/features/vehicles/domain/vehicleTypes';
import { vehicleMatchesQuery } from '@/features/vehicles/domain/vehicleUtils';
import { createUuid } from '@/utils/uuid';

const SELECT = `select id, workspace_id as workspaceId, customer_id as customerId, type,
  brand, model, year, plate, color, notes, created_at as createdAt, updated_at as updatedAt,
  archived_at as archivedAt, deleted_at as deletedAt from vehicles`;

export class VehicleRepository {
  constructor(private readonly executor: SqlExecutor) {}

  create(workspaceId: string, input: CreateVehicleInput): Promise<VehicleRow> {
    return this.insertWithId(workspaceId, createUuid(), input);
  }

  async insertWithId(
    workspaceId: string,
    id: string,
    input: CreateVehicleInput | NormalizedVehicleInput,
  ): Promise<VehicleRow> {
    const value = createVehicleSchema.safeParse(input);
    if (!value.success)
      throw new AppDatabaseError('VEHICLE_VALIDATION_ERROR', 'Dados do veículo inválidos.');
    try {
      const now = new Date().toISOString();
      await this.executor.run(
        `insert into vehicles
         (id, workspace_id, customer_id, type, brand, model, year, plate, color, notes,
          created_at, updated_at)
         values (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)`,
        [
          id,
          workspaceId,
          value.data.customerId,
          value.data.type,
          value.data.brand,
          value.data.model,
          value.data.year ?? null,
          value.data.plate,
          value.data.color,
          value.data.notes,
          now,
          now,
        ],
      );
      const created = await this.findById(workspaceId, id);
      if (!created)
        throw new AppDatabaseError('VEHICLE_CREATION_FAILED', 'Não foi possível salvar o veículo.');
      return created;
    } catch (error) {
      throw mapDatabaseError(error);
    }
  }

  findById(workspaceId: string, id: string): Promise<VehicleRow | null> {
    return this.executor.get<VehicleRow>(
      `${SELECT} where workspace_id = ? and id = ? and deleted_at is null`,
      [workspaceId, id],
    );
  }

  async listByCustomer(
    workspaceId: string,
    customerId: string,
    filters: VehicleListFilters = {},
  ): Promise<VehicleRow[]> {
    const status = filters.status ?? 'active';
    const statusClause =
      status === 'active'
        ? ' and archived_at is null'
        : status === 'archived'
          ? ' and archived_at is not null'
          : '';
    const rows = await this.executor.all<VehicleRow>(
      `${SELECT} where workspace_id = ? and customer_id = ? and deleted_at is null${statusClause}
       order by brand collate nocase, model collate nocase`,
      [workspaceId, customerId],
    );
    return filters.query?.trim()
      ? rows.filter((vehicle) => vehicleMatchesQuery(vehicle, filters.query as string))
      : rows;
  }

  async findPotentialDuplicates(
    workspaceId: string,
    plate: string | null,
    excludeId?: string,
  ): Promise<PotentialVehicleDuplicate[]> {
    if (!plate) return [];
    const rows = await this.executor.all<VehicleRow>(
      `${SELECT} where workspace_id = ? and plate = ? and deleted_at is null`,
      [workspaceId, plate],
    );
    return rows.filter((vehicle) => vehicle.id !== excludeId).map((vehicle) => ({ vehicle }));
  }

  async update(workspaceId: string, id: string, input: UpdateVehicleInput): Promise<VehicleRow> {
    const value = updateVehicleSchema.safeParse(input);
    if (!value.success)
      throw new AppDatabaseError('VEHICLE_VALIDATION_ERROR', 'Dados do veículo inválidos.');
    const current = await this.findById(workspaceId, id);
    if (!current) throw new AppDatabaseError('VEHICLE_NOT_FOUND', 'Veículo não encontrado.');
    const next = {
      type: value.data.type ?? current.type,
      brand: value.data.brand ?? current.brand,
      model: value.data.model ?? current.model,
      year: value.data.year === undefined ? current.year : value.data.year,
      plate: value.data.plate === undefined ? current.plate : value.data.plate,
      color: value.data.color === undefined ? current.color : value.data.color,
      notes: value.data.notes === undefined ? current.notes : value.data.notes,
    };
    await this.executor.run(
      `update vehicles set type = ?, brand = ?, model = ?, year = ?, plate = ?, color = ?,
       notes = ?, updated_at = ? where workspace_id = ? and id = ? and deleted_at is null`,
      [
        next.type,
        next.brand,
        next.model,
        next.year,
        next.plate,
        next.color,
        next.notes,
        new Date().toISOString(),
        workspaceId,
        id,
      ],
    );
    const updated = await this.findById(workspaceId, id);
    if (!updated)
      throw new AppDatabaseError('VEHICLE_UPDATE_FAILED', 'Não foi possível atualizar o veículo.');
    return updated;
  }

  archive(workspaceId: string, id: string, at = new Date().toISOString()): Promise<void> {
    return this.setArchivedAt(workspaceId, id, at);
  }

  restore(workspaceId: string, id: string): Promise<void> {
    return this.setArchivedAt(workspaceId, id, null);
  }

  async hasFinancialHistory(workspaceId: string, id: string): Promise<boolean> {
    const row = await this.executor.get<{ count: number }>(
      `select count(*) as count from debts where workspace_id = ? and vehicle_id = ?`,
      [workspaceId, id],
    );
    return (row?.count ?? 0) > 0;
  }

  private async setArchivedAt(
    workspaceId: string,
    id: string,
    value: string | null,
  ): Promise<void> {
    const result = await this.executor.run(
      `update vehicles set archived_at = ?, updated_at = ?
       where workspace_id = ? and id = ? and deleted_at is null`,
      [value, new Date().toISOString(), workspaceId, id],
    );
    if (!result.changes) throw new AppDatabaseError('VEHICLE_NOT_FOUND', 'Veículo não encontrado.');
  }
}
