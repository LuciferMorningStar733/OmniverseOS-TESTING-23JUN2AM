import React, { useEffect, useState } from "react";
import { motion, AnimatePresence } from "framer-motion";
import { useOS } from "../context/OSContext";
import { analytics } from "../lib/api";
import { APPS } from "../lib/apps";
import { AreaChart, Area, ResponsiveContainer, Tooltip } from "recharts";

/* ─────────────────────────────────────────────────────────────────────────────
   Activity data (sparkline demo)
   ───────────────────────────────────────────────────────────────────────────── */
const fakeData = Array.from({ length: 14 }, (_, i) => ({
  x: i,
  y: 30 + Math.sin(i / 2) * 25 + Math.random() * 20,
}));

/* ─────────────────────────────────────────────────────────────────────────────
   Animated stat card
   ───────────────────────────────────────────────────────────────────────────── */
function StatCard({ label, value, color, icon, delay = 0 }) {
  return (
    <motion.div
      initial={{ opacity: 0, y: 10, scale: 0.97 }}
      animate={{ opacity: 1, y: 0, scale: 1 }}
      transition={{ delay, duration: 0.32, ease: [0.22, 1, 0.36, 1] }}
      className="glass-light rounded-2xl p-4 relative overflow-hidden"
      style={{ border: `1px solid ${color}16` }}
      whileHover={{ scale: 1.02, transition: { duration: 0.18 } }}
    >
      {/* Subtle corner glow */}
      <div
        className="absolute -top-4 -right-4 w-16 h-16 rounded-full pointer-events-none"
        style={{ background: `radial-gradient(circle, ${color}1A, transparent 70%)` }}
      />
      <div className="flex items-center justify-between mb-2 relative">
        <span className="mono-label text-[10px]">{label}</span>
        <div
          className="w-7 h-7 rounded-xl flex items-center justify-center flex-shrink-0"
          style={{ background: `${color}18` }}
        >
          <i className={`fa-solid ${icon} text-[11px]`} style={{ color }} />
        </div>
      </div>
      <div className="font-heading text-2xl font-bold relative" style={{ color }}>
        {value}
      </div>
    </motion.div>
  );
}

/* ─────────────────────────────────────────────────────────────────────────────
   Quick launch icon
   ───────────────────────────────────────────────────────────────────────────── */
function QuickApp({ app, onClick, delay }) {
  return (
    <motion.button
      data-testid={`quick-${app.id}`}
      onClick={onClick}
      initial={{ opacity: 0, scale: 0.8 }}
      animate={{ opacity: 1, scale: 1 }}
      transition={{ delay, duration: 0.22, ease: [0.22, 1, 0.36, 1] }}
      whileHover={{ scale: 1.06, y: -2 }}
      whileTap={{ scale: 0.9 }}
      className="aspect-square rounded-xl flex flex-col items-center justify-center gap-1.5 transition-colors"
      style={{
        background: "rgba(255,255,255,0.03)",
        border: "1px solid rgba(255,255,255,0.06)",
        minHeight: 52,
      }}
    >
      <i className={`fa-solid ${app.icon} text-base`} style={{ color: app.color }} />
      <span className="text-[9px] font-mono text-slate-400 uppercase tracking-wide leading-none">
        {app.name}
      </span>
    </motion.button>
  );
}

/* ─────────────────────────────────────────────────────────────────────────────
   Custom area chart tooltip
   ───────────────────────────────────────────────────────────────────────────── */
function ActivityTooltip({ active, payload }) {
  if (!active || !payload?.length) return null;
  return (
    <div style={{
      background: "rgba(8,10,18,0.95)",
      border: "1px solid rgba(0,240,255,0.2)",
      borderRadius: 10, padding: "6px 12px",
      fontFamily: "'JetBrains Mono', monospace", fontSize: 11,
      color: "#00F0FF",
    }}>
      {Math.round(payload[0].value)} msgs
    </div>
  );
}

/* ─────────────────────────────────────────────────────────────────────────────
   Animated progress bar
   ───────────────────────────────────────────────────────────────────────────── */
function ProgressBar({ pct, color = "#00F0FF" }) {
  return (
    <div
      className="mt-3 h-1.5 rounded-full overflow-hidden"
      style={{ background: "rgba(255,255,255,0.05)" }}
    >
      <motion.div
        className="h-full rounded-full"
        initial={{ width: 0 }}
        animate={{ width: `${pct}%` }}
        transition={{ duration: 0.9, ease: [0.22, 1, 0.36, 1], delay: 0.3 }}
        style={{ background: `linear-gradient(90deg, ${color}, #39FF14)` }}
      />
    </div>
  );
}

/* ─────────────────────────────────────────────────────────────────────────────
   System status dot
   ───────────────────────────────────────────────────────────────────────────── */
