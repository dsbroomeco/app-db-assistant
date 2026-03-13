import { Pool } from "pg";
import type { ConnectionConfig } from "../../shared/types/database";
import { escapePgId } from "../sanitize";
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

export class PostgreSQLDriver implements DatabaseDriver {
  private pool: Pool | null = null;

  escapeIdentifier(name: string): string {
    return escapePgId(name);
  }

  async connect(config: ConnectionConfig, password?: string): Promise<void> {
    this.pool = new Pool({
      host: config.host,
      port: config.port,
      database: config.database,
      user: config.username,
      password: password ?? "",
      ssl: config.ssl ? { rejectUnauthorized: config.sslRejectUnauthorized } : false,
      max: config.poolSize,
      connectionTimeoutMillis: config.connectionTimeout,
      idleTimeoutMillis: 30000,
    });

    // Verify the connection works
    const client = await this.pool.connect();
    client.release();
  }

  async disconnect(): Promise<void> {
    if (this.pool) {
      await this.pool.end();
      this.pool = null;
    }
  }

  async ping(): Promise<void> {
    if (!this.pool) throw new Error("Not connected");
    const client = await this.pool.connect();
    try {
      await client.query("SELECT 1");
    } finally {
      client.release();
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
    const result = await pool.query(
      `SELECT schema_name AS name FROM information_schema.schemata
       WHERE schema_name NOT IN ('pg_toast', 'pg_catalog', 'information_schema')
       ORDER BY schema_name`,
    );
    return result.rows;
  }

  async getTables(schema: string): Promise<TableInfo[]> {
    const pool = this.ensurePool();
    const result = await pool.query(
      `SELECT table_name AS name, table_schema AS schema,
              CASE WHEN table_type = 'VIEW' THEN 'view' ELSE 'table' END AS type
       FROM information_schema.tables
       WHERE table_schema = $1
       ORDER BY table_type, table_name`,
      [schema],
    );
    return result.rows;
  }

  async getTableStructure(
    schema: string,
    table: string,
  ): Promise<TableStructure> {
    const pool = this.ensurePool();

    const [colResult, idxResult, conResult] = await Promise.all([
      pool.query(
        `SELECT c.column_name AS name, c.data_type AS "dataType",
                (c.is_nullable = 'YES') AS nullable,
                c.column_default AS "defaultValue",
                c.ordinal_position AS "ordinalPosition",
                EXISTS (
                  SELECT 1 FROM information_schema.key_column_usage kcu
                  JOIN information_schema.table_constraints tc
                    ON kcu.constraint_name = tc.constraint_name
                    AND kcu.table_schema = tc.table_schema
                  WHERE tc.constraint_type = 'PRIMARY KEY'
                    AND kcu.table_schema = $1
                    AND kcu.table_name = $2
                    AND kcu.column_name = c.column_name
                ) AS "isPrimaryKey"
         FROM information_schema.columns c
         WHERE c.table_schema = $1 AND c.table_name = $2
         ORDER BY c.ordinal_position`,
        [schema, table],
      ),
      pool.query(
        `SELECT i.relname AS name,
                array_agg(a.attname ORDER BY k.n) AS columns,
                ix.indisunique AS unique,
                ix.indisprimary AS primary
         FROM pg_index ix
         JOIN pg_class t ON t.oid = ix.indrelid
         JOIN pg_class i ON i.oid = ix.indexrelid
         JOIN pg_namespace n ON n.oid = t.relnamespace
         CROSS JOIN LATERAL unnest(ix.indkey) WITH ORDINALITY AS k(attnum, n)
         JOIN pg_attribute a ON a.attrelid = t.oid AND a.attnum = k.attnum
         WHERE n.nspname = $1 AND t.relname = $2
         GROUP BY i.relname, ix.indisunique, ix.indisprimary
         ORDER BY i.relname`,
        [schema, table],
      ),
      pool.query(
        `SELECT tc.constraint_name AS name,
                tc.constraint_type AS type,
                array_agg(DISTINCT kcu.column_name) AS columns,
                ccu.table_name AS "referencedTable",
                array_agg(DISTINCT ccu.column_name) FILTER (WHERE tc.constraint_type = 'FOREIGN KEY') AS "referencedColumns"
         FROM information_schema.table_constraints tc
         JOIN information_schema.key_column_usage kcu
           ON tc.constraint_name = kcu.constraint_name
           AND tc.table_schema = kcu.table_schema
         LEFT JOIN information_schema.constraint_column_usage ccu
           ON tc.constraint_name = ccu.constraint_name
           AND tc.table_schema = ccu.table_schema
           AND tc.constraint_type = 'FOREIGN KEY'
         WHERE tc.table_schema = $1 AND tc.table_name = $2
         GROUP BY tc.constraint_name, tc.constraint_type, ccu.table_name
         ORDER BY tc.constraint_name`,
        [schema, table],
      ),
    ]);

    return {
      columns: colResult.rows,
      indexes: idxResult.rows,
      constraints: conResult.rows,
    };
  }

  async getRoutines(schema: string): Promise<RoutineInfo[]> {
    const pool = this.ensurePool();
    const result = await pool.query(
      `SELECT routine_name AS name, routine_schema AS schema,
              CASE WHEN routine_type = 'FUNCTION' THEN 'function' ELSE 'procedure' END AS type
       FROM information_schema.routines
       WHERE routine_schema = $1
       ORDER BY routine_type, routine_name`,
      [schema],
    );
    return result.rows;
  }

  async getTableData(
    schema: string,
    table: string,
    page: number,
    pageSize: number,
  ): Promise<QueryResult> {
    const pool = this.ensurePool();
    const offset = page * pageSize;

    const sSchema = escapePgId(schema);
    const sTable = escapePgId(table);
    const countResult = await pool.query(
      `SELECT COUNT(*)::int AS total FROM ${sSchema}.${sTable}`,
    );
    const totalRows: number = countResult.rows[0].total;

    const dataResult = await pool.query(
      `SELECT * FROM ${sSchema}.${sTable} LIMIT $1 OFFSET $2`,
      [pageSize, offset],
    );

    return {
      columns: dataResult.fields.map((f) => f.name),
      rows: dataResult.rows,
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
    const result = await pool.query(sql);
    const executionTime = Math.round(performance.now() - start);

    const isModification = /^\s*(INSERT|UPDATE|DELETE|CREATE|ALTER|DROP|TRUNCATE)/i.test(sql);

    return {
      columns: result.fields?.map((f) => f.name) ?? [],
      rows: result.rows ?? [],
      rowCount: result.rows?.length ?? 0,
      executionTime,
      isModification,
      affectedRows: isModification ? result.rowCount ?? 0 : undefined,
    };
  }

  async explainQuery(sql: string): Promise<string> {
    const pool = this.ensurePool();
    const result = await pool.query(`EXPLAIN ANALYZE ${sql}`);
    return result.rows.map((r) => r["QUERY PLAN"]).join("\n");
  }

  async getCompletionItems(): Promise<{ tables: string[]; columns: string[] }> {
    const pool = this.ensurePool();
    const [tablesResult, columnsResult] = await Promise.all([
      pool.query(
        `SELECT table_schema || '.' || table_name AS name
         FROM information_schema.tables
         WHERE table_schema NOT IN ('pg_toast', 'pg_catalog', 'information_schema')
         ORDER BY name`,
      ),
      pool.query(
        `SELECT DISTINCT column_name AS name
         FROM information_schema.columns
         WHERE table_schema NOT IN ('pg_toast', 'pg_catalog', 'information_schema')
         ORDER BY name`,
      ),
    ]);
    return {
      tables: tablesResult.rows.map((r) => r.name),
      columns: columnsResult.rows.map((r) => r.name),
    };
  }

  // ─── CRUD operations (Phase 5) ────────────────────────────────

  async getPrimaryKeyColumns(schema: string, table: string): Promise<string[]> {
    const pool = this.ensurePool();
    const result = await pool.query(
      `SELECT kcu.column_name
       FROM information_schema.table_constraints tc
       JOIN information_schema.key_column_usage kcu
         ON tc.constraint_name = kcu.constraint_name
         AND tc.table_schema = kcu.table_schema
       WHERE tc.constraint_type = 'PRIMARY KEY'
         AND tc.table_schema = $1 AND tc.table_name = $2
       ORDER BY kcu.ordinal_position`,
      [schema, table],
    );
    return result.rows.map((r) => r.column_name);
  }

  async insertRow(
    schema: string,
    table: string,
    row: Record<string, unknown>,
  ): Promise<CrudResult> {
    const pool = this.ensurePool();
    const cols = Object.keys(row);
    const vals = Object.values(row);
    const placeholders = cols.map((_, i) => `$${i + 1}`).join(", ");
    const colNames = cols.map((c) => escapePgId(c)).join(", ");

    const result = await pool.query(
      `INSERT INTO ${escapePgId(schema)}.${escapePgId(table)} (${colNames}) VALUES (${placeholders})`,
      vals,
    );
    return { success: true, affectedRows: result.rowCount ?? 1 };
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

    const setClause = setCols
      .map((c, i) => `${escapePgId(c)} = $${i + 1}`)
      .join(", ");
    const whereClause = pkCols
      .map((c, i) => `${escapePgId(c)} = $${setCols.length + i + 1}`)
      .join(" AND ");

    const result = await pool.query(
      `UPDATE ${escapePgId(schema)}.${escapePgId(table)} SET ${setClause} WHERE ${whereClause}`,
      allVals,
    );
    return { success: true, affectedRows: result.rowCount ?? 0 };
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
      const whereClause = pkCols
        .map((c, i) => `${escapePgId(c)} = $${i + 1}`)
        .join(" AND ");

      const result = await pool.query(
        `DELETE FROM ${escapePgId(schema)}.${escapePgId(table)} WHERE ${whereClause}`,
        pkVals,
      );
      totalAffected += result.rowCount ?? 0;
    }

    return { success: true, affectedRows: totalAffected };
  }
}
