import { randomUUID } from 'node:crypto';

import { CollectionRepository } from '@/database/repositories/collection.repository';
import { CustomerRepository } from '@/database/repositories/customer.repository';
import { SettingsRepository } from '@/database/repositories/settings.repository';
import { WorkspaceRepository } from '@/database/repositories/workspace.repository';
import {
  buildWhatsAppUrl,
  DEFAULT_COLLECTION_TEMPLATES,
  renderCollectionMessage,
} from '@/features/collections/domain/collectionMessages';
import { normalizeWhatsAppPhone } from '@/features/collections/domain/collectionPhone';
import {
  CollectionError,
  CollectionService,
  type WhatsAppGateway,
} from '@/features/collections/services/CollectionService';
import { DebtService } from '@/features/debts/services/DebtService';
import { PaymentReversalService } from '@/features/payments/services/PaymentReversalService';
import { PaymentService } from '@/features/payments/services/PaymentService';

import { createTestDatabase } from '../database/createTestDatabase';

class FakeWhatsAppGateway implements WhatsAppGateway {
  canOpenResult = true;
  opened: string[] = [];
  async canOpen() {
    return this.canOpenResult;
  }
  async open(url: string) {
    this.opened.push(url);
  }
}

describe('WhatsApp collection messages', () => {
  it('normalizes Brazilian phones and encodes message URLs', () => {
    expect(normalizeWhatsAppPhone('(85) 99999-1234')).toBe('5585999991234');
    expect(normalizeWhatsAppPhone('+55 85 3333-1234')).toBe('558533331234');
    expect(normalizeWhatsAppPhone('123')).toBeNull();
    expect(buildWhatsAppUrl('5585999991234', 'Olá & tudo bem?')).toBe(
      'https://wa.me/5585999991234?text=Ol%C3%A1%20%26%20tudo%20bem%3F',
    );
  });

  it('replaces financial and optional variables without inventing a due date', () => {
    const result = renderCollectionMessage(
      '{cliente}: {servico}; {valor_original}; {valor_pago}; {saldo_pendente}; {vencimento}; {dias_atraso}; {oficina}',
      {
        customerName: 'João',
        workshopName: 'Oficina Moreira',
        serviceDescription: '',
        originalCents: 12_000,
        paidCents: 2_000,
        pendingCents: 10_000,
        dueDate: null,
        overdueDays: 0,
      },
    );
    expect(result).toContain('João: serviços em aberto');
    expect(result).toContain('R$ 120,00; R$ 20,00; R$ 100,00');
    expect(result).toContain('sem vencimento definido; 0; Oficina Moreira');
  });
});

