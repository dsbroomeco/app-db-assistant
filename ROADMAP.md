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

- [ ] Auto-update mechanism (electron-updater)
- [ ] Windows installer (`.exe` / `.msi` via electron-builder)
- [ ] Linux packages (`.AppImage`, `.deb`, `.rpm`)
- [ ] macOS build (`.dmg`) — stretch goal
- [ ] CI/CD pipeline for automated builds and releases
- [ ] Marketing website: release notes, changelog integration
- [ ] Performance profiling and optimization
- [ ] Accessibility audit (keyboard navigation, screen readers)

## Pre-Deployment: Security Audit & Vulnerability Review

Before any public release, the following security items **must** be audited, tested, and verified:

### SQL Injection Prevention
- [ ] Verify all CRUD operations use parameterized queries — no string interpolation of user input in SQL
- [ ] Audit `getTableData()` in all drivers for safe identifier quoting (schema/table names)
- [ ] Review `executeQuery()` free-form SQL path — ensure it is clearly documented as an intentional "run anything" feature and not exposed to untrusted sources
- [ ] Add automated tests that attempt SQL injection via CRUD inputs and verify they are safely parameterized

### Credential & Data Security
- [ ] Verify credentials never leak into logs, error messages, or renderer process
- [ ] Audit `electron-store` files to confirm no plaintext passwords are written to disk
- [ ] Ensure OS keychain / `safeStorage` encryption is enforced — fallback behavior if keychain is unavailable must not store in plaintext
- [ ] Confirm TLS/SSL certificate validation is configurable (currently `rejectUnauthorized: false` — add user-facing toggle)
- [ ] Review IPC channel surface — ensure no channel can be invoked to extract raw credentials

### Electron Security Hardening
- [ ] Confirm `contextIsolation: true`, `nodeIntegration: false`, `sandbox: true` in all windows
- [ ] Verify `preload.ts` exposes only the minimal required API surface via `contextBridge`
- [ ] Disable `remote` module entirely
- [ ] Review CSP (Content Security Policy) headers for the renderer — block inline scripts and `eval`
- [ ] Validate no `shell.openExternal()` calls with unsanitized URLs (prevent SSRF / open-redirect)
- [ ] Pin Electron version and monitor for security advisories
- [ ] Sign application binaries (Windows Authenticode, macOS code signing)

### Cross-Site Scripting (XSS) Prevention
- [ ] Audit all rendered database values — ensure cell values, error messages, and user content are escaped
- [ ] Verify no `dangerouslySetInnerHTML` usage without sanitization
- [ ] Review clipboard copy operations for potential script injection vectors

### Input Validation
- [ ] Validate connection config fields (host, port, database name) at the boundary — reject obviously malicious inputs
- [ ] Validate and sanitize file paths for SQLite connections (prevent path traversal)
- [ ] Validate export file paths before writing

### Dependency Audit
- [ ] Run `npm audit` and resolve all critical/high vulnerabilities
- [ ] Review native module supply chain (better-sqlite3, pg, mysql2, mssql, tedious)
- [ ] Enable Dependabot or Renovate for automated dependency updates
- [ ] Pin exact versions in `package-lock.json` and verify integrity hashes

### Access Control
- [ ] Ensure application does not run with elevated privileges by default
- [ ] Review file system access scope — limit to user config directories and explicitly selected files
- [ ] Confirm no world-readable/writable config files are created

---

## Deployment

### Build & Packaging

- [ ] **Configure electron-builder** — Set up `electron-builder.yml` or `build` config in `package.json` with:
  - App ID, product name, and copyright
  - File associations (e.g., `.sqlite`, `.db` files)
  - Platform-specific icons (`.ico` for Windows, `.icns` for macOS, `.png` for Linux)
- [ ] **Windows** — Build `.exe` (NSIS installer) and `.msi` (WiX) via `electron-builder --win`
  - Test on Windows 10 and Windows 11
  - Configure auto-elevation for install, per-user vs per-machine install options
  - Sign the installer with an Authenticode certificate (EV recommended for SmartScreen trust)
- [ ] **Linux** — Build `.AppImage`, `.deb`, and `.rpm` via `electron-builder --linux`
  - Test on Ubuntu 22.04+, Fedora 38+, and an Arch-based distro
  - Add desktop entry and icons for GNOME/KDE integration
  - Register appropriate MIME types
- [ ] **macOS** — Build `.dmg` and `.zip` via `electron-builder --mac`
  - Sign with Apple Developer certificate
  - Notarize the app with Apple's notarization service
  - Test on macOS 13+ (Ventura and later)
  - Handle Apple Silicon (arm64) and Intel (x64) universal builds

### CI/CD Pipeline

- [ ] **GitHub Actions workflow** — Set up `release.yml` triggered on version tags (`v*.*.*`):
  1. Checkout and install dependencies (with frozen lockfile)
  2. Run linting, type checking, and unit tests
  3. Build for all target platforms (use matrix strategy: `windows-latest`, `ubuntu-latest`, `macos-latest`)
  4. Run e2e tests on each platform
  5. Upload artifacts and create a GitHub Release with built binaries
- [ ] **Auto-update (electron-updater)** — Configure `autoUpdater` in the main process:
  - Point to GitHub Releases (or a custom update server / S3 bucket)
  - Present update notification in-app (download + restart prompt)
  - Support differential updates where possible to reduce download size
  - Verify update signature before applying
- [ ] **Release channels** — Set up `latest` (stable), `beta`, and `alpha` channels
  - Use pre-release version tags (e.g., `v1.0.0-beta.1`) for beta/alpha
- [ ] **Semantic versioning** — Automate version bumps using `standard-version` or `semantic-release`

### Marketing Website Updates

- [ ] **Download page** — Auto-populate download links with latest release asset URLs from GitHub Releases API
- [ ] **Changelog / Release notes** — Generate from Conventional Commits and display on the website
- [ ] **Platform detection** — Auto-detect visitor's OS and highlight the correct download button
- [ ] **Hash verification** — Publish SHA-256 checksums alongside each binary for user verification

### Pre-Release Checklist

- [ ] Bump version in `package.json`
- [ ] Update `CHANGELOG.md`
- [ ] Run full test suite (unit + e2e) on all target platforms
- [ ] Complete security audit items above
- [ ] Test fresh install on a clean VM for each platform
- [ ] Test upgrade from previous version (if applicable)
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
