import { randomUUID } from 'node:crypto';

import { CustomerRepository } from '@/database/repositories/customer.repository';
import { ReminderRepository } from '@/database/repositories/reminder.repository';
import { WorkspaceRepository } from '@/database/repositories/workspace.repository';
import { DebtService } from '@/features/debts/services/DebtService';
import type {
  NotificationGateway,
  NotificationPermissionState,
  NotificationScheduleContent,
} from '@/features/notifications/domain/notificationTypes';
import { getWorkspaceInstant } from '@/features/notifications/domain/reminderDates';
import { ReminderService } from '@/features/notifications/services/ReminderService';
import { PaymentReversalService } from '@/features/payments/services/PaymentReversalService';
import { PaymentService } from '@/features/payments/services/PaymentService';

import { createTestDatabase } from '../database/createTestDatabase';

class FakeNotificationGateway implements NotificationGateway {
  permission: NotificationPermissionState = { granted: true, canAskAgain: true };
  scheduled = new Map<string, { content: NotificationScheduleContent; date?: Date }>();
  canceled: string[] = [];
  presented: string[] = [];
  failCancellation = false;
  private sequence = 0;

  async getPermission() {
    return this.permission;
  }
  async requestPermission() {
    return this.permission;
  }
  async ensureChannels() {
    return undefined;
  }
  async scheduleAt(content: NotificationScheduleContent, date: Date) {
    const id = `schedule-${++this.sequence}`;
    this.scheduled.set(id, { content, date });
    return id;
  }
  async scheduleWeeklyAt(content: NotificationScheduleContent, date: Date) {
    const id = `weekly-${++this.sequence}`;
    this.scheduled.set(id, { content, date });
    return id;
  }
  async cancel(identifier: string) {
    if (this.failCancellation) throw new Error('Falha nativa');
    this.canceled.push(identifier);
    this.scheduled.delete(identifier);
  }
  async listScheduled() {
    return [...this.scheduled.keys()].map((identifier) => ({ identifier }));
  }
  async listPresentedReminderIds() {
    return this.presented;
  }
}

async function fixture(dueDate: string | null = '2026-12-10') {
  const database = await createTestDatabase();
  const workspace = await new WorkspaceRepository(database).initializeLocal();
  const customer = await new CustomerRepository(database).create(workspace.id, { name: 'Cliente' });
  const debt = await new DebtService(database).create(workspace.id, {
    customerId: customer.id,
    description: 'Serviço',
    totalCents: 10_000,
    serviceDate: '2026-11-20',
    dueDate,
  });
  const gateway = new FakeNotificationGateway();
  const service = new ReminderService(database, gateway);
  await service.savePreferences(workspace.id, {
    beforeDueEnabled: true,
    beforeDueDays: 1,
    dueDateEnabled: true,
    overdueEnabled: true,
    overdueIntervalDays: 3,
    weeklyEnabled: false,
    weeklyWeekday: 2,
    hour: 8,
    minute: 0,
    hideSensitiveContent: true,
  });
  return { database, workspace, debt, gateway, service };
}

