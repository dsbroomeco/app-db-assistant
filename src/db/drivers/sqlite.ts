import type BetterSqlite3 from "better-sqlite3";
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

export class SQLiteDriver implements DatabaseDriver {
  private db: BetterSqlite3.Database | null = null;

  escapeIdentifier(name: string): string {
    return escapePgId(name);
  }

  async connect(config: ConnectionConfig): Promise<void> {
    if (!config.filepath) {
      throw new Error("SQLite requires a file path");
    }
    // Dynamic import — better-sqlite3 is a native module that may need electron-rebuild
    const Database = require("better-sqlite3") as typeof BetterSqlite3;
    this.db = new Database(config.filepath, {
      timeout: config.connectionTimeout,
    });
    // Verify the database is accessible
    this.db.pragma("journal_mode = WAL");
  }

  async disconnect(): Promise<void> {
    if (this.db) {
      this.db.close();
      this.db = null;
    }
  }

  async ping(): Promise<void> {
    if (!this.db) throw new Error("Not connected");
    this.db.prepare("SELECT 1").get();
  }

  isConnected(): boolean {
    return this.db !== null;
  }

  private ensureDb(): BetterSqlite3.Database {
    if (!this.db) throw new Error("Not connected");
    return this.db;
  }

  async getSchemas(): Promise<SchemaInfo[]> {
    // SQLite has no schema concept; return "main" as the single schema
    return [{ name: "main" }];
  }

  async getTables(_schema: string): Promise<TableInfo[]> {
    const db = this.ensureDb();
    const rows = db
      .prepare(
        `SELECT name, type FROM sqlite_master
         WHERE type IN ('table', 'view') AND name NOT LIKE 'sqlite_%'
         ORDER BY type, name`,
      )
      .all() as { name: string; type: string }[];

    return rows.map((r) => ({
      name: r.name,
      schema: "main",
      type: r.type === "view" ? ("view" as const) : ("table" as const),
    }));
  }

  async getTableStructure(
    _schema: string,
    table: string,
  ): Promise<TableStructure> {
    const db = this.ensureDb();

    const sTable = escapePgId(table);
    const columns = db.prepare(`PRAGMA table_info(${sTable})`).all() as {
      cid: number;
      name: string;
      type: string;
      notnull: number;
      dflt_value: string | null;
      pk: number;
    }[];

    const indexes = db.prepare(`PRAGMA index_list(${sTable})`).all() as {
      seq: number;
      name: string;
      unique: number;
      origin: string;
    }[];

    const indexDetails = indexes.map((idx) => {
      const idxInfo = db.prepare(`PRAGMA index_info(${escapePgId(idx.name)})`).all() as {
        seqno: number;
        cid: number;
        name: string;
      }[];
      return {
        name: idx.name,
        columns: idxInfo.map((i) => i.name),
        unique: idx.unique === 1,
        primary: idx.origin === "pk",
      };
    });

    const fkList = db.prepare(`PRAGMA foreign_key_list(${sTable})`).all() as {
      id: number;
      seq: number;
      table: string;
      from: string;
      to: string;
    }[];

    // Build constraints from primary keys and foreign keys
    const constraints: TableStructure["constraints"] = [];

    const pkCols = columns.filter((c) => c.pk > 0);
    if (pkCols.length > 0) {
      constraints.push({
        name: "PRIMARY",
        type: "PRIMARY KEY",
        columns: pkCols.map((c) => c.name),
      });
    }

    // Group foreign keys by id
    const fkGroups = new Map<number, typeof fkList>();
    for (const fk of fkList) {
      if (!fkGroups.has(fk.id)) fkGroups.set(fk.id, []);
      fkGroups.get(fk.id)!.push(fk);
    }
    for (const [, fks] of fkGroups) {
      constraints.push({
        name: `fk_${fks[0].table}_${fks.map((f) => f.from).join("_")}`,
        type: "FOREIGN KEY",
        columns: fks.map((f) => f.from),
        referencedTable: fks[0].table,
        referencedColumns: fks.map((f) => f.to),
      });
    }

    return {
      columns: columns.map((c) => ({
        name: c.name,
        dataType: c.type,
        nullable: c.notnull === 0,
        defaultValue: c.dflt_value,
        isPrimaryKey: c.pk > 0,
        ordinalPosition: c.cid + 1,
      })),
      indexes: indexDetails,
      constraints,
    };
  }

  async getRoutines(_schema: string): Promise<RoutineInfo[]> {
    // SQLite has no stored procedures or functions
    return [];
  }

  async getTableData(
    _schema: string,
    table: string,
    page: number,
    pageSize: number,
  ): Promise<QueryResult> {
    const db = this.ensureDb();
    const offset = page * pageSize;
    const sTable = escapePgId(table);

    const countRow = db
      .prepare(`SELECT COUNT(*) AS total FROM ${sTable}`)
      .get() as { total: number };
    const totalRows = countRow.total;

    const stmt = db.prepare(`SELECT * FROM ${sTable} LIMIT ? OFFSET ?`);
    const rows = stmt.all(pageSize, offset) as Record<string, unknown>[];

    const columns =
      rows.length > 0
        ? Object.keys(rows[0])
        : (stmt.columns().map((c) => c.name));

    return {
      columns,
      rows,
      totalRows,
      page,
      pageSize,
      hasMore: offset + pageSize < totalRows,
    };
  }

