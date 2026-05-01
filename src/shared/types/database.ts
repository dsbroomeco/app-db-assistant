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
  /** Whether to verify the server's SSL/TLS certificate (default: false for self-signed certs) */
  sslRejectUnauthorized: boolean;
  filepath: string;
  connectionTimeout: number;
  poolSize: number;
  /** SSH tunnel configuration (Phase 7) */
  sshEnabled: boolean;
  sshHost: string;
  sshPort: number;
  sshUsername: string;
  sshPrivateKeyPath: string;
  /** "password" or "privateKey" */
  sshAuthMethod: "password" | "privateKey";
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
  sslRejectUnauthorized: boolean;
  filepath: string;
  connectionTimeout: number;
  poolSize: number;
  hasPassword: boolean;
  sshEnabled: boolean;
  sshHost: string;
  sshPort: number;
  sshUsername: string;
  sshPrivateKeyPath: string;
  sshAuthMethod: "password" | "privateKey";
  hasSshPassword: boolean;
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
    sslRejectUnauthorized: false,
    filepath: "",
    connectionTimeout: 15000,
    poolSize: isNoSql ? 1 : 5,
    sshEnabled: false,
    sshHost: "",
    sshPort: 22,
    sshUsername: "",
    sshPrivateKeyPath: "",
    sshAuthMethod: "password",
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
  /** True when the result set was truncated to MAX_RESULT_ROWS */
  truncated?: boolean;
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

// ─── Data import types (Phase 7) ────────────────────────────────

export interface ImportPreviewRequest {
  filePath: string;
  format: "csv" | "json";
  /** Max rows to preview */
  maxRows?: number;
}

export interface ImportPreviewResult {
  columns: string[];
  rows: Record<string, unknown>[];
  totalRows: number;
  detectedTypes: Record<string, string>;
}

export interface ImportExecuteRequest {
  connectionId: string;
  schema: string;
  table: string;
  filePath: string;
  format: "csv" | "json";
  /** Column name → target SQL type mapping */
  columnMapping: Record<string, string>;
  /** Whether to create the table if it doesn't exist */
  createTable: boolean;
  /** Whether to truncate existing data before import */
  truncateFirst: boolean;
}

export interface ImportResult {
  success: boolean;
  rowsImported: number;
  errors: string[];
}

// ─── Schema diff types (Phase 7) ────────────────────────────────

export interface SchemaDiffRequest {
  sourceConnectionId: string;
  sourceSchema: string;
  targetConnectionId: string;
  targetSchema: string;
}

export type DiffStatus = "added" | "removed" | "modified" | "unchanged";

export interface TableDiff {
  tableName: string;
  status: DiffStatus;
  columnDiffs: ColumnDiff[];
  indexDiffs: IndexDiff[];
  constraintDiffs: ConstraintDiff[];
}

export interface ColumnDiff {
  columnName: string;
  status: DiffStatus;
  sourceColumn?: ColumnInfo;
  targetColumn?: ColumnInfo;
}

export interface IndexDiff {
  indexName: string;
  status: DiffStatus;
  sourceIndex?: IndexInfo;
  targetIndex?: IndexInfo;
}

export interface ConstraintDiff {
  constraintName: string;
  status: DiffStatus;
  sourceConstraint?: ConstraintInfo;
  targetConstraint?: ConstraintInfo;
}

export interface SchemaDiffResult {
  tableDiffs: TableDiff[];
  sourceSchema: string;
  targetSchema: string;
}

// ─── Saved queries types (Phase 7) ──────────────────────────────

export interface SavedQuery {
  id: string;
  name: string;
  sql: string;
  /** Optional connection ID to associate with */
  connectionId?: string;
  /** Folder/category for organization */
  folder?: string;
  createdAt: string;
  updatedAt: string;
}

// ─── Keyboard shortcuts types (Phase 7) ─────────────────────────

export interface KeyboardShortcut {
  id: string;
  label: string;
  /** Default key binding (e.g., "Ctrl+Enter") */
  defaultBinding: string;
  /** User-customized key binding, null means use default */
  customBinding: string | null;
}

export const DEFAULT_SHORTCUTS: KeyboardShortcut[] = [
  { id: "query.execute", label: "Execute Query", defaultBinding: "Ctrl+Enter", customBinding: null },
  { id: "query.explain", label: "Explain Query", defaultBinding: "Ctrl+Shift+E", customBinding: null },
  { id: "tab.new", label: "New Query Tab", defaultBinding: "Ctrl+T", customBinding: null },
  { id: "tab.close", label: "Close Tab", defaultBinding: "Ctrl+W", customBinding: null },
  { id: "table.addRow", label: "Add New Row", defaultBinding: "Ctrl+N", customBinding: null },
  { id: "table.deleteRows", label: "Delete Selected Rows", defaultBinding: "Delete", customBinding: null },
  { id: "table.selectAll", label: "Select All Rows", defaultBinding: "Ctrl+A", customBinding: null },
  { id: "table.copy", label: "Copy Selection", defaultBinding: "Ctrl+C", customBinding: null },
  { id: "table.editCell", label: "Edit Cell", defaultBinding: "F2", customBinding: null },
  { id: "editor.save", label: "Save Query", defaultBinding: "Ctrl+S", customBinding: null },
];
