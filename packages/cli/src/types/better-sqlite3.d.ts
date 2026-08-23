declare module 'better-sqlite3' {
  interface DatabaseConstructor {
    new(filename?: string, options?: Record<string, unknown>): Database;
    (filename?: string, options?: Record<string, unknown>): Database;
  }

  interface Database {
    prepare(sql: string): Statement;
    exec(sql: string): void;
    pragma(pragma: string, options?: Record<string, unknown>): unknown;
    transaction<T>(fn: () => T): () => T;
    close(): void;
    name: string;
    open: boolean;
    inTransaction: boolean;
    readonly: boolean;
    memory: boolean;
  }

  interface Statement {
    run(...params: unknown[]): { lastInsertRowid: number | bigint; changes: number };
    get(...params: unknown[]): Record<string, unknown> | undefined;
    all(...params: unknown[]): Record<string, unknown>[];
    columns(): { name: string; column: string | null; table: string | null; database: string | null; type: string | null }[];
  }

  const Database: DatabaseConstructor;
  export default Database;
}
