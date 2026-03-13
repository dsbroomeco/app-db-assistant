import { useState, useCallback } from "react";
import type { MongoCollectionInfo } from "@shared/types/database";
import styles from "./DatabaseTreeView.module.css";

interface MongoTreeViewProps {
    connectionId: string;
    connectionName: string;
    onOpenCollection: (database: string, collection: string) => void;
}

interface DatabaseNode {
    name: string;
    expanded: boolean;
    loading: boolean;
    collections: MongoCollectionInfo[];
    loaded: boolean;
}

export function MongoTreeView({
    connectionId,
    connectionName,
    onOpenCollection,
}: MongoTreeViewProps) {
    const [databases, setDatabases] = useState<DatabaseNode[]>([]);
    const [loading, setLoading] = useState(false);
    const [loaded, setLoaded] = useState(false);
    const [expanded, setExpanded] = useState(false);
    const [error, setError] = useState<string | null>(null);

    const loadDatabases = useCallback(async () => {
        if (loaded) return;
        setLoading(true);
        setError(null);
        try {
            const result: string[] = await window.electronAPI.invoke(
                "mongo:databases",
                connectionId,
            );
            setDatabases(
                result.map((name) => ({
                    name,
                    expanded: false,
                    loading: false,
                    collections: [],
                    loaded: false,
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
            loadDatabases();
        }
    }, [expanded, loaded, loadDatabases]);

    const toggleDatabase = useCallback(
        async (index: number) => {
            const node = databases[index];
            const wasExpanded = node.expanded;

            setDatabases((prev) => {
                const next = [...prev];
                next[index] = { ...next[index], expanded: !next[index].expanded };
                return next;
            });

            if (!node.loaded && !wasExpanded) {
                setDatabases((prev) => {
                    const next = [...prev];
                    next[index] = { ...next[index], loading: true };
                    return next;
                });
                try {
                    const collections: MongoCollectionInfo[] =
                        await window.electronAPI.invoke("mongo:collections", {
                            connectionId,
                            database: node.name,
                        });
                    setDatabases((prev) => {
                        const next = [...prev];
                        next[index] = {
                            ...next[index],
                            collections,
                            loaded: true,
                            loading: false,
                        };
                        return next;
                    });
                } catch {
                    setDatabases((prev) => {
                        const next = [...prev];
                        next[index] = { ...next[index], loading: false };
                        return next;
                    });
                }
            }
        },
        [connectionId, databases],
    );

    const handleRefresh = useCallback(
        async (e: React.MouseEvent) => {
            e.stopPropagation();
            setLoaded(false);
            setDatabases([]);
            setLoading(true);
            setError(null);
            try {
                const result: string[] = await window.electronAPI.invoke(
                    "mongo:databases",
                    connectionId,
                );
                setDatabases(
                    result.map((name) => ({
                        name,
                        expanded: false,
                        loading: false,
                        collections: [],
                        loaded: false,
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

    return (
        <div className={styles.treeView}>
            <div className={styles.treeNode} onClick={toggleExpand}>
                <span className={styles.arrow}>
                    {expanded ? "▾" : "▸"}
                </span>
                <span className={styles.icon}>🍃</span>
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
                        <div className={styles.loading}>Loading databases…</div>
                    )}
                    {error && <div className={styles.error}>{error}</div>}
                    {databases.map((db, i) => (
                        <div key={db.name}>
                            <div
                                className={styles.treeNode}
                                onClick={() => toggleDatabase(i)}
                            >
                                <span className={styles.arrow}>
                                    {db.expanded ? "▾" : "▸"}
                                </span>
                                <span className={styles.icon}>📁</span>
                                <span className={styles.label}>{db.name}</span>
                            </div>
                            {db.expanded && (
                                <div className={styles.children}>
                                    {db.loading && (
                                        <div className={styles.loading}>Loading…</div>
                                    )}
                                    {db.loaded && db.collections.length === 0 && (
                                        <div className={styles.empty}>No collections</div>
                                    )}
                                    {db.collections.map((col) => (
                                        <div
                                            key={col.name}
                                            className={`${styles.treeNode} ${styles.leaf}`}
                                        >
                                            <span className={styles.icon}>
                                                {col.type === "view" ? "👁️" : "📋"}
                                            </span>
                                            <span
                                                className={`${styles.label} ${styles.clickable}`}
                                                onClick={() =>
                                                    onOpenCollection(db.name, col.name)
                                                }
                                                title={`${col.count} documents`}
                                            >
                                                {col.name}
                                            </span>
                                            <span className={styles.badge}>
                                                {col.count}
                                            </span>
                                        </div>
                                    ))}
                                </div>
                            )}
                        </div>
                    ))}
                </div>
            )}
        </div>
    );
}
