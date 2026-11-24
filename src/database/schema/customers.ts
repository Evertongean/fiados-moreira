import { sql } from 'drizzle-orm';
import { index, text, sqliteTable, uniqueIndex } from 'drizzle-orm/sqlite-core';

import { workspaces } from './workspaces';

export const customers = sqliteTable(
  'customers',
  {
    id: text('id').primaryKey(),
    workspaceId: text('workspace_id')
      .notNull()
      .references(() => workspaces.id, { onDelete: 'restrict', onUpdate: 'cascade' }),
    name: text('name').notNull(),
    phone: text('phone'),
    whatsapp: text('whatsapp'),
    address: text('address'),
    notes: text('notes'),
    createdAt: text('created_at')
      .notNull()
      .default(sql`CURRENT_TIMESTAMP`),
    updatedAt: text('updated_at')
      .notNull()
      .default(sql`CURRENT_TIMESTAMP`),
    archivedAt: text('archived_at'),
    deletedAt: text('deleted_at'),
  },
  (table) => [
    uniqueIndex('customers_workspace_id_id_unique').on(table.workspaceId, table.id),
    index('customers_workspace_name_idx').on(table.workspaceId, table.name),
    index('customers_workspace_phone_idx').on(table.workspaceId, table.phone),
    index('customers_workspace_archived_idx').on(table.workspaceId, table.archivedAt),
  ],
);

export type CustomerRow = typeof customers.$inferSelect;
export type NewCustomerRow = typeof customers.$inferInsert;
