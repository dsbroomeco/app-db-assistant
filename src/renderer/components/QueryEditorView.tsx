import {
    useState,
    useEffect,
    useRef,
    useCallback,
    useMemo,
} from "react";
import { useVirtualizer } from "@tanstack/react-virtual";
import { EditorView, keymap, lineNumbers, placeholder as cmPlaceholder } from "@codemirror/view";
import { EditorState, Compartment } from "@codemirror/state";
import { sql, StandardSQL } from "@codemirror/lang-sql";
import { autocompletion, type CompletionContext, type CompletionResult } from "@codemirror/autocomplete";
import { defaultKeymap, history, historyKeymap } from "@codemirror/commands";
import { searchKeymap, highlightSelectionMatches } from "@codemirror/search";
import { syntaxHighlighting, defaultHighlightStyle, bracketMatching } from "@codemirror/language";
import { oneDark } from "@codemirror/theme-one-dark";
import { useConnections } from "../context/ConnectionContext";
import { useSettings } from "../context/SettingsContext";
import {
    getExportMimeFilters,
} from "../utils/exportResults";
import type { ExecuteQueryResult, ExplainQueryResult, QueryHistoryEntry, ExportFormat, SavedQuery } from "@shared/types/database";
import styles from "./QueryEditorView.module.css";

interface QueryEditorViewProps {
    connectionId?: string;
}

type ResultsTab = "results" | "plan" | "history";

