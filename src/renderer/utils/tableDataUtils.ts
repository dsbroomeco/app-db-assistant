/**
 * Parses a raw string from a table cell input into a typed value suitable
 * for sending to the database driver.
 *
 * - Empty string or "null" (case-insensitive) → null
 * - Numeric strings (non-whitespace-only) → number
 * - Everything else → the raw string unchanged
 */
export function parseEditValue(raw: string): unknown {
    if (raw === "" || raw.toLowerCase() === "null") return null;
    if (raw.trim() !== "" && !isNaN(Number(raw))) return Number(raw);
    return raw;
}
