# Contributing to DB Assistant

Thanks for your interest in contributing! Here's how to get started.

## Development Setup

1. **Fork and clone** the repository
2. **Install Node.js 20+** and npm 10+
3. Run `npm install` in the project root
4. For the marketing website: `cd website && npm install`
5. If you need to build Linux `.rpm` packages locally, install the system `rpm` package first
6. To validate website deployment output locally, run `cd website && npm run build:static` and verify `website/out/`

## Branch Naming

- `feat/<description>` — New features
- `fix/<description>` — Bug fixes
- `docs/<description>` — Documentation changes
- `chore/<description>` — Maintenance, dependencies, CI

## Commit Messages

Follow [Conventional Commits](https://www.conventionalcommits.org/):

```
feat: add PostgreSQL connection support
fix: prevent SQL injection in query builder
docs: update roadmap with Phase 3 items
chore: upgrade electron to v30
```

## Pull Request Process

1. Create a feature branch from `main`
2. Make your changes with tests
3. Run `npm test`, `npm run test:e2e`, and `npm run lint` before opening a release-affecting PR
4. If website files changed, also run `cd website && npm run lint && npm run build:static`
5. Open a PR with a clear description of the change
6. Link related issues

## Code Style

- TypeScript strict mode
- Functional React components with hooks
- Named exports preferred
- ESLint + Prettier (run `npm run lint` to check)

## Security

- Never interpolate user input into SQL strings — always use parameterized queries
- Never store credentials in plaintext
- Report security vulnerabilities privately (do not open public issues)

## License

By contributing, you agree that your contributions will be licensed under the MIT License.
