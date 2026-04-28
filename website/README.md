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

GitHub Pages deployment is automated by `.github/workflows/website.yml`.

Deployment is gated by repository variable `ENABLE_GITHUB_PAGES=true`.
If the repository plan does not support Pages, the workflow will still build static output but skip deployment.

## Version Sync

The download page version constant is synced from the root package version using:

```bash
node ../scripts/sync-website-version.js
```
