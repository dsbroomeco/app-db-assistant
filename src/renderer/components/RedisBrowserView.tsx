import { useState, useCallback, useEffect } from "react";
import type {
    RedisKeyInfo,
    RedisScanResult,
    RedisGetResult,
    RedisCommandResult,
    CrudResult,
} from "@shared/types/database";
import styles from "./RedisBrowserView.module.css";

interface RedisBrowserViewProps {
    connectionId: string;
}

export function RedisBrowserView({ connectionId }: RedisBrowserViewProps) {
    const [keys, setKeys] = useState<RedisKeyInfo[]>([]);
    const [pattern, setPattern] = useState("*");
    const [cursor, setCursor] = useState("0");
    const [hasMore, setHasMore] = useState(false);
    const [loading, setLoading] = useState(false);
    const [error, setError] = useState<string | null>(null);
    const [statusMessage, setStatusMessage] = useState<string | null>(null);

    const [selectedKey, setSelectedKey] = useState<string | null>(null);
    const [keyDetail, setKeyDetail] = useState<RedisGetResult | null>(null);
    const [detailLoading, setDetailLoading] = useState(false);

    const [editValue, setEditValue] = useState("");
    const [editTtl, setEditTtl] = useState<string>("");
    const [isEditing, setIsEditing] = useState(false);

    const [showAddKey, setShowAddKey] = useState(false);
    const [newKey, setNewKey] = useState("");
    const [newValue, setNewValue] = useState("");
    const [newTtl, setNewTtl] = useState("");

    const [cliInput, setCliInput] = useState("");
    const [cliOutput, setCliOutput] = useState<string[]>([]);
    const [showCli, setShowCli] = useState(false);

    const [selectedKeys, setSelectedKeys] = useState<Set<string>>(new Set());

    const scanKeys = useCallback(
        async (resetCursor = true) => {
            setLoading(true);
            setError(null);
            try {
                const result: RedisScanResult = await window.electronAPI.invoke(
                    "redis:scan",
                    {
                        connectionId,
                        pattern,
                        cursor: resetCursor ? "0" : cursor,
                        count: 100,
                    },
                );
                if (resetCursor) {
                    setKeys(result.keys);
                } else {
                    setKeys((prev) => [...prev, ...result.keys]);
                }
                setCursor(result.cursor);
                setHasMore(result.hasMore);
            } catch (err) {
                setError(err instanceof Error ? err.message : String(err));
            } finally {
                setLoading(false);
            }
        },
        [connectionId, pattern, cursor],
    );

    useEffect(() => {
        scanKeys(true);
    }, [connectionId]);

    const handleSearch = useCallback(() => {
        scanKeys(true);
    }, [scanKeys]);

    const handleLoadMore = useCallback(() => {
        scanKeys(false);
    }, [scanKeys]);

    const handleSelectKey = useCallback(
        async (key: string) => {
            setSelectedKey(key);
            setDetailLoading(true);
            setIsEditing(false);
            try {
                const result: RedisGetResult = await window.electronAPI.invoke(
                    "redis:get",
                    { connectionId, key },
                );
                setKeyDetail(result);
                setEditValue(
                    typeof result.value === "string"
                        ? result.value
                        : JSON.stringify(result.value, null, 2),
                );
                setEditTtl(result.ttl > 0 ? String(result.ttl) : "");
            } catch (err) {
                setError(err instanceof Error ? err.message : String(err));
            } finally {
                setDetailLoading(false);
            }
        },
        [connectionId],
    );

    const handleSaveValue = useCallback(async () => {
        if (!selectedKey) return;
        setError(null);
        try {
            const ttl = editTtl ? parseInt(editTtl, 10) : undefined;
            const result: CrudResult = await window.electronAPI.invoke(
                "redis:set",
                {
                    connectionId,
                    key: selectedKey,
                    value: editValue,
                    ttl: ttl && ttl > 0 ? ttl : undefined,
                },
            );
            if (result.success) {
                setIsEditing(false);
                setStatusMessage("Value saved");
                setTimeout(() => setStatusMessage(null), 3000);
                await handleSelectKey(selectedKey);
            }
        } catch (err) {
            setError(err instanceof Error ? err.message : String(err));
        }
    }, [selectedKey, editValue, editTtl, connectionId, handleSelectKey]);

    const handleAddKey = useCallback(async () => {
        if (!newKey.trim()) return;
        setError(null);
        try {
            const ttl = newTtl ? parseInt(newTtl, 10) : undefined;
            const result: CrudResult = await window.electronAPI.invoke(
                "redis:set",
                {
                    connectionId,
                    key: newKey,
                    value: newValue,
                    ttl: ttl && ttl > 0 ? ttl : undefined,
                },
            );
            if (result.success) {
                setShowAddKey(false);
                setNewKey("");
                setNewValue("");
                setNewTtl("");
                setStatusMessage("Key created");
                setTimeout(() => setStatusMessage(null), 3000);
                await scanKeys(true);
            }
        } catch (err) {
            setError(err instanceof Error ? err.message : String(err));
        }
    }, [newKey, newValue, newTtl, connectionId, scanKeys]);

    const handleDeleteKeys = useCallback(
        async (keysToDelete: string[]) => {
            if (keysToDelete.length === 0) return;
            const confirmed = window.confirm(
                `Delete ${keysToDelete.length} key(s)?`,
            );
            if (!confirmed) return;
            setError(null);
            try {
                const result: CrudResult = await window.electronAPI.invoke(
                    "redis:delete",
                    { connectionId, keys: keysToDelete },
                );
                if (result.success) {
                    setStatusMessage(`${result.affectedRows} key(s) deleted`);
                    setTimeout(() => setStatusMessage(null), 3000);
                    if (selectedKey && keysToDelete.includes(selectedKey)) {
                        setSelectedKey(null);
                        setKeyDetail(null);
                    }
                    setSelectedKeys(new Set());
                    await scanKeys(true);
                }
            } catch (err) {
                setError(err instanceof Error ? err.message : String(err));
            }
        },
        [connectionId, selectedKey, scanKeys],
    );

    const handleCliExecute = useCallback(async () => {
        if (!cliInput.trim()) return;
        setError(null);
        try {
            const result: RedisCommandResult = await window.electronAPI.invoke(
                "redis:command",
                { connectionId, command: cliInput },
            );
            const output =
                typeof result.result === "string"
                    ? result.result
                    : JSON.stringify(result.result, null, 2);
            setCliOutput((prev) => [
                ...prev,
                `> ${cliInput}`,
                output,
                `(${result.executionTime}ms)`,
                "",
            ]);
            setCliInput("");
        } catch (err) {
            const msg = err instanceof Error ? err.message : String(err);
            setCliOutput((prev) => [...prev, `> ${cliInput}`, `ERROR: ${msg}`, ""]);
            setCliInput("");
        }
    }, [cliInput, connectionId]);

    const toggleKeySelect = useCallback((key: string) => {
        setSelectedKeys((prev) => {
            const next = new Set(prev);
            if (next.has(key)) {
                next.delete(key);
            } else {
                next.add(key);
            }
            return next;
        });
    }, []);

    const typeColors: Record<string, string> = {
        string: "#4caf50",
        list: "#2196f3",
        set: "#ff9800",
        zset: "#9c27b0",
        hash: "#f44336",
        stream: "#00bcd4",
        unknown: "#9e9e9e",
    };

    return (
        <div className={styles.container}>
            {/* Header */}
            <div className={styles.header}>
                <span className={styles.title}>🔴 Redis Browser</span>
                <div className={styles.headerActions}>
                    <button
                        className={`${styles.btn} ${showCli ? styles.btnActive : ""}`}
                        onClick={() => setShowCli((v) => !v)}
                    >
                        {showCli ? "Hide CLI" : "CLI"}
                    </button>
                </div>
            </div>

            {error && <div className={styles.error}>{error}</div>}
            {statusMessage && <div className={styles.status}>{statusMessage}</div>}

            <div className={styles.body}>
                {/* Key List Panel */}
                <div className={styles.keyPanel}>
                    <div className={styles.searchRow}>
                        <input
                            className={styles.searchInput}
                            type="text"
                            value={pattern}
                            onChange={(e) => setPattern(e.target.value)}
                            placeholder="Pattern (e.g. user:*)"
                            onKeyDown={(e) => {
                                if (e.key === "Enter") handleSearch();
                            }}
                        />
                        <button className={styles.btn} onClick={handleSearch}>
                            🔍
                        </button>
                    </div>

                    <div className={styles.keyActions}>
                        <button
                            className={styles.btn}
                            onClick={() => setShowAddKey(true)}
                        >
                            + Add
                        </button>
                        {selectedKeys.size > 0 && (
                            <button
                                className={`${styles.btn} ${styles.btnDanger}`}
                                onClick={() =>
                                    handleDeleteKeys(Array.from(selectedKeys))
                                }
                            >
                                Delete ({selectedKeys.size})
                            </button>
                        )}
                        <button
                            className={styles.btn}
                            onClick={() => scanKeys(true)}
                        >
                            ↻
                        </button>
                    </div>

                    {/* Add Key Panel */}
                    {showAddKey && (
                        <div className={styles.addKeyPanel}>
                            <input
                                className={styles.input}
                                type="text"
                                value={newKey}
                                onChange={(e) => setNewKey(e.target.value)}
                                placeholder="Key name"
                            />
                            <input
                                className={styles.input}
                                type="text"
                                value={newValue}
                                onChange={(e) => setNewValue(e.target.value)}
                                placeholder="Value"
                            />
                            <input
                                className={styles.input}
                                type="number"
                                value={newTtl}
                                onChange={(e) => setNewTtl(e.target.value)}
                                placeholder="TTL (seconds, optional)"
                            />
                            <div className={styles.addKeyActions}>
                                <button className={styles.btn} onClick={handleAddKey}>
                                    Save
                                </button>
                                <button
                                    className={styles.btnSecondary}
                                    onClick={() => setShowAddKey(false)}
                                >
                                    Cancel
                                </button>
                            </div>
                        </div>
                    )}

                    {/* Key list */}
                    <div className={styles.keyList}>
                        {loading && keys.length === 0 && (
                            <div className={styles.loading}>Scanning…</div>
                        )}
                        {keys.map((k) => (
                            <div
                                key={k.key}
                                className={`${styles.keyItem} ${selectedKey === k.key ? styles.keyActive : ""}`}
                                onClick={() => handleSelectKey(k.key)}
                            >
                                <input
                                    type="checkbox"
                                    checked={selectedKeys.has(k.key)}
                                    onChange={(e) => {
                                        e.stopPropagation();
                                        toggleKeySelect(k.key);
                                    }}
                                    onClick={(e) => e.stopPropagation()}
                                />
                                <span
                                    className={styles.keyType}
                                    style={{
                                        background: typeColors[k.type] ?? "#9e9e9e",
                                    }}
                                >
                                    {k.type.slice(0, 3).toUpperCase()}
                                </span>
                                <span className={styles.keyName} title={k.key}>
                                    {k.key}
                                </span>
                                {k.ttl > 0 && (
                                    <span className={styles.keyTtl}>
                                        {k.ttl}s
                                    </span>
                                )}
                            </div>
                        ))}
                        {!loading && keys.length === 0 && (
                            <div className={styles.empty}>No keys found</div>
                        )}
                        {hasMore && (
                            <button
                                className={styles.loadMoreBtn}
                                onClick={handleLoadMore}
                                disabled={loading}
                            >
                                {loading ? "Loading…" : "Load more"}
                            </button>
                        )}
                    </div>
                </div>

                {/* Value Detail Panel */}
                <div className={styles.detailPanel}>
                    {!selectedKey && (
                        <div className={styles.placeholder}>
                            Select a key to view its value
                        </div>
                    )}

                    {selectedKey && detailLoading && (
                        <div className={styles.loading}>Loading…</div>
                    )}

                    {selectedKey && keyDetail && !detailLoading && (
                        <>
                            <div className={styles.detailHeader}>
                                <span className={styles.detailKey}>
                                    {keyDetail.key}
                                </span>
                                <span
                                    className={styles.keyType}
                                    style={{
                                        background:
                                            typeColors[keyDetail.type] ?? "#9e9e9e",
                                    }}
                                >
                                    {keyDetail.type}
                                </span>
                                {keyDetail.ttl > 0 && (
                                    <span className={styles.detailTtl}>
                                        TTL: {keyDetail.ttl}s
                                    </span>
                                )}
                                <div className={styles.detailActions}>
                                    {keyDetail.type === "string" && (
                                        <button
                                            className={styles.btn}
                                            onClick={() =>
                                                setIsEditing((v) => !v)
                                            }
                                        >
                                            {isEditing ? "Cancel" : "Edit"}
                                        </button>
                                    )}
                                    <button
                                        className={`${styles.btn} ${styles.btnDanger}`}
                                        onClick={() =>
                                            handleDeleteKeys([selectedKey])
                                        }
                                    >
                                        Delete
                                    </button>
                                </div>
                            </div>

                            {isEditing && keyDetail.type === "string" ? (
                                <div className={styles.editSection}>
                                    <textarea
                                        className={styles.valueEditor}
                                        value={editValue}
                                        onChange={(e) =>
                                            setEditValue(e.target.value)
                                        }
                                        rows={8}
                                        spellCheck={false}
                                    />
                                    <div className={styles.editRow}>
                                        <label className={styles.editLabel}>
                                            TTL (seconds):
                                        </label>
                                        <input
                                            className={styles.input}
                                            type="number"
                                            value={editTtl}
                                            onChange={(e) =>
                                                setEditTtl(e.target.value)
                                            }
                                            placeholder="No expiry"
                                        />
                                        <button
                                            className={styles.btn}
                                            onClick={handleSaveValue}
                                        >
                                            Save
                                        </button>
                                    </div>
                                </div>
                            ) : (
                                <pre className={styles.valueDisplay}>
                                    {typeof keyDetail.value === "string"
                                        ? keyDetail.value
                                        : JSON.stringify(
                                            keyDetail.value,
                                            null,
                                            2,
                                        )}
                                </pre>
                            )}
                        </>
                    )}
                </div>
            </div>

            {/* CLI Panel */}
            {showCli && (
                <div className={styles.cliPanel}>
                    <div className={styles.cliOutput}>
                        {cliOutput.map((line, i) => (
                            <div key={i} className={styles.cliLine}>
                                {line}
                            </div>
                        ))}
                    </div>
                    <div className={styles.cliInputRow}>
                        <span className={styles.cliPrompt}>{">"}</span>
                        <input
                            className={styles.cliInput}
                            type="text"
                            value={cliInput}
                            onChange={(e) => setCliInput(e.target.value)}
                            onKeyDown={(e) => {
                                if (e.key === "Enter") handleCliExecute();
                            }}
                            placeholder="Enter Redis command…"
                            spellCheck={false}
                        />
                    </div>
                </div>
            )}
        </div>
    );
}
