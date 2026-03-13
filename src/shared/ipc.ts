/** Typed IPC channel definitions for main ↔ renderer communication. */

export type Theme = "light" | "dark" | "system";

export interface AppSettings {
  theme: Theme;
  fontSize: number;
  showWelcome: boolean;
}

export const DEFAULT_SETTINGS: AppSettings = {
  theme: "system",
  fontSize: 14,
  showWelcome: true,
};

export type {
  ConnectionConfig,
  SavedConnection,
  ConnectionStatus,
  TestConnectionResult,
  DatabaseType,
  SchemaInfo,
  TableInfo,
  TableStructure,
  RoutineInfo,
  QueryResult,
  ExecuteQueryRequest,
  ExecuteQueryResult,
  ExplainQueryRequest,
  ExplainQueryResult,
  QueryHistoryEntry,
  ExportFormat,
  InsertRowRequest,
  UpdateRowRequest,
  DeleteRowsRequest,
  CrudResult,
  MongoCollectionInfo,
  MongoDocument,
  MongoFindRequest,
  MongoFindResult,
  MongoInsertRequest,
  MongoUpdateRequest,
  MongoDeleteRequest,
  MongoAggregateRequest,
  RedisKeyInfo,
  RedisScanRequest,
  RedisScanResult,
  RedisGetRequest,
  RedisGetResult,
  RedisSetRequest,
  RedisDeleteRequest,
  RedisCommandRequest,
  RedisCommandResult,
  ImportPreviewRequest,
  ImportPreviewResult,
  ImportExecuteRequest,
  ImportResult,
  SchemaDiffRequest,
  SchemaDiffResult,
  SavedQuery,
  KeyboardShortcut,
} from "./types/database";

export { DEFAULT_SHORTCUTS } from "./types/database";

export interface IpcChannels {
  "settings:get": { request: void; response: AppSettings };
  "settings:set": { request: Partial<AppSettings>; response: AppSettings };
  "app:get-version": { request: void; response: string };
  "app:check-for-updates": { request: void; response: void };
  "theme:get-system": { request: void; response: "light" | "dark" };

  // Connection management
  "conn:list": {
    request: void;
    response: import("./types/database").SavedConnection[];
  };
  "conn:save": {
    request: {
      config: import("./types/database").ConnectionConfig;
      password?: string;
      sshPassword?: string;
    };
    response: import("./types/database").SavedConnection;
  };
  "conn:delete": { request: string; response: void };
  "conn:test": {
    request: {
      config: import("./types/database").ConnectionConfig;
      password?: string;
      sshPassword?: string;
    };
    response: import("./types/database").TestConnectionResult;
  };
  "conn:connect": {
    request: string;
    response: import("./types/database").ConnectionStatus;
  };
  "conn:disconnect": {
    request: string;
    response: import("./types/database").ConnectionStatus;
  };
  "conn:statuses": {
    request: void;
    response: import("./types/database").ConnectionStatus[];
  };

  // Schema browsing (Phase 3)
  "db:schemas": {
    request: string; // connectionId
    response: import("./types/database").SchemaInfo[];
  };
  "db:tables": {
    request: { connectionId: string; schema: string };
    response: import("./types/database").TableInfo[];
  };
  "db:table-structure": {
    request: { connectionId: string; schema: string; table: string };
    response: import("./types/database").TableStructure;
  };
  "db:routines": {
    request: { connectionId: string; schema: string };
    response: import("./types/database").RoutineInfo[];
  };
  "db:table-data": {
    request: {
      connectionId: string;
      schema: string;
      table: string;
      page: number;
      pageSize: number;
    };
    response: import("./types/database").QueryResult;
  };

  // Query execution (Phase 4)
  "query:execute": {
    request: import("./types/database").ExecuteQueryRequest;
    response: import("./types/database").ExecuteQueryResult;
  };
  "query:explain": {
    request: import("./types/database").ExplainQueryRequest;
    response: import("./types/database").ExplainQueryResult;
  };
  "query:history": {
    request: void;
    response: import("./types/database").QueryHistoryEntry[];
  };
  "query:history:clear": {
    request: void;
    response: void;
  };
  "query:completions": {
    request: string; // connectionId
    response: { tables: string[]; columns: string[] };
  };

