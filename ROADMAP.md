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

## Phase 3: Database Browsing & Schema Viewer (Complete)

- [x] Database tree view (sidebar) — databases → schemas → tables → columns
- [x] Table structure viewer (columns, types, constraints, indexes)
- [x] Table data viewer with pagination
- [x] View, function, and stored procedure listing
- [x] Refresh and lazy-loading for large schemas

## Phase 4: SQL Editor & Query Execution (Complete)

- [x] SQL editor with syntax highlighting (CodeMirror)
- [x] Query execution with result grid
- [x] Multiple query tabs
- [x] Query history
- [x] Autocomplete for table names, columns, and SQL keywords
- [x] Explain/analyze query plans
- [x] Query result export (CSV, JSON, SQL INSERT)

## Phase 5: CRUD Operations & Shortcuts (Complete)

- [x] Inline row editing in table data viewer
- [x] Add new row UI
- [x] Delete row(s) with confirmation
- [x] Right-click context menus on tables, rows, and cells
- [x] Keyboard shortcuts for common CRUD actions
- [x] Bulk operations (multi-select rows, bulk delete/update)
- [x] Copy cell / row / column values

## Phase 6: NoSQL Database Support (Complete)

- [x] MongoDB driver and connection support
- [x] MongoDB document viewer and editor (JSON tree view)
- [x] MongoDB query builder
- [x] Redis driver and connection support
- [x] Redis key browser and value viewer
- [x] Redis CLI passthrough

## Phase 7: Advanced Features (Complete)

- [x] Data import (CSV, JSON → table)
- [x] Schema diff and comparison between connections
- [x] ERD (Entity Relationship Diagram) generation
- [x] SSH tunnel support for remote databases
- [x] Saved queries and query snippets
- [x] Customizable keyboard shortcuts

## Phase 8: Polish & Distribution

- [x] Auto-update mechanism (electron-updater)
- [x] electron-builder configuration (Windows NSIS/MSI, Linux AppImage/deb/rpm, macOS DMG universal)
- [x] CI/CD pipeline for automated builds and releases (GitHub Actions `release.yml`)
- [x] Marketing website: release notes, changelog integration
- [x] Accessibility audit (keyboard navigation, screen readers)
- [x] App icons for all platforms — `build/icon.png` (master), `build/icons/` (Linux PNGs). Generated via `scripts/generate-icons.js`.
- [ ] Performance profiling and optimization
- [x] E2E test suite (`tests/e2e/`) — Playwright smoke tests scaffolded: `app-launch.test.ts`, `connection-form.test.ts`

## Pre-Deployment: Security Audit & Vulnerability Review

Before any public release, the following security items **must** be audited, tested, and verified:

### SQL Injection Prevention
- [x] Verify all CRUD operations use parameterized queries — no string interpolation of user input in SQL
- [x] Audit `getTableData()` in all drivers for safe identifier quoting (schema/table names)
- [x] Review `executeQuery()` free-form SQL path — ensure it is clearly documented as an intentional "run anything" feature and not exposed to untrusted sources
- [x] Add automated tests that attempt SQL injection via CRUD inputs and verify they are safely parameterized

### Credential & Data Security
- [x] Verify credentials never leak into logs, error messages, or renderer process
- [x] Audit `electron-store` files to confirm no plaintext passwords are written to disk
- [x] Ensure OS keychain / `safeStorage` encryption is enforced — fallback behavior if keychain is unavailable must not store in plaintext
- [x] Confirm TLS/SSL certificate validation is configurable — `sslRejectUnauthorized` toggle added to connection form and all drivers
- [x] Review IPC channel surface — ensure no channel can be invoked to extract raw credentials

### Electron Security Hardening
- [x] Confirm `contextIsolation: true`, `nodeIntegration: false`, `sandbox: true` in all windows
- [x] Verify `preload.ts` exposes only the minimal required API surface via `contextBridge`
- [x] Disable `remote` module entirely
- [x] Review CSP (Content Security Policy) headers for the renderer — block inline scripts and `eval`
- [x] Validate no `shell.openExternal()` calls with unsanitized URLs (prevent SSRF / open-redirect)
- [x] Pin Electron version and monitor for security advisories — Electron ^34.0.0 pinned, Dependabot enabled
- [ ] Sign application binaries (Windows Authenticode, macOS code signing) — *deferred: requires paid certificates*

### Cross-Site Scripting (XSS) Prevention
- [x] Audit all rendered database values — ensure cell values, error messages, and user content are escaped
- [x] Verify no `dangerouslySetInnerHTML` usage without sanitization
- [x] Review clipboard copy operations for potential script injection vectors

