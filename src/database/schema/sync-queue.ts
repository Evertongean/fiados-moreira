import { sql } from 'drizzle-orm';
import { check, index, integer, text, sqliteTable } from 'drizzle-orm/sqlite-core';

import { workspaces } from './workspaces';

export const syncOperations = ['create', 'update', 'delete'] as const;
export const syncStatuses = ['pending', 'processing', 'completed', 'failed'] as const;

export const syncQueue = sqliteTable(
  'sync_queue',
  {
    id: text('id').primaryKey(),
    workspaceId: text('workspace_id')
      .notNull()
      .references(() => workspaces.id, { onDelete: 'restrict', onUpdate: 'cascade' }),
    entityType: text('entity_type').notNull(),
    entityId: text('entity_id').notNull(),
    operation: text('operation', { enum: syncOperations }).notNull(),
    status: text('status', { enum: syncStatuses }).notNull().default('pending'),
    attempts: integer('attempts').notNull().default(0),
    lastErrorCode: text('last_error_code'),
    createdAt: text('created_at')
      .notNull()
      .default(sql`CURRENT_TIMESTAMP`),
    updatedAt: text('updated_at')
      .notNull()
      .default(sql`CURRENT_TIMESTAMP`),
  },
  (table) => [
    index('sync_queue_workspace_status_created_idx').on(
      table.workspaceId,
      table.status,
      table.createdAt,
    ),
    check('sync_queue_attempts_check', sql`${table.attempts} >= 0`),
    check('sync_queue_operation_check', sql`${table.operation} in ('create','update','delete')`),
    check(
      'sync_queue_status_check',
      sql`${table.status} in ('pending','processing','completed','failed')`,
    ),
  ],
);
