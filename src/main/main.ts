import { app, BrowserWindow, dialog, ipcMain, nativeTheme, session } from "electron";
import path from "path";
import os from "os";
import { finished } from "stream/promises";
import { AppSettings, DEFAULT_SETTINGS } from "../shared/ipc";
import type { ConnectionConfig, ImportPreviewRequest, ImportExecuteRequest, SchemaDiffRequest, KeyboardShortcut } from "../shared/types/database";
import { DEFAULT_SHORTCUTS } from "../shared/types/database";
import { sanitizeErrorMessage } from "../db/sanitize";
import type { ExportFormat } from "../shared/types/database";
import {
  initConnectionManager,
  listConnections,
  saveConnection,
  removeConnection,
  connectToDb,
  disconnectFromDb,
  testConnection,
  getConnectionStatuses,
  disconnectAll,
  getSchemas,
  getTables,
  getTableStructure,
  getRoutines,
  getTableData,
  initQueryHistory,
  executeQuery,
  explainQuery,
  getCompletionItems,
  getQueryHistory,
  clearQueryHistory,
  getPrimaryKeyColumns,
  insertRow,
  updateRow,
  deleteRows,
  mongoListDatabases,
  mongoListCollections,
  mongoFindDocuments,
  mongoInsertDocument,
  mongoUpdateDocument,
  mongoDeleteDocuments,
  mongoAggregate,
  redisScanKeys,
  redisGetKeyValue,
  redisSetKeyValue,
  redisDeleteKeys,
  redisExecuteCommand,
  getActiveDriver,
} from "../db/connection-manager";
import { previewImport, executeImport } from "../db/data-import";
import { computeSchemaDiff } from "../db/schema-diff";
import {
  initSavedQueries,
  listSavedQueries,
  saveSavedQuery,
  deleteSavedQuery,
} from "../db/saved-queries";
import { initAutoUpdater, checkForUpdates } from "./auto-updater";

type StoreType = { settings: AppSettings; shortcuts: KeyboardShortcut[] };

const isDevPerformanceLogging = !app.isPackaged && process.env.NODE_ENV === "development";

function logPerformance(message: string): void {
  if (isDevPerformanceLogging) {
    // Keep logs in main process only to avoid exposing internals to renderer.
    console.log(`[perf] ${message}`);
  }
}

function getPayloadBytes(value: unknown): number {
  try {
    return Buffer.byteLength(JSON.stringify(value), "utf-8");
  } catch {
    return -1;
  }
}

function resolvePathWithinHome(filePath: string): string {
  const resolved = path.resolve(filePath);
  const home = os.homedir();
  if (!resolved.startsWith(home + path.sep) && resolved !== home) {
    throw new Error("File path must be within the user home directory");
  }
  return resolved;
}

function escapeCsvField(value: unknown): string {
  if (value === null || value === undefined) return "";
  const str = typeof value === "object" ? JSON.stringify(value) : String(value);
  if (str.includes(",") || str.includes('"') || str.includes("\n")) {
    return `"${str.replace(/"/g, '""')}"`;
  }
  return str;
}

function toSqlLiteral(value: unknown): string {
  if (value === null || value === undefined) return "NULL";
  if (typeof value === "number" || typeof value === "bigint") return String(value);
  if (typeof value === "boolean") return value ? "TRUE" : "FALSE";
  if (typeof value === "object") {
    return `'${JSON.stringify(value).replace(/'/g, "''")}'`;
  }
  return `'${String(value).replace(/'/g, "''")}'`;
}

