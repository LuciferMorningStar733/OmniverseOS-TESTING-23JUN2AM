const { test, expect } = require('@playwright/test');
const path = require('path');

const EVIDENCE_DIR = path.resolve(__dirname, '../../OMNIVERSEOS_VISUAL_EVIDENCE');

test("Capture Visual Defects Before Repair", async ({ page }) => {
  // 1. Authenticate
  const authRes = await page.request.post('http://127.0.0.1:8001/api/auth/login', {
    data: { email: 'demo@omniverse.io', password: 'omniverse123' },
  });
  expect(authRes.ok()).toBeTruthy();
  const { token } = await authRes.json();

  const setupMobileStorage = async (minimized = true) => {
    await page.addInitScript((tok) => {
      localStorage.setItem('omniverse_token', tok);
      localStorage.setItem('omniverse_has_booted', '1');
      localStorage.setItem('omniverse_location_setup_done', '1');
      localStorage.setItem('omniverse_city', 'San Francisco');
      localStorage.setItem('omniverse_onboarding_v1_done', '1');
      localStorage.setItem('omniverse_windows', JSON.stringify([{ id: 'm1', app: 'chat', minimized: true, x: 0, y: 0, w: 100, h: 100, z: 100 }]));
    }, token);
  };

  // -------------------------------------------------------------
  // TEST 1: MOB-001 & MOB-002 — Mobile Home Header & Dock Collision (412 × 915)
  // -------------------------------------------------------------
  await page.setViewportSize({ width: 412, height: 915 });
  await setupMobileStorage(true);
  await page.goto('http://localhost:3000', { waitUntil: 'domcontentloaded' });
  await page.waitForTimeout(2500);

  // Check collision between TopBar and MobileHomeScreen Header
  const topBar = page.locator('[data-testid="topbar"]');
  const homeScreen = page.locator('[data-testid="mobile-home-screen"]');
  await expect(topBar).toBeVisible();
  await expect(homeScreen).toBeVisible();

  // Inspect Bounding Boxes
  const topBarBox = await topBar.boundingBox();
  const headerText = page.locator('div:has-text("One UI · Cortex Core")').first();
  const headerTextBox = await headerText.boundingBox();

  console.log('TopBar Bounding Box:', topBarBox);
  console.log('MobileHomeScreen Header Bounding Box:', headerTextBox);

  // Capture MOB-001 BEFORE
  await page.screenshot({ path: path.join(EVIDENCE_DIR, 'MOB-001_before_412x915.png') });
  console.log('-> Captured: MOB-001_before_412x915.png');

  // Check collision between CortexPill and MobileDock / MobileSmartDock
  const cortexPill = page.locator('[data-testid="cortex-pill-container"]');
  const mobileDock = page.locator('[data-testid="dock-root"]');
  const smartDock = page.locator('[data-testid="mobile-smart-dock"]');

  const pillBox = await cortexPill.boundingBox();
  const dockBox = await mobileDock.boundingBox();
  console.log('Cortex Pill Bounding Box:', pillBox);
  console.log('MobileDock Bounding Box:', dockBox);

  // Capture MOB-002 BEFORE
  await page.screenshot({ path: path.join(EVIDENCE_DIR, 'MOB-002_before_412x915.png') });
  console.log('-> Captured: MOB-002_before_412x915.png');

  // -------------------------------------------------------------
  // TEST 2: MOB-003 — FileManager fixed 224px sidebar on mobile (360 × 800)
  // -------------------------------------------------------------
  await page.setViewportSize({ width: 360, height: 800 });
  await page.evaluate(() => window.__omniverse_openApp?.('files'));
  await page.waitForTimeout(1500);

  const filesApp = page.locator('[data-testid="files-app"]');
  await expect(filesApp).toBeVisible();
  await page.screenshot({ path: path.join(EVIDENCE_DIR, 'MOB-003_before_360x800.png') });
  console.log('-> Captured: MOB-003_before_360x800.png');
  await page.evaluate(() => window.__omniverse_closeApp?.('files'));
  await page.waitForTimeout(600);

  // -------------------------------------------------------------
  // TEST 3: MOB-004 — MobileAppDrawer 4-column icon squeeze (280 × 653)
  // -------------------------------------------------------------
  await page.setViewportSize({ width: 280, height: 653 });
  // Open app drawer via drawer button or state
  const drawerTrigger = page.locator('div:has-text("Apps"), div:has-text("App Library"), [data-testid="mobile-smart-dock"] > div:last-child').first();
  if (await drawerTrigger.isVisible()) {
    await drawerTrigger.click();
    await page.waitForTimeout(1000);
    await page.screenshot({ path: path.join(EVIDENCE_DIR, 'MOB-004_before_280x653.png') });
    console.log('-> Captured: MOB-004_before_280x653.png');
    const closeDrawer = page.locator('button:has(.fa-xmark)').first();
    if (await closeDrawer.isVisible()) await closeDrawer.click();
  } else {
    await page.screenshot({ path: path.join(EVIDENCE_DIR, 'MOB-004_before_280x653.png') });
  }

  // -------------------------------------------------------------
  // TEST 4: MOB-005 — MobileAIChat safe-area composer check (390 × 844)
  // -------------------------------------------------------------
  await page.setViewportSize({ width: 390, height: 844 });
  const openChatPill = page.locator('[data-testid="cortex-pill-container"]').first();
  if (await openChatPill.isVisible()) {
    await openChatPill.click();
  } else {
    await page.evaluate(() => window.__omniverse_openApp?.('chat'));
  }
  await page.waitForTimeout(1500);
  await page.screenshot({ path: path.join(EVIDENCE_DIR, 'MOB-005_before_390x844.png') });
  console.log('-> Captured: MOB-005_before_390x844.png');
  await page.evaluate(() => {
    window.__omniverse_closeApp?.('chat');
    const closeBtn = document.querySelector('button[aria-label="Close"], button:has(.fa-xmark)');
    if (closeBtn) closeBtn.click();
  });
  await page.waitForTimeout(600);

  // -------------------------------------------------------------
  // TEST 5: MOB-006 — PhotosApp fixed sidebar on mobile (375 × 812)
  // -------------------------------------------------------------
  await page.setViewportSize({ width: 375, height: 812 });
  await page.evaluate(() => window.__omniverse_openApp?.('photos'));
  await page.waitForTimeout(1500);
  await page.screenshot({ path: path.join(EVIDENCE_DIR, 'MOB-006_before_375x812.png') });
  console.log('-> Captured: MOB-006_before_375x812.png');
  await page.evaluate(() => window.__omniverse_closeApp?.('photos'));
  await page.waitForTimeout(600);
});
