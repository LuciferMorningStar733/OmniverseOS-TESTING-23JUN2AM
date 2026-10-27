/**
 * appMeta.js — Static app metadata (id, name, icon, color, group).
 *
 * Intentionally has ZERO imports so it can be safely imported by any module
 * without creating circular dependencies.
 *
 * Use this instead of apps.js when you only need visual/display data about
 * apps (icon, color, name, group) and do NOT need the lazy React Component.
 *
 * Background: apps.js lazy-imports every app component. If any lazy-loaded
 * app (e.g. Dashboard.js) statically imports apps.js back, webpack detects a
 * circular dependency in its static module graph and corrupts the const
 * initialization order in the production bundle, producing a
 * "Cannot access '...' before initialization" TDZ crash.
 *
 * When you add a new app to apps.js, add its metadata here too.
 */

export const APP_META = [
  // ── Core ──────────────────────────────────────────────────────────────────
  { id: "dashboard",  name: "Dashboard",    icon: "fa-grip",           color: "#00F0FF", group: "core"         },

  // ── AI ──────────────────────────────────────────────────────────────────
  { id: "chat",       name: "AI Chat",      icon: "fa-comments",       color: "#00F0FF", group: "ai"           },
  { id: "image",      name: "Image Gen",    icon: "fa-image",          color: "#A855F7", group: "ai"           },
  { id: "voice",      name: "Cortex",       icon: "fa-microphone",     color: "#4A9EFF", group: "ai"           },
  { id: "memory",     name: "Memory",       icon: "fa-brain",          color: "#2DD4BF", group: "ai"           },
  { id: "projects",   name: "Projects",     icon: "fa-diagram-project",color: "#00F0FF", group: "ai"           },
  { id: "timeline",   name: "Timeline",     icon: "fa-timeline",       color: "#7B2FFF", group: "ai"           },

  // ── Productivity ────────────────────────────────────────────────────────
  { id: "notes",      name: "Notes",        icon: "fa-note-sticky",    color: "#F59E0B", group: "productivity" },
  { id: "tasks",      name: "Tasks",        icon: "fa-list-check",     color: "#39FF14", group: "productivity" },
  { id: "calendar",   name: "Calendar",     icon: "fa-calendar",       color: "#FB923C", group: "productivity" },
  { id: "clipboard",  name: "Clipboard",    icon: "fa-clipboard",      color: "#818CF8", group: "productivity" },

  // ── Media ───────────────────────────────────────────────────────────────
  { id: "music",      name: "Music",        icon: "fa-music",          color: "#F472B6", group: "media"        },
  { id: "photos",     name: "Photos",       icon: "fa-photo-film",     color: "#EC4899", group: "media"        },
  { id: "videos",     name: "Videos",       icon: "fa-video",          color: "#F472B6", group: "media"        },
  { id: "watchlist",  name: "Watchlist",    icon: "fa-film",           color: "#F472B6", group: "media"        },

  // ── System ──────────────────────────────────────────────────────────────
  { id: "files",      name: "Files",        icon: "fa-folder",         color: "#60A5FA", group: "system"       },
  { id: "code",       name: "Code",         icon: "fa-code",           color: "#39FF14", group: "system"       },
  { id: "browser",    name: "Browser",      icon: "fa-globe",          color: "#60A5FA", group: "system"       },
  { id: "settings",   name: "Settings",     icon: "fa-gear",           color: "#94A3B8", group: "system"       },
  { id: "systemhealth", name: "System Health", icon: "fa-heart-pulse", color: "#39FF14", group: "system"       },

  // ── Data ────────────────────────────────────────────────────────────────
  { id: "finance",    name: "Finance",      icon: "fa-chart-line",     color: "#39FF14", group: "data"         },
  { id: "analytics",  name: "Analytics",    icon: "fa-chart-pie",      color: "#39FF14", group: "data"         },

  // ── Social ──────────────────────────────────────────────────────────────
  { id: "nebula",     name: "Nebula Chat",  icon: "fa-satellite-dish", color: "#A855F7", group: "social"       },

  // ── AI Agents & Destination Features ─────────────────────────────────────
  { id: "swarm",      name: "Swarm Goal",   icon: "fa-share-nodes",    color: "#00F0FF", group: "ai"           },
  { id: "faceoff",    name: "Face-Off",     icon: "fa-bolt-lightning", color: "#00F0FF", group: "ai"           },
  { id: "adversary",  name: "The Adversary",icon: "fa-crosshairs",     color: "#FF003C", group: "ai"           },
  { id: "warroom",    name: "War Room",     icon: "fa-chess-king",     color: "#F59E0B", group: "ai"           },
  { id: "deadreckoning",name: "Dead Reckoning",icon: "fa-compass-drafting",color: "#7B2FFF", group: "ai"      },
  { id: "matrix",     name: "Neural Matrix",icon: "fa-project-diagram",color: "#00F0FF", group: "ai"           },
  { id: "mirror",     name: "Omniverse Mirror", icon: "fa-wand-magic-sparkles", color: "#A855F7", group: "ai"  },
  { id: "zero",       name: "Omniverse Zero", icon: "fa-atom",          color: "#00F0FF", group: "ai"           },
  { id: "blackbox",   name: "The Black Box", icon: "fa-box-open",      color: "#00F0FF", group: "ai"           },
];

/**
 * Look up a single app's metadata by id.
 * Returns undefined if the id is unknown.
 *
 * @param {string} id - App ID (e.g. "voice", "chat")
 * @returns {{ id, name, icon, color, group } | undefined}
 */
export function getAppMeta(id) {
  return APP_META.find(a => a.id === id);
}