async function exportQueryToFile(payload: {
  connectionId: string;
  sql: string;
  format: ExportFormat;
  filePath: string;
  tableName?: string;
}): Promise<{ rowCount: number; truncated: boolean; filePath: string }> {
  const { createWriteStream } = await import("fs");
  const resolvedPath = resolvePathWithinHome(payload.filePath);
  const result = await executeQuery(payload.connectionId, payload.sql);

  if (result.isModification) {
    throw new Error("Export supports result-set queries only");
  }

  const stream = createWriteStream(resolvedPath, { encoding: "utf-8" });

  try {
    if (payload.format === "csv") {
      stream.write(`${result.columns.map(escapeCsvField).join(",")}\n`);
      for (const row of result.rows) {
        stream.write(
          `${result.columns.map((col) => escapeCsvField(row[col])).join(",")}\n`,
        );
      }
    }

    if (payload.format === "json") {
      stream.write("[\n");
      for (let i = 0; i < result.rows.length; i++) {
        const prefix = i === 0 ? "" : ",\n";
        stream.write(`${prefix}${JSON.stringify(result.rows[i])}`);
      }
      stream.write("\n]\n");
    }

    if (payload.format === "sql") {
      if (result.rows.length === 0) {
        stream.write(`-- No data to export from ${payload.tableName ?? "exported_table"}\n`);
      } else {
        const safeTable = (payload.tableName ?? "exported_table").replace(/[^a-zA-Z0-9_.]/g, "_");
        const cols = result.columns
          .map((col) => `"${col.replace(/"/g, '""')}"`)
          .join(", ");
        for (const row of result.rows) {
          const values = result.columns.map((col) => toSqlLiteral(row[col])).join(", ");
          stream.write(`INSERT INTO ${safeTable} (${cols}) VALUES (${values});\n`);
        }
      }
    }

    stream.end();
    await finished(stream);

    return {
      rowCount: result.rowCount,
      truncated: Boolean(result.truncated),
      filePath: resolvedPath,
    };
  } catch (error) {
    stream.destroy();
    throw error;
  }
}

let store: {
  get(key: "settings"): AppSettings;
  set(key: "settings", value: AppSettings): void;
  get(key: "shortcuts"): KeyboardShortcut[];
  set(key: "shortcuts", value: KeyboardShortcut[]): void;
};

async function initStore(): Promise<void> {
  // electron-store v10 is ESM-only, so dynamic import is needed in CommonJS
  const { default: Store } = await import("electron-store");
  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  const storeInstance: any = new Store<StoreType>({
    defaults: { settings: DEFAULT_SETTINGS, shortcuts: DEFAULT_SHORTCUTS },
  });
  store = {
    get: (key: string) => storeInstance.get(key),
    set: (key: string, value: unknown) => storeInstance.set(key, value),
  } as typeof store;
}

let mainWindow: BrowserWindow | null = null;

function createWindow(): void {
  // Apply Content Security Policy in production to block inline scripts and eval
  if (app.isPackaged) {
    session.defaultSession.webRequest.onHeadersReceived((details, callback) => {
      callback({
        responseHeaders: {
          ...details.responseHeaders,
          "Content-Security-Policy": [
            "default-src 'self'; script-src 'self'; style-src 'self' 'unsafe-inline'; img-src 'self' data:; font-src 'self';",
          ],
        },
      });
    });
  }

  mainWindow = new BrowserWindow({
    width: 1200,
    height: 800,
    minWidth: 800,
    minHeight: 600,
    title: "DB Assistant",
    webPreferences: {
      preload: path.join(__dirname, "preload.js"),
      contextIsolation: true,
      nodeIntegration: false,
      sandbox: true,
    },
  });

  if (process.env.NODE_ENV === "development" || !app.isPackaged) {
    mainWindow.loadURL("http://localhost:5173");
  } else {
    mainWindow.loadFile(path.join(__dirname, "../renderer/index.html"));
  }

  mainWindow.on("closed", () => {
    mainWindow = null;
  });
}

// IPC Handlers
ipcMain.handle("settings:get", (): AppSettings => {
  return store.get("settings");
});

ipcMain.handle(
  "settings:set",
  (_event, partial: Partial<AppSettings>): AppSettings => {
    const current = store.get("settings");
    const updated = { ...current, ...partial };
    store.set("settings", updated);

    if (partial.theme !== undefined && mainWindow) {
      nativeTheme.themeSource = updated.theme;
    }

    return updated;
  },
);

ipcMain.handle("app:get-version", (): string => {
  return app.getVersion();
});

ipcMain.handle("app:check-for-updates", async () => {
  await checkForUpdates();
});

ipcMain.handle("theme:get-system", (): "light" | "dark" => {
  return nativeTheme.shouldUseDarkColors ? "dark" : "light";
});

// Connection management IPC handlers
ipcMain.handle("conn:list", () => {
  return listConnections();
});

ipcMain.handle(
  "conn:save",
  (
    _event,
    payload: { config: ConnectionConfig; password?: string; sshPassword?: string },
  ) => {
    return saveConnection(payload.config, payload.password, payload.sshPassword);
  },
);

ipcMain.handle("conn:delete", async (_event, id: string) => {
  await removeConnection(id);
});

