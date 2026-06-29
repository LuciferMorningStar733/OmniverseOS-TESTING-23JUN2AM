/**
 * speechCorrection.js — Context-Aware Speech Correction Engine
 * OmniverseOS Speech Intelligence Layer
 *
 * Context-aware speech-to-text transcript normalization.
 * Corrects common speech-to-text errors without modifying proper names.
 * Executes entirely locally - no AI calls, no network requests.
 * Target execution: <5ms
 *
 * Architecture:
 *   normalizeTranscript(rawTranscript, context) → correctedTranscript
 *
 * Context sources used:
 *   - browserUrl    : domain-based vocabulary biasing (github.com → dev terms)
 *   - activeAppId   : app-based biasing (chat/code → technical; music/calendar → preserve)
 *   - browserTitle  : page title for additional signal
 *
 * Dictionaries (independent, extendable without touching Voice.js):
 *   DICT_DEVELOPER  : software engineering terms
 *   DICT_AI         : AI model / provider names
 *   DICT_GENERAL    : universal corrections always safe to apply
 *
 * Microphone context:
 *   "mike" → "mic" only when surrounding words are audio/voice related.
 *   "Mike Tyson", "Call Mike tomorrow" → UNCHANGED.
 */

// ─────────────────────────────────────────────────────────────────────────────
// CONTEXTUAL DICTIONARIES
// Each entry: [rawPattern, correctedForm]
// Patterns are matched case-insensitively at word boundaries.
// ─────────────────────────────────────────────────────────────────────────────

/**
 * Developer dictionary — software engineering vocabulary.
 * Applied when context signals a developer/code/browser environment.
 */
const DICT_DEVELOPER = [
  // Hosting & Collaboration
  ["git hub",        "GitHub"],
  ["github",         "GitHub"],
  ["git lab",        "GitLab"],
  ["stack overflow", "Stack Overflow"],
  ["vs code",        "VS Code"],
  ["visual studio code", "Visual Studio Code"],
  // Languages & Runtimes
  ["javascript",     "JavaScript"],
  ["java script",    "JavaScript"],
  ["typescript",     "TypeScript"],
  ["type script",    "TypeScript"],
  ["node js",        "Node.js"],
  ["node jay s",     "Node.js"],
  ["python",         "Python"],
  ["react js",       "React"],
  ["react jay s",    "React"],
  ["next js",        "Next.js"],
  ["next jay s",     "Next.js"],
  ["fast api",       "FastAPI"],
  ["flask",          "Flask"],
  ["mongo db",       "MongoDB"],
  ["mongodb",        "MongoDB"],
  ["postgre sql",    "PostgreSQL"],
  ["postgres",       "PostgreSQL"],
  ["sequel",         "SQL"],
  ["docker",         "Docker"],
  ["kubernetes",     "Kubernetes"],
  ["open router",    "OpenRouter"],
  // Formats & Protocols
  ["jason",          "JSON"],
  ["jay son",        "JSON"],
  ["jay s on",       "JSON"],
  ["j son",          "JSON"],
  ["html",           "HTML"],
  ["css",            "CSS"],
  ["yaml",           "YAML"],
  ["rest api",       "REST API"],
  ["graphql",        "GraphQL"],
  ["web hook",       "webhook"],
  ["web hooks",      "webhooks"],
  // Developer Terms
  ["api",            "API"],
  ["ui",             "UI"],
  ["ux",             "UX"],
  ["cli",            "CLI"],
  ["sdk",            "SDK"],
  ["npm",            "npm"],
  ["p npm",          "pnpm"],
  ["yarn",           "yarn"],
  ["repo",           "repository"],
  ["repos",          "repositories"],
  ["pull request",   "Pull Request"],
  ["pull requests",  "Pull Requests"],
  ["p r",            "PR"],
  ["commit",         "commit"],
  ["branch",         "branch"],
  ["terminal",       "terminal"],
  ["shell",          "shell"],
  ["regex",          "Regex"],
  ["regular expression", "Regex"],
  ["dev ops",        "DevOps"],
  ["devops",         "DevOps"],
  ["ci cd",          "CI/CD"],
  ["open source",    "open source"],
  ["prompt engineer", "Prompt Engineer"],
  ["web socket",     "WebSocket"],
  ["web sockets",    "WebSockets"],
  ["local storage",  "localStorage"],
  ["session storage","sessionStorage"],
  ["tts",            "TTS"],
  ["stt",            "STT"],
  ["t t s",          "TTS"],
  ["s t t",          "STT"],
  ["llm",            "LLM"],
  ["l l m",          "LLM"],
];

