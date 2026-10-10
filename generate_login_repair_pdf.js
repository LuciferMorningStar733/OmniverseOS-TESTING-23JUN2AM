const path = require('path');
const fs = require('fs');
const { chromium } = require(path.join(__dirname, 'frontend', 'node_modules', 'playwright'));

const EVIDENCE_DIR = path.resolve(__dirname, 'screenshots_login_repair');
const OUTPUT_PDF = path.resolve(__dirname, 'OMNIVERSEOS_LOGIN_REPAIR.pdf');

function getBase64Image(filename) {
  const filePath = path.join(EVIDENCE_DIR, filename);
  if (fs.existsSync(filePath)) {
    const data = fs.readFileSync(filePath);
    return `data:image/png;base64,${data.toString('base64')}`;
  }
  return '';
}

async function generatePdf() {
  console.log('[PDF] Generating perfectly balanced OMNIVERSEOS_LOGIN_REPAIR.pdf...');

  const img01 = getBase64Image('01_production_login_cors_failure.png');
  const img02 = getBase64Image('02_desktop_login_success.png');
  const img03 = getBase64Image('03_session_persistence_after_refresh.png');
  const img04 = getBase64Image('04_logout_successful.png');
  const img05 = getBase64Image('05_mobile_login_success.png');
  const img06 = getBase64Image('06_mobile_workspace_mounted.png');

  const htmlContent = `<!DOCTYPE html>
<html lang="en">
<head>
  <meta charset="UTF-8">
  <title>OmniverseOS — Emergency P0 Production Login Repair Report</title>
  <style>
    @page {
      size: A4;
      margin: 14mm 12mm 14mm 12mm;
      @bottom-right {
        content: "Page " counter(page) " of " counter(pages);
        font-family: 'Helvetica Neue', Arial, sans-serif;
        font-size: 8pt;
        color: #64748b;
      }
    }
    *, *:before, *:after {
      box-sizing: border-box;
    }
    body {
      font-family: -apple-system, BlinkMacSystemFont, 'Segoe UI', Roboto, Helvetica, Arial, sans-serif;
      color: #0f172a;
      background: #ffffff;
      line-height: 1.45;
      font-size: 9pt;
      margin: 0;
      padding: 0;
    }
    .page {
      page-break-after: always;
      height: 269mm;
      max-height: 269mm;
      overflow: hidden;
      display: flex;
      flex-direction: column;
      justify-content: flex-start;
    }
    .page:last-child {
      page-break-after: avoid;
    }
    h1, h2, h3 {
      color: #0284c7;
      font-weight: 700;
      letter-spacing: -0.02em;
      margin-top: 8pt;
      margin-bottom: 4pt;
    }
    h1 {
      font-size: 18pt;
      color: #0f172a;
      border-bottom: 2px solid #0284c7;
      padding-bottom: 4pt;
      margin-top: 0;
    }
    h2 {
      font-size: 12pt;
      border-bottom: 1px solid #e2e8f0;
      padding-bottom: 3pt;
      margin-top: 8pt;
    }
    h3 {
      font-size: 9.5pt;
      color: #334155;
      margin-top: 6pt;
      margin-bottom: 3pt;
    }
    p {
      margin: 4pt 0;
    }
    .badge-p0 {
      background: #fee2e2;
      color: #b91c1c;
      font-weight: 700;
      padding: 2px 7px;
      border-radius: 4px;
      font-size: 8pt;
      display: inline-block;
      border: 1px solid #f87171;
    }
    .badge-fixed {
      background: #dcfce7;
      color: #15803d;
      font-weight: 700;
      padding: 2px 7px;
      border-radius: 4px;
      font-size: 8pt;
      display: inline-block;
      border: 1px solid #4ade80;
    }
    .badge-awaiting {
      background: #fef3c7;
      color: #b45309;
      font-weight: 700;
      padding: 2px 7px;
      border-radius: 4px;
      font-size: 8pt;
      display: inline-block;
      border: 1px solid #fcd34d;
    }
    table {
      width: 100%;
      border-collapse: collapse;
      margin: 6pt 0;
      font-size: 8pt;
    }
    th, td {
      border: 1px solid #cbd5e1;
      padding: 4.5pt 6pt;
      text-align: left;
      vertical-align: top;
    }
    th {
      background-color: #f1f5f9;
      color: #1e293b;
      font-weight: 600;
    }
    tr:nth-child(even) td {
      background-color: #f8fafc;
    }
    code, pre {
      font-family: 'JetBrains Mono', Consolas, Monaco, monospace;
      font-size: 7.5pt;
    }
    code {
      background: #f1f5f9;
      color: #0f172a;
      padding: 1px 3px;
      border-radius: 3px;
    }
    pre {
      background: #0f172a;
      color: #f8fafc;
      padding: 6pt 8pt;
      border-radius: 5px;
      margin: 4pt 0;
      line-height: 1.3;
      overflow: hidden;
    }
    .diff-del { color: #f87171; background: rgba(239, 68, 68, 0.15); display: block; }
    .diff-add { color: #4ade80; background: rgba(34, 197, 94, 0.15); display: block; }
    .diff-hdr { color: #38bdf8; font-weight: bold; display: block; }
    .alert-box {
      border-left: 3.5px solid #0284c7;
      background: #f0f9ff;
      padding: 6pt 10pt;
      margin: 6pt 0;
      border-radius: 0 4px 4px 0;
      font-size: 8.5pt;
    }
    .alert-box.danger {
      border-left-color: #ef4444;
      background: #fef2f2;
    }
    .alert-box.success {
      border-left-color: #22c55e;
      background: #f0fdf4;
    }
    .screenshot-card {
      border: 1px solid #cbd5e1;
      border-radius: 5px;
      background: #ffffff;
      padding: 5pt;
      margin: 4pt 0 6pt 0;
      box-shadow: 0 1px 2px rgba(0,0,0,0.05);
      page-break-inside: avoid;
    }
    .screenshot-card img {
      width: 100%;
      max-height: 82mm;
      object-fit: contain;
      border-radius: 3px;
      border: 1px solid #e2e8f0;
      display: block;
      margin: 0 auto;
    }
    .screenshot-caption {
      font-size: 7.5pt;
      color: #475569;
      margin-top: 3pt;
      text-align: center;
      font-weight: 500;
    }
    .grid-2 {
      display: grid;
      grid-template-columns: 1fr 1fr;
      gap: 6pt;
    }
    .mobile-img {
      max-height: 84mm !important;
      width: auto !important;
      margin: 0 auto;
    }
  </style>
</head>
<body>

  <!-- PAGE 1: Executive Summary & Incident Classification -->
  <div class="page">
    <div style="display: flex; justify-content: space-between; align-items: center; margin-bottom: 4pt;">
      <span class="badge-p0">EMERGENCY P0 PRODUCTION REPAIR CERTIFICATION</span>
      <span style="font-size: 8pt; color: #64748b;">TIMESTAMP: 2026-10-10 15:45 UTC+5:30</span>
    </div>
    <h1>OmniverseOS 2.0 — Production Login Repair</h1>
    <div style="font-size: 8.5pt; color: #475569; margin-bottom: 6pt;">
      <strong>Affected Website:</strong> <code>https://omniverseos.in.net</code> &bull; <strong>Backend Cluster:</strong> <code>https://omniverseos-testing-23jun2am.onrender.com</code> &bull; <strong>Agent:</strong> Antigravity
    </div>

    <div class="alert-box danger">
      <strong>Incident Impact:</strong> Live users attempting to log in on <code>https://omniverseos.in.net</code> encountered total authentication failure. The browser reported: <em>"Access to XMLHttpRequest at '.../api/auth/login' from origin 'https://omniverseos.in.net' has been blocked by CORS policy: Response to preflight request doesn't pass access control check: No 'Access-Control-Allow-Origin' header is present on the requested resource."</em>
    </div>

    <h2>1. Executive Incident Overview</h2>
    <table>
      <thead>
        <tr>
          <th>Metric / Parameter</th>
          <th>Production Forensic Value</th>
          <th>Status</th>
        </tr>
      </thead>
      <tbody>
        <tr>
          <td><strong>Incident Priority</strong></td>
          <td>P0 Critical — Authentication Service Blockage on Primary Production Domain</td>
          <td><span class="badge-p0">CRITICAL</span></td>
        </tr>
        <tr>
          <td><strong>Production Frontend</strong></td>
          <td><code>https://omniverseos.in.net</code> (Vercel Custom Domain, Serving React Bundle)</td>
          <td>Verified Online (200 OK)</td>
        </tr>
        <tr>
          <td><strong>Production Backend</strong></td>
          <td><code>https://omniverseos-testing-23jun2am.onrender.com</code> (Render Web Service)</td>
          <td>Verified Healthy (200 OK, DB OK)</td>
        </tr>
        <tr>
          <td><strong>Failing Endpoint</strong></td>
          <td><code>POST /api/auth/login</code> (Intercepted and blocked at <code>OPTIONS</code> preflight)</td>
          <td>Repaired Locally</td>
        </tr>
        <tr>
          <td><strong>Root Cause</strong></td>
          <td>Allowlist omission: <code>https://omniverseos.in.net</code> was omitted from <code>prod_origins</code> in <code>server.py</code></td>
          <td>Root Cause Confirmed</td>
        </tr>
        <tr>
          <td><strong>Code Patch Status</strong></td>
          <td>Targeted patch in <code>backend/server.py</code> with safe union and wildcard rejection</td>
          <td><span class="badge-fixed">REPAIRED IN CODE</span></td>
        </tr>
        <tr>
          <td><strong>Regression Testing</strong></td>
          <td>20 pytest backend regression tests passed; Frontend craco production build passed</td>
          <td><span class="badge-fixed">100% PASS</span></td>
        </tr>
        <tr>
          <td><strong>Production Deployment</strong></td>
          <td>Awaiting user authorization to push to GitHub <code>main</code></td>
          <td><span class="badge-awaiting">AWAITING APPROVAL</span></td>
        </tr>
      </tbody>
    </table>

    <h2>2. Root Cause Forensic Analysis</h2>
    <p>
      In hardening commit <code>ecdb010</code>, CORS was tightened to disallow regex wildcards with credentials in production mode. However, the hardcoded production allowlist in <code>backend/server.py</code> only registered:
    </p>
    <ul>
      <li><code>https://omniverse-os-testing-23-jun-2-9gsc2pgro.vercel.app</code> (Legacy Vercel staging URL)</li>
      <li><code>https://omniverseos.app</code></li>
      <li><code>https://www.omniverseos.app</code></li>
    </ul>
    <p>
      The customer's active production custom domain, <strong><code>https://omniverseos.in.net</code></strong>, was omitted. Starlette's <code>CORSMiddleware</code> strictly checks incoming origins against <code>allow_origins</code>. When an unlisted origin arrives, the middleware intercepts the preflight request, returns <code>HTTP 400 Bad Request ("Disallowed CORS origin")</code>, and withholds the <code>Access-Control-Allow-Origin</code> header. Modern browser engines abort the request before any login credentials reach the server.
    </p>
    <p>
      <strong>DNS Domain Verification:</strong> Live DNS resolution confirmed that <code>omniverseos.in.net</code> resolves to active Vercel edge nodes. Testing <code>www.omniverseos.in.net</code> yielded <code>curl: (6) Could not resolve host: www.omniverseos.in.net</code> (NXDOMAIN). In accordance with instructions (<em>"Include https://www.omniverseos.in.net only if that origin is genuinely used"</em>), <code>www.omniverseos.in.net</code> is omitted from hardcoded defaults.
    </p>
  </div>

  <!-- PAGE 2: Code Diff & Preflight Diagnostics -->
  <div class="page">
    <h2>3. Forensic Code Diff & Hardened Architecture</h2>
    <p>
      The patch in <code>backend/server.py</code> registers <code>https://omniverseos.in.net</code> in <code>base_prod_origins</code>, unions any valid non-wildcard entries from <code>CORS_ORIGINS</code>, and preserves strict development/production separation:
    </p>

    <pre style="font-size: 7.2pt; padding: 5pt 7pt;"><code><span class="diff-hdr">@@ backend/server.py: Production CORS Allowlist Hardening @@</span>
<span class="diff-del">-_cors_env = os.environ.get("CORS_ORIGINS", "*").strip()</span>
<span class="diff-add">+_cors_env = os.environ.get("CORS_ORIGINS", "").strip()</span>
 if IS_PRODUCTION:
<span class="diff-add">+    base_prod_origins = [</span>
<span class="diff-add">+        "https://omniverseos.in.net",  # LIVE PRODUCTION FRONTEND CUSTOM DOMAIN</span>
<span class="diff-add">+        "https://omniverse-os-testing-23-jun-2-9gsc2pgro.vercel.app",</span>
<span class="diff-add">+        "https://omniverseos.app",</span>
<span class="diff-add">+        "https://www.omniverseos.app",</span>
<span class="diff-add">+    ]</span>
<span class="diff-add">+    if _cors_env and _cors_env != "*":</span>
<span class="diff-add">+        env_origins = [o.strip() for o in _cors_env.split(",") if o.strip() and o.strip() != "*"]</span>
<span class="diff-add">+        prod_origins = list(dict.fromkeys(base_prod_origins + env_origins))</span>
<span class="diff-add">+    else:</span>
<span class="diff-add">+        prod_origins = base_prod_origins</span>
     app.add_middleware(CORSMiddleware, allow_origins=prod_origins, allow_credentials=True, allow_methods=["*"], allow_headers=["*"])
 else:
<span class="diff-del">-    if _cors_env == "*":</span>
<span class="diff-add">+    if not _cors_env or _cors_env == "*":</span>
         app.add_middleware(CORSMiddleware, allow_origin_regex=".*", allow_credentials=True, allow_methods=["*"], allow_headers=["*"])</code></pre>

    <h2>4. Preflight Diagnostics: Live Production vs. Repaired Local</h2>
    <div class="grid-2">
      <div>
        <h3 style="margin-top:2pt;">LIVE RENDER (CURRENT FAILURE)</h3>
        <pre style="font-size: 6.8pt; line-height: 1.25; padding: 5pt 6pt;"><code>$ curl -i -X OPTIONS ".../api/auth/login" \\
  -H "Origin: https://omniverseos.in.net" \\
  -H "Access-Control-Request-Method: POST"

<span style="color:#f87171; font-weight:bold;">HTTP/1.1 400 Bad Request</span>
Date: Sat, 10 Oct 2026 10:01:05 GMT
access-control-allow-credentials: true
Server: cloudflare
<span style="color:#ef4444; font-weight:bold;">[ERROR: No 'access-control-allow-origin']</span>

Disallowed CORS origin</code></pre>
      </div>

      <div>
        <h3 style="margin-top:2pt;">REPAIRED BACKEND (VERIFIED 200 OK)</h3>
        <pre style="font-size: 6.8pt; line-height: 1.25; padding: 5pt 6pt;"><code>$ curl -i -X OPTIONS ".../api/auth/login" \\
  -H "Origin: https://omniverseos.in.net" \\
  -H "Access-Control-Request-Method: POST"

<span style="color:#4ade80; font-weight:bold;">HTTP/1.1 200 OK</span>
date: Sat, 10 Oct 2026 10:23:03 GMT
<span style="color:#4ade80; font-weight:bold;">access-control-allow-origin: https://omniverseos.in.net</span>
access-control-allow-credentials: true
access-control-allow-methods: DELETE, GET, POST...

OK</code></pre>
      </div>
    </div>

    <h3>Origin Isolation & Automated Regression Verification</h3>
    <p>
      Tested via automated test <code>test_cors_production_preflight_simulation</code>: When an unauthorized origin (<code>Origin: https://malicious-attacker.com</code>) makes an OPTIONS request, the server returns <code>HTTP 400 Bad Request ("Disallowed CORS origin")</code> and withholds <code>access-control-allow-origin</code>. Full test suite: <strong>20 passed, 1 skipped, 0 failed</strong>. Frontend production build: <strong>Compiled cleanly</strong>.
    </p>
  </div>

  <!-- PAGE 3: Visual Evidence (Reproduction & Repair) -->
  <div class="page">
    <h2>5. Visual Forensic Evidence: Production Failure vs. Repaired Login</h2>

    <div class="screenshot-card">
      <img src="${img01}" alt="Live Production Login CORS Error">
      <div class="screenshot-caption">
        <strong>Figure 1: Live Production Failure on <code>https://omniverseos.in.net</code></strong> — Browser intercepts <code>OPTIONS</code> preflight due to missing <code>Access-Control-Allow-Origin</code> header, displaying <em>"Something went wrong"</em> toast and <code>net::ERR_FAILED</code>.
      </div>
    </div>

    <div class="screenshot-card">
      <img src="${img02}" alt="Repaired Desktop Authentication Progress">
      <div class="screenshot-caption">
        <strong>Figure 2: Repaired Desktop Login Flow</strong> — Successful authentication using test account. JWT token is stored into <code>localStorage</code>, displaying <em>"Welcome back to OmniverseOS"</em> and synchronizing workspace.
      </div>
    </div>
  </div>

  <!-- PAGE 4: Desktop Session Persistence & Logout -->
  <div class="page">
    <h2>6. Desktop Session Persistence & Secure Logout Verification</h2>

    <div class="screenshot-card">
      <img src="${img03}" alt="Desktop Session Persistence After Page Refresh">
      <div class="screenshot-caption">
        <strong>Figure 3: Session Persistence After Page Reload</strong> — Full workspace re-hydrated cleanly upon browser refresh. All 31 apps, AI Chat, Photos, and bottom Adaptive Dock remain intact with active token.
      </div>
    </div>

    <div class="screenshot-card">
      <img src="${img04}" alt="User Logout Teardown">
      <div class="screenshot-caption">
        <strong>Figure 4: Secure User Logout</strong> — Token is purged from <code>localStorage</code>; session is immediately terminated; user is returned to the spatial gateway without leaked state.
      </div>
    </div>
  </div>

  <!-- PAGE 5: Mobile Experience & Production Deployment Instructions -->
  <div class="page">
    <h2>7. Mobile Experience & Viewport Verification (390x844 iPhone 14)</h2>
    <div class="grid-2">
      <div class="screenshot-card" style="text-align: center;">
        <img class="mobile-img" src="${img05}" alt="Mobile Login Success">
        <div class="screenshot-caption">
          <strong>Figure 5: Mobile Gateway Login</strong><br>Responsive authentication with JWT issue.
        </div>
      </div>
      <div class="screenshot-card" style="text-align: center;">
        <img class="mobile-img" src="${img06}" alt="Mobile Workspace Mounted">
        <div class="screenshot-caption">
          <strong>Figure 6: Mobile Workspace Onboarding</strong><br>User environment restored cleanly.
        </div>
      </div>
    </div>

    <h2>8. Production Release Path & Deployment Options</h2>
    <div class="alert-box">
      <strong>Current Production Blocker:</strong> The live Render backend is running commit <code>d527192</code>. Per user directives, <strong>no code has been pushed or deployed without approval</strong>.
    </div>

    <table>
      <thead>
        <tr>
          <th>Deployment Option</th>
          <th>Execution Procedure</th>
          <th>Turnaround</th>
        </tr>
      </thead>
      <tbody>
        <tr>
          <td><strong>Option A: Git Push (Recommended Code Release)</strong></td>
          <td>
            Run: <code>git push origin sprint/operation-phoenix:main</code><br>
            Render will automatically build and deploy commit with updated production CORS allowlist.
          </td>
          <td>~2-3 minutes</td>
        </tr>
        <tr>
          <td><strong>Option B: Render Dashboard Override (Zero-Downtime Immediate Fix)</strong></td>
          <td>
            1. Go to <a href="https://dashboard.render.com">https://dashboard.render.com</a> &rarr; <code>omniverseos-testing-23jun2am</code>.<br>
            2. In <strong>Environment</strong>, set <code>CORS_ORIGINS=https://omniverseos.in.net,https://omniverse-os-testing-23-jun-2-9gsc2pgro.vercel.app,https://omniverseos.app,https://www.omniverseos.app</code>.<br>
            3. Click <strong>Save Changes</strong> (restarts service in under 15 seconds without full rebuild).
          </td>
          <td>~30 seconds</td>
        </tr>
      </tbody>
    </table>

    <div class="alert-box success" style="margin-top: 6pt;">
      <strong>Final Verification Sign-Off:</strong> All tests passing. Production credentials remain protected with strict JWT signing. Persistent MongoDB cluster verified. Awaiting user authorization to deploy.
    </div>
  </div>

</body>
</html>`;

  const browser = await chromium.launch({
    headless: true,
    args: ['--no-sandbox', '--disable-setuid-sandbox']
  });

  const page = await browser.newPage();
  await page.setContent(htmlContent, { waitUntil: 'networkidle' });

  await page.pdf({
    path: OUTPUT_PDF,
    format: 'A4',
    printBackground: true,
    margin: {
      top: '10mm',
      bottom: '12mm',
      left: '10mm',
      right: '10mm'
    }
  });

  await browser.close();
  console.log('[PDF] Successfully generated:', OUTPUT_PDF);
}

generatePdf().catch(err => {
  console.error('[PDF ERROR]:', err);
  process.exit(1);
});
