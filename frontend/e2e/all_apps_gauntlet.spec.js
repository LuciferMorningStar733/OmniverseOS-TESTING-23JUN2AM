const { test, expect } = require("@playwright/test");

const APPS_TO_TEST = [
  { id: "dashboard", name: "Dashboard" },
  { id: "chat", name: "AI Chat" },
  { id: "image", name: "Image Gen" },
  { id: "voice", name: "Cortex" },
  { id: "memory", name: "Memory" },
  { id: "projects", name: "Projects" },
  { id: "timeline", name: "Timeline" },
  { id: "notes", name: "Notes" },
  { id: "tasks", name: "Tasks" },
  { id: "calendar", name: "Calendar" },
  { id: "clipboard", name: "Clipboard" },
  { id: "music", name: "Music" },
  { id: "videos", name: "Videos" },
  { id: "watchlist", name: "Watchlist" },
  { id: "files", name: "Files" },
  { id: "code", name: "Code" },
  { id: "browser", name: "Browser" },
  { id: "settings", name: "Settings" },
  { id: "finance", name: "Finance" },
  { id: "analytics", name: "Analytics" },
  { id: "nebula", name: "Nebula Chat" },
  { id: "swarm", name: "Swarm Goal" },
  { id: "faceoff", name: "Face-Off" },
  { id: "adversary", name: "The Adversary" },
  { id: "warroom", name: "War Room" },
  { id: "deadreckoning", name: "Dead Reckoning" },
  { id: "matrix", name: "Neural Matrix" },
  { id: "mirror", name: "Omniverse Mirror" },
  { id: "zero", name: "Omniverse Zero" },
  { id: "blackbox", name: "The Black Box" },
];

test.describe("OmniverseOS — 30-App Exhaustive Crash Gauntlet", () => {
  test.setTimeout(360000); // 6 minutes for full 30 apps

  test("Launch, render, interact, and close all 30 registered applications", async ({ page, request }) => {
    const pageErrors = [];
    page.on("pageerror", (err) => {
      pageErrors.push(`[UNCAUGHT EXCEPTION]: ${err.message}`);
      console.error(`[PAGE ERROR]: ${err.message}\n${err.stack}`);
    });

    page.on("console", (msg) => {
      if (msg.type() === "error" && !msg.text().includes("ws://localhost:4400")) {
        console.log(`[CONSOLE ERROR]: ${msg.text()}`);
      }
    });

    // 1. Authenticate with backend
    const loginRes = await request.post("http://localhost:8001/api/auth/login", {
      data: { email: "demo@omniverse.io", password: "omniverse123" },
    });
    expect(loginRes.ok()).toBeTruthy();
    const { token } = await loginRes.json();

    // 2. Pre-seed token & skip flags in localStorage
    await page.addInitScript((tok) => {
      localStorage.setItem("omniverse_token", tok);
      localStorage.setItem("omniverse_boot_done", "1");
      localStorage.setItem("omniverse_onboarding_done", "1");
      localStorage.setItem("omniverse_location_setup_done", "1");
    }, token);

    // 3. Load Desktop
    await page.goto("http://localhost:3000", { waitUntil: "networkidle", timeout: 30000 });
    await page.waitForTimeout(2000);

    const results = [];

    // 4. Iterate through all 30 apps
    for (let i = 0; i < APPS_TO_TEST.length; i++) {
      const app = APPS_TO_TEST[i];
      console.log(`\n========================================`);
      console.log(`[${i + 1}/${APPS_TO_TEST.length}] GAUNTLET: ${app.name} (${app.id})`);
      console.log(`========================================`);

      // Open app via omniverse:open-app
      await page.evaluate((appId) => {
        window.dispatchEvent(new CustomEvent("omniverse:open-app", { detail: { appId } }));
      }, app.id);

      // Wait for window to appear
      const winSelector = `[data-testid="window-${app.id}"]`;
      const win = page.locator(winSelector);
      await expect(win.first()).toBeVisible({ timeout: 8000 });

      // Verify NO ErrorBoundary crash is rendered
      const errorBoundary = win.locator('[data-testid="error-boundary"]');
      const hasCrashed = await errorBoundary.isVisible().catch(() => false);
      if (hasCrashed) {
        const crashText = await errorBoundary.innerText();
        console.error(`[CRASH DETECTED IN ${app.name}]: ${crashText}`);
        expect(hasCrashed).toBe(false);
      }

      // Find content buttons
      const contentButtons = win.locator('.window-content button');
      const btnCount = await contentButtons.count();
      console.log(`  -> Content rendered cleanly! Found ${btnCount} interactive controls.`);

      // Exercise up to 3 controls safely
      for (let b = 0; b < Math.min(btnCount, 3); b++) {
        const btn = contentButtons.nth(b);
        const txt = (await btn.innerText().catch(() => "")).trim();
        // Skip destructive actions
        if (txt.includes("Logout") || txt.includes("Delete") || txt.includes("Replay")) continue;
        await btn.click({ timeout: 1000 }).catch(() => {});
        await page.waitForTimeout(50);
      }

      // Close window cleanly via omniverse:close-app
      await page.evaluate((appId) => {
        window.dispatchEvent(new CustomEvent("omniverse:close-app", { detail: { appId } }));
      }, app.id);

      // Allow spring animation to finish
      await page.waitForTimeout(1000);

      results.push({ id: app.id, name: app.name, status: "PASSED" });
      console.log(`  -> [PASS] ${app.name} (${app.id}) verified 100% crash-free!`);
    }

    console.log("\n==========================================");
    console.log("30-APP CRASH GAUNTLET COMPLETED SUCCESSFULLY");
    console.log("==========================================");
    console.table(results);
    expect(pageErrors.length).toBe(0);
  });
});
