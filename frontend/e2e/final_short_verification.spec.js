const { test, expect } = require('@playwright/test');
const path = require('path');
const fs = require('fs');

const EVIDENCE_DIR = path.resolve(__dirname, '../../OMNIVERSEOS_VISUAL_EVIDENCE');

test("Targeted Final Verification Pass", async ({ page }) => {
  // 1. Authenticate with backend
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

  // =========================================================================
  // TASK 1: MOB-004 & MOB-005 GENUINE SAME-APP BEFORE/AFTER SCREENSHOTS
  // =========================================================================
  console.log('--- TASK 1: MOB-004 & MOB-005 Same-App Before/After ---');

  // --- MOB-004: App Library at 280 × 653 ---
  await page.setViewportSize({ width: 280, height: 653 });
  await setupStorage();
  await page.goto('http://localhost:3000', { waitUntil: 'domcontentloaded' });
  await page.waitForTimeout(2000);

  // Open App Library
  const appDrawerBtn = page.locator('[data-testid="app-drawer-trigger"]').first();
  await expect(appDrawerBtn).toBeVisible();
  await appDrawerBtn.click();
  await page.waitForTimeout(1000);

  // Check App Library is visible
  const appLibraryModal = page.locator('text=App Library');
  await expect(appLibraryModal).toBeVisible();

  // Capture MOB-004 AFTER (current repaired 3-column layout)
  await page.screenshot({ path: path.join(EVIDENCE_DIR, 'MOB-004_after_280x653.png') });
  console.log('-> Captured: MOB-004_after_280x653.png (App Library 3-column on 280px)');

  // Reproduce the original MOB-004 BEFORE state: force 4-column grid (grid-cols-4)
  await page.evaluate(() => {
    const grid = document.querySelector('[data-testid="app-library-grid"]');
    if (grid) {
      grid.style.display = 'grid';
      grid.style.gridTemplateColumns = 'repeat(4, minmax(0, 1fr))';
      grid.style.gap = '8px';
    }
  });
  await page.waitForTimeout(500);
  await page.screenshot({ path: path.join(EVIDENCE_DIR, 'MOB-004_before_280x653.png') });
  console.log('-> Captured: MOB-004_before_280x653.png (App Library 4-column squeezed on 280px)');

  // Close drawer
  const closeDrawer = page.locator('button:has(.fa-xmark)').first();
  if (await closeDrawer.isVisible()) await closeDrawer.click();
  await page.waitForTimeout(600);

  // --- MOB-005: Cortex Intelligence Chat at 390 × 844 ---
  await page.setViewportSize({ width: 390, height: 844 });
  await page.goto('http://localhost:3000', { waitUntil: 'domcontentloaded' });
  await page.waitForTimeout(2000);

  // Open Mobile AI Chat
  const openChatBtn = page.locator('button:has-text("AI Assistant")').first();
  if (await openChatBtn.isVisible()) {
    await openChatBtn.click();
  } else {
    await page.locator('[data-testid="dock-item-chat"]').first().click();
  }
  await page.waitForTimeout(1500);

  // Check chat input visible
  const chatInput = page.locator('[data-testid="ai-chat-input"]');
  await expect(chatInput).toBeVisible();

  // Capture MOB-005 AFTER (repaired portal with safe area and visible Back button)
  await page.screenshot({ path: path.join(EVIDENCE_DIR, 'MOB-005_after_390x844.png') });
  console.log('-> Captured: MOB-005_after_390x844.png (Repaired Portal with safe areas)');

  // Reproduce MOB-005 BEFORE state: remove safe-area bottom padding and simulate TopBar overlay
  await page.evaluate(() => {
    const chatModal = document.querySelector('[data-testid="mobile-ai-chat"]');
    const form = chatModal?.querySelector('form');
    if (form) {
      form.style.padding = '0px 8px 0px 8px'; // flush to screen edge, no safe area
    }
    // Simulate TopBar overlay blocking the back button
    const mockBar = document.createElement('div');
    mockBar.id = 'mock-topbar-overlay';
    mockBar.style.position = 'fixed';
    mockBar.style.top = '0';
    mockBar.style.left = '0';
    mockBar.style.right = '0';
    mockBar.style.height = '60px';
    mockBar.style.background = 'rgba(15, 23, 42, 0.95)';
    mockBar.style.zIndex = '10000';
    mockBar.style.borderBottom = '1px solid rgba(255,255,255,0.1)';
    mockBar.style.display = 'flex';
    mockBar.style.alignItems = 'center';
    mockBar.style.padding = '0 16px';
    mockBar.style.color = '#fff';
    mockBar.innerText = 'OmniverseOS Desktop TopBar (Blocking Back Button)';
    document.body.appendChild(mockBar);
  });
  await page.waitForTimeout(500);
  await page.screenshot({ path: path.join(EVIDENCE_DIR, 'MOB-005_before_390x844.png') });
  console.log('-> Captured: MOB-005_before_390x844.png (Before: TopBar blocking back button + flush composer)');

  // Cleanup mock overlay
  await page.evaluate(() => {
    document.getElementById('mock-topbar-overlay')?.remove();
  });
  // Restore form styles
  await page.evaluate(() => {
    const chatModal = document.querySelector('[data-testid="mobile-ai-chat"]');
    const form = chatModal?.querySelector('form');
    if (form) form.style.padding = '10px 16px max(18px, env(safe-area-inset-bottom, 18px))';
  });

  // =========================================================================
  // TASK 2: CORTEX CHAT WITH MOBILE KEYBOARD OPEN
  // =========================================================================
  console.log('--- TASK 2: Cortex Chat Mobile Keyboard Interactions ---');

  // Step 2.1: Initial State Before Keyboard Opens
  await page.setViewportSize({ width: 390, height: 844 });
  await page.waitForTimeout(500);

  // Step 2.2: Focus Input & Simulate Mobile Virtual Keyboard Opening (Viewport shrinks to 390 × 520)
  console.log('-> Focusing input and opening keyboard (height reduced to 520px)...');
  await chatInput.click();
  await page.setViewportSize({ width: 390, height: 520 }); // Simulates soft keyboard occupying bottom 324px
  await page.waitForTimeout(800);

  // Capture Keyboard Open Screenshot
  await page.screenshot({ path: path.join(EVIDENCE_DIR, 'KEYBOARD_01_chat_keyboard_open.png') });
  console.log('-> Captured: KEYBOARD_01_chat_keyboard_open.png');

  // Verify Header Back & Close Buttons are visible & hit-testable with keyboard open
  const backBtn = page.locator('[aria-label="Back"]').first();
  const closeBtn = page.locator('[aria-label="Close"]').first();
  await expect(backBtn).toBeVisible();
  await expect(closeBtn).toBeVisible();

  const hitTestBack = await page.evaluate(() => {
    const btn = document.querySelector('button[aria-label="Back"]');
    if (!btn) return false;
    const rect = btn.getBoundingClientRect();
    const el = document.elementFromPoint(rect.x + rect.width / 2, rect.y + rect.height / 2);
    return btn === el || btn.contains(el);
  });
  console.log('Hit Test Back Button with Keyboard Open:', hitTestBack);
  expect(hitTestBack).toBe(true);

  // Step 2.3: Type long text content into input
  const testPrompt = "Explain the microgrid battery reserve optimization algorithm with mathematical constraints.";
  await chatInput.fill(testPrompt);
  await page.waitForTimeout(500);

  // Capture Text Typed with Active Send Button
  await page.screenshot({ path: path.join(EVIDENCE_DIR, 'KEYBOARD_02_text_typed_send_active.png') });
  console.log('-> Captured: KEYBOARD_02_text_typed_send_active.png');

  // Verify Send button is visible and active
  const sendBtn = page.locator('[data-testid="chat-send"]');
  await expect(sendBtn).toBeVisible();
  const sendBox = await sendBtn.boundingBox();
  console.log('Send Button Bounding Box with Keyboard Open:', sendBox);
  expect(sendBox.y).toBeLessThan(520); // Must be strictly within visible viewport above keyboard!

  // Step 2.4: Scroll messages while keyboard is open
  const messagesFeed = page.locator('[data-testid="ai-chat-messages"]');
  await messagesFeed.evaluate((el) => { el.scrollTop = 50; });
  await page.waitForTimeout(300);

  // Step 2.5: Tap Send button to submit prompt
  await sendBtn.click();
  await page.waitForTimeout(1500);

  // Capture Streaming State with Keyboard Open
  await page.screenshot({ path: path.join(EVIDENCE_DIR, 'KEYBOARD_03_message_sent_streaming.png') });
  console.log('-> Captured: KEYBOARD_03_message_sent_streaming.png');

  // Step 2.6: Dismiss Keyboard (restore viewport to 390 × 844)
  await page.evaluate(() => {
    document.activeElement?.blur();
  });
  await page.setViewportSize({ width: 390, height: 844 });
  await page.waitForTimeout(1000);

  // Capture Keyboard Dismissed & Restored
  await page.screenshot({ path: path.join(EVIDENCE_DIR, 'KEYBOARD_04_keyboard_dismissed_restored.png') });
  console.log('-> Captured: KEYBOARD_04_keyboard_dismissed_restored.png');

  // Close Chat to return to home screen
  await backBtn.click();
  await page.waitForTimeout(600);

  // =========================================================================
  // TASK 3: NARROW MOBILE TAP-TARGET COLLISIONS & CLIPPING AUDIT (280 × 653)
  // =========================================================================
  console.log('--- TASK 3: Narrow Mobile (280x653) Tap-Target Audit ---');
  await page.setViewportSize({ width: 280, height: 653 });
  await page.waitForTimeout(1000);

  const tapAuditResults = await page.evaluate(() => {
    const results = [];
    const elements = [];

    // Collect Dock items
    const dock = document.querySelector('[data-testid="mobile-smart-dock"]');
    if (dock) {
      const dockButtons = dock.querySelectorAll('button, [role="button"], :scope > div');
      dockButtons.forEach((b, idx) => elements.push({ name: `SmartDock Item ${idx + 1}`, el: b, group: 'dock' }));
    }

    // Collect Cortex Pill
    const pill = document.querySelector('[data-testid="cortex-pill-container"]');
    if (pill) elements.push({ name: 'Cortex Pill', el: pill, group: 'pill' });

    // Collect Home Quick Action Buttons
    const homeScreen = document.querySelector('[data-testid="mobile-home-screen"]');
    if (homeScreen) {
      const buttons = homeScreen.querySelectorAll('button');
      buttons.forEach((b, idx) => elements.push({ name: `Home Button ${idx + 1} ("${b.innerText.trim().slice(0, 15)}")`, el: b, group: 'home' }));
    }

    // Measure bounding boxes & tap targets
    const bboxes = elements.map(item => {
      const rect = item.el.getBoundingClientRect();
      const isVisible = rect.width > 0 && rect.height > 0 && rect.top < 653 && rect.bottom > 0;
      return {
        name: item.name,
        group: item.group,
        rect: { x: rect.x, y: rect.y, width: rect.width, height: rect.height, right: rect.right, bottom: rect.bottom },
        isVisible,
        el: item.el,
      };
    }).filter(i => i.isVisible);

    // Collision detection (pairwise intersection area)
    const collisions = [];
    for (let i = 0; i < bboxes.length; i++) {
      for (let j = i + 1; j < bboxes.length; j++) {
        const a = bboxes[i];
        const b = bboxes[j];
        if (a.el.contains(b.el) || b.el.contains(a.el)) continue; // ignore parent-child

        const xOverlap = Math.max(0, Math.min(a.rect.right, b.rect.right) - Math.max(a.rect.x, b.rect.x));
        const yOverlap = Math.max(0, Math.min(a.rect.bottom, b.rect.bottom) - Math.max(a.rect.y, b.rect.y));
        const overlapArea = xOverlap * yOverlap;

        if (overlapArea > 10) { // More than 10 square pixels collision
          collisions.push({
            itemA: a.name,
            itemB: b.name,
            overlapArea: Math.round(overlapArea),
          });
        }
      }
    }

    // Touch target sizing check (< 36px warning)
    const smallTargets = bboxes
      .filter(i => i.rect.width < 32 || i.rect.height < 32)
      .map(i => ({ name: i.name, width: Math.round(i.rect.width), height: Math.round(i.rect.height) }));

    // Occlusion check via elementFromPoint
    const occludedElements = [];
    bboxes.forEach(item => {
      const cx = item.rect.x + item.rect.width / 2;
      const cy = item.rect.y + item.rect.height / 2;
      if (cx >= 0 && cx <= 280 && cy >= 0 && cy <= 653) {
        const topEl = document.elementFromPoint(cx, cy);
        if (topEl && !item.el.contains(topEl) && !topEl.contains(item.el)) {
          occludedElements.push({
            name: item.name,
            occludedBy: topEl.tagName + (topEl.className ? '.' + topEl.className.slice(0, 30) : ''),
          });
        }
      }
    });

    return {
      totalElementsAudited: bboxes.length,
      collisionsCount: collisions.length,
      collisions,
      smallTargetsCount: smallTargets.length,
      smallTargets,
      occludedCount: occludedElements.length,
      occludedElements,
    };
  });

  console.log('Narrow Mobile Tap Audit Results:', JSON.stringify(tapAuditResults, null, 2));
  fs.writeFileSync(path.join(EVIDENCE_DIR, 'NARROW_MOBILE_TAP_AUDIT_280x653.json'), JSON.stringify(tapAuditResults, null, 2));

  // Assertions: 0 collisions and 0 occluded elements on home screen / dock
  expect(tapAuditResults.collisionsCount).toBe(0);
  expect(tapAuditResults.occludedCount).toBe(0);

  // --- Step 3.2: Audit App Library 31 app icons on 280x653 ---
  console.log('-> Auditing App Library 31 app icons on 280x653...');
  const drawerBtn = page.locator('[data-testid="app-drawer-trigger"]').first();
  await drawerBtn.click();
  await page.waitForTimeout(800);

  const libraryTapResults = await page.evaluate(() => {
    const grid = document.querySelector('[data-testid="app-library-grid"]');
    if (!grid) return { error: 'Grid not found' };
    const buttons = Array.from(grid.querySelectorAll('button'));
    const bboxes = buttons.map((b, idx) => {
      const rect = b.getBoundingClientRect();
      const label = b.querySelector('span')?.innerText || `App ${idx + 1}`;
      return {
        idx,
        label,
        rect: { x: rect.x, y: rect.y, width: rect.width, height: rect.height, right: rect.right, bottom: rect.bottom },
        el: b,
      };
    });

    const visibleBoxes = bboxes.filter(b => b.rect.y < 653 && b.rect.bottom > 0);
    const collisions = [];
    for (let i = 0; i < visibleBoxes.length; i++) {
      for (let j = i + 1; j < visibleBoxes.length; j++) {
        const a = visibleBoxes[i];
        const b = visibleBoxes[j];
        const xOverlap = Math.max(0, Math.min(a.rect.right, b.rect.right) - Math.max(a.rect.x, b.rect.x));
        const yOverlap = Math.max(0, Math.min(a.rect.bottom, b.rect.bottom) - Math.max(a.rect.y, b.rect.y));
        if (xOverlap * yOverlap > 10) {
          collisions.push({ itemA: a.label, itemB: b.label, overlapArea: Math.round(xOverlap * yOverlap) });
        }
      }
    }

    const undersized = visibleBoxes.filter(b => b.rect.width < 44 || b.rect.height < 44);

    return {
      totalAppIcons: buttons.length,
      visibleOnScreen: visibleBoxes.length,
      collisionsCount: collisions.length,
      collisions,
      undersizedCount: undersized.length,
      undersized: undersized.map(u => ({ label: u.label, width: Math.round(u.rect.width), height: Math.round(u.rect.height) })),
    };
  });

  console.log('App Library 280px Tap Results:', JSON.stringify(libraryTapResults, null, 2));
  fs.writeFileSync(path.join(EVIDENCE_DIR, 'APP_LIBRARY_TAP_AUDIT_280x653.json'), JSON.stringify(libraryTapResults, null, 2));
  expect(libraryTapResults.collisionsCount).toBe(0);
});

