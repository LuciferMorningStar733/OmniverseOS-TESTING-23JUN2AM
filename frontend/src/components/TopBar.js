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

/* ─── AvatarMenu ─────────────────────────────────────────────────────────── */
function AvatarMenu({ user, onClose, onLogoutRequest }) {
  const ref = useRef(null);
  useEffect(() => {
    function handler(e) {
      if (ref.current && !ref.current.contains(e.target)) onClose();
    }
    document.addEventListener("mousedown", handler);
    return () => document.removeEventListener("mousedown", handler);
  }, [onClose]);

  const initial = (user?.name?.[0] ?? user?.email?.[0] ?? "A").toUpperCase();
  const displayName = user?.name || user?.email || "Account";

  return (
    <motion.div
      ref={ref}
      initial={{ opacity: 0, y: -6, scale: 0.97 }}
      animate={{ opacity: 1, y: 0,  scale: 1    }}
      exit={{    opacity: 0, y: -4, scale: 0.97 }}
      transition={{ duration: 0.13, ease: "easeOut" }}
      style={{
        position: "absolute",
        top: "calc(100% + 6px)",
        right: 0,
        minWidth: 210,
        background: "rgba(8,10,18,0.97)",
        backdropFilter: "blur(40px) saturate(200%)",
        WebkitBackdropFilter: "blur(40px) saturate(200%)",
        border: "1px solid rgba(0,240,255,0.12)",
        borderRadius: 12,
        boxShadow: "0 20px 60px rgba(0,0,0,0.7), 0 0 0 0.5px rgba(0,240,255,0.06)",
        zIndex: 99999,
        overflow: "hidden",
        fontFamily: "'Outfit', ui-sans-serif, sans-serif",
      }}
    >
      {/* Profile header */}
      <div style={{
        padding: "12px 14px 10px",
        borderBottom: "1px solid rgba(255,255,255,0.07)",
        display: "flex", alignItems: "center", gap: 10,
      }}>
        <div style={{
          width: 32, height: 32, borderRadius: "50%", flexShrink: 0,
          background: "linear-gradient(135deg,#00F0FF,#7B2FFF)",
          display: "flex", alignItems: "center", justifyContent: "center",
          border: "1.5px solid rgba(0,240,255,0.3)",
        }}>
          <span style={{ color: "#000", fontSize: 13, fontWeight: 700 }}>{initial}</span>
        </div>
        <div style={{ minWidth: 0 }}>
          <div style={{ color: "#e2e8f0", fontSize: 13, fontWeight: 600, truncate: true, overflow: "hidden", textOverflow: "ellipsis", whiteSpace: "nowrap" }}>
            {displayName}
          </div>
          {user?.email && user?.name && (
            <div style={{ color: "#475569", fontSize: 11, overflow: "hidden", textOverflow: "ellipsis", whiteSpace: "nowrap" }}>
              {user.email}
            </div>
          )}
        </div>
      </div>

      {/* Menu items */}
      {[
        { icon: "fa-user", label: "Profile" },
        { icon: "fa-gear", label: "Account Settings" },
        { separator: true },
        { icon: "fa-arrow-right-from-bracket", label: "Sign Out", danger: true, action: "logout" },
      ].map((item, i) =>
        item.separator ? (
          <div key={i} style={{ height: 1, background: "rgba(255,255,255,0.06)", margin: "3px 0" }} />
        ) : (
          <button
            key={i}
            onClick={() => { if (item.action === "logout") { onClose(); onLogoutRequest(); } else onClose(); }}
            style={{
              display: "flex", alignItems: "center", gap: 9,
              width: "100%", background: "none", border: "none",
              padding: "8px 14px", cursor: "pointer",
              color: item.danger ? "#FF7090" : "#e2e8f0",
              fontSize: 13,
              transition: "background 0.1s",
            }}
            onMouseEnter={e => e.currentTarget.style.background = item.danger ? "rgba(255,0,60,0.1)" : "rgba(0,240,255,0.09)"}
            onMouseLeave={e => e.currentTarget.style.background = "none"}
          >
            <i className={`fa-solid ${item.icon} text-[11px]`} style={{ color: item.danger ? "#FF7090" : "#64748b", width: 14 }} />
            <span>{item.label}</span>
          </button>
        )
      )}
    </motion.div>
  );
}

