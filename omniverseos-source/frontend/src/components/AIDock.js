import React, {
  useState,
  useEffect,
  useCallback,
  useMemo,
  useRef,
} from "react";
import { motion, AnimatePresence } from "framer-motion";
import { useOS } from "../context/OSContext";
import { getApp } from "../lib/apps";

/* — Clipboard helpers ————————————————————————————————— */
const SENSITIVE_RE = [
  /password/i,
  /passwd/i,
  /\bsecret\b/i,
  /\bapi[_\-]?key\b/i,
  /_?token_?/i,
  /private[_\-]?key/i,
];
const isSensitive = (t) => SENSITIVE_RE.some((re) => re.test(t));

function detectType(text) {
  if (!text?.trim()) return "empty";
  const t = text.trim();
  if (/^https?:\/\/\S+/.test(t)) return "url";
  if (/^[\w.+\-]+@[\w\-]+\.[a-z]{2,}$/i.test(t)) return "email";
  try {
    if ((t.startsWith("{") || t.startsWith("[")) && JSON.parse(t))
      return "json";
  } catch { /* not json */ }
  if (
    /\b(function|const|let|var|import|export|class|return|def |public |private |interface )\b/.test(t) ||
    /[{};]/.test(t)
  )
    return "code";
  return "text";
}

/* — Orb colour map ————————————————————————————————————— */
const ORB = {
  idle:     { a: "#00F0FF", b: "#0055CC", glow: "rgba(0,240,255,0.50)"   },
  thinking: { a: "#CF9FFF", b: "#7B2FFF", glow: "rgba(207,158,255,0.50)" },
  working:  { a: "#39FF14", b: "#008800A", glow: "rgba(57,255,20,0.50)"  },
  offline:  { a: "#FF003C", b: "#880020",  glow: "rgba(255,60,0,0.50)"   },
  error:    { a: "#FF8C00", b: "#CC5500",  glow: "rgba(255,140,0,0.50)"  },
  muted:    { a: "#94A3B8", b: "#334155",  glow: "rgba(148,163,184,0.25)"},
};

/* — cortex:prompt dispatcher ——————————————————————————— */
function dispatchPrompt(text) {
  window.dispatchEvent(
    new CustomEvent("cortex:prompt", { detail: { text } })
  );
}

/* — Time-of-day helper ————————————————————————————————— */
function getTimeOfDay() {
  const h = new Date().getHours();
  if (h < 5)  return "night";
  if (h < 12) return "morning";
  if (h < 17) return "afternoon";
  if (h < 21) return "evening";
  return "night";
}

/* — GitHub URL detector ———————————————————————————————— */
function isGitHubUrl(url) {
  return /github\.com/.test(url);
}

