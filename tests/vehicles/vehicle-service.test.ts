import { randomUUID } from 'node:crypto';

import { AuditRepository } from '@/database/repositories/audit.repository';
import { CustomerRepository } from '@/database/repositories/customer.repository';
import { VehicleRepository } from '@/database/repositories/vehicle.repository';
import { WorkspaceRepository } from '@/database/repositories/workspace.repository';
import { CustomerService } from '@/features/customers/services/CustomerService';
import { DebtService } from '@/features/debts/services/DebtService';
import { VehicleService } from '@/features/vehicles/services/VehicleService';

import { createTestDatabase } from '../database/createTestDatabase';

describe('VehicleService', () => {
  it('creates idempotently, normalizes data and audits without copying field values', async () => {
    const database = await createTestDatabase();
    const workspace = await new WorkspaceRepository(database).initializeLocal();
    const customer = await new CustomerService(database).create(workspace.id, {
      name: 'Cliente do Veículo',
    });
    const service = new VehicleService(database);
    const vehicleId = randomUUID();
    const input = {
      customerId: customer.id,
      type: 'car' as const,
      brand: '  Fiat ',
      model: ' Uno ',
      plate: 'abc-1234',
    };

    const created = await service.create(workspace.id, input, vehicleId);
    const repeated = await service.create(workspace.id, input, vehicleId);
    expect(repeated.id).toBe(created.id);
    expect(created).toMatchObject({
      id: vehicleId,
      customerId: customer.id,
      brand: 'Fiat',
      model: 'Uno',
      plate: 'ABC1234',
    });
    expect(created.createdAt).toMatch(/^\d{4}-\d{2}-\d{2}T.*Z$/);
    expect(created.updatedAt).toBe(created.createdAt);

    const audits = await new AuditRepository(database).listByEntity(
      workspace.id,
      'vehicle',
      vehicleId,
    );
    expect(audits).toHaveLength(1);
    expect(audits[0]?.metadataJson).not.toContain('Fiat');
    await expect(
      service.create(workspace.id, { ...input, model: 'Palio' }, vehicleId),
    ).rejects.toMatchObject({ code: 'IDEMPOTENCY_CONFLICT' });
    database.close();
  });

  it('warns about duplicate plates without blocking another record', async () => {
    const database = await createTestDatabase();
    const workspace = await new WorkspaceRepository(database).initializeLocal();
    const customer = await new CustomerService(database).create(workspace.id, { name: 'Cliente' });
    const service = new VehicleService(database);
    const first = await service.create(workspace.id, {
      customerId: customer.id,
      type: 'car',
      brand: 'Ford',
      model: 'Ka',
      plate: 'ABC1D23',
    });

    const matches = await service.findPotentialDuplicates(workspace.id, {
      customerId: customer.id,
      type: 'car',
      brand: 'Outro',
      model: 'Modelo',
      plate: 'abc-1d23',
    });
    expect(matches[0]?.vehicle.id).toBe(first.id);
    expect(
      await service.findPotentialDuplicates(
        workspace.id,
        {
          customerId: customer.id,
          type: 'car',
          brand: 'Ford',
          model: 'Ka',
          plate: 'ABC1D23',
        },
        first.id,
      ),
    ).toHaveLength(0);

    const second = await service.create(workspace.id, {
      customerId: customer.id,
      type: 'car',
      brand: 'Outro',
      model: 'Modelo',
      plate: 'ABC1D23',
    });
    expect(second.id).not.toBe(first.id);
    database.close();
  });

  it('searches by plate, brand and model and preserves identity during updates', async () => {
    const database = await createTestDatabase();
    const workspace = await new WorkspaceRepository(database).initializeLocal();
    const customer = await new CustomerService(database).create(workspace.id, { name: 'Cliente' });
    const service = new VehicleService(database);
    const repository = new VehicleRepository(database);
    const vehicle = await service.create(workspace.id, {
      customerId: customer.id,
      type: 'motorcycle',
      brand: 'Hónda',
      model: 'CG 160',
      year: 2025,
      plate: 'QWE2R34',
    });

    expect(
      (await repository.listByCustomer(workspace.id, customer.id, { query: 'honda' }))[0]?.id,
    ).toBe(vehicle.id);
    expect(
      (await repository.listByCustomer(workspace.id, customer.id, { query: 'CG' }))[0]?.id,
    ).toBe(vehicle.id);
    expect(
      (await repository.listByCustomer(workspace.id, customer.id, { query: 'qwe-2r34' }))[0]?.id,
    ).toBe(vehicle.id);

    const updated = await service.update(workspace.id, vehicle.id, {
      color: 'Vermelha',
      model: 'CG 160 Titan',
    });
    expect(updated.id).toBe(vehicle.id);
    expect(updated.customerId).toBe(customer.id);
    expect(updated.createdAt).toBe(vehicle.createdAt);
    expect(updated.model).toBe('CG 160 Titan');
    expect(updated.year).toBe(2025);
    expect(updated.plate).toBe('QWE2R34');
    const unchanged = await service.update(workspace.id, vehicle.id, {
      color: 'Vermelha',
      model: 'CG 160 Titan',
    });
    expect(unchanged.updatedAt).toBe(updated.updatedAt);
    database.close();
  });

  it('archives and restores without losing history and blocks archived vehicles in new debts', async () => {
    const database = await createTestDatabase();
    const workspace = await new WorkspaceRepository(database).initializeLocal();
    const customer = await new CustomerService(database).create(workspace.id, { name: 'Cliente' });
    const vehicles = new VehicleService(database);
    const vehicle = await vehicles.create(workspace.id, {
      customerId: customer.id,
      type: 'van',
      brand: 'Renault',
      model: 'Master',
    });
    const archived = await vehicles.archive(workspace.id, vehicle.id);
    expect(archived.archivedAt).not.toBeNull();
    expect(await new VehicleRepository(database).findById(workspace.id, vehicle.id)).not.toBeNull();
    await expect(
      new DebtService(database).create(workspace.id, {
        customerId: customer.id,
        vehicleId: vehicle.id,
        description: 'Não permitido',
        totalCents: 10_000,
        serviceDate: '2026-11-26',
      }),
    ).rejects.toMatchObject({ code: 'VEHICLE_ARCHIVED' });
    expect((await vehicles.restore(workspace.id, vehicle.id)).archivedAt).toBeNull();
    const debt = await new DebtService(database).create(workspace.id, {
      customerId: customer.id,
      vehicleId: vehicle.id,
      description: 'Permitido',
      totalCents: 10_000,
      serviceDate: '2026-11-26',
    });
    await vehicles.archive(workspace.id, vehicle.id);
    expect(
      await new VehicleRepository(database).hasFinancialHistory(workspace.id, vehicle.id),
    ).toBe(true);
    expect(await database.get('select id from debts where id = ?', [debt.id])).not.toBeNull();
    database.close();
  });

  it('rejects archived customers and isolates records and duplicate checks by workspace', async () => {
    const database = await createTestDatabase();
    const first = await new WorkspaceRepository(database).initializeLocal();
    const secondId = randomUUID();
    await database.run(
      'insert into workspaces (id, name, timezone, currency) values (?, ?, ?, ?)',
      [secondId, 'Outra oficina', 'America/Fortaleza', 'BRL'],
    );
    const customers = new CustomerService(database);
    const archivedCustomer = await customers.create(first.id, { name: 'Cliente Arquivado' });
    await customers.archive(first.id, archivedCustomer.id);
    const service = new VehicleService(database);
    await expect(
      service.create(first.id, {
        customerId: archivedCustomer.id,
        type: 'car',
        brand: 'Fiat',
        model: 'Uno',
      }),
    ).rejects.toMatchObject({ code: 'VEHICLE_CUSTOMER_ARCHIVED' });

    const secondCustomer = await new CustomerRepository(database).create(secondId, {
      name: 'Outro Cliente',
    });
    const vehicle = await service.create(secondId, {
      customerId: secondCustomer.id,
      type: 'car',
      brand: 'Fiat',
      model: 'Uno',
      plate: 'ABC1234',
    });
    expect(await new VehicleRepository(database).findById(first.id, vehicle.id)).toBeNull();
    expect(
      await service.findPotentialDuplicates(first.id, {
        customerId: archivedCustomer.id,
        type: 'car',
        brand: 'Outro',
        model: 'Modelo',
        plate: 'ABC1234',
      }),
    ).toHaveLength(0);
    database.close();
  });

  it('rolls back creation when mandatory audit fails', async () => {
    const database = await createTestDatabase();
    const workspace = await new WorkspaceRepository(database).initializeLocal();
    const customer = await new CustomerService(database).create(workspace.id, { name: 'Cliente' });
    const vehicleId = randomUUID();
    await database.exec(`create trigger reject_vehicle_audit
      before insert on audit_logs when new.entity_type = 'vehicle'
      begin select raise(abort, 'audit rejected'); end`);

    await expect(
      new VehicleService(database).create(
        workspace.id,
        {
          customerId: customer.id,
          type: 'car',
          brand: 'Fiat',
          model: 'Uno',
        },
        vehicleId,
      ),
    ).rejects.toThrow();
    expect(await new VehicleRepository(database).findById(workspace.id, vehicleId)).toBeNull();
    database.close();
  });
});
