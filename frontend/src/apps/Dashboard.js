import React, { useEffect, useState, useRef } from "react";
import { motion, AnimatePresence } from "framer-motion";
import { useOS } from "../context/OSContext";
import { analytics } from "../lib/api";
import { APPS } from "../lib/apps";
import { AreaChart, Area, ResponsiveContainer, Tooltip } from "recharts";

// ── Activity data ─────────────────────────────────────────────────────────
const fakeActivity = Array.from({ length: 14 }, (_, i) => ({
  x: i,
  y: 30 + Math.sin(i / 2) * 25 + Math.random() * 20,
}));

const QUICK_APP_IDS_DEFAULT = ["chat","image","notes","tasks","calendar","music","code","finance","analytics","memory"];
const LS_QUICK = "omni_quick_apps";
function getQuickApps() {
  try { const s = localStorage.getItem(LS_QUICK); return s ? JSON.parse(s) : QUICK_APP_IDS_DEFAULT; }
  catch { return QUICK_APP_IDS_DEFAULT; }
}

// ── useCountUp — smooth number animation ──────────────────────────────────
function useCountUp(target, duration = 800, delay = 0) {
  const [val, setVal] = useState(0);
  useEffect(() => {
    if (!target) return;
    let start = null;
    let frame;
    const begin = () => {
      frame = requestAnimationFrame((ts) => {
        if (!start) start = ts;
        const progress = Math.min((ts - start) / duration, 1);
        const ease = 1 - Math.pow(1 - progress, 3);
        setVal(Math.round(ease * target));
        if (progress < 1) begin();
      });
    };
    const t = setTimeout(begin, delay);
    return () => { clearTimeout(t); cancelAnimationFrame(frame); };
  }, [target, duration, delay]);
  return val;
}

// ── NeuralHeartbeat — animated grid lines in hero ─────────────────────────
function NeuralHeartbeat() {
  const canvasRef = useRef(null);
  useEffect(() => {
    const canvas = canvasRef.current;
    if (!canvas) return;
    const ctx = canvas.getContext("2d");
    let animId;
    let t = 0;
    const draw = () => {
      const { width: W, height: H } = canvas;
      ctx.clearRect(0, 0, W, H);
      ctx.strokeStyle = "rgba(0,240,255,0.06)";
      ctx.lineWidth = 1;
      // vertical grid lines
      for (let x = 0; x < W; x += 32) {
        ctx.beginPath(); ctx.moveTo(x, 0); ctx.lineTo(x, H); ctx.stroke();
      }
      // horizontal grid lines
      for (let y = 0; y < H; y += 24) {
        ctx.beginPath(); ctx.moveTo(0, y); ctx.lineTo(W, y); ctx.stroke();
      }
      // neural pulse wave
      ctx.beginPath();
      ctx.strokeStyle = "rgba(0,240,255,0.25)";
      ctx.lineWidth = 1.5;
      for (let x = 0; x <= W; x++) {
        const norm = x / W;
        const wave = Math.sin(norm * Math.PI * 6 + t) * 8 + H / 2;
        x === 0 ? ctx.moveTo(x, wave) : ctx.lineTo(x, wave);
      }
      ctx.stroke();
      t += 0.04;
      animId = requestAnimationFrame(draw);
    };
    const resize = () => {
      canvas.width = canvas.offsetWidth;
      canvas.height = canvas.offsetHeight;
    };
    resize();
    draw();
    window.addEventListener("resize", resize);
    return () => { cancelAnimationFrame(animId); window.removeEventListener("resize", resize); };
  }, []);
  return <canvas ref={canvasRef} className="absolute inset-0 w-full h-full pointer-events-none" />;
}

