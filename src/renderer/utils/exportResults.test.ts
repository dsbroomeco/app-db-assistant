import { describe, it, expect } from "vitest";
import {
  exportResults,
  getExportFileExtension,
  getExportMimeFilters,
} from "./exportResults";
import type { ExecuteQueryResult, ExportFormat } from "@shared/types/database";

const mockResult: ExecuteQueryResult = {
  columns: ["id", "name", "active"],
  rows: [
    { id: 1, name: "Alice", active: true },
    { id: 2, name: "Bob", active: false },
    { id: 3, name: "Charlie", active: null },
  ],
  rowCount: 3,
  executionTime: 42,
  isModification: false,
};

describe("exportResults", () => {
  describe("CSV export", () => {
    it("produces correct CSV with header", () => {
      const csv = exportResults(mockResult, "csv");
      const lines = csv.split("\n");
      expect(lines[0]).toBe("id,name,active");
      expect(lines).toHaveLength(4); // header + 3 rows
    });

    it("includes all rows", () => {
      const csv = exportResults(mockResult, "csv");
      const lines = csv.split("\n");
      expect(lines[1]).toBe("1,Alice,true");
      expect(lines[2]).toBe("2,Bob,false");
      expect(lines[3]).toBe("3,Charlie,");
    });

    it("escapes fields containing commas", () => {
      const result: ExecuteQueryResult = {
        columns: ["data"],
        rows: [{ data: "hello, world" }],
        rowCount: 1,
        executionTime: 1,
        isModification: false,
      };
      const csv = exportResults(result, "csv");
      expect(csv).toContain('"hello, world"');
    });

    it("escapes fields containing quotes", () => {
      const result: ExecuteQueryResult = {
        columns: ["data"],
        rows: [{ data: 'say "hi"' }],
        rowCount: 1,
        executionTime: 1,
        isModification: false,
      };
      const csv = exportResults(result, "csv");
      expect(csv).toContain('"say ""hi"""');
    });

    it("escapes fields containing newlines", () => {
      const result: ExecuteQueryResult = {
        columns: ["data"],
        rows: [{ data: "line1\nline2" }],
        rowCount: 1,
        executionTime: 1,
        isModification: false,
      };
      const csv = exportResults(result, "csv");
      expect(csv).toContain('"line1\nline2"');
    });
  });

  describe("JSON export", () => {
    it("produces valid JSON array", () => {
      const json = exportResults(mockResult, "json");
      const parsed = JSON.parse(json);
      expect(Array.isArray(parsed)).toBe(true);
      expect(parsed).toHaveLength(3);
    });

    it("preserves data types", () => {
      const json = exportResults(mockResult, "json");
      const parsed = JSON.parse(json);
      expect(parsed[0].id).toBe(1);
      expect(parsed[0].name).toBe("Alice");
      expect(parsed[0].active).toBe(true);
    });

    it("preserves null values", () => {
      const json = exportResults(mockResult, "json");
      const parsed = JSON.parse(json);
      expect(parsed[2].active).toBeNull();
    });
  });

  describe("SQL INSERT export", () => {
    it("generates INSERT statements", () => {
      const sql = exportResults(mockResult, "sql", "users");
      const lines = sql.split("\n");
      expect(lines).toHaveLength(3);
      expect(lines[0]).toMatch(/^INSERT INTO users/);
    });

    it("includes column names", () => {
      const sql = exportResults(mockResult, "sql", "users");
      expect(sql).toContain('"id"');
      expect(sql).toContain('"name"');
      expect(sql).toContain('"active"');
    });

    it("handles NULL values", () => {
      const sql = exportResults(mockResult, "sql", "users");
      expect(sql).toContain("NULL");
    });

    it("escapes single quotes in strings", () => {
      const result: ExecuteQueryResult = {
        columns: ["name"],
        rows: [{ name: "O'Brien" }],
        rowCount: 1,
        executionTime: 1,
        isModification: false,
      };
      const sql = exportResults(result, "sql", "users");
      expect(sql).toContain("O''Brien");
    });

    it("returns comment for empty results", () => {
      const result: ExecuteQueryResult = {
        columns: ["id"],
        rows: [],
        rowCount: 0,
        executionTime: 1,
        isModification: false,
      };
      const sql = exportResults(result, "sql", "users");
      expect(sql).toMatch(/^--/);
    });

    it("uses default table name when not specified", () => {
      const sql = exportResults(mockResult, "sql");
      expect(sql).toContain("exported_table");
    });

    it("sanitizes table name", () => {
      const sql = exportResults(mockResult, "sql", "my;table DROP");
      // The semicolon in the table name should be replaced, but statement-ending semicolons are ok
      expect(sql).toContain("my_table_DROP");
      expect(sql).not.toContain("my;table");
    });
  });
});

describe("getExportFileExtension", () => {
  it("returns correct extensions", () => {
    expect(getExportFileExtension("csv")).toBe("csv");
    expect(getExportFileExtension("json")).toBe("json");
    expect(getExportFileExtension("sql")).toBe("sql");
  });
});

describe("getExportMimeFilters", () => {
  it("returns filters for each format", () => {
    const formats: ExportFormat[] = ["csv", "json", "sql"];
    for (const fmt of formats) {
      const filters = getExportMimeFilters(fmt);
      expect(filters).toHaveLength(1);
      expect(filters[0].extensions).toHaveLength(1);
    }
  });
});