### Input Validation
- [x] Validate connection config fields (host, port, database name) at the boundary — reject obviously malicious inputs
- [x] Validate and sanitize file paths for SQLite connections (prevent path traversal)
- [x] Validate export file paths before writing

### Dependency Audit
- [x] Run `npm audit` and resolve all critical/high vulnerabilities
- [x] Review native module supply chain — `npm audit` confirms 0 vulnerabilities in production deps (pg, mysql2, better-sqlite3, mssql, mongodb, ioredis, ssh2)
- [x] Enable Dependabot or Renovate for automated dependency updates — `.github/dependabot.yml` created
- [x] Pin exact versions in `package-lock.json` and verify integrity hashes — `npm config set save-exact true` configured

### Access Control
- [x] Ensure application does not run with elevated privileges by default
- [x] Review file system access scope — limit to user config directories and explicitly selected files
- [x] Confirm no world-readable/writable config files are created

---

## Deployment

### Batch 1: Build Prerequisites (blocking everything else)

These items must be completed first — without them, no build will succeed.

- [x] **Create app icons** — `build/icon.png` (1024×1024 master), `build/icons/` with sized PNGs (16–512px, Linux). electron-builder auto-converts to `.ico`/`.icns`. Generated via `scripts/generate-icons.js`.
- [x] **Fix GitHub repo URL** — Updated `GITHUB_REPO` in `website/src/app/download/page.tsx` to `dsbroomeco/app-db-assistant`
- [x] **Verify local build** — `npm run build:win` produces `DB Assistant Setup 0.1.0.exe` (89 MB) and `DB Assistant 0.1.0.msi` (98 MB) in `release/`. Unsigned builds work with `sign: null` in electron-builder config (`CSC_IDENTITY_AUTO_DISCOVERY=false`). Code signing deferred to Batch 3.

### Batch 2: CI/CD Validation & Release Pipeline

The pipeline scaffolding exists but has never been exercised on a real tag push.

> **Policy:** All pipeline build/test steps must be validated locally in Docker containers before pushing to CI. Dockerfiles for each platform target live in `docker/` and are used to replicate the GitHub Actions matrix locally.

- [x] **GitHub Actions workflow** — `release.yml` exists: lint → typecheck → test → e2e → build (matrix) → upload → GitHub Release
- [x] **Auto-update (electron-updater)** — Implemented in `src/main/auto-updater.ts`, points to GitHub Releases, user-initiated download + restart
- [x] **electron-builder config** — `build` section in `package.json` complete for all 3 platforms (NSIS/MSI, AppImage/deb/rpm, DMG with universal arch)
- [x] **Create Docker build containers** — `docker/Dockerfile.linux` and `docker/Dockerfile.win` with `docker-compose.yml` for one-command local pipeline runs
- [x] **Validate builds locally in Docker** — Full Linux pipeline (typecheck → test → build → package AppImage/deb/rpm) validated in Docker. Windows builds validated natively.
- [ ] **Dry-run the pipeline** — Push a `v0.1.0-beta.1` tag and verify the full CI flow produces artifacts for all platforms
- [x] **Add e2e test stage to CI** — Playwright step added to `release.yml` on `ubuntu-latest` with `continue-on-error: true` until test suite is stable
- [x] **Semantic versioning tooling** — `standard-version` installed; `npm run release`, `npm run release:beta`, `npm run release:dry` scripts added

### Batch 3: Remaining Security Items

These are deferred from the security audit and should be addressed before stable release (a beta can ship without them).

- [x] **Native module supply chain review** — `npm audit` confirms zero vulnerabilities in production/runtime dependencies (pg, mysql2, better-sqlite3, mssql, mongodb, ioredis, ssh2). All 14 audit findings are in dev/build deps (electron-builder, tar, electron).
- [x] **Pin exact versions** — `npm config set save-exact true` configured; future installs use pinned versions
- [ ] **Sign application binaries** — Windows Authenticode + macOS code signing / notarization (requires paid certificates; can be deferred to post-beta)

### Batch 4: Remaining Polish

- [ ] **Performance profiling and optimization** — Profile startup time, large-table rendering, and query execution. Target <3s cold start.
- [x] **Create e2e test suite** — Playwright smoke tests scaffolded in `tests/e2e/`: `app-launch.test.ts` (launch + window size), `connection-form.test.ts` (form fields render)

### Batch 5: Marketing Website Updates