// ── CortexBanner ──────────────────────────────────────────────────────────
const BRIEFINGS = [
  "Memory layer is growing. Cortex has learned new context this session.",
  "No scheduled conflicts detected. Optimal window for deep focus work.",
  "AI utilization up this week. Cortex response time nominal.",
  "Your workspace is synchronized across all modules.",
  "All systems operational. Omniverse uptime holding at 100%.",
];
function CortexBanner({ user, now }) {
  const hour = now.getHours();
  const greeting = hour < 5 ? "Working late" : hour < 12 ? "Good morning" : hour < 17 ? "Good afternoon" : "Good evening";
  const [briefing] = useState(() => BRIEFINGS[Math.floor(Math.random() * BRIEFINGS.length)]);
  const sessionId = useRef(`OVS-${Date.now().toString(36).toUpperCase()}`);

  return (
    <motion.div
      initial={{ opacity: 0, y: -12 }}
      animate={{ opacity: 1, y: 0 }}
      transition={{ duration: 0.45, ease: [0.22, 1, 0.36, 1] }}
      className="rounded-2xl p-5 mb-5 relative overflow-hidden"
      style={{
        background: "linear-gradient(135deg, rgba(0,240,255,0.07), rgba(0,240,255,0.02) 60%, rgba(207,158,255,0.04))",
        border: "1px solid rgba(0,240,255,0.16)",
        minHeight: 108,
      }}
    >
      <NeuralHeartbeat />
      <div className="relative z-10">
        {/* Top strip */}
        <div className="flex items-center justify-between mb-3">
          <div className="flex items-center gap-2">
            <motion.span
              className="w-1.5 h-1.5 rounded-full inline-block"
              style={{ background: "#39FF14" }}
              animate={{ boxShadow: ["0 0 3px #39FF14", "0 0 9px #39FF14", "0 0 3px #39FF14"] }}
              transition={{ duration: 1.8, repeat: Infinity }}
            />
            <span className="font-mono text-[9px] tracking-[0.2em] text-slate-500 uppercase">
              Cortex v2.5-Flash · Session {sessionId.current}
            </span>
          </div>
          <div className="font-mono text-[10px] tabular-nums" style={{ color: "rgba(0,240,255,0.45)" }}>
            {now.toLocaleDateString(undefined, { weekday: "short", month: "short", day: "numeric" })}
            {" · "}
            {now.toLocaleTimeString([], { hour: "2-digit", minute: "2-digit", second: "2-digit" })}
          </div>
        </div>

        <div className="flex items-start justify-between gap-4">
          <div className="flex-1 min-w-0">
            <h1 className="font-heading text-2xl sm:text-3xl font-black tracking-tight mb-1">
              {greeting}, <span style={{ color: "#00F0FF" }}>{user?.name?.split(" ")[0] || "User"}</span>.
            </h1>
            <p className="text-sm text-slate-400 leading-relaxed max-w-md">
              <i className="fa-solid fa-wand-magic-sparkles text-[10px] mr-1.5" style={{ color: "#00F0FF" }} />
              {briefing}
            </p>
          </div>
          <div
            className="flex-shrink-0 w-11 h-11 rounded-2xl flex items-center justify-center"
            style={{ background: "rgba(0,240,255,0.1)", border: "1px solid rgba(0,240,255,0.22)" }}
          >
            <i className="fa-solid fa-infinity text-lg" style={{ color: "#00F0FF" }} />
          </div>
        </div>
      </div>
    </motion.div>
  );
}

