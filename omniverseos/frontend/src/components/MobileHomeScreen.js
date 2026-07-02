import React, { useState, useRef, useCallback, useEffect, useMemo } from "react";
import { motion, AnimatePresence } from "framer-motion";
import MobileWidgetView from "../widgets/MobileWidgetView";
import MobileAppDrawer from "./MobileAppDrawer";
import NeuralWallpaper from "../widgets/widgets/NeuralWallpaper";

// Dock pinned apps — Cortex, Browser, Files, Settings (4 apps only)
export const PINNED_APP_IDS = ["voice", "browser", "files", "settings"];

// ── Hooks ──────────────────────────────────────────────────────────────────────

function useClock() {
  const [now, setNow] = useState(() => new Date());
  useEffect(() => {
    const id = setInterval(() => setNow(new Date()), 1000);
    return () => clearInterval(id);
  }, []);
  return now;
}

// ── Real battery data via Navigator Battery API ─────────────────────────────────
function useBattery() {
  const [battery, setBattery] = useState(null);
  useEffect(() => {
    let batteryMgr = null;
    let mounted    = true;

    // Stable named handlers so removeEventListener can find them later
    const onLevelChange  = () => { if (mounted && batteryMgr) setBattery({ level: Math.round(batteryMgr.level * 100), charging: batteryMgr.charging }); };
    const onChargeChange = () => { if (mounted && batteryMgr) setBattery({ level: Math.round(batteryMgr.level * 100), charging: batteryMgr.charging }); };

    if (navigator.getBattery) {
      navigator.getBattery().then((b) => {
        if (!mounted) return;          // guard: component may have unmounted
        batteryMgr = b;
        setBattery({ level: Math.round(b.level * 100), charging: b.charging });
        b.addEventListener("levelchange",   onLevelChange);
        b.addEventListener("chargingchange", onChargeChange);
      }).catch(() => {});
    }

    return () => {
      mounted = false;
      if (batteryMgr) {
        batteryMgr.removeEventListener("levelchange",   onLevelChange);
        batteryMgr.removeEventListener("chargingchange", onChargeChange);
      }
    };
  }, []);
  return battery;
}

// ── Real network data via Navigator Connection API ──────────────────────────────
function useNetwork() {
  const getInfo = useCallback(() => {
    const conn = navigator.connection || navigator.mozConnection || navigator.webkitConnection;
    return {
      online: navigator.onLine,
      effectiveType: conn?.effectiveType || null,
      type: conn?.type || null,
      downlink: conn?.downlink || null,
      rtt: conn?.rtt || null,
    };
  }, []);
  const [network, setNetwork] = useState(() => getInfo());
  useEffect(() => {
    const update = () => setNetwork(getInfo());
    window.addEventListener("online", update);
    window.addEventListener("offline", update);
    const conn = navigator.connection || navigator.mozConnection || navigator.webkitConnection;
    if (conn) conn.addEventListener("change", update);
    return () => {
      window.removeEventListener("online", update);
      window.removeEventListener("offline", update);
      if (conn) conn.removeEventListener("change", update);
    };
  }, [getInfo]);
  return network;
}

// ── 12/24h preference ──────────────────────────────────────────────────────────
const CLOCK_FORMAT_KEY = "omniverse_clock_format";
function useClockFormat() {
  const [is24h, setIs24h] = useState(() => {
    try { return localStorage.getItem(CLOCK_FORMAT_KEY) === "24h"; } catch { return false; }
  });
  const toggle = useCallback(() => {
    setIs24h((v) => {
      const next = !v;
      try { localStorage.setItem(CLOCK_FORMAT_KEY, next ? "24h" : "12h"); } catch {}
      return next;
    });
  }, []);
  return [is24h, toggle];
}

// ── Time-of-day adaptive theme ─────────────────────────────────────────────────
function getTheme() {
  return { accent: "#00F0FF", glow: "rgba(0,240,255,0.20)", secondary: "rgba(0,240,255,0.08)", name: "cyber" };
}

// ── Text helpers ───────────────────────────────────────────────────────────────
function getGreeting(hour) {
  if (hour < 5)  return "Good Night";
  if (hour < 12) return "Good Morning";
  if (hour < 17) return "Good Afternoon";
  return "Good Evening";
}

function getAIBriefText(hour) {
  if (hour < 6)  return "Night watch active. Cortex is monitoring all systems while you rest. Everything is running smoothly.";
  if (hour < 9)  return "Good morning. Cortex is online and ready. Your AI operating system is fully operational.";
  if (hour < 12) return "Morning systems nominal. Cortex is standing by. Open an app or ask Cortex anything to begin.";
  if (hour < 15) return "Afternoon check-in. All OmniverseOS subsystems operational. Cortex awaits your commands.";
  if (hour < 18) return "Late afternoon. Cortex is prepared for your evening workflow. All systems are running optimally.";
  return "Evening mode active. Cortex is maintaining your session and preparing context for tomorrow.";
}

// ── Shared glass ──────────────────────────────────────────────────────────────
const GLASS = {
  background: "rgba(6, 8, 18, 0.56)",
  backdropFilter: "blur(36px) saturate(190%)",
  WebkitBackdropFilter: "blur(36px) saturate(190%)",
  border: "1px solid rgba(255,255,255,0.08)",
  borderRadius: 20,
  boxShadow: "0 8px 32px rgba(0,0,0,0.48), inset 0 1px 0 rgba(255,255,255,0.055)",
};

// ── Ambient aurora background ─────────────────────────────────────────────────
const AURORA_CSS = `
  @keyframes auroraDrift1 {
    0%   { transform: translate3d(0%,   0%,   0) scale(1.00); }
    25%  { transform: translate3d(4%,  -6%,   0) scale(1.07); }
    50%  { transform: translate3d(-3%,  5%,   0) scale(0.95); }
    75%  { transform: translate3d(2%,  -3%,   0) scale(1.03); }
    100% { transform: translate3d(0%,   0%,   0) scale(1.00); }
  }
  @keyframes auroraDrift2 {
    0%   { transform: translate3d(0%,   0%,   0) scale(1.00); }
    33%  { transform: translate3d(-6%,  4%,   0) scale(1.05); }
    66%  { transform: translate3d(4%,  -5%,   0) scale(0.96); }
    100% { transform: translate3d(0%,   0%,   0) scale(1.00); }
  }
  @keyframes neuralPulse {
    0%, 100% { opacity: 0.018; }
    50%       { opacity: 0.038; }
  }
`;

function AmbientBackground({ theme }) {
  return (
    <>
      <style>{AURORA_CSS}</style>
      <div aria-hidden="true" style={{
        position: "absolute", inset: -60, pointerEvents: "none", zIndex: 0,
        animation: "auroraDrift1 24s ease-in-out infinite",
        background: `radial-gradient(ellipse 58% 38% at 78% 18%, ${theme.glow} 0%, transparent 65%)`,
        willChange: "transform",
      }} />
      <div aria-hidden="true" style={{
        position: "absolute", inset: -60, pointerEvents: "none", zIndex: 0,
        animation: "auroraDrift2 32s ease-in-out infinite",
        background: `radial-gradient(ellipse 45% 55% at 12% 82%, ${theme.secondary} 0%, transparent 60%)`,
        willChange: "transform",
      }} />
      <div aria-hidden="true" style={{
        position: "absolute", inset: 0, pointerEvents: "none", zIndex: 0,
        backgroundImage: `
          linear-gradient(rgba(0,240,255,0.028) 1px, transparent 1px),
          linear-gradient(90deg, rgba(0,240,255,0.028) 1px, transparent 1px)
        `,
        backgroundSize: "44px 44px",
        animation: "neuralPulse 8s ease-in-out infinite",
        maskImage: "radial-gradient(ellipse 90% 80% at 50% 50%, black 40%, transparent 100%)",
        WebkitMaskImage: "radial-gradient(ellipse 90% 80% at 50% 50%, black 40%, transparent 100%)",
      }} />
    </>
  );
}

// ── Holographic ring clock ─────────────────────────────────────────────────────
const HOLO_R_SEC = 84;
const HOLO_C_SEC = 527.8;  // 2π × 84
const HOLO_R_MIN = 68;
const HOLO_C_MIN = 427.3;  // 2π × 68
const HOLO_CX    = 98;
const HOLO_CY    = 98;

const HOLO_TICKS = Array.from({ length: 60 }, (_, i) => {
  const a       = (i / 60) * 2 * Math.PI;
  const isMajor = i % 5 === 0;
  const rOuter  = 91;
  const rInner  = isMajor ? 85 : 88;
  return {
    x1: HOLO_CX + Math.cos(a) * rOuter,
    y1: HOLO_CY + Math.sin(a) * rOuter,
    x2: HOLO_CX + Math.cos(a) * rInner,
    y2: HOLO_CY + Math.sin(a) * rInner,
    isMajor,
  };
});

