import type { Tab } from "../hooks/useTabs";
import styles from "./TabBar.module.css";

interface TabBarProps {
    tabs: Tab[];
    activeTabId: string | null;
    onSelect: (id: string) => void;
    onClose: (id: string) => void;
    onNewTab?: () => void;
}

export function TabBar({
    tabs,
    activeTabId,
    onSelect,
    onClose,
    onNewTab,
}: TabBarProps) {
    return (
        <div className={styles.tabBar}>
            <div className={styles.tabs}>
                {tabs.map((tab) => (
                    <div
                        key={tab.id}
                        className={`${styles.tab} ${tab.id === activeTabId ? styles.active : ""}`}
                        onClick={() => onSelect(tab.id)}
                        onKeyDown={(e) => {
                            if (e.key === "Enter" || e.key === " ") onSelect(tab.id);
                        }}
                        role="tab"
                        aria-selected={tab.id === activeTabId}
                        tabIndex={0}
                    >
                        <span className={styles.tabIcon}>{getTabIcon(tab.type)}</span>
                        <span className={styles.tabTitle}>{tab.title}</span>
                        {tab.closable && (
                            <button
                                className={styles.closeBtn}
                                onClick={(e) => {
                                    e.stopPropagation();
                                    onClose(tab.id);
                                }}
                                aria-label={`Close ${tab.title}`}
                            >
                                ×
                            </button>
                        )}
                    </div>
                ))}
            </div>
            {onNewTab && (
                <button
                    className={styles.newTabBtn}
                    onClick={onNewTab}
                    aria-label="New query tab"
                    title="New Query"
                >
                    +
                </button>
            )}
        </div>
    );
}

function getTabIcon(type: Tab["type"]): string {
    switch (type) {
        case "welcome":
            return "🏠";
        case "query":
            return "⚡";
        case "table":
            return "📋";
        case "structure":
            return "🔧";
        case "settings":
            return "⚙️";
        default:
            return "📄";
    }
}
