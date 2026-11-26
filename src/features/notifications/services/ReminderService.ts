import {
  ReminderRepository,
  type EligibleReminderDebt,
} from '@/database/repositories/reminder.repository';
import { SettingsRepository } from '@/database/repositories/settings.repository';
import type { SqlExecutor } from '@/database/types/executor';
import {
  DEFAULT_NOTIFICATION_PREFERENCES,
  type NotificationGateway,
  type NotificationPreferences,
  type NotificationScheduleContent,
  type ReminderRecord,
  type ReminderType,
} from '@/features/notifications/domain/notificationTypes';
import {
  addCivilDays,
  getNextOverdueDates,
  getWorkspaceInstant,
} from '@/features/notifications/domain/reminderDates';
import { getCivilDate } from '@/utils/date';

const PREFERENCES_KEY = 'notification_preferences';
const WEEKLY_SCHEDULE_KEY = 'notification_weekly_schedule';
const SCHEDULE_HORIZON_DAYS = 30;
const MAX_DEVICE_SCHEDULES = 48;
const WEEKLY_SCHEDULE_RESERVE = 5;

interface WeeklyScheduleSetting {
  signature: string;
  entries: { identifier: string; scheduledAt: string }[];
}

interface DesiredReminder {
  debt: EligibleReminderDebt;
  type: ReminderType;
  scheduledAt: string;
}

export interface ReconciliationResult {
  scheduled: number;
  canceled: number;
  failed: number;
  permissionGranted: boolean;
}

function sanitizePreferences(value: NotificationPreferences | null): NotificationPreferences {
  if (!value) return DEFAULT_NOTIFICATION_PREFERENCES;
  return {
    beforeDueEnabled: Boolean(value.beforeDueEnabled),
    beforeDueDays: Math.min(30, Math.max(1, Math.trunc(value.beforeDueDays || 1))),
    dueDateEnabled: Boolean(value.dueDateEnabled),
    overdueEnabled: Boolean(value.overdueEnabled),
    overdueIntervalDays: Math.min(30, Math.max(1, Math.trunc(value.overdueIntervalDays || 3))),
    weeklyEnabled: Boolean(value.weeklyEnabled),
    weeklyWeekday: Math.min(7, Math.max(1, Math.trunc(value.weeklyWeekday || 2))),
    hour: Math.min(23, Math.max(0, Math.trunc(value.hour || 0))),
    minute: Math.min(59, Math.max(0, Math.trunc(value.minute || 0))),
    hideSensitiveContent: value.hideSensitiveContent !== false,
  };
}

function reminderKey(debtId: string, type: ReminderType, scheduledAt: string): string {
  return `${debtId}:${type}:${scheduledAt}`;
}

function getWeeklyInstants(
  weekday: number,
  hour: number,
  minute: number,
  timezone: string,
  now: Date,
): Date[] {
  const today = getCivilDate(now, timezone);
  const horizon = new Date(now.getTime() + SCHEDULE_HORIZON_DAYS * 86_400_000);
  const dates: Date[] = [];
  for (let offset = 0; offset <= SCHEDULE_HORIZON_DAYS; offset += 1) {
    const civilDate = addCivilDays(today, offset);
    const currentWeekday = new Date(`${civilDate}T12:00:00.000Z`).getUTCDay() + 1;
    if (currentWeekday !== weekday) continue;
    const instant = getWorkspaceInstant(civilDate, hour, minute, timezone);
    if (instant > now && instant <= horizon) dates.push(instant);
  }
  return dates;
}

function getContent(
  reminder: ReminderRecord,
  debt: EligibleReminderDebt,
  hideSensitiveContent: boolean,
): NotificationScheduleContent {
  const titles: Record<ReminderType, string> = {
    before_due: 'Cobrança com vencimento próximo',
    due_date: 'Cobrança vencendo hoje',
    overdue: 'Cobrança pendente',
    custom: 'Lembrete de cobrança',
  };
  return {
    title: titles[reminder.type],
    body: hideSensitiveContent
      ? 'Abra o Fiados Moreira para consultar os detalhes.'
      : debt.description,
    data: {
      reminderId: reminder.id,
      workspaceId: reminder.workspaceId,
      debtId: reminder.debtId,
      type: reminder.type,
    },
  };
}

