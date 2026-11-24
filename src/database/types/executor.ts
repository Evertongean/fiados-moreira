export type SqlValue = string | number | null | Uint8Array;
export type SqlParams = readonly SqlValue[];

export interface SqlRunResult {
  changes: number;
  lastInsertRowId: number;
}

export interface SqlExecutor {
  run(sql: string, params?: SqlParams): Promise<SqlRunResult>;
  get<T>(sql: string, params?: SqlParams): Promise<T | null>;
  all<T>(sql: string, params?: SqlParams): Promise<T[]>;
  exec(sql: string): Promise<void>;
  transaction<T>(task: (transaction: SqlExecutor) => Promise<T>): Promise<T>;
}
