import mysql from "mysql2/promise";
import type { Pool, FieldPacket } from "mysql2/promise";
import type { ConnectionConfig } from "../../shared/types/database";
import { escapeMysqlId } from "../sanitize";
import type {
  SchemaInfo,
  TableInfo,
  TableStructure,
  RoutineInfo,
  QueryResult,
  ExecuteQueryResult,
  CrudResult,
} from "../../shared/types/database";
import type { DatabaseDriver } from "../types";

export class MySQLDriver implements DatabaseDriver {
  private pool: Pool | null = null;
  private database = "";

  escapeIdentifier(name: string): string {
    return escapeMysqlId(name);
  }

  async connect(config: ConnectionConfig, password?: string): Promise<void> {
    this.database = config.database;
    this.pool = mysql.createPool({
      host: config.host,
      port: config.port,
      database: config.database,
      user: config.username,
      password: password ?? "",
      ssl: config.ssl ? { rejectUnauthorized: config.sslRejectUnauthorized } : undefined,
      connectionLimit: config.poolSize,
      connectTimeout: config.connectionTimeout,
      waitForConnections: true,
    });

    // Verify the connection works
    const conn = await this.pool.getConnection();
    conn.release();
  }

  async disconnect(): Promise<void> {
    if (this.pool) {
      await this.pool.end();
      this.pool = null;
    }
  }

  async ping(): Promise<void> {
    if (!this.pool) throw new Error("Not connected");
    const conn = await this.pool.getConnection();
    try {
      await conn.ping();
    } finally {
      conn.release();
    }
  }

  isConnected(): boolean {
    return this.pool !== null;
  }

  private ensurePool(): Pool {
    if (!this.pool) throw new Error("Not connected");
    return this.pool;
  }

  async getSchemas(): Promise<SchemaInfo[]> {
    const pool = this.ensurePool();
    const [rows] = await pool.query(
      `SELECT SCHEMA_NAME AS name FROM information_schema.SCHEMATA
       WHERE SCHEMA_NAME NOT IN ('information_schema', 'performance_schema', 'mysql', 'sys')
       ORDER BY SCHEMA_NAME`,
    );
    return rows as SchemaInfo[];
  }

  async getTables(schema: string): Promise<TableInfo[]> {
    const pool = this.ensurePool();
    const [rows] = await pool.query(
      `SELECT TABLE_NAME AS name, TABLE_SCHEMA AS \`schema\`,
              CASE WHEN TABLE_TYPE = 'VIEW' THEN 'view' ELSE 'table' END AS type
       FROM information_schema.TABLES
       WHERE TABLE_SCHEMA = ?
       ORDER BY TABLE_TYPE, TABLE_NAME`,
      [schema],
    );
    return rows as TableInfo[];
  }

