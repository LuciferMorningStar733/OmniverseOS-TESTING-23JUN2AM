import { lazy } from "react";

const lazyWithRetry = (factory) =>
  lazy(() =>
    factory().catch((err) => {
      // eslint-disable-next-line no-console
      console.warn("Retrying dynamic chunk import:", err);
      return new Promise((resolve) => setTimeout(resolve, 400)).then(factory);
    })
  );

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
  { id: "dashboard",  name: "Dashboard",    icon: "fa-grip",           color: "#00F0FF", Component: lazyWithRetry(() => import("../apps/Dashboard")),     group: "core" },

  // ─── AI ────────────────────────────────────────────────────────────────
  { id: "chat",       name: "AI Chat",      icon: "fa-comments",       color: "#00F0FF", Component: lazyWithRetry(() => import("../apps/AIChat")),        group: "ai" },
  { id: "image",      name: "Image Gen",    icon: "fa-image",          color: "#A855F7", Component: lazyWithRetry(() => import("../apps/ImageGen")),      group: "ai" },
  { id: "voice",      name: "Cortex",       icon: "fa-microphone",     color: "#4A9EFF", Component: lazyWithRetry(() => import("../apps/Voice")),         group: "ai" },
  { id: "memory",     name: "Memory",       icon: "fa-brain",          color: "#2DD4BF", Component: lazyWithRetry(() => import("../apps/Memory")),        group: "ai" },
  { id: "projects",   name: "Projects",     icon: "fa-diagram-project",color: "#00F0FF", Component: lazyWithRetry(() => import("../apps/ProjectDNA")),    group: "ai" },
  { id: "timeline",   name: "Timeline",     icon: "fa-timeline",       color: "#7B2FFF", Component: lazyWithRetry(() => import("../apps/TimelineApp")),   group: "ai" },

  // ─── Productivity ──────────────────────────────────────────────────────
  { id: "notes",      name: "Notes",        icon: "fa-note-sticky",    color: "#F59E0B", Component: lazyWithRetry(() => import("../apps/Notes")),         group: "productivity" },
  { id: "tasks",      name: "Tasks",        icon: "fa-list-check",     color: "#39FF14", Component: lazyWithRetry(() => import("../apps/Tasks")),         group: "productivity" },
  { id: "calendar",   name: "Calendar",     icon: "fa-calendar",       color: "#FB923C", Component: lazyWithRetry(() => import("../apps/CalendarApp")),   group: "productivity" },
  { id: "clipboard",  name: "Clipboard",    icon: "fa-clipboard",      color: "#818CF8", Component: lazyWithRetry(() => import("../apps/Clipboard")),     group: "productivity" },

  // ─── Media ─────────────────────────────────────────────────────────────
  { id: "music",      name: "Music",        icon: "fa-music",          color: "#F472B6", Component: lazyWithRetry(() => import("../apps/Music")),         group: "media" },
  { id: "photos",     name: "Photos",       icon: "fa-photo-film",     color: "#EC4899", Component: lazyWithRetry(() => import("../apps/PhotosApp")),     group: "media" },
  { id: "videos",     name: "Videos",       icon: "fa-video",          color: "#F472B6", Component: lazyWithRetry(() => import("../apps/Videos")),        group: "media" },
  { id: "watchlist",  name: "Watchlist",    icon: "fa-film",           color: "#F472B6", Component: lazyWithRetry(() => import("../apps/Watchlist")),     group: "media" },

  // ─── System ────────────────────────────────────────────────────────────
  { id: "files",      name: "Files",        icon: "fa-folder",         color: "#60A5FA", Component: lazyWithRetry(() => import("../apps/FileManager")),   group: "system" },
  { id: "code",       name: "Code",         icon: "fa-code",           color: "#39FF14", Component: lazyWithRetry(() => import("../apps/CodeEditor")),    group: "system" },
  { id: "browser",    name: "Browser",      icon: "fa-globe",          color: "#60A5FA", Component: lazyWithRetry(() => import("../apps/Browser")),       group: "system" },
  { id: "settings",   name: "Settings",     icon: "fa-gear",           color: "#94A3B8", Component: lazyWithRetry(() => import("../apps/Settings")),      group: "system" },

  // ─── Data ──────────────────────────────────────────────────────────────
  { id: "finance",    name: "Finance",      icon: "fa-chart-line",     color: "#39FF14", Component: lazyWithRetry(() => import("../apps/Finance")),       group: "data" },
  { id: "analytics",  name: "Analytics",    icon: "fa-chart-pie",      color: "#39FF14", Component: lazyWithRetry(() => import("../apps/Analytics")),     group: "data" },

  // ─── Social ────────────────────────────────────────────────────────────
  { id: "nebula",     name: "Nebula Chat",  icon: "fa-satellite-dish", color: "#A855F7", Component: lazyWithRetry(() => import("../apps/DiscordApp")),    group: "social" },

  // ─── AI Agents ─────────────────────────────────────────────────────────────
  { id: "swarm",      name: "Swarm Goal",   icon: "fa-share-nodes",    color: "#00F0FF", Component: lazyWithRetry(() => import("../apps/SwarmGoal")),     group: "ai" },
  { id: "faceoff",      name: "Face-Off",      icon: "fa-bolt-lightning",  color: "#00F0FF", Component: lazyWithRetry(() => import("../apps/ModelFaceOff")),   group: "ai" },

  // ─── Destination Features ──────────────────────────────────────────────────
  { id: "adversary",    name: "The Adversary", icon: "fa-crosshairs",      color: "#FF003C", Component: lazyWithRetry(() => import("../apps/Adversary")),      group: "ai" },
  { id: "warroom",      name: "War Room",      icon: "fa-chess-king",      color: "#F59E0B", Component: lazyWithRetry(() => import("../apps/WarRoom")),         group: "ai" },
  { id: "deadreckoning",name: "Dead Reckoning",icon: "fa-compass-drafting",color: "#7B2FFF", Component: lazyWithRetry(() => import("../apps/DeadReckoning")),   group: "ai" },
  { id: "matrix",       name: "Neural Matrix", icon: "fa-project-diagram", color: "#00F0FF", Component: lazyWithRetry(() => import("../apps/NeuralMatrix")),   group: "ai" },
  { id: "mirror",       name: "Omniverse Mirror", icon: "fa-wand-magic-sparkles", color: "#A855F7", Component: lazyWithRetry(() => import("../apps/OmniverseMirror")), group: "ai" },
  { id: "zero",         name: "Omniverse Zero",   icon: "fa-atom",                color: "#00F0FF", Component: lazyWithRetry(() => import("../apps/OmniverseZero")),   group: "ai" },
  { id: "blackbox",     name: "The Black Box",    icon: "fa-box-open",            color: "#00F0FF", Component: lazyWithRetry(() => import("../apps/BlackBoxApp")),    group: "ai" },
];

export const getApp = (id) => APPS.find((a) => a.id === id);
