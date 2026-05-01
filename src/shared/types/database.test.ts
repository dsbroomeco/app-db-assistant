import { describe, it, expect } from "vitest";
import {
  newConnectionConfig,
  DEFAULT_PORTS,
  DATABASE_TYPE_LABELS,
  isSqlType,
  isNoSqlType,
  DEFAULT_SHORTCUTS,
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
  ExecuteQueryResult,
  ExplainQueryResult,
  QueryHistoryEntry,
  ExportFormat,
  InsertRowRequest,
  UpdateRowRequest,
  DeleteRowsRequest,
  CrudResult,
  MongoCollectionInfo,
  MongoDocument,
  MongoFindResult,
  MongoFindRequest,
  MongoInsertRequest,
  MongoUpdateRequest,
  MongoDeleteRequest,
  MongoAggregateRequest,
  RedisKeyInfo,
  RedisScanResult,
  RedisGetResult,
  RedisSetRequest,
  RedisDeleteRequest,
  RedisCommandRequest,
  RedisCommandResult,
  RedisValueType,
  ImportPreviewRequest,
  ImportPreviewResult,
  ImportExecuteRequest,
  ImportResult,
  SchemaDiffRequest,
  SchemaDiffResult,
  TableDiff,
  DiffStatus,
  SavedQuery,
  KeyboardShortcut,
} from "./database";

