import { useState, useEffect, useCallback } from "react";
import type { QueryResult } from "@shared/types/database";
import styles from "./TableDataView.module.css";

interface TableDataViewProps {
    connectionId: string;
    schema: string;
    table: string;
}

const PAGE_SIZE = 50;

export function TableDataView({
    connectionId,
    schema,
    table,
}: TableDataViewProps) {
    const [result, setResult] = useState<QueryResult | null>(null);
    const [loading, setLoading] = useState(true);
    const [error, setError] = useState<string | null>(null);
    const [page, setPage] = useState(0);

    const fetchData = useCallback(
        async (p: number) => {
            setLoading(true);
            setError(null);
            try {
                const data = await window.electronAPI.invoke("db:table-data", {
                    connectionId,
                    schema,
                    table,
                    page: p,
                    pageSize: PAGE_SIZE,
                });
                setResult(data);
                setPage(p);
            } catch (err) {
                setError(err instanceof Error ? err.message : String(err));
            } finally {
                setLoading(false);
            }
        },
        [connectionId, schema, table],
    );

    useEffect(() => {
        fetchData(0);
    }, [fetchData]);

    const totalPages = result
        ? Math.max(1, Math.ceil(result.totalRows / PAGE_SIZE))
        : 1;

    const handleRefresh = useCallback(() => {
        fetchData(page);
    }, [fetchData, page]);

    if (error) {
        return (
            <div className={styles.container}>
                <div className={styles.error}>{error}</div>
            </div>
        );
    }

    return (
        <div className={styles.container}>
            <div className={styles.toolbar}>
                <div className={styles.info}>
                    <span className={styles.tableName}>
                        {schema}.{table}
                    </span>
                    {result && (
                        <span className={styles.rowCount}>
                            {result.totalRows.toLocaleString()} rows
                        </span>
                    )}
                </div>
                <div className={styles.pagination}>
                    <button
                        className={styles.pageBtn}
                        onClick={() => fetchData(0)}
                        disabled={loading || page === 0}
                        title="First page"
                    >
                        ⏮
                    </button>
                    <button
                        className={styles.pageBtn}
                        onClick={() => fetchData(page - 1)}
                        disabled={loading || page === 0}
                        title="Previous page"
                    >
                        ◀
                    </button>
                    <span className={styles.pageInfo}>
                        Page {page + 1} of {totalPages}
                    </span>
                    <button
                        className={styles.pageBtn}
                        onClick={() => fetchData(page + 1)}
                        disabled={loading || !result?.hasMore}
                        title="Next page"
                    >
                        ▶
                    </button>
                    <button
                        className={styles.pageBtn}
                        onClick={() => fetchData(totalPages - 1)}
                        disabled={loading || !result?.hasMore}
                        title="Last page"
                    >
                        ⏭
                    </button>
                    <button
                        className={styles.refreshBtn}
                        onClick={handleRefresh}
                        disabled={loading}
                        title="Refresh data"
                    >
                        ↻
                    </button>
                </div>
            </div>

            <div className={styles.tableWrapper}>
                {loading && !result && (
                    <div className={styles.loading}>Loading data…</div>
                )}
                {result && (
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
                                    <td className={styles.rowNum}>
                                        {page * PAGE_SIZE + i + 1}
                                    </td>
                                    {result.columns.map((col) => (
                                        <td key={col}>
                                            <CellValue
                                                value={row[col]}
                                            />
                                        </td>
                                    ))}
                                </tr>
                            ))}
                            {result.rows.length === 0 && (
                                <tr>
                                    <td
                                        colSpan={result.columns.length + 1}
                                        className={styles.emptyRow}
                                    >
                                        No data
                                    </td>
                                </tr>
                            )}
                        </tbody>
                    </table>
                )}
                {loading && result && (
                    <div className={styles.loadingOverlay}>Loading…</div>
                )}
            </div>
        </div>
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
