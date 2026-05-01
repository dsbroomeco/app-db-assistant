import styles from "./WelcomeView.module.css";

interface WelcomeViewProps {
    onNewConnection: () => void;
}

export function WelcomeView({ onNewConnection }: WelcomeViewProps) {
    return (
        <div className={styles.welcome}>
            <div className={styles.content}>
                <div className={styles.logoLarge}>⬡</div>
                <h1 className={styles.heading}>Welcome to DB Assistant</h1>
                <p className={styles.subtitle}>
                    A cross-platform database manager for SQL and NoSQL databases.
                </p>

                <div className={styles.quickActions}>
                    <h2 className={styles.sectionTitle}>Quick Start</h2>
                    <div className={styles.actions}>
                        <button
                            className={styles.actionBtn}
                            onClick={onNewConnection}
                        >
                            <span className={styles.actionIcon}>➕</span>
                            <span>New Connection</span>
                        </button>
                        <button className={styles.actionBtn} disabled>
                            <span className={styles.actionIcon}>⚡</span>
                            <span>New Query</span>
                        </button>
                        <button
                            className={styles.actionBtn}
                            onClick={onNewConnection}
                        >
                            <span className={styles.actionIcon}>📂</span>
                            <span>Open SQLite File</span>
                        </button>
                    </div>
                </div>

                <div className={styles.databases}>
                    <h2 className={styles.sectionTitle}>Supported Databases</h2>
                    <div className={styles.dbList}>
                        {[
                            "PostgreSQL",
                            "MySQL",
                            "MariaDB",
                            "SQLite",
                            "SQL Server",
                            "MongoDB",
                            "Redis",
                        ].map((db) => (
                            <span key={db} className={styles.dbBadge}>
                                {db}
                            </span>
                        ))}
                    </div>
                </div>
            </div>
        </div>
    );
}
