import { mapDatabaseError } from '@/database/errors/DatabaseError';
import type { PaymentReversalRow } from '@/database/schema';
import type { SqlExecutor } from '@/database/types/executor';
import type { ReversePaymentInput } from '@/features/payments/domain/paymentSchemas';
import { createUuid } from '@/utils/uuid';

const SELECT = `select id, workspace_id as workspaceId, payment_id as paymentId,
  operation_id as operationId, reason, reversed_at as reversedAt, created_at as createdAt
  from payment_reversals`;

export class PaymentReversalRepository {
  constructor(private readonly executor: SqlExecutor) {}

  findByPaymentId(workspaceId: string, paymentId: string): Promise<PaymentReversalRow | null> {
    return this.executor.get<PaymentReversalRow>(
      `${SELECT} where workspace_id = ? and payment_id = ?`,
      [workspaceId, paymentId],
    );
  }

  findByOperationId(workspaceId: string, operationId: string): Promise<PaymentReversalRow | null> {
    return this.executor.get<PaymentReversalRow>(
      `${SELECT} where workspace_id = ? and operation_id = ?`,
      [workspaceId, operationId],
    );
  }

  async insertValidated(
    workspaceId: string,
    input: ReversePaymentInput,
  ): Promise<PaymentReversalRow> {
    const id = createUuid();
    try {
      await this.executor.run(
        `insert into payment_reversals
         (id, workspace_id, payment_id, operation_id, reason, reversed_at)
         values (?, ?, ?, ?, ?, ?)`,
        [id, workspaceId, input.paymentId, input.operationId, input.reason, input.reversedAt],
      );
      return (await this.findByPaymentId(workspaceId, input.paymentId)) as PaymentReversalRow;
    } catch (error) {
      throw mapDatabaseError(error);
    }
  }
}
