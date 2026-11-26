import { AppDatabaseError } from '@/database/errors/DatabaseError';
import { AuditRepository } from '@/database/repositories/audit.repository';
import { CustomerRepository } from '@/database/repositories/customer.repository';
import { DebtRepository } from '@/database/repositories/debt.repository';
import { VehicleRepository } from '@/database/repositories/vehicle.repository';
import type { DebtRow } from '@/database/schema';
import type { SqlExecutor } from '@/database/types/executor';
import {
  cancelDebtSchema,
  createDebtSchema,
  updateDebtSchema,
  type CancelDebtInput,
  type CreateDebtInput,
  type UpdateDebtInput,
} from '@/features/debts/domain/debtSchemas';

function debtMatchesCreate(debt: DebtRow, input: CreateDebtInput): boolean {
  return (
    debt.customerId === input.customerId &&
    debt.vehicleId === (input.vehicleId ?? null) &&
    debt.description === input.description &&
    debt.totalCents === input.totalCents &&
    debt.serviceDate === input.serviceDate &&
    debt.dueDate === (input.dueDate ?? null) &&
    debt.notes === (input.notes ?? null)
  );
}

function debtMatchesUpdate(debt: DebtRow, input: UpdateDebtInput): boolean {
  return (
    (input.vehicleId === undefined || debt.vehicleId === input.vehicleId) &&
    (input.description === undefined || debt.description === input.description) &&
    (input.totalCents === undefined || debt.totalCents === input.totalCents) &&
    (input.serviceDate === undefined || debt.serviceDate === input.serviceDate) &&
    (input.dueDate === undefined || debt.dueDate === input.dueDate) &&
    (input.notes === undefined || debt.notes === input.notes)
  );
}

export class DebtService {
  constructor(
    private readonly executor: SqlExecutor,
    private readonly onFinancialChange?: (workspaceId: string, debtId: string) => Promise<void>,
  ) {}

  async create(
    workspaceId: string,
    input: CreateDebtInput,
    operationId?: string,
  ): Promise<DebtRow> {
    const value = createDebtSchema.safeParse(input);
    if (!value.success) throw new AppDatabaseError('VALIDATION_ERROR', 'Dados do fiado inválidos.');
    const debt = await this.executor.transaction(async (transaction) => {
      const audit = new AuditRepository(transaction);
      if (operationId) {
        const previous = await audit.findByOperationId(workspaceId, operationId);
        if (previous) {
          const existing = await new DebtRepository(transaction).findById(
            workspaceId,
            previous.entityId,
          );
          if (
            previous.action === 'create' &&
            previous.entityType === 'debt' &&
            existing &&
            debtMatchesCreate(existing, value.data)
          ) {
            return existing;
          }
          throw new AppDatabaseError(
            'IDEMPOTENCY_CONFLICT',
            'A operação já foi usada com outros dados.',
          );
        }
      }
      const customer = await new CustomerRepository(transaction).findById(
        workspaceId,
        value.data.customerId,
      );
      if (!customer) throw new AppDatabaseError('CUSTOMER_NOT_FOUND', 'Cliente não encontrado.');
      if (customer.archivedAt) {
        throw new AppDatabaseError(
          'CUSTOMER_ARCHIVED',
          'Restaure o cliente antes de registrar um novo fiado.',
        );
      }
      await this.validateVehicle(
        transaction,
        workspaceId,
        value.data.customerId,
        value.data.vehicleId,
      );
      const debt = await new DebtRepository(transaction).insertValidated(workspaceId, value.data);
      await audit.record(workspaceId, {
        entityType: 'debt',
        entityId: debt.id,
        action: 'create',
        operationId,
        metadata: { totalCents: debt.totalCents },
      });
      return debt;
    });
    await this.notifyFinancialChange(workspaceId, debt.id);
    return debt;
  }

