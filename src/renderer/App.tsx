import { useCallback } from "react";
import { TabBar } from "./components/TabBar";
import { Sidebar } from "./components/Sidebar";
import { WelcomeView } from "./components/WelcomeView";
import { SettingsView } from "./components/SettingsView";
import { useTabs } from "./hooks/useTabs";
import type { Tab } from "./hooks/useTabs";
import styles from "./App.module.css";

const WELCOME_TAB: Tab = {
    id: "welcome",
    title: "Welcome",
    type: "welcome",
    closable: true,
};

const SETTINGS_TAB: Tab = {
    id: "settings",
    title: "Settings",
    type: "settings",
    closable: true,
};

export function App() {
    const { tabs, activeTab, activeTabId, setActiveTabId, addTab, closeTab } =
        useTabs([WELCOME_TAB]);

    const handleOpenSettings = useCallback(() => {
        addTab(SETTINGS_TAB);
    }, [addTab]);

    let queryCount = 0;
    const handleNewQueryTab = useCallback(() => {
        queryCount++;
        addTab({
            id: `query-${Date.now()}`,
            title: `Query ${queryCount}`,
            type: "query",
            closable: true,
        });
    }, [addTab]);

    return (
        <div className={styles.app}>
            <div className={styles.body}>
                <Sidebar onOpenSettings={handleOpenSettings} />
                <div className={styles.main}>
                    <TabBar
                        tabs={tabs}
                        activeTabId={activeTabId}
                        onSelect={setActiveTabId}
                        onClose={closeTab}
                        onNewTab={handleNewQueryTab}
                    />
                    <div className={styles.content}>
                        {activeTab?.type === "welcome" && <WelcomeView />}
                        {activeTab?.type === "settings" && <SettingsView />}
                        {activeTab?.type === "query" && (
                            <div className={styles.placeholder}>
                                <span className={styles.placeholderIcon}>⚡</span>
                                <p>SQL Query Editor</p>
                                <p className={styles.placeholderHint}>
                                    Coming in Phase 4 — SQL editor with syntax highlighting and
                                    autocomplete.
                                </p>
                            </div>
                        )}
                        {activeTab?.type === "table" && (
                            <div className={styles.placeholder}>
                                <span className={styles.placeholderIcon}>📋</span>
                                <p>Table Data Viewer</p>
                                <p className={styles.placeholderHint}>
                                    Coming in Phase 3 — browse table data with pagination.
                                </p>
                            </div>
                        )}
                        {!activeTab && (
                            <div className={styles.placeholder}>
                                <span className={styles.placeholderIcon}>📭</span>
                                <p>No tabs open</p>
                                <p className={styles.placeholderHint}>
                                    Click + to open a new query tab.
                                </p>
                            </div>
                        )}
                    </div>
                </div>
            </div>
        </div>
    );
}
