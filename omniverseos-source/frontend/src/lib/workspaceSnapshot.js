// ─── Cortex Workspace Snapshot ─────────────────────────────────────────────
// Captures and restores the full window layout (positions, sizes, open apps).
// Persists up to MAX_SNAPSHOTS named snapshots in localStorage.
// 100% local – no AI, no network.
// ───────────────────────────────────────────────────────────────────────────

const LS_KEY      = "omniverse_cortex_snapshots";
const AUTO_KEY    = "__auto__";          // name used for auto-save
const MAX_SNAPSHOTS = 10;

/** @type {Object|null} in-memory cache: { [name]: snapshot } */
let _store = null;

// ─── Internal helpers ─────────────────────────────────────────────────

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
  try {
    localStorage.setItem(LS_KEY, JSON.stringify(_store));
  } catch {
    // quota exceeded – silently ignore
  }
}

/**
 * Trim the store to MAX_SNAPSHOTS, removing oldest non-auto snapshots first.
 */
function _trim() {
  const keys = Object.keys(_store).filter(k => k !== AUTO_KEY);
  while (keys.length > MAX_SNAPSHOTS - 1) {
    // find oldest by savedAt
    const oldest = keys.reduce((a, b) =>
      (_store[a].savedAt < _store[b].savedAt ? a : b)
    );
    delete _store[oldest];
    keys.splice(keys.indexOf(oldest), 1);
  }
}

// ─── Public API ──────────────────────────────────────────────────────────────

/**
 * Save the current window layout.
 * Each window entry needs at minimum: { id, app, x, y, w, h }.
 * @param {Array}  windows     Array of window objects from OSContext.
 * @param {string} [name]      Optional human-readable name. Defaults to auto.
 * @returns {string}           The snapshot name that was saved.
 */
export function saveSnapshot(windows, name = AUTO_KEY) {
  const store = _load();
  _trim();
  store[name] = {
    savedAt: Date.now(),
    windows: windows.map(({ id, app, x, y, w, h }) => ({ id, app, x, y, w, h })),
  };
  _store = store;
  _persist();
  return name;
}

/**
 * Load a previously saved snapshot.
 * @param {string} [name]  Snapshot name. Defaults to the auto-save.
 * @returns {{ savedAt: number, windows: Array }|null}
 */
export function loadSnapshot(name = AUTO_KEY) {
  const store = _load();
  return store[name] ?? null;
}

/**
 * List all saved snapshot names with metadata.
 * @returns {Array<{ name: string, savedAt: number, count: number }>}
 */
export function listSnapshots() {
  const store = _load();
  return Object.entries(store)
    .map(([name, snap]) => ({
      name,
      savedAt: snap.savedAt,
      count: snap.windows?.length ?? 0,
    }))
    .sort((a, b) => b.savedAt - a.savedAt);
}

/**
 * Delete a snapshot by name.
 * @param {string} name
 */
export function deleteSnapshot(name) {
  const store = _load();
  delete store[name];
  _persist();
}

/**
 * Clear all snapshots (e.g. on logout).
 */
export function clearSnapshots() {
  _store = {};
  localStorage.removeItem(LS_KEY);
}

/**
 * Auto-save shortcut: save current windows under the AUTO_KEY.
 * @param {Array} windows
 */
export function autoSave(windows) {
  return saveSnapshot(windows, AUTO_KEY);
}

/**
 * Auto-restore shortcut: load the AUTO_KEY snapshot.
 * @returns {Array} windows array, or [] if none.
 */
export function autoRestore() {
  const snap = loadSnapshot(AUTO_KEY);
  return snap?.windows ?? [];
}

export default {
  saveSnapshot,
  loadSnapshot,
  listSnapshots,
  deleteSnapshot,
  clearSnapshots,
  autoSave,
  autoRestore,
};
