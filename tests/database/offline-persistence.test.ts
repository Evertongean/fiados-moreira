import { randomUUID } from 'node:crypto';
import { mkdtempSync, rmSync } from 'node:fs';
import { tmpdir } from 'node:os';
import { join } from 'node:path';

import { CustomerRepository } from '@/database/repositories/customer.repository';
import { DebtRepository } from '@/database/repositories/debt.repository';
import { PaymentRepository } from '@/database/repositories/payment.repository';
import { VehicleRepository } from '@/database/repositories/vehicle.repository';
import { WorkspaceRepository } from '@/database/repositories/workspace.repository';
import { DebtService } from '@/features/debts/services/DebtService';
import { PaymentService } from '@/features/payments/services/PaymentService';

import { createTestDatabase } from './createTestDatabase';

describe('offline persistence', () => {
  it('preserves a complete local flow after closing and reopening SQLite', async () => {
    const directory = mkdtempSync(join(tmpdir(), 'fiados-offline-'));
    const path = join(directory, 'offline.sqlite');
    const database = await createTestDatabase(path);
    const workspace = await new WorkspaceRepository(database).initializeLocal();
    const customer = await new CustomerRepository(database).create(workspace.id, {
      name: 'Cliente Offline',
    });
    const vehicle = await new VehicleRepository(database).create(workspace.id, {
      customerId: customer.id,
      type: 'car',
      brand: 'Fiat',
      model: 'Uno',
    });
    const debt = await new DebtService(database).create(workspace.id, {
      customerId: customer.id,
      vehicleId: vehicle.id,
      description: 'Reparo local',
      totalCents: 20_000,
      serviceDate: '2026-01-01',
    });
    const payment = await new PaymentService(database).register(workspace.id, {
      operationId: randomUUID(),
      debtId: debt.id,
      amountCents: 5_000,
      paymentMethod: 'cash',
      paidAt: '2026-01-02T12:00:00.000Z',
    });
    database.close();

    const reopened = await createTestDatabase(path);
    expect(
      await new CustomerRepository(reopened).findById(workspace.id, customer.id),
    ).not.toBeNull();
    expect(await new VehicleRepository(reopened).findById(workspace.id, vehicle.id)).not.toBeNull();
    expect(await new DebtRepository(reopened).findById(workspace.id, debt.id)).not.toBeNull();
    expect(await new PaymentRepository(reopened).findById(workspace.id, payment.id)).not.toBeNull();
    expect(
      (await new DebtRepository(reopened).getFinancialSummary(workspace.id, debt.id)).pendingCents,
    ).toBe(15_000);
    reopened.close();
    rmSync(directory, { recursive: true, force: true });
  });
});
