import React, { useState, useMemo, useCallback, useEffect } from "react";
import { motion, AnimatePresence } from "framer-motion";
import { WIDGET_REGISTRY } from "../widgets/widgetRegistry";
import { useWidgetManager } from "../widgets/WidgetManagerContext";
import { useOS } from "../context/OSContext";
import {
  listSnapshots,
  loadSnapshot,
  deleteSnapshot,
} from "../lib/workspaceSnapshot";
import { getApp } from "../lib/apps";
import { toast } from "sonner";

/* ── Helpers ─────────────────────────────────────────────────────────────── */
function timeAgo(ts) {
  if (!ts) return "unknown";
  const d = Math.floor((Date.now() - ts) / 1000);
  if (d < 60)    return "just now";
  if (d < 3600)  return `${Math.floor(d / 60)}m ago`;
  if (d < 86400) return `${Math.floor(d / 3600)}h ago`;
  return new Date(ts).toLocaleDateString("en-US", { month: "short", day: "numeric" });
}

function loadAllSnapshots() {
  const names = listSnapshots();
  return names
    .map(n => ({ name: n, snap: loadSnapshot(n) }))
    .filter(s => s.snap);
}

/* ── Widget card ─────────────────────────────────────────────────────────── */
const WidgetCard = React.memo(function WidgetCard({ def, isActive, onAdd, onRemove }) {
  const [hovered, setHovered] = useState(false);
  return (
    <motion.div
      initial={{ opacity: 0, y: 8 }}
      animate={{ opacity: 1, y: 0 }}
      onHoverStart={() => setHovered(true)}
      onHoverEnd={() => setHovered(false)}
      style={{
        background: isActive
          ? `linear-gradient(135deg, ${def.color}08, transparent)`
          : "rgba(255,255,255,0.025)",
        border: `1px solid ${
          hovered
            ? (isActive ? def.color + "55" : "rgba(255,255,255,0.14)")
            : (isActive ? def.color + "35" : "rgba(255,255,255,0.07)")
        }`,
        borderRadius: 14,
        padding: "14px 16px",
        display: "flex", flexDirection: "column", gap: 12,
        transition: "border-color 0.18s, background 0.18s",
      }}
    >
      {/* Icon + title */}
      <div style={{ display: "flex", alignItems: "center", gap: 10 }}>
        <div style={{
          width: 38, height: 38, borderRadius: 11, flexShrink: 0,
          display: "flex", alignItems: "center", justifyContent: "center",
          background: `${def.color}18`, border: `1px solid ${def.color}30`,
          boxShadow: isActive ? `0 0 12px ${def.color}20` : "none",
          transition: "box-shadow 0.2s",
        }}>
          <i className={`fa-solid ${def.icon}`} style={{ color: def.color, fontSize: 14 }} />
        </div>
        <div style={{ minWidth: 0 }}>
          <div style={{ fontSize: 13, fontWeight: 600, color: "#E2E8F0", letterSpacing: "-0.01em" }}>
            {def.name}
          </div>
          <div style={{
            fontSize: 9.5, fontFamily: "'JetBrains Mono', monospace",
            color: "rgba(255,255,255,0.28)", marginTop: 2,
          }}>
            {def.defaultW}×{def.defaultH} grid · max {def.maxW}×{def.maxH}
          </div>
        </div>
      </div>

      {/* Status + action */}
      <div style={{ display: "flex", alignItems: "center", justifyContent: "space-between" }}>
        <div style={{ display: "flex", alignItems: "center", gap: 5 }}>
          <span style={{
            display: "inline-block", width: 6, height: 6, borderRadius: "50%",
            background: isActive ? "#39FF14" : "rgba(255,255,255,0.2)",
            boxShadow: isActive ? "0 0 6px #39FF14" : "none", flexShrink: 0,
          }} />
          <span style={{
            fontSize: 9.5, fontFamily: "'JetBrains Mono', monospace",
            letterSpacing: "0.06em", textTransform: "uppercase",
            color: isActive ? "#39FF14" : "rgba(255,255,255,0.3)",
          }}>
            {isActive ? "active" : "inactive"}
          </span>
        </div>
        <button
          onClick={() => isActive ? onRemove(def.id) : onAdd(def)}
          style={{
            padding: "4px 14px", borderRadius: 7,
            fontSize: 11, fontFamily: "'JetBrains Mono', monospace", fontWeight: 600,
            background: isActive ? "rgba(255,0,60,0.10)" : `${def.color}18`,
            border: isActive ? "1px solid rgba(255,0,60,0.28)" : `1px solid ${def.color}3a`,
            color: isActive ? "#FF7090" : def.color,
            cursor: "pointer", transition: "all 0.15s", letterSpacing: "0.03em",
          }}
          onMouseEnter={e => { e.currentTarget.style.opacity = "0.75"; }}
          onMouseLeave={e => { e.currentTarget.style.opacity = "1"; }}
        >
          {isActive
            ? <><i className="fa-solid fa-xmark" style={{ fontSize: 9, marginRight: 5 }} />Remove</>
            : <><i className="fa-solid fa-plus"  style={{ fontSize: 9, marginRight: 5 }} />Add</>
          }
        </button>
      </div>
    </motion.div>
  );
});

