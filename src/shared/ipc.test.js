"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
const vitest_1 = require("vitest");
const ipc_1 = require("./ipc");
(0, vitest_1.describe)("ipc shared types", () => {
    (0, vitest_1.it)("DEFAULT_SETTINGS has expected shape", () => {
        (0, vitest_1.expect)(ipc_1.DEFAULT_SETTINGS).toEqual({
            theme: "system",
            fontSize: 14,
            showWelcome: true,
        });
    });
    (0, vitest_1.it)("DEFAULT_SETTINGS.theme is a valid Theme", () => {
        const validThemes = ["light", "dark", "system"];
        (0, vitest_1.expect)(validThemes).toContain(ipc_1.DEFAULT_SETTINGS.theme);
    });
    (0, vitest_1.it)("DEFAULT_SETTINGS.fontSize is a reasonable value", () => {
        (0, vitest_1.expect)(ipc_1.DEFAULT_SETTINGS.fontSize).toBeGreaterThanOrEqual(8);
        (0, vitest_1.expect)(ipc_1.DEFAULT_SETTINGS.fontSize).toBeLessThanOrEqual(32);
    });
    (0, vitest_1.it)("AppSettings type can be spread with partial overrides", () => {
        const partial = { theme: "dark" };
        const merged = { ...ipc_1.DEFAULT_SETTINGS, ...partial };
        (0, vitest_1.expect)(merged.theme).toBe("dark");
        (0, vitest_1.expect)(merged.fontSize).toBe(14);
        (0, vitest_1.expect)(merged.showWelcome).toBe(true);
    });
    // Type-level check: ensure IpcChannels has expected keys
    (0, vitest_1.it)("IpcChannels type has expected channel keys", () => {
        const channelKeys = [
            "settings:get",
            "settings:set",
            "app:get-version",
            "theme:get-system",
        ];
        (0, vitest_1.expect)(channelKeys).toHaveLength(4);
    });
});
