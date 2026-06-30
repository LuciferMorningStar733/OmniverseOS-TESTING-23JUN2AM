import React, { useEffect, useRef, useState } from "react";
import { useOS } from "../context/OSContext";
import { useBreakpoint } from "../hooks/useBreakpoint";
import { useWidgetManager } from "../widgets/WidgetManagerContext";
import { getApp } from "../lib/apps";
import { AnimatePresence, motion } from "framer-motion";

/* ─── Per-app context menus ─────────────────────────────────────────────────
   Each entry: { label, items: [{ label, shortcut?, action? }] }
   "action" is an optional string key dispatched as cortex:menuaction
   ─────────────────────────────────────────────────────────────────────────── */
const APP_MENUS = {
  chat: [
    { label: "Conversation", items: [
      { label: "New Chat",          shortcut: "⌘N" },
      { label: "Clear History",     shortcut: "⌘K" },
      { label: "Export Transcript", shortcut: "⌘E" },
    ]},
    { label: "Model", items: [
      { label: "Gemini 2.5 Flash"  },
      { label: "Gemini 2.5 Pro"    },
      { label: "DeepSeek V3"       },
    ]},
  ],
  notes: [
    { label: "File", items: [
      { label: "New Note",   shortcut: "⌘N" },
      { label: "Save",       shortcut: "⌘S" },
      { label: "Export PDF", shortcut: "⌘E" },
    ]},
    { label: "Format", items: [
      { label: "Bold",          shortcut: "⌘B" },
      { label: "Italic",        shortcut: "⌘I" },
      { label: "Heading 1"                    },
      { label: "Bullet List",   shortcut: "⌘L" },
    ]},
  ],
  tasks: [
    { label: "Tasks", items: [
      { label: "Add Task",       shortcut: "⌘N" },
      { label: "Clear Completed" },
      { label: "Sort by Due Date" },
    ]},
  ],
  browser: [
    { label: "Navigation", items: [
      { label: "New Tab",    shortcut: "⌘T" },
      { label: "Back",       shortcut: "⌘[" },
      { label: "Forward",    shortcut: "⌘]" },
      { label: "Reload",     shortcut: "⌘R" },
    ]},
    { label: "View", items: [
      { label: "Zoom In",  shortcut: "⌘+" },
      { label: "Zoom Out", shortcut: "⌘-" },
      { label: "Reader Mode" },
    ]},
  ],
  music: [
    { label: "Playback", items: [
      { label: "Play / Pause", shortcut: "Space" },
      { label: "Next Track",   shortcut: "⌘→" },
      { label: "Prev Track",   shortcut: "⌘←" },
    ]},
    { label: "Library", items: [
      { label: "Add to Playlist" },
      { label: "Search Library",  shortcut: "⌘F" },
    ]},
  ],
  code: [
    { label: "File", items: [
      { label: "New File",  shortcut: "⌘N" },
      { label: "Save",      shortcut: "⌘S" },
      { label: "Save All",  shortcut: "⌘⇧S" },
    ]},
    { label: "Edit", items: [
      { label: "Find",    shortcut: "⌘F" },
      { label: "Replace", shortcut: "⌘H" },
    ]},
    { label: "View", items: [
      { label: "Toggle Terminal",   shortcut: "⌘`" },
      { label: "Toggle Minimap" },
    ]},
  ],
  calendar: [
    { label: "Calendar", items: [
      { label: "New Event",     shortcut: "⌘N" },
      { label: "Today",         shortcut: "⌘T" },
      { label: "Month View" },
      { label: "Week View" },
    ]},
  ],
  files: [
    { label: "File", items: [
      { label: "New Folder",  shortcut: "⌘⇧N" },
      { label: "Get Info",    shortcut: "⌘I" },
      { label: "Move to Bin", shortcut: "⌘⌫" },
    ]},
    { label: "View", items: [
      { label: "List View" },
      { label: "Grid View" },
      { label: "Sort by Name" },
    ]},
  ],
};

