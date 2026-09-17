const { test, expect } = require('@playwright/test');
const path = require('path');

const SCREENSHOTS_DIR = path.resolve(__dirname, '../../screenshots_audit');

test("Capture AI Chat and Image Gen Prompts", async ({ page }) => {
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
    localStorage.setItem('omniverse_windows', '[]');
  }, token);

  await page.goto('http://localhost:3000', { waitUntil: 'domcontentloaded' });
  await page.waitForTimeout(2000);

  // 1. OPEN AI CHAT & ASK QUESTION
  await page.evaluate(() => window.__omniverse_openApp?.('chat'));
  const chatWin = page.locator('[data-testid="window-chat"]');
  await expect(chatWin).toBeVisible({ timeout: 10000 });
  await page.waitForTimeout(1000);

  const input = chatWin.locator('[data-testid="chat-input"]').or(chatWin.locator('input[placeholder*="Message"]'));
  await expect(input.first()).toBeVisible({ timeout: 5000 });
  await input.first().fill("What is OmniverseOS and how does its neural architecture work?");
  await page.waitForTimeout(400);

  const sendBtn = chatWin.locator('[data-testid="chat-send"]').or(chatWin.locator('button:has(.fa-paper-plane)'));
  await sendBtn.first().dispatchEvent('click');
  await page.waitForTimeout(2500);

  await page.screenshot({ path: path.join(SCREENSHOTS_DIR, 'ai_01_chat_question_answered.png') });
  console.log('-> Captured: ai_01_chat_question_answered.png');

  await page.evaluate(() => window.__omniverse_closeApp?.('chat'));
  await page.waitForTimeout(600);

  // 2. OPEN IMAGE GEN & ENTER PROMPT
  await page.evaluate(() => window.__omniverse_openApp?.('image'));
  const imgWin = page.locator('[data-testid="window-image"]');
  await expect(imgWin).toBeVisible({ timeout: 10000 });
  await page.waitForTimeout(1000);

  const imgInput = imgWin.locator('input[type="text"]:visible, textarea:visible').first();
  if (await imgInput.isVisible()) {
    await imgInput.fill("Cyberpunk quantum terminal glowing in neon rain, octane render 8k");
    await page.waitForTimeout(400);
  }

  await page.screenshot({ path: path.join(SCREENSHOTS_DIR, 'ai_02_imagegen_prompt.png') });
  console.log('-> Captured: ai_02_imagegen_prompt.png');
});
