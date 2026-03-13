import {
    createContext,
    useContext,
    useEffect,
    useState,
    type ReactNode,
} from "react";
import { useSettings } from "./SettingsContext";

interface ThemeContextValue {
    isDark: boolean;
    resolvedTheme: "light" | "dark";
}

const ThemeContext = createContext<ThemeContextValue>({
    isDark: false,
    resolvedTheme: "light",
});

export function ThemeProvider({ children }: { children: ReactNode }) {
    const { settings } = useSettings();
    const [systemDark, setSystemDark] = useState(false);

    // Detect system theme
    useEffect(() => {
        const mq = window.matchMedia("(prefers-color-scheme: dark)");
        setSystemDark(mq.matches);

        const handler = (e: MediaQueryListEvent) => setSystemDark(e.matches);
        mq.addEventListener("change", handler);
        return () => mq.removeEventListener("change", handler);
    }, []);

    // Listen for Electron native theme changes
    useEffect(() => {
        if (window.electronAPI?.onThemeChange) {
            return window.electronAPI.onThemeChange((isDark) =>
                setSystemDark(isDark),
            );
        }
    }, []);

    const isDark =
        settings.theme === "dark" ||
        (settings.theme === "system" && systemDark);
    const resolvedTheme = isDark ? "dark" : "light";

    // Apply class to document
    useEffect(() => {
        document.documentElement.classList.toggle("dark", isDark);
    }, [isDark]);

    return (
        <ThemeContext.Provider value={{ isDark, resolvedTheme }}>
            {children}
        </ThemeContext.Provider>
    );
}

export function useTheme(): ThemeContextValue {
    return useContext(ThemeContext);
}
