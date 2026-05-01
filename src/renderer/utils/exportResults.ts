/** Utilities for exporting query results to CSV, JSON, and SQL INSERT formats. */

import type { ExecuteQueryResult, ExportFormat } from "@shared/types/database";

export function exportResults(
  result: ExecuteQueryResult,
  format: ExportFormat,
  tableName = "exported_table",
): string {
  switch (format) {
    case "csv":
      return toCsv(result);
    case "json":
      return toJson(result);
    case "sql":
      return toSqlInsert(result, tableName);
  }
}

function escapeCsvField(value: unknown): string {
  if (value === null || value === undefined) return "";
  const str = typeof value === "object" ? JSON.stringify(value) : String(value);
  if (str.includes(",") || str.includes('"') || str.includes("\n")) {
    return `"${str.replace(/"/g, '""')}"`;
  }
  return str;
}

function toCsv(result: ExecuteQueryResult): string {
  const header = result.columns.map(escapeCsvField).join(",");
  const rows = result.rows.map((row) =>
    result.columns.map((col) => escapeCsvField(row[col])).join(","),
  );
  return [header, ...rows].join("\n");
}

function toJson(result: ExecuteQueryResult): string {
  return JSON.stringify(result.rows, null, 2);
}

function toSqlInsert(result: ExecuteQueryResult, tableName: string): string {
  if (result.rows.length === 0) return `-- No data to export from ${tableName}`;

  const safeTable = tableName.replace(/[^a-zA-Z0-9_.]/g, "_");
  const cols = result.columns.map((c) => `"${c.replace(/"/g, '""')}"`).join(", ");

  return result.rows
    .map((row) => {
      const values = result.columns
        .map((col) => {
          const val = row[col];
          if (val === null || val === undefined) return "NULL";
          if (typeof val === "number" || typeof val === "bigint") return String(val);
          if (typeof val === "boolean") return val ? "TRUE" : "FALSE";
          if (typeof val === "object") {
            const json = JSON.stringify(val);
            return `'${json.replace(/'/g, "''")}'`;
          }
          return `'${String(val).replace(/'/g, "''")}'`;
        })
        .join(", ");
      return `INSERT INTO ${safeTable} (${cols}) VALUES (${values});`;
    })
    .join("\n");
}

export function getExportFileExtension(format: ExportFormat): string {
  switch (format) {
    case "csv": return "csv";
    case "json": return "json";
    case "sql": return "sql";
  }
}

export function getExportMimeFilters(format: ExportFormat): { name: string; extensions: string[] }[] {
  switch (format) {
    case "csv": return [{ name: "CSV Files", extensions: ["csv"] }];
    case "json": return [{ name: "JSON Files", extensions: ["json"] }];
    case "sql": return [{ name: "SQL Files", extensions: ["sql"] }];
  }
}
