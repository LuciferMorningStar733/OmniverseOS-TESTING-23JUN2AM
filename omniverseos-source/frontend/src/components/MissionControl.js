import React, { useEffect, useMemo } from "react";
import { AnimatePresence, motion } from "framer-motion";
import { APPS, getApp } from "../lib/apps";
import { useOS } from "../context/OSContext";

function WindowCard({ win, index, isActive, onFocus, onClose, onMinimize }) {
  const app = getApp(win.app);
  if (!app) return null;

  return (
    <motion.div
      role="button"
      tabIndex={0}
      initial={{ opacity: 0, y: 18, scale: 0.96 }}
      animate={{ opacity: 1, y: 0, scale: 1 }}
      exit={{ opacity: 0, y: 10, scale: 0.96 }}
      transition={{ delay: index * 0.035, type: "spring", damping: 24, stiffness: 320 }}
      onClick={onFocus}
      onKeyDown={(e) => {
        if (e.key === "Enter" || e.key === " ") {
          e.preventDefault();
          onFocus();
        }
      }}
      className="group relative text-left overflow-hidden rounded-xl"
      style={{
        height: 170,
        background: isActive ? `${app.color}16` : "rgba(255,255,255,0.045)",
        border: isActive ? `1px solid ${app.color}66` : "1px solid rgba(255,255,255,0.09)",
        boxShadow: isActive
          ? `0 0 0 1px ${app.color}22, 0 24px 70px rgba(0,0,0,0.48), 0 0 34px ${app.color}20`
          : "0 18px 44px rgba(0,0,0,0.34)",
      }}
      data-testid={`mission-window-${win.app}`}
    >
      <div
        className="absolute inset-x-0 top-0 h-8 flex items-center justify-between px-3"
        style={{
          background: "rgba(5,5,10,0.78)",
          borderBottom: "1px solid rgba(255,255,255,0.08)",
        }}
      >
        <div className="flex items-center gap-2 min-w-0">
          <i className={`fa-solid ${app.icon} text-xs`} style={{ color: app.color }} />
          <span className="font-mono text-[10px] uppercase tracking-widest text-slate-300 truncate">
            {app.name}
          </span>
        </div>
        <div className="flex items-center gap-1 opacity-0 group-hover:opacity-100 transition-opacity">
          <button
            type="button"
            title="Minimize"
            onClick={(e) => { e.stopPropagation(); onMinimize(); }}
            className="w-6 h-6 rounded-md flex items-center justify-center border border-white/10 bg-white/5 text-yellow-200 hover:bg-yellow-300/15"
          >
            <i className="fa-solid fa-minus text-[9px]" />
          </button>
          <button
            type="button"
            title="Close"
            onClick={(e) => { e.stopPropagation(); onClose(); }}
            className="w-6 h-6 rounded-md flex items-center justify-center border border-white/10 bg-white/5 text-red-300 hover:bg-red-400/15"
          >
            <i className="fa-solid fa-xmark text-[10px]" />
          </button>
        </div>
      </div>

      <div className="absolute left-4 right-4 top-12 bottom-4 rounded-lg overflow-hidden border border-white/10 bg-black/35">
        <div
          className="absolute inset-0 opacity-80"
          style={{
            background:
              `linear-gradient(135deg, ${app.color}22, rgba(255,255,255,0.035) 42%, rgba(0,0,0,0.22)),
               radial-gradient(circle at 74% 30%, ${app.color}33, transparent 34%)`,
          }}
        />
        <div className="absolute inset-0 bg-grid opacity-35" />
        <div className="absolute left-4 bottom-4 right-4">
          <div className="flex items-center gap-2 text-slate-200">
            <span
              className="w-9 h-9 rounded-lg flex items-center justify-center"
              style={{ background: `${app.color}20`, border: `1px solid ${app.color}35` }}
            >
              <i className={`fa-solid ${app.icon}`} style={{ color: app.color }} />
            </span>
            <div className="min-w-0">
              <div className="font-heading text-sm truncate">{app.name}</div>
              <div className="font-mono text-[10px] text-slate-500 uppercase tracking-widest">
                {win.maximized ? "Maximized" : "Window"} / {Math.round(win.w)}x{Math.round(win.h)}
              </div>
            </div>
          </div>
        </div>
      </div>
    </motion.div>
  );
}

