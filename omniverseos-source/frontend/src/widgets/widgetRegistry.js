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
    id: "clock",
    name: "Clock",
    icon: "fa-clock",
    color: "#00F0FF",
    defaultW: 1, defaultH: 1,
    minW: 1, minH: 1, maxW: 2, maxH: 2,
    Component: lazy(() => import("./widgets/ClockWidget")),
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
    id: "weather",
    name: "Weather",
    icon: "fa-cloud-sun",
    color: "#FCEE09",
    defaultW: 1, defaultH: 1,
    minW: 1, minH: 1, maxW: 2, maxH: 2,
    Component: lazy(() => import("./widgets/WeatherWidget")),
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

// Default desktop layout
export const DEFAULT_LAYOUT = [
  { id: "clock",      x: 0, y: 0, w: 1, h: 1, collapsed: false, pinned: false },
  { id: "cortex",     x: 1, y: 0, w: 3, h: 2, collapsed: false, pinned: true  },
  { id: "system",     x: 4, y: 0, w: 2, h: 1, collapsed: false, pinned: false },
  { id: "weather",    x: 0, y: 1, w: 1, h: 1, collapsed: false, pinned: false },
  { id: "activity",   x: 4, y: 1, w: 2, h: 2, collapsed: false, pinned: false },
  { id: "calendar",   x: 0, y: 2, w: 2, h: 2, collapsed: false, pinned: false },
  { id: "todo",       x: 2, y: 2, w: 2, h: 2, collapsed: false, pinned: false },
  { id: "quicknotes", x: 4, y: 3, w: 2, h: 1, collapsed: false, pinned: false },
  { id: "music",      x: 0, y: 4, w: 1, h: 1, collapsed: false, pinned: false },
  { id: "news",       x: 1, y: 4, w: 3, h: 1, collapsed: false, pinned: false },
];
