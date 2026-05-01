/**
 * Data import module — parses CSV/JSON files and imports data into SQL tables.
 * Runs in the main process only.
 */

import { readFile } from "fs/promises";
import type {
  ImportPreviewResult,
  ImportResult,
} from "../shared/types/database";
import type { DatabaseDriver } from "./types";
import { isValidSqlType } from "./sanitize";

/** Parse CSV text into rows. Handles quoted fields with commas/newlines. */
function parseCsv(text: string): { headers: string[]; rows: Record<string, unknown>[] } {
  const lines: string[][] = [];
  let current: string[] = [];
  let field = "";
  let inQuote = false;

  for (let i = 0; i < text.length; i++) {
    const ch = text[i];
    if (inQuote) {
      if (ch === '"') {
        if (i + 1 < text.length && text[i + 1] === '"') {
          field += '"';
          i++;
        } else {
          inQuote = false;
        }
      } else {
        field += ch;
      }
    } else if (ch === '"') {
      inQuote = true;
    } else if (ch === ",") {
      current.push(field);
      field = "";
    } else if (ch === "\n" || (ch === "\r" && text[i + 1] === "\n")) {
      current.push(field);
      field = "";
      if (current.length > 1 || current[0] !== "") {
        lines.push(current);
      }
      current = [];
      if (ch === "\r") i++;
    } else {
      field += ch;
    }
  }
  // Last field
  current.push(field);
  if (current.length > 1 || current[0] !== "") {
    lines.push(current);
  }

  if (lines.length === 0) {
    return { headers: [], rows: [] };
  }

  const headers = lines[0].map((h) => h.trim());
  const rows: Record<string, unknown>[] = [];
  for (let i = 1; i < lines.length; i++) {
    const row: Record<string, unknown> = {};
    for (let j = 0; j < headers.length; j++) {
      const raw = lines[i][j]?.trim() ?? "";
      row[headers[j]] = parseValue(raw);
    }
    rows.push(row);
  }

  return { headers, rows };
}

/** Try to parse a string value into a typed value. */
function parseValue(raw: string): unknown {
  if (raw === "" || raw.toLowerCase() === "null") return null;
  if (raw.toLowerCase() === "true") return true;
  if (raw.toLowerCase() === "false") return false;
  const num = Number(raw);
  if (!isNaN(num) && raw !== "") return num;
  return raw;
}

/** Detect likely SQL types from sample values. */
function detectColumnTypes(
  columns: string[],
  rows: Record<string, unknown>[],
): Record<string, string> {
  const types: Record<string, string> = {};
  for (const col of columns) {
    let hasInt = false;
    let hasFloat = false;
    let hasBool = false;
    let hasString = false;
    let maxLen = 0;

    for (const row of rows.slice(0, 100)) {
      const val = row[col];
      if (val === null || val === undefined) continue;
      if (typeof val === "boolean") {
        hasBool = true;
      } else if (typeof val === "number") {
        if (Number.isInteger(val)) hasInt = true;
        else hasFloat = true;
      } else {
        hasString = true;
        maxLen = Math.max(maxLen, String(val).length);
      }
    }

    if (hasString) {
      types[col] = maxLen > 255 ? "TEXT" : "VARCHAR(255)";
    } else if (hasFloat) {
      types[col] = "DOUBLE PRECISION";
    } else if (hasInt) {
      types[col] = "INTEGER";
    } else if (hasBool) {
      types[col] = "BOOLEAN";
    } else {
      types[col] = "TEXT";
    }
  }
  return types;
}

export async function previewImport(
  filePath: string,
  format: "csv" | "json",
  maxRows = 100,
): Promise<ImportPreviewResult> {
  const content = await readFile(filePath, "utf-8");

  let columns: string[];
  let allRows: Record<string, unknown>[];

  if (format === "json") {
    const parsed = JSON.parse(content);
    const arr: unknown[] = Array.isArray(parsed) ? parsed : [parsed];
    allRows = arr.filter((item): item is Record<string, unknown> =>
      typeof item === "object" && item !== null && !Array.isArray(item),
    );
    const colSet = new Set<string>();
    for (const row of allRows) {
      for (const key of Object.keys(row)) colSet.add(key);
    }
    columns = Array.from(colSet);
  } else {
    const result = parseCsv(content);
    columns = result.headers;
    allRows = result.rows;
  }

  const detectedTypes = detectColumnTypes(columns, allRows);

  return {
    columns,
    rows: allRows.slice(0, maxRows),
    totalRows: allRows.length,
    detectedTypes,
  };
}

export async function executeImport(
  driver: DatabaseDriver,
  schema: string,
  table: string,
  filePath: string,
  format: "csv" | "json",
  columnMapping: Record<string, string>,
  createTable: boolean,
  truncateFirst: boolean,
): Promise<ImportResult> {
  const content = await readFile(filePath, "utf-8");
  const errors: string[] = [];

  let allRows: Record<string, unknown>[];
  if (format === "json") {
    const parsed = JSON.parse(content);
    const arr: unknown[] = Array.isArray(parsed) ? parsed : [parsed];
    allRows = arr.filter((item): item is Record<string, unknown> =>
      typeof item === "object" && item !== null && !Array.isArray(item),
    );
  } else {
    allRows = parseCsv(content).rows;
  }

  const columns = Object.keys(columnMapping);

  // Validate SQL types against allowlist to prevent injection via type strings
  for (const col of columns) {
    if (!isValidSqlType(columnMapping[col])) {
      return {
        success: false,
        rowsImported: 0,
        errors: [`Invalid SQL type "${columnMapping[col]}" for column "${col}"`],
      };
    }
  }

  const esc = (name: string) => driver.escapeIdentifier(name);

  // Create table if requested
  if (createTable) {
    const colDefs = columns
      .map((col) => `${esc(col)} ${columnMapping[col]}`)
      .join(", ");
    const createSql = `CREATE TABLE IF NOT EXISTS ${esc(schema)}.${esc(table)} (${colDefs})`;
    try {
      await driver.executeQuery(createSql);
    } catch (err) {
      return {
        success: false,
        rowsImported: 0,
        errors: [`Failed to create table: ${err instanceof Error ? err.message : String(err)}`],
      };
    }
  }

  // Truncate if requested
  if (truncateFirst) {
    try {
      await driver.executeQuery(`TRUNCATE TABLE ${esc(schema)}.${esc(table)}`);
    } catch {
      // Try DELETE if TRUNCATE not supported
      try {
        await driver.executeQuery(`DELETE FROM ${esc(schema)}.${esc(table)}`);
      } catch (err) {
        errors.push(`Warning: could not truncate table: ${err instanceof Error ? err.message : String(err)}`);
      }
    }
  }

  // Insert rows in batches via individual parameterized inserts through the driver
  let imported = 0;
  for (let i = 0; i < allRows.length; i++) {
    const row: Record<string, unknown> = {};
    for (const col of columns) {
      if (col in allRows[i]) {
        row[col] = allRows[i][col];
      }
    }

    try {
      await driver.insertRow(schema, table, row);
      imported++;
    } catch (err) {
      const msg = err instanceof Error ? err.message : String(err);
      errors.push(`Row ${i + 1}: ${msg}`);
      // Continue importing other rows
    }
  }

  return {
    success: errors.length === 0,
    rowsImported: imported,
    errors,
  };
}
