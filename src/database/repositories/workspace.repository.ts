import type { WorkspaceRow } from '@/database/schema';
import type { SqlExecutor } from '@/database/types/executor';
import { createUuid } from '@/utils/uuid';

import { INITIAL_WORKSPACE } from '../config';

const WORKSPACE_SELECT = `select id, name, timezone, currency,
  created_at as createdAt, updated_at as updatedAt from workspaces`;

export class WorkspaceRepository {
  constructor(private readonly executor: SqlExecutor) {}

  getLocal(): Promise<WorkspaceRow | null> {
    return this.executor.get<WorkspaceRow>(`${WORKSPACE_SELECT} order by created_at limit 1`);
  }

  initializeLocal(): Promise<WorkspaceRow> {
    return this.executor.transaction(async (transaction) => {
      const repository = new WorkspaceRepository(transaction);
      const current = await repository.getLocal();
      if (current) return current;

      const id = createUuid();
      await transaction.run(
        `insert into workspaces (id, name, timezone, currency) values (?, ?, ?, ?)`,
        [id, INITIAL_WORKSPACE.name, INITIAL_WORKSPACE.timezone, INITIAL_WORKSPACE.currency],
      );
      const created = await transaction.get<WorkspaceRow>(`${WORKSPACE_SELECT} where id = ?`, [id]);
      if (!created) throw new Error('Workspace initialization did not persist a record.');
      return created;
    });
  }

  async update(
    id: string,
    input: Partial<Pick<WorkspaceRow, 'name' | 'timezone'>>,
  ): Promise<WorkspaceRow> {
    const current = await this.executor.get<WorkspaceRow>(`${WORKSPACE_SELECT} where id = ?`, [id]);
    if (!current) throw new Error('Workspace not found.');
    await this.executor.run(
      `update workspaces set name = ?, timezone = ?, updated_at = ? where id = ?`,
      [
        input.name ?? current.name,
        input.timezone ?? current.timezone,
        new Date().toISOString(),
        id,
      ],
    );
    return { ...current, ...input, updatedAt: new Date().toISOString() };
  }
}
