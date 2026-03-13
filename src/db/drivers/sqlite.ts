import type BetterSqlite3 from "better-sqlite3";
import type { ConnectionConfig } from "../../shared/types/database";
import type { DatabaseDriver } from "../types";

export class SQLiteDriver implements DatabaseDriver {
  private db: BetterSqlite3.Database | null = null;

  async connect(config: ConnectionConfig): Promise<void> {
    if (!config.filepath) {
      throw new Error("SQLite requires a file path");
    }
    // Dynamic import — better-sqlite3 is a native module that may need electron-rebuild
    const Database = require("better-sqlite3") as typeof BetterSqlite3;
    this.db = new Database(config.filepath, {
      timeout: config.connectionTimeout,
    });
    // Verify the database is accessible
    this.db.pragma("journal_mode = WAL");
  }

  async disconnect(): Promise<void> {
    if (this.db) {
      this.db.close();
      this.db = null;
    }
  }

  async ping(): Promise<void> {
    if (!this.db) throw new Error("Not connected");
    this.db.prepare("SELECT 1").get();
  }

  isConnected(): boolean {
    return this.db !== null;
  }
}
