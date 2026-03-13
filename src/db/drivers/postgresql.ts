import { Pool } from "pg";
import type { ConnectionConfig } from "../../shared/types/database";
import type { DatabaseDriver } from "../types";

export class PostgreSQLDriver implements DatabaseDriver {
  private pool: Pool | null = null;

  async connect(config: ConnectionConfig, password?: string): Promise<void> {
    this.pool = new Pool({
      host: config.host,
      port: config.port,
      database: config.database,
      user: config.username,
      password: password ?? "",
      ssl: config.ssl ? { rejectUnauthorized: false } : false,
      max: config.poolSize,
      connectionTimeoutMillis: config.connectionTimeout,
      idleTimeoutMillis: 30000,
    });

    // Verify the connection works
    const client = await this.pool.connect();
    client.release();
  }

  async disconnect(): Promise<void> {
    if (this.pool) {
      await this.pool.end();
      this.pool = null;
    }
  }

  async ping(): Promise<void> {
    if (!this.pool) throw new Error("Not connected");
    const client = await this.pool.connect();
    try {
      await client.query("SELECT 1");
    } finally {
      client.release();
    }
  }

  isConnected(): boolean {
    return this.pool !== null;
  }
}