export class ReminderService {
  private readonly reminders: ReminderRepository;
  private readonly settings: SettingsRepository;

  constructor(
    executor: SqlExecutor,
    private readonly gateway: NotificationGateway,
  ) {
    this.reminders = new ReminderRepository(executor);
    this.settings = new SettingsRepository(executor);
  }

  async getPreferences(workspaceId: string): Promise<NotificationPreferences> {
    return sanitizePreferences(
      await this.settings.get<NotificationPreferences>(workspaceId, PREFERENCES_KEY),
    );
  }

  async savePreferences(
    workspaceId: string,
    preferences: NotificationPreferences,
  ): Promise<NotificationPreferences> {
    const sanitized = sanitizePreferences(preferences);
    const active = await this.reminders.listActive(workspaceId);
    for (const reminder of active) {
      if (reminder.notificationIdentifier) {
        await this.gateway.cancel(reminder.notificationIdentifier);
      }
    }
    for (const reminder of active) {
      await this.reminders.setStatus(
        reminder.id,
        reminder.type === 'custom' ? 'pending' : 'canceled',
      );
    }
    await this.settings.set(workspaceId, PREFERENCES_KEY, sanitized);
    return sanitized;
  }

  getPermission() {
    return this.gateway.getPermission();
  }

  async requestPermission() {
    await this.gateway.ensureChannels();
    return this.gateway.requestPermission();
  }

  async createCustom(
    workspaceId: string,
    debtId: string,
    scheduledAt: Date,
  ): Promise<ReminderRecord> {
    if (scheduledAt.getTime() <= Date.now()) throw new Error('REMINDER_DATE_IN_PAST');
    const debt = (await this.reminders.listEligibleDebts(workspaceId)).find(
      (item) => item.id === debtId,
    );
    if (!debt) throw new Error('DEBT_NOT_ELIGIBLE');
    const permission = await this.gateway.getPermission();
    if (!permission.granted) throw new Error('NOTIFICATION_PERMISSION_REQUIRED');
    await this.gateway.ensureChannels();
    const scheduledAtIso = scheduledAt.toISOString();
    const existing = await this.reminders.findByKey(workspaceId, debtId, 'custom', scheduledAtIso);
    if (existing?.status === 'scheduled') return existing;
    if ((await this.gateway.listScheduled()).length >= MAX_DEVICE_SCHEDULES) {
      throw new Error('NOTIFICATION_SCHEDULE_LIMIT');
    }
    const record = await this.reminders.insertPending(
      workspaceId,
      debtId,
      'custom',
      scheduledAtIso,
    );
    if (record.status === 'scheduled') return record;
    const preferences = await this.getPreferences(workspaceId);
    try {
      const identifier = await this.gateway.scheduleAt(
        getContent(record, debt, preferences.hideSensitiveContent),
        scheduledAt,
      );
      await this.reminders.setScheduled(record.id, identifier);
      return { ...record, status: 'scheduled', notificationIdentifier: identifier };
    } catch (error) {
      await this.reminders.setStatus(record.id, 'failed');
      throw error;
    }
  }

