import { randomUUID } from 'node:crypto';

import { CustomerRepository } from '@/database/repositories/customer.repository';
import { DebtRepository } from '@/database/repositories/debt.repository';
import { WorkspaceRepository } from '@/database/repositories/workspace.repository';
import { DebtService } from '@/features/debts/services/DebtService';
import { PaymentService } from '@/features/payments/services/PaymentService';

import { createTestDatabase } from '../database/createTestDatabase';

const REFERENCE_DATE = new Date('2026-11-26T12:00:00.000Z');
const TIMEZONE = 'America/Fortaleza';

describe('advanced debt filters', () => {
  it('combines customer, overdue, period, due-date and value criteria', async () => {
    const fixture = await createFixture();
    const rows = await new DebtRepository(fixture.database).listOverview(fixture.workspaceId, {
      timezone: TIMEZONE,
      referenceDate: REFERENCE_DATE,
      filter: 'open',
      customerId: fixture.customerId,
      overdue: 'overdue',
      dateField: 'due',
      startDate: '2026-11-01',
      endDate: '2026-11-25',
      minAmountCents: 9_000,
      maxAmountCents: 15_000,
      dueDate: 'with_due_date',
    });

    expect(rows).toEqual([
      expect.objectContaining({ id: fixture.overdueDebtId, totalCents: 10_000 }),
    ]);
    expect(rows[0]?.summary).toMatchObject({ netPaidCents: 3_000, pendingCents: 7_000 });
    fixture.database.close();
  });

  it('orders by value and due date while keeping canceled debts distinct', async () => {
    const fixture = await createFixture();
    const repository = new DebtRepository(fixture.database);
    const byBalance = await repository.listOverview(fixture.workspaceId, {
      timezone: TIMEZONE,
      referenceDate: REFERENCE_DATE,
      filter: 'open',
      sort: 'amount_desc',
    });
    expect(byBalance.map(({ id }) => id)).toEqual([
      fixture.futureDebtId,
      fixture.overdueDebtId,
      fixture.noDueDateDebtId,
    ]);

    const byDueDate = await repository.listOverview(fixture.workspaceId, {
      timezone: TIMEZONE,
      referenceDate: REFERENCE_DATE,
      filter: 'open',
      sort: 'due_asc',
    });
    expect(byDueDate.map(({ id }) => id)).toEqual([
      fixture.overdueDebtId,
      fixture.futureDebtId,
      fixture.noDueDateDebtId,
    ]);

    const byDueDateDescending = await repository.listOverview(fixture.workspaceId, {
      timezone: TIMEZONE,
      referenceDate: REFERENCE_DATE,
      filter: 'open',
      sort: 'due_desc',
    });
    expect(byDueDateDescending.map(({ id }) => id)).toEqual([
      fixture.futureDebtId,
      fixture.overdueDebtId,
      fixture.noDueDateDebtId,
    ]);

    const canceled = await repository.listOverview(fixture.workspaceId, {
      timezone: TIMEZONE,
      referenceDate: REFERENCE_DATE,
      filter: 'canceled',
    });
    expect(canceled.map(({ id }) => id)).toEqual([fixture.canceledDebtId]);
    fixture.database.close();
  });
});

async function createFixture() {
  const database = await createTestDatabase();
  const workspace = await new WorkspaceRepository(database).initializeLocal();
  const customer = await new CustomerRepository(database).create(workspace.id, {
    name: 'Cliente filtros',
  });
  const debts = new DebtService(database);
  const overdueDebt = await debts.create(workspace.id, {
    customerId: customer.id,
    description: 'Parcial atrasado',
    totalCents: 10_000,
    serviceDate: '2026-11-10',
    dueDate: '2026-11-20',
  });
  await new PaymentService(database).register(workspace.id, {
    operationId: randomUUID(),
    debtId: overdueDebt.id,
    amountCents: 3_000,
    paymentMethod: 'cash',
    paidAt: '2026-11-21T12:00:00.000Z',
  });
  const futureDebt = await debts.create(workspace.id, {
    customerId: customer.id,
    description: 'Futuro',
    totalCents: 20_000,
    serviceDate: '2026-11-11',
    dueDate: '2026-11-30',
  });
  const noDueDateDebt = await debts.create(workspace.id, {
    customerId: customer.id,
    description: 'Sem vencimento',
    totalCents: 5_000,
    serviceDate: '2026-11-12',
  });
  const canceledDebt = await debts.create(workspace.id, {
    customerId: customer.id,
    description: 'Cancelado',
    totalCents: 50_000,
    serviceDate: '2026-11-01',
    dueDate: '2026-11-10',
  });
  await debts.cancel(workspace.id, canceledDebt.id, {
    operationId: randomUUID(),
    reason: 'Serviço não realizado',
    canceledAt: '2026-11-15T12:00:00.000Z',
  });
  return {
    database,
    workspaceId: workspace.id,
    customerId: customer.id,
    overdueDebtId: overdueDebt.id,
    futureDebtId: futureDebt.id,
    noDueDateDebtId: noDueDateDebt.id,
    canceledDebtId: canceledDebt.id,
  };
}
