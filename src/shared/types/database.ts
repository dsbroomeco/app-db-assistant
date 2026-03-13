/** Shared database types used by both main and renderer processes. */

export type DatabaseType = "postgresql" | "mysql" | "sqlite" | "mssql" | "mongodb" | "redis";

export type SqlDatabaseType = "postgresql" | "mysql" | "sqlite" | "mssql";
export type NoSqlDatabaseType = "mongodb" | "redis";

export function isSqlType(type: DatabaseType): type is SqlDatabaseType {
  return type === "postgresql" || type === "mysql" || type === "sqlite" || type === "mssql";
}

export function isNoSqlType(type: DatabaseType): type is NoSqlDatabaseType {
  return type === "mongodb" || type === "redis";
}

export interface ConnectionConfig {
  id: string;
  name: string;
  type: DatabaseType;
  host: string;
  port: number;
  database: string;
  username: string;
  ssl: boolean;
  filepath: string;
  connectionTimeout: number;
  poolSize: number;
}

/** Connection info returned to renderer (never includes password). */
export interface SavedConnection {
  id: string;
  name: string;
  type: DatabaseType;
  host: string;
  port: number;
  database: string;
  username: string;
  ssl: boolean;
  filepath: string;
  connectionTimeout: number;
  poolSize: number;
  hasPassword: boolean;
}

export interface ConnectionStatus {
  id: string;
  connected: boolean;
}

export interface TestConnectionResult {
  success: boolean;
  message: string;
}

export const DEFAULT_PORTS: Record<Exclude<DatabaseType, "sqlite">, number> = {
  postgresql: 5432,
  mysql: 3306,
  mssql: 1433,
  mongodb: 27017,
  redis: 6379,
};

export const DATABASE_TYPE_LABELS: Record<DatabaseType, string> = {
  postgresql: "PostgreSQL",
  mysql: "MySQL / MariaDB",
  sqlite: "SQLite",
  mssql: "SQL Server",
  mongodb: "MongoDB",
  redis: "Redis",
};

export function newConnectionConfig(
  type: DatabaseType,
  partial?: Partial<ConnectionConfig>,
): ConnectionConfig {
  const isSqlite = type === "sqlite";
  const isNoSql = type === "mongodb" || type === "redis";
  return {
    id: "",
    name: "",
    type,
    host: isSqlite ? "" : "localhost",
    port: isSqlite ? 0 : DEFAULT_PORTS[type],
    database: isNoSql ? "" : "",
    username: type === "redis" ? "" : "",
    ssl: false,
    filepath: "",
    connectionTimeout: 15000,
    poolSize: isNoSql ? 1 : 5,
    ...partial,
  };
}

// ─── Schema browsing types (Phase 3) ─────────────────────────────

export interface SchemaInfo {
  name: string;
}

export interface TableInfo {
  name: string;
  schema: string;
  type: "table" | "view";
}

export interface ColumnInfo {
  name: string;
  dataType: string;
  nullable: boolean;
  defaultValue: string | null;
  isPrimaryKey: boolean;
  ordinalPosition: number;
}

export interface IndexInfo {
  name: string;
  columns: string[];
  unique: boolean;
  primary: boolean;
}

export interface ConstraintInfo {
  name: string;
  type: "PRIMARY KEY" | "FOREIGN KEY" | "UNIQUE" | "CHECK";
  columns: string[];
  referencedTable?: string;
  referencedColumns?: string[];
}

export interface RoutineInfo {
  name: string;
  schema: string;
  type: "function" | "procedure";
}

export interface TableStructure {
  columns: ColumnInfo[];
  indexes: IndexInfo[];
  constraints: ConstraintInfo[];
}

export interface QueryResult {
  columns: string[];
  rows: Record<string, unknown>[];
  totalRows: number;
  page: number;
  pageSize: number;
  hasMore: boolean;
}

// ─── Query execution types (Phase 4) ────────────────────────────

export interface ExecuteQueryRequest {
  connectionId: string;
  sql: string;
}

export interface ExecuteQueryResult {
  columns: string[];
  rows: Record<string, unknown>[];
  rowCount: number;
  /** Time in milliseconds the query took to execute */
  executionTime: number;
  /** Whether the query was a data modification (INSERT/UPDATE/DELETE) vs a SELECT */
  isModification: boolean;
  /** Number of rows affected for modification queries */
  affectedRows?: number;
}

export interface ExplainQueryRequest {
  connectionId: string;
  sql: string;
}

export interface ExplainQueryResult {
  plan: string;
  executionTime: number;
}

export interface QueryHistoryEntry {
  id: string;
  connectionId: string;
  connectionName: string;
  sql: string;
  executedAt: string;
  executionTime: number;
  rowCount: number;
  error?: string;
}

export type ExportFormat = "csv" | "json" | "sql";

// ─── CRUD operation types (Phase 5) ─────────────────────────────

export interface InsertRowRequest {
  connectionId: string;
  schema: string;
  table: string;
  row: Record<string, unknown>;
}

export interface UpdateRowRequest {
  connectionId: string;
  schema: string;
  table: string;
  /** Primary key column-value pairs identifying the row */
  primaryKey: Record<string, unknown>;
  /** Column-value pairs to update */
  changes: Record<string, unknown>;
}

export interface DeleteRowsRequest {
  connectionId: string;
  schema: string;
  table: string;
  /** Array of primary key column-value pairs, one per row to delete */
  primaryKeys: Record<string, unknown>[];
}

export interface CrudResult {
  success: boolean;
  affectedRows: number;
  message?: string;
}

// ─── MongoDB types (Phase 6) ────────────────────────────────────

export interface MongoCollectionInfo {
  name: string;
  type: "collection" | "view";
  count: number;
}

export interface MongoDocument {
  _id: string;
  [key: string]: unknown;
}

export interface MongoFindRequest {
  connectionId: string;
  database: string;
  collection: string;
  filter: string;
  page: number;
  pageSize: number;
  sort?: string;
}

export interface MongoFindResult {
  documents: MongoDocument[];
  totalCount: number;
  page: number;
  pageSize: number;
  hasMore: boolean;
}

export interface MongoInsertRequest {
  connectionId: string;
  database: string;
  collection: string;
  document: string;
}

export interface MongoUpdateRequest {
  connectionId: string;
  database: string;
  collection: string;
  documentId: string;
  update: string;
}

export interface MongoDeleteRequest {
  connectionId: string;
  database: string;
  collection: string;
  documentIds: string[];
}

export interface MongoAggregateRequest {
  connectionId: string;
  database: string;
  collection: string;
  pipeline: string;
}

// ─── Redis types (Phase 6) ──────────────────────────────────────

export type RedisValueType = "string" | "list" | "set" | "zset" | "hash" | "stream" | "unknown";

export interface RedisKeyInfo {
  key: string;
  type: RedisValueType;
  ttl: number;
}

export interface RedisScanRequest {
  connectionId: string;
  pattern: string;
  cursor: string;
  count: number;
}

export interface RedisScanResult {
  keys: RedisKeyInfo[];
  cursor: string;
  hasMore: boolean;
}

export interface RedisGetRequest {
  connectionId: string;
  key: string;
}

export interface RedisGetResult {
  key: string;
  type: RedisValueType;
  value: unknown;
  ttl: number;
}

export interface RedisSetRequest {
  connectionId: string;
  key: string;
  value: string;
  ttl?: number;
}

export interface RedisDeleteRequest {
  connectionId: string;
  keys: string[];
}

export interface RedisCommandRequest {
  connectionId: string;
  command: string;
}

export interface RedisCommandResult {
  result: unknown;
  executionTime: number;
}
