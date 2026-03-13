/**
 * Connection manager — manages saved connection configs and active connections.
 * Runs in the main process only.
 */

import type {
  ConnectionConfig,
  SavedConnection,
  ConnectionStatus,
  TestConnectionResult,
  SchemaInfo,
  TableInfo,
  TableStructure,
  RoutineInfo,
  QueryResult,
  ExecuteQueryResult,
  QueryHistoryEntry,
} from "../shared/types/database";
import {
  initCredentialStore,
  savePassword,
  getPassword,
  deletePassword,
  hasPassword,
} from "./credential-store";
import { createDriver } from "./drivers";
import type { DatabaseDriver } from "./types";

type StoreType = { connections: Record<string, ConnectionConfig> };

let configStore: {
  get(key: "connections"): Record<string, ConnectionConfig>;
  set(key: "connections", value: Record<string, ConnectionConfig>): void;
};

/** Map of connection ID → active driver instance. */
const activeConnections = new Map<string, DatabaseDriver>();

export async function initConnectionManager(): Promise<void> {
  await initCredentialStore();

  const { default: Store } = await import("electron-store");
  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  const instance: any = new Store<StoreType>({
    name: "connections",
    defaults: { connections: {} },
  });
  configStore = {
    get: (key: "connections") =>
      instance.get(key) as Record<string, ConnectionConfig>,
    set: (key: "connections", value: Record<string, ConnectionConfig>) =>
      instance.set(key, value),
  };
}

/** List all saved connections (without passwords). */
export function listConnections(): SavedConnection[] {
  const configs = configStore.get("connections");
  return Object.values(configs).map(toSavedConnection);
}

/** Save (create or update) a connection config and optionally its password. */
export function saveConnection(
  config: ConnectionConfig,
  password?: string,
): SavedConnection {
  // Generate ID if new
  if (!config.id) {
    config.id = crypto.randomUUID();
  }

  const all = configStore.get("connections");
  all[config.id] = config;
  configStore.set("connections", all);

  if (password !== undefined && password !== "") {
    savePassword(config.id, password);
  }

  return toSavedConnection(config);
}

/** Delete a saved connection and its credentials. */
export async function removeConnection(id: string): Promise<void> {
  // Disconnect first if active
  if (activeConnections.has(id)) {
    await disconnectFromDb(id);
  }

  const all = configStore.get("connections");
  delete all[id];
  configStore.set("connections", all);
  deletePassword(id);
}

/** Connect to a saved database. */
export async function connectToDb(id: string): Promise<ConnectionStatus> {
  const all = configStore.get("connections");
  const config = all[id];
  if (!config) {
    throw new Error(`Connection "${id}" not found`);
  }

  // Disconnect existing if already connected
  if (activeConnections.has(id)) {
    await disconnectFromDb(id);
  }

  const driver = createDriver(config.type);
  const password = getPassword(id);
  await driver.connect(config, password);
  activeConnections.set(id, driver);

  return { id, connected: true };
}

/** Disconnect from a database. */
export async function disconnectFromDb(id: string): Promise<ConnectionStatus> {
  const driver = activeConnections.get(id);
  if (driver) {
    await driver.disconnect();
    activeConnections.delete(id);
  }
  return { id, connected: false };
}

/** Test a connection without saving it. */
export async function testConnection(
  config: ConnectionConfig,
  password?: string,
): Promise<TestConnectionResult> {
  const driver = createDriver(config.type);
  try {
    await driver.connect(config, password);
    await driver.ping();
    await driver.disconnect();
    return { success: true, message: "Connection successful" };
  } catch (err) {
    // Ensure cleanup
    try {
      await driver.disconnect();
    } catch {
      // ignore cleanup errors
    }
    const message = err instanceof Error ? err.message : String(err);
    return { success: false, message };
  }
}

/** Get connection statuses for all saved connections. */
export function getConnectionStatuses(): ConnectionStatus[] {
  const configs = configStore.get("connections");
  return Object.keys(configs).map((id) => ({
    id,
    connected: activeConnections.has(id),
  }));
}

/** Disconnect all active connections (call on app quit). */
export async function disconnectAll(): Promise<void> {
  const promises = Array.from(activeConnections.keys()).map((id) =>
    disconnectFromDb(id),
  );
  await Promise.allSettled(promises);
}

