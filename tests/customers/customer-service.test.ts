import { randomUUID } from 'node:crypto';

import { AuditRepository } from '@/database/repositories/audit.repository';
import { CustomerRepository } from '@/database/repositories/customer.repository';
import { WorkspaceRepository } from '@/database/repositories/workspace.repository';
import { CustomerService } from '@/features/customers/services/CustomerService';
import { DebtService } from '@/features/debts/services/DebtService';
import { PaymentReversalService } from '@/features/payments/services/PaymentReversalService';
import { PaymentService } from '@/features/payments/services/PaymentService';

import { createTestDatabase } from '../database/createTestDatabase';

describe('CustomerService', () => {
  it('creates idempotently, normalizes data and audits without copying personal values', async () => {
    const database = await createTestDatabase();
    const workspace = await new WorkspaceRepository(database).initializeLocal();
    const service = new CustomerService(database);
    const customerId = randomUUID();
    const input = { name: '  João   da Silva ', phone: '(84) 99999-9999' };

    const created = await service.create(workspace.id, input, customerId);
    const repeated = await service.create(workspace.id, input, customerId);
    expect(repeated.id).toBe(created.id);
    expect(created).toMatchObject({
      id: customerId,
      name: 'João da Silva',
      phone: '+5584999999999',
    });
    expect(created.createdAt).toMatch(/^\d{4}-\d{2}-\d{2}T.*Z$/);
    expect(created.updatedAt).toBe(created.createdAt);

    const audits = await new AuditRepository(database).listByEntity(
      workspace.id,
      'customer',
      customerId,
    );
    expect(audits).toHaveLength(1);
    expect(audits[0]?.metadataJson).not.toContain('João');
    await expect(
      service.create(workspace.id, { name: 'Outra Pessoa' }, customerId),
    ).rejects.toMatchObject({ code: 'IDEMPOTENCY_CONFLICT' });
    database.close();
  });

  it('finds accent-insensitive duplicates and excludes the edited record', async () => {
    const database = await createTestDatabase();
    const workspace = await new WorkspaceRepository(database).initializeLocal();
    const service = new CustomerService(database);
    const customer = await service.create(workspace.id, {
      name: 'João da Silva',
      phone: '(84) 99999-9999',
    });

    const byName = await service.findPotentialDuplicates(workspace.id, { name: 'joao  da silva' });
    const byPhone = await service.findPotentialDuplicates(workspace.id, {
      name: 'Pessoa diferente',
      whatsapp: '+55 84 99999-9999',
    });
    expect(byName[0]?.customer.id).toBe(customer.id);
    expect(byName[0]?.reasons).toContain('name');
    expect(byPhone[0]?.reasons).toContain('whatsapp');
    expect(
      await service.findPotentialDuplicates(workspace.id, { name: 'João da Silva' }, customer.id),
    ).toHaveLength(0);
    database.close();
  });

  it('searches, filters, sorts and preserves identity during updates', async () => {
    const database = await createTestDatabase();
    const workspace = await new WorkspaceRepository(database).initializeLocal();
    const service = new CustomerService(database);
    const repository = new CustomerRepository(database);
    const joao = await service.create(workspace.id, {
      name: 'João da Silva',
      phone: '(84) 99999-9999',
    });
    await service.create(workspace.id, { name: 'Ana Beatriz' });

    expect((await repository.search(workspace.id, 'joao'))[0]?.id).toBe(joao.id);
    expect((await repository.search(workspace.id, 'Silva'))[0]?.id).toBe(joao.id);
    expect((await repository.search(workspace.id, '9999-9999'))[0]?.id).toBe(joao.id);
    expect((await repository.list(workspace.id, { sort: 'name_desc' }))[0]?.name).toBe(
      'João da Silva',
    );

    const updated = await service.update(workspace.id, joao.id, {
      phone: '(84) 3333-3333',
      notes: 'Preferência de contato à tarde.',
    });
    expect(updated.id).toBe(joao.id);
    expect(updated.createdAt).toBe(joao.createdAt);
    expect(updated.phone).toBe('+558433333333');
    const audits = await new AuditRepository(database).listByEntity(
      workspace.id,
      'customer',
      joao.id,
    );
    expect(audits.at(-1)?.metadataJson).toContain('phone');
    expect(audits.at(-1)?.metadataJson).not.toContain('3333');
    const unchanged = await service.update(workspace.id, joao.id, {
      phone: '(84) 3333-3333',
      notes: 'Preferência de contato à tarde.',
    });
    expect(unchanged.updatedAt).toBe(updated.updatedAt);
    expect(
      await new AuditRepository(database).listByEntity(workspace.id, 'customer', joao.id),
    ).toHaveLength(audits.length);
    database.close();
  });

  it('blocks archive with outstanding debt, then archives and restores atomically', async () => {
    const database = await createTestDatabase();
    const workspace = await new WorkspaceRepository(database).initializeLocal();
    const service = new CustomerService(database);
    const customer = await service.create(workspace.id, { name: 'Cliente Devedor' });
    const debt = await new DebtService(database).create(workspace.id, {
      customerId: customer.id,
      description: 'Serviço de teste',
      totalCents: 15_000,
      serviceDate: '2026-11-20',
    });

    await expect(service.archive(workspace.id, customer.id)).rejects.toMatchObject({
      code: 'CUSTOMER_HAS_OUTSTANDING_DEBT',
    });
    expect(
      (await new CustomerRepository(database).findById(workspace.id, customer.id))?.archivedAt,
    ).toBeNull();

    const payment = await new PaymentService(database).register(workspace.id, {
      operationId: randomUUID(),
      debtId: debt.id,
      amountCents: 15_000,
      paymentMethod: 'pix',
      paidAt: '2026-11-25T12:00:00.000Z',
    });
    await new PaymentReversalService(database).reverse(workspace.id, {
      operationId: randomUUID(),
      paymentId: payment.id,
      reason: 'Correção de teste',
      reversedAt: '2026-11-25T13:00:00.000Z',
    });
    await expect(service.archive(workspace.id, customer.id)).rejects.toMatchObject({
      code: 'CUSTOMER_HAS_OUTSTANDING_DEBT',
    });
    await new PaymentService(database).register(workspace.id, {
      operationId: randomUUID(),
      debtId: debt.id,
      amountCents: 15_000,
      paymentMethod: 'cash',
      paidAt: '2026-11-25T14:00:00.000Z',
    });
    const archived = await service.archive(workspace.id, customer.id);
    expect(archived.archivedAt).not.toBeNull();
    expect(await new CustomerRepository(database).countArchived(workspace.id)).toBe(1);
    const restored = await service.restore(workspace.id, customer.id);
    expect(restored.archivedAt).toBeNull();
    expect(await new CustomerRepository(database).countActive(workspace.id)).toBe(1);
    database.close();
  });

  it('rolls back customer creation when mandatory audit fails', async () => {
    const database = await createTestDatabase();
    const workspace = await new WorkspaceRepository(database).initializeLocal();
    const customerId = randomUUID();
    await database.exec(`create trigger reject_customer_audit
      before insert on audit_logs when new.entity_type = 'customer'
      begin select raise(abort, 'audit rejected'); end`);

    await expect(
      new CustomerService(database).create(
        workspace.id,
        { name: 'Cliente Transitório' },
        customerId,
      ),
    ).rejects.toThrow();
    expect(await new CustomerRepository(database).findById(workspace.id, customerId)).toBeNull();
    database.close();
  });

  it('rejects new debts for an archived customer in the domain service', async () => {
    const database = await createTestDatabase();
    const workspace = await new WorkspaceRepository(database).initializeLocal();
    const customers = new CustomerService(database);
    const customer = await customers.create(workspace.id, { name: 'Cliente Arquivado' });
    await customers.archive(workspace.id, customer.id);

    await expect(
      new DebtService(database).create(workspace.id, {
        customerId: customer.id,
        description: 'Operação não permitida',
        totalCents: 10_000,
        serviceDate: '2026-11-25',
      }),
    ).rejects.toMatchObject({ code: 'CUSTOMER_ARCHIVED' });
    expect(
      await database.get('select id from debts where customer_id = ?', [customer.id]),
    ).toBeNull();
    database.close();
  });

  it('isolates duplicate detection and records between workspaces', async () => {
    const database = await createTestDatabase();
    const first = await new WorkspaceRepository(database).initializeLocal();
    const secondId = randomUUID();
    await database.run(
      'insert into workspaces (id, name, timezone, currency) values (?, ?, ?, ?)',
      [secondId, 'Outra oficina', 'America/Fortaleza', 'BRL'],
    );
    const service = new CustomerService(database);
    const customer = await service.create(first.id, { name: 'Mesmo Nome' });
    expect(await service.findPotentialDuplicates(secondId, { name: 'Mesmo Nome' })).toHaveLength(0);
    expect(await new CustomerRepository(database).findById(secondId, customer.id)).toBeNull();
    database.close();
  });
});
