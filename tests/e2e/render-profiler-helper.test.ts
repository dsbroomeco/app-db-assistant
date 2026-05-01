import { test, expect, _electron as electron } from "@playwright/test";
import os from "node:os";
import path from "node:path";

const PROFILE_DB = {
  sqlitePath:
    process.env.PROFILE_DB_SQLITE_PATH ??
    path.resolve(os.tmpdir(), "dba-profile-helper.sqlite"),
  schema: process.env.PROFILE_DB_SCHEMA ?? "main",
  table: process.env.PROFILE_DB_TABLE ?? "products",
};

test.describe("render profiler helper", () => {
  test("captures summary after basic interaction", async () => {
    test.skip(
      !process.env.RUN_PROFILER_HELPER_E2E,
      "Set RUN_PROFILER_HELPER_E2E=true to run this manual profiling helper.",
    );

    const app = await electron.launch({
      args: ["."],
      env: {
        ...process.env,
        DBA_RENDER_PROFILER: "true",
      },
    });

    const window = await app.firstWindow();
    await window.waitForLoadState("domcontentloaded");

    await expect(window.locator("#root")).toBeVisible();

    const profilerReady = await window.evaluate(() => {
      return Boolean(window.__DBA_RENDER_PROFILER__);
    });
    expect(profilerReady).toBe(true);

    await window.getByRole("button", { name: "New query tab" }).click();
    await expect(window.getByRole("tab", { name: /Query 1/ })).toBeVisible();

    const summary = await window.evaluate(() => {
      const api = window.__DBA_RENDER_PROFILER__;
      if (!api) return [];
      return api.summary();
    });

    expect(Array.isArray(summary)).toBe(true);
    expect(summary.length).toBeGreaterThan(0);
    expect(summary.some((entry: { id: string }) => entry.id === "AppRoot")).toBe(true);

    // Keep this as a helper output for manual optimization passes.
    console.log("RENDER_PROFILER_SUMMARY", JSON.stringify(summary.slice(0, 10), null, 2));

    await app.close();
  });

  test("captures summary for DB table interaction flow", async () => {
    test.skip(
      !process.env.RUN_PROFILER_HELPER_DB_E2E,
      "Set RUN_PROFILER_HELPER_DB_E2E=true to run DB-backed profiling helper scenario.",
    );

    const connectionName = `Profiler PG ${Date.now()}`;
    const connectionId = `profiler-pg-${Date.now()}`;

    // Bootstrap a saved connection via IPC so the UI interaction path is deterministic.
    const bootstrapApp = await electron.launch({
      args: ["."],
      env: {
        ...process.env,
        DBA_RENDER_PROFILER: "true",
      },
    });

    try {
      const bootstrapWindow = await bootstrapApp.firstWindow();
      await bootstrapWindow.waitForLoadState("domcontentloaded");

      await bootstrapWindow.evaluate(
        async ({ profileDb, name, id }) => {
          await window.electronAPI.invoke("conn:save", {
            config: {
              id,
              name,
              type: "sqlite",
              host: "",
              port: 0,
              database: "",
              username: "",
              ssl: false,
              sslRejectUnauthorized: false,
              filepath: profileDb.sqlitePath,
              connectionTimeout: 15000,
              poolSize: 5,
              sshEnabled: false,
              sshHost: "",
              sshPort: 22,
              sshUsername: "",
              sshPrivateKeyPath: "",
              sshAuthMethod: "password",
            },
          });

          await window.electronAPI.invoke("conn:connect", id);
          await window.electronAPI.invoke("query:execute", {
            connectionId: id,
            sql: `
              CREATE TABLE IF NOT EXISTS products (
                id INTEGER PRIMARY KEY,
                name TEXT NOT NULL,
                price REAL NOT NULL,
                stock INTEGER NOT NULL
              );
            `,
          });
          await window.electronAPI.invoke("query:execute", {
            connectionId: id,
            sql: "DELETE FROM products;",
          });
          await window.electronAPI.invoke("query:execute", {
            connectionId: id,
            sql: `
              INSERT INTO products (name, price, stock)
              VALUES
                ('Profiler Widget', 19.99, 42),
                ('Profiler Gadget', 29.99, 17),
                ('Profiler Cable', 9.99, 128);
            `,
          });
          await window.electronAPI.invoke("conn:disconnect", id);
        },
        { profileDb: PROFILE_DB, name: connectionName, id: connectionId },
      );
    } finally {
      await bootstrapApp.close();
    }

    const app = await electron.launch({
      args: ["."],
      env: {
        ...process.env,
        DBA_RENDER_PROFILER: "true",
      },
    });

    try {
      const window = await app.firstWindow();
      await window.waitForLoadState("domcontentloaded");
      await expect(window.locator("#root")).toBeVisible();

      const connRow = window.getByRole("listitem").filter({ hasText: connectionName });
      await expect(connRow).toBeVisible({ timeout: 15_000 });

      await connRow.locator('button[title="Connect"]').click();

      const tree = window.getByRole("tree", { name: `${connectionName} database tree` });
      await expect(tree).toBeVisible();

      await tree.getByRole("treeitem").first().click();
      await tree.getByText(PROFILE_DB.schema, { exact: true }).click();
      await tree.getByText(PROFILE_DB.table, { exact: true }).click();

      await expect(
        window
          .getByRole("region", { name: "Active view" })
          .getByText(`${PROFILE_DB.schema}.${PROFILE_DB.table}`),
      ).toBeVisible();

      const rows = window.locator("tbody tr");
      await expect(rows.first()).toBeVisible();

      // Edit one cell to capture edit/render cost in this helper scenario.
      const firstDataCell = rows.nth(0).locator("td").nth(2);
      await firstDataCell.dblclick();
      await window.locator('input[class*="cellInput"]').fill("profiler-edit-temp");
      await window.locator('input[class*="cellInput"]').press("Enter");

      // Multi-select rows and then switch tabs.
      await rows.nth(0).click();
      await rows.nth(1).click({ modifiers: ["Shift"] });
      await expect(window.getByText("2 selected")).toBeVisible();

      await window.getByRole("button", { name: "New query tab" }).click();
      await expect(window.getByRole("tab", { name: /Query 1/ })).toBeVisible();

      const summary = await window.evaluate(() => {
        const api = window.__DBA_RENDER_PROFILER__;
        if (!api) return [];
        return api.summary();
      });

      expect(summary.length).toBeGreaterThan(0);
      expect(summary.some((entry: { id: string }) => entry.id === "TableDataView")).toBe(true);

      console.log("RENDER_PROFILER_DB_SUMMARY", JSON.stringify(summary.slice(0, 10), null, 2));
    } finally {
      try {
        const window = await app.firstWindow();
        await window.evaluate(async (id) => {
          await window.electronAPI.invoke("conn:delete", id);
        }, connectionId);
      } catch {
        // Ignore cleanup errors in helper-mode tests.
      }
      await app.close();
    }
  });
});
