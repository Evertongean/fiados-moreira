import { mkdtempSync, rmSync } from 'node:fs';
import { join } from 'node:path';
import { tmpdir } from 'node:os';

import { WorkspaceRepository } from '@/database/repositories/workspace.repository';

import { createTestDatabase } from './createTestDatabase';

describe('SQLite migrations and initialization', () => {
  it('creates every table, enables foreign keys and defines important indexes', async () => {
    const database = await createTestDatabase();
    const tables = await database.all<{ name: string }>(
      `select name from sqlite_master where type = 'table' order by name`,
    );
    expect(tables.map(({ name }) => name)).toEqual(
      expect.arrayContaining([
        'workspaces',
        'customers',
        'vehicles',
        'debts',
        'payments',
        'payment_reversals',
        'reminders',
        'settings',
        'sync_queue',
        'audit_logs',
      ]),
    );
    expect(
      (await database.get<{ foreign_keys: number }>('PRAGMA foreign_keys'))?.foreign_keys,
    ).toBe(1);
    const indexes = await database.all<{ name: string }>(
      `select name from sqlite_master where type = 'index'`,
    );
    expect(indexes.map(({ name }) => name)).toEqual(
      expect.arrayContaining([
        'payments_workspace_operation_unique',
        'payment_reversals_workspace_payment_unique',
        'debts_workspace_due_date_idx',
        'reminders_workspace_debt_type_scheduled_unique',
      ]),
    );
    expect(
      (await database.get<{ integrity_check: string }>('PRAGMA integrity_check'))?.integrity_check,
    ).toBe('ok');
    expect(await database.all('PRAGMA foreign_key_check')).toHaveLength(0);
    database.close();
  });

  it('initializes the workspace idempotently', async () => {
    const database = await createTestDatabase();
    const repository = new WorkspaceRepository(database);
    const first = await repository.initializeLocal();
    const second = await repository.initializeLocal();
    expect(second.id).toBe(first.id);
    expect(
      (await database.get<{ count: number }>('select count(*) as count from workspaces'))?.count,
    ).toBe(1);
    database.close();
  });

  it('reopens a persisted database and reapplies migrations safely', async () => {
    const directory = mkdtempSync(join(tmpdir(), 'fiados-moreira-'));
    const path = join(directory, 'test.sqlite');
    const first = await createTestDatabase(path);
    const workspace = await new WorkspaceRepository(first).initializeLocal();
    first.close();
    const reopened = await createTestDatabase(path);
    expect((await new WorkspaceRepository(reopened).getLocal())?.id).toBe(workspace.id);
    reopened.close();
    rmSync(directory, { recursive: true, force: true });
  });

  it('enforces monetary checks and restrictive foreign keys', async () => {
    const database = await createTestDatabase();
    const workspace = await new WorkspaceRepository(database).initializeLocal();
    await expect(
      database.run(
        `insert into payments (id, workspace_id, debt_id, operation_id, amount_cents, payment_method, paid_at)
         values (?, ?, ?, ?, ?, ?, ?)`,
        [
          '00000000-0000-4000-8000-000000000001',
          workspace.id,
          'missing',
          '00000000-0000-4000-8000-000000000002',
          0,
          'cash',
          new Date().toISOString(),
        ],
      ),
    ).rejects.toThrow();
    database.close();
  });
});
