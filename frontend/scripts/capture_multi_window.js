const { chromium } = require("@playwright/test");

(async () => {
  const browser = await chromium.launch({ channel: "chrome", headless: true });
  const context = await browser.newContext({ viewport: { width: 1920, height: 1080 } });
  const page = await context.newPage();

  console.log("Navigating to http://localhost:3000...");
  await page.goto("http://localhost:3000");
  await page.waitForLoadState("networkidle");

  const email = page.locator('input[type="email"]').first();
  if (await email.isVisible()) {
    await email.fill("demo@omniverse.io");
    await page.locator('input[type="password"]').first().fill("omniverse123");
    await page.locator('button:has-text("INITIALIZE OMNIVERSE")').first().click();
    await page.waitForTimeout(3000);
  }

  // Dismiss location setup first
  const dismissLoc = page.locator('[data-testid="location-backdrop-btn"], button:has-text("Skip for now")').first();
  if (await dismissLoc.isVisible({ timeout: 4000 }).catch(() => false)) {
    await dismissLoc.click({ force: true });
    await page.waitForTimeout(800);
  }

  // Dismiss greeting dialog
  const dismissGreet = page.locator('button:has-text("Dismiss")').first();
  if (await dismissGreet.isVisible({ timeout: 3000 }).catch(() => false)) {
    await dismissGreet.click({ force: true });
    await page.waitForTimeout(800);
  }

  // Open Dock apps
  console.log("Opening Dock apps for multi-window verification...");
  const dockButtons = page.locator('[data-testid="dock-root"] button, .dock-container button');
  const count = await dockButtons.count();
  console.log(`Found ${count} dock buttons`);
  if (count > 0) {
    await dockButtons.nth(0).click(); // First dock app (Notes)
    await page.waitForTimeout(1000);
  }
  if (count > 3) {
    await dockButtons.nth(3).click(); // Fourth dock app (Wallpaper Studio)
    await page.waitForTimeout(1200);
  }

  // Capture multi-window screenshot
  console.log("Capturing multi-window desktop screenshot...");
  await page.waitForTimeout(1500);
  await page.screenshot({ path: "../runtime_multi_window_desktop.png" });

  await browser.close();
  console.log("MULTI_WINDOW_SCREENSHOT_CAPTURED");
})();
