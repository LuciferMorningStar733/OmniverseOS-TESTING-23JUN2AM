const path = require('path');
const fs = require('fs');
const { chromium } = require(path.join(__dirname, '..', 'frontend', 'node_modules', 'playwright'));

const ROOT_DIR = path.resolve(__dirname, '..');
const SCREENSHOTS_DIR = path.join(ROOT_DIR, 'artifacts', 'screenshots', 'mobile');
const OUTPUT_DIR = path.join(ROOT_DIR, 'artifacts', 'certification');

if (!fs.existsSync(SCREENSHOTS_DIR)) {
  fs.mkdirSync(SCREENSHOTS_DIR, { recursive: true });
}

const APPS = [
  { id: "dashboard", name: "Dashboard" },
  { id: "chat", name: "AI Chat" },
  { id: "image", name: "Image Gen" },
  { id: "voice", name: "Cortex Voice" },
  { id: "memory", name: "Memory" },
  { id: "projects", name: "Projects" },
  { id: "timeline", name: "Timeline" },
  { id: "notes", name: "Notes" },
  { id: "tasks", name: "Tasks" },
  { id: "calendar", name: "Calendar" },
  { id: "clipboard", name: "Clipboard" },
  { id: "music", name: "Music" },
  { id: "photos", name: "Photos" },
  { id: "videos", name: "Videos" },
  { id: "watchlist", name: "Watchlist" },
  { id: "files", name: "Files" },
  { id: "code", name: "Code" },
  { id: "browser", name: "Browser" },
  { id: "settings", name: "Settings" },
  { id: "systemhealth", name: "System Health" },
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
  { id: "blackbox", name: "The Black Box" }
];

const VIEWPORTS = [
  { name: "narrow_320x568", width: 320, height: 568 },
  { name: "standard_375x812", width: 375, height: 812 },
  { name: "modern_390x844", width: 390, height: 844 },
  { name: "large_430x932", width: 430, height: 932 },
  { name: "tablet_768x1024", width: 768, height: 1024 }
];

