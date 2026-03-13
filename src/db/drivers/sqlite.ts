import type BetterSqlite3 from "better-sqlite3";
import type { ConnectionConfig } from "../../shared/types/database";
import type {
  SchemaInfo,
  TableInfo,
  TableStructure,
  RoutineInfo,
  QueryResult,
} from "../../shared/types/database";
import type { DatabaseDriver } from "../types";

export class SQLiteDriver implements DatabaseDriver {
  private db: BetterSqlite3.Database | null = null;

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

    const columns = db.prepare(`PRAGMA table_info("${table}")`).all() as {
      cid: number;
      name: string;
      type: string;
      notnull: number;
      dflt_value: string | null;
      pk: number;
    }[];

    const indexes = db.prepare(`PRAGMA index_list("${table}")`).all() as {
      seq: number;
      name: string;
      unique: number;
      origin: string;
    }[];

    const indexDetails = indexes.map((idx) => {
      const idxInfo = db.prepare(`PRAGMA index_info("${idx.name}")`).all() as {
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

    const fkList = db.prepare(`PRAGMA foreign_key_list("${table}")`).all() as {
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

    const countRow = db
      .prepare(`SELECT COUNT(*) AS total FROM "${table}"`)
      .get() as { total: number };
    const totalRows = countRow.total;

    const stmt = db.prepare(`SELECT * FROM "${table}" LIMIT ? OFFSET ?`);
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
}