  async getTableStructure(
    schema: string,
    table: string,
  ): Promise<TableStructure> {
    const pool = this.ensurePool();

    const [colRows] = await pool.query(
      `SELECT COLUMN_NAME AS name, COLUMN_TYPE AS dataType,
              (IS_NULLABLE = 'YES') AS nullable,
              COLUMN_DEFAULT AS defaultValue,
              ORDINAL_POSITION AS ordinalPosition,
              (COLUMN_KEY = 'PRI') AS isPrimaryKey
       FROM information_schema.COLUMNS
       WHERE TABLE_SCHEMA = ? AND TABLE_NAME = ?
       ORDER BY ORDINAL_POSITION`,
      [schema, table],
    );

    const [idxRows] = await pool.query(
      `SELECT INDEX_NAME AS name,
              GROUP_CONCAT(COLUMN_NAME ORDER BY SEQ_IN_INDEX) AS columnList,
              NOT NON_UNIQUE AS \`unique\`,
              (INDEX_NAME = 'PRIMARY') AS \`primary\`
       FROM information_schema.STATISTICS
       WHERE TABLE_SCHEMA = ? AND TABLE_NAME = ?
       GROUP BY INDEX_NAME, NON_UNIQUE
       ORDER BY INDEX_NAME`,
      [schema, table],
    );

    const [conRows] = await pool.query(
      `SELECT tc.CONSTRAINT_NAME AS name,
              tc.CONSTRAINT_TYPE AS type,
              GROUP_CONCAT(DISTINCT kcu.COLUMN_NAME) AS columnList,
              kcu.REFERENCED_TABLE_NAME AS referencedTable,
              GROUP_CONCAT(DISTINCT kcu.REFERENCED_COLUMN_NAME) AS refColumnList
       FROM information_schema.TABLE_CONSTRAINTS tc
       JOIN information_schema.KEY_COLUMN_USAGE kcu
         ON tc.CONSTRAINT_NAME = kcu.CONSTRAINT_NAME
         AND tc.TABLE_SCHEMA = kcu.TABLE_SCHEMA
         AND tc.TABLE_NAME = kcu.TABLE_NAME
       WHERE tc.TABLE_SCHEMA = ? AND tc.TABLE_NAME = ?
       GROUP BY tc.CONSTRAINT_NAME, tc.CONSTRAINT_TYPE, kcu.REFERENCED_TABLE_NAME
       ORDER BY tc.CONSTRAINT_NAME`,
      [schema, table],
    );

    return {
      columns: (colRows as Record<string, unknown>[]).map((r) => ({
        name: r.name as string,
        dataType: r.dataType as string,
        nullable: Boolean(r.nullable),
        defaultValue: (r.defaultValue as string) ?? null,
        isPrimaryKey: Boolean(r.isPrimaryKey),
        ordinalPosition: r.ordinalPosition as number,
      })),
      indexes: (idxRows as Record<string, unknown>[]).map((r) => ({
        name: r.name as string,
        columns: (r.columnList as string).split(","),
        unique: Boolean(r.unique),
        primary: Boolean(r.primary),
      })),
      constraints: (conRows as Record<string, unknown>[]).map((r) => ({
        name: r.name as string,
        type: r.type as "PRIMARY KEY" | "FOREIGN KEY" | "UNIQUE" | "CHECK",
        columns: (r.columnList as string).split(","),
        referencedTable: (r.referencedTable as string) ?? undefined,
        referencedColumns: r.refColumnList
          ? (r.refColumnList as string).split(",")
          : undefined,
      })),
    };
  }

  async getRoutines(schema: string): Promise<RoutineInfo[]> {
    const pool = this.ensurePool();
    const [rows] = await pool.query(
      `SELECT ROUTINE_NAME AS name, ROUTINE_SCHEMA AS \`schema\`,
              LOWER(ROUTINE_TYPE) AS type
       FROM information_schema.ROUTINES
       WHERE ROUTINE_SCHEMA = ?
       ORDER BY ROUTINE_TYPE, ROUTINE_NAME`,
      [schema],
    );
    return rows as RoutineInfo[];
  }

  async getTableData(
    schema: string,
    table: string,
    page: number,
    pageSize: number,
  ): Promise<QueryResult> {
    const pool = this.ensurePool();
    const offset = page * pageSize;

    const sSchema = escapeMysqlId(schema);
    const sTable = escapeMysqlId(table);

    // Use information_schema statistics for a fast row-count estimate; fall
    // back to COUNT(*) only when the estimate is NULL (e.g. InnoDB on very
    // small tables or after a fresh CREATE TABLE).
    const [estRows] = await pool.query(
      `SELECT TABLE_ROWS AS estimate
       FROM information_schema.TABLES
       WHERE TABLE_SCHEMA = ? AND TABLE_NAME = ?`,
      [schema, table],
    );
    let totalRows: number;
    const estimate = (estRows as Record<string, number | null>[])[0]?.estimate;
    if (estimate != null) {
      totalRows = Number(estimate);
    } else {
      const [countRows] = await pool.query(
        `SELECT COUNT(*) AS total FROM ${sSchema}.${sTable}`,
      );
      totalRows = (countRows as Record<string, number>[])[0].total;
    }

    const [dataRows, fields] = await pool.query(
      `SELECT * FROM ${sSchema}.${sTable} LIMIT ? OFFSET ?`,
      [pageSize, offset],
    );

    return {
      columns: (fields as FieldPacket[]).map((f) => f.name),
      rows: dataRows as Record<string, unknown>[],
      totalRows,
      page,
      pageSize,
      hasMore: offset + pageSize < totalRows,
    };
  }

  // ─── Query execution (Phase 4) ───────────────────────────────

  async executeQuery(sql: string): Promise<ExecuteQueryResult> {
    const pool = this.ensurePool();
    const start = performance.now();
    const [rows, fields] = await pool.query(sql);
    const executionTime = Math.round(performance.now() - start);

    const isModification = /^\s*(INSERT|UPDATE|DELETE|CREATE|ALTER|DROP|TRUNCATE)/i.test(sql);

    if (isModification) {
      const result = rows as mysql.ResultSetHeader;
      return {
        columns: [],
        rows: [],
        rowCount: 0,
        executionTime,
        isModification: true,
        affectedRows: result.affectedRows ?? 0,
      };
    }

    return {
      columns: (fields as FieldPacket[])?.map((f) => f.name) ?? [],
      rows: rows as Record<string, unknown>[],
      rowCount: (rows as Record<string, unknown>[]).length,
      executionTime,
      isModification: false,
    };
  }