/**
 * AI & Provider dictionary — AI model and service names.
 * Applied in all technical contexts.
 */
const DICT_AI = [
  ["open a i",       "OpenAI"],
  ["open ai",        "OpenAI"],
  ["chat gpt",       "ChatGPT"],
  ["chat g p t",     "ChatGPT"],
  ["claud",          "Claude"],
  ["claude",         "Claude"],
  ["anthropic",      "Anthropic"],
  ["gem any",        "Gemini"],
  ["gem ini",        "Gemini"],
  ["gemini",         "Gemini"],
  ["gem any flash",  "Gemini Flash"],
  ["gem any pro",    "Gemini Pro"],
  ["growk",          "Grok"],
  ["grok",           "Grok"],
  ["deep seek",      "DeepSeek"],
  ["deepseek",       "DeepSeek"],
  ["llama",          "Llama"],
  ["mistral",        "Mistral"],
  ["cerebras",       "Cerebras"],
  ["perplexity",     "Perplexity"],
  ["hugging face",   "Hugging Face"],
  ["lm studio",      "LM Studio"],
  ["ollama",         "Ollama"],
];

/**
 * General dictionary — safe corrections in all contexts.
 * Only includes unambiguous technical terms unlikely to be proper names.
 */
const DICT_GENERAL = [
  ["wifi",           "Wi-Fi"],
  ["wi fi",          "Wi-Fi"],
  ["bluetooth",      "Bluetooth"],
  ["iphone",         "iPhone"],
  ["i phone",        "iPhone"],
  ["ipad",           "iPad"],
  ["i pad",          "iPad"],
  ["macbook",        "MacBook"],
  ["mac book",       "MacBook"],
  ["macos",          "macOS"],
  ["mac os",         "macOS"],
  ["ios",            "iOS"],
  ["android",        "Android"],
  ["windows",        "Windows"],
  ["linux",          "Linux"],
  ["ubuntu",         "Ubuntu"],
];

// ── Microphone context words ────────────────────────────────────────────────────
const MIC_CONTEXT_WORDS = new Set([
  "mute", "unmute", "audio", "speaker", "speakers", "microphone",
  "record", "recording", "bluetooth", "headset", "headphone", "headphones",
  "discord", "noise", "stream", "streaming", "podcast", "call", "calls",
  "meeting", "meetings", "zoom", "teams", "voice", "volume", "mic",
  "testing", "test", "check", "input", "output", "sound", "mixer",
  "gain", "monitor", "studio",
]);

// ── App domain classification ──────────────────────────────────────────────────
const TECH_APP_IDS = new Set([
  "chat", "code", "browser", "voice", "image", "memory", "dashboard",
  "analytics", "nebula",
]);

const CASUAL_APP_IDS = new Set([
  "music", "calendar", "notes", "tasks", "finance", "watchlist",
  "videos", "files", "clipboard", "settings",
]);

// ── URL domain biasing ──────────────────────────────────────────────────────────
function biasFromUrl(url) {
  if (!url) return { dev: false, ai: false };
  const lower = url.toLowerCase();
  const devDomains = [
    "github.com", "gitlab.com", "stackoverflow.com", "npmjs.com",
    "developer.", "docs.", "api.", "code.", "dev.", "codesandbox.io",
    "replit.com", "vercel.com", "netlify.com", "codepen.io",
  ];
  const aiDomains = [
    "openai.com", "anthropic.com", "gemini.google.com", "chat.openai.com",
    "claude.ai", "perplexity.ai", "huggingface.co", "deepseek.com",
  ];
  const dev = devDomains.some(d => lower.includes(d));
  const ai = aiDomains.some(d => lower.includes(d));
  return { dev, ai };
}

