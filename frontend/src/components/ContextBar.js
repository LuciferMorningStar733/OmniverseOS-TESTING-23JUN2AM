import React, {
  useState, useEffect, useRef, useCallback, useMemo,
} from "react";
import { motion, AnimatePresence } from "framer-motion";
import { useOS } from "../context/OSContext";
import { getApp } from "../lib/apps";

const LS_KEY      = "omni_ctxbar_v1";
const MAX_HISTORY = 10;

// ── Sensitive content heuristics ─────────────────────────────────────────────
const SENSITIVE_RE = [
  /password/i, /passwd/i, /\bsecret\b/i,
  /\bapi[_\-]?key\b/i, /\btoken\b/i, /private[_\-]?key/i,
  /\b\d{4}[- ]?\d{4}[- ]?\d{4}[- ]?\d{4}\b/,
  /\b\d{3}-\d{2}-\d{4}\b/,
];
const isSensitive = (t) => SENSITIVE_RE.some((re) => re.test(t));

// ── Clipboard content-type detection ─────────────────────────────────────────
function clipType(text) {
  if (!text?.trim()) return "empty";
  const t = text.trim();
  if (/^https?:\/\/\S+/.test(t)) return "url";
  if (/\b(function|const|let|var|import|export|class|return|=>)\b/.test(t) || /[{};]/.test(t))
    return "code";
  if (/^[\w.+\-]+@[\w\-]+\.[a-z]{2,}$/i.test(t)) return "email";
  return "text";
}

// ── Per-app contextual suggestions ───────────────────────────────────────────
const APP_HINTS = {
  browser:   ["Open AI Chat|chat",   "New Note|notes"],
  chat:      ["Open Notes|notes",    "Open Tasks|tasks"],
  notes:     ["Open AI Chat|chat",   "Open Tasks|tasks"],
  tasks:     ["Open AI Chat|chat",   "Open Calendar|calendar"],
  calendar:  ["Open Tasks|tasks",    "Ask AI|chat"],
  music:     ["Open AI Chat|chat",   "Open Browser|browser"],
  code:      ["Ask AI|chat",         "Open Browser|browser"],
  files:     ["Ask AI|chat",         "Open Code|code"],
  image:     ["Open AI Chat|chat",   "Open Notes|notes"],
  voice:     ["Open AI Chat|chat",   "Open Notes|notes"],
  finance:   ["Ask AI|chat",         "Open Notes|notes"],
  analytics: ["Ask AI|chat",         "Open Notes|notes"],
  settings:  ["Open AI Chat|chat",   "Open Browser|browser"],
  memory:    ["Open AI Chat|chat",   "Open Notes|notes"],
  discord:   ["Open AI Chat|chat",   "Open Browser|browser"],
  watchlist: ["Open AI Chat|chat",   "Open Browser|browser"],
  clipboard: ["Open AI Chat|chat",   "Open Notes|notes"],
  dashboard: ["Open AI Chat|chat",   "Open Browser|browser"],
};

const CLIP_HINTS = {
  url:   ["Open in Browser|browser", "Ask AI about this|chat"],
  code:  ["Open Code Editor|code",   "Explain code|chat"],
  email: ["Draft reply|chat",        "Open Notes|notes"],
  text:  ["Summarize|chat",          "Translate|chat"],
};

const QUICK = [
  { label: "AI Chat",  app: "chat",    icon: "fa-comments" },
  { label: "Notes",    app: "notes",   icon: "fa-note-sticky" },
  { label: "Tasks",    app: "tasks",   icon: "fa-list-check" },
  { label: "Browser",  app: "browser", icon: "fa-globe" },
  { label: "Code",     app: "code",    icon: "fa-code" },
];

// parse "label|appId" tuples
const parse = (arr) => arr.map((s) => { const [label, app] = s.split("|"); return { label, app }; });

