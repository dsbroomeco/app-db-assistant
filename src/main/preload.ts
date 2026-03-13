import { contextBridge, ipcRenderer } from "electron";
import type { IpcChannels } from "../shared/ipc";

type Channel = keyof IpcChannels;

const api = {
  invoke: <C extends Channel>(
    channel: C,
    ...args: IpcChannels[C]["request"] extends void ? [] : [IpcChannels[C]["request"]]
  ): Promise<IpcChannels[C]["response"]> => {
    return ipcRenderer.invoke(channel, ...args);
  },

  onThemeChange: (callback: (isDark: boolean) => void): (() => void) => {
    const handler = (_event: Electron.IpcRendererEvent, isDark: boolean) =>
      callback(isDark);
    ipcRenderer.on("theme:changed", handler);
    return () => ipcRenderer.removeListener("theme:changed", handler);
  },
};

export type ElectronApi = typeof api;

contextBridge.exposeInMainWorld("electronAPI", api);
