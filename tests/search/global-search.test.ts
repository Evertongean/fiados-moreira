import { randomUUID } from 'node:crypto';

import { CustomerService } from '@/features/customers/services/CustomerService';
import { GlobalSearchRepository } from '@/database/repositories/global-search.repository';
import { WorkspaceRepository } from '@/database/repositories/workspace.repository';
import { DebtService } from '@/features/debts/services/DebtService';
import { PaymentReversalService } from '@/features/payments/services/PaymentReversalService';
import { PaymentService } from '@/features/payments/services/PaymentService';
import {
  DEFAULT_GLOBAL_SEARCH_FILTERS,
  type GlobalSearchFilters,
} from '@/features/search/domain/searchTypes';
import { VehicleService } from '@/features/vehicles/services/VehicleService';

import { createTestDatabase } from '../database/createTestDatabase';

const REFERENCE_DATE = new Date('2026-11-26T12:00:00.000Z');
const TIMEZONE = 'America/Fortaleza';

describe('global search repository', () => {
  it('normalizes accents, case, phone numbers and plates in each category', async () => {
    const fixture = await createFixture();
    const repository = new GlobalSearchRepository(fixture.database);

    const name = await repository.search(
      fixture.workspaceId,
      'JOSE avila',
      defaults(),
      TIMEZONE,
      REFERENCE_DATE,
    );
    expect(name.customers.map(({ id }) => id)).toContain(fixture.customerId);
    expect(name.debts.map(({ id }) => id)).toContain(fixture.debtId);
    expect(name.payments.map(({ id }) => id)).toContain(fixture.paymentId);

    const phone = await repository.search(
      fixture.workspaceId,
      '(85) 99999-0000',
      defaults(),
      TIMEZONE,
      REFERENCE_DATE,
    );
    expect(phone.customers.map(({ id }) => id)).toEqual([fixture.customerId]);

    const plate = await repository.search(
      fixture.workspaceId,
      'abc-1d23',
      defaults(),
      TIMEZONE,
      REFERENCE_DATE,
    );
    expect(plate.vehicles.map(({ id }) => id)).toEqual([fixture.vehicleId]);
    expect(plate.debts.map(({ id }) => id)).toContain(fixture.debtId);

    const method = await repository.search(
      fixture.workspaceId,
      'PIX',
      defaults(),
      TIMEZONE,
      REFERENCE_DATE,
    );
    expect(method.payments.map(({ id }) => id)).toEqual([fixture.paymentId]);
    fixture.database.close();
  });

  it('combines advanced filters, sorts balances and distinguishes reversed payments', async () => {
    const fixture = await createFixture();
    const repository = new GlobalSearchRepository(fixture.database);
    const filters = defaults();
    filters.customers.debt = 'overdue';
    filters.customers.sort = 'balance_desc';
    filters.vehicles.type = 'car';
    filters.vehicles.customerId = fixture.customerId;
    filters.debts.status = 'open';
    filters.debts.overdue = 'overdue';
    filters.debts.customerId = fixture.customerId;
    filters.debts.vehicleId = fixture.vehicleId;
    filters.debts.dateField = 'due';
    filters.debts.startDate = '2026-11-01';
    filters.debts.endDate = '2026-11-25';
    filters.debts.minAmountCents = 9_000;
    filters.debts.maxAmountCents = 11_000;
    filters.debts.dueDate = 'with_due_date';
    filters.debts.sort = 'amount_desc';
    filters.payments.startDate = '2026-11-01';
    filters.payments.endDate = '2026-11-30';
    filters.payments.method = 'pix';
    filters.payments.customerId = fixture.customerId;
    filters.payments.status = 'reversed';

    const result = await repository.search(
      fixture.workspaceId,
      '',
      filters,
      TIMEZONE,
      REFERENCE_DATE,
    );
    expect(result.customers.map(({ id }) => id)).toEqual([fixture.customerId]);
    expect(result.vehicles.map(({ id }) => id)).toEqual([fixture.vehicleId]);
    expect(result.debts.map(({ id }) => id)).toEqual([fixture.debtId]);
    expect(result.payments).toEqual([
      expect.objectContaining({ id: fixture.paymentId, isReversed: true }),
    ]);
    fixture.database.close();
  });

  it('includes archived records only when requested and isolates every category by workspace', async () => {
    const fixture = await createFixture();
    const repository = new GlobalSearchRepository(fixture.database);
    const archivedFilters = defaults();
    archivedFilters.customers.status = 'archived';
    const archived = await repository.search(
      fixture.workspaceId,
      '',
      archivedFilters,
      TIMEZONE,
      REFERENCE_DATE,
    );
    expect(archived.customers.map(({ id }) => id)).toEqual([fixture.archivedCustomerId]);

    const everything = await repository.search(
      fixture.workspaceId,
      '',
      defaults(),
      TIMEZONE,
      REFERENCE_DATE,
    );
    expect(everything.customers.some(({ name }) => name === 'Cliente externo')).toBe(false);
    expect(everything.vehicles.some(({ brand }) => brand === 'Externo')).toBe(false);
    expect(everything.debts.some(({ description }) => description === 'Serviço externo')).toBe(
      false,
    );
    expect(everything.payments.some(({ customerName }) => customerName === 'Cliente externo')).toBe(
      false,
    );
    fixture.database.close();
  });
});