/* ── Session card ────────────────────────────────────────────────────────── */
const SessionCard = React.memo(function SessionCard({ name, snap, onRestore, onDelete, isAuto }) {
  const wins = snap.windows ?? [];
  const appList = wins.slice(0, 5).map(w => getApp(w.app)).filter(Boolean);
  const extra   = wins.length - appList.length;

  return (
    <div style={{
      background: "rgba(255,255,255,0.025)",
      border: "1px solid rgba(255,255,255,0.07)",
      borderRadius: 14, padding: "14px 16px",
      display: "flex", flexDirection: "column", gap: 10,
    }}>
      {/* Header row */}
      <div style={{ display: "flex", alignItems: "flex-start", justifyContent: "space-between", gap: 10 }}>
        <div style={{ minWidth: 0 }}>
          <div style={{ display: "flex", alignItems: "center", gap: 7 }}>
            <i className="fa-solid fa-floppy-disk" style={{ fontSize: 11, color: "#00F0FF", opacity: 0.65 }} />
            <span style={{
              fontSize: 13, fontWeight: 600, color: "#E2E8F0",
              overflow: "hidden", textOverflow: "ellipsis", whiteSpace: "nowrap", maxWidth: 180,
            }}>
              {isAuto ? "Last Session" : name}
            </span>
            {isAuto && (
              <span style={{
                fontSize: 8, fontFamily: "'JetBrains Mono', monospace",
                background: "rgba(0,240,255,0.12)", border: "1px solid rgba(0,240,255,0.28)",
                color: "#00F0FF", borderRadius: 4, padding: "1px 5px", letterSpacing: "0.05em",
              }}>AUTO</span>
            )}
          </div>
          <div style={{
            fontSize: 10, fontFamily: "'JetBrains Mono', monospace",
            color: "rgba(255,255,255,0.28)", marginTop: 3,
          }}>
            {wins.length} app{wins.length !== 1 ? "s" : ""} · saved {timeAgo(snap.savedAt)}
          </div>
        </div>

        {!isAuto && (
          <button
            onClick={() => onDelete(name)}
            title="Delete snapshot"
            style={{
              width: 24, height: 24, borderRadius: 6, flexShrink: 0,
              display: "flex", alignItems: "center", justifyContent: "center",
              background: "transparent", border: "1px solid transparent",
              color: "rgba(255,255,255,0.22)", cursor: "pointer", fontSize: 10,
              transition: "all 0.15s",
            }}
            onMouseEnter={e => { e.currentTarget.style.background = "rgba(255,0,60,0.12)"; e.currentTarget.style.color = "#FF7090"; e.currentTarget.style.border = "1px solid rgba(255,0,60,0.25)"; }}
            onMouseLeave={e => { e.currentTarget.style.background = "transparent"; e.currentTarget.style.color = "rgba(255,255,255,0.22)"; e.currentTarget.style.border = "1px solid transparent"; }}
          >
            <i className="fa-solid fa-trash-can" />
          </button>
        )}
      </div>

      {/* App icon strip */}
      {appList.length > 0 && (
        <div style={{ display: "flex", alignItems: "center", gap: 6, flexWrap: "wrap" }}>
          {appList.map((a, i) => (
            <div key={i} title={a.name} style={{
              width: 24, height: 24, borderRadius: 7,
              display: "flex", alignItems: "center", justifyContent: "center",
              background: `${a.color}18`, border: `1px solid ${a.color}28`, flexShrink: 0,
            }}>
              <i className={`fa-solid ${a.icon}`} style={{ fontSize: 9, color: a.color }} />
            </div>
          ))}
          {extra > 0 && (
            <span style={{
              fontSize: 9.5, fontFamily: "'JetBrains Mono', monospace",
              color: "rgba(255,255,255,0.3)",
            }}>+{extra} more</span>
          )}
        </div>
      )}

      {/* Restore button */}
      <button
        onClick={() => onRestore(name, isAuto)}
        style={{
          width: "100%", padding: "7px 0", borderRadius: 9,
          fontSize: 11, fontFamily: "'JetBrains Mono', monospace", fontWeight: 600,
          background: "rgba(0,240,255,0.07)",
          border: "1px solid rgba(0,240,255,0.20)",
          color: "#00F0FF", cursor: "pointer", letterSpacing: "0.04em",
          display: "flex", alignItems: "center", justifyContent: "center", gap: 7,
          transition: "all 0.15s",
        }}
        onMouseEnter={e => { e.currentTarget.style.background = "rgba(0,240,255,0.14)"; e.currentTarget.style.boxShadow = "0 0 14px rgba(0,240,255,0.12)"; }}
        onMouseLeave={e => { e.currentTarget.style.background = "rgba(0,240,255,0.07)"; e.currentTarget.style.boxShadow = "none"; }}
      >
        <i className="fa-solid fa-rotate-left" style={{ fontSize: 10 }} />
        Restore Session
      </button>
    </div>
  );
});