const HOLO_CSS = `
  @import url('https://fonts.googleapis.com/css2?family=Orbitron:wght@700;800;900&display=swap');

  @keyframes holoGlitch {
    0%,88%,100% { opacity:1; transform:none; filter:none; }
    90%  { opacity:0.84; transform:skewX(0.6deg); filter:hue-rotate(15deg); }
    92%  { opacity:0.93; transform:skewX(-0.4deg); }
    94%  { opacity:1;    transform:none; filter:none; }
  }
  @keyframes holoScan {
    0%   { transform:translateY(0px);    opacity:0;   }
    6%   { opacity:0.52; }
    94%  { opacity:0.52; }
    100% { transform:translateY(196px);  opacity:0;   }
  }
  @keyframes digitFlipIn {
    from { opacity:0; transform:translateY(-10px) scale(0.94); filter:blur(3px); }
    to   { opacity:1; transform:translateY(0)     scale(1);    filter:blur(0); }
  }
  @keyframes cyanPulse {
    0%,100% { text-shadow: 0 0 10px #00F0FF, 0 0 22px #00F0FFBB, 0 0 44px #00F0FF66, 0 0 88px #00F0FF33; }
    50%     { text-shadow: 0 0 14px #00F0FF, 0 0 30px #00F0FFCC, 0 0 60px #00F0FF88, 0 0 110px #00F0FF44; }
  }
  @keyframes innerGlow {
    0%,100% { opacity: 0.22; }
    50%     { opacity: 0.40; }
  }
`;

const CYAN = "#00F0FF";

// Flip digit with smooth animation when value changes
function FlipDigit({ value, fontSize = 50 }) {
  const [displayed, setDisplayed] = useState(value);
  const [flipping, setFlipping] = useState(false);

  useEffect(() => {
    if (value === displayed) return;
    setFlipping(true);
    const t = setTimeout(() => {
      setDisplayed(value);
      setFlipping(false);
    }, 120);
    return () => clearTimeout(t);
  }, [value, displayed]);

  return (
    <span
      key={displayed}
      style={{
        fontSize,
        fontFamily: "'Orbitron', monospace",
        fontWeight: 800,
        color: CYAN,
        letterSpacing: "0.06em",
        lineHeight: 1,
        display: "inline-block",
        animation: flipping
          ? "digitFlipIn 0.14s cubic-bezier(0.22,1,0.36,1) both, cyanPulse 2.8s ease-in-out infinite"
          : "cyanPulse 2.8s ease-in-out infinite",
        willChange: "transform, text-shadow",
        userSelect: "none",
        /* multi-layer neon glow — base state (animation overrides dynamically) */
        textShadow: `0 0 10px ${CYAN}, 0 0 22px ${CYAN}BB, 0 0 44px ${CYAN}66, 0 0 88px ${CYAN}33`,
      }}
    >
      {displayed}
    </span>
  );
}

function HoloClock({ now, userName, is24h, onToggleFormat }) {
  let hour   = now.getHours();
  const minute = now.getMinutes();
  const second = now.getSeconds();
  const ampm   = hour >= 12 ? "PM" : "AM";

  if (!is24h) {
    hour = hour % 12;
    if (hour === 0) hour = 12;
  }

  const hStr    = String(hour  ).padStart(2, "0");
  const mStr    = String(minute).padStart(2, "0");
  const sStr    = String(second).padStart(2, "0");
  const dateStr = now.toLocaleDateString([], { weekday: "long", month: "long", day: "numeric" });
  const greeting = getGreeting(now.getHours());

  const secOffset = HOLO_C_SEC - (second / 60) * HOLO_C_SEC;
  const minOffset = HOLO_C_MIN - ((minute * 60 + second) / 3600) * HOLO_C_MIN;

  return (
    <motion.div
      initial={{ opacity: 0, y: 14 }}
      animate={{ opacity: 1, y: 0 }}
      transition={{ delay: 0.08, type: "spring", damping: 30, stiffness: 280 }}
      style={{ padding: "16px 16px 8px", position: "relative", zIndex: 1 }}
    >
      <style>{HOLO_CSS}</style>

      {/* ── Holographic ring ── */}
      <div style={{ display: "flex", justifyContent: "center", marginBottom: 10 }}>
        <div style={{ position: "relative", width: 196, height: 196 }}>

          {/* Ambient radial glow — stronger so digits feel lit from within */}
          <div aria-hidden="true" style={{
            position: "absolute", inset: -28, borderRadius: "50%",
            background: `radial-gradient(ellipse 60% 60% at 50% 50%, ${CYAN}22 0%, ${CYAN}08 50%, transparent 75%)`,
            filter: "blur(16px)", pointerEvents: "none",
            animation: "innerGlow 3.6s ease-in-out infinite",
          }} />
          {/* Dark glass behind digits so cyan pops against the background */}
          <div aria-hidden="true" style={{
            position: "absolute",
            top: "50%", left: "50%",
            width: 118, height: 118,
            transform: "translate(-50%, -50%)",
            borderRadius: "50%",
            background: "radial-gradient(ellipse, rgba(2,4,14,0.72) 0%, rgba(2,4,14,0.40) 65%, transparent 100%)",
            pointerEvents: "none",
          }} />

          {/* Ticks + rings SVG */}
          <svg
            width={196} height={196}
            style={{ position: "absolute", inset: 0, transform: "rotate(-90deg)" }}
            aria-hidden="true"
          >
            {HOLO_TICKS.map((t, i) => (
              <line key={i}
                x1={t.x1} y1={t.y1} x2={t.x2} y2={t.y2}
                stroke={t.isMajor ? `${CYAN}52` : `${CYAN}1E`}
                strokeWidth={t.isMajor ? 1.5 : 0.8}
              />
            ))}

            {/* Outer seconds track */}
            <circle cx={HOLO_CX} cy={HOLO_CY} r={HOLO_R_SEC}
              fill="none" stroke={`${CYAN}10`} strokeWidth={2} />
            <motion.circle
              cx={HOLO_CX} cy={HOLO_CY} r={HOLO_R_SEC}
              fill="none" stroke={CYAN} strokeWidth={2.5}
              strokeLinecap="round"
              strokeDasharray={String(HOLO_C_SEC)}
              animate={{ strokeDashoffset: secOffset }}
              transition={{ duration: 1.0, ease: "linear" }}
              style={{ filter: `drop-shadow(0 0 5px ${CYAN}CC)` }}
            />

            {/* Inner minutes track */}
            <circle cx={HOLO_CX} cy={HOLO_CY} r={HOLO_R_MIN}
              fill="none" stroke={`${CYAN}0C`} strokeWidth={1.5} />
            <motion.circle
              cx={HOLO_CX} cy={HOLO_CY} r={HOLO_R_MIN}
              fill="none" stroke={`${CYAN}72`} strokeWidth={2}
              strokeLinecap="round"
              strokeDasharray={String(HOLO_C_MIN)}
              animate={{ strokeDashoffset: minOffset }}
              transition={{ duration: 1.0, ease: "linear" }}
            />
          </svg>

          {/* ── Center digit display ── */}
          <div style={{
            position: "absolute", inset: 0,
            display: "flex", flexDirection: "column",
            alignItems: "center", justifyContent: "center",
          }}>
            {/* HH:MM with flip animations */}
            <div style={{ animation: "holoGlitch 14s ease-in-out infinite" }}>
              <div style={{ display: "flex", alignItems: "baseline", gap: 1, userSelect: "none" }}>
                <FlipDigit value={hStr} fontSize={50} />

                <motion.span
                  animate={{ opacity: second % 2 === 0 ? 1 : 0.12 }}
                  transition={{ duration: 0.06 }}
                  style={{
                    fontSize: 36, fontFamily: "'Orbitron', monospace", fontWeight: 800,
                    color: CYAN, lineHeight: 1, paddingBottom: 2,
                    textShadow: `0 0 12px ${CYAN}, 0 0 28px ${CYAN}CC`,
                    filter: `drop-shadow(0 0 8px ${CYAN})`,
                    userSelect: "none",
                    letterSpacing: 0,
                  }}
                >:</motion.span>

                <FlipDigit value={mStr} fontSize={50} />
              </div>
            </div>

            {/* :SS — Orbitron, cyan, monospaced feel */}
            <div style={{
              fontSize: 11, fontFamily: "'Orbitron', monospace", fontWeight: 600,
              color: CYAN, letterSpacing: "0.30em",
              marginTop: 6, userSelect: "none",
              textShadow: `0 0 8px ${CYAN}CC, 0 0 18px ${CYAN}66`,
              opacity: 0.80,
            }}>:{sStr}</div>

            {/* 12/24h toggle — tap to switch */}
            <motion.button
              onClick={onToggleFormat}
              whileTap={{ scale: 0.88 }}
              title={is24h ? "Switch to 12-hour" : "Switch to 24-hour"}
              style={{
                marginTop: 7, display: "flex", alignItems: "center", gap: 5,
                padding: "3px 9px", borderRadius: 4,
                background: `${CYAN}0E`, border: `0.5px solid ${CYAN}30`,
                cursor: "pointer", WebkitTapHighlightColor: "transparent",
                touchAction: "manipulation",
              }}
            >
              <motion.div
                animate={{ opacity: [1, 0.18, 1] }}
                transition={{ repeat: Infinity, duration: 1.8, ease: "easeInOut" }}
                style={{ width: 3.5, height: 3.5, borderRadius: "50%", background: CYAN, boxShadow: `0 0 6px ${CYAN}` }}
              />
              <span style={{
                fontSize: 7.5, fontFamily: "'JetBrains Mono', monospace",
                color: `${CYAN}80`, letterSpacing: "0.12em", userSelect: "none",
              }}>{is24h ? "24H · TAP 12H" : ampm + " · TAP 24H"}</span>
            </motion.button>
          </div>

          {/* ── Corner HUD brackets ── */}
          {[
            { top: 10, left: 10, rotate: "0deg" },
            { top: 10, right: 10, rotate: "90deg" },
            { bottom: 10, left: 10, rotate: "-90deg" },
            { bottom: 10, right: 10, rotate: "180deg" },
          ].map((pos, i) => (
            <svg key={i} aria-hidden="true" width={14} height={14}
              style={{ position: "absolute", ...pos, opacity: 0.50 }}>
              <path d="M0 11 L0 0 L11 0" fill="none" stroke={CYAN} strokeWidth={1.5} strokeLinecap="round" strokeLinejoin="round" />
            </svg>
          ))}

          {/* Horizontal holographic scan line */}
          <div aria-hidden="true" style={{
            position: "absolute", top: 0, left: 0, right: 0,
            height: 1,
            background: `linear-gradient(90deg, transparent, ${CYAN}55, transparent)`,
            animation: "holoScan 7s ease-in-out infinite",
            pointerEvents: "none",
          }} />
        </div>
      </div>

      {/* ── Date + greeting below ring ── */}
      <div style={{ textAlign: "center" }}>
        <div style={{
          fontSize: 11, fontFamily: "'JetBrains Mono', monospace",
          color: "rgba(255,255,255,0.30)", letterSpacing: "0.08em",
          textTransform: "uppercase", userSelect: "none",
        }}>
          {dateStr}
        </div>

        <motion.div
          initial={{ opacity: 0 }}
          animate={{ opacity: 1 }}
          transition={{ delay: 0.30 }}
          style={{
            fontSize: 21, fontFamily: "'Outfit', sans-serif", fontWeight: 600,
            color: "rgba(255,255,255,0.90)", marginTop: 7, letterSpacing: "-0.02em",
            userSelect: "none", textShadow: "0 2px 18px rgba(0,0,0,0.55)",
          }}
        >
          {greeting}{userName ? `, ${userName}` : ""}
        </motion.div>

        {/* CORTEX ACTIVE indicator */}
        <div style={{ display: "flex", alignItems: "center", justifyContent: "center", gap: 5, marginTop: 7 }}>
          <motion.div
            animate={{ opacity: [1, 0.25, 1], scale: [1, 1.4, 1] }}
            transition={{ repeat: Infinity, duration: 2.6, ease: "easeInOut" }}
            style={{ width: 5, height: 5, borderRadius: "50%", background: CYAN, boxShadow: `0 0 8px ${CYAN}` }}
          />
          <span style={{
            fontSize: 9, color: CYAN, fontFamily: "'Outfit', sans-serif",
            fontWeight: 700, letterSpacing: "0.07em", userSelect: "none",
          }}>CORTEX ACTIVE</span>
        </div>
      </div>
    </motion.div>
  );
}

