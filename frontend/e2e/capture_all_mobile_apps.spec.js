const { test, expect } = require('@playwright/test');
const path = require('path');
const fs = require('fs');

const EVIDENCE_DIR = path.resolve(__dirname, '../../OMNIVERSEOS_VISUAL_EVIDENCE');

test("Inspect and Capture All Registered Apps on Mobile (390x844)", async ({ page }) => {
  // Login
  const authRes = await page.request.post('http://127.0.0.1:8001/api/auth/login', {
    data: { email: 'demo@omniverse.io', password: 'omniverse123' },
  });
  expect(authRes.ok()).toBeTruthy();
  const { token } = await authRes.json();

  await page.addInitScript((tok) => {
    localStorage.setItem('omniverse_token', tok);
    localStorage.setItem('omniverse_has_booted', '1');
    localStorage.setItem('omniverse_location_setup_done', '1');
    localStorage.setItem('omniverse_city', 'San Francisco');
    localStorage.setItem('omniverse_onboarding_v1_done', '1');
    localStorage.setItem('omniverse_windows', JSON.stringify([{ id: 'm1', app: 'chat', minimized: true, x: 0, y: 0, w: 100, h: 100, z: 100 }]));
  }, token);

  await page.setViewportSize({ width: 390, height: 844 });
  await page.goto('http://localhost:3000', { waitUntil: 'domcontentloaded' });
  await page.waitForTimeout(2000);

  const appIds = [
    "dashboard", "chat", "image", "voice", "memory", "projects", "timeline",
    "notes", "tasks", "calendar", "clipboard", "music", "photos", "videos",
    "watchlist", "files", "code", "browser", "settings", "finance",
    "analytics", "nebula", "swarm", "faceoff", "adversary", "warroom",
    "deadreckoning", "matrix", "mirror", "zero", "blackbox"
  ];

  const results = [];

  for (const appId of appIds) {
    try {
      console.log(`Testing mobile app: ${appId}`);
      await page.evaluate((id) => window.__omniverse_openApp?.(id), appId);
      await page.waitForTimeout(1000);

      const shotPath = path.join(EVIDENCE_DIR, `APP_${appId}_mobile_390x844.png`);
      await page.screenshot({ path: shotPath });

      // Close the app
      await page.evaluate((id) => window.__omniverse_closeApp?.(id), appId);
      await page.waitForTimeout(400);

      results.push({ appId, status: "PASS", screenshot: `APP_${appId}_mobile_390x844.png` });
    } catch (err) {
      console.error(`Failed on app ${appId}:`, err);
      results.push({ appId, status: "FAIL", error: err.message });
    }
  }

  const resultsPath = path.join(EVIDENCE_DIR, 'MOBILE_APPS_AUDIT_RESULTS.json');
  fs.writeFileSync(resultsPath, JSON.stringify(results, null, 2));
  console.log('Mobile apps smoke test complete. Results written to:', resultsPath);
});
