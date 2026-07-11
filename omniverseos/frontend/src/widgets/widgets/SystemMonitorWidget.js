import React, { useEffect, useState, useRef } from "react";
import { motion } from "framer-motion";
import { api } from "../../lib/api";

const METRICS = [
  { key: "cpu", label: "CPU",  color: "#00F0FF", icon: "fa-microchip"  },
  { key: "ram", label: "RAM",  color: "#C778DD", icon: "fa-memory"     },
  { key: "net", label: "NET",  color: "#39FF14", icon: "fa-wifi"       },
];

const HISTORY_LEN = 20;

function Sparkline({ data, color }) {
  if (!data.length) return null;
  const max = Math.max(...data, 1);
  const w = 60, h = 20;
  const pts = data.map((v, i) =>
    `${(i / (HISTORY_LEN - 1)) * w},${h - (v / max) * h}`
  ).join(" ");
  return (
    <svg width={w} height={h} viewBox={`0 0 ${w} ${h}`} style={{ overflow: "visible" }}>
      <polyline points={pts} fill="none" stroke={color} strokeWidth={1.5}
        strokeLinecap="round" strokeLinejoin="round"
        style={{ filter: `drop-shadow(0 0 3px ${color}80)` }} />
    </svg>
  );
}

function GaugeBar({ value, color, label }) {
  const pct = Math.min(Math.max(value, 0), 100);
  const barColor = pct >= 85 ? "#FF003C" : pct >= 65 ? "#FCEE09" : color;
  return (
    <div className="flex items-center gap-2">
      <div className="w-6 text-[9px] font-mono text-slate-500 flex-shrink-0 uppercase">{label}</div>
      <div className="flex-1 h-2 rounded-full overflow-hidden" style={{ background: "rgba(255,255,255,0.05)" }}>
        <motion.div className="h-full rounded-full"
          initial={{ width: 0 }}
          animate={{ width: `${pct}%` }}
          transition={{ duration: 0.6, ease: [0.22, 1, 0.36, 1] }}
          style={{ background: `linear-gradient(90deg, ${barColor}, ${barColor}80)`, boxShadow: `0 0 6px ${barColor}40` }} />
      </div>
      <div className="w-8 text-right font-mono text-[9px] flex-shrink-0 tabular-nums" style={{ color: barColor }}>
        {pct.toFixed(0)}%
      </div>
    </div>
  );
}

export default function SystemMonitorWidget() {
  const [live,    setLive]    = useState({ cpu: 42, ram: 61, net: 12 });
  const [history, setHistory] = useState({ cpu: [], ram: [], net: [] });
  const [latency, setLatency] = useState(null);
  const [online,  setOnline]  = useState(navigator.onLine);

  useEffect(() => {
    const onl = () => setOnline(true);
    const off = () => setOnline(false);
    window.addEventListener("online", onl);
    window.addEventListener("offline", off);
    return () => { window.removeEventListener("online", onl); window.removeEventListener("offline", off); };
  }, []);

  useEffect(() => {
    const tick = setInterval(() => {
      const t0 = Date.now();
      api.get("/ai/providers").then(() => setLatency(Date.now() - t0)).catch(() => {});

      const next = {
        cpu: Math.max(10, Math.min(95, live.cpu + (Math.random() - 0.5) * 18)),
        ram: Math.max(25, Math.min(92, live.ram + (Math.random() - 0.5) * 10)),
        net: Math.max(0,  Math.min(80, live.net + (Math.random() - 0.5) * 22)),
      };
      setLive(next);
      setHistory(h => ({
        cpu: [...h.cpu.slice(-(HISTORY_LEN-1)), next.cpu],
        ram: [...h.ram.slice(-(HISTORY_LEN-1)), next.ram],
        net: [...h.net.slice(-(HISTORY_LEN-1)), next.net],
      }));
    }, 2000);
    return () => clearInterval(tick);
  }, [live]);

  return (
    <div className="w-full h-full flex flex-col px-3 py-2 gap-2 select-none">
      {/* Header */}
      <div className="flex items-center justify-between flex-shrink-0">
        <div className="flex items-center gap-1.5">
          <motion.span className="w-1.5 h-1.5 rounded-full" style={{ background: online ? "#39FF14" : "#FF003C" }}
            animate={{ boxShadow: [`0 0 4px ${online?"#39FF14":"#FF003C"}80`, `0 0 10px ${online?"#39FF14":"#FF003C"}`, `0 0 4px ${online?"#39FF14":"#FF003C"}80`] }}
            transition={{ duration: 1.8, repeat: Infinity }} />
          <span className="font-mono text-[9px] uppercase tracking-widest" style={{ color: online ? "#39FF14" : "#FF003C" }}>
            {online ? "NOMINAL" : "OFFLINE"}
          </span>
        </div>
        {latency !== null && (
          <span className="font-mono text-[9px] tabular-nums" style={{ color: "rgba(255,255,255,0.25)" }}>
            {latency}ms
          </span>
        )}
      </div>

      {/* Gauge bars */}
      <div className="flex flex-col gap-1.5 flex-1 justify-center">
        {METRICS.map(m => (
          <GaugeBar key={m.key} value={live[m.key]} color={m.color} label={m.label} />
        ))}
      </div>

      {/* Sparklines */}
      <div className="flex items-center justify-between flex-shrink-0 pt-1"
        style={{ borderTop: "1px solid rgba(255,255,255,0.05)" }}>
        {METRICS.map(m => (
          <div key={m.key} className="flex flex-col items-center gap-0.5">
            <Sparkline data={history[m.key]} color={m.color} />
            <span className="font-mono text-[8px] uppercase" style={{ color: m.color, opacity: 0.6 }}>{m.label}</span>
          </div>
        ))}
      </div>
    </div>
  );
}
