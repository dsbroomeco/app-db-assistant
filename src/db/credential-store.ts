/**
 * Credential store — encrypts database passwords at rest
 * using Electron's safeStorage API (backed by OS keychain).
 */

import { safeStorage } from "electron";

type StoreType = { credentials: Record<string, string> };

let store: {
  get(key: "credentials"): Record<string, string>;
  set(key: "credentials", value: Record<string, string>): void;
};

export async function initCredentialStore(): Promise<void> {
  const { default: Store } = await import("electron-store");
  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  const instance: any = new Store<StoreType>({
    name: "credentials",
    defaults: { credentials: {} },
  });
  store = {
    get: (key: "credentials") => instance.get(key) as Record<string, string>,
    set: (key: "credentials", value: Record<string, string>) =>
      instance.set(key, value),
  };
}

/** Save an encrypted password for a connection. */
export function savePassword(connectionId: string, password: string): void {
  if (!safeStorage.isEncryptionAvailable()) {
    throw new Error("Encryption is not available on this system");
  }
  const encrypted = safeStorage.encryptString(password);
  const all = store.get("credentials");
  all[connectionId] = encrypted.toString("base64");
  store.set("credentials", all);
}

/** Retrieve and decrypt a password for a connection. Returns undefined if none stored. */
export function getPassword(connectionId: string): string | undefined {
  const all = store.get("credentials");
  const encoded = all[connectionId];
  if (!encoded) return undefined;
  if (!safeStorage.isEncryptionAvailable()) {
    throw new Error("Encryption is not available on this system");
  }
  const buffer = Buffer.from(encoded, "base64");
  return safeStorage.decryptString(buffer);
}

/** Delete a stored password. */
export function deletePassword(connectionId: string): void {
  const all = store.get("credentials");
  delete all[connectionId];
  store.set("credentials", all);
}

/** Check whether a password exists for a connection. */
export function hasPassword(connectionId: string): boolean {
  const all = store.get("credentials");
  return connectionId in all;
}