// ── Core correction functions ──────────────────────────────────────────────────

function buildPattern(phrase) {
  const escaped = phrase.replace(/[.*+?^${}()|[\]\\]/g, "\\$&");
  return new RegExp(`(?<![\\w])${escaped}(?![\\w])`, "gi");
}

function applyDictionary(text, dict) {
  let result = text;
  for (const [raw, corrected] of dict) {
    const pattern = buildPattern(raw);
    result = result.replace(pattern, corrected);
  }
  return result;
}

function correctMikeToMic(text) {
  const micKeywords = MIC_CONTEXT_WORDS;
  const words = text.split(/(\s+)/);
  const tokens = words.filter(w => w.trim().length > 0);
  const WINDOW = 5;

  const correctedTokens = tokens.map((token, idx) => {
    if (!/^mike$/i.test(token)) return token;
    const start = Math.max(0, idx - WINDOW);
    const end = Math.min(tokens.length - 1, idx + WINDOW);
    for (let i = start; i <= end; i++) {
      if (i === idx) continue;
      const clean = tokens[i].toLowerCase().replace(/[^a-z]/g, "");
      if (micKeywords.has(clean)) {
        if (token === token.toUpperCase()) return "MIC";
        if (token[0] === token[0].toUpperCase()) return "Mic";
        return "mic";
      }
    }
    return token;
  });

  let out = "";
  let tIdx = 0;
  for (const part of words) {
    if (part.trim().length > 0) {
      out += correctedTokens[tIdx++];
    } else {
      out += part;
    }
  }
  return out;
}

// ── Public API ────────────────────────────────────────────────────────────────

/**
 * Normalizes a raw speech-to-text transcript using contextual awareness.
 *
 * @param {string} rawTranscript - Raw text from SpeechRecognition API
 * @param {Object} [context={}] - Context object for intelligent correction
 * @param {string} [context.browserUrl] - Current browser tab URL
 * @param {string} [context.activeAppId] - Active OmniverseOS app ID
 * @param {string} [context.browserTitle] - Current browser page title
 * @returns {string} - Corrected transcript
 */
export function normalizeTranscript(rawTranscript, context = {}) {
  if (!rawTranscript || !rawTranscript.trim()) return rawTranscript;

  const start = performance.now();

  const { browserUrl = "", activeAppId = "", browserTitle = "" } = context;
  const urlBias = biasFromUrl(browserUrl);
  const isDevApp = TECH_APP_IDS.has(activeAppId);
  const titleLower = browserTitle.toLowerCase();

  // Dev mode: tech app OR dev URL OR dev-related title
  const devMode = isDevApp || urlBias.dev ||
    ["github", "code", "api", "docs", "developer", "stack overflow"].some(t =>
      titleLower.includes(t)
    );
  const aiMode = isDevApp || urlBias.ai ||
    ["openai", "anthropic", "chatgpt", "claude", "gemini", "perplexity", "deepseek"].some(t =>
      titleLower.includes(t)
    );

  const useDevDict = devMode;
  const useAiDict = aiMode || isDevApp;

  let corrected = rawTranscript;

  // Always apply mic correction first
  corrected = correctMikeToMic(corrected);

  // Apply context-aware dictionaries
  if (useDevDict) corrected = applyDictionary(corrected, DICT_DEVELOPER);
  if (useAiDict) corrected = applyDictionary(corrected, DICT_AI);
  corrected = applyDictionary(corrected, DICT_GENERAL);

  const elapsed = performance.now() - start;
  if (typeof performance !== "undefined") {
    console.debug(
      `[SpeechCorrection] Normalized in ${elapsed.toFixed(2)}ms | ` +
      `input="${rawTranscript.slice(0, 50)}..." | ` +
      `output="${corrected.slice(0, 50)}..."`
    );
  }

  return corrected;
}

export { normalizeTranscript };
export default { normalizeTranscript };
