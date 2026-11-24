import { randomUUID } from 'node:crypto';

import { AuditRepository } from '@/database/repositories/audit.repository';
import { CustomerRepository } from '@/database/repositories/customer.repository';
import { DebtRepository } from '@/database/repositories/debt.repository';
import { PaymentRepository } from '@/database/repositories/payment.repository';
import { WorkspaceRepository } from '@/database/repositories/workspace.repository';
import { calculateDebtStatus } from '@/features/debts/domain/status';
import { DebtService } from '@/features/debts/services/DebtService';
import { PaymentReversalService } from '@/features/payments/services/PaymentReversalService';
import { PaymentService } from '@/features/payments/services/PaymentService';
import type { SqlExecutor, SqlParams, SqlRunResult } from '@/database/types/executor';

import { createTestDatabase } from '../database/createTestDatabase';
import type { NodeSqlExecutor } from '../database/NodeSqlExecutor';

async function fixture(totalCents: number) {
  const database = await createTestDatabase();
  const workspace = await new WorkspaceRepository(database).initializeLocal();
  const customer = await new CustomerRepository(database).create(workspace.id, {
    name: 'Cliente de Teste',
  });
  const debt = await new DebtService(database).create(workspace.id, {
    customerId: customer.id,
    description: 'Serviço de teste',
    totalCents,
    serviceDate: '2026-01-01',
  });
  return { database, workspace, debt };
}

function payment(debtId: string, amountCents: number, operationId = randomUUID()) {
  return {
    operationId,
    debtId,
    amountCents,
    paymentMethod: 'pix' as const,
    paidAt: '2026-01-02T12:00:00.000Z',
  };
}

async function summary(database: NodeSqlExecutor, workspaceId: string, debtId: string) {
  return new DebtRepository(database).getFinancialSummary(workspaceId, debtId);
}

class FailingAuditExecutor implements SqlExecutor {
  constructor(private readonly delegate: SqlExecutor) {}
  run(sql: string, params?: SqlParams): Promise<SqlRunResult> {
    if (sql.includes('insert into audit_logs'))
      return Promise.reject(new Error('injected failure'));
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
    return this.delegate.transaction((transaction) => task(new FailingAuditExecutor(transaction)));
  }
}

