import { sql } from 'drizzle-orm';
import { primaryKey, text, sqliteTable } from 'drizzle-orm/sqlite-core';

import { workspaces } from './workspaces';

export const settings = sqliteTable(
  'settings',
  {
    workspaceId: text('workspace_id')
      .notNull()
      .references(() => workspaces.id, { onDelete: 'restrict', onUpdate: 'cascade' }),
    key: text('key').notNull(),
    valueJson: text('value_json').notNull(),
    updatedAt: text('updated_at')
      .notNull()
      .default(sql`CURRENT_TIMESTAMP`),
  },
  (table) => [primaryKey({ columns: [table.workspaceId, table.key] })],
);