describe('local reminder reconciliation', () => {
  it('uses workspace time, schedules due reminders and prevents duplicates', async () => {
    const { database, workspace, gateway, service } = await fixture();
    const now = new Date('2026-12-01T12:00:00.000Z');
    const first = await service.reconcile(workspace.id, workspace.timezone, now);
    const second = await service.reconcile(workspace.id, workspace.timezone, now);
    expect(first.scheduled).toBe(2);
    expect(second.scheduled).toBe(0);
    expect(gateway.scheduled.size).toBe(2);
    expect([...gateway.scheduled.values()].map(({ date }) => date?.toISOString())).toEqual([
      '2026-12-09T11:00:00.000Z',
      '2026-12-10T11:00:00.000Z',
    ]);
    database.close();
  });

  it('does not schedule when permission is denied', async () => {
    const { database, workspace, gateway, service } = await fixture();
    gateway.permission = { granted: false, canAskAgain: false };
    const result = await service.reconcile(
      workspace.id,
      workspace.timezone,
      new Date('2026-12-01T12:00:00.000Z'),
    );
    expect(result.permissionGranted).toBe(false);
    expect(gateway.scheduled.size).toBe(0);
    database.close();
  });

  it('keeps native identifiers for retry when cancellation fails', async () => {
    const { database, workspace, gateway, service } = await fixture();
    const now = new Date('2026-12-01T12:00:00.000Z');
    await service.reconcile(workspace.id, workspace.timezone, now);
    gateway.permission = { granted: false, canAskAgain: false };
    gateway.failCancellation = true;
    const failed = await service.reconcile(workspace.id, workspace.timezone, now);
    expect(failed.failed).toBeGreaterThan(0);
    expect(await new ReminderRepository(database).listActive(workspace.id)).not.toHaveLength(0);

    gateway.failCancellation = false;
    const retried = await service.reconcile(workspace.id, workspace.timezone, now);
    expect(retried.canceled).toBeGreaterThan(0);
    expect(await new ReminderRepository(database).listActive(workspace.id)).toHaveLength(0);
    database.close();
  });

  it('schedules overdue recurrence only after the due day', async () => {
    const { database, workspace, gateway, service } = await fixture('2026-11-20');
    await service.reconcile(workspace.id, workspace.timezone, new Date('2026-11-26T12:00:00.000Z'));
    const dates = [...gateway.scheduled.values()].flatMap(({ date }) => date?.toISOString() ?? []);
    expect(dates.slice(0, 3)).toEqual([
      '2026-11-29T11:00:00.000Z',
      '2026-12-02T11:00:00.000Z',
      '2026-12-05T11:00:00.000Z',
    ]);
    database.close();
  });

  it('schedules weekly summaries as concrete workspace-time instants', async () => {
    const { database, workspace, gateway, service } = await fixture();
    const preferences = await service.getPreferences(workspace.id);
    await service.savePreferences(workspace.id, { ...preferences, weeklyEnabled: true });
    await service.reconcile(workspace.id, workspace.timezone, new Date('2026-11-26T12:00:00.000Z'));
    const weeklyDates = [...gateway.scheduled.values()]
      .filter(({ content }) => content.data.type === 'weekly_summary')
      .flatMap(({ date }) => date?.toISOString() ?? []);
    expect(weeklyDates).toEqual([
      '2026-11-30T11:00:00.000Z',
      '2026-12-07T11:00:00.000Z',
      '2026-12-14T11:00:00.000Z',
      '2026-12-21T11:00:00.000Z',
    ]);
    database.close();
  });

  it('cancels after full payment and restores after reversal without affecting finance', async () => {
    const { database, workspace, debt, gateway, service } = await fixture('2026-12-10');
    const reconcile = async () => {
      await service.reconcile(
        workspace.id,
        workspace.timezone,
        new Date('2026-11-26T12:00:00.000Z'),
      );
    };
    await reconcile();
    const payment = await new PaymentService(database, reconcile).register(workspace.id, {
      operationId: randomUUID(),
      debtId: debt.id,
      amountCents: 10_000,
      paymentMethod: 'cash',
      paidAt: new Date().toISOString(),
    });
    expect(gateway.canceled.length).toBeGreaterThan(0);
    expect(await new ReminderRepository(database).listActive(workspace.id)).toHaveLength(0);
    await new PaymentReversalService(database, reconcile).reverse(workspace.id, {
      operationId: randomUUID(),
      paymentId: payment.id,
      reason: 'Correção',
      reversedAt: new Date().toISOString(),
    });
    expect(
      (await new ReminderRepository(database).listActive(workspace.id)).length,
    ).toBeGreaterThan(0);
    database.close();
  });

  it('keeps reminders after a partial payment and reschedules a changed due date', async () => {
    const { database, workspace, debt, gateway, service } = await fixture('2026-12-10');
    const reconcile = async () => {
      await service.reconcile(
        workspace.id,
        workspace.timezone,
        new Date('2026-11-26T12:00:00.000Z'),
      );
    };
    await reconcile();
    const initialIdentifiers = [...gateway.scheduled.keys()];
    await new PaymentService(database, reconcile).register(workspace.id, {
      operationId: randomUUID(),
      debtId: debt.id,
      amountCents: 1_000,
      paymentMethod: 'pix',
      paidAt: new Date().toISOString(),
    });
    expect([...gateway.scheduled.keys()]).toEqual(initialIdentifiers);
    await new DebtService(database, reconcile).update(
      workspace.id,
      debt.id,
      {
        dueDate: '2026-12-20',
      },
      randomUUID(),
    );
    expect(gateway.canceled).toEqual(expect.arrayContaining(initialIdentifiers));
    const active = await new ReminderRepository(database).listActive(workspace.id);
    expect(active.every((item) => item.scheduledAt.startsWith('2026-12'))).toBe(true);
    database.close();
  });

  it('recreates scheduled content when privacy preferences change', async () => {
    const { database, workspace, gateway, service } = await fixture('2026-12-10');
    await service.reconcile(workspace.id, workspace.timezone, new Date('2026-11-26T12:00:00.000Z'));
    const initialIdentifiers = [...gateway.scheduled.keys()];
    const preferences = await service.getPreferences(workspace.id);
    await service.savePreferences(workspace.id, { ...preferences, hideSensitiveContent: false });
    expect(gateway.canceled).toEqual(expect.arrayContaining(initialIdentifiers));
    await service.reconcile(workspace.id, workspace.timezone, new Date('2026-11-26T12:00:00.000Z'));
    expect([...gateway.scheduled.values()].every(({ content }) => content.body === 'Serviço')).toBe(
      true,
    );
    database.close();
  });

  it('isolates reminder generation by workspace', async () => {
    const { database, workspace, gateway, service } = await fixture('2026-12-10');
    const otherWorkspaceId = randomUUID();
    await database.run(
      'insert into workspaces (id, name, timezone, currency) values (?, ?, ?, ?)',
      [otherWorkspaceId, 'Outra oficina', 'America/Fortaleza', 'BRL'],
    );
    const otherCustomer = await new CustomerRepository(database).create(otherWorkspaceId, {
      name: 'Outro cliente',
    });
    await new DebtService(database).create(otherWorkspaceId, {
      customerId: otherCustomer.id,
      description: 'Outro serviço',
      totalCents: 20_000,
      serviceDate: '2026-11-20',
      dueDate: '2026-12-10',
    });
    await service.reconcile(workspace.id, workspace.timezone, new Date('2026-11-26T12:00:00.000Z'));
    expect(
      [...gateway.scheduled.values()].every(
        ({ content }) => content.data.workspaceId === workspace.id,
      ),
    ).toBe(true);
    expect(await new ReminderRepository(database).listCenter(otherWorkspaceId)).toHaveLength(0);
    database.close();
  });

  it('supports a manual reminder for a debt without due date and confirms delivery separately', async () => {
    const { database, workspace, debt, gateway, service } = await fixture(null);
    const when = new Date('2030-12-10T11:00:00.000Z');
    const reminder = await service.createCustom(workspace.id, debt.id, when);
    expect(reminder.status).toBe('scheduled');
    gateway.presented = [reminder.id];
    await service.reconcile(workspace.id, workspace.timezone);
    const center = await new ReminderRepository(database).listCenter(workspace.id);
    expect(center[0]).toMatchObject({ id: reminder.id, status: 'delivered' });
    database.close();
  });

  it('converts a civil time with the workspace timezone', () => {
    expect(getWorkspaceInstant('2026-11-26', 8, 0, 'America/Fortaleza').toISOString()).toBe(
      '2026-11-26T11:00:00.000Z',
    );
  });
});
