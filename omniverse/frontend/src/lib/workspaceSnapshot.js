// —— Cortex Workspace Snapshot ——————————————————————————————————————————
// Captures and restores the full window layout (positions, sizes, open apps).
// Persists up to MAX_SNAPSHOTS named snapshots in localStorage.
// 100% local - no AI, no network.
// ——————————————————————————————————————————————————————————————————————————

const LS_KEY       = "omniverse_cortex_snapshots";
const AUTO_KEY     = "__auto__";       // name used for auto-save
const MAX_SNAPSHOTS = 10;

/** @type {Object|null} in-memory cache: { [name]: snapshot } */
let _store = null;

// —— Internal helpers ——————————————————————————————————————————————————————

function _load() {
  if (_store) return _store;
  try {
    const raw = localStorage.getItem(LS_KEY);
    _store = raw ? JSON.parse(raw) : {};
  } catch {
    _store = {};
  }
  return _store;
}

function _persist() {
  try { localStorage.setItem(LS_KEY, JSON.stringify(_store)); } catch {}
}

function _trim() {
  const keys = Object.keys(_store).filter(k => k !== AUTO_KEY);
  while (keys.length > MAX_SNAPSHOTS - 1) {
    delete _store[keys.shift()];
  }
}

// —— Public API ——————————————————————————————————————————————————————————

/** Save a named snapshot from a windows array. */
export function saveSnapshot(windows, name = Date.now().toString()) {
  const store = _load();
  _trim();
  store[name] = { windows: windows.map(w => ({
    id: w.id, app: w.app, x: w.x, y: w.y, w: w.w, h: w.h,
    minimized: w.minimized ?? false, zIndex: w.zIndex ?? 1,
  })), savedAt: Date.now() };
  _persist();
}

/** Load a named snapshot (returns null if not found). */
export function loadSnapshot(name) {
  const store = _load();
  return store[name] ?? null;
}

/** List all non-auto snapshot names. */
export function listSnapshots() {
  return Object.keys(_load()).filter(k => k !== AUTO_KEY);
}

/** Delete a named snapshot. */
export function deleteSnapshot(name) {
  const store = _load();
  delete store[name];
  _persist();
}

/** Wipe all snapshots. */
export function clearSnapshots() {
  _store = {};
  _persist();
}

/** Auto-save shortcut (always overwrites __auto__). */
export function autoSave(windows) {
  return saveSnapshot(windows, AUTO_KEY);
}

/** Restore from auto-save — returns windows array or []. */
export function autoRestore() {
  const snap = loadSnapshot(AUTO_KEY);
  return snap?.windows ?? [];
}

/**
 * Returns metadata about the last auto-saved session:
 * { hasSnapshot, appIds, savedAt, windowCount }
 * Used by CortexWelcomeCard to show "resume" context.
 */
export function getAutoSnapshot() {
  const snap = loadSnapshot(AUTO_KEY);
  if (!snap || !snap.windows?.length) {
    return { hasSnapshot: false, appIds: [], savedAt: null, windowCount: 0 };
  }
  return {
    hasSnapshot: true,
    appIds: [...new Set(snap.windows.map(w => w.app))],
    windowCount: snap.windows.length,
    savedAt: snap.savedAt ?? null,
  };
}
