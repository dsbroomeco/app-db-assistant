import mysql from "mysql2/promise";
import type { Pool } from "mysql2/promise";
import type { ConnectionConfig } from "../../shared/types/database";
import type { DatabaseDriver } from "../types";

export class MySQLDriver implements DatabaseDriver {
  private pool: Pool | null = null;

  async connect(config: ConnectionConfig, password?: string): Promise<void> {
    this.pool = mysql.createPool({
      host: config.host,
      port: config.port,
      database: config.database,
      user: config.username,
      password: password ?? "",
      ssl: config.ssl ? { rejectUnauthorized: false } : undefined,
      connectionLimit: config.poolSize,
      connectTimeout: config.connectionTimeout,
      waitForConnections: true,
    });

    // Verify the connection works
    const conn = await this.pool.getConnection();
    conn.release();
  }

  async disconnect(): Promise<void> {
    if (this.pool) {
      await this.pool.end();
      this.pool = null;
    }
  }

  async ping(): Promise<void> {
    if (!this.pool) throw new Error("Not connected");
    const conn = await this.pool.getConnection();
    try {
      await conn.ping();
    } finally {
      conn.release();
    }
  }

  isConnected(): boolean {
    return this.pool !== null;
  }
}
