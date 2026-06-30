import React, { useState, useMemo, useEffect, useRef } from "react";
import { AnimatePresence, motion } from "framer-motion";
import { useOS } from "../context/OSContext";
import { APPS, getApp } from "../lib/apps";
import { crud } from "../lib/api";
import { getRecentUrls, getTimeline } from "../lib/activityTimeline";
import { listSnapshots, getAutoSnapshot } from "../lib/workspaceSnapshot";
import { memGet } from "../lib/memoryEngine";

/**
 * Universal Search — Priority 3
 *
 * Spotlight / Raycast-quality search across:
 *   Apps · Notes · Tasks · Memory · Timeline · Browser History
 *   Clipboard · Workspace Snapshots · Quick Settings actions
 *
 * Keyboard:
 *   ↑/↓  – navigate · Enter – activate · Esc – close
 *
 * No new dependencies, no UI redesign — keeps the existing glass aesthetic.
 */

const SOURCE_LABELS = {
  app:        "App",
  note:       "Note",
  task:       "Task",
  memory:     "Memory",
  timeline:   "Recent",
  url:        "Browser",
  clipboard:  "Clipboard",
  snapshot:   "Workspace",
  action:     "Action",
};

const SOURCE_COLORS = {
  app:        "#00F0FF",
  note:       "#FCEE09",
  task:       "#39FF14",
  memory:     "#CF9EFF",
  timeline:   "#FF6314",
  url:        "#94A3B8",
  clipboard:  "#FF003C",
  snapshot:   "#00F0FF",
  action:     "#CF9EFF",
};

const SOURCE_ICONS = {
  app:       "fa-grip",
  note:      "fa-note-sticky",
  task:      "fa-list-check",
  memory:    "fa-brain",
  timeline:  "fa-clock-rotate-left",
  url:       "fa-globe",
  clipboard: "fa-clipboard",
  snapshot:  "fa-bookmark",
  action:    "fa-bolt",
};

const QUICK_ACTIONS = [
  { id: "act-mission",  label: "Open Mission Control", icon: "fa-clone",       event: "om:open-mission" },
  { id: "act-restore",  label: "Restore last session", icon: "fa-rotate-left", action: "restore" },
];

function hostnameOf(url) {
  try { return new URL(url).hostname.replace(/^www\./, ""); }
  catch { return url; }
}

function tokens(s) {
  return s.toLowerCase().split(/\s+/).filter(Boolean);
}

function scoreMatch(text, queryTokens) {
  if (!queryTokens.length) return 0.5;
  const t = (text || "").toLowerCase();
  let score = 0;
  for (const q of queryTokens) {
    if (!q) continue;
    if (t === q)                score += 5;
    else if (t.startsWith(q))   score += 3;
    else if (t.includes(q))     score += 1.5;
    else return 0;
  }
  return score;
}