/* Default OS-level menu shown when no app is active */
const OS_MENU = [
  { label: "OmniverseOS", items: [
    { label: "About OmniverseOS"  },
    { label: "System Preferences" },
    { label: "Force Quit",  shortcut: "⌥⌘⎋" },
    { label: "---" },
    { label: "Sleep"   },
    { label: "Restart" },
    { label: "Shut Down" },
  ]},
  { label: "Cortex", items: [
    { label: "Open AI Chat",  shortcut: "⌘Space" },
    { label: "Summarize Day" },
    { label: "Plan My Day"   },
  ]},
];

/* ─── MenuDropdown ───────────────────────────────────────────────────────── */
function MenuDropdown({ menu, onClose }) {
  const ref = useRef(null);
  useEffect(() => {
    function handler(e) {
      if (ref.current && !ref.current.contains(e.target)) onClose();
    }
    document.addEventListener("mousedown", handler);
    return () => document.removeEventListener("mousedown", handler);
  }, [onClose]);

  return (
    <motion.div
      ref={ref}
      initial={{ opacity: 0, y: -6, scale: 0.97 }}
      animate={{ opacity: 1, y: 0,  scale: 1    }}
      exit={{    opacity: 0, y: -4, scale: 0.97 }}
      transition={{ duration: 0.13, ease: "easeOut" }}
      style={{
        position: "absolute",
        top: "calc(100% + 4px)",
        left: 0,
        minWidth: 220,
        background: "rgba(8,10,18,0.96)",
        backdropFilter: "blur(40px) saturate(200%)",
        WebkitBackdropFilter: "blur(40px) saturate(200%)",
        border: "1px solid rgba(0,240,255,0.12)",
        borderRadius: 10,
        boxShadow: "0 20px 60px rgba(0,0,0,0.7), 0 0 0 0.5px rgba(0,240,255,0.06)",
        zIndex: 99999,
        overflow: "hidden",
        fontFamily: "'Outfit', ui-sans-serif, sans-serif",
      }}
    >
      {menu.items.map((item, i) =>
        item.label === "---" ? (
          <div key={i} style={{ height: 1, background: "rgba(255,255,255,0.06)", margin: "3px 0" }} />
        ) : (
          <button
            key={i}
            onClick={onClose}
            style={{
              display: "flex", alignItems: "center", justifyContent: "space-between",
              width: "100%", background: "none", border: "none",
              padding: "7px 14px", cursor: "pointer",
              color: "#e2e8f0", fontSize: 13,
              transition: "background 0.1s",
            }}
            onMouseEnter={e => e.currentTarget.style.background = "rgba(0,240,255,0.09)"}
            onMouseLeave={e => e.currentTarget.style.background = "none"}
          >
            <span>{item.label}</span>
            {item.shortcut && (
              <span style={{ color: "#475569", fontSize: 11, fontFamily: "monospace", marginLeft: 16 }}>
                {item.shortcut}
              </span>
            )}
          </button>
        )
      )}
    </motion.div>
  );
}

/* ─── MenuBarItem ─────────────────────────────────────────────────────────── */
function MenuBarItem({ menu }) {
  const [open, setOpen] = useState(false);
  return (
    <div style={{ position: "relative" }}>
      <button
        onClick={() => setOpen(v => !v)}
        style={{
          background: open ? "rgba(0,240,255,0.10)" : "none",
          border: "none",
          borderRadius: 6,
          padding: "3px 9px",
          color: open ? "#00F0FF" : "rgba(255,255,255,0.75)",
          fontSize: 13,
          fontFamily: "'Outfit', ui-sans-serif, sans-serif",
          fontWeight: 500,
          cursor: "pointer",
          transition: "all 0.15s",
          whiteSpace: "nowrap",
        }}
        onMouseEnter={e => { if (!open) e.currentTarget.style.color = "#fff"; }}
        onMouseLeave={e => { if (!open) e.currentTarget.style.color = "rgba(255,255,255,0.75)"; }}
      >
        {menu.label}
      </button>
      <AnimatePresence>
        {open && <MenuDropdown menu={menu} onClose={() => setOpen(false)} />}
      </AnimatePresence>
    </div>
  );
}

