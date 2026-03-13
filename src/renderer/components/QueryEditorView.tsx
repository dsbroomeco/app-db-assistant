import {
    useState,
    useEffect,
    useRef,
    useCallback,
    useMemo,
} from "react";
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
    exportResults,
    getExportMimeFilters,
} from "../utils/exportResults";
import type { ExecuteQueryResult, ExplainQueryResult, QueryHistoryEntry, ExportFormat } from "@shared/types/database";
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
    }, [getEditorContent, selectedConnectionId]);

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

    // Load history
    const refreshHistory = useCallback(async () => {
        try {
            const entries = await window.electronAPI.invoke("query:history");
            setHistoryEntries(entries);
        } catch {
            // ignore
        }
    }, []);

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
            if (!result) return;

            const filters = getExportMimeFilters(format);
            const filePath = await window.electronAPI.invoke("dialog:save-file", {
                title: "Export Query Results",
                filters,
            });
            if (!filePath) return;

            const content = exportResults(result, format);
            await window.electronAPI.invoke("file:write", { filePath, content });
        },
        [result],
    );

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
        <table className={styles.table}>
            <thead>
                <tr>
                    <th className={styles.rowNumHeader}>#</th>
                    {result.columns.map((col) => (
                        <th key={col}>{col}</th>
                    ))}
                </tr>
            </thead>
            <tbody>
                {result.rows.map((row, i) => (
                    <tr key={i}>
                        <td className={styles.rowNum}>{i + 1}</td>
                        {result.columns.map((col) => (
                            <td key={col}>
                                <CellValue value={row[col]} />
                            </td>
                        ))}
                    </tr>
                ))}
            </tbody>
        </table>
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
