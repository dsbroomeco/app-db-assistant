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
} from "./types/database";

export interface IpcChannels {
  "settings:get": { request: void; response: AppSettings };
  "settings:set": { request: Partial<AppSettings>; response: AppSettings };
  "app:get-version": { request: void; response: string };
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
    };
    response: import("./types/database").SavedConnection;
  };
  "conn:delete": { request: string; response: void };
  "conn:test": {
    request: {
      config: import("./types/database").ConnectionConfig;
      password?: string;
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
}

/** Helper type to extract request/response for a channel. */
export type IpcRequest<C extends keyof IpcChannels> = IpcChannels[C]["request"];
export type IpcResponse<C extends keyof IpcChannels> =
  IpcChannels[C]["response"];
