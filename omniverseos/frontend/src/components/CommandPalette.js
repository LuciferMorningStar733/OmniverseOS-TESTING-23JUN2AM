import React, { useState, useMemo, useEffect, useRef, useCallback } from "react";
import { AnimatePresence, motion } from "framer-motion";
import { useOS } from "../context/OSContext";
import { APPS, getApp } from "../lib/apps";
import { crud } from "../lib/api";
import { getRecentUrls, getTimeline } from "../lib/activityTimeline";
import { listSnapshots, getAutoSnapshot } from "../lib/workspaceSnapshot";
import { memGet } from "../lib/memoryEngine";
import { parseActions, executeActions, buildActionSummary } from "../lib/cortexActions";

/**
 * Universal Command Palette — Ctrl+K
 *
 * AI-first command center. Understands natural language through Cortex.
 * Also searches across: Apps · Notes · Tasks · Memory · Timeline ·
 * Browser History · Clipboard · Workspace Snapshots
 *
 * Keyboard: ↑/↓ navigate · Enter activate · Esc close
 */

// ── Cycling placeholder examples ───────────────────────────────────────────
const EXAMPLES = [
  'open music',
  'new note meeting ideas',
  'play lofi on youtube',
  'open github',
  'remember I parked on B2',
  'set reminder tomorrow 5pm',
  'compare CB200X vs NX500',
  'search my notes for docker',
  'add buy groceries to tasks',
  'change wallpaper',
  'open ai chat',
  'summarize what React hooks are',
];

// ── Source metadata ────────────────────────────────────────────────────────
const SOURCE_LABELS = {
  cortex:    'Cortex',
  action:    'Action',
  app:       'App',
  note:      'Note',
  task:      'Task',
  memory:    'Memory',
  timeline:  'Recent',
  url:       'Browser',
  clipboard: 'Clipboard',
  snapshot:  'Workspace',
};

const SOURCE_COLORS = {
  cortex:    '#CF9EFF',
  action:    '#CF9EFF',
  app:       '#00F0FF',
  note:      '#FCEE09',
  task:      '#39FF14',
  memory:    '#CF9EFF',
  timeline:  '#FF6314',
  url:       '#94A3B8',
  clipboard: '#FF003C',
  snapshot:  '#00F0FF',
};

const SOURCE_ICONS = {
  cortex:    'fa-wand-magic-sparkles',
  action:    'fa-bolt',
  app:       'fa-grip',
  note:      'fa-note-sticky',
  task:      'fa-list-check',
  memory:    'fa-brain',
  timeline:  'fa-clock-rotate-left',
  url:       'fa-globe',
  clipboard: 'fa-clipboard',
  snapshot:  'fa-bookmark',
};

// ── Icons for cortexAction types ───────────────────────────────────────────
const ACTION_TYPE_ICONS = {
  open_app:      'fa-arrow-up-right-from-square',
  open_url:      'fa-globe',
  close_app:     'fa-xmark',
  minimize_app:  'fa-minus',
  focus_app:     'fa-crosshairs',
  add_task:      'fa-list-check',
  complete_task: 'fa-check',
  delete_task:   'fa-trash',
  add_event:     'fa-calendar-plus',
  delete_event:  'fa-calendar-xmark',
};

const ACTION_TYPE_COLORS = {
  open_app:      '#00F0FF',
  open_url:      '#94A3B8',
  close_app:     '#FF003C',
  minimize_app:  '#FCEE09',
  focus_app:     '#00F0FF',
  add_task:      '#39FF14',
  complete_task: '#39FF14',
  delete_task:   '#FF003C',
  add_event:     '#FCEE09',
  delete_event:  '#FF003C',
};

const QUICK_ACTIONS = [
  { id: 'act-mission', label: 'Open Mission Control', icon: 'fa-clone',       event: 'om:open-mission' },
  { id: 'act-restore', label: 'Restore last session', icon: 'fa-rotate-left', action: 'restore' },
];

function hostnameOf(url) {
  try { return new URL(url).hostname.replace(/^www\./, ''); }
  catch { return url; }
}

function tokens(s) {
  return s.toLowerCase().split(/\s+/).filter(Boolean);
}

function scoreMatch(text, queryTokens) {
  if (!queryTokens.length) return 0.5;
  const t = (text || '').toLowerCase();
  let score = 0;
  for (const q of queryTokens) {
    if (!q) continue;
    if (t === q)              score += 5;
    else if (t.startsWith(q)) score += 3;
    else if (t.includes(q))   score += 1.5;
    else return 0;
  }
  return score;
}

// ── Recent search helpers ─────────────────────────────────────────────────
const RECENT_KEY = 'omni_palette_recent';
const MAX_RECENT = 8;

