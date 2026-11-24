import { sql } from 'drizzle-orm';
import { check, index, text, sqliteTable, uniqueIndex } from 'drizzle-orm/sqlite-core';

import { workspaces } from './workspaces';

export const auditActions = [
  'create',
  'update',
  'archive',
  'cancel',
  'payment_registered',
  'payment_reversed',
  'restore',
] as const;
export type AuditAction = (typeof auditActions)[number];

export const auditLogs = sqliteTable(
  'audit_logs',
  {
    id: text('id').primaryKey(),
    workspaceId: text('workspace_id')
      .notNull()
      .references(() => workspaces.id, { onDelete: 'restrict', onUpdate: 'cascade' }),
    actorId: text('actor_id'),
    entityType: text('entity_type').notNull(),
    entityId: text('entity_id').notNull(),
    action: text('action', { enum: auditActions }).notNull(),
    operationId: text('operation_id'),
    metadataJson: text('metadata_json'),
    createdAt: text('created_at')
      .notNull()
      .default(sql`CURRENT_TIMESTAMP`),
  },
  (table) => [
    index('audit_logs_workspace_entity_idx').on(
      table.workspaceId,
      table.entityType,
      table.entityId,
    ),
    index('audit_logs_workspace_created_idx').on(table.workspaceId, table.createdAt),
    uniqueIndex('audit_logs_workspace_operation_unique').on(table.workspaceId, table.operationId),
    check(
      'audit_logs_action_check',
      sql`${table.action} in ('create','update','archive','cancel','payment_registered','payment_reversed','restore')`,
    ),
  ],
);

export type AuditLogRow = typeof auditLogs.$inferSelect;