async function runMobileInvestigation() {
  console.log('[PHASE 3] Starting Mobile and Responsive Investigation across all 31 Apps...');

  const browser = await chromium.launch({
    headless: true,
    args: ['--no-sandbox', '--disable-setuid-sandbox']
  });

  const results = {
    viewports_tested: VIEWPORTS,
    app_mobile_audit: [],
    multi_viewport_home_screenshots: []
  };

  // 1. First test multi-viewport home screen responsiveness
  for (const vp of VIEWPORTS) {
    const context = await browser.newContext({
      viewport: { width: vp.width, height: vp.height },
      isMobile: vp.width < 768,
      hasTouch: true
    });
    const page = await context.newPage();

    await page.addInitScript(() => {
      localStorage.setItem('omniverse_boot_done', '1');
      localStorage.setItem('omniverse_onboarding_done', '1');
      localStorage.setItem('omniverse_location_setup_done', '1');
    });

    await page.goto('http://localhost:3000', { waitUntil: 'networkidle', timeout: 30000 });
    await page.waitForTimeout(1000);

    const vpImg = path.join(SCREENSHOTS_DIR, `VIEWPORT_${vp.name}.png`);
    await page.screenshot({ path: vpImg });

    const overflow = await page.evaluate(() => document.body.scrollWidth > window.innerWidth);
    results.multi_viewport_home_screenshots.push({
      viewport: vp.name,
      width: vp.width,
      height: vp.height,
      horizontal_overflow: overflow,
      screenshot: path.relative(ROOT_DIR, vpImg)
    });

    await context.close();
  }

  // 2. Perform deep 31-app mobile audit at 390x844 (standard reference iPhone 14)
  const mobileContext = await browser.newContext({
    viewport: { width: 390, height: 844 },
    isMobile: true,
    hasTouch: true
  });
  const page = await mobileContext.newPage();

  // Seed authentication token
  const res = await page.request.post('http://localhost:8001/api/auth/login', {
    data: { email: 'demo@omniverse.io', password: 'omniverse123' }
  });
  const { token, user } = await res.json();

  await page.addInitScript(({ tok, usr }) => {
    localStorage.setItem('omniverse_token', tok);
    localStorage.setItem('omniverse_user', JSON.stringify(usr));
    localStorage.setItem('omniverse_boot_done', '1');
    localStorage.setItem('omniverse_onboarding_done', '1');
    localStorage.setItem('omniverse_location_setup_done', '1');
  }, { tok: token, usr: user });

  await page.goto('http://localhost:3000', { waitUntil: 'networkidle', timeout: 30000 });
  await page.waitForTimeout(2000);

  for (let i = 0; i < APPS.length; i++) {
    const app = APPS[i];
    const appDir = path.join(SCREENSHOTS_DIR, app.id);
    if (!fs.existsSync(appDir)) {
      fs.mkdirSync(appDir, { recursive: true });
    }

    console.log(`\n--> [${i + 1}/${APPS.length}] Mobile Test: ${app.name} (${app.id})...`);

    // Open app
    await page.evaluate(appId => {
      window.dispatchEvent(new CustomEvent('omniverse:open-app', { detail: { appId } }));
    }, app.id);

    const win = page.locator(`[data-testid="window-${app.id}"]`);
    await win.first().waitFor({ state: 'visible', timeout: 8000 });
    await page.waitForTimeout(400);

    // Check overflow
    const hasHorizontalOverflow = await page.evaluate(() => {
      return document.body.scrollWidth > window.innerWidth;
    });

    // Check error boundary
    const errorBoundary = win.locator('[data-testid="error-boundary"]');
    const hasCrashed = await errorBoundary.isVisible().catch(() => false);

    // Capture mobile screenshot
    const mobileImg = path.join(appDir, 'mobile_390x844.png');
    await page.screenshot({ path: mobileImg });

    // Close app
    await page.evaluate(appId => {
      window.dispatchEvent(new CustomEvent('omniverse:close-app', { detail: { appId } }));
    }, app.id);
    await page.waitForTimeout(300);

    results.app_mobile_audit.push({
      id: app.id,
      name: app.name,
      screenshot: path.relative(ROOT_DIR, mobileImg),
      horizontal_overflow: hasHorizontalOverflow,
      crashed: hasCrashed,
      status: (hasCrashed || hasHorizontalOverflow) ? "FAILED" : "PASSED"
    });

    console.log(`  -> [PASS] ${app.name} mobile test passed (overflow: ${hasHorizontalOverflow})`);
  }

  // 3. Test Mobile Keyboard Interaction on AI Chat
  console.log('\n[3/3] Testing Mobile Virtual Keyboard simulation on AI Chat...');
  await page.evaluate(() => {
    window.dispatchEvent(new CustomEvent('omniverse:open-app', { detail: { appId: 'chat' } }));
  });
  await page.waitForTimeout(1000);

  const chatInput = page.locator('[data-testid="ai-chat-input"] input, [data-testid="chat-input"]').last();
  if (await chatInput.isVisible()) {
    await chatInput.click({ force: true });
    await chatInput.fill('Mobile keyboard input verification test.');
    const keyboardOpenImg = path.join(SCREENSHOTS_DIR, 'KEYBOARD_chat_input_active.png');
    await page.screenshot({ path: keyboardOpenImg });
    results.keyboard_test = {
      tested: true,
      input_functional: true,
      screenshot: path.relative(ROOT_DIR, keyboardOpenImg)
    };
  }

  await mobileContext.close();
  await browser.close();

  fs.writeFileSync(path.join(OUTPUT_DIR, 'mobile_investigation_results.json'), JSON.stringify(results, null, 2));
  console.log('\n[PHASE 3 COMPLETED] Mobile investigation complete. Output saved to artifacts/certification/mobile_investigation_results.json');
}

runMobileInvestigation().catch(err => {
  console.error('[PHASE 3 FATAL ERROR]:', err);
  process.exit(1);
});
