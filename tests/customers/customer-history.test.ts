import { randomUUID } from 'node:crypto';

import { CustomerHistoryRepository } from '@/database/repositories/customer-history.repository';
import { CustomerRepository } from '@/database/repositories/customer.repository';
import { VehicleRepository } from '@/database/repositories/vehicle.repository';
import { WorkspaceRepository } from '@/database/repositories/workspace.repository';
import { getFinancialHistoryPeriod } from '@/features/customers/domain/customerHistoryUtils';
import { CustomerService } from '@/features/customers/services/CustomerService';
import { DebtService } from '@/features/debts/services/DebtService';
import { PaymentReversalService } from '@/features/payments/services/PaymentReversalService';
import { PaymentService } from '@/features/payments/services/PaymentService';

import { createTestDatabase } from '../database/createTestDatabase';

async function fixture() {
  const database = await createTestDatabase();
  const workspace = await new WorkspaceRepository(database).initializeLocal();
  const customer = await new CustomerRepository(database).create(workspace.id, {
    name: 'Cliente Histórico',
  });
  const vehicles = new VehicleRepository(database);
  const firstVehicle = await vehicles.create(workspace.id, {
    customerId: customer.id,
    type: 'car',
    brand: 'Fiat',
    model: 'Uno',
    plate: 'ABC1234',
  });
  const secondVehicle = await vehicles.create(workspace.id, {
    customerId: customer.id,
    type: 'motorcycle',
    brand: 'Honda',
    model: 'CG 160',
  });
  const debts = new DebtService(database);
  const firstDebt = await debts.create(workspace.id, {
    customerId: customer.id,
    vehicleId: firstVehicle.id,
    description: 'Revisão do motor',
    totalCents: 50_000,
    serviceDate: '2026-01-01',
    dueDate: '2026-01-10',
  });
  const secondDebt = await debts.create(workspace.id, {
    customerId: customer.id,
    vehicleId: secondVehicle.id,
    description: 'Troca de pneus',
    totalCents: 30_000,
    serviceDate: '2026-01-02',
  });
  const canceledDebt = await debts.create(workspace.id, {
    customerId: customer.id,
    description: 'Serviço cancelado',
    totalCents: 10_000,
    serviceDate: '2026-01-03',
  });
  const payments = new PaymentService(database);
  await payments.register(workspace.id, {
    operationId: randomUUID(),
    debtId: firstDebt.id,
    amountCents: 20_000,
    paymentMethod: 'cash',
    paidAt: '2026-01-03T12:00:00.000Z',
  });
  const reversedPayment = await payments.register(workspace.id, {
    operationId: randomUUID(),
    debtId: firstDebt.id,
    amountCents: 30_000,
    paymentMethod: 'pix',
    paidAt: '2026-01-04T12:00:00.000Z',
  });
  await new PaymentReversalService(database).reverse(workspace.id, {
    operationId: randomUUID(),
    paymentId: reversedPayment.id,
    reason: 'Pagamento vinculado incorretamente',
    reversedAt: '2026-01-06T12:00:00.000Z',
  });
  await payments.register(workspace.id, {
    operationId: randomUUID(),
    debtId: secondDebt.id,
    amountCents: 30_000,
    paymentMethod: 'bank_transfer',
    paidAt: '2026-01-05T12:00:00.000Z',
  });
  await debts.update(workspace.id, firstDebt.id, { totalCents: 60_000 }, randomUUID());
  await debts.cancel(workspace.id, canceledDebt.id, {
    operationId: randomUUID(),
    reason: 'Serviço não realizado',
  });
  return {
    database,
    workspace,
    customer,
    firstVehicle,
    secondVehicle,
    firstDebt,
    secondDebt,
  };
}

