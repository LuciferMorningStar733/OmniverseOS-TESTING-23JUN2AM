import React, { useEffect, useState } from "react";
import { api, PROVIDER_LABELS } from "../../lib/api";

/* ── Helpers ────────────────────────────────────────────────────────────── */
function fmt(d) {
  const h = d.getHours(), m = d.getMinutes();
  return `${h % 12 || 12}:${String(m).padStart(2, "0")} ${h < 12 ? "AM" : "PM"}`;
}
function fmtDate(d) {
  return d.toLocaleDateString("en-US", { weekday: "short", month: "short", day: "numeric" })
    .toUpperCase();
}

const STATUS_COLOR = {
  healthy:      "#22d3ee",
  cooldown:     "#FCEE09",
  unavailable:  "#FF003C",
  offline:      "#FF003C",
  rate_limited: "#FCEE09",
};

export default function SystemStatusWidget() {
  /* ── Existing state (preserved) ── */
  const [providers, setProviders] = useState(null);
  const [online,    setOnline]    = useState(navigator.onLine);
  const [latency,   setLatency]   = useState(null);

  /* ── New state: clock + battery ── */
  const [now,     setNow]     = useState(new Date());
  const [battery, setBattery] = useState(null); // { level, charging }

  /* Clock tick */
  useEffect(() => {
    const iv = setInterval(() => setNow(new Date()), 1000);
    return () => clearInterval(iv);
  }, []);

  /* Battery API */
  useEffect(() => {
    if (!navigator.getBattery) return;
    navigator.getBattery().then((b) => {
      const update = () => setBattery({ level: Math.round(b.level * 100), charging: b.charging });
      update();
      b.addEventListener("levelchange",   update);
      b.addEventListener("chargingchange", update);
      return () => {
        b.removeEventListener("levelchange",   update);
        b.removeEventListener("chargingchange", update);
      };
    }).catch(() => {});
  }, []);

  /* Online/offline */
  useEffect(() => {
    const on  = () => setOnline(true);
    const off = () => setOnline(false);
    window.addEventListener("online",  on);
    window.addEventListener("offline", off);
    return () => { window.removeEventListener("online", on); window.removeEventListener("offline", off); };
  }, []);

  /* Provider health (existing) */
  useEffect(() => {
    const fetch = () => {
      const t0 = Date.now();
      api.get("/ai/providers")
        .then((r) => { setProviders(r.data); setLatency(Date.now() - t0); })
        .catch(() => {});
    };
    fetch();
    const iv = setInterval(fetch, 30000);
    return () => clearInterval(iv);
  }, []);

  const providerList = providers
    ? Object.entries(providers).filter(([, v]) => v.hasKey)
    : [];

  const firstProvider = providerList[0];
  const aiStatus = firstProvider ? firstProvider[1].status : "connecting";
  const aiOnline = aiStatus === "healthy";

  const batLevel  = battery?.level ?? null;
  const batCharge = battery?.charging ?? false;
  const batColor  = batLevel === null ? "#22d3ee" : batLevel <= 15 ? "#FF003C" : batLevel <= 30 ? "#FCEE09" : "#22d3ee";

  return (
    <div
      className="flex flex-col w-full h-full bg-[#050B14]/40 backdrop-blur-3xl border border-white/[0.04] rounded-[32px] p-5 shadow-2xl relative overflow-hidden group hover:border-cyan-500/30 transition-all duration-700 ease-out select-none"
    >
      {/* Ambient inner glow */}
      <div className="pointer-events-none absolute inset-0 rounded-[32px] opacity-0 group-hover:opacity-100 transition-opacity duration-700"
        style={{ background: "radial-gradient(ellipse 80% 40% at 50% 0%, rgba(0,240,255,0.04) 0%, transparent 70%)" }} />

      {/* ── 1. HOLOGRAPHIC CLOCK ─────────────────────────────────────────── */}
      <div className="flex-shrink-0 mb-4">
        <div className="text-5xl font-extralight tracking-tighter text-transparent bg-clip-text bg-gradient-to-br from-white to-white/30 leading-none tabular-nums">
          {fmt(now)}
        </div>
        <div className="text-[10px] font-semibold tracking-[0.25em] text-cyan-400 uppercase mt-1.5">
          {fmtDate(now)}
        </div>
      </div>

      {/* ── 2. LIVE DATA NODES ───────────────────────────────────────────── */}
      <div className="flex flex-col gap-2 flex-1">

        {/* Card 1 — System Core: Battery + Network */}
        <div className="bg-white/[0.02] border border-white/[0.02] rounded-2xl p-3.5 flex flex-col gap-2 hover:bg-white/[0.04] hover:border-cyan-500/20 hover:shadow-[0_0_15px_rgba(0,255,255,0.08)] transition-all duration-300 cursor-default">
          <div className="flex items-center gap-1.5 mb-0.5">
            <span className="w-2 h-2 rounded-full bg-cyan-400 animate-pulse shadow-[0_0_8px_#22d3ee]" />
            <span className="text-[9px] uppercase tracking-[0.2em] text-white/40 font-mono">System Core</span>
          </div>

          {/* Battery row */}
          <div className="flex items-center justify-between">
            <div className="flex items-center gap-1.5">
              <i className={`fa-solid ${batCharge ? "fa-bolt" : "fa-battery-half"} text-[10px]`} style={{ color: batColor }} />
              <span className="text-[10px] font-mono text-white/50">Battery</span>
            </div>
            <span className="text-[11px] font-mono font-light tabular-nums" style={{ color: batColor }}>
              {batLevel !== null ? `${batLevel}%` : "—"}
              {batCharge && <span className="text-cyan-400/60 ml-1 text-[9px]">CHG</span>}
            </span>
          </div>

          {/* Network row */}
          <div className="flex items-center justify-between">
            <div className="flex items-center gap-1.5">
              <i className={`fa-solid ${online ? "fa-wifi" : "fa-wifi-slash"} text-[10px]`}
                style={{ color: online ? "#22d3ee" : "#FF003C" }} />
              <span className="text-[10px] font-mono text-white/50">Network</span>
            </div>
            <span className="text-[11px] font-mono font-light" style={{ color: online ? "#22d3ee" : "#FF003C" }}>
              {online ? "Connected" : "Offline"}
            </span>
          </div>
        </div>

        {/* Card 2 — Environment: Latency + Connection speed */}
        <div className="bg-white/[0.02] border border-white/[0.02] rounded-2xl p-3.5 flex flex-col gap-2 hover:bg-white/[0.04] hover:border-cyan-500/20 hover:shadow-[0_0_15px_rgba(0,255,255,0.08)] transition-all duration-300 cursor-default">
          <div className="flex items-center gap-1.5 mb-0.5">
            <span className="w-2 h-2 rounded-full bg-cyan-400 animate-pulse shadow-[0_0_8px_#22d3ee]" />
            <span className="text-[9px] uppercase tracking-[0.2em] text-white/40 font-mono">Environment</span>
          </div>

          {/* Latency row */}
          <div className="flex items-center justify-between">
            <div className="flex items-center gap-1.5">
              <i className="fa-solid fa-tower-broadcast text-[10px] text-cyan-400/60" />
              <span className="text-[10px] font-mono text-white/50">API Latency</span>
            </div>
            <span className="text-[11px] font-mono font-light text-cyan-400 tabular-nums">
              {latency !== null ? `${latency}ms` : "—"}
            </span>
          </div>

          {/* Connection quality derived from latency */}
          <div className="flex items-center justify-between">
            <div className="flex items-center gap-1.5">
              <i className="fa-solid fa-signal text-[10px] text-cyan-400/60" />
              <span className="text-[10px] font-mono text-white/50">Signal</span>
            </div>
            <span className="text-[11px] font-mono font-light"
              style={{ color: latency === null ? "#94A3B8" : latency < 200 ? "#22d3ee" : latency < 600 ? "#FCEE09" : "#FF003C" }}>
              {latency === null ? "—" : latency < 200 ? "Excellent" : latency < 600 ? "Good" : "Degraded"}
            </span>
          </div>
        </div>
      </div>

      {/* ── 3. NEURAL LINK ───────────────────────────────────────────────── */}
      <div className="flex-shrink-0 mt-3 pt-3 border-t border-white/[0.04] flex items-center justify-between">
        <div className="flex items-center gap-2">
          <i className="fa-solid fa-brain text-[10px] text-purple-400/70" />
          <span className="text-[10px] uppercase tracking-widest text-white/40 font-mono">
            {firstProvider ? (PROVIDER_LABELS[firstProvider[0]] || firstProvider[0]) : "Cortex"}
          </span>
        </div>
        <span
          className="text-[10px] uppercase tracking-widest font-mono"
          style={{ color: aiOnline ? "rgb(192,132,252)" : "#FF003C",
            textShadow: aiOnline ? "0 0 8px rgba(192,132,252,0.5)" : "0 0 8px rgba(255,0,60,0.5)" }}>
          {aiOnline ? "Online" : aiStatus}
        </span>
      </div>
    </div>
  );
}
