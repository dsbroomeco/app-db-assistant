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
  CrudResult,
  MongoCollectionInfo,
  MongoDocument,
  MongoFindResult,
  RedisScanResult,
  RedisGetResult,
  RedisCommandResult,
} from "../shared/types/database";
import { isSqlType } from "../shared/types/database";
import {
  initCredentialStore,
  savePassword,
  getPassword,
  deletePassword,
  hasPassword,
} from "./credential-store";
import { createDriver, createMongoDriver, createRedisDriver, createAnyDriver } from "./drivers";
import { createTunnel, closeTunnel, closeAllTunnels } from "./ssh-tunnel";
import type { DatabaseDriver, MongoDBDriver, RedisDriver, BaseDriver } from "./types";

type StoreType = { connections: Record<string, ConnectionConfig> };

let configStore: {
  get(key: "connections"): Record<string, ConnectionConfig>;
  set(key: "connections", value: Record<string, ConnectionConfig>): void;
};

/** Map of connection ID → active driver instance. */
const activeConnections = new Map<string, BaseDriver>();

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
  sshPassword?: string,
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

  if (sshPassword !== undefined && sshPassword !== "") {
    savePassword(`ssh:${config.id}`, sshPassword);
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
  deletePassword(`ssh:${id}`);
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

  let effectiveConfig = config;

  // Set up SSH tunnel if enabled
  if (config.sshEnabled) {
    const sshPassword = getPassword(`ssh:${id}`);
    const { tunnelConfig } = await createTunnel(config, sshPassword);
    effectiveConfig = tunnelConfig;
  }

  const driver = createAnyDriver(effectiveConfig.type);
  const password = getPassword(id);
  await driver.connect(effectiveConfig, password);
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
  await closeTunnel(id);
  return { id, connected: false };
}

/** Test a connection without saving it. */
export async function testConnection(
  config: ConnectionConfig,
  password?: string,
  sshPassword?: string,
): Promise<TestConnectionResult> {
  let effectiveConfig = config;
  const tunnelId = `test-${Date.now()}`;
  try {
    if (config.sshEnabled) {
      effectiveConfig = await createTunnel({ ...config, id: tunnelId }, sshPassword);
    }
    const driver = createAnyDriver(config.type);
    try {
      await driver.connect(effectiveConfig, password);
      await driver.ping();
      await driver.disconnect();
      return { success: true, message: "Connection successful" };
    } catch (err) {
      try { await driver.disconnect(); } catch { /* ignore */ }
      const message = err instanceof Error ? err.message : String(err);
      return { success: false, message };
    }
  } catch (err) {
    const message = err instanceof Error ? err.message : String(err);
    return { success: false, message: `SSH tunnel failed: ${message}` };
  } finally {
    if (config.sshEnabled) {
      await closeTunnel(tunnelId);
    }
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
  await closeAllTunnels();
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
    sshEnabled: config.sshEnabled,
    sshHost: config.sshHost,
    sshPort: config.sshPort,
    sshUsername: config.sshUsername,
    sshAuthMethod: config.sshAuthMethod,
    sshPrivateKeyPath: config.sshPrivateKeyPath,
    hasSshPassword: hasPassword(`ssh:${config.id}`),
  };
}

// ─── Schema introspection (Phase 3) ─────────────────────────────

function getDriver(connectionId: string): DatabaseDriver {
  const driver = activeConnections.get(connectionId);
  if (!driver) {
    throw new Error(`Connection "${connectionId}" is not active`);
  }
  // Verify it's a SQL driver
  if (!("getSchemas" in driver)) {
    throw new Error(`Connection "${connectionId}" is not a SQL connection`);
  }
  return driver as DatabaseDriver;
}

function getMongoDriver(connectionId: string): MongoDBDriver {
  const driver = activeConnections.get(connectionId);
  if (!driver) {
    throw new Error(`Connection "${connectionId}" is not active`);
  }
  if (!("listDatabases" in driver)) {
    throw new Error(`Connection "${connectionId}" is not a MongoDB connection`);
  }
  return driver as MongoDBDriver;
}

