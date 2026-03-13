/// <reference types="vite/client" />
import type { ElectronApi } from "../main/preload";

declare module "*.module.css" {
  const classes: { readonly [key: string]: string };
  export default classes;
}

declare global {
  interface Window {
    electronAPI: ElectronApi;
  }
}
