import mysql from "mysql2/promise";
import type { Pool, FieldPacket } from "mysql2/promise";
import type { ConnectionConfig } from "../../shared/types/database";
import type {
  SchemaInfo,
  TableInfo,
  TableStructure,
  RoutineInfo,
  QueryResult,
} from "../../shared/types/database";
import type { DatabaseDriver } from "../types";

export class MySQLDriver implements DatabaseDriver {
  private pool: Pool | null = null;
  private database = "";

  async connect(config: ConnectionConfig, password?: string): Promise<void> {
    this.database = config.database;
    this.pool = mysql.createPool({
      host: config.host,
      port: config.port,
      database: config.database,
      user: config.username,
      password: password ?? "",
      ssl: config.ssl ? { rejectUnauthorized: false } : undefined,
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

    const [countRows] = await pool.query(
      `SELECT COUNT(*) AS total FROM \`${schema}\`.\`${table}\``,
    );
    const totalRows = (countRows as Record<string, number>[])[0].total;

    const [dataRows, fields] = await pool.query(
      `SELECT * FROM \`${schema}\`.\`${table}\` LIMIT ? OFFSET ?`,
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
}
