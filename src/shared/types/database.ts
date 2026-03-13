/** Shared database types used by both main and renderer processes. */

export type DatabaseType = "postgresql" | "mysql" | "sqlite" | "mssql";

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
};

export const DATABASE_TYPE_LABELS: Record<DatabaseType, string> = {
  postgresql: "PostgreSQL",
  mysql: "MySQL / MariaDB",
  sqlite: "SQLite",
  mssql: "SQL Server",
};

export function newConnectionConfig(
  type: DatabaseType,
  partial?: Partial<ConnectionConfig>,
): ConnectionConfig {
  const isSqlite = type === "sqlite";
  return {
    id: "",
    name: "",
    type,
    host: isSqlite ? "" : "localhost",
    port: isSqlite ? 0 : DEFAULT_PORTS[type],
    database: "",
    username: "",
    ssl: false,
    filepath: "",
    connectionTimeout: 15000,
    poolSize: 5,
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