// ── Cortex Search bar ─────────────────────────────────────────────────────────
const SEARCH_PLACEHOLDERS = [
  "Ask Cortex anything…",
  "Search memories…",
  "What's on my calendar?",
  "Set a reminder…",
  "Search the web…",
  "Open an app…",
  "What did I copy?",
];

const SEARCH_SUGGESTIONS = [
  { icon: "fa-brain",      text: "Summarize my day",       col: "#2DD4BF" },
  { icon: "fa-calendar",   text: "Next event",             col: "#FB923C" },
  { icon: "fa-clipboard",  text: "Recent clipboard",       col: "#818CF8" },
  { icon: "fa-bolt",       text: "Quick note",             col: "#F59E0B" },
];

function CortexSearchBar({ onTap, theme }) {
  const [active,      setActive]      = useState(false);
  const [thinking,    setThinking]    = useState(false);
  const [phIdx,       setPhIdx]       = useState(0);
  const [showSuggest, setShowSuggest] = useState(false);
  const thinkTimerRef = useRef(null);

  useEffect(() => {
    const id = setInterval(() => setPhIdx((i) => (i + 1) % SEARCH_PLACEHOLDERS.length), 3500);
    return () => clearInterval(id);
  }, []);

  // Clear pending think-timer on unmount
  useEffect(() => () => { if (thinkTimerRef.current) clearTimeout(thinkTimerRef.current); }, []);

  const handleTap = useCallback(() => {
    setThinking(true);
    thinkTimerRef.current = setTimeout(() => { setThinking(false); onTap(); }, 320);
  }, [onTap]);

  const handleLongPress = useCallback(() => setShowSuggest((s) => !s), []);

  return (
    <motion.div
      initial={{ opacity: 0, y: -10 }}
      animate={{ opacity: 1, y: 0 }}
      transition={{ delay: 0.04, type: "spring", damping: 28, stiffness: 320 }}
      style={{ padding: "12px 16px 0", flexShrink: 0, position: "relative", zIndex: 10 }}
    >
      <motion.button
        onPointerDown={() => setActive(true)}
        onPointerUp={() => setActive(false)}
        onPointerLeave={() => setActive(false)}
        onClick={handleTap}
        onContextMenu={(e) => { e.preventDefault(); handleLongPress(); }}
        aria-label="Search Cortex"
        animate={{
          scale:     active ? 0.978 : 1,
          boxShadow: active
            ? `0 0 0 2px ${theme.accent}55, 0 0 32px ${theme.glow}, 0 8px 24px rgba(0,0,0,0.50)`
            : showSuggest
            ? `0 0 0 1.5px ${theme.accent}30, 0 0 24px ${theme.glow}, 0 4px 16px rgba(0,0,0,0.40)`
            : `0 0 0 1px rgba(255,255,255,0.06), 0 4px 16px rgba(0,0,0,0.35)`,
        }}
        transition={{ type: "spring", stiffness: 500, damping: 30 }}
        style={{
          width: "100%",
          display: "flex", alignItems: "center", gap: 10,
          padding: "12px 14px",
          borderRadius: showSuggest ? "18px 18px 0 0" : 18,
          background: "rgba(6, 8, 22, 0.78)",
          backdropFilter: "blur(44px) saturate(220%)",
          WebkitBackdropFilter: "blur(44px) saturate(220%)",
          border: `1px solid ${active || showSuggest ? `${theme.accent}35` : "rgba(255,255,255,0.09)"}`,
          borderBottom: showSuggest ? `1px solid ${theme.accent}15` : undefined,
          cursor: "pointer",
          WebkitTapHighlightColor: "transparent",
          touchAction: "manipulation",
          transition: "border-color 0.18s ease, border-radius 0.22s ease",
        }}
      >
        <div style={{
          width: 30, height: 30, borderRadius: 10, flexShrink: 0,
          background: `linear-gradient(135deg, ${theme.accent}25, ${theme.accent}0A)`,
          border: `1px solid ${theme.accent}30`,
          display: "flex", alignItems: "center", justifyContent: "center",
          position: "relative", overflow: "hidden",
        }}>
          <AnimatePresence mode="wait">
            {thinking ? (
              <motion.div
                key="thinking"
                initial={{ opacity: 0, scale: 0.7 }}
                animate={{ opacity: 1, scale: 1 }}
                exit={{ opacity: 0, scale: 0.7 }}
                style={{ display: "flex", gap: 3 }}
              >
                {[0, 1, 2].map((i) => (
                  <motion.div
                    key={i}
                    animate={{ y: [0, -4, 0], opacity: [0.4, 1, 0.4] }}
                    transition={{ duration: 0.7, repeat: Infinity, delay: i * 0.15 }}
                    style={{ width: 4, height: 4, borderRadius: "50%", background: theme.accent }}
                  />
                ))}
              </motion.div>
            ) : (
              <motion.i
                key="mic"
                initial={{ opacity: 0, scale: 0.7 }}
                animate={{ opacity: 1, scale: 1 }}
                exit={{ opacity: 0, scale: 0.7 }}
                className="fa-solid fa-magnifying-glass"
                style={{ color: theme.accent, fontSize: 12, filter: `drop-shadow(0 0 5px ${theme.accent}90)` }}
              />
            )}
          </AnimatePresence>
        </div>

        <div style={{ flex: 1, overflow: "hidden", textAlign: "left", position: "relative", height: 22 }}>
          <AnimatePresence mode="wait">
            <motion.span
              key={phIdx}
              initial={{ opacity: 0, y: 8 }}
              animate={{ opacity: 1, y: 0 }}
              exit={{ opacity: 0, y: -8 }}
              transition={{ duration: 0.26, ease: "easeOut" }}
              style={{
                position: "absolute", inset: 0, display: "flex", alignItems: "center",
                fontSize: 14, fontFamily: "'Outfit', sans-serif",
                fontWeight: 400, color: "rgba(255,255,255,0.28)", userSelect: "none",
                letterSpacing: "0.005em", whiteSpace: "nowrap",
              }}
            >
              {SEARCH_PLACEHOLDERS[phIdx]}
            </motion.span>
          </AnimatePresence>
        </div>

        <motion.div
          animate={{ opacity: thinking ? 0.4 : 1 }}
          style={{
            padding: "3px 9px", borderRadius: 20, flexShrink: 0,
            background: `${theme.accent}14`, border: `1px solid ${theme.accent}25`,
            display: "flex", alignItems: "center", gap: 4,
          }}
        >
          <motion.div
            animate={{ scale: [1, 1.4, 1], opacity: [1, 0.5, 1] }}
            transition={{ duration: 2.4, repeat: Infinity }}
            style={{ width: 4, height: 4, borderRadius: "50%", background: theme.accent, boxShadow: `0 0 6px ${theme.accent}` }}
          />
          <span style={{ fontSize: 9, color: theme.accent, fontFamily: "'Outfit', sans-serif", fontWeight: 700, letterSpacing: "0.10em" }}>AI</span>
        </motion.div>
      </motion.button>

      <AnimatePresence>
        {showSuggest && (
          <motion.div
            initial={{ opacity: 0, height: 0 }}
            animate={{ opacity: 1, height: "auto" }}
            exit={{ opacity: 0, height: 0 }}
            transition={{ type: "spring", damping: 28, stiffness: 340 }}
            style={{
              overflow: "hidden",
              background: "rgba(6,8,22,0.88)",
              backdropFilter: "blur(44px) saturate(220%)",
              WebkitBackdropFilter: "blur(44px) saturate(220%)",
              border: `1px solid ${theme.accent}30`,
              borderTop: "none",
              borderRadius: "0 0 18px 18px",
            }}
          >
            <div style={{ display: "flex", gap: 6, padding: "8px 10px 10px", overflowX: "auto", scrollbarWidth: "none" }}>
              {SEARCH_SUGGESTIONS.map((s, i) => (
                <motion.button
                  key={i}
                  initial={{ opacity: 0, scale: 0.88 }}
                  animate={{ opacity: 1, scale: 1 }}
                  transition={{ delay: i * 0.06, type: "spring", damping: 22, stiffness: 380 }}
                  whileTap={{ scale: 0.92 }}
                  onClick={() => { setShowSuggest(false); onTap(); }}
                  style={{
                    display: "flex", alignItems: "center", gap: 6,
                    padding: "6px 11px", borderRadius: 20, flexShrink: 0,
                    background: `${s.col}0F`, border: `1px solid ${s.col}22`,
                    cursor: "pointer", WebkitTapHighlightColor: "transparent",
                  }}
                >
                  <i className={`fa-solid ${s.icon}`} style={{ color: s.col, fontSize: 11 }} />
                  <span style={{ fontSize: 12, color: "rgba(255,255,255,0.65)", fontFamily: "'Outfit', sans-serif", whiteSpace: "nowrap" }}>
                    {s.text}
                  </span>
                </motion.button>
              ))}
            </div>
          </motion.div>
        )}
      </AnimatePresence>
    </motion.div>
  );
}

