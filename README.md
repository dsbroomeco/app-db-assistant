# DB Assistant

A cross-platform desktop database manager for SQL and NoSQL databases.

![Platform Support](https://img.shields.io/badge/platform-Windows%20%7C%20Linux%20%7C%20macOS-blue)
![License](https://img.shields.io/badge/license-MIT-green)

## Features

- **Multi-Database Support** — Connect to PostgreSQL, MySQL/MariaDB, SQLite, Microsoft SQL Server, MongoDB, and Redis
- **Tabbed Interface** — Browse multiple databases, tables, and query results in tabs
- **Schema Browser** — Tree view for exploring databases, schemas, tables, views, and routines
- **Table Structure Viewer** — Inspect columns, data types, indexes, and constraints
- **Table Data Viewer** — Browse table data with pagination and row counts
- **SQL Editor** — Write and execute SQL queries with syntax highlighting and autocomplete
- **CRUD Operations** — Create, read, update, and delete records with keyboard shortcuts and right-click context menus
- **MongoDB Support** — Browse databases and collections, view/edit/insert/delete documents with a JSON tree view, run aggregation pipelines
- **Redis Support** — Browse and search keys, view type-aware values (strings, lists, sets, hashes, sorted sets, streams), set/edit/delete keys, built-in CLI passthrough
- **Cross-Platform** — Runs on Windows, Linux, and macOS
- **Connection Manager** — Save, organize, and securely store database connections
- **Data Export** — Export query results to CSV, JSON, and other formats
- **Data Import** — Import CSV and JSON files into database tables with column mapping
- **Schema Diff** — Compare schemas between connections to spot differences
- **ERD Generation** — Generate Entity Relationship Diagrams with Mermaid
- **SSH Tunnel** — Connect to remote databases through SSH tunnels
- **Saved Queries** — Save and organize frequently used queries
- **Customizable Shortcuts** — Remap keyboard shortcuts to your preferences
- **Auto-Update** — Automatic update notifications with one-click install
- **SSL/TLS** — Configurable SSL certificate verification for all database types

## Downloads

Visit the [DB Assistant website](https://dbassistant.dev) to download the latest version for your platform.

| Platform | Format                  |
| -------- | ----------------------- |
| Windows  | `.exe` / `.msi`         |
| Linux    | `.AppImage` / `.deb` / `.rpm` |
| macOS    | `.dmg`                  |

## Development

### Prerequisites

- Node.js 20+
- npm 10+

### Getting Started

```bash
# Clone the repository
git clone git@github.com:dsbroomeco/app-db-assistant.git
cd app-db-assistant

# Install dependencies
npm install

# Start the desktop app in development mode
npm run dev

# Start the marketing website
cd website && npm run dev
```

### Project Structure

```
app-db-assistant/
├── website/               # Next.js marketing site
├── src/                   # Electron + React desktop app
│   ├── main/              # Electron main process
│   │   ├── main.ts        # App entry, window management, IPC handlers
│   │   └── preload.ts     # Context bridge for renderer
│   ├── renderer/          # React UI (Vite)
│   │   ├── components/    # React components (Sidebar, TabBar, TreeView, TableData, TableStructure, QueryEditor, MongoViews, RedisViews)
│   │   ├── context/       # React context providers (Connection, Settings, Theme)
│   │   ├── hooks/         # Custom hooks (useTabs)
│   │   ├── utils/         # Utilities (query result export)
│   │   ├── styles/        # Global CSS
│   │   └── App.tsx        # Root app component
│   ├── shared/            # Shared types and utilities
│   │   ├── ipc.ts         # Typed IPC channel definitions (50 channels)
│   │   └── types/         # Shared type definitions
│   └── db/                # Database connection drivers
│       ├── drivers/       # PostgreSQL, MySQL, SQLite, MSSQL, MongoDB, Redis drivers
│       ├── connection-manager.ts  # Connection lifecycle management
│       ├── credential-store.ts    # Encrypted credential storage
│       ├── ssh-tunnel.ts          # SSH tunnel management
│       ├── data-import.ts         # CSV/JSON import engine
│       ├── schema-diff.ts         # Schema comparison engine
│       ├── saved-queries.ts       # Saved query persistence
│       └── sanitize.ts            # Error message sanitization
├── tests/                 # E2E tests
├── AGENTS.md              # Agent coding instructions
├── ROADMAP.md             # Development roadmap
└── ARCHITECTURE.md        # Technical architecture
```

### Scripts

| Command              | Description                         |
| -------------------- | ----------------------------------- |
| `npm run dev`        | Start desktop app (dev mode)        |
| `npm run build`      | Build main process + renderer       |
| `npm run build:electron` | Build + package with electron-builder |
| `npm run build:win`  | Build + package for Windows           |
| `npm run build:linux`| Build + package for Linux              |
| `npm run build:mac`  | Build + package for macOS              |
| `npm run pack`       | Build + pack (no installer, for testing) |
| `npm test`           | Run unit tests                      |
| `npm run test:watch` | Run unit tests in watch mode        |
| `npm run test:e2e`   | Run end-to-end tests                |
| `npm run lint`       | Lint all source files               |
| `npm run lint:fix`   | Lint and auto-fix                   |
| `npm run format`     | Format with Prettier                |
| `npm run typecheck`  | TypeScript type checking only       |

## Contributing

See [CONTRIBUTING.md](CONTRIBUTING.md) for guidelines.

## License

MIT
