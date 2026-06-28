import { lazy } from "react";

// Lazy-loaded app modules for code splitting
export const APPS = [
  { id: "dashboard",  name: "Dashboard",   icon: "fa-grip",         color: "#00F0FF", Component: lazy(() => import("../apps/Dashboard")),     group: "core" },
  { id: "chat",       name: "AI Chat",     icon: "fa-comments",     color: "#00F0FF", Component: lazy(() => import("../apps/AIChat")),        group: "ai" },
  { id: "image",      name: "Image Gen",   icon: "fa-image",        color: "#FF003C", Component: lazy(() => import("../apps/AIChat")),        group: "ai" },
  { id: "voice",      name: "Voice",       icon: "fa-microphone",   color: "#FCEE09", Component: lazy(() => import("../apps/Voice")),         group: "ai" },
  { id: "memory",     name: "Memory",      icon: "fa-brain",        color: "#39FF14", Component: lazy(() => import("../apps/AIChat")),        group: "ai" },
  { id: "notes",      name: "Notes",       icon: "fa-note-sticky",  color: "#FCEE09", Component: lazy(() => import("../apps/Notes")),         group: "productivity" },
  { id: "tasks",      name: "Tasks",       icon: "fa-list-check",   color: "#00F0FF", Component: lazy(() => import("../apps/Tasks")),         group: "productivity" },
  { id: "calendar",   name: "Calendar",    icon: "fa-calendar",     color: "#FF003C", Component: lazy(() => import("../apps/Tasks")),         group: "productivity" },
  { id: "music",      name: "Music",       icon: "fa-music",        color: "#39FF14", Component: lazy(() => import("../apps/Music")),         group: "media" },
  { id: "videos",     name: "Videos",      icon: "fa-video",        color: "#FF003C", Component: lazy(() => import("../apps/Browser")),       group: "media" },
  { id: "watchlist",  name: "Watchlist",   icon: "fa-film",         color: "#FCEE09", Component: lazy(() => import("../apps/Browser")),       group: "media" },
  { id: "files",      name: "Files",       icon: "fa-folder",       color: "#00F0FF", Component: lazy(() => import("../apps/Notes")),         group: "system" },
  { id: "clipboard",  name: "Clipboard",   icon: "fa-clipboard",    color: "#39FF14", Component: lazy(() => import("../apps/Notes")),         group: "system" },
  { id: "code",       name: "Code",        icon: "fa-code",         color: "#39FF14", Component: lazy(() => import("../apps/CodeEditor")),    group: "system" },
  { id: "finance",    name: "Finance",     icon: "fa-chart-line",   color: "#39FF14", Component: lazy(() => import("../apps/Finance")),       group: "data" },
  { id: "analytics",  name: "Analytics",   icon: "fa-chart-pie",    color: "#FF003C", Component: lazy(() => import("../apps/Finance")),       group: "data" },
  { id: "nebula",     name: "Nebula Chat", icon: "fa-satellite-dish", color: "#C778DD", Component: lazy(() => import("../apps/Browser")),       group: "social" },
  { id: "browser",    name: "Browser",     icon: "fa-globe",        color: "#FCEE09", Component: lazy(() => import("../apps/Browser")),       group: "system" },
  { id: "settings",   name: "Settings",    icon: "fa-gear",         color: "#94A3B8", Component: lazy(() => import("../apps/Settings")),      group: "system" },
];

export const getApp = (id) => APPS.find((a) => a.id === id);
