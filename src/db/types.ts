/** Common interface for all database drivers. */

import type { ConnectionConfig } from "../shared/types/database";

export interface DatabaseDriver {
  /** Establish a connection (or pool) using the given config and password. */
  connect(config: ConnectionConfig, password?: string): Promise<void>;
  /** Close the connection/pool gracefully. */
  disconnect(): Promise<void>;
  /** Verify the connection is alive. Throws on failure. */
  ping(): Promise<void>;
  /** Whether a connection is currently active. */
  isConnected(): boolean;
}
