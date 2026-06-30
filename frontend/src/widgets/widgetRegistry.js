import { lazy } from "react";

export const CELL_W = 176;
export const CELL_H = 152;
export const GAP    = 12;

export const colToX = (col) => col * (CELL_W + GAP);
export const rowToY = (row) => row * (CELL_H + GAP);
export const widgetW = (cols) => cols * CELL_W + (cols - 1) * GAP;
export const widgetH = (rows) => rows * CELL_H + (rows - 1) * GAP;

export const xToCol = (px) => Math.max(0, Math.round(px / (CELL_W + GAP)));
export const yToRow = (px) => Math.max(0, Math.round(px / (CELL_H + GAP)));

// ── Semantic accent palette ───────────────────────────────────────────────
// AI       = Cyan    #00F0FF
// Success  = Green   #39FF14
// Warning  = Amber   #F59E0B
// Danger   = Red     #FF003C
// Weather  = Purple  #A855F7
// Media    = Pink    #F472B6
// Calendar = Orange  #FB923C
// Files    = Blue    #60A5FA

export const WIDGET_REGISTRY = [
  {
    id: "chrono",
    name: "Chrono-Atmo",
    icon: "fa-satellite-dish",
    color: "#A855F7",          // Weather = Purple
    defaultW: 1, defaultH: 3,
    minW: 1, minH: 2, maxW: 2, maxH: 4,
    Component: lazy(() => import("./widgets/ChronoWidget")),
  },
  {
    id: "cortex",
    name: "Cortex AI",
    icon: "fa-wand-magic-sparkles",
    color: "#00F0FF",          // AI = Cyan
    defaultW: 3, defaultH: 2,
    minW: 2, minH: 1, maxW: 5, maxH: 3,
    Component: lazy(() => import("./widgets/CortexWidget")),
  },
  {
    id: "calendar",
    name: "Calendar",
    icon: "fa-calendar",
    color: "#FB923C",          // Calendar = Orange
    defaultW: 2, defaultH: 2,
    minW: 2, minH: 2, maxW: 3, maxH: 3,
    Component: lazy(() => import("./widgets/CalendarWidget")),
  },
  {
    id: "todo",
    name: "Tasks",
    icon: "fa-list-check",
    color: "#39FF14",          // Success = Green
    defaultW: 2, defaultH: 2,
    minW: 2, minH: 1, maxW: 3, maxH: 3,
    Component: lazy(() => import("./widgets/TodoWidget")),
  },
  {
    id: "system",
    name: "System Status",
    icon: "fa-circle-nodes",
    color: "#39FF14",          // Success = Green (health / status)
    defaultW: 2, defaultH: 1,
    minW: 2, minH: 1, maxW: 3, maxH: 2,
    Component: lazy(() => import("./widgets/SystemStatusWidget")),
  },
  {
    id: "activity",
    name: "Recent Activity",
    icon: "fa-bolt",
    color: "#F59E0B",          // Warning = Amber (live events)
    defaultW: 2, defaultH: 2,
    minW: 2, minH: 1, maxW: 3, maxH: 3,
    Component: lazy(() => import("./widgets/RecentActivityWidget")),
  },
  {
    id: "quicknotes",
    name: "Quick Notes",
    icon: "fa-note-sticky",
    color: "#F59E0B",          // Amber (notes / warning tone)
    defaultW: 2, defaultH: 2,
    minW: 2, minH: 1, maxW: 3, maxH: 3,
    Component: lazy(() => import("./widgets/QuickNotesWidget")),
  },
  {
    id: "music",
    name: "Music",
    icon: "fa-music",
    color: "#F472B6",          // Media = Pink
    defaultW: 1, defaultH: 1,
    minW: 1, minH: 1, maxW: 2, maxH: 2,
    Component: lazy(() => import("./widgets/MusicWidget")),
  },
  {
    id: "news",
    name: "News",
    icon: "fa-newspaper",
    color: "#60A5FA",          // Files/Info = Blue
    defaultW: 3, defaultH: 1,
    minW: 2, minH: 1, maxW: 5, maxH: 2,
    Component: lazy(() => import("./widgets/NewsWidget")),
  },
  {
    id: "focus",
    name: "Focus Timer",
    icon: "fa-stopwatch",
    color: "#00F0FF",          // AI = Cyan (focus / productivity)
    defaultW: 1, defaultH: 2,
    minW: 1, minH: 2, maxW: 2, maxH: 3,
    Component: lazy(() => import("./widgets/FocusTimerWidget")),
  },
  {
    id: "worldclock",
    name: "World Clock",
    icon: "fa-earth-americas",
    color: "#FCEE09",          // Yellow (global / time)
    defaultW: 2, defaultH: 2,
    minW: 2, minH: 2, maxW: 3, maxH: 3,
    Component: lazy(() => import("./widgets/WorldClockWidget")),
  },
  {
    id: "sysmon",
    name: "System Monitor",
    icon: "fa-gauge-high",
    color: "#FF003C",          // Danger = Red (resource pressure)
    defaultW: 2, defaultH: 2,
    minW: 2, minH: 1, maxW: 3, maxH: 3,
    Component: lazy(() => import("./widgets/SystemMonitorWidget")),
  },
];

export const getWidgetDef = (id) => WIDGET_REGISTRY.find((w) => w.id === id);

// Default desktop layout — only clock & weather shown by default.
// All other widgets are added manually via the Widget Store (+).
export const LAYOUT_VERSION = 4;
export const DEFAULT_LAYOUT = [
  { id: "chrono", x: 0, y: 0, w: 1, h: 3, collapsed: false, pinned: false },
];
