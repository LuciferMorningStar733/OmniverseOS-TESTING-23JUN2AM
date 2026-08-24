import React, { useState, useEffect, useCallback, useRef } from "react";
import { motion, AnimatePresence } from "framer-motion";

/* ── Animated counting number ─────────────────────────────── */
function AnimatedNumber({ value, suffix = "", decimals = 0 }) {
  const [displayed, setDisplayed] = useState(value ?? 0);
  const prev = useRef(value ?? 0);
  useEffect(() => {
    if (value === null || value === undefined) return;
    const start = prev.current ?? 0;
    const end = value;
    const duration = 600;
    const startTime = performance.now();
    const raf = (ts) => {
      const progress = Math.min((ts - startTime) / duration, 1);
      const ease = 1 - Math.pow(1 - progress, 3);
      setDisplayed(start + (end - start) * ease);
      if (progress < 1) requestAnimationFrame(raf);
      else { setDisplayed(end); prev.current = end; }
    };
    requestAnimationFrame(raf);
  }, [value]);
  const formatted = typeof displayed === "number"
    ? decimals > 0 ? displayed.toFixed(decimals) : Math.round(displayed)
    : "--";
  return <span>{formatted}{suffix}</span>;
}

/* ── Latency color helper ───────────────────────────────────── */
function latencyColor(ms) {
  if (!ms) return "#94A3B8";
  if (ms < 20) return "#39FF14";
  if (ms < 100) return "#F59E0B";
  return "#FF003C";
}

const CARD_SPRING = { type: "spring", stiffness: 340, damping: 26, mass: 0.6 };

function HealthCard({ i, children }) {
  return (
    <motion.div
      initial={{ opacity: 0, y: 18, scale: 0.94 }}
      animate={{ opacity: 1, y: 0, scale: 1 }}
      transition={{ ...CARD_SPRING, delay: 0.08 + i * 0.06 }}
      className="p-4 rounded-2xl flex flex-col gap-2"
      style={{ background: "rgba(255,255,255,0.03)", border: "1px solid rgba(255,255,255,0.08)", backdropFilter: "blur(16px)" }}
    >
      {children}
    </motion.div>
  );
}

function StatusOrb({ healthy }) {
  const color = healthy ? "#39FF14" : "#F59E0B";
  return (
    <span className="relative flex items-center justify-center" style={{ width: 10, height: 10 }}>
      <motion.span
        animate={{ scale: [1, 1.9, 1], opacity: [0.5, 0, 0.5] }}
        transition={{ duration: 1.4, repeat: Infinity, ease: "easeInOut" }}
        style={{ position: "absolute", inset: 0, borderRadius: "50%", background: color }}
      />
      <span style={{ width: 8, height: 8, borderRadius: "50%", background: color, position: "relative", zIndex: 1 }} />
    </span>
  );
}

