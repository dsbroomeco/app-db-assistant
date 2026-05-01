import styles from "./DatabaseTreeView.module.css";

interface RedisTreeViewProps {
    connectionId: string;
    connectionName: string;
    onOpenBrowser: () => void;
}

export function RedisTreeView({
    connectionId: _connectionId,
    connectionName: _connectionName,
    onOpenBrowser,
}: RedisTreeViewProps) {
    return (
        <div className={styles.treeView}>
            <div
                className={`${styles.treeNode} ${styles.leaf}`}
                onClick={onOpenBrowser}
            >
                <span className={styles.icon}>🔑</span>
                <span className={`${styles.label} ${styles.clickable}`}>
                    Browse Keys
                </span>
            </div>
        </div>
    );
}
