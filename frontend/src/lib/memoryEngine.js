// ─── Cortex Memory Engine ───────────────────────────────────────────────────
// Persistent, local-only session memory for OmniverseOS.
// No AI calls. No network. All state lives in localStorage + in-memory cache.
// Target read/write: <2ms per operation.
// ────────────────────────────────────────────────────────────────────────────

const LS_KEY = "omniverse_cortex_memory";
const MAX_ENTRIES = 200; // cap to avoid unbounded growth

/** @type {Map<string, any>} in-memory cache for O(1) reads */
let _cache = null;

// ─── Internal helpers ────────────────────────────────────────────────────────

function _load() {
  if (_cache) return _cache;
  try {
    const raw = localStorage.getItem(LS_KEY);
    const parsed = raw ? JSON.parse(raw) : {};
    _cache = new Map(Object.entries(parsed));
  } catch {
    _cache = new Map();
  }
  return _cache;
}

function _persist() {
  if (!_cache) return;
  // Convert map → plain object, keeping only the last MAX_ENTRIES entries
  const entries = [..._cache.entries()];
  const trimmed = entries.slice(-MAX_ENTRIES);
  try {
    localStorage.setItem(LS_KEY, JSON.stringify(Object.fromEntries(trimmed)));
  } catch {
    // storage quota – silently ignore
  }
}

// ─── Public API ──────────────────────────────────────────────────────────────

/**
 * Store a key-value pair in Cortex memory.
 * @param {string} key
 * @param {any}    value  Must be JSON-serialisable.
 */
export function memSet(key, value) {
  const cache = _load();
  cache.set(key, value);
  _persist();
}

/**
 * Read a value from Cortex memory.
 * @param {string} key
 * @param {any}    [fallback=null]
 * @returns {any}
 */
export function memGet(key, fallback = null) {
  const cache = _load();
  return cache.has(key) ? cache.get(key) : fallback;
}

/**
 * Delete a single key.
 * @param {string} key
 */
export function memDelete(key) {
  const cache = _load();
  cache.delete(key);
  _persist();
}

/**
 * Return all stored keys.
 * @returns {string[]}
 */
export function memKeys() {
  return [..._load().keys()];
}

/**
 * Clear all Cortex memory (e.g. on logout).
 */
export function memClear() {
  _cache = new Map();
  localStorage.removeItem(LS_KEY);
}

/**
 * Merge a plain object into memory (shallow merge).
 * Useful for bulk updates.
 * @param {Object} obj
 */
export function memMerge(obj) {
  const cache = _load();
  for (const [k, v] of Object.entries(obj)) cache.set(k, v);
  _persist();
}

/**
 * Export a plain snapshot of all memory (for debugging / backup).
 * @returns {Object}
 */
export function memSnapshot() {
  return Object.fromEntries(_load().entries());
}

// ─── Typed helpers (domain-specific shortcuts) ───────────────────────────────

/** Remember which app was last active */
export function rememberActiveApp(appId) {
  memSet("lastActiveApp", appId);
  memSet("lastActiveAppTime", Date.now());
}

/** Remember the last URL opened in the Browser app */
export function rememberLastUrl(url) {
  memSet("lastUrl", url);
}

/** Remember the last voice transcript */
export function rememberTranscript(text) {
  memSet("lastTranscript", text);
  memSet("lastTranscriptTime", Date.now());
}

/** Remember workspace layout (open windows) */
export function rememberWorkspace(windowsArray) {
  memSet("lastWorkspace", windowsArray);
  memSet("lastWorkspaceTime", Date.now());
}

/** Get the last remembered workspace */
export function recallWorkspace() {
  return memGet("lastWorkspace", []);
}

export default {
  memSet,
  memGet,
  memDelete,
  memKeys,
  memClear,
  memMerge,
  memSnapshot,
  rememberActiveApp,
  rememberLastUrl,
  rememberTranscript,
  rememberWorkspace,
  recallWorkspace,
};
