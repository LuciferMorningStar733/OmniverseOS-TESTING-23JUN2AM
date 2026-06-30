/**
 * ambiguityDetector.js — Cortex Ambiguity Detection Layer
 * OmniverseOS Cortex Intelligence Layer
 *
 * Intercepts user messages before sending to the LLM.
 * Returns a clarification payload when intent confidence is low.
 * Uses conversation history to auto-resolve when context is clear.
 *
 * Zero network calls. Pure rule-based. Target: <2ms
 */

// ── Domain keyword signals (for context-based auto-resolution) ──────────────
const DOMAIN_SIGNALS = {
  motorcycle: [
    "motorcycle", "motorbike", "bike", "honda", "kawasaki", "yamaha",
    "suzuki", "ducati", "ktm", "riding", "rider", "cc engine", "two-wheeler",
    "cbr", "crf", "cb series", "nx series", "hornet", "adventure bike",
  ],
  camera: [
    "camera", "photo", "photography", "canon", "nikon", "sony", "samsung camera",
    "fujifilm", "mirrorless", "dslr", "lens", "aperture", "shutter speed",
    "megapixel", "shoot", "shooting", "sensor", "iso", "raw image",
  ],
  coding: [
    "programming", "code", "developer", "react", "javascript", "python",
    "java language", "java programming", "software", "npm", "github", "api",
    "function", "library", "framework", "jdk", "jvm", "spring", "maven",
    "gradle", "backend", "frontend", "typescript", "compiler",
  ],
  music: [
    "music", "song", "album", "playlist", "spotify", "listen", "track",
    "artist", "band", "audio", "soundcloud", "youtube music", "apple music",
    "streaming", "concert", "lyrics",
  ],
  geography: [
    "island", "travel", "country", "city", "indonesia", "bali", "jakarta",
    "tourism", "southeast asia", "geography", "map", "tourist", "vacation",
    "holiday", "destination",
  ],
};

/**
 * Extracts domain signals from recent conversation history.
 *
 * @param {Array} messages - Array of {role, content} objects
 * @returns {Set<string>} - Established domains ("motorcycle", "camera", etc.)
 */
function extractContextDomains(messages) {
  const activeDomains = new Set();
  const recent = messages.slice(-12);

  for (const msg of recent) {
    if (!msg.content) continue;
    const text = msg.content.toLowerCase();
    for (const [domain, signals] of Object.entries(DOMAIN_SIGNALS)) {
      if (signals.some((sig) => text.includes(sig))) {
        activeDomains.add(domain);
      }
    }
  }

  return activeDomains;
}

/**
 * Tries to auto-resolve an ambiguous set of meanings using conversation context.
 * Returns the resolved meaning ID only if exactly one meaning matches.
 *
 * @param {Array}  meanings       - Array of { id, label, icon, domain }
 * @param {Set}    contextDomains - Active domains from conversation history
 * @returns {string|null}
 */
function tryAutoResolve(meanings, contextDomains) {
  if (contextDomains.size === 0) return null;
  const matches = meanings.filter((m) => m.domain && contextDomains.has(m.domain));
  return matches.length === 1 ? matches[0].id : null;
}

// ── Ambiguous term definitions ─────────────────────────────────────────────
// Each entry describes one pattern and its candidate meanings.
const AMBIGUOUS_TERMS = [
  // "Search Java" / "Look up Java" — Java = language or island
  // Does NOT fire when qualified (e.g. "Search Java documentation", "Search Java programming")
  {
    key: "java_search",
    pattern: /\b(?:search|find|look\s+up|google|look\s+for)\s+java\b/i,
    qualifier: /\b(?:docs?|documentation|tutorial|programming|language|code|sdk|jdk|spring|maven|gradle|ee|se|me|8|11|17|21|framework|library|api)\b/i,
    question: "I found multiple possible meanings for \"Java\". Which one did you mean?",
    meanings: [
      { id: "java_language", label: "Java programming language", icon: "code",   domain: "coding"    },
      { id: "java_island",   label: "Java (island in Indonesia)", icon: "globe",  domain: "geography" },
    ],
  },

  // "Play Animals" / "Listen to Animals" — could be a song by multiple artists or a game
  {
    key: "animals_play",
    pattern: /\b(?:play|listen\s+to)\s+animals\b/i,
    qualifier: null,
    question: "I found multiple possible meanings for \"Animals\". Which one did you mean?",
    meanings: [
      { id: "animals_maroon5", label: "\"Animals\" by Maroon 5",      icon: "music",   domain: "music" },
      { id: "animals_garrix",  label: "\"Animals\" by Martin Garrix", icon: "music",   domain: "music" },
      { id: "animals_game",    label: "Animals (video game)",          icon: "gamepad", domain: null    },
    ],
  },

  // "Open Notes" / "Launch Notes" — could be OmniverseOS Notes or external apps
  // "Open Browser" does NOT fire (Browser is unambiguous in OmniverseOS)
  {
    key: "notes_command",
    pattern: /\b(?:open|launch|start|show)\s+notes?\b/i,
    qualifier: null,
    question: "Which Notes app did you mean?",
    meanings: [
      { id: "omniverse_notes", label: "OmniverseOS Notes app", icon: "note-sticky",   domain: null },
      { id: "apple_notes",     label: "Apple Notes",            icon: "apple",         domain: null },
      { id: "google_keep",     label: "Google Keep",            icon: "google",        domain: null },
    ],
  },
];

