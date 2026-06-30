import React, { useEffect, useMemo, useState } from "react";
import { AnimatePresence, motion } from "framer-motion";
import { APPS, getApp } from "../lib/apps";
import { useOS } from "../context/OSContext";
import { getTimeline, getRecentUrls } from "../lib/activityTimeline";
import { memGet } from "../lib/memoryEngine";
import { listSnapshots, getAutoSnapshot } from "../lib/workspaceSnapshot";

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
  const {
    windows, activeId, focusWindow, closeWindow, minimize, openApp,
    restoreLastWorkspace, restoreNamedWorkspace, saveCurrentWorkspace,
  } = useOS();
  const visibleWindows = useMemo(() => windows.filter((w) => !w.minimized), [windows]);
  const minimizedWindows = useMemo(() => windows.filter((w) => w.minimized), [windows]);
  const openApps = useMemo(() => new Set(windows.map((w) => w.app)), [windows]);

  // ── Side-rail data (Priority 4 — Mission Control as productivity center) ──
  // `tick` forces refetch from local stores when the overlay opens.
  const [tick, setTick] = useState(0);
  useEffect(() => { if (open) setTick((t) => t + 1); }, [open]);
  /* eslint-disable react-hooks/exhaustive-deps */
  const recentEvents  = useMemo(() => getTimeline(8), [tick]);
  const recentUrlList = useMemo(() => getRecentUrls(5), [tick]);
  const lastApp       = useMemo(() => memGet("lastActiveApp", null), [tick]);
  const lastUrl       = useMemo(() => memGet("lastUrl", null), [tick]);
  const namedSnaps    = useMemo(() => listSnapshots(), [tick]);
  const autoSnap      = useMemo(() => getAutoSnapshot(), [tick]);
  /* eslint-enable react-hooks/exhaustive-deps */
  const [saveName, setSaveName] = useState("");
  const [savedFlash, setSavedFlash] = useState(false);

  const handleRestoreLast = () => {
    const n = restoreLastWorkspace();
    if (n > 0) onClose();
  };

  const handleRestoreNamed = (name) => {
    const n = restoreNamedWorkspace(name);
    if (n > 0) onClose();
  };

  const handleSave = () => {
    if (!saveName.trim()) return;
    if (saveCurrentWorkspace(saveName)) {
      setSavedFlash(true);
      setSaveName("");
      setTick((t) => t + 1);
      setTimeout(() => setSavedFlash(false), 1400);
    }
  };

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

            <div className="min-h-0 flex-1 grid gap-4" style={{ gridTemplateColumns: "minmax(0,1fr) 280px" }}>
              {/* ── LEFT: Active windows grid ────────────────────────────── */}
              <div className="min-h-0 overflow-y-auto pr-1">
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
                  <div className="h-full min-h-[220px] flex flex-col items-center justify-center rounded-xl border border-white/10 bg-white/[0.035] gap-4">
                    <div className="text-center">
                      <i className="fa-solid fa-layer-group text-3xl text-[#00F0FF]/45 mb-3" />
                      <div className="font-heading text-lg text-white">No active windows</div>
                      <p className="text-xs text-slate-500 font-mono mt-1">
                        Restore your last session or launch an app to begin.
                      </p>
                    </div>
                    {autoSnap.hasSnapshot && (
                      <button
                        type="button"
                        onClick={handleRestoreLast}
                        data-testid="mission-restore-last-empty"
                        className="flex items-center gap-2 rounded-lg border border-[#00F0FF]/30 bg-[#00F0FF]/[0.08] hover:bg-[#00F0FF]/[0.14] px-4 py-2 text-xs font-mono text-[#00F0FF] transition"
                      >
                        <i className="fa-solid fa-rotate-left text-[11px]" />
                        Restore last session ({autoSnap.windowCount} windows)
                      </button>
                    )}
                  </div>
                )}
              </div>

              {/* ── RIGHT: Cortex side rail ─────────────────────────────── */}
              <aside className="min-h-0 overflow-y-auto pr-1 flex flex-col gap-4">

                {/* Workspace Restore card */}
                <section className="rounded-xl border border-white/10 bg-white/[0.035] p-3">
                  <div className="flex items-center justify-between mb-2">
                    <span className="mono-label">// Workspace</span>
                    {savedFlash && (
                      <span className="text-[10px] font-mono text-[#39FF14]">Saved</span>
                    )}
                  </div>
                  {autoSnap.hasSnapshot ? (
                    <button
                      type="button"
                      onClick={handleRestoreLast}
                      data-testid="mission-restore-last"
                      className="w-full flex items-center gap-2 rounded-lg border border-[#00F0FF]/25 bg-[#00F0FF]/[0.06] hover:bg-[#00F0FF]/[0.12] px-3 py-2 text-[11px] font-mono text-[#00F0FF] transition"
                    >
                      <i className="fa-solid fa-rotate-left" />
                      Restore last session
                      <span className="ml-auto text-[10px] text-[#00F0FF]/60">{autoSnap.windowCount}w</span>
                    </button>
                  ) : (
                    <div className="text-[11px] font-mono text-slate-500 py-1">No session captured yet.</div>
                  )}

                  {/* Named snapshots */}
                  {namedSnaps.length > 0 && (
                    <div className="mt-2 flex flex-col gap-1">
                      {namedSnaps.slice(0, 4).map((name) => (
                        <button
                          key={name}
                          onClick={() => handleRestoreNamed(name)}
                          data-testid={`mission-restore-named-${name}`}
                          className="flex items-center gap-2 rounded-lg border border-white/10 bg-white/[0.03] hover:bg-white/[0.08] px-2.5 py-1.5 text-[11px] font-mono text-slate-300 transition"
                        >
                          <i className="fa-solid fa-bookmark text-[#FCEE09] text-[10px]" />
                          <span className="truncate flex-1 text-left">{name}</span>
                        </button>
                      ))}
                    </div>
                  )}

                  {/* Save current */}
                  {visibleWindows.length > 0 && (
                    <div className="mt-2 flex items-center gap-1.5">
                      <input
                        value={saveName}
                        onChange={(e) => setSaveName(e.target.value)}
                        onKeyDown={(e) => { if (e.key === "Enter") handleSave(); }}
                        placeholder="Name this layout"
                        data-testid="mission-save-name"
                        className="flex-1 bg-white/[0.05] border border-white/10 rounded-md px-2 py-1 text-[11px] font-mono text-white outline-none focus:border-[#00F0FF]/40"
                      />
                      <button
                        type="button"
                        onClick={handleSave}
                        disabled={!saveName.trim()}
                        data-testid="mission-save-btn"
                        className="rounded-md border border-white/10 bg-white/[0.04] hover:bg-white/[0.08] px-2 py-1 text-[11px] font-mono text-slate-300 disabled:opacity-30"
                      >
                        Save
                      </button>
                    </div>
                  )}
                </section>

                {/* Recent activity */}
                <section className="rounded-xl border border-white/10 bg-white/[0.035] p-3">
                  <div className="mono-label mb-2">// Recent Activity</div>
                  {recentEvents.length === 0 ? (
                    <div className="text-[11px] font-mono text-slate-500">No events yet.</div>
                  ) : (
                    <ul className="flex flex-col gap-1">
                      {recentEvents.slice(0, 6).map((e, i) => (
                        <li key={i} className="flex items-center gap-2 text-[11px] font-mono text-slate-300">
                          <i className={`fa-solid ${
                            e.type === "app_open" ? "fa-grip" :
                            e.type === "app_close" ? "fa-xmark" :
                            e.type === "url_visit" ? "fa-globe" :
                            e.type === "voice_command" ? "fa-microphone" :
                            e.type === "workspace_restore" ? "fa-rotate-left" :
                            "fa-circle"
                          } text-[10px] text-[#00F0FF]/60`} />
                          <span className="truncate flex-1">
                            {e.appId ? (getApp(e.appId)?.name ?? e.appId) :
                             e.url ? (() => { try { return new URL(e.url).hostname.replace(/^www\./, ""); } catch { return e.url; } })() :
                             e.text ? `"${e.text.slice(0, 24)}"` :
                             e.type}
                          </span>
                        </li>
                      ))}
                    </ul>
                  )}
                </section>

                {/* Recent URLs */}
                {recentUrlList.length > 0 && (
                  <section className="rounded-xl border border-white/10 bg-white/[0.035] p-3">
                    <div className="mono-label mb-2">// Recent Sites</div>
                    <ul className="flex flex-col gap-1">
                      {recentUrlList.map((u) => {
                        const host = (() => { try { return new URL(u).hostname.replace(/^www\./, ""); } catch { return u; } })();
                        return (
                          <li key={u}>
                            <button
                              type="button"
                              onClick={() => {
                                openApp("browser");
                                window.dispatchEvent(new CustomEvent("cortex:navigate", { detail: { url: u } }));
                                onClose();
                              }}
                              className="w-full text-left flex items-center gap-2 px-2 py-1 rounded-md text-[11px] font-mono text-slate-300 hover:text-[#00F0FF] hover:bg-[#00F0FF]/[0.06] transition"
                            >
                              <i className="fa-solid fa-globe text-[10px] text-[#FCEE09]" />
                              <span className="truncate">{host}</span>
                            </button>
                          </li>
                        );
                      })}
                    </ul>
                  </section>
                )}

                {/* Memory snippet */}
                {(lastApp || lastUrl) && (
                  <section className="rounded-xl border border-white/10 bg-white/[0.035] p-3">
                    <div className="mono-label mb-2">// Memory</div>
                    <div className="space-y-1 text-[11px] font-mono text-slate-400">
                      {lastApp && (
                        <div className="flex items-center gap-2"><i className="fa-solid fa-cube text-[#39FF14]/70" /><span>Last app:</span><span className="text-slate-200">{getApp(lastApp)?.name ?? lastApp}</span></div>
                      )}
                      {lastUrl && (
                        <div className="flex items-center gap-2 truncate"><i className="fa-solid fa-link text-[#CF9EFF]/70" /><span>Last URL:</span><span className="text-slate-200 truncate">{(() => { try { return new URL(lastUrl).hostname.replace(/^www\./, ""); } catch { return lastUrl; } })()}</span></div>
                      )}
                    </div>
                  </section>
                )}

              </aside>
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
