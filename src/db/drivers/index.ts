import type { DatabaseType } from "../../shared/types/database";
import { isSqlType, isNoSqlType } from "../../shared/types/database";
import type { DatabaseDriver, MongoDBDriver, RedisDriver, BaseDriver } from "../types";
import { PostgreSQLDriver } from "./postgresql";
import { MySQLDriver } from "./mysql";
import { SQLiteDriver } from "./sqlite";
import { MSSQLDriver } from "./mssql";
import { MongoDBDriverImpl } from "./mongodb";
import { RedisDriverImpl } from "./redis";

/** Create a new SQL driver instance for the given database type. */
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
      throw new Error(`Unsupported SQL database type: ${type}`);
  }
}

/** Create a new MongoDB driver instance. */
export function createMongoDriver(): MongoDBDriver {
  return new MongoDBDriverImpl();
}

/** Create a new Redis driver instance. */
export function createRedisDriver(): RedisDriver {
  return new RedisDriverImpl();
}

/** Create any driver instance (SQL, MongoDB, or Redis). */
export function createAnyDriver(type: DatabaseType): BaseDriver {
  switch (type) {
    case "mongodb":
      return createMongoDriver();
    case "redis":
      return createRedisDriver();
    default:
      return createDriver(type);
  }
}