// ── StatCard with count-up ────────────────────────────────────────────────
function StatCard({ label, value, numericValue, color, icon, delay = 0, sub, onClick }) {
  const counted = useCountUp(numericValue ?? null, 700, delay * 1000 + 100);
  const display = numericValue !== undefined ? (typeof value === "string" && value.includes("/")
    ? `${counted}/${numericValue.total ?? numericValue}`
    : counted)
    : value;

  return (
    <motion.div
      initial={{ opacity: 0, y: 12, scale: 0.96 }}
      animate={{ opacity: 1, y: 0, scale: 1 }}
      transition={{ delay, duration: 0.32, ease: [0.22, 1, 0.36, 1] }}
      className="glass-light rounded-2xl p-4 relative overflow-hidden cursor-pointer select-none"
      style={{ border: `1px solid ${color}18` }}
      whileHover={{ scale: 1.03, borderColor: `${color}35`, transition: { duration: 0.14 } }}
      whileTap={{ scale: 0.97 }}
      onClick={onClick}
    >
      <div
        className="absolute -top-5 -right-5 w-20 h-20 rounded-full pointer-events-none"
        style={{ background: `radial-gradient(circle, ${color}1E, transparent 70%)` }}
      />
      <div className="flex items-center justify-between mb-2 relative">
        <span className="mono-label text-[9px] tracking-widest">{label}</span>
        <div className="w-7 h-7 rounded-xl flex items-center justify-center flex-shrink-0" style={{ background: `${color}15` }}>
          <i className={`fa-solid ${icon} text-[11px]`} style={{ color }} />
        </div>
      </div>
      <div className="font-heading text-2xl font-bold relative tabular-nums" style={{ color }}>{display}</div>
      {sub && <div className="text-[9px] font-mono text-slate-600 mt-0.5">{sub}</div>}
    </motion.div>
  );
}

// ── Quick app icon ────────────────────────────────────────────────────────
function QuickApp({ app, onClick, delay, onRemove, editing }) {
  return (
    <motion.div className="relative" initial={{ opacity: 0, scale: 0.7 }} animate={{ opacity: 1, scale: 1 }}
      transition={{ delay, duration: 0.22, ease: [0.22, 1, 0.36, 1] }}>
      <motion.button
        data-testid={`quick-${app.id}`}
        onClick={onClick}
        whileHover={{ scale: 1.08, y: -2 }}
        whileTap={{ scale: 0.88 }}
        className="w-full aspect-square rounded-xl flex flex-col items-center justify-center gap-1.5 transition-colors"
        style={{ background: "rgba(255,255,255,0.03)", border: "1px solid rgba(255,255,255,0.07)", minHeight: 52 }}
      >
        <i className={`fa-solid ${app.icon} text-base`} style={{ color: app.color }} />
        <span className="text-[9px] font-mono text-slate-400 uppercase tracking-wide leading-none truncate w-full text-center px-1">{app.name}</span>
      </motion.button>
      {editing && (
        <motion.button
          initial={{ scale: 0 }} animate={{ scale: 1 }}
          onClick={(e) => { e.stopPropagation(); onRemove(app.id); }}
          className="absolute -top-1.5 -right-1.5 w-4 h-4 rounded-full flex items-center justify-center"
          style={{ background: "#FF003C", border: "1px solid rgba(255,0,60,0.4)", zIndex: 10 }}
        >
          <i className="fa-solid fa-xmark text-[8px] text-white" />
        </motion.button>
      )}
    </motion.div>
  );
}

// ── Activity tooltip ──────────────────────────────────────────────────────
function ActivityTooltip({ active, payload }) {
  if (!active || !payload?.length) return null;
  return (
    <div style={{ background: "rgba(6,8,18,0.97)", border: "1px solid rgba(0,240,255,0.2)", borderRadius: 10, padding: "6px 12px", fontFamily: "'JetBrains Mono',monospace", fontSize: 11, color: "#00F0FF" }}>
      {Math.round(payload[0].value)} events
    </div>
  );
}

// ── ProgressBar ───────────────────────────────────────────────────────────
function ProgressBar({ pct, color = "#00F0FF" }) {
  return (
    <div className="mt-3 h-1.5 rounded-full overflow-hidden" style={{ background: "rgba(255,255,255,0.05)" }}>
      <motion.div className="h-full rounded-full" initial={{ width: 0 }} animate={{ width: `${pct}%` }}
        transition={{ duration: 0.9, ease: [0.22, 1, 0.36, 1], delay: 0.3 }}
        style={{ background: `linear-gradient(90deg, ${color}, #39FF14)` }} />
    </div>
  );
}

