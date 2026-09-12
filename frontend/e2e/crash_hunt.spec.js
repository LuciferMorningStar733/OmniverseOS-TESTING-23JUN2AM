const { test, expect } = require("@playwright/test");

test.describe("OmniverseOS Crash Hunt & Error #130 Forensics", () => {
  test("Open Settings App and capture any React error #130 or runtime exception", async ({ page, request }) => {
    const consoleMessages = [];
    const pageErrors = [];

    page.on("console", async (msg) => {
      consoleMessages.push({ type: msg.type(), text: msg.text() });
      if (msg.type() === "error") {
        const args = await Promise.all(msg.args().map((a) => a.jsonValue().catch(() => a.toString())));
        console.log(`[BROWSER ERROR ARGS]:`, JSON.stringify(args, null, 2));
      }
    });

    page.on("pageerror", (err) => {
      pageErrors.push(err);
      console.log(`[PAGE UNCAUGHT ERROR]: ${err.message}\n${err.stack}`);
    });

    // Obtain auth token from backend
    const loginRes = await request.post("http://localhost:8001/api/auth/login", {
      data: { email: "demo@omniverse.io", password: "omniverse123" },
    });
    expect(loginRes.ok()).toBeTruthy();
    const { token } = await loginRes.json();
    console.log("Logged in successfully, token received.");

    // Set token in localStorage before page loads
    await page.addInitScript((tok) => {
      localStorage.setItem("omniverse_token", tok);
      localStorage.setItem("omniverse_boot_done", "1");
      localStorage.setItem("omniverse_onboarding_done", "1");
      localStorage.setItem("omniverse_location_setup_done", "1");
    }, token);

    console.log("Navigating to http://localhost:3000...");
    await page.goto("http://localhost:3000", { waitUntil: "networkidle", timeout: 30000 });

    // Wait for Desktop to mount
    await page.waitForTimeout(2000);

    // Verify desktop is rendered
    const desktopEl = page.locator('[data-testid="desktop-wallpaper"], [data-testid="dock"], .desktop-shell');
    console.log("Opening Settings app via custom event omniverse:open-app...");
    await page.evaluate(() => {
      window.dispatchEvent(new CustomEvent("omniverse:open-app", { detail: { appId: "settings" } }));
    });

    // Wait for window to render
    await page.waitForTimeout(3000);

    // Check if error boundary is rendered
    const errorBoundary = page.locator('[data-testid="error-boundary"]');
    const isErrorRendered = await errorBoundary.isVisible().catch(() => false);
    if (isErrorRendered) {
      const errorText = await errorBoundary.innerText();
      console.log(`!!! CRASH DETECTED IN ERROR BOUNDARY: !!!\n${errorText}`);
    }

    // Check if Settings window content is visible
    const settingsApp = page.locator('[data-testid="settings-app"]');
    const isSettingsVisible = await settingsApp.isVisible().catch(() => false);
    console.log(`Settings app container visible: ${isSettingsVisible}`);

    // If Settings is visible, let's scroll and click all buttons/toggles
    if (isSettingsVisible) {
      console.log("Settings is rendered! Interacting with Settings controls...");
      const buttons = settingsApp.locator("button");
      const btnCount = await buttons.count();
      console.log(`Found ${btnCount} buttons in Settings.`);
      for (let i = 0; i < Math.min(btnCount, 15); i++) {
        const btn = buttons.nth(i);
        const text = (await btn.innerText().catch(() => "")).trim();
        // Skip dangerous buttons like Logout or Replay Boot
        if (text.includes("Logout") || text.includes("Replay Boot")) continue;
        await btn.click({ timeout: 1000 }).catch(() => {});
        await page.waitForTimeout(100);
      }
    }

    // Capture screenshot
    await page.screenshot({ path: "e2e-settings-verification.png" });

    console.log(`Total console messages: ${consoleMessages.length}`);
    console.log(`Total page errors: ${pageErrors.length}`);

    expect(pageErrors.length).toBe(0);
    expect(isErrorRendered).toBe(false);
    expect(isSettingsVisible).toBe(true);
  });
});