/* ─── ActiveAppMenuBar ────────────────────────────────────────────────────── */
function ActiveAppMenuBar({ activeId, windows }) {
  const activeWin  = windows.find(w => w.id === activeId);
  const appId      = activeWin?.app ?? null;
  const appMeta    = appId ? getApp(appId) : null;
  const menus      = appId ? (APP_MENUS[appId] ?? []) : [];
  const osMenus    = OS_MENU;

  return (
    <div style={{ display: "flex", alignItems: "center", gap: 2, minWidth: 0 }}>
      {/* OS logo always first */}
      <div
        style={{
          flexShrink: 0,
          width: 22, height: 22, borderRadius: 6,
          background: "linear-gradient(135deg,#00F0FF,#FF003C)",
          display: "flex", alignItems: "center", justifyContent: "center",
          marginRight: 4,
        }}
      >
        <i className="fa-solid fa-infinity" style={{ color: "#000", fontSize: 10 }} />
      </div>

      {/* Active app name — animated transition */}
      <AnimatePresence mode="wait">
        <motion.div
          key={appId ?? "os"}
          initial={{ opacity: 0, x: -8 }}
          animate={{ opacity: 1, x: 0  }}
          exit={{    opacity: 0, x:  8 }}
          transition={{ duration: 0.18 }}
          style={{
            display: "flex", alignItems: "center", gap: 6,
            paddingRight: 8,
            borderRight: "1px solid rgba(255,255,255,0.08)",
            marginRight: 4,
            flexShrink: 0,
          }}
        >
          {appMeta && (
            <i
              className={`fa-solid ${appMeta.icon}`}
              style={{ color: appMeta.color, fontSize: 12 }}
            />
          )}
          <span
            style={{
              color: "#fff",
              fontSize: 13,
              fontWeight: 700,
              fontFamily: "'Outfit', ui-sans-serif, sans-serif",
              letterSpacing: "0.01em",
            }}
          >
            {appMeta ? appMeta.name : "OmniverseOS"}
          </span>
        </motion.div>
      </AnimatePresence>

      {/* OS menus always visible */}
      {osMenus.map((m, i) => <MenuBarItem key={`os-${i}`} menu={m} />)}

      {/* App-specific menus — animated in/out */}
      <AnimatePresence>
        {menus.map((m, i) => (
          <motion.div
            key={`${appId}-${i}`}
            initial={{ opacity: 0, x: -10 }}
            animate={{ opacity: 1,  x: 0  }}
            exit={{    opacity: 0,  x: -6 }}
            transition={{ duration: 0.15, delay: i * 0.04 }}
          >
            <MenuBarItem menu={m} />
          </motion.div>
        ))}
      </AnimatePresence>
    </div>
  );
}

