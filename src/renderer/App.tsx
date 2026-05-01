import {
    useCallback,
    useRef,
    useState,
    Profiler,
    type ProfilerOnRenderCallback,
    type ReactNode,
} from "react";
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

interface AppProps {
    renderProfilerEnabled?: boolean;
    onRenderProfile?: ProfilerOnRenderCallback;
}

function profileView(
    id: string,
    node: ReactNode,
    enabled: boolean,
    onRenderProfile?: ProfilerOnRenderCallback,
) {
    if (!enabled || !onRenderProfile) return node;
    return (
        <Profiler id={id} onRender={onRenderProfile}>
            {node}
        </Profiler>
    );
}

function AppContent({ renderProfilerEnabled = false, onRenderProfile }: AppProps) {
    const { tabs, activeTab, activeTabId, setActiveTabId, addTab, closeTab } =
        useTabs([WELCOME_TAB]);

    const [connectionFormOpen, setConnectionFormOpen] = useState(false);
    const [editingConnection, setEditingConnection] =
        useState<SavedConnection | null>(null);

    const handleOpenSettings = useCallback(() => {
        addTab(SETTINGS_TAB);
    }, [addTab]);

    const queryCountRef = useRef(0);
    const handleNewQueryTab = useCallback(() => {
        queryCountRef.current += 1;
        addTab({
            id: `query-${Date.now()}`,
            title: `Query ${queryCountRef.current}`,
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
                <div className={styles.main} role="main">
                    <TabBar
                        tabs={tabs}
                        activeTabId={activeTabId}
                        onSelect={setActiveTabId}
                        onClose={closeTab}
                        onNewTab={handleNewQueryTab}
                    />
                    <div className={styles.content} role="region" aria-label="Active view">
                        {activeTab?.type === "welcome" && (
                            profileView(
                                "WelcomeView",
                                <WelcomeView onNewConnection={handleNewConnection} />,
                                renderProfilerEnabled,
                                onRenderProfile,
                            )
                        )}
                        {activeTab?.type === "settings" &&
                            profileView(
                                "SettingsView",
                                <SettingsView />,
                                renderProfilerEnabled,
                                onRenderProfile,
                            )}
                        {activeTab?.type === "query" && (
                            profileView(
                                "QueryEditorView",
                                <QueryEditorView
                                    connectionId={activeTab.meta?.connectionId}
                                />,
                                renderProfilerEnabled,
                                onRenderProfile,
                            )
                        )}
                        {activeTab?.type === "table" && activeTab.meta && (
                            profileView(
                                "TableDataView",
                                <TableDataView
                                    connectionId={activeTab.meta.connectionId!}
                                    schema={activeTab.meta.schema!}
                                    table={activeTab.meta.table!}
                                />,
                                renderProfilerEnabled,
                                onRenderProfile,
                            )
                        )}
                        {activeTab?.type === "structure" && activeTab.meta && (
                            profileView(
                                "TableStructureView",
                                <TableStructureView
                                    connectionId={activeTab.meta.connectionId!}
                                    schema={activeTab.meta.schema!}
                                    table={activeTab.meta.table!}
                                />,
                                renderProfilerEnabled,
                                onRenderProfile,
                            )
                        )}
                        {activeTab?.type === "mongo-collection" && activeTab.meta && (
                            profileView(
                                "MongoCollectionView",
                                <MongoCollectionView
                                    connectionId={activeTab.meta.connectionId!}
                                    database={activeTab.meta.database!}
                                    collection={activeTab.meta.collection!}
                                />,
                                renderProfilerEnabled,
                                onRenderProfile,
                            )
                        )}
                        {activeTab?.type === "redis-browser" && activeTab.meta && (
                            profileView(
                                "RedisBrowserView",
                                <RedisBrowserView
                                    connectionId={activeTab.meta.connectionId!}
                                />,
                                renderProfilerEnabled,
                                onRenderProfile,
                            )
                        )}
                        {activeTab?.type === "import" && activeTab.meta && (
                            profileView(
                                "DataImportView",
                                <DataImportView
                                    connectionId={activeTab.meta.connectionId!}
                                />,
                                renderProfilerEnabled,
                                onRenderProfile,
                            )
                        )}
                        {activeTab?.type === "schema-diff" &&
                            profileView(
                                "SchemaDiffView",
                                <SchemaDiffView />,
                                renderProfilerEnabled,
                                onRenderProfile,
                            )}
                        {activeTab?.type === "erd" &&
                            profileView(
                                "ErdView",
                                <ErdView />,
                                renderProfilerEnabled,
                                onRenderProfile,
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

            {connectionFormOpen && (
                <ConnectionForm
                    editConnection={editingConnection}
                    onClose={handleCloseConnectionForm}
                />
            )}
        </div>
    );
}

export function App({ renderProfilerEnabled = false, onRenderProfile }: AppProps) {
    return (
        <ConnectionProvider>
            <AppContent
                renderProfilerEnabled={renderProfilerEnabled}
                onRenderProfile={onRenderProfile}
            />
        </ConnectionProvider>
    );
}
