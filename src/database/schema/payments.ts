import { sql } from 'drizzle-orm';
import {
  check,
  foreignKey,
  index,
  integer,
  text,
  sqliteTable,
  uniqueIndex,
} from 'drizzle-orm/sqlite-core';

import { MAX_CURRENCY_CENTS } from '@/utils/currency';

import { debts } from './debts';
import { workspaces } from './workspaces';

export const paymentMethods = [
  'cash',
  'pix',
  'debit_card',
  'credit_card',
  'bank_transfer',
  'other',
] as const;
export type PaymentMethod = (typeof paymentMethods)[number];

export const payments = sqliteTable(
  'payments',
  {
    id: text('id').primaryKey(),
    workspaceId: text('workspace_id')
      .notNull()
      .references(() => workspaces.id, { onDelete: 'restrict', onUpdate: 'cascade' }),
    debtId: text('debt_id').notNull(),
    operationId: text('operation_id').notNull(),
    amountCents: integer('amount_cents').notNull(),
    paymentMethod: text('payment_method', { enum: paymentMethods }).notNull(),
    paidAt: text('paid_at').notNull(),
    notes: text('notes'),
    createdAt: text('created_at')
      .notNull()
      .default(sql`CURRENT_TIMESTAMP`),
  },
  (table) => [
    foreignKey({
      columns: [table.workspaceId, table.debtId],
      foreignColumns: [debts.workspaceId, debts.id],
      name: 'payments_workspace_debt_fk',
    }).onDelete('restrict'),
    uniqueIndex('payments_workspace_id_unique').on(table.workspaceId, table.id),
    uniqueIndex('payments_workspace_operation_unique').on(table.workspaceId, table.operationId),
    index('payments_workspace_debt_idx').on(table.workspaceId, table.debtId),
    index('payments_workspace_paid_at_idx').on(table.workspaceId, table.paidAt),
    check(
      'payments_amount_cents_check',
      sql`${table.amountCents} > 0 and ${table.amountCents} <= ${sql.raw(String(MAX_CURRENCY_CENTS))}`,
    ),
    check(
      'payments_method_check',
      sql`${table.paymentMethod} in ('cash','pix','debit_card','credit_card','bank_transfer','other')`,
    ),
  ],
);

export type PaymentRow = typeof payments.$inferSelect;
export type NewPaymentRow = typeof payments.$inferInsert;
