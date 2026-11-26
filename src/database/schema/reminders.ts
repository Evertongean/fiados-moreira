import { sql } from 'drizzle-orm';
import { check, foreignKey, index, text, sqliteTable, uniqueIndex } from 'drizzle-orm/sqlite-core';

import { debts } from './debts';
import { workspaces } from './workspaces';

export const reminderTypes = ['before_due', 'due_date', 'overdue', 'custom'] as const;
export const reminderStatuses = [
  'pending',
  'scheduled',
  'delivered',
  'canceled',
  'failed',
] as const;

export const reminders = sqliteTable(
  'reminders',
  {
    id: text('id').primaryKey(),
    workspaceId: text('workspace_id')
      .notNull()
      .references(() => workspaces.id, { onDelete: 'restrict', onUpdate: 'cascade' }),
    debtId: text('debt_id').notNull(),
    type: text('type', { enum: reminderTypes }).notNull(),
    scheduledAt: text('scheduled_at').notNull(),
    status: text('status', { enum: reminderStatuses }).notNull().default('pending'),
    notificationIdentifier: text('notification_identifier'),
    deliveredAt: text('delivered_at'),
    readAt: text('read_at'),
    createdAt: text('created_at')
      .notNull()
      .default(sql`CURRENT_TIMESTAMP`),
    updatedAt: text('updated_at')
      .notNull()
      .default(sql`CURRENT_TIMESTAMP`),
  },
  (table) => [
    foreignKey({
      columns: [table.workspaceId, table.debtId],
      foreignColumns: [debts.workspaceId, debts.id],
      name: 'reminders_workspace_debt_fk',
    }).onDelete('restrict'),
    index('reminders_workspace_status_scheduled_idx').on(
      table.workspaceId,
      table.status,
      table.scheduledAt,
    ),
    uniqueIndex('reminders_workspace_debt_type_scheduled_unique').on(
      table.workspaceId,
      table.debtId,
      table.type,
      table.scheduledAt,
    ),
    check(
      'reminders_type_check',
      sql`${table.type} in ('before_due','due_date','overdue','custom')`,
    ),
    check(
      'reminders_status_check',
      sql`${table.status} in ('pending','scheduled','delivered','canceled','failed')`,
    ),
  ],
);