function QuickLaunch({ openApps, onLaunch }) {
  const suggestions = useMemo(
    () => APPS.filter((app) => !openApps.has(app.id)).slice(0, 6),
    [openApps],
  );

  if (!suggestions.length) return null;

  return (
    <div className="flex flex-wrap items-center gap-2">
      {suggestions.map((app) => (
        <button
          key={app.id}
          type="button"
          onClick={() => onLaunch(app.id)}
          className="flex items-center gap-2 rounded-lg border border-white/10 bg-white/[0.04] px-3 py-2 text-xs text-slate-300 hover:border-[#00F0FF]/30 hover:bg-[#00F0FF]/[0.06] transition"
        >
          <i className={`fa-solid ${app.icon} text-[11px]`} style={{ color: app.color }} />
          <span className="font-mono">{app.name}</span>
        </button>
      ))}
    </div>
  );
}

export default function MissionControl({ open, onClose }) {
  const { windows, activeId, focusWindow, closeWindow, minimize, openApp } = useOS();
  const visibleWindows = useMemo(() => windows.filter((w) => !w.minimized), [windows]);
  const minimizedWindows = useMemo(() => windows.filter((w) => w.minimized), [windows]);
  const openApps = useMemo(() => new Set(windows.map((w) => w.app)), [windows]);

  useEffect(() => {
    if (!open) return undefined;
    const handler = (e) => {
      if (e.key === "Escape") onClose();
    };
    window.addEventListener("keydown", handler);
    return () => window.removeEventListener("keydown", handler);
  }, [open, onClose]);

  const focusAndClose = (id) => {
    focusWindow(id);
    onClose();
  };

  const launchAndClose = (appId) => {
    openApp(appId);
    onClose();
  };

  return (
    <AnimatePresence>
      {open && (
        <motion.div
          initial={{ opacity: 0 }}
          animate={{ opacity: 1 }}
          exit={{ opacity: 0 }}
          className="absolute inset-0 z-[70] overflow-hidden"
          style={{
            background: "rgba(2,3,7,0.72)",
            backdropFilter: "blur(30px) saturate(150%)",
            WebkitBackdropFilter: "blur(30px) saturate(150%)",
          }}
          onClick={onClose}
          data-testid="mission-control"
        >
          <div className="absolute inset-0 bg-grid opacity-25 pointer-events-none" />
          <motion.div
            initial={{ opacity: 0, y: 18, scale: 0.985 }}
            animate={{ opacity: 1, y: 0, scale: 1 }}
            exit={{ opacity: 0, y: 12, scale: 0.985 }}
            transition={{ type: "spring", damping: 28, stiffness: 320 }}
            onClick={(e) => e.stopPropagation()}
            className="absolute left-6 right-6 top-20 bottom-24 flex flex-col gap-5"
          >
            <header className="flex items-end justify-between gap-4">
              <div>
                <div className="mono-label mb-1">// Mission Control</div>
                <h2 className="font-heading text-2xl font-bold text-white">Workspace Overview</h2>
              </div>
              <div className="flex items-center gap-2">
                <span className="font-mono text-[11px] text-slate-500">
                  {visibleWindows.length} active / {minimizedWindows.length} minimized
                </span>
                <button
                  type="button"
                  onClick={onClose}
                  className="w-9 h-9 rounded-lg border border-white/10 bg-white/[0.04] text-slate-300 hover:text-white hover:bg-white/[0.08] transition"
                  title="Close overview"
                >
                  <i className="fa-solid fa-xmark" />
                </button>
              </div>
            </header>

            <div className="min-h-0 flex-1 overflow-y-auto pr-1">
              {visibleWindows.length > 0 ? (
                <div className="grid gap-4" style={{ gridTemplateColumns: "repeat(auto-fit, minmax(230px, 1fr))" }}>
                  {visibleWindows.map((win, index) => (
                    <WindowCard
                      key={win.id}
                      win={win}
                      index={index}
                      isActive={win.id === activeId}
                      onFocus={() => focusAndClose(win.id)}
                      onClose={() => closeWindow(win.id)}
                      onMinimize={() => minimize(win.id)}
                    />
                  ))}
                </div>
              ) : (
                <div className="h-full min-h-[220px] flex items-center justify-center rounded-xl border border-white/10 bg-white/[0.035]">
                  <div className="text-center">
                    <i className="fa-solid fa-layer-group text-3xl text-[#00F0FF]/45 mb-3" />
                    <div className="font-heading text-lg text-white">No active windows</div>
                  </div>
                </div>
              )}
            </div>

            <footer className="flex items-center justify-between gap-4 border-t border-white/10 pt-4">
              <QuickLaunch openApps={openApps} onLaunch={launchAndClose} />
              <div className="hidden lg:flex items-center gap-2 font-mono text-[10px] text-slate-600 uppercase tracking-widest">
                <span>Ctrl+Tab</span>
                <span>/</span>
                <span>Esc</span>
              </div>
            </footer>
          </motion.div>
        </motion.div>
      )}
    </AnimatePresence>
  );
}
