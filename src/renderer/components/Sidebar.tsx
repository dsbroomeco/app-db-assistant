import { useState, useCallback } from "react";
import { useConnections } from "../context/ConnectionContext";
import { DATABASE_TYPE_LABELS, isSqlType } from "@shared/types/database";
import type { SavedConnection } from "@shared/types/database";
import { DatabaseTreeView } from "./DatabaseTreeView";
import { MongoTreeView } from "./MongoTreeView";
import { RedisTreeView } from "./RedisTreeView";
import styles from "./Sidebar.module.css";

interface SidebarProps {
    onOpenSettings: () => void;
    onNewConnection: () => void;
    onEditConnection: (conn: SavedConnection) => void;
    onOpenTable: (connectionId: string, schema: string, table: string) => void;
    onOpenStructure: (connectionId: string, schema: string, table: string) => void;
    onOpenCollection: (connectionId: string, database: string, collection: string) => void;
    onOpenRedisBrowser: (connectionId: string) => void;
    onOpenImport: (connectionId: string) => void;
    onOpenSchemaDiff: () => void;
    onOpenErd: () => void;
}

export function Sidebar({
    onOpenSettings,
    onNewConnection,
    onEditConnection,
    onOpenTable,
    onOpenStructure,
    onOpenCollection,
    onOpenRedisBrowser,
    onOpenImport,
    onOpenSchemaDiff,
    onOpenErd,
}: SidebarProps) {
    const { connections, connect, disconnect, isConnected, deleteConnection } =
        useConnections();
    const [connectingId, setConnectingId] = useState<string | null>(null);
    const [contextMenu, setContextMenu] = useState<{
        conn: SavedConnection;
        x: number;
        y: number;
    } | null>(null);

    const handleToggleConnect = useCallback(
        async (id: string) => {
            setConnectingId(id);
            if (isConnected(id)) {
                await disconnect(id);
            } else {
                await connect(id);
            }
            setConnectingId(null);
        },
        [isConnected, connect, disconnect],
    );

    const handleContextMenu = useCallback(
        (e: React.MouseEvent, conn: SavedConnection) => {
            e.preventDefault();
            setContextMenu({ conn, x: e.clientX, y: e.clientY });
        },
        [],
    );

    const closeContextMenu = useCallback(() => setContextMenu(null), []);

    const handleDelete = useCallback(
        async (id: string) => {
            setContextMenu(null);
            await deleteConnection(id);
        },
        [deleteConnection],
    );

    return (
        <aside className={styles.sidebar} onClick={closeContextMenu} role="navigation" aria-label="Database connections">
            <div className={styles.header}>
                <span className={styles.logo}>⬡</span>
                <span className={styles.title}>DB Assistant</span>
            </div>

            <div className={styles.section}>
                <div className={styles.sectionHeader}>
                    <span className={styles.sectionTitle}>Connections</span>
                    <button
                        className={styles.addBtn}
                        onClick={onNewConnection}
                        title="New connection"
                        aria-label="Add new connection"
                    >
                        +
                    </button>
                </div>

                {connections.length === 0 ? (
                    <div className={styles.empty}>
                        No connections yet.
                        <br />
                        <button
                            className={styles.emptyAction}
                            onClick={onNewConnection}
                        >
                            + Add connection
                        </button>
                    </div>
                ) : (
                    <div className={styles.list} role="list" aria-label="Database connections">
                        {connections.map((conn) => {
                            const connected = isConnected(conn.id);
                            const busy = connectingId === conn.id;
                            return (
                                <div key={conn.id} role="listitem">
                                    <div
                                        className={styles.connItem}
                                        onContextMenu={(e) => handleContextMenu(e, conn)}
                                        onDoubleClick={() => handleToggleConnect(conn.id)}
                                        title={`${DATABASE_TYPE_LABELS[conn.type]}${conn.type !== "sqlite" ? ` — ${conn.host}:${conn.port}` : ` — ${conn.filepath}`}`}
                                    >
                                        <span
                                            className={`${styles.statusDot} ${connected ? styles.dotConnected : styles.dotDisconnected}`}
                                        />
                                        <span className={styles.connName}>{conn.name}</span>
                                        <button
                                            className={styles.connToggle}
                                            onClick={() => handleToggleConnect(conn.id)}
                                            disabled={busy}
                                            title={connected ? "Disconnect" : "Connect"}
                                        >
                                            {busy ? "…" : connected ? "⏏" : "▶"}
                                        </button>
                                    </div>
                                    {connected && conn.type === "mongodb" && (
                                        <MongoTreeView
                                            connectionId={conn.id}
                                            connectionName={conn.name}
                                            onOpenCollection={(database, collection) =>
                                                onOpenCollection(conn.id, database, collection)
                                            }
                                        />
                                    )}
                                    {connected && conn.type === "redis" && (
                                        <RedisTreeView
                                            connectionId={conn.id}
                                            connectionName={conn.name}
                                            onOpenBrowser={() =>
                                                onOpenRedisBrowser(conn.id)
                                            }
                                        />
                                    )}
                                    {connected && isSqlType(conn.type) && (
                                        <DatabaseTreeView
                                            connectionId={conn.id}
                                            connectionName={conn.name}
                                            onOpenTable={(schema, table) =>
                                                onOpenTable(conn.id, schema, table)
                                            }
                                            onOpenStructure={(schema, table) =>
                                                onOpenStructure(conn.id, schema, table)
                                            }
                                        />
                                    )}
                                </div>
                            );
                        })}
                    </div>
                )}
            </div>

            {/* Tools section */}
            <div className={styles.section}>
                <div className={styles.sectionHeader}>
                    <span className={styles.sectionTitle}>Tools</span>
                </div>
                <div className={styles.toolsList}>
                    <button className={styles.toolBtn} onClick={onOpenSchemaDiff} title="Compare schemas between connections">
                        🔀 Schema Diff
                    </button>
                    <button className={styles.toolBtn} onClick={onOpenErd} title="Generate Entity Relationship Diagram">
                        📐 ERD
                    </button>
                    {connections.filter((c) => isConnected(c.id) && isSqlType(c.type)).map((c) => (
                        <button key={c.id} className={styles.toolBtn} onClick={() => onOpenImport(c.id)} title={`Import data into ${c.name}`}>
                            📥 Import → {c.name}
                        </button>
                    ))}
                </div>
            </div>

            <div className={styles.footer}>
                <button
                    className={styles.footerBtn}
                    onClick={onOpenSettings}
                    title="Settings"
                >
                    ⚙️ Settings
                </button>
            </div>

            {/* Context menu */}
            {contextMenu && (
                <div
                    className={styles.contextMenu}
                    style={{ top: contextMenu.y, left: contextMenu.x }}
                    onClick={closeContextMenu}
                    role="menu"
                    aria-label="Connection actions"
                >
                    <button
                        className={styles.contextMenuItem}
                        onClick={() => {
                            handleToggleConnect(contextMenu.conn.id);
                            closeContextMenu();
                        }}
                    >
                        {isConnected(contextMenu.conn.id) ? "Disconnect" : "Connect"}
                    </button>
                    <button
                        className={styles.contextMenuItem}
                        onClick={() => {
                            onEditConnection(contextMenu.conn);
                            closeContextMenu();
                        }}
                    >
                        Edit
                    </button>
                    <div className={styles.contextMenuDivider} />
                    <button
                        className={`${styles.contextMenuItem} ${styles.contextMenuDanger}`}
                        onClick={() => handleDelete(contextMenu.conn.id)}
                    >
                        Delete
                    </button>
                </div>
            )}
        </aside>
    );
}