export function SystemHealth() {
  const [data, setData] = useState(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(null);
  const [lastRefreshed, setLastRefreshed] = useState(null);

  const fetchHealth = useCallback(async () => {
    setLoading(true);
    setError(null);
    try {
      const res = await fetch("/api/system/health");
      if (!res.ok) throw new Error(`HTTP error ${res.status}`);
      const json = await res.json();
      setData(json);
      setLastRefreshed(new Date().toLocaleTimeString());
    } catch (err) {
      setError(err.message || "Failed to fetch system telemetry");
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => {
    fetchHealth();
    const interval = setInterval(fetchHealth, 15000);
    return () => clearInterval(interval);
  }, [fetchHealth]);

  const isHealthy = data?.status === "healthy";
  const latency = data?.database?.latency_ms ?? null;

  return (
    <div className="h-full w-full text-slate-100 overflow-y-auto font-sans flex flex-col gap-4"
      style={{ background: "#060810", padding: "20px 20px 32px" }}>

      {/* Header */}
      <motion.div
        initial={{ opacity: 0, y: -10 }}
        animate={{ opacity: 1, y: 0 }}
        transition={{ type: "spring", stiffness: 380, damping: 28 }}
        className="flex items-center justify-between pb-4"
        style={{ borderBottom: "1px solid rgba(255,255,255,0.08)" }}
      >
        <div className="flex items-center gap-3">
          <motion.div
            className="w-9 h-9 rounded-xl flex items-center justify-center text-[#00F0FF]"
            style={{ background: "rgba(0,240,255,0.10)", border: "1px solid rgba(0,240,255,0.28)" }}
            whileHover={{ scale: 1.08 }}
            whileTap={{ scale: 0.94 }}
            transition={{ type: "spring", stiffness: 500, damping: 22 }}
          >
            <i className="fa-solid fa-heart-pulse text-lg" />
          </motion.div>
          <div>
            <h2 className="text-lg font-semibold tracking-wide text-white" style={{ letterSpacing: "-0.01em" }}>System Telemetry</h2>
            <p className="text-xs font-mono text-slate-500">OmniverseOS Diagnostics Engine</p>
          </div>
        </div>

        <div className="flex items-center gap-3">
          <motion.button
            onClick={fetchHealth}
            disabled={loading}
            className="px-3 py-1.5 rounded-lg text-xs font-mono flex items-center gap-1.5"
            style={{ background: "rgba(255,255,255,0.05)", border: "1px solid rgba(255,255,255,0.10)", color: "rgba(255,255,255,0.7)" }}
            whileHover={{ scale: 1.04, borderColor: "rgba(0,240,255,0.40)", color: "#00F0FF" }}
            whileTap={{ scale: 0.96 }}
            transition={{ type: "spring", stiffness: 480, damping: 22 }}
          >
            <motion.i
              className="fa-solid fa-rotate"
              animate={loading ? { rotate: 360 } : { rotate: 0 }}
              transition={loading ? { repeat: Infinity, duration: 0.8, ease: "linear" } : {}}
            />
            <span>Refresh</span>
          </motion.button>

          <motion.div
            initial={{ scale: 0.85, opacity: 0 }}
            animate={{ scale: 1, opacity: 1 }}
            transition={{ type: "spring", stiffness: 440, damping: 22 }}
            className="px-3 py-1 rounded-full text-xs font-mono flex items-center gap-2"
            style={isHealthy
              ? { background: "rgba(57,255,20,0.08)", border: "1px solid rgba(57,255,20,0.28)", color: "#39FF14" }
              : { background: "rgba(245,158,11,0.08)", border: "1px solid rgba(245,158,11,0.28)", color: "#F59E0B" }}
          >
            <StatusOrb healthy={isHealthy} />
            <span className="uppercase font-bold tracking-wider">{data?.status || "Connecting…"}</span>
          </motion.div>
        </div>
      </motion.div>

      <AnimatePresence>
        {error && (
          <motion.div
            initial={{ opacity: 0, y: -8, scale: 0.96 }}
            animate={{ opacity: 1, y: 0, scale: 1 }}
            exit={{ opacity: 0, y: -8, scale: 0.96 }}
            transition={{ type: "spring", stiffness: 440, damping: 26 }}
            className="p-4 rounded-xl text-red-400 text-xs font-mono flex items-center gap-2"
            style={{ background: "rgba(255,0,60,0.08)", border: "1px solid rgba(255,0,60,0.20)" }}
          >
            <i className="fa-solid fa-circle-exclamation text-sm" />
            <span>{error}</span>
          </motion.div>
        )}
      </AnimatePresence>

      {/* Stat cards */}
      <div className="grid grid-cols-1 md:grid-cols-3 gap-3">
        <HealthCard i={0}>
          <div className="flex items-center justify-between text-xs font-mono text-slate-400">
            <span>Database · MongoDB</span>
            <i className="fa-solid fa-database" style={{ color: "#00F0FF" }} />
          </div>
          <div className="text-2xl font-mono font-bold" style={{ color: latencyColor(latency), letterSpacing: "-0.03em" }}>
            <AnimatedNumber value={latency} suffix=" ms" decimals={1} />
          </div>
          <div className="text-[11px] font-mono text-slate-400 flex items-center gap-2">
            <span>Status:</span>
            <motion.span key={data?.database?.status} initial={{ opacity: 0, x: -4 }} animate={{ opacity: 1, x: 0 }}
              transition={{ type: "spring", stiffness: 480, damping: 24 }}
              style={{ color: isHealthy ? "#39FF14" : "#F59E0B" }}>
              {data?.database?.status || "Unknown"}
            </motion.span>
          </div>
        </HealthCard>

        <HealthCard i={1}>
          <div className="flex items-center justify-between text-xs font-mono text-slate-400">
            <span>Rate Limiter</span>
            <i className="fa-solid fa-shield-halved" style={{ color: "#00F0FF" }} />
          </div>
          <div className="text-xl font-mono font-bold text-[#00F0FF]" style={{ letterSpacing: "-0.02em" }}>
            {data?.rate_limiter?.type || "--"}
          </div>
          <div className="text-[11px] font-mono text-slate-400 flex items-center gap-2">
            <span>Mode:</span><span className="text-slate-200">{data?.rate_limiter?.mode || "Active"}</span>
          </div>
        </HealthCard>

        <HealthCard i={2}>
          <div className="flex items-center justify-between text-xs font-mono text-slate-400">
            <span>Indexed Records</span>
            <i className="fa-solid fa-folder-tree" style={{ color: "#00F0FF" }} />
          </div>
          <div className="flex items-center gap-5 mt-1">
            {[
              { label: "Notes",    val: data?.database?.collections?.notes,    color: "#F59E0B" },
              { label: "Tasks",    val: data?.database?.collections?.tasks,    color: "#39FF14" },
              { label: "Memories", val: data?.database?.collections?.memories, color: "#00F0FF" },
            ].map(({ label, val, color }, idx) => (
              <motion.div key={label} initial={{ opacity: 0, y: 6 }} animate={{ opacity: 1, y: 0 }}
                transition={{ type: "spring", stiffness: 440, damping: 26, delay: 0.15 + idx * 0.04 }}>
                <span className="text-slate-400 block text-[10px] font-mono">{label}</span>
                <span className="font-bold text-lg font-mono" style={{ color, letterSpacing: "-0.03em" }}>
                  <AnimatedNumber value={val ?? 0} />
                </span>
              </motion.div>
            ))}
          </div>
        </HealthCard>
      </div>

      {/* AI Provider Matrix */}
      <motion.div
        initial={{ opacity: 0, y: 20 }}
        animate={{ opacity: 1, y: 0 }}
        transition={{ ...CARD_SPRING, delay: 0.28 }}
        className="p-5 rounded-2xl flex flex-col gap-3"
        style={{ background: "rgba(255,255,255,0.025)", border: "1px solid rgba(255,255,255,0.08)", backdropFilter: "blur(16px)" }}
      >
        <h3 className="text-xs font-mono uppercase tracking-wider text-slate-400 flex items-center gap-2">
          <i className="fa-solid fa-microchip" style={{ color: "#00F0FF" }} />
          <span>AI Provider Cluster</span>
        </h3>
        <div className="grid grid-cols-2 md:grid-cols-5 gap-2">
          {data?.ai_providers
            ? Object.entries(data.ai_providers).map(([key, prov], idx) => (
              <motion.div key={key}
                initial={{ opacity: 0, scale: 0.85 }}
                animate={{ opacity: 1, scale: 1 }}
                transition={{ type: "spring", stiffness: 440, damping: 24, delay: 0.30 + idx * 0.05 }}
                whileHover={{ scale: 1.04, y: -2 }}
                className="p-3 rounded-xl flex items-center justify-between cursor-default"
                style={{ background: "rgba(0,0,0,0.35)", border: "1px solid rgba(255,255,255,0.06)" }}
              >
                <div>
                  <div className="text-xs font-mono font-bold text-white capitalize">{key}</div>
                  <div className="text-[10px] font-mono text-slate-500">{prov.display || key}</div>
                </div>
                <motion.span
                  animate={prov.available ? { scale: [1, 1.35, 1] } : {}}
                  transition={{ duration: 1.4, repeat: prov.available ? Infinity : 0, ease: "easeInOut" }}
                  style={{ display: "inline-block", width: 10, height: 10, borderRadius: "50%",
                    background: prov.available ? "#39FF14" : "#FF003C",
                    boxShadow: prov.available ? "0 0 8px #39FF14" : "0 0 8px #FF003C" }}
                />
              </motion.div>
            ))
            : <div className="col-span-full text-xs font-mono text-slate-500 py-2">No provider data</div>
          }
        </div>
      </motion.div>

      {lastRefreshed && (
        <motion.div initial={{ opacity: 0 }} animate={{ opacity: 1 }} className="text-right text-[10px] font-mono text-slate-600">
          Last updated: {lastRefreshed}
        </motion.div>
      )}
    </div>
  );
}


export default SystemHealth;
