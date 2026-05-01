# DB Assistant — Roadmap

## Current Status

v0.1.x beta — all core features shipped and working on Windows and Linux. CI/CD pipeline, auto-update, packaging, and open-source infrastructure are in place.

---

## v1.0.0 Stable

- [ ] Clean VM install validation on Ubuntu 22.04+ and Fedora 38+
- [ ] Beta → stable upgrade path smoke test
- [ ] Expand contributor docs: end-to-end local setup, Docker CI guide, how to add a new database driver
- [ ] Troubleshooting section in README (node-gyp, native modules, platform quirks)
- [ ] Windows Authenticode code signing
- [ ] Make repository public

---

## Future

- **macOS support** — DMG packaging (universal binary, Apple Silicon + Intel), code signing and notarization *(requires paid Apple Developer certificate)*, Keychain credential integration
- **Plugin/extension system** — community-contributed database drivers as installable add-ons; also enables modular bundling (ship only the drivers you need)
- **Cloud database connectors** — AWS RDS, Azure SQL, Google Cloud SQL
- **Team features** — shared connections and saved queries
- **AI-assisted query writing**
- **Database migration tooling**
- **In-app bug report** — pre-filled with OS, app version, and Electron version
