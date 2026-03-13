/** Common interface for all database drivers. */

import type {
  ConnectionConfig,
  SchemaInfo,
  TableInfo,
  TableStructure,
  RoutineInfo,
  QueryResult,
  ExecuteQueryResult,
  CrudResult,
  MongoCollectionInfo,
  MongoDocument,
  MongoFindResult,
  RedisKeyInfo,
  RedisScanResult,
  RedisGetResult,
  RedisCommandResult,
  RedisValueType,
} from "../shared/types/database";

/** Base interface shared by all driver types. */
export interface BaseDriver {
  connect(config: ConnectionConfig, password?: string): Promise<void>;
  disconnect(): Promise<void>;
  ping(): Promise<void>;
  isConnected(): boolean;
}

export interface DatabaseDriver extends BaseDriver {
  /** Escape a SQL identifier (schema, table, column name) for safe interpolation. */
  escapeIdentifier(name: string): string;

  // ─── Schema introspection (Phase 3) ──────────────────────────
  getSchemas(): Promise<SchemaInfo[]>;
  getTables(schema: string): Promise<TableInfo[]>;
  getTableStructure(schema: string, table: string): Promise<TableStructure>;
  getRoutines(schema: string): Promise<RoutineInfo[]>;
  getTableData(
    schema: string,
    table: string,
    page: number,
    pageSize: number,
  ): Promise<QueryResult>;

  // ─── Query execution (Phase 4) ───────────────────────────────
  executeQuery(sql: string): Promise<ExecuteQueryResult>;
  explainQuery(sql: string): Promise<string>;
  getCompletionItems(): Promise<{ tables: string[]; columns: string[] }>;

  // ─── CRUD operations (Phase 5) ───────────────────────────────
  getPrimaryKeyColumns(schema: string, table: string): Promise<string[]>;
  insertRow(
    schema: string,
    table: string,
    row: Record<string, unknown>,
  ): Promise<CrudResult>;
  updateRow(
    schema: string,
    table: string,
    primaryKey: Record<string, unknown>,
    changes: Record<string, unknown>,
  ): Promise<CrudResult>;
  deleteRows(
    schema: string,
    table: string,
    primaryKeys: Record<string, unknown>[],
  ): Promise<CrudResult>;
}

// ─── MongoDB driver interface (Phase 6) ─────────────────────────

export interface MongoDBDriver extends BaseDriver {
  listDatabases(): Promise<string[]>;
  listCollections(database: string): Promise<MongoCollectionInfo[]>;
  findDocuments(
    database: string,
    collection: string,
    filter: Record<string, unknown>,
    page: number,
    pageSize: number,
    sort?: Record<string, 1 | -1>,
  ): Promise<MongoFindResult>;
  insertDocument(
    database: string,
    collection: string,
    document: Record<string, unknown>,
  ): Promise<CrudResult>;
  updateDocument(
    database: string,
    collection: string,
    documentId: string,
    update: Record<string, unknown>,
  ): Promise<CrudResult>;
  deleteDocuments(
    database: string,
    collection: string,
    documentIds: string[],
  ): Promise<CrudResult>;
  aggregate(
    database: string,
    collection: string,
    pipeline: Record<string, unknown>[],
  ): Promise<MongoDocument[]>;
}

// ─── Redis driver interface (Phase 6) ───────────────────────────

export interface RedisDriver extends BaseDriver {
  scanKeys(
    pattern: string,
    cursor: string,
    count: number,
  ): Promise<RedisScanResult>;
  getKeyValue(key: string): Promise<RedisGetResult>;
  setKeyValue(key: string, value: string, ttl?: number): Promise<CrudResult>;
  deleteKeys(keys: string[]): Promise<CrudResult>;
  executeCommand(command: string): Promise<RedisCommandResult>;
  getKeyType(key: string): Promise<RedisValueType>;
  getKeyTtl(key: string): Promise<number>;
}
