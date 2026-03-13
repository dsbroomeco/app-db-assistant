import { useState, useCallback } from "react";
import type {
    SchemaInfo,
    TableInfo,
    RoutineInfo,
} from "@shared/types/database";
import styles from "./DatabaseTreeView.module.css";

interface DatabaseTreeViewProps {
    connectionId: string;
    connectionName: string;
    onOpenTable: (schema: string, table: string) => void;
    onOpenStructure: (schema: string, table: string) => void;
}

interface SchemaNode {
    schema: SchemaInfo;
    expanded: boolean;
    loading: boolean;
    tables: TableInfo[];
    routines: RoutineInfo[];
    tablesLoaded: boolean;
}

export function DatabaseTreeView({
    connectionId,
    connectionName,
    onOpenTable,
    onOpenStructure,
}: DatabaseTreeViewProps) {
    const [schemas, setSchemas] = useState<SchemaNode[]>([]);
    const [loading, setLoading] = useState(false);
    const [loaded, setLoaded] = useState(false);
    const [expanded, setExpanded] = useState(false);
    const [error, setError] = useState<string | null>(null);

    const loadSchemas = useCallback(async () => {
        if (loaded) return;
        setLoading(true);
        setError(null);
        try {
            const result = await window.electronAPI.invoke(
                "db:schemas",
                connectionId,
            );
            setSchemas(
                result.map((s) => ({
                    schema: s,
                    expanded: false,
                    loading: false,
                    tables: [],
                    routines: [],
                    tablesLoaded: false,
                })),
            );
            setLoaded(true);
        } catch (err) {
            setError(err instanceof Error ? err.message : String(err));
        } finally {
            setLoading(false);
        }
    }, [connectionId, loaded]);

    const toggleExpand = useCallback(() => {
        const next = !expanded;
        setExpanded(next);
        if (next && !loaded) {
            loadSchemas();
        }
    }, [expanded, loaded, loadSchemas]);

    const toggleSchema = useCallback(
        async (index: number) => {
            setSchemas((prev) => {
                const next = [...prev];
                next[index] = { ...next[index], expanded: !next[index].expanded };
                return next;
            });

            const node = schemas[index];
            if (!node.tablesLoaded && !node.expanded) {
                setSchemas((prev) => {
                    const next = [...prev];
                    next[index] = { ...next[index], loading: true };
                    return next;
                });
                try {
                    const [tables, routines] = await Promise.all([
                        window.electronAPI.invoke("db:tables", {
                            connectionId,
                            schema: node.schema.name,
                        }),
                        window.electronAPI.invoke("db:routines", {
                            connectionId,
                            schema: node.schema.name,
                        }),
                    ]);
                    setSchemas((prev) => {
                        const next = [...prev];
                        next[index] = {
                            ...next[index],
                            tables,
                            routines,
                            tablesLoaded: true,
                            loading: false,
                        };
                        return next;
                    });
                } catch {
                    setSchemas((prev) => {
                        const next = [...prev];
                        next[index] = { ...next[index], loading: false };
                        return next;
                    });
                }
            }
        },
        [connectionId, schemas],
    );

    const handleRefresh = useCallback(
        async (e: React.MouseEvent) => {
            e.stopPropagation();
            setLoaded(false);
            setSchemas([]);
            setLoading(true);
            setError(null);
            try {
                const result = await window.electronAPI.invoke(
                    "db:schemas",
                    connectionId,
                );
                setSchemas(
                    result.map((s) => ({
                        schema: s,
                        expanded: false,
                        loading: false,
                        tables: [],
                        routines: [],
                        tablesLoaded: false,
                    })),
                );
                setLoaded(true);
            } catch (err) {
                setError(err instanceof Error ? err.message : String(err));
            } finally {
                setLoading(false);
            }
        },
        [connectionId],
    );

    const refreshSchema = useCallback(
        async (e: React.MouseEvent, index: number) => {
            e.stopPropagation();
            const node = schemas[index];
            setSchemas((prev) => {
                const next = [...prev];
                next[index] = {
                    ...next[index],
                    loading: true,
                    tablesLoaded: false,
                    tables: [],
                    routines: [],
                };
                return next;
            });
            try {
                const [tables, routines] = await Promise.all([
                    window.electronAPI.invoke("db:tables", {
                        connectionId,
                        schema: node.schema.name,
                    }),
                    window.electronAPI.invoke("db:routines", {
                        connectionId,
                        schema: node.schema.name,
                    }),
                ]);
                setSchemas((prev) => {
                    const next = [...prev];
                    next[index] = {
                        ...next[index],
                        tables,
                        routines,
                        tablesLoaded: true,
                        loading: false,
                        expanded: true,
                    };
                    return next;
                });
            } catch {
                setSchemas((prev) => {
                    const next = [...prev];
                    next[index] = { ...next[index], loading: false };
                    return next;
                });
            }
        },
        [connectionId, schemas],
    );

    return (
        <div className={styles.treeView}>
            <div
                className={styles.treeNode}
                onClick={toggleExpand}
            >
                <span className={styles.arrow}>
                    {expanded ? "▾" : "▸"}
                </span>
                <span className={styles.icon}>🗄️</span>
                <span className={styles.label}>{connectionName}</span>
                {expanded && (
                    <button
                        className={styles.refreshBtn}
                        onClick={handleRefresh}
                        title="Refresh"
                    >
                        ↻
                    </button>
                )}
            </div>

            {expanded && (
                <div className={styles.children}>
                    {loading && (
                        <div className={styles.loading}>Loading schemas…</div>
                    )}
                    {error && (
                        <div className={styles.error}>{error}</div>
                    )}
                    {schemas.map((node, i) => (
                        <SchemaTreeNode
                            key={node.schema.name}
                            node={node}
                            onToggle={() => toggleSchema(i)}
                            onRefresh={(e) => refreshSchema(e, i)}
                            onOpenTable={(table) =>
                                onOpenTable(node.schema.name, table)
                            }
                            onOpenStructure={(table) =>
                                onOpenStructure(node.schema.name, table)
                            }
                        />
                    ))}
                </div>
            )}
        </div>
    );
}