/* ─── TopBar ──────────────────────────────────────────────────────────────── */
export default function TopBar({ onOpenMissionControl }) {
  const { user, logout, setPaletteOpen, setNotifOpen, notifications, activeId, windows } = useOS();
  const { visible: widgetsVisible, toggleWidgets: toggleWidgets } = useWidgetManager();
  const [time, setTime]   = useState(new Date());
  const { isMobile, isTablet } = useBreakpoint();

  useEffect(() => {
    const t = setInterval(() => setTime(new Date()), 1000);
    return () => clearInterval(t);
  }, []);

  const unread = notifications.length;

  /* ── Mobile ────────────────────────────────────────────────────────────── */
  if (isMobile) {
    return (
      <div
        className="absolute left-0 right-0 top-0 z-40 flex items-center gap-2"
        style={{
          background: "rgba(6, 8, 14, 0.82)",
          backdropFilter: "blur(32px) saturate(200%)",
          WebkitBackdropFilter: "blur(32px) saturate(200%)",
          borderBottom: "1px solid rgba(255,255,255,0.08)",
          boxShadow: "0 4px 24px rgba(0,0,0,0.4)",
          height: 60,
          paddingLeft: 10,
          paddingRight: 10,
          paddingTop: "env(safe-area-inset-top, 0px)",
        }}
        data-testid="topbar"
      >
        {/* Logo icon */}
        <div
          className="flex-shrink-0 w-8 h-8 rounded-lg flex items-center justify-center"
          style={{ background: "linear-gradient(135deg,#00F0FF,#FF003C)" }}
        >
          <i className="fa-solid fa-infinity text-ext-black text-xs" />
          </div>

          {/* Search pill */}
          <button
            data-testid="open-command-palette"
            onClick={() => setPaletteOpen(true)}
            className="flex-1 flex items-center gap-2 rounded-2xl"
            style={{
              background: "rgba(255,255,255,0.07)",
              border: "1px solid rgba(255,255,255,0.12)",
              height: 44,
              paddingLeft: 14,
              paddingRight: 14,
              minWidth: 0,
            }}
          >
            <i className="fa-solid fa-magnifying-glass text-[#00F0FF] text-sm flex-shrink-0" />
            <span className="flex-1 text-left text-sm text-slate-400 font-mono truncate">Search or ask AI.</span>
            <i className="fa-solid fa-microphone text-slate-500 text-sm flex-shrink-0" />
          </button>

          {/* Notification bell */}
          <button
            onClick={() => setNotifOpen(true)}
            className="relative flex-shrink-0 w-10 h-10 flex items-center justify-center rounded-xl"
            style={{ background: "rgba(255,255,255,0.06)", border: "1px solid rgba(255,255,255,0.08)" }}
          >
            <i className="fa-solid fa-bell text-slate-300 text-sm" />
            {unread > 0 && (
              <span className="absolute top-1 right-1 w-2 h-2 rounded-full bg-[#FF003C]" />
            )}
          </button>
        </div>
      );
  }

  /* ── Desktop ───────────────────────────────────────────────────────────── */
  return (
    <div
      className="absolute left-0 right-0 top-0 z-40"
      style={{
        background: "rgba(6, 8, 14, 0.80)",
        backdropFilter: "blur(40px) saturate(200%)",
        WebkitBackdropFilter: "blur(40px) saturate(200%)",
        borderBottom: "1px solid rgba(255,255,255,0.06)",
        boxShadow: "0 1px 0 rgba(0,240,255,0.04), 0 4px 24px rgba(0,0,0,0.35)",
        height: 38,
        display: "flex",
        alignItems: "center",
        paddingLeft: 12,
        paddingRight: 12,
        gap: 8,
      }}
      data-testid="topbar"
    >
      {/* Left: Active app menu bar */}
      <div style={{ flex: 1, display: "flex", alignItems: "center", minWidth: 0, overflow: "hidden" }}>
        <ActiveAppMenuBar activeId={activeId} windows={windows} />
      </div>

      {/* Center: Search pill */}
      <button
        data-testid="open-command-palette"
        onClick={() => setPaletteOpen(true)}
        style={{
          display: "flex", alignItems: "center", gap: 8,
          background: "rgba(255,255,255,0.06)",
          border: "1px solid rgba(255,255,255,0.10)",
          borderRadius: 20,
          height: 26,
          paddingLeft: 12,
          paddingRight: 12,
          cursor: "pointer",
          flexShrink: 0,
          minWidth: 200,
        }}
      >
        <i className="fa-solid fa-magnifying-glass" style={{ color: "#00F0FF", fontSize: 11 }} />
        <span style={{ color: "#64748b", fontSize: 12, fontFamily: "'Outfit', sans-serif", whiteSpace: "nowrap" }}>
          Search apps, files or ask AI.
        </span>
        <kbd style={{ marginLeft: 4, padding: "1px 5px", background: "rgba(255,255,255,0.08)", borderRadius: 4, color: "#475569", fontSize: 10, fontFamily: "monospace" }}>?K</kbd>
      </button>

      {/* Right cluster */}
      <div style={{ flex: 1, display: "flex", alignItems: "center", justifyContent: "flex-end", gap: 6 }}>

        {/* Widget toggle */}
        <button
          onClick={toggleWidgets}
          title={widgetsVisible ? "Hide widgets" : "Show widgets"}
          style={{
            background: widgetsVisible ? "rgba(0,240,255,0.10)" : "rgba(255,255,255,0.05)",
            border: "1px solid rgba(255,255,255,0.08)",
            borderRadius: 6, width: 26, height: 26,
            display: "flex", alignItems: "center", justifyContent: "center",
            cursor: "pointer",
          }}
        >
          <i className="fa-solid fa-table-cells" style={{ color: widgetsVisible ? "#00F0FF" : "#64748b", fontSize: 11 }} />
        </button>

        {/* Mission control */}
        <button
          onClick={onOpenMissionControl}
          title="Mission Control"
          style={{
            background: "rgba(255,255,255,0.05)",
            border: "1px solid rgba(255,255,255,0.08)",
            borderRadius: 6, width: 26, height: 26,
            display: "flex", alignItems: "center", justifyContent: "center",
            cursor: "pointer",
          }}
        >
          <i className="fa-solid fa-clone" style={{ color: "#64748b", fontSize: 11 }} />
        </button>

        {/* Notifications */}
        <button
          onClick={() => setNotifOpen(true)}
          style={{
            background: "rgba(255,255,255,0.05)",
            border: "1px solid rgba(255,255,255,0.08)",
            borderRadius: 6, width: 26, height: 26,
            display: "flex", alignItems: "center", justifyContent: "center",
            cursor: "pointer",
            position: "relative",
          }}
        >
          <i className="fa-solid fa-bell" style={{ color: "#64748b", fontSize: 11 }} />
          {unread > 0 && (
            <span style={{
              position: "absolute", top: 3, right: 3,
              width: 6, height: 6, borderRadius: "50%",
              background: "#FF003C",
              border: "1px solid rgba(6,8,14,0.9)",
            }} />
          )}
        </button>

        {/* Time */}
        <div style={{
          display: "flex", flexDirection: "column", alignItems: "flex-end",
          paddingLeft: 6,
          borderLeft: "1px solid rgba(255,255,255,0.06)",
        }}>
          <span style={{ color: "#e2e8f0", fontSize: 12, fontWeight: 600, fontFamily: "'Outfit', monospace", lineHeight: 1.2 }}>
            {time.toLocaleTimeString([], { hour: "2-digit", minute: "2-digit" })}
          </span>
          <span style={{ color: "#475569", fontSize: 10, fontFamily: "monospace" }}>
            {time.toLocaleDateString(undefined, { month: "short", day: "numeric" })}
          </span>
        </div>

        {/* Avatar */}
        <button
          onClick={logout}
          title="Sign out"
          style={{
            width: 26, height: 26, borderRadius: "50%",
            background: "linear-gradient(135deg,#00F0FF,#7B2FFF)",
            border: "1.5px solid rgba(0,240,255,0.3)",
            display: "flex", alignItems: "center", justifyContent: "center",
            cursor: "pointer", flexShrink: 0,
          }}
        >
          <span style={{ color: "#000", fontSize: 11, fontWeight: 700 }}>
            {user?.name?.[0]?.toUpperCase() ?? user?.email?.[0]?.toUpperCase() ?? "A"}
          </span>
        </button>
      </div>
    </div>
  );
}
