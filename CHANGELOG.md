# Changelog

All notable changes to DB Assistant will be documented in this file.

The format is based on [Keep a Changelog](https://keepachangelog.com/en/1.1.0/),
and this project adheres to [Semantic Versioning](https://semver.org/spec/v2.0.0.html).

## [Unreleased]

### Added
- Auto-update mechanism via electron-updater
- GitHub Actions CI/CD release workflow with e2e test stage
- Accessibility improvements (keyboard navigation, ARIA labels)
- Marketing website changelog integration
- Docker build containers for local CI pipeline validation (`docker/Dockerfile.linux`, `docker/Dockerfile.win`, `docker-compose.yml`)
- App icon generation script (`scripts/generate-icons.js`) with SVG source
- `standard-version` for automated version bumps and changelog generation
- Release scripts: `npm run release`, `npm run release:beta`, `npm run release:dry`

### Fixed
- GitHub repo URL placeholder in download page
- electron-builder icon paths to use auto-converted PNG
- Windows build signing bypass for unsigned dev builds (`sign: null`)
- Linux .deb packaging missing maintainer email

## [0.1.0] - 2025-07-20

### Added

#### Phase 1: Foundation
- Electron + React desktop app shell with window management
- Tab system for multiple simultaneous views
- Dark / light theme with system preference detection
- Application settings and preferences storage (electron-store)
- Typed IPC channels for main ↔ renderer communication (49 channels)
- ESLint, Prettier, Vitest tooling and TypeScript strict mode
- Next.js marketing website with download page

#### Phase 2: Core Database Connectivity
- Connection manager UI — add, edit, delete, test connections
- Secure credential storage using OS keychain (Electron safeStorage)
- PostgreSQL driver with connection pooling
- MySQL / MariaDB driver with connection pooling
- SQLite driver for local file-based databases
- Microsoft SQL Server driver with connection pooling
- Connection timeout and pool size configuration

#### Phase 3: Database Browsing & Schema Viewer
- Database tree view sidebar — databases → schemas → tables → columns
- Table structure viewer (columns, types, constraints, indexes)
- Table data viewer with pagination
- View, function, and stored procedure listing
- Lazy-loading for large schemas

#### Phase 4: SQL Editor & Query Execution
- SQL editor with syntax highlighting (CodeMirror 6)
- Query execution with result grid display
- Multiple query tabs
- Query history with recall
- Autocomplete for table names, columns, and SQL keywords
- EXPLAIN / ANALYZE query plans
- Query result export (CSV, JSON, SQL INSERT)

#### Phase 5: CRUD Operations & Shortcuts
- Inline row editing in table data viewer
- Add new row UI with field validation
- Delete row(s) with confirmation dialog
- Right-click context menus on tables, rows, and cells
- Configurable keyboard shortcuts for common actions
- Bulk operations (multi-select rows, bulk delete)
- Copy cell / row / column values to clipboard

#### Phase 6: NoSQL Database Support
- MongoDB driver — connect, browse databases and collections
- MongoDB document viewer and editor (JSON tree view)
- MongoDB aggregation pipeline builder
- Redis driver — connect, browse keys
- Redis key browser with value viewer (string, hash, list, set, zset)
- Redis CLI command passthrough

#### Phase 7: Advanced Features
- Data import wizard (CSV, JSON → table) with preview and column mapping
- Schema diff and comparison between connections
- ERD (Entity Relationship Diagram) generation with Mermaid
- SSH tunnel support for remote database connections
- Saved queries and query snippets management
- Customizable keyboard shortcuts with settings UI

### Security
- All SQL queries use parameterized queries — no string interpolation
- Identifier escaping via `escapeIdentifier()` in all drivers
- Credentials encrypted at rest via OS keychain (never stored in plaintext)
- Electron security hardening: contextIsolation, sandbox, CSP headers
- Input validation on connection config (host, port, database name)
- Path traversal prevention for SQLite file paths
- Error message sanitization — no credentials or sensitive data in errors
- XSS prevention — all user content escaped in UI output
- Configurable TLS/SSL certificate validation (`sslRejectUnauthorized` toggle)
- Dependabot configured for automated dependency updates

### Infrastructure
- 156 unit tests across 7 test suites (all passing)
- Vitest test runner with mock infrastructure
- electron-builder configuration for Windows, Linux, and macOS builds
