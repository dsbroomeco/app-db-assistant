import { test, expect, _electron as electron } from "@playwright/test";

/**
 * Smoke test: verify the Electron app launches and renders the main window.
 */
test("app launches and shows the main window", async () => {
  const app = await electron.launch({ args: ["."] });

  const window = await app.firstWindow();
  await window.waitForLoadState("domcontentloaded");

  const title = await window.title();
  expect(title).toBeTruthy();

  // The app should have a visible body
  const body = await window.locator("body");
  await expect(body).toBeVisible();

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
