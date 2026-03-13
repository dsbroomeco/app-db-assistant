import { describe, it, expect } from "vitest";
import {
  newConnectionConfig,
  DEFAULT_PORTS,
  DATABASE_TYPE_LABELS,
} from "./database";
import type {
  DatabaseType,
  ConnectionConfig,
  SchemaInfo,
  TableInfo,
  ColumnInfo,
  IndexInfo,
  ConstraintInfo,
  RoutineInfo,
  TableStructure,
  QueryResult,
} from "./database";

describe("database types", () => {
  describe("DEFAULT_PORTS", () => {
    it("has correct default ports", () => {
      expect(DEFAULT_PORTS.postgresql).toBe(5432);
      expect(DEFAULT_PORTS.mysql).toBe(3306);
      expect(DEFAULT_PORTS.mssql).toBe(1433);
    });
  });

  describe("DATABASE_TYPE_LABELS", () => {
    it("has labels for all database types", () => {
      const types: DatabaseType[] = ["postgresql", "mysql", "sqlite", "mssql"];
      for (const t of types) {
        expect(DATABASE_TYPE_LABELS[t]).toBeDefined();
        expect(typeof DATABASE_TYPE_LABELS[t]).toBe("string");
      }
    });
  });

  describe("newConnectionConfig", () => {
    it("creates postgresql config with defaults", () => {
      const config = newConnectionConfig("postgresql");
      expect(config.type).toBe("postgresql");
      expect(config.host).toBe("localhost");
      expect(config.port).toBe(5432);
      expect(config.connectionTimeout).toBe(15000);
      expect(config.poolSize).toBe(5);
    });

    it("creates mysql config with correct port", () => {
      const config = newConnectionConfig("mysql");
      expect(config.type).toBe("mysql");
      expect(config.port).toBe(3306);
    });

    it("creates mssql config with correct port", () => {
      const config = newConnectionConfig("mssql");
      expect(config.type).toBe("mssql");
      expect(config.port).toBe(1433);
    });

    it("creates sqlite config with empty host/port", () => {
      const config = newConnectionConfig("sqlite");
      expect(config.type).toBe("sqlite");
      expect(config.host).toBe("");
      expect(config.port).toBe(0);
    });

    it("applies partial overrides", () => {
      const config = newConnectionConfig("postgresql", {
        name: "My PG",
        host: "db.example.com",
        port: 5433,
      });
      expect(config.name).toBe("My PG");
      expect(config.host).toBe("db.example.com");
      expect(config.port).toBe(5433);
      expect(config.type).toBe("postgresql");
    });

    it("generates config with empty id for new connections", () => {
      const config = newConnectionConfig("mysql");
      expect(config.id).toBe("");
    });

    it("preserves ssl default as false", () => {
      const config = newConnectionConfig("postgresql");
      expect(config.ssl).toBe(false);
    });

    it("type guard: ConnectionConfig has all required fields", () => {
      const config: ConnectionConfig = newConnectionConfig("postgresql");
      const requiredKeys: (keyof ConnectionConfig)[] = [
        "id",
        "name",
        "type",
        "host",
        "port",
        "database",
        "username",
        "ssl",
        "filepath",
        "connectionTimeout",
        "poolSize",
      ];
      for (const key of requiredKeys) {
        expect(key in config).toBe(true);
      }
    });
  });

  describe("Schema browsing types (Phase 3)", () => {
    it("SchemaInfo has expected shape", () => {
      const schema: SchemaInfo = { name: "public" };
      expect(schema.name).toBe("public");
    });

    it("TableInfo has expected shape", () => {
      const table: TableInfo = { name: "users", schema: "public", type: "table" };
      expect(table.name).toBe("users");
      expect(table.schema).toBe("public");
      expect(table.type).toBe("table");
    });

    it("TableInfo supports view type", () => {
      const view: TableInfo = { name: "active_users", schema: "public", type: "view" };
      expect(view.type).toBe("view");
    });

    it("ColumnInfo has expected shape", () => {
      const col: ColumnInfo = {
        name: "id",
        dataType: "integer",
        nullable: false,
        defaultValue: null,
        isPrimaryKey: true,
        ordinalPosition: 1,
      };
      expect(col.isPrimaryKey).toBe(true);
      expect(col.nullable).toBe(false);
    });

    it("IndexInfo has expected shape", () => {
      const idx: IndexInfo = {
        name: "pk_users",
        columns: ["id"],
        unique: true,
        primary: true,
      };
      expect(idx.columns).toEqual(["id"]);
    });

    it("ConstraintInfo supports foreign keys", () => {
      const fk: ConstraintInfo = {
        name: "fk_orders_user",
        type: "FOREIGN KEY",
        columns: ["user_id"],
        referencedTable: "users",
        referencedColumns: ["id"],
      };
      expect(fk.type).toBe("FOREIGN KEY");
      expect(fk.referencedTable).toBe("users");
    });

    it("RoutineInfo has expected shape", () => {
      const routine: RoutineInfo = {
        name: "get_user",
        schema: "public",
        type: "function",
      };
      expect(routine.type).toBe("function");
    });

    it("TableStructure combines columns, indexes, constraints", () => {
      const structure: TableStructure = {
        columns: [
          {
            name: "id",
            dataType: "integer",
            nullable: false,
            defaultValue: null,
            isPrimaryKey: true,
            ordinalPosition: 1,
          },
        ],
        indexes: [
          { name: "pk_users", columns: ["id"], unique: true, primary: true },
        ],
        constraints: [
          { name: "pk_users", type: "PRIMARY KEY", columns: ["id"] },
        ],
      };
      expect(structure.columns).toHaveLength(1);
      expect(structure.indexes).toHaveLength(1);
      expect(structure.constraints).toHaveLength(1);
    });

    it("QueryResult has expected shape with pagination", () => {
      const result: QueryResult = {
        columns: ["id", "name"],
        rows: [{ id: 1, name: "Alice" }],
        totalRows: 100,
        page: 0,
        pageSize: 50,
        hasMore: true,
      };
      expect(result.hasMore).toBe(true);
      expect(result.page).toBe(0);
      expect(result.totalRows).toBe(100);
    });

    it("QueryResult hasMore is false on last page", () => {
      const result: QueryResult = {
        columns: ["id"],
        rows: [{ id: 1 }],
        totalRows: 1,
        page: 0,
        pageSize: 50,
        hasMore: false,
      };
      expect(result.hasMore).toBe(false);
    });
  });
});
