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

import { customers } from './customers';
import { vehicles } from './vehicles';
import { workspaces } from './workspaces';

export const debts = sqliteTable(
  'debts',
  {
    id: text('id').primaryKey(),
    workspaceId: text('workspace_id')
      .notNull()
      .references(() => workspaces.id, { onDelete: 'restrict', onUpdate: 'cascade' }),
    customerId: text('customer_id').notNull(),
    vehicleId: text('vehicle_id'),
    description: text('description').notNull(),
    totalCents: integer('total_cents').notNull(),
    serviceDate: text('service_date').notNull(),
    dueDate: text('due_date'),
    notes: text('notes'),
    canceledAt: text('canceled_at'),
    cancellationReason: text('cancellation_reason'),
    createdAt: text('created_at')
      .notNull()
      .default(sql`CURRENT_TIMESTAMP`),
    updatedAt: text('updated_at')
      .notNull()
      .default(sql`CURRENT_TIMESTAMP`),
  },
  (table) => [
    foreignKey({
      columns: [table.workspaceId, table.customerId],
      foreignColumns: [customers.workspaceId, customers.id],
      name: 'debts_workspace_customer_fk',
    }).onDelete('restrict'),
    foreignKey({
      columns: [table.workspaceId, table.customerId, table.vehicleId],
      foreignColumns: [vehicles.workspaceId, vehicles.customerId, vehicles.id],
      name: 'debts_workspace_customer_vehicle_fk',
    }).onDelete('restrict'),
    uniqueIndex('debts_workspace_id_unique').on(table.workspaceId, table.id),
    index('debts_workspace_customer_idx').on(table.workspaceId, table.customerId),
    index('debts_workspace_due_date_idx').on(table.workspaceId, table.dueDate),
    index('debts_workspace_service_date_idx').on(table.workspaceId, table.serviceDate),
    index('debts_workspace_canceled_idx').on(table.workspaceId, table.canceledAt),
    index('debts_vehicle_idx').on(table.vehicleId),
    check(
      'debts_total_cents_check',
      sql`${table.totalCents} > 0 and ${table.totalCents} <= ${sql.raw(String(MAX_CURRENCY_CENTS))}`,
    ),
    check(
      'debts_cancellation_check',
      sql`(${table.canceledAt} is null and ${table.cancellationReason} is null) or (${table.canceledAt} is not null and length(trim(${table.cancellationReason})) > 0)`,
    ),
  ],
);

export type DebtRow = typeof debts.$inferSelect;
export type NewDebtRow = typeof debts.$inferInsert;
