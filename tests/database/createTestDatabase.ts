import { DatabaseSync } from 'node:sqlite';
import { readFileSync } from 'node:fs';
import { join } from 'node:path';

import { NodeSqlExecutor } from './NodeSqlExecutor';

export async function createTestDatabase(path = ':memory:'): Promise<NodeSqlExecutor> {
  const sqlite = new DatabaseSync(path);
  sqlite.exec('PRAGMA foreign_keys = ON;');
  sqlite.exec(`create table if not exists __drizzle_migrations (
    id integer primary key autoincrement, hash text not null, created_at numeric
  )`);
  const journal = JSON.parse(
    readFileSync(join(process.cwd(), 'drizzle/meta/_journal.json'), 'utf8'),
  ) as { entries: Array<{ tag: string; when: number }> };
  const latest = sqlite
    .prepare(
      'select created_at as createdAt from __drizzle_migrations order by created_at desc limit 1',
    )
    .get() as { createdAt: number } | undefined;
  sqlite.exec('BEGIN');
  try {
    for (const entry of journal.entries) {
      if (!latest || latest.createdAt < entry.when) {
        const migration = readFileSync(join(process.cwd(), 'drizzle', `${entry.tag}.sql`), 'utf8');
        for (const statement of migration.split('--> statement-breakpoint')) {
          if (statement.trim()) sqlite.exec(statement);
        }
        sqlite
          .prepare('insert into __drizzle_migrations (hash, created_at) values (?, ?)')
          .run('', entry.when);
      }
    }
    sqlite.exec('COMMIT');
  } catch (error) {
    sqlite.exec('ROLLBACK');
    sqlite.close();
    throw error;
  }
  return NodeSqlExecutor.fromDatabase(sqlite);
}
