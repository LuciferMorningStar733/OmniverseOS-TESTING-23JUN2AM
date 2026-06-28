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

/* ── Clipboard helpers ───────────────────────────────────────────────────── */
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

/* ── Orb colour map ──────────────────────────────────────────────────────── */
const ORB = {
  idle:     { a: "#00F0FF", b: "#0055CC", glow: "rgba(0,240,255,0.50)"   },
  thinking: { a: "#CF9EFF", b: "#7B2FFF", glow: "rgba(207,158,255,0.50)" },
  working:  { a: "#39FF14", b: "#00880A", glow: "rgba(57,255,20,0.50)"   },
  offline:  { a: "#FF003C", b: "#880020", glow: "rgba(255,0,60,0.50)"    },
  error:    { a: "#FF8C00", b: "#CC5500", glow: "rgba(255,140,0,0.50)"   },
  muted:    { a: "#94A3B8", b: "#334155", glow: "rgba(148,163,184,0.25)" },
};

/* ── cortex:prompt dispatcher ────────────────────────────────────────────── */
function dispatchPrompt(text) {
  window.dispatchEvent(
    new CustomEvent("cortex:prompt", { detail: { text } })
  );
}

/* ── Time-of-day helper ──────────────────────────────────────────────────── */
function getTimeOfDay() {
  const h = new Date().getHours();
  if (h < 5)  return "night";
  if (h < 12) return "morning";
  if (h < 17) return "afternoon";
  if (h < 21) return "evening";
  return "night";
}

/* ── GitHub URL detector ─────────────────────────────────────────────────── */
function isGitHubUrl(url) {
  try { return new URL(url).hostname.includes("github.com"); }
  catch { return false; }
}

/* ── Smart suggestions with executable workflows ────────────────────────── */
function buildSuggestions(activeApp, clip, windows, online, time) {
  if (!online) {
    return [{ label: "You are offline", icon: "fa-wifi-slash", app: null, disabled: true, priority: 0 }];
  }

  const sugs = [];
  const browserUrl = localStorage.getItem("omniverse_browser_url") || "";
  const openAppIds = windows.map((w) => w.app);
  const hasMusic   = openAppIds.includes("music");
  const hasCode    = openAppIds.includes("code");
  const hasNotes   = openAppIds.includes("notes");
  const hasTasks   = openAppIds.includes("tasks");
  const hasFinance = openAppIds.includes("finance");

  /* clipboard-driven */
  if (clip.type === "url" && clip.text) {
    if (isGitHubUrl(clip.text)) {
      sugs.push({
        label: "Inspect GitHub Repo",
        icon: "fa-brands fa-github",
        priority: 100,
        app: "chat",
        navigate: clip.text,
        prompt: `Inspect this GitHub repository and give me a concise engineering overview:\n${clip.text}\n\nCover: purpose, tech stack, key files, recent commits, open issues, and any red flags.`,
      });
    } else {
      sugs.push({
        label: "Open URL in Browser",
        icon: "fa-globe",
        priority: 95,
        app: "browser",
        navigate: clip.text,
        prompt: null,
      });
      sugs.push({
        label: "Summarize this page",
        icon: "fa-file-lines",
        priority: 90,
        app: "chat",
        navigate: clip.text,
        prompt: `Summarize the content of this page in 3-5 bullet points:\n${clip.text}`,
      });
    }
  }

  if (clip.type === "code" && clip.text) {
    sugs.push({
      label: "Explain this code",
      icon: "fa-code",
      priority: 95,
      app: "chat",
      prompt: `Explain this code step by step, identify any bugs or improvements:\n\`\`\`\n${clip.text.slice(0, 800)}\n\`\`\``,
    });
  }

  if (clip.type === "json" && clip.text) {
    sugs.push({
      label: "Inspect JSON",
      icon: "fa-file-code",
      priority: 90,
      app: "chat",
      prompt: `Analyze this JSON structure and describe its purpose, fields, and any anomalies:\n\`\`\`json\n${clip.text.slice(0, 800)}\n\`\`\``,
    });
  }

  if (clip.type === "email" && clip.text) {
    sugs.push({
      label: "Draft a reply",
      icon: "fa-envelope",
      priority: 88,
      app: "chat",
      prompt: `Draft a professional reply to this email address: ${clip.text}\n\nAsk me what the reply should be about if you need more context.`,
    });
  }

  if (clip.type === "text" && clip.text && clip.text.length > 20) {
    sugs.push({
      label: "Explain clipboard",
      icon: "fa-clipboard",
      priority: 75,
      app: "chat",
      prompt: `Explain this text clearly and concisely:\n\n"${clip.text.slice(0, 600)}"`,
    });
  }

  /* active app context */
  if (activeApp?.id === "browser" && browserUrl) {
    sugs.push({
      label: "Summarize current page",
      icon: "fa-comments",
      priority: 85,
      app: "chat",
      prompt: `Summarize the page currently open in Browser.\n\nURL: ${browserUrl}\n\nProvide a concise summary of the main content, key points, and any notable information.`,
    });
    if (isGitHubUrl(browserUrl)) {
      sugs.push({
        label: "Review this repo",
        icon: "fa-brands fa-github",
        priority: 92,
        app: "chat",
        prompt: `Do a full engineering review of the GitHub repository currently open in my browser:\n${browserUrl}\n\nCover: architecture, code quality, tech stack, recent activity, and recommendations.`,
      });
    }
  }

  if (activeApp?.id === "notes" && hasNotes) {
    sugs.push({
      label: "Improve this note",
      icon: "fa-wand-magic-sparkles",
      priority: 82,
      app: "chat",
      prompt: "Improve the note I'm currently writing. Fix grammar, improve clarity, and suggest a better structure if needed. I'll paste the content shortly.",
    });
  }

  if (activeApp?.id === "tasks" && hasTasks) {
    sugs.push({
      label: "Summarize my tasks",
      icon: "fa-list-check",
      priority: 80,
      app: "chat",
      prompt: "Summarize everything I worked on today using my recent activity, clipboard history, browser activity, tasks and conversations. Give me a productivity overview.",
    });
    sugs.push({
      label: "Prioritize my backlog",
      icon: "fa-arrow-up-wide-short",
      priority: 78,
      app: "chat",
      prompt: "Look at my task list and help me prioritize what I should work on next. Suggest which tasks are highest priority and why.",
    });
  }

  if (activeApp?.id === "code" && hasCode) {
    sugs.push({
      label: "Explain selection",
      icon: "fa-lightbulb",
      priority: 85,
      app: "chat",
      prompt: "I'm working in the Code Editor. Explain the code I'm currently looking at, identify potential bugs, and suggest improvements.",
    });
    sugs.push({
      label: "Resume development",
      icon: "fa-rotate-right",
      priority: 83,
      app: "chat",
      prompt: "Continue helping me with the last development session. Review my recent code activity and pick up where we left off.",
    });
  }

  if (activeApp?.id === "finance" && hasFinance) {
    sugs.push({
      label: "Analyze my finances",
      icon: "fa-chart-line",
      priority: 80,
      app: "chat",
      prompt: "Analyze my financial data currently open in Finance. Summarize spending patterns, identify anomalies, and give me actionable insights.",
    });
  }

  if (windows.length >= 3) {
    sugs.push({
      label: "Summarize open apps",
      icon: "fa-layer-group",
      priority: 60,
      app: "chat",
      prompt: `I have ${windows.length} apps open: ${windows.map((w) => w.app).join(", ")}. Give me a quick summary of what I might be working on and suggest what to focus on next.`,
    });
  }

  if (hasMusic) {
    sugs.push({ label: "Music is open", icon: "fa-music", priority: 55, app: "music", prompt: null });
  }

  if (time === "morning") {
    sugs.push({
      label: "Plan my day",
      icon: "fa-sun",
      priority: 50,
      app: "chat",
      prompt: "Help me plan my day. Look at my tasks, calendar, and any pending work. Give me a prioritized list of what to tackle today.",
    });
  } else if (time === "evening" || time === "night") {
    sugs.push({
      label: "Summarize my day",
      icon: "fa-moon",
      priority: 50,
      app: "chat",
      prompt: "Summarize everything I worked on today using my recent activity, clipboard history, browser activity, tasks and conversations. Give me a clear end-of-day overview.",
    });
  }

  sugs.push({
    label: "What can you do?",
    icon: "fa-sparkles",
    priority: 10,
    app: "chat",
    prompt: "What can Cortex help me with inside OmniverseOS? Give me a complete list of capabilities with examples.",
  });

  return sugs.sort((a, b) => b.priority - a.priority).slice(0, 4);
}

