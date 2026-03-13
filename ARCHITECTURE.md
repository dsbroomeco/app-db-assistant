# DB Assistant — Architecture

## Overview

DB Assistant is a cross-platform desktop application built with **Electron** and **React** (TypeScript). It follows a strict separation between the main process (Node.js, database access) and the renderer process (React UI), communicating via typed IPC channels.

## High-Level Architecture

```
┌─────────────────────────────────────────────────────┐
│                   Renderer Process                   │
│  ┌─────────────┐  ┌──────────┐  ┌───────────────┐  │
│  │  Tab Manager │  │ SQL      │  │ Table Data    │  │
│  │  & Navigation│  │ Editor   │  │ Viewer        │  │
│  └──────┬───────┘  └────┬─────┘  └──────┬────────┘  │
│         │               │               │            │
│  ┌──────┴───────────────┴───────────────┴────────┐  │
│  │              IPC Bridge (typed channels)       │  │
│  └───────────────────────┬───────────────────────┘  │
└──────────────────────────┼──────────────────────────┘
                           │ IPC
┌──────────────────────────┼──────────────────────────┐
│                    Main Process                      │
│  ┌───────────────────────┴───────────────────────┐  │
│  │              IPC Handler Router                │  │
│  └──────┬─────────────┬──────────────┬───────────┘  │
│         │             │              │               │
│  ┌──────┴──────┐ ┌────┴─────┐ ┌─────┴──────────┐   │
│  │ Connection  │ │ Query    │ │ Credential     │   │
│  │ Manager     │ │ Executor │ │ Store (encrypt)│   │
│  └──────┬──────┘ └────┬─────┘ └────────────────┘   │
│         │             │                              │
│  ┌──────┴─────────────┴──────────────────────────┐  │
│  │           Database Driver Layer                │  │
│  │  ┌──────┐ ┌──────┐ ┌──────┐ ┌──────┐         │  │
│  │  │ PG   │ │MySQL │ │SQLite│ │MSSQL │  ...     │  │
│  │  └──────┘ └──────┘ └──────┘ └──────┘         │  │
│  └───────────────────────────────────────────────┘  │
└─────────────────────────────────────────────────────┘
```

## Key Design Decisions

### 1. Process Isolation

All database connections and queries run in the **main process**. The renderer process never imports database drivers directly. This provides:
- Security: credentials never enter the renderer
- Stability: a bad query won't freeze the UI
- Sandboxing: renderer runs with `contextIsolation: true` and `nodeIntegration: false`

### 2. Database Driver Layer (`src/db/`)

Each supported database implements a common `DatabaseDriver` interface:

```typescript
interface DatabaseDriver {
  connect(config: ConnectionConfig, password?: string): Promise<void>;
  disconnect(): Promise<void>;
  ping(): Promise<void>;
  isConnected(): boolean;
  getSchemas(): Promise<SchemaInfo[]>;
  getTables(schema: string): Promise<TableInfo[]>;
  getTableStructure(schema: string, table: string): Promise<TableStructure>;
  getRoutines(schema: string): Promise<RoutineInfo[]>;
  getTableData(schema: string, table: string, page: number, pageSize: number): Promise<QueryResult>;
  executeQuery(sql: string): Promise<ExecuteQueryResult>;
  explainQuery(sql: string): Promise<string>;
  getCompletionItems(): Promise<{ tables: string[]; columns: string[] }>;
  // CRUD operations (Phase 5)
  getPrimaryKeyColumns(schema: string, table: string): Promise<string[]>;
  insertRow(schema: string, table: string, row: Record<string, unknown>): Promise<CrudResult>;
  updateRow(schema: string, table: string, primaryKey: Record<string, unknown>, changes: Record<string, unknown>): Promise<CrudResult>;
  deleteRows(schema: string, table: string, primaryKeys: Record<string, unknown>[]): Promise<CrudResult>;
}
```

This abstraction allows adding new database support without modifying the rest of the application.

### 3. Credential Security

- Credentials are encrypted at rest using the OS keychain (via `keytar` or `electron-safeStorage`)
- Connection configs stored in a local JSON file contain only non-sensitive fields
- Credentials are decrypted only at connection time in the main process

### 4. Tab System

The renderer uses a tab manager that supports:
- Query editor tabs (with CodeMirror SQL editor, results grid, plan viewer, and history)
- Table data viewer tabs (with pagination, row counts, and column display)
- Table structure viewer tabs (columns, indexes, constraints)
- Schema browser tabs (tree view in sidebar with lazy-loading)
- Each tab maintains its own state and can reference different database connections via metadata

### 5. SQL Editor & Query Execution