/* ── Main component ───────────────────────────────────────────────────────── */
export default function WidgetManager() {
  const { layout, addWidget, removeWidget, toggleVisible, visible } = useWidgetManager();
  const {
    windows, saveCurrentWorkspace, restoreLastWorkspace, restoreNamedWorkspace, lastWorkspace,
  } = useOS();

  const [tab,       setTab]       = useState("widgets");
  const [search,    setSearch]    = useState("");
  const [filter,    setFilter]    = useState("all");
  const [saveName,  setSaveName]  = useState("");
  const [snapshots, setSnapshots] = useState(loadAllSnapshots);

  const activeIds    = useMemo(() => new Set(layout.map(w => w.id)), [layout]);
  const activeCount  = activeIds.size;
  const inactiveCount = WIDGET_REGISTRY.length - activeCount;
  const autoSnap     = lastWorkspace?.();

  // Load the __auto__ snapshot for the sessions tab
  const autoFullSnap = useMemo(() => loadSnapshot("__auto__"), []);

  const filtered = useMemo(() => {
    const q = search.toLowerCase();
    return WIDGET_REGISTRY.filter(def => {
      if (filter === "active"   && !activeIds.has(def.id)) return false;
      if (filter === "inactive" &&  activeIds.has(def.id)) return false;
      if (q && !def.name.toLowerCase().includes(q)) return false;
      return true;
    });
  }, [search, filter, activeIds]);

  const refreshSnapshots = useCallback(() => setSnapshots(loadAllSnapshots()), []);

  const handleAdd = useCallback((def) => {
    addWidget(def);
    toast.success(`${def.name} added to desktop`, { duration: 2000 });
    if (!visible) toggleVisible();
  }, [addWidget, visible, toggleVisible]);

  const handleRemove = useCallback((id) => {
    const def = WIDGET_REGISTRY.find(w => w.id === id);
    removeWidget(id);
    toast(`${def?.name ?? id} removed`, { duration: 1800 });
  }, [removeWidget]);

  const handleSaveSession = useCallback(() => {
    const name = saveName.trim();
    if (!name)             { toast.error("Enter a name for this session"); return; }
    if (!windows.length)   { toast.error("No windows open to save");      return; }
    saveCurrentWorkspace(name);
    setSaveName("");
    refreshSnapshots();
    toast.success(`Session "${name}" saved`, { duration: 2200 });
  }, [saveName, windows, saveCurrentWorkspace, refreshSnapshots]);

  const handleRestore = useCallback((name, isAuto) => {
    const count = isAuto ? restoreLastWorkspace() : restoreNamedWorkspace(name);
    if (count > 0) {
      toast.success(`Restored ${count} app${count !== 1 ? "s" : ""}`, { duration: 2500 });
    } else {
      toast.error("Nothing to restore in this session");
    }
  }, [restoreLastWorkspace, restoreNamedWorkspace]);

  const handleDeleteSnapshot = useCallback((name) => {
    deleteSnapshot(name);
    refreshSnapshots();
    toast(`Snapshot deleted`, { duration: 1600 });
  }, [refreshSnapshots]);

  return (
    <div className="flex flex-col h-full text-white">

      {/* ── Header ─────────────────────────────────────────────────────── */}
      <div className="p-4 border-b border-white/10 flex-shrink-0">
        <div className="mono-label">// Widget Control</div>
        <h2 className="font-heading text-xl font-bold">Widgets</h2>

        <div style={{ display: "flex", gap: 6, marginTop: 14 }}>
          {[
            { key: "widgets",  label: "Library",  icon: "fa-border-all" },
            { key: "sessions", label: "Sessions", icon: "fa-clock-rotate-left" },
          ].map(t => (
            <button
              key={t.key}
              onClick={() => setTab(t.key)}
              style={{
                display: "flex", alignItems: "center", gap: 6,
                padding: "6px 16px", borderRadius: 9,
                fontSize: 11, fontFamily: "'JetBrains Mono', monospace",
                fontWeight: 600, letterSpacing: "0.04em",
                background: tab === t.key ? "rgba(0,240,255,0.10)" : "transparent",
                border: tab === t.key ? "1px solid rgba(0,240,255,0.30)" : "1px solid rgba(255,255,255,0.07)",
                color: tab === t.key ? "#00F0FF" : "rgba(255,255,255,0.4)",
                cursor: "pointer", transition: "all 0.15s",
              }}
            >
              <i className={`fa-solid ${t.icon}`} style={{ fontSize: 10 }} />
              {t.label}
            </button>
          ))}
        </div>
      </div>

      {/* ── Tab: Library ────────────────────────────────────────────────── */}
      <AnimatePresence mode="wait">
        {tab === "widgets" && (
          <motion.div
            key="widgets"
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            exit={{ opacity: 0 }}
            transition={{ duration: 0.14 }}
            style={{ display: "flex", flexDirection: "column", flex: 1, overflow: "hidden" }}
          >
            {/* Search + filter */}
            <div style={{ padding: "12px 16px 8px", display: "flex", gap: 8, flexShrink: 0 }}>
              <div style={{ flex: 1, position: "relative" }}>
                <i className="fa-solid fa-magnifying-glass" style={{
                  position: "absolute", left: 11, top: "50%", transform: "translateY(-50%)",
                  fontSize: 11, color: "rgba(255,255,255,0.22)", pointerEvents: "none",
                }} />
                <input
                  className="input-cyber"
                  placeholder="Search widgets…"
                  value={search}
                  onChange={e => setSearch(e.target.value)}
                  style={{ paddingLeft: 30 }}
                />
              </div>
              {[
                { key: "all",      label: "All" },
                { key: "active",   label: `Active (${activeCount})` },
                { key: "inactive", label: `Available (${inactiveCount})` },
              ].map(f => (
                <button
                  key={f.key}
                  onClick={() => setFilter(f.key)}
                  style={{
                    padding: "0 12px", borderRadius: 8,
                    fontSize: 10, fontFamily: "'JetBrains Mono', monospace",
                    fontWeight: 600, letterSpacing: "0.06em", textTransform: "uppercase",
                    background: filter === f.key ? "rgba(0,240,255,0.10)" : "transparent",
                    border: filter === f.key ? "1px solid rgba(0,240,255,0.28)" : "1px solid rgba(255,255,255,0.07)",
                    color: filter === f.key ? "#00F0FF" : "rgba(255,255,255,0.35)",
                    cursor: "pointer", whiteSpace: "nowrap", flexShrink: 0,
                  }}
                >
                  {f.label}
                </button>
              ))}
            </div>

            {/* Grid */}
            <div style={{ flex: 1, overflowY: "auto", padding: "8px 16px 16px" }}>
              {filtered.length === 0 ? (
                <div style={{ textAlign: "center", paddingTop: 60, color: "rgba(255,255,255,0.3)" }}>
                  <i className="fa-solid fa-border-none" style={{ fontSize: 36, opacity: 0.22 }} />
                  <div style={{ marginTop: 10, fontSize: 13 }}>No widgets found</div>
                </div>
              ) : (
                <div style={{
                  display: "grid",
                  gridTemplateColumns: "repeat(auto-fill, minmax(200px, 1fr))",
                  gap: 10,
                }}>
                  {filtered.map(def => (
                    <WidgetCard
                      key={def.id}
                      def={def}
                      isActive={activeIds.has(def.id)}
                      onAdd={handleAdd}
                      onRemove={handleRemove}
                    />
                  ))}
                </div>
              )}
            </div>

            {/* Footer */}
            <div style={{
              padding: "10px 16px",
              borderTop: "1px solid rgba(255,255,255,0.06)",
              display: "flex", alignItems: "center", justifyContent: "space-between",
              flexShrink: 0,
            }}>
              <span style={{
                fontSize: 10.5, fontFamily: "'JetBrains Mono', monospace",
                color: "rgba(255,255,255,0.32)",
              }}>
                {activeCount}/{WIDGET_REGISTRY.length} widgets active
              </span>
              <button
                onClick={toggleVisible}
                className="neon-btn primary"
                style={{ fontSize: 11, padding: "5px 14px" }}
              >
                <i className={`fa-solid ${visible ? "fa-eye-slash" : "fa-eye"}`} style={{ fontSize: 10 }} />
                {visible ? "Hide All" : "Show All"}
              </button>
            </div>
          </motion.div>
        )}

        {/* ── Tab: Sessions ──────────────────────────────────────────────── */}
        {tab === "sessions" && (
          <motion.div
            key="sessions"
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            exit={{ opacity: 0 }}
            transition={{ duration: 0.14 }}
            style={{ display: "flex", flexDirection: "column", flex: 1, overflow: "hidden" }}
          >
            <div style={{ flex: 1, overflowY: "auto", padding: "16px" }}>

              {/* Save current session */}
              <div style={{
                background: "rgba(0,240,255,0.03)",
                border: "1px solid rgba(0,240,255,0.11)",
                borderRadius: 14, padding: "14px 16px", marginBottom: 18,
              }}>
                <div style={{
                  fontSize: 10, fontFamily: "'JetBrains Mono', monospace",
                  color: "rgba(0,240,255,0.65)", letterSpacing: "0.1em",
                  textTransform: "uppercase", marginBottom: 10,
                }}>
                  // Save Current Session
                </div>
                <div style={{ fontSize: 12, color: "rgba(255,255,255,0.38)", marginBottom: 10, lineHeight: 1.6 }}>
                  {windows.length > 0
                    ? `${windows.length} window${windows.length !== 1 ? "s" : ""} open`
                    : "Open some apps first to save a session"}
                </div>
                <div style={{ display: "flex", gap: 8 }}>
                  <input
                    className="input-cyber"
                    style={{ flex: 1 }}
                    placeholder="Session name…"
                    value={saveName}
                    onChange={e => setSaveName(e.target.value)}
                    onKeyDown={e => e.key === "Enter" && handleSaveSession()}
                  />
                  <button
                    onClick={handleSaveSession}
                    disabled={!saveName.trim() || windows.length === 0}
                    className="neon-btn primary"
                    style={{ fontSize: 11, padding: "6px 16px", flexShrink: 0 }}
                  >
                    <i className="fa-solid fa-floppy-disk" style={{ fontSize: 10 }} />
                    Save
                  </button>
                </div>
              </div>

              {/* Last auto-saved session */}
              {autoSnap?.hasSnapshot && autoFullSnap && (
                <div style={{ marginBottom: 18 }}>
                  <div style={{
                    fontSize: 10, fontFamily: "'JetBrains Mono', monospace",
                    color: "rgba(255,255,255,0.28)", letterSpacing: "0.1em",
                    textTransform: "uppercase", marginBottom: 8,
                  }}>Last Auto-Save</div>
                  <SessionCard
                    name="__auto__"
                    snap={autoFullSnap}
                    isAuto
                    onRestore={handleRestore}
                    onDelete={() => {}}
                  />
                </div>
              )}

              {/* Named snapshots */}
              {snapshots.length > 0 && (
                <div>
                  <div style={{
                    fontSize: 10, fontFamily: "'JetBrains Mono', monospace",
                    color: "rgba(255,255,255,0.28)", letterSpacing: "0.1em",
                    textTransform: "uppercase", marginBottom: 8,
                  }}>Saved Sessions</div>
                  <div style={{ display: "flex", flexDirection: "column", gap: 10 }}>
                    {snapshots.map(({ name, snap }) => (
                      <SessionCard
                        key={name}
                        name={name}
                        snap={snap}
                        isAuto={false}
                        onRestore={handleRestore}
                        onDelete={handleDeleteSnapshot}
                      />
                    ))}
                  </div>
                </div>
              )}

              {/* Empty state */}
              {!autoSnap?.hasSnapshot && snapshots.length === 0 && (
                <div style={{ textAlign: "center", paddingTop: 40, color: "rgba(255,255,255,0.3)" }}>
                  <i className="fa-solid fa-clock-rotate-left" style={{ fontSize: 32, opacity: 0.22 }} />
                  <div style={{ marginTop: 12, fontSize: 13 }}>No saved sessions yet</div>
                  <div style={{ marginTop: 6, fontSize: 11, fontFamily: "'JetBrains Mono', monospace", color: "rgba(255,255,255,0.2)", lineHeight: 1.6 }}>
                    Open some apps, then save a named session above.
                    <br />Your last auto-save will appear here too.
                  </div>
                </div>
              )}
            </div>

            {/* Footer */}
            <div style={{
              padding: "10px 16px",
              borderTop: "1px solid rgba(255,255,255,0.06)",
              flexShrink: 0,
            }}>
              <div style={{
                fontSize: 10, fontFamily: "'JetBrains Mono', monospace",
                color: "rgba(255,255,255,0.22)", lineHeight: 1.7,
              }}>
                Sessions save open window positions. Widget layout is always auto-saved separately.
              </div>
            </div>
          </motion.div>
        )}
      </AnimatePresence>
    </div>
  );
}