ipcMain.handle(
  "conn:test",
  async (
    _event,
    payload: { config: ConnectionConfig; password?: string; sshPassword?: string },
  ) => {
    const result = await testConnection(payload.config, payload.password, payload.sshPassword);
    if (!result.success) {
      result.message = sanitizeErrorMessage(result.message);
    }
    return result;
  },
);

ipcMain.handle("conn:connect", async (_event, id: string) => {
  return connectToDb(id);
});

ipcMain.handle("conn:disconnect", async (_event, id: string) => {
  return disconnectFromDb(id);
});

ipcMain.handle("conn:statuses", () => {
  return getConnectionStatuses();
});

ipcMain.handle(
  "dialog:open-file",
  async (
    _event,
    opts: { title?: string; filters?: { name: string; extensions: string[] }[] },
  ) => {
    if (!mainWindow) return null;
    const result = await dialog.showOpenDialog(mainWindow, {
      title: opts.title ?? "Select File",
      filters: opts.filters,
      properties: ["openFile"],
    });
    if (result.canceled || result.filePaths.length === 0) return null;
    return result.filePaths[0];
  },
);

// Schema browsing IPC handlers (Phase 3)
ipcMain.handle("db:schemas", async (_event, connectionId: string) => {
  return getSchemas(connectionId);
});

ipcMain.handle(
  "db:tables",
  async (_event, payload: { connectionId: string; schema: string }) => {
    return getTables(payload.connectionId, payload.schema);
  },
);

ipcMain.handle(
  "db:table-structure",
  async (
    _event,
    payload: { connectionId: string; schema: string; table: string },
  ) => {
    return getTableStructure(
      payload.connectionId,
      payload.schema,
      payload.table,
    );
  },
);

ipcMain.handle(
  "db:routines",
  async (_event, payload: { connectionId: string; schema: string }) => {
    return getRoutines(payload.connectionId, payload.schema);
  },
);

ipcMain.handle(
  "db:table-data",
  async (
    _event,
    payload: {
      connectionId: string;
      schema: string;
      table: string;
      page: number;
      pageSize: number;
    },
  ) => {
    const result = await getTableData(
      payload.connectionId,
      payload.schema,
      payload.table,
      payload.page,
      payload.pageSize,
    );
    const bytes = getPayloadBytes(result);
    if (bytes >= 0) {
      logPerformance(
        `ipc db:table-data payload=${bytes}B connection=${payload.connectionId} table=${payload.schema}.${payload.table} page=${payload.page}`,
      );
    }
    return result;
  },
);

// Query execution IPC handlers (Phase 4)
ipcMain.handle(
  "query:execute",
  async (
    _event,
    payload: { connectionId: string; sql: string },
  ) => {
    const result = await executeQuery(payload.connectionId, payload.sql);
    const bytes = getPayloadBytes(result);
    if (bytes >= 0) {
      logPerformance(
        `ipc query:execute payload=${bytes}B connection=${payload.connectionId} rows=${result.rowCount} truncated=${result.truncated ? "yes" : "no"}`,
      );
    }
    return result;
  },
);

ipcMain.handle(
  "query:export",
  async (
    _event,
    payload: {
      connectionId: string;
      sql: string;
      format: ExportFormat;
      filePath: string;
      tableName?: string;
    },
  ) => {
    return exportQueryToFile(payload);
  },
);

ipcMain.handle(
  "query:explain",
  async (
    _event,
    payload: { connectionId: string; sql: string },
  ) => {
    return explainQuery(payload.connectionId, payload.sql);
  },
);

ipcMain.handle("query:history", () => {
  return getQueryHistory();
});

ipcMain.handle("query:history:clear", () => {
  clearQueryHistory();
});

ipcMain.handle("query:completions", async (_event, connectionId: string) => {
  return getCompletionItems(connectionId);
});

// CRUD operations IPC handlers (Phase 5)
ipcMain.handle(
  "crud:insert-row",
  async (
    _event,
    payload: {
      connectionId: string;
      schema: string;
      table: string;
      row: Record<string, unknown>;
    },
  ) => {
    return insertRow(
      payload.connectionId,
      payload.schema,
      payload.table,
      payload.row,
    );
  },
);

ipcMain.handle(
  "crud:update-row",
  async (
    _event,
    payload: {
      connectionId: string;
      schema: string;
      table: string;
      primaryKey: Record<string, unknown>;
      changes: Record<string, unknown>;
    },
  ) => {
    return updateRow(
      payload.connectionId,
      payload.schema,
      payload.table,
      payload.primaryKey,
      payload.changes,
    );
  },
);

