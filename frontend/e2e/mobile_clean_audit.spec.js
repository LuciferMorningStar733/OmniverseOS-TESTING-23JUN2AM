const { test, expect } = require('@playwright/test');
const path = require('path');

const CLEAN_DIR = path.resolve(__dirname, '../../screenshots_clean');

test.use({
  viewport: { width: 412, height: 915 },
  isMobile: true,
  hasTouch: true,
  userAgent: 'Mozilla/5.0 (Linux; Android 13; SM-G991B) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/118.0.0.0 Mobile Safari/537.36',
});

test("Clean Samsung One UI Mobile Experience & Touch Audit", async ({ page }) => {
  // 1. Authenticate with local backend
  const authRes = await page.request.post('http://127.0.0.1:8001/api/auth/login', {
    data: { email: 'demo@omniverse.io', password: 'omniverse123' },
  });
  expect(authRes.ok()).toBeTruthy();
  const { token } = await authRes.json();

  await page.addInitScript((tok) => {
    localStorage.setItem('omniverse_token', tok);
    localStorage.setItem('omniverse_boot_done', '1');
    localStorage.setItem('omniverse_onboarding_done', '1');
    localStorage.setItem('omniverse_location_setup_done', '1');
    localStorage.setItem('omniverse_windows', JSON.stringify([{ id: 'm1', app: 'chat', minimized: true, x: 0, y: 0, w: 100, h: 100, z: 100 }]));
  }, token);

  await page.goto('http://localhost:3000', { waitUntil: 'domcontentloaded' });
  await page.waitForTimeout(2500);

  // 2. Verify NO Reticle bridge failure overlay is present
  const reticleOverlays = page.locator('[id*="reticle"], [class*="reticle-overlay"], div:has-text("bridge connection failed")');
  const overlayCount = await reticleOverlays.count();
  console.log(`-> Reticle error overlay count: ${overlayCount}`);
  expect(overlayCount).toBe(0);

  // 3. CAPTURE CLEAN MOBILE HOME SCREEN
  const homeScreen = page.locator('div:has-text("Good Morning"), div:has-text("Good Afternoon"), div:has-text("Good Evening")').first();
  await expect(homeScreen).toBeVisible({ timeout: 10000 });
  await page.screenshot({ path: path.join(CLEAN_DIR, 'mobile_01_oneui_home.png') });
  console.log('-> Captured: mobile_01_oneui_home.png');

  // 4. TEST TOUCH SCROLLING ON WIDGETS SHELF
  await page.mouse.wheel(0, 400);
  await page.waitForTimeout(600);
  await page.screenshot({ path: path.join(CLEAN_DIR, 'mobile_02_widget_shelf_scrolled.png') });
  console.log('-> Captured: mobile_02_widget_shelf_scrolled.png');
  await page.mouse.wheel(0, -400);
  await page.waitForTimeout(400);

  // 5. TEST MOBILE AI CHAT VIA CORTEX PILL / DOCK
  // Tap Cortex Pill or trigger mobile chat
  const cortexPill = page.locator('div:has-text("Ask Cortex"), button:has-text("Cortex"), div:has-text("Ask Omniverse")').first();
  if (await cortexPill.isVisible()) {
    await cortexPill.tap();
  } else {
    await page.evaluate(() => window.__omniverse_openApp?.('chat'));
  }
  await page.waitForTimeout(1000);

  // Focus mobile composer
  const chatInput = page.locator('input[placeholder*="Ask"], input[placeholder*="Message"], textarea').first();
  if (await chatInput.isVisible()) {
    await chatInput.tap();
    await chatInput.fill('Explain quantum decoherence simply.');
    await page.waitForTimeout(400);

    const sendBtn = page.locator('button:has(.fa-paper-plane), button:has-text("Send"), [data-testid="chat-send"]').first();
    if (await sendBtn.isVisible()) {
      await sendBtn.tap();
      await page.waitForTimeout(2000);
    }
  }
  await page.screenshot({ path: path.join(CLEAN_DIR, 'mobile_03_ai_chat_streaming.png') });
  console.log('-> Captured: mobile_03_ai_chat_streaming.png');

  // Close chat to return to home screen
  await page.evaluate(() => {
    window.__omniverse_closeApp?.('chat');
    // If modal chat is open, click close or dismiss
    const closeBtn = document.querySelector('button[aria-label="Close"], button:has(.fa-xmark)');
    if (closeBtn) closeBtn.click();
  });
  await page.waitForTimeout(800);

  // 6. TEST NOTES APP ON MOBILE
  await page.evaluate(() => window.__omniverse_openApp?.('notes'));
  await page.waitForTimeout(1200);

  const notesWin = page.locator('[data-testid="window-notes"], [data-testid="notes-app"]').first();
  const notesTextarea = page.locator('textarea').first();
  if (await notesTextarea.isVisible()) {
    await notesTextarea.tap();
    await notesTextarea.fill('Project Orion Sprint Note:\nMobile touch interactions and One UI verified.');
    await page.waitForTimeout(500);
  }
  await page.screenshot({ path: path.join(CLEAN_DIR, 'mobile_04_notes_touch_typing.png') });
  console.log('-> Captured: mobile_04_notes_touch_typing.png');

  await page.evaluate(() => window.__omniverse_closeApp?.('notes'));
  await page.waitForTimeout(800);

  // 7. TEST TASKS APP ON MOBILE
  await page.evaluate(() => window.__omniverse_openApp?.('tasks'));
  await page.waitForTimeout(1200);

  const taskInput = page.locator('input[placeholder*="task"], input[placeholder*="Task"], input[type="text"]').first();
  if (await taskInput.isVisible()) {
    await taskInput.tap();
    await taskInput.fill('Verify One UI Ergonomics');
    await page.keyboard.press('Enter');
    await page.waitForTimeout(600);
  }
  await page.screenshot({ path: path.join(CLEAN_DIR, 'mobile_05_tasks_touch_toggle.png') });
  console.log('-> Captured: mobile_05_tasks_touch_toggle.png');

  await page.evaluate(() => window.__omniverse_closeApp?.('tasks'));
  await page.waitForTimeout(800);

  // 8. TEST CALENDAR APP ON MOBILE
  await page.evaluate(() => window.__omniverse_openApp?.('calendar'));
  await page.waitForTimeout(1200);
  await page.screenshot({ path: path.join(CLEAN_DIR, 'mobile_06_calendar_mobile.png') });
  console.log('-> Captured: mobile_06_calendar_mobile.png');

  await page.evaluate(() => window.__omniverse_closeApp?.('calendar'));
  await page.waitForTimeout(500);
});