  async explainQuery(sql: string): Promise<string> {
    const pool = this.ensurePool();
    const [rows] = await pool.query(`EXPLAIN ${sql}`);
    return JSON.stringify(rows, null, 2);
  }

  async getCompletionItems(): Promise<{ tables: string[]; columns: string[] }> {
    const pool = this.ensurePool();
    const [tables] = await pool.query(
      `SELECT CONCAT(TABLE_SCHEMA, '.', TABLE_NAME) AS name
       FROM information_schema.TABLES
       WHERE TABLE_SCHEMA NOT IN ('information_schema', 'performance_schema', 'mysql', 'sys')
       ORDER BY name`,
    );
    const [columns] = await pool.query(
      `SELECT DISTINCT COLUMN_NAME AS name
       FROM information_schema.COLUMNS
       WHERE TABLE_SCHEMA NOT IN ('information_schema', 'performance_schema', 'mysql', 'sys')
       ORDER BY name`,
    );
    return {
      tables: (tables as Record<string, string>[]).map((r) => r.name),
      columns: (columns as Record<string, string>[]).map((r) => r.name),
    };
  }

  // ─── CRUD operations (Phase 5) ────────────────────────────────

  async getPrimaryKeyColumns(schema: string, table: string): Promise<string[]> {
    const pool = this.ensurePool();
    const [rows] = await pool.query(
      `SELECT COLUMN_NAME AS name
       FROM information_schema.KEY_COLUMN_USAGE
       WHERE TABLE_SCHEMA = ? AND TABLE_NAME = ?
         AND CONSTRAINT_NAME = 'PRIMARY'
       ORDER BY ORDINAL_POSITION`,
      [schema, table],
    );
    return (rows as Record<string, string>[]).map((r) => r.name);
  }

  async insertRow(
    schema: string,
    table: string,
    row: Record<string, unknown>,
  ): Promise<CrudResult> {
    const pool = this.ensurePool();
    const cols = Object.keys(row);
    const vals = Object.values(row);
    const placeholders = cols.map(() => "?").join(", ");
    const colNames = cols.map((c) => escapeMysqlId(c)).join(", ");

    const [result] = await pool.query(
      `INSERT INTO ${escapeMysqlId(schema)}.${escapeMysqlId(table)} (${colNames}) VALUES (${placeholders})`,
      vals,
    );
    return { success: true, affectedRows: (result as mysql.ResultSetHeader).affectedRows ?? 1 };
  }

  async updateRow(
    schema: string,
    table: string,
    primaryKey: Record<string, unknown>,
    changes: Record<string, unknown>,
  ): Promise<CrudResult> {
    const pool = this.ensurePool();
    const setCols = Object.keys(changes);
    const pkCols = Object.keys(primaryKey);
    const allVals = [...Object.values(changes), ...Object.values(primaryKey)];

    const setClause = setCols.map((c) => `${escapeMysqlId(c)} = ?`).join(", ");
    const whereClause = pkCols.map((c) => `${escapeMysqlId(c)} = ?`).join(" AND ");

    const [result] = await pool.query(
      `UPDATE ${escapeMysqlId(schema)}.${escapeMysqlId(table)} SET ${setClause} WHERE ${whereClause}`,
      allVals,
    );
    return { success: true, affectedRows: (result as mysql.ResultSetHeader).affectedRows ?? 0 };
  }

  async deleteRows(
    schema: string,
    table: string,
    primaryKeys: Record<string, unknown>[],
  ): Promise<CrudResult> {
    const pool = this.ensurePool();
    let totalAffected = 0;

    for (const pk of primaryKeys) {
      const pkCols = Object.keys(pk);
      const pkVals = Object.values(pk);
      const whereClause = pkCols.map((c) => `${escapeMysqlId(c)} = ?`).join(" AND ");

      const [result] = await pool.query(
        `DELETE FROM ${escapeMysqlId(schema)}.${escapeMysqlId(table)} WHERE ${whereClause}`,
        pkVals,
      );
      totalAffected += (result as mysql.ResultSetHeader).affectedRows ?? 0;
    }

    return { success: true, affectedRows: totalAffected };
  }
}