export function QueryEditorView({ connectionId: initialConnectionId }: QueryEditorViewProps) {
    const { connections, isConnected } = useConnections();
    const { settings } = useSettings();

    const [selectedConnectionId, setSelectedConnectionId] = useState(
        initialConnectionId ?? "",
    );
    const [executing, setExecuting] = useState(false);
    const [result, setResult] = useState<ExecuteQueryResult | null>(null);
    const [error, setError] = useState<string | null>(null);
    const [explainResult, setExplainResult] = useState<ExplainQueryResult | null>(null);
    const [historyEntries, setHistoryEntries] = useState<QueryHistoryEntry[]>([]);
    const [activeResultsTab, setActiveResultsTab] = useState<ResultsTab>("results");
    const [editorHeight, setEditorHeight] = useState(200);
    const [exportMenuOpen, setExportMenuOpen] = useState(false);
    const [savedQueries, setSavedQueries] = useState<SavedQuery[]>([]);
    const [savedQueriesOpen, setSavedQueriesOpen] = useState(false);
    const [saveQueryName, setSaveQueryName] = useState("");

    const editorRef = useRef<HTMLDivElement>(null);
    const viewRef = useRef<EditorView | null>(null);
    const themeCompartment = useRef(new Compartment());
    const completionCompartment = useRef(new Compartment());
    const resizing = useRef(false);
    const resizeStartY = useRef(0);
    const resizeStartH = useRef(0);

    const connectedConnections = useMemo(
        () => connections.filter((c) => isConnected(c.id)),
        [connections, isConnected],
    );

    // Auto-select first connected connection if none selected
    useEffect(() => {
        if (!selectedConnectionId && connectedConnections.length > 0) {
            setSelectedConnectionId(connectedConnections[0].id);
        }
    }, [selectedConnectionId, connectedConnections]);

    const isDark = useMemo(() => {
        if (settings.theme === "dark") return true;
        if (settings.theme === "light") return false;
        return window.matchMedia("(prefers-color-scheme: dark)").matches;
    }, [settings.theme]);

    const getEditorContent = useCallback((): string => {
        return viewRef.current?.state.doc.toString() ?? "";
    }, []);

    const setEditorContent = useCallback((text: string) => {
        const view = viewRef.current;
        if (!view) return;
        view.dispatch({
            changes: { from: 0, to: view.state.doc.length, insert: text },
        });
    }, []);

    // Load history
    const refreshHistory = useCallback(async () => {
        try {
            const entries = await window.electronAPI.invoke("query:history");
            setHistoryEntries(entries);
        } catch {
            // ignore
        }
    }, []);

    // Execute query
    const handleExecute = useCallback(async () => {
        const sqlText = getEditorContent().trim();
        if (!sqlText || !selectedConnectionId) return;

        setExecuting(true);
        setError(null);
        setResult(null);
        setExplainResult(null);
        setActiveResultsTab("results");

        try {
            const res = await window.electronAPI.invoke("query:execute", {
                connectionId: selectedConnectionId,
                sql: sqlText,
            });
            setResult(res);
        } catch (err) {
            setError(err instanceof Error ? err.message : String(err));
        } finally {
            setExecuting(false);
            refreshHistory();
        }
    }, [getEditorContent, selectedConnectionId, refreshHistory]);

    // Explain query
    const handleExplain = useCallback(async () => {
        const sqlText = getEditorContent().trim();
        if (!sqlText || !selectedConnectionId) return;

        setExecuting(true);
        setError(null);
        setExplainResult(null);
        setActiveResultsTab("plan");

        try {
            const res = await window.electronAPI.invoke("query:explain", {
                connectionId: selectedConnectionId,
                sql: sqlText,
            });
            setExplainResult(res);
        } catch (err) {
            setError(err instanceof Error ? err.message : String(err));
        } finally {
            setExecuting(false);
        }
    }, [getEditorContent, selectedConnectionId]);

    const handleClearHistory = useCallback(async () => {
        await window.electronAPI.invoke("query:history:clear");
        setHistoryEntries([]);
    }, []);

    const handleHistorySelect = useCallback(
        (entry: QueryHistoryEntry) => {
            setEditorContent(entry.sql);
            setActiveResultsTab("results");
        },
        [setEditorContent],
    );

    // Export
    const handleExport = useCallback(
        async (format: ExportFormat) => {
            setExportMenuOpen(false);
            if (!result || !selectedConnectionId) return;

            const sqlText = getEditorContent().trim();
            if (!sqlText) return;

            const filters = getExportMimeFilters(format);
            const filePath = await window.electronAPI.invoke("dialog:save-file", {
                title: "Export Query Results",
                filters,
            });
            if (!filePath) return;

            try {
                await window.electronAPI.invoke("query:export", {
                    connectionId: selectedConnectionId,
                    sql: sqlText,
                    format,
                    filePath,
                });
            } catch (err) {
                setError(err instanceof Error ? err.message : String(err));
            }
        },
        [result, selectedConnectionId, getEditorContent],
    );

    // Saved queries
    const refreshSavedQueries = useCallback(async () => {
        const queries: SavedQuery[] = await window.electronAPI.invoke("queries:list");
        setSavedQueries(queries);
    }, []);

    const handleSaveQuery = useCallback(async () => {
        const sql = getEditorContent().trim();
        if (!sql || !saveQueryName.trim()) return;
        await window.electronAPI.invoke("queries:save", {
            name: saveQueryName.trim(),
            sql,
            connectionId: selectedConnectionId || undefined,
        });
        setSaveQueryName("");
        await refreshSavedQueries();
    }, [getEditorContent, saveQueryName, selectedConnectionId, refreshSavedQueries]);

    const handleLoadQuery = useCallback((sq: SavedQuery) => {
        setEditorContent(sq.sql);
        setSavedQueriesOpen(false);
    }, [setEditorContent]);

    const handleDeleteQuery = useCallback(async (id: string) => {
        await window.electronAPI.invoke("queries:delete", id);
        await refreshSavedQueries();
    }, [refreshSavedQueries]);

    // Initialize CodeMirror editor
    useEffect(() => {
        if (!editorRef.current || viewRef.current) return;

        const runQueryKeymap = keymap.of([
            {
                key: "Ctrl-Enter",
                mac: "Cmd-Enter",
                run: () => {
                    handleExecute();
                    return true;
                },
            },
        ]);

        const state = EditorState.create({
            doc: "",
            extensions: [
                lineNumbers(),
                history(),
                bracketMatching(),
                highlightSelectionMatches(),
                syntaxHighlighting(defaultHighlightStyle, { fallback: true }),
                keymap.of([...defaultKeymap, ...historyKeymap, ...searchKeymap]),
                runQueryKeymap,
                sql({ dialect: StandardSQL }),
                cmPlaceholder("Write your SQL query here…"),
                completionCompartment.current.of(autocompletion()),
                themeCompartment.current.of(isDark ? oneDark : []),
                EditorView.lineWrapping,
            ],
        });

        const view = new EditorView({
            state,
            parent: editorRef.current,
        });

        viewRef.current = view;

        // Load history on mount
        refreshHistory();

        return () => {
            view.destroy();
            viewRef.current = null;
        };
        // Only run on mount — handleExecute is stable via ref pattern
        // eslint-disable-next-line react-hooks/exhaustive-deps
    }, []);

    // Update editor theme when it changes
    useEffect(() => {
        viewRef.current?.dispatch({
            effects: themeCompartment.current.reconfigure(isDark ? oneDark : []),
        });
    }, [isDark]);

    // Update autocomplete when connection changes
    useEffect(() => {
        if (!selectedConnectionId) return;

        let cancelled = false;

        (async () => {
            try {
                const items = await window.electronAPI.invoke(
                    "query:completions",
                    selectedConnectionId,
                );
                if (cancelled) return;

                const completionSource = (context: CompletionContext): CompletionResult | null => {
                    const word = context.matchBefore(/[\w.]+/);
                    if (!word && !context.explicit) return null;

                    const options = [
                        ...items.tables.map((t) => ({ label: t, type: "class" as const })),
                        ...items.columns.map((c) => ({ label: c, type: "property" as const })),
                        ...SQL_KEYWORDS.map((k) => ({ label: k, type: "keyword" as const })),
                    ];

                    return {
                        from: word?.from ?? context.pos,
                        options,
                        validFor: /^[\w.]*$/,
                    };
                };

                viewRef.current?.dispatch({
                    effects: completionCompartment.current.reconfigure(
                        autocompletion({ override: [completionSource] }),
                    ),
                });
            } catch {
                // connection may not be ready
            }
        })();

        return () => {
            cancelled = true;
        };
    }, [selectedConnectionId]);

    // Resize handle
    const handleResizeStart = useCallback(
        (e: React.MouseEvent) => {
            e.preventDefault();
            resizing.current = true;
            resizeStartY.current = e.clientY;
            resizeStartH.current = editorHeight;

            const onMove = (ev: MouseEvent) => {
                if (!resizing.current) return;
                const delta = ev.clientY - resizeStartY.current;
                setEditorHeight(Math.max(80, Math.min(600, resizeStartH.current + delta)));
            };

            const onUp = () => {
                resizing.current = false;
                document.removeEventListener("mousemove", onMove);
                document.removeEventListener("mouseup", onUp);
            };

            document.addEventListener("mousemove", onMove);
            document.addEventListener("mouseup", onUp);
        },
        [editorHeight],
    );

    // Close export menu on outside click
    useEffect(() => {
        if (!exportMenuOpen) return;
        const handler = () => setExportMenuOpen(false);
        document.addEventListener("click", handler, { once: true });
        return () => document.removeEventListener("click", handler);
    }, [exportMenuOpen]);

    const statusText = useMemo(() => {
        if (executing) return "Executing…";
        if (error) return "Error";
        if (result?.isModification) return `${result.affectedRows} row(s) affected · ${result.executionTime}ms`;
        if (result) return `${result.rowCount} row(s) · ${result.executionTime}ms`;
        return "";
    }, [executing, error, result]);

    return (
        <div className={styles.container}>
            {/* Toolbar */}
            <div className={styles.toolbar}>
                <select
                    className={styles.connectionSelect}
                    value={selectedConnectionId}
                    onChange={(e) => setSelectedConnectionId(e.target.value)}
                >
                    <option value="">Select connection…</option>
                    {connectedConnections.map((c) => (
                        <option key={c.id} value={c.id}>
                            {c.name}
                        </option>
                    ))}
                </select>

                <button
                    className={styles.runBtn}
                    onClick={handleExecute}
                    disabled={executing || !selectedConnectionId}
                    title="Execute query (Ctrl+Enter)"
                >
                    ▶ Run
                </button>

                <button
                    className={styles.toolbarBtn}
                    onClick={handleExplain}
                    disabled={executing || !selectedConnectionId}
                    title="Explain query plan"
                >
                    📊 Explain
                </button>

                <div className={styles.toolbarSpacer} />

                {result && !result.isModification && result.rowCount > 0 && (
                    <div className={styles.exportWrapper}>
                        <button
                            className={styles.toolbarBtn}
                            onClick={(e) => {
                                e.stopPropagation();
                                setExportMenuOpen(!exportMenuOpen);
                            }}
                        >
                            📥 Export
                        </button>
                        {exportMenuOpen && (
                            <div className={styles.exportMenu}>
                                <button className={styles.exportMenuItem} onClick={() => handleExport("csv")}>
                                    Export as CSV
                                </button>
                                <button className={styles.exportMenuItem} onClick={() => handleExport("json")}>
                                    Export as JSON
                                </button>
                                <button className={styles.exportMenuItem} onClick={() => handleExport("sql")}>
                                    Export as SQL INSERT
                                </button>
                            </div>
                        )}
                    </div>
                )}

                {statusText && <span className={styles.statusText}>{statusText}</span>}

                {/* Saved Queries */}
                <div className={styles.exportWrapper}>
                    <button
                        className={styles.toolbarBtn}
                        onClick={(e) => {
                            e.stopPropagation();
                            setSavedQueriesOpen(!savedQueriesOpen);
                            if (!savedQueriesOpen) refreshSavedQueries();
                        }}
                    >
                        📋 Saved
                    </button>
                    {savedQueriesOpen && (
                        <div className={styles.exportMenu} style={{ minWidth: 260, right: 0, maxHeight: 300, overflowY: "auto" }}>
                            <div style={{ padding: "4px 8px", display: "flex", gap: 4 }}>
                                <input
                                    type="text"
                                    value={saveQueryName}
                                    onChange={(e) => setSaveQueryName(e.target.value)}
                                    placeholder="Query name…"
                                    style={{ flex: 1, padding: "2px 6px", fontSize: 12, border: "1px solid var(--border)", borderRadius: "var(--radius)", background: "var(--bg-primary)" }}
                                    onClick={(e) => e.stopPropagation()}
                                />
                                <button
                                    className={styles.toolbarBtn}
                                    onClick={handleSaveQuery}
                                    disabled={!saveQueryName.trim()}
                                    style={{ fontSize: 11 }}
                                >
                                    Save
                                </button>
                            </div>
                            {savedQueries.length === 0 && (
                                <div style={{ padding: "8px 12px", color: "var(--text-secondary)", fontSize: 12 }}>
                                    No saved queries yet
                                </div>
                            )}
                            {savedQueries.map((sq) => (
                                <div
                                    key={sq.id}
                                    className={styles.exportMenuItem}
                                    style={{ display: "flex", justifyContent: "space-between", alignItems: "center" }}
                                >
                                    <span
                                        style={{ flex: 1, cursor: "pointer" }}
                                        onClick={() => handleLoadQuery(sq)}
                                        title={sq.sql}
                                    >
                                        {sq.name}
                                    </span>
                                    <button
                                        onClick={(e) => { e.stopPropagation(); handleDeleteQuery(sq.id); }}
                                        style={{ background: "none", border: "none", cursor: "pointer", padding: "0 4px", color: "var(--text-secondary)", fontSize: 12 }}
                                        title="Delete"
                                    >
                                        ✕
                                    </button>
                                </div>
                            ))}
                        </div>
                    )}
                </div>
            </div>

            {/* Editor */}
            <div
                className={styles.editorWrapper}
                ref={editorRef}
                style={{ height: editorHeight }}
            />

            {/* Resize handle */}
            <div
                className={`${styles.resizeHandle} ${resizing.current ? styles.resizeHandleActive : ""}`}
                onMouseDown={handleResizeStart}
            />

            {/* Results panel */}
            <div className={styles.resultsPanel}>
                <div className={styles.resultsTabs}>
                    <button
                        className={`${styles.resultsTab} ${activeResultsTab === "results" ? styles.resultsTabActive : ""}`}
                        onClick={() => setActiveResultsTab("results")}
                    >
                        Results
                    </button>
                    <button
                        className={`${styles.resultsTab} ${activeResultsTab === "plan" ? styles.resultsTabActive : ""}`}
                        onClick={() => setActiveResultsTab("plan")}
                    >
                        Query Plan
                    </button>
                    <button
                        className={`${styles.resultsTab} ${activeResultsTab === "history" ? styles.resultsTabActive : ""}`}
                        onClick={() => {
                            setActiveResultsTab("history");
                            refreshHistory();
                        }}
                    >
                        History
                    </button>
                </div>

                <div className={styles.resultsContent}>
                    {activeResultsTab === "results" && (
                        <ResultsView result={result} error={error} loading={executing} />
                    )}
                    {activeResultsTab === "plan" && (
                        <PlanView plan={explainResult} error={error} loading={executing} />
                    )}
                    {activeResultsTab === "history" && (
                        <HistoryView
                            entries={historyEntries}
                            onSelect={handleHistorySelect}
                            onClear={handleClearHistory}
                        />
                    )}
                </div>
            </div>
        </div>
    );
}