function StatusRow({ name, uptime, delay }) {
  return (
    <motion.div
      initial={{ opacity: 0, x: -6 }}
      animate={{ opacity: 1, x: 0 }}
      transition={{ delay, duration: 0.2, ease: "easeOut" }}
      className="flex items-center justify-between py-1.5"
      style={{ borderBottom: "1px solid rgba(255,255,255,0.04)" }}
    >
      <span className="text-sm text-slate-300">{name}</span>
      <div className="flex items-center gap-2">
        <motion.span
          className="w-1.5 h-1.5 rounded-full"
          style={{ background: "#39FF14" }}
          animate={{ boxShadow: ["0 0 4px #39FF14aa", "0 0 10px #39FF14", "0 0 4px #39FF14aa"] }}
          transition={{ duration: 2, repeat: Infinity, ease: "easeInOut" }}
        />
        <span className="font-mono text-xs text-[#39FF14]">ONLINE</span>
        <span className="text-slate-600 font-mono text-xs">{uptime}%</span>
      </div>
    </motion.div>
  );
}

/* ─────────────────────────────────────────────────────────────────────────────
   Dashboard
   ───────────────────────────────────────────────────────────────────────────── */
const QUICK_APP_IDS = ["chat", "image", "notes", "tasks", "calendar", "music", "code", "finance"];