/* — Context-aware suggestion builder ——————————————————— */
function buildSuggestions({ clip, activeId, recentApps, time }) {
  const sugs = [];

  /* clipboard-driven */
  if (clip && clip.type !== "empty" && !clip.sensitive) {
    if (clip.type === "url") {
      sugs.push({
        label: "Open URL",
        icon: "fa-external-link-alt",
        priority: 90,
        app: "browser",
        prompt: `Open this URL in the browser: ${clip.text}`,
      });
      if (isGitHubUrl(clip.text)) {
        sugs.push({
          label: "Summarize repo",
          icon: "fa-code-branch",
          priority: 85,
          app: "chat",
          prompt: `Summarize this GitHub repository and its purpose: ${clip.text}`,
        });
      }
    }
    if (clip.type === "code") {
      sugs.push({
        label: "Explain code",
        icon: "fa-code",
        priority: 88,
        app: "chat",
        prompt: `Explain what this code does:\n\n${clip.text}`,
      });
      sugs.push({
        label: "Review code",
        icon: "fa-search-plus",
        priority: 80,
        app: "chat",
        prompt: `Review this code for bugs and improvements:\n\n${clip.text}`,
      });
    }
    if (clip.type === "email") {
      sugs.push({
        label: "Draft reply",
        icon: "fa-reply",
        priority: 85,
        app: "chat",
        prompt: `Draft a professional reply to this email address: ${clip.text}`,
      });
    }
    if (clip.type === "json") {
      sugs.push({
        label: "Parse JSON",
        icon: "fa-brackets-curly",
        priority: 82,
        app: "chat",
        prompt: `Explain and prettify this JSON:\n\n${clip.text}`,
      });
    }
    if (clip.type === "text" && clip.text.length > 30) {
      sugs.push({
        label: "Summarize",
        icon: "fa-compress-alt",
        priority: 75,
        app: "chat",
        prompt: `Summarize this text concisely:\n\n${clip.text}`,
      });
    }
  }

  /* current browser page */
  const storedUrl = localStorage.getItem("cortex_current_url");
  if (storedUrl && activeId === "browser") {
    sugs.push({
      label: "Summarize page",
      icon: "fa-file-alt",
      priority: 70,
      app: "chat",
      prompt: `Summarize the content of this page: ${storedUrl}`,
    });
  }

  /* recent apps context */
  if (recentApps.includes("notes")) {
    sugs.push({
      label: "Organize notes",
      icon: "fa-sort-amount-down",
      priority: 60,
      app: "chat",
      prompt: "Help me organize and structure my recent notes.",
    });
  }

  /* time-of-day */
  if (time === "morning") {
    sugs.push({
      label: "Plan my day",
      icon: "fa-sun",
      priority: 55,
      app: "chat",
      prompt: "Help me plan and prioritize my tasks for today.",
    });
  } else if (time === "evening" || time === "night") {
    sugs.push({
      label: "Summarize my day",
      icon: "fa-moon",
      priority: 50,
      app: "chat",
      prompt:
        "Summarize everything I worked on today using my recent activity, clipboard history, browser activity, tasks and conversations. Give me a clear end-of-day overview.",
    });
  }

  sugs.push({
    label: "What can you do?",
    icon: "fa-sparkles",
    priority: 10,
    app: "chat",
    prompt:
      "What can Cortex help me with inside OmniverseOS? Give me a complete list of capabilities with examples.",
  });

  return sugs.sort((a, b) => b.priority - a.priority).slice(0, 4);
}

/* — Quick actions ————————————————————————————————————— */
const QUICK = [
  { label: "AI Chat",   app: "chat",      icon: "fa-comments",       color: "#00F0FF" },
  { label: "Browser",   app: "browser",   icon: "fa-globe",          color: "#FCEE09" },
  { label: "Notes",     app: "notes",     icon: "fa-note-sticky",    color: "#FCEE09" },
  { label: "Music",     app: "music",     icon: "fa-music",          color: "#39FF14" },
  { label: "Clipboard", app: "clipboard", icon: "fa-clipboard",      color: "#39FF14" },
  { label: "Tasks",     app: "tasks",     icon: "fa-list-check",     color: "#00F0FF" },
  { label: "Search",    app: null,        icon: "fa-magnifying-glass",color: "#CF9EFF", action: "palette" },
  { label: "Calendar",  app: "calendar",  icon: "fa-calendar",       color: "#FF003C" },
  { label: "Settings",  app: "settings",  icon: "fa-gear",           color: "#94A3B8" },
];

/* — Shared styles ————————————————————————————————————— */
const GLASS = {
  background: "rgba(7, 9, 16, 0.84)",
  backdropFilter: "blur(32px) saturate(200%)",
  WebkitBackdropFilter: "blur(32px) saturate(200%)",
  border: "1px solid rgba(0,240,255,0.13)",
  boxShadow:
    "0 28px 72px rgba(0,0,0,0.70), inset 0 1px 0 rgba(0,240,255,0.08), 0 0 1px rgba(0,240,255,0.03)",
};
const FONT = "'Outfit', ui-sans-serif, sans-serif";

