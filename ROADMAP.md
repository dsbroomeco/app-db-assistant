# DB Assistant — Roadmap

## Pre-Launch: Open-Source Cleanup

Items that **must** be completed before the repository is made public.

- [ ] Remove `testdb/` folder — this directory contains a dev-only Docker Compose setup with hardcoded credentials for local PostgreSQL and MySQL test instances. It must not be included in the public open-source repo. Verify it is absent from the final public branch and that no commit history exposes the credentials.

---

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
- [x] Resizable table columns — drag the right edge of any column header to resize; widths reset on table change
- [x] Deferred row editing — changes stage locally, highlighted in yellow (row) and darker yellow (modified cells); saved in batch on Ctrl+S; blocked per-row on DB errors
- [x] Performance profiling and optimization
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
- [x] **Verify local build** — `npm run build:win` produces `DB Assistant Setup 0.1.0.exe` (89 MB) and `DB Assistant 0.1.0.msi` (98 MB) in `release/`. Unsigned builds work with `CSC_IDENTITY_AUTO_DISCOVERY=false`; code signing remains deferred to Batch 3.

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

#### Lint Remediation Backlog (completed April 2026)

Current `npm run lint` status: **0 problems**.

Segment 1 — Core DB module cleanup
- [x] `src/db/connection-manager.ts` — removed unused imports: `isSqlType`, `createDriver`, `createMongoDriver`, `createRedisDriver`
- [x] `src/db/drivers/index.ts` — removed unused imports: `isSqlType`, `isNoSqlType`
- [x] `src/db/drivers/mongodb.ts` — removed unused `_id` binding while still stripping `_id` from update payload
- [x] `src/db/drivers/mssql.ts` — removed unused `paramIdx`
- [x] `src/db/drivers/sqlite.ts` — replaced `require("better-sqlite3")` with dynamic `import()`
- [x] `src/db/ssh-tunnel.ts` — removed unused `getPassword` import
- [x] `src/db/types.ts` — removed unused `RedisKeyInfo` import

Segment 2 — Renderer/component cleanup
- [x] `src/renderer/components/ConnectionForm.tsx` — removed unused `isNoSql`
- [x] `src/renderer/components/RedisTreeView.tsx` — renamed unused props to `_connectionId` / `_connectionName`
- [x] `src/renderer/components/Sidebar.tsx` — removed unused `isNoSqlType`
- [x] `src/renderer/components/TableDataView.tsx` — removed unused `primaryKeys` prop from memoized row component
- [x] `src/shared/types/database.test.ts` — removed unused `ColumnDiff` import

Segment 3 — Hook dependency warnings
- [x] `src/renderer/App.tsx` — replaced `queryCount` local variable with `useRef` counter for stable callback behavior
- [x] `src/renderer/components/MongoCollectionView.tsx` — fixed `useEffect` deps by stabilizing `fetchDocuments`
- [x] `src/renderer/components/QueryEditorView.tsx` — fixed `handleExecute` dependency on `refreshHistory`
- [x] `src/renderer/components/RedisBrowserView.tsx` — fixed `useEffect` deps to use `scanKeys`

Deferred follow-up (non-lint)
- [x] Node warning during lint resolved by renaming `eslint.config.js` to `eslint.config.mjs` (Phase 1)

### Launch Execution Phases (through open-source go-live)

This sequence is the operational plan from current state to public open-source launch.

#### Phase 1 — Tooling Baseline Stabilization (completed)

- [x] Rename ESLint config to ESM file (`eslint.config.mjs`) to eliminate Node module-type warning
- [x] Re-run local quality gates: `npm run lint`, `npm run typecheck`, `npm test`, `npm run test:e2e`
- [x] Confirm no regressions after module-format adjustment

#### Phase 2 — CI/CD Release Dry-Run (beta.1 failed; beta.2 rerun in progress)

- [x] Create and push beta dry-run tag `v0.1.1-beta.1` to trigger release workflow
- [x] Confirm tag push succeeded to origin
- [x] Verify full GitHub Actions run and artifact state from this environment

Recorded failure details (run `25029287581`):
- `lint-and-test`: success
- `e2e-test`: success
- `build (macos-latest, mac)`: success, artifact uploaded (`dist-mac`)
- `build (windows-latest, win)`: **failed** in MSI packaging (`LGHT0094: Icon:DBAssistantIcon.exe could not be found` in WiX linker)
- `build (ubuntu-latest, linux)`: cancelled after windows failure
- `publish`: skipped due failed dependency jobs