// ── StatusRow ─────────────────────────────────────────────────────────────
function StatusRow({ name, uptime, delay }) {
  return (
    <motion.div initial={{ opacity: 0, x: -6 }} animate={{ opacity: 1, x: 0 }} transition={{ delay, duration: 0.2 }}
      className="flex items-center justify-between py-1.5" style={{ borderBottom: "1px solid rgba(255,255,255,0.04)" }}>
      <span className="text-sm text-slate-300">{name}</span>
      <div className="flex items-center gap-2">
        <motion.span className="w-1.5 h-1.5 rounded-full" style={{ background: "#39FF14" }}
          animate={{ boxShadow: ["0 0 4px #39FF14aa", "0 0 10px #39FF14", "0 0 4px #39FF14aa"] }}
          transition={{ duration: 2, repeat: Infinity }} />
        <span className="font-mono text-xs" style={{ color: "#39FF14" }}>ONLINE</span>
        <span className="text-slate-600 font-mono text-xs">{uptime}%</span>
      </div>
    </motion.div>
  );
}

// ── Focus item ────────────────────────────────────────────────────────────
function FocusItem({ text, tag, color, icon, delay }) {
  return (
    <motion.div initial={{ opacity: 0, x: -6 }} animate={{ opacity: 1, x: 0 }} transition={{ delay, duration: 0.22 }}
      className="flex items-center gap-3 py-2 px-3 rounded-xl"
      style={{ background: "rgba(255,255,255,0.02)", border: "1px solid rgba(255,255,255,0.04)" }}
      whileHover={{ borderColor: "rgba(255,255,255,0.1)", background: "rgba(255,255,255,0.04)", transition: { duration: 0.12 } }}>
      <div className="w-7 h-7 rounded-lg flex items-center justify-center flex-shrink-0" style={{ background: `${color}13` }}>
        <i className={`fa-solid ${icon} text-[11px]`} style={{ color }} />
      </div>
      <span className="text-sm flex-1 text-slate-300 leading-snug">{text}</span>
      <span className="font-mono text-[9px] px-2 py-0.5 rounded-md flex-shrink-0"
        style={{ background: `${color}10`, color, border: `1px solid ${color}22` }}>{tag}</span>
    </motion.div>
  );
}

// ── AI Intelligence panel ─────────────────────────────────────────────────
function AIIntelligencePanel({ stats, delay = 0.44 }) {
  const providers = [
    { name: "Gemini 2.5 Flash", role: "Primary", color: "#00F0FF", pct: 72 },
    { name: "Groq (Fallback)",  role: "Fallback", color: "#CF9EFF", pct: 18 },
    { name: "Cerebras",         role: "Burst",    color: "#FCEE09", pct: 10 },
  ];
  return (
    <motion.div initial={{ opacity: 0, y: 8 }} animate={{ opacity: 1, y: 0 }}
      transition={{ delay, duration: 0.32, ease: [0.22, 1, 0.36, 1] }}
      className="glass-light rounded-2xl p-5" style={{ border: "1px solid rgba(0,240,255,0.07)" }}>
      <div className="mono-label text-[10px] mb-0.5">// AI Intelligence</div>
      <h3 className="font-heading text-lg font-bold mb-3">Cortex Status</h3>

      <div className="space-y-2.5">
        {providers.map((p, i) => (
          <motion.div key={p.name} initial={{ opacity: 0, x: -4 }} animate={{ opacity: 1, x: 0 }}
            transition={{ delay: delay + 0.06 + i * 0.05, duration: 0.2 }}>
            <div className="flex items-center justify-between mb-1">
              <div className="flex items-center gap-1.5">
                <span className="text-xs text-slate-300 font-medium">{p.name}</span>
                <span className="font-mono text-[8px] px-1.5 py-0.5 rounded"
                  style={{ background: `${p.color}10`, color: p.color, border: `1px solid ${p.color}20` }}>{p.role}</span>
              </div>
              <span className="font-mono text-[10px]" style={{ color: p.color }}>{p.pct}%</span>
            </div>
            <div className="h-1 rounded-full overflow-hidden" style={{ background: "rgba(255,255,255,0.05)" }}>
              <motion.div className="h-full rounded-full" initial={{ width: 0 }} animate={{ width: `${p.pct}%` }}
                transition={{ delay: delay + 0.15 + i * 0.06, duration: 0.7, ease: [0.22, 1, 0.36, 1] }}
                style={{ background: p.color }} />
            </div>
          </motion.div>
        ))}
      </div>

      <div className="mt-3 pt-3 flex items-center justify-between" style={{ borderTop: "1px solid rgba(255,255,255,0.05)" }}>
        <span className="text-[10px] font-mono text-slate-500">{stats.messages ?? 0} queries this session</span>
        <div className="flex items-center gap-1">
          <motion.span className="w-1.5 h-1.5 rounded-full" style={{ background: "#39FF14" }}
            animate={{ boxShadow: ["0 0 3px #39FF14", "0 0 8px #39FF14", "0 0 3px #39FF14"] }}
            transition={{ duration: 2, repeat: Infinity }} />
          <span className="font-mono text-[9px]" style={{ color: "#39FF14" }}>NOMINAL</span>
        </div>
      </div>
    </motion.div>
  );
}

