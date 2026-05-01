import { test, expect, _electron as electron } from "@playwright/test";

/**
 * Smoke test: verify the Electron app launches and renders the main window.
 */
test("app launches and shows the main window", async () => {
  const app = await electron.launch({ args: ["."] });

  const window = await app.firstWindow();
  await window.waitForLoadState("domcontentloaded");

  // The app should have a visible body
  const body = await window.locator("body");
  await expect(body).toBeVisible();

  // The renderer should mount the React root element.
  await expect(window.locator("#root")).toBeVisible();

  await app.close();
});

test("app window has expected minimum size", async () => {
  const app = await electron.launch({ args: ["."] });
  const window = await app.firstWindow();

  const { width, height } = await window.evaluate(() => ({
    width: window.innerWidth,
    height: window.innerHeight,
  }));

  expect(width).toBeGreaterThanOrEqual(800);
  expect(height).toBeGreaterThanOrEqual(500);

  await app.close();
});

test("tab switch unmounts inactive view content", async () => {
  const app = await electron.launch({ args: ["."] });
  const window = await app.firstWindow();
  // Wait for the full page load (JS bundles downloaded and executed)
  await window.waitForLoadState("load", { timeout: 30000 });
  // Wait for React to mount (#root must have children)
  await window.waitForFunction(
    () => (document.getElementById("root")?.children.length ?? 0) > 0,
    { timeout: 20000 },
  );

  const welcomeHeading = window.getByText("Welcome to DB Assistant");
  await expect(welcomeHeading).toBeVisible({ timeout: 10000 });

  await window.getByRole("button", { name: "New query tab" }).click();
  await expect(window.getByRole("tab", { name: /Query 1/ })).toBeVisible();

  // Inactive tab content should be removed from DOM, not just hidden.
  await expect(welcomeHeading).toHaveCount(0);

  await app.close();
});
