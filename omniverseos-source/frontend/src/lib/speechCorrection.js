/**
 * speechCorrection.js — Context-Aware Speech Correction Engine
 * OmniverseOS Speech Intelligence Layer
 *
 * Corrects STT (speech-to-text) transcript errors using contextual awareness.
 * No AI calls. No network requests. Executes locally in <5ms.
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
// Each entry: [rawPattern (lowercase), correctedForm]
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

  // STT/TTS abbreviations
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
  ["chat g p t",     "ChatGPT"],
  ["chat gpt",       "ChatGPT"],
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
  ["open router",    "OpenRouter"],
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

// ─────────────────────────────────────────────────────────────────────────────
// MICROPHONE CONTEXT — "mike" → "mic" only when in audio/voice context
// ─────────────────────────────────────────────────────────────────────────────

/**
 * Words that signal "mike" means "microphone" (not a person's name).
 * If any of these appear within 5 words of "mike", apply the correction.
 */
const MIC_CONTEXT_WORDS = new Set([
  "mute", "unmute", "audio", "speaker", "speakers", "microphone",
  "record", "recording", "bluetooth", "headset", "headphone", "headphones",
  "discord", "noise", "stream", "streaming", "podcast", "call", "calls",
  "meeting", "meetings", "zoom", "teams", "voice", "volume", "mic",
  "testing", "test", "check", "input", "output", "sound", "mixer",
  "gain", "monitor", "studio",
]);

// ─────────────────────────────────────────────────────────────────────────────
// APP DOMAIN CLASSIFICATION
// ─────────────────────────────────────────────────────────────────────────────

/**
 * App IDs that indicate a technical/developer context.
 * These receive full developer + AI dictionary corrections.
 */
const TECH_APP_IDS = new Set([
  "chat", "code", "browser", "voice", "image", "memory", "dashboard",
  "analytics", "nebula",
]);

/**
 * App IDs that indicate a general/casual context.
 * These receive only general + AI corrections (no aggressive dev rewriting).
 */
const CASUAL_APP_IDS = new Set([
  "music", "calendar", "notes", "tasks", "finance", "watchlist",
  "videos", "files", "clipboard", "settings",
]);

// ─────────────────────────────────────────────────────────────────────────────
// URL DOMAIN BIASING
// ─────────────────────────────────────────────────────────────────────────────

/**
 * Returns the active dictionary set based on browser URL.
 * @param {string} url
 * @returns {{ dev: boolean, ai: boolean }}
 */
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
  const ai  = aiDomains.some(d => lower.includes(d));
  return { dev, ai };
}

// ─────────────────────────────────────────────────────────────────────────────
// CORE CORRECTION ENGINE
// ─────────────────────────────────────────────────────────────────────────────

/**
 * Builds a regex from a raw phrase for whole-word matching.
 * Escapes special regex characters.
 * @param {string} phrase
 * @returns {RegExp}
 */
function buildPattern(phrase) {
  const escaped = phrase.replace(/[.*+?^${}()|[\]\\]/g, "\\$&");
  return new RegExp(`(?<![\\w])${escaped}(?![\\w])`, "gi");
}

/**
 * Applies a dictionary of corrections to a transcript.
 * Respects word boundaries to avoid partial-word substitutions.
 *
 * @param {string} text - Input transcript
 * @param {Array<[string, string]>} dict - Array of [rawPattern, correction]
 * @returns {string} - Corrected transcript
 */
function ap