describe('collection service persistence and finance', () => {
  it('uses current partial balance, revalidates it and records only an opened attempt', async () => {
    const database = await createTestDatabase();
    const workspace = await new WorkspaceRepository(database).initializeLocal();
    const customer = await new CustomerRepository(database).create(workspace.id, {
      name: 'Cliente Teste',
      phone: '(85) 3333-1234',
      whatsapp: '(85) 99999-1234',
    });
    const debt = await new DebtService(database).create(workspace.id, {
      customerId: customer.id,
      description: 'Revisão completa',
      totalCents: 20_000,
      serviceDate: '2026-11-20',
      dueDate: '2026-11-25',
    });
    await new PaymentService(database).register(workspace.id, {
      operationId: randomUUID(),
      debtId: debt.id,
      amountCents: 5_000,
      paymentMethod: 'pix',
      paidAt: '2026-11-24T12:00:00.000Z',
    });
    const repository = new CollectionRepository(database);
    const gateway = new FakeWhatsAppGateway();
    const service = new CollectionService(repository, new SettingsRepository(database), gateway);
    const draft = await service.prepareDebt(
      workspace.id,
      debt.id,
      workspace.timezone,
      undefined,
      new Date('2026-11-26T12:00:00.000Z'),
    );
    expect(draft.templateType).toBe('overdue');
    expect(draft.variables.paidCents).toBe(5_000);
    expect(draft.variables.pendingCents).toBe(15_000);
    expect(draft.recipient).toBe('5585999991234');

    await new PaymentService(database).register(workspace.id, {
      operationId: randomUUID(),
      debtId: debt.id,
      amountCents: 1_000,
      paymentMethod: 'cash',
      paidAt: '2026-11-25T12:00:00.000Z',
    });
    await expect(
      service.openWhatsApp({
        workspaceId: workspace.id,
        scope: 'debt',
        targetId: debt.id,
        timezone: workspace.timezone,
        templateType: 'overdue',
        message: 'Mensagem com saldo antigo',
        expectedPendingCents: 15_000,
      }),
    ).rejects.toMatchObject({ code: 'BALANCE_CHANGED' });
    expect(await repository.listAttempts(workspace.id, customer.id)).toHaveLength(0);

    await service.openWhatsApp({
      workspaceId: workspace.id,
      scope: 'debt',
      targetId: debt.id,
      timezone: workspace.timezone,
      templateType: 'overdue',
      message: 'Mensagem revisada pelo usuário',
      expectedPendingCents: 14_000,
    });
    expect(gateway.opened[0]).toContain('https://wa.me/5585999991234?text=Mensagem%20revisada');
    expect(await repository.listAttempts(workspace.id, customer.id)).toEqual([
      expect.objectContaining({ debtId: debt.id, templateType: 'overdue' }),
    ]);
    database.close();
  });

  it('does not record when WhatsApp is unavailable', async () => {
    const database = await createTestDatabase();
    const workspace = await new WorkspaceRepository(database).initializeLocal();
    const customer = await new CustomerRepository(database).create(workspace.id, {
      name: 'Cliente',
      whatsapp: '(85) 99999-1234',
    });
    const debt = await new DebtService(database).create(workspace.id, {
      customerId: customer.id,
      description: 'Serviço',
      totalCents: 10_000,
      serviceDate: '2026-11-20',
    });
    const repository = new CollectionRepository(database);
    const gateway = new FakeWhatsAppGateway();
    gateway.canOpenResult = false;
    const service = new CollectionService(repository, new SettingsRepository(database), gateway);
    await expect(
      service.openWhatsApp({
        workspaceId: workspace.id,
        scope: 'debt',
        targetId: debt.id,
        timezone: workspace.timezone,
        templateType: 'no_due',
        message: 'Olá',
        expectedPendingCents: 10_000,
      }),
    ).rejects.toMatchObject<Partial<CollectionError>>({ code: 'WHATSAPP_UNAVAILABLE' });
    expect(await repository.listAttempts(workspace.id, customer.id)).toHaveLength(0);
    database.close();
  });

  it('blocks paid and canceled debts, then allows a fully reversed payment', async () => {
    const database = await createTestDatabase();
    const workspace = await new WorkspaceRepository(database).initializeLocal();
    const customer = await new CustomerRepository(database).create(workspace.id, {
      name: 'Cliente',
      whatsapp: '(85) 99999-1234',
    });
    const debts = new DebtService(database);
    const paidDebt = await debts.create(workspace.id, {
      customerId: customer.id,
      description: 'Pago',
      totalCents: 10_000,
      serviceDate: '2026-11-20',
    });
    const payment = await new PaymentService(database).register(workspace.id, {
      operationId: randomUUID(),
      debtId: paidDebt.id,
      amountCents: 10_000,
      paymentMethod: 'cash',
      paidAt: '2026-11-24T12:00:00.000Z',
    });
    const service = new CollectionService(
      new CollectionRepository(database),
      new SettingsRepository(database),
      new FakeWhatsAppGateway(),
    );
    await expect(
      service.prepareDebt(workspace.id, paidDebt.id, workspace.timezone),
    ).rejects.toMatchObject({ code: 'NO_OUTSTANDING_BALANCE' });
    await new PaymentReversalService(database).reverse(workspace.id, {
      operationId: randomUUID(),
      paymentId: payment.id,
      reason: 'Pagamento lançado incorretamente',
      reversedAt: '2026-11-25T12:00:00.000Z',
    });
    expect(
      (await service.prepareDebt(workspace.id, paidDebt.id, workspace.timezone)).variables,
    ).toMatchObject({ paidCents: 0, pendingCents: 10_000 });

    const canceled = await debts.create(workspace.id, {
      customerId: customer.id,
      description: 'Cancelado',
      totalCents: 5_000,
      serviceDate: '2026-11-20',
    });
    await debts.cancel(workspace.id, canceled.id, {
      operationId: randomUUID(),
      reason: 'Serviço não realizado',
    });
    await expect(
      service.prepareDebt(workspace.id, canceled.id, workspace.timezone),
    ).rejects.toMatchObject({ code: 'DEBT_CANCELED' });
    database.close();
  });

  it('sums only eligible customer debts and isolates attempts by workspace', async () => {
    const database = await createTestDatabase();
    const firstWorkspace = await new WorkspaceRepository(database).initializeLocal();
    const secondWorkspaceId = randomUUID();
    await database.run(
      'insert into workspaces (id, name, timezone, currency) values (?, ?, ?, ?)',
      [secondWorkspaceId, 'Outra oficina', 'America/Fortaleza', 'BRL'],
    );
    const firstCustomer = await new CustomerRepository(database).create(firstWorkspace.id, {
      name: 'Mesmo nome',
      whatsapp: '(85) 99999-1234',
    });
    const secondCustomer = await new CustomerRepository(database).create(secondWorkspaceId, {
      name: 'Mesmo nome',
      whatsapp: '(85) 99999-1234',
    });
    const debt = await new DebtService(database).create(firstWorkspace.id, {
      customerId: firstCustomer.id,
      description: 'Freios',
      totalCents: 30_000,
      serviceDate: '2026-11-20',
    });
    const partiallyPaidDebt = await new DebtService(database).create(firstWorkspace.id, {
      customerId: firstCustomer.id,
      description: 'Suspensão',
      totalCents: 20_000,
      serviceDate: '2026-11-21',
    });
    await new PaymentService(database).register(firstWorkspace.id, {
      operationId: randomUUID(),
      debtId: partiallyPaidDebt.id,
      amountCents: 5_000,
      paymentMethod: 'pix',
      paidAt: '2026-11-22T12:00:00.000Z',
    });
    const paidDebt = await new DebtService(database).create(firstWorkspace.id, {
      customerId: firstCustomer.id,
      description: 'Quitado',
      totalCents: 7_000,
      serviceDate: '2026-11-22',
    });
    await new PaymentService(database).register(firstWorkspace.id, {
      operationId: randomUUID(),
      debtId: paidDebt.id,
      amountCents: 7_000,
      paymentMethod: 'cash',
      paidAt: '2026-11-23T12:00:00.000Z',
    });
    const canceledDebt = await new DebtService(database).create(firstWorkspace.id, {
      customerId: firstCustomer.id,
      description: 'Cancelado',
      totalCents: 9_000,
      serviceDate: '2026-11-23',
    });
    await new DebtService(database).cancel(firstWorkspace.id, canceledDebt.id, {
      operationId: randomUUID(),
      reason: 'Serviço não realizado',
    });
    await new DebtService(database).create(secondWorkspaceId, {
      customerId: secondCustomer.id,
      description: 'Outro workspace',
      totalCents: 99_000,
      serviceDate: '2026-11-20',
    });
    const repository = new CollectionRepository(database);
    const service = new CollectionService(
      repository,
      new SettingsRepository(database),
      new FakeWhatsAppGateway(),
    );
    const draft = await service.prepareCustomer(
      firstWorkspace.id,
      firstCustomer.id,
      firstWorkspace.timezone,
    );
    expect(draft.variables).toMatchObject({
      originalCents: 50_000,
      paidCents: 5_000,
      pendingCents: 45_000,
    });
    await service.saveTemplates(firstWorkspace.id, {
      ...DEFAULT_COLLECTION_TEMPLATES,
      no_due: 'Modelo exclusivo de {oficina}',
    });
    expect((await service.getTemplates(firstWorkspace.id)).no_due).toBe(
      'Modelo exclusivo de {oficina}',
    );
    expect((await service.getTemplates(secondWorkspaceId)).no_due).toBe(
      DEFAULT_COLLECTION_TEMPLATES.no_due,
    );
    await repository.recordAttempt({
      workspaceId: firstWorkspace.id,
      customerId: firstCustomer.id,
      debtId: debt.id,
      templateType: 'no_due',
    });
    expect(await repository.listAttempts(secondWorkspaceId, secondCustomer.id)).toHaveLength(0);
    await expect(
      service.prepareCustomer(firstWorkspace.id, secondCustomer.id, firstWorkspace.timezone),
    ).rejects.toMatchObject({ code: 'NOT_FOUND' });
    database.close();
  });
});
