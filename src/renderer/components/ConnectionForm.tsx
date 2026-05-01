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

const DB_TYPES: DatabaseType[] = ["postgresql", "mysql", "sqlite", "mssql", "mongodb", "redis"];

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
                sslRejectUnauthorized: editConnection.sslRejectUnauthorized,
                filepath: editConnection.filepath,
                connectionTimeout: editConnection.connectionTimeout,
                poolSize: editConnection.poolSize,
                sshEnabled: editConnection.sshEnabled,
                sshHost: editConnection.sshHost,
                sshPort: editConnection.sshPort,
                sshUsername: editConnection.sshUsername,
                sshAuthMethod: editConnection.sshAuthMethod,
                sshPrivateKeyPath: editConnection.sshPrivateKeyPath,
            };
        }
        return newConnectionConfig("postgresql");
    });

    const [password, setPassword] = useState("");
    const [sshPassword, setSshPassword] = useState("");
    const [showAdvanced, setShowAdvanced] = useState(false);
    const [testing, setTesting] = useState(false);
    const [saving, setSaving] = useState(false);
    const [testResult, setTestResult] = useState<TestConnectionResult | null>(
        null,
    );

    const isSqlite = config.type === "sqlite";
    const isRedis = config.type === "redis";
    const isMongo = config.type === "mongodb";
    const needsHostPort = !isSqlite;

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

    const handleBrowseSshKey = useCallback(async () => {
        const filepath = await window.electronAPI.invoke("dialog:open-file", {
            title: "Select SSH Private Key",
            filters: [{ name: "All Files", extensions: ["*"] }],
        });
        if (filepath) {
            update({ sshPrivateKeyPath: filepath });
        }
    }, [update]);

    const handleTest = useCallback(async () => {
        setTesting(true);
        setTestResult(null);
        const result = await testConnection(config, password || undefined, sshPassword || undefined);
        setTestResult(result);
        setTesting(false);
    }, [config, password, sshPassword, testConnection]);

    const handleSave = useCallback(
        async (e: FormEvent) => {
            e.preventDefault();
            setSaving(true);
            await saveConnection(config, password || undefined, sshPassword || undefined);
            setSaving(false);
            onClose();
        },
        [config, password, sshPassword, saveConnection, onClose],
    );

    const isValid = () => {
        if (!config.name.trim()) return false;
        if (isSqlite) return !!config.filepath.trim();
        if (!config.host.trim()) return false;
        if (!Number.isInteger(config.port) || config.port < 1 || config.port > 65535) return false;
        if (config.sshEnabled) {
            if (!config.sshHost.trim()) return false;
            if (!Number.isInteger(config.sshPort) || config.sshPort < 1 || config.sshPort > 65535) return false;
        }
        return true;
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
                                            min={1}
                                            max={65535}
                                            value={config.port}
                                            onChange={(e) => {
                                                const p = parseInt(e.target.value, 10) || 0;
                                                update({ port: Math.min(65535, Math.max(0, p)) });
                                            }}
                                            placeholder={String(
                                                config.type !== "sqlite"
                                                    ? DEFAULT_PORTS[config.type]
                                                    : ""
                                            )}
                                        />
                                    </div>
                                </div>

                                {/* Database — different label/placeholder for different types */}
                                {!isRedis && (
                                    <div className={styles.field}>
                                        <label className={styles.label}>
                                            {isMongo ? "Auth Database" : "Database"}
                                        </label>
                                        <input
                                            className={styles.input}
                                            type="text"
                                            value={config.database}
                                            onChange={(e) => update({ database: e.target.value })}
                                            placeholder={isMongo ? "admin (optional)" : "my_database"}
                                        />
                                    </div>
                                )}
                                {isRedis && (
                                    <div className={styles.field}>
                                        <label className={styles.label}>
                                            Database Index
                                        </label>
                                        <input
                                            className={styles.input}
                                            type="number"
                                            min="0"
                                            max="15"
                                            value={config.database || "0"}
                                            onChange={(e) => update({ database: e.target.value })}
                                            placeholder="0"
                                        />
                                    </div>
                                )}

                                {/* Username & Password */}
                                <div className={styles.row}>
                                    {!isRedis && (
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
                                    )}
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
                                        <span>{isMongo ? "Use TLS encryption" : "Use SSL / TLS encryption"}</span>
                                    </label>
                                </div>
                                {config.ssl && (
                                    <div className={styles.field}>
                                        <label className={styles.checkboxLabel}>
                                            <input
                                                type="checkbox"
                                                checked={config.sslRejectUnauthorized}
                                                onChange={(e) => update({ sslRejectUnauthorized: e.target.checked })}
                                            />
                                            <span>Verify server certificate (disable for self-signed certs)</span>
                                        </label>
                                    </div>
                                )}
                            </>
                        )}

                        {/* SSH Tunnel (for non-SQLite connections) */}
                        {needsHostPort && (
                            <>
                                <div className={styles.sectionTitle}>SSH Tunnel</div>
                                <div className={styles.field}>
                                    <label className={styles.checkboxLabel}>
                                        <input
                                            type="checkbox"
                                            checked={config.sshEnabled}
                                            onChange={(e) => update({ sshEnabled: e.target.checked })}
                                        />
                                        <span>Connect via SSH tunnel</span>
                                    </label>
                                </div>

                                {config.sshEnabled && (
                                    <>
                                        <div className={styles.row}>
                                            <div className={styles.field}>
                                                <label className={styles.label}>SSH Host</label>
                                                <input
                                                    className={styles.input}
                                                    type="text"
                                                    value={config.sshHost}
                                                    onChange={(e) => update({ sshHost: e.target.value })}
                                                    placeholder="ssh.example.com"
                                                />
                                            </div>
                                            <div className={styles.field}>
                                                <label className={styles.label}>SSH Port</label>
                                                <input
                                                    className={styles.input}
                                                    type="number"
                                                    min={1}
                                                    max={65535}
                                                    value={config.sshPort}
                                                    onChange={(e) => {
                                                        const p = parseInt(e.target.value, 10) || 22;
                                                        update({ sshPort: Math.min(65535, Math.max(1, p)) });
                                                    }}
                                                    placeholder="22"
                                                />
                                            </div>
                                        </div>

                                        <div className={styles.field}>
                                            <label className={styles.label}>SSH Username</label>
                                            <input
                                                className={styles.input}
                                                type="text"
                                                value={config.sshUsername}
                                                onChange={(e) => update({ sshUsername: e.target.value })}
                                                placeholder="user"
                                            />
                                        </div>

                                        <div className={styles.field}>
                                            <label className={styles.label}>Auth Method</label>
                                            <select
                                                className={styles.select}
                                                value={config.sshAuthMethod}
                                                onChange={(e) =>
                                                    update({ sshAuthMethod: e.target.value as "password" | "privateKey" })
                                                }
                                            >
                                                <option value="password">Password</option>
                                                <option value="privateKey">Private Key</option>
                                            </select>
                                        </div>

                                        {config.sshAuthMethod === "password" ? (
                                            <div className={styles.field}>
                                                <label className={styles.label}>SSH Password</label>
                                                <input
                                                    className={styles.input}
                                                    type="password"
                                                    value={sshPassword}
                                                    onChange={(e) => {
                                                        setSshPassword(e.target.value);
                                                        setTestResult(null);
                                                    }}
                                                    placeholder={
                                                        editConnection?.hasSshPassword ? "••••••••" : "SSH password"
                                                    }
                                                />
                                            </div>
                                        ) : (
                                            <div className={styles.field}>
                                                <label className={styles.label}>Private Key File</label>
                                                <div className={styles.fileRow}>
                                                    <input
                                                        className={styles.input}
                                                        type="text"
                                                        value={config.sshPrivateKeyPath}
                                                        onChange={(e) =>
                                                            update({ sshPrivateKeyPath: e.target.value })
                                                        }
                                                        placeholder="~/.ssh/id_rsa"
                                                    />
                                                    <button
                                                        type="button"
                                                        className={styles.browseBtn}
                                                        onClick={handleBrowseSshKey}
                                                    >
                                                        Browse…
                                                    </button>
                                                </div>
                                                <div className={styles.field}>
                                                    <label className={styles.label}>Passphrase (optional)</label>
                                                    <input
                                                        className={styles.input}
                                                        type="password"
                                                        value={sshPassword}
                                                        onChange={(e) => {
                                                            setSshPassword(e.target.value);
                                                            setTestResult(null);
                                                        }}
                                                        placeholder="Key passphrase"
                                                    />
                                                </div>
                                            </div>
                                        )}
                                    </>
                                )}
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
