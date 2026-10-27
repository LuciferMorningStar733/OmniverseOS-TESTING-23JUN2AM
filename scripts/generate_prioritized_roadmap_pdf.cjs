const path = require('path');
const fs = require('fs');

const ROOT_DIR = path.resolve(__dirname, '..');
const CERT_DIR = path.resolve(ROOT_DIR, 'artifacts', 'certification');
const OUTPUT_PDF = path.resolve(CERT_DIR, 'OMNIVERSEOS_2_0_PRIORITIZED_FIXES_AND_FEATURES_BLUEPRINT_2026-10-27.pdf');
const ROOT_PDF = path.resolve(ROOT_DIR, 'OMNIVERSEOS_2_0_PRIORITIZED_FIXES_AND_FEATURES_BLUEPRINT_2026-10-27.pdf');

async function run() {
  console.log('[ROADMAP BLUEPRINT] Compiling Prioritized Fixes & Suggested Features Master Blueprint PDF...');

  const playwrightPath = path.join(ROOT_DIR, 'frontend', 'node_modules', 'playwright');
  const { chromium } = require(playwrightPath);

  const html = `<!DOCTYPE html>
<html lang="en">
<head>
  <meta charset="UTF-8">
  <title>OmniverseOS 2.0 — Prioritized Fixes & Features Master Blueprint</title>
  <style>
    @import url('https://fonts.googleapis.com/css2?family=Segoe+UI:wght@300;400;600;700;900&family=JetBrains+Mono:wght@400;600;700&display=swap');

    * { box-sizing: border-box; margin: 0; padding: 0; }
    body {
      font-family: 'Segoe UI', -apple-system, BlinkMacSystemFont, Roboto, sans-serif;
      background: #090d16;
      color: #c9d1d9;
      font-size: 11px;
      line-height: 1.48;
      -webkit-print-color-adjust: exact;
    }

    .page {
      width: 1200px;
      min-height: 1697px;
      height: 1697px;
      padding: 45px 50px;
      background: #090d16;
      position: relative;
      page-break-after: always;
      overflow: hidden;
      display: flex;
      flex-direction: column;
    }

    .header {
      display: flex;
      justify-content: space-between;
      align-items: center;
      border-bottom: 2px solid #21262d;
      padding-bottom: 12px;
      margin-bottom: 20px;
    }
    .header .logo {
      font-size: 18px;
      font-weight: 900;
      letter-spacing: 2px;
      color: #58a6ff;
      display: flex;
      align-items: center;
      gap: 10px;
    }
    .header .meta {
      font-family: 'JetBrains Mono', monospace;
      font-size: 10px;
      color: #8b949e;
      text-align: right;
    }

    .footer {
      position: absolute;
      bottom: 25px;
      left: 50px;
      right: 50px;
      display: flex;
      justify-content: space-between;
      align-items: center;
      border-top: 1px solid #21262d;
      padding-top: 10px;
      font-family: 'JetBrains Mono', monospace;
      font-size: 9px;
      color: #8b949e;
    }

    h1 { font-size: 24px; color: #f0f6fc; font-weight: 800; margin-bottom: 8px; }
    h2 { font-size: 14px; color: #58a6ff; font-weight: 700; margin: 14px 0 8px 0; border-left: 3px solid #1f6feb; padding-left: 8px; text-transform: uppercase; letter-spacing: 0.5px; }
    h3 { font-size: 12px; color: #79c0ff; font-weight: 600; margin: 6px 0 4px 0; }
    p { margin-bottom: 8px; color: #8b949e; }
    strong { color: #f0f6fc; }
    code { font-family: 'JetBrains Mono', monospace; background: #161b22; padding: 1px 4px; border-radius: 3px; color: #79c0ff; font-size: 10px; }

    .badge {
      display: inline-block;
      padding: 3px 8px;
      border-radius: 12px;
      font-size: 9px;
      font-weight: 700;
      font-family: 'JetBrains Mono', monospace;
      text-transform: uppercase;
    }
    .badge-p0 { background: rgba(248, 81, 73, 0.2); color: #f85149; border: 1px solid #f85149; }
    .badge-p1 { background: rgba(210, 153, 34, 0.2); color: #e3b341; border: 1px solid #d29922; }
    .badge-p2 { background: rgba(56, 139, 253, 0.2); color: #58a6ff; border: 1px solid #388bfd; }
    .badge-p3 { background: rgba(163, 113, 247, 0.2); color: #bc8cff; border: 1px solid #a371f7; }
    .badge-fix { background: rgba(248, 81, 73, 0.15); color: #ff7b72; border: 1px solid rgba(248, 81, 73, 0.4); }
    .badge-feat { background: rgba(46, 160, 67, 0.15); color: #3fb950; border: 1px solid rgba(46, 160, 67, 0.4); }
    .badge-infra { background: rgba(210, 153, 34, 0.15); color: #d29922; border: 1px solid rgba(210, 153, 34, 0.4); }

    .grid-2 { display: grid; grid-template-columns: 1fr 1fr; gap: 15px; }
    .grid-3 { display: grid; grid-template-columns: 1fr 1fr 1fr; gap: 12px; }
    .grid-4 { display: grid; grid-template-columns: repeat(4, 1fr); gap: 10px; }

    .card {
      background: #111622;
      border: 1px solid #21262d;
      border-radius: 6px;
      padding: 12px;
      margin-bottom: 10px;
    }
    .card-p0 { border-left: 3px solid #f85149; }
    .card-p1 { border-left: 3px solid #d29922; }
    .card-p2 { border-left: 3px solid #388bfd; }
    .card-p3 { border-left: 3px solid #a371f7; }

    table {
      width: 100%;
      border-collapse: collapse;
      margin-bottom: 12px;
      font-size: 10px;
    }
    th, td {
      border: 1px solid #21262d;
      padding: 6px 8px;
      text-align: left;
      vertical-align: top;
    }
    th {
      background: #161b22;
      color: #f0f6fc;
      font-weight: 600;
      font-family: 'JetBrains Mono', monospace;
    }
    tr:nth-child(even) { background: rgba(22, 27, 34, 0.4); }

    .metric-box {
      background: #111622;
      border: 1px solid #21262d;
      border-radius: 6px;
      padding: 10px;
      text-align: center;
    }
    .metric-val {
      font-size: 22px;
      font-weight: 900;
      font-family: 'JetBrains Mono', monospace;
      color: #58a6ff;
    }
    .metric-label {
      font-size: 9px;
      text-transform: uppercase;
      color: #8b949e;
      margin-top: 3px;
    }

    .callout {
      border-left: 4px solid #58a6ff;
      background: rgba(56, 139, 253, 0.08);
      padding: 8px 12px;
      margin-bottom: 12px;
      border-radius: 0 4px 4px 0;
      font-size: 10px;
    }
    .callout-p0 {
      border-left-color: #f85149;
      background: rgba(248, 81, 73, 0.08);
    }

    .score-badge {
      font-family: 'JetBrains Mono', monospace;
      font-weight: 700;
      font-size: 9px;
      padding: 2px 5px;
      border-radius: 3px;
      background: #161b22;
      display: inline-block;
    }
  </style>
</head>
<body>

  <!-- PAGE 1: COVER & EXECUTIVE BLUEPRINT SUMMARY -->
  <div class="page">
    <div class="header">
      <div class="logo">OMNIVERSEOS 2.0 // MASTER ROADMAP & FIX BLUEPRINT</div>
      <div class="meta">
        DOCUMENT: OMNI-ROADMAP-2026-10-27-A-Z<br>
        PRIORITIZATION: USEFULNESS & CRITICALITY
      </div>
    </div>

    <div style="text-align: center; margin: 25px 0 20px 0;">
      <span class="badge badge-p0" style="font-size: 12px; padding: 6px 14px; margin-bottom: 10px;">EXHAUSTIVE A-Z BLUEPRINT: 30 RANKED INITIATIVES</span>
      <h1 style="font-size: 26px; margin-top: 8px; letter-spacing: -0.5px;">OmniverseOS 2.0 — Prioritized Fixes & Feature Evolution Matrix</h1>
      <p style="font-size: 12px; max-width: 880px; margin: 0 auto; color: #8b949e;">
        A comprehensive, evidence-grounded blueprint detailing every defect fix, infrastructural hardening task, reliability upgrade, and high-value feature suggestion ranked by system criticality, user utility, and architectural ROI.
      </p>
    </div>

    <div class="grid-4" style="margin-bottom: 20px;">
      <div class="metric-box">
        <div class="metric-val" style="color: #f85149;">6 Items</div>
        <div class="metric-label">P0: Critical Fixes & Blockers</div>
      </div>
      <div class="metric-box">
        <div class="metric-val" style="color: #e3b341;">8 Items</div>
        <div class="metric-label">P1: Architectural Hardening</div>
      </div>
      <div class="metric-box">
        <div class="metric-val" style="color: #58a6ff;">9 Items</div>
        <div class="metric-label">P2: High-Value Features</div>
      </div>
      <div class="metric-box">
        <div class="metric-val" style="color: #bc8cff;">7 Items</div>
        <div class="metric-label">P3: Polish & Ecosystem</div>
      </div>
    </div>

    <h2>1. Prioritization Framework & Scoring Methodology</h2>
    <p>
      Every item in this master ledger is scored across two independent axes from 1 to 10 and classified into an executive priority bucket. This prevents speculative feature bloat from preempting core data durability, security, and developer ergonomics.
    </p>

    <div class="grid-2">
      <div class="card">
        <h3>Criticality Score (1 to 10)</h3>
        <p>
          Measures the risk to system integrity, security, data durability, and process reliability if the item remains unaddressed:
        </p>
        <ul style="margin-left: 18px; color: #8b949e; font-size: 10px; line-height: 1.5;">
          <li><strong>10 - 9:</strong> Fatal blocker, data loss, security exposure, or crash bug.</li>
          <li><strong>8 - 7:</strong> Major subsystem degradation, credential blockage, or network fault.</li>
          <li><strong>6 - 4:</strong> Non-fatal architectural debt, localized failure, or performance drag.</li>
          <li><strong>3 - 1:</strong> Visual imperfection, ergonomic friction, or non-critical cosmetic issue.</li>
        </ul>
      </div>

      <div class="card">
        <h3>Usefulness Score (1 to 10)</h3>
        <p>
          Measures the daily practical value, user productivity multiplier, and architectural capability delivered to users and developers:
        </p>
        <ul style="margin-left: 18px; color: #8b949e; font-size: 10px; line-height: 1.5;">
          <li><strong>10 - 9:</strong> Core workflow transformer, essential for primary use cases.</li>
          <li><strong>8 - 7:</strong> Major daily productivity multiplier, high user engagement.</li>
          <li><strong>6 - 4:</strong> Helpful power-user tool, localized utility, or administrative aid.</li>
          <li><strong>3 - 1:</strong> Niche convenience, edge-case feature, or passive polish.</li>
        </ul>
      </div>
    </div>

    <h2>2. Executive Summary of Priority Tiers</h2>
    <table>
      <thead>
        <tr>
          <th style="width: 14%;">Tier</th>
          <th style="width: 22%;">Focus Domain</th>
          <th style="width: 44%;">Core Objectives & Strategic Mandate</th>
          <th style="width: 20%;">Target Timeline</th>
        </tr>
      </thead>
      <tbody>
        <tr>
          <td><span class="badge badge-p0">P0 BLOCKER</span></td>
          <td><strong>Critical Reliability & Persistence</strong></td>
          <td>Unblock live web search credentials, establish durable local SQLite/Mongo persistence across restarts, provision cloud Redis rate limiting, and isolate cloud storage.</td>
          <td><strong>Immediate (Week 1)</strong></td>
        </tr>
        <tr>
          <td><span class="badge badge-p1">P1 HARDENING</span></td>
          <td><strong>Core Architectural Enablers</strong></td>
          <td>Wire Kokoro TTS into server router, standardize unified SSE streaming contract, add secondary search fallbacks, and implement database connection pooling circuit breakers.</td>
          <td><strong>Near-Term (Sprint 1)</strong></td>
        </tr>
        <tr>
          <td><span class="badge badge-p2">P2 FEATURES</span></td>
          <td><strong>High-Value User Capabilities</strong></td>
          <td>Universal Command Palette (Ctrl+K), multi-window state persistence, mobile PWA offline ServiceWorker, Web Audio visualizers, and interactive search citations.</td>
          <td><strong>Mid-Term (Sprint 2 - 3)</strong></td>
        </tr>
        <tr>
          <td><span class="badge badge-p3">P3 POLISH</span></td>
          <td><strong>Ecosystem & Long-Term Vision</strong></td>
          <td>Multi-workspace virtual desktops, WebRTC peer-to-peer sync, local WebGPU AI inference, drag-and-drop Live Tile customization, and encrypted backup export.</td>
          <td><strong>Future (Release 2.1+)</strong></td>
        </tr>
      </tbody>
    </table>

    <div class="footer">
      <span>OmniverseOS 2.0 // Prioritized Roadmap Blueprint</span>
      <span>Page 1 of 9</span>
    </div>
  </div>

  <!-- PAGE 2: P0 CRITICAL FIXES & BLOCKERS (RANK 1 - 6) -->
  <div class="page">
    <div class="header">
      <div class="logo">OMNIVERSEOS 2.0 // P0 CRITICAL FIXES & BLOCKERS</div>
      <div class="meta">PAGE 2 // RANK 1 - 6</div>
    </div>

    <h2>3. Tier P0: Critical Reliability, Persistence & Security Blockers</h2>
    <p>
      These six items represent non-negotiable operational prerequisites. Resolving them eliminates data loss risks, removes credential blockers, and hardens cloud multi-tenancy.
    </p>

    <!-- PRI-01 -->
    <div class="card card-p0">
      <div style="display: flex; justify-content: space-between; align-items: center; margin-bottom: 4px;">
        <div>
          <span class="badge badge-p0">RANK #1 // PRI-01</span>
          <strong style="font-size: 13px; margin-left: 6px; color: #f0f6fc;">TinyFish Search Credential Provisioning & Vault Integration</strong>
          <span class="badge badge-fix" style="margin-left: 6px;">DEFECT FIX</span>
        </div>
        <div>
          <span class="score-badge" style="color: #f85149;">CRIT: 10/10</span>
          <span class="score-badge" style="color: #3fb950;">USE: 10/10</span>
        </div>
      </div>
      <p><strong>Subsystem:</strong> <code>backend/web_service.py</code> &bull; <strong>Complexity:</strong> Low (Config & Secrets Management)</p>
      <p>
        <strong>Problem:</strong> <code>TINYFISH_API_KEY</code> is unconfigured in local and Render environments. Live search is officially BLOCKED; queries fall back to internal model weights without real-time grounding.
      </p>
      <p>
        <strong>Proposed Fix & Architecture:</strong> Inject valid <code>TINYFISH_API_KEY</code> into Render environment variables and AWS/Infisical secrets vault. Add startup validation in <code>lifespan</code> to confirm connectivity with <code>https://api.search.tinyfish.ai</code> before flagging search as operational.
      </p>
      <p style="margin-bottom: 0;">
        <strong>Reasoning & Impact:</strong> AI responses about current events, stock prices, or software documentation are grounded in live reality, eliminating hallucinations. Unblocks 15 AI evaluation test gates.
      </p>
    </div>

    <!-- PRI-02 -->
    <div class="card card-p0">
      <div style="display: flex; justify-content: space-between; align-items: center; margin-bottom: 4px;">
        <div>
          <span class="badge badge-p0">RANK #2 // PRI-02</span>
          <strong style="font-size: 13px; margin-left: 6px; color: #f0f6fc;">Local Development Durable Persistence (SQLite / Embedded Engine)</strong>
          <span class="badge badge-infra" style="margin-left: 6px;">ARCHITECTURE</span>
        </div>
        <div>
          <span class="score-badge" style="color: #f85149;">CRIT: 9/10</span>
          <span class="score-badge" style="color: #3fb950;">USE: 9/10</span>
        </div>
      </div>
      <p><strong>Subsystem:</strong> <code>backend/core/database.py</code> &bull; <strong>Complexity:</strong> Medium</p>
      <p>
        <strong>Problem:</strong> In local dev without standalone MongoDB on port 27017, the backend defaults to <code>mongomock_motor</code>. All user notes, tasks, and memories vanish whenever uvicorn reloads or restarts.
      </p>
      <p>
        <strong>Proposed Fix & Architecture:</strong> Implement a hybrid disk-backed adapter using embedded SQLite (via <code>aiosqlite</code>) or embedded document JSON store when MongoDB is offline. Maintain an identical Motor-compatible async API so code changes are zero while ensuring notes/tasks survive local restart.
      </p>
      <p style="margin-bottom: 0;">
        <strong>Reasoning & Impact:</strong> Eliminates developer data loss frustration and allows realistic offline evaluation without mandating heavy Docker/MongoDB setup for frontend developers.
      </p>
    </div>

    <!-- PRI-03 -->
    <div class="card card-p0">
      <div style="display: flex; justify-content: space-between; align-items: center; margin-bottom: 4px;">
        <div>
          <span class="badge badge-p0">RANK #3 // PRI-03</span>
          <strong style="font-size: 13px; margin-left: 6px; color: #f0f6fc;">Distributed Redis Rate Limiter Implementation</strong>
          <span class="badge badge-infra" style="margin-left: 6px;">INFRASTRUCTURE</span>
        </div>
        <div>
          <span class="score-badge" style="color: #f85149;">CRIT: 8/10</span>
          <span class="score-badge" style="color: #3fb950;">USE: 8/10</span>
        </div>
      </div>
      <p><strong>Subsystem:</strong> <code>backend/rate_limiter.py</code> &bull; <strong>Complexity:</strong> Low-Medium</p>
      <p>
        <strong>Problem:</strong> Currently operating in <code>Memory (Fallback)</code> mode. In horizontal multi-instance deployments (e.g. Render auto-scaling), memory states do not synchronize, allowing malicious users to bypass quotas by routing across dynos.
      </p>
      <p>
        <strong>Proposed Fix & Architecture:</strong> Provision managed Redis (Upstash / Redis Cloud). Configure <code>REDIS_URL</code> with connection pooling, automatic failover back to memory, and sliding window rate-limiting scripts.
      </p>
      <p style="margin-bottom: 0;">
        <strong>Reasoning & Impact:</strong> Guarantees strict DDoS protection, controls external AI API consumption costs, and prevents multi-tenant denial-of-service across distributed containers.
      </p>
    </div>

    <!-- PRI-04 -->
    <div class="card card-p0">
      <div style="display: flex; justify-content: space-between; align-items: center; margin-bottom: 4px;">
        <div>
          <span class="badge badge-p0">RANK #4 // PRI-04</span>
          <strong style="font-size: 13px; margin-left: 6px; color: #f0f6fc;">Object Storage Migration for Generated Images & Media Assets</strong>
          <span class="badge badge-infra" style="margin-left: 6px;">STORAGE HARDENING</span>
        </div>
        <div>
          <span class="score-badge" style="color: #f85149;">CRIT: 8/10</span>
          <span class="score-badge" style="color: #3fb950;">USE: 8/10</span>
        </div>
      </div>
      <p><strong>Subsystem:</strong> <code>backend/local_image_engine.py</code> & <code>backend/routers/files.py</code> &bull; <strong>Complexity:</strong> Medium</p>
      <p>
        <strong>Problem:</strong> Generated images are encoded as base64 strings and stored directly inside MongoDB documents (<code>ai_images</code> collection). High-resolution PNGs quickly hit MongoDB's 16MB BSON document cap and inflate database RAM working sets.
      </p>
      <p>
        <strong>Proposed Fix & Architecture:</strong> Integrate S3-compatible object storage (Cloudflare R2 / AWS S3 / MinIO). Write raw image bytes directly to bucket storage with cryptographic SHA-256 keys, saving only lightweight CDN URLs and metadata in MongoDB.
      </p>
      <p style="margin-bottom: 0;">
        <strong>Reasoning & Impact:</strong> Reduces database size by 98%, eliminates BSON document size crashes, and enables global edge CDN caching for fast image rendering on mobile.
      </p>
    </div>

    <!-- PRI-05 & PRI-06 -->
    <div class="grid-2">
      <div class="card card-p0">
        <div style="display: flex; justify-content: space-between; align-items: center; margin-bottom: 4px;">
          <div>
            <span class="badge badge-p0">RANK #5 // PRI-05</span>
            <strong style="color: #f0f6fc;">Production MongoDB High-Availability Replica Set</strong>
          </div>
          <span class="score-badge" style="color: #f85149;">CRIT: 8/10</span>
        </div>
        <p><strong>Subsystem:</strong> Production Cloud Infrastructure &bull; <strong>Complexity:</strong> Low</p>
        <p style="font-size: 10px;">
          <strong>Issue:</strong> Production Render backend connects to a single-node free-tier Atlas database with 234ms latency and no point-in-time recovery.
        </p>
        <p style="font-size: 10px; margin-bottom: 0;">
          <strong>Resolution:</strong> Upgrade to a 3-node replica set in the same cloud region as Render (e.g. <code>us-east-1</code>) to drop database latency from 235ms to &lt; 20ms and provide automated hourly snapshot failover.
        </p>
      </div>

      <div class="card card-p0">
        <div style="display: flex; justify-content: space-between; align-items: center; margin-bottom: 4px;">
          <div>
            <span class="badge badge-p0">RANK #6 // PRI-06</span>
            <strong style="color: #f0f6fc;">Automated Offline CI/CD Mock Fixtures for AI Tests</strong>
          </div>
          <span class="score-badge" style="color: #f85149;">CRIT: 7/10</span>
        </div>
        <p><strong>Subsystem:</strong> <code>backend/tests/test_backend.py</code> &bull; <strong>Complexity:</strong> Low</p>
        <p style="font-size: 10px;">
          <strong>Issue:</strong> <code>test_ai_image</code> skips with 503 when cloud keys are omitted. Having skipped tests creates ambiguity in continuous delivery pipelines.
        </p>
        <p style="font-size: 10px; margin-bottom: 0;">
          <strong>Resolution:</strong> Add deterministic VCR.py / unittest mock recording for external AI endpoints. Tests pass 100% offline in air-gapped CI/CD environments without skipping or requiring live API credits.
        </p>
      </div>
    </div>

    <div class="footer">
      <span>OmniverseOS 2.0 // Prioritized Roadmap Blueprint</span>
      <span>Page 2 of 9</span>
    </div>
  </div>

  <!-- PAGE 3: P1 ARCHITECTURAL HARDENING & CORE ENABLERS (RANK 7 - 10) -->
  <div class="page">
    <div class="header">
      <div class="logo">OMNIVERSEOS 2.0 // P1 ARCHITECTURAL HARDENING</div>
      <div class="meta">PAGE 3 // RANK 7 - 10</div>
    </div>

    <h2>4. Tier P1: Core Architectural Enablers & System Hardening (Part 1)</h2>
    <p>
      High-leverage architectural improvements that stabilize streaming contracts, decouple third-party API dependencies, and enhance backend resilience under high concurrency.
    </p>

    <!-- PRI-07 -->
    <div class="card card-p1">
      <div style="display: flex; justify-content: space-between; align-items: center; margin-bottom: 4px;">
        <div>
          <span class="badge badge-p1">RANK #7 // PRI-07</span>
          <strong style="font-size: 13px; margin-left: 6px; color: #f0f6fc;">Wiring Kokoro TTS Router into Server Application Entrypoint</strong>
          <span class="badge badge-fix" style="margin-left: 6px;">ROUTING FIX</span>
        </div>
        <div>
          <span class="score-badge" style="color: #e3b341;">CRIT: 7/10</span>
          <span class="score-badge" style="color: #3fb950;">USE: 9/10</span>
        </div>
      </div>
      <p><strong>Subsystem:</strong> <code>backend/server.py</code> & <code>backend/routers/tts.py</code> &bull; <strong>Complexity:</strong> Low</p>
      <p>
        <strong>Problem:</strong> <code>backend/routers/tts.py</code> defines fully functional high-quality Kokoro TTS routes (<code>/status</code>, <code>/generate</code>), but <code>server.py</code> omits <code>app.include_router(tts_router, prefix="/api/ai/tts-kokoro")</code>. Consequently, client requests to <code>/api/ai/tts-kokoro</code> receive HTTP 405/404 errors.
      </p>
      <p>
        <strong>Proposed Fix & Architecture:</strong> Formally mount <code>tts_router</code> in <code>backend/server.py</code>. Add rate limiting, authentication dependency, and OpenAPI Swagger documentation tags. Bind frontend <code>cortexTTSManager.js</code> to use Kokoro as Level 1 neural speech generator.
      </p>
      <p style="margin-bottom: 0;">
        <strong>Reasoning & Impact:</strong> Provides zero-cost, high-fidelity local voice generation without paying for ElevenLabs or Google Cloud TTS. Unlocks natural voice conversation inside the Voice app.
      </p>
    </div>

    <!-- PRI-08 -->
    <div class="card card-p1">
      <div style="display: flex; justify-content: space-between; align-items: center; margin-bottom: 4px;">
        <div>
          <span class="badge badge-p1">RANK #8 // PRI-08</span>
          <strong style="font-size: 13px; margin-left: 6px; color: #f0f6fc;">Standardized Multi-Agent Streaming Schema (OmniStreamEvent)</strong>
          <span class="badge badge-infra" style="margin-left: 6px;">PROTOCOL UNIFICATION</span>
        </div>
        <div>
          <span class="score-badge" style="color: #e3b341;">CRIT: 7/10</span>
          <span class="score-badge" style="color: #3fb950;">USE: 8/10</span>
        </div>
      </div>
      <p><strong>Subsystem:</strong> <code>backend/server.py</code> & <code>frontend/src/lib/sseParser.js</code> &bull; <strong>Complexity:</strong> Medium</p>
      <p>
        <strong>Problem:</strong> Different cognitive routes emit slight variations of SSE formats (some raw text lines, some JSON strings, some custom event delimiters). This forces frontend stream parsers to implement brittle ad-hoc conditional logic.
      </p>
      <p>
        <strong>Proposed Fix & Architecture:</strong> Formalize a single Server-Sent Events contract:
      </p>
      <code>event: omni_event\ndata: {"type": "token"|"reasoning"|"thought"|"source"|"done", "payload": ...}\n\n</code>
      <p style="margin-top: 6px; margin-bottom: 0;">
        <strong>Reasoning & Impact:</strong> Eliminates parse exceptions during multi-line code generation, enables clean separation of reasoning chains ("DeepSeek Thinking") from final answers, and stabilizes mobile streaming.
      </p>
    </div>

    <!-- PRI-09 -->
    <div class="card card-p1">
      <div style="display: flex; justify-content: space-between; align-items: center; margin-bottom: 4px;">
        <div>
          <span class="badge badge-p1">RANK #9 // PRI-09</span>
          <strong style="font-size: 13px; margin-left: 6px; color: #f0f6fc;">Multi-Vendor Web Search Fallback Cascade (Tavily / Brave / DuckDuckGo)</strong>
          <span class="badge badge-infra" style="margin-left: 6px;">RESILIENCE ENABLER</span>
        </div>
        <div>
          <span class="score-badge" style="color: #e3b341;">CRIT: 6/10</span>
          <span class="score-badge" style="color: #3fb950;">USE: 9/10</span>
        </div>
      </div>
      <p><strong>Subsystem:</strong> <code>backend/web_service.py</code> &bull; <strong>Complexity:</strong> Medium</p>
      <p>
        <strong>Problem:</strong> OmniverseOS currently relies exclusively on <code>TinyFishSearchProvider</code> for live search. If TinyFish is down, rate-limited, or unconfigured, live search is completely disabled.
      </p>
      <p>
        <strong>Proposed Fix & Architecture:</strong> Implement the <code>WebSearchProvider</code> interface for secondary providers:
      </p>
      <ul style="margin-left: 18px; color: #8b949e; font-size: 10px;">
        <li><code>BraveSearchProvider</code> &bull; High-speed independent web index.</li>
        <li><code>TavilySearchProvider</code> &bull; AI-optimized research crawler.</li>
        <li><code>DuckDuckGoHTMLProvider</code> &bull; Zero-key free public fallback adapter.</li>
      </ul>
      <p style="margin-bottom: 0;">
        <strong>Reasoning & Impact:</strong> Guarantees 99.99% search availability; the system automatically falls back to secondary providers before dropping to offline weights.
      </p>
    </div>

    <!-- PRI-10 -->
    <div class="card card-p1">
      <div style="display: flex; justify-content: space-between; align-items: center; margin-bottom: 4px;">
        <div>
          <span class="badge badge-p1">RANK #10 // PRI-10</span>
          <strong style="font-size: 13px; margin-left: 6px; color: #f0f6fc;">Motor AsyncIOMotorClient Connection Pooling & Circuit Breakers</strong>
          <span class="badge badge-infra" style="margin-left: 6px;">BACKEND RESILIENCE</span>
        </div>
        <div>
          <span class="score-badge" style="color: #e3b341;">CRIT: 7/10</span>
          <span class="score-badge" style="color: #3fb950;">USE: 7/10</span>
        </div>
      </div>
      <p><strong>Subsystem:</strong> <code>backend/core/database.py</code> &bull; <strong>Complexity:</strong> Low-Medium</p>
      <p>
        <strong>Problem:</strong> <code>AsyncIOMotorClient</code> is instantiated with default pool settings. Under burst traffic (e.g. concurrent E2E tests or multiple active AI chat sessions), connection exhaustion can trigger <code>ServerSelectionTimeoutError</code>.
      </p>
      <p>
        <strong>Proposed Fix & Architecture:</strong> Explicitly configure <code>maxPoolSize=50</code>, <code>minPoolSize=10</code>, <code>maxIdleTimeMS=45000</code>, <code>waitQueueTimeoutMS=5000</code>, and wrap queries in an exponential backoff circuit breaker.
      </p>
      <p style="margin-bottom: 0;">
        <strong>Reasoning & Impact:</strong> Prevents database socket exhaustion, gracefully handles transient cloud network blips, and stabilizes production latency under peak concurrent loads.
      </p>
    </div>

    <div class="footer">
      <span>OmniverseOS 2.0 // Prioritized Roadmap Blueprint</span>
      <span>Page 3 of 9</span>
    </div>
  </div>

  <!-- PAGE 4: P1 ARCHITECTURAL HARDENING & CORE ENABLERS (RANK 11 - 14) -->
  <div class="page">
    <div class="header">
      <div class="logo">OMNIVERSEOS 2.0 // P1 ARCHITECTURAL HARDENING</div>
      <div class="meta">PAGE 4 // RANK 11 - 14</div>
    </div>

    <h2>5. Tier P1: Core Architectural Enablers & System Hardening (Part 2)</h2>
    <p>
      Further architectural hardening addressing voice client reliability, local model caching, structured telemetry tracing, and automated database index optimizations.
    </p>

    <!-- PRI-11 -->
    <div class="card card-p1">
      <div style="display: flex; justify-content: space-between; align-items: center; margin-bottom: 4px;">
        <div>
          <span class="badge badge-p1">RANK #11 // PRI-11</span>
          <strong style="font-size: 13px; margin-left: 6px; color: #f0f6fc;">Client Voice Synthesis Tier Cleanup (Decommissioning StreamElements 401)</strong>
          <span class="badge badge-fix" style="margin-left: 6px;">CLIENT FIX</span>
        </div>
        <div>
          <span class="score-badge" style="color: #e3b341;">CRIT: 6/10</span>
          <span class="score-badge" style="color: #3fb950;">USE: 8/10</span>
        </div>
      </div>
      <p><strong>Subsystem:</strong> <code>frontend/src/lib/streamTTS.js</code> & <code>cortexTTSManager.js</code> &bull; <strong>Complexity:</strong> Low</p>
      <p>
        <strong>Problem:</strong> <code>streamTTS.js</code> attempts to fetch from <code>https://api.streamelements.com/kappa/v2/speech</code> on every voice utterance. Because StreamElements now returns HTTP 401 Unauthorized without account tokens, the client wastes 300ms in network latency on a guaranteed failure before falling back to browser synthesis.
      </p>
      <p>
        <strong>Proposed Fix & Architecture:</strong> Remove StreamElements from default probe tier. Promote browser Web Speech API (<code>SpeechSynthesis</code>) with Edge Neural voices to Level 1 zero-cost fallback, or gate StreamElements behind an optional user API key.
      </p>
      <p style="margin-bottom: 0;">
        <strong>Reasoning & Impact:</strong> Eliminates 300ms of audio latency per spoken sentence, removes 401 errors from browser devtools console, and produces immediate instant voice playback.
      </p>
    </div>

    <!-- PRI-12 -->
    <div class="card card-p1">
      <div style="display: flex; justify-content: space-between; align-items: center; margin-bottom: 4px;">
        <div>
          <span class="badge badge-p1">RANK #12 // PRI-12</span>
          <strong style="font-size: 13px; margin-left: 6px; color: #f0f6fc;">Local Quantized GGUF / ONNX Model Engine Integration</strong>
          <span class="badge badge-feat" style="margin-left: 6px;">AI CAPABILITY</span>
        </div>
        <div>
          <span class="score-badge" style="color: #e3b341;">CRIT: 5/10</span>
          <span class="score-badge" style="color: #3fb950;">USE: 9/10</span>
        </div>
      </div>
      <p><strong>Subsystem:</strong> <code>backend/providers.py</code> &bull; <strong>Complexity:</strong> High</p>
      <p>
        <strong>Problem:</strong> When all cloud AI providers are unavailable, the system falls back to heuristic template synthesis. It cannot run true autonomous reasoning on an air-gapped laptop or offline server.
      </p>
      <p>
        <strong>Proposed Fix & Architecture:</strong> Add a local provider adapter targeting Ollama (<code>http://127.0.0.1:11434</code>) or <code>llama-cpp-python</code> with small, high-efficiency models (e.g. <code>Qwen2.5-Coder-1.5B</code>, <code>Llama-3.2-1B-Instruct</code>).
      </p>
      <p style="margin-bottom: 0;">
        <strong>Reasoning & Impact:</strong> Gives OmniverseOS genuine air-gapped sovereign AI capabilities. Zero cloud cost, zero data privacy leakage, and 100% offline functionality.
      </p>
    </div>

    <!-- PRI-13 & PRI-14 -->
    <div class="grid-2">
      <div class="card card-p1">
        <div style="display: flex; justify-content: space-between; align-items: center; margin-bottom: 4px;">
          <div>
            <span class="badge badge-p1">RANK #13 // PRI-13</span>
            <strong style="color: #f0f6fc;">Correlation ID & Request Tracing Middleware</strong>
          </div>
          <span class="score-badge" style="color: #e3b341;">CRIT: 6/10</span>
        </div>
        <p><strong>Subsystem:</strong> <code>backend/server.py</code> &bull; <strong>Complexity:</strong> Low</p>
        <p style="font-size: 10px;">
          <strong>Issue:</strong> Backend log entries lack unified transaction correlation IDs. When concurrent users trigger AI chat and image generation, log lines interleave and complicate forensic debugging.
        </p>
        <p style="font-size: 10px; margin-bottom: 0;">
          <strong>Resolution:</strong> Add FastAPI middleware generating <code>X-Request-ID</code> UUIDs. Inject into Starlette context and propagate back in response headers and logger records.
        </p>
      </div>

      <div class="card card-p1">
        <div style="display: flex; justify-content: space-between; align-items: center; margin-bottom: 4px;">
          <div>
            <span class="badge badge-p1">RANK #14 // PRI-14</span>
            <strong style="color: #f0f6fc;">Automated Compound Database Index Tuning</strong>
          </div>
          <span class="score-badge" style="color: #e3b341;">CRIT: 6/10</span>
        </div>
        <p><strong>Subsystem:</strong> <code>backend/server.py</code> lifespan &bull; <strong>Complexity:</strong> Low</p>
        <p style="font-size: 10px;">
          <strong>Issue:</strong> Queries on <code>cortex_memories</code> filtering by <code>category</code> and sorting by <code>importance_score</code> trigger in-memory sorts when datasets exceed 10,000 memories.
        </p>
        <p style="font-size: 10px; margin-bottom: 0;">
          <strong>Resolution:</strong> Add compound indexes: <code>("user_id", 1), ("category", 1), ("importance_score", -1)</code> and <code>("user_id", 1), ("updated_at", -1)</code> to eliminate full collection scans.
        </p>
      </div>
    </div>

    <div class="footer">
      <span>OmniverseOS 2.0 // Prioritized Roadmap Blueprint</span>
      <span>Page 4 of 9</span>
    </div>
  </div>

  <!-- PAGE 5: P2 HIGH-VALUE USER FEATURES (RANK 15 - 19) -->
  <div class="page">
    <div class="header">
      <div class="logo">OMNIVERSEOS 2.0 // P2 USER-FACING FEATURES</div>
      <div class="meta">PAGE 5 // RANK 15 - 19</div>
    </div>

    <h2>6. Tier P2: High-Value User Features & Desktop Ergonomics (Part 1)</h2>
    <p>
      Transformative product features that directly elevate user productivity, multi-tasking capability, and cognitive workflow speed.
    </p>

    <!-- PRI-15 -->
    <div class="card card-p2">
      <div style="display: flex; justify-content: space-between; align-items: center; margin-bottom: 4px;">
        <div>
          <span class="badge badge-p2">RANK #15 // PRI-15</span>
          <strong style="font-size: 13px; margin-left: 6px; color: #f0f6fc;">Universal Command Palette & Spotlight Launcher (Ctrl+K / Cmd+K)</strong>
          <span class="badge badge-feat" style="margin-left: 6px;">CORE UX FEATURE</span>
        </div>
        <div>
          <span class="score-badge" style="color: #388bfd;">CRIT: 5/10</span>
          <span class="score-badge" style="color: #3fb950;">USE: 10/10</span>
        </div>
      </div>
      <p><strong>Subsystem:</strong> <code>frontend/src/components/CommandPalette.js</code> &bull; <strong>Complexity:</strong> Medium</p>
      <p>
        <strong>Concept:</strong> A keyboard-first, universal modal activated from anywhere with <code>Ctrl+K</code> or <code>Cmd+K</code> (and mobile search button).
      </p>
      <p>
        <strong>Feature Specification:</strong>
      </p>
      <ul style="margin-left: 18px; color: #8b949e; font-size: 10px; line-height: 1.5;">
        <li><strong>Fuzzy App Launch:</strong> Type "war" &rarr; opens War Room; type "dead" &rarr; opens Dead Reckoning.</li>
        <li><strong>Universal File & Note Search:</strong> Instant search across user notes, tasks, files, and Cortex memories with keyboard navigation.</li>
        <li><strong>Quick AI Actions:</strong> Type <code>> ask Explain quantum superposition</code> &rarr; streams inline answer without opening full chat.</li>
        <li><strong>System Controls:</strong> Toggle dark/cyber theme, mute audio, clear clipboard, view telemetry.</li>
      </ul>
      <p style="margin-top: 6px; margin-bottom: 0;">
        <strong>Reasoning & User Impact:</strong> Standard in modern pro operating systems (macOS Spotlight, Raycast, VS Code). Speeds up power-user navigation by 5&times;.
      </p>
    </div>

    <!-- PRI-16 -->
    <div class="card card-p2">
      <div style="display: flex; justify-content: space-between; align-items: center; margin-bottom: 4px;">
        <div>
          <span class="badge badge-p2">RANK #16 // PRI-16</span>
          <strong style="font-size: 13px; margin-left: 6px; color: #f0f6fc;">Multi-Window Desktop Session Persistence</strong>
          <span class="badge badge-feat" style="margin-left: 6px;">DESKTOP WORKSPACE</span>
        </div>
        <div>
          <span class="score-badge" style="color: #388bfd;">CRIT: 5/10</span>
          <span class="score-badge" style="color: #3fb950;">USE: 9/10</span>
        </div>
      </div>
      <p><strong>Subsystem:</strong> <code>frontend/src/components/Desktop.js</code> & <code>WindowManager.js</code> &bull; <strong>Complexity:</strong> Medium</p>
      <p>
        <strong>Problem:</strong> When a user refreshes the browser or reloads the tab, all open windows, coordinates, sizes, active tabs, and z-indexes are destroyed, returning to an empty desktop.
      </p>
      <p>
        <strong>Proposed Feature:</strong> Debounce window geometry, active app state, and layout positions into <code>localStorage</code> (and cloud sync in MongoDB). Upon reload, restore open windows with Framer Motion entry animations.
      </p>
      <p style="margin-bottom: 0;">
        <strong>Reasoning & User Impact:</strong> Eliminates session loss frustration. Users can curate their exact multi-window layout (e.g. Chat on left, Code editor on right, System Health docked bottom) and find it preserved every morning.
      </p>
    </div>

    <!-- PRI-17 -->
    <div class="card card-p2">
      <div style="display: flex; justify-content: space-between; align-items: center; margin-bottom: 4px;">
        <div>
          <span class="badge badge-p2">RANK #17 // PRI-17</span>
          <strong style="font-size: 13px; margin-left: 6px; color: #f0f6fc;">Progressive Web App (PWA) Offline ServiceWorker & Installability</strong>
          <span class="badge badge-feat" style="margin-left: 6px;">MOBILE & DESKTOP</span>
        </div>
        <div>
          <span class="score-badge" style="color: #388bfd;">CRIT: 5/10</span>
          <span class="score-badge" style="color: #3fb950;">USE: 9/10</span>
        </div>
      </div>
      <p><strong>Subsystem:</strong> <code>frontend/public/service-worker.js</code> & <code>manifest.json</code> &bull; <strong>Complexity:</strong> Medium</p>
      <p>
        <strong>Concept:</strong> Full PWA certification enabling "Install OmniverseOS" on Windows, macOS, Android, and iOS.
      </p>
      <p>
        <strong>Feature Specification:</strong> Cache-first strategy for static assets (React bundle, icons, Cyberpunk wallpapers). Background sync for offline note creation. Standalone full-screen display mode hiding browser chrome.
      </p>
      <p style="margin-bottom: 0;">
        <strong>Reasoning & User Impact:</strong> Delivers true native app feel on Windows Phone / Android with zero browser address bar, instant boot times, and offline accessibility.
      </p>
    </div>

    <!-- PRI-18 & PRI-19 -->
    <div class="grid-2">
      <div class="card card-p2">
        <div style="display: flex; justify-content: space-between; align-items: center; margin-bottom: 4px;">
          <div>
            <span class="badge badge-p2">RANK #18 // PRI-18</span>
            <strong style="color: #f0f6fc;">Interactive Web Citations & Source Inspection</strong>
          </div>
          <span class="score-badge" style="color: #388bfd;">USE: 9/10</span>
        </div>
        <p><strong>Subsystem:</strong> <code>frontend/src/apps/AIChat.js</code> &bull; <strong>Complexity:</strong> Medium</p>
        <p style="font-size: 10px;">
          <strong>Concept:</strong> When web search operates, render citation pills (e.g. <code>[1] spacex.com</code>) that expand on hover to show exact snippet text, publisher favicon, and domain trust score.
        </p>
        <p style="font-size: 10px; margin-bottom: 0;">
          <strong>Impact:</strong> Provides Perplexity-grade source transparency. Users can verify claims without leaving the OS interface.
        </p>
      </div>

      <div class="card card-p2">
        <div style="display: flex; justify-content: space-between; align-items: center; margin-bottom: 4px;">
          <div>
            <span class="badge badge-p2">RANK #19 // PRI-19</span>
            <strong style="color: #f0f6fc;">Real-Time Audio Frequency WebGL / Canvas Visualizer</strong>
          </div>
          <span class="score-badge" style="color: #388bfd;">USE: 8/10</span>
        </div>
        <p><strong>Subsystem:</strong> <code>frontend/src/apps/Voice/VoiceWaveform.js</code> &bull; <strong>Complexity:</strong> Medium</p>
        <p style="font-size: 10px;">
          <strong>Concept:</strong> Connect <code>VoiceWaveform.js</code> and <code>CyberOrb.js</code> to real Web Audio API <code>AnalyserNode</code> frequency bin data during both mic input and audio playback.
        </p>
        <p style="font-size: 10px; margin-bottom: 0;">
          <strong>Impact:</strong> Replaces synthetic CSS keyframe loops with authentic audio-reactive pulsing waves, creating a tactile Jarvis-like voice experience.
        </p>
      </div>
    </div>

    <div class="footer">
      <span>OmniverseOS 2.0 // Prioritized Roadmap Blueprint</span>
      <span>Page 5 of 9</span>
    </div>
  </div>

  <!-- PAGE 6: P2 HIGH-VALUE USER FEATURES (RANK 20 - 23) -->
  <div class="page">
    <div class="header">
      <div class="logo">OMNIVERSEOS 2.0 // P2 USER-FACING FEATURES</div>
      <div class="meta">PAGE 6 // RANK 20 - 23</div>
    </div>

    <h2>7. Tier P2: High-Value User Features & Desktop Ergonomics (Part 2)</h2>
    <p>
      Continuation of major feature enhancements across mobile gestures, multi-tab code editing, intelligent memory extraction, and collaborative export tools.
    </p>

    <!-- PRI-20 -->
    <div class="card card-p2">
      <div style="display: flex; justify-content: space-between; align-items: center; margin-bottom: 4px;">
        <div>
          <span class="badge badge-p2">RANK #20 // PRI-20</span>
          <strong style="font-size: 13px; margin-left: 6px; color: #f0f6fc;">Windows Phone Natural Swipe Gestures & Edge Navigation</strong>
          <span class="badge badge-feat" style="margin-left: 6px;">MOBILE UX</span>
        </div>
        <div>
          <span class="score-badge" style="color: #388bfd;">CRIT: 4/10</span>
          <span class="score-badge" style="color: #3fb950;">USE: 9/10</span>
        </div>
      </div>
      <p><strong>Subsystem:</strong> <code>frontend/src/styles/responsive.css</code> & <code>Desktop.js</code> &bull; <strong>Complexity:</strong> Medium</p>
      <p>
        <strong>Concept:</strong> Implement authentic Windows 10 Mobile swipe ergonomics for touchscreen devices:
      </p>
      <ul style="margin-left: 18px; color: #8b949e; font-size: 10px; line-height: 1.5;">
        <li><strong>Swipe Left on Start Screen:</strong> Smooth horizontal pan transition directly into the alphabetized Metro App Drawer.</li>
        <li><strong>Left-Edge Swipe:</strong> Acts as hardware back button, returning to previous app state or closing overlay.</li>
        <li><strong>Swipe Down from Top Edge:</strong> Pulls down Action Center with quick toggles (Theme, Sound, WiFi, Battery, Notifications).</li>
        <li><strong>Haptic Feedback:</strong> Bind subtle <code>navigator.vibrate(15)</code> ticks to gesture trigger boundaries.</li>
      </ul>
      <p style="margin-top: 6px; margin-bottom: 0;">
        <strong>Reasoning & User Impact:</strong> Elevates the Windows Phone experience from static CSS layout into an authentic fluid mobile operating system.
      </p>
    </div>

    <!-- PRI-21 -->
    <div class="card card-p2">
      <div style="display: flex; justify-content: space-between; align-items: center; margin-bottom: 4px;">
        <div>
          <span class="badge badge-p2">RANK #21 // PRI-21</span>
          <strong style="font-size: 13px; margin-left: 6px; color: #f0f6fc;">Multi-Tab Document Editing in Code & Notes Applications</strong>
          <span class="badge badge-feat" style="margin-left: 6px;">PRODUCTIVITY</span>
        </div>
        <div>
          <span class="score-badge" style="color: #388bfd;">CRIT: 4/10</span>
          <span class="score-badge" style="color: #3fb950;">USE: 8/10</span>
        </div>
      </div>
      <p><strong>Subsystem:</strong> <code>frontend/src/apps/Code.js</code> & <code>Notes.js</code> &bull; <strong>Complexity:</strong> Medium</p>
      <p>
        <strong>Problem:</strong> Opening a file in Code or a note in Notes overwrites the current document. Users cannot compare two files or switch between multiple active drafts inside the same application window.
      </p>
      <p>
        <strong>Proposed Feature:</strong> Implement an internal tab bar inside Code and Notes windows. Support tab creation, close buttons, modified dirty state indicators (<code>&bull;</code>), and keyboard switching (<code>Ctrl+Tab</code>).
      </p>
      <p style="margin-bottom: 0;">
        <strong>Reasoning & User Impact:</strong> Enables true software development and content writing inside OmniverseOS without cluttering the desktop with 10 duplicate window instances.
      </p>
    </div>

    <!-- PRI-22 & PRI-23 -->
    <div class="grid-2">
      <div class="card card-p2">
        <div style="display: flex; justify-content: space-between; align-items: center; margin-bottom: 4px;">
          <div>
            <span class="badge badge-p2">RANK #22 // PRI-22</span>
            <strong style="color: #f0f6fc;">Automatic Cortex Memory Extraction Pipeline</strong>
          </div>
          <span class="score-badge" style="color: #3fb950;">USE: 8/10</span>
        </div>
        <p><strong>Subsystem:</strong> <code>backend/structured_ai.py</code> &bull; <strong>Complexity:</strong> Medium</p>
        <p style="font-size: 10px;">
          <strong>Concept:</strong> During normal chat interactions, run background extraction using <code>ExtractedMemoryList</code> schema to automatically detect user preferences, project goals, tech stack choices, and key facts.
        </p>
        <p style="font-size: 10px; margin-bottom: 0;">
          <strong>Impact:</strong> Transforms Cortex into a personal lifelong second brain that remembers context across sessions without manual note-taking.
        </p>
      </div>

      <div class="card card-p2">
        <div style="display: flex; justify-content: space-between; align-items: center; margin-bottom: 4px;">
          <div>
            <span class="badge badge-p2">RANK #23 // PRI-23</span>
            <strong style="color: #f0f6fc;">One-Click Workspace Export & Backup Archive</strong>
          </div>
          <span class="score-badge" style="color: #3fb950;">USE: 8/10</span>
        </div>
        <p><strong>Subsystem:</strong> <code>frontend/src/components/ExportManager.js</code> &bull; <strong>Complexity:</strong> Low</p>
        <p style="font-size: 10px;">
          <strong>Concept:</strong> Export entire user state (Notes, Tasks, Chat History, Cortex Memories, Files, Project DNA) into an encrypted ZIP bundle or clean JSON archive.
        </p>
        <p style="font-size: 10px; margin-bottom: 0;">
          <strong>Impact:</strong> Gives users total data sovereignty. Prevents vendor lock-in and allows seamless local-to-cloud migration.
        </p>
      </div>
    </div>

    <div class="footer">
      <span>OmniverseOS 2.0 // Prioritized Roadmap Blueprint</span>
      <span>Page 6 of 9</span>
    </div>
  </div>

  <!-- PAGE 7: P3 STRATEGIC POLISH & ECOSYSTEM EVOLUTION (RANK 24 - 30) -->
  <div class="page">
    <div class="header">
      <div class="logo">OMNIVERSEOS 2.0 // P3 STRATEGIC ECOSYSTEM</div>
      <div class="meta">PAGE 7 // RANK 24 - 30</div>
    </div>

    <h2>8. Tier P3: Strategic Polish, Ecosystem Extensions & Vision (Rank 24 - 30)</h2>
    <p>
      Forward-looking capabilities that position OmniverseOS as a differentiated next-generation web operating system.
    </p>

    <!-- PRI-24 -->
    <div class="card card-p3">
      <div style="display: flex; justify-content: space-between; align-items: center; margin-bottom: 4px;">
        <div>
          <span class="badge badge-p3">RANK #24 // PRI-24</span>
          <strong style="font-size: 13px; margin-left: 6px; color: #f0f6fc;">Virtual Desktops & Purpose-Driven Workspaces</strong>
          <span class="badge badge-feat" style="margin-left: 6px;">DESKTOP INNOVATION</span>
        </div>
        <div>
          <span class="score-badge" style="color: #bc8cff;">CRIT: 3/10</span>
          <span class="score-badge" style="color: #3fb950;">USE: 8/10</span>
        </div>
      </div>
      <p><strong>Subsystem:</strong> <code>frontend/src/components/Desktop.js</code> &bull; <strong>Complexity:</strong> Medium</p>
      <p>
        <strong>Concept:</strong> Multi-desktop switcher accessible via TopBar or keyboard (<code>Ctrl+Alt+Left/Right</code>). Separate Workspaces:
        <strong>Workspace 1:</strong> Engineering (Code, Terminal, System Health), <strong>Workspace 2:</strong> Strategic War Room (War Room, Adversary, Consensus), <strong>Workspace 3:</strong> Personal (Notes, Music, Calendar).
      </p>
    </div>

    <!-- PRI-25 -->
    <div class="card card-p3">
      <div style="display: flex; justify-content: space-between; align-items: center; margin-bottom: 4px;">
        <div>
          <span class="badge badge-p3">RANK #25 // PRI-25</span>
          <strong style="font-size: 13px; margin-left: 6px; color: #f0f6fc;">Peer-to-Peer WebRTC Workspace Sync (Multi-Device Convergence)</strong>
          <span class="badge badge-feat" style="margin-left: 6px;">ECOSYSTEM SYNC</span>
        </div>
        <div>
          <span class="score-badge" style="color: #bc8cff;">CRIT: 3/10</span>
          <span class="score-badge" style="color: #3fb950;">USE: 8/10</span>
        </div>
      </div>
      <p><strong>Subsystem:</strong> <code>frontend/src/lib/p2pSync.js</code> &bull; <strong>Complexity:</strong> High</p>
      <p>
        <strong>Concept:</strong> Scan a QR code on your phone to establish an end-to-end encrypted WebRTC data channel between desktop browser and Windows Phone mobile instance. Instant shared clipboard, handoff open notes, and real-time cursor sharing without routing sensitive data through cloud servers.
      </p>
    </div>

    <!-- PRI-26 to PRI-30 Grid -->
    <div class="grid-2">
      <!-- PRI-26 -->
      <div class="card card-p3">
        <div style="display: flex; justify-content: space-between; align-items: center; margin-bottom: 4px;">
          <div>
            <span class="badge badge-p3">RANK #26 // PRI-26</span>
            <strong style="color: #f0f6fc;">WebGPU In-Browser AI Inference</strong>
          </div>
          <span class="score-badge" style="color: #3fb950;">USE: 7/10</span>
        </div>
        <p style="font-size: 10px;">
          <strong>Concept:</strong> Integrate WebLLM / Transformers.js to execute quantized models (e.g. <code>SmolLM2-360M</code>) directly on user GPU via WebGPU with zero server calls.
        </p>
      </div>

      <!-- PRI-27 -->
      <div class="card card-p3">
        <div style="display: flex; justify-content: space-between; align-items: center; margin-bottom: 4px;">
          <div>
            <span class="badge badge-p3">RANK #27 // PRI-27</span>
            <strong style="color: #f0f6fc;">Live Tile Resizing & Drag-and-Drop Pinning</strong>
          </div>
          <span class="score-badge" style="color: #3fb950;">USE: 7/10</span>
        </div>
        <p style="font-size: 10px;">
          <strong>Concept:</strong> Allow users to resize mobile Live Tiles between Small (1&times;1), Medium (2&times;2), and Wide (4&times;2) formats and drag-to-reorder like Windows 10 Mobile.
        </p>
      </div>

      <!-- PRI-28 -->
      <div class="card card-p3">
        <div style="display: flex; justify-content: space-between; align-items: center; margin-bottom: 4px;">
          <div>
            <span class="badge badge-p3">RANK #28 // PRI-28</span>
            <strong style="color: #f0f6fc;">Sound Design & Audio Theme Soundpack Engine</strong>
          </div>
          <span class="score-badge" style="color: #3fb950;">USE: 6/10</span>
        </div>
        <p style="font-size: 10px;">
          <strong>Concept:</strong> Add authentic sound schemes: subtle sci-fi clicks on tile press, window minimize whooshes, and synthesized chimes on task completion.
        </p>
      </div>

      <!-- PRI-29 -->
      <div class="card card-p3">
        <div style="display: flex; justify-content: space-between; align-items: center; margin-bottom: 4px;">
          <div>
            <span class="badge badge-p3">RANK #29 // PRI-29</span>
            <strong style="color: #f0f6fc;">Role-Based Multi-User Organization Workspaces</strong>
          </div>
          <span class="score-badge" style="color: #3fb950;">USE: 7/10</span>
        </div>
        <p style="font-size: 10px;">
          <strong>Concept:</strong> Support organization accounts, shared War Room strategy sessions, and permission tiers (Admin, Member, Read-Only Guest).
        </p>
      </div>

      <!-- PRI-30 -->
      <div class="card card-p3" style="grid-column: span 2;">
        <div style="display: flex; justify-content: space-between; align-items: center; margin-bottom: 4px;">
          <div>
            <span class="badge badge-p3">RANK #30 // PRI-30</span>
            <strong style="color: #f0f6fc;">Custom App Developer SDK & Sandboxed Plugin IFrame Architecture</strong>
          </div>
          <span class="score-badge" style="color: #3fb950;">USE: 8/10</span>
        </div>
        <p style="font-size: 10px;">
          <strong>Concept:</strong> Publish an open JavaScript SDK (<code>window.Omniverse</code>) allowing third-party developers to build custom applications that render inside sandboxed IFrames with access to safe OS APIs (storage, AI chat stream, clipboard, notification toasts).
        </p>
      </div>
    </div>

    <div class="footer">
      <span>OmniverseOS 2.0 // Prioritized Roadmap Blueprint</span>
      <span>Page 7 of 9</span>
    </div>
  </div>

  <!-- PAGE 8: COMPLETE A-Z MASTER INVENTORY LEDGER -->
  <div class="page">
    <div class="header">
      <div class="logo">OMNIVERSEOS 2.0 // COMPLETE A-Z MASTER LEDGER</div>
      <div class="meta">PAGE 8 // ALL 30 ITEMS AT A GLANCE</div>
    </div>

    <h2>9. Master A-Z Prioritization Ledger (Ranks 1 Through 30)</h2>
    <p>
      Complete consolidated ledger displaying all 30 ranked initiatives, subsystems, categories, criticality, usefulness, and implementation estimates.
    </p>

    <table>
      <thead>
        <tr>
          <th style="width: 5%;">#</th>
          <th style="width: 28%;">Initiative Name</th>
          <th style="width: 14%;">Subsystem</th>
          <th style="width: 10%;">Category</th>
          <th style="width: 7%;">Crit</th>
          <th style="width: 7%;">Use</th>
          <th style="width: 8%;">Tier</th>
          <th style="width: 21%;">Primary Objective</th>
        </tr>
      </thead>
      <tbody>
        <tr><td><strong>1</strong></td><td>TinyFish Search Credentials</td><td><code>backend/web_service</code></td><td><span class="badge badge-fix">Fix</span></td><td>10</td><td>10</td><td><span class="badge badge-p0">P0</span></td><td>Unblock live web search capabilities</td></tr>
        <tr><td><strong>2</strong></td><td>Local Dev Durable Persistence</td><td><code>backend/core/database</code></td><td><span class="badge badge-infra">Infra</span></td><td>9</td><td>9</td><td><span class="badge badge-p0">P0</span></td><td>Prevent data loss on local restart</td></tr>
        <tr><td><strong>3</strong></td><td>Distributed Redis Rate Limiter</td><td><code>backend/rate_limiter</code></td><td><span class="badge badge-infra">Infra</span></td><td>8</td><td>8</td><td><span class="badge badge-p0">P0</span></td><td>DDoS protection across multi-dyno scaling</td></tr>
        <tr><td><strong>4</strong></td><td>Object Storage S3 Media Migration</td><td><code>backend/local_image</code></td><td><span class="badge badge-infra">Storage</span></td><td>8</td><td>8</td><td><span class="badge badge-p0">P0</span></td><td>Prevent MongoDB 16MB BSON cap crashes</td></tr>
        <tr><td><strong>5</strong></td><td>Production MongoDB HA Cluster</td><td>Cloud Atlas</td><td><span class="badge badge-infra">Infra</span></td><td>8</td><td>7</td><td><span class="badge badge-p0">P0</span></td><td>Drop latency from 234ms to &lt;20ms</td></tr>
        <tr><td><strong>6</strong></td><td>Automated CI/CD Test Mocks</td><td><code>backend/tests</code></td><td><span class="badge badge-fix">Test</span></td><td>7</td><td>7</td><td><span class="badge badge-p0">P0</span></td><td>Eliminate test skips in air-gapped CI</td></tr>
        <tr><td><strong>7</strong></td><td>Wire Kokoro TTS Server Router</td><td><code>backend/server.py</code></td><td><span class="badge badge-fix">Fix</span></td><td>7</td><td>9</td><td><span class="badge badge-p1">P1</span></td><td>Enable high-fidelity neural voice route</td></tr>
        <tr><td><strong>8</strong></td><td>Standardized SSE Event Schema</td><td><code>backend/sse_stream</code></td><td><span class="badge badge-infra">Schema</span></td><td>7</td><td>8</td><td><span class="badge badge-p1">P1</span></td><td>Normalize streaming contract across AI</td></tr>
        <tr><td><strong>9</strong></td><td>Multi-Vendor Search Cascade</td><td><code>backend/web_service</code></td><td><span class="badge badge-infra">Resilience</span></td><td>6</td><td>9</td><td><span class="badge badge-p1">P1</span></td><td>Tavily/Brave fallback for 99.99% search</td></tr>
        <tr><td><strong>10</strong></td><td>Motor DB Connection Pooling</td><td><code>backend/core/database</code></td><td><span class="badge badge-infra">Database</span></td><td>7</td><td>7</td><td><span class="badge badge-p1">P1</span></td><td>Prevent socket exhaustion under high load</td></tr>
        <tr><td><strong>11</strong></td><td>Client Voice Failover Cleanup</td><td><code>frontend/src/lib/streamTTS</code></td><td><span class="badge badge-fix">Fix</span></td><td>6</td><td>8</td><td><span class="badge badge-p1">P1</span></td><td>Eliminate StreamElements 401 delay</td></tr>
        <tr><td><strong>12</strong></td><td>Local GGUF/ONNX Model Engine</td><td><code>backend/providers</code></td><td><span class="badge badge-feat">Feature</span></td><td>5</td><td>9</td><td><span class="badge badge-p1">P1</span></td><td>True offline sovereign AI capabilities</td></tr>
        <tr><td><strong>13</strong></td><td>Request Tracing Correlation ID</td><td><code>backend/server.py</code></td><td><span class="badge badge-infra">Observability</span></td><td>6</td><td>6</td><td><span class="badge badge-p1">P1</span></td><td>Trace transactions across frontend & AI</td></tr>
        <tr><td><strong>14</strong></td><td>Compound DB Index Optimization</td><td><code>backend/database</code></td><td><span class="badge badge-infra">Database</span></td><td>6</td><td>6</td><td><span class="badge badge-p1">P1</span></td><td>Eliminate in-memory sort scans</td></tr>
        <tr><td><strong>15</strong></td><td>Universal Command Palette (Ctrl+K)</td><td><code>frontend/components</code></td><td><span class="badge badge-feat">Feature</span></td><td>5</td><td>10</td><td><span class="badge badge-p2">P2</span></td><td>Spotlight launcher for apps & AI actions</td></tr>
        <tr><td><strong>16</strong></td><td>Desktop Window State Persistence</td><td><code>frontend/Desktop.js</code></td><td><span class="badge badge-feat">Feature</span></td><td>5</td><td>9</td><td><span class="badge badge-p2">P2</span></td><td>Preserve open window coordinates on reload</td></tr>
        <tr><td><strong>17</strong></td><td>PWA Offline ServiceWorker</td><td><code>frontend/public</code></td><td><span class="badge badge-feat">Feature</span></td><td>5</td><td>9</td><td><span class="badge badge-p2">P2</span></td><td>Full standalone installable web OS</td></tr>
        <tr><td><strong>18</strong></td><td>Interactive Web Search Citations</td><td><code>frontend/apps/AIChat</code></td><td><span class="badge badge-feat">Feature</span></td><td>4</td><td>9</td><td><span class="badge badge-p2">P2</span></td><td>Hover cards with snippet source proof</td></tr>
        <tr><td><strong>19</strong></td><td>Real-Time Web Audio Visualizer</td><td><code>frontend/apps/Voice</code></td><td><span class="badge badge-feat">Feature</span></td><td>4</td><td>8</td><td><span class="badge badge-p2">P2</span></td><td>Reactive frequency bin audio waveform</td></tr>
        <tr><td><strong>20</strong></td><td>Windows Phone Natural Gestures</td><td><code>frontend/styles</code></td><td><span class="badge badge-feat">Feature</span></td><td>4</td><td>9</td><td><span class="badge badge-p2">P2</span></td><td>Swipe-to-drawer & edge navigation</td></tr>
        <tr><td><strong>21</strong></td><td>Multi-Tab Editing in Code & Notes</td><td><code>frontend/apps/Code</code></td><td><span class="badge badge-feat">Feature</span></td><td>4</td><td>8</td><td><span class="badge badge-p2">P2</span></td><td>Multi-document comparison tabs</td></tr>
        <tr><td><strong>22</strong></td><td>Auto Cortex Memory Extraction</td><td><code>backend/structured_ai</code></td><td><span class="badge badge-feat">Feature</span></td><td>4</td><td>8</td><td><span class="badge badge-p2">P2</span></td><td>Automatic lifelong user context learning</td></tr>
        <tr><td><strong>23</strong></td><td>One-Click Workspace Export ZIP</td><td><code>frontend/components</code></td><td><span class="badge badge-feat">Feature</span></td><td>4</td><td>8</td><td><span class="badge badge-p2">P2</span></td><td>Encrypted JSON/ZIP backup archive</td></tr>
        <tr><td><strong>24</strong></td><td>Virtual Desktops & Workspaces</td><td><code>frontend/Desktop.js</code></td><td><span class="badge badge-feat">Feature</span></td><td>3</td><td>8</td><td><span class="badge badge-p3">P3</span></td><td>Multi-desktop workspace switcher</td></tr>
        <tr><td><strong>25</strong></td><td>WebRTC Peer-to-Peer Device Sync</td><td><code>frontend/lib/p2pSync</code></td><td><span class="badge badge-feat">Feature</span></td><td>3</td><td>8</td><td><span class="badge badge-p3">P3</span></td><td>Direct phone-to-desktop clipboard sync</td></tr>
        <tr><td><strong>26</strong></td><td>WebGPU In-Browser AI Inference</td><td><code>frontend/ai_worker</code></td><td><span class="badge badge-feat">Feature</span></td><td>3</td><td>7</td><td><span class="badge badge-p3">P3</span></td><td>Client-side GPU model execution</td></tr>
        <tr><td><strong>27</strong></td><td>Live Tile Drag & Resizing</td><td><code>frontend/apps/Launcher</code></td><td><span class="badge badge-feat">Feature</span></td><td>3</td><td>7</td><td><span class="badge badge-p3">P3</span></td><td>Small/Medium/Wide tile customization</td></tr>
        <tr><td><strong>28</strong></td><td>OS Audio Soundpack Themes</td><td><code>frontend/lib/sound</code></td><td><span class="badge badge-feat">Feature</span></td><td>2</td><td>6</td><td><span class="badge badge-p3">P3</span></td><td>Sci-fi UI audio ticks & chimes</td></tr>
        <tr><td><strong>29</strong></td><td>Role-Based Multi-User Workspaces</td><td><code>backend/auth</code></td><td><span class="badge badge-feat">Feature</span></td><td>3</td><td>7</td><td><span class="badge badge-p3">P3</span></td><td>Team War Room collaboration & sharing</td></tr>
        <tr><td><strong>30</strong></td><td>Sandboxed Plugin App SDK</td><td><code>frontend/lib/sdk</code></td><td><span class="badge badge-feat">Feature</span></td><td>3</td><td>8</td><td><span class="badge badge-p3">P3</span></td><td>Third-party app ecosystem developer SDK</td></tr>
      </tbody>
    </table>

    <div class="footer">
      <span>OmniverseOS 2.0 // Prioritized Roadmap Blueprint</span>
      <span>Page 8 of 9</span>
    </div>
  </div>

  <!-- PAGE 9: IMPLEMENTATION ROADMAP & EXECUTION PHASES -->
  <div class="page">
    <div class="header">
      <div class="logo">OMNIVERSEOS 2.0 // IMPLEMENTATION ROADMAP</div>
      <div class="meta">PAGE 9 // EXECUTION SCHEDULE</div>
    </div>

    <h2>10. Phased Execution Schedule & Milestone Roadmap</h2>
    <p>
      Structured delivery plan prioritizing data security, operational reliability, and core developer ergonomics before deploying complex user-facing extensions.
    </p>

    <!-- Phase Milestones -->
    <div class="card card-p0">
      <div style="display: flex; justify-content: space-between; align-items: center; margin-bottom: 6px;">
        <h3 style="color: #f0f6fc; margin: 0;">MILESTONE 1: Critical Reliability & Blocker Cleared (Days 1 - 7)</h3>
        <span class="badge badge-p0">FOCUS: P0 ITEMS (RANK 1 - 6)</span>
      </div>
      <p style="font-size: 10px; color: #8b949e;">
        <strong>Key Deliverables:</strong> Provision <code>TINYFISH_API_KEY</code> to unblock live search; implement SQLite disk-backed local persistence adapter in <code>database.py</code>; provision cloud Redis instance for distributed rate limiting; migrate image storage from MongoDB BSON to S3/Cloudflare R2; upgrade production MongoDB Atlas to replica set; add air-gapped CI/CD mock fixtures.
      </p>
      <div style="font-family: 'JetBrains Mono', monospace; font-size: 9px; color: #3fb950; background: #0d1117; padding: 6px; border-radius: 4px;">
        SUCCESS CRITERIA: 100% Pytest pass with 0 skips; records survive local restart; live search operational; 0MB base64 in MongoDB.
      </div>
    </div>

    <div class="card card-p1">
      <div style="display: flex; justify-content: space-between; align-items: center; margin-bottom: 6px;">
        <h3 style="color: #f0f6fc; margin: 0;">MILESTONE 2: Architectural Hardening & Voice Overhaul (Weeks 2 - 3)</h3>
        <span class="badge badge-p1">FOCUS: P1 ITEMS (RANK 7 - 14)</span>
      </div>
      <p style="font-size: 10px; color: #8b949e;">
        <strong>Key Deliverables:</strong> Mount Kokoro TTS router in <code>server.py</code>; formalize standardized <code>OmniStreamEvent</code> SSE schema; implement Brave & Tavily search cascades; tune Motor connection pool settings; decommission StreamElements 401 route in favor of Web Speech API; integrate Ollama local LLM provider; add correlation IDs.
      </p>
      <div style="font-family: 'JetBrains Mono', monospace; font-size: 9px; color: #e3b341; background: #0d1117; padding: 6px; border-radius: 4px;">
        SUCCESS CRITERIA: Voice latency reduced to &lt;50ms; SSE parser handles 100% of reasoning deltas; 99.99% search uptime.
      </div>
    </div>

    <div class="card card-p2">
      <div style="display: flex; justify-content: space-between; align-items: center; margin-bottom: 6px;">
        <h3 style="color: #f0f6fc; margin: 0;">MILESTONE 3: Pro User Experience & Mobile Ergonomics (Weeks 4 - 6)</h3>
        <span class="badge badge-p2">FOCUS: P2 ITEMS (RANK 15 - 23)</span>
      </div>
      <p style="font-size: 10px; color: #8b949e;">
        <strong>Key Deliverables:</strong> Build Universal Command Palette (<code>Ctrl+K</code>); implement desktop window geometry persistence in <code>localStorage</code>; register offline PWA ServiceWorker; build interactive hover citation cards; connect Web Audio AnalyserNode to <code>VoiceWaveform.js</code>; add Windows Phone swipe gestures; enable multi-tab editing.
      </p>
      <div style="font-family: 'JetBrains Mono', monospace; font-size: 9px; color: #58a6ff; background: #0d1117; padding: 6px; border-radius: 4px;">
        SUCCESS CRITERIA: Command palette launches all 32 apps in &lt;100ms; desktop state restores on reload; PWA installable on iOS/Android.
      </div>
    </div>

    <div class="card card-p3">
      <div style="display: flex; justify-content: space-between; align-items: center; margin-bottom: 6px;">
        <h3 style="color: #f0f6fc; margin: 0;">MILESTONE 4: Ecosystem & Sovereign Platform (Weeks 7 - 10)</h3>
        <span class="badge badge-p3">FOCUS: P3 ITEMS (RANK 24 - 30)</span>
      </div>
      <p style="font-size: 10px; color: #8b949e;">
        <strong>Key Deliverables:</strong> Multi-desktop virtual workspaces; WebRTC phone-to-desktop clipboard sync; WebGPU client-side model execution; drag-and-drop Live Tile customization; sound design audio themes; multi-user team workspaces; open sandboxed IFrame plugin SDK.
      </p>
      <div style="font-family: 'JetBrains Mono', monospace; font-size: 9px; color: #bc8cff; background: #0d1117; padding: 6px; border-radius: 4px;">
        SUCCESS CRITERIA: Fully independent sovereign web operating system with developer plugin ecosystem and zero cloud lock-in.
      </div>
    </div>

    <div class="callout callout-p0" style="margin-top: 15px;">
      <strong>SUMMARY DIRECTIVE:</strong> Do not proceed to speculative P2/P3 UI additions until Milestone 1 (P0 Fixes & Persistence) is 100% verified against live production infrastructure. Stability, data durability, and credential integrity form the bedrock of OmniverseOS 2.0.
    </div>

    <div class="footer">
      <span>OmniverseOS 2.0 // Prioritized Roadmap Blueprint</span>
      <span>Page 9 of 9</span>
    </div>
  </div>

</body>
</html>`;

  const browser = await chromium.launch({
    headless: true,
    args: ['--no-sandbox', '--disable-setuid-sandbox', '--disable-dev-shm-usage']
  });

  const page = await browser.newPage();
  await page.setContent(html, { waitUntil: 'networkidle' });

  // Generate individual page screenshots for visual verification
  const pageElements = await page.$$('.page');
  console.log(`Found ${pageElements.length} pages. Generating visual screenshots...`);

  const pagesDir = path.resolve(CERT_DIR, 'pdf_pages_roadmap');
  if (!fs.existsSync(pagesDir)) fs.mkdirSync(pagesDir, { recursive: true });

  for (let i = 0; i < pageElements.length; i++) {
    const screenshotPath = path.resolve(pagesDir, `roadmap_page_${i + 1}.png`);
    await pageElements[i].screenshot({ path: screenshotPath });
    console.log(`  Saved page screenshot: roadmap_page_${i + 1}.png`);
  }

  // Generate high-resolution PDF
  console.log('Generating high-resolution PDF...');
  await page.pdf({
    path: OUTPUT_PDF,
    width: '1200px',
    height: '1697px',
    printBackground: true,
    margin: { top: '0px', right: '0px', bottom: '0px', left: '0px' },
    displayHeaderFooter: false,
    preferCSSPageSize: true
  });

  fs.copyFileSync(OUTPUT_PDF, ROOT_PDF);
  console.log(`[SUCCESS] Roadmap Blueprint PDF generated successfully:`);
  console.log(`  Artifact path: ${OUTPUT_PDF} (${fs.statSync(OUTPUT_PDF).size} bytes)`);
  console.log(`  Root path:     ${ROOT_PDF}`);

  await browser.close();
}

run().catch(err => {
  console.error('[ERROR] PDF generation failed:', err);
  process.exit(1);
});