export default function CommandPalette() {
  const { paletteOpen, setPaletteOpen, openApp, restoreLastWorkspace, restoreNamedWorkspace } = useOS();
  const [q, setQ]                 = useState("");
  const [selected, setSelected]   = useState(0);
  const [notes, setNotes]         = useState([]);
  const [tasks, setTasks]         = useState([]);
  const [memories, setMemories]   = useState([]);
  const [clipboard, setClipboard] = useState([]);
  const [loading, setLoading]     = useState(false);
  const inputRef = useRef(null);

  // Hydrate user data when the palette opens (CRUD is fast and cached by SWR-less code here)
  useEffect(() => {
    if (!paletteOpen) return;
    setSelected(0);
    let cancelled = false;
    setLoading(true);
    Promise.allSettled([
      crud("notes").list(),
      crud("tasks").list(),
      crud("memories").list(),
      crud("clipboard").list(),
    ]).then((results) => {
      if (cancelled) return;
      setNotes(results[0].status === "fulfilled" ? results[0].value : []);
      setTasks(results[1].status === "fulfilled" ? results[1].value : []);
      setMemories(results[2].status === "fulfilled" ? results[2].value : []);
      setClipboard(results[3].status === "fulfilled" ? results[3].value : []);
    }).finally(() => { if (!cancelled) setLoading(false); });
    // Refocus the input — needed when reopening
    setTimeout(() => inputRef.current?.focus(), 50);
    return () => { cancelled = true; };
  }, [paletteOpen]);

  const recentUrls = useMemo(() => paletteOpen ? getRecentUrls(8) : [], [paletteOpen]);
  const timeline   = useMemo(() => paletteOpen ? getTimeline(12)  : [], [paletteOpen]);
  const snapshots  = useMemo(() => {
    if (!paletteOpen) return [];
    const named = listSnapshots().map((n) => ({ name: n, isAuto: false }));
    const auto  = getAutoSnapshot();
    if (auto.hasSnapshot) named.unshift({ name: "__auto__", label: `Last session (${auto.windowCount}w)`, isAuto: true });
    return named;
  }, [paletteOpen]);

  // ── Build the unified result set ─────────────────────────────────────────
  const results = useMemo(() => {
    const qt = tokens(q.trim());
    const empty = qt.length === 0;
    const rows = [];

    // Apps
    for (const a of APPS) {
      const s = empty ? 0.5 : Math.max(scoreMatch(a.name, qt), scoreMatch(a.id, qt) * 0.7, scoreMatch(a.group, qt) * 0.5);
      if (s > 0) rows.push({ source: "app", id: a.id, title: a.name, subtitle: a.group, icon: a.icon, color: a.color, score: s + 1, payload: a });
    }
    // Notes
    for (const n of notes) {
      const haystack = `${n.title || ""} ${n.content || ""}`;
      const s = empty ? 0.3 : scoreMatch(haystack, qt);
      if (s > 0) rows.push({ source: "note", id: n.id, title: n.title || "Untitled", subtitle: (n.content || "").slice(0, 60), score: s, payload: n });
    }
    // Tasks
    for (const t of tasks) {
      const s = empty ? 0.3 : scoreMatch(`${t.title} ${t.description || ""}`, qt);
      if (s > 0) rows.push({ source: "task", id: t.id, title: t.title, subtitle: t.status, score: s, payload: t });
    }
    // Memories
    for (const m of memories) {
      const s = empty ? 0.2 : scoreMatch(`${m.content || ""} ${m.tag || ""}`, qt);
      if (s > 0) rows.push({ source: "memory", id: m.id, title: (m.content || "").slice(0, 80), subtitle: m.tag, score: s, payload: m });
    }
    // Clipboard
    for (const c of clipboard) {
      const s = empty ? 0.2 : scoreMatch(`${c.content || ""} ${c.label || ""}`, qt);
      if (s > 0) rows.push({ source: "clipboard", id: c.id, title: (c.label || c.content || "").slice(0, 80), subtitle: c.content?.slice(0, 60), score: s, payload: c });
    }
    // Browser history (recent URLs)
    for (const u of recentUrls) {
      const host = hostnameOf(u);
      const s = empty ? 0.4 : Math.max(scoreMatch(host, qt), scoreMatch(u, qt) * 0.6);
      if (s > 0) rows.push({ source: "url", id: u, title: host, subtitle: u, score: s, payload: { url: u } });
    }
    // Timeline
    for (const ev of timeline) {
      const label =
        ev.appId ? (getApp(ev.appId)?.name || ev.appId) :
        ev.url   ? hostnameOf(ev.url) :
        ev.text  ? ev.text :
        ev.type;
      const s = empty ? 0.15 : scoreMatch(`${label} ${ev.type}`, qt);
      if (s > 0) rows.push({ source: "timeline", id: `${ev.ts}-${ev.type}`, title: label, subtitle: ev.type.replace(/_/g, " "), score: s * 0.8, payload: ev });
    }
    // Workspace snapshots
    for (const sn of snapshots) {
      const display = sn.label || sn.name;
      const s = empty ? 0.35 : scoreMatch(`${display} workspace session restore`, qt);
      if (s > 0) rows.push({ source: "snapshot", id: sn.name, title: display, subtitle: sn.isAuto ? "auto-saved" : "snapshot", score: s, payload: sn });
    }
    // Quick actions
    for (const act of QUICK_ACTIONS) {
      const s = empty ? 0.25 : scoreMatch(act.label, qt);
      if (s > 0) rows.push({ source: "action", id: act.id, title: act.label, subtitle: "Quick action", icon: act.icon, score: s, payload: act });
    }

    rows.sort((a, b) => b.score - a.score);
    return rows.slice(0, 30);
  }, [q, notes, tasks, memories, clipboard, recentUrls, timeline, snapshots]);

  // Clamp selection when results change
  useEffect(() => {
    if (selected >= results.length) setSelected(0);
  }, [results.length, selected]);

  const activate = (row) => {
    if (!row) return;
    switch (row.source) {
      case "app":
        openApp(row.id);
        break;
      case "note":
        openApp("notes");
        break;
      case "task":
        openApp("tasks");
        break;
      case "memory":
        openApp("memory");
        break;
      case "clipboard":
        openApp("clipboard");
        break;
      case "url":
        openApp("browser");
        window.dispatchEvent(new CustomEvent("cortex:navigate", { detail: { url: row.payload.url } }));
        break;
      case "timeline":
        if (row.payload.appId) openApp(row.payload.appId);
        else if (row.payload.url) {
          openApp("browser");
          window.dispatchEvent(new CustomEvent("cortex:navigate", { detail: { url: row.payload.url } }));
        }
        break;
      case "snapshot":
        if (row.payload.isAuto) restoreLastWorkspace?.();
        else restoreNamedWorkspace?.(row.id);
        break;
      case "action":
        if (row.payload.action === "restore") restoreLastWorkspace?.();
        else if (row.payload.event) window.dispatchEvent(new CustomEvent(row.payload.event));
        break;
      default:
        break;
    }
    setPaletteOpen(false);
    setQ("");
  };

  if (!paletteOpen) return null;

  const handleKeyDown = (e) => {
    if (e.key === "Escape") { setPaletteOpen(false); return; }
    if (e.key === "ArrowDown") { e.preventDefault(); setSelected((s) => Math.min(results.length - 1, s + 1)); }
    else if (e.key === "ArrowUp") { e.preventDefault(); setSelected((s) => Math.max(0, s - 1)); }
    else if (e.key === "Enter") { e.preventDefault(); activate(results[selected]); }
  };

  return (
    <AnimatePresence>
      <motion.div
        initial={{ opacity: 0 }} animate={{ opacity: 1 }} exit={{ opacity: 0 }}
        className="absolute inset-0 z-50 bg-black/60 backdrop-blur-sm flex items-start justify-center pt-24"
        onClick={() => setPaletteOpen(false)}
        data-testid="command-palette"
      >
        <motion.div
          initial={{ y: -20, opacity: 0 }}
          animate={{ y: 0, opacity: 1 }}
          exit={{ y: -20, opacity: 0 }}
          onClick={(e) => e.stopPropagation()}
          className="w-full max-w-2xl mx-4 glass rounded-2xl overflow-hidden window-shadow"
        >
          <div className="flex items-center gap-3 px-4 py-3 border-b border-white/10">
            <i className="fa-solid fa-magnifying-glass text-[#00F0FF]"></i>
            <input
              ref={inputRef}
              data-testid="palette-input"
              autoFocus
              value={q}
              onChange={(e) => setQ(e.target.value)}
              onKeyDown={handleKeyDown}
              placeholder="Search apps, notes, tasks, memory, browser, workspace…"
              className="flex-1 bg-transparent outline-none text-base text-white placeholder:text-slate-500"
            />
            {loading && (
              <span className="text-[10px] font-mono text-[#00F0FF]/50 uppercase tracking-widest">Indexing…</span>
            )}
            <kbd className="px-2 py-0.5 text-[10px] bg-white/10 rounded font-mono text-slate-300">↑↓</kbd>
            <kbd className="px-2 py-0.5 text-[10px] bg-white/10 rounded font-mono text-slate-300">ESC</kbd>
          </div>
          <div className="max-h-[420px] overflow-y-auto p-2" data-testid="palette-results">
            {results.length === 0 && (
              <div className="p-6 text-center text-slate-500 text-sm">No matches across apps, notes, tasks, memory, browser or workspace.</div>
            )}
            {results.map((row, idx) => {
              const isSel = idx === selected;
              const color = row.color || SOURCE_COLORS[row.source];
              const icon  = row.icon  || SOURCE_ICONS[row.source];
              const label = SOURCE_LABELS[row.source];
              return (
                <button
                  key={`${row.source}-${row.id}-${idx}`}
                  data-testid={`palette-result-${row.source}-${idx}`}
                  aria-selected={isSel}
                  onMouseEnter={() => setSelected(idx)}
                  onClick={() => activate(row)}
                  className="w-full flex items-center gap-3 px-3 py-2.5 rounded-lg text-left transition"
                  style={{
                    background: isSel ? "rgba(0,240,255,0.08)" : "transparent",
                    boxShadow: isSel ? "inset 0 0 0 1px rgba(0,240,255,0.25)" : "none",
                  }}
                >
                  <div className="w-8 h-8 rounded-md flex items-center justify-center" style={{ background: `${color}22` }}>
                    <i className={`fa-solid ${icon}`} style={{ color }}></i>
                  </div>
                  <div className="flex-1 min-w-0">
                    <div className="text-sm text-white truncate">{row.title}</div>
                    {row.subtitle && (
                      <div className="text-[11px] text-slate-500 font-mono truncate">{row.subtitle}</div>
                    )}
                  </div>
                  <span className="text-[10px] font-mono uppercase tracking-widest px-1.5 py-0.5 rounded" style={{ color, background: `${color}10`, border: `1px solid ${color}33` }}>
                    {label}
                  </span>
                  <i className="fa-solid fa-arrow-right text-slate-600 text-xs"></i>
                </button>
              );
            })}
          </div>
          <div className="flex items-center justify-between px-4 py-2 border-t border-white/10 text-[10px] font-mono uppercase tracking-widest text-slate-500">
            <span>{results.length} {results.length === 1 ? "match" : "matches"}</span>
            <span>Universal Search · Cortex</span>
          </div>
        </motion.div>
      </motion.div>
    </AnimatePresence>
  );
}
