import type { SQLiteDatabase } from 'expo-sqlite';

import { AppDatabaseError } from './errors/DatabaseError';
import type { SqlExecutor, SqlParams, SqlRunResult } from './types/executor';

class SerialQueue {
  private tail: Promise<void> = Promise.resolve();

  run<T>(task: () => Promise<T>): Promise<T> {
    const result = this.tail.then(task, task);
    this.tail = result.then(
      () => undefined,
      () => undefined,
    );
    return result;
  }
}

class DirectExpoExecutor implements SqlExecutor {
  constructor(private readonly database: SQLiteDatabase) {}

  async run(sql: string, params: SqlParams = []): Promise<SqlRunResult> {
    const result = await this.database.runAsync(sql, [...params]);
    return { changes: result.changes, lastInsertRowId: result.lastInsertRowId };
  }

  async get<T>(sql: string, params: SqlParams = []): Promise<T | null> {
    return (await this.database.getFirstAsync<T>(sql, [...params])) ?? null;
  }

  all<T>(sql: string, params: SqlParams = []): Promise<T[]> {
    return this.database.getAllAsync<T>(sql, [...params]);
  }

  exec(sql: string): Promise<void> {
    return this.database.execAsync(sql);
  }

  async transaction<T>(task: (transaction: SqlExecutor) => Promise<T>): Promise<T> {
    return task(this);
  }
}

export class ExpoSqlExecutor implements SqlExecutor {
  private readonly queue = new SerialQueue();
  private readonly direct: DirectExpoExecutor;

  constructor(database: SQLiteDatabase) {
    this.direct = new DirectExpoExecutor(database);
  }

  run(sql: string, params?: SqlParams): Promise<SqlRunResult> {
    return this.queue.run(() => this.direct.run(sql, params));
  }

  get<T>(sql: string, params?: SqlParams): Promise<T | null> {
    return this.queue.run(() => this.direct.get<T>(sql, params));
  }

  all<T>(sql: string, params?: SqlParams): Promise<T[]> {
    return this.queue.run(() => this.direct.all<T>(sql, params));
  }

  exec(sql: string): Promise<void> {
    return this.queue.run(() => this.direct.exec(sql));
  }

  transaction<T>(task: (transaction: SqlExecutor) => Promise<T>): Promise<T> {
    return this.queue.run(async () => {
      await this.direct.exec('BEGIN IMMEDIATE');
      try {
        const result = await task(this.direct);
        await this.direct.exec('COMMIT');
        return result;
      } catch (error) {
        try {
          await this.direct.exec('ROLLBACK');
        } catch {
          throw new AppDatabaseError(
            'TRANSACTION_FAILED',
            'A transação falhou e não foi possível confirmar a reversão.',
            { cause: error },
          );
        }
        throw error;
      }
    });
  }
}
