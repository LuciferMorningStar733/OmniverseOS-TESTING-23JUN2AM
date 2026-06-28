import React, {
  useState, useEffect, useCallback, useMemo, useRef,
} from "react";
import { motion, AnimatePresence } from "framer-motion";
import { useOS } from "../context/OSContext";
import { getApp } from "../lib/apps";

/* ── Clipboard helpers ───────────────────────────────────────────────────── */
const SENSITIVE_RE = [
  /password/i, /passwd/i, /\bsecret\b/i,
  /\bapi[_\-]?key\b/i, /_?token_?/i, /private[_\-]?key/i,
];
const isSensitive = (t) => SENSITIVE_RE.some((re) => re.test(t));

function detectType(text) {
  if (!text?.trim()) return "empty";
  const t = text.trim();
  if (/^https?:\/\/\S+/.test(t)) return "url";
  if (/^[\w.+\-]+@[\w\-]+\.[a-z]{2,}$/i.test(t)) return "email";
  try {
    if ((t.startsWith("{") || t.startsWith("[")) && JSON.parse(t)) return "json";
  } catch { /* not json */ }
  if (
    /\b(function|const|let|var|import|export|class|return|def |public |private |interface )\b/.test(t) ||
    /[{};]/.test(t)
  ) return "code";
  return "text";
}

/* ── Orb colour map ──────────────────────────────────────────────────────── */
const ORB = {
  idle:     { a: "#00F0FF", b: "#0055CC", glow: "rgba(0,240,255,0.50)"    },
  thinking: { a: "#CF9EFF", b: "#7B2FFF", glow: "rgba(207,158,255,0.50)"  },
  working:  { a: "#39FF14", b: "#00880A", glow: "rgba(57,255,20,0.50)"    },
  offline:  { a: "#FF003C", b: "#880020", glow: "rgba(255,0,60,0.50)"     },
  error:    { a: "#FF8C00", b: "#CC5500", glow: "rgba(255,140,0,0.50)"    },
  muted:    { a: "#94A3B8", b: "#334155", glow: "rgba(148,163,184,0.25)"  },
};

/* ── Smart suggestions ───────────────────────────────────────────────────── */
function buildSuggestions(activeApp, clip, windows, online) {
  if (!online) {
    return [{ label: "You are offline", icon: "fa-wifi-slash", app: null, disabled: true }];
  }
  const sugs = [];
  if (clip.type === "url")   sugs.push({ label: "Open URL in Browser",   icon: "fa-globe",               app: "browser" });
  if (clip.type === "code")  sugs.push({ label: "Explain this code",     icon: "fa-code",                app: "chat"    });
  if (clip.type === "json")  sugs.push({ label: "Inspect JSON",          icon: "fa-file-code",           app: "code"    });
  if (clip.type === "email") sugs.push({ label: "Draft a reply",         icon: "fa-envelope",            app: "chat"    });

  const hasMusic = windows.some((w) => w.app === "music");
  if (hasMusic) sugs.push({ label: "Music is open", icon: "fa-music", app: "music" });

  if (activeApp?.id === "browser") sugs.push({ label: "Ask AI about page",   icon: "fa-comments",           app: "chat" });
  if (activeApp?.id === "notes")   sugs.push({ label: "Improve this note",   icon: "fa-wand-magic-sparkles", app: "chat" });
  if (activeApp?.id === "tasks")   sugs.push({ label: "Summarize my tasks",  icon: "fa-list-check",         app: "chat" });
  if (activeApp?.id === "code")    sugs.push({ label: "Explain selection",   icon: "fa-lightbulb",          app: "chat" });
  if (activeApp?.id === "finance") sugs.push({ label: "Analyze my data",     icon: "fa-chart-line",         app: "chat" });

  if (windows.length >= 3) sugs.push({ label: "Summarize open apps", icon: "fa-layer-group", app: "chat" });

  return sugs.slice(0, 4);
}