// ── App picker modal ──────────────────────────────────────────────────────
function AppPickerModal({ current, onSave, onClose }) {
  const [selected, setSelected] = useState(current);
  const allApps = APPS.filter(a => a.id !== "settings");
  const toggle = (id) => setSelected(s => s.includes(id) ? s.filter(x => x !== id) : [...s, id]);
  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-4"
      style={{ background: "rgba(0,0,0,0.72)", backdropFilter: "blur(8px)" }} onClick={onClose}>
      <motion.div initial={{ opacity: 0, scale: 0.88 }} animate={{ opacity: 1, scale: 1 }}
        transition={{ type: "spring", stiffness: 380, damping: 28 }}
        className="w-full max-w-sm rounded-2xl overflow-hidden"
        style={{ background: "rgba(6,8,16,0.98)", border: "1px solid rgba(0,240,255,0.18)", boxShadow: "0 32px 80px rgba(0,0,0,0.85)" }}
        onClick={e => e.stopPropagation()}>
        <div className="flex items-center justify-between p-4" style={{ borderBottom: "1px solid rgba(255,255,255,0.07)" }}>
          <div>
            <div className="mono-label text-[9px]">// Quick Launch</div>
            <h3 className="font-heading text-lg font-bold">Customize Apps</h3>
          </div>
          <button onClick={onClose} className="neon-btn !py-1 !px-2.5"><i className="fa-solid fa-xmark text-xs" /></button>
        </div>
        <div className="p-4 grid grid-cols-4 gap-2 max-h-64 overflow-y-auto scrollbar-none">
          {allApps.map(app => (
            <motion.button key={app.id} onClick={() => toggle(app.id)} whileTap={{ scale: 0.9 }}
              className="aspect-square rounded-xl flex flex-col items-center justify-center gap-1 relative"
              style={{ background: selected.includes(app.id) ? `${app.color}13` : "rgba(255,255,255,0.03)", border: selected.includes(app.id) ? `1px solid ${app.color}40` : "1px solid rgba(255,255,255,0.06)" }}>
              <i className={`fa-solid ${app.icon} text-sm`} style={{ color: app.color }} />
              <span className="text-[8px] font-mono text-slate-400 leading-none text-center px-1 truncate w-full">{app.name}</span>
              {selected.includes(app.id) && (
                <div className="absolute top-1 right-1 w-3.5 h-3.5 rounded-full flex items-center justify-center" style={{ background: app.color }}>
                  <i className="fa-solid fa-check text-[7px] text-black" />
                </div>
              )}
            </motion.button>
          ))}
        </div>
        <div className="p-4 flex gap-2" style={{ borderTop: "1px solid rgba(255,255,255,0.07)" }}>
          <button onClick={onClose} className="neon-btn flex-1 justify-center">Cancel</button>
          <button onClick={() => { onSave(selected); onClose(); }} className="neon-btn primary flex-1 justify-center">Save</button>
        </div>
      </motion.div>
    </div>
  );
}

