import { sql } from 'drizzle-orm';
import { foreignKey, text, sqliteTable, uniqueIndex } from 'drizzle-orm/sqlite-core';

import { payments } from './payments';
import { workspaces } from './workspaces';

export const paymentReversals = sqliteTable(
  'payment_reversals',
  {
    id: text('id').primaryKey(),
    workspaceId: text('workspace_id')
      .notNull()
      .references(() => workspaces.id, { onDelete: 'restrict', onUpdate: 'cascade' }),
    paymentId: text('payment_id').notNull(),
    operationId: text('operation_id').notNull(),
    reason: text('reason').notNull(),
    reversedAt: text('reversed_at').notNull(),
    createdAt: text('created_at')
      .notNull()
      .default(sql`CURRENT_TIMESTAMP`),
  },
  (table) => [
    foreignKey({
      columns: [table.workspaceId, table.paymentId],
      foreignColumns: [payments.workspaceId, payments.id],
      name: 'payment_reversals_workspace_payment_fk',
    }).onDelete('restrict'),
    uniqueIndex('payment_reversals_workspace_payment_unique').on(
      table.workspaceId,
      table.paymentId,
    ),
    uniqueIndex('payment_reversals_workspace_operation_unique').on(
      table.workspaceId,
      table.operationId,
    ),
  ],
);

export type PaymentReversalRow = typeof paymentReversals.$inferSelect;
export type NewPaymentReversalRow = typeof paymentReversals.$inferInsert;
