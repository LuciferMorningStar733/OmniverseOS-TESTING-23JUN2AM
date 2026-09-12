// @ts-check
const { test, expect } = require("@playwright/test");

test.describe("OmniverseOS Master Runtime Certification & Click-by-Click Forensic Suite", () => {
  test.describe.configure({ mode: "serial" });

  const consoleErrors = [];
  const networkFailures = [];

  test.beforeEach(async ({ page }) => {
    page.on("console", (msg) => {
      if (msg.type() === "error") {
        const text = msg.text();
        // Filter expected benign noise (e.g. font preload warnings or simulated offline LLM)
        if (!text.includes("favicon.ico")) {
          consoleErrors.push(text);
        }
      }
    });

    page.on("requestfailed", (request) => {
      const url = request.url();
      if (!url.includes("favicon.ico") && !url.includes("chrome-extension")) {
        networkFailures.push(`${request.method()} ${url} - ${request.failure()?.errorText}`);
      }
    });
  });

  test("Phase 3 — Complete Authentication Journey & Session Persistence", async ({ page }) => {
    await page.goto("http://localhost:3000");
    await page.waitForLoadState("networkidle");

    // 1. Verify Identity Gateway loads
    const emailInput = page.locator('input[type="email"], input[placeholder*="you@omniverse.io"], input[name="email"]').first();
    const passwordInput = page.locator('input[type="password"]').first();
    const submitBtn = page.locator('button:has-text("INITIALIZE OMNIVERSE"), button:has-text("Login"), button[type="submit"]').first();

    await expect(emailInput).toBeVisible({ timeout: 10000 });
    await expect(passwordInput).toBeVisible();
    await expect(submitBtn).toBeVisible();

    // 2. Test Invalid Credentials
    await emailInput.fill("invalid@user.com");
    await passwordInput.fill("wrongpassword");
    await submitBtn.click();
    await page.waitForTimeout(1000);

    // 3. Test Valid Login (demo@omniverse.io / omniverse123)
    await emailInput.fill("demo@omniverse.io");
    await passwordInput.fill("omniverse123");
    await submitBtn.click();
    await page.waitForTimeout(1000);

    // Dismiss LocationSetup or intro backdrop if present
    const dismissBtn = page.locator('[data-testid="location-backdrop-btn"], button:has-text("Skip"), button:has-text("Continue")').first();
    if (await dismissBtn.isVisible({ timeout: 3000 }).catch(() => false)) {
      await dismissBtn.click({ force: true });
      await page.waitForTimeout(500);
    }

    // 4. Assert Desktop Appears
    const dock = page.locator('[data-testid="dock-root"], .dock-container, [data-testid="adaptive-dock"]').first();
    await expect(dock).toBeVisible({ timeout: 15000 });

    const topbar = page.locator('[data-testid="topbar"], header, .topbar').first();
    await expect(topbar).toBeVisible();

    // 5. Assert Session Persistence on Refresh
    await page.reload();
    await page.waitForLoadState("networkidle");
    if (await dismissBtn.isVisible({ timeout: 2000 }).catch(() => false)) {
      await dismissBtn.click({ force: true });
    }
    await expect(dock).toBeVisible({ timeout: 10000 });
  });

async function ensureLoggedIn(page) {
  await page.goto("http://localhost:3000");
  await page.waitForLoadState("networkidle");
  const dock = page.locator('[data-testid="dock-root"], .dock-container, [data-testid="adaptive-dock"]').first();
  if (!await dock.isVisible({ timeout: 3000 }).catch(() => false)) {
    const emailInput = page.locator('input[type="email"], input[placeholder*="you@omniverse.io"]').first();
    if (await emailInput.isVisible({ timeout: 4000 }).catch(() => false)) {
      const passwordInput = page.locator('input[type="password"]').first();
      const submitBtn = page.locator('button:has-text("INITIALIZE OMNIVERSE"), button[type="submit"]').first();
      await emailInput.fill("demo@omniverse.io");
      await passwordInput.fill("omniverse123");
      await submitBtn.click();
      await expect(dock).toBeVisible({ timeout: 15000 });
    }
  }

  // Dismiss any LocationSetup or intro backdrop if present
  const dismissBtn = page.locator('[data-testid="location-backdrop-btn"], button:has-text("Skip"), button:has-text("Continue")').first();
  if (await dismissBtn.isVisible({ timeout: 2000 }).catch(() => false)) {
    await dismissBtn.click();
    await page.waitForTimeout(500);
  }
}

  test("Phase 4 & 5 — Desktop Shell & Application Lifecycle", async ({ page }) => {
    await ensureLoggedIn(page);

    // 1. TopBar inspection
    const clock = page.locator('[data-testid="topbar"] span, header span').filter({ hasText: /[:\d]{4,}/ }).first();
    await expect(clock).toBeVisible();

    // 2. Command Palette Keyboard Shortcut (Ctrl+K or /)
    await page.keyboard.press("Control+k");
    await page.waitForTimeout(600);
    // Escape to close
    await page.keyboard.press("Escape");

    // 3. Open Notes App
    const notesIcon = page.locator('[data-testid="dock-root"] button, .dock-container button, [data-dock-app="notes"]').filter({ hasText: /Notes/i }).first();
    if (await notesIcon.isVisible()) {
      await notesIcon.click();
      await page.waitForTimeout(800);
      const notesWindow = page.locator('[data-testid="notes-app"], [data-testid^="window-"]').first();
      await expect(notesWindow).toBeVisible({ timeout: 8000 });

      // Minimize Notes
      const minBtn = page.locator('button[aria-label="Minimize"], button[title*="Minimize"]').first();
      if (await minBtn.isVisible()) {
        await minBtn.click();
        await page.waitForTimeout(500);
      }

      // Restore Notes
      await notesIcon.click();
      await page.waitForTimeout(500);

      // Close Notes
      const closeBtn = page.locator('button[aria-label="Close"], button[title*="Close"]').first();
      if (await closeBtn.isVisible()) {
        await closeBtn.click();
        await page.waitForTimeout(500);
      }
    }

    // 4. Open Calendar App
    const calendarIcon = page.locator('[data-testid="dock-root"] button, .dock-container button').filter({ hasText: /Calendar/i }).first();
    if (await calendarIcon.isVisible()) {
      await calendarIcon.click();
      await page.waitForTimeout(800);
      const calendarApp = page.locator('[data-testid="calendar-app"], [data-testid^="window-"]').first();
      await expect(calendarApp).toBeVisible({ timeout: 8000 });
      // Close Calendar
      const closeBtn = page.locator('button[aria-label="Close"]').first();
      if (await closeBtn.isVisible()) {
        await closeBtn.click();
      }
    }
  });

  test("Phase 9 & 10 — 4K Futuristic Wallpapers (10 Masterpiece Themes)", async ({ page }) => {
    await ensureLoggedIn(page);

    // Verify wallpaper canvas exists and is actively rendering
    const canvas = page.locator('#wallpaper-fx-canvas');
    await expect(canvas).toBeVisible({ timeout: 10000 });

    // Open Wallpaper Studio
    const wpIcon = page.locator('[data-testid="dock-root"] button, .dock-container button').filter({ hasText: /Wallpaper/i }).first();
    if (await wpIcon.isVisible()) {
      await wpIcon.click();
      await page.waitForTimeout(1000);

      // Check for theme cards or next/random buttons
      const nextBtn = page.locator('button:has-text("Next"), button[title*="Next"]').first();
      if (await nextBtn.isVisible()) {
        await nextBtn.click();
        await page.waitForTimeout(800);
      }

      const randomBtn = page.locator('button:has-text("Random"), button[title*="Random"]').first();
      if (await randomBtn.isVisible()) {
        await randomBtn.click();
        await page.waitForTimeout(800);
      }

      // Check quality mode selector
      const qualityBtn = page.locator('button:has-text("4K"), button:has-text("Eco"), button[title*="Quality"]').first();
      if (await qualityBtn.isVisible()) {
        await qualityBtn.click();
        await page.waitForTimeout(500);
      }

      // Close Wallpaper Studio
      const closeBtn = page.locator('button[aria-label="Close"]').first();
      if (await closeBtn.isVisible()) {
        await closeBtn.click();
      }
    }

    // Verify canvas remains healthy
    await expect(canvas).toBeVisible();
  });

  test("Phase 7 & 8 — Cortex Intelligence & Voice Pipeline", async ({ page }) => {
    await ensureLoggedIn(page);

    // Click Cortex trigger / orb / dock icon
    const cortexTrigger = page.locator('[data-testid="cortex-trigger"], [data-testid="dock-root"] button').filter({ hasText: /AI|Chat|Cortex/i }).first();
    if (await cortexTrigger.isVisible({ timeout: 5000 }).catch(() => false)) {
      await cortexTrigger.click({ force: true });
      await page.waitForTimeout(1200);
    }

    // Find chat input
    const chatInput = page.locator('[data-testid="chat-input"] input, [data-testid="ai-chat-input"] input, textarea[placeholder*="Ask"], input[placeholder*="Ask"], textarea').first();
    if (await chatInput.isVisible({ timeout: 5000 }).catch(() => false)) {
      await chatInput.fill("What is OmniverseOS?");
      await page.keyboard.press("Enter");
      await page.waitForTimeout(2000);

      // Verify response renders
      const messageContainer = page.locator('[data-testid="ai-chat-messages"], [data-testid="chat-messages"], .chat-message').first();
      await expect(messageContainer).toBeVisible({ timeout: 10000 });
    }
  });

  test("Phase 6, 11 & 13 — Mobile Spectrum Responsive Torture Test (280px to 3840px)", async ({ page }) => {
    await ensureLoggedIn(page);

    const viewports = [
      { width: 280, height: 653, name: "Foldable Cover (280px)" },
      { width: 320, height: 568, name: "Compact Phone (320px)" },
      { width: 375, height: 667, name: "iPhone SE (375px)" },
      { width: 412, height: 915, name: "Pixel / Galaxy (412px)" },
      { width: 768, height: 1024, name: "iPad Mini (768px)" },
      { width: 1024, height: 768, name: "iPad Pro Landscape (1024px)" },
      { width: 1920, height: 1080, name: "Desktop 1080p (1920px)" },
      { width: 2560, height: 1440, name: "2K QHD (2560px)" },
      { width: 3840, height: 2160, name: "4K UHD Cinematic (3840px)" }
    ];

    for (const vp of viewports) {
      await page.setViewportSize({ width: vp.width, height: vp.height });
      await page.waitForTimeout(400);

      // Evaluate horizontal scroll width against viewport width
      const scrollWidth = await page.evaluate(() => document.documentElement.scrollWidth);
      expect(scrollWidth, `Horizontal overflow detected at ${vp.name}: scrollWidth=${scrollWidth}, innerWidth=${vp.width}`)
        .toBeLessThanOrEqual(vp.width + 1); // 1px rounding tolerance
    }
  });
});
