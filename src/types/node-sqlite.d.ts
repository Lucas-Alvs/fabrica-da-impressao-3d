/**
 * Tipagem mínima do módulo `node:sqlite` (SQLite embutido no Node.js 22.5+).
 * Evita a dependência de módulos nativos compilados no deploy.
 */
declare module "node:sqlite" {
  export class DatabaseSync {
    constructor(path: string);
    exec(sql: string): void;
    prepare(sql: string): {
      all: (...params: unknown[]) => Record<string, unknown>[];
      get: (...params: unknown[]) => Record<string, unknown> | undefined;
      run: (...params: unknown[]) => { changes: number | bigint; lastInsertRowid: number | bigint };
    };
    close(): void;
  }
}
