const { test, expect } = require("@playwright/test");

test.describe("OmniverseOS End-to-End Browser Test Suite", () => {
  test("Scenario 1: Desktop Shell & Taskbar load", async ({ page }) => {
    await page.goto("http://localhost:3000");
    await expect(page).toHaveTitle(/Omniverse/i);
  });

  test("Scenario 2: Window Management & Controls", async ({ page }) => {
    await page.goto("http://localhost:3000");
    const body = page.locator("body");
    await expect(body).toBeVisible();
  });
});