  async reconcile(
    workspaceId: string,
    timezone: string,
    now = new Date(),
  ): Promise<ReconciliationResult> {
    const result: ReconciliationResult = {
      scheduled: 0,
      canceled: 0,
      failed: 0,
      permissionGranted: false,
    };
    const permission = await this.gateway.getPermission();
    result.permissionGranted = permission.granted;
    const [preferences, debts, active, deviceSchedules, presentedIds] = await Promise.all([
      this.getPreferences(workspaceId),
      this.reminders.listEligibleDebts(workspaceId),
      this.reminders.listActive(workspaceId),
      this.gateway.listScheduled(),
      this.gateway.listPresentedReminderIds(),
    ]);
    if (!permission.granted) {
      for (const record of active) {
        if (record.notificationIdentifier) {
          try {
            await this.gateway.cancel(record.notificationIdentifier);
            result.canceled += 1;
          } catch {
            result.failed += 1;
            continue;
          }
        }
        await this.reminders.setStatus(
          record.id,
          record.type === 'custom' ? 'pending' : 'canceled',
        );
      }
      const weekly = await this.settings.get<WeeklyScheduleSetting>(
        workspaceId,
        WEEKLY_SCHEDULE_KEY,
      );
      if (weekly) {
        let allCanceled = true;
        for (const entry of weekly.entries ?? []) {
          try {
            await this.gateway.cancel(entry.identifier);
            result.canceled += 1;
          } catch {
            result.failed += 1;
            allCanceled = false;
          }
        }
        if (allCanceled) {
          await this.settings.set<WeeklyScheduleSetting | null>(
            workspaceId,
            WEEKLY_SCHEDULE_KEY,
            null,
          );
        }
      }
      return result;
    }

    await this.gateway.ensureChannels();
    for (const id of presentedIds) await this.reminders.markDelivered(workspaceId, id);

    const debtById = new Map(debts.map((debt) => [debt.id, debt]));
    const deviceIds = new Set(deviceSchedules.map(({ identifier }) => identifier));
    const activeCustomCount = active.filter(
      (record) =>
        record.type === 'custom' &&
        debtById.has(record.debtId) &&
        new Date(record.scheduledAt) > now,
    ).length;
    const automaticLimit = Math.max(
      0,
      MAX_DEVICE_SCHEDULES - activeCustomCount - WEEKLY_SCHEDULE_RESERVE,
    );
    const desired = this.buildDesired(debts, preferences, timezone, now).slice(0, automaticLimit);
    const desiredKeys = new Set(
      desired.map((item) => reminderKey(item.debt.id, item.type, item.scheduledAt)),
    );

    for (const record of active) {
      const key = reminderKey(record.debtId, record.type, record.scheduledAt);
      const customIsValid =
        record.type === 'custom' &&
        debtById.has(record.debtId) &&
        new Date(record.scheduledAt) > now;
      if (desiredKeys.has(key) || customIsValid) continue;
      if (record.notificationIdentifier) {
        try {
          await this.gateway.cancel(record.notificationIdentifier);
        } catch {
          result.failed += 1;
          continue;
        }
      }
      await this.reminders.setStatus(record.id, 'canceled');
      result.canceled += 1;
    }

    const activeByKey = new Map(
      active.map((record) => [reminderKey(record.debtId, record.type, record.scheduledAt), record]),
    );
    for (const item of desired) {
      const key = reminderKey(item.debt.id, item.type, item.scheduledAt);
      let record = activeByKey.get(key);
      if (
        record?.status === 'scheduled' &&
        record.notificationIdentifier &&
        deviceIds.has(record.notificationIdentifier)
      ) {
        continue;
      }
      record = await this.reminders.insertPending(
        workspaceId,
        item.debt.id,
        item.type,
        item.scheduledAt,
      );
      try {
        const identifier = await this.gateway.scheduleAt(
          getContent(record, item.debt, preferences.hideSensitiveContent),
          new Date(item.scheduledAt),
        );
        await this.reminders.setScheduled(record.id, identifier);
        result.scheduled += 1;
      } catch {
        await this.reminders.setStatus(record.id, 'failed');
        result.failed += 1;
      }
    }

    await this.reconcileCustom(active, debtById, deviceIds, preferences, now, result);
    await this.reconcileWeekly(
      workspaceId,
      timezone,
      preferences,
      debts.length > 0,
      deviceIds,
      now,
      result,
    );
    return result;
  }

