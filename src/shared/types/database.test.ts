import { describe, it, expect } from "vitest";
import {
  newConnectionConfig,
  DEFAULT_PORTS,
  DATABASE_TYPE_LABELS,
} from "./database";
import type { DatabaseType, ConnectionConfig } from "./database";

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
});
