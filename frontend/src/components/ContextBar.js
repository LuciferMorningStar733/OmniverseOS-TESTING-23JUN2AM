import React, {
  useState, useEffect, useRef, useCallback, useMemo,
} from "react";
import { motion, AnimatePresence } from "framer-motion";
import { useOS } from "../context/OSContext";
import { getApp, APPS } from "../lib/apps";

const LS_KEY      = "omni_ctxbar_v1";
const MAX_HISTORY = 10;

// ── Sensitive content heuristics ─────────────────────────────────────────────
const SENSITIVE_RE = [
  /password/i,
  /passwd/i,
  /\bsecret\b/i,
  /\bapi[_\-]?key\b/i,
  /_?token_?/i,
  /private[_\-]?key/i,
  /bearer\s+[a-z0-9\-._~+/]{8,}/i,
  /eyJ[a-zA-Z0-9\-_]{10,}\.eyJ[a-zA-Z0-9\-_]{5,}/,
  /\b\d{4}[- ]?\d{4}[- ]?\d{4}[- ]?\d{4}\b/,
  /\b\d{3}-\d{2}-\d{4}\b/,
];
const isSensitive = (t) => SENSITIVE_RE.some((re) => re.test(t));

// ── Clipboard content-type detection ─────────────────────────────────────────
function detectType(text) {
  if (!text?.trim()) return "empty";
  const t = text.trim();

  if (/^https?:\/\/\S+/.test(t)) return "url";
  if (/^[\w.+\-]+@[\w\-]+\.[a-z]{2,}$/i.test(t)) return "email";
  if (/^[+]?[(]?[\d\s\-().]{7,16}[)]?$/.test(t) && t.replace(/\D/g, "").length >= 7) return "phone";

  try {
    if ((t.startsWith("{") || t.startsWith("[")) && JSON.parse(t)) return "json";
  } catch { /* not json */ }

  if (/\b(function|const|let|var|import|export|class|return|def |public |private |interface )\b/.test(t) || /[{};]/.test(t))
    return "code";

  if (/^#{1,6}\s|(\*\*|__).+(\*\*|__)|\[.+\]\(.+\)|^[-*+]\s|^>\s/m.test(t)) return "markdown";

  return "text";
}

// ── Per-app smart suggestions ─────────────────────────────────────────────────
const APP_HINTS = {
  browser:   ["Ask AI about page|chat",  "New Note|notes",     "Open Tasks|tasks"],
  chat:      ["Open Notes|notes",        "Open Tasks|tasks",   "Open Browser|browser"],
  notes:     ["Ask AI|chat",             "Open Tasks|tasks",   "Open Calendar|calendar"],
  tasks:     ["Ask AI|chat",             "Open Calendar|calendar", "Open Notes|notes"],
  calendar:  ["Open Tasks|tasks",        "Ask AI|chat",        "Open Notes|notes"],
  music:     ["Open AI Chat|chat",       "Open Browser|browser"],
  code:      ["Explain code|chat",       "Open Browser|browser", "Open Notes|notes"],
  files:     ["Ask AI|chat",             "Open Code|code"],
  image:     ["Open AI Chat|chat",       "Open Notes|notes"],
  voice:     ["Open AI Chat|chat",       "Open Notes|notes"],
  finance:   ["Ask AI|chat",             "Open Notes|notes"],
  analytics: ["Ask AI|chat",             "Open Browser|browser"],
  settings:  ["Open AI Chat|chat",       "Open Browser|browser"],
  memory:    ["Open AI Chat|chat",       "Open Notes|notes"],
  nebula:    ["Open AI Chat|chat",        "Open Browser|browser"],
  watchlist: ["Open Browser|browser",    "Open AI Chat|chat"],
  clipboard: ["Open AI Chat|chat",       "Open Notes|notes"],
  dashboard: ["Open AI Chat|chat",       "Open Browser|browser"],
};

const CLIP_HINTS = {
  url:      ["Open in Browser|browser",    "Ask AI about this|chat"],
  code:     ["Open Code Editor|code",      "Explain code|chat"],
  email:    ["Draft reply|chat",           "Open Notes|notes"],
  json:     ["Open Code Editor|code",      "Ask AI about this|chat"],
  markdown: ["Open Notes|notes",           "Ask AI|chat"],
  phone:    ["Open AI Chat|chat",          "Open Notes|notes"],
  text:     ["Summarize|chat",             "Translate|chat"],
};

const QUICK = [
  { label: "AI Chat",   app: "chat",     icon: "fa-comments" },
  { label: "Notes",     app: "notes",    icon: "fa-note-sticky" },
  { label: "Tasks",     app: "tasks",    icon: "fa-list-check" },
  { label: "Browser",   app: "browser",  icon: "fa-globe" },
  { label: "Code",      app: "code",     icon: "fa-code" },
  { label: "Calendar",  app: "calendar", icon: "fa-calendar" },
];

// ── Context summary sentence ──────────────────────────────────────────────────
function buildSummary(activeApp, clip) {
  const appPart = activeApp ? `in ${activeApp.name}` : "on the desktop";
  if (clip.sensitive)           return `You are ${appPart}, with sensitive content in the clipboard.`;
  if (clip.type === "url")      return `You are ${appPart}, with a URL in the clipboard.`;
  if (clip.type === "code")     return `You are ${appPart}, with code in the clipboard.`;
  if (clip.type === "email")    return `You are ${appPart}, with an email address in the clipboard.`;
  if (clip.type === "json")     return `You are ${appPart}, with JSON data in the clipboard.`;
  if (clip.type === "markdown") return `You are ${appPart}, with Markdown content in the clipboard.`;
  if (clip.type === "phone")    return `You are ${appPart}, with a phone number in the clipboard.`;
  if (clip.text)                return `You are ${appPart}, with text in the clipboard.`;
  return `You are ${appPart}, with an empty clipboard.`;
}

// parse "label|appId" tuples
const parse = (arr) =>
  arr.map((s) => { const [label, app] = s.split("|"); return { label, app }; });

// ── Glass surface ──────────────────────────────────────────────────────────────
const GLASS = {
  background:           "rgba(7, 7, 14, 0.86)",
  backdropFilter:       "blur(32px)",
  WebkitBackdropFilter: "blur(32px)",
  border:               "1px solid rgba(0,240,255,0.10)",
  boxShadow:            "0 16px 48px rgba(0,0,0,0.60), inset 0 0 1px rgba(0,240,255,0.06)",
};

// ─────────────────────────────────────────────────────────────────────────────
export default function ContextBar() {
  const { activeId, windows, openApp } = useOS();

  const [collapsed, setCollapsed] = useState(
    () => localStorage.getItem(LS_KEY) !== "false",
  );
  const [clip,     setClip]     = useState({ text: "", type: "empty", sensitive: false });
  const [timeline, setTimeline] = useState([]);
  const [online,   setOnline]   = useState(() => navigator.onLine);
  const [query,    setQuery]    = useState("");

  const lastApp      = useRef(null);
  const searchRef    = useRef(null);
  const copyTimerRef = useRef(null);

  // ── Open / collapse helpers ───────────────────────────────────────────────
  const doOpen = useCallback(() => {
    setCollapsed(false);
    localStorage.setItem(LS_KEY, "false");
  }, []);
  const doCollapse = useCallback(() => {
    setCollapsed(true);
    localStorage.setItem(LS_KEY, "true");
    setQuery("");
  }, []);
  const toggle = useCallback(() => {
    setCollapsed((c) => {
      if (c) { localStorage.setItem(LS_KEY, "false"); return false; }
      localStorage.setItem(LS_KEY, "true");
      setQuery("");
      return true;
    });
  }, []);

  // ── Keyboard shortcuts ────────────────────────────────────────────────────
  useEffect(() => {
    const handler = (e) => {
      // Escape → collapse
      if (e.key === "Escape" && !collapsed) {
        doCollapse();
        return;
      }
      // Ctrl/Cmd + Shift + C → open & focus search
      if ((e.ctrlKey || e.metaKey) && e.shiftKey && e.key.toLowerCase() === "c") {
        e.preventDefault();
        if (collapsed) {
          doOpen();
          setTimeout(() => searchRef.current?.focus(), 150);
        } else {
          searchRef.current?.focus();
        }
      }
    };
    window.addEventListener("keydown", handler);
    return () => window.removeEventListener("keydown", handler);
  }, [collapsed, doOpen, doCollapse]);

  // ── Online / offline ──────────────────────────────────────────────────────
  useEffect(() => {
    const set = () => setOnline(navigator.onLine);
    window.addEventListener("online",  set);
    window.addEventListener("offline", set);
    return () => {
      window.removeEventListener("online",  set);
      window.removeEventListener("offline", set);
    };
  }, []);

  // ── Derive active window + app ────────────────────────────────────────────
  const activeWin = useMemo(
    () => windows.find((w) => w.id === activeId) ?? null,
    [windows, activeId],
  );
  const activeApp = useMemo(
    () => (activeWin ? getApp(activeWin.app) : null),
    [activeWin],
  );

  const winStatus = useMemo(() => {
    if (!activeWin) return null;
    if (activeWin.maximized) return "Maximized";
    if (activeWin.minimized) return "Minimized";
    return "Focused";
  }, [activeWin]);

  // ── Timeline ──────────────────────────────────────────────────────────────
  // Depend on activeWin?.app (a primitive string) not activeWin (an object reference).
  // activeWin is a useMemo that produces a new object on every windows change (e.g. drag),
  // so using [activeWin] would fire this effect on every pixel dragged.
  const activeAppId = activeWin?.app ?? null;

  useEffect(() => {
    if (!activeAppId || activeAppId === lastApp.current) return;
    lastApp.current = activeAppId;
    const app = getApp(activeAppId);
    if (!app) return;
    setTimeline((prev) => {
      const entry = { appId: app.id, name: app.name, icon: app.icon, color: app.color, ts: Date.now() };
      return [entry, ...prev.filter((e) => e.appId !== app.id)].slice(0, MAX_HISTORY);
    });
  }, [activeAppId]);

  // ── Clipboard ─────────────────────────────────────────────────────────────
  const readClip = useCallback(async () => {
    try {
      if (!document.hasFocus()) return;
      const text = await navigator.clipboard.readText();
      if (!text) return;
      const sensitive = isSensitive(text);
      setClip({ text: sensitive ? "" : text, type: sensitive ? "sensitive" : detectType(text), sensitive });
    } catch { /* permission denied — silently skip */ }
  }, []);

  useEffect(() => {
    const onCopy = () => {
      clearTimeout(copyTimerRef.current);
      copyTimerRef.current = setTimeout(readClip, 60);
    };
    const onFocus = () => readClip();
    document.addEventListener("copy",  onCopy);
    window.addEventListener("focus", onFocus);
    readClip();
    return () => {
      document.removeEventListener("copy",  onCopy);
      window.removeEventListener("focus", onFocus);
      clearTimeout(copyTimerRef.current);
    };
  }, [readClip]);

  // ── Smart suggestions (deduplicated) ─────────────────────────────────────
  const suggestions = useMemo(() => {
    const clipHints = (clip.type !== "empty" && clip.type !== "sensitive")
      ? parse(CLIP_HINTS[clip.type] ?? []) : [];
    const appHints  = activeApp ? parse(APP_HINTS[activeApp.id] ?? []) : [];
    const seen = new Set();
    return [...clipHints, ...appHints]
      .filter(({ label }) => { if (seen.has(label)) return false; seen.add(label); return true; })
      .slice(0, 5);
  }, [activeApp, clip.type]);

  // ── Search filtering ──────────────────────────────────────────────────────
  const q = query.toLowerCase().trim();

  const filteredApps = useMemo(() => {
    if (!q) return [];
    return APPS.filter((a) => a.name.toLowerCase().includes(q)).slice(0, 5);
  }, [q]);

  const displaySugs = useMemo(() => {
    if (!q) return suggestions;
    return suggestions.filter((s) => s.label.toLowerCase().includes(q));
  }, [q, suggestions]);

  // ── Context summary ───────────────────────────────────────────────────────
  const summary = useMemo(() => buildSummary(activeApp, clip), [activeApp, clip]);

  const openWindows = useMemo(() => windows.filter((w) => !w.minimized), [windows]);

  return (
    <div
      role="complementary"
      aria-label="AI Context Bar"
      style={{ position: "fixed", bottom: 88, left: 16, zIndex: 45, fontFamily: "Outfit, ui-sans-serif, sans-serif" }}
    >
      <AnimatePresence mode="wait">

        {/* ── Collapsed tab ──────────────────────────────────────────────── */}
        {collapsed && (
          <motion.button
            key="tab"
            initial={{ opacity: 0, scale: 0.82 }}
            animate={{ opacity: 1, scale: 1    }}
            exit={{    opacity: 0, scale: 0.82 }}
            transition={{ duration: 0.15 }}
            onClick={toggle}
            aria-label="Open Context Bar (Ctrl+Shift+C)"
            title="Context Bar · Ctrl+Shift+C"
            style={{
              ...GLASS,
              position: "relative",
              width: 42, height: 42, borderRadius: 13,
              display: "flex", alignItems: "center", justifyContent: "center",
              cursor: "pointer", padding: 0, color: "#00F0FF", fontSize: 15,
            }}
          >
            <i className="fa-solid fa-layer-group" aria-hidden="true" />
            <span
              aria-hidden="true"
              style={{
                position: "absolute", top: 7, right: 7,
                width: 6, height: 6, borderRadius: "50%",
                background: online ? "#39FF14" : "#FF003C",
                boxShadow: `0 0 6px ${online ? "#39FF14" : "#FF003C"}`,
              }}
            />
          </motion.button>
        )}

        {/* ── Expanded panel ─────────────────────────────────────────────── */}
        {!collapsed && (
          <motion.div
            key="panel"
            role="dialog"
            aria-label="AI Context Bar panel"
            initial={{ opacity: 0, y: 20, scale: 0.95 }}
            animate={{ opacity: 1, y: 0,  scale: 1    }}
            exit={{    opacity: 0, y: 14, scale: 0.94  }}
            transition={{ type: "spring", damping: 26, stiffness: 360, mass: 0.38 }}
            style={{ ...GLASS, width: 356, borderRadius: 20, overflow: "hidden" }}
          >

            {/* Header */}
            <Row style={{ padding: "10px 14px 8px", borderBottom: "1px solid rgba(0,240,255,0.07)" }}>
              <div style={{ display: "flex", alignItems: "center", gap: 7 }}>
                <i className="fa-solid fa-layer-group" style={{ color: "#00F0FF", fontSize: 11 }} aria-hidden="true" />
                <span style={{ color: "#00F0FF", fontSize: 10, fontWeight: 700, letterSpacing: "0.13em", textTransform: "uppercase" }}>
                  Context
                </span>
              </div>
              <button
                onClick={doCollapse}
                aria-label="Collapse Context Bar (Esc)"
                title="Collapse (Esc)"
                style={iconBtnStyle}
              >
                <i className="fa-solid fa-chevron-down" aria-hidden="true" />
              </button>
            </Row>

            {/* Search */}
            <div style={{ padding: "8px 14px 0" }}>
              <div style={{
                display: "flex", alignItems: "center", gap: 7,
                background: "rgba(255,255,255,0.05)",
                border: "1px solid rgba(255,255,255,0.08)",
                borderRadius: 10, padding: "5px 9px",
              }}>
                <i className="fa-solid fa-magnifying-glass" style={{ color: "rgba(255,255,255,0.25)", fontSize: 10 }} aria-hidden="true" />
                <input
                  ref={searchRef}
                  value={query}
                  onChange={(e) => setQuery(e.target.value)}
                  placeholder="Search apps or actions…"
                  aria-label="Search apps and actions"
                  style={{
                    background: "none", border: "none", outline: "none",
                    color: "#E2E8F0", fontSize: 11, width: "100%",
                    fontFamily: "inherit", caretColor: "#00F0FF",
                  }}
                />
                {query && (
                  <button
                    onClick={() => setQuery("")}
                    aria-label="Clear search"
                    style={{ background: "none", border: "none", cursor: "pointer", color: "rgba(255,255,255,0.3)", fontSize: 10, padding: 0 }}
                  >
                    <i className="fa-solid fa-xmark" aria-hidden="true" />
                  </button>
                )}
              </div>
            </div>

            {/* Search results — apps */}
            {q && filteredApps.length > 0 && (
              <Sect label="Apps" topPad>
                <div style={{ display: "flex", flexWrap: "wrap", gap: 5 }}>
                  {filteredApps.map((a) => (
                    <Chip
                      key={a.id}
                      label={a.name}
                      icon={a.icon}
                      accent={a.color}
                      onClick={() => { openApp(a.id); setQuery(""); }}
                      aria={`Open ${a.name}`}
                    />
                  ))}
                </div>
              </Sect>
            )}

            {/* Context summary */}
            {!q && (
              <div style={{
                margin: "8px 14px 0",
                padding: "6px 10px",
                background: "rgba(0,240,255,0.04)",
                border: "1px solid rgba(0,240,255,0.07)",
                borderRadius: 10,
                color: "rgba(255,255,255,0.35)",
                fontSize: 9.5, fontStyle: "italic", lineHeight: 1.5,
              }}>
                <i className="fa-solid fa-circle-info" style={{ color: "#00F0FF", marginRight: 5, fontSize: 8 }} aria-hidden="true" />
                {summary}
              </div>
            )}

            {/* Active window */}
            <Sect label="Active window" topPad>
              {activeApp ? (
                <div style={{ display: "flex", alignItems: "center", gap: 10 }}>
                  <AppIcon app={activeApp} size={32} />
                  <div>
                    <div style={{ color: "#E2E8F0", fontSize: 12, fontWeight: 600, lineHeight: 1.3 }}>{activeApp.name}</div>
                    <div style={{ display: "flex", alignItems: "center", gap: 4 }}>
                      <StatusDot active />
                      <span style={{ color: "rgba(255,255,255,0.3)", fontSize: 10 }}>{winStatus}</span>
                    </div>
                  </div>
                </div>
              ) : (
                <Muted>No app focused</Muted>
              )}
            </Sect>

            {/* System status */}
            <Sect label="System">
              <div style={{ display: "flex", gap: 6, flexWrap: "wrap" }}>
                <StatusPill
                  icon="fa-wifi"
                  label={online ? "Online" : "Offline"}
                  active={online}
                  danger={!online}
                />
                <StatusPill
                  icon="fa-clipboard"
                  label={clip.text || clip.sensitive ? (clip.sensitive ? "Sensitive" : clip.type.toUpperCase()) : "Empty"}
                  active={!!(clip.text || clip.sensitive)}
                />
                <StatusPill
                  icon="fa-window-restore"
                  label={`${openWindows.length} window${openWindows.length !== 1 ? "s" : ""}`}
                  active={openWindows.length > 0}
                />
              </div>
            </Sect>

            {/* Clipboard */}
            <Sect label="Clipboard">
              {clip.sensitive ? (
                <div style={{ display: "flex", alignItems: "center", gap: 6 }}>
                  <i className="fa-solid fa-shield-halved" style={{ color: "#FCEE09", fontSize: 10 }} aria-hidden="true" />
                  <Muted>Sensitive content hidden</Muted>
                </div>
              ) : clip.text ? (
                <div style={{
                  background: "rgba(255,255,255,0.04)", borderRadius: 8,
                  padding: "5px 8px", lineHeight: 1.5, wordBreak: "break-all",
                }}>
                  <TypeTag type={clip.type} />
                  <span style={{
                    color: "rgba(255,255,255,0.55)", fontSize: 10, display: "block",
                    fontFamily: (clip.type === "code" || clip.type === "json") ? "monospace" : "inherit",
                  }}>
                    {clip.text.slice(0, 120)}{clip.text.length > 120 ? "…" : ""}
                  </span>
                </div>
              ) : (
                <Muted>Nothing copied yet</Muted>
              )}
            </Sect>

            {/* Suggestions */}
            {displaySugs.length > 0 && (
              <Sect label="Suggestions">
                <ChipRow items={displaySugs} openApp={openApp} accent="#00F0FF" />
              </Sect>
            )}

            {/* Quick launch */}
            {!q && (
              <Sect label="Quick launch">
                <ChipRow items={QUICK} openApp={openApp} accent="#39FF14" />
              </Sect>
            )}

            {/* Timeline */}
            {timeline.length > 0 && !q && (
              <Sect label="Recent apps" noBorder>
                <div style={{ display: "flex", flexWrap: "wrap", gap: 5 }}>
                  <AnimatePresence>
                    {timeline.map((e, i) => (
                      <motion.button
                        key={`${e.appId}-${e.ts}`}
                        initial={{ opacity: 0, scale: 0.7 }}
                        animate={{ opacity: 1, scale: 1   }}
                        exit={{    opacity: 0, scale: 0.7 }}
                        transition={{ delay: i * 0.03 }}
                        onClick={() => openApp(e.appId)}
                        aria-label={`Reopen ${e.name}`}
                        title={e.name}
                        style={{
                          background: `${e.color}12`, border: `1px solid ${e.color}28`,
                          borderRadius: 8, width: 28, height: 28,
                          display: "flex", alignItems: "center", justifyContent: "center",
                          cursor: "pointer", padding: 0, color: e.color, fontSize: 11,
                          transition: "background 0.14s",
                        }}
                      >
                        <i className={`fa-solid ${e.icon}`} aria-hidden="true" />
                      </motion.button>
                    ))}
                  </AnimatePresence>
                </div>
              </Sect>
            )}

          </motion.div>
        )}

      </AnimatePresence>
    </div>
  );
}

// ── Sub-components ────────────────────────────────────────────────────────────

function Sect({ label, children, noBorder = false, topPad = false }) {
  return (
    <div style={{
      padding: topPad ? "6px 14px 8px" : "8px 14px",
      borderBottom: noBorder ? "none" : "1px solid rgba(255,255,255,0.05)",
    }}>
      <div style={{
        color: "rgba(255,255,255,0.2)", fontSize: 9, fontWeight: 700,
        letterSpacing: "0.13em", textTransform: "uppercase", marginBottom: 5,
      }}>
        {label}
      </div>
      {children}
    </div>
  );
}

function Row({ children, style }) {
  return (
    <div style={{ display: "flex", alignItems: "center", justifyContent: "space-between", ...style }}>
      {children}
    </div>
  );
}

function Muted({ children }) {
  return <span style={{ color: "rgba(255,255,255,0.22)", fontSize: 10 }}>{children}</span>;
}

function AppIcon({ app, size = 30 }) {
  return (
    <div
      aria-hidden="true"
      style={{
        width: size, height: size, flexShrink: 0,
        borderRadius: Math.round(size * 0.3),
        background: `${app.color}18`, border: `1px solid ${app.color}30`,
        display: "flex", alignItems: "center", justifyContent: "center",
      }}
    >
      <i className={`fa-solid ${app.icon}`} style={{ color: app.color, fontSize: Math.round(size * 0.42) }} />
    </div>
  );
}

function StatusDot({ active }) {
  return (
    <span
      aria-hidden="true"
      style={{
        width: 5, height: 5, borderRadius: "50%", flexShrink: 0,
        background: active ? "#39FF14" : "rgba(255,255,255,0.2)",
        boxShadow: active ? "0 0 5px #39FF14" : "none",
      }}
    />
  );
}

function StatusPill({ icon, label, active, danger = false }) {
  const accent = danger ? "#FF003C" : "#00F0FF";
  return (
    <div style={{
      display: "flex", alignItems: "center", gap: 5,
      background: active ? `${accent}08` : "rgba(255,255,255,0.03)",
      border: `1px solid ${active ? accent + "18" : "rgba(255,255,255,0.06)"}`,
      borderRadius: 7, padding: "3px 8px",
    }}>
      <i className={`fa-solid ${icon}`} style={{ color: active ? accent : "rgba(255,255,255,0.2)", fontSize: 9 }} aria-hidden="true" />
      <span style={{ color: active ? "rgba(255,255,255,0.5)" : "rgba(255,255,255,0.2)", fontSize: 9, fontWeight: 600 }}>
        {label}
      </span>
    </div>
  );
}

function ChipRow({ items, openApp, accent }) {
  return (
    <div style={{ display: "flex", flexWrap: "wrap", gap: 5 }}>
      {items.map((item) => (
        <Chip
          key={item.label}
          label={item.label}
          icon={item.icon}
          accent={accent}
          onClick={() => openApp(item.app)}
          aria={item.label}
        />
      ))}
    </div>
  );
}

function Chip({ label, icon, onClick, accent, aria }) {
  const [hov, setHov] = useState(false);
  return (
    <button
      onClick={onClick}
      onMouseEnter={() => setHov(true)}
      onMouseLeave={() => setHov(false)}
      aria-label={aria || label}
      style={{
        background:   hov ? `${accent}16` : "rgba(255,255,255,0.05)",
        border:       `1px solid ${hov ? accent + "48" : "rgba(255,255,255,0.07)"}`,
        borderRadius: 8, padding: "3px 9px",
        color:        hov ? accent : "rgba(255,255,255,0.52)",
        fontSize: 10, fontWeight: 600, cursor: "pointer",
        display: "flex", alignItems: "center", gap: 5,
        transition: "all 0.14s", fontFamily: "inherit", whiteSpace: "nowrap",
      }}
    >
      {icon && <i className={`fa-solid ${icon}`} style={{ fontSize: 9 }} aria-hidden="true" />}
      {label}
    </button>
  );
}

const TYPE_META = {
  url:      { label: "URL",      color: "#00F0FF" },
  code:     { label: "Code",     color: "#39FF14" },
  email:    { label: "Email",    color: "#FCEE09" },
  json:     { label: "JSON",     color: "#FF8C00" },
  markdown: { label: "Markdown", color: "#BD93F9" },
  phone:    { label: "Phone",    color: "#FF79C6" },
  text:     { label: "Text",     color: "rgba(255,255,255,0.28)" },
};

function TypeTag({ type }) {
  const meta = TYPE_META[type];
  if (!meta) return null;
  return (
    <span style={{
      display: "inline-block", fontSize: 8, fontWeight: 700,
      color: meta.color, letterSpacing: "0.1em", textTransform: "uppercase",
      marginRight: 5, marginBottom: 3,
    }}>
      [{meta.label}]
    </span>
  );
}

const iconBtnStyle = {
  background: "none", border: "none", cursor: "pointer",
  color: "rgba(255,255,255,0.28)", fontSize: 11, padding: 3, lineHeight: 1,
};
