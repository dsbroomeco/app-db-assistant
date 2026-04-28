/// <reference types="vite/client" />
import type { ElectronApi } from "../main/preload";

interface ImportMetaEnv {
  readonly VITE_ENABLE_RENDER_PROFILER?: string;
}

interface ImportMeta {
  readonly env: ImportMetaEnv;
}

interface RenderProfilerApi {
  clear: () => void;
  samples: () => Array<{
    id: string;
    phase: "mount" | "update" | "nested-update";
    actualDuration: number;
    baseDuration: number;
    startTime: number;
    commitTime: number;
    recordedAt: number;
  }>;
  summary: () => Array<{
    id: string;
    commits: number;
    totalActualMs: number;
    avgActualMs: number;
    p95ActualMs: number;
    maxActualMs: number;
  }>;
}

declare module "*.module.css" {
  const classes: { readonly [key: string]: string };
  export default classes;
}

declare global {
  interface Window {
    electronAPI: ElectronApi;
    __DBA_RENDER_PROFILER__?: RenderProfilerApi;
  }
}
