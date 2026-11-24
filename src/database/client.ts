import { drizzle, type ExpoSQLiteDatabase } from 'drizzle-orm/expo-sqlite';
import { migrate } from 'drizzle-orm/expo-sqlite/migrator';
import { openDatabaseAsync, type SQLiteDatabase } from 'expo-sqlite';

import migrations from '../../drizzle/migrations';
import { DATABASE_BUSY_TIMEOUT_MS, DATABASE_NAME } from './config';
import { AppDatabaseError } from './errors/DatabaseError';
import { ExpoSqlExecutor } from './executor';
import { WorkspaceRepository } from './repositories/workspace.repository';
import * as schema from './schema';
import type { WorkspaceRow } from './schema';

export type AppDrizzleDatabase = ExpoSQLiteDatabase<typeof schema>;

export interface DatabaseEnvironment {
  sqlite: SQLiteDatabase;
  drizzle: AppDrizzleDatabase;
  executor: ExpoSqlExecutor;
  workspace: WorkspaceRow;
}

let environmentPromise: Promise<DatabaseEnvironment> | null = null;

async function configure(database: SQLiteDatabase): Promise<void> {
  await database.execAsync(`
    PRAGMA foreign_keys = ON;
    PRAGMA journal_mode = WAL;
    PRAGMA synchronous = FULL;
    PRAGMA busy_timeout = ${DATABASE_BUSY_TIMEOUT_MS};
  `);
}

async function createEnvironment(): Promise<DatabaseEnvironment> {
  let sqlite: SQLiteDatabase | null = null;
  try {
    sqlite = await openDatabaseAsync(DATABASE_NAME);
    await configure(sqlite);
    const drizzleDatabase = drizzle(sqlite, { schema });
    try {
      await migrate(drizzleDatabase, migrations);
    } catch (error) {
      throw new AppDatabaseError('MIGRATION_FAILED', 'Não foi possível atualizar o banco local.', {
        cause: error,
      });
    }
    const executor = new ExpoSqlExecutor(sqlite);
    const workspace = await new WorkspaceRepository(executor).initializeLocal();
    return { sqlite, drizzle: drizzleDatabase, executor, workspace };
  } catch (error) {
    if (sqlite) await sqlite.closeAsync().catch(() => undefined);
    if (error instanceof AppDatabaseError) throw error;
    throw new AppDatabaseError(
      'DATABASE_INITIALIZATION_FAILED',
      'Não foi possível preparar o banco local.',
      { cause: error },
    );
  }
}

export function initializeDatabase(): Promise<DatabaseEnvironment> {
  environmentPromise ??= createEnvironment().catch((error: unknown) => {
    environmentPromise = null;
    throw error;
  });
  return environmentPromise;
}

export function resetDatabaseInitializationForRetry(): void {
  environmentPromise = null;
}