- [x] **Update `GITHUB_REPO`** — Fixed to `dsbroomeco/app-db-assistant`
- [x] **Keep `CURRENT_VERSION` in sync** — Updated to `0.1.1-beta.0` in `download/page.tsx`; version badge updated on landing page
- [x] **Platform detection** — `DownloadCards` client component auto-detects visitor OS via `navigator.userAgent`, highlights matching platform card, and sorts it first
- [ ] **Hash verification** — Publish SHA-256 checksums alongside each binary for user verification
- [x] **Changelog integration** — `website/src/app/changelog/page.tsx` reads from `CHANGELOG.md` and renders it

### Batch 6: Pre-Release Checklist (gate for v1.0.0 stable)

- [ ] Bump version in `package.json` to `1.0.0`
- [ ] Update `CHANGELOG.md` with all changes since `0.1.0`
- [ ] Run full test suite (unit + e2e) on all target platforms
- [ ] Complete remaining security audit items (Batch 3)
- [ ] Test fresh install on a clean VM for each platform (Windows 10/11, Ubuntu 22.04+, Fedora 38+)
- [ ] Test upgrade path from beta → stable
- [ ] Verify auto-update flow end-to-end
- [ ] Review all error messages for user-friendliness (no stack traces in production)
- [ ] Confirm telemetry/analytics are opt-in only (if applicable)

---

## Maintenance

### Ongoing Security

- [ ] Monitor Electron security releases — upgrade promptly for any critical patch
- [ ] Run `npm audit` on every CI build; fail the build on critical vulnerabilities
- [ ] Subscribe to security advisories for all database driver packages
- [ ] Rotate code-signing certificates before expiration
- [ ] Conduct periodic security reviews (quarterly recommended)

### Bug Tracking & User Feedback

- [ ] Set up GitHub Issues templates for bug reports, feature requests, and security disclosures
- [ ] Configure issue labels and milestones to triage effectively
- [ ] Add an in-app "Report Bug" link that pre-fills system info (OS, app version, Electron version)
- [ ] Set up a `SECURITY.md` with responsible disclosure instructions

### Performance Monitoring

- [ ] Profile memory usage with large datasets (10k+ row tables, 100+ connections)
- [ ] Monitor and optimize Electron main process memory footprint
- [ ] Add connection pool health checks and automatic reconnection logic
- [ ] Track and optimize app startup time (target < 3 seconds to first paint)

### Update Cadence

- [ ] **Patch releases** (x.x.X) — Bug fixes and security patches, as needed
- [ ] **Minor releases** (x.X.0) — New features and improvements, monthly or bi-monthly
- [ ] **Major releases** (X.0.0) — Breaking changes or major feature introductions, per roadmap milestones
- [ ] Maintain a public changelog with every release
- [ ] Deprecation policy: announce breaking changes at least one minor version in advance

### Documentation Maintenance

- [ ] Keep `README.md`, `ARCHITECTURE.md`, and `CONTRIBUTING.md` up to date with every release
- [ ] Update user-facing documentation on the marketing website
- [ ] Maintain API/IPC channel documentation for contributors
- [ ] Archive stale roadmap items that are deferred indefinitely

### Database Driver Maintenance

- [ ] Track upstream driver releases (pg, mysql2, better-sqlite3, mssql/tedious, mongodb, ioredis)
- [ ] Test driver upgrades against all supported database versions
- [ ] Add compatibility matrix: driver version × database server version
- [ ] Handle deprecations in database server APIs gracefully

---

## Future Ideas (Backlog)

- Plugin / extension system for community-contributed database drivers
- Cloud database support (AWS RDS, Azure SQL, Google Cloud SQL)
- Team features (shared connections, shared queries)
- AI-assisted query writing
- Database migration tooling
- REST API explorer (for API-backed data sources)

---

## Future Optimizations

- [ ] **Modular / downloadable functionality** — Make the application leaner by packaging database drivers and features as optional modules that users can download on demand rather than shipping everything in the core bundle. Each database engine (PostgreSQL, MySQL, SQLite, SQL Server, MongoDB, Redis) and advanced features (ERD generation, schema diff, import/export wizards) could be offered as installable add-ons, reducing initial download size and memory footprint for users who only need a subset of supported databases.
- [ ] Lazy-load heavy UI components (CodeMirror editor, chart renderers) to improve startup time
- [ ] Investigate tree-shaking and code-splitting for the renderer bundle
- [ ] Profile and optimize IPC serialization for large query result sets
- [ ] Connection pooling tuning and idle connection cleanup
- [ ] Investigate WebAssembly-based drivers for in-process performance gains (e.g., SQLite via wa-sqlite)