export default function Dashboard() {
  const { user, openApp } = useOS();
  const [stats, setStats]   = useState({});
  const [now, setNow]       = useState(new Date());

  useEffect(() => {
    analytics().then(setStats).catch(() => {});
    const t = setInterval(() => setNow(new Date()), 1000);
    return () => clearInterval(t);
  }, []);

  const completionPct = stats.tasks
    ? Math.round((stats.tasks_done / stats.tasks) * 100)
    : 0;

  const quickApps = QUICK_APP_IDS
    .map((id) => APPS.find((a) => a.id === id))
    .filter(Boolean);

  const STATS = [
    { label: "Notes",       value: stats.notes ?? 0,                                      color: "#FCEE09", icon: "fa-note-sticky"    },
    { label: "Tasks",       value: `${stats.tasks_done ?? 0}/${stats.tasks ?? 0}`,         color: "#00F0FF", icon: "fa-list-check"      },
    { label: "Events",      value: stats.events ?? 0,                                     color: "#FF003C", icon: "fa-calendar"        },
    { label: "Net Balance", value: `$${((stats.net ?? 0) < 0 ? "-" : "")}${Math.abs(stats.net ?? 0).toFixed(0)}`, color: "#39FF14", icon: "fa-coins" },
  ];

  const SERVICES = [
    { name: "AI Cortex",     uptime: 99.9  },
    { name: "Memory Layer",  uptime: 99.7  },
    { name: "Network Mesh",  uptime: 100.0 },
    { name: "Storage Pool",  uptime: 98.8  },
  ];

  return (
    <div className="w-full h-full overflow-y-auto p-4 sm:p-6 text-white scrollbar-none" data-testid="dashboard-app">

      {/* ── Header ──────────────────────────────────────────────── */}
      <motion.div
        initial={{ opacity: 0, y: -8 }}
        animate={{ opacity: 1, y: 0 }}
        transition={{ duration: 0.3, ease: [0.22, 1, 0.36, 1] }}
        className="flex flex-col sm:flex-row sm:items-start sm:justify-between mb-6 gap-2"
      >
        <div>
          <div className="mono-label text-[10px] mb-0.5">
            // {now.toLocaleDateString(undefined, { weekday: "long", month: "long", day: "numeric" })}
          </div>
          <h1 className="font-heading text-3xl sm:text-4xl font-black tracking-tighter">
            Hello, {user?.name?.split(" ")[0] || "User"}.
          </h1>
          <p className="text-slate-400 mt-1 text-sm">Your AI workspace is online and synced.</p>
        </div>
        <div className="sm:text-right flex-shrink-0">
          <div className="font-mono text-2xl sm:text-3xl font-bold tabular-nums">
            {now.toLocaleTimeString([], { hour: "2-digit", minute: "2-digit" })}
          </div>
          <div className="mono-label text-[10px] opacity-50 mt-0.5">
            {now.toLocaleDateString(undefined, { year: "numeric" })}
          </div>
        </div>
      </motion.div>

      {/* ── Stat cards ──────────────────────────────────────────── */}
      <div className="grid grid-cols-2 sm:grid-cols-4 gap-3 mb-5">
        {STATS.map((s, i) => (
          <StatCard key={s.label} {...s} delay={i * 0.07} />
        ))}
      </div>

      {/* ── Activity + Quick launch ──────────────────────────────── */}
      <div className="grid grid-cols-1 md:grid-cols-3 gap-4 mb-4">

        {/* Activity chart */}
        <motion.div
          initial={{ opacity: 0, y: 8 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ delay: 0.28, duration: 0.32, ease: [0.22, 1, 0.36, 1] }}
          className="md:col-span-2 glass-light rounded-2xl p-5"
          style={{ border: "1px solid rgba(255,255,255,0.05)" }}
        >
          <div className="flex items-center justify-between mb-3">
            <div>
              <div className="mono-label text-[10px]">// Activity</div>
              <h3 className="font-heading text-lg font-bold">Last 14 days</h3>
            </div>
            <span
              className="text-xs font-mono px-2.5 py-1 rounded-lg"
              style={{ background: "rgba(0,240,255,0.08)", color: "#00F0FF" }}
            >
              +{stats.messages ?? 0} msgs
            </span>
          </div>
          <div className="h-40">
            <ResponsiveContainer width="100%" height="100%">
              <AreaChart data={fakeData} margin={{ top: 2, right: 2, bottom: 0, left: -24 }}>
                <defs>
                  <linearGradient id="actGrad" x1="0" y1="0" x2="0" y2="1">
                    <stop offset="0%"   stopColor="#00F0FF" stopOpacity={0.5} />
                    <stop offset="100%" stopColor="#00F0FF" stopOpacity={0}   />
                  </linearGradient>
                </defs>
                <Tooltip content={<ActivityTooltip />} cursor={{ stroke: "rgba(0,240,255,0.2)", strokeWidth: 1 }} />
                <Area
                  dataKey="y"
                  stroke="#00F0FF"
                  fill="url(#actGrad)"
                  strokeWidth={2}
                  dot={false}
                  isAnimationActive
                  animationDuration={1200}
                  animationEasing="ease-out"
                />
              </AreaChart>
            </ResponsiveContainer>
          </div>
        </motion.div>

        {/* Quick launch */}
        <motion.div
          initial={{ opacity: 0, y: 8 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ delay: 0.32, duration: 0.32, ease: [0.22, 1, 0.36, 1] }}
          className="glass-light rounded-2xl p-5"
          style={{ border: "1px solid rgba(255,255,255,0.05)" }}
        >
          <div className="mono-label text-[10px] mb-0.5">// Quick Launch</div>
          <h3 className="font-heading text-lg font-bold mb-3">Apps</h3>
          <div className="grid grid-cols-4 gap-2">
            {quickApps.map((app, i) => (
              <QuickApp
                key={app.id}
                app={app}
                onClick={() => openApp(app.id)}
                delay={0.36 + i * 0.04}
              />
            ))}
          </div>
        </motion.div>
      </div>

      {/* ── System status + Productivity ────────────────────────── */}
      <div className="grid grid-cols-1 md:grid-cols-3 gap-4">

        <motion.div
          initial={{ opacity: 0, y: 8 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ delay: 0.42, duration: 0.3 }}
          className="glass-light rounded-2xl p-5 md:col-span-2"
          style={{ border: "1px solid rgba(255,255,255,0.05)" }}
        >
          <div className="mono-label text-[10px] mb-0.5">// System Status</div>
          <h3 className="font-heading text-lg font-bold mb-3">All systems nominal</h3>
          <div>
            {SERVICES.map((s, i) => (
              <StatusRow key={s.name} name={s.name} uptime={s.uptime} delay={0.44 + i * 0.06} />
            ))}
          </div>
        </motion.div>

        <motion.div
          initial={{ opacity: 0, y: 8 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ delay: 0.46, duration: 0.3 }}
          className="glass-light rounded-2xl p-5"
          style={{ border: "1px solid rgba(255,255,255,0.05)" }}
        >
          <div className="mono-label text-[10px] mb-0.5">// Workspace</div>
          <h3 className="font-heading text-lg font-bold mb-2">Productivity</h3>
          <div
            className="font-mono text-3xl font-bold tabular-nums"
            style={{ color: completionPct >= 80 ? "#39FF14" : completionPct >= 40 ? "#FCEE09" : "#FF003C" }}
          >
            {completionPct}%
          </div>
          <div className="text-xs text-slate-400 mt-0.5">Task completion rate</div>
          <ProgressBar
            pct={completionPct}
            color={completionPct >= 80 ? "#39FF14" : completionPct >= 40 ? "#FCEE09" : "#FF003C"}
          />
          <div className="mt-3 flex items-center gap-1.5 text-[11px] font-mono text-slate-500">
            <i className="fa-solid fa-check-double text-[#39FF14] text-[10px]" />
            {stats.tasks_done ?? 0} of {stats.tasks ?? 0} done
          </div>
        </motion.div>
      </div>
    </div>
  );
}
