import { AppDatabaseError } from '@/database/errors/DatabaseError';
import { AuditRepository } from '@/database/repositories/audit.repository';
import { CustomerRepository } from '@/database/repositories/customer.repository';
import { VehicleRepository } from '@/database/repositories/vehicle.repository';
import type { VehicleRow } from '@/database/schema';
import type { SqlExecutor } from '@/database/types/executor';
import {
  createVehicleSchema,
  updateVehicleSchema,
  type CreateVehicleInput,
  type NormalizedVehicleInput,
  type UpdateVehicleInput,
} from '@/features/vehicles/domain/vehicleSchemas';
import type { PotentialVehicleDuplicate } from '@/features/vehicles/domain/vehicleTypes';
import { createUuid } from '@/utils/uuid';

const EDITABLE_FIELDS = ['type', 'brand', 'model', 'year', 'plate', 'color', 'notes'] as const;

function sameVehicle(vehicle: VehicleRow, input: NormalizedVehicleInput): boolean {
  return (
    vehicle.customerId === input.customerId &&
    EDITABLE_FIELDS.every((field) => vehicle[field] === input[field])
  );
}

export class VehicleService {
  constructor(private readonly executor: SqlExecutor) {}

  normalize(input: CreateVehicleInput): NormalizedVehicleInput {
    const parsed = createVehicleSchema.safeParse(input);
    if (!parsed.success)
      throw new AppDatabaseError('VEHICLE_VALIDATION_ERROR', 'Dados do veículo inválidos.');
    return parsed.data;
  }

  findPotentialDuplicates(
    workspaceId: string,
    input: CreateVehicleInput,
    excludeId?: string,
  ): Promise<PotentialVehicleDuplicate[]> {
    const normalized = this.normalize(input);
    return new VehicleRepository(this.executor).findPotentialDuplicates(
      workspaceId,
      normalized.plate,
      excludeId,
    );
  }

  create(
    workspaceId: string,
    input: CreateVehicleInput,
    vehicleId = createUuid(),
  ): Promise<VehicleRow> {
    const normalized = this.normalize(input);
    return this.executor.transaction(async (transaction) => {
      const vehicles = new VehicleRepository(transaction);
      const existing = await vehicles.findById(workspaceId, vehicleId);
      if (existing) {
        if (sameVehicle(existing, normalized)) return existing;
        throw new AppDatabaseError(
          'IDEMPOTENCY_CONFLICT',
          'A tentativa de cadastro já foi utilizada com outros dados.',
        );
      }
      const customer = await new CustomerRepository(transaction).findById(
        workspaceId,
        normalized.customerId,
      );
      if (!customer) throw new AppDatabaseError('CUSTOMER_NOT_FOUND', 'Cliente não encontrado.');
      if (customer.archivedAt) {
        throw new AppDatabaseError(
          'VEHICLE_CUSTOMER_ARCHIVED',
          'Restaure o cliente antes de cadastrar um veículo.',
        );
      }
      const vehicle = await vehicles.insertWithId(workspaceId, vehicleId, normalized);
      await new AuditRepository(transaction).record(workspaceId, {
        entityType: 'vehicle',
        entityId: vehicle.id,
        action: 'create',
        operationId: `vehicle:create:${vehicle.id}`,
        metadata: { fields: EDITABLE_FIELDS.filter((field) => vehicle[field] !== null).join(',') },
      });
      return vehicle;
    });
  }

  update(workspaceId: string, id: string, input: UpdateVehicleInput): Promise<VehicleRow> {
    const parsed = updateVehicleSchema.safeParse(input);
    if (!parsed.success)
      throw new AppDatabaseError('VEHICLE_VALIDATION_ERROR', 'Dados do veículo inválidos.');
    return this.executor.transaction(async (transaction) => {
      const vehicles = new VehicleRepository(transaction);
      const current = await vehicles.findById(workspaceId, id);
      if (!current) throw new AppDatabaseError('VEHICLE_NOT_FOUND', 'Veículo não encontrado.');
      const changedFields = EDITABLE_FIELDS.filter(
        (field) => parsed.data[field] !== undefined && current[field] !== parsed.data[field],
      );
      if (!changedFields.length) return current;
      const vehicle = await vehicles.update(workspaceId, id, parsed.data);
      await new AuditRepository(transaction).record(workspaceId, {
        entityType: 'vehicle',
        entityId: id,
        action: 'update',
        operationId: createUuid(),
        metadata: { fields: changedFields.join(',') },
      });
      return vehicle;
    });
  }

  archive(workspaceId: string, id: string): Promise<VehicleRow> {
    return this.setArchived(workspaceId, id, true);
  }

  restore(workspaceId: string, id: string): Promise<VehicleRow> {
    return this.setArchived(workspaceId, id, false);
  }

  private setArchived(workspaceId: string, id: string, archive: boolean): Promise<VehicleRow> {
    return this.executor.transaction(async (transaction) => {
      const vehicles = new VehicleRepository(transaction);
      const vehicle = await vehicles.findById(workspaceId, id);
      if (!vehicle) throw new AppDatabaseError('VEHICLE_NOT_FOUND', 'Veículo não encontrado.');
      if (archive && vehicle.archivedAt)
        throw new AppDatabaseError('VEHICLE_ALREADY_ARCHIVED', 'O veículo já está arquivado.');
      if (!archive && !vehicle.archivedAt)
        throw new AppDatabaseError('VEHICLE_NOT_ARCHIVED', 'O veículo não está arquivado.');
      if (archive) await vehicles.archive(workspaceId, id);
      else await vehicles.restore(workspaceId, id);
      await new AuditRepository(transaction).record(workspaceId, {
        entityType: 'vehicle',
        entityId: id,
        action: archive ? 'archive' : 'restore',
        operationId: createUuid(),
      });
      return (await vehicles.findById(workspaceId, id)) as VehicleRow;
    });
  }
}