  // CRUD operations (Phase 5)
  "crud:insert-row": {
    request: import("./types/database").InsertRowRequest;
    response: import("./types/database").CrudResult;
  };
  "crud:update-row": {
    request: import("./types/database").UpdateRowRequest;
    response: import("./types/database").CrudResult;
  };
  "crud:delete-rows": {
    request: import("./types/database").DeleteRowsRequest;
    response: import("./types/database").CrudResult;
  };
  "crud:get-primary-keys": {
    request: { connectionId: string; schema: string; table: string };
    response: string[];
  };

  // Dialogs
  "dialog:open-file": {
    request: {
      title?: string;
      filters?: { name: string; extensions: string[] }[];
    };
    response: string | null;
  };
  "dialog:save-file": {
    request: {
      title?: string;
      defaultPath?: string;
      filters?: { name: string; extensions: string[] }[];
    };
    response: string | null;
  };
  "file:write": {
    request: { filePath: string; content: string };
    response: void;
  };

  // MongoDB operations (Phase 6)
  "mongo:databases": {
    request: string; // connectionId
    response: string[];
  };
  "mongo:collections": {
    request: { connectionId: string; database: string };
    response: import("./types/database").MongoCollectionInfo[];
  };
  "mongo:find": {
    request: import("./types/database").MongoFindRequest;
    response: import("./types/database").MongoFindResult;
  };
  "mongo:insert": {
    request: import("./types/database").MongoInsertRequest;
    response: import("./types/database").CrudResult;
  };
  "mongo:update": {
    request: import("./types/database").MongoUpdateRequest;
    response: import("./types/database").CrudResult;
  };
  "mongo:delete": {
    request: import("./types/database").MongoDeleteRequest;
    response: import("./types/database").CrudResult;
  };
  "mongo:aggregate": {
    request: import("./types/database").MongoAggregateRequest;
    response: import("./types/database").MongoDocument[];
  };

  // Redis operations (Phase 6)
  "redis:scan": {
    request: import("./types/database").RedisScanRequest;
    response: import("./types/database").RedisScanResult;
  };
  "redis:get": {
    request: import("./types/database").RedisGetRequest;
    response: import("./types/database").RedisGetResult;
  };
  "redis:set": {
    request: import("./types/database").RedisSetRequest;
    response: import("./types/database").CrudResult;
  };
  "redis:delete": {
    request: import("./types/database").RedisDeleteRequest;
    response: import("./types/database").CrudResult;
  };
  "redis:command": {
    request: import("./types/database").RedisCommandRequest;
    response: import("./types/database").RedisCommandResult;
  };

  // Data import (Phase 7)
  "import:preview": {
    request: import("./types/database").ImportPreviewRequest;
    response: import("./types/database").ImportPreviewResult;
  };
  "import:execute": {
    request: import("./types/database").ImportExecuteRequest;
    response: import("./types/database").ImportResult;
  };

  // Schema diff (Phase 7)
  "schema:diff": {
    request: import("./types/database").SchemaDiffRequest;
    response: import("./types/database").SchemaDiffResult;
  };

  // Saved queries (Phase 7)
  "queries:list": {
    request: void;
    response: import("./types/database").SavedQuery[];
  };
  "queries:save": {
    request: Omit<import("./types/database").SavedQuery, "id" | "createdAt" | "updatedAt">;
    response: import("./types/database").SavedQuery;
  };
  "queries:delete": {
    request: string; // query id
    response: void;
  };

  // Keyboard shortcuts (Phase 7)
  "shortcuts:get": {
    request: void;
    response: import("./types/database").KeyboardShortcut[];
  };
  "shortcuts:set": {
    request: import("./types/database").KeyboardShortcut[];
    response: import("./types/database").KeyboardShortcut[];
  };
  "shortcuts:reset": {
    request: void;
    response: import("./types/database").KeyboardShortcut[];
  };
}

/** Helper type to extract request/response for a channel. */
export type IpcRequest<C extends keyof IpcChannels> = IpcChannels[C]["request"];
export type IpcResponse<C extends keyof IpcChannels> =
  IpcChannels[C]["response"];