function defaults(): GlobalSearchFilters {
  return {
    customers: { ...DEFAULT_GLOBAL_SEARCH_FILTERS.customers },
    vehicles: { ...DEFAULT_GLOBAL_SEARCH_FILTERS.vehicles },
    debts: { ...DEFAULT_GLOBAL_SEARCH_FILTERS.debts },
    payments: { ...DEFAULT_GLOBAL_SEARCH_FILTERS.payments },
  };
}

async function createFixture() {
  const database = await createTestDatabase();
  const workspace = await new WorkspaceRepository(database).initializeLocal();
  const customers = new CustomerService(database);
  const customer = await customers.create(workspace.id, {
    name: 'José Ávila',
    phone: '85999990000',
    whatsapp: '85988880000',
  });
  const archivedCustomer = await customers.create(workspace.id, { name: 'Cliente Arquivado' });
  await customers.archive(workspace.id, archivedCustomer.id);
  const vehicle = await new VehicleService(database).create(workspace.id, {
    customerId: customer.id,
    type: 'car',
    brand: 'Chevrolet',
    model: 'Ônix',
    plate: 'ABC1D23',
  });
  const debt = await new DebtService(database).create(workspace.id, {
    customerId: customer.id,
    vehicleId: vehicle.id,
    description: 'Troca de óleo',
    totalCents: 10_000,
    serviceDate: '2026-11-10',
    dueDate: '2026-11-20',
  });
  const payment = await new PaymentService(database).register(workspace.id, {
    operationId: randomUUID(),
    debtId: debt.id,
    amountCents: 3_000,
    paymentMethod: 'pix',
    paidAt: '2026-11-21T12:00:00.000Z',
  });
  await new PaymentReversalService(database).reverse(workspace.id, {
    operationId: randomUUID(),
    paymentId: payment.id,
    reason: 'Pagamento informado por engano',
    reversedAt: '2026-11-22T12:00:00.000Z',
  });

  const otherWorkspaceId = randomUUID();
  await database.run('insert into workspaces (id, name, timezone, currency) values (?, ?, ?, ?)', [
    otherWorkspaceId,
    'Outra oficina',
    TIMEZONE,
    'BRL',
  ]);
  const externalCustomer = await customers.create(otherWorkspaceId, { name: 'Cliente externo' });
  const externalVehicle = await new VehicleService(database).create(otherWorkspaceId, {
    customerId: externalCustomer.id,
    type: 'car',
    brand: 'Externo',
    model: 'Modelo',
    plate: 'ZZZ9Z99',
  });
  const externalDebt = await new DebtService(database).create(otherWorkspaceId, {
    customerId: externalCustomer.id,
    vehicleId: externalVehicle.id,
    description: 'Serviço externo',
    totalCents: 99_000,
    serviceDate: '2026-11-10',
  });
  await new PaymentService(database).register(otherWorkspaceId, {
    operationId: randomUUID(),
    debtId: externalDebt.id,
    amountCents: 1_000,
    paymentMethod: 'cash',
    paidAt: '2026-11-21T12:00:00.000Z',
  });

  return {
    database,
    workspaceId: workspace.id,
    customerId: customer.id,
    archivedCustomerId: archivedCustomer.id,
    vehicleId: vehicle.id,
    debtId: debt.id,
    paymentId: payment.id,
  };
}
