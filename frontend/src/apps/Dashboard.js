import React, { useEffect, useState } from "react";
import { useOS } from "../context/OSContext";
import { analytics } from "../lib/api";
import { APPS } from "../lib/apps";
import { AreaChart, Area, ResponsiveContainer, Tooltip } from "recharts";

const fakeData = Array.from({ length: 14 }, (_, i) => ({ x: i, y: 30 + Math.sin(i / 2) * 25 + Math.random() * 20 }));

export default function Dashboard() {
  const { user, openApp } = useOS();
  const [stats, setStats] = useState({});
  const [now, setNow] = useState(new Date());

  useEffect(() => {
    analytics().then(setStats).catch(() => {});
    const t = setInterval(() => setNow(new Date()), 1000);
    return () => clearInterval(t);
  }, []);

  const quick = ["chat", "image", "notes", "tasks", "calendar", "music", "code", "finance"];

  return (
    <div className="w-full h-full overflow-y-auto p-6 text-white" data-testid="dashboard-app">
      <div className="flex items-center justify-between mb-6">
        <div>
          <div className="mono-label">// {now.toLocaleDateString(undefined, { weekday: "long" })}</div>
          <h1 className="font-heading text-4xl font-black tracking-tighter">Hello, {user?.name?.split(" ")[0]}.</h1>
          <p className="text-slate-400 mt-1 text-sm">Your AI workspace is online and synced.</p>
        </div>
        <div className="text-right">
          <div className="font-mono text-3xl font-bold">{now.toLocaleTimeString([], { hour: "2-digit", minute: "2-digit" })}</div>
          <div className="mono-label opacity-60">{now.toLocaleTimeString([], { second: "2-digit" })}s</div>
        </div>
      </div>

      <div className="grid grid-cols-4 gap-3 mb-6">
        {[
          { label: "Notes", v: stats.notes ?? 0, c: "#FCEE09", i: "fa-note-sticky" },
          { label: "Tasks", v: `${stats.tasks_done ?? 0}/${stats.tasks ?? 0}`, c: "#00F0FF", i: "fa-list-check" },
          { label: "Events", v: stats.events ?? 0, c: "#FF003C", i: "fa-calendar" },
          { label: "Net Balance", v: `$${(stats.net ?? 0).toFixed(0)}`, c: "#39FF14", i: "fa-coins" },
        ].map((s) => (
          <div key={s.label} className="glass-light rounded-xl p-4">
            <div className="flex items-center justify-between mb-2">
              <span className="mono-label opacity-80">{s.label}</span>
              <i className={`fa-solid ${s.i}`} style={{ color: s.c }}></i>
            </div>
            <div className="font-heading text-2xl font-bold">{s.v}</div>
          </div>
        ))}
      </div>

      <div className="grid grid-cols-3 gap-4">
        <div className="col-span-2 glass-light rounded-xl p-5">
          <div className="flex items-center justify-between mb-3">
            <div>
              <div className="mono-label">// Activity</div>
              <h3 className="font-heading text-lg font-bold">Last 14 days</h3>
            </div>
            <span className="text-[#00F0FF] text-xs font-mono">+{stats.messages ?? 0} msgs</span>
          </div>
          <div className="h-44">
            <ResponsiveContainer width="100%" height="100%">
              <AreaChart data={fakeData}>
                <defs>
                  <linearGradient id="g1" x1="0" y1="0" x2="0" y2="1">
                    <stop offset="0%" stopColor="#00F0FF" stopOpacity={0.6} />
                    <stop offset="100%" stopColor="#00F0FF" stopOpacity={0} />
                  </linearGradient>
                </defs>
                <Tooltip contentStyle={{ background: "#0A0A0F", border: "1px solid rgba(0,240,255,0.3)", borderRadius: 8 }} />
                <Area dataKey="y" stroke="#00F0FF" fill="url(#g1)" strokeWidth={2} />
              </AreaChart>
            </ResponsiveContainer>
          </div>
        </div>

        <div className="glass-light rounded-xl p-5">
          <div className="mono-label">// Quick Launch</div>
          <h3 className="font-heading text-lg font-bold mb-3">Apps</h3>
          <div className="grid grid-cols-4 gap-2">
            {quick.map((id) => {
              const a = APPS.find((x) => x.id === id);
              return (
                <button
                  key={id}
                  data-testid={`quick-${id}`}
                  onClick={() => openApp(id)}
                  className="aspect-square rounded-lg flex flex-col items-center justify-center gap-1 hover:bg-white/10 transition border border-white/5"
                >
                  <i className={`fa-solid ${a.icon}`} style={{ color: a.color }}></i>
                  <span className="text-[9px] text-slate-400">{a.name}</span>
                </button>
              );
            })}
          </div>
        </div>
      </div>

      <div className="grid grid-cols-3 gap-4 mt-4">
        <div className="glass-light rounded-xl p-5 col-span-2">
          <div className="mono-label">// System Status</div>
          <h3 className="font-heading text-lg font-bold mb-3">All systems nominal</h3>
          <div className="space-y-2 text-sm">
            {["AI Cortex", "Memory Layer", "Network Mesh", "Storage Pool"].map((s, i) => (
              <div key={s} className="flex items-center justify-between">
                <span className="text-slate-300">{s}</span>
                <div className="flex items-center gap-2">
                  <span className="w-1.5 h-1.5 rounded-full bg-[#39FF14] pulse-glow"></span>
                  <span className="font-mono text-xs text-[#39FF14]">ONLINE</span>
                  <span className="text-slate-500 font-mono text-xs">{(98 + i * 0.3).toFixed(1)}%</span>
                </div>
              </div>
            ))}
          </div>
        </div>
        <div className="glass-light rounded-xl p-5">
          <div className="mono-label">// Workspace</div>
          <h3 className="font-heading text-lg font-bold mb-2">Productivity</h3>
          <div className="text-3xl font-mono font-bold text-[#39FF14]">
            {stats.tasks ? Math.round((stats.tasks_done / stats.tasks) * 100) : 0}%
          </div>
          <div className="text-xs text-slate-400">Tasks completion rate</div>
          <div className="mt-3 h-1.5 bg-white/5 rounded-full overflow-hidden">
            <div className="h-full bg-gradient-to-r from-[#00F0FF] to-[#39FF14]" style={{ width: `${stats.tasks ? (stats.tasks_done / stats.tasks) * 100 : 0}%` }} />
          </div>
        </div>
      </div>
    </div>
  );
}