ipcMain.handle(
  "crud:delete-rows",
  async (
    _event,
    payload: {
      connectionId: string;
      schema: string;
      table: string;
      primaryKeys: Record<string, unknown>[];
    },
  ) => {
    return deleteRows(
      payload.connectionId,
      payload.schema,
      payload.table,
      payload.primaryKeys,
    );
  },
);

ipcMain.handle(
  "crud:get-primary-keys",
  async (
    _event,
    payload: { connectionId: string; schema: string; table: string },
  ) => {
    return getPrimaryKeyColumns(
      payload.connectionId,
      payload.schema,
      payload.table,
    );
  },
);

ipcMain.handle(
  "dialog:save-file",
  async (
    _event,
    opts: { title?: string; defaultPath?: string; filters?: { name: string; extensions: string[] }[] },
  ) => {
    if (!mainWindow) return null;
    const result = await dialog.showSaveDialog(mainWindow, {
      title: opts.title ?? "Save File",
      defaultPath: opts.defaultPath,
      filters: opts.filters,
    });
    if (result.canceled || !result.filePath) return null;
    return result.filePath;
  },
);

ipcMain.handle(
  "file:write",
  async (
    _event,
    payload: { filePath: string; content: string },
  ) => {
    const fs = await import("fs/promises");
    const resolved = resolvePathWithinHome(payload.filePath);
    await fs.writeFile(resolved, payload.content, "utf-8");
  },
);

// MongoDB IPC handlers (Phase 6)
ipcMain.handle("mongo:databases", async (_event, connectionId: string) => {
  return mongoListDatabases(connectionId);
});

ipcMain.handle(
  "mongo:collections",
  async (_event, payload: { connectionId: string; database: string }) => {
    return mongoListCollections(payload.connectionId, payload.database);
  },
);

ipcMain.handle(
  "mongo:find",
  async (
    _event,
    payload: {
      connectionId: string;
      database: string;
      collection: string;
      filter: string;
      page: number;
      pageSize: number;
      sort?: string;
    },
  ) => {
    const filter = payload.filter ? JSON.parse(payload.filter) : {};
    const sort = payload.sort ? JSON.parse(payload.sort) : undefined;
    return mongoFindDocuments(
      payload.connectionId,
      payload.database,
      payload.collection,
      filter,
      payload.page,
      payload.pageSize,
      sort,
    );
  },
);

ipcMain.handle(
  "mongo:insert",
  async (
    _event,
    payload: {
      connectionId: string;
      database: string;
      collection: string;
      document: string;
    },
  ) => {
    const document = JSON.parse(payload.document);
    return mongoInsertDocument(
      payload.connectionId,
      payload.database,
      payload.collection,
      document,
    );
  },
);

ipcMain.handle(
  "mongo:update",
  async (
    _event,
    payload: {
      connectionId: string;
      database: string;
      collection: string;
      documentId: string;
      update: string;
    },
  ) => {
    const update = JSON.parse(payload.update);
    return mongoUpdateDocument(
      payload.connectionId,
      payload.database,
      payload.collection,
      payload.documentId,
      update,
    );
  },
);

ipcMain.handle(
  "mongo:delete",
  async (
    _event,
    payload: {
      connectionId: string;
      database: string;
      collection: string;
      documentIds: string[];
    },
  ) => {
    return mongoDeleteDocuments(
      payload.connectionId,
      payload.database,
      payload.collection,
      payload.documentIds,
    );
  },
);

ipcMain.handle(
  "mongo:aggregate",
  async (
    _event,
    payload: {
      connectionId: string;
      database: string;
      collection: string;
      pipeline: string;
    },
  ) => {
    const pipeline = JSON.parse(payload.pipeline);
    return mongoAggregate(
      payload.connectionId,
      payload.database,
      payload.collection,
      pipeline,
    );
  },
);

// Redis IPC handlers (Phase 6)
ipcMain.handle(
  "redis:scan",
  async (
    _event,
    payload: {
      connectionId: string;
      pattern: string;
      cursor: string;
      count: number;
    },
  ) => {
    return redisScanKeys(
      payload.connectionId,
      payload.pattern,
      payload.cursor,
      payload.count,
    );
  },
);

ipcMain.handle(
  "redis:get",
  async (_event, payload: { connectionId: string; key: string }) => {
    return redisGetKeyValue(payload.connectionId, payload.key);
  },
);

