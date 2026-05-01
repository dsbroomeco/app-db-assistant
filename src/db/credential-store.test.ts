import { describe, it, expect, vi, beforeEach } from "vitest";

// Mock electron
vi.mock("electron", () => ({
  safeStorage: {
    isEncryptionAvailable: () => true,
    encryptString: (text: string) => Buffer.from(`enc:${text}`),
    decryptString: (buffer: Buffer) =>
      buffer.toString().replace("enc:", ""),
  },
}));

// Mock electron-store
vi.mock("electron-store", () => {
  return {
    default: class MockStore {
      private data: Record<string, unknown>;
      constructor(opts: { defaults?: Record<string, unknown> } = {}) {
        this.data = { ...(opts.defaults ?? {}) };
      }
      get(key: string) {
        return this.data[key];
      }
      set(key: string, value: unknown) {
        this.data[key] = value;
      }
    },
  };
});

describe("credential-store", () => {
  let credStore: typeof import("./credential-store");

  beforeEach(async () => {
    vi.resetModules();
    credStore = await import("./credential-store");
    await credStore.initCredentialStore();
  });

  it("saves and retrieves a password", () => {
    credStore.savePassword("conn-1", "my-secret");
    expect(credStore.getPassword("conn-1")).toBe("my-secret");
  });

  it("returns undefined for missing password", () => {
    expect(credStore.getPassword("nonexistent")).toBeUndefined();
  });

  it("reports hasPassword correctly", () => {
    expect(credStore.hasPassword("conn-1")).toBe(false);
    credStore.savePassword("conn-1", "secret");
    expect(credStore.hasPassword("conn-1")).toBe(true);
  });

  it("deletes a password", () => {
    credStore.savePassword("conn-1", "secret");
    credStore.deletePassword("conn-1");
    expect(credStore.hasPassword("conn-1")).toBe(false);
    expect(credStore.getPassword("conn-1")).toBeUndefined();
  });

  it("handles multiple connections", () => {
    credStore.savePassword("conn-1", "pass-1");
    credStore.savePassword("conn-2", "pass-2");
    expect(credStore.getPassword("conn-1")).toBe("pass-1");
    expect(credStore.getPassword("conn-2")).toBe("pass-2");
  });

  it("overwrites existing password", () => {
    credStore.savePassword("conn-1", "old");
    credStore.savePassword("conn-1", "new");
    expect(credStore.getPassword("conn-1")).toBe("new");
  });
});