/* ─── LogoutConfirmDialog ─────────────────────────────────────────────────── */
function LogoutConfirmDialog({ onConfirm, onCancel }) {
  const ref = useRef(null);
  useEffect(() => {
    function handler(e) { if (ref.current && !ref.current.contains(e.target)) onCancel(); }
    document.addEventListener("mousedown", handler);
    return () => document.removeEventListener("mousedown", handler);
  }, [onCancel]);

  return (
    <motion.div
      initial={{ opacity: 0 }}
      animate={{ opacity: 1 }}
      exit={{ opacity: 0 }}
      style={{
        position: "fixed", inset: 0, zIndex: 99998,
        background: "rgba(0,0,0,0.55)",
        backdropFilter: "blur(4px)",
        display: "flex", alignItems: "center", justifyContent: "center",
      }}
    >
      <motion.div
        ref={ref}
        initial={{ scale: 0.94, y: 12 }}
        animate={{ scale: 1,    y: 0  }}
        exit={{    scale: 0.94, y: 8  }}
        transition={{ type: "spring", stiffness: 420, damping: 28 }}
        style={{
          background: "rgba(8,10,22,0.98)",
          border: "1px solid rgba(255,0,60,0.25)",
          borderRadius: 16,
          padding: "24px 28px",
          maxWidth: 320,
          width: "90vw",
          boxShadow: "0 32px 80px rgba(0,0,0,0.8)",
          fontFamily: "'Outfit', ui-sans-serif, sans-serif",
        }}
      >
        <div style={{ display: "flex", alignItems: "center", gap: 10, marginBottom: 12 }}>
          <div style={{
            width: 36, height: 36, borderRadius: "50%",
            background: "rgba(255,0,60,0.1)",
            border: "1px solid rgba(255,0,60,0.25)",
            display: "flex", alignItems: "center", justifyContent: "center",
          }}>
            <i className="fa-solid fa-arrow-right-from-bracket" style={{ color: "#FF7090", fontSize: 14 }} />
          </div>
          <div>
            <div style={{ color: "#fff", fontSize: 15, fontWeight: 600 }}>Sign out?</div>
          </div>
        </div>
        <p style={{ color: "#64748b", fontSize: 13, lineHeight: 1.6, marginBottom: 20 }}>
          Your session will end and you'll be returned to the login screen.
        </p>
        <div style={{ display: "flex", gap: 8 }}>
          <button
            onClick={onCancel}
            style={{
              flex: 1, padding: "9px 0",
              background: "rgba(255,255,255,0.06)",
              border: "1px solid rgba(255,255,255,0.1)",
              borderRadius: 9, cursor: "pointer",
              color: "#94a3b8", fontSize: 13,
              transition: "all 0.15s",
            }}
            onMouseEnter={e => { e.currentTarget.style.background = "rgba(255,255,255,0.1)"; }}
            onMouseLeave={e => { e.currentTarget.style.background = "rgba(255,255,255,0.06)"; }}
          >
            Cancel
          </button>
          <button
            onClick={onConfirm}
            style={{
              flex: 1, padding: "9px 0",
              background: "rgba(255,0,60,0.12)",
              border: "1px solid rgba(255,0,60,0.3)",
              borderRadius: 9, cursor: "pointer",
              color: "#FF7090", fontSize: 13, fontWeight: 600,
              transition: "all 0.15s",
            }}
            onMouseEnter={e => { e.currentTarget.style.background = "rgba(255,0,60,0.22)"; }}
            onMouseLeave={e => { e.currentTarget.style.background = "rgba(255,0,60,0.12)"; }}
          >
            Sign Out
          </button>
        </div>
      </motion.div>
    </motion.div>
  );
}

