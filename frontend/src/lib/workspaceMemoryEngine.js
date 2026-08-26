/* ── Workspace Memory Engine ─────────────────────────────────────────────── */

const LS_WORKFLOW_MEMORY = "omniverse_workflow_memory";

const KNOWN_PRESETS = [
  {
    id: "strategy",
    name: "Strategy Workspace",
    apps: ["cortex", "notes", "blackbox"],
    description: "Cortex Intelligence + Notes + The Black Box",
  },
  {
    id: "dev",
    name: "Engineering Workspace",
    apps: ["terminal", "code", "files"],
    description: "Code Editor + Terminal + File Manager",
  },
  {
    id: "reflection",
    name: "Reflection Workspace",
    apps: ["mirror", "notes"],
    description: "Omniverse Mirror + Personal Notes",
  },
];

/**
 * Save current active app combination into memory
 */
export function recordWorkspaceCluster(openWindows = []) {
  if (!openWindows.length) return;
  const appIds = openWindows.map((w) => w.app).sort();
  try {
    const memory = JSON.parse(localStorage.getItem(LS_WORKFLOW_MEMORY) || "[]");
    const existingIdx = memory.findIndex((m) => m.apps.sort().join(",") === appIds.join(","));
    if (existingIdx >= 0) {
      memory[existingIdx].count += 1;
      memory[existingIdx].lastUsed = new Date().toISOString();
    } else {
      memory.push({
        apps: appIds,
        count: 1,
        lastUsed: new Date().toISOString(),
      });
    }
    localStorage.setItem(LS_WORKFLOW_MEMORY, JSON.stringify(memory.slice(0, 10)));
  } catch (e) {
    // ignore storage errors
  }
}

/**
 * Get active workflow recommendation based on open windows
 */
export function getSuggestedWorkflow(openWindows = []) {
  const currentAppIds = openWindows.map((w) => w.app);
  for (const preset of KNOWN_PRESETS) {
    const matchCount = preset.apps.filter((a) => currentAppIds.includes(a)).length;
    if (matchCount >= 1 && currentAppIds.length < preset.apps.length) {
      return preset;
    }
  }
  return KNOWN_PRESETS[0]; // fallback
}

/**
 * Return all available presets
 */
export function getWorkspacePresets() {
  return KNOWN_PRESETS;
}
