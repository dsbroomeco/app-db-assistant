/**
 * SSH tunnel manager — creates SSH tunnels for database connections.
 * Uses the `ssh2` package for SSH connections.
 * Runs in the main process only.
 */

import type { ConnectionConfig } from "../shared/types/database";
import { readFile } from "fs/promises";
import net from "net";

interface TunnelInfo {
  localPort: number;
  server: net.Server;
  cleanup: () => Promise<void>;
}

/** Map of connection ID → active tunnel info. */
const activeTunnels = new Map<string, TunnelInfo>();

/** Find a free local port. */
function findFreePort(): Promise<number> {
  return new Promise((resolve, reject) => {
    const server = net.createServer();
    server.listen(0, "127.0.0.1", () => {
      const addr = server.address();
      if (addr && typeof addr === "object") {
        const port = addr.port;
        server.close(() => resolve(port));
      } else {
        server.close(() => reject(new Error("Could not find free port")));
      }
    });
    server.on("error", reject);
  });
}

/**
 * Create an SSH tunnel for a connection.
 * Returns a modified config with host=127.0.0.1 and port=localTunnelPort.
 */
export async function createTunnel(
  config: ConnectionConfig,
  sshPassword?: string,
): Promise<{ tunnelConfig: ConnectionConfig; localPort: number }> {
  // Dynamic import of ssh2 (optional dependency)
  const { Client } = await import("ssh2");

  const localPort = await findFreePort();
  const remoteHost = config.host;
  const remotePort = config.port;

  const sshConfig: Record<string, unknown> = {
    host: config.sshHost,
    port: config.sshPort,
    username: config.sshUsername,
  };

  if (config.sshAuthMethod === "privateKey" && config.sshPrivateKeyPath) {
    const keyContent = await readFile(config.sshPrivateKeyPath, "utf-8");
    sshConfig.privateKey = keyContent;
    if (sshPassword) {
      sshConfig.passphrase = sshPassword;
    }
  } else if (sshPassword) {
    sshConfig.password = sshPassword;
  }

  return new Promise((resolve, reject) => {
    const sshClient = new Client();
    const connections = new Set<net.Socket>();

    const server = net.createServer((socket) => {
      connections.add(socket);
      socket.on("close", () => connections.delete(socket));

      sshClient.forwardOut(
        "127.0.0.1",
        localPort,
        remoteHost,
        remotePort,
        (err: Error | undefined, stream: NodeJS.ReadWriteStream) => {
          if (err) {
            socket.end();
            return;
          }
          socket.pipe(stream).pipe(socket);
        },
      );
    });

    const cleanup = async () => {
      for (const conn of connections) {
        conn.destroy();
      }
      connections.clear();

      return new Promise<void>((res) => {
        server.close(() => {
          sshClient.end();
          activeTunnels.delete(config.id);
          res();
        });
      });
    };

    sshClient
      .on("ready", () => {
        server.listen(localPort, "127.0.0.1", () => {
          activeTunnels.set(config.id, { localPort, server, cleanup });

          // Return modified config pointing to local tunnel
          const tunnelConfig: ConnectionConfig = {
            ...config,
            host: "127.0.0.1",
            port: localPort,
          };

          resolve({ tunnelConfig, localPort });
        });
      })
      .on("error", (err: Error) => {
        reject(new Error(`SSH connection failed: ${err.message}`));
      })
      .connect(sshConfig as Parameters<typeof sshClient.connect>[0]);
  });
}

/** Close an SSH tunnel for a connection. */
export async function closeTunnel(connectionId: string): Promise<void> {
  const tunnel = activeTunnels.get(connectionId);
  if (tunnel) {
    await tunnel.cleanup();
  }
}

/** Close all active SSH tunnels. */
export async function closeAllTunnels(): Promise<void> {
  const promises = Array.from(activeTunnels.values()).map((t) => t.cleanup());
  await Promise.allSettled(promises);
}

/** Check if a connection has an active tunnel. */
export function hasTunnel(connectionId: string): boolean {
  return activeTunnels.has(connectionId);
}
