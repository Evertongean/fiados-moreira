import { randomUUID } from 'node:crypto';

import { CustomerRepository } from '@/database/repositories/customer.repository';
import { DashboardRepository } from '@/database/repositories/dashboard.repository';
import { ReportRepository } from '@/database/repositories/report.repository';
import { WorkspaceRepository } from '@/database/repositories/workspace.repository';
import { DebtService } from '@/features/debts/services/DebtService';
import { DEFAULT_REPORT_FILTERS } from '@/features/reports/domain/reportTypes';
import { PaymentReversalService } from '@/features/payments/services/PaymentReversalService';
import { PaymentService } from '@/features/payments/services/PaymentService';

import { createTestDatabase } from '../database/createTestDatabase';

describe('financial report repository', () => {
  it('keeps current balances separate from period movements and matches dashboard indicators', async () => {
    const database = await createTestDatabase();
    const workspace = await new WorkspaceRepository(database).initializeLocal();
    const customer = await new CustomerRepository(database).create(workspace.id, {
      name: 'Cliente principal',
    });
    const debts = new DebtService(database);
    const firstDebt = await debts.create(workspace.id, {
      customerId: customer.id,
      description: 'Motor',
      totalCents: 10_000,
      serviceDate: '2026-10-01',
      dueDate: '2026-10-20',
    });
    const secondDebt = await debts.create(workspace.id, {
      customerId: customer.id,
      description: 'Suspensão',
      totalCents: 20_000,
      serviceDate: '2026-11-01',
    });
    const thirdDebt = await debts.create(workspace.id, {
      customerId: customer.id,
      description: 'Elétrica',
      totalCents: 3_000,
      serviceDate: '2026-10-01',
    });
    const payments = new PaymentService(database);
    const reversedPayment = await payments.register(workspace.id, {
      operationId: randomUUID(),
      debtId: firstDebt.id,
      amountCents: 4_000,
      paymentMethod: 'pix',
      paidAt: '2026-11-05T12:00:00.000Z',
    });
    await payments.register(workspace.id, {
      operationId: randomUUID(),
      debtId: secondDebt.id,
      amountCents: 5_000,
      paymentMethod: 'cash',
      paidAt: '2026-11-10T12:00:00.000Z',
    });
    const reversedInPeriod = await payments.register(workspace.id, {
      operationId: randomUUID(),
      debtId: thirdDebt.id,
      amountCents: 1_000,
      paymentMethod: 'credit_card',
      paidAt: '2026-10-10T12:00:00.000Z',
    });
    await new PaymentReversalService(database).reverse(workspace.id, {
      operationId: randomUUID(),
      paymentId: reversedInPeriod.id,
      reason: 'Pagamento lançado incorretamente',
      reversedAt: '2026-11-20T12:00:00.000Z',
    });
    await new PaymentReversalService(database).reverse(workspace.id, {
      operationId: randomUUID(),
      paymentId: reversedPayment.id,
      reason: 'Pagamento lançado incorretamente',
      reversedAt: '2026-12-02T12:00:00.000Z',
    });
    const referenceDate = new Date('2026-11-27T12:00:00.000Z');
    const reports = new ReportRepository(database);
    const snapshot = await reports.getSnapshot(
      workspace.id,
      workspace.timezone,
      DEFAULT_REPORT_FILTERS,
      referenceDate,
    );
    expect(snapshot.summary).toMatchObject({
      currentReceivableCents: 28_000,
      currentOverdueCents: 10_000,
      currentOpenDebtCount: 3,
      grossReceivedCents: 9_000,
      reversedCents: 1_000,
      netReceivedCents: 8_000,
      paymentCount: 2,
      reversalCount: 1,
    });
    expect(snapshot.receivables.find(({ debtId }) => debtId === firstDebt.id)).toMatchObject({
      paidCents: 0,
      pendingCents: 10_000,
      financialStatus: 'pending',
    });
    expect(snapshot.methodBreakdown).toEqual(
      expect.arrayContaining([
        expect.objectContaining({ paymentMethod: 'pix', grossCents: 4_000, netCents: 4_000 }),
        expect.objectContaining({ paymentMethod: 'cash', grossCents: 5_000, netCents: 5_000 }),
        expect.objectContaining({
          paymentMethod: 'credit_card',
          grossCents: 0,
          reversedCents: 1_000,
          netCents: -1_000,
        }),
      ]),
    );
    expect(snapshot.customerRanking[0]).toMatchObject({
      customerId: customer.id,
      pendingCents: 28_000,
    });

    const dashboard = await new DashboardRepository(database).getSnapshot(
      workspace.id,
      workspace.timezone,
      referenceDate,
    );
    expect(snapshot.summary.currentReceivableCents).toBe(dashboard.summary.receivableCents);
    expect(snapshot.summary.currentOverdueCents).toBe(dashboard.summary.overdueCents);
    expect(snapshot.summary.grossReceivedCents).toBe(dashboard.summary.monthGrossReceivedCents);
    expect(snapshot.summary.reversedCents).toBe(dashboard.summary.monthReversedCents);
    expect(snapshot.summary.netReceivedCents).toBe(dashboard.summary.monthNetReceivedCents);
    database.close();
  });

  it('attributes a reversal to its effective period and respects combined filters', async () => {
    const database = await createTestDatabase();
    const workspace = await new WorkspaceRepository(database).initializeLocal();
    const firstCustomer = await new CustomerRepository(database).create(workspace.id, {
      name: 'Primeiro',
    });
    const secondCustomer = await new CustomerRepository(database).create(workspace.id, {
      name: 'Segundo',
    });
    const debt = await new DebtService(database).create(workspace.id, {
      customerId: firstCustomer.id,
      description: 'Freios',
      totalCents: 15_000,
      serviceDate: '2026-10-01',
    });
    const otherDebt = await new DebtService(database).create(workspace.id, {
      customerId: secondCustomer.id,
      description: 'Outro',
      totalCents: 8_000,
      serviceDate: '2026-10-01',
    });
    const payment = await new PaymentService(database).register(workspace.id, {
      operationId: randomUUID(),
      debtId: debt.id,
      amountCents: 6_000,
      paymentMethod: 'pix',
      paidAt: '2026-11-15T12:00:00.000Z',
    });
    await new PaymentService(database).register(workspace.id, {
      operationId: randomUUID(),
      debtId: otherDebt.id,
      amountCents: 2_000,
      paymentMethod: 'cash',
      paidAt: '2026-12-03T12:00:00.000Z',
    });
    await new PaymentReversalService(database).reverse(workspace.id, {
      operationId: randomUUID(),
      paymentId: payment.id,
      reason: 'Correção',
      reversedAt: '2026-12-04T12:00:00.000Z',
    });
    const snapshot = await new ReportRepository(database).getSnapshot(
      workspace.id,
      workspace.timezone,
      {
        period: 'custom',
        customStartDate: '2026-12-01',
        customEndDate: '2026-12-31',
        customerId: firstCustomer.id,
        paymentMethod: 'pix',
        financialStatus: 'pending',
      },
      new Date('2026-12-10T12:00:00.000Z'),
    );
    expect(snapshot.summary).toMatchObject({
      currentReceivableCents: 15_000,
      grossReceivedCents: 0,
      reversedCents: 6_000,
      netReceivedCents: -6_000,
      paymentCount: 0,
      reversalCount: 1,
    });
    expect(snapshot.movements).toEqual([
      expect.objectContaining({ type: 'reversal', amountCents: 6_000, paymentMethod: 'pix' }),
    ]);
    database.close();
  });

  it('excludes canceled debts and isolates reports by workspace', async () => {
    const database = await createTestDatabase();
    const firstWorkspace = await new WorkspaceRepository(database).initializeLocal();
    const secondWorkspaceId = randomUUID();
    await database.run(
      'insert into workspaces (id, name, timezone, currency) values (?, ?, ?, ?)',
      [secondWorkspaceId, 'Outra oficina', 'America/Fortaleza', 'BRL'],
    );
    const firstCustomer = await new CustomerRepository(database).create(firstWorkspace.id, {
      name: 'Primeiro',
    });
    const secondCustomer = await new CustomerRepository(database).create(secondWorkspaceId, {
      name: 'Segundo',
    });
    const canceled = await new DebtService(database).create(firstWorkspace.id, {
      customerId: firstCustomer.id,
      description: 'Cancelado',
      totalCents: 99_000,
      serviceDate: '2026-11-01',
    });
    await new DebtService(database).cancel(firstWorkspace.id, canceled.id, {
      operationId: randomUUID(),
      reason: 'Serviço não realizado',
    });
    await new DebtService(database).create(secondWorkspaceId, {
      customerId: secondCustomer.id,
      description: 'Outro workspace',
      totalCents: 50_000,
      serviceDate: '2026-11-01',
    });
    const snapshot = await new ReportRepository(database).getSnapshot(
      firstWorkspace.id,
      firstWorkspace.timezone,
      DEFAULT_REPORT_FILTERS,
      new Date('2026-11-27T12:00:00.000Z'),
    );
    expect(snapshot.summary.currentReceivableCents).toBe(0);
    expect(snapshot.receivables).toHaveLength(0);
    expect(snapshot.movements).toHaveLength(0);
    database.close();
  });
});