/* ━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━
   AIDock — main export
━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━ */
export default function AIDock() {
  const { activeId, windows, openApp, setPaletteOpen } = useOS();
  const [expanded, setExpanded]       = useState(false);
  const [orbStatus, setOrbStatus]     = useState("idle");
  const [clip, setClip]               = useState({ text: "", type: "empty", sensitive: false });
  const [online, setOnline]           = useState(() => navigator.onLine);
  const [recentApps, setRecentApps]   = useState([]);
  const [showBadge, setShowBadge]     = useState(false);
  const badgeTimer  = useRef(null);
  const copyTimer   = useRef(null);

  /* online/offline */
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

  /* track recent apps */
  useEffect(() => {
    if (activeId) {
      setRecentApps((prev) => {
        const next = [activeId, ...prev.filter((a) => a !== activeId)].slice(0, 5);
        return next;
      });
    }
  }, [activeId]);

  /* clipboard watcher */
  useEffect(() => {
    async function poll() {
      try {
        const text = await navigator.clipboard.readText();
        if (!text || text === clip.text) return;
        const type = detectType(text);
        const sensitive = isSensitive(text);
        setClip({ text, type, sensitive });
        if (!sensitive && type !== "empty") {
          setShowBadge(true);
          clearTimeout(badgeTimer.current);
          badgeTimer.current = setTimeout(() => setShowBadge(false), 4000);
        }
      } catch { /* clipboard permission denied */ }
    }
    const id = setInterval(poll, 2500);
    return () => clearInterval(id);
  }, [clip.text]);

  /* cortex:thinking / cortex:done events */
  useEffect(() => {
    const onThink = () => setOrbStatus("thinking");
    const onDone  = () => setOrbStatus(online ? "idle" : "offline");
    window.addEventListener("cortex:thinking", onThink);
    window.addEventListener("cortex:done",     onDone);
    return () => {
      window.removeEventListener("cortex:thinking", onThink);
      window.removeEventListener("cortex:done",     onDone);
    };
  }, [online]);

  /* cleanup timers */
  useEffect(() => () => {
    clearTimeout(badgeTimer.current);
    clearTimeout(copyTimer.current);
  }, []);

  const time = getTimeOfDay();
  const orb  = ORB[orbStatus] || ORB.idle;

  const suggestions = useMemo(
    () => buildSuggestions({ clip, activeId, recentApps, time }),
    [clip, activeId, recentApps, time]
  );

  const handleSuggestion = useCallback((s) => {
    if (s.app) openApp(s.app);
    dispatchPrompt(s.prompt);
    setExpanded(false);
  }, [openApp]);

  const handleQuick = useCallback((q) => {
    if (q.action === "palette") { setPaletteOpen(true); return; }
    if (q.app) openApp(q.app);
    setExpanded(false);
  }, [openApp, setPaletteOpen]);

  /* — sub-components — */
  const PanelHeader = () => (
    <div style={{
      display: "flex", alignItems: "center", justifyContent: "space-between",
      padding: "14px 18px 10px", borderBottom: "1px solid rgba(0,240,255,0.08)",
    }}>
      <div style={{ display: "flex", alignItems: "center", gap: 8 }}>
        <div style={{
          width: 8, height: 8, borderRadius: "50%",
          background: orb.a, boxShadow: `0 0 8px ${orb.glow}`,
        }} />
        <span style={{ color: "#e2e8f0", fontSize: 13, fontWeight: 600, fontFamily: FONT }}>
          Cortex Intelligence
        </span>
      </div>
      <button
        onClick={() => setExpanded(false)}
        style={{ background: "none", border: "none", color: "#64748b", cursor: "pointer", fontSize: 16, lineHeight: 1 }}
        aria-label="Close panel"
      >×</button>
    </div>
  );

  const SuggChip = ({ s }) => (
    <motion.button
      whileHover={{ scale: 1.03, backgroundColor: "rgba(0,240,255,0.10)" }}
      whileTap={{ scale: 0.97 }}
      onClick={() => handleSuggestion(s)}
      style={{
        display: "flex", align