function toSavedConnection(config: ConnectionConfig): SavedConnection {
  return {
    id: config.id,
    name: config.name,
    type: config.type,
    host: config.host,
    port: config.port,
    database: config.database,
    username: config.username,
    ssl: config.ssl,
    filepath: config.filepath,
    connectionTimeout: config.connectionTimeout,
    poolSize: config.poolSize,
    hasPassword: hasPassword(config.id),
  };
}

// ─── Schema introspection (Phase 3) ─────────────────────────────

function getDriver(connectionId: string): DatabaseDriver {
  const driver = activeConnections.get(connectionId);
  if (!driver) {
    throw new Error(`Connection "${connectionId}" is not active`);
  }
  return driver;
}

export async function getSchemas(connectionId: string): Promise<SchemaInfo[]> {
  return getDriver(connectionId).getSchemas();
}

export async function getTables(
  connectionId: string,
  schema: string,
): Promise<TableInfo[]> {
  return getDriver(connectionId).getTables(schema);
}

export async function getTableStructure(
  connectionId: string,
  schema: string,
  table: string,
): Promise<TableStructure> {
  return getDriver(connectionId).getTableStructure(schema, table);
}

export async function getRoutines(
  connectionId: string,
  schema: string,
): Promise<RoutineInfo[]> {
  return getDriver(connectionId).getRoutines(schema);
}

export async function getTableData(
  connectionId: string,
  schema: string,
  table: string,
  page: number,
  pageSize: number,
): Promise<QueryResult> {
  return getDriver(connectionId).getTableData(schema, table, page, pageSize);
}

// ─── Query execution (Phase 4) ─────────────────────────────────

/** In-memory query history, persisted to store on each mutation. */
let queryHistory: QueryHistoryEntry[] = [];
const MAX_HISTORY = 200;

let historyStore: {
  get(key: "history"): QueryHistoryEntry[];
  set(key: "history", value: QueryHistoryEntry[]): void;
};

export async function initQueryHistory(): Promise<void> {
  const { default: Store } = await import("electron-store");
  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  const instance: any = new Store<{ history: QueryHistoryEntry[] }>({
    name: "query-history",
    defaults: { history: [] },
  });
  historyStore = {
    get: (key: "history") => instance.get(key) as QueryHistoryEntry[],
    set: (key: "history", value: QueryHistoryEntry[]) =>
      instance.set(key, value),
  };
  queryHistory = historyStore.get("history");
}

function addHistoryEntry(entry: QueryHistoryEntry): void {
  queryHistory.unshift(entry);
  if (queryHistory.length > MAX_HISTORY) {
    queryHistory = queryHistory.slice(0, MAX_HISTORY);
  }
  historyStore?.set("history", queryHistory);
}

export function getQueryHistory(): QueryHistoryEntry[] {
  return queryHistory;
}

export function clearQueryHistory(): void {
  queryHistory = [];
  historyStore?.set("history", []);
}

export async function executeQuery(
  connectionId: string,
  sql: string,
): Promise<ExecuteQueryResult> {
  const driver = getDriver(connectionId);
  const connName = getConnectionName(connectionId);
  const startTime = new Date().toISOString();

  try {
    const result = await driver.executeQuery(sql);
    addHistoryEntry({
      id: crypto.randomUUID(),
      connectionId,
      connectionName: connName,
      sql,
      executedAt: startTime,
      executionTime: result.executionTime,
      rowCount: result.rowCount,
    });
    return result;
  } catch (err) {
    const message = err instanceof Error ? err.message : String(err);
    addHistoryEntry({
      id: crypto.randomUUID(),
      connectionId,
      connectionName: connName,
      sql,
      executedAt: startTime,
      executionTime: 0,
      rowCount: 0,
      error: message,
    });
    throw err;
  }
}

export async function explainQuery(
  connectionId: string,
  sql: string,
): Promise<{ plan: string; executionTime: number }> {
  const driver = getDriver(connectionId);
  const start = performance.now();
  const plan = await driver.explainQuery(sql);
  const executionTime = Math.round(performance.now() - start);
  return { plan, executionTime };
}

export async function getCompletionItems(
  connectionId: string,
): Promise<{ tables: string[]; columns: string[] }> {
  return getDriver(connectionId).getCompletionItems();
}

function getConnectionName(connectionId: string): string {
  const all = configStore.get("connections");
  return all[connectionId]?.name ?? connectionId;
}
