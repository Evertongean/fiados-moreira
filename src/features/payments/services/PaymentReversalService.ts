import { AppDatabaseError } from '@/database/errors/DatabaseError';
import { AuditRepository } from '@/database/repositories/audit.repository';
import { PaymentReversalRepository } from '@/database/repositories/payment-reversal.repository';
import { PaymentRepository } from '@/database/repositories/payment.repository';
import type { PaymentReversalRow } from '@/database/schema';
import type { SqlExecutor } from '@/database/types/executor';
import {
  reversePaymentSchema,
  type ReversePaymentInput,
} from '@/features/payments/domain/paymentSchemas';

export class PaymentReversalService {
  constructor(private readonly executor: SqlExecutor) {}

  async reverse(workspaceId: string, input: ReversePaymentInput): Promise<PaymentReversalRow> {
    const value = reversePaymentSchema.safeParse(input);
    if (!value.success)
      throw new AppDatabaseError('VALIDATION_ERROR', 'Dados do estorno inválidos.');

    return this.executor.transaction(async (transaction) => {
      const reversals = new PaymentReversalRepository(transaction);
      const byOperation = await reversals.findByOperationId(workspaceId, value.data.operationId);
      if (byOperation) {
        const same =
          byOperation.paymentId === value.data.paymentId &&
          byOperation.reason === value.data.reason &&
          byOperation.reversedAt === value.data.reversedAt;
        if (same) return byOperation;
        throw new AppDatabaseError(
          'IDEMPOTENCY_CONFLICT',
          'A operação já foi usada com outros dados.',
        );
      }
      const audit = new AuditRepository(transaction);
      if (await audit.findByOperationId(workspaceId, value.data.operationId)) {
        throw new AppDatabaseError(
          'IDEMPOTENCY_CONFLICT',
          'A operação já foi usada com outros dados.',
        );
      }

      const payment = await new PaymentRepository(transaction).findById(
        workspaceId,
        value.data.paymentId,
      );
      if (!payment) throw new AppDatabaseError('RECORD_NOT_FOUND', 'Pagamento não encontrado.');
      if (await reversals.findByPaymentId(workspaceId, payment.id)) {
        throw new AppDatabaseError('PAYMENT_ALREADY_REVERSED', 'O pagamento já foi estornado.');
      }

      const reversal = await reversals.insertValidated(workspaceId, value.data);
      await audit.record(workspaceId, {
        entityType: 'payment',
        entityId: payment.id,
        action: 'payment_reversed',
        operationId: reversal.operationId,
        metadata: { debtId: payment.debtId, amountCents: payment.amountCents },
      });
      return reversal;
    });
  }
}
