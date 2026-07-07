// ─── Cortex Activity Timeline ───────────────────────────────────────────────
// Records discrete user activity events to a bounded, persisted ring-buffer.
// Local-first (localStorage) + server-side sync via activityApi (fire-and-forget).
// Events: app_open, app_close, url_visit, voice_command, workspace_restore
// ─────────────────────────────────────────────────────────────────────────────

// Lazy import to avoid circular deps — activityTimeline ← api ← (no dep on activityTimeline)
let _activityApiRef = null;
function _getActivityApi() {
  if (!_activityApiRef) {
    try {
      // Dynamic require-style import — works in CRA/CRACO with CommonJS interop
      _activityApiRef = require("./api").activityApi;
    } catch { _activityApiRef = null; }
  }
  return _activityApiRef;
}

/** Returns true if the user appears authenticated (token in localStorage). */
function _isAuthenticated() {
  try { return !!localStorage.getItem("omniverse_token"); } catch { return false; }
}

const LS_KEY   = "omniverse_cortex_timeline";
const MAX_EVENTS = 150; // ring-buffer cap

/** @type {Array|null} in-memory cache */
let _events = null;

// ─── Internal helpers ───────────────────────────────────────────────────

function _load() {
  if (_events) return _events;
  try {
    const raw = localStorage.getItem(LS_KEY);
    _events = raw ? JSON.parse(raw) : [];
  } catch {
    _events = [];
  }
  return _events;
}

function _persist() {
  try {
    localStorage.setItem(LS_KEY, JSON.stringify(_events.slice(-MAX_EVENTS)));
  } catch {
    // quota exceeded – silently ignore
  }
}

// ─── Public API ──────────────────────────────────────────────────────────────

/**
 * Record a new activity event.
 * @param {'app_open'|'app_close'|'url_visit'|'voice_command'|'workspace_restore'} type
 * @param {Object} payload  Arbitrary metadata (appId, url, transcript, etc.)
 */
export function trackEvent(type, payload = {}) {
  const events = _load();
  events.push({
    type,
    ts: Date.now(),
    ...payload,
  });
  // Trim to ring-buffer size in-memory
  if (events.length > MAX_EVENTS) events.splice(0, events.length - MAX_EVENTS);
  _events = events;
  _persist();

  // ── Server-side sync (fire-and-forget, never throws) ───────────────────
  if (_isAuthenticated()) {
    const api = _getActivityApi();
    if (api) {
      const { appId, url, text, ...rest } = payload;
      let title = type.replace(/_/g, " ");
      if (appId)  title = `Opened ${appId}`;
      else if (url) { try { title = `Visited ${new URL(url).hostname}`; } catch { title = `Visited ${url.slice(0, 40)}`; } }
      else if (text) title = text.slice(0, 80);
      api.record(type, title, null, { appId, url, text, ...rest }).catch(() => {});
    }
  }
}

/**
 * Return all events, newest first.
 * @param {number} [limit=MAX_EVENTS]
 * @returns {Array}
 */
export function getTimeline(limit = MAX_EVENTS) {
  const events = _load();
  return events.slice(-limit).reverse();
}

/**
 * Return events of a specific type.
 * @param {string} type
 * @param {number} [limit=50]
 * @returns {Array}
 */
export function getEventsByType(type, limit = 50) {
  const events = _load();
  return events
    .filter(e => e.type === type)
    .slice(-limit)
    .reverse();
}

/**
 * Return the most recently opened apps (deduped, newest first).
 * @param {number} [limit=8]
 * @returns {string[]}
 */
export function getRecentApps(limit = 8) {
  const seen = new Set();
  const result = [];
  const events = _load();
  for (let i = events.length - 1; i >= 0; i--) {
    const e = events[i];
    if (e.type === 'app_open' && e.appId && !seen.has(e.appId)) {
      seen.add(e.appId);
      result.push(e.appId);
      if (result.length >= limit) break;
    }
  }
  return result;
}

/**
 * Return the most recently visited URLs (deduped, newest first).
 * @param {number} [limit=8]
 * @returns {string[]}
 */
export function getRecentUrls(limit = 8) {
  const seen = new Set();
  const result = [];
  const events = _load();
  for (let i = events.length - 1; i >= 0; i--) {
    const e = events[i];
    if (e.type === 'url_visit' && e.url && !seen.has(e.url)) {
      seen.add(e.url);
      result.push(e.url);
      if (result.length >= limit) break;
    }
  }
  return result;
}

/**
 * Clear all timeline data (e.g. on logout).
 */
export function clearTimeline() {
  _events = [];
  localStorage.removeItem(LS_KEY);
}

export default {
  trackEvent,
  getTimeline,
  getEventsByType,
  getRecentApps,
  getRecentUrls,
  clearTimeline,
};