// ── Multi-term rules ───────────────────────────────────────────────────────
// Fires when the combination of terms is ambiguous, even if each term alone isn't.
const MULTI_TERM_RULES = [
  {
    key: "cb200x_nx200",
    // Triggers when CB200X and NX200 appear together WITHOUT clear brand disambiguation.
    // "Honda CB200X and Honda NX200" → both branded → no trigger
    // "Samsung NX200 and Sony A6400" → no CB200X → no trigger
    // "Compare CB200X and NX200" → ambiguous → trigger
    test(text) {
      const hasCB200X = /\bcb200x\b/i.test(text);
      const hasNX200  = /\bnx200\b/i.test(text);
      if (!hasCB200X || !hasNX200) return false;
      // Both terms present — check if brand context resolves NX200
      const hondaBothSides =
        /honda\s+cb200x/i.test(text) && /honda\s+nx200/i.test(text);
      const samsungNX = /samsung\s+nx200/i.test(text);
      return !hondaBothSides && !samsungNX;
    },
    question: "I found multiple possible meanings for \"NX200\". Which one did you mean?",
    options: [
      { id: "motorcycle", label: "Honda CB200X vs Honda NX200 (motorcycles)",          icon: "motorcycle" },
      { id: "camera",     label: "Honda CB200X (motorcycle) vs Samsung NX200 (camera)", icon: "camera"     },
    ],
    autoResolveDomain: { motorcycle: "motorcycle", camera: "camera" },
  },
];

/**
 * Main ambiguity detection entry point.
 *
 * @param {string} text     - The user's raw message
 * @param {Array}  messages - Conversation history [{ role, content }]
 * @returns {{
 *   needs_clarification: boolean,
 *   question?: string,
 *   options?: Array<{ id, label, icon }>,
 * }}
 */
export function detectAmbiguity(text, messages = []) {
  const contextDomains = extractContextDomains(messages);

  // ── Multi-term rules (highest specificity) ──────────────────────────────
  for (const rule of MULTI_TERM_RULES) {
    if (!rule.test(text)) continue;

    // Context-based auto-resolve for multi-term rules
    if (rule.autoResolveDomain) {
      for (const [domain, resolvedId] of Object.entries(rule.autoResolveDomain)) {
        const otherDomains = Object.keys(rule.autoResolveDomain).filter((d) => d !== domain);
        if (contextDomains.has(domain) && otherDomains.every((d) => !contextDomains.has(d))) {
          return { needs_clarification: false };
        }
      }
    }

    return {
      needs_clarification: true,
      question: rule.question,
      options: rule.options,
    };
  }

  // ── Single-term rules ────────────────────────────────────────────────────
  for (const termDef of AMBIGUOUS_TERMS) {
    if (!termDef.pattern.test(text)) continue;

    // If a qualifying phrase is present, intent is clear — skip
    if (termDef.qualifier && termDef.qualifier.test(text)) continue;

    // Try context-based auto-resolve
    const resolved = tryAutoResolve(termDef.meanings, contextDomains);
    if (resolved) return { needs_clarification: false };

    return {
      needs_clarification: true,
      question: termDef.question,
      options: termDef.meanings,
    };
  }

  return { needs_clarification: false };
}

export default { detectAmbiguity };
