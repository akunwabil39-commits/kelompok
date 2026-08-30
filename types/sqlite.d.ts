declare module 'node:sqlite' {
  export class DatabaseSync {
    constructor(location: string, options?: { open?: boolean; readOnly?: boolean; enableForeignKeyConstraints?: boolean });
    close(): void;
    exec(sql: string): void;
    prepare(sql: string): StatementSync;
  }

  export class StatementSync {
    all(...namedParameters: any[]): any[];
    get(...namedParameters: any[]): any;
    run(...namedParameters: any[]): { changes: number | bigint; lastInsertRowid: number | bigint };
  }
}
