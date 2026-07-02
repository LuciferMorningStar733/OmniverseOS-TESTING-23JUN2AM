/**
 * PlasmaWidget.js — Priority 8: Futuristic organic widget
 * A living plasma orb that tracks real system state: CPU metaphor via
 * device memory hint, battery, network, and ambient "Cortex load."
 * Pure canvas + Framer Motion — no SVG defs, no image assets.
 */

import React, { useRef, useEffect, useState, useMemo } from "react";
import { motion, AnimatePresence } from "framer-motion";

// ─── Plasma canvas ────────────────────────────────────────────────────────────

function PlasmaCanvas({ color, speed, intensity }) {
  const canvasRef = useRef(null);
  const tRef      = useRef(0);
  const rafRef    = useRef(null);
  const lastRef   = useRef(null);

  // Store latest props in a ref so RAF closure never goes stale
  const propsRef = useRef({ color, speed, intensity });
  useEffect(() => { propsRef.current = { color, speed, intensity }; }, [color, speed, intensity]);

  useEffect(() => {
    function draw(ts) {
      rafRef.current = requestAnimationFrame(draw);

      const delta = lastRef.current !== null ? ts - lastRef.current : 16;
      lastRef.current = ts;

      const { color: col, speed: spd, intensity: inten } = propsRef.current;
      tRef.current += (delta / 1000) * spd;
      const tp = tRef.current;

      const canvas = canvasRef.current;
      if (!canvas) return;
      const ctx = canvas.getContext("2d");
      if (!ctx) return;

      const W = canvas.width;
      const H = canvas.height;
      const cx = W / 2;
      const cy = H / 2;

      ctx.clearRect(0, 0, W, H);

      // Multi-layer radial gradient plasma
      const layers = [
        { r: 0.55, alpha: 0.60 + inten * 0.25, ls: 1.0 },
        { r: 0.38, alpha: 0.45 + inten * 0.20, ls: 1.6 },
        { r: 0.22, alpha: 0.80 + inten * 0.15, ls: 2.4 },
      ];

      for (const { r, alpha, ls } of layers) {
        const px     = cx + Math.sin(tp * ls + 0.5) * W * 0.14;
        const py     = cy + Math.cos(tp * ls * 0.8) * H * 0.12;
        const radius = Math.min(W, H) * r * (0.88 + Math.sin(tp * ls * 1.3) * 0.12);
        const grad   = ctx.createRadialGradient(px, py, 0, px, py, radius);
        const aHex   = Math.floor(alpha * 255).toString(16).padStart(2, "0");
        const aHalf  = Math.floor(alpha * 0.35 * 255).toString(16).padStart(2, "0");
        grad.addColorStop(0,    `${col}${aHex}`);
        grad.addColorStop(0.45, `${col}${aHalf}`);
        grad.addColorStop(1,    `${col}00`);
        ctx.fillStyle = grad;
        ctx.beginPath();
        ctx.arc(px, py, radius, 0, Math.PI * 2);
        ctx.fill();
      }

      // Travelling spark ring
      const ringR      = Math.min(W, H) * 0.42;
      const sparkCount = 8;
      for (let i = 0; i < sparkCount; i++) {
        const angle      = (i / sparkCount) * Math.PI * 2 + tp * 0.65;
        const wobble     = Math.sin(tp * 2.4 + i * 0.9) * 0.04;
        const sr         = ringR * (1 + wobble);
        const sx         = cx + Math.cos(angle) * sr;
        const sy         = cy + Math.sin(angle) * sr;
        const sparkAlpha = 0.35 + Math.sin(tp * 3 + i) * 0.25;
        const sSize      = 2.5 + Math.sin(tp * 4 + i * 1.1) * 1.5;
        const saHex      = Math.floor(sparkAlpha * 255).toString(16).padStart(2, "0");
        const sg         = ctx.createRadialGradient(sx, sy, 0, sx, sy, sSize * 3);
        sg.addColorStop(0, `${col}${saHex}`);
        sg.addColorStop(1, `${col}00`);
        ctx.fillStyle = sg;
        ctx.beginPath();
        ctx.arc(sx, sy, sSize * 3, 0, Math.PI * 2);
        ctx.fill();
      }
    }

    rafRef.current = requestAnimationFrame(draw);
    return () => {
      if (rafRef.current) cancelAnimationFrame(rafRef.current);
    };
  }, []); // stable — reads all props via propsRef

  return (
    <canvas
      ref={canvasRef}
      width={180}
      height={180}
      style={{ width: "100%", height: "100%", display: "block" }}
    />
  );
}

