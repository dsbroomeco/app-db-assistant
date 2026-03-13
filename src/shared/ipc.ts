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

export interface IpcChannels {
  "settings:get": { request: void; response: AppSettings };
  "settings:set": { request: Partial<AppSettings>; response: AppSettings };
  "app:get-version": { request: void; response: string };
  "theme:get-system": { request: void; response: "light" | "dark" };
}

/** Helper type to extract request/response for a channel. */
export type IpcRequest<C extends keyof IpcChannels> = IpcChannels[C]["request"];
export type IpcResponse<C extends keyof IpcChannels> =
  IpcChannels[C]["response"];
