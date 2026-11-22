# DB Assistant — Roadmap

## Current Status

v0.2.0 — all core features shipped and working on Windows and Linux. CI/CD pipeline, auto-update, packaging, and open-source infrastructure are in place.

---

## v1.0.0 Stable

- [x] Upgrade application stack (Electron, Vite/Vitest, ESLint, TypeScript, database drivers, Node.js LTS, Docker, GitHub Actions)
- [ ] Clean VM install validation on Ubuntu 22.04+ and Fedora 38+
- [ ] Beta → stable upgrade path smoke test
- [ ] Expand contributor docs: end-to-end local setup, Docker CI guide, how to add a new database driver
- [x] Troubleshooting section in README (node-gyp, native modules, platform quirks)
- [ ] Windows Authenticode code signing
- [x] Make repository public

---

## Database Version Support Validation (Post-Upgrade)

Validate drivers, schema introspection, TLS/auth defaults, and CRUD against current database releases (and retire EOL version claims in `README.md`):

- [ ] **PostgreSQL 18 & 19** — validate `pg` wire compatibility, catalog/index introspection (`pg_index`/`information_schema`), and `EXPLAIN ANALYZE` (PG 12–14 are now EOL)
- [ ] **MySQL 9.x (9.7 LTS) & 26.x** — validate `mysql2` against `caching_sha2_password`/strict TLS defaults and `information_schema` queries (MySQL 5.7 & 8.0 are now EOL)
- [ ] **MariaDB 11.4 LTS, 11.8 LTS, 12.3 LTS & 13.0** — validate `mysql2` handshake and `information_schema` / constraint introspection (MariaDB 10.6 is now EOL)
- [ ] **SQLite 3.54.x** — validated via `better-sqlite3` v13 (N-API); test `STRICT` tables and generated columns (`PRAGMA table_xinfo`)
- [ ] **Microsoft SQL Server 2025** — validate `mssql`/Tedious TLS encryption defaults (`encrypt: true`), `SET SHOWPLAN_TEXT`, `STRING_AGG`, and newer column types (e.g., native `JSON` / `VECTOR`)
- [ ] **MongoDB 8.x & 9.0** — validate with `mongodb` driver `>=7.6` (`7.9.x`) for full MongoDB 9.0 support (MongoDB 5.0/6.0 are EOL); review non-`ObjectId` `_id` handling
- [ ] **Redis 8.x (and Valkey 7.2 / 8.x)** — validate `ioredis` v6 RESP3 default (`HELLO 3`), optional `protocol: 2` fallback for legacy servers/proxies, and native Redis 8 module key types (JSON, Search, TimeSeries)

---

## Future

- **macOS support** — DMG packaging (universal binary, Apple Silicon + Intel), code signing and notarization *(requires paid Apple Developer certificate)*, Keychain credential integration
- **Plugin/extension system** — community-contributed database drivers as installable add-ons; also enables modular bundling (ship only the drivers you need)
- **Cloud database connectors** — AWS RDS, Azure SQL, Google Cloud SQL
- **Team features** — shared connections and saved queries
- **AI-assisted query writing**
- **Database migration tooling**
- **In-app bug report** — pre-filled with OS, app version, and Electron version
