import { randomUUID } from 'node:crypto';

import { CustomerRepository } from '@/database/repositories/customer.repository';
import { DashboardRepository } from '@/database/repositories/dashboard.repository';
import { WorkspaceRepository } from '@/database/repositories/workspace.repository';
import {
  getCivilMonthRange,
  getLastCivilDaysRange,
} from '@/features/dashboard/domain/dashboardDateUtils';
import { DebtService } from '@/features/debts/services/DebtService';
import { PaymentReversalService } from '@/features/payments/services/PaymentReversalService';
import { PaymentService } from '@/features/payments/services/PaymentService';

import { createTestDatabase } from '../database/createTestDatabase';

const REFERENCE_DATE = new Date('2026-11-26T12:00:00.000Z');

describe('dashboard repository', () => {
  it('consolidates balances, due dates, partial payments, reversals and cancellations', async () => {
    const { database, workspaceId } = await fixture();
    const snapshot = await new DashboardRepository(database).getSnapshot(
      workspaceId,
      'America/Fortaleza',
      REFERENCE_DATE,
    );

    expect(snapshot.currentCivilDate).toBe('2026-11-26');
    expect(snapshot.summary).toEqual({
      receivableCents: 86_000,
      overdueCents: 18_000,
      dueTodayCents: 20_000,
      debtorCustomerCount: 2,
      openDebtCount: 6,
      overdueDebtCount: 2,
      monthGrossReceivedCents: 9_000,
      monthReversedCents: 15_000,
      monthNetReceivedCents: -6_000,
    });
    expect(snapshot.upcomingDebts.map(({ dueDate }) => dueDate)).toEqual([
      '2026-11-26',
      '2026-11-28',
    ]);
    expect(snapshot.priorityOverdueDebts.map(({ dueDate }) => dueDate)).toEqual([
      '2026-11-20',
      '2026-11-25',
    ]);
    expect(snapshot.priorityOverdueDebts.map(({ pendingCents }) => pendingCents)).toEqual([
      12_000, 6_000,
    ]);
    expect(
      (
        await new CustomerRepository(database).list(workspaceId, {
          status: 'all',
          outstandingOnly: true,
        })
      ).map(({ name }) => name),
    ).toEqual(['Cliente Principal', 'Cliente Secundário']);
    database.close();
  });

  it('uses the effective instant of payments and reversals in monthly and daily cash flow', async () => {
    const { database, workspaceId } = await fixture();
    const snapshot = await new DashboardRepository(database).getSnapshot(
      workspaceId,
      'America/Fortaleza',
      REFERENCE_DATE,
    );

    expect(snapshot.dailyReceipts).toHaveLength(7);
    expect(
      snapshot.dailyReceipts.find(({ civilDate }) => civilDate === '2026-11-20'),
    ).toMatchObject({
      grossCents: 4_000,
      reversedCents: 0,
      netCents: 4_000,
    });
    expect(
      snapshot.dailyReceipts.find(({ civilDate }) => civilDate === '2026-11-24'),
    ).toMatchObject({
      grossCents: 5_000,
      reversedCents: 0,
      netCents: 5_000,
    });
    expect(
      snapshot.dailyReceipts.find(({ civilDate }) => civilDate === '2026-11-25'),
    ).toMatchObject({
      grossCents: 0,
      reversedCents: 5_000,
      netCents: -5_000,
    });
    expect(snapshot.dailyReceipts.reduce((total, day) => total + day.grossCents, 0)).toBe(9_000);
    expect(snapshot.dailyReceipts.reduce((total, day) => total + day.reversedCents, 0)).toBe(5_000);
    database.close();
  });

  it('isolates every dashboard section by workspace', async () => {
    const { database, workspaceId } = await fixture();
    const otherWorkspaceId = randomUUID();
    await database.run(
      'insert into workspaces (id, name, timezone, currency) values (?, ?, ?, ?)',
      [otherWorkspaceId, 'Outra Oficina', 'America/Fortaleza', 'BRL'],
    );
    const otherCustomer = await new CustomerRepository(database).create(otherWorkspaceId, {
      name: 'Cliente de outro workspace',
    });
    await new DebtService(database).create(otherWorkspaceId, {
      customerId: otherCustomer.id,
      description: 'Não deve aparecer',
      totalCents: 99_000,
      serviceDate: '2026-11-01',
      dueDate: '2026-11-02',
    });

    const snapshot = await new DashboardRepository(database).getSnapshot(
      workspaceId,
      'America/Fortaleza',
      REFERENCE_DATE,
    );
    expect(snapshot.summary.receivableCents).toBe(86_000);
    expect(
      snapshot.upcomingDebts.every(({ customerName }) => customerName !== otherCustomer.name),
    ).toBe(true);
    expect(
      snapshot.priorityOverdueDebts.every(
        ({ customerName }) => customerName !== otherCustomer.name,
      ),
    ).toBe(true);
    expect(
      snapshot.recentActivities.every(({ customerName }) => customerName !== otherCustomer.name),
    ).toBe(true);
    database.close();
  });

  it('calculates civil period boundaries in the workspace timezone', () => {
    expect(getCivilMonthRange(REFERENCE_DATE, 'America/Fortaleza')).toEqual({
      startCivilDate: '2026-11-01',
      endCivilDateExclusive: '2026-12-01',
      startAt: '2026-11-01T03:00:00.000Z',
      endAt: '2026-12-01T03:00:00.000Z',
    });
    expect(getLastCivilDaysRange(REFERENCE_DATE, 'America/Fortaleza', 7)).toEqual({
      startCivilDate: '2026-11-20',
      endCivilDateExclusive: '2026-11-27',
      startAt: '2026-11-20T03:00:00.000Z',
      endAt: '2026-11-27T03:00:00.000Z',
    });
  });
});