// ─── Sub-components ────────────────────────────────────────────

function ResultsView({
    result,
    error,
    loading,
}: {
    result: ExecuteQueryResult | null;
    error: string | null;
    loading: boolean;
}) {
    if (loading) {
        return <div className={styles.loading}>Executing query…</div>;
    }

    if (error) {
        return <div className={styles.error}>{error}</div>;
    }

    if (!result) {
        return (
            <div className={styles.emptyState}>
                <span className={styles.emptyStateIcon}>⚡</span>
                <p>Run a query to see results</p>
                <p className={styles.emptyStateHint}>Ctrl+Enter to execute</p>
            </div>
        );
    }

    if (result.isModification) {
        return (
            <div className={styles.modificationResult}>
                ✓ Query executed successfully — {result.affectedRows} row(s) affected ({result.executionTime}ms)
            </div>
        );
    }

    if (result.rowCount === 0) {
        return (
            <div className={styles.emptyState}>
                <p>Query returned no rows</p>
                <p className={styles.emptyStateHint}>{result.executionTime}ms</p>
            </div>
        );
    }

    return (
        <>
            {result.truncated && (
                <div style={{ padding: "6px 12px", background: "var(--warning-bg, #fffbeb)", color: "var(--warning-text, #92400e)", borderBottom: "1px solid var(--warning-border, #fcd34d)", fontSize: 12 }}>
                    Results truncated to 10,000 rows. Use <code>LIMIT</code> to retrieve a specific range.
                </div>
            )}
            <VirtualizedResultsTable result={result} />
        </>
    );
}

