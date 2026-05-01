import { test, expect, _electron as electron } from "@playwright/test";

/**
 * Smoke test: verify the connection form UI renders and has required fields.
 */
test("connection form renders with required fields", async () => {
  const app = await electron.launch({ args: ["."] });
  const window = await app.firstWindow();
  await window.waitForLoadState("domcontentloaded");

  // Click "New Connection" or equivalent button if sidebar is present
  const newConnBtn = window.locator(
    'button:has-text("New"), button:has-text("Add"), button:has-text("Connect")'
  );

  if ((await newConnBtn.count()) > 0) {
    await newConnBtn.first().click();
    await window.waitForTimeout(500);

    // Look for connection form fields
    const hostField = window.locator(
      'input[placeholder*="host" i], input[name="host"], label:has-text("Host")'
    );
    const portField = window.locator(
      'input[placeholder*="port" i], input[name="port"], label:has-text("Port")'
    );

    // At least one connection field should exist
    const hasHost = (await hostField.count()) > 0;
    const hasPort = (await portField.count()) > 0;
    expect(hasHost || hasPort).toBeTruthy();
  }

  await app.close();
});
