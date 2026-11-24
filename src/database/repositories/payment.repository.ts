import { mapDatabaseError } from '@/database/errors/DatabaseError';
import type { PaymentRow } from '@/database/schema';
import type { SqlExecutor } from '@/database/types/executor';
import type { RegisterPaymentInput } from '@/features/payments/domain/paymentSchemas';
import { createUuid } from '@/utils/uuid';

const SELECT = `select id, workspace_id as workspaceId, debt_id as debtId,
  operation_id as operationId, amount_cents as amountCents, payment_method as paymentMethod,
  paid_at as paidAt, notes, created_at as createdAt from payments`;

export class PaymentRepository {
  constructor(private readonly executor: SqlExecutor) {}

  findById(workspaceId: string, id: string): Promise<PaymentRow | null> {
    return this.executor.get<PaymentRow>(`${SELECT} where workspace_id = ? and id = ?`, [
      workspaceId,
      id,
    ]);
  }

  findByOperationId(workspaceId: string, operationId: string): Promise<PaymentRow | null> {
    return this.executor.get<PaymentRow>(`${SELECT} where workspace_id = ? and operation_id = ?`, [
      workspaceId,
      operationId,
    ]);
  }

  listByDebt(workspaceId: string, debtId: string): Promise<PaymentRow[]> {
    return this.executor.all<PaymentRow>(
      `${SELECT} where workspace_id = ? and debt_id = ? order by paid_at`,
      [workspaceId, debtId],
    );
  }

  listByPeriod(workspaceId: string, start: string, end: string): Promise<PaymentRow[]> {
    return this.executor.all<PaymentRow>(
      `${SELECT} where workspace_id = ? and paid_at >= ? and paid_at < ? order by paid_at`,
      [workspaceId, start, end],
    );
  }

  async insertValidated(workspaceId: string, input: RegisterPaymentInput): Promise<PaymentRow> {
    const id = createUuid();
    try {
      await this.executor.run(
        `insert into payments
         (id, workspace_id, debt_id, operation_id, amount_cents, payment_method, paid_at, notes)
         values (?, ?, ?, ?, ?, ?, ?, ?)`,
        [
          id,
          workspaceId,
          input.debtId,
          input.operationId,
          input.amountCents,
          input.paymentMethod,
          input.paidAt,
          input.notes ?? null,
        ],
      );
      return (await this.findById(workspaceId, id)) as PaymentRow;
    } catch (error) {
      throw mapDatabaseError(error);
    }
  }
}
