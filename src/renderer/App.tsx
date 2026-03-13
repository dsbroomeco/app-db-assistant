import { useCallback, useState } from "react";
import { TabBar } from "./components/TabBar";
import { Sidebar } from "./components/Sidebar";
import { WelcomeView } from "./components/WelcomeView";
import { SettingsView } from "./components/SettingsView";
import { ConnectionForm } from "./components/ConnectionForm";
import { TableDataView } from "./components/TableDataView";
import { TableStructureView } from "./components/TableStructureView";
import { QueryEditorView } from "./components/QueryEditorView";
import { MongoCollectionView } from "./components/MongoCollectionView";
import { RedisBrowserView } from "./components/RedisBrowserView";
import { DataImportView } from "./components/DataImportView";
import { SchemaDiffView } from "./components/SchemaDiffView";
import { ErdView } from "./components/ErdView";
import { ConnectionProvider } from "./context/ConnectionContext";
import { useTabs } from "./hooks/useTabs";
import type { Tab } from "./hooks/useTabs";
import type { SavedConnection } from "@shared/types/database";
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

function AppContent() {
    const { tabs, activeTab, activeTabId, setActiveTabId, addTab, closeTab } =
        useTabs([WELCOME_TAB]);

    const [connectionFormOpen, setConnectionFormOpen] = useState(false);
    const [editingConnection, setEditingConnection] =
        useState<SavedConnection | null>(null);

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

    const handleNewConnection = useCallback(() => {
        setEditingConnection(null);
        setConnectionFormOpen(true);
    }, []);

    const handleEditConnection = useCallback((conn: SavedConnection) => {
        setEditingConnection(conn);
        setConnectionFormOpen(true);
    }, []);

    const handleCloseConnectionForm = useCallback(() => {
        setConnectionFormOpen(false);
        setEditingConnection(null);
    }, []);

    const handleOpenTable = useCallback(
        (connectionId: string, schema: string, table: string) => {
            addTab({
                id: `table-${connectionId}-${schema}-${table}`,
                title: `${schema}.${table}`,
                type: "table",
                closable: true,
                meta: { connectionId, schema, table },
            });
        },
        [addTab],
    );

    const handleOpenStructure = useCallback(
        (connectionId: string, schema: string, table: string) => {
            addTab({
                id: `structure-${connectionId}-${schema}-${table}`,
                title: `${schema}.${table} (structure)`,
                type: "structure",
                closable: true,
                meta: { connectionId, schema, table },
            });
        },
        [addTab],
    );

    const handleOpenCollection = useCallback(
        (connectionId: string, database: string, collection: string) => {
            addTab({
                id: `mongo-${connectionId}-${database}-${collection}`,
                title: `${database}.${collection}`,
                type: "mongo-collection",
                closable: true,
                meta: { connectionId, database, collection },
            });
        },
        [addTab],
    );

    const handleOpenRedisBrowser = useCallback(
        (connectionId: string) => {
            addTab({
                id: `redis-${connectionId}`,
                title: "Redis Browser",
                type: "redis-browser",
                closable: true,
                meta: { connectionId },
            });
        },
        [addTab],
    );

    const handleOpenImport = useCallback(
        (connectionId: string) => {
            addTab({
                id: `import-${connectionId}`,
                title: "Import Data",
                type: "import",
                closable: true,
                meta: { connectionId },
            });
        },
        [addTab],
    );

    const handleOpenSchemaDiff = useCallback(() => {
        addTab({
            id: "schema-diff",
            title: "Schema Diff",
            type: "schema-diff",
            closable: true,
        });
    }, [addTab]);

    const handleOpenErd = useCallback(() => {
        addTab({
            id: "erd",
            title: "ERD",
            type: "erd",
            closable: true,
        });
    }, [addTab]);

    return (
        <div className={styles.app}>
            <div className={styles.body}>
                <Sidebar
                    onOpenSettings={handleOpenSettings}
                    onNewConnection={handleNewConnection}
                    onEditConnection={handleEditConnection}
                    onOpenTable={handleOpenTable}
                    onOpenStructure={handleOpenStructure}
                    onOpenCollection={handleOpenCollection}
                    onOpenRedisBrowser={handleOpenRedisBrowser}
                    onOpenImport={handleOpenImport}
                    onOpenSchemaDiff={handleOpenSchemaDiff}
                    onOpenErd={handleOpenErd}
                />
                <div className={styles.main}>
                    <TabBar
                        tabs={tabs}
                        activeTabId={activeTabId}
                        onSelect={setActiveTabId}
                        onClose={closeTab}
                        onNewTab={handleNewQueryTab}
                    />
                    <div className={styles.content}>
                        {activeTab?.type === "welcome" && (
                            <WelcomeView onNewConnection={handleNewConnection} />
                        )}
                        {activeTab?.type === "settings" && <SettingsView />}
                        {activeTab?.type === "query" && (
                            <QueryEditorView
                                connectionId={activeTab.meta?.connectionId}
                            />
                        )}
                        {activeTab?.type === "table" && activeTab.meta && (
                            <TableDataView
                                connectionId={activeTab.meta.connectionId!}
                                schema={activeTab.meta.schema!}
                                table={activeTab.meta.table!}
                            />
                        )}
                        {activeTab?.type === "structure" && activeTab.meta && (
                            <TableStructureView
                                connectionId={activeTab.meta.connectionId!}
                                schema={activeTab.meta.schema!}
                                table={activeTab.meta.table!}
                            />
                        )}
                        {activeTab?.type === "mongo-collection" && activeTab.meta && (
                            <MongoCollectionView
                                connectionId={activeTab.meta.connectionId!}
                                database={activeTab.meta.database!}
                                collection={activeTab.meta.collection!}
                            />
                        )}
                        {activeTab?.type === "redis-browser" && activeTab.meta && (
                            <RedisBrowserView
                                connectionId={activeTab.meta.connectionId!}
                            />
                        )}
                        {activeTab?.type === "import" && activeTab.meta && (
                            <DataImportView
                                connectionId={activeTab.meta.connectionId!}
                            />
                        )}
                        {activeTab?.type === "schema-diff" && <SchemaDiffView />}
                        {activeTab?.type === "erd" && <ErdView />}
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

            {connectionFormOpen && (
                <ConnectionForm
                    editConnection={editingConnection}
                    onClose={handleCloseConnectionForm}
                />
            )}
        </div>
    );
}

export function App() {
    return (
        <ConnectionProvider>
            <AppContent />
        </ConnectionProvider>
    );
}