describe("database types", () => {
  describe("DEFAULT_PORTS", () => {
    it("has correct default ports", () => {
      expect(DEFAULT_PORTS.postgresql).toBe(5432);
      expect(DEFAULT_PORTS.mysql).toBe(3306);
      expect(DEFAULT_PORTS.mssql).toBe(1433);
      expect(DEFAULT_PORTS.mongodb).toBe(27017);
      expect(DEFAULT_PORTS.redis).toBe(6379);
    });

    it("has 5 entries (all non-SQLite types)", () => {
      expect(Object.keys(DEFAULT_PORTS)).toHaveLength(5);
    });
  });

  describe("DATABASE_TYPE_LABELS", () => {
    it("has labels for all database types", () => {
      const types: DatabaseType[] = [
        "postgresql", "mysql", "sqlite", "mssql", "mongodb", "redis",
      ];
      for (const t of types) {
        expect(DATABASE_TYPE_LABELS[t]).toBeDefined();
        expect(typeof DATABASE_TYPE_LABELS[t]).toBe("string");
      }
    });

    it("has 6 entries", () => {
      expect(Object.keys(DATABASE_TYPE_LABELS)).toHaveLength(6);
    });
  });

  describe("isSqlType / isNoSqlType helpers", () => {
    it("isSqlType returns true for SQL types", () => {
      expect(isSqlType("postgresql")).toBe(true);
      expect(isSqlType("mysql")).toBe(true);
      expect(isSqlType("sqlite")).toBe(true);
      expect(isSqlType("mssql")).toBe(true);
    });

    it("isSqlType returns false for NoSQL types", () => {
      expect(isSqlType("mongodb")).toBe(false);
      expect(isSqlType("redis")).toBe(false);
    });

    it("isNoSqlType returns true for NoSQL types", () => {
      expect(isNoSqlType("mongodb")).toBe(true);
      expect(isNoSqlType("redis")).toBe(true);
    });

    it("isNoSqlType returns false for SQL types", () => {
      expect(isNoSqlType("postgresql")).toBe(false);
      expect(isNoSqlType("mysql")).toBe(false);
      expect(isNoSqlType("sqlite")).toBe(false);
      expect(isNoSqlType("mssql")).toBe(false);
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

    it("creates mongodb config with correct defaults", () => {
      const config = newConnectionConfig("mongodb");
      expect(config.type).toBe("mongodb");
      expect(config.host).toBe("localhost");
      expect(config.port).toBe(27017);
      expect(config.poolSize).toBe(1);
    });

    it("creates redis config with correct defaults", () => {
      const config = newConnectionConfig("redis");
      expect(config.type).toBe("redis");
      expect(config.host).toBe("localhost");
      expect(config.port).toBe(6379);
      expect(config.poolSize).toBe(1);
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

  describe("Query execution types (Phase 4)", () => {
    it("ExecuteQueryResult has expected shape for SELECT", () => {
      const result: ExecuteQueryResult = {
        columns: ["id", "name"],
        rows: [{ id: 1, name: "Alice" }],
        rowCount: 1,
        executionTime: 42,
        isModification: false,
      };
      expect(result.isModification).toBe(false);
      expect(result.rowCount).toBe(1);
      expect(result.executionTime).toBe(42);
      expect(result.affectedRows).toBeUndefined();
    });

    it("ExecuteQueryResult has expected shape for INSERT", () => {
      const result: ExecuteQueryResult = {
        columns: [],
        rows: [],
        rowCount: 0,
        executionTime: 10,
        isModification: true,
        affectedRows: 5,
      };
      expect(result.isModification).toBe(true);
      expect(result.affectedRows).toBe(5);
    });

    it("ExplainQueryResult has expected shape", () => {
      const result: ExplainQueryResult = {
        plan: "Seq Scan on users",
        executionTime: 3,
      };
      expect(result.plan).toBe("Seq Scan on users");
      expect(result.executionTime).toBe(3);
    });

    it("QueryHistoryEntry has expected shape", () => {
      const entry: QueryHistoryEntry = {
        id: "abc-123",
        connectionId: "conn-1",
        connectionName: "My DB",
        sql: "SELECT * FROM users",
        executedAt: "2026-03-13T12:00:00Z",
        executionTime: 100,
        rowCount: 10,
      };
      expect(entry.error).toBeUndefined();
      expect(entry.rowCount).toBe(10);
    });

    it("QueryHistoryEntry supports error field", () => {
      const entry: QueryHistoryEntry = {
        id: "abc-456",
        connectionId: "conn-1",
        connectionName: "My DB",
        sql: "SELECT * FROM nonexistent",
        executedAt: "2026-03-13T12:00:00Z",
        executionTime: 0,
        rowCount: 0,
        error: "relation does not exist",
      };
      expect(entry.error).toBe("relation does not exist");
    });

    it("ExportFormat covers all formats", () => {
      const formats: ExportFormat[] = ["csv", "json", "sql"];
      expect(formats).toHaveLength(3);
    });
  });

  describe("CRUD operation types (Phase 5)", () => {
    it("InsertRowRequest has expected shape", () => {
      const req: InsertRowRequest = {
        connectionId: "conn-1",
        schema: "public",
        table: "users",
        row: { name: "Alice", email: "alice@example.com" },
      };
      expect(req.connectionId).toBe("conn-1");
      expect(req.row).toHaveProperty("name", "Alice");
    });

    it("UpdateRowRequest has expected shape", () => {
      const req: UpdateRowRequest = {
        connectionId: "conn-1",
        schema: "public",
        table: "users",
        primaryKey: { id: 1 },
        changes: { name: "Bob" },
      };
      expect(req.primaryKey).toEqual({ id: 1 });
      expect(req.changes).toEqual({ name: "Bob" });
    });

    it("DeleteRowsRequest supports multiple primary keys", () => {
      const req: DeleteRowsRequest = {
        connectionId: "conn-1",
        schema: "public",
        table: "users",
        primaryKeys: [{ id: 1 }, { id: 2 }, { id: 3 }],
      };
      expect(req.primaryKeys).toHaveLength(3);
    });

    it("CrudResult has expected shape", () => {
      const result: CrudResult = {
        success: true,
        affectedRows: 3,
      };
      expect(result.success).toBe(true);
      expect(result.affectedRows).toBe(3);
      expect(result.message).toBeUndefined();
    });

    it("CrudResult supports optional message", () => {
      const result: CrudResult = {
        success: false,
        affectedRows: 0,
        message: "Foreign key violation",
      };
      expect(result.success).toBe(false);
      expect(result.message).toBe("Foreign key violation");
    });
  });

  describe("MongoDB types (Phase 6)", () => {
    it("MongoCollectionInfo has expected shape", () => {
      const info: MongoCollectionInfo = {
        name: "users",
        type: "collection",
        count: 42,
      };
      expect(info.name).toBe("users");
      expect(info.type).toBe("collection");
      expect(info.count).toBe(42);
    });

    it("MongoCollectionInfo supports view type", () => {
      const info: MongoCollectionInfo = {
        name: "active_users",
        type: "view",
        count: 0,
      };
      expect(info.type).toBe("view");
    });

    it("MongoDocument has _id and dynamic fields", () => {
      const doc: MongoDocument = {
        _id: "64a1b2c3d4e5f6a7b8c9d0e1",
        name: "Alice",
        age: 30,
      };
      expect(doc._id).toBeDefined();
      expect(doc.name).toBe("Alice");
    });

    it("MongoFindRequest has expected shape", () => {
      const req: MongoFindRequest = {
        connectionId: "conn-1",
        database: "mydb",
        collection: "users",
        filter: '{"active": true}',
        page: 0,
        pageSize: 50,
        sort: '{"name": 1}',
      };
      expect(req.database).toBe("mydb");
      expect(req.sort).toBeDefined();
    });

    it("MongoFindResult has pagination fields", () => {
      const result: MongoFindResult = {
        documents: [{ _id: "abc", name: "Alice" }],
        totalCount: 100,
        page: 0,
        pageSize: 50,
        hasMore: true,
      };
      expect(result.hasMore).toBe(true);
      expect(result.documents).toHaveLength(1);
    });

    it("MongoInsertRequest has document as string", () => {
      const req: MongoInsertRequest = {
        connectionId: "conn-1",
        database: "mydb",
        collection: "users",
        document: '{"name": "Bob"}',
      };
      expect(req.document).toBe('{"name": "Bob"}');
    });

    it("MongoUpdateRequest has expected shape", () => {
      const req: MongoUpdateRequest = {
        connectionId: "conn-1",
        database: "mydb",
        collection: "users",
        documentId: "64a1b2c3d4e5f6a7b8c9d0e1",
        update: '{"name": "Updated"}',
      };
      expect(req.documentId).toBeDefined();
    });

    it("MongoDeleteRequest supports multiple IDs", () => {
      const req: MongoDeleteRequest = {
        connectionId: "conn-1",
        database: "mydb",
        collection: "users",
        documentIds: ["id1", "id2", "id3"],
      };
      expect(req.documentIds).toHaveLength(3);
    });

    it("MongoAggregateRequest has pipeline as string", () => {
      const req: MongoAggregateRequest = {
        connectionId: "conn-1",
        database: "mydb",
        collection: "users",
        pipeline: '[{"$match": {"active": true}}]',
      };
      expect(req.pipeline).toContain("$match");
    });
  });

  describe("Redis types (Phase 6)", () => {
    it("RedisValueType covers all Redis data types", () => {
      const types: RedisValueType[] = [
        "string", "list", "set", "zset", "hash", "stream", "unknown",
      ];
      expect(types).toHaveLength(7);
    });

    it("RedisKeyInfo has expected shape", () => {
      const key: RedisKeyInfo = {
        key: "user:1",
        type: "hash",
        ttl: 3600,
      };
      expect(key.key).toBe("user:1");
      expect(key.type).toBe("hash");
      expect(key.ttl).toBe(3600);
    });

    it("RedisKeyInfo ttl of -1 means no expiry", () => {
      const key: RedisKeyInfo = {
        key: "persistent",
        type: "string",
        ttl: -1,
      };
      expect(key.ttl).toBe(-1);
    });

    it("RedisScanResult has cursor and pagination", () => {
      const result: RedisScanResult = {
        keys: [{ key: "k1", type: "string", ttl: -1 }],
        cursor: "42",
        hasMore: true,
      };
      expect(result.hasMore).toBe(true);
      expect(result.cursor).toBe("42");
    });

    it("RedisGetResult has type-aware value", () => {
      const result: RedisGetResult = {
        key: "user:1",
        type: "hash",
        value: { name: "Alice", age: "30" },
        ttl: -1,
      };
      expect(result.type).toBe("hash");
      expect(result.value).toBeDefined();
    });

    it("RedisSetRequest supports optional TTL", () => {
      const req: RedisSetRequest = {
        connectionId: "conn-1",
        key: "session:abc",
        value: "data",
        ttl: 300,
      };
      expect(req.ttl).toBe(300);
    });

    it("RedisSetRequest works without TTL", () => {
      const req: RedisSetRequest = {
        connectionId: "conn-1",
        key: "permanent",
        value: "data",
      };
      expect(req.ttl).toBeUndefined();
    });

    it("RedisDeleteRequest supports multiple keys", () => {
      const req: RedisDeleteRequest = {
        connectionId: "conn-1",
        keys: ["key1", "key2", "key3"],
      };
      expect(req.keys).toHaveLength(3);
    });

    it("RedisCommandRequest has raw command string", () => {
      const req: RedisCommandRequest = {
        connectionId: "conn-1",
        command: "INFO server",
      };
      expect(req.command).toBe("INFO server");
    });

    it("RedisCommandResult has result and timing", () => {
      const result: RedisCommandResult = {
        result: "OK",
        executionTime: 5,
      };
      expect(result.executionTime).toBe(5);
    });
  });

  describe("SSH tunnel fields on ConnectionConfig (Phase 7)", () => {
    it("newConnectionConfig includes SSH defaults", () => {
      const config = newConnectionConfig("postgresql");
      expect(config.sshEnabled).toBe(false);
      expect(config.sshHost).toBe("");
      expect(config.sshPort).toBe(22);
      expect(config.sshUsername).toBe("");
      expect(config.sshAuthMethod).toBe("password");
      expect(config.sshPrivateKeyPath).toBe("");
    });

    it("SSH fields can be overridden", () => {
      const config = newConnectionConfig("mysql", {
        sshEnabled: true,
        sshHost: "jump.example.com",
      });
      expect(config.sshEnabled).toBe(true);
      expect(config.sshHost).toBe("jump.example.com");
    });
  });

  describe("Data import types (Phase 7)", () => {
    it("ImportPreviewRequest has expected shape", () => {
      const req: ImportPreviewRequest = {
        filePath: "/data/file.csv",
        format: "csv",
        maxRows: 100,
      };
      expect(req.format).toBe("csv");
    });

    it("ImportPreviewResult has expected shape", () => {
      const res: ImportPreviewResult = {
        columns: ["id", "name"],
        rows: [{ id: 1, name: "Alice" }],
        totalRows: 1,
        detectedTypes: { id: "INTEGER", name: "VARCHAR(255)" },
      };
      expect(res.columns).toHaveLength(2);
      expect(res.detectedTypes.id).toBe("INTEGER");
    });

    it("ImportExecuteRequest has expected shape", () => {
      const req: ImportExecuteRequest = {
        connectionId: "conn-1",
        schema: "public",
        table: "users",
        filePath: "/data/file.csv",
        format: "csv",
        columnMapping: { id: "INTEGER", name: "VARCHAR(255)" },
        createTable: true,
        truncateFirst: false,
      };
      expect(req.createTable).toBe(true);
    });

    it("ImportResult has expected shape", () => {
      const res: ImportResult = {
        success: true,
        rowsImported: 42,
        errors: [],
      };
      expect(res.rowsImported).toBe(42);
    });
  });

  describe("Schema diff types (Phase 7)", () => {
    it("SchemaDiffRequest has expected shape", () => {
      const req: SchemaDiffRequest = {
        sourceConnectionId: "conn-1",
        sourceSchema: "public",
        targetConnectionId: "conn-2",
        targetSchema: "public",
      };
      expect(req.sourceConnectionId).toBe("conn-1");
    });

    it("DiffStatus covers all statuses", () => {
      const statuses: DiffStatus[] = ["added", "removed", "modified", "unchanged"];
      expect(statuses).toHaveLength(4);
    });

    it("TableDiff has expected shape", () => {
      const diff: TableDiff = {
        tableName: "users",
        status: "modified",
        columnDiffs: [{
          columnName: "email",
          status: "added",
          targetColumn: {
            name: "email", dataType: "varchar(255)", nullable: true,
            defaultValue: null, isPrimaryKey: false, ordinalPosition: 3,
          },
        }],
        indexDiffs: [],
        constraintDiffs: [],
      };
      expect(diff.status).toBe("modified");
      expect(diff.columnDiffs).toHaveLength(1);
    });

    it("SchemaDiffResult has tableDiffs", () => {
      const result: SchemaDiffResult = {
        tableDiffs: [],
        sourceSchema: "public",
        targetSchema: "public",
      };
      expect(result.tableDiffs).toHaveLength(0);
    });
  });

  describe("Saved query types (Phase 7)", () => {
    it("SavedQuery has expected shape", () => {
      const query: SavedQuery = {
        id: "sq-1",
        name: "Get all users",
        sql: "SELECT * FROM users",
        createdAt: new Date().toISOString(),
        updatedAt: new Date().toISOString(),
      };
      expect(query.name).toBe("Get all users");
      expect(query.connectionId).toBeUndefined();
    });

    it("SavedQuery supports optional fields", () => {
      const query: SavedQuery = {
        id: "sq-2",
        name: "Active users",
        sql: "SELECT * FROM users WHERE active = true",
        connectionId: "conn-1",
        folder: "reports",
        createdAt: new Date().toISOString(),
        updatedAt: new Date().toISOString(),
      };
      expect(query.connectionId).toBe("conn-1");
      expect(query.folder).toBe("reports");
    });
  });

  describe("Keyboard shortcut types (Phase 7)", () => {
    it("KeyboardShortcut has expected shape", () => {
      const sc: KeyboardShortcut = {
        id: "query.execute",
        label: "Execute Query",
        defaultBinding: "Ctrl+Enter",
        customBinding: null,
      };
      expect(sc.defaultBinding).toBe("Ctrl+Enter");
      expect(sc.customBinding).toBeNull();
    });

    it("DEFAULT_SHORTCUTS has entries", () => {
      expect(DEFAULT_SHORTCUTS.length).toBeGreaterThan(0);
    });

    it("DEFAULT_SHORTCUTS entries have required fields", () => {
      for (const sc of DEFAULT_SHORTCUTS) {
        expect(sc.id).toBeDefined();
        expect(sc.label).toBeDefined();
        expect(sc.defaultBinding).toBeDefined();
        expect(sc.customBinding).toBeNull();
      }
    });
  });
});