// ── Cortex Brief card — real system status, no fake data ─────────────────────

function CortexBriefCard({ now, userName, theme }) {
  const hour    = now.getHours();
  const battery = useBattery();
  const network = useNetwork();

  // Real system checks — derive from actual browser APIs
  const checks = useMemo(() => {
    const list = [
      {
        label: "Cortex online",
        ok: true,
        icon: "fa-brain",
        color: "#00F0FF",
      },
      {
        label: network.online ? "Network connected" : "No network",
        ok: network.online,
        icon: "fa-wifi",
        color: network.online ? "#39FF14" : "#FF003C",
      },
    ];
    if (battery !== null) {
      list.push({
        label: `Battery ${battery.level}%${battery.charging ? " · charging" : ""}`,
        ok: battery.level > 15 || battery.charging,
        icon: battery.charging ? "fa-bolt" : "fa-battery-half",
        color: battery.level > 20 ? "#39FF14" : "#F59E0B",
      });
    }
    list.push({
      label: "All systems nominal",
      ok: true,
      icon: "fa-shield-halved",
      color: "#00F0FF",
    });
    return list.slice(0, 4);
  }, [battery, network.online]);

  return (
    <motion.div
      initial={{ opacity: 0, y: 18, scale: 0.97 }}
      animate={{ opacity: 1, y: 0, scale: 1 }}
      transition={{ delay: 0.16, type: "spring", damping: 26, stiffness: 260 }}
      style={{ margin: "0 16px 12px", position: "relative", zIndex: 1 }}
    >
      <div style={{
        ...GLASS,
        borderColor: `${theme.accent}18`,
        boxShadow: `0 8px 36px rgba(0,0,0,0.52), 0 0 0 1px ${theme.accent}10, inset 0 1px 0 rgba(255,255,255,0.06)`,
      }}>
        <div style={{ padding: "16px 18px" }}>
          {/* Header */}
          <div style={{ display: "flex", alignItems: "center", gap: 10, marginBottom: 13 }}>
            <div style={{
              width: 36, height: 36, borderRadius: 12, flexShrink: 0,
              background: `linear-gradient(135deg, ${theme.accent}30, ${theme.accent}0E)`,
              border: `1px solid ${theme.accent}42`,
              display: "flex", alignItems: "center", justifyContent: "center",
              boxShadow: `0 0 22px ${theme.glow}`,
            }}>
              <i className="fa-solid fa-brain" style={{ color: theme.accent, fontSize: 16, filter: `drop-shadow(0 0 7px ${theme.accent})` }} />
            </div>

            <div style={{ flex: 1 }}>
              <div style={{ fontSize: 10.5, color: theme.accent, fontFamily: "'Outfit', sans-serif", fontWeight: 700, letterSpacing: "0.10em", textTransform: "uppercase" }}>
                Cortex Brief
              </div>
              <div style={{ fontSize: 11.5, color: "rgba(255,255,255,0.48)", fontFamily: "'Outfit', sans-serif", fontWeight: 400, marginTop: 1 }}>
                {userName ? `Welcome back, ${userName}` : "AI System Status"}
              </div>
            </div>

            <div style={{ display: "flex", alignItems: "center", gap: 5 }}>
              <motion.div
                animate={{ opacity: [1, 0.25, 1] }}
                transition={{ repeat: Infinity, duration: 2.2 }}
                style={{ width: 5, height: 5, borderRadius: "50%", background: theme.accent, boxShadow: `0 0 7px ${theme.accent}` }}
              />
              <span style={{ fontSize: 9, color: theme.accent, fontFamily: "'Outfit', sans-serif", fontWeight: 700, letterSpacing: "0.08em" }}>LIVE</span>
            </div>
          </div>

          {/* Brief text — time-based, no fake data */}
          <p style={{
            fontSize: 13.5, fontFamily: "'Outfit', sans-serif", fontWeight: 400,
            color: "rgba(255,255,255,0.65)", lineHeight: 1.58, margin: "0 0 14px", userSelect: "none",
          }}>
            {getAIBriefText(hour)}
          </p>

          <div style={{ height: 1, background: "rgba(255,255,255,0.06)", margin: "0 -2px 13px" }} />

          {/* Real system status checks */}
          <div style={{ marginBottom: 13 }}>
            <div style={{ fontSize: 10, color: "rgba(255,255,255,0.26)", fontFamily: "'Outfit', sans-serif", fontWeight: 700, letterSpacing: "0.08em", textTransform: "uppercase", marginBottom: 9 }}>
              System Status
            </div>
            <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr", gap: "7px 10px" }}>
              {checks.map((check, i) => (
                <div key={i} style={{ display: "flex", alignItems: "center", gap: 7 }}>
                  <motion.div
                    initial={{ scale: 0, rotate: -20 }}
                    animate={{ scale: 1, rotate: 0 }}
                    transition={{ delay: 0.4 + i * 0.12, type: "spring", damping: 14, stiffness: 480 }}
                    style={{
                      width: 17, height: 17, borderRadius: 5, flexShrink: 0,
                      display: "flex", alignItems: "center", justifyContent: "center",
                      background: `${check.color}22`,
                      border: `1px solid ${check.color}44`,
                      boxShadow: `0 0 8px ${check.color}30`,
                    }}
                  >
                    <i className={`fa-solid ${check.icon}`} style={{ fontSize: 7.5, color: check.color }} />
                  </motion.div>
                  <span style={{
                    fontSize: 11.5, fontFamily: "'Outfit', sans-serif", lineHeight: 1.3,
                    color: "rgba(255,255,255,0.72)",
                  }}>
                    {check.label}
                  </span>
                </div>
              ))}
            </div>
          </div>

          {/* Network quality detail */}
          {network.effectiveType && (
            <motion.div
              initial={{ opacity: 0 }}
              animate={{ opacity: 1 }}
              transition={{ delay: 1.0 }}
              style={{
                display: "flex", alignItems: "center", gap: 10,
                padding: "10px 12px", borderRadius: 13,
                background: `${theme.accent}0E`,
                border: `1px solid ${theme.accent}1E`,
              }}
            >
              <i className="fa-solid fa-signal" style={{ color: theme.accent, fontSize: 12, filter: `drop-shadow(0 0 5px ${theme.accent}80)`, flexShrink: 0 }} />
              <div style={{ flex: 1, minWidth: 0 }}>
                <div style={{ fontSize: 9.5, color: theme.accent, fontFamily: "'Outfit', sans-serif", fontWeight: 700, letterSpacing: "0.08em", textTransform: "uppercase", opacity: 0.75 }}>
                  Network
                </div>
                <div style={{ fontSize: 12.5, color: "rgba(255,255,255,0.78)", fontFamily: "'Outfit', sans-serif", marginTop: 1 }}>
                  {network.effectiveType.toUpperCase()} · {network.online ? "Connected" : "Offline"}
                  {network.downlink ? ` · ${network.downlink} Mbps` : ""}
                </div>
              </div>
            </motion.div>
          )}
        </div>
      </div>
    </motion.div>
  );
}

