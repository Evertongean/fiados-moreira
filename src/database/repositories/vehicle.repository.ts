import { AppDatabaseError, mapDatabaseError } from '@/database/errors/DatabaseError';
import type { VehicleRow } from '@/database/schema';
import type { SqlExecutor } from '@/database/types/executor';
import {
  createVehicleSchema,
  updateVehicleSchema,
  type CreateVehicleInput,
  type UpdateVehicleInput,
} from '@/features/vehicles/domain/vehicleSchemas';
import { createUuid } from '@/utils/uuid';

const SELECT = `select id, workspace_id as workspaceId, customer_id as customerId, type,
  brand, model, year, plate, color, notes, created_at as createdAt, updated_at as updatedAt,
  archived_at as archivedAt, deleted_at as deletedAt from vehicles`;

export class VehicleRepository {
  constructor(private readonly executor: SqlExecutor) {}

  async create(workspaceId: string, input: CreateVehicleInput): Promise<VehicleRow> {
    const value = createVehicleSchema.safeParse(input);
    if (!value.success)
      throw new AppDatabaseError('VALIDATION_ERROR', 'Dados do veículo inválidos.');
    const id = createUuid();
    try {
      await this.executor.run(
        `insert into vehicles
         (id, workspace_id, customer_id, type, brand, model, year, plate, color, notes)
         values (?, ?, ?, ?, ?, ?, ?, ?, ?, ?)`,
        [
          id,
          workspaceId,
          value.data.customerId,
          value.data.type,
          value.data.brand,
          value.data.model,
          value.data.year ?? null,
          value.data.plate ?? null,
          value.data.color ?? null,
          value.data.notes ?? null,
        ],
      );
      return (await this.findById(workspaceId, id)) as VehicleRow;
    } catch (error) {
      throw mapDatabaseError(error);
    }
  }

  findById(workspaceId: string, id: string): Promise<VehicleRow | null> {
    return this.executor.get<VehicleRow>(`${SELECT} where workspace_id = ? and id = ?`, [
      workspaceId,
      id,
    ]);
  }

  listByCustomer(workspaceId: string, customerId: string): Promise<VehicleRow[]> {
    return this.executor.all<VehicleRow>(
      `${SELECT} where workspace_id = ? and customer_id = ? and deleted_at is null
       order by brand collate nocase, model collate nocase`,
      [workspaceId, customerId],
    );
  }

  async update(workspaceId: string, id: string, input: UpdateVehicleInput): Promise<VehicleRow> {
    const value = updateVehicleSchema.safeParse(input);
    if (!value.success)
      throw new AppDatabaseError('VALIDATION_ERROR', 'Dados do veículo inválidos.');
    const current = await this.findById(workspaceId, id);
    if (!current) throw new AppDatabaseError('RECORD_NOT_FOUND', 'Veículo não encontrado.');
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
       notes = ?, updated_at = ? where workspace_id = ? and id = ?`,
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
    return (await this.findById(workspaceId, id)) as VehicleRow;
  }

  async archive(workspaceId: string, id: string, at = new Date().toISOString()): Promise<void> {
    const result = await this.executor.run(
      `update vehicles set archived_at = ?, updated_at = ? where workspace_id = ? and id = ?`,
      [at, at, workspaceId, id],
    );
    if (!result.changes) throw new AppDatabaseError('RECORD_NOT_FOUND', 'Veículo não encontrado.');
  }

  async hasFinancialHistory(workspaceId: string, id: string): Promise<boolean> {
    const row = await this.executor.get<{ count: number }>(
      `select count(*) as count from debts where workspace_id = ? and vehicle_id = ?`,
      [workspaceId, id],
    );
    return (row?.count ?? 0) > 0;
  }
}
