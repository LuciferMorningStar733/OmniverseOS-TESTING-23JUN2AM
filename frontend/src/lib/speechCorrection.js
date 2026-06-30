/**
 * speechCorrection.js — Context-Aware Speech Correction Engine
 * OmniverseOS Speech Intelligence Layer
 *
 * Context-aware speech-to-text transcript normalization.
 * Corrects common speech-to-text errors without modifying proper names.
 * Executes entirely locally — no AI calls, no network requests.
 * Target execution: <5ms
 *
 * Architecture:
 *   normalizeTranscript(rawTranscript, context) → correctedTranscript
 *
 * Dependencies (all local modules, no external calls):
 *   - ./contextResolver          → resolveContext(rawContext) → ContextProfile
 *   - ./dictionaries/devTerms    → DICT_DEVELOPER
 *   - ./dictionaries/aiTerms     → DICT_AI
 *   - ./dictionaries/generalTerms→ DICT_GENERAL
 *
 * Microphone context:
 *   "mike" → "mic" only when surrounding words are audio/voice related.
 *   "Mike Tyson", "Call Mike tomorrow" → UNCHANGED.
 */

import { resolveContext }   from './contextResolver.js';
import { DICT_DEVELOPER }   from './dictionaries/devTerms.js';
import { DICT_AI }          from './dictionaries/aiTerms.js';
import { DICT_GENERAL }     from './dictionaries/generalTerms.js';

// ── Microphone context words ─────────────────────────────────────────────────────
const MIC_CONTEXT_WORDS = new Set([
  "mute", "unmute", "audio", "speaker", "speakers", "microphone",
  "record", "recording", "bluetooth", "headset", "headphone", "headphones",
  "discord", "noise", "stream", "streaming", "podcast",
  "call", "calls", "meeting", "meetings", "zoom", "teams",
  "voice", "volume", "mic", "testing", "test", "check",
  "input", "output", "sound", "mixer", "gain", "monitor", "studio",
]);

// ── Core correction helpers ───────────────────────────────────────────────────

/**
 * Builds a word-boundary regex for a given phrase.
 * @param {string} phrase
 * @returns {RegExp}
 */
function buildPattern(phrase) {
  const escaped = phrase.replace(/[.*+?^${}()|[\\]\\]/g, '\\$&');
  return new RegExp(`(?<!\\w)${escaped}(?!\\w)`, 'gi');
}

/**
 * Applies a dictionary of [rawPattern, correctedForm] pairs to text.
 * Longer patterns are matched first to prevent substring collisions.
 * @param {string} text
 * @param {Array<[string, string]>} dictionary
 * @returns {string}
 */
function applyDictionary(text, dictionary) {
  const sorted = [...dictionary].sort((a, b) => b[0].length - a[0].length);
  let result = text;
  for (const [raw, corrected] of sorted) {
    result = result.replace(buildPattern(raw), corrected);
  }
  return result;
}

/**
 * Corrects "mike" → "mic" only when audio/voice context words are nearby.
 * Preserves "Mike Tyson", "Call Mike tomorrow", etc.
 * @param {string} text
 * @returns {string}
 */
function correctMikeToMic(text) {
  const micKeywords = MIC_CONTEXT_WORDS;
  const words = text.split(/(\s+)/);
  const tokens = words.filter(w => w.trim().length > 0);
  const WINDOW = 5;

  const correctedTokens = tokens.map((token, idx) => {
    if (!/^mike$/i.test(token)) return token;
    const start = Math.max(0, idx - WINDOW);
    const end   = Math.min(tokens.length - 1, idx + WINDOW);
    for (let i = start; i <= end; i++) {
      if (i === idx) continue;
      const clean = tokens[i].toLowerCase().replace(/[^a-z]/g, '');
      if (micKeywords.has(clean)) {
        if (token === token.toUpperCase()) return 'MIC';
        if (token[0] === token[0].toUpperCase()) return 'Mic';
        return 'mic';
      }
    }
    return token;
  });

  let out = '';
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

// ── Public API ──────────────────────────────────────────────────────────────

/**
 * Normalizes a raw speech-to-text transcript using contextual awareness.
 *
 * @param {string} rawTranscript - Raw text from SpeechRecognition API
 * @param {Object} [context={}]  - Context object for intelligent correction
 * @param {string} [context.browserUrl]   - Current browser tab URL
 * @param {string} [context.activeAppId]  - Active OmniverseOS app ID
 * @param {string} [context.browserTitle] - Current browser page title
 * @returns {string} - Corrected transcript
 */
export function normalizeTranscript(rawTranscript, context = {}) {
  if (!rawTranscript || !rawTranscript.trim()) return rawTranscript;

  const start = performance.now();

  // Resolve context into a typed profile (isDev, isAI, confidence, signals)
  const profile = resolveContext(context);

  let corrected = rawTranscript;

  // Step 1: mic context correction (always, before dictionary passes)
  corrected = correctMikeToMic(corrected);

  // Step 2: context-gated dictionaries
  if (profile.isDev) corrected = applyDictionary(corrected, DICT_DEVELOPER);
  if (profile.isAI)  corrected = applyDictionary(corrected, DICT_AI);

  // Step 3: general corrections (always safe)
  corrected = applyDictionary(corrected, DICT_GENERAL);

  if (typeof performance !== 'undefined') {
    const elapsed = performance.now() - start;
    console.debug(
      `[SpeechCorrection] ${elapsed.toFixed(2)}ms | ` +
      `confidence=${profile.confidence} | ` +
      `signals=[${profile.signals.join(', ')}] | ` +
      `in="${rawTranscript.slice(0, 40)}" → ` +
      `out="${corrected.slice(0, 40)}"`
    );
  }

  return corrected;
}

export default { normalizeTranscript };