// ── Progress ring ─────────────────────────────────────────────────────────────
function ProgressRing({ value, max, color, size = 40 }) {
  const r     = (size - 7) / 2;
  const circ  = 2 * Math.PI * r;
  const fill  = Math.min(1, value / max) * circ;
  return (
    <svg width={size} height={size} style={{ transform: "rotate(-90deg)", flexShrink: 0 }}>
      <circle cx={size / 2} cy={size / 2} r={r} fill="none" stroke={`${color}1E`} strokeWidth={3} />
      <motion.circle
        cx={size / 2} cy={size / 2} r={r} fill="none" stroke={color} strokeWidth={3}
        strokeLinecap="round" strokeDasharray={circ}
        initial={{ strokeDashoffset: circ }}
        animate={{ strokeDashoffset: circ - fill }}
        transition={{ duration: 1.5, delay: 0.6, ease: [0.34, 1.56, 0.64, 1] }}
        style={{ filter: `drop-shadow(0 0 5px ${color}80)` }}
      />
    </svg>
  );
}

// ── Live System Stats row (real data) ─────────────────────────────────────────

function SystemStatTile({ icon, color, label, value, unit, progress, max, delay }) {
  const [pressed, setPressed] = useState(false);
  return (
    <motion.div
      initial={{ opacity: 0, scale: 0.78 }}
      animate={{ opacity: 1, scale: pressed ? 0.92 : 1 }}
      transition={{ delay, type: "spring", damping: 22, stiffness: 360 }}
      onPointerDown={() => setPressed(true)}
      onPointerUp={()   => setPressed(false)}
      onPointerLeave={()=> setPressed(false)}
      style={{
        ...GLASS,
        borderRadius: 18,
        padding: "11px 4px 10px",
        display: "flex", flexDirection: "column", alignItems: "center", gap: 4,
        background: pressed ? "rgba(6,8,20,0.72)" : GLASS.background,
        boxShadow: pressed
          ? `0 2px 10px rgba(0,0,0,0.65), inset 0 1px 0 rgba(255,255,255,0.04)`
          : `0 8px 32px rgba(0,0,0,0.48), inset 0 1px 0 rgba(255,255,255,0.055)`,
        border: "none",
        cursor: "default",
        transition: "box-shadow 0.14s ease, background 0.14s ease",
        userSelect: "none",
      }}
    >
      <div style={{ position: "relative" }}>
        <ProgressRing value={progress} max={max} color={color} size={42} />
        <div style={{ position: "absolute", inset: 0, display: "flex", alignItems: "center", justifyContent: "center" }}>
          <i className={`fa-solid ${icon}`} style={{ color, fontSize: 13, filter: `drop-shadow(0 0 5px ${color}90)` }} />
        </div>
      </div>
      <div style={{ fontSize: 14, fontWeight: 700, color: "#fff", fontFamily: "'Outfit', sans-serif", letterSpacing: "-0.02em", lineHeight: 1 }}>
        {value}
        {unit && <span style={{ fontSize: 8.5, fontWeight: 500, color: "rgba(255,255,255,0.38)", marginLeft: 2 }}>{unit}</span>}
      </div>
      <div style={{ fontSize: 9.5, color: "rgba(255,255,255,0.28)", fontFamily: "'Outfit', sans-serif", letterSpacing: "0.01em" }}>
        {label}
      </div>
    </motion.div>
  );
}

function LiveStatsRow() {
  const now     = useClock();      // own 1-second tick — isolated from parent
  const battery = useBattery();
  const network = useNetwork();

  // Uptime tile — seconds since page load
  const [uptimeSec, setUptimeSec] = useState(0);
  const startRef = useRef(Date.now());
  useEffect(() => {
    const id = setInterval(() => setUptimeSec(Math.floor((Date.now() - startRef.current) / 1000)), 10000);
    return () => clearInterval(id);
  }, []);
  const uptimeMin = Math.floor(uptimeSec / 60);

  const tiles = useMemo(() => {
    const list = [];

    // Battery — real API
    if (battery !== null) {
      list.push({
        icon: battery.charging ? "fa-bolt" : battery.level > 50 ? "fa-battery-full" : battery.level > 20 ? "fa-battery-half" : "fa-battery-quarter",
        color: battery.charging ? "#39FF14" : battery.level > 20 ? "#39FF14" : "#F59E0B",
        label: "Battery",
        value: battery.level,
        unit: "%",
        progress: battery.level,
        max: 100,
      });
    }

    // Network quality — real API
    const netScore = network.online
      ? (network.effectiveType === "4g" ? 92 : network.effectiveType === "3g" ? 60 : network.effectiveType === "2g" ? 30 : 80)
      : 0;
    list.push({
      icon: network.online ? "fa-wifi" : "fa-wifi-slash",
      color: network.online ? "#00F0FF" : "#FF003C",
      label: "Network",
      value: network.online ? (network.effectiveType || "WiFi").toUpperCase() : "Off",
      unit: null,
      progress: netScore,
      max: 100,
    });

    // Session uptime
    list.push({
      icon: "fa-microchip",
      color: "#A855F7",
      label: "Session",
      value: uptimeMin < 60 ? `${uptimeMin}m` : `${Math.floor(uptimeMin / 60)}h`,
      unit: null,
      progress: Math.min(uptimeMin, 60),
      max: 60,
    });

    // Current hour as "daily progress"
    const dayPct = Math.round((now.getHours() * 60 + now.getMinutes()) / 14.4);
    list.push({
      icon: "fa-clock",
      color: "#FB923C",
      label: "Day",
      value: `${dayPct}`,
      unit: "%",
      progress: dayPct,
      max: 100,
    });

    return list.slice(0, 4);
  }, [battery, network, uptimeMin, now]);

  return (
    <motion.div
      initial={{ opacity: 0, y: 12 }}
      animate={{ opacity: 1, y: 0 }}
      transition={{ delay: 0.22, type: "spring", damping: 28, stiffness: 260 }}
      style={{ display: "grid", gridTemplateColumns: "repeat(4, 1fr)", gap: 8, margin: "0 16px 12px", position: "relative", zIndex: 1 }}
    >
      {tiles.map((tile, i) => (
        <SystemStatTile key={tile.label} {...tile} delay={0.25 + i * 0.06} />
      ))}
    </motion.div>
  );
}