Follow-up executed:
- Added explicit icon generation (`build/icon.ico`) and CI icon generation step before packaging
- Triggered rerun tag `v0.1.1-beta.2` (run `25030049034`)
- Current state: `lint-and-test`, `e2e-test`, `build (linux)`, and `build (mac)` succeeded; `build (windows)` still in progress

#### Phase 3 — Remaining Performance Batch

- [ ] Complete remaining Batch 4 items (React DevTools interaction profiling still pending)
- [ ] Document before/after startup and interaction metrics (automated proxy captured; manual profiler captures pending)

#### Phase 4 — Website & Distribution Completion

- [x] Add static export path for website and automate GitHub Pages deployment
- [x] Add legal pages and checksum publishing links
- [x] Automate website version sync from root package version

Operational note (April 2026):
- GitHub Pages deployment is currently blocked by repository plan limits (`422: Your current plan does not support GitHub Pages for this repository`)
- Workflow `.github/workflows/website.yml` now runs in build-only mode and uploads `website/out` as a standard Actions artifact (`website-static`)
- Deployment can be re-enabled later by upgrading plan or switching to another static host

#### Phase 5 — Pre-Release Quality Gate

- [ ] Complete all Batch 6 checklist items for stable readiness
- [ ] Validate installer behavior and auto-update paths on target platforms

#### Phase 6 — Open-Source Readiness Hardening

- [ ] Complete legal/history/security/community infrastructure items under Open Source Release
- [ ] Add contributor CI workflow and branch protection requirements

#### Phase 7 — Go-Live Execution

- [ ] Final security audit and release decision
- [ ] Publish release, make repository public, enable Discussions, and announce

#### Phase 8 — First 30 Days Post-Launch

- [ ] Triage and respond to external issues/discussions daily
- [ ] Ship first patch release from community/field feedback
- [ ] Tune docs and contributor onboarding from real-world friction

### Batch 3: Remaining Security Items

These are deferred from the security audit and should be addressed before stable release (a beta can ship without them).

- [x] **Native module supply chain review** — `npm audit` confirms zero vulnerabilities in production/runtime dependencies (pg, mysql2, better-sqlite3, mssql, mongodb, ioredis, ssh2). All 14 audit findings are in dev/build deps (electron-builder, tar, electron).
- [x] **Pin exact versions** — `npm config set save-exact true` configured; future installs use pinned versions
- [ ] **Sign application binaries** — Windows Authenticode + macOS code signing / notarization (requires paid certificates; can be deferred to post-beta)

### Batch 4: Performance Profiling & Optimization

All binaries flow through GitHub Releases; there is no separate CDN to worry about. Performance work is the only remaining polish blocker.

#### Startup Time (target: < 3s cold start on mid-range hardware)

- [x] **Baseline startup measurement** — Added `performance.now()` timing logs around startup init steps in `src/main/main.ts` and a dev-time `did-finish-load` timing marker
- [x] **Parallelize independent init calls** — `initQueryHistory()` and `initSavedQueries()` have no dependency on each other; run both with `Promise.all` alongside `initConnectionManager()` where safe
- [x] **Measure and document baseline** — Local Linux dev measurements with `NODE_ENV=development npm run dev:main`:
	- Cold sample: `did-finish-load=306ms` since `app.whenReady`
	- Warm sample: `did-finish-load=297ms` since `app.whenReady`
	- Init breakdowns remained stable (`initStore` 38-41ms, `parallelInitTotal` 1ms, `createWindow` 39-40ms)
	- Automated interaction proxy (Playwright JSON reporter, `tests/e2e/app-launch.test.ts`):
		- `app launches and shows the main window`: `1007ms`
		- `app window has expected minimum size`: `816ms`
		- `tab switch unmounts inactive view content`: `1094ms`
	- Limitation: React DevTools Profiler capture is still pending for component-level render-cost analysis

#### Query Result Grid — Virtual Scrolling (highest risk, no row cap today)

