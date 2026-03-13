import { useState, useCallback, type FormEvent } from "react";
import { useConnections } from "../context/ConnectionContext";
import {
    newConnectionConfig,
    DEFAULT_PORTS,
    DATABASE_TYPE_LABELS,
} from "@shared/types/database";
import type {
    ConnectionConfig,
    DatabaseType,
    SavedConnection,
    TestConnectionResult,
} from "@shared/types/database";
import styles from "./ConnectionForm.module.css";

interface ConnectionFormProps {
    editConnection?: SavedConnection | null;
    onClose: () => void;
}

const DB_TYPES: DatabaseType[] = ["postgresql", "mysql", "sqlite", "mssql"];

export function ConnectionForm({
    editConnection,
    onClose,
}: ConnectionFormProps) {
    const { saveConnection, testConnection } = useConnections();

    const [config, setConfig] = useState<ConnectionConfig>(() => {
        if (editConnection) {
            return {
                id: editConnection.id,
                name: editConnection.name,
                type: editConnection.type,
                host: editConnection.host,
                port: editConnection.port,
                database: editConnection.database,
                username: editConnection.username,
                ssl: editConnection.ssl,
                filepath: editConnection.filepath,
                connectionTimeout: editConnection.connectionTimeout,
                poolSize: editConnection.poolSize,
            };
        }
        return newConnectionConfig("postgresql");
    });

    const [password, setPassword] = useState("");
    const [showAdvanced, setShowAdvanced] = useState(false);
    const [testing, setTesting] = useState(false);
    const [saving, setSaving] = useState(false);
    const [testResult, setTestResult] = useState<TestConnectionResult | null>(
        null,
    );

    const isSqlite = config.type === "sqlite";

    const update = useCallback(
        (partial: Partial<ConnectionConfig>) => {
            setConfig((prev) => ({ ...prev, ...partial }));
            setTestResult(null);
        },
        [],
    );

    const handleTypeChange = useCallback(
        (type: DatabaseType) => {
            const base = newConnectionConfig(type, {
                id: config.id,
                name: config.name,
            });
            setConfig(base);
            setPassword("");
            setTestResult(null);
        },
        [config.id, config.name],
    );

    const handleBrowseFile = useCallback(async () => {
        const filepath = await window.electronAPI.invoke("dialog:open-file", {
            title: "Select SQLite Database",
            filters: [
                { name: "SQLite Databases", extensions: ["db", "sqlite", "sqlite3"] },
                { name: "All Files", extensions: ["*"] },
            ],
        });
        if (filepath) {
            update({ filepath });
        }
    }, [update]);

    const handleTest = useCallback(async () => {
        setTesting(true);
        setTestResult(null);
        const result = await testConnection(config, password || undefined);
        setTestResult(result);
        setTesting(false);
    }, [config, password, testConnection]);

    const handleSave = useCallback(
        async (e: FormEvent) => {
            e.preventDefault();
            setSaving(true);
            await saveConnection(config, password || undefined);
            setSaving(false);
            onClose();
        },
        [config, password, saveConnection, onClose],
    );

    const isValid = () => {
        if (!config.name.trim()) return false;
        if (isSqlite) return !!config.filepath.trim();
        return !!config.host.trim() && config.port > 0;
    };

    return (
        <div className={styles.overlay} onClick={onClose}>
            <div className={styles.dialog} onClick={(e) => e.stopPropagation()}>
                <div className={styles.header}>
                    <span className={styles.headerTitle}>
                        {editConnection ? "Edit Connection" : "New Connection"}
                    </span>
                    <button className={styles.closeBtn} onClick={onClose} title="Close">
                        ✕
                    </button>
                </div>

                <form onSubmit={handleSave}>
                    <div className={styles.body}>
                        {/* Database Type */}
                        <div className={styles.field}>
                            <label className={styles.label}>Database Type</label>
                            <select
                                className={styles.select}
                                value={config.type}
                                onChange={(e) =>
                                    handleTypeChange(e.target.value as DatabaseType)
                                }
                            >
                                {DB_TYPES.map((t) => (
                                    <option key={t} value={t}>
                                        {DATABASE_TYPE_LABELS[t]}
                                    </option>
                                ))}
                            </select>
                        </div>

                        {/* Connection Name */}
                        <div className={styles.field}>
                            <label className={styles.label}>Connection Name</label>
                            <input
                                className={styles.input}
                                type="text"
                                value={config.name}
                                onChange={(e) => update({ name: e.target.value })}
                                placeholder="My Database"
                                autoFocus
                            />
                        </div>

                        {isSqlite ? (
                            /* SQLite: File path */
                            <div className={styles.field}>
                                <label className={styles.label}>Database File</label>
                                <div className={styles.fileRow}>
                                    <input
                                        className={styles.input}
                                        type="text"
                                        value={config.filepath}
                                        onChange={(e) => update({ filepath: e.target.value })}
                                        placeholder="/path/to/database.db"
                                    />
                                    <button
                                        type="button"
                                        className={styles.browseBtn}
                                        onClick={handleBrowseFile}
                                    >
                                        Browse…
                                    </button>
                                </div>
                            </div>
                        ) : (
                            <>
                                {/* Host & Port */}
                                <div className={styles.row}>
                                    <div className={styles.field}>
                                        <label className={styles.label}>Host</label>
                                        <input
                                            className={styles.input}
                                            type="text"
                                            value={config.host}
                                            onChange={(e) => update({ host: e.target.value })}
                                            placeholder="localhost"
                                        />
                                    </div>
                                    <div className={styles.field}>
                                        <label className={styles.label}>Port</label>
                                        <input
                                            className={styles.input}
                                            type="number"
                                            value={config.port}
                                            onChange={(e) =>
                                                update({ port: parseInt(e.target.value, 10) || 0 })
                                            }
                                            placeholder={String(
                                                config.type !== "sqlite"
                                                    ? DEFAULT_PORTS[config.type]
                                                    : ""
                                            )}
                                        />
                                    </div>
                                </div>

                                {/* Database */}
                                <div className={styles.field}>
                                    <label className={styles.label}>Database</label>
                                    <input
                                        className={styles.input}
                                        type="text"
                                        value={config.database}
                                        onChange={(e) => update({ database: e.target.value })}
                                        placeholder="my_database"
                                    />
                                </div>

                                {/* Username & Password */}
                                <div className={styles.row}>
                                    <div className={styles.field}>
                                        <label className={styles.label}>Username</label>
                                        <input
                                            className={styles.input}
                                            type="text"
                                            value={config.username}
                                            onChange={(e) => update({ username: e.target.value })}
                                            placeholder="user"
                                        />
                                    </div>
                                    <div className={styles.field}>
                                        <label className={styles.label}>Password</label>
                                        <input
                                            className={styles.input}
                                            type="password"
                                            value={password}
                                            onChange={(e) => {
                                                setPassword(e.target.value);
                                                setTestResult(null);
                                            }}
                                            placeholder={
                                                editConnection?.hasPassword ? "••••••••" : "optional"
                                            }
                                        />
                                    </div>
                                </div>

                                {/* SSL */}
                                <div className={styles.field}>
                                    <label className={styles.checkboxLabel}>
                                        <input
                                            type="checkbox"
                                            checked={config.ssl}
                                            onChange={(e) => update({ ssl: e.target.checked })}
                                        />
                                        <span>Use SSL / TLS encryption</span>
                                    </label>
                                </div>
                            </>
                        )}

                        {/* Advanced Options Toggle */}
                        <button
                            type="button"
                            className={styles.advancedToggle}
                            onClick={() => setShowAdvanced((v) => !v)}
                        >
                            {showAdvanced ? "▾ Hide" : "▸ Show"} advanced options
                        </button>

                        {showAdvanced && (
                            <>
                                <div className={styles.sectionTitle}>Advanced</div>
                                <div className={styles.row}>
                                    <div className={styles.field}>
                                        <label className={styles.label}>
                                            Connection Timeout (ms)
                                        </label>
                                        <input
                                            className={styles.input}
                                            type="number"
                                            value={config.connectionTimeout}
                                            onChange={(e) =>
                                                update({
                                                    connectionTimeout:
                                                        parseInt(e.target.value, 10) || 15000,
                                                })
                                            }
                                        />
                                    </div>
                                    {!isSqlite && (
                                        <div className={styles.field}>
                                            <label className={styles.label}>Pool Size</label>
                                            <input
                                                className={styles.input}
                                                type="number"
                                                min="1"
                                                max="50"
                                                value={config.poolSize}
                                                onChange={(e) =>
                                                    update({
                                                        poolSize: parseInt(e.target.value, 10) || 5,
                                                    })
                                                }
                                            />
                                        </div>
                                    )}
                                </div>
                            </>
                        )}

                        {/* Test Result */}
                        {testResult && (
                            <div
                                className={`${styles.testResult} ${testResult.success ? styles.testSuccess : styles.testError}`}
                            >
                                {testResult.success ? "✓ " : "✗ "}
                                {testResult.message}
                            </div>
                        )}
                    </div>

                    <div className={styles.footer}>
                        <button
                            type="button"
                            className={styles.testBtn}
                            onClick={handleTest}
                            disabled={!isValid() || testing}
                        >
                            {testing ? "Testing…" : "Test Connection"}
                        </button>
                        <div className={styles.spacer} />
                        <button
                            type="button"
                            className={styles.cancelBtn}
                            onClick={onClose}
                        >
                            Cancel
                        </button>
                        <button
                            type="submit"
                            className={styles.saveBtn}
                            disabled={!isValid() || saving}
                        >
                            {saving ? "Saving…" : "Save"}
                        </button>
                    </div>
                </form>
            </div>
        </div>
    );
}
