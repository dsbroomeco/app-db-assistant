import type { DatabaseType } from "../../shared/types/database";
import type { DatabaseDriver } from "../types";
import { PostgreSQLDriver } from "./postgresql";
import { MySQLDriver } from "./mysql";
import { SQLiteDriver } from "./sqlite";
import { MSSQLDriver } from "./mssql";

/** Create a new driver instance for the given database type. */
export function createDriver(type: DatabaseType): DatabaseDriver {
  switch (type) {
    case "postgresql":
      return new PostgreSQLDriver();
    case "mysql":
      return new MySQLDriver();
    case "sqlite":
      return new SQLiteDriver();
    case "mssql":
      return new MSSQLDriver();
    default:
      throw new Error(`Unsupported database type: ${type}`);
  }
}
