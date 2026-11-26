import type { SqlExecutor } from '@/database/types/executor';
import type {
  ReminderListItem,
  ReminderRecord,
  ReminderStatus,
  ReminderType,
} from '@/features/notifications/domain/notificationTypes';
import { createUuid } from '@/utils/uuid';

export interface EligibleReminderDebt {
  id: string;
  description: string;
  dueDate: string | null;
  pendingCents: number;
}

const REMINDER_SELECT = `select id, workspace_id as workspaceId, debt_id as debtId, type,
  scheduled_at as scheduledAt, status, notification_identifier as notificationIdentifier,
  delivered_at as deliveredAt, read_at as readAt, created_at as createdAt,
  updated_at as updatedAt from reminders`;

export class ReminderRepository {
  constructor(private readonly executor: SqlExecutor) {}

  listEligibleDebts(workspaceId: string): Promise<EligibleReminderDebt[]> {
    return this.executor.all<EligibleReminderDebt>(
      `select d.id, d.description, d.due_date as dueDate,
        d.total_cents - coalesce(sum(case when r.id is null then p.amount_cents else 0 end), 0)
          as pendingCents
       from debts d
       left join payments p on p.workspace_id = d.workspace_id and p.debt_id = d.id
       left join payment_reversals r
         on r.workspace_id = p.workspace_id and r.payment_id = p.id
       where d.workspace_id = ? and d.canceled_at is null
       group by d.id, d.description, d.due_date, d.total_cents
       having pendingCents > 0`,
      [workspaceId],
    );
  }

  listActive(workspaceId: string): Promise<ReminderRecord[]> {
    return this.executor.all<ReminderRecord>(
      `${REMINDER_SELECT} where workspace_id = ? and status in ('pending','scheduled','failed')
       order by scheduled_at asc`,
      [workspaceId],
    );
  }

  listCustomActive(workspaceId: string): Promise<ReminderRecord[]> {
    return this.executor.all<ReminderRecord>(
      `${REMINDER_SELECT} where workspace_id = ? and type = 'custom'
       and status in ('pending','scheduled','failed') order by scheduled_at asc`,
      [workspaceId],
    );
  }

  listCenter(workspaceId: string, limit = 100): Promise<ReminderListItem[]> {
    return this.executor.all<ReminderListItem>(
      `select r.id, r.workspace_id as workspaceId, r.debt_id as debtId, r.type,
        r.scheduled_at as scheduledAt, r.status,
        r.notification_identifier as notificationIdentifier, r.delivered_at as deliveredAt,
        r.read_at as readAt, r.created_at as createdAt, r.updated_at as updatedAt,
        d.description as debtDescription, d.due_date as dueDate
       from reminders r
       inner join debts d on d.workspace_id = r.workspace_id and d.id = r.debt_id
       where r.workspace_id = ? and r.status in ('scheduled','delivered','failed')
       order by coalesce(r.delivered_at, r.scheduled_at) desc limit ?`,
      [workspaceId, limit],
    );
  }

  async countUnread(workspaceId: string): Promise<number> {
    const row = await this.executor.get<{ count: number }>(
      `select count(*) as count from reminders
       where workspace_id = ? and status = 'delivered' and read_at is null`,
      [workspaceId],
    );
    return row?.count ?? 0;
  }

  async findByKey(
    workspaceId: string,
    debtId: string,
    type: ReminderType,
    scheduledAt: string,
  ): Promise<ReminderRecord | null> {
    return this.executor.get<ReminderRecord>(
      `${REMINDER_SELECT} where workspace_id = ? and debt_id = ? and type = ? and scheduled_at = ?`,
      [workspaceId, debtId, type, scheduledAt],
    );
  }

  async insertPending(
    workspaceId: string,
    debtId: string,
    type: ReminderType,
    scheduledAt: string,
  ): Promise<ReminderRecord> {
    const existing = await this.findByKey(workspaceId, debtId, type, scheduledAt);
    if (existing) return existing;
    const id = createUuid();
    const now = new Date().toISOString();
    await this.executor.run(
      `insert into reminders
       (id, workspace_id, debt_id, type, scheduled_at, status, created_at, updated_at)
       values (?, ?, ?, ?, ?, 'pending', ?, ?)`,
      [id, workspaceId, debtId, type, scheduledAt, now, now],
    );
    const record = await this.executor.get<ReminderRecord>(`${REMINDER_SELECT} where id = ?`, [id]);
    if (!record) throw new Error('O lembrete não foi persistido.');
    return record;
  }

  setScheduled(id: string, notificationIdentifier: string): Promise<unknown> {
    return this.executor.run(
      `update reminders set status = 'scheduled', notification_identifier = ?, updated_at = ?
       where id = ?`,
      [notificationIdentifier, new Date().toISOString(), id],
    );
  }

  setStatus(id: string, status: ReminderStatus): Promise<unknown> {
    return this.executor.run('update reminders set status = ?, updated_at = ? where id = ?', [
      status,
      new Date().toISOString(),
      id,
    ]);
  }

  markDelivered(
    workspaceId: string,
    id: string,
    deliveredAt = new Date().toISOString(),
  ): Promise<unknown> {
    return this.executor.run(
      `update reminders set status = 'delivered', delivered_at = coalesce(delivered_at, ?),
       updated_at = ? where workspace_id = ? and id = ?`,
      [deliveredAt, deliveredAt, workspaceId, id],
    );
  }

  markRead(workspaceId: string, id: string): Promise<unknown> {
    const now = new Date().toISOString();
    return this.executor.run(
      'update reminders set read_at = ?, updated_at = ? where workspace_id = ? and id = ?',
      [now, now, workspaceId, id],
    );
  }

  markAllRead(workspaceId: string): Promise<unknown> {
    const now = new Date().toISOString();
    return this.executor.run(
      `update reminders set read_at = ?, updated_at = ?
       where workspace_id = ? and status = 'delivered' and read_at is null`,
      [now, now, workspaceId],
    );
  }
}