  async update(
    workspaceId: string,
    debtId: string,
    input: UpdateDebtInput,
    operationId?: string,
  ): Promise<DebtRow> {
    const value = updateDebtSchema.safeParse(input);
    if (!value.success) throw new AppDatabaseError('VALIDATION_ERROR', 'Dados do fiado inválidos.');
    const debt = await this.executor.transaction(async (transaction) => {
      const debts = new DebtRepository(transaction);
      const current = await debts.findById(workspaceId, debtId);
      if (!current) throw new AppDatabaseError('RECORD_NOT_FOUND', 'Fiado não encontrado.');
      const audit = new AuditRepository(transaction);
      if (operationId) {
        const previous = await audit.findByOperationId(workspaceId, operationId);
        if (previous) {
          if (
            previous.action === 'update' &&
            previous.entityType === 'debt' &&
            previous.entityId === debtId &&
            debtMatchesUpdate(current, value.data)
          ) {
            return current;
          }
          throw new AppDatabaseError(
            'IDEMPOTENCY_CONFLICT',
            'A operação já foi usada com outros dados.',
          );
        }
      }
      if (current.canceledAt)
        throw new AppDatabaseError('DEBT_CANCELED', 'O fiado está cancelado.');
      if (value.data.vehicleId !== undefined && value.data.vehicleId !== current.vehicleId) {
        await this.validateVehicle(
          transaction,
          workspaceId,
          current.customerId,
          value.data.vehicleId,
        );
      }
      const summary = await debts.getFinancialSummary(workspaceId, debtId);
      const nextTotal = value.data.totalCents ?? current.totalCents;
      if (nextTotal < summary.netPaidCents) {
        throw new AppDatabaseError(
          'INVALID_AMOUNT',
          'O valor do fiado não pode ser menor que o valor já pago.',
        );
      }
      const customer = await new CustomerRepository(transaction).findById(
        workspaceId,
        current.customerId,
      );
      if (!customer) throw new AppDatabaseError('CUSTOMER_NOT_FOUND', 'Cliente não encontrado.');
      if (customer.archivedAt && nextTotal > summary.netPaidCents) {
        throw new AppDatabaseError(
          'CUSTOMER_ARCHIVED',
          'Restaure o cliente antes de reabrir saldo neste fiado.',
        );
      }
      const updated = await debts.updateValidated(workspaceId, debtId, current, value.data);
      await audit.record(workspaceId, {
        entityType: 'debt',
        entityId: debtId,
        action: 'update',
        operationId,
        metadata: { previousTotalCents: current.totalCents, totalCents: updated.totalCents },
      });
      return updated;
    });
    await this.notifyFinancialChange(workspaceId, debt.id);
    return debt;
  }

  async cancel(workspaceId: string, debtId: string, input: CancelDebtInput): Promise<DebtRow> {
    const value = cancelDebtSchema.safeParse(input);
    if (!value.success)
      throw new AppDatabaseError('VALIDATION_ERROR', 'Dados do cancelamento inválidos.');
    const debt = await this.executor.transaction(async (transaction) => {
      const debts = new DebtRepository(transaction);
      const current = await debts.findById(workspaceId, debtId);
      if (!current) throw new AppDatabaseError('RECORD_NOT_FOUND', 'Fiado não encontrado.');
      const audit = new AuditRepository(transaction);
      const previousOperation = await audit.findByOperationId(workspaceId, value.data.operationId);
      if (previousOperation) {
        if (
          previousOperation.action === 'cancel' &&
          previousOperation.entityId === debtId &&
          current.canceledAt &&
          current.cancellationReason === value.data.reason
        ) {
          return current;
        }
        throw new AppDatabaseError(
          'IDEMPOTENCY_CONFLICT',
          'A operação já foi usada com outros dados.',
        );
      }
      if (current.canceledAt) {
        throw new AppDatabaseError('DEBT_CANCELED', 'O fiado já está cancelado.');
      }
      const summary = await debts.getFinancialSummary(workspaceId, debtId);
      if (summary.netPaidCents > 0) {
        throw new AppDatabaseError(
          'CONSTRAINT_VIOLATION',
          'Um fiado com pagamentos válidos não pode ser cancelado.',
        );
      }
      const canceledAt = value.data.canceledAt ?? new Date().toISOString();
      const debt = await debts.cancelValidated(workspaceId, debtId, value.data.reason, canceledAt);
      await audit.record(workspaceId, {
        entityType: 'debt',
        entityId: debtId,
        action: 'cancel',
        operationId: value.data.operationId,
        metadata: { reason: value.data.reason },
      });
      return debt;
    });
    await this.notifyFinancialChange(workspaceId, debt.id);
    return debt;
  }

  private async validateVehicle(
    executor: SqlExecutor,
    workspaceId: string,
    customerId: string,
    vehicleId: string | null | undefined,
  ): Promise<void> {
    if (!vehicleId) return;
    const vehicle = await new VehicleRepository(executor).findById(workspaceId, vehicleId);
    if (!vehicle || vehicle.customerId !== customerId) {
      throw new AppDatabaseError(
        'CONSTRAINT_VIOLATION',
        'O veículo não pertence ao cliente informado.',
      );
    }
    if (vehicle.archivedAt) {
      throw new AppDatabaseError(
        'VEHICLE_ARCHIVED',
        'Restaure o veículo antes de vinculá-lo a um novo fiado.',
      );
    }
  }

  private async notifyFinancialChange(workspaceId: string, debtId: string): Promise<void> {
    try {
      await this.onFinancialChange?.(workspaceId, debtId);
    } catch {
      // A falha de uma notificação nunca desfaz uma operação financeira já confirmada.
    }
  }
}