describe('transactional financial flows', () => {
  it('handles partial payments and settlement (scenarios A and B)', async () => {
    const { database, workspace, debt } = await fixture(50_000);
    const service = new PaymentService(database);
    await service.register(workspace.id, payment(debt.id, 10_000));
    await service.register(workspace.id, payment(debt.id, 15_000));
    expect(await summary(database, workspace.id, debt.id)).toMatchObject({
      netPaidCents: 25_000,
      pendingCents: 25_000,
    });
    await service.register(workspace.id, payment(debt.id, 25_000));
    const settled = await summary(database, workspace.id, debt.id);
    expect(settled).toMatchObject({ pendingCents: 0, isPaid: true });
    expect(
      calculateDebtStatus({
        summary: settled,
        canceledAt: null,
        dueDate: null,
        timezone: workspace.timezone,
      }).financialStatus,
    ).toBe('paid');
    await expect(service.register(workspace.id, payment(debt.id, 1))).rejects.toMatchObject({
      code: 'DEBT_ALREADY_PAID',
    });
    database.close();
  });

  it('rejects excessive and invalid payments without writing (scenario C)', async () => {
    const { database, workspace, debt } = await fixture(30_000);
    const service = new PaymentService(database);
    await service.register(workspace.id, payment(debt.id, 20_000));
    await expect(service.register(workspace.id, payment(debt.id, 15_000))).rejects.toMatchObject({
      code: 'PAYMENT_EXCEEDS_BALANCE',
    });
    for (const amountCents of [0, -1, 1.5]) {
      await expect(
        service.register(workspace.id, payment(debt.id, amountCents)),
      ).rejects.toMatchObject({ code: 'VALIDATION_ERROR' });
    }
    expect(await new PaymentRepository(database).listByDebt(workspace.id, debt.id)).toHaveLength(1);
    expect((await summary(database, workspace.id, debt.id)).pendingCents).toBe(10_000);
    database.close();
  });

  it('keeps payment history and audit when reversing (scenario D)', async () => {
    const { database, workspace, debt } = await fixture(50_000);
    const registered = await new PaymentService(database).register(
      workspace.id,
      payment(debt.id, 20_000),
    );
    const reversals = new PaymentReversalService(database);
    const reversalInput = {
      operationId: randomUUID(),
      paymentId: registered.id,
      reason: 'Lançamento incorreto',
      reversedAt: '2026-01-03T12:00:00.000Z',
    };
    const reversal = await reversals.reverse(workspace.id, reversalInput);
    expect((await reversals.reverse(workspace.id, reversalInput)).id).toBe(reversal.id);
    expect((await summary(database, workspace.id, debt.id)).pendingCents).toBe(50_000);
    expect(
      await new PaymentRepository(database).findById(workspace.id, registered.id),
    ).not.toBeNull();
    expect(
      await new AuditRepository(database).listByEntity(workspace.id, 'payment', registered.id),
    ).toHaveLength(2);
    await expect(
      reversals.reverse(workspace.id, {
        operationId: randomUUID(),
        paymentId: registered.id,
        reason: 'Outro',
        reversedAt: '2026-01-04T12:00:00.000Z',
      }),
    ).rejects.toMatchObject({ code: 'PAYMENT_ALREADY_REVERSED' });
    database.close();
  });

  it('serializes concurrent payments so only one succeeds (scenario E)', async () => {
    const { database, workspace, debt } = await fixture(30_000);
    const service = new PaymentService(database);
    const results = await Promise.allSettled([
      service.register(workspace.id, payment(debt.id, 20_000)),
      service.register(workspace.id, payment(debt.id, 20_000)),
    ]);
    expect(results.filter(({ status }) => status === 'fulfilled')).toHaveLength(1);
    expect(results.filter(({ status }) => status === 'rejected')).toHaveLength(1);
    expect((await summary(database, workspace.id, debt.id)).pendingCents).toBe(10_000);
    database.close();
  });

  it('makes repeated operations idempotent and rejects conflicting reuse', async () => {
    const { database, workspace, debt } = await fixture(30_000);
    const service = new PaymentService(database);
    const operationId = randomUUID();
    const input = payment(debt.id, 10_000, operationId);
    const first = await service.register(workspace.id, input);
    expect((await service.register(workspace.id, input)).id).toBe(first.id);
    await expect(
      service.register(workspace.id, { ...input, amountCents: 5_000 }),
    ).rejects.toMatchObject({ code: 'IDEMPOTENCY_CONFLICT' });
    expect(await new PaymentRepository(database).listByDebt(workspace.id, debt.id)).toHaveLength(1);
    database.close();
  });

  it('rolls back the payment if its audit record fails', async () => {
    const { database, workspace, debt } = await fixture(30_000);
    const service = new PaymentService(new FailingAuditExecutor(database));
    await expect(service.register(workspace.id, payment(debt.id, 10_000))).rejects.toThrow(
      'injected failure',
    );
    expect(await new PaymentRepository(database).listByDebt(workspace.id, debt.id)).toHaveLength(0);
    expect((await summary(database, workspace.id, debt.id)).pendingCents).toBe(30_000);
    database.close();
  });

  it('cancels only debts without net payments', async () => {
    const first = await fixture(10_000);
    const service = new DebtService(first.database);
    const cancelInput = {
      operationId: randomUUID(),
      reason: 'Serviço não realizado',
    };
    const canceled = await service.cancel(first.workspace.id, first.debt.id, cancelInput);
    expect((await service.cancel(first.workspace.id, first.debt.id, cancelInput)).id).toBe(
      canceled.id,
    );
    expect(canceled.canceledAt).not.toBeNull();
    await expect(
      new PaymentService(first.database).register(
        first.workspace.id,
        payment(first.debt.id, 1_000),
      ),
    ).rejects.toMatchObject({ code: 'DEBT_CANCELED' });
    first.database.close();

    const second = await fixture(10_000);
    await new PaymentService(second.database).register(
      second.workspace.id,
      payment(second.debt.id, 1_000),
    );
    await expect(
      new DebtService(second.database).cancel(second.workspace.id, second.debt.id, {
        operationId: randomUUID(),
        reason: 'Cancelar',
      }),
    ).rejects.toMatchObject({ code: 'CONSTRAINT_VIOLATION' });
    second.database.close();
  });

  it('does not reduce a debt below its net paid amount', async () => {
    const { database, workspace, debt } = await fixture(30_000);
    await new PaymentService(database).register(workspace.id, payment(debt.id, 10_000));
    await expect(
      new DebtService(database).update(workspace.id, debt.id, { totalCents: 9_999 }),
    ).rejects.toMatchObject({ code: 'INVALID_AMOUNT' });
    expect((await summary(database, workspace.id, debt.id)).originalCents).toBe(30_000);
    database.close();
  });

  it('rejects reversal without a valid payment or reason', async () => {
    const { database, workspace } = await fixture(30_000);
    const service = new PaymentReversalService(database);
    await expect(
      service.reverse(workspace.id, {
        operationId: randomUUID(),
        paymentId: randomUUID(),
        reason: 'Pagamento inexistente',
        reversedAt: '2026-01-03T12:00:00.000Z',
      }),
    ).rejects.toMatchObject({ code: 'RECORD_NOT_FOUND' });
    await expect(
      service.reverse(workspace.id, {
        operationId: randomUUID(),
        paymentId: randomUUID(),
        reason: '   ',
        reversedAt: '2026-01-03T12:00:00.000Z',
      }),
    ).rejects.toMatchObject({ code: 'VALIDATION_ERROR' });
    database.close();
  });
});
