import { randomUUID } from 'node:crypto';

import { CustomerRepository } from '@/database/repositories/customer.repository';
import { WorkspaceRepository } from '@/database/repositories/workspace.repository';
import { CustomerService } from '@/features/customers/services/CustomerService';
import { DebtService } from '@/features/debts/services/DebtService';
import { PaymentService } from '@/features/payments/services/PaymentService';

import { createTestDatabase } from '../database/createTestDatabase';

const TIMEZONE = 'America/Fortaleza';
const REFERENCE_DATE = new Date('2026-11-26T12:00:00.000Z');

describe('advanced customer filters', () => {
  it('derives debt filters and balance ordering from valid payments', async () => {
    const fixture = await createFixture();
    const repository = new CustomerRepository(fixture.database);

    const overdue = await repository.listAdvanced(
      fixture.workspaceId,
      { status: 'all', debt: 'overdue' },
      TIMEZONE,
      REFERENCE_DATE,
    );
    expect(overdue).toEqual([
      expect.objectContaining({ id: fixture.overdueCustomerId, outstandingCents: 8_000 }),
    ]);

    const debtors = await repository.listAdvanced(
      fixture.workspaceId,
      { status: 'all', debt: 'with_debt', sort: 'balance_desc' },
      TIMEZONE,
      REFERENCE_DATE,
    );
    expect(debtors.map(({ id, outstandingCents }) => ({ id, outstandingCents }))).toEqual([
      { id: fixture.futureCustomerId, outstandingCents: 20_000 },
      { id: fixture.overdueCustomerId, outstandingCents: 8_000 },
    ]);
    fixture.database.close();
  });

  it('combines archive and no-debt filters without losing archived records', async () => {
    const fixture = await createFixture();
    const rows = await new CustomerRepository(fixture.database).listAdvanced(
      fixture.workspaceId,
      { status: 'archived', debt: 'without_debt' },
      TIMEZONE,
      REFERENCE_DATE,
    );
    expect(rows.map(({ id }) => id)).toEqual([fixture.archivedCustomerId]);
    fixture.database.close();
  });
});

async function createFixture() {
  const database = await createTestDatabase();
  const workspace = await new WorkspaceRepository(database).initializeLocal();
  const customers = new CustomerService(database);
  const overdueCustomer = await customers.create(workspace.id, { name: 'Cliente atrasado' });
  const futureCustomer = await customers.create(workspace.id, { name: 'Cliente futuro' });
  const archivedCustomer = await customers.create(workspace.id, { name: 'Cliente arquivado' });
  await customers.archive(workspace.id, archivedCustomer.id);
  const debts = new DebtService(database);
  const overdueDebt = await debts.create(workspace.id, {
    customerId: overdueCustomer.id,
    description: 'Serviço atrasado',
    totalCents: 10_000,
    serviceDate: '2026-11-01',
    dueDate: '2026-11-20',
  });
  await new PaymentService(database).register(workspace.id, {
    operationId: randomUUID(),
    debtId: overdueDebt.id,
    amountCents: 2_000,
    paymentMethod: 'pix',
    paidAt: '2026-11-21T12:00:00.000Z',
  });
  await debts.create(workspace.id, {
    customerId: futureCustomer.id,
    description: 'Serviço futuro',
    totalCents: 20_000,
    serviceDate: '2026-11-02',
    dueDate: '2026-11-30',
  });
  return {
    database,
    workspaceId: workspace.id,
    overdueCustomerId: overdueCustomer.id,
    futureCustomerId: futureCustomer.id,
    archivedCustomerId: archivedCustomer.id,
  };
}