/* ── Quick actions ───────────────────────────────────────────────────────── */
const QUICK = [
  { label: "AI Chat",   app: "chat",      icon: "fa-comments",         color: "#00F0FF" },
  { label: "Browser",   app: "browser",   icon: "fa-globe",            color: "#FCEE09" },
  { label: "Notes",     app: "notes",     icon: "fa-note-sticky",      color: "#FCEE09" },
  { label: "Music",     app: "music",     icon: "fa-music",            color: "#39FF14" },
  { label: "Clipboard", app: "clipboard", icon: "fa-clipboard",        color: "#39FF14" },
  { label: "Tasks",     app: "tasks",     icon: "fa-list-check",       color: "#00F0FF" },
  { label: "Search",    app: null,        icon: "fa-magnifying-glass", color: "#CF9EFF", action: "palette" },
  { label: "Calendar",  app: "calendar",  icon: "fa-calendar",         color: "#FF003C" },
  { label: "Settings",  app: "settings",  icon: "fa-gear",             color: "#94A3B8" },
];

/* ── Shared styles ───────────────────────────────────────────────────────── */
const GLASS = {
  background: "rgba(7, 9, 16, 0.84)",
  backdropFilter: "blur(32px) saturate(200%)",
  WebkitBackdropFilter: "blur(32px) saturate(200%)",
  border: "1px solid rgba(0,240,255,0.13)",
  boxShadow:
    "0 28px 72px rgba(0,0,0,0.70), inset 0 1px 0 rgba(0,240,255,0.08), 0 0 0 1px rgba(0,240,255,0.03)",
};
const FONT = "'Outfit', ui-sans-serif, sans-serif";

/* ══════════════════════════════════════════════════════════════════════════
   AIDock — main export
══════════════════════════════════════════════════════════════════════════ */
export default function AIDock() {
  const { activeId, windows, openApp, setPaletteOpen } = useOS();
  const [expanded, setExpanded]   = useState(false);
  const [orbStatus, setOrbStatus] = useState("idle");
  const [clip, setClip]           = useState({ text: "", type: "empty", sensitive: false });
  const [online, setOnline]       = useState(() => navigator.onLine);
  const [recentApps, setRecentApps] = useState([]);
  const [showBadge, setShowBadge] = useState(false);
  const badgeTimer  = useRef(null);
  const copyTimer   = useRef(null);

  /* online/offline */
  useEffect(() => {
    const on  = () => { setOnline(true);  setOrbStatus("idle");    };
    const off = () => { setOnline(false); setOrbStatus("offline"); };
    window.addEventListener("online",  on);
    window
