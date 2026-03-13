# DB Assistant

A cross-platform desktop database manager for SQL and NoSQL databases.

![Platform Support](https://img.shields.io/badge/platform-Windows%20%7C%20Linux%20%7C%20macOS-blue)
![License](https://img.shields.io/badge/license-MIT-green)

## Features

- **Multi-Database Support** — Connect to PostgreSQL, MySQL/MariaDB, SQLite, Microsoft SQL Server, MongoDB, and Redis
- **Tabbed Interface** — Browse multiple databases, tables, and query results in tabs
- **SQL Editor** — Write and execute SQL queries with syntax highlighting and autocomplete
- **CRUD Operations** — Create, read, update, and delete records with keyboard shortcuts and right-click context menus
- **Cross-Platform** — Runs on Windows, Linux, and macOS
- **Connection Manager** — Save, organize, and securely store database connections
- **Data Export** — Export query results to CSV, JSON, and other formats

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
├── website/           # Next.js marketing site
├── src/               # Electron + React desktop app
│   ├── main/          # Electron main process
│   ├── renderer/      # React UI
│   ├── shared/        # Shared types and utilities
│   └── db/            # Database driver layer
├── tests/             # E2E tests
├── AGENTS.md          # Agent coding instructions
├── ROADMAP.md         # Development roadmap
└── ARCHITECTURE.md    # Technical architecture
```

### Scripts

| Command            | Description                    |
| ------------------ | ------------------------------ |
| `npm run dev`      | Start desktop app (dev mode)   |
| `npm run build`    | Build desktop app for production |
| `npm test`         | Run unit tests                 |
| `npm run test:e2e` | Run end-to-end tests           |
| `npm run lint`     | Lint all source files          |

## Contributing

See [CONTRIBUTING.md](CONTRIBUTING.md) for guidelines.

## License

MIT
