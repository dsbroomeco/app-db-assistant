import { useState, useEffect, useCallback, useRef, useMemo } from "react";
import type { QueryResult, CrudResult } from "@shared/types/database";
import styles from "./TableDataView.module.css";

interface TableDataViewProps {
    connectionId: string;
    schema: string;
    table: string;
}

const PAGE_SIZE = 50;

interface EditingCell {
    rowIndex: number;
    column: string;
    value: string;
}

interface NewRowData {
    [column: string]: string;
}

export function TableDataView({
    connectionId,
    schema,
    table,
}: TableDataViewProps) {
    const [result, setResult] = useState<QueryResult | null>(null);
    const [loading, setLoading] = useState(true);
    const [error, setError] = useState<string | null>(null);
    const [page, setPage] = useState(0);
    const [primaryKeys, setPrimaryKeys] = useState<string[]>([]);
    const [selectedRows, setSelectedRows] = useState<Set<number>>(new Set());
    const [editingCell, setEditingCell] = useState<EditingCell | null>(null);
    const [showAddRow, setShowAddRow] = useState(false);
    const [newRow, setNewRow] = useState<NewRowData>({});
    const [statusMessage, setStatusMessage] = useState<string | null>(null);
    const [contextMenu, setContextMenu] = useState<{
        x: number;
        y: number;
        rowIndex: number;
        column?: string;
    } | null>(null);
    const [colWidths, setColWidths] = useState<Record<string, number>>({});

    const tableRef = useRef<HTMLDivElement>(null);
    const editInputRef = useRef<HTMLInputElement>(null);

    // Load primary keys once
    useEffect(() => {
        window.electronAPI
            .invoke("crud:get-primary-keys", { connectionId, schema, table })
            .then(setPrimaryKeys)
            .catch(() => setPrimaryKeys([]));
    }, [connectionId, schema, table]);

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
                setSelectedRows(new Set());
                setEditingCell(null);
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

    const showStatus = useCallback((msg: string) => {
        setStatusMessage(msg);
        setTimeout(() => setStatusMessage(null), 3000);
    }, []);

    // ─── Row selection ──────────────────────────────────────────

    const hasPrimaryKeys = primaryKeys.length > 0;

    const toggleRowSelect = useCallback(
        (index: number, event: React.MouseEvent) => {
            setSelectedRows((prev) => {
                const next = new Set(prev);
                if (event.shiftKey && prev.size > 0) {
                    // Range select
                    const sorted = Array.from(prev).sort((a, b) => a - b);
                    const last = sorted[sorted.length - 1];
                    const [from, to] = last < index ? [last, index] : [index, last];
                    for (let i = from; i <= to; i++) next.add(i);
                } else if (event.ctrlKey || event.metaKey) {
                    if (next.has(index)) next.delete(index);
                    else next.add(index);
                } else {
                    if (next.has(index) && next.size === 1) {
                        next.delete(index);
                    } else {
                        next.clear();
                        next.add(index);
                    }
                }
                return next;
            });
        },
        [],
    );

    const selectAll = useCallback(() => {
        if (!result) return;
        if (selectedRows.size === result.rows.length) {
            setSelectedRows(new Set());
        } else {
            setSelectedRows(
                new Set(result.rows.map((_, i) => i)),
            );
        }
    }, [result, selectedRows.size]);

    // ─── Primary key extractor ──────────────────────────────────

    const getRowPK = useCallback(
        (row: Record<string, unknown>): Record<string, unknown> => {
            const pk: Record<string, unknown> = {};
            for (const col of primaryKeys) {
                pk[col] = row[col];
            }
            return pk;
        },
        [primaryKeys],
    );

    // ─── Inline editing ─────────────────────────────────────────

    const startEditing = useCallback(
        (rowIndex: number, column: string) => {
            if (!hasPrimaryKeys) return;
            const row = result?.rows[rowIndex];
            if (!row) return;
            const val = row[column];
            setEditingCell({
                rowIndex,
                column,
                value: val === null || val === undefined ? "" : String(val),
            });
            setTimeout(() => editInputRef.current?.focus(), 0);
        },
        [hasPrimaryKeys, result],
    );

    const cancelEditing = useCallback(() => {
        setEditingCell(null);
    }, []);

    const commitEdit = useCallback(async () => {
        if (!editingCell || !result) return;
        const row = result.rows[editingCell.rowIndex];
        if (!row) return;

        const originalValue = row[editingCell.column];
        const originalStr =
            originalValue === null || originalValue === undefined
                ? ""
                : String(originalValue);

        if (editingCell.value === originalStr) {
            cancelEditing();
            return;
        }

        // Parse the value — convert "NULL" (case-insensitive) to null
        let parsedValue: unknown = editingCell.value;
        if (editingCell.value.toLowerCase() === "null" || editingCell.value === "") {
            parsedValue = null;
        } else if (!isNaN(Number(editingCell.value)) && editingCell.value.trim() !== "") {
            parsedValue = Number(editingCell.value);
        }

        try {
            const res: CrudResult = await window.electronAPI.invoke(
                "crud:update-row",
                {
                    connectionId,
                    schema,
                    table,
                    primaryKey: getRowPK(row),
                    changes: { [editingCell.column]: parsedValue },
                },
            );
            if (res.success) {
                showStatus(`Updated ${res.affectedRows} row(s)`);
                // Optimistically update the local data
                setResult((prev) => {
                    if (!prev) return prev;
                    const newRows = [...prev.rows];
                    newRows[editingCell.rowIndex] = {
                        ...newRows[editingCell.rowIndex],
                        [editingCell.column]: parsedValue,
                    };
                    return { ...prev, rows: newRows };
                });
            }
        } catch (err) {
            showStatus(
                `Update failed: ${err instanceof Error ? err.message : String(err)}`,
            );
        }
        cancelEditing();
    }, [
        editingCell,
        result,
        connectionId,
        schema,
        table,
        getRowPK,
        cancelEditing,
        showStatus,
    ]);

    // ─── Add row ────────────────────────────────────────────────

    const handleAddRow = useCallback(() => {
        if (!result) return;
        const emptyRow: NewRowData = {};
        for (const col of result.columns) {
            emptyRow[col] = "";
        }
        setNewRow(emptyRow);
        setShowAddRow(true);
    }, [result]);

    const cancelAddRow = useCallback(() => {
        setShowAddRow(false);
        setNewRow({});
    }, []);

    const submitNewRow = useCallback(async () => {
        if (!result) return;
        // Build the row, converting empty strings to null and numbers
        const parsedRow: Record<string, unknown> = {};
        for (const col of result.columns) {
            const val = newRow[col];
            if (val === "" || val === undefined) {
                parsedRow[col] = null;
            } else if (!isNaN(Number(val)) && val.trim() !== "") {
                parsedRow[col] = Number(val);
            } else if (val.toLowerCase() === "null") {
                parsedRow[col] = null;
            } else {
                parsedRow[col] = val;
            }
        }

        // Filter out null values so the DB can use defaults
        const filteredRow: Record<string, unknown> = {};
        for (const [k, v] of Object.entries(parsedRow)) {
            if (v !== null) filteredRow[k] = v;
        }

        if (Object.keys(filteredRow).length === 0) {
            showStatus("Cannot insert a completely empty row");
            return;
        }

        try {
            const res = await window.electronAPI.invoke("crud:insert-row", {
                connectionId,
                schema,
                table,
                row: filteredRow,
            });
            if (res.success) {
                showStatus(`Inserted ${res.affectedRows} row(s)`);
                cancelAddRow();
                fetchData(page);
            }
        } catch (err) {
            showStatus(
                `Insert failed: ${err instanceof Error ? err.message : String(err)}`,
            );
        }
    }, [
        result,
        newRow,
        connectionId,
        schema,
        table,
        showStatus,
        cancelAddRow,
        fetchData,
        page,
    ]);

    // ─── Delete rows ────────────────────────────────────────────

    const handleDeleteSelected = useCallback(async () => {
        if (!result || selectedRows.size === 0 || !hasPrimaryKeys) return;

        const confirmed = confirm(
            `Delete ${selectedRows.size} row(s)? This cannot be undone.`,
        );
        if (!confirmed) return;

        const pks = Array.from(selectedRows).map((i) =>
            getRowPK(result.rows[i]),
        );

        try {
            const res = await window.electronAPI.invoke("crud:delete-rows", {
                connectionId,
                schema,
                table,
                primaryKeys: pks,
            });
            if (res.success) {
                showStatus(`Deleted ${res.affectedRows} row(s)`);
                setSelectedRows(new Set());
                fetchData(page);
            }
        } catch (err) {
            showStatus(
                `Delete failed: ${err instanceof Error ? err.message : String(err)}`,
            );
        }
    }, [
        result,
        selectedRows,
        hasPrimaryKeys,
        getRowPK,
        connectionId,
        schema,
        table,
        showStatus,
        fetchData,
        page,
    ]);

    // ─── Copy operations ────────────────────────────────────────

    const copyToClipboard = useCallback(
        (text: string) => {
            navigator.clipboard.writeText(text).then(() => {
                showStatus("Copied to clipboard");
            });
        },
        [showStatus],
    );

    const copyCellValue = useCallback(
        (rowIndex: number, column: string) => {
            if (!result) return;
            const val = result.rows[rowIndex]?.[column];
            copyToClipboard(
                val === null || val === undefined
                    ? "NULL"
                    : typeof val === "object"
                        ? JSON.stringify(val)
                        : String(val),
            );
        },
        [result, copyToClipboard],
    );

    const copyRow = useCallback(
        (rowIndex: number) => {
            if (!result) return;
            const row = result.rows[rowIndex];
            copyToClipboard(JSON.stringify(row, null, 2));
        },
        [result, copyToClipboard],
    );

    const copyColumn = useCallback(
        (column: string) => {
            if (!result) return;
            const values = result.rows.map((row) => {
                const v = row[column];
                return v === null || v === undefined
                    ? "NULL"
                    : typeof v === "object"
                        ? JSON.stringify(v)
                        : String(v);
            });
            copyToClipboard(values.join("\n"));
        },
        [result, copyToClipboard],
    );

    const copySelectedRows = useCallback(() => {
        if (!result || selectedRows.size === 0) return;
        const rows = Array.from(selectedRows)
            .sort((a, b) => a - b)
            .map((i) => result.rows[i]);
        copyToClipboard(JSON.stringify(rows, null, 2));
    }, [result, selectedRows, copyToClipboard]);

    // ─── Context menu ───────────────────────────────────────────

    const handleContextMenu = useCallback(
        (e: React.MouseEvent, rowIndex: number, column?: string) => {
            e.preventDefault();
            e.stopPropagation();
            // Select row if not already selected
            if (!selectedRows.has(rowIndex)) {
                setSelectedRows(new Set([rowIndex]));
            }
            setContextMenu({ x: e.clientX, y: e.clientY, rowIndex, column });
        },
        [selectedRows],
    );

    const closeContextMenu = useCallback(() => {
        setContextMenu(null);
    }, []);

    // Close context menu on click anywhere
    useEffect(() => {
        if (!contextMenu) return;
        const handler = () => closeContextMenu();
        document.addEventListener("click", handler);
        return () => document.removeEventListener("click", handler);
    }, [contextMenu, closeContextMenu]);

    // ─── Column resize ──────────────────────────────────────────

    const startResize = useCallback(
        (col: string, e: React.MouseEvent<HTMLDivElement>) => {
            e.preventDefault();
            e.stopPropagation();
            const th = (e.currentTarget as HTMLDivElement).closest(
                "th",
            ) as HTMLElement;
            const startWidth = th.offsetWidth;
            const startX = e.clientX;

            const onMove = (ev: MouseEvent) => {
                const delta = ev.clientX - startX;
                const newWidth = Math.max(60, startWidth + delta);
                setColWidths((prev) => ({ ...prev, [col]: newWidth }));
            };

            const onUp = () => {
                document.removeEventListener("mousemove", onMove);
                document.removeEventListener("mouseup", onUp);
                document.body.style.cursor = "";
                document.body.style.userSelect = "";
            };

            document.addEventListener("mousemove", onMove);
            document.addEventListener("mouseup", onUp);
            document.body.style.cursor = "col-resize";
            document.body.style.userSelect = "none";
        },
        [],
    );

    // ─── Keyboard shortcuts ─────────────────────────────────────

    useEffect(() => {
        const handleKeyDown = (e: KeyboardEvent) => {
            // Only handle when this view is focused
            if (!tableRef.current?.contains(document.activeElement) &&
                document.activeElement !== document.body) {
                return;
            }

            const isMod = e.ctrlKey || e.metaKey;

            // Escape: cancel edit or close add row
            if (e.key === "Escape") {
                if (editingCell) {
                    cancelEditing();
                    e.preventDefault();
                } else if (showAddRow) {
                    cancelAddRow();
                    e.preventDefault();
                } else if (contextMenu) {
                    closeContextMenu();
                    e.preventDefault();
                }
                return;
            }

            // Enter: commit edit
            if (e.key === "Enter" && editingCell) {
                commitEdit();
                e.preventDefault();
                return;
            }

            // Ctrl+N: add row
            if (isMod && e.key === "n" && !editingCell && !showAddRow) {
                e.preventDefault();
                handleAddRow();
                return;
            }

            // Delete or Backspace: delete selected rows
            if (
                (e.key === "Delete" || e.key === "Backspace") &&
                !editingCell &&
                !showAddRow &&
                selectedRows.size > 0 &&
                hasPrimaryKeys
            ) {
                e.preventDefault();
                handleDeleteSelected();
                return;
            }

            // Ctrl+A: select all
            if (isMod && e.key === "a" && !editingCell && !showAddRow) {
                e.preventDefault();
                selectAll();
                return;
            }

            // Ctrl+C: copy selected
            if (isMod && e.key === "c" && !editingCell) {
                e.preventDefault();
                if (selectedRows.size > 0) {
                    copySelectedRows();
                }
                return;
            }

            // F2: edit selected cell (first selected row, first column)
            if (e.key === "F2" && selectedRows.size === 1 && !editingCell && hasPrimaryKeys) {
                e.preventDefault();
                const idx = Array.from(selectedRows)[0];
                if (result?.columns[0]) {
                    startEditing(idx, result.columns[0]);
                }
                return;
            }
        };

        document.addEventListener("keydown", handleKeyDown);
        return () => document.removeEventListener("keydown", handleKeyDown);
    }, [
        editingCell,
        showAddRow,
        contextMenu,
        selectedRows,
        hasPrimaryKeys,
        result,
        cancelEditing,
        cancelAddRow,
        closeContextMenu,
        commitEdit,
        handleAddRow,
        handleDeleteSelected,
        selectAll,
        copySelectedRows,
        startEditing,
    ]);

    // ─── Memoized selection state ───────────────────────────────

    const allSelected = useMemo(
        () => result !== null && result.rows.length > 0 && selectedRows.size === result.rows.length,
        [result, selectedRows.size],
    );

    // ─── Render ─────────────────────────────────────────────────

    if (error) {
        return (
            <div className={styles.container}>
                <div className={styles.error}>{error}</div>
            </div>
        );
    }

    return (
        <div className={styles.container} ref={tableRef} tabIndex={-1}>
            {/* Toolbar */}
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
                    {selectedRows.size > 0 && (
                        <span className={styles.selectionCount}>
                            {selectedRows.size} selected
                        </span>
                    )}
                </div>
                <div className={styles.actions}>
                    {hasPrimaryKeys && (
                        <>
                            <button
                                className={styles.actionButton}
                                onClick={handleAddRow}
                                disabled={loading || showAddRow}
                                title="Add row (Ctrl+N)"
                            >
                                ＋ Add Row
                            </button>
                            <button
                                className={`${styles.actionButton} ${styles.dangerButton}`}
                                onClick={handleDeleteSelected}
                                disabled={
                                    loading || selectedRows.size === 0
                                }
                                title="Delete selected rows (Delete)"
                            >
                                ✕ Delete ({selectedRows.size})
                            </button>
                        </>
                    )}
                    <button
                        className={styles.actionButton}
                        onClick={copySelectedRows}
                        disabled={selectedRows.size === 0}
                        title="Copy selected rows (Ctrl+C)"
                    >
                        📋 Copy
                    </button>
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

            {/* Status message */}
            {statusMessage && (
                <div className={styles.statusBar}>{statusMessage}</div>
            )}

            {/* Table */}
            <div className={styles.tableWrapper}>
                {loading && !result && (
                    <div className={styles.loading}>Loading data…</div>
                )}
                {result && (
                    <table className={styles.table}>
                        <thead>
                            <tr>
                                <th className={styles.checkboxHeader}>
                                    <input
                                        type="checkbox"
                                        checked={allSelected}
                                        onChange={selectAll}
                                        title="Select all (Ctrl+A)"
                                    />
                                </th>
                                <th className={styles.rowNumHeader}>#</th>
                                {result.columns.map((col) => (
                                    <th
                                        key={col}
                                        style={{ width: colWidths[col] || undefined }}
                                        onContextMenu={(e) => {
                                            e.preventDefault();
                                            copyColumn(col);
                                        }}
                                        title={
                                            primaryKeys.includes(col)
                                                ? `${col} (PK)`
                                                : col
                                        }
                                    >
                                        {primaryKeys.includes(col) && (
                                            <span className={styles.pkIcon}>🔑</span>
                                        )}
                                        {col}
                                        <div
                                            className={styles.resizeHandle}
                                            onMouseDown={(e) =>
                                                startResize(col, e)
                                            }
                                        />
                                    </th>
                                ))}
                            </tr>
                        </thead>
                        <tbody>
                            {/* Add row form */}
                            {showAddRow && (
                                <tr className={styles.addRowForm}>
                                    <td colSpan={2} className={styles.addRowActions}>
                                        <button
                                            className={styles.smallBtn}
                                            onClick={submitNewRow}
                                            title="Save row"
                                        >
                                            ✓
                                        </button>
                                        <button
                                            className={styles.smallBtn}
                                            onClick={cancelAddRow}
                                            title="Cancel (Esc)"
                                        >
                                            ✕
                                        </button>
                                    </td>
                                    {result.columns.map((col) => (
                                        <td
                                            key={col}
                                            style={
                                                colWidths[col] !== undefined
                                                    ? { maxWidth: colWidths[col] }
                                                    : undefined
                                            }
                                        >
                                            <input
                                                className={styles.cellInput}
                                                value={newRow[col] ?? ""}
                                                onChange={(e) =>
                                                    setNewRow((prev) => ({
                                                        ...prev,
                                                        [col]: e.target.value,
                                                    }))
                                                }
                                                onKeyDown={(e) => {
                                                    if (e.key === "Enter") submitNewRow();
                                                    if (e.key === "Escape") cancelAddRow();
                                                }}
                                                placeholder={
                                                    primaryKeys.includes(col) ? "PK" : "NULL"
                                                }
                                                autoFocus={col === result.columns[0]}
                                            />
                                        </td>
                                    ))}
                                </tr>
                            )}

                            {/* Data rows */}
                            {result.rows.map((row, i) => (
                                <tr
                                    key={i}
                                    className={
                                        selectedRows.has(i)
                                            ? styles.selectedRow
                                            : undefined
                                    }
                                    onClick={(e) => toggleRowSelect(i, e)}
                                    onContextMenu={(e) =>
                                        handleContextMenu(e, i)
                                    }
                                >
                                    <td className={styles.checkboxCell}>
                                        <input
                                            type="checkbox"
                                            checked={selectedRows.has(i)}
                                            onChange={() => { }}
                                            tabIndex={-1}
                                        />
                                    </td>
                                    <td className={styles.rowNum}>
                                        {page * PAGE_SIZE + i + 1}
                                    </td>
                                    {result.columns.map((col) => (
                                        <td
                                            key={col}
                                            onDoubleClick={() =>
                                                startEditing(i, col)
                                            }
                                            onContextMenu={(e) =>
                                                handleContextMenu(e, i, col)
                                            }
                                            className={
                                                editingCell?.rowIndex === i &&
                                                    editingCell?.column === col
                                                    ? styles.editingCell
                                                    : undefined
                                            }
                                            style={
                                                colWidths[col] !== undefined
                                                    ? { maxWidth: colWidths[col] }
                                                    : undefined
                                            }
                                        >
                                            {editingCell?.rowIndex === i &&
                                                editingCell?.column === col ? (
                                                <input
                                                    ref={editInputRef}
                                                    className={styles.cellInput}
                                                    value={editingCell.value}
                                                    onChange={(e) =>
                                                        setEditingCell(
                                                            (prev) =>
                                                                prev
                                                                    ? {
                                                                        ...prev,
                                                                        value: e.target.value,
                                                                    }
                                                                    : null,
                                                        )
                                                    }
                                                    onKeyDown={(e) => {
                                                        if (e.key === "Enter")
                                                            commitEdit();
                                                        if (e.key === "Escape")
                                                            cancelEditing();
                                                        e.stopPropagation();
                                                    }}
                                                    onBlur={commitEdit}
                                                    onClick={(e) =>
                                                        e.stopPropagation()
                                                    }
                                                />
                                            ) : (
                                                <CellValue value={row[col]} />
                                            )}
                                        </td>
                                    ))}
                                </tr>
                            ))}
                            {result.rows.length === 0 && !showAddRow && (
                                <tr>
                                    <td
                                        colSpan={result.columns.length + 2}
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

            {/* Shortcut hints */}
            {hasPrimaryKeys && (
                <div className={styles.shortcutBar}>
                    <span>Double-click cell to edit</span>
                    <span>F2 — Edit</span>
                    <span>Ctrl+N — Add row</span>
                    <span>Del — Delete selected</span>
                    <span>Ctrl+A — Select all</span>
                    <span>Ctrl+C — Copy</span>
                </div>
            )}

            {/* Context menu */}
            {contextMenu && (
                <ContextMenu
                    x={contextMenu.x}
                    y={contextMenu.y}
                    rowIndex={contextMenu.rowIndex}
                    column={contextMenu.column}
                    selectedCount={selectedRows.size}
                    hasPK={hasPrimaryKeys}
                    onCopyCell={copyCellValue}
                    onCopyRow={copyRow}
                    onCopyColumn={copyColumn}
                    onCopySelected={copySelectedRows}
                    onEditCell={startEditing}
                    onDeleteRow={(rowIndex) => {
                        if (!result || !hasPrimaryKeys) return;
                        const pk = getRowPK(result.rows[rowIndex]);
                        const confirmed = confirm(
                            "Delete this row? This cannot be undone.",
                        );
                        if (!confirmed) return;
                        window.electronAPI
                            .invoke("crud:delete-rows", {
                                connectionId,
                                schema,
                                table,
                                primaryKeys: [pk],
                            })
                            .then((res) => {
                                if (res.success) {
                                    showStatus(`Deleted ${res.affectedRows} row(s)`);
                                    fetchData(page);
                                }
                            })
                            .catch((err) =>
                                showStatus(
                                    `Delete failed: ${err instanceof Error ? err.message : String(err)}`,
                                ),
                            );
                    }}
                    onDeleteSelected={handleDeleteSelected}
                    onClose={closeContextMenu}
                />
            )}
        </div>
    );
}

// ─── Context Menu Component ─────────────────────────────────────

function ContextMenu({
    x,
    y,
    rowIndex,
    column,
    selectedCount,
    hasPK,
    onCopyCell,
    onCopyRow,
    onCopyColumn,
    onCopySelected,
    onEditCell,
    onDeleteRow,
    onDeleteSelected,
    onClose,
}: {
    x: number;
    y: number;
    rowIndex: number;
    column?: string;
    selectedCount: number;
    hasPK: boolean;
    onCopyCell: (rowIndex: number, column: string) => void;
    onCopyRow: (rowIndex: number) => void;
    onCopyColumn: (column: string) => void;
    onCopySelected: () => void;
    onEditCell: (rowIndex: number, column: string) => void;
    onDeleteRow: (rowIndex: number) => void;
    onDeleteSelected: () => void;
    onClose: () => void;
}) {
    const menuRef = useRef<HTMLDivElement>(null);

    // Adjust position to stay in viewport
    useEffect(() => {
        if (!menuRef.current) return;
        const rect = menuRef.current.getBoundingClientRect();
        const el = menuRef.current;
        if (rect.right > window.innerWidth) {
            el.style.left = `${window.innerWidth - rect.width - 4}px`;
        }
        if (rect.bottom > window.innerHeight) {
            el.style.top = `${window.innerHeight - rect.height - 4}px`;
        }
    }, []);

    const menuItem = (
        label: string,
        action: () => void,
        disabled = false,
        danger = false,
    ) => (
        <button
            className={`${styles.contextMenuItem} ${danger ? styles.contextMenuDanger : ""}`}
            onClick={(e) => {
                e.stopPropagation();
                action();
                onClose();
            }}
            disabled={disabled}
        >
            {label}
        </button>
    );

    return (
        <div
            ref={menuRef}
            className={styles.contextMenu}
            style={{ left: x, top: y }}
            onClick={(e) => e.stopPropagation()}
        >
            {column && menuItem(`Copy cell value`, () => onCopyCell(rowIndex, column))}
            {menuItem("Copy row as JSON", () => onCopyRow(rowIndex))}
            {column && menuItem(`Copy column "${column}"`, () => onCopyColumn(column))}
            {selectedCount > 1 &&
                menuItem(`Copy ${selectedCount} selected rows`, onCopySelected)}
            <div className={styles.contextMenuDivider} />
            {hasPK && column &&
                menuItem("Edit cell", () => onEditCell(rowIndex, column))}
            {hasPK && menuItem("Delete row", () => onDeleteRow(rowIndex), false, true)}
            {hasPK && selectedCount > 1 &&
                menuItem(
                    `Delete ${selectedCount} selected rows`,
                    onDeleteSelected,
                    false,
                    true,
                )}
        </div>
    );
}

// ─── Cell Value Display ─────────────────────────────────────────

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
