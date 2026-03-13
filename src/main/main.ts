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

app.whenReady().then(async () => {
  await initStore();
  await initConnectionManager();

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
