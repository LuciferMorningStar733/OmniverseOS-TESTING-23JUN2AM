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

export default function CommandPalette() {
  const {
    paletteOpen, setPaletteOpen,
    openApp, windows,
    closeWindow, focusWindow, minimize,
    restoreLastWorkspace, restoreNamedWorkspace,
  } = useOS();

  const [q, setQ]                 = useState('');
  const [selected, setSelected]   = useState(0);
  const [notes, setNotes]         = useState([]);
  const [tasks, setTasks]         = useState([]);
  const [memories, setMemories]   = useState([]);
  const [clipboard, setClipboard] = useState([]);
  const [loading, setLoading]     = useState(false);
  const [phIdx, setPhIdx]         = useState(0);
  const inputRef                  = useRef(null);

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
  }, [openApp, closeWindow, focusWindow, minimize, windows, setPaletteOpen, restoreLastWorkspace, restoreNamedWorkspace]);

  const handleKeyDown = useCallback((e) => {
    if (e.key === 'Escape') { setPaletteOpen(false); return; }
    if (e.key === 'ArrowDown') { e.preventDefault(); setSelected(s => Math.min(results.length - 1, s + 1)); }
    else if (e.key === 'ArrowUp') { e.preventDefault(); setSelected(s => Math.max(0, s - 1)); }
    else if (e.key === 'Enter') { e.preventDefault(); activate(results[selected]); }
  }, [results, selected, activate, setPaletteOpen]);

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
          transition={{ type: 'spring', stiffness: 440, damping: 32 }}
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
          <div style={{ display: 'flex', alignItems: 'center', gap: 14, padding: '18px 20px 16px' }}>
            <i
              className="fa-solid fa-wand-magic-sparkles"
              style={{ color: '#00F0FF', fontSize: 15, flexShrink: 0, opacity: 0.85 }}
            />
            <input
              ref={inputRef}
              data-testid="palette-input"
              autoFocus
              value={q}
              onChange={e => { setQ(e.target.value); setSelected(0); }}
              onKeyDown={handleKeyDown}
              placeholder={`Try "${EXAMPLES[phIdx]}"`}
              autoComplete="off"
              autoCorrect="off"
              spellCheck="false"
              style={{
                flex: 1, background: 'none', border: 'none', outline: 'none',
                color: '#fff', fontSize: 17, fontFamily: 'inherit',
                letterSpacing: '-0.01em',
                caretColor: '#00F0FF',
              }}
            />
            {loading && (
              <i className="fa-solid fa-circle-notch fa-spin" style={{ color: 'rgba(0,240,255,0.4)', fontSize: 12, flexShrink: 0 }} />
            )}
            <kbd style={{
              fontSize: 10, color: 'rgba(255,255,255,0.2)', fontFamily: 'inherit',
              border: '1px solid rgba(255,255,255,0.08)', borderRadius: 5, padding: '2px 6px', flexShrink: 0,
            }}>ESC</kbd>
          </div>

          {/* ── Divider ───────────────────────────────────────────────── */}
          <div style={{ height: 1, background: 'rgba(255,255,255,0.05)', margin: '0 1px' }} />

          {/* ── Results ───────────────────────────────────────────────── */}
          <div
            data-testid="palette-results"
            style={{ maxHeight: 400, overflowY: 'auto', padding: '8px 8px' }}
          >
            {results.length === 0 && !q.trim() && (
              /* Empty state — show hint chips */
              <div style={{ padding: '16px 12px 10px' }}>
                <div style={{ fontSize: 10, color: 'rgba(255,255,255,0.2)', fontFamily: "'JetBrains Mono', monospace", marginBottom: 10, letterSpacing: '0.08em' }}>
                  SUGGESTIONS
                </div>
                <div style={{ display: 'flex', flexWrap: 'wrap', gap: 8 }}>
                  {['open music', 'new note', 'open github', 'compare X vs Y', 'remember...', 'add task...'].map(hint => (
                    <button
                      key={hint}
                      onClick={() => { setQ(hint.endsWith('...') ? hint.slice(0, -3) : hint); inputRef.current?.focus(); }}
                      style={{
                        padding: '5px 12px', borderRadius: 20, fontSize: 12,
                        background: 'rgba(255,255,255,0.04)', border: '1px solid rgba(255,255,255,0.07)',
                        color: 'rgba(255,255,255,0.38)', cursor: 'pointer', fontFamily: 'inherit',
                        transition: 'all 0.15s ease',
                      }}
                      onMouseEnter={e => { e.currentTarget.style.background = 'rgba(0,240,255,0.06)'; e.currentTarget.style.color = 'rgba(0,240,255,0.8)'; e.currentTarget.style.borderColor = 'rgba(0,240,255,0.18)'; }}
                      onMouseLeave={e => { e.currentTarget.style.background = 'rgba(255,255,255,0.04)'; e.currentTarget.style.color = 'rgba(255,255,255,0.38)'; e.currentTarget.style.borderColor = 'rgba(255,255,255,0.07)'; }}
                    >
                      {hint}
                    </button>
                  ))}
                </div>
              </div>
            )}

            {results.length === 0 && q.trim() && (
              <div style={{ padding: '24px', textAlign: 'center', color: 'rgba(255,255,255,0.3)', fontSize: 13 }}>
                No matches — press <kbd style={{ border: '1px solid rgba(255,255,255,0.12)', borderRadius: 4, padding: '1px 5px', fontSize: 11 }}>↵</kbd> to ask Cortex
              </div>
            )}

            {results.map((row, idx) => {
              const isSel  = idx === selected;
              const color  = row.color  || SOURCE_COLORS[row.source]  || '#94A3B8';
              const icon   = row.icon   || SOURCE_ICONS[row.source]   || 'fa-circle';
              const label  = SOURCE_LABELS[row.source] || row.source;
              const isCortex = row.source === 'cortex';

              return (
                <button
                  key={`${row.source}-${row.id}-${idx}`}
                  data-testid={`palette-result-${row.source}-${idx}`}
                  aria-selected={isSel}
                  onMouseEnter={() => setSelected(idx)}
                  onClick={() => activate(row)}
                  style={{
                    width: '100%', textAlign: 'left',
                    display: 'flex', alignItems: 'center', gap: 12,
                    padding: '10px 12px', borderRadius: 12,
                    background: isSel
                      ? (isCortex ? 'rgba(207,158,255,0.09)' : 'rgba(0,240,255,0.07)')
                      : 'transparent',
                    border: isSel
                      ? `1px solid ${isCortex ? 'rgba(207,158,255,0.18)' : 'rgba(0,240,255,0.14)'}`
                      : '1px solid transparent',
                    cursor: 'pointer', transition: 'all 0.08s ease',
                    marginBottom: 2,
                  }}
                >
                  {/* Icon bubble */}
                  <div style={{
                    width: 32, height: 32, borderRadius: 9, flexShrink: 0,
                    display: 'flex', alignItems: 'center', justifyContent: 'center',
                    background: `${color}18`,
                    border: `1px solid ${color}28`,
                  }}>
                    <i className={`fa-solid ${icon}`} style={{ fontSize: 12, color }} />
                  </div>

                  {/* Text */}
                  <div style={{ flex: 1, minWidth: 0 }}>
                    <div style={{
                      fontSize: 14, fontWeight: isCortex ? 500 : 400,
                      color: isSel ? '#fff' : 'rgba(255,255,255,0.75)',
                      letterSpacing: '-0.01em',
                      overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap',
                    }}>
                      {isCortex ? (
                        <>
                          <span style={{ color: 'rgba(207,158,255,0.6)', fontSize: 12, fontFamily: "'JetBrains Mono', monospace", marginRight: 6 }}>ask</span>
                          {row.title}
                        </>
                      ) : row.title}
                    </div>
                    {row.subtitle && (
                      <div style={{
                        fontSize: 11, color: 'rgba(255,255,255,0.22)',
                        fontFamily: "'JetBrains Mono', monospace",
                        overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap',
                        marginTop: 1,
                      }}>
                        {row.subtitle}
                      </div>
                    )}
                  </div>

                  {/* Source badge */}
                  <span style={{
                    fontSize: 9, fontFamily: "'JetBrains Mono', monospace",
                    letterSpacing: '0.07em', textTransform: 'uppercase',
                    color, background: `${color}10`, border: `1px solid ${color}28`,
                    borderRadius: 5, padding: '2px 7px', flexShrink: 0,
                  }}>
                    {label}
                  </span>

                  {/* Enter key hint for selected */}
                  {isSel && (
                    <kbd style={{
                      fontSize: 10, color: 'rgba(255,255,255,0.3)',
                      border: '1px solid rgba(255,255,255,0.1)',
                      borderRadius: 5, padding: '1px 5px', flexShrink: 0,
                      fontFamily: 'inherit',
                    }}>↵</kbd>
                  )}
                </button>
              );
            })}
          </div>

          {/* ── Footer ────────────────────────────────────────────────── */}
          <div style={{
            display: 'flex', alignItems: 'center', justifyContent: 'space-between',
            padding: '8px 20px 12px',
            borderTop: '1px solid rgba(255,255,255,0.04)',
          }}>
            <span style={{ fontSize: 10, color: 'rgba(255,255,255,0.15)', fontFamily: "'JetBrains Mono', monospace", display: 'flex', gap: 10 }}>
              {[['↑↓', 'navigate'], ['↵', 'execute'], ['esc', 'close']].map(([key, label]) => (
                <span key={key}>
                  <kbd style={{ border: '1px solid rgba(255,255,255,0.08)', borderRadius: 4, padding: '1px 5px' }}>{key}</kbd>
                  {' '}{label}
                </span>
              ))}
            </span>
            <span style={{ fontSize: 10, color: 'rgba(207,158,255,0.35)', fontFamily: "'JetBrains Mono', monospace" }}>
              powered by Cortex
            </span>
          </div>
        </motion.div>
      </motion.div>
    </AnimatePresence>
  );
}