async function fixture() {
  const database = await createTestDatabase();
  const workspace = await new WorkspaceRepository(database).initializeLocal();
  const customers = new CustomerRepository(database);
  const firstCustomer = await customers.create(workspace.id, { name: 'Cliente Principal' });
  const secondCustomer = await customers.create(workspace.id, { name: 'Cliente Secundário' });
  const settledCustomer = await customers.create(workspace.id, { name: 'Cliente Quitado' });
  const debts = new DebtService(database);
  const payments = new PaymentService(database);
  const reversals = new PaymentReversalService(database);

  const overduePartial = await debts.create(workspace.id, {
    customerId: firstCustomer.id,
    description: 'Fiado parcial atrasado',
    totalCents: 10_000,
    serviceDate: '2026-11-01',
    dueDate: '2026-11-25',
  });
  await payments.register(workspace.id, {
    operationId: randomUUID(),
    debtId: overduePartial.id,
    amountCents: 4_000,
    paymentMethod: 'pix',
    paidAt: '2026-11-20T12:00:00.000Z',
  });

  await debts.create(workspace.id, {
    customerId: firstCustomer.id,
    description: 'Vence hoje',
    totalCents: 20_000,
    serviceDate: '2026-11-02',
    dueDate: '2026-11-26',
  });

  const future = await debts.create(workspace.id, {
    customerId: firstCustomer.id,
    description: 'Vencimento futuro',
    totalCents: 30_000,
    serviceDate: '2026-11-03',
    dueDate: '2026-11-28',
  });
  const reversedThisWeek = await payments.register(workspace.id, {
    operationId: randomUUID(),
    debtId: future.id,
    amountCents: 5_000,
    paymentMethod: 'cash',
    paidAt: '2026-11-24T12:00:00.000Z',
  });
  await reversals.reverse(workspace.id, {
    operationId: randomUUID(),
    paymentId: reversedThisWeek.id,
    reason: 'Pagamento lançado incorretamente',
    reversedAt: '2026-11-25T12:00:00.000Z',
  });

  await debts.create(workspace.id, {
    customerId: firstCustomer.id,
    description: 'Sem vencimento',
    totalCents: 8_000,
    serviceDate: '2026-11-04',
  });

  const paid = await debts.create(workspace.id, {
    customerId: settledCustomer.id,
    description: 'Quitado',
    totalCents: 15_000,
    serviceDate: '2026-10-01',
  });
  await payments.register(workspace.id, {
    operationId: randomUUID(),
    debtId: paid.id,
    amountCents: 15_000,
    paymentMethod: 'bank_transfer',
    paidAt: '2026-10-10T12:00:00.000Z',
  });

  const oldPaymentReversedThisMonth = await debts.create(workspace.id, {
    customerId: firstCustomer.id,
    description: 'Estorno de pagamento antigo',
    totalCents: 10_000,
    serviceDate: '2026-10-20',
  });
  const oldPayment = await payments.register(workspace.id, {
    operationId: randomUUID(),
    debtId: oldPaymentReversedThisMonth.id,
    amountCents: 10_000,
    paymentMethod: 'pix',
    paidAt: '2026-10-31T12:00:00.000Z',
  });
  await reversals.reverse(workspace.id, {
    operationId: randomUUID(),
    paymentId: oldPayment.id,
    reason: 'Pagamento devolvido no mês seguinte',
    reversedAt: '2026-11-02T12:00:00.000Z',
  });

  const canceled = await debts.create(workspace.id, {
    customerId: firstCustomer.id,
    description: 'Cancelado',
    totalCents: 7_000,
    serviceDate: '2026-11-05',
    dueDate: '2026-11-10',
  });
  await debts.cancel(workspace.id, canceled.id, {
    operationId: randomUUID(),
    reason: 'Serviço não realizado',
    canceledAt: '2026-11-06T12:00:00.000Z',
  });

  await debts.create(workspace.id, {
    customerId: secondCustomer.id,
    description: 'Segundo cliente atrasado',
    totalCents: 12_000,
    serviceDate: '2026-11-01',
    dueDate: '2026-11-20',
  });

  return { database, workspaceId: workspace.id };
}