- [x] **Add `MAX_RESULT_ROWS` cap** — Free-form `query:execute` results currently have no row limit; a `SELECT * FROM huge_table` serializes everything over IPC and renders all rows in the DOM. Add a configurable cap (default 10,000) with a visible truncation warning in `ResultsView` in `QueryEditorView.tsx`
- [x] **Add virtual scrolling to result grid** — Replaced the plain `<table>` result renderer with `@tanstack/react-virtual` so only visible rows are rendered at once
- [x] **Add table data re-render optimization** — `TableDataView.tsx` retains pagination at 50 rows and now uses stable primary-key based row keys plus memoized row rendering to avoid avoidable remounts

#### Table Data View — COUNT(*) Cost

- [x] **Replace exact COUNT(*) with fast estimates where acceptable** — On large PostgreSQL tables, `SELECT COUNT(*)` does a full sequential scan. Use `pg_class.reltuples` for the row estimate when `totalRows` is only needed for pagination UI. Add a `exactCount: boolean` option to `getTableData()` driver interface; default to estimate for browsing, exact for export
- [x] **MySQL equivalent** — Use `information_schema.TABLES.TABLE_ROWS` as the estimate for MySQL/MariaDB; fall back to `COUNT(*)` only when user explicitly requests it

#### ERD View — Concurrent IPC Flood

- [x] **Add concurrency limit to ERD table structure fetches** — `ErdView.tsx` fires one `db:table-structure` IPC call per table simultaneously via `Promise.all`. For schemas with 100+ tables this overwhelms the connection pool. Add concurrency limiting (max 8 parallel) using a simple worker-pool semaphore
- [x] **Cache `db:table-structure` results in main process** — Table structure cache keyed by `(connectionId, schema, table)` is implemented in `src/db/connection-manager.ts`, with invalidation on disconnect
- [x] **Add per-table progress indicator to ERD** — `ErdView.tsx` now shows `Fetching X of Y tables…` during generation

#### Autocomplete — Live DB Queries on Every Keystroke

- [x] **Cache `getCompletionItems()` per connection** — Currently called on every CodeMirror completion trigger; each call runs live DB queries for all table and column names. Cache the result in main process memory after first fetch per `connectionId`, invalidated only on disconnect or `db:refresh`
- [x] **Measure and log completion latency** — Added dev-time cache hit/miss latency logging in `getCompletionItems()`

#### IPC Payload Size

- [x] **Log IPC payload sizes in dev mode** — Added serialized payload-size logging for `query:execute` and `db:table-data` IPC responses in `src/main/main.ts`
- [x] **Stream large exports directly to disk** — Added `query:export` IPC path that executes and writes CSV/JSON/SQL exports from the main process using `fs.createWriteStream`, avoiding renderer-side content buffering

#### React Render Profiling

- [ ] **Profile with React DevTools Profiler** — Record a session of: opening a large table, editing a cell, multi-selecting rows, switching tabs. Identify components with disproportionate render time and add `React.memo`, `useMemo`, or `useCallback` where the profiler shows clear wins (not speculatively)
- [x] **Confirm no unnecessary re-renders on tab switch** — Added Playwright e2e coverage in `tests/e2e/app-launch.test.ts` that opens a query tab and asserts welcome content is removed from DOM when inactive

---

### Batch 5: Website & Distribution

**Distribution strategy:** All binary downloads already point directly to GitHub Releases (`github.com/dsbroomeco/app-db-assistant/releases/download/...`). GitHub handles the actual file hosting. The marketing website (`/website`) is a Next.js app that provides a polished landing page and OS-detection on the download page — it does not host any binaries itself.

**Recommendation: Deploy the website to GitHub Pages as a static export (free, zero separate hosting required).** The Next.js site can be statically exported (`next export`) and served from `gh-pages` branch or the `docs/` folder. This eliminates any hosting cost while keeping the polished landing page and OS detection.

**What GitHub provides without the website:**
- GitHub Releases: all binary downloads, release notes, version history ✓
- GitHub README: feature overview and install instructions ✓
- GitHub Discussions: community Q&A ✓
- `CHANGELOG.md`: rendered natively on GitHub ✓

**What the website adds on top:**
- Polished marketing landing page with feature cards and database pills
- OS auto-detection on the download page (sorts the correct platform first)
- Nicer changelog rendering than raw Markdown
- SEO/discoverability via search engines

