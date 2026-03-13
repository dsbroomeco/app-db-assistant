import { useState, useCallback } from "react";
import { useConnections } from "../context/ConnectionContext";
import type { SchemaDiffResult, DiffStatus } from "@shared/types/database";
import styles from "./SchemaDiffView.module.css";

export function SchemaDiffView() {
    const { connections, isConnected } = useConnections();
    const connectedConns = connections.filter((c) => isConnected(c.id));

    const [sourceId, setSourceId] = useState("");
    const [sourceSchema, setSourceSchema] = useState("public");
    const [targetId, setTargetId] = useState("");
    const [targetSchema, setTargetSchema] = useState("public");
    const [comparing, setComparing] = useState(false);
    const [result, setResult] = useState<SchemaDiffResult | null>(null);
    const [expandedTables, setExpandedTables] = useState<Set<string>>(new Set());
    const [error, setError] = useState("");

    const handleCompare = useCallback(async () => {
        if (!sourceId || !targetId) return;
        setComparing(true);
        setError("");
        setResult(null);
        try {
            const res: SchemaDiffResult = await window.electronAPI.invoke(
                "schema:diff",
                {
                    sourceConnectionId: sourceId,
                    sourceSchema,
                    targetConnectionId: targetId,
                    targetSchema,
                },
            );
            setResult(res);
            // Auto-expand non-unchanged tables
            const expanded = new Set<string>();
            for (const td of res.tables) {
                if (td.status !== "unchanged") expanded.add(td.tableName);
            }
            setExpandedTables(expanded);
        } catch (err) {
            setError(err instanceof Error ? err.message : String(err));
        } finally {
            setComparing(false);
        }
    }, [sourceId, sourceSchema, targetId, targetSchema]);

    const toggleTable = (name: string) => {
        setExpandedTables((prev) => {
            const next = new Set(prev);
            if (next.has(name)) next.delete(name);
            else next.add(name);
            return next;
        });
    };

    const statusClass = (status: DiffStatus) => {
        if (status === "added") return styles.added;
        if (status === "removed") return styles.removed;
        if (status === "modified") return styles.modified;
        return styles.unchanged;
    };

    if (connectedConns.length < 1) {
        return (
            <div className={styles.info}>
                Connect to at least one database to compare schemas.
                You can compare schemas within the same connection or across connections.
            </div>
        );
    }

    return (
        <div className={styles.container}>
            <div className={styles.toolbar}>
                <label>Source:</label>
                <select
                    className={styles.select}
                    value={sourceId}
                    onChange={(e) => setSourceId(e.target.value)}
                >
                    <option value="">Select connection…</option>
                    {connectedConns.map((c) => (
                        <option key={c.id} value={c.id}>{c.name}</option>
                    ))}
                </select>
                <input
                    className={styles.input}
                    type="text"
                    value={sourceSchema}
                    onChange={(e) => setSourceSchema(e.target.value)}
                    placeholder="Schema"
                    style={{ width: 80 }}
                />
                <span className={styles.arrow}>→</span>
                <label>Target:</label>
                <select
                    className={styles.select}
                    value={targetId}
                    onChange={(e) => setTargetId(e.target.value)}
                >
                    <option value="">Select connection…</option>
                    {connectedConns.map((c) => (
                        <option key={c.id} value={c.id}>{c.name}</option>
                    ))}
                </select>
                <input
                    className={styles.input}
                    type="text"
                    value={targetSchema}
                    onChange={(e) => setTargetSchema(e.target.value)}
                    placeholder="Schema"
                    style={{ width: 80 }}
                />
                <button
                    className={styles.btn}
                    onClick={handleCompare}
                    disabled={comparing || !sourceId || !targetId}
                >
                    {comparing ? "Comparing…" : "Compare"}
                </button>
            </div>

            {error && <div className={styles.error}>{error}</div>}

            {result && (
                <>
                    <div className={styles.results}>
                        {result.tables.map((td) => (
                            <div key={td.tableName} className={styles.tableGroup}>
                                <div
                                    className={styles.tableGroupHeader}
                                    onClick={() => toggleTable(td.tableName)}
                                >
                                    <span>{expandedTables.has(td.tableName) ? "▾" : "▸"}</span>
                                    <span>{td.tableName}</span>
                                    <span className={`${styles.statusBadge} ${statusClass(td.status)}`}>
                                        {td.status}
                                    </span>
                                </div>

                                {expandedTables.has(td.tableName) && td.columnDiffs.length > 0 && (
                                    <div className={styles.diffDetails}>
                                        <table className={styles.diffTable}>
                                            <thead>
                                                <tr>
                                                    <th>Column</th>
                                                    <th>Status</th>
                                                    <th>Source Type</th>
                                                    <th>Target Type</th>
                                                    <th>Nullable</th>
                                                </tr>
                                            </thead>
                                            <tbody>
                                                {td.columnDiffs.map((cd) => (
                                                    <tr
                                                        key={cd.columnName}
                                                        className={`${styles.diffRow} ${statusClass(cd.status)}`}
                                                    >
                                                        <td>{cd.columnName}</td>
                                                        <td>
                                                            <span className={`${styles.statusBadge} ${statusClass(cd.status)}`}>
                                                                {cd.status}
                                                            </span>
                                                        </td>
                                                        <td>{cd.sourceColumn?.dataType ?? "—"}</td>
                                                        <td>{cd.targetColumn?.dataType ?? "—"}</td>
                                                        <td>
                                                            {cd.sourceColumn?.nullable !== cd.targetColumn?.nullable
                                                                ? `${cd.sourceColumn?.nullable ?? "—"} → ${cd.targetColumn?.nullable ?? "—"}`
                                                                : String(cd.sourceColumn?.nullable ?? "—")}
                                                        </td>
                                                    </tr>
                                                ))}
                                            </tbody>
                                        </table>
                                    </div>
                                )}
                            </div>
                        ))}
                    </div>

                    <div className={styles.summary}>
                        <span className={styles.summaryItem}>
                            <span className={`${styles.statusBadge} ${styles.added}`}>
                                {result.summary.added}
                            </span>
                            added
                        </span>
                        <span className={styles.summaryItem}>
                            <span className={`${styles.statusBadge} ${styles.removed}`}>
                                {result.summary.removed}
                            </span>
                            removed
                        </span>
                        <span className={styles.summaryItem}>
                            <span className={`${styles.statusBadge} ${styles.modified}`}>
                                {result.summary.modified}
                            </span>
                            modified
                        </span>
                        <span className={styles.summaryItem}>
                            <span className={`${styles.statusBadge} ${styles.unchanged}`}>
                                {result.summary.unchanged}
                            </span>
                            unchanged
                        </span>
                    </div>
                </>
            )}

            {!result && !error && (
                <div className={styles.info}>
                    Select source and target connections, then click Compare to see schema differences.
                </div>
            )}
        </div>
    );
}
