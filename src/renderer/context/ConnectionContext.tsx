import {
    createContext,
    useContext,
    useState,
    useEffect,
    useCallback,
    type ReactNode,
} from "react";
import type {
    SavedConnection,
    ConnectionConfig,
    ConnectionStatus,
    TestConnectionResult,
} from "@shared/types/database";

interface ConnectionContextValue {
    connections: SavedConnection[];
    statuses: ConnectionStatus[];
    loading: boolean;
    refresh: () => Promise<void>;
    saveConnection: (
        config: ConnectionConfig,
        password?: string,
        sshPassword?: string,
    ) => Promise<SavedConnection>;
    deleteConnection: (id: string) => Promise<void>;
    testConnection: (
        config: ConnectionConfig,
        password?: string,
        sshPassword?: string,
    ) => Promise<TestConnectionResult>;
    connect: (id: string) => Promise<ConnectionStatus>;
    disconnect: (id: string) => Promise<ConnectionStatus>;
    isConnected: (id: string) => boolean;
}

const ConnectionContext = createContext<ConnectionContextValue | null>(null);

export function ConnectionProvider({ children }: { children: ReactNode }) {
    const [connections, setConnections] = useState<SavedConnection[]>([]);
    const [statuses, setStatuses] = useState<ConnectionStatus[]>([]);
    const [loading, setLoading] = useState(true);

    const refresh = useCallback(async () => {
        const [conns, stats] = await Promise.all([
            window.electronAPI.invoke("conn:list"),
            window.electronAPI.invoke("conn:statuses"),
        ]);
        setConnections(conns);
        setStatuses(stats);
        setLoading(false);
    }, []);

    useEffect(() => {
        refresh();
    }, [refresh]);

    const save = useCallback(
        async (config: ConnectionConfig, password?: string, sshPassword?: string) => {
            const saved = await window.electronAPI.invoke("conn:save", {
                config,
                password,
                sshPassword,
            });
            await refresh();
            return saved;
        },
        [refresh],
    );

    const remove = useCallback(
        async (id: string) => {
            await window.electronAPI.invoke("conn:delete", id);
            await refresh();
        },
        [refresh],
    );

    const test = useCallback(
        async (config: ConnectionConfig, password?: string, sshPassword?: string) => {
            return window.electronAPI.invoke("conn:test", { config, password, sshPassword });
        },
        [],
    );

    const connectFn = useCallback(
        async (id: string) => {
            const status = await window.electronAPI.invoke("conn:connect", id);
            await refresh();
            return status;
        },
        [refresh],
    );

    const disconnectFn = useCallback(
        async (id: string) => {
            const status = await window.electronAPI.invoke("conn:disconnect", id);
            await refresh();
            return status;
        },
        [refresh],
    );

    const isConnected = useCallback(
        (id: string) => {
            return statuses.some((s) => s.id === id && s.connected);
        },
        [statuses],
    );

    return (
        <ConnectionContext.Provider
            value={{
                connections,
                statuses,
                loading,
                refresh,
                saveConnection: save,
                deleteConnection: remove,
                testConnection: test,
                connect: connectFn,
                disconnect: disconnectFn,
                isConnected,
            }}
        >
            {children}
        </ConnectionContext.Provider>
    );
}

export function useConnections(): ConnectionContextValue {
    const ctx = useContext(ConnectionContext);
    if (!ctx) {
        throw new Error("useConnections must be used within ConnectionProvider");
    }
    return ctx;
}
