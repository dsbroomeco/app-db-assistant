import { useState, useCallback, useRef, useEffect } from "react";
import { useConnections } from "../context/ConnectionContext";
import type { TableInfo, ColumnInfo, ConstraintInfo } from "@shared/types/database";
import styles from "./ErdView.module.css";

interface TablePosition {
    name: string;
    x: number;
    y: number;
    width: number;
    height: number;
    columns: ColumnInfo[];
}

interface Relationship {
    fromTable: string;
    fromColumns: string[];
    toTable: string;
    toColumns: string[];
}

export function ErdView() {
    const { connections, isConnected } = useConnections();
    const connectedConns = connections.filter(
        (c) => isConnected(c.id) && c.type !== "mongodb" && c.type !== "redis",
    );

    const canvasRef = useRef<HTMLCanvasElement>(null);
    const [connectionId, setConnectionId] = useState("");
    const [schema, setSchema] = useState("public");
    const [loading, setLoading] = useState(false);
    const [error, setError] = useState("");
    const [tables, setTables] = useState<TablePosition[]>([]);
    const [relationships, setRelationships] = useState<Relationship[]>([]);

    const handleGenerate = useCallback(async () => {
        if (!connectionId) return;
        setLoading(true);
        setError("");
        try {
            const tableList: TableInfo[] = await window.electronAPI.invoke(
                "db:tables",
                { connectionId, schema },
            );

            const positions: TablePosition[] = [];
            const rels: Relationship[] = [];

            // Fetch structure for each table with a concurrency limit to avoid
            // flooding the main process with hundreds of simultaneous IPC calls.
            const CONCURRENCY = 8;
            const tasks = tableList.map((t) => async () => {
                const structure = await window.electronAPI.invoke(
                    "db:table-structure",
                    { connectionId, schema, table: t.name },
                );
                return { name: t.name, ...structure };
            });

            const results: Awaited<ReturnType<typeof tasks[0]>>[] = new Array(tasks.length);
            let nextIdx = 0;
            async function worker() {
                while (nextIdx < tasks.length) {
                    const i = nextIdx++;
                    results[i] = await tasks[i]();
                }
            }
            await Promise.all(
                Array.from({ length: Math.min(CONCURRENCY, tasks.length) }, worker),
            );
            const structures = results;

            // Layout tables in a grid
            const cols = Math.ceil(Math.sqrt(structures.length));
            const colWidth = 220;
            const rowHeight = 40;
            const padding = 40;

            for (let i = 0; i < structures.length; i++) {
                const s = structures[i];
                const col = i % cols;
                const row = Math.floor(i / cols);
                const headerHeight = 28;
                const height = headerHeight + s.columns.length * 18 + 8;

                positions.push({
                    name: s.name,
                    x: padding + col * (colWidth + padding),
                    y: padding + row * (rowHeight * 8 + padding),
                    width: colWidth,
                    height,
                    columns: s.columns,
                });

                // Extract foreign key relationships
                if (s.constraints) {
                    for (const constraint of s.constraints as ConstraintInfo[]) {
                        if (constraint.type === "FOREIGN KEY" && constraint.referencedTable) {
                            rels.push({
                                fromTable: s.name,
                                fromColumns: constraint.columns,
                                toTable: constraint.referencedTable,
                                toColumns: constraint.columns,
                            });
                        }
                    }
                }
            }

            setTables(positions);
            setRelationships(rels);
        } catch (err) {
            setError(err instanceof Error ? err.message : String(err));
        } finally {
            setLoading(false);
        }
    }, [connectionId, schema]);

    // Draw the ERD on canvas
    useEffect(() => {
        const canvas = canvasRef.current;
        if (!canvas || tables.length === 0) return;
        const ctx = canvas.getContext("2d");
        if (!ctx) return;

        // Compute canvas size
        let maxX = 0;
        let maxY = 0;
        for (const t of tables) {
            maxX = Math.max(maxX, t.x + t.width + 40);
            maxY = Math.max(maxY, t.y + t.height + 40);
        }
        canvas.width = maxX;
        canvas.height = maxY;

        // Read CSS variables from the document
        const cs = getComputedStyle(document.documentElement);
        const bgPrimary = cs.getPropertyValue("--bg-primary").trim() || "#ffffff";
        const bgSecondary = cs.getPropertyValue("--bg-secondary").trim() || "#f3f4f6";
        const borderColor = cs.getPropertyValue("--border").trim() || "#e5e7eb";
        const textPrimary = cs.getPropertyValue("--text-primary").trim() || "#1f2937";
        const textSecondary = cs.getPropertyValue("--text-secondary").trim() || "#6b7280";
        const accentColor = cs.getPropertyValue("--accent").trim() || "#3b82f6";

        // Clear
        ctx.fillStyle = bgPrimary;
        ctx.fillRect(0, 0, canvas.width, canvas.height);

        // Build lookup for table positions
        const tableLookup = new Map<string, TablePosition>();
        for (const t of tables) tableLookup.set(t.name, t);

        // Draw relationships (lines)
        ctx.strokeStyle = accentColor;
        ctx.lineWidth = 1.5;
        for (const rel of relationships) {
            const from = tableLookup.get(rel.fromTable);
            const to = tableLookup.get(rel.toTable);
            if (!from || !to) continue;

            const fromX = from.x + from.width;
            const fromY = from.y + from.height / 2;
            const toX = to.x;
            const toY = to.y + to.height / 2;

            ctx.beginPath();
            ctx.moveTo(fromX, fromY);
            // Bezier curve
            const cpOffset = Math.abs(toX - fromX) / 3;
            ctx.bezierCurveTo(
                fromX + cpOffset, fromY,
                toX - cpOffset, toY,
                toX, toY,
            );
            ctx.stroke();

            // Arrow
            ctx.beginPath();
            ctx.moveTo(toX, toY);
            ctx.lineTo(toX - 6, toY - 4);
            ctx.lineTo(toX - 6, toY + 4);
            ctx.closePath();
            ctx.fillStyle = accentColor;
            ctx.fill();
        }

        // Draw tables
        const primaryKeyCols = new Set<string>();
        for (const t of tables) {
            primaryKeyCols.clear();
            for (const col of t.columns) {
                if (col.isPrimaryKey) primaryKeyCols.add(col.name);
            }

            // Table border & background
            ctx.fillStyle = bgPrimary;
            ctx.strokeStyle = borderColor;
            ctx.lineWidth = 1;
            ctx.beginPath();
            ctx.roundRect(t.x, t.y, t.width, t.height, 4);
            ctx.fill();
            ctx.stroke();

            // Header
            ctx.fillStyle = bgSecondary;
            ctx.beginPath();
            ctx.roundRect(t.x, t.y, t.width, 26, [4, 4, 0, 0]);
            ctx.fill();

            // Header line
            ctx.strokeStyle = borderColor;
            ctx.beginPath();
            ctx.moveTo(t.x, t.y + 26);
            ctx.lineTo(t.x + t.width, t.y + 26);
            ctx.stroke();

            // Table name
            ctx.fillStyle = textPrimary;
            ctx.font = "bold 12px sans-serif";
            ctx.fillText(t.name, t.x + 8, t.y + 17);

            // Columns
            ctx.font = "11px monospace";
            for (let i = 0; i < t.columns.length; i++) {
                const col = t.columns[i];
                const y = t.y + 26 + 4 + i * 18 + 12;

                // PK indicator
                if (col.isPrimaryKey) {
                    ctx.fillStyle = accentColor;
                    ctx.fillText("🔑 ", t.x + 6, y);
                    ctx.fillStyle = textPrimary;
                    ctx.fillText(col.name, t.x + 24, y);
                } else {
                    ctx.fillStyle = textPrimary;
                    ctx.fillText(col.name, t.x + 8, y);
                }

                // Type
                ctx.fillStyle = textSecondary;
                ctx.fillText(col.dataType, t.x + 120, y);
            }
        }
    }, [tables, relationships]);

    if (connectedConns.length === 0) {
        return (
            <div className={styles.info}>
                Connect to a SQL database to generate an ERD.
            </div>
        );
    }

    return (
        <div className={styles.container}>
            <div className={styles.toolbar}>
                <label>Connection:</label>
                <select
                    className={styles.select}
                    value={connectionId}
                    onChange={(e) => setConnectionId(e.target.value)}
                >
                    <option value="">Select connection…</option>
                    {connectedConns.map((c) => (
                        <option key={c.id} value={c.id}>{c.name}</option>
                    ))}
                </select>
                <label>Schema:</label>
                <input
                    className={styles.input}
                    type="text"
                    value={schema}
                    onChange={(e) => setSchema(e.target.value)}
                    placeholder="public"
                    style={{ width: 100 }}
                />
                <button
                    className={styles.btn}
                    onClick={handleGenerate}
                    disabled={loading || !connectionId}
                >
                    {loading ? "Generating…" : "Generate ERD"}
                </button>
            </div>

            {error && <div className={styles.error}>{error}</div>}

            <div className={styles.canvasWrapper}>
                {tables.length > 0 ? (
                    <canvas ref={canvasRef} className={styles.canvas} />
                ) : (
                    !loading && (
                        <div className={styles.info}>
                            Select a connection and schema, then click Generate ERD to visualize the database structure.
                        </div>
                    )
                )}
            </div>
        </div>
    );
}
