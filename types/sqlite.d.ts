declare module 'node:sqlite' {
  export class DatabaseSync {
    constructor(location: string, options?: { open?: boolean; readOnly?: boolean; enableForeignKeyConstraints?: boolean });
    close(): void;
    exec(sql: string): void;
    prepare(sql: string): StatementSync;
  }

  export class StatementSync {
    all(...namedParameters: unknown[]): Record<string, unknown>[];
    get(...namedParameters: unknown[]): Record<string, unknown> | undefined;
    run(...namedParameters: unknown[]): { changes: number | bigint; lastInsertRowid: number | bigint };
  }
}