/* ── Quick actions ───────────────────────────────────────────────────────── */
const QUICK = [
  { label: "AI Chat",   app: "chat",      icon: "fa-comments",          color: "#00F0FF" },
  { label: "Browser",   app: "browser",   icon: "fa-globe",             color: "#FCEE09" },
  { label: "Notes",     app: "notes",     icon: "fa-note-sticky",       color: "#FCEE09" },
  { label: "Music",     app: "music",     icon: "fa-music",             color: "#39FF14" },
  { label: "Clipboard", app: "clipboard", icon: "fa-clipboard",         color: "#39FF14" },
  { label: "Tasks",     app: "tasks",     icon: "fa-list-check",        color: "#00F0FF" },
  { label: "Search",    app: null,        icon: "fa-magnifying-glass",  color: "#CF9EFF", action: "palette" },
  { label: "Calendar",  app: "calendar",  icon: "fa-calendar",          color: "#FF003C" },
  { label: "Settings",  app: "settings",  icon: "fa-gear",              color: "#94A3B8" },
];

/* ── Shared styles ───────────────────────────────────────────────────────── */
const GLASS = {
  background:           "rgba(7, 9, 16, 0.84)",
  backdropFilter:       "blur(32px) saturate(200%)",
  WebkitBackdropFilter: "blur(32px) saturate(200%)",
  border:               "1px solid rgba(0,240,255,0.13)",
  boxShadow:            "0 28px 72px rgba(0,0,0,0.70), inset 0 1px 0 rgba(0,240,255,0.08), 0 0 0 1px rgba(0,240,255,0.03)",
};

const FONT = "'Outfit', ui-sans-serif, sans-serif";

/* ══════════════════════════════════════════════════════════════════════════
   AIDock — main export
   ══════════════════════════════════════════════════════════════════════════ */