// ─── Real data hooks ──────────────────────────────────────────────────────────

function useSystemStats() {
  const [stats, setStats] = useState({ battery: null, online: navigator.onLine, mem: null });

  useEffect(() => {
    // Memory hint (deviceMemory — Chrome/Android only)
    const mem = navigator.deviceMemory ?? null;
    if (mem !== null) setStats((s) => ({ ...s, mem }));

    // Battery
    if (navigator.getBattery) {
      navigator.getBattery().then((bat) => {
        const updateBat = () => setStats((s) => ({ ...s, battery: Math.round(bat.level * 100) }));
        updateBat();
        bat.addEventListener("levelchange", updateBat);
        return () => bat.removeEventListener("levelchange", updateBat);
      }).catch(() => {});
    }

    // Network
    const setOnline  = () => setStats((s) => ({ ...s, online: true  }));
    const setOffline = () => setStats((s) => ({ ...s, online: false }));
    window.addEventListener("online",  setOnline);
    window.addEventListener("offline", setOffline);
    return () => {
      window.removeEventListener("online",  setOnline);
      window.removeEventListener("offline", setOffline);
    };
  }, []);

  return stats;
}

// ─── Cortex load metaphor (random walk 0→1) ───────────────────────────────────

function useCortexLoad() {
  const [load, setLoad] = useState(0.42);
  useEffect(() => {
    const id = setInterval(() => {
      setLoad((l) => Math.max(0.18, Math.min(0.92, l + (Math.random() - 0.5) * 0.12)));
    }, 1800);
    return () => clearInterval(id);
  }, []);
  return load;
}

function loadColor(load) {
  if (load < 0.35) return "#39FF14";
  if (load < 0.65) return "#00F0FF";
  if (load < 0.82) return "#F59E0B";
  return "#FF003C";
}

// ─── Ring progress bar ────────────────────────────────────────────────────────

function RingBar({ label, value, max, color }) {
  const pct = Math.min(1, value / max);
  return (
    <div style={{ display: "flex", flexDirection: "column", gap: 4 }}>
      <div style={{ display: "flex", justifyContent: "space-between", alignItems: "baseline" }}>
        <span style={{ fontSize: 10, color: "rgba(255,255,255,0.40)", fontFamily: "'Outfit', sans-serif", letterSpacing: "0.05em" }}>{label}</span>
        <span style={{ fontSize: 11, fontWeight: 700, color, fontFamily: "'JetBrains Mono', monospace" }}>
          {Math.round(value)}{max === 100 ? "%" : "GB"}
        </span>
      </div>
      <div style={{ height: 3, borderRadius: 2, background: "rgba(255,255,255,0.06)", overflow: "hidden" }}>
        <motion.div
          animate={{ width: `${pct * 100}%` }}
          transition={{ type: "spring", damping: 32, stiffness: 140, mass: 0.4 }}
          style={{ height: "100%", borderRadius: 2, background: color, boxShadow: `0 0 8px ${color}80` }}
        />
      </div>
    </div>
  );
}

// ─── Main widget ──────────────────────────────────────────────────────────────

const STATUS_LABELS = ["NOMINAL", "ELEVATED", "HIGH", "CRITICAL"];

