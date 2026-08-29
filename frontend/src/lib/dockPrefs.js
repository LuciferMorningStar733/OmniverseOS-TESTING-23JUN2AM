/**
 * dockPrefs.js — Dock glass preferences system for OmniverseOS.
 * Controls glass tint intensity, color modes, continuous magnification scale, and glow.
 */

export const GLASS_MODES = [
  { id: "adaptive", label: "Adaptive",     color: "#00F0FF", desc: "Harmonizes with active wallpaper accent" },
  { id: "crystal",  label: "Crystal",      color: "#FFFFFF", desc: "Pure high-clarity transparent glass" },
  { id: "obsidian", label: "Obsidian",     color: "#94A3B8", desc: "Deep dark futuristic obsidian tint" },
  { id: "arctic",   label: "Arctic Frost", color: "#60A5FA", desc: "Cool icy-blue frosted glass" },
  { id: "cyan",     label: "Cyan Energy",  color: "#00F0FF", desc: "Vibrant 2099 cyan plasma glass" },
  { id: "violet",   label: "Violet Quartz",color: "#A855F7", desc: "Deep amethyst violet glow" },
  { id: "amber",    label: "Solar Amber",  color: "#FCEE09", desc: "Warm golden solar amber tint" },
];

export const DEFAULT_DOCK_PREFS = {
  tint: 35,           // 0% -> 100%
  mode: "adaptive",   // Glass mode ID
  magnification: 1.48,// 1.2 -> 1.8 peak scale
  glow: 50,           // 0% -> 100% glow intensity
};

const LS_KEY = "omni_dock_prefs_v2099";

export function getDockPrefs() {
  try {
    const raw = localStorage.getItem(LS_KEY);
    if (raw) return { ...DEFAULT_DOCK_PREFS, ...JSON.parse(raw) };
  } catch {}
  return { ...DEFAULT_DOCK_PREFS };
}

export function saveDockPrefs(prefs) {
  try {
    const current = getDockPrefs();
    const next = { ...current, ...prefs };
    localStorage.setItem(LS_KEY, JSON.stringify(next));
    window.dispatchEvent(new CustomEvent("omniverse:dock-prefs-changed", { detail: next }));
    return next;
  } catch {
    return { ...DEFAULT_DOCK_PREFS };
  }
}

export function resetDockPrefs() {
  saveDockPrefs(DEFAULT_DOCK_PREFS);
  return { ...DEFAULT_DOCK_PREFS };
}
