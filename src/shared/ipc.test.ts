import { describe, it, expect } from "vitest";
import {
  DEFAULT_SETTINGS,
  DEFAULT_SHORTCUTS,
  type AppSettings,
  type Theme,
  type IpcChannels,
} from "./ipc";

describe("ipc shared types", () => {
  it("DEFAULT_SETTINGS has expected shape", () => {
    expect(DEFAULT_SETTINGS).toEqual({
      theme: "system",
      fontSize: 14,
      showWelcome: true,
    });
  });

  it("DEFAULT_SETTINGS.theme is a valid Theme", () => {
    const validThemes: Theme[] = ["light", "dark", "system"];
    expect(validThemes).toContain(DEFAULT_SETTINGS.theme);
  });

  it("DEFAULT_SETTINGS.fontSize is a reasonable value", () => {
    expect(DEFAULT_SETTINGS.fontSize).toBeGreaterThanOrEqual(8);
    expect(DEFAULT_SETTINGS.fontSize).toBeLessThanOrEqual(32);
  });

  it("AppSettings type can be spread with partial overrides", () => {
    const partial: Partial<AppSettings> = { theme: "dark" };
    const merged: AppSettings = { ...DEFAULT_SETTINGS, ...partial };
    expect(merged.theme).toBe("dark");
    expect(merged.fontSize).toBe(14);
    expect(merged.showWelcome).toBe(true);
  });

  // Type-level check: ensure IpcChannels has expected keys
  it("IpcChannels type has expected channel keys", () => {
    const channelKeys: (keyof IpcChannels)[] = [
      "settings:get",
      "settings:set",
      "app:get-version",
      "theme:get-system",
      "conn:list",
      "conn:save",
      "conn:delete",
      "conn:test",
      "conn:connect",
      "conn:disconnect",
      "conn:statuses",
      "db:schemas",
      "db:tables",
      "db:table-structure",
      "db:routines",
      "db:table-data",
      "query:execute",
      "query:explain",
      "query:history",
      "query:history:clear",
      "query:completions",
      "crud:insert-row",
      "crud:update-row",
      "crud:delete-rows",
      "crud:get-primary-keys",
      "dialog:open-file",
      "dialog:save-file",
      "file:write",
      "mongo:databases",
      "mongo:collections",
      "mongo:find",
      "mongo:insert",
      "mongo:update",
      "mongo:delete",
      "mongo:aggregate",
      "redis:scan",
      "redis:get",
      "redis:set",
      "redis:delete",
      "redis:command",
      "import:preview",
      "import:execute",
      "schema:diff",
      "queries:list",
      "queries:save",
      "queries:delete",
      "shortcuts:get",
      "shortcuts:set",
      "shortcuts:reset",
    ];
    expect(channelKeys).toHaveLength(49);
  });

  it("DEFAULT_SHORTCUTS is re-exported from ipc", () => {
    expect(DEFAULT_SHORTCUTS).toBeDefined();
    expect(DEFAULT_SHORTCUTS.length).toBeGreaterThan(0);
  });
});
