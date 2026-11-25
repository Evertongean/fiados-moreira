import { AppDatabaseError } from '@/database/errors/DatabaseError';
import { AuditRepository } from '@/database/repositories/audit.repository';
import { CustomerRepository } from '@/database/repositories/customer.repository';
import { DebtRepository } from '@/database/repositories/debt.repository';
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

export class DebtService {
  constructor(private readonly executor: SqlExecutor) {}

  async create(workspaceId: string, input: CreateDebtInput): Promise<DebtRow> {
    const value = createDebtSchema.safeParse(input);
    if (!value.success) throw new AppDatabaseError('VALIDATION_ERROR', 'Dados do fiado inválidos.');
    return this.executor.transaction(async (transaction) => {
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
      const debt = await new DebtRepository(transaction).insertValidated(workspaceId, value.data);
      await new AuditRepository(transaction).record(workspaceId, {
        entityType: 'debt',
        entityId: debt.id,
        action: 'create',
        metadata: { totalCents: debt.totalCents },
      });
      return debt;
    });
  }

  async update(workspaceId: string, debtId: string, input: UpdateDebtInput): Promise<DebtRow> {
    const value = updateDebtSchema.safeParse(input);
    if (!value.success) throw new AppDatabaseError('VALIDATION_ERROR', 'Dados do fiado inválidos.');
    return this.executor.transaction(async (transaction) => {
      const debts = new DebtRepository(transaction);
      const current = await debts.findById(workspaceId, debtId);
      if (!current) throw new AppDatabaseError('RECORD_NOT_FOUND', 'Fiado não encontrado.');
      if (current.canceledAt)
        throw new AppDatabaseError('DEBT_CANCELED', 'O fiado está cancelado.');
      const summary = await debts.getFinancialSummary(workspaceId, debtId);
      const nextTotal = value.data.totalCents ?? current.totalCents;
      if (nextTotal < summary.netPaidCents) {
        throw new AppDatabaseError(
          'INVALID_AMOUNT',
          'O valor do fiado não pode ser menor que o valor já pago.',
        );
      }
      const updated = await debts.updateValidated(workspaceId, debtId, current, value.data);
      await new AuditRepository(transaction).record(workspaceId, {
        entityType: 'debt',
        entityId: debtId,
        action: 'update',
        metadata: { previousTotalCents: current.totalCents, totalCents: updated.totalCents },
      });
      return updated;
    });
  }

  async cancel(workspaceId: string, debtId: string, input: CancelDebtInput): Promise<DebtRow> {
    const value = cancelDebtSchema.safeParse(input);
    if (!value.success)
      throw new AppDatabaseError('VALIDATION_ERROR', 'Dados do cancelamento inválidos.');
    return this.executor.transaction(async (transaction) => {
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
  }
}
