import {
    createContext,
    useContext,
    useEffect,
    useState,
    useCallback,
    type ReactNode,
} from "react";
import type { AppSettings } from "@shared/ipc";
import { DEFAULT_SETTINGS } from "@shared/ipc";

interface SettingsContextValue {
    settings: AppSettings;
    updateSettings: (partial: Partial<AppSettings>) => Promise<void>;
    loading: boolean;
}

const SettingsContext = createContext<SettingsContextValue | null>(null);

export function SettingsProvider({ children }: { children: ReactNode }) {
    const [settings, setSettings] = useState<AppSettings>(DEFAULT_SETTINGS);
    const [loading, setLoading] = useState(true);

    useEffect(() => {
        const load = async () => {
            try {
                if (window.electronAPI) {
                    const saved = await window.electronAPI.invoke("settings:get");
                    setSettings(saved);
                }
            } catch {
                // Use defaults if IPC unavailable (e.g., dev in browser)
            } finally {
                setLoading(false);
            }
        };
        load();
    }, []);

    const updateSettings = useCallback(
        async (partial: Partial<AppSettings>) => {
            const optimistic = { ...settings, ...partial };
            setSettings(optimistic);
            try {
                if (window.electronAPI) {
                    const confirmed = await window.electronAPI.invoke(
                        "settings:set",
                        partial,
                    );
                    setSettings(confirmed);
                }
            } catch {
                // Revert on failure
                setSettings(settings);
            }
        },
        [settings],
    );

    return (
        <SettingsContext.Provider value={{ settings, updateSettings, loading }}>
            {children}
        </SettingsContext.Provider>
    );
}

export function useSettings(): SettingsContextValue {
    const ctx = useContext(SettingsContext);
    if (!ctx) throw new Error("useSettings must be used within SettingsProvider");
    return ctx;
}
