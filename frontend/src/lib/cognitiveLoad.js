/**
 * cognitiveLoad.js — P13: Signal collection and scoring engine.
 *
 * Runs entirely client-side via window event listeners.
 * Computes a 0–100 cognitive load score from five signal sources.
 *
 * Score semantics:
 *   0–30  → "flow"      (deep work, minimal interruption)
 *   31–65 → "normal"    (typical active working)
 *   66–100 → "scattered" (excessive context switching, high demand)
 *
 * Signals:
 *   cortex:app-open        — app switch (recorded as timestamp)
 *   cortex:typing-burst    — user actively typing in chat
 *   cortex:window-count    — current number of open OS windows
 *   cortex:focus-tunnel    — Focus Tunnel active/inactive
 *   cortex:message-length  — assistant response length (engagement depth)
 */

// ── Sliding-window ring buffers ────────────────────────────────────────────
const WINDOW_MS = 15 * 60 * 1000; // 15-minute window for app switches
const TYPING_WINDOW_MS = 3 * 60 * 1000; // 3-minute window for typing bursts

let _appSwitches   = []; // timestamps of app opens in WINDOW_MS
let _typingBursts  = []; // timestamps of typing activity in TYPING_WINDOW_MS
let _windowCount   = 0;
let _focusActive   = false;
let _avgMsgLen     = 0;  // exponential moving average of assistant message lengths

const trimOlderThan = (arr, ms) => {
  const cutoff = Date.now() - ms;
  return arr.filter((t) => t > cutoff);
};

// ── Public signal inputs (called by event listeners or components) ─────────

export function recordAppSwitch() {
  _appSwitches = trimOlderThan(_appSwitches, WINDOW_MS);
  _appSwitches.push(Date.now());
}

export function recordTypingBurst() {
  _typingBursts = trimOlderThan(_typingBursts, TYPING_WINDOW_MS);
  _typingBursts.push(Date.now());
}

export function setWindowCount(n) {
  _windowCount = typeof n === "number" ? n : 0;
}

export function setFocusTunnelActive(active) {
  _focusActive = !!active;
}

export function recordMessageLength(len) {
  if (!len || len <= 0) return;
  // Exponential moving average — weights recent messages more
  _avgMsgLen = _avgMsgLen === 0
    ? len
    : Math.round(_avgMsgLen * 0.65 + len * 0.35);
}

// ── Score computation ──────────────────────────────────────────────────────

/**
 * Compute the current cognitive load score.
 * Always call after signals have been updated via the record* functions.
 *
 * @returns {number} Score 0–100 (0 = deep flow, 100 = highly scattered)
 */
export function computeScore() {
  // Focus Tunnel active → hard-floor to flow
  if (_focusActive) return 5;

  const switches = trimOlderThan(_appSwitches, WINDOW_MS).length;
  const bursts   = trimOlderThan(_typingBursts, TYPING_WINDOW_MS).length;

  let score = 50; // neutral baseline

  // ── App switch penalty ─────────────────────────────────────────────────
  // Each switch beyond 3 in 15 min signals distraction
  const switchExcess = Math.max(0, switches - 3);
  score += Math.min(switchExcess * 6, 30); // max +30

  // ── Open window penalty ────────────────────────────────────────────────
  // More than 3 windows = spreading attention
  const windowExcess = Math.max(0, _windowCount - 3);
  score += Math.min(windowExcess * 4, 20); // max +20

  // ── Typing activity bonus ──────────────────────────────────────────────
  // Active typing in the chat = engaged in one task
  const typingBonus = Math.min(bursts * 4, 20);
  score -= typingBonus; // max -20

  // ── Message engagement bonus ───────────────────────────────────────────
  // Longer AI responses imply deeper, more focused conversations
  if (_avgMsgLen > 400) score -= 12;
  else if (_avgMsgLen > 200) score -= 6;

  // ── Time-of-day adjustment ─────────────────────────────────────────────
  const h = new Date().getHours();
  if (h >= 9 && h <= 11)      score -= 10; // morning peak focus
  else if (h >= 14 && h <= 16) score -= 5; // afternoon focus window
  else if (h >= 22 || h <= 5)  score += 15; // late-night stress

  return Math.max(0, Math.min(100, Math.round(score)));
}

/**
 * Map a score to a named load state.
 *
 * @param {number} score
 * @returns {"flow"|"normal"|"scattered"}
 */
export function getLoadState(score) {
  if (score <= 30) return "flow";
  if (score <= 65) return "normal";
  return "scattered";
}

// ── Event listener bootstrap ───────────────────────────────────────────────
// Call once from CognitiveLoadContext on mount.

let _initialized = false;

export function initCognitiveLoad() {
  if (_initialized) return;
  _initialized = true;

  window.addEventListener("cortex:app-open",       recordAppSwitch);
  window.addEventListener("cortex:typing-burst",   recordTypingBurst);
  window.addEventListener("cortex:focus-tunnel",   (e) => setFocusTunnelActive(e.detail?.active));
  window.addEventListener("cortex:window-count",   (e) => setWindowCount(e.detail?.count));
  window.addEventListener("cortex:message-length", (e) => recordMessageLength(e.detail?.length));
}