export default function PlasmaWidget() {
  const stats  = useSystemStats();
  const load   = useCortexLoad();
  const color  = useMemo(() => loadColor(load), [load]);
  const status = load < 0.35 ? 0 : load < 0.65 ? 1 : load < 0.82 ? 2 : 3;

  return (
    <motion.div
      initial={{ opacity: 0, scale: 0.96 }}
      animate={{ opacity: 1, scale: 1 }}
      transition={{ type: "spring", damping: 28, stiffness: 280 }}
      style={{
        width: "100%", height: "100%",
        borderRadius: 18, overflow: "hidden",
        background: "rgba(4,5,14,0.78)",
        backdropFilter: "blur(36px) saturate(200%)",
        WebkitBackdropFilter: "blur(36px) saturate(200%)",
        border: `1px solid ${color}18`,
        boxShadow: "0 8px 40px rgba(0,0,0,0.55), inset 0 1px 0 rgba(255,255,255,0.05)",
        display: "flex", flexDirection: "column",
        position: "relative",
      }}
    >
      {/* Plasma orb — behind content */}
      <div style={{
        position: "absolute", top: -30, left: "50%", transform: "translateX(-50%)",
        width: 180, height: 180, pointerEvents: "none", opacity: 0.65,
      }}>
        <PlasmaCanvas color={color} speed={0.7 + load * 0.9} intensity={load} />
      </div>

      {/* Foreground content */}
      <div style={{ position: "relative", zIndex: 1, display: "flex", flexDirection: "column", height: "100%" }}>

        {/* Header */}
        <div style={{ padding: "14px 16px 4px", display: "flex", alignItems: "center", justifyContent: "space-between" }}>
          <div>
            <div style={{ fontSize: 13, fontWeight: 800, color: "#fff", fontFamily: "'Outfit', sans-serif", letterSpacing: "-0.02em" }}>
              Plasma Core
            </div>
            <div style={{ fontSize: 10, color: "rgba(255,255,255,0.28)", fontFamily: "'Outfit', sans-serif", marginTop: 1 }}>
              System telemetry
            </div>
          </div>

          <AnimatePresence mode="wait">
            <motion.div
              key={status}
              initial={{ opacity: 0, scale: 0.8 }}
              animate={{ opacity: 1, scale: 1 }}
              exit={{ opacity: 0, scale: 0.8 }}
              style={{
                padding: "3px 9px", borderRadius: 20,
                background: `${color}14`, border: `1px solid ${color}28`,
                display: "flex", alignItems: "center", gap: 4,
              }}
            >
              <motion.div
                animate={{ scale: [1, 1.5, 1], opacity: [1, 0.4, 1] }}
                transition={{ duration: 1.6, repeat: Infinity }}
                style={{ width: 5, height: 5, borderRadius: "50%", background: color, boxShadow: `0 0 8px ${color}` }}
              />
              <span style={{ fontSize: 8.5, fontWeight: 700, color, fontFamily: "'Outfit', sans-serif", letterSpacing: "0.08em" }}>
                {STATUS_LABELS[status]}
              </span>
            </motion.div>
          </AnimatePresence>
        </div>

        {/* Cortex load */}
        <div style={{ padding: "12px 16px 0", display: "flex", alignItems: "center", gap: 12 }}>
          <motion.div
            animate={{ color }}
            transition={{ duration: 0.8 }}
            style={{ fontSize: 42, fontWeight: 800, fontFamily: "'Outfit', sans-serif", letterSpacing: "-0.04em", lineHeight: 1, textShadow: `0 0 20px ${color}60` }}
          >
            {Math.round(load * 100)}
          </motion.div>
          <div style={{ flex: 1 }}>
            <div style={{ fontSize: 9, color: "rgba(255,255,255,0.30)", fontFamily: "'Outfit', sans-serif", letterSpacing: "0.07em", marginBottom: 2 }}>
              CORTEX LOAD
            </div>
            <div style={{ height: 6, borderRadius: 3, background: "rgba(255,255,255,0.06)", overflow: "hidden" }}>
              <motion.div
                animate={{ width: `${load * 100}%` }}
                transition={{ type: "spring", damping: 30, stiffness: 100, mass: 0.5 }}
                style={{ height: "100%", borderRadius: 3, background: `linear-gradient(90deg, ${color}80, ${color})`, boxShadow: `0 0 12px ${color}80` }}
              />
            </div>
          </div>
        </div>

        {/* System stats */}
        <div style={{ padding: "14px 16px", flex: 1, display: "flex", flexDirection: "column", gap: 10 }}>
          {stats.battery !== null && (
            <RingBar
              label="BATTERY" value={stats.battery} max={100}
              color={stats.battery > 50 ? "#39FF14" : stats.battery > 20 ? "#F59E0B" : "#FF003C"}
            />
          )}
          {stats.mem !== null && (
            <RingBar label="DEVICE MEM" value={stats.mem} max={16} color="#818CF8" />
          )}
          <div style={{ display: "flex", alignItems: "center", gap: 6 }}>
            <motion.div
              animate={{ backgroundColor: stats.online ? "#39FF14" : "#FF003C" }}
              style={{ width: 7, height: 7, borderRadius: "50%", boxShadow: stats.online ? "0 0 8px #39FF1480" : "0 0 8px #FF003C80" }}
            />
            <span style={{ fontSize: 10, color: "rgba(255,255,255,0.40)", fontFamily: "'Outfit', sans-serif", letterSpacing: "0.05em" }}>
              {stats.online ? "Network online" : "Offline mode"}
            </span>
          </div>
        </div>
      </div>
    </motion.div>
  );
}
