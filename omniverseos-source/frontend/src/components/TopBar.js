import React, { useEffect, useState } from "react";
import { useOS } from "../context/OSContext";
import { useBreakpoint } from "../hooks/useBreakpoint";
import { useWidgetManager } from "../widgets/WidgetManagerContext";

export default function TopBar({ onOpenMissionControl }) {
  const { user, logout, setPaletteOpen, setNotifOpen, notifications } = useOS();
  const { visible: widgetsVisible, toggleVisible: toggleWidgets } = useWidgetManager();
  const [time, setTime] = useState(new Date());
  const { isMobile, isTablet } = useBreakpoint();

  useEffect(() => {
    const t = setInterval(() => setTime(new Date()), 1000);
    return () => clearInterval(t);
  }, []);

  const unread = notifications.length;

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
          <i className="fa-solid fa-infinity text-black text-xs" />
        </div>

        {/* Search pill - grows to fill space */}
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
          <span className="flex-1 text-left text-sm text-slate-400 font-mono truncate">
            Search or ask AI.
          </span>
          <i className="fa-solid fa-microphone text-slate-500 text-sm flex-shrink-0" />
        </button>

        {/* Notification bell */}
        <button
          data-testid="open-notifications"
          onClick={() => setNotifOpen(true)}
          className="relative flex-shrink-0 flex items-center justify-center rounded-xl"
          style={{
            width: 44,
            height: 44,
            background: "rgba(255,255,255,0.06)",
            border: "1px solid rgba(255,255,255,0.08)",
          }}
          title="Notifications"
        >
          <i className="fa-regular fa-bell text-slate-300 text-base" />
          {unread > 0 && (
            <span
              className="absolute top-1.5 right-1.5 w-2 h-2 rounded-full"
              style={{ background: "#FF003C", boxShadow: "0 0 8px rgba(255,0,60,0.8)" }}
            />
          )}
        </button>

        {/* Avatar */}
        <div
          className="flex-shrink-0 w-9 h-9 rounded-full flex items-center justify-center text-black font-bold text-xs"
          style={{ background: "linear-gradient(135deg,#00F0FF,#FF003C)" }}
          title={user?.name}
        >
          {user?.name?.[0]?.toUpperCase() || "U"}
        </div>
      </div>
    );
  }

  return (
    <div
      className="absolute top-2 left-2 right-2 h-11 z-40 rounded-xl flex items-center"
      style={{
        background: "rgba(8, 10, 16, 0.55)",
        backdropFilter: "blur(28px) saturate(180%)",
        WebkitBackdropFilter: "blur(28px) saturate(180%)",
        border: "1px solid rgba(255,255,255,0.07)",
        boxShadow: "0 10px 30px rgba(0,0,0,0.4), inset 0 1px 0 rgba(255,255,255,0.05)",
        padding: isTablet ? "0 0.5rem" : "0 0.75rem",
      }}
      data-testid="topbar"
    >
      {/* Left cluster */}
      <div className="flex items-center gap-2 flex-1 min-w-0">
        <div
          className="w-7 h-7 rounded-md flex items-center justify-center shrink-0"
          style={{ background: "linear-gradient(135deg,#00F0FF,#FF003C)" }}
        >
          <i className="fa-solid fa-infinity text-black text-xs" />
        </div>
        {!isTablet && (
          <span className="font-heading font-bold text-sm tracking-tight truncate">
            OmniverseOS
          </span>
        )}
        {!isTablet && (
          <span className="mono-label opacity-50 hidden md:inline">
            // {time.toLocaleDateString(undefined, { month: "short", day: "numeric" })}
          </span>
        )}
      </div>

      {/* Center: search */}
      <button
        data-testid="open-command-palette"
        onClick={() => setPaletteOpen(true)}
        className="absolute left-1/2 top-1/2 -translate-x-1/2 -translate-y-1/2 group flex items-center gap-2 px-3 py-1.5 rounded-full transition-all"
        style={{
          width: isTablet ? "min(320px, 36vw)" : "min(420px, 40vw)",
          background: "rgba(255,255,255,0.04)",
          border: "1px solid rgba(255,255,255,0.08)",
        }}
      >
        <i className="fa-solid fa-magnifying-glass text-[#00F0FF] text-xs transition-all group-hover:drop-shadow-[0_0_8px_rgba(0,240,255,0.7)] flex-shrink-0" />
        <span className="text-xs text-slate-400 font-mono group-hover:text-slate-200 transition flex-1 text-left truncate">
          Search apps, files or ask AI.
        </span>
        <kbd className="px-1.5 py-0.5 text-[10px] bg-white/10 rounded font-mono text-slate-300 flex-shrink-0">?K</kbd>
      </button>

      {/* Right cluster */}
      <div className="flex items-center gap-1 flex-1 justify-end min-w-0">
        <button
          onClick={onOpenMissionControl}
          title="Workspace overview"
          className="w-8 h-8 rounded-lg flex items-center justify-center transition"
          style={{
            background: "transparent",
            border: "1px solid transparent",
            color: "rgba(255,255,255,0.4)",
          }}
          onMouseEnter={(e) => {
            e.currentTarget.style.background = "rgba(255,255,255,0.08)";
            e.currentTarget.style.color = "#fff";
          }}
          onMouseLeave={(e) => {
            e.currentTarget.style.background = "transparent";
            e.currentTarget.style.color = "rgba(255,255,255,0.4)";
          }}
        >
          <i className="fa-solid fa-layer-group text-sm" />
        </button>

        {/* Widget toggle */}
        <button
          onClick={toggleWidgets}
          title={widgetsVisible ? "Hide widgets" : "Show widgets"}
          className="w-8 h-8 rounded-lg flex items-center justify-center transition"
          style={{
            background: widgetsVisible ? "rgba(0,240,255,0.12)" : "transparent",
            border: widgetsVisible ? "1px solid rgba(0,240,255,0.25)" : "1px solid transparent",
            color: widgetsVisible ? "#00F0FF" : "rgba(255,255,255,0.4)",
          }}
          onMouseEnter={(e) => { if (!widgetsVisible) { e.currentTarget.style.background = "rgba(255,255,255,0.08)"; e.currentTarget.style.color = "#fff"; } }}
          onMouseLeave={(e) => { if (!widgetsVisible) { e.currentTarget.style.background = "transparent"; e.currentTarget.style.color = "rgba(255,255,255,0.4)"; } }}
        >
          <i className="fa-solid fa-table-cells-large text-sm" />
        </button>

        <button
          data-testid="open-notifications"
          onClick={() => setNotifOpen(true)}
          className="relative w-8 h-8 rounded-lg hover:bg-white/10 flex items-center justify-center transition"
          title="Notifications"
        >
          <i className="fa-regular fa-bell text-slate-300 text-sm" />
          {unread > 0 && (
            <span
              className="absolute top-1 right-1 w-2 h-2 rounded-full"
              style={{ background: "#FF003C", boxShadow: "0 0 8px rgba(255,0,60,0.8)" }}
            />
          )}
        </button>

        <div className="font-mono text-xs tracking-wider text-white px-1 tabular-nums">
          {time.toLocaleTimeString([], { hour: "2-digit", minute: "2-digit" })}
        </div>

        <div className="flex items-center gap-1.5 pl-2 ml-1 border-l border-white/10">
          <div
            className="w-7 h-7 rounded-full flex items-center justify-center text-black font-bold text-xs flex-shrink-0"
            style={{ background: "linear-gradient(135deg,#00F0FF,#FF003C)" }}
            title={user?.name}
          >
            {user?.name?.[0]?.toUpperCase() || "U"}
          </div>
          <button
            data-testid="logout-btn"
            onClick={logout}
            className="text-xs text-slate-500 hover:text-[#FF003C] transition"
            title="Logout"
          >
            <i className="fa-solid fa-right-from-bracket" />
          </button>
        </div>
      </div>
    </div>
  );
}