ipcMain.handle(
  "redis:set",
  async (
    _event,
    payload: { connectionId: string; key: string; value: string; ttl?: number },
  ) => {
    return redisSetKeyValue(
      payload.connectionId,
      payload.key,
      payload.value,
      payload.ttl,
    );
  },
);

ipcMain.handle(
  "redis:delete",
  async (_event, payload: { connectionId: string; keys: string[] }) => {
    return redisDeleteKeys(payload.connectionId, payload.keys);
  },
);

ipcMain.handle(
  "redis:command",
  async (_event, payload: { connectionId: string; command: string }) => {
    return redisExecuteCommand(payload.connectionId, payload.command);
  },
);

// Data import IPC handlers (Phase 7)
ipcMain.handle(
  "import:preview",
  async (_event, payload: ImportPreviewRequest) => {
    return previewImport(payload.filePath, payload.format, payload.maxRows);
  },
);

ipcMain.handle(
  "import:execute",
  async (_event, payload: ImportExecuteRequest) => {
    const driver = getActiveDriver(payload.connectionId);
    return executeImport(
      driver,
      payload.schema,
      payload.table,
      payload.filePath,
      payload.format,
      payload.columnMapping,
      payload.createTable,
      payload.truncateFirst,
    );
  },
);

// Schema diff IPC handler (Phase 7)
ipcMain.handle(
  "schema:diff",
  async (_event, payload: SchemaDiffRequest) => {
    const sourceDriver = getActiveDriver(payload.sourceConnectionId);
    const targetDriver = getActiveDriver(payload.targetConnectionId);
    return computeSchemaDiff(
      sourceDriver,
      payload.sourceSchema,
      targetDriver,
      payload.targetSchema,
    );
  },
);

// Saved queries IPC handlers (Phase 7)
ipcMain.handle("queries:list", () => {
  return listSavedQueries();
});

ipcMain.handle(
  "queries:save",
  (_event, payload: { name: string; sql: string; connectionId?: string; folder?: string }) => {
    return saveSavedQuery(payload);
  },
);

ipcMain.handle("queries:delete", (_event, id: string) => {
  deleteSavedQuery(id);
});

// Keyboard shortcuts IPC handlers (Phase 7)
ipcMain.handle("shortcuts:get", (): KeyboardShortcut[] => {
  return store.get("shortcuts");
});

ipcMain.handle(
  "shortcuts:set",
  (_event, shortcuts: KeyboardShortcut[]): KeyboardShortcut[] => {
    store.set("shortcuts", shortcuts);
    return shortcuts;
  },
);

ipcMain.handle("shortcuts:reset", (): KeyboardShortcut[] => {
  store.set("shortcuts", DEFAULT_SHORTCUTS);
  return DEFAULT_SHORTCUTS;
});

app.whenReady().then(async () => {
  const appReadyStart = performance.now();

  const runStartupStep = async (name: string, step: () => Promise<void>) => {
    const stepStart = performance.now();
    await step();
    const duration = Math.round(performance.now() - stepStart);
    logPerformance(`startup ${name}=${duration}ms`);
  };

  await runStartupStep("initStore", initStore);

  const parallelStart = performance.now();
  await Promise.all([
    runStartupStep("initConnectionManager", initConnectionManager),
    runStartupStep("initQueryHistory", initQueryHistory),
    runStartupStep("initSavedQueries", initSavedQueries),
  ]);
  logPerformance(`startup parallelInitTotal=${Math.round(performance.now() - parallelStart)}ms`);

  // Apply saved theme on startup
  const settings = store.get("settings");
  nativeTheme.themeSource = settings.theme;

  const windowStart = performance.now();
  createWindow();
  logPerformance(`startup createWindow=${Math.round(performance.now() - windowStart)}ms`);

  if (mainWindow) {
    mainWindow.webContents.once("did-finish-load", () => {
      logPerformance(`startup did-finish-load=${Math.round(performance.now() - appReadyStart)}ms since app.whenReady`);
    });
  }

  // Initialize auto-updater in packaged builds
  if (app.isPackaged && mainWindow) {
    initAutoUpdater(mainWindow).catch(() => {
      // Ignore auto-updater init errors
    });
  }

  app.on("activate", () => {
    if (BrowserWindow.getAllWindows().length === 0) {
      createWindow();
    }
  });
});

app.on("window-all-closed", () => {
  if (process.platform !== "darwin") {
    app.quit();
  }
});

app.on("before-quit", async () => {
  await disconnectAll();
});