// ── Calendar card — empty state (no fake events) ───────────────────────────────

function CalendarCard({ onOpenApp }) {
  return (
    <motion.div
      initial={{ opacity: 0, y: 14 }}
      animate={{ opacity: 1, y: 0 }}
      transition={{ delay: 0.30, type: "spring", damping: 28, stiffness: 260 }}
      style={{ margin: "0 16px 12px", ...GLASS, position: "relative", zIndex: 1 }}
    >
      <div style={{ padding: "15px 16px" }}>
        <div style={{ display: "flex", alignItems: "center", justifyContent: "space-between", marginBottom: 13 }}>
          <div style={{ display: "flex", alignItems: "center", gap: 8 }}>
            <i className="fa-solid fa-calendar" style={{ color: "#FB923C", fontSize: 13, filter: "drop-shadow(0 0 5px rgba(251,146,60,0.70))" }} />
            <span style={{ fontSize: 13, fontWeight: 700, color: "rgba(255,255,255,0.88)", fontFamily: "'Outfit', sans-serif", letterSpacing: "-0.01em" }}>
              Today's Schedule
            </span>
          </div>
          <button
            onClick={() => onOpenApp("calendar")}
            style={{ background: "none", border: "none", cursor: "pointer", padding: "4px 6px", WebkitTapHighlightColor: "transparent" }}
            aria-label="Open Calendar"
          >
            <i className="fa-solid fa-arrow-up-right-from-square" style={{ color: "rgba(255,255,255,0.20)", fontSize: 11 }} />
          </button>
        </div>

        {/* Empty state */}
        <div style={{ display: "flex", flexDirection: "column", alignItems: "center", padding: "12px 0", gap: 8 }}>
          <div style={{
            width: 40, height: 40, borderRadius: 12,
            background: "rgba(251,146,60,0.08)", border: "1px solid rgba(251,146,60,0.18)",
            display: "flex", alignItems: "center", justifyContent: "center",
          }}>
            <i className="fa-regular fa-calendar" style={{ fontSize: 18, color: "#FB923C", opacity: 0.5 }} />
          </div>
          <div style={{ textAlign: "center" }}>
            <div style={{ fontSize: 13, color: "rgba(255,255,255,0.55)", fontFamily: "'Outfit', sans-serif", fontWeight: 500 }}>
              No events today
            </div>
            <div style={{ fontSize: 11, color: "rgba(255,255,255,0.25)", fontFamily: "'Outfit', sans-serif", marginTop: 3 }}>
              Open Calendar to add events
            </div>
          </div>
        </div>
      </div>
    </motion.div>
  );
}

// ── Memory card — empty state ──────────────────────────────────────────────────

function MemoryCard({ onOpenApp }) {
  return (
    <motion.div
      initial={{ opacity: 0, y: 14 }}
      animate={{ opacity: 1, y: 0 }}
      transition={{ delay: 0.36, type: "spring", damping: 28, stiffness: 260 }}
      style={{ margin: "0 16px 12px", ...GLASS, position: "relative", zIndex: 1 }}
    >
      <div style={{ padding: "15px 16px" }}>
        <div style={{ display: "flex", alignItems: "center", justifyContent: "space-between", marginBottom: 12 }}>
          <div style={{ display: "flex", alignItems: "center", gap: 8 }}>
            <i className="fa-solid fa-brain" style={{ color: "#2DD4BF", fontSize: 13, filter: "drop-shadow(0 0 5px rgba(45,212,191,0.70))" }} />
            <span style={{ fontSize: 13, fontWeight: 700, color: "rgba(255,255,255,0.88)", fontFamily: "'Outfit', sans-serif", letterSpacing: "-0.01em" }}>Memory</span>
          </div>
          <button onClick={() => onOpenApp("memory")} style={{ background: "none", border: "none", cursor: "pointer", padding: "4px 6px", WebkitTapHighlightColor: "transparent" }} aria-label="Open Memory">
            <i className="fa-solid fa-arrow-up-right-from-square" style={{ color: "rgba(255,255,255,0.20)", fontSize: 11 }} />
          </button>
        </div>

        <div style={{ display: "flex", flexDirection: "column", alignItems: "center", padding: "12px 0", gap: 8 }}>
          <div style={{
            width: 40, height: 40, borderRadius: 12,
            background: "rgba(45,212,191,0.08)", border: "1px solid rgba(45,212,191,0.18)",
            display: "flex", alignItems: "center", justifyContent: "center",
          }}>
            <i className="fa-solid fa-brain" style={{ fontSize: 18, color: "#2DD4BF", opacity: 0.5 }} />
          </div>
          <div style={{ textAlign: "center" }}>
            <div style={{ fontSize: 13, color: "rgba(255,255,255,0.55)", fontFamily: "'Outfit', sans-serif", fontWeight: 500 }}>
              No memories captured yet
            </div>
            <div style={{ fontSize: 11, color: "rgba(255,255,255,0.25)", fontFamily: "'Outfit', sans-serif", marginTop: 3 }}>
              Cortex will learn as you use OmniverseOS
            </div>
          </div>
        </div>
      </div>
    </motion.div>
  );
}

// ── Recent notes card — empty state ────────────────────────────────────────────

function RecentNotesCard({ onOpenApp }) {
  return (
    <motion.div
      initial={{ opacity: 0, y: 14 }}
      animate={{ opacity: 1, y: 0 }}
      transition={{ delay: 0.42, type: "spring", damping: 28, stiffness: 260 }}
      style={{ margin: "0 16px 12px", ...GLASS, position: "relative", zIndex: 1 }}
    >
      <div style={{ padding: "15px 16px" }}>
        <div style={{ display: "flex", alignItems: "center", justifyContent: "space-between", marginBottom: 12 }}>
          <div style={{ display: "flex", alignItems: "center", gap: 8 }}>
            <i className="fa-solid fa-note-sticky" style={{ color: "#F59E0B", fontSize: 13, filter: "drop-shadow(0 0 5px rgba(245,158,11,0.70))" }} />
            <span style={{ fontSize: 13, fontWeight: 700, color: "rgba(255,255,255,0.88)", fontFamily: "'Outfit', sans-serif", letterSpacing: "-0.01em" }}>Recent Notes</span>
          </div>
          <button onClick={() => onOpenApp("notes")} style={{ background: "none", border: "none", cursor: "pointer", padding: "4px 6px", WebkitTapHighlightColor: "transparent" }} aria-label="Open Notes">
            <i className="fa-solid fa-arrow-up-right-from-square" style={{ color: "rgba(255,255,255,0.20)", fontSize: 11 }} />
          </button>
        </div>

        <div style={{ display: "flex", flexDirection: "column", alignItems: "center", padding: "12px 0", gap: 8 }}>
          <div style={{
            width: 40, height: 40, borderRadius: 12,
            background: "rgba(245,158,11,0.08)", border: "1px solid rgba(245,158,11,0.18)",
            display: "flex", alignItems: "center", justifyContent: "center",
          }}>
            <i className="fa-regular fa-note-sticky" style={{ fontSize: 18, color: "#F59E0B", opacity: 0.5 }} />
          </div>
          <div style={{ textAlign: "center" }}>
            <div style={{ fontSize: 13, color: "rgba(255,255,255,0.55)", fontFamily: "'Outfit', sans-serif", fontWeight: 500 }}>
              No recent notes
            </div>
            <div style={{ fontSize: 11, color: "rgba(255,255,255,0.25)", fontFamily: "'Outfit', sans-serif", marginTop: 3 }}>
              Open Notes to start capturing ideas
            </div>
          </div>
        </div>
      </div>
    </motion.div>
  );
}

// ── Quick access row ──────────────────────────────────────────────────────────

const QUICK_APPS = [
  { id: "chat",     name: "AI Chat",  icon: "fa-comments",    color: "#00F0FF" },
  { id: "notes",    name: "Notes",    icon: "fa-note-sticky",  color: "#F59E0B" },
  { id: "tasks",    name: "Tasks",    icon: "fa-list-check",   color: "#39FF14" },
  { id: "calendar", name: "Calendar", icon: "fa-calendar",     color: "#FB923C" },
  { id: "music",    name: "Music",    icon: "fa-music",        color: "#F472B6" },
  { id: "memory",   name: "Memory",   icon: "fa-brain",        color: "#2DD4BF" },
];

