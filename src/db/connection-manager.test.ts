import { describe, it, expect, vi, beforeEach } from "vitest";
import type { DatabaseDriver } from "./types";
import type { ConnectionConfig } from "../shared/types/database";

// Mock electron-store
vi.mock("electron-store", () => {
  return {
    default: class MockStore {
      private data: Record<string, unknown>;
      constructor(opts: { defaults?: Record<string, unknown> } = {}) {
        this.data = { ...(opts.defaults ?? {}) };
      }
      get(key: string) {
        return this.data[key];
      }
      set(key: string, value: unknown) {
        this.data[key] = value;
      }
    },
  };
});

// Mock electron safeStorage
vi.mock("electron", () => ({
  safeStorage: {
    isEncryptionAvailable: () => true,
    encryptString: (text: string) => Buffer.from(`enc:${text}`),
    decryptString: (buffer: Buffer) =>
      buffer.toString().replace("enc:", ""),
  },
}));

// Mock the driver factory
const mockDriver: DatabaseDriver = {
  connect: vi.fn().mockResolvedValue(undefined),
  disconnect: vi.fn().mockResolvedValue(undefined),
  ping: vi.fn().mockResolvedValue(undefined),
  isConnected: vi.fn().mockReturnValue(true),
  getSchemas: vi.fn().mockResolvedValue([{ name: "public" }]),
  getTables: vi.fn().mockResolvedValue([
    { name: "users", schema: "public", type: "table" },
  ]),
  getTableStructure: vi.fn().mockResolvedValue({
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
    indexes: [],
    constraints: [],
  }),
  getRoutines: vi.fn().mockResolvedValue([]),
  getTableData: vi.fn().mockResolvedValue({
    columns: ["id"],
    rows: [{ id: 1 }],
    totalRows: 1,
    page: 0,
    pageSize: 50,
    hasMore: false,
  }),
};

vi.mock("./drivers", () => ({
  createDriver: vi.fn(() => ({ ...mockDriver })),
}));

describe("connection-manager", () => {
  let manager: typeof import("./connection-manager");

  beforeEach(async () => {
    vi.resetModules();
    // Re-import to get fresh state
    manager = await import("./connection-manager");
    await manager.initConnectionManager();
  });

  const pgConfig: ConnectionConfig = {
    id: "",
    name: "Test PG",
    type: "postgresql",
    host: "localhost",
    port: 5432,
    database: "testdb",
    username: "user",
    ssl: false,
    filepath: "",
    connectionTimeout: 15000,
    poolSize: 5,
  };

  it("lists no connections initially", () => {
    const conns = manager.listConnections();
    expect(conns).toEqual([]);
  });

  it("saves a connection and lists it", () => {
    const saved = manager.saveConnection({ ...pgConfig }, "secret");
    expect(saved.id).toBeTruthy();
    expect(saved.name).toBe("Test PG");
    expect(saved.type).toBe("postgresql");
    expect(saved.hasPassword).toBe(true);

    const list = manager.listConnections();
    expect(list).toHaveLength(1);
    expect(list[0].name).toBe("Test PG");
  });

  it("saves connection without password", () => {
    const saved = manager.saveConnection({ ...pgConfig });
    expect(saved.hasPassword).toBe(false);
  });

  it("generates an id for new connections", () => {
    const saved = manager.saveConnection({ ...pgConfig });
    expect(saved.id).toBeTruthy();
    expect(saved.id).not.toBe("");
  });

  it("updates an existing connection", () => {
    const saved = manager.saveConnection({ ...pgConfig });
    const updated = manager.saveConnection({
      ...pgConfig,
      id: saved.id,
      name: "Updated PG",
    });
    expect(updated.id).toBe(saved.id);
    expect(updated.name).toBe("Updated PG");
    expect(manager.listConnections()).toHaveLength(1);
  });

  it("deletes a connection", async () => {
    const saved = manager.saveConnection({ ...pgConfig }, "secret");
    await manager.removeConnection(saved.id);
    expect(manager.listConnections()).toHaveLength(0);
  });

  it("returns connection statuses", () => {
    manager.saveConnection({ ...pgConfig });
    const statuses = manager.getConnectionStatuses();
    expect(statuses).toHaveLength(1);
    expect(statuses[0].connected).toBe(false);
  });

  it("test connection returns success", async () => {
    const result = await manager.testConnection(pgConfig, "secret");
    expect(result.success).toBe(true);
    expect(result.message).toBe("Connection successful");
  });

  it("test connection returns failure on error", async () => {
    const { createDriver } = await import("./drivers");
    (createDriver as ReturnType<typeof vi.fn>).mockReturnValueOnce({
      connect: vi.fn().mockRejectedValue(new Error("Connection refused")),
      disconnect: vi.fn().mockResolvedValue(undefined),
      ping: vi.fn(),
      isConnected: vi.fn().mockReturnValue(false),
    });

    const result = await manager.testConnection(pgConfig, "bad");
    expect(result.success).toBe(false);
    expect(result.message).toContain("Connection refused");
  });

  // Phase 3: Schema introspection tests
  describe("schema introspection", () => {
    it("getSchemas throws when not connected", async () => {
      const saved = manager.saveConnection({ ...pgConfig });
      await expect(manager.getSchemas(saved.id)).rejects.toThrow("not active");
    });

    it("getSchemas returns schemas for connected db", async () => {
      const saved = manager.saveConnection({ ...pgConfig });
      await manager.connectToDb(saved.id);
      const schemas = await manager.getSchemas(saved.id);
      expect(schemas).toEqual([{ name: "public" }]);
    });

    it("getTables returns tables for connected db", async () => {
      const saved = manager.saveConnection({ ...pgConfig });
      await manager.connectToDb(saved.id);
      const tables = await manager.getTables(saved.id, "public");
      expect(tables).toHaveLength(1);
      expect(tables[0].name).toBe("users");
    });

    it("getTableStructure returns structure for connected db", async () => {
      const saved = manager.saveConnection({ ...pgConfig });
      await manager.connectToDb(saved.id);
      const structure = await manager.getTableStructure(saved.id, "public", "users");
      expect(structure.columns).toHaveLength(1);
      expect(structure.columns[0].name).toBe("id");
    });

    it("getRoutines returns empty array for connected db", async () => {
      const saved = manager.saveConnection({ ...pgConfig });
      await manager.connectToDb(saved.id);
      const routines = await manager.getRoutines(saved.id, "public");
      expect(routines).toEqual([]);
    });

    it("getTableData returns paginated data", async () => {
      const saved = manager.saveConnection({ ...pgConfig });
      await manager.connectToDb(saved.id);
      const data = await manager.getTableData(saved.id, "public", "users", 0, 50);
      expect(data.columns).toEqual(["id"]);
      expect(data.rows).toHaveLength(1);
      expect(data.totalRows).toBe(1);
      expect(data.hasMore).toBe(false);
    });
  });
});
