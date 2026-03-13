import { useState, useCallback } from "react";
import { useConnections } from "../context/ConnectionContext";
import type { ImportPreviewResult, ImportResult } from "@shared/types/database";
import styles from "./DataImportView.module.css";

interface DataImportViewProps {
    connectionId: string;
}

export function DataImportView({ connectionId }: DataImportViewProps) {
    const { connections, isConnected } = useConnections();
    const conn = connections.find((c) => c.id === connectionId);

    const [filePath, setFilePath] = useState("");
    const [format, setFormat] = useState<"csv" | "json">("csv");
    const [schema, setSchema] = useState("public");
    const [table, setTable] = useState("");
    const [createTable, setCreateTable] = useState(true);
    const [truncateFirst, setTruncateFirst] = useState(false);
    const [preview, setPreview] = useState<ImportPreviewResult | null>(null);
    const [columnMapping, setColumnMapping] = useState<Record<string, string>>({});
    const [importing, setImporting] = useState(false);
    const [result, setResult] = useState<ImportResult | null>(null);
    const [error, setError] = useState("");

    const handleBrowse = useCallback(async () => {
        const fp = await window.electronAPI.invoke("dialog:open-file", {
            title: "Select Data File",
            filters: [
                { name: "CSV Files", extensions: ["csv"] },
                { name: "JSON Files", extensions: ["json"] },
                { name: "All Files", extensions: ["*"] },
            ],
        });
        if (fp) {
            setFilePath(fp);
            // Auto-detect format
            if (fp.endsWith(".json")) setFormat("json");
            else setFormat("csv");
        }
    }, []);

    const handlePreview = useCallback(async () => {
        if (!filePath) return;
        setError("");
        setResult(null);
        try {
            const prev: ImportPreviewResult = await window.electronAPI.invoke(
                "import:preview",
                { filePath, format, maxRows: 50 },
            );
            setPreview(prev);
            // Initialize column mapping from detected types
            const mapping: Record<string, string> = {};
            for (const col of prev.columns) {
                mapping[col] = prev.detectedTypes[col] ?? "VARCHAR(255)";
            }
            setColumnMapping(mapping);
            if (!table) setTable(filePath.split(/[/\\]/).pop()?.replace(/\.[^.]+$/, "") ?? "imported_data");
        } catch (err) {
            setError(err instanceof Error ? err.message : String(err));
        }
    }, [filePath, format, table]);

    const handleImport = useCallback(async () => {
        if (!preview || !table) return;
        setImporting(true);
        setError("");
        setResult(null);
        try {
            const res: ImportResult = await window.electronAPI.invoke(
                "import:execute",
                {
                    connectionId,
                    schema,
                    table,
                    filePath,
                    format,
                    columnMapping,
                    createTable,
                    truncateFirst,
                },
            );
            setResult(res);
        } catch (err) {
            setError(err instanceof Error ? err.message : String(err));
        } finally {
            setImporting(false);
        }
    }, [connectionId, schema, table, filePath, format, columnMapping, createTable, truncateFirst, preview]);

    if (!conn || !isConnected(connectionId)) {
        return <div className={styles.info}>Connection is not active. Please connect first.</div>;
    }

    return (
        <div className={styles.container}>
            <div className={styles.toolbar}>
                <label>Import Data into: {conn.name}</label>
            </div>

            <div className={styles.setupPanel}>
                {/* File Selection */}
                <div className={styles.field}>
                    <span className={styles.fieldLabel}>Data File</span>
                    <div className={styles.row}>
                        <input
                            className={styles.input}
                            type="text"
                            value={filePath}
                            onChange={(e) => setFilePath(e.target.value)}
                            placeholder="Select a CSV or JSON file…"
                        />
                        <button className={styles.btnSecondary} onClick={handleBrowse}>
                            Browse…
                        </button>
                    </div>
                </div>

                <div className={styles.row}>
                    <div className={styles.field}>
                        <span className={styles.fieldLabel}>Format</span>
                        <select
                            className={styles.select}
                            value={format}
                            onChange={(e) => setFormat(e.target.value as "csv" | "json")}
                        >
                            <option value="csv">CSV</option>
                            <option value="json">JSON</option>
                        </select>
                    </div>
                    <div className={styles.field}>
                        <span className={styles.fieldLabel}>Schema</span>
                        <input
                            className={styles.input}
                            type="text"
                            value={schema}
                            onChange={(e) => setSchema(e.target.value)}
                            placeholder="public"
                        />
                    </div>
                    <div className={styles.field}>
                        <span className={styles.fieldLabel}>Table Name</span>
                        <input
                            className={styles.input}
                            type="text"
                            value={table}
                            onChange={(e) => setTable(e.target.value)}
                            placeholder="my_table"
                        />
                    </div>
                </div>

                <div className={styles.row}>
                    <label className={styles.checkboxLabel}>
                        <input
                            type="checkbox"
                            checked={createTable}
                            onChange={(e) => setCreateTable(e.target.checked)}
                        />
                        <span>Create table if not exists</span>
                    </label>
                    <label className={styles.checkboxLabel}>
                        <input
                            type="checkbox"
                            checked={truncateFirst}
                            onChange={(e) => setTruncateFirst(e.target.checked)}
                        />
                        <span>Truncate table before import</span>
                    </label>
                </div>

                <button
                    className={styles.btn}
                    onClick={handlePreview}
                    disabled={!filePath}
                >
                    Preview
                </button>
            </div>

            {error && <div className={styles.error}>{error}</div>}

            {preview && (
                <>
                    <div className={styles.previewSection}>
                        <div className={styles.previewHeader}>
                            Preview ({preview.totalRows} total rows, showing first {preview.rows.length})
                        </div>
                        <div className={styles.tableWrapper}>
                            <table className={styles.table}>
                                <thead>
                                    <tr>
                                        {preview.columns.map((col) => (
                                            <th key={col}>
                                                {col}
                                                <br />
                                                <select
                                                    className={styles.select}
                                                    value={columnMapping[col] ?? "VARCHAR(255)"}
                                                    onChange={(e) =>
                                                        setColumnMapping((prev) => ({
                                                            ...prev,
                                                            [col]: e.target.value,
                                                        }))
                                                    }
                                                >
                                                    <option value="VARCHAR(255)">VARCHAR(255)</option>
                                                    <option value="TEXT">TEXT</option>
                                                    <option value="INTEGER">INTEGER</option>
                                                    <option value="DOUBLE PRECISION">DOUBLE PRECISION</option>
                                                    <option value="BOOLEAN">BOOLEAN</option>
                                                    <option value="DATE">DATE</option>
                                                    <option value="TIMESTAMP">TIMESTAMP</option>
                                                </select>
                                            </th>
                                        ))}
                                    </tr>
                                </thead>
                                <tbody>
                                    {preview.rows.map((row, i) => (
                                        <tr key={i}>
                                            {preview.columns.map((col) => (
                                                <td key={col}>{String(row[col] ?? "")}</td>
                                            ))}
                                        </tr>
                                    ))}
                                </tbody>
                            </table>
                        </div>
                    </div>

                    <div className={styles.footer}>
                        {result && (
                            <span className={result.success ? styles.success : styles.error}>
                                {result.success
                                    ? `Imported ${result.rowsImported} rows successfully`
                                    : `Imported ${result.rowsImported} rows with ${result.errors.length} errors`}
                            </span>
                        )}
                        <div className={styles.spacer} />
                        <button
                            className={styles.btn}
                            onClick={handleImport}
                            disabled={importing || !table}
                        >
                            {importing ? "Importing…" : `Import ${preview.totalRows} Rows`}
                        </button>
                    </div>
                </>
            )}
        </div>
    );
}