  private buildDesired(
    debts: EligibleReminderDebt[],
    preferences: NotificationPreferences,
    timezone: string,
    now: Date,
  ): DesiredReminder[] {
    const today = getCivilDate(now, timezone);
    const horizon = new Date(now.getTime() + SCHEDULE_HORIZON_DAYS * 86_400_000);
    const desired: DesiredReminder[] = [];
    for (const debt of debts) {
      if (!debt.dueDate) continue;
      if (preferences.beforeDueEnabled && debt.dueDate > today) {
        const instant = getWorkspaceInstant(
          addCivilDays(debt.dueDate, -preferences.beforeDueDays),
          preferences.hour,
          preferences.minute,
          timezone,
        );
        if (instant > now && instant <= horizon) {
          desired.push({ debt, type: 'before_due', scheduledAt: instant.toISOString() });
        }
      }
      if (preferences.dueDateEnabled && debt.dueDate >= today) {
        const instant = getWorkspaceInstant(
          debt.dueDate,
          preferences.hour,
          preferences.minute,
          timezone,
        );
        if (instant > now && instant <= horizon)
          desired.push({ debt, type: 'due_date', scheduledAt: instant.toISOString() });
      }
      if (preferences.overdueEnabled && debt.dueDate < today) {
        for (const instant of getNextOverdueDates(
          debt.dueDate,
          timezone,
          preferences.overdueIntervalDays,
          preferences.hour,
          preferences.minute,
          now,
          SCHEDULE_HORIZON_DAYS,
        )) {
          desired.push({ debt, type: 'overdue', scheduledAt: instant.toISOString() });
        }
      }
    }
    return desired.sort((first, second) => first.scheduledAt.localeCompare(second.scheduledAt));
  }

  private async reconcileCustom(
    active: ReminderRecord[],
    debtById: Map<string, EligibleReminderDebt>,
    deviceIds: Set<string>,
    preferences: NotificationPreferences,
    now: Date,
    result: ReconciliationResult,
  ): Promise<void> {
    for (const record of active) {
      if (record.type !== 'custom' || new Date(record.scheduledAt) <= now) continue;
      const debt = debtById.get(record.debtId);
      if (
        !debt ||
        (record.notificationIdentifier && deviceIds.has(record.notificationIdentifier))
      ) {
        continue;
      }
      try {
        const identifier = await this.gateway.scheduleAt(
          getContent(record, debt, preferences.hideSensitiveContent),
          new Date(record.scheduledAt),
        );
        await this.reminders.setScheduled(record.id, identifier);
        result.scheduled += 1;
      } catch {
        await this.reminders.setStatus(record.id, 'failed');
        result.failed += 1;
      }
    }
  }

  private async reconcileWeekly(
    workspaceId: string,
    timezone: string,
    preferences: NotificationPreferences,
    hasOpenDebts: boolean,
    deviceIds: Set<string>,
    now: Date,
    result: ReconciliationResult,
  ): Promise<void> {
    const current = await this.settings.get<WeeklyScheduleSetting>(
      workspaceId,
      WEEKLY_SCHEDULE_KEY,
    );
    const signature = `${timezone}:${preferences.weeklyWeekday}:${preferences.hour}:${preferences.minute}`;
    const desiredDates = getWeeklyInstants(
      preferences.weeklyWeekday,
      preferences.hour,
      preferences.minute,
      timezone,
      now,
    );
    const desiredSet = new Set(desiredDates.map((date) => date.toISOString()));
    const currentIsValid = Boolean(
      current &&
      current.signature === signature &&
      current.entries?.length === desiredDates.length &&
      current.entries.every(
        (entry) => desiredSet.has(entry.scheduledAt) && deviceIds.has(entry.identifier),
      ),
    );
    if (current && (!preferences.weeklyEnabled || !hasOpenDebts || !currentIsValid)) {
      let allCanceled = true;
      for (const entry of current.entries ?? []) {
        try {
          await this.gateway.cancel(entry.identifier);
          result.canceled += 1;
        } catch {
          result.failed += 1;
          allCanceled = false;
        }
      }
      if (!allCanceled) return;
      await this.settings.set<WeeklyScheduleSetting | null>(workspaceId, WEEKLY_SCHEDULE_KEY, null);
    }
    if (!preferences.weeklyEnabled || !hasOpenDebts || currentIsValid) return;
    const entries: WeeklyScheduleSetting['entries'] = [];
    for (const date of desiredDates) {
      try {
        const identifier = await this.gateway.scheduleWeeklyAt(
          {
            title: 'Resumo semanal de cobranças',
            body: 'Abra o Fiados Moreira para conferir as cobranças previstas.',
            data: { workspaceId, type: 'weekly_summary' },
          },
          date,
        );
        entries.push({ identifier, scheduledAt: date.toISOString() });
        result.scheduled += 1;
      } catch {
        result.failed += 1;
      }
    }
    await this.settings.set<WeeklyScheduleSetting>(workspaceId, WEEKLY_SCHEDULE_KEY, {
      entries,
      signature,
    });
  }
}
