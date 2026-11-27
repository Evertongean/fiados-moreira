import { sql } from 'drizzle-orm';
import { check, foreignKey, index, text, sqliteTable } from 'drizzle-orm/sqlite-core';

import { customers } from './customers';
import { debts } from './debts';
import { workspaces } from './workspaces';

export const collectionTemplateTypes = ['before_due', 'due_date', 'overdue', 'no_due'] as const;

export const collectionAttempts = sqliteTable(
  'collection_attempts',
  {
    id: text('id').primaryKey(),
    workspaceId: text('workspace_id')
      .notNull()
      .references(() => workspaces.id, { onDelete: 'restrict', onUpdate: 'cascade' }),
    customerId: text('customer_id').notNull(),
    debtId: text('debt_id'),
    templateType: text('template_type', { enum: collectionTemplateTypes }).notNull(),
    attemptedAt: text('attempted_at').notNull(),
    createdAt: text('created_at')
      .notNull()
      .default(sql`CURRENT_TIMESTAMP`),
  },
  (table) => [
    foreignKey({
      columns: [table.workspaceId, table.customerId],
      foreignColumns: [customers.workspaceId, customers.id],
      name: 'collection_attempts_workspace_customer_fk',
    }).onDelete('restrict'),
    foreignKey({
      columns: [table.workspaceId, table.debtId],
      foreignColumns: [debts.workspaceId, debts.id],
      name: 'collection_attempts_workspace_debt_fk',
    }).onDelete('restrict'),
    index('collection_attempts_workspace_customer_attempted_idx').on(
      table.workspaceId,
      table.customerId,
      table.attemptedAt,
    ),
    index('collection_attempts_workspace_debt_attempted_idx').on(
      table.workspaceId,
      table.debtId,
      table.attemptedAt,
    ),
    check(
      'collection_attempts_template_type_check',
      sql`${table.templateType} in ('before_due','due_date','overdue','no_due')`,
    ),
  ],
);

export type CollectionAttemptRow = typeof collectionAttempts.$inferSelect;