function SchemaTreeNode({
    node,
    onToggle,
    onRefresh,
    onOpenTable,
    onOpenStructure,
}: {
    node: SchemaNode;
    onToggle: () => void;
    onRefresh: (e: React.MouseEvent) => void;
    onOpenTable: (table: string) => void;
    onOpenStructure: (table: string) => void;
}) {
    const tables = node.tables.filter((t) => t.type === "table");
    const views = node.tables.filter((t) => t.type === "view");
    const [tablesExpanded, setTablesExpanded] = useState(true);
    const [viewsExpanded, setViewsExpanded] = useState(false);
    const [routinesExpanded, setRoutinesExpanded] = useState(false);

    return (
        <div>
            <div className={styles.treeNode} onClick={onToggle}>
                <span className={styles.arrow}>
                    {node.expanded ? "▾" : "▸"}
                </span>
                <span className={styles.icon}>📁</span>
                <span className={styles.label}>{node.schema.name}</span>
                {node.expanded && (
                    <button
                        className={styles.refreshBtn}
                        onClick={onRefresh}
                        title="Refresh schema"
                    >
                        ↻
                    </button>
                )}
            </div>

            {node.expanded && (
                <div className={styles.children}>
                    {node.loading && (
                        <div className={styles.loading}>Loading…</div>
                    )}
                    {node.tablesLoaded && (
                        <>
                            {/* Tables group */}
                            <div
                                className={styles.treeNode}
                                onClick={() => setTablesExpanded((v) => !v)}
                            >
                                <span className={styles.arrow}>
                                    {tablesExpanded ? "▾" : "▸"}
                                </span>
                                <span className={styles.icon}>📋</span>
                                <span className={styles.label}>
                                    Tables ({tables.length})
                                </span>
                            </div>
                            {tablesExpanded && (
                                <div className={styles.children}>
                                    {tables.map((t) => (
                                        <TableTreeItem
                                            key={t.name}
                                            name={t.name}
                                            icon="📋"
                                            onOpenData={() => onOpenTable(t.name)}
                                            onOpenStructure={() =>
                                                onOpenStructure(t.name)
                                            }
                                        />
                                    ))}
                                    {tables.length === 0 && (
                                        <div className={styles.empty}>No tables</div>
                                    )}
                                </div>
                            )}

                            {/* Views group */}
                            <div
                                className={styles.treeNode}
                                onClick={() => setViewsExpanded((v) => !v)}
                            >
                                <span className={styles.arrow}>
                                    {viewsExpanded ? "▾" : "▸"}
                                </span>
                                <span className={styles.icon}>👁️</span>
                                <span className={styles.label}>
                                    Views ({views.length})
                                </span>
                            </div>
                            {viewsExpanded && (
                                <div className={styles.children}>
                                    {views.map((v) => (
                                        <TableTreeItem
                                            key={v.name}
                                            name={v.name}
                                            icon="👁️"
                                            onOpenData={() => onOpenTable(v.name)}
                                            onOpenStructure={() =>
                                                onOpenStructure(v.name)
                                            }
                                        />
                                    ))}
                                    {views.length === 0 && (
                                        <div className={styles.empty}>No views</div>
                                    )}
                                </div>
                            )}

                            {/* Routines group */}
                            <div
                                className={styles.treeNode}
                                onClick={() => setRoutinesExpanded((v) => !v)}
                            >
                                <span className={styles.arrow}>
                                    {routinesExpanded ? "▾" : "▸"}
                                </span>
                                <span className={styles.icon}>⚙️</span>
                                <span className={styles.label}>
                                    Routines ({node.routines.length})
                                </span>
                            </div>
                            {routinesExpanded && (
                                <div className={styles.children}>
                                    {node.routines.map((r) => (
                                        <div
                                            key={r.name}
                                            className={`${styles.treeNode} ${styles.leaf}`}
                                        >
                                            <span className={styles.icon}>
                                                {r.type === "function"
                                                    ? "ƒ"
                                                    : "⚡"}
                                            </span>
                                            <span className={styles.label}>
                                                {r.name}
                                            </span>
                                            <span className={styles.badge}>
                                                {r.type}
                                            </span>
                                        </div>
                                    ))}
                                    {node.routines.length === 0 && (
                                        <div className={styles.empty}>
                                            No routines
                                        </div>
                                    )}
                                </div>
                            )}
                        </>
                    )}
                </div>
            )}
        </div>
    );
}

function TableTreeItem({
    name,
    icon,
    onOpenData,
    onOpenStructure,
}: {
    name: string;
    icon: string;
    onOpenData: () => void;
    onOpenStructure: () => void;
}) {
    return (
        <div className={`${styles.treeNode} ${styles.leaf}`}>
            <span className={styles.icon}>{icon}</span>
            <span
                className={`${styles.label} ${styles.clickable}`}
                onClick={onOpenData}
                title="View data"
            >
                {name}
            </span>
            <button
                className={styles.actionBtn}
                onClick={onOpenStructure}
                title="View structure"
            >
                🔧
            </button>
        </div>
    );
}