function VirtualizedResultsTable({ result }: { result: ExecuteQueryResult }) {
    const parentRef = useRef<HTMLDivElement>(null);
    const rowVirtualizer = useVirtualizer({
        count: result.rows.length,
        getScrollElement: () => parentRef.current,
        estimateSize: () => 30,
        overscan: 12,
    });
    const virtualRows = rowVirtualizer.getVirtualItems();
    const gridTemplateColumns = `56px repeat(${Math.max(1, result.columns.length)}, minmax(160px, 1fr))`;

    return (
        <div className={styles.virtualTable}>
            <div
                className={styles.virtualHeader}
                style={{ gridTemplateColumns }}
            >
                <div className={`${styles.virtualCell} ${styles.rowNumHeader}`}>#</div>
                {result.columns.map((col) => (
                    <div key={col} className={styles.virtualCell} title={col}>
                        {col}
                    </div>
                ))}
            </div>

            <div ref={parentRef} className={styles.virtualBody}>
                <div
                    className={styles.virtualCanvas}
                    style={{ height: `${rowVirtualizer.getTotalSize()}px` }}
                >
                    {virtualRows.map((virtualRow) => {
                        const row = result.rows[virtualRow.index];
                        return (
                            <div
                                key={virtualRow.key}
                                className={styles.virtualRow}
                                style={{
                                    gridTemplateColumns,
                                    transform: `translateY(${virtualRow.start}px)`,
                                }}
                            >
                                <div className={`${styles.virtualCell} ${styles.rowNum}`}>
                                    {virtualRow.index + 1}
                                </div>
                                {result.columns.map((col) => (
                                    <div key={col} className={styles.virtualCell}>
                                        <CellValue value={row[col]} />
                                    </div>
                                ))}
                            </div>
                        );
                    })}
                </div>
            </div>
        </div>
    );
}

