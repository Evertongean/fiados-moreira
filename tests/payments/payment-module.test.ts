import { randomUUID } from 'node:crypto';

import { AuditRepository } from '@/database/repositories/audit.repository';
import { CustomerRepository } from '@/database/repositories/customer.repository';
import { DebtRepository } from '@/database/repositories/debt.repository';
import { PaymentReversalRepository } from '@/database/repositories/payment-reversal.repository';
import { PaymentRepository } from '@/database/repositories/payment.repository';
import { WorkspaceRepository } from '@/database/repositories/workspace.repository';
import type { SqlExecutor, SqlParams, SqlRunResult } from '@/database/types/executor';
import { DebtService } from '@/features/debts/services/DebtService';
import { PaymentReversalService } from '@/features/payments/services/PaymentReversalService';
import { PaymentService } from '@/features/payments/services/PaymentService';

import { createTestDatabase } from '../database/createTestDatabase';

class FailingReversalAuditExecutor implements SqlExecutor {
  constructor(private readonly delegate: SqlExecutor) {}

  run(sql: string, params?: SqlParams): Promise<SqlRunResult> {
    if (sql.includes('insert into audit_logs')) return Promise.reject(new Error('audit failure'));
    return this.delegate.run(sql, params);
  }

  get<T>(sql: string, params?: SqlParams) {
    return this.delegate.get<T>(sql, params);
  }

  all<T>(sql: string, params?: SqlParams) {
    return this.delegate.all<T>(sql, params);
  }

  exec(sql: string) {
    return this.delegate.exec(sql);
  }

  transaction<T>(task: (transaction: SqlExecutor) => Promise<T>): Promise<T> {
    return this.delegate.transaction((transaction) =>
      task(new FailingReversalAuditExecutor(transaction)),
    );
  }
}

async function fixture() {
  const database = await createTestDatabase();
  const workspace = await new WorkspaceRepository(database).initializeLocal();
  const customer = await new CustomerRepository(database).create(workspace.id, {
    name: 'Cliente Pagamento',
  });
  const debt = await new DebtService(database).create(workspace.id, {
    customerId: customer.id,
    description: 'Serviço de suspensão',
    totalCents: 50_000,
    serviceDate: '2026-11-26',
  });
  return { database, workspace, customer, debt };
}

describe('payment module', () => {
  it('settles R$ 500 with R$ 200 + R$ 300 and restores R$ 300 after reversing the last payment', async () => {
    const { database, workspace, debt } = await fixture();
    const payments = new PaymentService(database);
    const first = await payments.register(workspace.id, {
      operationId: randomUUID(),
      debtId: debt.id,
      amountCents: 20_000,
      paymentMethod: 'cash',
      paidAt: '2026-11-26T12:00:00.000Z',
    });
    expect(
      await new DebtRepository(database).getFinancialSummary(workspace.id, debt.id),
    ).toMatchObject({ netPaidCents: 20_000, pendingCents: 30_000, isPaid: false });

    const second = await payments.register(workspace.id, {
      operationId: randomUUID(),
      debtId: debt.id,
      amountCents: 30_000,
      paymentMethod: 'pix',
      paidAt: '2026-11-27T12:00:00.000Z',
    });
    expect(
      await new DebtRepository(database).getFinancialSummary(workspace.id, debt.id),
    ).toMatchObject({ netPaidCents: 50_000, pendingCents: 0, isPaid: true });
    expect(
      (await new DebtRepository(database).findOverview(workspace.id, debt.id, workspace.timezone))
        ?.status.financialStatus,
    ).toBe('paid');

    await new PaymentReversalService(database).reverse(workspace.id, {
      operationId: randomUUID(),
      paymentId: second.id,
      reason: 'Pagamento lançado no fiado incorreto',
      reversedAt: '2026-11-28T12:00:00.000Z',
    });
    expect(
      await new DebtRepository(database).getFinancialSummary(workspace.id, debt.id),
    ).toMatchObject({
      grossPaidCents: 50_000,
      reversedCents: 30_000,
      netPaidCents: 20_000,
      pendingCents: 30_000,
    });
    expect(
      (await new DebtRepository(database).findOverview(workspace.id, debt.id, workspace.timezone))
        ?.status.financialStatus,
    ).toBe('partially_paid');
    expect(await new PaymentRepository(database).listByDebt(workspace.id, debt.id)).toHaveLength(2);
    expect(await new PaymentRepository(database).findById(workspace.id, first.id)).not.toBeNull();
    expect(
      (await new PaymentRepository(database).findDetails(workspace.id, second.id))?.reversalReason,
    ).toBe('Pagamento lançado no fiado incorreto');
    expect(
      await new AuditRepository(database).listByEntity(workspace.id, 'payment', second.id),
    ).toHaveLength(2);
    database.close();
  });

  it('keeps payment details isolated by workspace and rejects oversized notes at the service boundary', async () => {
    const { database, workspace, customer, debt } = await fixture();
    const service = new PaymentService(database);
    const payment = await service.register(workspace.id, {
      operationId: randomUUID(),
      debtId: debt.id,
      amountCents: 10_000,
      paymentMethod: 'debit_card',
      paidAt: '2026-11-26T12:00:00.000Z',
      notes: 'Entrada confirmada',
    });
    const details = await new PaymentRepository(database).findDetails(workspace.id, payment.id);
    expect(details).toMatchObject({
      customerId: customer.id,
      customerName: 'Cliente Pagamento',
      debtDescription: 'Serviço de suspensão',
      reversalId: null,
    });
    expect(details?.createdAt).toMatch(/^\d{4}-\d{2}-\d{2}T.*Z$/);
    expect(await new PaymentRepository(database).findDetails(randomUUID(), payment.id)).toBeNull();
    await expect(
      service.register(workspace.id, {
        operationId: randomUUID(),
        debtId: debt.id,
        amountCents: 1_000,
        paymentMethod: 'other',
        paidAt: '2026-11-26T12:00:00.000Z',
        notes: 'x'.repeat(1001),
      }),
    ).rejects.toMatchObject({ code: 'VALIDATION_ERROR' });
    database.close();
  });

  it('rolls back the reversal when its audit record fails', async () => {
    const { database, workspace, debt } = await fixture();
    const payment = await new PaymentService(database).register(workspace.id, {
      operationId: randomUUID(),
      debtId: debt.id,
      amountCents: 20_000,
      paymentMethod: 'bank_transfer',
      paidAt: '2026-11-26T12:00:00.000Z',
    });
    const service = new PaymentReversalService(new FailingReversalAuditExecutor(database));
    await expect(
      service.reverse(workspace.id, {
        operationId: randomUUID(),
        paymentId: payment.id,
        reason: 'Teste de rollback',
        reversedAt: '2026-11-27T12:00:00.000Z',
      }),
    ).rejects.toThrow('audit failure');
    expect(
      await new PaymentReversalRepository(database).findByPaymentId(workspace.id, payment.id),
    ).toBeNull();
    expect(
      await new DebtRepository(database).getFinancialSummary(workspace.id, debt.id),
    ).toMatchObject({ netPaidCents: 20_000, pendingCents: 30_000 });
    database.close();
  });
});