export default function AIDock() {
  const { activeId, windows, openApp, setPaletteOpen } = useOS();

  const [expanded,   setExpanded]   = useState(false);
  const [orbStatus,  setOrbStatus]  = useState("idle");
  const [clip,       setClip]       = useState({ text: "", type: "empty", sensitive: false });
  const [online,     setOnline]     = useState(() => navigator.onLine);
  const [recentApps, setRecentApps] = useState([]);

  const copyTimer = useRef(null);

  /* ── Online / offline ─────────────────────────────────────────────────── */
  useEffect(() => {
    const on  = () => { setOnline(true);  setOrbStatus("idle");    };
    const off = () => { setOnline(false); setOrbStatus("offline"); };
    window.addEventListener("online",  on);
    window.addEventListener("offline", off);
    return () => {
      window.removeEventListener("online",  on);
      window.removeEventListener("offline", off);
    };
  }, []);

  /* ── Clipboard ────────────────────────────────────────────────────────── */
  const readClip = useCallback(async () => {
    try {
      if (!document.hasFocus()) return;
      const text = await navigator.clipboard.readText();
      if (!text) return;
      const sensitive = isSensitive(text);
      setClip({
        text:      sensitive ? "" : text,
        type:      sensitive ? "sensitive" : detectType(text),
        sensitive,
      });
    } catch { /* permission denied */ }
  }, []);

  useEffect(() => {
    const onCopy  = () => { clearTimeout(copyTimer.current); copyTimer.current = setTimeout(readClip, 60); };
    const onFocus = () => readClip();
    document.addEventListener("copy",  onCopy);
    window.addEventListener("focus",   onFocus);
    readClip();
    return () => {
      document.removeEventListener("copy",  onCopy);
      window.removeEventListener("focus",   onFocus);
      clearTimeout(copyTimer.current);
    };
  }, [readClip]);

  /* ── Recent apps ──────────────────────────────────────────────────────── */
  const activeWin = useMemo(
    () => windows.find((w) => w.id === activeId) ?? null,
    [windows, activeId],
  );
  const activeApp = useMemo(
    () => (activeWin ? getApp(activeWin.app) : null),
    [activeWin],
  );
  const activeAppId = activeWin?.app ?? null;

  useEffect(() => {
    if (!activeAppId) return;
    const app = getApp(activeAppId);
    if (!app) return;
    setRecentApps((prev) => {
      const entry = { id: app.id, name: app.name, icon: app.icon, color: app.color };
      return [entry, ...prev.filter((e) => e.id !== app.id)].slice(0, 6);
    });
  }, [activeAppId]);

  /* ── Keyboard ─────────────────────────────────────────────────────────── */
  useEffect(() => {
    const handler = (e) => {
        if (e.key === "Escape" && expanded) { setExpanded(false); return; }
        if ((e.ctrlKey || e.metaKey) && e.code === "Space") { e.preventDefault(); setExpanded((v) => !v); }
      };
    window.addEventListener("keydown", handler);
    return () => window.removeEventListener("keydown", handler);
  }, [expanded]);

  /* ── Derived ──────────────────────────────────────────────────────────── */
  const openWindows = useMemo(() => windows.filter((w) => !w.minimized), [windows]);
  const suggestions = useMemo(
    () => buildSuggestions(activeApp, clip, windows, online),
    [activeApp, clip, windows, online],
  );
  const orb = ORB[orbStatus] ?? ORB.idle;

  /* ── Actions ──────────────────────────────────────────────────────────── */
  const handleQuick = useCallback((action) => {
    if (action.action === "palette") { setPaletteOpen(true); setExpanded(false); return; }
    if (action.app)                  { openApp(action.app);  setExpanded(false); return; }
  }, [openApp, setPaletteOpen]);

  /* ── Render ───────────────────────────────────────────────────────────── */
  return (
    <>
      {/* Click-outside backdrop */}
      {expanded && (
        <div
          onClick={() => setExpanded(false)}
          style={{ position: "fixed", inset: 0, zIndex: 42 }}
        />
      )}

      <div
        role="complementary"
        aria-label="Cortex AI Dock"
        style={{
          position:      "fixed",
          bottom:        96,
          left:          "50%",
          transform:     "translateX(-50%)",
          zIndex:        43,
          display:       "flex",
          flexDirection: "column",
          alignItems:    "center",
          gap:           8,
          fontFamily:    FONT,
          pointerEvents: "none",
        }}
      >
        {/* ── Expanded panel ──────────────────────────────────────────── */}
        <AnimatePresence>
          {expanded && (
            <motion.div
              key="ai-dock-panel"
              initial={{ opacity: 0, y: 18, scale: 0.93 }}
              animate={{ opacity: 1, y: 0,  scale: 1    }}
              exit={{    opacity: 0, y: 12, scale: 0.93  }}
              transition={{ type: "spring", damping: 28, stiffness: 380, mass: 0.35 }}
              style={{
                ...GLASS,
                borderRadius:  24,
                width:         400,
                overflow:      "hidden",
                pointerEvents: "auto",
              }}
            >
              {/* Header */}
              <PanelHeader
                orb={orb}
                activeApp={activeApp}
                openWindows={openWindows}
                online={online}
                clip={clip}
                onCollapse={() => setExpanded(false)}
              />

              {/* Smart suggestions */}
              {suggestions.length > 0 && (
                <PanelSection label="Smart Suggestions">
                  <div style={{ display: "flex", flexWrap: "wrap", gap: 5 }}>
                    {suggestions.map((s, i) => (
                      <SuggChip
                        key={i}
                        s={s}
                        onAct={() => { if (s.app) { openApp(s.app); setExpanded(false); } }}
                      />
                    ))}
                  </div>
                </PanelSection>
              )}

              {/* Quick actions */}
              <PanelSection label="Quick Actions">
                <div style={{ display: "flex", flexWrap: "wrap", gap: 5 }}>
                  {QUICK.map((a) => (
                    <QuickBtn key={a.label} action={a} onClick={() => handleQuick(a)} />
                  ))}
                </div>
              </PanelSection>

              {/* Recent apps */}
              {recentApps.length > 0 && (
                <PanelSection label="Recent Apps" noBorder>
                  <div style={{ display: "flex", gap: 6 }}>
                    <AnimatePresence>
                      {recentApps.map((app) => (
                        <motion.button
                          key={app.id}
                          initial={{ opacity: 0, scale: 0.7 }}
                          animate={{ opacity: 1, scale: 1   }}
                          exit={{    opacity: 0, scale: 0.7 }}
                          transition={{ type: "spring", damping: 20, stiffness: 340 }}
                          onClick={() => { openApp(app.id); setExpanded(false); }}
                          title={app.name}
                          style={{
                            width: 32, height: 32, borderRadius: 9,
                            background: `${app.color}14`,
                            border:     `1px solid ${app.color}28`,
                            color:      app.color, fontSize: 12,
                            display: "flex", alignItems: "center", justifyContent: "center",
                            cursor: "pointer", padding: 0,
                            transition: "background 0.14s",
                          }}
                        >
                          <i className={`fa-solid ${app.icon}`} />
                        </motion.button>
                      ))}
                    </AnimatePresence>
                  </div>
                </PanelSection>
              )}
            </motion.div>
          )}
        </AnimatePresence>

        {/* ── Cortex Orb — always visible ────────────────────────────── */}
        <div style={{ pointerEvents: "auto" }}>
          <CortexOrb orb={orb} expanded={expanded} onClick={() => setExpanded((v) => !v)} />
        </div>
      </div>
    </>
  );
}

