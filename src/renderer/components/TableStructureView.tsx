import { useState, useEffect } from "react";
import type { TableStructure } from "@shared/types/database";
import styles from "./TableStructureView.module.css";

interface TableStructureViewProps {
    connectionId: string;
    schema: string;
    table: string;
}

type ActiveSection = "columns" | "indexes" | "constraints";

export function TableStructureView({
    connectionId,
    schema,
    table,
}: TableStructureViewProps) {
    const [structure, setStructure] = useState<TableStructure | null>(null);
    const [loading, setLoading] = useState(true);
    const [error, setError] = useState<string | null>(null);
    const [activeSection, setActiveSection] =
        useState<ActiveSection>("columns");

    useEffect(() => {
        let cancelled = false;
        setLoading(true);
        setError(null);

        window.electronAPI
            .invoke("db:table-structure", { connectionId, schema, table })
            .then((result) => {
                if (!cancelled) {
                    setStructure(result);
                    setLoading(false);
                }
            })
            .catch((err) => {
                if (!cancelled) {
                    setError(
                        err instanceof Error ? err.message : String(err),
                    );
                    setLoading(false);
                }
            });

        return () => {
            cancelled = true;
        };
    }, [connectionId, schema, table]);

    if (loading) {
        return (
            <div className={styles.container}>
                <div className={styles.loading}>Loading structure…</div>
            </div>
        );
    }

    if (error) {
        return (
            <div className={styles.container}>
                <div className={styles.error}>{error}</div>
            </div>
        );
    }

    if (!structure) return null;

    return (
        <div className={styles.container}>
            <div className={styles.header}>
                <h2 className={styles.title}>
                    {schema}.{table}
                </h2>
            </div>

            <div className={styles.tabs}>
                <button
                    className={`${styles.tab} ${activeSection === "columns" ? styles.activeTab : ""}`}
                    onClick={() => setActiveSection("columns")}
                >
                    Columns ({structure.columns.length})
                </button>
                <button
                    className={`${styles.tab} ${activeSection === "indexes" ? styles.activeTab : ""}`}
                    onClick={() => setActiveSection("indexes")}
                >
                    Indexes ({structure.indexes.length})
                </button>
                <button
                    className={`${styles.tab} ${activeSection === "constraints" ? styles.activeTab : ""}`}
                    onClick={() => setActiveSection("constraints")}
                >
                    Constraints ({structure.constraints.length})
                </button>
            </div>

            <div className={styles.tableWrapper}>
                {activeSection === "columns" && (
                    <table className={styles.table}>
                        <thead>
                            <tr>
                                <th>#</th>
                                <th>Column</th>
                                <th>Type</th>
                                <th>Nullable</th>
                                <th>Default</th>
                                <th>PK</th>
                            </tr>
                        </thead>
                        <tbody>
                            {structure.columns.map((col) => (
                                <tr key={col.name}>
                                    <td className={styles.mono}>
                                        {col.ordinalPosition}
                                    </td>
                                    <td>
                                        <span className={styles.columnName}>
                                            {col.isPrimaryKey && (
                                                <span className={styles.keyIcon} title="Primary Key">
                                                    🔑
                                                </span>
                                            )}
                                            {col.name}
                                        </span>
                                    </td>
                                    <td className={styles.mono}>
                                        {col.dataType}
                                    </td>
                                    <td>
                                        {col.nullable ? (
                                            <span className={styles.yes}>YES</span>
                                        ) : (
                                            <span className={styles.no}>NO</span>
                                        )}
                                    </td>
                                    <td className={styles.mono}>
                                        {col.defaultValue ?? (
                                            <span className={styles.null}>
                                                NULL
                                            </span>
                                        )}
                                    </td>
                                    <td>
                                        {col.isPrimaryKey ? "✓" : ""}
                                    </td>
                                </tr>
                            ))}
                        </tbody>
                    </table>
                )}

                {activeSection === "indexes" && (
                    <table className={styles.table}>
                        <thead>
                            <tr>
                                <th>Index Name</th>
                                <th>Columns</th>
                                <th>Unique</th>
                                <th>Primary</th>
                            </tr>
                        </thead>
                        <tbody>
                            {structure.indexes.map((idx) => (
                                <tr key={idx.name}>
                                    <td>{idx.name}</td>
                                    <td className={styles.mono}>
                                        {idx.columns.join(", ")}
                                    </td>
                                    <td>{idx.unique ? "✓" : ""}</td>
                                    <td>{idx.primary ? "✓" : ""}</td>
                                </tr>
                            ))}
                            {structure.indexes.length === 0 && (
                                <tr>
                                    <td
                                        colSpan={4}
                                        className={styles.emptyRow}
                                    >
                                        No indexes
                                    </td>
                                </tr>
                            )}
                        </tbody>
                    </table>
                )}

                {activeSection === "constraints" && (
                    <table className={styles.table}>
                        <thead>
                            <tr>
                                <th>Constraint</th>
                                <th>Type</th>
                                <th>Columns</th>
                                <th>References</th>
                            </tr>
                        </thead>
                        <tbody>
                            {structure.constraints.map((con) => (
                                <tr key={con.name}>
                                    <td>{con.name}</td>
                                    <td>
                                        <span className={styles.badge}>
                                            {con.type}
                                        </span>
                                    </td>
                                    <td className={styles.mono}>
                                        {con.columns.join(", ")}
                                    </td>
                                    <td className={styles.mono}>
                                        {con.referencedTable
                                            ? `${con.referencedTable}(${con.referencedColumns?.join(", ")})`
                                            : "—"}
                                    </td>
                                </tr>
                            ))}
                            {structure.constraints.length === 0 && (
                                <tr>
                                    <td
                                        colSpan={4}
                                        className={styles.emptyRow}
                                    >
                                        No constraints
                                    </td>
                                </tr>
                            )}
                        </tbody>
                    </table>
                )}
            </div>
        </div>
    );
}
