import { app, BrowserWindow, dialog, ipcMain, nativeTheme } from "electron";
import path from "path";
import { AppSettings, DEFAULT_SETTINGS } from "../shared/ipc";
import type { ConnectionConfig } from "../shared/types/database";
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
} from "../db/connection-manager";

type StoreType = { settings: AppSettings };

let store: {
  get(key: "settings"): AppSettings;
  set(key: "settings", value: AppSettings): void;
};

async function initStore(): Promise<void> {
  // electron-store v10 is ESM-only, so dynamic import is needed in CommonJS
  const { default: Store } = await import("electron-store");
  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  const storeInstance: any = new Store<StoreType>({
    defaults: { settings: DEFAULT_SETTINGS },
  });
  store = {
    get: (key: "settings") => storeInstance.get(key) as AppSettings,
    set: (key: "settings", value: AppSettings) => storeInstance.set(key, value),
  };
}

let mainWindow: BrowserWindow | null = null;

function createWindow(): void {
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
    payload: { config: ConnectionConfig; password?: string },
  ) => {
    return saveConnection(payload.config, payload.password);
  },
);

ipcMain.handle("conn:delete", async (_event, id: string) => {
  await removeConnection(id);
});

ipcMain.handle(
  "conn:test",
  async (
    _event,
    payload: { config: ConnectionConfig; password?: string },
  ) => {
    return testConnection(payload.config, payload.password);
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
    return getTableData(
      payload.connectionId,
      payload.schema,
      payload.table,
      payload.page,
      payload.pageSize,
    );
  },
);

// Query execution IPC handlers (Phase 4)
ipcMain.handle(
  "query:execute",
  async (
    _event,
    payload: { connectionId: string; sql: string },
  ) => {
    return executeQuery(payload.connectionId, payload.sql);
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
    await fs.writeFile(payload.filePath, payload.content, "utf-8");
  },
);

app.whenReady().then(async () => {
  await initStore();
  await initConnectionManager();
  await initQueryHistory();

  // Apply saved theme on startup
  const settings = store.get("settings");
  nativeTheme.themeSource = settings.theme;

  createWindow();

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