/* ── Panel header ────────────────────────────────────────────────────────── */
function PanelHeader({ orb, activeApp, openWindows, online, clip, onCollapse }) {
  return (
    <div style={{
      padding:      "13px 15px 10px",
      borderBottom: "1px solid rgba(0,240,255,0.07)",
      display:      "flex",
      alignItems:   "center",
      gap:          10,
    }}>
      {/* Mini breathing orb */}
      <motion.div
        animate={{
          boxShadow: [
            `0 0 8px ${orb.glow}`,
            `0 0 18px ${orb.glow}`,
            `0 0 8px ${orb.glow}`,
          ],
        }}
        transition={{ duration: 2.5, repeat: Infinity, ease: "easeInOut" }}
        style={{
          width: 28, height: 28, borderRadius: "50%", flexShrink: 0,
          background: `radial-gradient(circle at 38% 35%, ${orb.a}, ${orb.b})`,
          display: "flex", alignItems: "center", justifyContent: "center",
        }}
      >
        <i className="fa-solid fa-brain" style={{ color: "rgba(255,255,255,0.92)", fontSize: 11 }} />
      </motion.div>

      <div style={{ flex: 1, minWidth: 0 }}>
        <div style={{ color: "#00F0FF", fontSize: 11, fontWeight: 700, letterSpacing: "0.12em", textTransform: "uppercase" }}>
          Cortex AI
        </div>
        <div style={{ color: "rgba(255,255,255,0.28)", fontSize: 9, marginTop: 1 }}>
          {activeApp ? `Active: ${activeApp.name}` : "Desktop"} · {openWindows.length} window{openWindows.length !== 1 ? "s" : ""}
        </div>
      </div>

      {/* Status pills */}
      <div style={{ display: "flex", gap: 4 }}>
        <MiniPill
          icon="fa-wifi"
          label={online ? "Online" : "Offline"}
          accent={online ? "#39FF14" : "#FF003C"}
        />
        {clip.type !== "empty" && clip.type !== "sensitive" && (
          <MiniPill icon="fa-clipboard" label={clip.type.toUpperCase()} accent="#00F0FF" />
        )}
        {openWindows.length > 0 && (
          <MiniPill icon="fa-window-restore" label={`${openWindows.length}w`} accent="#00F0FF" />
        )}
      </div>

      {/* Collapse button */}
      <button
        onClick={onCollapse}
        title="Collapse (Esc)"
        style={{
          background: "none", border: "none", cursor: "pointer",
          color: "rgba(255,255,255,0.28)", fontSize: 11, padding: 4, lineHeight: 1,
        }}
      >
        <i className="fa-solid fa-chevron-down" />
      </button>
    </div>
  );
}

/* ── Cortex Orb button ───────────────────────────────────────────────────── */
function CortexOrb({ orb, expanded, onClick }) {
  return (
    <motion.button
      onClick={onClick}
      whileHover={{ scale: 1.14 }}
      whileTap={{ scale: 0.90 }}
      transition={{ type: "spring", stiffness: 380, damping: 16 }}
      title={expanded ? "Collapse Cortex AI (Esc)" : "Open Cortex AI (Ctrl+Space)"}
      aria-label={expanded ? "Collapse Cortex AI" : "Open Cortex AI"}
      style={{
        width: 52, height: 52, borderRadius: "50%",
        background: `radial-gradient(circle at 38% 32%, ${orb.a}, ${orb.b})`,
        boxShadow: [
          `0 0 0 1.5px ${orb.a}28`,
          `0 0 22px ${orb.glow}`,
          `0 0 48px ${orb.glow.replace("0.50", "0.18")}`,
          "inset 0 1px 0 rgba(255,255,255,0.28)",
        ].join(", "),
        border:      "none",
        cursor:      "pointer",
        position:    "relative",
        display:     "flex",
        alignItems:  "center",
        justifyContent: "center",
        overflow:    "hidden",
      }}
    >
      {/* Breathing outer ring */}
      <motion.div
        animate={{ scale: [1, 1.45, 1], opacity: [0.55, 0, 0.55] }}
        transition={{ duration: 3.0, repeat: Infinity, ease: "easeInOut" }}
        style={{
          position: "absolute", inset: -6, borderRadius: "50%",
          border: `1.5px solid ${orb.a}`,
          pointerEvents: "none",
        }}
      />
      {/* Slow-spinning shimmer */}
      <motion.div
        animate={{ rotate: 360 }}
        transition={{ duration: 9, repeat: Infinity, ease: "linear" }}
        style={{
          position: "absolute",
          width: 32, height: 32, borderRadius: "50%",
          background: `conic-gradient(transparent 0deg, ${orb.a}45 180deg, transparent 360deg)`,
          pointerEvents: "none",
        }}
      />
      {/* Core icon */}
      <i
        className="fa-solid fa-brain"
        style={{
          color: "rgba(255,255,255,0.93)", fontSize: 18,
          position: "relative", zIndex: 1,
          filter: "drop-shadow(0 0 5px rgba(255,255,255,0.55))",
        }}
      />
    </motion.button>
  );
}