  // ─── Query execution (Phase 4) ───────────────────────────────

  async executeQuery(sql: string): Promise<ExecuteQueryResult> {
    const db = this.ensureDb();
    const start = performance.now();

    const isModification = /^\s*(INSERT|UPDATE|DELETE|CREATE|ALTER|DROP)/i.test(sql);

    if (isModification) {
      const info = db.prepare(sql).run();
      const executionTime = Math.round(performance.now() - start);
      return {
        columns: [],
        rows: [],
        rowCount: 0,
        executionTime,
        isModification: true,
        affectedRows: info.changes,
      };
    }

    const stmt = db.prepare(sql);
    const rows = stmt.all() as Record<string, unknown>[];
    const executionTime = Math.round(performance.now() - start);
    const columns =
      rows.length > 0
        ? Object.keys(rows[0])
        : stmt.columns().map((c) => c.name);

    return {
      columns,
      rows,
      rowCount: rows.length,
      executionTime,
      isModification: false,
    };
  }

  async explainQuery(sql: string): Promise<string> {
    const db = this.ensureDb();
    const rows = db.prepare(`EXPLAIN QUERY PLAN ${sql}`).all() as Record<string, unknown>[];
    return rows.map((r) => r.detail ?? JSON.stringify(r)).join("\n");
  }

  async getCompletionItems(): Promise<{ tables: string[]; columns: string[] }> {
    const db = this.ensureDb();
    const tableRows = db
      .prepare(
        `SELECT name FROM sqlite_master
         WHERE type IN ('table', 'view') AND name NOT LIKE 'sqlite_%'
         ORDER BY name`,
      )
      .all() as { name: string }[];

    const columnSet = new Set<string>();
    for (const t of tableRows) {
      const cols = db.prepare(`PRAGMA table_info(${escapePgId(t.name)})`).all() as { name: string }[];
      for (const c of cols) columnSet.add(c.name);
    }

    return {
      tables: tableRows.map((r) => r.name),
      columns: Array.from(columnSet).sort(),
    };
  }

  // ─── CRUD operations (Phase 5) ────────────────────────────────

  async getPrimaryKeyColumns(_schema: string, table: string): Promise<string[]> {
    const db = this.ensureDb();
    const cols = db.prepare(`PRAGMA table_info(${escapePgId(table)})`).all() as {
      name: string;
      pk: number;
    }[];
    return cols.filter((c) => c.pk > 0).map((c) => c.name);
  }

  async insertRow(
    _schema: string,
    table: string,
    row: Record<string, unknown>,
  ): Promise<CrudResult> {
    const db = this.ensureDb();
    const cols = Object.keys(row);
    const vals = Object.values(row);
    const placeholders = cols.map(() => "?").join(", ");
    const colNames = cols.map((c) => escapePgId(c)).join(", ");

    const info = db
      .prepare(`INSERT INTO ${escapePgId(table)} (${colNames}) VALUES (${placeholders})`)
      .run(...vals);
    return { success: true, affectedRows: info.changes };
  }

  async updateRow(
    _schema: string,
    table: string,
    primaryKey: Record<string, unknown>,
    changes: Record<string, unknown>,
  ): Promise<CrudResult> {
    const db = this.ensureDb();
    const setCols = Object.keys(changes);
    const pkCols = Object.keys(primaryKey);
    const allVals = [...Object.values(changes), ...Object.values(primaryKey)];

    const setClause = setCols.map((c) => `${escapePgId(c)} = ?`).join(", ");
    const whereClause = pkCols.map((c) => `${escapePgId(c)} = ?`).join(" AND ");

    const info = db
      .prepare(`UPDATE ${escapePgId(table)} SET ${setClause} WHERE ${whereClause}`)
      .run(...allVals);
    return { success: true, affectedRows: info.changes };
  }

  async deleteRows(
    _schema: string,
    table: string,
    primaryKeys: Record<string, unknown>[],
  ): Promise<CrudResult> {
    const db = this.ensureDb();
    let totalAffected = 0;

    const deleteInTransaction = db.transaction((keys: Record<string, unknown>[]) => {
      for (const pk of keys) {
        const pkCols = Object.keys(pk);
        const pkVals = Object.values(pk);
        const whereClause = pkCols.map((c) => `${escapePgId(c)} = ?`).join(" AND ");

        const info = db
          .prepare(`DELETE FROM ${escapePgId(table)} WHERE ${whereClause}`)
          .run(...pkVals);
        totalAffected += info.changes;
      }
    });

    deleteInTransaction(primaryKeys);
    return { success: true, affectedRows: totalAffected };
  }
}