- [x] **Add `next export` static build** — `website/next.config.ts` now uses `output: 'export'`; `website/package.json` includes `build:static`
- [x] **Deploy to GitHub Pages** — Added `.github/workflows/website.yml` to build and deploy `website/out` via GitHub Pages
- [x] **Automate version sync** — Added `scripts/sync-website-version.js` and wired `standard-version` `postbump` hook to keep `website/src/app/download/page.tsx` in sync with root version
- [x] **Create missing legal pages** — Added `website/src/app/privacy/page.tsx` and `website/src/app/terms/page.tsx`
- [x] **Add SHA-256 checksums** — Release workflow now generates `checksums.txt` and the download page links to it
- [x] **Update `GITHUB_REPO`** — Fixed to `dsbroomeco/app-db-assistant`
- [x] **Keep `CURRENT_VERSION` in sync** — Updated to `0.1.1-beta.0` in `download/page.tsx`; version badge updated on landing page
- [x] **Platform detection** — `DownloadCards` client component auto-detects visitor OS via `navigator.userAgent`, highlights matching platform card, and sorts it first
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

## Open Source Release

This phase covers everything required to make the repository public and ready for external contributions.

### License & Legal

- [x] **Verify license compatibility** — All direct and transitive dependencies are MIT, Apache-2.0, or ISC. No GPL/LGPL/AGPL/commercial-only packages. Confirmed: safe to publish under MIT. *(completed April 2026)*
- [x] **Add `LICENSE` file** — MIT license text with current copyright year at repo root
- [ ] **Audit git history for secrets** — Run `git log --all --full-history` + `trufflehog` or `gitleaks` to confirm no credentials, API keys, or private URLs were ever committed; rewrite history if needed
- [ ] **Audit assets for proprietary content** — Confirm all icons, fonts, and images are either original or licensed for open distribution; replace any that are not

### Community Infrastructure

- [ ] **Add `CODE_OF_CONDUCT.md`** — Contributor Covenant v2.1 at repo root
- [ ] **Add `SECURITY.md`** — Private vulnerability disclosure instructions (email or GitHub private advisory); do not direct reporters to public issues
- [ ] **Add GitHub issue templates** (`.github/ISSUE_TEMPLATE/`) — Bug report, Feature request, and Question templates
- [ ] **Add GitHub PR template** (`.github/pull_request_template.md`) — Checklist: tests pass, lint clean, docs updated, breaking changes noted
- [ ] **Add `CODEOWNERS`** (`.github/CODEOWNERS`) — Define code ownership for review routing
- [ ] **Configure branch protection** — Require PR + CI pass before merge to `main`; no force-push

### Repository Hygiene

- [ ] **Scrub `README.md` for internal references** — Remove any internal emails, Slack links, or private URLs; ensure all links are publicly accessible
- [ ] **Confirm `.gitignore` is complete** — `.env`, `*.env`, credential files, and OS artifacts (`.DS_Store`, `Thumbs.db`) are excluded
- [ ] **Verify `.env.example` is up to date** — All required environment variables documented with placeholder values; no real values committed
- [ ] **Remove or anonymize internal identifiers** — Check author email in `package.json` and git config; use a public contact address

### CI/CD for Contributors

- [ ] **Add PR check workflow** — `.github/workflows/pr-check.yml`: lint → typecheck → unit tests on every pull request (all platforms in matrix)
- [ ] **Add issue/PR labels** — Define standard label set: `bug`, `enhancement`, `good first issue`, `help wanted`, `needs review`, `breaking change`
- [ ] **Add stale issue bot** — Close inactive issues after 60 days of no response; warn at 45 days

### Documentation for External Contributors

- [ ] **Expand `CONTRIBUTING.md`** — Add: local dev environment setup end-to-end, how to run Docker CI locally, native module rebuild instructions, how to add a new database driver
- [ ] **Add `ARCHITECTURE.md` contributor section** — Quick-start guide explaining IPC flow, main/renderer boundary, and driver interface for new contributors
- [ ] **Add troubleshooting section to `README.md`** — Common setup issues (node-gyp failures, electron rebuild, platform differences)

### Go Public

- [ ] **Final pre-publish audit** — Run `npm audit`, check for any new CVEs; confirm 0 high/critical vulnerabilities
- [ ] **Make GitHub repository public**
- [ ] **Enable GitHub Discussions** — Create initial categories: Announcements, Q&A, Feature Requests, Show and Tell
- [ ] **Create `v0.1.0` or `v1.0.0` release** — Tag, build artifacts for all platforms, publish release notes from `CHANGELOG.md`
- [ ] **Announce** — Post to relevant communities (Reddit r/programming, Hacker News Show HN, dev.to, etc.)

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