// ── Glass style shared ────────────────────────────────────────────────────────
const GLASS = {
  background:           "rgba(7, 7, 14, 0.84)",
  backdropFilter:       "blur(28px)",
  WebkitBackdropFilter: "blur(28px)",
  border:               "1px solid rgba(0,240,255,0.10)",
  boxShadow:            "0 12px 40px rgba(0,0,0,0.55), inset 0 0 1px rgba(0,240,255,0.06)",
};

// ────────────────────────────────────────────────────────────────────────────
export default function ContextBar() {
  const { activeId, windows, openApp } = useOS();

  const [collapsed, setCollapsed] = useState(
    () => localStorage.getItem(LS_KEY) !== "false",
  );
  const [clip,     setClip]     = useState({ text: "", type: "empty", sensitive: false });
  const [timeline, setTimeline] = useState([]);
  const lastApp = useRef(null);

  // ── Persist collapsed ────────────────────────────────────────────────────
  const toggle = useCallback(() => {
    setCollapsed((c) => {
      localStorage.setItem(LS_KEY, String(!c));
      return !c;
    });
  }, []);

  // ── Derive active app ────────────────────────────────────────────────────
  const activeWin = useMemo(
    () => windows.find((w) => w.id === activeId) ?? null,
    [windows, activeId],
  );
  const activeApp = useMemo(
    () => (activeWin ? getApp(activeWin.app) : null),
    [activeWin],
  );

  // ── Timeline ─────────────────────────────────────────────────────────────
  useEffect(() => {
    if (!activeWin || activeWin.app === lastApp.current) return;
    lastApp.current = activeWin.app;
    const app = getApp(activeWin.app);
    if (!app) return;
    setTimeline((prev) => {
      const entry = { appId: app.id, name: app.name, icon: app.icon, color: app.color, ts: Date.now() };
      return [entry, ...prev.filter((e) => e.appId !== app.id)].slice(0, MAX_HISTORY);
    });
  }, [activeWin]);

  // ── Clipboard ─────────────────────────────────────────────────────────────
  const readClip = useCallback(async () => {
    try {
      if (!document.hasFocus()) return;
      const text = await navigator.clipboard.readText();
      if (!text) return;
      const sensitive = isSensitive(text);
      setClip({ text: sensitive ? "" : text, type: sensitive ? "sensitive" : clipType(text), sensitive });
    } catch { /* clipboard permission not granted — ignore */ }
  }, []);

  useEffect(() => {
    const onCopy  = () => setTimeout(readClip, 60);
    const onFocus = () => readClip();
    document.addEventListener("copy",  onCopy);
    window.addEventListener("focus", onFocus);
    readClip();
    return () => {
      document.removeEventListener("copy",  onCopy);
      window.removeEventListener("focus", onFocus);
    };
  }, [readClip]);

  // ── Suggestions ──────────────────────────────────────────────────────────
  const suggestions = useMemo(() => {
    const appHints  = activeApp ? parse(APP_HINTS[activeApp.id] ?? []) : [];
    const clipHints = (clip.type !== "empty" && clip.type !== "sensitive")
      ? parse(CLIP_HINTS[clip.type] ?? []) : [];
    const all  = [...clipHints, ...appHints];
    const seen = new Set();
    return all.filter((s) => { const k = s.label; if (seen.has(k)) return false; seen.add(k); return true; }).slice(0, 4);
  }, [activeApp, clip.type]);

  return (
    <div style={{ position: "fixed", bottom: 88, left: 16, zIndex: 45, fontFamily: "Outfit, ui-sans-serif, sans-serif" }}>
      <AnimatePresence mode="wait">

        {/* ── Collapsed tab ──────────────────────────────────────────────── */}
        {collapsed && (
          <motion.button
            key="tab"
            initial={{ opacity: 0, scale: 0.82 }}
            animate={{ opacity: 1, scale: 1 }}
            exit={{    opacity: 0, scale: 0.82 }}
            transition={{ duration: 0.16 }}
            onClick={toggle}
            title="Open Context Bar"
            style={{
              ...GLASS,
              width: 42, height: 42,
              borderRadius: 13,
              display: "flex", alignItems: "center", justifyContent: "center",
              cursor: "pointer", padding: 0,
              color: "#00F0FF", fontSize: 15,
            }}
          >
            <i className="fa-solid fa-layer-group" />
          </motion.button>
        )}

        {/* ── Expanded panel ─────────────────────────────────────────────── */}
        {!collapsed && (
          <motion.div
            key="panel"
            initial={{ opacity: 0, y: 18, scale: 0.96 }}
            animate={{ opacity: 1, y: 0,  scale: 1    }}
            exit={{    opacity: 0, y: 12, scale: 0.95  }}
            transition={{ type: "spring", damping: 26, stiffness: 360, mass: 0.38 }}
            style={{ ...GLASS, width: 348, borderRadius: 20, overflow: "hidden" }}
          >
            {/* Header */}
            <Row style={{ padding: "10px 14px 8px", borderBottom: "1px solid rgba(0,240,255,0.07)" }}>
              <div style={{ display: "flex", alignItems: "center", gap: 7 }}>
                <i className="fa-solid fa-layer-group" style={{ color: "#00F0FF", fontSize: 11 }} />
                <span style={{ color: "#00F0FF", fontSize: 10, fontWeight: 700, letterSpacing: "0.13em", textTransform: "uppercase" }}>
                  Context
                </span>
              </div>
              <button onClick={toggle} title="Collapse" style={iconBtnStyle}>
                <i className="fa-solid fa-chevron-down" />
              </button>
            </Row>

            {/* Active App */}
            <Sect label="Active window">
              {activeApp ? (
                <div style={{ display: "flex", alignItems: "center", gap: 10 }}>
                  <AppIcon app={activeApp} size={32} />
                  <div>
                    <div style={{ color: "#E2E8F0", fontSize: 12, fontWeight: 600, lineHeight: 1.3 }}>{activeApp.name}</div>
                    <div style={{ color: "rgba(255,255,255,0.3)", fontSize: 10 }}>Focused</div>
                  </div>
                </div>
              ) : (
                <Muted>No app focused</Muted>
              )}
            </Sect>

            {/* Clipboard */}
            <Sect label="Clipboard">
              {clip.sensitive ? (
                <div style={{ display: "flex", alignItems: "center", gap: 6 }}>
                  <i className="fa-solid fa-shield-halved" style={{ color: "#FCEE09", fontSize: 10 }} />
                  <Muted>Sensitive content hidden</Muted>
                </div>
              ) : clip.text ? (
                <div style={{
                  background: "rgba(255,255,255,0.04)", borderRadius: 8,
                  padding: "5px 8px", lineHeight: 1.5, wordBreak: "break-all",
                }}>
                  <TypeTag type={clip.type} />
                  <span style={{
                    color: "rgba(255,255,255,0.55)", fontSize: 10,
                    fontFamily: clip.type === "code" ? "monospace" : "inherit",
                  }}>
                    {clip.text.slice(0, 120)}{clip.text.length > 120 ? "…" : ""}
                  </span>
                </div>
              ) : (
                <Muted>Nothing copied yet</Muted>
              )}
            </Sect>

            {/* Suggestions */}
            {suggestions.length > 0 && (
              <Sect label="Suggestions">
                <ChipRow items={suggestions} openApp={openApp} accent="#00F0FF" />
              </Sect>
            )}

            {/* Quick launch */}
            <Sect label="Quick launch">
              <ChipRow items={QUICK} openApp={openApp} accent="#39FF14" />
            </Sect>

            {/* Timeline */}
            {timeline.length > 0 && (
              <Sect label="Recent apps" noBorder>
                <div style={{ display: "flex", flexWrap: "wrap", gap: 5 }}>
                  {timeline.map((e, i) => (
                    <motion.button
                      key={`${e.appId}-${e.ts}`}
                      initial={{ opacity: 0, scale: 0.75 }}
                      animate={{ opacity: 1, scale: 1    }}
                      transition={{ delay: i * 0.03 }}
                      onClick={() => openApp(e.appId)}
                      title={e.name}
                      style={{
                        background: `${e.color}12`, border: `1px solid ${e.color}28`,
                        borderRadius: 8, width: 28, height: 28,
                        display: "flex", alignItems: "center", justifyContent: "center",
                        cursor: "pointer", padding: 0, color: e.color, fontSize: 11,
                        transition: "background 0.14s",
                      }}
                    >
                      <i className={`fa-solid ${e.icon}`} />
                    </motion.button>
                  ))}
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

function Sect({ label, children, noBorder = false }) {
  return (
    <div style={{ padding: "8px 14px", borderBottom: noBorder ? "none" : "1px solid rgba(255,255,255,0.05)" }}>
      <div style={{ color: "rgba(255,255,255,0.2)", fontSize: 9, fontWeight: 700, letterSpacing: "0.13em", textTransform: "uppercase", marginBottom: 5 }}>
        {label}
      </div>
      {children}
    </div>
  );
}

function Row({ children, style }) {
  return <div style={{ display: "flex", alignItems: "center", justifyContent: "space-between", ...style }}>{children}</div>;
}

function Muted({ children }) {
  return <span style={{ color: "rgba(255,255,255,0.22)", fontSize: 10 }}>{children}</span>;
}

function AppIcon({ app, size = 30 }) {
  return (
    <div style={{
      width: size, height: size, flexShrink: 0, borderRadius: Math.round(size * 0.3),
      background: `${app.color}18`, border: `1px solid ${app.color}30`,
      display: "flex", alignItems: "center", justifyContent: "center",
    }}>
      <i className={`fa-solid ${app.icon}`} style={{ color: app.color, fontSize: Math.round(size * 0.42) }} />
    </div>
  );
}

function ChipRow({ items, openApp, accent }) {
  return (
    <div style={{ display: "flex", flexWrap: "wrap", gap: 5 }}>
      {items.map((item) => (
        <Chip key={item.label} label={item.label} icon={item.icon} onClick={() => openApp(item.app)} accent={accent} />
      ))}
    </div>
  );
}

function Chip({ label, icon, onClick, accent }) {
  const [hov, setHov] = useState(false);
  return (
    <button
      onClick={onClick}
      onMouseEnter={() => setHov(true)}
      onMouseLeave={() => setHov(false)}
      style={{
        background:  hov ? `${accent}16` : "rgba(255,255,255,0.05)",
        border:      `1px solid ${hov ? accent + "48" : "rgba(255,255,255,0.07)"}`,
        borderRadius: 8, padding: "3px 9px",
        color:       hov ? accent : "rgba(255,255,255,0.52)",
        fontSize: 10, fontWeight: 600, cursor: "pointer",
        display: "flex", alignItems: "center", gap: 5,
        transition: "all 0.14s", fontFamily: "inherit", whiteSpace: "nowrap",
      }}
    >
      {icon && <i className={`fa-solid ${icon}`} style={{ fontSize: 9 }} />}
      {label}
    </button>
  );
}

const TYPE_COLORS = { url: "#00F0FF", code: "#39FF14", email: "#FCEE09", text: "rgba(255,255,255,0.28)" };

function TypeTag({ type }) {
  const color = TYPE_COLORS[type];
  if (!color) return null;
  return (
    <span style={{
      display: "inline-block", fontSize: 8, fontWeight: 700,
      color, letterSpacing: "0.1em", textTransform: "uppercase",
      marginRight: 5, marginBottom: 2,
    }}>
      [{type}]
    </span>
  );
}

const iconBtnStyle = {
  background: "none", border: "none", cursor: "pointer",
  color: "rgba(255,255,255,0.28)", fontSize: 11, padding: 3, lineHeight: 1,
};
