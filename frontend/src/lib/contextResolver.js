/**
 * contextResolver.js — Context Resolution Engine
 * OmniverseOS Speech Correction Engine
 *
 * Analyzes raw context signals (URL, appId, title) and resolves them into
 * a structured ContextProfile used by speechCorrection.js to make
 * intelligent dictionary-selection decisions.
 *
 * Architecture:
 *   resolveContext(rawContext) → ContextProfile
 *
 * ContextProfile:
 *   {
 *     isDev     : boolean  — apply developer/engineering vocabulary
 *     isAI      : boolean  — apply AI/ML model vocabulary
 *     isGeneral : boolean  — always true; apply universal safe corrections
 *     confidence: number   — 0.0–1.0, overall signal strength
 *     signals   : string[] — debug: which signals fired
 *   }
 *
 * All logic is local — no network calls, no side effects.
 * Target: <1ms
 */

// ── Dev domain signals ──────────────────────────────────────────────────────
const DEV_DOMAINS = [
  "github.com",
  "gitlab.com",
  "bitbucket.org",
  "stackoverflow.com",
  "npmjs.com",
  "developer.",
  "docs.",
  "api.",
  "code.",
  "dev.",
  "codesandbox.io",
  "replit.com",
  "vercel.com",
  "netlify.com",
  "codepen.io",
  "jsfiddle.net",
  "glitch.me",
  "heroku.com",
  "render.com",
  "railway.app",
];

const AI_DOMAINS = [
  "openai.com",
  "anthropic.com",
  "gemini.google.com",
  "chat.openai.com",
  "claude.ai",
  "perplexity.ai",
  "huggingface.co",
  "deepseek.com",
  "mistral.ai",
  "groq.com",
  "together.ai",
  "replicate.com",
  "cohere.com",
  "ai21.com",
  "lmstudio.ai",
  "ollama.ai",
];

// ── App ID classification ───────────────────────────────────────────────────
const TECH_APP_IDS = new Set([
  "chat",
  "code",
  "browser",
  "voice",
  "image",
  "memory",
  "dashboard",
  "analytics",
  "nebula",
  "terminal",
  "editor",
]);

const AI_APP_IDS = new Set([
  "chat",
  "nebula",
  "image",
  "voice",
  "memory",
]);

const CASUAL_APP_IDS = new Set([
  "music",
  "calendar",
  "notes",
  "tasks",
  "finance",
  "watchlist",
  "videos",
  "files",
  "clipboard",
  "settings",
]);

// ── Title keyword signals ───────────────────────────────────────────────────
const DEV_TITLE_KEYWORDS = [
  "github", "gitlab", "code", "api", "docs", "documentation",
  "developer", "stack overflow", "npm", "terminal", "editor",
  "ide", "repository", "pull request", "commit", "branch",
  "deploy", "deployment", "ci", "pipeline", "workflow",
];

const AI_TITLE_KEYWORDS = [
  "openai", "anthropic", "chatgpt", "claude", "gemini",
  "perplexity", "deepseek", "llama", "mistral", "grok",
  "chat", "ai assistant", "copilot", "hugging face",
  "model", "inference", "llm", "prompt",
];

// ── Helper ──────────────────────────────────────────────────────────────────
function matchesAny(str, patterns) {
  return patterns.some(p => str.includes(p));
}

// ── Public API ──────────────────────────────────────────────────────────────
/**
 * Resolves raw context signals into a ContextProfile.
 *
 * @param {Object} rawContext
 * @param {string} [rawContext.browserUrl]    - Current browser tab URL
 * @param {string} [rawContext.activeAppId]   - Active OmniverseOS app ID
 * @param {string} [rawContext.browserTitle]  - Current page/app title
 * @returns {ContextProfile}
 */
export function resolveContext(rawContext = {}) {
  const {
    browserUrl   = "",
    activeAppId  = "",
    browserTitle = "",
  } = rawContext;

  const url   = browserUrl.toLowerCase();
  const appId = activeAppId.toLowerCase().trim();
  const title = browserTitle.toLowerCase();

  const signals = [];
  let devScore = 0;
  let aiScore  = 0;

  // ── URL signals (high confidence) ────────────────────────────────────────
  if (url && matchesAny(url, DEV_DOMAINS)) {
    devScore += 3;
    signals.push(`url:dev(${browserUrl.slice(0, 40)})`);
  }
  if (url && matchesAny(url, AI_DOMAINS)) {
    aiScore += 3;
    signals.push(`url:ai(${browserUrl.slice(0, 40)})`);
  }

  // ── App ID signals (medium confidence) ───────────────────────────────────
  if (TECH_APP_IDS.has(appId)) {
    devScore += 2;
    signals.push(`app:tech(${appId})`);
  }
  if (AI_APP_IDS.has(appId)) {
    aiScore += 2;
    signals.push(`app:ai(${appId})`);
  }
  if (CASUAL_APP_IDS.has(appId)) {
    // Casual context — dampen technical corrections
    devScore -= 1;
    aiScore  -= 1;
    signals.push(`app:casual(${appId})`);
  }

  // ── Title signals (low-medium confidence) ─────────────────────────────────
  if (title && matchesAny(title, DEV_TITLE_KEYWORDS)) {
    devScore += 1;
    signals.push(`title:dev`);
  }
  if (title && matchesAny(title, AI_TITLE_KEYWORDS)) {
    aiScore += 1;
    signals.push(`title:ai`);
  }

  // ── Threshold + normalization ─────────────────────────────────────────────
  const isDev = devScore >= 1;
  const isAI  = aiScore  >= 1;

  // Confidence: max possible raw score is ~6 per domain; normalize to 0–1
  const maxScore  = 6;
  const rawMax    = Math.max(devScore, aiScore, 0);
  const confidence = Math.min(rawMax / maxScore, 1.0);

  return {
    isDev,
    isAI,
    isGeneral: true,       // always apply general corrections
    confidence: parseFloat(confidence.toFixed(2)),
    signals,
    _scores: { dev: devScore, ai: aiScore }, // debug only
  };
}

export default { resolveContext };