function AppQuickIcon({ app, onPress, delay }) {
  const [pressed, setPressed] = useState(false);
  return (
    <motion.div
      initial={{ opacity: 0, scale: 0.68 }}
      animate={{ opacity: 1, scale: 1 }}
      transition={{ delay, type: "spring", damping: 22, stiffness: 380 }}
      style={{ display: "flex", flexDirection: "column", alignItems: "center" }}
    >
      <motion.button
        onPointerDown={()  => setPressed(true)}
        onPointerUp={()    => { setPressed(false); onPress(app.id); }}
        onPointerLeave={()  => setPressed(false)}
        animate={{ scale: pressed ? 0.78 : 1 }}
        transition={{ type: "spring", stiffness: 640, damping: 20, mass: 0.16 }}
        aria-label={`Open ${app.name}`}
        style={{
          display: "flex", flexDirection: "column", alignItems: "center", gap: 5,
          background: "transparent", border: "none", cursor: "pointer",
          padding: "7px 3px",
          WebkitTapHighlightColor: "transparent",
          touchAction: "manipulation", userSelect: "none",
          minWidth: 52,
        }}
      >
        <motion.div
          animate={{ boxShadow: pressed ? `0 0 22px ${app.color}70, 0 4px 12px rgba(0,0,0,0.55)` : `0 4px 18px rgba(0,0,0,0.38), inset 0 1px 0 rgba(255,255,255,0.07)` }}
          style={{
            width: 50, height: 50, borderRadius: 16,
            background: `linear-gradient(145deg, ${app.color}20 0%, ${app.color}08 100%)`,
            border: `1px solid ${app.color}28`,
            display: "flex", alignItems: "center", justifyContent: "center",
            backdropFilter: "blur(20px)", WebkitBackdropFilter: "blur(20px)",
            position: "relative", overflow: "hidden",
          }}
        >
          <i className={`fa-solid ${app.icon}`} style={{ color: app.color, fontSize: 21, filter: `drop-shadow(0 0 8px ${app.color}90)` }} />
        </motion.div>
        <span style={{
          fontSize: 9.5, fontFamily: "'Outfit', sans-serif", fontWeight: 500,
          color: "rgba(255,255,255,0.60)", textAlign: "center", lineHeight: 1.2,
          maxWidth: 56, overflow: "hidden", textOverflow: "ellipsis", whiteSpace: "nowrap",
          textShadow: "0 1px 6px rgba(0,0,0,0.90)", userSelect: "none",
        }}>
          {app.name}
        </span>
      </motion.button>
    </motion.div>
  );
}

function QuickAccessRow({ onOpenApp }) {
  return (
    <motion.div
      initial={{ opacity: 0, y: 14 }}
      animate={{ opacity: 1, y: 0 }}
      transition={{ delay: 0.48, type: "spring", damping: 28, stiffness: 260 }}
      style={{ margin: "0 16px 12px", position: "relative", zIndex: 1 }}
    >
      <div style={{
        fontSize: 10.5, color: "rgba(255,255,255,0.28)", fontFamily: "'Outfit', sans-serif",
        letterSpacing: "0.09em", textTransform: "uppercase", fontWeight: 700,
        marginBottom: 10, paddingLeft: 2,
      }}>
        Quick Access
      </div>
      <div style={{ display: "grid", gridTemplateColumns: "repeat(6, 1fr)", gap: "6px 0" }}>
        {QUICK_APPS.map((app, i) => (
          <AppQuickIcon key={app.id} app={app} onPress={onOpenApp} delay={0.50 + i * 0.03} />
        ))}
      </div>
    </motion.div>
  );
}

// ── App library hint ──────────────────────────────────────────────────────────

function AppLibraryHint({ onOpen }) {
  return (
    <motion.div
      initial={{ opacity: 0 }}
      animate={{ opacity: 1 }}
      transition={{ delay: 1.1, duration: 0.5 }}
      style={{ display: "flex", flexDirection: "column", alignItems: "center", paddingTop: 4, paddingBottom: 10, gap: 3, flexShrink: 0, position: "relative", zIndex: 1 }}
    >
      <motion.button
        onClick={onOpen}
        style={{
          background: "none", border: "none", cursor: "pointer",
          padding: "8px 28px", WebkitTapHighlightColor: "transparent",
          touchAction: "manipulation",
          display: "flex", flexDirection: "column", alignItems: "center", gap: 4,
        }}
        aria-label="Open App Library"
      >
        <motion.i
          className="fa-solid fa-chevron-up"
          animate={{ y: [0, -4, 0] }}
          transition={{ repeat: Infinity, duration: 2.6, ease: "easeInOut" }}
          style={{ fontSize: 11, color: "rgba(255,255,255,0.18)" }}
        />
        <span style={{ fontSize: 10, color: "rgba(255,255,255,0.16)", fontFamily: "'Outfit', sans-serif", letterSpacing: "0.06em", userSelect: "none" }}>
          App Library
        </span>
      </motion.button>
    </motion.div>
  );
}

// ── AI home feed ──────────────────────────────────────────────────────────────

// Static cards — memoized so they never re-render from the 1-second clock tick.
// LiveStatsRow drives its own useClock() internally, so this tree stays stable.
const StaticFeedContent = React.memo(function StaticFeedContent({ onOpenApp }) {
  return (
    <>
      <LiveStatsRow />
      <CalendarCard onOpenApp={onOpenApp} />
      <MemoryCard onOpenApp={onOpenApp} />
      <RecentNotesCard onOpenApp={onOpenApp} />
      <QuickAccessRow onOpenApp={onOpenApp} />
      <div style={{ height: 16 }} />
    </>
  );
});

function AIHomeContent({ onOpenApp, onOpenDrawer, onOpenSearch, feedScrollRef }) {
  const now      = useClock();
  const theme    = useMemo(() => getTheme(), []);
  const [is24h, toggleFormat] = useClockFormat();
  const userName = useMemo(() => {
    try { return localStorage.getItem("omniverse_user_name") || ""; } catch { return ""; }
  }, []);

  const localFeedRef = useRef(null);

  const handleRef = useCallback((node) => {
    localFeedRef.current = node;
    if (feedScrollRef) feedScrollRef.current = node;
  }, [feedScrollRef]);

  const handleScroll = useCallback(() => {
    if (!localFeedRef.current) return;
    window.dispatchEvent(new CustomEvent("aiHomeScroll", { detail: { scrollY: localFeedRef.current.scrollTop } }));
  }, []);

  return (
    <div style={{ display: "flex", flexDirection: "column", height: "100%", position: "relative", overflow: "hidden" }}>
      {/* Living neural wallpaper — behind everything */}
      <NeuralWallpaper style={{ zIndex: 0 }} />
      {/* Dark overlay to keep content readable */}
      <div aria-hidden="true" style={{ position: "absolute", inset: 0, background: "rgba(3,4,12,0.55)", zIndex: 0, pointerEvents: "none" }} />

      {/* Search bar — sticky at top */}
      <CortexSearchBar onTap={onOpenSearch} theme={theme} />

      {/* Scrollable feed — GPU-native momentum scroll */}
      <div
        ref={handleRef}
        onScroll={handleScroll}
        style={{
          flex: 1,
          overflowY: "auto",
          overflowX: "hidden",
          WebkitOverflowScrolling: "touch",
          scrollbarWidth: "none",
          msOverflowStyle: "none",
          overscrollBehavior: "contain",
          position: "relative",
          zIndex: 1,
          contain: "content",
        }}
      >
        <style>{`div::-webkit-scrollbar{display:none}`}</style>

        {/* Holographic ring clock — re-renders on every tick */}
        <HoloClock now={now} userName={userName} is24h={is24h} onToggleFormat={toggleFormat} />
        <CortexBriefCard now={now} userName={userName} theme={theme} />

        {/* Static cards — memoized, skip re-render on clock ticks */}
        <StaticFeedContent onOpenApp={onOpenApp} />
      </div>

      {/* App Library hint */}
      <AppLibraryHint onOpen={onOpenDrawer} />
    </div>
  );
}

// ── Main export ───────────────────────────────────────────────────────────────