The SQL editor uses **CodeMirror 6** with the following features:
- SQL syntax highlighting via `@codemirror/lang-sql`
- Autocomplete for table names, column names, and SQL keywords (loaded dynamically per connection)
- Dark/light theme matching the application theme
- Keyboard shortcut: Ctrl+Enter (Cmd+Enter) to execute
- Resizable editor/results split pane
- Results panel with three tabs: Results grid, Query Plan (EXPLAIN), and History
- Query history persisted to `electron-store` (last 200 entries)
- Export results to CSV, JSON, or SQL INSERT format via file save dialog

Security: All SQL execution happens in the main process via the driver layer. The renderer sends raw SQL strings through IPC — the drivers execute them using their native client libraries. No string interpolation is used for parameterized table browsing queries.

### 6. CRUD Operations

The table data viewer supports inline CRUD operations:

- **Inline editing**: Double-click a cell to edit it in-place. Changes are committed via `UPDATE` with parameterized queries using the row's primary key for identification.
- **Add row**: An insertable row form appears at the top of the table. Empty columns default to `NULL`, letting the database apply column defaults.
- **Delete rows**: Single or multi-row deletion with a confirmation dialog. Rows are identified by primary key.
- **Bulk operations**: Multi-select rows with Ctrl+Click (toggle) or Shift+Click (range). Bulk delete operates on all selected rows.
- **Copy**: Cell, row, column, or multi-row copy to clipboard (as JSON for rows, as text for cells/columns).

All CRUD mutations flow through typed IPC channels (`crud:insert-row`, `crud:update-row`, `crud:delete-rows`) to the main process, where drivers execute parameterized queries. Primary key columns are resolved via `crud:get-primary-keys`. Tables without a primary key are read-only.

Keyboard shortcuts:
| Shortcut | Action |
| --- | --- |
| Double-click | Edit cell |
| F2 | Edit first column in selected row |
| Enter | Commit edit |
| Escape | Cancel edit / close add row |
| Ctrl+N | Add new row |
| Delete / Backspace | Delete selected rows |
| Ctrl+A | Select all rows |
| Ctrl+C | Copy selected rows |
| Ctrl+Click | Toggle row selection |
| Shift+Click | Range-select rows |

### 7. IPC Communication

All main ↔ renderer communication uses typed IPC channels defined in `src/shared/ipc.ts`:

```typescript
// Channel definitions include connection management, schema browsing, query execution, and CRUD
type IpcChannels = {
  'conn:connect': { request: string; response: ConnectionStatus };
  'conn:disconnect': { request: string; response: ConnectionStatus };
  'db:schemas': { request: string; response: SchemaInfo[] };
  'db:tables': { request: { connectionId: string; schema: string }; response: TableInfo[] };
  'db:table-structure': { request: { connectionId: string; schema: string; table: string }; response: TableStructure };
  'db:routines': { request: { connectionId: string; schema: string }; response: RoutineInfo[] };
  'db:table-data': { request: { connectionId: string; schema: string; table: string; page: number; pageSize: number }; response: QueryResult };
  'query:execute': { request: ExecuteQueryRequest; response: ExecuteQueryResult };
  'query:explain': { request: ExplainQueryRequest; response: ExplainQueryResult };
  'query:history': { request: void; response: QueryHistoryEntry[] };
  'query:completions': { request: string; response: { tables: string[]; columns: string[] } };
  // CRUD operations (Phase 5)
  'crud:insert-row': { request: InsertRowRequest; response: CrudResult };
  'crud:update-row': { request: UpdateRowRequest; response: CrudResult };
  'crud:delete-rows': { request: DeleteRowsRequest; response: CrudResult };
  'crud:get-primary-keys': { request: { connectionId: string; schema: string; table: string }; response: string[] };
};
};
```

## Marketing Website (`website/`)

A standalone Next.js application serving as the public-facing marketing site. It includes:
- Landing page with feature highlights
- Download page with platform-specific installers
- Documentation pages (future)

The website is fully static (SSG) and deployed independently from the desktop app.

## Technology Choices

| Component          | Technology                   | Rationale                                    |
| ------------------ | ---------------------------- | -------------------------------------------- |
| Desktop framework  | Electron                     | Mature, cross-platform, large ecosystem      |
| UI framework       | React + TypeScript           | Component model, type safety, ecosystem      |
| SQL Editor         | CodeMirror 6               | Lightweight, extensible, excellent SQL support   |
| Database drivers   | pg, mysql2, better-sqlite3, tedious | Native Node.js drivers, well-maintained |
| NoSQL drivers      | mongodb, ioredis             | Official/community standard drivers          |
| Build/package      | electron-builder             | Multi-platform packaging and auto-update     |
| Marketing site     | Next.js                      | SSG, React-based, fast, easy deployment      |
| Testing            | Vitest + Playwright          | Fast unit tests, reliable e2e                |