function getRedisDriver(connectionId: string): RedisDriver {
  const driver = activeConnections.get(connectionId);
  if (!driver) {
    throw new Error(`Connection "${connectionId}" is not active`);
  }
  if (!("scanKeys" in driver)) {
    throw new Error(`Connection "${connectionId}" is not a Redis connection`);
  }
  return driver as RedisDriver;
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

// ─── CRUD operations (Phase 5) ──────────────────────────────────

export async function getPrimaryKeyColumns(
  connectionId: string,
  schema: string,
  table: string,
): Promise<string[]> {
  return getDriver(connectionId).getPrimaryKeyColumns(schema, table);
}

export async function insertRow(
  connectionId: string,
  schema: string,
  table: string,
  row: Record<string, unknown>,
): Promise<CrudResult> {
  return getDriver(connectionId).insertRow(schema, table, row);
}

export async function updateRow(
  connectionId: string,
  schema: string,
  table: string,
  primaryKey: Record<string, unknown>,
  changes: Record<string, unknown>,
): Promise<CrudResult> {
  return getDriver(connectionId).updateRow(schema, table, primaryKey, changes);
}

export async function deleteRows(
  connectionId: string,
  schema: string,
  table: string,
  primaryKeys: Record<string, unknown>[],
): Promise<CrudResult> {
  return getDriver(connectionId).deleteRows(schema, table, primaryKeys);
}

// ─── MongoDB operations (Phase 6) ───────────────────────────────

export async function mongoListDatabases(
  connectionId: string,
): Promise<string[]> {
  return getMongoDriver(connectionId).listDatabases();
}

export async function mongoListCollections(
  connectionId: string,
  database: string,
): Promise<MongoCollectionInfo[]> {
  return getMongoDriver(connectionId).listCollections(database);
}

export async function mongoFindDocuments(
  connectionId: string,
  database: string,
  collection: string,
  filter: Record<string, unknown>,
  page: number,
  pageSize: number,
  sort?: Record<string, 1 | -1>,
): Promise<MongoFindResult> {
  return getMongoDriver(connectionId).findDocuments(
    database,
    collection,
    filter,
    page,
    pageSize,
    sort,
  );
}

export async function mongoInsertDocument(
  connectionId: string,
  database: string,
  collection: string,
  document: Record<string, unknown>,
): Promise<CrudResult> {
  return getMongoDriver(connectionId).insertDocument(database, collection, document);
}

export async function mongoUpdateDocument(
  connectionId: string,
  database: string,
  collection: string,
  documentId: string,
  update: Record<string, unknown>,
): Promise<CrudResult> {
  return getMongoDriver(connectionId).updateDocument(
    database,
    collection,
    documentId,
    update,
  );
}

export async function mongoDeleteDocuments(
  connectionId: string,
  database: string,
  collection: string,
  documentIds: string[],
): Promise<CrudResult> {
  return getMongoDriver(connectionId).deleteDocuments(database, collection, documentIds);
}

export async function mongoAggregate(
  connectionId: string,
  database: string,
  collection: string,
  pipeline: Record<string, unknown>[],
): Promise<MongoDocument[]> {
  return getMongoDriver(connectionId).aggregate(database, collection, pipeline);
}

// ─── Redis operations (Phase 6) ─────────────────────────────────

export async function redisScanKeys(
  connectionId: string,
  pattern: string,
  cursor: string,
  count: number,
): Promise<RedisScanResult> {
  return getRedisDriver(connectionId).scanKeys(pattern, cursor, count);
}

export async function redisGetKeyValue(
  connectionId: string,
  key: string,
): Promise<RedisGetResult> {
  return getRedisDriver(connectionId).getKeyValue(key);
}

export async function redisSetKeyValue(
  connectionId: string,
  key: string,
  value: string,
  ttl?: number,
): Promise<CrudResult> {
  return getRedisDriver(connectionId).setKeyValue(key, value, ttl);
}

export async function redisDeleteKeys(
  connectionId: string,
  keys: string[],
): Promise<CrudResult> {
  return getRedisDriver(connectionId).deleteKeys(keys);
}

export async function redisExecuteCommand(
  connectionId: string,
  command: string,
): Promise<RedisCommandResult> {
  return getRedisDriver(connectionId).executeCommand(command);
}

/** Expose the SQL driver for a connection (for Phase 7 features). */
export function getActiveDriver(connectionId: string): DatabaseDriver {
  return getDriver(connectionId);
}
