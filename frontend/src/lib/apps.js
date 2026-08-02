import { lazy } from "react";

// ── Semantic accent palette ────────────────────────────────────────────────
// AI       = Cyan    #00F0FF
// Success  = Green   #39FF14
// Warning  = Amber   #F59E0B
// Danger   = Red     #FF003C
// Purple   = AI ext  #A855F7
// Media    = Pink    #F472B6
// Calendar = Orange  #FB923C
// Files    = Blue    #60A5FA
// Memory   = Teal    #2DD4BF
// Clipboard= Indigo  #818CF8

export const APPS = [
  // ─── Core ──────────────────────────────────────────────────────────────
  { id: "dashboard",  name: "Dashboard",    icon: "fa-grip",           color: "#00F0FF", Component: lazy(() => import("../apps/Dashboard")),     group: "core" },

  // ─── AI ────────────────────────────────────────────────────────────────
  { id: "chat",       name: "AI Chat",      icon: "fa-comments",       color: "#00F0FF", Component: lazy(() => import("../apps/AIChat")),        group: "ai" },
  { id: "image",      name: "Image Gen",    icon: "fa-image",          color: "#A855F7", Component: lazy(() => import("../apps/ImageGen")),      group: "ai" },
  { id: "voice",      name: "Cortex",       icon: "fa-microphone",     color: "#4A9EFF", Component: lazy(() => import("../apps/Voice")),         group: "ai" },
  { id: "memory",     name: "Memory",       icon: "fa-brain",          color: "#2DD4BF", Component: lazy(() => import("../apps/Memory")),        group: "ai" },
  { id: "projects",   name: "Projects",     icon: "fa-diagram-project",color: "#00F0FF", Component: lazy(() => import("../apps/ProjectDNA")),    group: "ai" },
  { id: "timeline",   name: "Timeline",     icon: "fa-timeline",       color: "#7B2FFF", Component: lazy(() => import("../apps/TimelineApp")),   group: "ai" },

  // ─── Productivity ──────────────────────────────────────────────────────
  { id: "notes",      name: "Notes",        icon: "fa-note-sticky",    color: "#F59E0B", Component: lazy(() => import("../apps/Notes")),         group: "productivity" },
  { id: "tasks",      name: "Tasks",        icon: "fa-list-check",     color: "#39FF14", Component: lazy(() => import("../apps/Tasks")),         group: "productivity" },
  { id: "calendar",   name: "Calendar",     icon: "fa-calendar",       color: "#FB923C", Component: lazy(() => import("../apps/CalendarApp")),   group: "productivity" },
  { id: "clipboard",  name: "Clipboard",    icon: "fa-clipboard",      color: "#818CF8", Component: lazy(() => import("../apps/Clipboard")),     group: "productivity" },

  // ─── Media ─────────────────────────────────────────────────────────────
  { id: "music",      name: "Music",        icon: "fa-music",          color: "#F472B6", Component: lazy(() => import("../apps/Music")),         group: "media" },
  { id: "videos",     name: "Videos",       icon: "fa-video",          color: "#F472B6", Component: lazy(() => import("../apps/Videos")),        group: "media" },
  { id: "watchlist",  name: "Watchlist",    icon: "fa-film",           color: "#F472B6", Component: lazy(() => import("../apps/Watchlist")),     group: "media" },

  // ─── System ────────────────────────────────────────────────────────────
  { id: "files",      name: "Files",        icon: "fa-folder",         color: "#60A5FA", Component: lazy(() => import("../apps/FileManager")),   group: "system" },
  { id: "code",       name: "Code",         icon: "fa-code",           color: "#39FF14", Component: lazy(() => import("../apps/CodeEditor")),    group: "system" },
  { id: "browser",    name: "Browser",      icon: "fa-globe",          color: "#60A5FA", Component: lazy(() => import("../apps/Browser")),       group: "system" },
  { id: "settings",   name: "Settings",     icon: "fa-gear",           color: "#94A3B8", Component: lazy(() => import("../apps/Settings")),      group: "system" },

  // ─── Data ──────────────────────────────────────────────────────────────
  { id: "finance",    name: "Finance",      icon: "fa-chart-line",     color: "#39FF14", Component: lazy(() => import("../apps/Finance")),       group: "data" },
  { id: "analytics",  name: "Analytics",    icon: "fa-chart-pie",      color: "#39FF14", Component: lazy(() => import("../apps/Analytics")),     group: "data" },

  // ─── Social ────────────────────────────────────────────────────────────
  { id: "nebula",     name: "Nebula Chat",  icon: "fa-satellite-dish", color: "#A855F7", Component: lazy(() => import("../apps/DiscordApp")),    group: "social" },

  // ─── AI Agents ─────────────────────────────────────────────────────────────
  { id: "swarm",      name: "Swarm Goal",   icon: "fa-share-nodes",    color: "#00F0FF", Component: lazy(() => import("../apps/SwarmGoal")),     group: "ai" },
  { id: "faceoff",      name: "Face-Off",      icon: "fa-bolt-lightning",  color: "#00F0FF", Component: lazy(() => import("../apps/ModelFaceOff")),   group: "ai" },

  // ─── Destination Features ──────────────────────────────────────────────────
  { id: "adversary",    name: "The Adversary", icon: "fa-crosshairs",      color: "#FF003C", Component: lazy(() => import("../apps/Adversary")),      group: "ai" },
  { id: "warroom",      name: "War Room",      icon: "fa-chess-king",      color: "#F59E0B", Component: lazy(() => import("../apps/WarRoom")),         group: "ai" },
  { id: "deadreckoning",name: "Dead Reckoning",icon: "fa-compass-drafting",color: "#7B2FFF", Component: lazy(() => import("../apps/DeadReckoning")),   group: "ai" },
];

export const getApp = (id) => APPS.find((a) => a.id === id);
