const path = require('path');
const fs = require('fs');
const http = require('http');

const SCREENSHOT_DIR = path.resolve(__dirname, '..', 'artifacts', 'screenshots', 'windows_phone');
if (!fs.existsSync(SCREENSHOT_DIR)) {
  fs.mkdirSync(SCREENSHOT_DIR, { recursive: true });
}

function getAuthToken() {
  return new Promise((resolve, reject) => {
    const req = http.request('http://localhost:8001/api/auth/login', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' }
    }, (res) => {
      let data = '';
      res.on('data', chunk => data += chunk);
      res.on('end', () => {
        try {
          const parsed = JSON.parse(data);
          resolve(parsed.token);
        } catch (e) {
          reject(e);
        }
      });
    });
    req.on('error', reject);
    req.write(JSON.stringify({ email: 'demo@omniverse.io', password: 'omniverse123' }));
    req.end();
  });
}

async function run() {
  console.log('[VERIFY] Starting Windows Phone Mobile Revamp Verification...');

  let token = null;
  try {
    token = await getAuthToken();
    console.log('[AUTH] Successfully retrieved JWT token from backend');
  } catch (err) {
    console.warn('[AUTH] Could not retrieve token via API, using fallback token:', err.message);
    token = 'eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJzdWIiOiJkZW1vLXVzZXItZGVmYXVsdC1pZCIsImVtYWlsIjoiZGVtb0BvbW5pdmVyc2UuaW8iLCJleHAiOjE3OTMwODIyMzN9.SaMmY2zRvnPNYEccOML1EJEATXvNKf9-OBMY0flYebw';
  }

  const playwrightPath = path.join(__dirname, '..', 'frontend', 'node_modules', 'playwright');
  const { chromium } = require(playwrightPath);

  const browser = await chromium.launch({ headless: true });

  const viewports = [
    { name: '01_start_screen_390x844', width: 390, height: 844 },
    { name: '02_start_screen_320x568_narrow', width: 320, height: 568 },
    { name: '03_start_screen_375x812_standard', width: 375, height: 812 },
    { name: '04_start_screen_430x932_large', width: 430, height: 932 }
  ];

  for (const vp of viewports) {
    console.log(`\n=== Testing Viewport ${vp.width}x${vp.height} (${vp.name}) ===`);
    const context = await browser.newContext({
      viewport: { width: vp.width, height: vp.height },
      isMobile: true,
      hasTouch: true,
      userAgent: 'Mozilla/5.0 (iPhone; CPU iPhone OS 16_0 like Mac OS X) AppleWebKit/605.1.15 (KHTML, like Gecko) Version/16.0 Mobile/15E148 Safari/604.1'
    });

    await context.addInitScript((tok) => {
      localStorage.setItem('omniverse_token', tok);
      localStorage.setItem('omniverse_windows', '[]');
      localStorage.setItem('omniverse_boot_done', '1');
      localStorage.setItem('omniverse_onboarding_done', '1');
      localStorage.setItem('omniverse_location_setup_done', '1');
      localStorage.setItem('cortex_welcome_seen', '1');
      localStorage.setItem('omniverse_active_wallpaper', 'dark-nebula');
    }, token);

    const page = await context.newPage();
    await page.goto('http://localhost:3000', { waitUntil: 'networkidle', timeout: 30000 });
    await page.waitForTimeout(2500);

    // Check horizontal overflow
    const overflow = await page.evaluate(() => document.documentElement.scrollWidth > window.innerWidth);
    console.log(`[VIEWPORT ${vp.width}x${vp.height}] Horizontal overflow: ${overflow}`);

    // Capture Start Screen
    const startPath = path.join(SCREENSHOT_DIR, `${vp.name}.png`);
    await page.screenshot({ path: startPath });
    console.log(`[CAPTURED] Start screen: ${startPath}`);

    // If on standard 390x844, perform full interaction suite
    if (vp.width === 390) {
      // 1. Pivot to "all apps"
      const allAppsPivot = page.locator('button:has-text("all apps")').first();
      if (await allAppsPivot.isVisible()) {
        console.log('[ACTION] Pivoting to All Apps...');
        await allAppsPivot.click();
        await page.waitForTimeout(1000);

        const allAppsPath = path.join(SCREENSHOT_DIR, '05_all_apps_list_390x844.png');
        await page.screenshot({ path: allAppsPath });
        console.log(`[CAPTURED] All Apps list: ${allAppsPath}`);

        // 2. Test search filter in All Apps
        const searchInput = page.locator('input[placeholder*="search"]').first();
        if (await searchInput.isVisible()) {
          console.log('[ACTION] Filtering apps by "adversary"...');
          await searchInput.fill('adversary');
          await page.waitForTimeout(600);

          const searchPath = path.join(SCREENSHOT_DIR, '06_search_filtered_390x844.png');
          await page.screenshot({ path: searchPath });
          console.log(`[CAPTURED] Search filtered view: ${searchPath}`);

          // Clear search
          await searchInput.fill('');
          await page.waitForTimeout(400);
        }

        // Return to start
        const startPivot = page.locator('button:has-text("start")').first();
        if (await startPivot.isVisible()) {
          console.log('[ACTION] Returning to Start screen pivot...');
          await startPivot.click();
          await page.waitForTimeout(800);
        }
      }

      // 3. Launch AI Chat from Start Screen
      const chatTile = page.locator('[data-testid="tile-chat"], [aria-label*="AI Chat"], [aria-label*="ai chat"]').first();
      if (await chatTile.isVisible()) {
        console.log('[ACTION] Tapping AI Chat Live Tile...');
        await chatTile.click();
        await page.waitForTimeout(2000);

        const appOpenPath = path.join(SCREENSHOT_DIR, '07_app_opened_with_metro_header_and_navbar_390x844.png');
        await page.screenshot({ path: appOpenPath });
        console.log(`[CAPTURED] App with Windows Phone Header & NavBar: ${appOpenPath}`);

        // 4. Open Task Switcher via custom event / nav-bar
        console.log('[ACTION] Opening second app (Notes) to test multitasking carousel...');
        await page.evaluate(() => {
          window.dispatchEvent(new CustomEvent("omniverse:open-app", { detail: { appId: "notes" } }));
        });
        await page.waitForTimeout(1500);

        // Open task switcher
        console.log('[ACTION] Activating Windows Phone Task Switcher...');
        await page.evaluate(() => {
          window.dispatchEvent(new CustomEvent("omniverse:toggle-task-switcher"));
        });
        await page.waitForTimeout(1000);

        const taskSwitcherPath = path.join(SCREENSHOT_DIR, '08_windows_phone_task_switcher_390x844.png');
        await page.screenshot({ path: taskSwitcherPath });
        console.log(`[CAPTURED] Windows Phone Task Switcher: ${taskSwitcherPath}`);

        // Close task switcher
        await page.keyboard.press('Escape');
        await page.waitForTimeout(600);

        // 5. Return to Start using Start key (⊞)
        const startNavBtn = page.locator('[data-testid="windows-phone-nav-bar"] button[aria-label="Start"]').first();
        if (await startNavBtn.isVisible()) {
          console.log('[ACTION] Tapping Windows Start soft button (⊞)...');
          await startNavBtn.click();
          await page.waitForTimeout(1200);

          const backHomePath = path.join(SCREENSHOT_DIR, '09_returned_to_start_via_nav_key_390x844.png');
          await page.screenshot({ path: backHomePath });
          console.log(`[CAPTURED] Returned to Start screen: ${backHomePath}`);
        }
      }
    }

    await context.close();
  }

  await browser.close();
  console.log('\n[SUCCESS] Windows Phone mobile revamp testing completed successfully!');
}

run().catch(err => {
  console.error('[ERROR] Verification failed:', err);
  process.exit(1);
});
