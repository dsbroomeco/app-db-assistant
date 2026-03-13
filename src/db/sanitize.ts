/**
 * SQL identifier escaping and input sanitization utilities.
 * Prevents SQL injection through identifier names (schema, table, column).
 */

/**
 * Escape a PostgreSQL/SQLite identifier by doubling any embedded
 * double-quotes, then wrapping in double-quotes.
 */
export function escapePgId(name: string): string {
  return `"${name.replace(/"/g, '""')}"`;
}

/**
 * Escape a MySQL identifier by doubling any embedded backticks,
 * then wrapping in backticks.
 */
export function escapeMysqlId(name: string): string {
  return `\`${name.replace(/`/g, "``")}\``;
}

/**
 * Escape an MSSQL identifier by doubling any embedded close-brackets,
 * then wrapping in square brackets.
 */
export function escapeMssqlId(name: string): string {
  return `[${name.replace(/\]/g, "]]")}]`;
}

/** Known safe SQL column type patterns for data import. */
const SAFE_TYPE_EXACT = new Set([
  "INTEGER",
  "INT",
  "SMALLINT",
  "BIGINT",
  "TINYINT",
  "SERIAL",
  "BIGSERIAL",
  "REAL",
  "FLOAT",
  "DOUBLE",
  "DOUBLE PRECISION",
  "MONEY",
  "SMALLMONEY",
  "TEXT",
  "NTEXT",
  "BOOLEAN",
  "BOOL",
  "BIT",
  "DATE",
  "TIME",
  "TIMESTAMP",
  "DATETIME",
  "DATETIME2",
  "SMALLDATETIME",
  "BLOB",
  "BYTEA",
  "IMAGE",
  "JSON",
  "JSONB",
  "XML",
  "UUID",
  "UNIQUEIDENTIFIER",
]);

/** Validate that a SQL type string is a safe, known type. */
export function isValidSqlType(sqlType: string): boolean {
  const normalized = sqlType.trim().toUpperCase();
  if (SAFE_TYPE_EXACT.has(normalized)) return true;
  // Allow VARCHAR(n), CHAR(n), NCHAR(n), NVARCHAR(n)
  if (/^N?(VAR)?CHAR\(\d+\)$/i.test(normalized)) return true;
  // Allow DECIMAL(p), DECIMAL(p,s), NUMERIC(p), NUMERIC(p,s)
  if (/^(DECIMAL|NUMERIC)\(\d+(,\s?\d+)?\)$/i.test(normalized)) return true;
  // Allow VARBINARY(n), BINARY(n)
  if (/^(VAR)?BINARY\(\d+\)$/i.test(normalized)) return true;
  return false;
}

/** Sanitize error messages to strip potential credential leaks. */
export function sanitizeErrorMessage(message: string): string {
  let sanitized = message;
  // Strip passwords from connection strings or error text
  sanitized = sanitized.replace(/password[=:]\s*\S+/gi, "password=***");
  // Strip connection URI credentials
  sanitized = sanitized.replace(
    /(mongodb|postgres(ql)?|mysql|mssql|redis|sqlserver):\/\/[^@\s]*@/gi,
    "$1://***@",
  );
  return sanitized;
}

/** Validate a TCP port number is within valid range. */
export function isValidPort(port: number): boolean {
  return Number.isInteger(port) && port >= 1 && port <= 65535;
}