function PlanView({
    plan,
    error,
    loading,
}: {
    plan: ExplainQueryResult | null;
    error: string | null;
    loading: boolean;
}) {
    if (loading) {
        return <div className={styles.loading}>Analyzing query…</div>;
    }
    if (error) {
        return <div className={styles.error}>{error}</div>;
    }
    if (!plan) {
        return (
            <div className={styles.emptyState}>
                <span className={styles.emptyStateIcon}>📊</span>
                <p>Click Explain to analyze a query plan</p>
            </div>
        );
    }
    return (
        <div className={styles.planOutput}>
            <div>{plan.plan}</div>
            <div style={{ marginTop: 12, color: "var(--text-muted)", fontSize: 11 }}>
                Analysis completed in {plan.executionTime}ms
            </div>
        </div>
    );
}

function HistoryView({
    entries,
    onSelect,
    onClear,
}: {
    entries: QueryHistoryEntry[];
    onSelect: (entry: QueryHistoryEntry) => void;
    onClear: () => void;
}) {
    if (entries.length === 0) {
        return (
            <div className={styles.emptyState}>
                <span className={styles.emptyStateIcon}>📝</span>
                <p>No query history yet</p>
            </div>
        );
    }

    return (
        <>
            <div className={styles.historyActions}>
                <button className={styles.clearHistoryBtn} onClick={onClear}>
                    Clear History
                </button>
            </div>
            <div className={styles.historyList}>
                {entries.map((entry) => (
                    <div
                        key={entry.id}
                        className={`${styles.historyItem} ${entry.error ? styles.historyError : ""}`}
                        onClick={() => onSelect(entry)}
                        title={entry.sql}
                    >
                        <span className={styles.historySql}>{entry.sql}</span>
                        <span className={styles.historyMeta}>
                            <span>{entry.connectionName}</span>
                            <span>{entry.executionTime}ms</span>
                            <span>
                                {new Date(entry.executedAt).toLocaleTimeString()}
                            </span>
                        </span>
                    </div>
                ))}
            </div>
        </>
    );
}