describe('customer financial history', () => {
  it('consolidates current money, debt counts, overdue balance and last valid payment', async () => {
    const { database, workspace, customer } = await fixture();
    const summary = await new CustomerHistoryRepository(database).getSummary(
      workspace.id,
      customer.id,
      '2026-11-26',
    );
    expect(summary).toEqual({
      totalDebtCents: 90_000,
      totalPaidCents: 50_000,
      outstandingCents: 40_000,
      overdueCents: 40_000,
      openDebtCount: 1,
      paidDebtCount: 1,
      lastValidPaymentAt: '2026-01-05T12:00:00.000Z',
    });
    database.close();
  });

  it('returns each real movement once with deterministic ordering and preserved history', async () => {
    const { database, workspace, customer } = await fixture();
    const repository = new CustomerHistoryRepository(database);
    const events = await repository.listEvents(workspace.id, customer.id);
    expect(events).toHaveLength(9);
    expect(events.filter(({ type }) => type === 'debt_created')).toHaveLength(3);
    expect(events.filter(({ type }) => type === 'payment_registered')).toHaveLength(3);
    expect(events.filter(({ type }) => type === 'payment_reversed')).toHaveLength(1);
    expect(events.filter(({ type }) => type === 'debt_updated')).toHaveLength(1);
    expect(events.filter(({ type }) => type === 'debt_canceled')).toHaveLength(1);
    expect(events.find(({ type }) => type === 'payment_reversed')).toMatchObject({
      amountCents: 30_000,
      note: 'Pagamento vinculado incorretamente',
      status: 'reversed',
    });
    expect(events.find(({ type }) => type === 'debt_canceled')).toMatchObject({
      note: 'Serviço não realizado',
      status: 'canceled',
    });
    const again = await repository.listEvents(workspace.id, customer.id);
    expect(again.map(({ id }) => id)).toEqual(events.map(({ id }) => id));
    for (let index = 1; index < events.length; index += 1) {
      expect(toTime(events[index - 1]?.occurredAt ?? '')).toBeGreaterThanOrEqual(
        toTime(events[index]?.occurredAt ?? ''),
      );
    }
    database.close();
  });

  it('filters by period, vehicle and movement type and paginates without overlap', async () => {
    const { database, workspace, customer, firstVehicle } = await fixture();
    const repository = new CustomerHistoryRepository(database);
    const payments = await repository.listEvents(workspace.id, customer.id, {
      movement: 'payments',
      startAt: '2026-01-04T00:00:00.000Z',
      endAt: '2026-01-06T00:00:00.000Z',
    });
    expect(payments).toHaveLength(2);
    expect(payments.every(({ type }) => type === 'payment_registered')).toBe(true);

    const firstVehicleEvents = await repository.listEvents(workspace.id, customer.id, {
      vehicleId: firstVehicle.id,
    });
    expect(firstVehicleEvents).toHaveLength(5);
    expect(firstVehicleEvents.every(({ vehicleId }) => vehicleId === firstVehicle.id)).toBe(true);

    const canceled = await repository.listEvents(workspace.id, customer.id, {
      movement: 'cancellations',
    });
    expect(canceled).toHaveLength(1);
    expect(canceled[0]?.type).toBe('debt_canceled');

    const firstPage = await repository.listEvents(workspace.id, customer.id, {
      limit: 4,
      offset: 0,
    });
    const secondPage = await repository.listEvents(workspace.id, customer.id, {
      limit: 4,
      offset: 4,
    });
    expect(firstPage).toHaveLength(4);
    expect(secondPage).toHaveLength(4);
    const secondPageIds = new Set(secondPage.map(({ id }) => id));
    expect(firstPage.filter(({ id }) => secondPageIds.has(id))).toHaveLength(0);
    database.close();
  });

  it('isolates workspaces and keeps history available for archived customers', async () => {
    const { database, workspace, customer } = await fixture();
    const otherWorkspaceId = randomUUID();
    await database.run(
      `insert into workspaces (id, name, timezone, currency) values (?, ?, ?, ?)`,
      [otherWorkspaceId, 'Outra Oficina', 'America/Fortaleza', 'BRL'],
    );
    const repository = new CustomerHistoryRepository(database);
    expect(await repository.listEvents(otherWorkspaceId, customer.id)).toHaveLength(0);
    expect(await repository.getSummary(otherWorkspaceId, customer.id, '2026-11-26')).toEqual({
      totalDebtCents: 0,
      totalPaidCents: 0,
      outstandingCents: 0,
      overdueCents: 0,
      openDebtCount: 0,
      paidDebtCount: 0,
      lastValidPaymentAt: null,
    });

    const archived = await new CustomerService(database).create(workspace.id, {
      name: 'Cliente Arquivado',
    });
    const debt = await new DebtService(database).create(workspace.id, {
      customerId: archived.id,
      description: 'Fiado quitado',
      totalCents: 5_000,
      serviceDate: '2026-02-01',
    });
    await new PaymentService(database).register(workspace.id, {
      operationId: randomUUID(),
      debtId: debt.id,
      amountCents: 5_000,
      paymentMethod: 'pix',
      paidAt: '2026-02-02T12:00:00.000Z',
    });
    await new CustomerService(database).archive(workspace.id, archived.id);
    expect(
      (await new CustomerRepository(database).findById(workspace.id, archived.id))?.archivedAt,
    ).not.toBeNull();
    expect(await repository.listEvents(workspace.id, archived.id)).toHaveLength(2);
    database.close();
  });

  it('calculates stable period boundaries for filtering', () => {
    expect(getFinancialHistoryPeriod('last_30_days', new Date('2026-11-26T12:00:00.000Z'))).toEqual(
      {
        startAt: '2026-10-27T12:00:00.000Z',
        endAt: '2026-11-26T12:00:00.000Z',
      },
    );
    expect(getFinancialHistoryPeriod('all')).toEqual({});
  });
});

function toTime(value: string): number {
  const normalized = value.includes('T') ? value : `${value.replace(' ', 'T')}Z`;
  return new Date(normalized).getTime();
}
