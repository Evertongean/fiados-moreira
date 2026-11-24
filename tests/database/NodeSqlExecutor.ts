import { DatabaseSync } from 'node:sqlite';

import type { SqlExecutor, SqlParams, SqlRunResult } from '@/database/types/executor';

class Queue {
  private tail: Promise<void> = Promise.resolve();

  run<T>(task: () => T | Promise<T>): Promise<T> {
    const result = this.tail.then(task, task);
    this.tail = result.then(
      () => undefined,
      () => undefined,
    );
    return result;
  }
}

class DirectNodeExecutor implements SqlExecutor {
  constructor(private readonly database: DatabaseSync) {}

  async run(sql: string, params: SqlParams = []): Promise<SqlRunResult> {
    const result = this.database.prepare(sql).run(...params);
    return { changes: Number(result.changes), lastInsertRowId: Number(result.lastInsertRowid) };
  }

  async get<T>(sql: string, params: SqlParams = []): Promise<T | null> {
    return (this.database.prepare(sql).get(...params) as T | undefined) ?? null;
  }

  async all<T>(sql: string, params: SqlParams = []): Promise<T[]> {
    return this.database.prepare(sql).all(...params) as T[];
  }

  async exec(sql: string): Promise<void> {
    this.database.exec(sql);
  }

  async transaction<T>(task: (transaction: SqlExecutor) => Promise<T>): Promise<T> {
    return task(this);
  }
}

export class NodeSqlExecutor implements SqlExecutor {
  private readonly queue = new Queue();
  private readonly direct: DirectNodeExecutor;

  constructor(private readonly database: DatabaseSync) {
    this.direct = new DirectNodeExecutor(database);
  }

  static open(path = ':memory:'): NodeSqlExecutor {
    const database = new DatabaseSync(path);
    return NodeSqlExecutor.fromDatabase(database);
  }

  static fromDatabase(database: DatabaseSync): NodeSqlExecutor {
    database.exec(
      'PRAGMA foreign_keys = ON; PRAGMA journal_mode = WAL; PRAGMA busy_timeout = 5000;',
    );
    return new NodeSqlExecutor(database);
  }

  run(sql: string, params?: SqlParams) {
    return this.queue.run(() => this.direct.run(sql, params));
  }

  get<T>(sql: string, params?: SqlParams) {
    return this.queue.run(() => this.direct.get<T>(sql, params));
  }

  all<T>(sql: string, params?: SqlParams) {
    return this.queue.run(() => this.direct.all<T>(sql, params));
  }

  exec(sql: string) {
    return this.queue.run(() => this.direct.exec(sql));
  }

  transaction<T>(task: (transaction: SqlExecutor) => Promise<T>): Promise<T> {
    return this.queue.run(async () => {
      this.database.exec('BEGIN IMMEDIATE');
      try {
        const result = await task(this.direct);
        this.database.exec('COMMIT');
        return result;
      } catch (error) {
        this.database.exec('ROLLBACK');
        throw error;
      }
    });
  }

  close(): void {
    this.database.close();
  }
}