function CellValue({ value }: { value: unknown }) {
    if (value === null || value === undefined) {
        return <span className={styles.null}>NULL</span>;
    }
    if (typeof value === "boolean") {
        return <span className={styles.boolean}>{String(value)}</span>;
    }
    if (typeof value === "number" || typeof value === "bigint") {
        return <span className={styles.number}>{String(value)}</span>;
    }
    if (value instanceof Date) {
        return <span>{value.toISOString()}</span>;
    }
    if (typeof value === "object") {
        return <span className={styles.json}>{JSON.stringify(value)}</span>;
    }
    const str = String(value);
    const truncated = str.length > 200 ? str.slice(0, 200) + "…" : str;
    return <span title={str.length > 200 ? str : undefined}>{truncated}</span>;
}

// ─── SQL Keywords for autocomplete ─────────────────────────────

const SQL_KEYWORDS = [
    "SELECT", "FROM", "WHERE", "AND", "OR", "NOT", "IN", "LIKE",
    "BETWEEN", "IS", "NULL", "AS", "ON", "JOIN", "INNER", "LEFT",
    "RIGHT", "OUTER", "FULL", "CROSS", "GROUP", "BY", "ORDER",
    "ASC", "DESC", "HAVING", "LIMIT", "OFFSET", "UNION", "ALL",
    "INSERT", "INTO", "VALUES", "UPDATE", "SET", "DELETE", "CREATE",
    "TABLE", "ALTER", "DROP", "INDEX", "VIEW", "DISTINCT", "COUNT",
    "SUM", "AVG", "MIN", "MAX", "CASE", "WHEN", "THEN", "ELSE",
    "END", "EXISTS", "WITH", "RECURSIVE", "FETCH", "NEXT", "ROWS",
    "ONLY", "TRUNCATE", "BEGIN", "COMMIT", "ROLLBACK", "CASCADE",
    "CONSTRAINT", "PRIMARY", "KEY", "FOREIGN", "REFERENCES", "UNIQUE",
    "CHECK", "DEFAULT", "EXPLAIN", "ANALYZE", "COALESCE", "CAST",
    "SUBSTRING", "TRIM", "UPPER", "LOWER", "CONCAT", "REPLACE",
];
