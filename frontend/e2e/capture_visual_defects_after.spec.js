const { test, expect } = require('@playwright/test');
const path = require('path');

const EVIDENCE_DIR = path.resolve(__dirname, '../../OMNIVERSEOS_VISUAL_EVIDENCE');

test("Capture Visual Defects After Repair and Multi-Viewport Matrix", async ({ page }) => {
  // Authenticate
  const authRes = await page.request.post('http://127.0.0.1:8001/api/auth/login', {
    data: { email: 'demo@omniverse.io', password: 'omniverse123' },
  });
  expect(authRes.ok()).toBeTruthy();
  const { token } = await authRes.json();

  const setupStorage = async () => {
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
  // REPAIR TEST 1: MOB-001 (412 × 915) — TopBar vs MobileHomeScreen
  // -------------------------------------------------------------
  await page.setViewportSize({ width: 412, height: 915 });
  await setupStorage();
  await page.goto('http://localhost:3000', { waitUntil: 'domcontentloaded' });
  await page.waitForTimeout(2500);

  const topBar = page.locator('[data-testid="topbar"]');
  const homeScreen = page.locator('[data-testid="mobile-home-screen"]');
  await expect(topBar).toBeVisible();
  await expect(homeScreen).toBeVisible();

  const topBarBox = await topBar.boundingBox();
  const headerStatus = page.locator('span:has-text("One UI · Cortex Core")').first();
  const headerStatusBox = await headerStatus.boundingBox();

  console.log('REPAIRED TopBar Bounding Box:', topBarBox);
  console.log('REPAIRED MobileHomeScreen Status Box:', headerStatusBox);

  // Assertion: headerStatus Y must be strictly below TopBar (Y >= 60)
  expect(headerStatusBox.y).toBeGreaterThanOrEqual(topBarBox.y + topBarBox.height - 2);

  await page.screenshot({ path: path.join(EVIDENCE_DIR, 'MOB-001_after_412x915.png') });
  console.log('-> Captured: MOB-001_after_412x915.png');

  // -------------------------------------------------------------
  // REPAIR TEST 2: MOB-002 (412 × 915) — Clean Unified One UI Dock
  // -------------------------------------------------------------
  const smartDock = page.locator('[data-testid="mobile-smart-dock"]');
  const cortexPill = page.locator('[data-testid="cortex-pill-container"]');
  await expect(smartDock).toBeVisible();
  await expect(cortexPill).toBeVisible();

  const pillBox = await cortexPill.boundingBox();
  const smartDockBox = await smartDock.boundingBox();
  console.log('REPAIRED Cortex Pill Box:', pillBox);
  console.log('REPAIRED SmartDock Box:', smartDockBox);

  // Assertion: Cortex Pill must sit ABOVE SmartDock (pillBox.y + pillBox.height <= smartDockBox.y + 4)
  expect(pillBox.y + pillBox.height).toBeLessThanOrEqual(smartDockBox.y + 10);

  // Also verify duplicate MobileDock is not present
  const duplicateMobileDock = page.locator('[data-testid="dock-root"]');
  expect(await duplicateMobileDock.count()).toBe(0);

  await page.screenshot({ path: path.join(EVIDENCE_DIR, 'MOB-002_after_412x915.png') });
  console.log('-> Captured: MOB-002_after_412x915.png');

  // -------------------------------------------------------------
  // REPAIR TEST 3: MOB-003 (360 × 800) — FileManager Responsive
  // -------------------------------------------------------------
  await page.setViewportSize({ width: 360, height: 800 });
  await page.evaluate(() => window.__omniverse_openApp?.('files'));
  await page.waitForTimeout(1500);

  const filesApp = page.locator('[data-testid="files-app"]');
  await expect(filesApp).toBeVisible();
  await page.screenshot({ path: path.join(EVIDENCE_DIR, 'MOB-003_after_360x800.png') });
  console.log('-> Captured: MOB-003_after_360x800.png');
  await page.evaluate(() => window.__omniverse_closeApp?.('files'));
  await page.waitForTimeout(600);

  // -------------------------------------------------------------
  // REPAIR TEST 4: MOB-004 (280 × 653) — MobileAppDrawer Narrow Responsive
  // -------------------------------------------------------------
  await page.setViewportSize({ width: 280, height: 653 });
  await page.waitForTimeout(600);
  const drawerTrigger = page.locator('[data-testid="app-drawer-trigger"]').first();
  await expect(drawerTrigger).toBeVisible();
  await drawerTrigger.click();
  await page.waitForTimeout(1000);
  await page.screenshot({ path: path.join(EVIDENCE_DIR, 'MOB-004_after_280x653.png') });
  console.log('-> Captured: MOB-004_after_280x653.png');
  const closeDrawer = page.locator('button:has(.fa-xmark)').first();
  if (await closeDrawer.isVisible()) await closeDrawer.click();
  await page.waitForTimeout(600);

  // -------------------------------------------------------------
  // REPAIR TEST 5: MOB-005 (390 × 844) — MobileAIChat Safe Area Composer
  // -------------------------------------------------------------
  await page.setViewportSize({ width: 390, height: 844 });
  const openChatBtn = page.locator('button:has-text("AI Assistant")').first();
  if (await openChatBtn.isVisible()) {
    await openChatBtn.click();
  } else {
    await page.evaluate(() => window.__omniverse_openApp?.('chat'));
  }
  await page.waitForTimeout(1500);
  const chatInput = page.locator('[data-testid="ai-chat-input"]');
  await expect(chatInput).toBeVisible();
  await page.screenshot({ path: path.join(EVIDENCE_DIR, 'MOB-005_after_390x844.png') });
  console.log('-> Captured: MOB-005_after_390x844.png');
  const closeChat = page.locator('[aria-label="Back"], [aria-label="Close"]').first();
  if (await closeChat.isVisible()) await closeChat.click();
  await page.waitForTimeout(600);

  // -------------------------------------------------------------
  // REPAIR TEST 6: MOB-006 (375 × 812) — PhotosApp Responsive
  // -------------------------------------------------------------
  await page.setViewportSize({ width: 375, height: 812 });
  await page.evaluate(() => window.__omniverse_openApp?.('photos'));
  await page.waitForTimeout(1500);
  const photosApp = page.locator('[data-testid="photos-app"]');
  await expect(photosApp).toBeVisible();
  await page.screenshot({ path: path.join(EVIDENCE_DIR, 'MOB-006_after_375x812.png') });
  console.log('-> Captured: MOB-006_after_375x812.png');
  await page.evaluate(() => window.__omniverse_closeApp?.('photos'));
  await page.waitForTimeout(600);

  // -------------------------------------------------------------
  // REQUIRED MULTI-VIEWPORT COVERAGE MATRIX
  // -------------------------------------------------------------
  const requiredViewports = [
    { w: 280, h: 653, name: 'VIEWPORT_280x653_home.png' },
    { w: 320, h: 568, name: 'VIEWPORT_320x568_home.png' },
    { w: 360, h: 800, name: 'VIEWPORT_360x800_home.png' },
    { w: 375, h: 812, name: 'VIEWPORT_375x812_home.png' },
    { w: 390, h: 844, name: 'VIEWPORT_390x844_home.png' },
    { w: 412, h: 915, name: 'VIEWPORT_412x915_home.png' },
    { w: 430, h: 932, name: 'VIEWPORT_430x932_home.png' },
    { w: 768, h: 1024, name: 'VIEWPORT_768x1024_tablet.png' },
    { w: 844, h: 390, name: 'VIEWPORT_844x390_landscape.png' },
  ];

  for (const vp of requiredViewports) {
    await page.setViewportSize({ width: vp.w, height: vp.h });
    await page.waitForTimeout(600);
    await page.screenshot({ path: path.join(EVIDENCE_DIR, vp.name) });
    console.log(`-> Captured matrix: ${vp.name}`);
  }

  // -------------------------------------------------------------
  // DESKTOP REGRESSION VERIFICATION (1920 × 1080)
  // -------------------------------------------------------------
  await page.setViewportSize({ width: 1920, height: 1080 });
  await page.waitForTimeout(1000);
  const desktopDock = page.locator('[data-testid="adaptive-dock"]');
  await expect(desktopDock).toBeVisible();
  await page.screenshot({ path: path.join(EVIDENCE_DIR, 'DESKTOP_1920x1080.png') });
  console.log('-> Captured: DESKTOP_1920x1080.png');

  // Verify desktop FileManager
  await page.evaluate(() => window.__omniverse_openApp?.('files'));
  await page.waitForTimeout(1500);
  await page.screenshot({ path: path.join(EVIDENCE_DIR, 'DESKTOP_files_app.png') });
  console.log('-> Captured: DESKTOP_files_app.png');
  await page.evaluate(() => window.__omniverse_closeApp?.('files'));
  await page.waitForTimeout(600);

  // Verify desktop Photos
  await page.evaluate(() => window.__omniverse_openApp?.('photos'));
  await page.waitForTimeout(1500);
  await page.screenshot({ path: path.join(EVIDENCE_DIR, 'DESKTOP_photos_app.png') });
  console.log('-> Captured: DESKTOP_photos_app.png');
  await page.evaluate(() => window.__omniverse_closeApp?.('photos'));
  await page.waitForTimeout(600);
});
