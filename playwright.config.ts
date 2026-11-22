import { defineConfig } from "@playwright/test";

// Ensure Electron launches as Electron (not Node) when tests run from Electron-based IDEs.
delete process.env.ELECTRON_RUN_AS_NODE;

export default defineConfig({
  testDir: "./tests/e2e",
  testMatch: "**/*.test.ts",
  fullyParallel: true,
  forbidOnly: !!process.env.CI,
  retries: process.env.CI ? 2 : 0,
  workers: process.env.CI ? 1 : undefined,
  webServer: {
    command: "npm run dev:renderer",
    url: "http://localhost:5173",
    reuseExistingServer: !process.env.CI,
    timeout: 120_000,
  },
});