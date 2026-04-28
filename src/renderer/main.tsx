import { StrictMode, Profiler, type ProfilerOnRenderCallback } from "react";
import { createRoot } from "react-dom/client";
import { App } from "./App";
import { ThemeProvider } from "./context/ThemeContext";
import { SettingsProvider } from "./context/SettingsContext";
import {
    initRenderProfilerApi,
    recordRenderProfileSample,
} from "./utils/renderProfiler";
import "./styles/global.css";

const root = document.getElementById("root");
if (!root) throw new Error("Root element not found");

function isRuntimeProfilerEnabled(): boolean {
    if (typeof window === "undefined") return false;

    if (window.electronAPI.getRuntimeFlags().renderProfilerEnabled) {
        return true;
    }

    if (window.name.includes("dba-render-profiler=true")) return true;

    try {
        return window.localStorage.getItem("dba-render-profiler") === "true";
    } catch {
        return false;
    }
}

const runtimeProfilerEnabled =
    isRuntimeProfilerEnabled();

const renderProfilerEnabled =
    import.meta.env.VITE_ENABLE_RENDER_PROFILER === "true" || runtimeProfilerEnabled;

initRenderProfilerApi(renderProfilerEnabled);

const onRender: ProfilerOnRenderCallback = (
    id,
    phase,
    actualDuration,
    baseDuration,
    startTime,
    commitTime,
) => {
    if (!renderProfilerEnabled) return;

    recordRenderProfileSample({
        id,
        phase,
        actualDuration,
        baseDuration,
        startTime,
        commitTime,
    });
};

createRoot(root).render(
    <StrictMode>
        <Profiler id="AppRoot" onRender={onRender}>
            <SettingsProvider>
                <ThemeProvider>
                    <App renderProfilerEnabled={renderProfilerEnabled} onRenderProfile={onRender} />
                </ThemeProvider>
            </SettingsProvider>
        </Profiler>
    </StrictMode>,
);
