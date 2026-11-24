import type { AuditAction, AuditLogRow } from '@/database/schema';
import type { SqlExecutor } from '@/database/types/executor';
import { createUuid } from '@/utils/uuid';

const SELECT = `select id, workspace_id as workspaceId, actor_id as actorId,
  entity_type as entityType, entity_id as entityId, action, operation_id as operationId,
  metadata_json as metadataJson, created_at as createdAt from audit_logs`;

export interface AuditEvent {
  entityType: string;
  entityId: string;
  action: AuditAction;
  operationId?: string | null;
  metadata?: Record<string, string | number | boolean | null>;
}

export class AuditRepository {
  constructor(private readonly executor: SqlExecutor) {}

  async record(workspaceId: string, event: AuditEvent): Promise<AuditLogRow> {
    const id = createUuid();
    await this.executor.run(
      `insert into audit_logs
       (id, workspace_id, entity_type, entity_id, action, operation_id, metadata_json)
       values (?, ?, ?, ?, ?, ?, ?)`,
      [
        id,
        workspaceId,
        event.entityType,
        event.entityId,
        event.action,
        event.operationId ?? null,
        event.metadata ? JSON.stringify(event.metadata) : null,
      ],
    );
    return (await this.executor.get<AuditLogRow>(`${SELECT} where workspace_id = ? and id = ?`, [
      workspaceId,
      id,
    ])) as AuditLogRow;
  }

  listByEntity(workspaceId: string, entityType: string, entityId: string): Promise<AuditLogRow[]> {
    return this.executor.all<AuditLogRow>(
      `${SELECT} where workspace_id = ? and entity_type = ? and entity_id = ? order by created_at`,
      [workspaceId, entityType, entityId],
    );
  }

  findByOperationId(workspaceId: string, operationId: string): Promise<AuditLogRow | null> {
    return this.executor.get<AuditLogRow>(`${SELECT} where workspace_id = ? and operation_id = ?`, [
      workspaceId,
      operationId,
    ]);
  }

  listByPeriod(workspaceId: string, start: string, end: string): Promise<AuditLogRow[]> {
    return this.executor.all<AuditLogRow>(
      `${SELECT} where workspace_id = ? and created_at >= ? and created_at < ? order by created_at`,
      [workspaceId, start, end],
    );
  }
}
