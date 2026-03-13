/** Common interface for all database drivers. */

import type {
  ConnectionConfig,
  SchemaInfo,
  TableInfo,
  TableStructure,
  RoutineInfo,
  QueryResult,
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
}
