import Redis from "ioredis";
import type {
  ConnectionConfig,
  CrudResult,
  RedisKeyInfo,
  RedisScanResult,
  RedisGetResult,
  RedisCommandResult,
  RedisValueType,
} from "../../shared/types/database";
import type { RedisDriver } from "../types";

export class RedisDriverImpl implements RedisDriver {
  private client: Redis | null = null;

  async connect(config: ConnectionConfig, password?: string): Promise<void> {
    this.client = new Redis({
      host: config.host,
      port: config.port,
      password: password || undefined,
      db: config.database ? parseInt(config.database, 10) || 0 : 0,
      tls: config.ssl ? { rejectUnauthorized: config.sslRejectUnauthorized } : undefined,
      connectTimeout: config.connectionTimeout,
      lazyConnect: true,
    });

    await this.client.connect();
    // Verify connectivity
    await this.client.ping();
  }

  async disconnect(): Promise<void> {
    if (this.client) {
      this.client.disconnect();
      this.client = null;
    }
  }

  async ping(): Promise<void> {
    if (!this.client) throw new Error("Not connected");
    await this.client.ping();
  }

  isConnected(): boolean {
    return this.client !== null;
  }

  private getClient(): Redis {
    if (!this.client) throw new Error("Not connected");
    return this.client;
  }

  async getKeyType(key: string): Promise<RedisValueType> {
    const client = this.getClient();
    const type = await client.type(key);
    const typeMap: Record<string, RedisValueType> = {
      string: "string",
      list: "list",
      set: "set",
      zset: "zset",
      hash: "hash",
      stream: "stream",
    };
    return typeMap[type] ?? "unknown";
  }

  async getKeyTtl(key: string): Promise<number> {
    const client = this.getClient();
    return client.ttl(key);
  }

  async scanKeys(
    pattern: string,
    cursor: string,
    count: number,
  ): Promise<RedisScanResult> {
    const client = this.getClient();
    const [nextCursor, rawKeys] = await client.scan(
      cursor,
      "MATCH",
      pattern,
      "COUNT",
      count,
    );

    const keys: RedisKeyInfo[] = [];
    for (const key of rawKeys) {
      const [type, ttl] = await Promise.all([
        this.getKeyType(key),
        this.getKeyTtl(key),
      ]);
      keys.push({ key, type, ttl });
    }

    return {
      keys,
      cursor: nextCursor,
      hasMore: nextCursor !== "0",
    };
  }

  async getKeyValue(key: string): Promise<RedisGetResult> {
    const client = this.getClient();
    const type = await this.getKeyType(key);
    const ttl = await this.getKeyTtl(key);

    let value: unknown;
    switch (type) {
      case "string":
        value = await client.get(key);
        break;
      case "list":
        value = await client.lrange(key, 0, -1);
        break;
      case "set":
        value = await client.smembers(key);
        break;
      case "zset":
        value = await client.zrange(key, 0, -1, "WITHSCORES");
        break;
      case "hash":
        value = await client.hgetall(key);
        break;
      case "stream": {
        const entries = await client.xrange(key, "-", "+", "COUNT", 100);
        value = entries;
        break;
      }
      default:
        value = null;
    }

    return { key, type, value, ttl };
  }

  async setKeyValue(
    key: string,
    value: string,
    ttl?: number,
  ): Promise<CrudResult> {
    const client = this.getClient();
    if (ttl && ttl > 0) {
      await client.set(key, value, "EX", ttl);
    } else {
      await client.set(key, value);
    }
    return { success: true, affectedRows: 1 };
  }

  async deleteKeys(keys: string[]): Promise<CrudResult> {
    const client = this.getClient();
    const deleted = await client.del(...keys);
    return { success: true, affectedRows: deleted };
  }

  async executeCommand(command: string): Promise<RedisCommandResult> {
    const client = this.getClient();
    const start = performance.now();

    // Parse the command string into parts safely
    const parts = parseRedisCommand(command);
    if (parts.length === 0) {
      throw new Error("Empty command");
    }

    const [cmd, ...args] = parts;
    // eslint-disable-next-line @typescript-eslint/no-explicit-any
    const result = await (client as any).call(cmd, ...args);
    const executionTime = Math.round(performance.now() - start);

    return { result, executionTime };
  }
}

/** Parse a Redis command string into parts, respecting quoted strings. */
function parseRedisCommand(input: string): string[] {
  const parts: string[] = [];
  let current = "";
  let inQuote: string | null = null;

  for (let i = 0; i < input.length; i++) {
    const ch = input[i];
    if (inQuote) {
      if (ch === inQuote) {
        inQuote = null;
      } else {
        current += ch;
      }
    } else if (ch === '"' || ch === "'") {
      inQuote = ch;
    } else if (ch === " " || ch === "\t") {
      if (current) {
        parts.push(current);
        current = "";
      }
    } else {
      current += ch;
    }
  }
  if (current) {
    parts.push(current);
  }
  return parts;
}
