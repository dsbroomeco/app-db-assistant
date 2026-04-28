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
│  ┌──────┴──────┐  ┌─────┴──────┐                    │
│  │ Mongo Views │  │ Redis Views│                    │
│  └──────┬──────┘  └─────┬──────┘                    │
│         │               │               │            │
│  ┌──────┴───────────────┴───────────────┴────────┐  │
│  │              IPC Bridge (typed channels)       │  │
│  └───────────────────────┬───────────────────────┘  │
└──────────────────────────┼──────────────────────────┘
                           │ IPC (50 channels)
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
│  │  SQL Drivers:                                  │  │
│  │  ┌──────┐ ┌──────┐ ┌──────┐ ┌──────┐         │  │
│  │  │ PG   │ │MySQL │ │SQLite│ │MSSQL │         │  │
│  │  └──────┘ └──────┘ └──────┘ └──────┘         │  │
│  │  NoSQL Drivers:                                │  │
│  │  ┌──────────┐ ┌──────────┐                    │  │
│  │  │ MongoDB  │ │  Redis   │                    │  │
│  │  └──────────┘ └──────────┘                    │  │
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

The driver layer uses a tiered interface hierarchy:

- **`BaseDriver`** — shared by all drivers (connect, disconnect, ping, isConnected)
- **`DatabaseDriver`** (extends `BaseDriver`) — SQL-specific methods (schemas, tables, queries, CRUD)
- **`MongoDBDriver`** (extends `BaseDriver`) — MongoDB-specific methods (listDatabases, listCollections, CRUD on documents, aggregation)
- **`RedisDriver`** (extends `BaseDriver`) — Redis-specific methods (scanKeys, get/set/delete values, CLI command passthrough)

SQL drivers implement the `DatabaseDriver` interface:

```typescript
interface DatabaseDriver extends BaseDriver {
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
  escapeIdentifier(identifier: string): string;
}
```

NoSQL drivers implement their own interfaces (see `src/db/types.ts` for `MongoDBDriver` and `RedisDriver`). The `createAnyDriver()` factory function dispatches to the correct driver constructor based on database type (`isSqlType()` / `isNoSqlType()`). The connection manager uses duck-typing helpers (`getMongoDriver()`, `getRedisDriver()`) to safely downcast `BaseDriver` references for NoSQL operations.

### 3. Credential Security

- Credentials are encrypted at rest using the OS keychain (via `keytar` or `electron-safeStorage`)
- Connection configs stored in a local JSON file contain only non-sensitive fields
- Credentials are decrypted only at connection time in the main process
- All SSL/TLS connections support configurable certificate verification (`sslRejectUnauthorized`)

### 4. Auto-Update

- Uses `electron-updater` to check for and install updates from GitHub Releases
- Download and install is user-initiated (not silent) — prompts before downloading and before restarting
- Auto-updater is only active in packaged builds (`app.isPackaged`)

### 5. CI/CD Pipeline

- GitHub Actions workflow (`.github/workflows/release.yml`) triggered on version tags (`v*.*.*`)
- Matrix build strategy: Windows, Linux, macOS
- Pipeline: typecheck → test → e2e (Linux) → build → package → create GitHub Release
- Unsigned dev builds: `CSC_IDENTITY_AUTO_DISCOVERY=false` disables auto-discovery of signing identities for local validation builds
- CI installs dependencies normally, then removes `ssh2`'s optional `cpu-features` native module before packaging to avoid rebuilding an Electron-incompatible optional dependency
- Linux packaging installs the `rpm` system package before building the `.rpm` target
- Docker containers (`docker/Dockerfile.linux`, `docker/Dockerfile.win`) for local pipeline validation before pushing to CI
- Dependabot configured for automated dependency updates (`.github/dependabot.yml`)
- `standard-version` for automated semver bumps, changelog generation, and git tagging

### 6. Tab System

The renderer uses a tab manager that supports:
- Query editor tabs (with CodeMirror SQL editor, results grid, plan viewer, and history)
- Table data viewer tabs (with pagination, row counts, and column display)
- Table structure viewer tabs (columns, indexes, constraints)
- Schema browser tabs (tree view in sidebar with lazy-loading)
- MongoDB collection viewer tabs (document list with JSON expand/collapse, inline edit, insert, bulk delete, aggregation)
- Redis browser tabs (key list with pattern search, type-aware value viewer, inline string editing, CLI passthrough)
- Each tab maintains its own state and can reference different database connections via metadata

### 5. SQL Editor & Query Execution

The SQL editor uses **CodeMirror 6** with the following features:
- SQL syntax highlighting via `@codemirror/lang-sql`
- Autocomplete for table names, column names, and SQL keywords (loaded dynamically per connection)
- Dark/light theme matching the application theme
- Keyboard shortcut: Ctrl+Enter (Cmd+Enter) to execute
- Resizable editor/results split pane
- Results panel with three tabs: Results grid, Query Plan (EXPLAIN), and History
- Results grid virtualization via `@tanstack/react-virtual` to keep DOM size bounded for large row counts
- Query history persisted to `electron-store` (last 200 entries)
- Export results to CSV, JSON, or SQL INSERT format via a main-process streaming export path (`query:export`)

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

All main ↔ renderer communication uses typed IPC channels defined in `src/shared/ipc.ts` (50 channels total):

```typescript
// Channel definitions include connection management, schema browsing, query execution, CRUD, and NoSQL operations
type IpcChannels = {
  'conn:connect': { request: string; response: ConnectionStatus };
  'conn:disconnect': { request: string; response: ConnectionStatus };
  'db:schemas': { request: string; response: SchemaInfo[] };
  'db:tables': { request: { connectionId: string; schema: string }; response: TableInfo[] };
  'query:export': {
    request: { connectionId: string; sql: string; format: ExportFormat; filePath: string };
    response: { rowCount: number; truncated: boolean; filePath: string };
  };
  // ... SQL schema/query/CRUD channels ...
  // MongoDB operations (Phase 6)
  'mongo:databases': { request: string; response: string[] };
  'mongo:collections': { request: { connectionId: string; database: string }; response: MongoCollectionInfo[] };
  'mongo:find': { request: MongoFindRequest; response: MongoFindResult };
  'mongo:insert': { request: MongoInsertRequest; response: CrudResult };
  'mongo:update': { request: MongoUpdateRequest; response: CrudResult };
  'mongo:delete': { request: MongoDeleteRequest; response: CrudResult };
  'mongo:aggregate': { request: MongoAggregateRequest; response: MongoDocument[] };
  // Redis operations (Phase 6)
  'redis:scan': { request: RedisScanRequest; response: RedisScanResult };
  'redis:get': { request: RedisGetRequest; response: RedisGetResult };
  'redis:set': { request: RedisSetRequest; response: CrudResult };
  'redis:delete': { request: RedisDeleteRequest; response: CrudResult };
  'redis:command': { request: RedisCommandRequest; response: RedisCommandResult };
};
```

## Marketing Website (`website/`)

A standalone Next.js application serving as the public-facing marketing site. It includes:
- Landing page with feature highlights
- Download page with platform-specific installers
- Documentation pages (future)

The website is fully static (SSG) and deployed independently from the desktop app.

Deployment details:
- `website/next.config.ts` uses `output: "export"` for static output
- `.github/workflows/website.yml` builds `website/out` and deploys it via GitHub Pages

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
