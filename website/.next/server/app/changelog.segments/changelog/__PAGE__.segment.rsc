1:"$Sreact.fragment"
4:I[19400,["/_next/static/chunks/a0e533664789d2fa.js","/_next/static/chunks/6e12893231f07252.js"],"OutletBoundary"]
5:"$Sreact.suspense"
2:T2312,

All notable changes to this project will be documented in this file. See [standard-version](https://github.com/conventional-changelog/standard-version) for commit guidelines.

<h3 class="mt-6 mb-2 text-lg font-semibold text-gray-900 dark:text-gray-100">0.1.1-beta.0 (2026-03-13)</h3>

<h2 class="mt-10 mb-4 text-2xl font-bold text-gray-900 dark:text-gray-100 border-b border-gray-200 dark:border-gray-800 pb-2"><span class="font-mono text-blue-600 dark:text-blue-400">0.1.0</span><span class="ml-2 text-sm font-normal text-gray-500">2025-07-20</span></h2>

<h3 class="mt-6 mb-2 text-lg font-semibold text-gray-900 dark:text-gray-100">Added</h3>

<h4 class="mt-4 mb-1 text-base font-semibold text-gray-800 dark:text-gray-200">Phase 1: Foundation</h4>
<li class="ml-4 text-sm text-gray-600 dark:text-gray-400 list-disc">Electron + React desktop app shell with window management</li>
<li class="ml-4 text-sm text-gray-600 dark:text-gray-400 list-disc">Tab system for multiple simultaneous views</li>
<li class="ml-4 text-sm text-gray-600 dark:text-gray-400 list-disc">Dark / light theme with system preference detection</li>
<li class="ml-4 text-sm text-gray-600 dark:text-gray-400 list-disc">Application settings and preferences storage (electron-store)</li>
<li class="ml-4 text-sm text-gray-600 dark:text-gray-400 list-disc">Typed IPC channels for main ↔ renderer communication (49 channels)</li>
<li class="ml-4 text-sm text-gray-600 dark:text-gray-400 list-disc">ESLint, Prettier, Vitest tooling and TypeScript strict mode</li>
<li class="ml-4 text-sm text-gray-600 dark:text-gray-400 list-disc">Next.js marketing website with download page</li>

<h4 class="mt-4 mb-1 text-base font-semibold text-gray-800 dark:text-gray-200">Phase 2: Core Database Connectivity</h4>
<li class="ml-4 text-sm text-gray-600 dark:text-gray-400 list-disc">Connection manager UI — add, edit, delete, test connections</li>
<li class="ml-4 text-sm text-gray-600 dark:text-gray-400 list-disc">Secure credential storage using OS keychain (Electron safeStorage)</li>
<li class="ml-4 text-sm text-gray-600 dark:text-gray-400 list-disc">PostgreSQL driver with connection pooling</li>
<li class="ml-4 text-sm text-gray-600 dark:text-gray-400 list-disc">MySQL / MariaDB driver with connection pooling</li>
<li class="ml-4 text-sm text-gray-600 dark:text-gray-400 list-disc">SQLite driver for local file-based databases</li>
<li class="ml-4 text-sm text-gray-600 dark:text-gray-400 list-disc">Microsoft SQL Server driver with connection pooling</li>
<li class="ml-4 text-sm text-gray-600 dark:text-gray-400 list-disc">Connection timeout and pool size configuration</li>

<h4 class="mt-4 mb-1 text-base font-semibold text-gray-800 dark:text-gray-200">Phase 3: Database Browsing & Schema Viewer</h4>
<li class="ml-4 text-sm text-gray-600 dark:text-gray-400 list-disc">Database tree view sidebar — databases → schemas → tables → columns</li>
<li class="ml-4 text-sm text-gray-600 dark:text-gray-400 list-disc">Table structure viewer (columns, types, constraints, indexes)</li>
<li class="ml-4 text-sm text-gray-600 dark:text-gray-400 list-disc">Table data viewer with pagination</li>
<li class="ml-4 text-sm text-gray-600 dark:text-gray-400 list-disc">View, function, and stored procedure listing</li>
<li class="ml-4 text-sm text-gray-600 dark:text-gray-400 list-disc">Lazy-loading for large schemas</li>

<h4 class="mt-4 mb-1 text-base font-semibold text-gray-800 dark:text-gray-200">Phase 4: SQL Editor & Query Execution</h4>
<li class="ml-4 text-sm text-gray-600 dark:text-gray-400 list-disc">SQL editor with syntax highlighting (CodeMirror 6)</li>
<li class="ml-4 text-sm text-gray-600 dark:text-gray-400 list-disc">Query execution with result grid display</li>
<li class="ml-4 text-sm text-gray-600 dark:text-gray-400 list-disc">Multiple query tabs</li>
<li class="ml-4 text-sm text-gray-600 dark:text-gray-400 list-disc">Query history with recall</li>
<li class="ml-4 text-sm text-gray-600 dark:text-gray-400 list-disc">Autocomplete for table names, columns, and SQL keywords</li>
<li class="ml-4 text-sm text-gray-600 dark:text-gray-400 list-disc">EXPLAIN / ANALYZE query plans</li>
<li class="ml-4 text-sm text-gray-600 dark:text-gray-400 list-disc">Query result export (CSV, JSON, SQL INSERT)</li>

<h4 class="mt-4 mb-1 text-base font-semibold text-gray-800 dark:text-gray-200">Phase 5: CRUD Operations & Shortcuts</h4>
<li class="ml-4 text-sm text-gray-600 dark:text-gray-400 list-disc">Inline row editing in table data viewer</li>
<li class="ml-4 text-sm text-gray-600 dark:text-gray-400 list-disc">Add new row UI with field validation</li>
<li class="ml-4 text-sm text-gray-600 dark:text-gray-400 list-disc">Delete row(s) with confirmation dialog</li>
<li class="ml-4 text-sm text-gray-600 dark:text-gray-400 list-disc">Right-click context menus on tables, rows, and cells</li>
<li class="ml-4 text-sm text-gray-600 dark:text-gray-400 list-disc">Configurable keyboard shortcuts for common actions</li>
<li class="ml-4 text-sm text-gray-600 dark:text-gray-400 list-disc">Bulk operations (multi-select rows, bulk delete)</li>
<li class="ml-4 text-sm text-gray-600 dark:text-gray-400 list-disc">Copy cell / row / column values to clipboard</li>

<h4 class="mt-4 mb-1 text-base font-semibold text-gray-800 dark:text-gray-200">Phase 6: NoSQL Database Support</h4>
<li class="ml-4 text-sm text-gray-600 dark:text-gray-400 list-disc">MongoDB driver — connect, browse databases and collections</li>
<li class="ml-4 text-sm text-gray-600 dark:text-gray-400 list-disc">MongoDB document viewer and editor (JSON tree view)</li>
<li class="ml-4 text-sm text-gray-600 dark:text-gray-400 list-disc">MongoDB aggregation pipeline builder</li>
<li class="ml-4 text-sm text-gray-600 dark:text-gray-400 list-disc">Redis driver — connect, browse keys</li>
<li class="ml-4 text-sm text-gray-600 dark:text-gray-400 list-disc">Redis key browser with value viewer (string, hash, list, set, zset)</li>
<li class="ml-4 text-sm text-gray-600 dark:text-gray-400 list-disc">Redis CLI command passthrough</li>

<h4 class="mt-4 mb-1 text-base font-semibold text-gray-800 dark:text-gray-200">Phase 7: Advanced Features</h4>
<li class="ml-4 text-sm text-gray-600 dark:text-gray-400 list-disc">Data import wizard (CSV, JSON → table) with preview and column mapping</li>
<li class="ml-4 text-sm text-gray-600 dark:text-gray-400 list-disc">Schema diff and comparison between connections</li>
<li class="ml-4 text-sm text-gray-600 dark:text-gray-400 list-disc">ERD (Entity Relationship Diagram) generation with Mermaid</li>
<li class="ml-4 text-sm text-gray-600 dark:text-gray-400 list-disc">SSH tunnel support for remote database connections</li>
<li class="ml-4 text-sm text-gray-600 dark:text-gray-400 list-disc">Saved queries and query snippets management</li>
<li class="ml-4 text-sm text-gray-600 dark:text-gray-400 list-disc">Customizable keyboard shortcuts with settings UI</li>

<h3 class="mt-6 mb-2 text-lg font-semibold text-gray-900 dark:text-gray-100">Security</h3>
<li class="ml-4 text-sm text-gray-600 dark:text-gray-400 list-disc">All SQL queries use parameterized queries — no string interpolation</li>
<li class="ml-4 text-sm text-gray-600 dark:text-gray-400 list-disc">Identifier escaping via `escapeIdentifier()` in all drivers</li>
<li class="ml-4 text-sm text-gray-600 dark:text-gray-400 list-disc">Credentials encrypted at rest via OS keychain (never stored in plaintext)</li>
<li class="ml-4 text-sm text-gray-600 dark:text-gray-400 list-disc">Electron security hardening: contextIsolation, sandbox, CSP headers</li>
<li class="ml-4 text-sm text-gray-600 dark:text-gray-400 list-disc">Input validation on connection config (host, port, database name)</li>
<li class="ml-4 text-sm text-gray-600 dark:text-gray-400 list-disc">Path traversal prevention for SQLite file paths</li>
<li class="ml-4 text-sm text-gray-600 dark:text-gray-400 list-disc">Error message sanitization — no credentials or sensitive data in errors</li>
<li class="ml-4 text-sm text-gray-600 dark:text-gray-400 list-disc">XSS prevention — all user content escaped in UI output</li>
<li class="ml-4 text-sm text-gray-600 dark:text-gray-400 list-disc">Configurable TLS/SSL certificate validation (`sslRejectUnauthorized` toggle)</li>
<li class="ml-4 text-sm text-gray-600 dark:text-gray-400 list-disc">Dependabot configured for automated dependency updates</li>

<h3 class="mt-6 mb-2 text-lg font-semibold text-gray-900 dark:text-gray-100">Infrastructure</h3>
<li class="ml-4 text-sm text-gray-600 dark:text-gray-400 list-disc">156 unit tests across 7 test suites (all passing)</li>
<li class="ml-4 text-sm text-gray-600 dark:text-gray-400 list-disc">Vitest test runner with mock infrastructure</li>
<li class="ml-4 text-sm text-gray-600 dark:text-gray-400 list-disc">electron-builder configuration for Windows, Linux, and macOS builds</li>
0:{"buildId":"ziIV3sMLzI5U7nKQ4XnPX","rsc":["$","$1","c",{"children":[["$","section",null,{"className":"mx-auto max-w-3xl px-6 py-16","children":[["$","h1",null,{"className":"mb-2 text-4xl font-extrabold tracking-tight","children":"Changelog"}],["$","p",null,{"className":"mb-10 text-gray-500 dark:text-gray-400","children":"All notable changes to DB Assistant are documented here."}],["$","div",null,{"className":"prose dark:prose-invert max-w-none","dangerouslySetInnerHTML":{"__html":"$2"}}]]}],null,"$L3"]}],"loading":null,"isPartial":false}
3:["$","$L4",null,{"children":["$","$5",null,{"name":"Next.MetadataOutlet","children":"$@6"}]}]
6:null
