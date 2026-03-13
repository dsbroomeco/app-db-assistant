import { useState, useCallback, useEffect } from "react";
import type { MongoDocument, MongoFindResult, CrudResult } from "@shared/types/database";
import styles from "./MongoCollectionView.module.css";

interface MongoCollectionViewProps {
    connectionId: string;
    database: string;
    collection: string;
}

export function MongoCollectionView({
    connectionId,
    database,
    collection,
}: MongoCollectionViewProps) {
    const [documents, setDocuments] = useState<MongoDocument[]>([]);
    const [totalCount, setTotalCount] = useState(0);
    const [page, setPage] = useState(0);
    const [pageSize] = useState(50);
    const [hasMore, setHasMore] = useState(false);
    const [loading, setLoading] = useState(false);
    const [error, setError] = useState<string | null>(null);

    const [filter, setFilter] = useState("{}");
    const [sort, setSort] = useState("");
    const [selectedIds, setSelectedIds] = useState<Set<string>>(new Set());

    const [expandedDocs, setExpandedDocs] = useState<Set<string>>(new Set());
    const [editingDoc, setEditingDoc] = useState<string | null>(null);
    const [editBuffer, setEditBuffer] = useState("");

    const [showInsert, setShowInsert] = useState(false);
    const [insertBuffer, setInsertBuffer] = useState("{\n  \n}");

    const [statusMessage, setStatusMessage] = useState<string | null>(null);

    const fetchDocuments = useCallback(
        async (p: number = page) => {
            setLoading(true);
            setError(null);
            try {
                const result: MongoFindResult = await window.electronAPI.invoke(
                    "mongo:find",
                    {
                        connectionId,
                        database,
                        collection,
                        filter,
                        page: p,
                        pageSize,
                        sort: sort || undefined,
                    },
                );
                setDocuments(result.documents);
                setTotalCount(result.totalCount);
                setHasMore(result.hasMore);
                setPage(p);
                setSelectedIds(new Set());
            } catch (err) {
                setError(err instanceof Error ? err.message : String(err));
            } finally {
                setLoading(false);
            }
        },
        [connectionId, database, collection, filter, sort, page, pageSize],
    );

    useEffect(() => {
        fetchDocuments(0);
    }, [connectionId, database, collection]);

    const handleSearch = useCallback(() => {
        fetchDocuments(0);
    }, [fetchDocuments]);

    const handlePrevPage = useCallback(() => {
        if (page > 0) fetchDocuments(page - 1);
    }, [page, fetchDocuments]);

    const handleNextPage = useCallback(() => {
        if (hasMore) fetchDocuments(page + 1);
    }, [hasMore, page, fetchDocuments]);

    const toggleDocExpand = useCallback((id: string) => {
        setExpandedDocs((prev) => {
            const next = new Set(prev);
            if (next.has(id)) {
                next.delete(id);
            } else {
                next.add(id);
            }
            return next;
        });
    }, []);

    const toggleSelect = useCallback((id: string) => {
        setSelectedIds((prev) => {
            const next = new Set(prev);
            if (next.has(id)) {
                next.delete(id);
            } else {
                next.add(id);
            }
            return next;
        });
    }, []);

    const toggleSelectAll = useCallback(() => {
        if (selectedIds.size === documents.length) {
            setSelectedIds(new Set());
        } else {
            setSelectedIds(new Set(documents.map((d) => d._id)));
        }
    }, [selectedIds, documents]);

    const handleEdit = useCallback(
        (doc: MongoDocument) => {
            setEditingDoc(doc._id);
            setEditBuffer(JSON.stringify(doc, null, 2));
        },
        [],
    );

    const handleSaveEdit = useCallback(async () => {
        if (!editingDoc) return;
        setError(null);
        try {
            JSON.parse(editBuffer);
        } catch {
            setError("Invalid JSON in edit buffer");
            return;
        }
        try {
            const result: CrudResult = await window.electronAPI.invoke(
                "mongo:update",
                {
                    connectionId,
                    database,
                    collection,
                    documentId: editingDoc,
                    update: editBuffer,
                },
            );
            if (result.success) {
                setEditingDoc(null);
                setStatusMessage("Document updated");
                setTimeout(() => setStatusMessage(null), 3000);
                await fetchDocuments(page);
            } else {
                setError(result.message ?? "Update failed");
            }
        } catch (err) {
            setError(err instanceof Error ? err.message : String(err));
        }
    }, [editingDoc, editBuffer, connectionId, database, collection, page, fetchDocuments]);

    const handleCancelEdit = useCallback(() => {
        setEditingDoc(null);
        setEditBuffer("");
    }, []);

    const handleInsert = useCallback(async () => {
        setError(null);
        try {
            JSON.parse(insertBuffer);
        } catch {
            setError("Invalid JSON in insert buffer");
            return;
        }
        try {
            const result: CrudResult = await window.electronAPI.invoke(
                "mongo:insert",
                {
                    connectionId,
                    database,
                    collection,
                    document: insertBuffer,
                },
            );
            if (result.success) {
                setShowInsert(false);
                setInsertBuffer("{\n  \n}");
                setStatusMessage("Document inserted");
                setTimeout(() => setStatusMessage(null), 3000);
                await fetchDocuments(page);
            } else {
                setError(result.message ?? "Insert failed");
            }
        } catch (err) {
            setError(err instanceof Error ? err.message : String(err));
        }
    }, [insertBuffer, connectionId, database, collection, page, fetchDocuments]);

    const handleDeleteSelected = useCallback(async () => {
        if (selectedIds.size === 0) return;
        const confirmed = window.confirm(
            `Delete ${selectedIds.size} document(s)?`,
        );
        if (!confirmed) return;
        setError(null);
        try {
            const result: CrudResult = await window.electronAPI.invoke(
                "mongo:delete",
                {
                    connectionId,
                    database,
                    collection,
                    documentIds: Array.from(selectedIds),
                },
            );
            if (result.success) {
                setStatusMessage(`${result.affectedRows} document(s) deleted`);
                setTimeout(() => setStatusMessage(null), 3000);
                setSelectedIds(new Set());
                await fetchDocuments(page);
            } else {
                setError(result.message ?? "Delete failed");
            }
        } catch (err) {
            setError(err instanceof Error ? err.message : String(err));
        }
    }, [selectedIds, connectionId, database, collection, page, fetchDocuments]);

    const totalPages = Math.max(1, Math.ceil(totalCount / pageSize));

    return (
        <div className={styles.container}>
            {/* Header */}
            <div className={styles.header}>
                <span className={styles.title}>
                    🍃 {database}.{collection}
                </span>
                <span className={styles.count}>{totalCount} documents</span>
            </div>

            {/* Toolbar */}
            <div className={styles.toolbar}>
                <div className={styles.filterRow}>
                    <label className={styles.filterLabel}>Filter:</label>
                    <input
                        className={styles.filterInput}
                        type="text"
                        value={filter}
                        onChange={(e) => setFilter(e.target.value)}
                        placeholder='{"field": "value"}'
                        onKeyDown={(e) => {
                            if (e.key === "Enter") handleSearch();
                        }}
                    />
                    <label className={styles.filterLabel}>Sort:</label>
                    <input
                        className={styles.sortInput}
                        type="text"
                        value={sort}
                        onChange={(e) => setSort(e.target.value)}
                        placeholder='{"field": 1}'
                        onKeyDown={(e) => {
                            if (e.key === "Enter") handleSearch();
                        }}
                    />
                    <button className={styles.btn} onClick={handleSearch}>
                        Find
                    </button>
                </div>
                <div className={styles.actions}>
                    <button
                        className={styles.btn}
                        onClick={() => setShowInsert(true)}
                    >
                        + Insert
                    </button>
                    {selectedIds.size > 0 && (
                        <button
                            className={`${styles.btn} ${styles.btnDanger}`}
                            onClick={handleDeleteSelected}
                        >
                            Delete ({selectedIds.size})
                        </button>
                    )}
                    <button
                        className={styles.btn}
                        onClick={() => fetchDocuments(page)}
                    >
                        ↻ Refresh
                    </button>
                </div>
            </div>

            {/* Status / Error */}
            {error && <div className={styles.error}>{error}</div>}
            {statusMessage && (
                <div className={styles.status}>{statusMessage}</div>
            )}

            {/* Insert Panel */}
            {showInsert && (
                <div className={styles.editPanel}>
                    <div className={styles.editPanelHeader}>
                        <span>Insert Document</span>
                        <button
                            className={styles.btnSmall}
                            onClick={() => setShowInsert(false)}
                        >
                            ✕
                        </button>
                    </div>
                    <textarea
                        className={styles.jsonEditor}
                        value={insertBuffer}
                        onChange={(e) => setInsertBuffer(e.target.value)}
                        rows={8}
                        spellCheck={false}
                    />
                    <div className={styles.editPanelActions}>
                        <button className={styles.btn} onClick={handleInsert}>
                            Insert
                        </button>
                        <button
                            className={styles.btnSecondary}
                            onClick={() => setShowInsert(false)}
                        >
                            Cancel
                        </button>
                    </div>
                </div>
            )}

            {/* Document List */}
            <div className={styles.documentList}>
                {loading && <div className={styles.loading}>Loading…</div>}
                {!loading && documents.length === 0 && (
                    <div className={styles.empty}>No documents found</div>
                )}

                {documents.length > 0 && (
                    <div className={styles.selectAll}>
                        <label>
                            <input
                                type="checkbox"
                                checked={
                                    selectedIds.size === documents.length &&
                                    documents.length > 0
                                }
                                onChange={toggleSelectAll}
                            />
                            Select all
                        </label>
                    </div>
                )}

                {documents.map((doc) => {
                    const isExpanded = expandedDocs.has(doc._id);
                    const isEditing = editingDoc === doc._id;
                    const isSelected = selectedIds.has(doc._id);

                    return (
                        <div
                            key={doc._id}
                            className={`${styles.docCard} ${isSelected ? styles.docSelected : ""}`}
                        >
                            <div className={styles.docHeader}>
                                <input
                                    type="checkbox"
                                    checked={isSelected}
                                    onChange={() => toggleSelect(doc._id)}
                                />
                                <span
                                    className={styles.docId}
                                    onClick={() => toggleDocExpand(doc._id)}
                                    title="Toggle expand"
                                >
                                    {isExpanded ? "▾" : "▸"} _id: {doc._id}
                                </span>
                                <div className={styles.docActions}>
                                    <button
                                        className={styles.btnSmall}
                                        onClick={() => handleEdit(doc)}
                                        title="Edit document"
                                    >
                                        ✏️
                                    </button>
                                    <button
                                        className={styles.btnSmall}
                                        onClick={() => {
                                            navigator.clipboard.writeText(
                                                JSON.stringify(doc, null, 2),
                                            );
                                        }}
                                        title="Copy JSON"
                                    >
                                        📋
                                    </button>
                                </div>
                            </div>

                            {isEditing ? (
                                <div className={styles.editPanel}>
                                    <textarea
                                        className={styles.jsonEditor}
                                        value={editBuffer}
                                        onChange={(e) =>
                                            setEditBuffer(e.target.value)
                                        }
                                        rows={12}
                                        spellCheck={false}
                                    />
                                    <div className={styles.editPanelActions}>
                                        <button
                                            className={styles.btn}
                                            onClick={handleSaveEdit}
                                        >
                                            Save
                                        </button>
                                        <button
                                            className={styles.btnSecondary}
                                            onClick={handleCancelEdit}
                                        >
                                            Cancel
                                        </button>
                                    </div>
                                </div>
                            ) : (
                                isExpanded && (
                                    <pre className={styles.docPreview}>
                                        {JSON.stringify(doc, null, 2)}
                                    </pre>
                                )
                            )}

                            {!isExpanded && !isEditing && (
                                <div className={styles.docSummary}>
                                    {Object.keys(doc)
                                        .filter((k) => k !== "_id")
                                        .slice(0, 4)
                                        .map((k) => (
                                            <span key={k} className={styles.fieldPreview}>
                                                <span className={styles.fieldKey}>{k}:</span>{" "}
                                                <span className={styles.fieldValue}>
                                                    {formatPreview(doc[k])}
                                                </span>
                                            </span>
                                        ))}
                                    {Object.keys(doc).length > 5 && (
                                        <span className={styles.moreFields}>
                                            +{Object.keys(doc).length - 5} more
                                        </span>
                                    )}
                                </div>
                            )}
                        </div>
                    );
                })}
            </div>

            {/* Pagination */}
            <div className={styles.pagination}>
                <button
                    className={styles.btn}
                    onClick={handlePrevPage}
                    disabled={page === 0}
                >
                    ← Prev
                </button>
                <span className={styles.pageInfo}>
                    Page {page + 1} of {totalPages}
                </span>
                <button
                    className={styles.btn}
                    onClick={handleNextPage}
                    disabled={!hasMore}
                >
                    Next →
                </button>
            </div>
        </div>
    );
}

function formatPreview(value: unknown): string {
    if (value === null) return "null";
    if (value === undefined) return "undefined";
    if (typeof value === "string") {
        return value.length > 50 ? `"${value.slice(0, 50)}…"` : `"${value}"`;
    }
    if (typeof value === "object") {
        if (Array.isArray(value)) return `[${value.length} items]`;
        return `{${Object.keys(value).length} fields}`;
    }
    return String(value);
}
