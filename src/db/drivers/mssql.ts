import sql from "mssql";
import type { ConnectionConfig } from "../../shared/types/database";
import type { DatabaseDriver } from "../types";

export class MSSQLDriver implements DatabaseDriver {
  private pool: sql.ConnectionPool | null = null;

  async connect(config: ConnectionConfig, password?: string): Promise<void> {
    const mssqlConfig: sql.config = {
      server: config.host,
      port: config.port,
      database: config.database,
      user: config.username,
      password: password ?? "",
      pool: {
        max: config.poolSize,
        min: 0,
        idleTimeoutMillis: 30000,
      },
      options: {
        encrypt: config.ssl,
        trustServerCertificate: true,
        connectTimeout: config.connectionTimeout,
      },
    };

    this.pool = new sql.ConnectionPool(mssqlConfig);
    await this.pool.connect();
  }

  async disconnect(): Promise<void> {
    if (this.pool) {
      await this.pool.close();
      this.pool = null;
    }
  }

  async ping(): Promise<void> {
    if (!this.pool) throw new Error("Not connected");
    await this.pool.request().query("SELECT 1");
  }

  isConnected(): boolean {
    return this.pool !== null && this.pool.connected;
  }
}