/* ─── TopBar ──────────────────────────────────────────────────────────────── */
export default function TopBar({ onOpenMissionControl, onOpenBrightness }) {
  const { user, logout, setPaletteOpen, setNotifOpen, notifications, activeId, windows } = useOS();
  const { visible: widgetsVisible, toggleWidgets: toggleWidgets } = useWidgetManager();
  const [time, setTime]   = useState(new Date());
  const { isMobile, isTablet } = useBreakpoint();
  const [avatarMenuOpen,   setAvatarMenuOpen]   = useState(false);
  const [showLogoutConfirm, setShowLogoutConfirm] = useState(false);

  const handleLogoutRequest = () => setShowLogoutConfirm(true);
  const handleLogoutConfirm = () => { setShowLogoutConfirm(false); logout(); };
  const handleLogoutCancel  = () => setShowLogoutConfirm(false);

  useEffect(() => {
    const t = setInterval(() => setTime(new Date()), 1000);
    return () => clearInterval(t);
  }, []);

  const unread = notifications.length;

  /* ── Mobile ────────────────────────────────────────────────────────────── */
  if (isMobile) {
    return (
      <>
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
            <i className="fa-solid fa-infinity text-black text-xs" />
          </div>

          {/* OS name — minimal, no duplicate search */}
          <div className="flex-1 flex flex-col justify-center" style={{ paddingLeft: 6 }}>
            <span style={{
              fontSize: 13,
              fontFamily: "'Outfit', sans-serif",
              fontWeight: 600,
              color: "rgba(255,255,255,0.82)",
              letterSpacing: "-0.01em",
              lineHeight: 1,
            }}>
              OmniverseOS
            </span>
            <span style={{
              fontSize: 9.5,
              fontFamily: "'Outfit', sans-serif",
              fontWeight: 400,
              color: "rgba(0,240,255,0.55)",
              letterSpacing: "0.06em",
              textTransform: "uppercase",
              marginTop: 2,
            }}>
              Cortex Active
            </span>
          </div>

          {/* Notification bell */}
          <button
            onClick={() => setNotifOpen(true)}
            className="relative flex-shrink-0 w-10 h-10 flex items-center justify-center rounded-xl"
            style={{ background: "rgba(255,255,255,0.06)", border: "1px solid rgba(255,255,255,0.08)" }}
            aria-label="Notifications"
          >
            <i className="fa-solid fa-bell text-slate-300 text-sm" />
            {unread > 0 && (
              <span className="absolute top-1 right-1 w-2 h-2 rounded-full bg-[#FF003C]" />
            )}
          </button>
        </div>
        <AnimatePresence>
          {showLogoutConfirm && <LogoutConfirmDialog onConfirm={handleLogoutConfirm} onCancel={handleLogoutCancel} />}
        </AnimatePresence>
      </>
      );
  }

  /* ── Tablet (48px compact bar) ────────────────────────────────────────── */
  if (isTablet) {
    return (
      <>
      <div
        className="absolute left-0 right-0 top-0 z-40 flex items-center"
        style={{
          background: "rgba(6, 8, 14, 0.84)",
          backdropFilter: "blur(36px) saturate(200%)",
          WebkitBackdropFilter: "blur(36px) saturate(200%)",
          borderBottom: "1px solid rgba(255,255,255,0.07)",
          boxShadow: "0 4px 24px rgba(0,0,0,0.4)",
          height: 48,
          paddingLeft: 14,
          paddingRight: 14,
          paddingTop: "env(safe-area-inset-top, 0px)",
          gap: 10,
        }}
        data-testid="topbar"
      >
        {/* Logo */}
        <div className="flex-shrink-0 flex items-center gap-2">
          <div
            style={{
              width: 28, height: 28, borderRadius: 8,
              background: "linear-gradient(135deg,#00F0FF,#FF003C)",
              display: "flex", alignItems: "center", justifyContent: "center",
            }}
          >
            <i className="fa-solid fa-infinity" style={{ color: "#000", fontSize: 10 }} />
          </div>
          <span style={{
            fontSize: 13,
            fontFamily: "'Outfit', sans-serif",
            fontWeight: 600,
            color: "rgba(255,255,255,0.85)",
            letterSpacing: "-0.01em",
            whiteSpace: "nowrap",
          }}>
            OmniverseOS
          </span>
        </div>

        {/* Search pill — flexible center */}
        <button
          data-testid="open-command-palette"
          onClick={() => setPaletteOpen(true)}
          style={{
            flex: 1,
            display: "flex", alignItems: "center", gap: 8,
            background: "rgba(255,255,255,0.06)",
            border: "1px solid rgba(255,255,255,0.10)",
            borderRadius: 20,
            height: 30,
            paddingLeft: 12,
            paddingRight: 12,
            cursor: "pointer",
            maxWidth: 340,
            margin: "0 auto",
            transition: "all 0.15s ease",
          }}
        >
          <i className="fa-solid fa-magnifying-glass" style={{ color: "#00F0FF", fontSize: 11 }} />
          <span style={{ color: "#64748b", fontSize: 12, fontFamily: "'Outfit', sans-serif", whiteSpace: "nowrap" }}>
            Search or ask Cortex…
          </span>
        </button>

        {/* Right cluster */}
        <div style={{ display: "flex", alignItems: "center", gap: 6, flexShrink: 0 }}>
          {/* Notifications */}
          <button
            onClick={() => setNotifOpen(true)}
            aria-label={`Notifications${unread > 0 ? `, ${unread} unread` : ""}`}
            style={{
              background: unread > 0 ? "rgba(255,0,60,0.08)" : "rgba(255,255,255,0.05)",
              border: `1px solid ${unread > 0 ? "rgba(255,0,60,0.25)" : "rgba(255,255,255,0.08)"}`,
              borderRadius: 6, width: 32, height: 32,
              display: "flex", alignItems: "center", justifyContent: "center",
              cursor: "pointer", position: "relative",
              transition: "all 0.15s ease",
            }}
          >
            <i className="fa-solid fa-bell" style={{ color: unread > 0 ? "#FF6B7A" : "#64748b", fontSize: 12 }} />
            {unread > 0 && (
              <span style={{
                position: "absolute", top: 4, right: 4,
                width: 7, height: 7, borderRadius: "50%",
                background: "#FF003C",
              }} />
            )}
          </button>

          {/* Time */}
          <div style={{
            display: "flex", flexDirection: "column", alignItems: "flex-end",
            paddingLeft: 8,
            borderLeft: "1px solid rgba(255,255,255,0.07)",
          }}>
            <span style={{ color: "#e2e8f0", fontSize: 13, fontWeight: 600, fontFamily: "'Outfit', monospace", lineHeight: 1.2 }}>
              {time.toLocaleTimeString([], { hour: "2-digit", minute: "2-digit" })}
            </span>
            <span style={{ color: "#475569", fontSize: 10, fontFamily: "monospace" }}>
              {time.toLocaleDateString(undefined, { month: "short", day: "numeric" })}
            </span>
          </div>

          {/* Avatar — opens profile menu */}
          <div style={{ position: "relative" }}>
            <button
              onClick={() => setAvatarMenuOpen((v) => !v)}
              title="Account"
              style={{
                width: 30, height: 30, borderRadius: "50%",
                background: "linear-gradient(135deg,#00F0FF,#7B2FFF)",
                border: "1.5px solid rgba(0,240,255,0.3)",
                display: "flex", alignItems: "center", justifyContent: "center",
                cursor: "pointer", flexShrink: 0,
              }}
            >
              <span style={{ color: "#000", fontSize: 12, fontWeight: 700 }}>
                {user?.name?.[0]?.toUpperCase() ?? user?.email?.[0]?.toUpperCase() ?? "A"}
              </span>
            </button>
            <AnimatePresence>
              {avatarMenuOpen && (
                <AvatarMenu
                  user={user}
                  onClose={() => setAvatarMenuOpen(false)}
                  onLogoutRequest={handleLogoutRequest}
                />
              )}
            </AnimatePresence>
          </div>
        </div>
      </div>
      <AnimatePresence>
        {showLogoutConfirm && <LogoutConfirmDialog onConfirm={handleLogoutConfirm} onCancel={handleLogoutCancel} />}
      </AnimatePresence>
      </>
    );
  }

  /* ── Desktop ───────────────────────────────────────────────────────────── */
  return (
    <>
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
          transition: "all 0.15s ease",
        }}
        onMouseEnter={(e) => { e.currentTarget.style.background = "rgba(255,255,255,0.10)"; e.currentTarget.style.borderColor = "rgba(255,255,255,0.18)"; }}
        onMouseLeave={(e) => { e.currentTarget.style.background = "rgba(255,255,255,0.06)"; e.currentTarget.style.borderColor = "rgba(255,255,255,0.10)"; }}
      >
        <i className="fa-solid fa-magnifying-glass" style={{ color: "#00F0FF", fontSize: 11 }} />
        <span style={{ color: "#64748b", fontSize: 12, fontFamily: "'Outfit', sans-serif", whiteSpace: "nowrap" }}>
          Search or ask Cortex…
        </span>
        <kbd style={{ marginLeft: 4, padding: "1px 5px", background: "rgba(255,255,255,0.08)", borderRadius: 4, color: "#475569", fontSize: 10, fontFamily: "monospace" }}>⌘K</kbd>
      </button>

      {/* Right cluster */}
      <div style={{ flex: 1, display: "flex", alignItems: "center", justifyContent: "flex-end", gap: 6 }}>

        {/* Brightness */}
        {onOpenBrightness && (
          <button
            onClick={onOpenBrightness}
            title="Brightness (Ctrl+Shift+B)"
            style={{
              background: "rgba(255,255,255,0.05)",
              border: "1px solid rgba(255,255,255,0.08)",
              borderRadius: 6, width: 26, height: 26,
              display: "flex", alignItems: "center", justifyContent: "center",
              cursor: "pointer",
              transition: "all 0.15s",
            }}
            onMouseEnter={(e) => { e.currentTarget.style.background = "rgba(245,158,11,0.12)"; e.currentTarget.style.borderColor = "rgba(245,158,11,0.3)"; }}
            onMouseLeave={(e) => { e.currentTarget.style.background = "rgba(255,255,255,0.05)"; e.currentTarget.style.borderColor = "rgba(255,255,255,0.08)"; }}
          >
            <i className="fa-solid fa-sun" style={{ color: "#F59E0B", fontSize: 11 }} />
          </button>
        )}

        {/* Widget toggle */}
        <button
          onClick={toggleWidgets}
          aria-label={widgetsVisible ? "Hide widgets" : "Show widgets"}
          aria-pressed={widgetsVisible}
          title={widgetsVisible ? "Hide widgets" : "Show widgets"}
          style={{
            background: widgetsVisible ? "rgba(0,240,255,0.10)" : "rgba(255,255,255,0.05)",
            border: `1px solid ${widgetsVisible ? "rgba(0,240,255,0.25)" : "rgba(255,255,255,0.08)"}`,
            borderRadius: 6, width: 26, height: 26,
            display: "flex", alignItems: "center", justifyContent: "center",
            cursor: "pointer",
            transition: "all 0.15s ease",
          }}
          onMouseEnter={(e) => { if (!widgetsVisible) { e.currentTarget.style.background = "rgba(255,255,255,0.09)"; e.currentTarget.style.borderColor = "rgba(255,255,255,0.15)"; }}}
          onMouseLeave={(e) => { if (!widgetsVisible) { e.currentTarget.style.background = "rgba(255,255,255,0.05)"; e.currentTarget.style.borderColor = "rgba(255,255,255,0.08)"; }}}
        >
          <i className="fa-solid fa-table-cells" style={{ color: widgetsVisible ? "#00F0FF" : "#64748b", fontSize: 11 }} />
        </button>

        {/* Mission control */}
        <button
          onClick={onOpenMissionControl}
          aria-label="Mission Control"
          title="Mission Control (Ctrl+Tab)"
          style={{
            background: "rgba(255,255,255,0.05)",
            border: "1px solid rgba(255,255,255,0.08)",
            borderRadius: 6, width: 26, height: 26,
            display: "flex", alignItems: "center", justifyContent: "center",
            cursor: "pointer",
            transition: "all 0.15s ease",
          }}
          onMouseEnter={(e) => { e.currentTarget.style.background = "rgba(255,255,255,0.09)"; e.currentTarget.style.borderColor = "rgba(255,255,255,0.15)"; }}
          onMouseLeave={(e) => { e.currentTarget.style.background = "rgba(255,255,255,0.05)"; e.currentTarget.style.borderColor = "rgba(255,255,255,0.08)"; }}
        >
          <i className="fa-solid fa-clone" style={{ color: "#64748b", fontSize: 11 }} />
        </button>

        {/* Notifications */}
        <button
          onClick={() => setNotifOpen(true)}
          aria-label={`Notifications${unread > 0 ? `, ${unread} unread` : ""}`}
          aria-live="polite"
          title={`Notifications${unread > 0 ? ` (${unread})` : ""}`}
          style={{
            background: unread > 0 ? "rgba(255,0,60,0.08)" : "rgba(255,255,255,0.05)",
            border: `1px solid ${unread > 0 ? "rgba(255,0,60,0.25)" : "rgba(255,255,255,0.08)"}`,
            borderRadius: 6, height: 26,
            minWidth: 26,
            paddingInline: unread > 0 ? "6px" : "0",
            display: "flex", alignItems: "center", justifyContent: "center", gap: 4,
            cursor: "pointer",
            position: "relative",
            transition: "all 0.15s ease",
          }}
          onMouseEnter={(e) => { e.currentTarget.style.background = unread > 0 ? "rgba(255,0,60,0.16)" : "rgba(255,255,255,0.09)"; }}
          onMouseLeave={(e) => { e.currentTarget.style.background = unread > 0 ? "rgba(255,0,60,0.08)" : "rgba(255,255,255,0.05)"; }}
        >
          <i className="fa-solid fa-bell" style={{ color: unread > 0 ? "#FF6B7A" : "#64748b", fontSize: 11 }} />
          {unread > 0 && (
            <span style={{
              fontSize: 10, fontWeight: 700, fontFamily: "monospace",
              color: "#FF6B7A", lineHeight: 1,
            }}>
              {unread > 99 ? "99+" : unread}
            </span>
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

        {/* Avatar — opens profile menu */}
        <div style={{ position: "relative" }}>
          <button
            onClick={() => setAvatarMenuOpen((v) => !v)}
            title="Account"
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
          <AnimatePresence>
            {avatarMenuOpen && (
              <AvatarMenu
                user={user}
                onClose={() => setAvatarMenuOpen(false)}
                onLogoutRequest={handleLogoutRequest}
              />
            )}
          </AnimatePresence>
        </div>
      </div>
    </div>
    <AnimatePresence>
      {showLogoutConfirm && <LogoutConfirmDialog onConfirm={handleLogoutConfirm} onCancel={handleLogoutCancel} />}
    </AnimatePresence>
    </>
  );
}
