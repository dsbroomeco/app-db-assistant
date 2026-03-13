import { describe, it, expect } from "vitest";
import {
  DEFAULT_SETTINGS,
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
      "dialog:open-file",
    ];
    expect(channelKeys).toHaveLength(17);
  });
});
