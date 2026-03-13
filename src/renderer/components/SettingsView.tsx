import { useState, useEffect, useCallback } from "react";
import { useSettings } from "../context/SettingsContext";
import { useTheme } from "../context/ThemeContext";
import type { Theme } from "@shared/ipc";
import type { KeyboardShortcut } from "@shared/types/database";
import styles from "./SettingsView.module.css";

export function SettingsView() {
    const { settings, updateSettings } = useSettings();
    const { resolvedTheme } = useTheme();
    const [shortcuts, setShortcuts] = useState<KeyboardShortcut[]>([]);
    const [editingShortcut, setEditingShortcut] = useState<string | null>(null);

    useEffect(() => {
        window.electronAPI.invoke("shortcuts:get").then(setShortcuts);
    }, []);

    const handleRecordShortcut = useCallback((id: string) => {
        setEditingShortcut(id);
        const handler = (e: KeyboardEvent) => {
            e.preventDefault();
            e.stopPropagation();
            const parts: string[] = [];
            if (e.ctrlKey || e.metaKey) parts.push("Ctrl");
            if (e.altKey) parts.push("Alt");
            if (e.shiftKey) parts.push("Shift");
            const key = e.key;
            if (!["Control", "Alt", "Shift", "Meta"].includes(key)) {
                parts.push(key.length === 1 ? key.toUpperCase() : key);
                const binding = parts.join("+");
                setShortcuts((prev) => {
                    const updated = prev.map((s) =>
                        s.id === id ? { ...s, customBinding: binding } : s,
                    );
                    window.electronAPI.invoke("shortcuts:set", updated);
                    return updated;
                });
                setEditingShortcut(null);
                document.removeEventListener("keydown", handler, true);
            }
        };
        document.addEventListener("keydown", handler, true);
    }, []);

    const handleResetShortcut = useCallback((id: string) => {
        setShortcuts((prev) => {
            const updated = prev.map((s) =>
                s.id === id ? { ...s, customBinding: null } : s,
            );
            window.electronAPI.invoke("shortcuts:set", updated);
            return updated;
        });
    }, []);

    const handleResetAll = useCallback(async () => {
        const reset: KeyboardShortcut[] = await window.electronAPI.invoke("shortcuts:reset");
        setShortcuts(reset);
    }, []);

    return (
        <div className={styles.settings}>
            <div className={styles.container}>
                <h1 className={styles.heading}>Settings</h1>

                {/* Appearance */}
                <section className={styles.section}>
                    <h2 className={styles.sectionTitle}>Appearance</h2>

                    <div className={styles.field}>
                        <label className={styles.label} htmlFor="theme-select">
                            Theme
                        </label>
                        <select
                            id="theme-select"
                            className={styles.select}
                            value={settings.theme}
                            onChange={(e) =>
                                updateSettings({ theme: e.target.value as Theme })
                            }
                        >
                            <option value="system">System</option>
                            <option value="light">Light</option>
                            <option value="dark">Dark</option>
                        </select>
                        <span className={styles.hint}>
                            Currently using: {resolvedTheme}
                        </span>
                    </div>

                    <div className={styles.field}>
                        <label className={styles.label} htmlFor="font-size">
                            Font Size
                        </label>
                        <div className={styles.row}>
                            <input
                                id="font-size"
                                type="range"
                                min="11"
                                max="20"
                                value={settings.fontSize}
                                onChange={(e) =>
                                    updateSettings({ fontSize: Number(e.target.value) })
                                }
                                className={styles.range}
                            />
                            <span className={styles.rangeValue}>{settings.fontSize}px</span>
                        </div>
                    </div>
                </section>

                {/* General */}
                <section className={styles.section}>
                    <h2 className={styles.sectionTitle}>General</h2>

                    <div className={styles.field}>
                        <label className={styles.checkboxLabel}>
                            <input
                                type="checkbox"
                                checked={settings.showWelcome}
                                onChange={(e) =>
                                    updateSettings({ showWelcome: e.target.checked })
                                }
                            />
                            <span>Show welcome tab on startup</span>
                        </label>
                    </div>
                </section>

                {/* Keyboard Shortcuts */}
                <section className={styles.section}>
                    <div className={styles.sectionHeader}>
                        <h2 className={styles.sectionTitle}>Keyboard Shortcuts</h2>
                        <button className={styles.resetBtn} onClick={handleResetAll}>
                            Reset All
                        </button>
                    </div>

                    <div className={styles.shortcutList}>
                        {shortcuts.map((sc) => (
                            <div key={sc.id} className={styles.shortcutRow}>
                                <span className={styles.shortcutLabel}>{sc.label}</span>
                                <span className={styles.shortcutBinding}>
                                    {editingShortcut === sc.id ? (
                                        <span className={styles.recording}>Press keys…</span>
                                    ) : (
                                        <kbd className={styles.kbd}>
                                            {sc.customBinding ?? sc.defaultBinding}
                                        </kbd>
                                    )}
                                </span>
                                <button
                                    className={styles.shortcutBtn}
                                    onClick={() => handleRecordShortcut(sc.id)}
                                    title="Record new shortcut"
                                >
                                    ✏️
                                </button>
                                {sc.customBinding && (
                                    <button
                                        className={styles.shortcutBtn}
                                        onClick={() => handleResetShortcut(sc.id)}
                                        title="Reset to default"
                                    >
                                        ↩
                                    </button>
                                )}
                            </div>
                        ))}
                    </div>
                </section>
            </div>
        </div>
    );
}
