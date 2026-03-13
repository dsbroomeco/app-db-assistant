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
} from "../shared/types/database";

export interface DatabaseDriver {
  /** Establish a connection (or pool) using the given config and password. */
  connect(config: ConnectionConfig, password?: string): Promise<void>;
  /** Close the connection/pool gracefully. */
  disconnect(): Promise<void>;
  /** Verify the connection is alive. Throws on failure. */
  ping(): Promise<void>;
  /** Whether a connection is currently active. */
  isConnected(): boolean;

  // ─── Schema introspection (Phase 3) ──────────────────────────
  /** List schemas/databases available on this connection. */
  getSchemas(): Promise<SchemaInfo[]>;
  /** List tables and views within a schema. */
  getTables(schema: string): Promise<TableInfo[]>;
  /** Get column, index, and constraint info for a table. */
  getTableStructure(schema: string, table: string): Promise<TableStructure>;
  /** List functions and stored procedures. */
  getRoutines(schema: string): Promise<RoutineInfo[]>;
  /** Fetch paginated table data. */
  getTableData(
    schema: string,
    table: string,
    page: number,
    pageSize: number,
  ): Promise<QueryResult>;

  // ─── Query execution (Phase 4) ───────────────────────────────
  /** Execute an arbitrary SQL query and return results. */
  executeQuery(sql: string): Promise<ExecuteQueryResult>;
  /** Execute EXPLAIN/ANALYZE on a query and return the plan. */
  explainQuery(sql: string): Promise<string>;
  /** Get table and column names for autocomplete. */
  getCompletionItems(): Promise<{ tables: string[]; columns: string[] }>;

  // ─── CRUD operations (Phase 5) ───────────────────────────────
  /** Get primary key column names for a table. */
  getPrimaryKeyColumns(schema: string, table: string): Promise<string[]>;
  /** Insert a new row into a table. Values are parameterized. */
  insertRow(
    schema: string,
    table: string,
    row: Record<string, unknown>,
  ): Promise<CrudResult>;
  /** Update a single row identified by primary key. Values are parameterized. */
  updateRow(
    schema: string,
    table: string,
    primaryKey: Record<string, unknown>,
    changes: Record<string, unknown>,
  ): Promise<CrudResult>;
  /** Delete rows identified by primary keys. Values are parameterized. */
  deleteRows(
    schema: string,
    table: string,
    primaryKeys: Record<string, unknown>[],
  ): Promise<CrudResult>;
}