function getRecentSearches() {
  try { return JSON.parse(localStorage.getItem(RECENT_KEY) || '[]'); }
  catch { return []; }
}

function saveRecentSearch(q) {
  if (!q || q.trim().length < 2) return;
  try {
    const prev = getRecentSearches().filter(r => r.toLowerCase() !== q.toLowerCase());
    localStorage.setItem(RECENT_KEY, JSON.stringify([q, ...prev].slice(0, MAX_RECENT)));
  } catch {}
}

function clearRecentSearches() {
  try { localStorage.removeItem(RECENT_KEY); } catch {}
}

// ── Source grouping order ─────────────────────────────────────────────────
const GROUP_ORDER = ['cortex', 'action', 'app', 'note', 'task', 'memory', 'timeline', 'url', 'clipboard', 'snapshot'];
const GROUP_LABELS = {
  cortex: 'AI',
  action: 'Actions',
  app:    'Apps',
  note:   'Notes',
  task:   'Tasks',
  memory: 'Memory',
  timeline: 'Recent Activity',
  url:    'Browser History',
  clipboard: 'Clipboard',
  snapshot: 'Workspaces',
};

export default function CommandPalette() {
  const {
    paletteOpen, setPaletteOpen,
    openApp, windows,
    closeWindow, focusWindow, minimize,
    restoreLastWorkspace, restoreNamedWorkspace,
  } = useOS();

  const [q, setQ]                     = useState('');
  const [selected, setSelected]       = useState(0);
  const [notes, setNotes]             = useState([]);
  const [tasks, setTasks]             = useState([]);
  const [memories, setMemories]       = useState([]);
  const [clipboard, setClipboard]     = useState([]);
  const [loading, setLoading]         = useState(false);
  const [phIdx, setPhIdx]             = useState(0);
  const [recentSearches, setRecentSearches] = useState([]);
  const inputRef                      = useRef(null);
  const selectedRowRef                = useRef(null);

  // ── Cycle placeholder examples ─────────────────────────────────────────
  useEffect(() => {
    if (!paletteOpen) return;
    const t = setInterval(() => setPhIdx(i => (i + 1) % EXAMPLES.length), 3200);
    return () => clearInterval(t);
  }, [paletteOpen]);

  // ── Hydrate user data when palette opens ──────────────────────────────
  useEffect(() => {
    if (!paletteOpen) { setQ(''); return; }
    setSelected(0);
    setRecentSearches(getRecentSearches());
    let cancelled = false;
    setLoading(true);
    Promise.allSettled([
      crud('notes').list(),
      crud('tasks').list(),
      crud('memories').list(),
      crud('clipboard').list(),
    ]).then((results) => {
      if (cancelled) return;
      setNotes(results[0].status === 'fulfilled' ? results[0].value : []);
      setTasks(results[1].status === 'fulfilled' ? results[1].value : []);
      setMemories(results[2].status === 'fulfilled' ? results[2].value : []);
      setClipboard(results[3].status === 'fulfilled' ? results[3].value : []);
    }).finally(() => { if (!cancelled) setLoading(false); });
    setTimeout(() => inputRef.current?.focus(), 60);
    return () => { cancelled = true; };
  }, [paletteOpen]);

  const recentUrls = useMemo(() => paletteOpen ? getRecentUrls(8)   : [], [paletteOpen]);
  const timeline   = useMemo(() => paletteOpen ? getTimeline(12)    : [], [paletteOpen]);
  const snapshots  = useMemo(() => {
    if (!paletteOpen) return [];
    const named = listSnapshots().map(n => ({ name: n, isAuto: false }));
    const auto  = getAutoSnapshot();
    if (auto.hasSnapshot) named.unshift({ name: '__auto__', label: `Last session (${auto.windowCount}w)`, isAuto: true });
    return named;
  }, [paletteOpen]);

  // ── Build unified result list ─────────────────────────────────────────
  const results = useMemo(() => {
    const qt   = tokens(q.trim());
    const empty = qt.length === 0;
    const rows  = [];
    const qLow  = q.trim().toLowerCase();

    // ── 1. Cortex AI row (always first when there's a query) ─────────────
    if (q.trim()) {
      rows.push({
        source:   'cortex',
        id:       'cortex-query',
        title:    q.trim(),
        subtitle: 'Ask Cortex · natural language · AI-powered',
        score:    1000,
        payload:  { type: 'cortex', text: q.trim() },
      });
    }

    // ── 2. Structured cortex actions parsed from the query ────────────────
    if (q.trim()) {
      const parsed = parseActions(q.trim());
      for (const a of parsed) {
        const appInfo = a.appId ? APPS.find(ap => ap.id === a.appId) : null;
        rows.push({
          source:   'action',
          id:       `action-${a.type}-${a.appId || a.url || a.title || ''}`,
          title:    a.label || a.type.replace(/_/g, ' '),
          subtitle: a.type.replace(/_/g, ' '),
          icon:     appInfo ? appInfo.icon : (ACTION_TYPE_ICONS[a.type] || 'fa-bolt'),
          color:    appInfo ? appInfo.color : (ACTION_TYPE_COLORS[a.type] || '#CF9EFF'),
          score:    900,
          payload:  { type: 'cortex_action', action: a },
        });
      }
    }

    // ── 3. Apps ───────────────────────────────────────────────────────────
    for (const a of APPS) {
      const s = empty ? 0.5 : Math.max(
        scoreMatch(a.name, qt),
        scoreMatch(a.id, qt) * 0.7,
        scoreMatch(a.group, qt) * 0.5,
      );
      if (s > 0) rows.push({ source: 'app', id: a.id, title: a.name, subtitle: a.group, icon: a.icon, color: a.color, score: s + 1, payload: { type: 'open_app', appId: a.id } });
    }

    // ── 4. Notes ─────────────────────────────────────────────────────────
    for (const n of notes) {
      const s = empty ? 0.3 : scoreMatch(`${n.title || ''} ${n.content || ''}`, qt);
      if (s > 0) rows.push({ source: 'note', id: n.id, title: n.title || 'Untitled', subtitle: (n.content || '').slice(0, 60), score: s, payload: { type: 'open_app', appId: 'notes' } });
    }

    // ── 5. Tasks ─────────────────────────────────────────────────────────
    for (const t of tasks) {
      const s = empty ? 0.3 : scoreMatch(`${t.title} ${t.description || ''}`, qt);
      if (s > 0) rows.push({ source: 'task', id: t.id, title: t.title, subtitle: t.status, score: s, payload: { type: 'open_app', appId: 'tasks' } });
    }

    // ── 6. Memories ───────────────────────────────────────────────────────
    for (const m of memories) {
      const s = empty ? 0.2 : scoreMatch(`${m.content || ''} ${m.tag || ''}`, qt);
      if (s > 0) rows.push({ source: 'memory', id: m.id, title: (m.content || '').slice(0, 80), subtitle: m.tag, score: s, payload: { type: 'open_app', appId: 'memory' } });
    }

    // ── 7. Clipboard ─────────────────────────────────────────────────────
    for (const c of clipboard) {
      const s = empty ? 0.2 : scoreMatch(`${c.content || ''} ${c.label || ''}`, qt);
      if (s > 0) rows.push({ source: 'clipboard', id: c.id, title: (c.label || c.content || '').slice(0, 80), subtitle: c.content?.slice(0, 60), score: s, payload: { type: 'open_app', appId: 'clipboard' } });
    }

    // ── 8. Browser history ────────────────────────────────────────────────
    for (const u of recentUrls) {
      const host = hostnameOf(u);
      const s = empty ? 0.4 : Math.max(scoreMatch(host, qt), scoreMatch(u, qt) * 0.6);
      if (s > 0) rows.push({ source: 'url', id: u, title: host, subtitle: u, score: s, payload: { type: 'open_url', url: u } });
    }

    // ── 9. Timeline ───────────────────────────────────────────────────────
    for (const ev of timeline) {
      const label = ev.appId ? (getApp(ev.appId)?.name || ev.appId) : ev.url ? hostnameOf(ev.url) : ev.text || ev.type;
      const s = empty ? 0.15 : scoreMatch(`${label} ${ev.type}`, qt);
      if (s > 0) rows.push({ source: 'timeline', id: `${ev.ts}-${ev.type}`, title: label, subtitle: ev.type.replace(/_/g, ' '), score: s * 0.8, payload: { type: 'timeline', ev } });
    }

    // ── 10. Workspace snapshots ───────────────────────────────────────────
    for (const sn of snapshots) {
      const display = sn.label || sn.name;
      const s = empty ? 0.35 : scoreMatch(`${display} workspace session restore`, qt);
      if (s > 0) rows.push({ source: 'snapshot', id: sn.name, title: display, subtitle: sn.isAuto ? 'auto-saved' : 'snapshot', score: s, payload: { type: 'snapshot', sn } });
    }

    // ── 11. Quick actions ─────────────────────────────────────────────────
    for (const act of QUICK_ACTIONS) {
      const s = empty ? 0.25 : scoreMatch(act.label, qt);
      if (s > 0) rows.push({ source: 'action', id: act.id, title: act.label, subtitle: 'Quick action', icon: act.icon, score: s, payload: { type: 'quick', act } });
    }

    rows.sort((a, b) => b.score - a.score);
    return rows.slice(0, 30);
  }, [q, notes, tasks, memories, clipboard, recentUrls, timeline, snapshots]);

  // Clamp selection when results change
  useEffect(() => {
    if (selected >= results.length) setSelected(0);
  }, [results.length, selected]);

  // ── Execute a result row ───────────────────────────────────────────────
  const activate = useCallback(async (row) => {
    if (!row) return;
    const p = row.payload;

    // Save search before any early return (covers cortex + cortex_action paths)
    if (q.trim().length >= 2) {
      saveRecentSearch(q.trim());
      setRecentSearches(getRecentSearches());
    }

    if (p.type === 'cortex') {
      // Route to AI Chat with the query pre-seeded
      setPaletteOpen(false);
      setQ('');
      openApp('chat');
      setTimeout(() => {
        window.dispatchEvent(new CustomEvent('cortex:prompt', { detail: { text: p.text } }));
      }, 280);
      return;
    }

    if (p.type === 'cortex_action') {
      setPaletteOpen(false);
      setQ('');
      const osCtx = { openApp, closeWindow, focusWindow, minimize, windows };
      try {
        const results = await executeActions([p.action], osCtx);
        const summary = buildActionSummary(results);
        if (summary) {
          window.dispatchEvent(new CustomEvent('cortex:toast', { detail: { text: summary } }));
        }
      } catch {}
      return;
    }

    if (p.type === 'open_app') {
      openApp(p.appId);
    } else if (p.type === 'open_url') {
      openApp('browser');
      window.dispatchEvent(new CustomEvent('cortex:navigate', { detail: { url: p.url } }));
    } else if (p.type === 'timeline') {
      if (p.ev.appId) openApp(p.ev.appId);
      else if (p.ev.url) {
        openApp('browser');
        window.dispatchEvent(new CustomEvent('cortex:navigate', { detail: { url: p.ev.url } }));
      }
    } else if (p.type === 'snapshot') {
      if (p.sn.isAuto) restoreLastWorkspace?.();
      else restoreNamedWorkspace?.(p.sn.name);
    } else if (p.type === 'quick') {
      if (p.act.action === 'restore') restoreLastWorkspace?.();
      else if (p.act.event) window.dispatchEvent(new CustomEvent(p.act.event));
    }

    setPaletteOpen(false);
    setQ('');
  }, [q, openApp, closeWindow, focusWindow, minimize, windows, setPaletteOpen, restoreLastWorkspace, restoreNamedWorkspace]);

  const handleKeyDown = useCallback((e) => {
    if (e.key === 'Escape') { setPaletteOpen(false); return; }
    if (e.key === 'ArrowDown') { e.preventDefault(); setSelected(s => Math.min(results.length - 1, s + 1)); }
    else if (e.key === 'ArrowUp') { e.preventDefault(); setSelected(s => Math.max(0, s - 1)); }
    else if (e.key === 'Enter') { e.preventDefault(); activate(results[selected]); }
  }, [results, selected, activate, setPaletteOpen]);

  // Scroll selected item into view on keyboard navigation
  useEffect(() => {
    selectedRowRef.current?.scrollIntoView({ block: 'nearest', behavior: 'smooth' });
  }, [selected]);

  if (!paletteOpen) return null;

  return (
    <AnimatePresence>
      <motion.div
        initial={{ opacity: 0 }}
        animate={{ opacity: 1 }}
        exit={{ opacity: 0 }}
        transition={{ duration: 0.14 }}
        className="absolute inset-0 flex items-start justify-center"
        style={{ zIndex: 9000, background: 'rgba(0,0,0,0.65)', backdropFilter: 'blur(10px)', WebkitBackdropFilter: 'blur(10px)', paddingTop: '14vh' }}
        onClick={() => { setPaletteOpen(false); setQ(''); }}
        data-testid="command-palette"
      >
        <motion.div
          initial={{ y: -20, opacity: 0, scale: 0.97 }}
          animate={{ y: 0,   opacity: 1, scale: 1    }}
          exit={{    y: -14, opacity: 0, scale: 0.98  }}
          transition={{ type: 'spring', stiffness: 580, damping: 34 }}
          onClick={e => e.stopPropagation()}
          style={{
            width: 'min(680px, 92vw)',
            borderRadius: 20,
            background: 'rgba(6, 8, 18, 0.94)',
            border: '1px solid rgba(0,240,255,0.15)',
            boxShadow: '0 0 0 1px rgba(0,240,255,0.05), 0 32px 80px rgba(0,0,0,0.75), 0 0 60px rgba(0,240,255,0.05)',
            overflow: 'hidden',
            position: 'relative',
          }}
        >
          {/* Top glow line */}
          <div style={{
            position: 'absolute', top: 0, left: '8%', right: '8%', height: 1,
            background: 'linear-gradient(90deg, transparent, rgba(0,240,255,0.5), transparent)',
            pointerEvents: 'none',
          }} />

          {/* ── Input row ─────────────────────────────────────────────── */}
          <div style={{ display: 'flex', alignItems: 'center', gap: 12, padding: '16px 20px 14px' }}>
            {/* Dynamic icon: magnifier when empty, wand when typing */}
            <div style={{
              width: 34, height: 34, borderRadius: 10, flexShrink: 0,
              display: 'flex', alignItems: 'center', justifyContent: 'center',
              background: q.trim() ? 'rgba(207,158,255,0.12)' : 'rgba(0,240,255,0.08)',
              border: `1px solid ${q.trim() ? 'rgba(207,158,255,0.25)' : 'rgba(0,240,255,0.18)'}`,
              transition: 'all 0.2s ease',
            }}>
              <i
                className={`fa-solid ${q.trim() ? 'fa-wand-magic-sparkles' : 'fa-magnifying-glass'}`}
                style={{
                  color: q.trim() ? '#CF9EFF' : '#00F0FF',
                  fontSize: 13, transition: 'color 0.2s ease',
                }}
              />
            </div>
            <input
              ref={inputRef}
              data-testid="palette-input"
              autoFocus
              value={q}
              role="combobox"
              aria-label="Command palette search"
              aria-expanded={results.length > 0}
              aria-autocomplete="list"
              aria-controls="palette-results-list"
              aria-activedescendant={results[selected] ? `palette-result-${results[selected].source}-${selected}` : undefined}
              onChange={e => { setQ(e.target.value); setSelected(0); }}
              onKeyDown={handleKeyDown}
              placeholder={`Try "${EXAMPLES[phIdx]}"`}
              autoComplete="off"
              autoCorrect="off"
              spellCheck="false"
              style={{
                flex: 1, background: 'none', border: 'none', outline: 'none',
                color: '#fff', fontSize: 16.5, fontFamily: 'inherit',
                letterSpacing: '-0.01em', caretColor: q.trim() ? '#CF9EFF' : '#00F0FF',
              }}
            />
            {loading && (
              <i className="fa-solid fa-circle-notch fa-spin" style={{ color: 'rgba(0,240,255,0.38)', fontSize: 12, flexShrink: 0 }} />
            )}
            {q.trim() && (
              <button
                onClick={() => { setQ(''); setSelected(0); inputRef.current?.focus(); }}
                style={{
                  width: 22, height: 22, borderRadius: 6, flexShrink: 0,
                  display: 'flex', alignItems: 'center', justifyContent: 'center',
                  background: 'rgba(255,255,255,0.05)', border: '1px solid rgba(255,255,255,0.08)',
                  color: 'rgba(255,255,255,0.3)', cursor: 'pointer', transition: 'all 0.12s ease',
                }}
                onMouseEnter={e => { e.currentTarget.style.background = 'rgba(255,255,255,0.1)'; e.currentTarget.style.color = 'rgba(255,255,255,0.6)'; }}
                onMouseLeave={e => { e.currentTarget.style.background = 'rgba(255,255,255,0.05)'; e.currentTarget.style.color = 'rgba(255,255,255,0.3)'; }}
                title="Clear"
              >
                <i className="fa-solid fa-xmark" style={{ fontSize: 9 }} />
              </button>
            )}
            <kbd style={{
              fontSize: 10, color: 'rgba(255,255,255,0.18)', fontFamily: 'inherit',
              border: '1px solid rgba(255,255,255,0.07)', borderRadius: 5, padding: '2px 7px', flexShrink: 0,
              background: 'rgba(255,255,255,0.03)',
            }}>ESC</kbd>
          </div>

          {/* ── Divider ───────────────────────────────────────────────── */}
          <div style={{ height: 1, background: 'rgba(255,255,255,0.05)', margin: '0 1px' }} />

          {/* ── Results ───────────────────────────────────────────────── */}
          <div
            data-testid="palette-results"
            id="palette-results-list"
            role="listbox"
            aria-label="Search results"
            style={{ maxHeight: 420, overflowY: 'auto', padding: '6px 8px 8px' }}
          >
            {/* ── Empty state: recent searches + pinned actions ──────── */}
            {results.length === 0 && !q.trim() && (
              <div style={{ padding: '8px 4px' }}>
                {/* Pinned quick actions */}
                <div style={{ marginBottom: 16 }}>
                  <div style={{ fontSize: 9.5, color: 'rgba(255,255,255,0.18)', fontFamily: "'JetBrains Mono', monospace", letterSpacing: '0.1em', textTransform: 'uppercase', marginBottom: 8, paddingLeft: 8 }}>
                    Quick Actions
                  </div>
                  <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 6 }}>
                    {[
                      { label: 'Open Cortex AI', icon: 'fa-wand-magic-sparkles', color: '#CF9EFF', action: () => { openApp('chat'); setPaletteOpen(false); } },
                      { label: 'Mission Control', icon: 'fa-clone', color: '#00F0FF', action: () => { window.dispatchEvent(new CustomEvent('om:open-mission')); setPaletteOpen(false); } },
                      { label: 'New Note', icon: 'fa-note-sticky', color: '#FCEE09', action: () => { openApp('notes'); setPaletteOpen(false); } },
                      { label: 'Restore Session', icon: 'fa-rotate-left', color: '#39FF14', action: () => { restoreLastWorkspace?.(); setPaletteOpen(false); } },
                    ].map((item) => (
                      <button key={item.label} onClick={item.action}
                        style={{
                          display: 'flex', alignItems: 'center', gap: 10,
                          padding: '9px 12px', borderRadius: 10,
                          background: 'rgba(255,255,255,0.03)', border: '1px solid rgba(255,255,255,0.06)',
                          color: 'rgba(255,255,255,0.6)', fontSize: 12.5, cursor: 'pointer',
                          transition: 'all 0.15s ease', fontFamily: 'inherit',
                        }}
                        onMouseEnter={e => { e.currentTarget.style.background = `${item.color}0D`; e.currentTarget.style.borderColor = `${item.color}28`; e.currentTarget.style.color = item.color; }}
                        onMouseLeave={e => { e.currentTarget.style.background = 'rgba(255,255,255,0.03)'; e.currentTarget.style.borderColor = 'rgba(255,255,255,0.06)'; e.currentTarget.style.color = 'rgba(255,255,255,0.6)'; }}
                      >
                        <i className={`fa-solid ${item.icon}`} style={{ fontSize: 11, color: item.color, flexShrink: 0 }} />
                        {item.label}
                      </button>
                    ))}
                  </div>
                </div>

                {/* Recent searches */}
                {recentSearches.length > 0 && (
                  <div>
                    <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', marginBottom: 8, paddingLeft: 8, paddingRight: 4 }}>
                      <span style={{ fontSize: 9.5, color: 'rgba(255,255,255,0.18)', fontFamily: "'JetBrains Mono', monospace", letterSpacing: '0.1em', textTransform: 'uppercase' }}>
                        Recent Searches
                      </span>
                      <button onClick={() => { clearRecentSearches(); setRecentSearches([]); }}
                        style={{ fontSize: 9, color: 'rgba(255,255,255,0.15)', background: 'none', border: 'none', cursor: 'pointer', fontFamily: "'JetBrains Mono', monospace', padding: '0 2px'" }}>
                        clear
                      </button>
                    </div>
                    <div style={{ display: 'flex', flexDirection: 'column', gap: 2 }}>
                      {recentSearches.slice(0, 5).map((rs, i) => (
                        <button key={i} onClick={() => { setQ(rs); setSelected(0); inputRef.current?.focus(); }}
                          style={{
                            display: 'flex', alignItems: 'center', gap: 10,
                            padding: '7px 12px', borderRadius: 8, textAlign: 'left',
                            background: 'transparent', border: '1px solid transparent',
                            color: 'rgba(255,255,255,0.4)', fontSize: 13, cursor: 'pointer',
                            fontFamily: 'inherit', transition: 'all 0.12s ease',
                          }}
                          onMouseEnter={e => { e.currentTarget.style.background = 'rgba(255,255,255,0.04)'; e.currentTarget.style.borderColor = 'rgba(255,255,255,0.07)'; e.currentTarget.style.color = 'rgba(255,255,255,0.75)'; }}
                          onMouseLeave={e => { e.currentTarget.style.background = 'transparent'; e.currentTarget.style.borderColor = 'transparent'; e.currentTarget.style.color = 'rgba(255,255,255,0.4)'; }}
                        >
                          <i className="fa-solid fa-clock-rotate-left" style={{ fontSize: 10, opacity: 0.4, flexShrink: 0 }} />
                          <span style={{ overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap', flex: 1 }}>{rs}</span>
                          <i className="fa-solid fa-arrow-up-left" style={{ fontSize: 8, opacity: 0.25, flexShrink: 0 }} />
                        </button>
                      ))}
                    </div>
                  </div>
                )}

                {/* Hint chips when no recent */}
                {recentSearches.length === 0 && (
                  <div>
                    <div style={{ fontSize: 9.5, color: 'rgba(255,255,255,0.18)', fontFamily: "'JetBrains Mono', monospace", letterSpacing: '0.1em', textTransform: 'uppercase', marginBottom: 8, paddingLeft: 8 }}>
                      Try Asking
                    </div>
                    <div style={{ display: 'flex', flexWrap: 'wrap', gap: 6, paddingLeft: 4 }}>
                      {['open music', 'new note', 'compare X vs Y', 'add task...', 'remember...'].map(hint => (
                        <button key={hint}
                          onClick={() => { setQ(hint.replace(/\.\.\./, '')); inputRef.current?.focus(); }}
                          style={{ padding: '5px 12px', borderRadius: 20, fontSize: 12, background: 'rgba(255,255,255,0.03)', border: '1px solid rgba(255,255,255,0.07)', color: 'rgba(255,255,255,0.32)', cursor: 'pointer', fontFamily: 'inherit', transition: 'all 0.15s ease' }}
                          onMouseEnter={e => { e.currentTarget.style.background = 'rgba(0,240,255,0.07)'; e.currentTarget.style.color = 'rgba(0,240,255,0.8)'; e.currentTarget.style.borderColor = 'rgba(0,240,255,0.2)'; }}
                          onMouseLeave={e => { e.currentTarget.style.background = 'rgba(255,255,255,0.03)'; e.currentTarget.style.color = 'rgba(255,255,255,0.32)'; e.currentTarget.style.borderColor = 'rgba(255,255,255,0.07)'; }}
                        >{hint}</button>
                      ))}
                    </div>
                  </div>
                )}
              </div>
            )}

            {/* ── No results for active query ────────────────────────── */}
            {results.length === 0 && q.trim() && (
              <div style={{ padding: '28px 24px', textAlign: 'center' }}>
                <div style={{ width: 40, height: 40, borderRadius: '50%', background: 'rgba(207,158,255,0.08)', border: '1px solid rgba(207,158,255,0.15)', display: 'flex', alignItems: 'center', justifyContent: 'center', margin: '0 auto 12px' }}>
                  <i className="fa-solid fa-wand-magic-sparkles" style={{ color: '#CF9EFF', fontSize: 14 }} />
                </div>
                <div style={{ color: 'rgba(255,255,255,0.5)', fontSize: 14, marginBottom: 6 }}>No local matches</div>
                <div style={{ color: 'rgba(255,255,255,0.22)', fontSize: 12, fontFamily: "'JetBrains Mono', monospace" }}>
                  Press <kbd style={{ border: '1px solid rgba(255,255,255,0.15)', borderRadius: 4, padding: '1px 6px', fontSize: 11, fontFamily: 'inherit' }}>↵</kbd> to ask Cortex AI
                </div>
              </div>
            )}

            {/* ── Grouped results ────────────────────────────────────── */}
            {results.length > 0 && (() => {
              // Group results by source
              const groups = {};
              results.forEach((row, idx) => {
                const g = row.source;
                if (!groups[g]) groups[g] = [];
                groups[g].push({ row, idx });
              });
              const orderedGroups = GROUP_ORDER.filter(g => groups[g]);

              let globalIdx = 0;
              return orderedGroups.map(groupKey => {
                const groupRows = groups[groupKey];
                const groupLabel = GROUP_LABELS[groupKey] || groupKey;
                const groupColor = SOURCE_COLORS[groupKey] || '#94A3B8';
                const showHeader = results.length > 4 && orderedGroups.length > 1;

                return (
                  <div key={groupKey} style={{ marginBottom: 4 }}>
                    {showHeader && (
                      <div style={{
                        fontSize: 9.5, fontFamily: "'JetBrains Mono', monospace",
                        letterSpacing: '0.1em', textTransform: 'uppercase',
                        color: `${groupColor}60`, marginTop: 10, marginBottom: 4,
                        paddingLeft: 12, paddingRight: 8,
                        display: 'flex', alignItems: 'center', gap: 8,
                      }}>
                        <span>{groupLabel}</span>
                        <div style={{ flex: 1, height: 1, background: `${groupColor}15` }} />
                      </div>
                    )}
                    {groupRows.map(({ row, idx }) => {
                      const isSel = idx === selected;
                      const color = row.color || SOURCE_COLORS[row.source] || '#94A3B8';
                      const icon  = row.icon  || SOURCE_ICONS[row.source]  || 'fa-circle';
                      const label = SOURCE_LABELS[row.source] || row.source;
                      const isCortex = row.source === 'cortex';

                      return (
                        <div
                          key={`${row.source}-${row.id}-${idx}`}
                          ref={isSel ? selectedRowRef : null}
                          id={`palette-result-${row.source}-${idx}`}
                          data-testid={`palette-result-${row.source}-${idx}`}
                          role="option"
                          aria-selected={isSel}
                          tabIndex={isSel ? 0 : -1}
                          onMouseEnter={() => setSelected(idx)}
                          onClick={() => activate(row)}
                          onKeyDown={e => { if (e.key === 'Enter' || e.key === ' ') { e.preventDefault(); activate(row); } }}
                          style={{
                            width: '100%', textAlign: 'left',
                            display: 'flex', alignItems: 'center', gap: 12,
                            padding: isCortex ? '11px 14px' : '9px 12px',
                            borderRadius: isCortex ? 13 : 10,
                            background: isSel
                              ? (isCortex ? 'rgba(207,158,255,0.1)' : 'rgba(255,255,255,0.06)')
                              : 'transparent',
                            border: isSel
                              ? `1px solid ${isCortex ? 'rgba(207,158,255,0.22)' : 'rgba(255,255,255,0.1)'}`
                              : '1px solid transparent',
                            cursor: 'pointer',
                            transition: 'background 0.08s ease, border-color 0.08s ease',
                            marginBottom: 2,
                            boxShadow: isSel && isCortex ? '0 0 20px rgba(207,158,255,0.1)' : 'none',
                          }}
                        >
                          {/* Icon bubble */}
                          <div style={{
                            width: isCortex ? 34 : 30, height: isCortex ? 34 : 30,
                            borderRadius: isCortex ? 10 : 8, flexShrink: 0,
                            display: 'flex', alignItems: 'center', justifyContent: 'center',
                            background: isSel ? `${color}22` : `${color}12`,
                            border: `1px solid ${color}${isSel ? '35' : '20'}`,
                            transition: 'all 0.1s ease',
                          }}>
                            <i className={`fa-solid ${icon}`} style={{ fontSize: isCortex ? 13 : 11, color }} />
                          </div>

                          {/* Text */}
                          <div style={{ flex: 1, minWidth: 0 }}>
                            <div style={{
                              fontSize: isCortex ? 14.5 : 13.5,
                              fontWeight: isCortex ? 500 : 400,
                              color: isSel ? '#fff' : 'rgba(255,255,255,0.72)',
                              letterSpacing: '-0.01em',
                              overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap',
                            }}>
                              {isCortex ? (
                                <>
                                  <span style={{ color: 'rgba(207,158,255,0.55)', fontSize: 11, fontFamily: "'JetBrains Mono', monospace", marginRight: 7 }}>ask cortex</span>
                                  {row.title}
                                </>
                              ) : row.title}
                            </div>
                            {row.subtitle && (
                              <div style={{
                                fontSize: 10.5, color: 'rgba(255,255,255,0.2)',
                                fontFamily: "'JetBrains Mono', monospace",
                                overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap',
                                marginTop: 1.5,
                              }}>
                                {row.subtitle}
                              </div>
                            )}
                          </div>

                          {/* Source badge — only show when ungrouped or for cortex */}
                          {(orderedGroups.length === 1 || isCortex) && (
                            <span style={{
                              fontSize: 9, fontFamily: "'JetBrains Mono', monospace",
                              letterSpacing: '0.07em', textTransform: 'uppercase',
                              color, background: `${color}10`, border: `1px solid ${color}28`,
                              borderRadius: 5, padding: '2px 7px', flexShrink: 0,
                            }}>
                              {label}
                            </span>
                          )}

                          {/* Enter hint for selected */}
                          {isSel && (
                            <kbd style={{
                              fontSize: 10, color: 'rgba(255,255,255,0.28)',
                              border: '1px solid rgba(255,255,255,0.12)',
                              borderRadius: 5, padding: '1px 5px', flexShrink: 0,
                              fontFamily: 'inherit',
                            }}>↵</kbd>
                          )}
                        </div>
                      );
                    })}
                  </div>
                );
              });
            })()}
          </div>

          {/* ── Footer ────────────────────────────────────────────────── */}
          <div style={{
            display: 'flex', alignItems: 'center', justifyContent: 'space-between',
            padding: '8px 20px 11px',
            borderTop: '1px solid rgba(255,255,255,0.04)',
          }}>
            <span style={{ fontSize: 10, color: 'rgba(255,255,255,0.13)', fontFamily: "'JetBrains Mono', monospace", display: 'flex', gap: 12 }}>
              {[['↑↓', 'navigate'], ['↵', 'run'], ['esc', 'close']].map(([key, lbl]) => (
                <span key={key} style={{ display: 'flex', alignItems: 'center', gap: 4 }}>
                  <kbd style={{ border: '1px solid rgba(255,255,255,0.08)', borderRadius: 4, padding: '1px 5px', background: 'rgba(255,255,255,0.04)' }}>{key}</kbd>
                  <span>{lbl}</span>
                </span>
              ))}
            </span>
            <span style={{ fontSize: 10, color: 'rgba(207,158,255,0.3)', fontFamily: "'JetBrains Mono', monospace", display: 'flex', alignItems: 'center', gap: 5 }}>
              <i className="fa-solid fa-wand-magic-sparkles" style={{ fontSize: 8 }} />
              Cortex
            </span>
          </div>
        </motion.div>
      </motion.div>
    </AnimatePresence>
  );
}
