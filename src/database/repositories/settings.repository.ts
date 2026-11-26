import type { SqlExecutor } from '@/database/types/executor';

export class SettingsRepository {
  constructor(private readonly executor: SqlExecutor) {}

  async get<T>(workspaceId: string, key: string): Promise<T | null> {
    const row = await this.executor.get<{ valueJson: string }>(
      'select value_json as valueJson from settings where workspace_id = ? and key = ?',
      [workspaceId, key],
    );
    if (!row) return null;
    try {
      return JSON.parse(row.valueJson) as T;
    } catch {
      return null;
    }
  }

  set<T>(workspaceId: string, key: string, value: T): Promise<unknown> {
    const now = new Date().toISOString();
    return this.executor.run(
      `insert into settings (workspace_id, key, value_json, updated_at) values (?, ?, ?, ?)
       on conflict (workspace_id, key) do update set value_json = excluded.value_json,
       updated_at = excluded.updated_at`,
      [workspaceId, key, JSON.stringify(value), now],
    );
  }
}
