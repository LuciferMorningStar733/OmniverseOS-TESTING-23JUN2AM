import React, { useEffect, useState } from "react";
import { useOS } from "../context/OSContext";

export default function TopBar() {
  const { user, logout, setPaletteOpen, setNotifOpen, notifications } = useOS();
  const [time, setTime] = useState(new Date());

  useEffect(() => {
    const t = setInterval(() => setTime(new Date()), 1000);
    return () => clearInterval(t);
  }, []);

  const unread = notifications.length;

  return (
    <div className="absolute top-0 left-0 right-0 h-12 z-40 glass border-b border-white/10 flex items-center justify-between px-4" data-testid="topbar">
      <div className="flex items-center gap-3">
        <div className="w-7 h-7 rounded-md flex items-center justify-center" style={{ background: "linear-gradient(135deg,#00F0FF,#FF003C)" }}>
          <i className="fa-solid fa-infinity text-black text-xs"></i>
        </div>
        <span className="font-heading font-bold text-sm tracking-tight">OmniverseOS</span>
        <span className="mono-label opacity-60 hidden md:inline ml-2">// {time.toLocaleDateString()}</span>
      </div>

      <div className="flex items-center gap-2">
        <button
          data-testid="open-command-palette"
          onClick={() => setPaletteOpen(true)}
          className="neon-btn !py-1.5 !px-3 flex items-center gap-2 text-xs"
        >
          <i className="fa-solid fa-magnifying-glass"></i>
          <span className="hidden sm:inline">Search</span>
          <kbd className="ml-2 px-1.5 py-0.5 text-[10px] bg-white/10 rounded">⌘K</kbd>
        </button>

        <button
          data-testid="open-notifications"
          onClick={() => setNotifOpen(true)}
          className="relative w-9 h-9 rounded-lg hover:bg-white/10 flex items-center justify-center transition"
        >
          <i className="fa-regular fa-bell text-slate-300"></i>
          {unread > 0 && (
            <span className="absolute top-1.5 right-1.5 w-2 h-2 rounded-full bg-[#FF003C] animate-pulse" />
          )}
        </button>

        <div className="font-mono text-sm tracking-wider text-white px-2">
          {time.toLocaleTimeString([], { hour: "2-digit", minute: "2-digit" })}
        </div>

        <div className="flex items-center gap-2 pl-3 border-l border-white/10">
          <div className="w-8 h-8 rounded-full bg-gradient-to-br from-[#00F0FF] to-[#FF003C] flex items-center justify-center text-black font-bold text-xs">
            {user?.name?.[0]?.toUpperCase() || "U"}
          </div>
          <button data-testid="logout-btn" onClick={logout} className="text-xs text-slate-400 hover:text-[#FF003C] transition" title="Logout">
            <i className="fa-solid fa-right-from-bracket"></i>
          </button>
        </div>
      </div>
    </div>
  );
}
