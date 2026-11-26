import { mapDatabaseError } from '@/database/errors/DatabaseError';
import type { PaymentRow } from '@/database/schema';
import type { SqlExecutor } from '@/database/types/executor';
import type { RegisterPaymentInput } from '@/features/payments/domain/paymentSchemas';
import type { PaymentDetails } from '@/features/payments/domain/paymentTypes';
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

  findDetails(workspaceId: string, id: string): Promise<PaymentDetails | null> {
    return this.executor.get<PaymentDetails>(
      `select p.id, p.workspace_id as workspaceId, p.debt_id as debtId,
       p.operation_id as operationId, p.amount_cents as amountCents,
       p.payment_method as paymentMethod, p.paid_at as paidAt, p.notes,
       p.created_at as createdAt, d.description as debtDescription,
       d.canceled_at as debtCanceledAt, d.customer_id as customerId,
       c.name as customerName, r.id as reversalId, r.reason as reversalReason,
       r.reversed_at as reversedAt
       from payments p
       inner join debts d on d.workspace_id = p.workspace_id and d.id = p.debt_id
       inner join customers c on c.workspace_id = d.workspace_id and c.id = d.customer_id
       left join payment_reversals r
       on r.workspace_id = p.workspace_id and r.payment_id = p.id
       where p.workspace_id = ? and p.id = ?`,
      [workspaceId, id],
    );
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
    const createdAt = new Date().toISOString();
    try {
      await this.executor.run(
        `insert into payments
         (id, workspace_id, debt_id, operation_id, amount_cents, payment_method, paid_at, notes,
          created_at)
         values (?, ?, ?, ?, ?, ?, ?, ?, ?)`,
        [
          id,
          workspaceId,
          input.debtId,
          input.operationId,
          input.amountCents,
          input.paymentMethod,
          input.paidAt,
          input.notes ?? null,
          createdAt,
        ],
      );
      return (await this.findById(workspaceId, id)) as PaymentRow;
    } catch (error) {
      throw mapDatabaseError(error);
    }
  }
}
