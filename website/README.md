# DB Assistant Website

Marketing website for DB Assistant, built with Next.js App Router.

## Development

```bash
npm install
npm run dev
```

Local dev server: http://localhost:3000

## Static Build

The site is configured for static export.

```bash
npm run build:static
```

Output is generated in `website/out/`.

## Deployment

The workflow currently runs in build-only mode and uploads `website/out` as an artifact (`website-static`).

GitHub Pages deployment is temporarily disabled because the repository plan does not currently support Pages for this repo.

## Version Sync

The download page version constant is synced from the root package version using:

```bash
node ../scripts/sync-website-version.js
```
