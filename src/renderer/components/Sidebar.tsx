import styles from "./Sidebar.module.css";

interface SidebarProps {
    onOpenSettings: () => void;
}

export function Sidebar({ onOpenSettings }: SidebarProps) {
    return (
        <aside className={styles.sidebar}>
            <div className={styles.header}>
                <span className={styles.logo}>⬡</span>
                <span className={styles.title}>DB Assistant</span>
            </div>

            <div className={styles.section}>
                <div className={styles.sectionTitle}>Connections</div>
                <div className={styles.empty}>
                    No connections yet.
                    <br />
                    Click + to add one.
                </div>
            </div>

            <div className={styles.footer}>
                <button
                    className={styles.footerBtn}
                    onClick={onOpenSettings}
                    title="Settings"
                >
                    ⚙️ Settings
                </button>
            </div>
        </aside>
    );
}
