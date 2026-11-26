import { AppDatabaseError } from '@/database/errors/DatabaseError';
import { AuditRepository } from '@/database/repositories/audit.repository';
import { DebtRepository } from '@/database/repositories/debt.repository';
import { PaymentRepository } from '@/database/repositories/payment.repository';
import type { PaymentRow } from '@/database/schema';
import type { SqlExecutor } from '@/database/types/executor';
import {
  registerPaymentSchema,
  type RegisterPaymentInput,
} from '@/features/payments/domain/paymentSchemas';
import { calculateRemainingAfterPayment } from '@/features/debts/domain/finance';

function isSamePayment(current: PaymentRow, input: ReturnType<typeof registerPaymentSchema.parse>) {
  return (
    current.debtId === input.debtId &&
    current.amountCents === input.amountCents &&
    current.paymentMethod === input.paymentMethod &&
    current.paidAt === input.paidAt &&
    current.notes === (input.notes ?? null)
  );
}

export class PaymentService {
  constructor(private readonly executor: SqlExecutor) {}

  async register(workspaceId: string, input: RegisterPaymentInput): Promise<PaymentRow> {
    const value = registerPaymentSchema.safeParse(input);
    if (!value.success)
      throw new AppDatabaseError('VALIDATION_ERROR', 'Dados do pagamento inválidos.');

    return this.executor.transaction(async (transaction) => {
      const payments = new PaymentRepository(transaction);
      const previous = await payments.findByOperationId(workspaceId, value.data.operationId);
      if (previous) {
        if (isSamePayment(previous, value.data)) return previous;
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

      const debts = new DebtRepository(transaction);
      const debt = await debts.findById(workspaceId, value.data.debtId);
      if (!debt) throw new AppDatabaseError('RECORD_NOT_FOUND', 'Fiado não encontrado.');
      if (debt.canceledAt) throw new AppDatabaseError('DEBT_CANCELED', 'O fiado está cancelado.');
      const summary = await debts.getFinancialSummary(workspaceId, debt.id);
      calculateRemainingAfterPayment(summary, value.data.amountCents);

      const payment = await payments.insertValidated(workspaceId, value.data);
      await audit.record(workspaceId, {
        entityType: 'payment',
        entityId: payment.id,
        action: 'payment_registered',
        operationId: payment.operationId,
        metadata: { debtId: payment.debtId, amountCents: payment.amountCents },
      });
      return payment;
    });
  }
}
