import sql from "mssql";
import type { ConnectionConfig } from "../../shared/types/database";
import type {
  SchemaInfo,
  TableInfo,
  TableStructure,
  RoutineInfo,
  QueryResult,
  ExecuteQueryResult,
} from "../../shared/types/database";
import type { DatabaseDriver } from "../types";

export class MSSQLDriver implements DatabaseDriver {
  private pool: sql.ConnectionPool | null = null;

  async connect(config: ConnectionConfig, password?: string): Promise<void> {
    const mssqlConfig: sql.config = {
      server: config.host,
      port: config.port,
      database: config.database,
      user: config.username,
      password: password ?? "",
      pool: {
        max: config.poolSize,
        min: 0,
        idleTimeoutMillis: 30000,
      },
      options: {
        encrypt: config.ssl,
        trustServerCertificate: true,
        connectTimeout: config.connectionTimeout,
      },
    };

    this.pool = new sql.ConnectionPool(mssqlConfig);
    await this.pool.connect();
  }

  async disconnect(): Promise<void> {
    if (this.pool) {
      await this.pool.close();
      this.pool = null;
    }
  }

  async ping(): Promise<void> {
    if (!this.pool) throw new Error("Not connected");
    await this.pool.request().query("SELECT 1");
  }

  isConnected(): boolean {
    return this.pool !== null && this.pool.connected;
  }

  private ensurePool(): sql.ConnectionPool {
    if (!this.pool) throw new Error("Not connected");
    return this.pool;
  }

  async getSchemas(): Promise<SchemaInfo[]> {
    const pool = this.ensurePool();
    const result = await pool.request().query(
      `SELECT s.name
       FROM sys.schemas s
       INNER JOIN sys.objects o ON s.schema_id = o.schema_id
       WHERE s.name NOT IN ('sys', 'INFORMATION_SCHEMA', 'guest')
       GROUP BY s.name
       ORDER BY s.name`,
    );
    // If nothing found, at least return 'dbo'
    if (result.recordset.length === 0) {
      return [{ name: "dbo" }];
    }
    return result.recordset;
  }

  async getTables(schema: string): Promise<TableInfo[]> {
    const pool = this.ensurePool();
    const result = await pool
      .request()
      .input("schema", sql.NVarChar, schema)
      .query(
        `SELECT TABLE_NAME AS name, TABLE_SCHEMA AS [schema],
                CASE WHEN TABLE_TYPE = 'VIEW' THEN 'view' ELSE 'table' END AS type
         FROM INFORMATION_SCHEMA.TABLES
         WHERE TABLE_SCHEMA = @schema
         ORDER BY TABLE_TYPE, TABLE_NAME`,
      );
    return result.recordset;
  }

  async getTableStructure(
    schema: string,
    table: string,
  ): Promise<TableStructure> {
    const pool = this.ensurePool();

    const colResult = await pool
      .request()
      .input("schema", sql.NVarChar, schema)
      .input("table", sql.NVarChar, table)
      .query(
        `SELECT c.COLUMN_NAME AS name, c.DATA_TYPE AS dataType,
                CASE WHEN c.IS_NULLABLE = 'YES' THEN 1 ELSE 0 END AS nullable,
                c.COLUMN_DEFAULT AS defaultValue,
                c.ORDINAL_POSITION AS ordinalPosition,
                CASE WHEN pk.COLUMN_NAME IS NOT NULL THEN 1 ELSE 0 END AS isPrimaryKey
         FROM INFORMATION_SCHEMA.COLUMNS c
         LEFT JOIN (
           SELECT kcu.COLUMN_NAME
           FROM INFORMATION_SCHEMA.TABLE_CONSTRAINTS tc
           JOIN INFORMATION_SCHEMA.KEY_COLUMN_USAGE kcu
             ON tc.CONSTRAINT_NAME = kcu.CONSTRAINT_NAME
             AND tc.TABLE_SCHEMA = kcu.TABLE_SCHEMA
           WHERE tc.CONSTRAINT_TYPE = 'PRIMARY KEY'
             AND tc.TABLE_SCHEMA = @schema AND tc.TABLE_NAME = @table
         ) pk ON c.COLUMN_NAME = pk.COLUMN_NAME
         WHERE c.TABLE_SCHEMA = @schema AND c.TABLE_NAME = @table
         ORDER BY c.ORDINAL_POSITION`,
      );

    const idxResult = await pool
      .request()
      .input("schema", sql.NVarChar, schema)
      .input("table", sql.NVarChar, table)
      .query(
        `SELECT i.name,
                STRING_AGG(c.name, ',') WITHIN GROUP (ORDER BY ic.key_ordinal) AS columnList,
                i.is_unique AS [unique],
                i.is_primary_key AS [primary]
         FROM sys.indexes i
         JOIN sys.index_columns ic ON i.object_id = ic.object_id AND i.index_id = ic.index_id
         JOIN sys.columns c ON ic.object_id = c.object_id AND ic.column_id = c.column_id
         JOIN sys.tables t ON i.object_id = t.object_id
         JOIN sys.schemas s ON t.schema_id = s.schema_id
         WHERE s.name = @schema AND t.name = @table AND i.name IS NOT NULL
         GROUP BY i.name, i.is_unique, i.is_primary_key
         ORDER BY i.name`,
      );

    const conResult = await pool
      .request()
      .input("schema", sql.NVarChar, schema)
      .input("table", sql.NVarChar, table)
      .query(
        `SELECT tc.CONSTRAINT_NAME AS name,
                tc.CONSTRAINT_TYPE AS type,
                STRING_AGG(kcu.COLUMN_NAME, ',') AS columnList,
                rc.UNIQUE_CONSTRAINT_NAME AS refConstraint
         FROM INFORMATION_SCHEMA.TABLE_CONSTRAINTS tc
         JOIN INFORMATION_SCHEMA.KEY_COLUMN_USAGE kcu
           ON tc.CONSTRAINT_NAME = kcu.CONSTRAINT_NAME
           AND tc.TABLE_SCHEMA = kcu.TABLE_SCHEMA
         LEFT JOIN INFORMATION_SCHEMA.REFERENTIAL_CONSTRAINTS rc
           ON tc.CONSTRAINT_NAME = rc.CONSTRAINT_NAME
         WHERE tc.TABLE_SCHEMA = @schema AND tc.TABLE_NAME = @table
         GROUP BY tc.CONSTRAINT_NAME, tc.CONSTRAINT_TYPE, rc.UNIQUE_CONSTRAINT_NAME
         ORDER BY tc.CONSTRAINT_NAME`,
      );

    return {
      columns: colResult.recordset.map((r: Record<string, unknown>) => ({
        name: r.name as string,
        dataType: r.dataType as string,
        nullable: Boolean(r.nullable),
        defaultValue: (r.defaultValue as string) ?? null,
        isPrimaryKey: Boolean(r.isPrimaryKey),
        ordinalPosition: r.ordinalPosition as number,
      })),
      indexes: idxResult.recordset.map((r: Record<string, unknown>) => ({
        name: r.name as string,
        columns: (r.columnList as string).split(","),
        unique: Boolean(r.unique),
        primary: Boolean(r.primary),
      })),
      constraints: conResult.recordset.map((r: Record<string, unknown>) => ({
        name: r.name as string,
        type: r.type as "PRIMARY KEY" | "FOREIGN KEY" | "UNIQUE" | "CHECK",
        columns: (r.columnList as string).split(","),
      })),
    };
  }