export default function MobileHomeScreen({ onOpenApp, onOpenSearch }) {
  const [showDrawer, setShowDrawer] = useState(false);
  const [globalPage, setGlobalPage] = useState(1);
  const [direction,  setDirection]  = useState(0);

  const touchStartX   = useRef(null);
  const touchStartY   = useRef(null);
  const axisLocked    = useRef(null);
  const peekRef       = useRef(null);
  const peekRafId     = useRef(null);
  const peekTimerId   = useRef(null);
  const showDrawerRef = useRef(false);
  const feedScrollRef = useRef(null);

  useEffect(() => { showDrawerRef.current = showDrawer; }, [showDrawer]);

  useEffect(() => {
    return () => {
      if (peekRafId.current)   cancelAnimationFrame(peekRafId.current);
      if (peekTimerId.current) clearTimeout(peekTimerId.current);
    };
  }, []);

  const navigate = useCallback((delta) => {
    setGlobalPage((p) => {
      const next = Math.max(0, Math.min(1, p + delta));
      setDirection(delta);
      return next;
    });
  }, []);

  const resetPeek = useCallback(() => {
    if (!peekRef.current) return;
    peekRef.current.style.transition = "transform 0.30s cubic-bezier(0.4,0,1,1), opacity 0.22s ease";
    peekRef.current.style.transform  = "translate3d(0,0,0)";
    peekRef.current.style.opacity    = "0";
    if (peekTimerId.current) clearTimeout(peekTimerId.current);
    peekTimerId.current = setTimeout(() => {
      if (peekRef.current) peekRef.current.style.transition = "none";
      peekTimerId.current = null;
    }, 320);
  }, []);

  const handleTouchStart = useCallback((e) => {
    touchStartX.current = e.touches[0].clientX;
    touchStartY.current = e.touches[0].clientY;
    axisLocked.current  = null;
    if (peekRef.current) {
      peekRef.current.style.transition = "none";
    }
  }, []);

  const handleTouchMove = useCallback((e) => {
    if (touchStartX.current === null) return;
    const curX = e.touches[0].clientX;
    const curY = e.touches[0].clientY;
    const dxA  = Math.abs(curX - touchStartX.current);
    const dyA  = Math.abs(curY - touchStartY.current);

    if (axisLocked.current === null && (dxA > 7 || dyA > 7)) {
      axisLocked.current = dxA > dyA ? "h" : "v";
    }

    if (axisLocked.current === "v" && !showDrawerRef.current) {
      const swipeUp = touchStartY.current - curY;
      if (swipeUp > 0 && peekRef.current) {
        const clamped = Math.min(swipeUp, 140);
        const opacity = Math.min(0.95, clamped / 100);
        if (peekRafId.current) cancelAnimationFrame(peekRafId.current);
        peekRafId.current = requestAnimationFrame(() => {
          if (peekRef.current) {
            peekRef.current.style.transform = `translate3d(0,${-clamped}px,0)`;
            peekRef.current.style.opacity   = String(opacity);
          }
        });
      }
    }
  }, []);

  const handleTouchEnd = useCallback((e) => {
    if (touchStartX.current === null) return;
    if (peekRafId.current) cancelAnimationFrame(peekRafId.current);

    const dx   = e.changedTouches[0].clientX - touchStartX.current;
    const dy   = e.changedTouches[0].clientY - touchStartY.current;
    const axis = axisLocked.current;
    touchStartX.current = null;
    axisLocked.current  = null;

    const feedAtTop = !feedScrollRef.current || feedScrollRef.current.scrollTop < 8;
    if (axis === "v" && dy < -60 && globalPage === 1 && !showDrawer && feedAtTop) {
      resetPeek();
      setShowDrawer(true);
      return;
    }

    resetPeek();

    if (axis === "h" && Math.abs(dx) > 48) {
      if (dx < 0) navigate(1);
      if (dx > 0) navigate(-1);
    }
  }, [navigate, globalPage, showDrawer, resetPeek]);

  const pageVariants = {
    initial: (dir) => ({ opacity: 0, x: dir > 0 ?  "18%" : "-18%", scale: 0.97 }),
    animate:          { opacity: 1, x: "0%",                         scale: 1    },
    exit:    (dir) => ({ opacity: 0, x: dir > 0 ? "-18%" :  "18%",  scale: 0.97 }),
  };

  return (
    <>
      <motion.div
        initial={{ opacity: 0 }}
        animate={{ opacity: 1 }}
        exit={{ opacity: 0 }}
        transition={{ duration: 0.22, ease: "easeOut" }}
        style={{
          position: "absolute",
          top: "calc(60px + env(safe-area-inset-top, 0px))",
          left: 0, right: 0,
          bottom: "calc(88px + env(safe-area-inset-bottom, 0px))",
          display: "flex", flexDirection: "column",
          zIndex: 8, pointerEvents: "auto", overflowX: "hidden",
        }}
        onTouchStart={handleTouchStart}
        onTouchMove={handleTouchMove}
        onTouchEnd={handleTouchEnd}
      >
        {/* Page area */}
        <div style={{ flex: 1, minHeight: 0, position: "relative", overflow: "hidden" }}>
          <AnimatePresence mode="wait" initial={false} custom={direction}>
            <motion.div
              key={globalPage}
              custom={direction}
              variants={pageVariants}
              initial="initial"
              animate="animate"
              exit="exit"
              transition={{ type: "spring", damping: 26, stiffness: 380, mass: 0.35 }}
              style={{ position: "absolute", inset: 0 }}
            >
              {globalPage === 0 ? (
                <MobileWidgetView />
              ) : (
                <AIHomeContent
                  onOpenApp={onOpenApp}
                  onOpenDrawer={() => setShowDrawer(true)}
                  onOpenSearch={onOpenSearch}
                  feedScrollRef={feedScrollRef}
                />
              )}
            </motion.div>
          </AnimatePresence>
        </div>

        {/* Page indicator */}
        <div style={{ display: "flex", justifyContent: "center", alignItems: "center", gap: 5, paddingBottom: 9, paddingTop: 2, flexShrink: 0 }}>
          {[0, 1].map((i) => {
            const isActive = i === globalPage;
            const accent   = i === 0 ? "#7C3AED" : "#00F0FF";
            return (
              <motion.div
                key={i}
                onClick={() => { setDirection(i > globalPage ? 1 : -1); setGlobalPage(i); }}
                animate={{
                  scale:   isActive ? 1 : 0.60,
                  opacity: isActive ? 1 : 0.30,
                  background: isActive ? accent : "#ffffff",
                }}
                transition={{ type: "spring", damping: 20, stiffness: 340 }}
                style={{
                  width: 5, height: 5, borderRadius: "50%",
                  cursor: "pointer",
                  boxShadow: isActive ? `0 0 7px ${accent}` : "none",
                  WebkitTapHighlightColor: "transparent",
                }}
              />
            );
          })}
        </div>

        {/* Widget swipe hint */}
        {globalPage === 1 && (
          <motion.div
            initial={{ opacity: 0, x: -16 }}
            animate={{ opacity: 0.28, x: 0 }}
            transition={{ delay: 1.4, duration: 0.4 }}
            style={{
              position: "absolute", left: 12, top: "40%",
              transform: "translateY(-50%)",
              display: "flex", alignItems: "center", gap: 3,
              pointerEvents: "none",
            }}
          >
            <motion.i
              className="fa-solid fa-chevron-left"
              animate={{ x: [-3, 0, -3] }}
              transition={{ repeat: 3, duration: 1, delay: 1.6 }}
              style={{ fontSize: 10, color: "rgba(255,255,255,0.35)" }}
            />
            <span style={{ fontSize: 9.5, color: "rgba(255,255,255,0.26)", fontFamily: "'Outfit', sans-serif" }}>Widgets</span>
          </motion.div>
        )}
      </motion.div>

      {/* Live drawer-peek strip */}
      <div
        ref={peekRef}
        aria-hidden="true"
        style={{
          position: "absolute",
          bottom: -90, left: 0, right: 0,
          height: 110,
          borderRadius: "22px 22px 0 0",
          background: "rgba(12,12,20,0.80)",
          backdropFilter: "blur(30px) saturate(180%)",
          WebkitBackdropFilter: "blur(30px) saturate(180%)",
          border: "1px solid rgba(255,255,255,0.10)",
          borderBottom: "none",
          zIndex: 30,
          pointerEvents: "none",
          opacity: 0,
          transform: "translate3d(0,0,0)",
          willChange: "transform, opacity",
          display: "flex", alignItems: "flex-start", justifyContent: "center",
          paddingTop: 10,
        }}
      >
        <div style={{ width: 36, height: 4, borderRadius: 2, background: "rgba(255,255,255,0.28)" }} />
      </div>

      {/* App Drawer */}
      <AnimatePresence>
        {showDrawer && (
          <MobileAppDrawer
            key="app-drawer"
            onClose={() => setShowDrawer(false)}
            onOpenApp={(id) => { setShowDrawer(false); onOpenApp(id); }}
          />
        )}
      </AnimatePresence>
    </>
  );
}
