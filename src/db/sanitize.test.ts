import { describe, it, expect } from "vitest";
import {
  escapePgId,
  escapeMysqlId,
  escapeMssqlId,
  isValidSqlType,
  sanitizeErrorMessage,
  isValidPort,
} from "./sanitize";

describe("SQL Identifier Escaping", () => {
  describe("escapePgId (PostgreSQL / SQLite)", () => {
    it("wraps simple name in double quotes", () => {
      expect(escapePgId("users")).toBe('"users"');
    });

    it("doubles embedded double quotes", () => {
      expect(escapePgId('my"table')).toBe('"my""table"');
    });

    it("handles names with injection attempts", () => {
      const malicious = '"; DROP TABLE users; --';
      const escaped = escapePgId(malicious);
      // Input: "  →  doubled to ""  →  wrapped = " + "" + ; DROP TABLE... + "
      expect(escaped).toBe('"""; DROP TABLE users; --"');
      expect(escaped.startsWith('"')).toBe(true);
      expect(escaped.endsWith('"')).toBe(true);
    });

    it("handles empty string", () => {
      expect(escapePgId("")).toBe('""');
    });

    it("handles name with multiple double quotes", () => {
      expect(escapePgId('a""b')).toBe('"a""""b"');
    });
  });

  describe("escapeMysqlId (MySQL)", () => {
    it("wraps simple name in backticks", () => {
      expect(escapeMysqlId("users")).toBe("`users`");
    });

    it("doubles embedded backticks", () => {
      expect(escapeMysqlId("my`table")).toBe("`my``table`");
    });

    it("handles injection attempts", () => {
      const malicious = "` ; DROP TABLE users; --";
      const escaped = escapeMysqlId(malicious);
      expect(escaped.startsWith("`")).toBe(true);
      expect(escaped.endsWith("`")).toBe(true);
      expect(escaped).toBe("``` ; DROP TABLE users; --`");
    });
  });

  describe("escapeMssqlId (MSSQL)", () => {
    it("wraps simple name in square brackets", () => {
      expect(escapeMssqlId("users")).toBe("[users]");
    });

    it("doubles embedded close brackets", () => {
      expect(escapeMssqlId("my]table")).toBe("[my]]table]");
    });

    it("handles injection attempts", () => {
      const malicious = "]; DROP TABLE users; --";
      const escaped = escapeMssqlId(malicious);
      expect(escaped.startsWith("[")).toBe(true);
      expect(escaped.endsWith("]")).toBe(true);
      expect(escaped).toBe("[]]; DROP TABLE users; --]");
    });
  });
});

describe("SQL Type Validation", () => {
  it("accepts common safe types", () => {
    expect(isValidSqlType("INTEGER")).toBe(true);
    expect(isValidSqlType("TEXT")).toBe(true);
    expect(isValidSqlType("BOOLEAN")).toBe(true);
    expect(isValidSqlType("VARCHAR(255)")).toBe(true);
    expect(isValidSqlType("DOUBLE PRECISION")).toBe(true);
    expect(isValidSqlType("DECIMAL(10,2)")).toBe(true);
    expect(isValidSqlType("NVARCHAR(100)")).toBe(true);
    expect(isValidSqlType("BIGINT")).toBe(true);
    expect(isValidSqlType("JSON")).toBe(true);
    expect(isValidSqlType("BYTEA")).toBe(true);
  });

  it("is case insensitive", () => {
    expect(isValidSqlType("integer")).toBe(true);
    expect(isValidSqlType("varchar(255)")).toBe(true);
  });

  it("rejects dangerous type strings", () => {
    expect(isValidSqlType("INTEGER; DROP TABLE users")).toBe(false);
    expect(isValidSqlType("TEXT); DROP TABLE users; --")).toBe(false);
    expect(isValidSqlType("' OR 1=1 --")).toBe(false);
    expect(isValidSqlType("FUNCTION evil()")).toBe(false);
  });

  it("rejects empty and arbitrary strings", () => {
    expect(isValidSqlType("")).toBe(false);
    expect(isValidSqlType("FOOBAR")).toBe(false);
    expect(isValidSqlType("SELECT 1")).toBe(false);
  });
});

describe("Error Message Sanitization", () => {
  it("strips password from connection strings", () => {
    const msg = "FATAL: password=SuperSecret123 authentication failed";
    const sanitized = sanitizeErrorMessage(msg);
    expect(sanitized).not.toContain("SuperSecret123");
    expect(sanitized).toContain("password=***");
  });

  it("strips URI credentials", () => {
    const msg = 'failed to connect to mongodb://admin:pass123@host:27017/mydb';
    const sanitized = sanitizeErrorMessage(msg);
    expect(sanitized).not.toContain("admin:pass123");
    expect(sanitized).toContain("mongodb://***@");
  });

  it("strips postgres URI credentials", () => {
    const msg = "connection to postgresql://user:pw@localhost:5432 failed";
    const sanitized = sanitizeErrorMessage(msg);
    expect(sanitized).not.toContain("user:pw");
  });

  it("passes through safe messages unchanged", () => {
    const msg = "Connection refused on port 5432";
    expect(sanitizeErrorMessage(msg)).toBe(msg);
  });
});

describe("Port Validation", () => {
  it("accepts valid ports", () => {
    expect(isValidPort(1)).toBe(true);
    expect(isValidPort(80)).toBe(true);
    expect(isValidPort(5432)).toBe(true);
    expect(isValidPort(65535)).toBe(true);
  });

  it("rejects invalid ports", () => {
    expect(isValidPort(0)).toBe(false);
    expect(isValidPort(-1)).toBe(false);
    expect(isValidPort(65536)).toBe(false);
    expect(isValidPort(1.5)).toBe(false);
    expect(isValidPort(NaN)).toBe(false);
  });
});
