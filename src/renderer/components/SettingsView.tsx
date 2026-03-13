import { useSettings } from "../context/SettingsContext";
import { useTheme } from "../context/ThemeContext";
import type { Theme } from "@shared/ipc";
import styles from "./SettingsView.module.css";

export function SettingsView() {
    const { settings, updateSettings } = useSettings();
    const { resolvedTheme } = useTheme();

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
            </div>
        </div>
    );
}