  async getRoutines(schema: string): Promise<RoutineInfo[]> {
    const pool = this.ensurePool();
    const result = await pool
      .request()
      .input("schema", sql.NVarChar, schema)
      .query(
        `SELECT ROUTINE_NAME AS name, ROUTINE_SCHEMA AS [schema],
                LOWER(ROUTINE_TYPE) AS type
         FROM INFORMATION_SCHEMA.ROUTINES
         WHERE ROUTINE_SCHEMA = @schema
         ORDER BY ROUTINE_TYPE, ROUTINE_NAME`,
      );
    return result.recordset;
  }

  async getTableData(
    schema: string,
    table: string,
    page: number,
    pageSize: number,
  ): Promise<QueryResult> {
    const pool = this.ensurePool();
    const offset = page * pageSize;

    const countResult = await pool
      .request()
      .input("schema", sql.NVarChar, schema)
      .input("table", sql.NVarChar, table)
      .query(
        `SELECT COUNT(*) AS total FROM [${schema}].[${table}]`,
      );
    const totalRows: number = countResult.recordset[0].total;

    const dataResult = await pool
      .request()
      .input("offset", sql.Int, offset)
      .input("pageSize", sql.Int, pageSize)
      .query(
        `SELECT * FROM [${schema}].[${table}]
         ORDER BY (SELECT NULL)
         OFFSET @offset ROWS FETCH NEXT @pageSize ROWS ONLY`,
      );

    const columns =
      dataResult.recordset.columns
        ? Object.keys(dataResult.recordset.columns)
        : dataResult.recordset.length > 0
          ? Object.keys(dataResult.recordset[0])
          : [];

    return {
      columns,
      rows: dataResult.recordset,
      totalRows,
      page,
      pageSize,
      hasMore: offset + pageSize < totalRows,
    };
  }

  // ─── Query execution (Phase 4) ───────────────────────────────

  async executeQuery(sqlText: string): Promise<ExecuteQueryResult> {
    const pool = this.ensurePool();
    const start = performance.now();
    const result = await pool.request().query(sqlText);
    const executionTime = Math.round(performance.now() - start);

    const isModification = /^\s*(INSERT|UPDATE|DELETE|CREATE|ALTER|DROP|TRUNCATE)/i.test(sqlText);

    const columns = result.recordset?.columns
      ? Object.keys(result.recordset.columns)
      : result.recordset?.length > 0
        ? Object.keys(result.recordset[0])
        : [];

    return {
      columns,
      rows: result.recordset ?? [],
      rowCount: result.recordset?.length ?? 0,
      executionTime,
      isModification,
      affectedRows: isModification ? result.rowsAffected?.[0] ?? 0 : undefined,
    };
  }

  async explainQuery(sqlText: string): Promise<string> {
    const pool = this.ensurePool();
    // SQL Server uses SET SHOWPLAN_TEXT for query plans
    await pool.request().query("SET SHOWPLAN_TEXT ON");
    try {
      const result = await pool.request().query(sqlText);
      return result.recordset.map((r: Record<string, unknown>) =>
        Object.values(r).join("\n"),
      ).join("\n");
    } finally {
      await pool.request().query("SET SHOWPLAN_TEXT OFF");
    }
  }

  async getCompletionItems(): Promise<{ tables: string[]; columns: string[] }> {
    const pool = this.ensurePool();
    const tablesResult = await pool.request().query(
      `SELECT TABLE_SCHEMA + '.' + TABLE_NAME AS name
       FROM INFORMATION_SCHEMA.TABLES
       ORDER BY name`,
    );
    const columnsResult = await pool.request().query(
      `SELECT DISTINCT COLUMN_NAME AS name
       FROM INFORMATION_SCHEMA.COLUMNS
       ORDER BY name`,
    );
    return {
      tables: tablesResult.recordset.map((r: Record<string, string>) => r.name),
      columns: columnsResult.recordset.map((r: Record<string, string>) => r.name),
    };
  }
}
