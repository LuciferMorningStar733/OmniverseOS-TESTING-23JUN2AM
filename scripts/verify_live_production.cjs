const path = require('path');
const fs = require('fs');
const { chromium } = require(path.join(__dirname, '..', 'frontend', 'node_modules', 'playwright'));

const OUTPUT_DIR = path.join(__dirname, '..', 'screenshots_login_repair');

async function verifyLiveProduction() {
  const browser = await chromium.launch({
    headless: true,
    args: ['--no-sandbox', '--disable-setuid-sandbox']
  });

  const results = {
    url: 'https://omniverseos.in.net',
    responses: [],
    consoleErrors: []
  };

  const context = await browser.newContext({ viewport: { width: 1440, height: 900 } });
  const page = await context.newPage();

  page.on('console', msg => {
    if (msg.type() === 'error') {
      console.log('[BROWSER CONSOLE ERROR]:', msg.text());
      results.consoleErrors.push(msg.text());
    }
  });

  page.on('response', resp => {
    if (resp.url().includes('/api/auth/login')) {
      const status = resp.status();
      const headers = resp.headers();
      results.responses.push({
        url: resp.url(),
        status: status,
        allowOrigin: headers['access-control-allow-origin'] || null,
        allowCredentials: headers['access-control-allow-credentials'] || null
      });
      console.log(`[RESPONSE]: ${resp.url()} -> HTTP ${status} (Access-Control-Allow-Origin: ${headers['access-control-allow-origin']})`);
    }
  });

  try {
    console.log('Navigating to https://omniverseos.in.net...');
    await page.goto('https://omniverseos.in.net', { waitUntil: 'networkidle', timeout: 30000 });
    await page.waitForTimeout(2000);

    const emailInput = page.locator('input[type="email"], input[placeholder*="email" i], input[name="email"]');
    const pwdInput = page.locator('input[type="password"]');

    if (await emailInput.count() > 0) {
      console.log('Filling login credentials...');
      await emailInput.first().fill('demo@omniverse.io');
      await pwdInput.first().fill('omniverse123');
      
      const submitBtn = page.locator('button:has-text("INITIALIZE"), button:has-text("Login"), button:has-text("Sign In")');
      if (await submitBtn.count() > 0) {
        console.log('Clicking login button...');
        await submitBtn.first().click();
      }
    }

    console.log('Waiting for desktop initialization...');
    await page.waitForTimeout(8000);

    const desktopScreenshot = path.join(OUTPUT_DIR, '02_live_production_desktop_mounted.png');
    await page.screenshot({ path: desktopScreenshot, fullPage: true });
    console.log(`Saved screenshot to ${desktopScreenshot}`);

    // Check localStorage auth
    const storageData = await page.evaluate(() => {
      const all = {};
      for (let i = 0; i < localStorage.length; i++) {
        const k = localStorage.key(i);
        all[k] = localStorage.getItem(k);
      }
      return all;
    });

    results.localStorageKeys = Object.keys(storageData);
    results.hasUser = !!storageData['user'];
    results.hasToken = !!(storageData['token'] || storageData['jwt'] || storageData['authToken']);
    results.success = true;

    fs.writeFileSync(path.join(OUTPUT_DIR, 'live_production_verification.json'), JSON.stringify(results, null, 2));
    console.log('Final Live Results:', JSON.stringify(results, null, 2));
  } catch (err) {
    console.error('Error during verification:', err);
  } finally {
    await browser.close();
  }
}

verifyLiveProduction();