// ── Constants ─────────────────────────────────────────────────────────────
const SERVICES = [
  { name: "AI Cortex",    uptime: 99.9  },
  { name: "Memory Layer", uptime: 99.7  },
  { name: "Network Mesh", uptime: 100.0 },
  { name: "Storage Pool", uptime: 98.8  },
];

const TODAY_FOCUS = [
  { text: "Review AI model integrations",  tag: "Dev",   color: "#00F0FF", icon: "fa-code"        },
  { text: "Update project roadmap notes",  tag: "Notes", color: "#FCEE09", icon: "fa-note-sticky" },
  { text: "Weekly sync — 3:00 PM",         tag: "Event", color: "#FF003C", icon: "fa-calendar"    },
  { text: "Deploy v2.1 final build",       tag: "Task",  color: "#39FF14", icon: "fa-list-check"  },
];

// ── Dashboard ─────────────────────────────────────────────────────────────
export default function Dashboard() {
  const { user, openApp } = useOS();
  const [stats, setStats]             = useState({});
  const [now, setNow]                 = useState(new Date());
  const [quickIds, setQuickIds]       = useState(getQuickApps);
  const [editingQuick, setEditingQuick] = useState(false);
  const [showPicker, setShowPicker]   = useState(false);

  useEffect(() => {
    analytics().then(setStats).catch(() => {});
    const t = setInterval(() => setNow(new Date()), 1000);
    return () => clearInterval(t);
  }, []); // eslint-disable-line react-hooks/exhaustive-deps

  const saveQuick = (ids) => { setQuickIds(ids); localStorage.setItem(LS_QUICK, JSON.stringify(ids)); };
  const removeQuickApp = (id) => saveQuick(quickIds.filter(x => x !== id));

  const completionPct  = stats.tasks ? Math.round((stats.tasks_done / stats.tasks) * 100) : 0;
  const quickApps      = quickIds.map(id => APPS.find(a => a.id === id)).filter(Boolean).slice(0, 10);
  const pctColor       = completionPct >= 80 ? "#39FF14" : completionPct >= 40 ? "#FCEE09" : "#FF003C";

  const STATS = [
    { label: "Notes",    value: stats.notes ?? 0,                          numericValue: stats.notes ?? 0,       color: "#FCEE09", icon: "fa-note-sticky", sub: "documents", onClick: () => openApp("notes")    },
    { label: "Tasks",    value: `${stats.tasks_done ?? 0}/${stats.tasks ?? 0}`, numericValue: stats.tasks_done ?? 0, color: "#00F0FF", icon: "fa-list-check",  sub: "completed", onClick: () => openApp("tasks")    },
    { label: "Events",   value: stats.events ?? 0,                         numericValue: stats.events ?? 0,      color: "#FF003C", icon: "fa-calendar",    sub: "scheduled", onClick: () => openApp("calendar") },
    { label: "Memories", value: stats.memories ?? 0,                       numericValue: stats.memories ?? 0,    color: "#C778DD", icon: "fa-brain",        sub: "stored",    onClick: () => openApp("memory")   },
  ];

  return (
    <div className="w-full h-full overflow-y-auto p-4 sm:p-6 text-white scrollbar-none" data-testid="dashboard-app">

      {/* Cinematic Cortex Banner */}
      <CortexBanner user={user} now={now} />

      {/* Stat cards — clickable, with count-up animation */}
      <div className="grid grid-cols-2 sm:grid-cols-4 gap-3 mb-5">
        {STATS.map((s, i) => <StatCard key={s.label} {...s} delay={i * 0.07} />)}
      </div>

      {/* Row 2: Today's Focus + Activity Chart */}
      <div className="grid grid-cols-1 md:grid-cols-3 gap-4 mb-4">
        {/* Today's Focus */}
        <motion.div initial={{ opacity: 0, y: 8 }} animate={{ opacity: 1, y: 0 }}
          transition={{ delay: 0.28, duration: 0.32, ease: [0.22, 1, 0.36, 1] }}
          className="glass-light rounded-2xl p-5 md:col-span-2" style={{ border: "1px solid rgba(255,255,255,0.05)" }}>
          <div className="flex items-center justify-between mb-3">
            <div>
              <div className="mono-label text-[10px]">// Cortex</div>
              <h3 className="font-heading text-lg font-bold">Today's Focus</h3>
            </div>
            <span className="text-[9px] font-mono px-2 py-1 rounded-lg"
              style={{ background: "rgba(0,240,255,0.08)", color: "#00F0FF" }}>
              {now.toLocaleDateString(undefined, { weekday: "long" })}
            </span>
          </div>
          <div className="space-y-1.5">
            {TODAY_FOCUS.map((f, i) => <FocusItem key={i} {...f} delay={0.32 + i * 0.05} />)}
          </div>
        </motion.div>

        {/* Activity sparkline */}
        <motion.div initial={{ opacity: 0, y: 8 }} animate={{ opacity: 1, y: 0 }}
          transition={{ delay: 0.33, duration: 0.32, ease: [0.22, 1, 0.36, 1] }}
          className="glass-light rounded-2xl p-5" style={{ border: "1px solid rgba(255,255,255,0.05)" }}>
          <div className="mono-label text-[10px] mb-0.5">// Activity</div>
          <h3 className="font-heading text-lg font-bold mb-2">14-day trend</h3>
          <div className="h-28">
            <ResponsiveContainer width="100%" height="100%">
              <AreaChart data={fakeActivity} margin={{ top: 2, right: 2, bottom: 0, left: -24 }}>
                <defs>
                  <linearGradient id="actGrad3" x1="0" y1="0" x2="0" y2="1">
                    <stop offset="0%" stopColor="#00F0FF" stopOpacity={0.45} />
                    <stop offset="100%" stopColor="#00F0FF" stopOpacity={0} />
                  </linearGradient>
                </defs>
                <Tooltip content={<ActivityTooltip />} cursor={{ stroke: "rgba(0,240,255,0.18)", strokeWidth: 1 }} />
                <Area dataKey="y" stroke="#00F0FF" fill="url(#actGrad3)" strokeWidth={1.8} dot={false}
                  isAnimationActive animationDuration={1200} />
              </AreaChart>
            </ResponsiveContainer>
          </div>
          <div className="mt-2 text-[10px] font-mono text-slate-500">
            +{stats.messages ?? 0} AI queries this period
          </div>
        </motion.div>
      </div>

      {/* Row 3: Quick Launch + System Status + AI Intelligence */}
      <div className="grid grid-cols-1 md:grid-cols-3 gap-4 mb-4">

        {/* Quick launch */}
        <motion.div initial={{ opacity: 0, y: 8 }} animate={{ opacity: 1, y: 0 }}
          transition={{ delay: 0.36, duration: 0.32, ease: [0.22, 1, 0.36, 1] }}
          className="glass-light rounded-2xl p-5" style={{ border: "1px solid rgba(255,255,255,0.05)" }}>
          <div className="flex items-center justify-between mb-3">
            <div>
              <div className="mono-label text-[10px]">// Quick Launch</div>
              <h3 className="font-heading text-lg font-bold">Apps</h3>
            </div>
            <div className="flex gap-1.5">
              {editingQuick && (
                <button onClick={() => setShowPicker(true)} className="neon-btn !py-1 !px-2 text-[10px]">
                  <i className="fa-solid fa-plus" />
                </button>
              )}
              <button onClick={() => setEditingQuick(e => !e)} className="neon-btn !py-1 !px-2 text-[10px]"
                style={editingQuick ? { borderColor: "rgba(0,240,255,0.4)", color: "#00F0FF" } : {}}>
                <i className={`fa-solid ${editingQuick ? "fa-check" : "fa-pen"} text-[9px]`} />
              </button>
            </div>
          </div>
          <div className="grid grid-cols-5 gap-2">
            {quickApps.map((app, i) => (
              <QuickApp key={app.id} app={app} onClick={() => { if (!editingQuick) openApp(app.id); }}
                delay={0.38 + i * 0.03} editing={editingQuick} onRemove={removeQuickApp} />
            ))}
          </div>
        </motion.div>

        {/* System status */}
        <motion.div initial={{ opacity: 0, y: 8 }} animate={{ opacity: 1, y: 0 }}
          transition={{ delay: 0.4, duration: 0.3 }}
          className="glass-light rounded-2xl p-5" style={{ border: "1px solid rgba(255,255,255,0.05)" }}>
          <div className="mono-label text-[10px] mb-0.5">// System Status</div>
          <h3 className="font-heading text-lg font-bold mb-3">All systems nominal</h3>
          {SERVICES.map((s, i) => <StatusRow key={s.name} name={s.name} uptime={s.uptime} delay={0.42 + i * 0.06} />)}
        </motion.div>

        {/* AI Intelligence */}
        <AIIntelligencePanel stats={stats} delay={0.44} />
      </div>

      {/* Row 4: Productivity score */}
      <motion.div initial={{ opacity: 0, y: 8 }} animate={{ opacity: 1, y: 0 }}
        transition={{ delay: 0.5, duration: 0.3 }}
        className="glass-light rounded-2xl p-5 mb-4" style={{ border: "1px solid rgba(255,255,255,0.05)" }}>
        <div className="flex items-start justify-between gap-4">
          <div className="flex-1">
            <div className="mono-label text-[10px] mb-0.5">// Workspace Analytics</div>
            <h3 className="font-heading text-lg font-bold mb-2">Productivity Score</h3>
            <div className="flex items-end gap-3">
              <div className="font-mono text-4xl font-bold tabular-nums" style={{ color: pctColor }}>
                {completionPct}%
              </div>
              <div className="mb-1">
                <div className="text-xs text-slate-400">task completion</div>
                <div className="text-[10px] font-mono text-slate-500">{stats.tasks_done ?? 0} of {stats.tasks ?? 0} done</div>
              </div>
            </div>
            <ProgressBar pct={completionPct} color={pctColor} />
          </div>
          <div className="flex-shrink-0 text-right">
            <div className="flex items-center gap-1.5 mb-1 justify-end">
              <i className="fa-solid fa-wand-magic-sparkles text-[10px]" style={{ color: "#00F0FF" }} />
              <span className="font-mono text-[9px] text-slate-500 uppercase tracking-widest">Cortex</span>
            </div>
            <p className="text-[11px] text-slate-400 leading-relaxed max-w-xs text-right">
              {completionPct >= 80
                ? "Excellent progress. You're in the top 20% of your weekly average."
                : completionPct >= 40
                ? "Solid momentum — complete 2 more tasks to hit your daily goal."
                : "Let's pick up the pace. Open Tasks to see your priorities."}
            </p>
          </div>
        </div>
      </motion.div>

      {/* App picker modal */}
      <AnimatePresence>
        {showPicker && (
          <AppPickerModal current={quickIds} onSave={saveQuick} onClose={() => setShowPicker(false)} />
        )}
      </AnimatePresence>
    </div>
  );
}
