import { randomUUID } from 'node:crypto';

import { CustomerRepository } from '@/database/repositories/customer.repository';
import { VehicleRepository } from '@/database/repositories/vehicle.repository';
import { WorkspaceRepository } from '@/database/repositories/workspace.repository';
import { DebtService } from '@/features/debts/services/DebtService';

import { createTestDatabase } from '../database/createTestDatabase';

describe('workspace-scoped repositories', () => {
  it('creates, finds, updates and archives a customer without deleting history', async () => {
    const database = await createTestDatabase();
    const workspace = await new WorkspaceRepository(database).initializeLocal();
    const customers = new CustomerRepository(database);
    const customer = await customers.create(workspace.id, {
      name: '  Cliente Teste  ',
      phone: ' 85999990000 ',
    });
    expect(customer.name).toBe('Cliente Teste');
    expect((await customers.findById(workspace.id, customer.id))?.phone).toBe('+5585999990000');
    expect(
      (await customers.update(workspace.id, customer.id, { name: 'Nome Atualizado' })).name,
    ).toBe('Nome Atualizado');
    const debt = await new DebtService(database).create(workspace.id, {
      customerId: customer.id,
      description: 'Histórico preservado',
      totalCents: 10_000,
      serviceDate: '2026-01-01',
    });
    await customers.archive(workspace.id, customer.id);
    expect(await customers.list(workspace.id)).toHaveLength(0);
    expect(await customers.findById(workspace.id, customer.id)).not.toBeNull();
    expect(await customers.hasFinancialHistory(workspace.id, customer.id)).toBe(true);
    expect(
      await database.get('select id from debts where workspace_id = ? and id = ?', [
        workspace.id,
        debt.id,
      ]),
    ).not.toBeNull();
    await expect(
      database.run('delete from customers where workspace_id = ? and id = ?', [
        workspace.id,
        customer.id,
      ]),
    ).rejects.toThrow();
    database.close();
  });

  it('rejects empty names and isolates customers by workspace', async () => {
    const database = await createTestDatabase();
    const workspace = await new WorkspaceRepository(database).initializeLocal();
    const customers = new CustomerRepository(database);
    await expect(customers.create(workspace.id, { name: '  ' })).rejects.toMatchObject({
      code: 'CUSTOMER_VALIDATION_ERROR',
    });
    const customer = await customers.create(workspace.id, { name: 'Cliente Isolado' });
    expect(await customers.findById(randomUUID(), customer.id)).toBeNull();
    database.close();
  });

  it('normalizes plates, accepts no plate and enforces workspace/customer ownership', async () => {
    const database = await createTestDatabase();
    const workspace = await new WorkspaceRepository(database).initializeLocal();
    const customers = new CustomerRepository(database);
    const customer = await customers.create(workspace.id, { name: 'Responsável' });
    const vehicles = new VehicleRepository(database);
    const withPlate = await vehicles.create(workspace.id, {
      customerId: customer.id,
      type: 'car',
      brand: 'Fiat',
      model: 'Uno',
      plate: 'abc-1d23',
    });
    expect(withPlate.plate).toBe('ABC1D23');
    const debt = await new DebtService(database).create(workspace.id, {
      customerId: customer.id,
      vehicleId: withPlate.id,
      description: 'Histórico do veículo',
      totalCents: 8_000,
      serviceDate: '2026-01-01',
    });
    await vehicles.archive(workspace.id, withPlate.id);
    expect(await vehicles.hasFinancialHistory(workspace.id, withPlate.id)).toBe(true);
    expect(
      await database.get('select id from debts where workspace_id = ? and id = ?', [
        workspace.id,
        debt.id,
      ]),
    ).not.toBeNull();
    await expect(
      database.run('delete from vehicles where workspace_id = ? and id = ?', [
        workspace.id,
        withPlate.id,
      ]),
    ).rejects.toThrow();
    expect(
      (
        await vehicles.create(workspace.id, {
          customerId: customer.id,
          type: 'motorcycle',
          brand: 'Honda',
          model: 'CG',
        })
      ).plate,
    ).toBeNull();
    await expect(
      vehicles.create(randomUUID(), {
        customerId: customer.id,
        type: 'car',
        brand: 'Ford',
        model: 'Ka',
      }),
    ).rejects.toMatchObject({ code: 'CONSTRAINT_VIOLATION' });
    database.close();
  });

  it('enforces customer/vehicle ownership when creating debts', async () => {
    const database = await createTestDatabase();
    const workspace = await new WorkspaceRepository(database).initializeLocal();
    const customers = new CustomerRepository(database);
    const first = await customers.create(workspace.id, { name: 'Primeiro' });
    const second = await customers.create(workspace.id, { name: 'Segundo' });
    const vehicle = await new VehicleRepository(database).create(workspace.id, {
      customerId: first.id,
      type: 'car',
      brand: 'Fiat',
      model: 'Uno',
    });
    const debts = new DebtService(database);
    for (const totalCents of [0, -1, 1.5]) {
      await expect(
        debts.create(workspace.id, {
          customerId: first.id,
          description: 'Valor inválido',
          totalCents,
          serviceDate: '2026-01-01',
        }),
      ).rejects.toMatchObject({ code: 'VALIDATION_ERROR' });
    }
    await expect(
      debts.create(workspace.id, {
        customerId: first.id,
        description: 'Data inválida',
        totalCents: 10_000,
        serviceDate: '2026-02-30',
      }),
    ).rejects.toMatchObject({ code: 'VALIDATION_ERROR' });
    await expect(
      debts.create(workspace.id, {
        customerId: second.id,
        vehicleId: vehicle.id,
        description: 'Serviço inválido',
        totalCents: 10_000,
        serviceDate: '2026-01-01',
      }),
    ).rejects.toMatchObject({ code: 'CONSTRAINT_VIOLATION' });
    const valid = await debts.create(workspace.id, {
      customerId: first.id,
      description: 'Serviço sem veículo e vencimento',
      totalCents: 10_000,
      serviceDate: '2026-01-01',
    });
    expect(valid.vehicleId).toBeNull();
    expect(valid.dueDate).toBeNull();
    database.close();
  });
});