/* ── Section wrapper ─────────────────────────────────────────────────────── */
function PanelSection({ label, children, noBorder = false }) {
  return (
    <div style={{
      padding:      "8px 14px",
      borderBottom: noBorder ? "none" : "1px solid rgba(255,255,255,0.05)",
    }}>
      <div style={{
        color: "rgba(255,255,255,0.18)", fontSize: 9, fontWeight: 700,
        letterSpacing: "0.13em", textTransform: "uppercase", marginBottom: 5,
      }}>
        {label}
      </div>
      {children}
    </div>
  );
}

/* ── Suggestion chip ─────────────────────────────────────────────────────── */
function SuggChip({ s, onAct }) {
  const [hov, setHov] = useState(false);
  return (
    <button
      onClick={s.disabled ? undefined : onAct}
      onMouseEnter={() => setHov(true)}
      onMouseLeave={() => setHov(false)}
      disabled={s.disabled}
      style={{
        background:   hov ? "rgba(0,240,255,0.10)" : "rgba(255,255,255,0.04)",
        border:       `1px solid ${hov ? "rgba(0,240,255,0.35)" : "rgba(255,255,255,0.07)"}`,
        borderRadius: 9, padding: "4px 10px",
        color:        hov ? "#00F0FF" : "rgba(255,255,255,0.50)",
        fontSize: 10, fontWeight: 600,
        cursor:   s.disabled ? "default" : "pointer",
        display:  "flex", alignItems: "center", gap: 5,
        transition: "all 0.13s",
        fontFamily: FONT,
        opacity:  s.disabled ? 0.45 : 1,
        border:   `1px solid ${hov ? "rgba(0,240,255,0.35)" : "rgba(255,255,255,0.07)"}`,
      }}
    >
      <i className={`fa-solid ${s.icon}`} style={{ fontSize: 9 }} />
      {s.label}
    </button>
  );
}

/* ── Quick action button ─────────────────────────────────────────────────── */
function QuickBtn({ action, onClick }) {
  const [hov, setHov] = useState(false);
  return (
    <button
      onClick={onClick}
      onMouseEnter={() => setHov(true)}
      onMouseLeave={() => setHov(false)}
      title={action.label}
      style={{
        background:   hov ? `${action.color}14` : "rgba(255,255,255,0.04)",
        border:       `1px solid ${hov ? action.color + "42" : "rgba(255,255,255,0.07)"}`,
        borderRadius: 9, padding: "4px 10px",
        color:        hov ? action.color : "rgba(255,255,255,0.44)",
        fontSize:     10, fontWeight: 600, cursor: "pointer",
        display:      "flex", alignItems: "center", gap: 5,
        transition:   "all 0.13s",
        fontFamily:   FONT,
      }}
    >
      <i
        className={`fa-solid ${action.icon}`}
        style={{ color: hov ? action.color : "rgba(255,255,255,0.28)", fontSize: 10 }}
      />
      {action.label}
    </button>
  );
}

/* ── Mini status pill ────────────────────────────────────────────────────── */
function MiniPill({ icon, label, accent }) {
  return (
    <div style={{
      display: "flex", alignItems: "center", gap: 4,
      background: `${accent}0A`,
      border:     `1px solid ${accent}22`,
      borderRadius: 6, padding: "2px 6px",
    }}>
      <i className={`fa-solid ${icon}`} style={{ color: accent, fontSize: 7 }} />
      <span style={{ color: "rgba(255,255,255,0.44)", fontSize: 8, fontWeight: 600 }}>
        {label}
      </span>
    </div>
  );
}
