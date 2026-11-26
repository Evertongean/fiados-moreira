import { randomUUID } from 'node:crypto';

import { AuditRepository } from '@/database/repositories/audit.repository';
import { CustomerRepository } from '@/database/repositories/customer.repository';
import { DebtRepository } from '@/database/repositories/debt.repository';
import { VehicleRepository } from '@/database/repositories/vehicle.repository';
import { WorkspaceRepository } from '@/database/repositories/workspace.repository';
import { CustomerService } from '@/features/customers/services/CustomerService';
import { DebtService } from '@/features/debts/services/DebtService';
import { maskCivilDateInput, parseCivilDate } from '@/features/debts/domain/debtUtils';
import { PaymentService } from '@/features/payments/services/PaymentService';

import { createTestDatabase } from '../database/createTestDatabase';

describe('debt module', () => {
  it('masks and validates civil dates without timezone conversion', () => {
    expect(maskCivilDateInput('26112026')).toBe('26/11/2026');
    expect(parseCivilDate('26/11/2026')).toBe('2026-11-26');
    expect(parseCivilDate('31/02/2026')).toBeNull();
  });

  it('creates and updates atomically with idempotency and audit', async () => {
    const database = await createTestDatabase();
    const workspace = await new WorkspaceRepository(database).initializeLocal();
    const customer = await new CustomerRepository(database).create(workspace.id, {
      name: 'Cliente Oficina',
    });
    const service = new DebtService(database);
    const createOperationId = randomUUID();
    const input = {
      customerId: customer.id,
      description: 'Troca de embreagem',
      totalCents: 85_990,
      serviceDate: '2026-11-20',
      dueDate: '2026-12-10',
      notes: 'Peças e mão de obra',
    };

    const created = await service.create(workspace.id, input, createOperationId);
    expect(created.createdAt).toMatch(/^\d{4}-\d{2}-\d{2}T.*Z$/);
    expect(created.updatedAt).toBe(created.createdAt);
    expect((await service.create(workspace.id, input, createOperationId)).id).toBe(created.id);
    await expect(
      service.create(workspace.id, { ...input, totalCents: 90_000 }, createOperationId),
    ).rejects.toMatchObject({ code: 'IDEMPOTENCY_CONFLICT' });

    const updateOperationId = randomUUID();
    const updated = await service.update(
      workspace.id,
      created.id,
      { description: 'Troca completa de embreagem', dueDate: null },
      updateOperationId,
    );
    expect(updated).toMatchObject({
      description: 'Troca completa de embreagem',
      dueDate: null,
      totalCents: 85_990,
    });
    expect(updated.createdAt).toBe(created.createdAt);
    expect(
      await new AuditRepository(database).listByEntity(workspace.id, 'debt', created.id),
    ).toHaveLength(2);
    database.close();
  });

  it('rejects invalid money and a vehicle from another customer', async () => {
    const database = await createTestDatabase();
    const workspace = await new WorkspaceRepository(database).initializeLocal();
    const customers = new CustomerRepository(database);
    const first = await customers.create(workspace.id, { name: 'Primeiro Cliente' });
    const second = await customers.create(workspace.id, { name: 'Segundo Cliente' });
    const vehicle = await new VehicleRepository(database).create(workspace.id, {
      customerId: second.id,
      type: 'car',
      brand: 'Ford',
      model: 'Ka',
      plate: 'ABC1D23',
    });
    const service = new DebtService(database);

    for (const totalCents of [0, -1, 1.5]) {
      await expect(
        service.create(workspace.id, {
          customerId: first.id,
          description: 'Serviço inválido',
          totalCents,
          serviceDate: '2026-11-20',
        }),
      ).rejects.toMatchObject({ code: 'VALIDATION_ERROR' });
    }
    await expect(
      service.create(workspace.id, {
        customerId: first.id,
        vehicleId: vehicle.id,
        description: 'Serviço com vínculo inválido',
        totalCents: 10_000,
        serviceDate: '2026-11-20',
      }),
    ).rejects.toMatchObject({ code: 'CONSTRAINT_VIOLATION' });
    expect(await new DebtRepository(database).list(workspace.id)).toHaveLength(0);
    database.close();
  });

  it('searches and filters derived statuses without crossing workspaces', async () => {
    const database = await createTestDatabase();
    const workspace = await new WorkspaceRepository(database).initializeLocal();
    const customer = await new CustomerRepository(database).create(workspace.id, {
      name: 'José da Silva',
    });
    const vehicle = await new VehicleRepository(database).create(workspace.id, {
      customerId: customer.id,
      type: 'car',
      brand: 'Chevrolet',
      model: 'Onix',
      plate: 'ABC1234',
    });
    const debts = new DebtService(database);
    const overdue = await debts.create(workspace.id, {
      customerId: customer.id,
      vehicleId: vehicle.id,
      description: 'Revisão geral',
      totalCents: 30_000,
      serviceDate: '2026-11-01',
      dueDate: '2026-11-25',
    });
    const today = await debts.create(workspace.id, {
      customerId: customer.id,
      description: 'Alinhamento',
      totalCents: 10_000,
      serviceDate: '2026-11-26',
      dueDate: '2026-11-26',
    });
    await new PaymentService(database).register(workspace.id, {
      debtId: overdue.id,
      operationId: randomUUID(),
      amountCents: 5_000,
      paymentMethod: 'pix',
      paidAt: '2026-11-24T12:00:00.000Z',
    });

    const repository = new DebtRepository(database);
    const options = {
      timezone: workspace.timezone,
      referenceDate: new Date('2026-11-26T12:00:00.000Z'),
    };
    expect(await repository.listOverview(workspace.id, { ...options, query: 'jose' })).toHaveLength(
      2,
    );
    expect(
      (await repository.listOverview(workspace.id, { ...options, query: 'abc1234' }))[0]?.id,
    ).toBe(overdue.id);
    expect(
      (await repository.listOverview(workspace.id, { ...options, query: 'abc-1234' }))[0]?.id,
    ).toBe(overdue.id);
    expect(
      (await repository.listOverview(workspace.id, { ...options, filter: 'overdue' })).map(
        ({ id }) => id,
      ),
    ).toEqual([overdue.id]);
    expect(
      (await repository.listOverview(workspace.id, { ...options, filter: 'partially_paid' })).map(
        ({ id }) => id,
      ),
    ).toEqual([overdue.id]);
    expect(
      (
        await repository.findOverview(
          workspace.id,
          today.id,
          workspace.timezone,
          options.referenceDate,
        )
      )?.status.isOverdue,
    ).toBe(false);

    const otherWorkspaceId = randomUUID();
    await database.run(
      `insert into workspaces (id, name, timezone, currency) values (?, ?, ?, ?)`,
      [otherWorkspaceId, 'Outra Oficina', 'America/Fortaleza', 'BRL'],
    );
    const otherCustomer = await new CustomerRepository(database).create(otherWorkspaceId, {
      name: 'Cliente Externo',
    });
    await debts.create(otherWorkspaceId, {
      customerId: otherCustomer.id,
      description: 'Serviço de outro workspace',
      totalCents: 50_000,
      serviceDate: '2026-11-20',
    });
    expect(await repository.listOverview(workspace.id, options)).toHaveLength(2);
    expect(await repository.listOverview(otherWorkspaceId, options)).toHaveLength(1);
    database.close();
  });

  it('requires a reason and preserves a canceled debt instead of deleting it', async () => {
    const database = await createTestDatabase();
    const workspace = await new WorkspaceRepository(database).initializeLocal();
    const customer = await new CustomerRepository(database).create(workspace.id, {
      name: 'Cliente Cancelamento',
    });
    const service = new DebtService(database);
    const debt = await service.create(workspace.id, {
      customerId: customer.id,
      description: 'Serviço não executado',
      totalCents: 15_000,
      serviceDate: '2026-11-20',
    });
    await expect(
      service.cancel(workspace.id, debt.id, { reason: ' ', operationId: randomUUID() }),
    ).rejects.toMatchObject({ code: 'VALIDATION_ERROR' });
    const canceled = await service.cancel(workspace.id, debt.id, {
      reason: 'Cliente desistiu do serviço',
      operationId: randomUUID(),
    });
    expect(canceled).toMatchObject({ cancellationReason: 'Cliente desistiu do serviço' });
    expect(await new DebtRepository(database).findById(workspace.id, debt.id)).not.toBeNull();
    database.close();
  });

  it('rejects notes above the domain limit even outside the form', async () => {
    const database = await createTestDatabase();
    const workspace = await new WorkspaceRepository(database).initializeLocal();
    const customer = await new CustomerRepository(database).create(workspace.id, {
      name: 'Cliente Limite',
    });

    await expect(
      new DebtService(database).create(workspace.id, {
        customerId: customer.id,
        description: 'Serviço válido',
        totalCents: 10_000,
        serviceDate: '2026-11-26',
        notes: 'x'.repeat(1001),
      }),
    ).rejects.toMatchObject({ code: 'VALIDATION_ERROR' });
    database.close();
  });

  it('does not reopen balance by editing a paid debt of an archived customer', async () => {
    const database = await createTestDatabase();
    const workspace = await new WorkspaceRepository(database).initializeLocal();
    const customer = await new CustomerService(database).create(workspace.id, {
      name: 'Cliente Quitado',
    });
    const debts = new DebtService(database);
    const debt = await debts.create(workspace.id, {
      customerId: customer.id,
      description: 'Serviço quitado',
      totalCents: 20_000,
      serviceDate: '2026-11-26',
    });
    await new PaymentService(database).register(workspace.id, {
      debtId: debt.id,
      operationId: randomUUID(),
      amountCents: 20_000,
      paymentMethod: 'pix',
      paidAt: '2026-11-26T15:00:00.000Z',
    });
    await new CustomerService(database).archive(workspace.id, customer.id);

    await expect(debts.update(workspace.id, debt.id, { totalCents: 25_000 })).rejects.toMatchObject(
      { code: 'CUSTOMER_ARCHIVED' },
    );
    expect((await new DebtRepository(database).findById(workspace.id, debt.id))?.totalCents).toBe(
      20_000,
    );
    database.close();
  });
});
