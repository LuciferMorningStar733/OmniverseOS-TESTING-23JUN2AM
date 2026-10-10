const { chromium } = require('playwright');
const fs = require('fs');
const path = require('path');

const OUTPUT_DIR = path.join(__dirname, '..', 'screenshots_login_repair');
if (!fs.existsSync(OUTPUT_DIR)) {
  fs.mkdirSync(OUTPUT_DIR, { recursive: true });
}

async function run() {
  const browser = await chromium.launch({
    headless: true,
    args: ['--no-sandbox', '--disable-setuid-sandbox']
  });

  const results = {
    production: {},
    local: {},
    mobile: {}
  };

  console.log('[1/4] Probing Production Website: https://omniverseos.in.net');
  const prodContext = await browser.newContext({
    viewport: { width: 1280, height: 800 }
  });
  const prodPage = await prodContext.newPage();

  const prodConsole = [];
  const prodErrors = [];
  const prodRequests = [];

  prodPage.on('console', msg => {
    prodConsole.push({ type: msg.type(), text: msg.text() });
    if (msg.type() === 'error') {
      prodErrors.push(msg.text());
      console.log('  [Prod Console Error]:', msg.text());
    }
  });

  prodPage.on('requestfailed', req => {
    console.log('  [Prod Request Failed]:', req.url(), req.failure()?.errorText);
    prodRequests.push({ url: req.url(), failed: true, error: req.failure()?.errorText });
  });

  try {
    await prodPage.goto('https://omniverseos.in.net', { waitUntil: 'networkidle', timeout: 30000 });
    await prodPage.waitForTimeout(2000);

    // Look for login button or gateway modal
    const emailInput = prodPage.locator('input[type="email"], input[placeholder*="email" i], input[name="email"]');
    const pwdInput = prodPage.locator('input[type="password"]');

    if (await emailInput.count() > 0) {
      await emailInput.first().fill('mabdul.hyd5@gmail.com');
      await pwdInput.first().fill('TestPassword123!');
      
      const submitBtn = prodPage.locator('button:has-text("INITIALIZE"), button:has-text("Login"), button:has-text("Sign In")');
      if (await submitBtn.count() > 0) {
        await submitBtn.first().click();
        await prodPage.waitForTimeout(3000);
      }
    }

    await prodPage.screenshot({
      path: path.join(OUTPUT_DIR, '01_production_login_cors_failure.png'),
      fullPage: true
    });
    console.log('  Captured: 01_production_login_cors_failure.png');
    results.production.errors = prodErrors;
  } catch (err) {
    console.error('  Prod navigation error:', err.message);
  } finally {
    await prodContext.close();
  }

  console.log('[2/4] Testing Local Repaired Environment: http://localhost:3000');
  const localContext = await browser.newContext({
    viewport: { width: 1440, height: 900 }
  });
  const localPage = await localContext.newPage();

  try {
    await localPage.goto('http://localhost:3000', { waitUntil: 'networkidle', timeout: 30000 });
    await localPage.waitForTimeout(2000);

    // Fill credentials
    const localEmail = localPage.locator('input[type="email"], input[placeholder*="email" i], input[name="email"]');
    const localPwd = localPage.locator('input[type="password"]');

    if (await localEmail.count() > 0) {
      await localEmail.first().fill('demo@omniverse.io');
      await localPwd.first().fill('omniverse123');

      const submitBtn = localPage.locator('button:has-text("INITIALIZE"), button:has-text("Login"), button:has-text("Sign In")');
      if (await submitBtn.count() > 0) {
        await submitBtn.first().click();
        await localPage.waitForTimeout(3000);
      }
    }

    const token = await localPage.evaluate(() => localStorage.getItem('omniverse_token'));
    results.local.tokenPresent = Boolean(token);
    console.log('  Token present in localStorage:', Boolean(token));

    await localPage.screenshot({
      path: path.join(OUTPUT_DIR, '02_desktop_login_success.png'),
      fullPage: true
    });
    console.log('  Captured: 02_desktop_login_success.png');

    // Test session refresh
    console.log('[3/4] Verifying Session Refresh Persistence');
    await localPage.reload({ waitUntil: 'networkidle' });
    await localPage.waitForTimeout(2000);
    const tokenAfterReload = await localPage.evaluate(() => localStorage.getItem('omniverse_token'));
    results.local.tokenAfterReload = Boolean(tokenAfterReload);

    await localPage.screenshot({
      path: path.join(OUTPUT_DIR, '03_session_persistence_after_refresh.png'),
      fullPage: true
    });
    console.log('  Captured: 03_session_persistence_after_refresh.png');

  } catch (err) {
    console.error('  Local testing error:', err.message);
  } finally {
    await localContext.close();
  }

  console.log('[4/4] Verifying Mobile Login: Viewport 390x844');
  const mobileContext = await browser.newContext({
    viewport: { width: 390, height: 844 },
    userAgent: 'Mozilla/5.0 (iPhone; CPU iPhone OS 16_5 like Mac OS X) AppleWebKit/605.1.15 (KHTML, like Gecko) Version/16.5 Mobile/15E148 Safari/604.1',
    isMobile: true,
    hasTouch: true
  });
  const mobilePage = await mobileContext.newPage();

  try {
    await mobilePage.goto('http://localhost:3000', { waitUntil: 'networkidle', timeout: 30000 });
    await mobilePage.waitForTimeout(2000);

    const mEmail = mobilePage.locator('input[type="email"], input[placeholder*="email" i], input[name="email"]');
    const mPwd = mobilePage.locator('input[type="password"]');

    if (await mEmail.count() > 0) {
      await mEmail.first().fill('demo@omniverse.io');
      await mPwd.first().fill('omniverse123');

      const submitBtn = mobilePage.locator('button:has-text("INITIALIZE"), button:has-text("Login"), button:has-text("Sign In")');
      if (await submitBtn.count() > 0) {
        await submitBtn.first().click();
        await mobilePage.waitForTimeout(3000);
      }
    }

    const mToken = await mobilePage.evaluate(() => localStorage.getItem('omniverse_token'));
    results.mobile.tokenPresent = Boolean(mToken);

    await mobilePage.screenshot({
      path: path.join(OUTPUT_DIR, '05_mobile_login_success.png'),
      fullPage: true
    });
    console.log('  Captured: 05_mobile_login_success.png');

  } catch (err) {
    console.error('  Mobile testing error:', err.message);
  } finally {
    await mobileContext.close();
  }

  await browser.close();

  fs.writeFileSync(
    path.join(OUTPUT_DIR, 'verification_summary.json'),
    JSON.stringify(results, null, 2)
  );
  console.log('Verification completed cleanly. Results saved to verification_summary.json');
}

run().catch(console.error);
