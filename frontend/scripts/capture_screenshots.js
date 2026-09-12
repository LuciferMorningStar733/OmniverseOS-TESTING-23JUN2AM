const { chromium } = require("@playwright/test");

(async () => {
  const browser = await chromium.launch({ channel: "chrome", headless: true });
  const context = await browser.newContext();
  const page = await context.newPage();

  console.log("Navigating to http://localhost:3000...");
  await page.goto("http://localhost:3000");
  await page.waitForLoadState("networkidle");

  const email = page.locator('input[type="email"]').first();
  if (await email.isVisible()) {
    console.log("Entering demo login credentials...");
    await email.fill("demo@omniverse.io");
    await page.locator('input[type="password"]').first().fill("omniverse123");
    await page.locator('button:has-text("INITIALIZE OMNIVERSE")').first().click();
    await page.waitForTimeout(3500);
  }

  const dismiss = page.locator('[data-testid="location-backdrop-btn"], button:has-text("Skip")').first();
  if (await dismiss.isVisible({ timeout: 2000 }).catch(() => false)) {
    await dismiss.click();
    await page.waitForTimeout(800);
  }

  // 1. Desktop 4K (3840x2160)
  console.log("Capturing 4K Cinematic screenshot (3840x2160)...");
  await page.setViewportSize({ width: 3840, height: 2160 });
  await page.waitForTimeout(1000);
  await page.screenshot({ path: "../runtime_desktop_4k.png" });

  // 2. Tablet 768px (768x1024)
  console.log("Capturing iPad Tablet screenshot (768x1024)...");
  await page.setViewportSize({ width: 768, height: 1024 });
  await page.waitForTimeout(800);
  await page.screenshot({ path: "../runtime_tablet_768px.png" });

  // 3. Mobile 375px (375x667)
  console.log("Capturing Mobile iPhone screenshot (375x667)...");
  await page.setViewportSize({ width: 375, height: 667 });
  await page.waitForTimeout(800);
  await page.screenshot({ path: "../runtime_mobile_375px.png" });

  // 4. Foldable 280px (280x653)
  console.log("Capturing Foldable Cover screen screenshot (280x653)...");
  await page.setViewportSize({ width: 280, height: 653 });
  await page.waitForTimeout(800);
  await page.screenshot({ path: "../runtime_foldable_280px.png" });

  await browser.close();
  console.log("ALL_SCREENSHOTS_SAVED_SUCCESSFULLY");
})();
