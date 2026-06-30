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

export const WIDGET_REGISTRY = [
  {
    id: "chrono",
    name: "Chrono-Atmo",
    icon: "fa-satellite-dish",
    color: "#00F0FF",
    defaultW: 1, defaultH: 2,
    minW: 1, minH: 2, maxW: 2, maxH: 3,
    Component: lazy(() => import("./widgets/ChronoWidget")),
  },
  {
    id: "cortex",
    name: "Cortex AI",
    icon: "fa-wand-magic-sparkles",
    color: "#00F0FF",
    defaultW: 3, defaultH: 2,
    minW: 2, minH: 1, maxW: 5, maxH: 3,
    Component: lazy(() => import("./widgets/CortexWidget")),
  },
  {
    id: "calendar",
    name: "Calendar",
    icon: "fa-calendar",
    color: "#FF003C",
    defaultW: 2, defaultH: 2,
    minW: 2, minH: 2, maxW: 3, maxH: 3,
    Component: lazy(() => import("./widgets/CalendarWidget")),
  },
  {
    id: "todo",
    name: "Tasks",
    icon: "fa-list-check",
    color: "#00F0FF",
    defaultW: 2, defaultH: 2,
    minW: 2, minH: 1, maxW: 3, maxH: 3,
    Component: lazy(() => import("./widgets/TodoWidget")),
  },

  {
    id: "system",
    name: "System Status",
    icon: "fa-circle-nodes",
    color: "#39FF14",
    defaultW: 2, defaultH: 1,
    minW: 2, minH: 1, maxW: 3, maxH: 2,
    Component: lazy(() => import("./widgets/SystemStatusWidget")),
  },
  {
    id: "activity",
    name: "Recent Activity",
    icon: "fa-bolt",
    color: "#FCEE09",
    defaultW: 2, defaultH: 2,
    minW: 2, minH: 1, maxW: 3, maxH: 3,
    Component: lazy(() => import("./widgets/RecentActivityWidget")),
  },
  {
    id: "quicknotes",
    name: "Quick Notes",
    icon: "fa-note-sticky",
    color: "#FCEE09",
    defaultW: 2, defaultH: 2,
    minW: 2, minH: 1, maxW: 3, maxH: 3,
    Component: lazy(() => import("./widgets/QuickNotesWidget")),
  },
  {
    id: "music",
    name: "Music",
    icon: "fa-music",
    color: "#39FF14",
    defaultW: 1, defaultH: 1,
    minW: 1, minH: 1, maxW: 2, maxH: 2,
    Component: lazy(() => import("./widgets/MusicWidget")),
  },
  {
    id: "news",
    name: "News",
    icon: "fa-newspaper",
    color: "#FF003C",
    defaultW: 3, defaultH: 1,
    minW: 2, minH: 1, maxW: 5, maxH: 2,
    Component: lazy(() => import("./widgets/NewsWidget")),
  },
];

export const getWidgetDef = (id) => WIDGET_REGISTRY.find((w) => w.id === id);

// Default desktop layout — only clock & weather shown by default.
// All other widgets are added manually via the Widget Store (+).
export const LAYOUT_VERSION = 3;
export const DEFAULT_LAYOUT = [
  { id: "chrono", x: 0, y: 0, w: 1, h: 2, collapsed: false, pinned: false },
];
