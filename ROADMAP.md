# DB Assistant — Roadmap

## Phase 1: Foundation (Complete)

- [x] Project scaffolding and repository setup
- [x] AGENTS.md, README, ROADMAP, ARCHITECTURE docs
- [x] Marketing website (Next.js) with download page
- [x] Electron + React app shell with basic window management
- [x] Tab system for multiple views
- [x] Dark / light theme with system preference detection
- [x] Application settings and preferences storage
- [x] ESLint, Prettier, Vitest tooling
- [x] Typed IPC channels (main ↔ renderer)

## Phase 2: Core Database Connectivity (Complete)

- [x] Connection manager UI (add, edit, delete, test connections)
- [x] Secure credential storage (encrypted at rest, OS keychain integration)
- [x] PostgreSQL driver and connection support
- [x] MySQL / MariaDB driver and connection support
- [x] SQLite driver and connection support (local file-based)
- [x] Microsoft SQL Server driver and connection support
- [x] Connection pooling and timeout management

## Phase 3: Database Browsing & Schema Viewer

- [ ] Database tree view (sidebar) — databases → schemas → tables → columns
- [ ] Table structure viewer (columns, types, constraints, indexes)
- [ ] Table data viewer with pagination
- [ ] View, function, and stored procedure listing
- [ ] Refresh and lazy-loading for large schemas

## Phase 4: SQL Editor & Query Execution

- [ ] SQL editor with syntax highlighting (CodeMirror or Monaco)
- [ ] Query execution with result grid
- [ ] Multiple query tabs
- [ ] Query history
- [ ] Autocomplete for table names, columns, and SQL keywords
- [ ] Explain/analyze query plans
- [ ] Query result export (CSV, JSON, SQL INSERT)

## Phase 5: CRUD Operations & Shortcuts

- [ ] Inline row editing in table data viewer
- [ ] Add new row UI
- [ ] Delete row(s) with confirmation
- [ ] Right-click context menus on tables, rows, and cells
- [ ] Keyboard shortcuts for common CRUD actions
- [ ] Bulk operations (multi-select rows, bulk delete/update)
- [ ] Copy cell / row / column values

## Phase 6: NoSQL Database Support

- [ ] MongoDB driver and connection support
- [ ] MongoDB document viewer and editor (JSON tree view)
- [ ] MongoDB query builder
- [ ] Redis driver and connection support
- [ ] Redis key browser and value viewer
- [ ] Redis CLI passthrough

## Phase 7: Advanced Features

- [ ] Data import (CSV, JSON → table)
- [ ] Schema diff and comparison between connections
- [ ] ERD (Entity Relationship Diagram) generation
- [ ] SSH tunnel support for remote databases
- [ ] Saved queries and query snippets
- [ ] Customizable keyboard shortcuts

## Phase 8: Polish & Distribution

- [ ] Auto-update mechanism (electron-updater)
- [ ] Windows installer (`.exe` / `.msi` via electron-builder)
- [ ] Linux packages (`.AppImage`, `.deb`, `.rpm`)
- [ ] macOS build (`.dmg`) — stretch goal
- [ ] CI/CD pipeline for automated builds and releases
- [ ] Marketing website: release notes, changelog integration
- [ ] Performance profiling and optimization
- [ ] Accessibility audit (keyboard navigation, screen readers)

## Future Ideas (Backlog)

- Plugin / extension system for community-contributed database drivers
- Cloud database support (AWS RDS, Azure SQL, Google Cloud SQL)
- Team features (shared connections, shared queries)
- AI-assisted query writing
- Database migration tooling
- REST API explorer (for API-backed data sources)
