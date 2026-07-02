/**
 * MobileHomeScreen.js — Cortex Command Center
 *
 * ONE living surface. No stacked cards. No scrolling. No redundant greetings.
 * Clock is the visual identity. Cortex is the OS, not a widget.
 *
 * Layout (top → bottom, all visible without scrolling):
 *   AmbientBackground (full-screen canvas)
 *   ↓ flex-center hero: CortexClock (with weather + battery arc)
 *   ↓ CortexStatusLine (one real contextual sentence)
 *   ↓ QuickAppsRow (6 icons, compact glass card)
 *   ↓ CortexSearchBar (thumb-accessible)
 *   ↓ AppLibraryHint (swipe indicator)
 */

import React, { useState, useRef, useCallback, useEffect, useMemo } from "react";
import { motion, AnimatePresence } from "framer-motion";
import MobileWidgetView from "../widgets/MobileWidgetView";
import MobileAppDrawer from "./MobileAppDrawer";

// Dock pinned apps — keep in sync with Dock.js
export const PINNED_APP_IDS = ["voice", "browser", "files", "settings"];

// ─── Real browser API hooks ───────────────────────────────────────────────────

function useClock() {
  const [now, setNow] = useState(() => new Date());
  useEffect(() => {
    const id = setInterval(() => setNow(new Date()), 1000);
    return () => clearInterval(id);
  }, []);
  return now;
}

function useBattery() {
  const [battery, setBattery] = useState(null);
  useEffect(() => {
    let mounted = true;
    let mgr = null;
    const onLevel  = () => { if (mounted && mgr) setBattery({ level: Math.round(mgr.level * 100), charging: mgr.charging }); };
    const onCharge = () => { if (mounted && mgr) setBattery({ level: Math.round(mgr.level * 100), charging: mgr.charging }); };
    if (navigator.getBattery) {
      navigator.getBattery().then((b) => {
        if (!mounted) return;
        mgr = b;
        setBattery({ level: Math.round(b.level * 100), charging: b.charging });
        b.addEventListener("levelchange",    onLevel);
        b.addEventListener("chargingchange", onCharge);
      }).catch(() => {});
    }
    return () => {
      mounted = false;
      if (mgr) {
        mgr.removeEventListener("levelchange",    onLevel);
        mgr.removeEventListener("chargingchange", onCharge);
      }
    };
  }, []);
  return battery;
}

function useNetwork() {
  const getInfo = useCallback(() => {
    const c = navigator.connection || navigator.mozConnection || navigator.webkitConnection;
    return { online: navigator.onLine, effectiveType: c?.effectiveType || null };
  }, []);
  const [net, setNet] = useState(() => getInfo());
  useEffect(() => {
    const up = () => setNet(getInfo());
    window.addEventListener("online",  up);
    window.addEventListener("offline", up);
    const c = navigator.connection || navigator.mozConnection || navigator.webkitConnection;
    if (c) c.addEventListener("change", up);
    return () => {
      window.removeEventListener("online",  up);
      window.removeEventListener("offline", up);
      if (c) c.removeEventListener("change", up);
    };
  }, [getInfo]);
  return net;
}

// ─── Weather via Open-Meteo (free, no key) ────────────────────────────────────

const WMO_MAP = {
  0:  { icon: "fa-sun",          label: "Clear",       col: "#FCEE09" },
  1:  { icon: "fa-sun",          label: "Mainly Clear",col: "#FCEE09" },
  2:  { icon: "fa-cloud-sun",    label: "Partly Cloudy",col:"#94A3B8" },
  3:  { icon: "fa-cloud",        label: "Overcast",    col: "#64748B" },
  45: { icon: "fa-smog",         label: "Foggy",       col: "#94A3B8" },
  51: { icon: "fa-cloud-drizzle",label: "Drizzle",     col: "#7DD3FC" },
  61: { icon: "fa-cloud-rain",   label: "Rain",        col: "#00F0FF" },
  71: { icon: "fa-snowflake",    label: "Snow",        col: "#BAE6FD" },
  80: { icon: "fa-cloud-rain",   label: "Showers",     col: "#0EA5E9" },
  95: { icon: "fa-cloud-bolt",   label: "Thunderstorm",col: "#A78BFA" },
};
function wmoLookup(code) {
  if (code == null) return { icon: "fa-cloud", label: "—", col: "#94A3B8" };
  const keys = Object.keys(WMO_MAP).map(Number).filter((k) => k <= code);
  return WMO_MAP[keys.length ? Math.max(...keys) : 0] ?? { icon: "fa-cloud", label: "—", col: "#94A3B8" };
}

function useWeather() {
  const [data, setData] = useState(null);
  useEffect(() => {
    let active = true;
    try {
      const cached = JSON.parse(localStorage.getItem("omni_wx_v3") || "null");
      if (cached && Date.now() - cached.ts < 600_000) { setData(cached); return; }
    } catch {}
    if (!navigator.geolocation) return;
    navigator.geolocation.getCurrentPosition(
      async ({ coords: { latitude: lat, longitude: lon } }) => {
        try {
          const url = `https://api.open-meteo.com/v1/forecast?latitude=${lat.toFixed(4)}&longitude=${lon.toFixed(4)}&current=temperature_2m,weather_code&temperature_unit=celsius`;
          const res = await fetch(url);
          if (!res.ok) return;
          const json = await res.json();
          const d = { temp: Math.round(json.current?.temperature_2m ?? 0), code: json.current?.weather_code ?? 0, ts: Date.now() };
          if (active) setData(d);
          try { localStorage.setItem("omni_wx_v3", JSON.stringify(d)); } catch {}
        } catch {}
      },
      () => {},
      { maximumAge: 600_000, timeout: 8_000 }
    );
    return () => { active = false; };
  }, []);
  return data;
}

// ─── 12 / 24h preference ──────────────────────────────────────────────────────
const CLOCK_FMT_KEY = "omniverse_clock_format";
function useClockFormat() {
  const [is24h, setIs24h] = useState(() => {
    try { return localStorage.getItem(CLOCK_FMT_KEY) === "24h"; } catch { return false; }
  });
  const toggle = useCallback(() => {
    setIs24h((v) => {
      const next = !v;
      try { localStorage.setItem(CLOCK_FMT_KEY, next ? "24h" : "12h"); } catch {}
      return next;
    });
  }, []);
  return [is24h, toggle];
}

// ─── Time-of-day adaptive theme ───────────────────────────────────────────────
function getTheme(h) {
  if (h >= 5  && h < 8)  return { accent: "#FF8C42", glow: "rgba(255,140,66,0.22)",  secondary: "rgba(255,180,80,0.10)",  name: "dawn"      };
  if (h >= 8  && h < 12) return { accent: "#00F0FF", glow: "rgba(0,240,255,0.18)",   secondary: "rgba(0,200,255,0.08)",   name: "morning"   };
  if (h >= 12 && h < 17) return { accent: "#A78BFA", glow: "rgba(167,139,250,0.18)", secondary: "rgba(124,58,237,0.08)",  name: "afternoon" };
  if (h >= 17 && h < 21) return { accent: "#F59E0B", glow: "rgba(245,158,11,0.22)",  secondary: "rgba(251,146,60,0.10)",  name: "evening"   };
  return                         { accent: "#4F46E5", glow: "rgba(79,70,229,0.22)",   secondary: "rgba(99,102,241,0.08)",  name: "night"     };
}

// ─── Contextual one-line Cortex status (no generic greetings) ─────────────────
function getCortexStatus(h, weather, battery, network) {
  if (battery && battery.level <= 15 && !battery.charging) return "Low power — consider charging";
  if (!network.online) return "Offline mode · Local functions active";
  if (battery && battery.charging && battery.level >= 98) return "Fully charged · Cortex ready";
  if (weather) {
    if (weather.code >= 95) return `Thunderstorm · ${weather.temp}°C · Stay safe`;
    if (weather.code >= 71) return `Snow conditions · ${weather.temp}°C`;
    if (weather.code >= 61) return `Rain outside · ${weather.temp}°C`;
  }
  if (h < 5)  return "Night mode · All systems nominal";
  if (h < 9)  return "Morning systems online · Ask Cortex anything";
  if (h < 12) return "Morning · Systems running optimally";
  if (h < 14) return "Midday · What would you like to do?";
  if (h < 17) return "Afternoon · All subsystems operational";
  if (h < 21) return "Evening · Context prepared for tomorrow";
  return "Night watch active · Everything nominal";
}

// ─── Shared glass style ───────────────────────────────────────────────────────
const GLASS = {
  background: "rgba(6, 8, 18, 0.58)",
  backdropFilter: "blur(36px) saturate(200%)",
  WebkitBackdropFilter: "blur(36px) saturate(200%)",
  border: "1px solid rgba(255,255,255,0.085)",
  borderRadius: 22,
  boxShadow: "0 8px 36px rgba(0,0,0,0.52), inset 0 1px 0 rgba(255,255,255,0.058)",
};

// ─── Keyframe CSS ─────────────────────────────────────────────────────────────
const CSS_ANIMS = `
  @keyframes auroraDrift1 {
    0%{transform:translate3d(0%,0%,0) scale(1.00)}
    25%{transform:translate3d(4%,-6%,0) scale(1.07)}
    50%{transform:translate3d(-3%,5%,0) scale(0.95)}
    75%{transform:translate3d(2%,-3%,0) scale(1.03)}
    100%{transform:translate3d(0%,0%,0) scale(1.00)}
  }
  @keyframes auroraDrift2 {
    0%{transform:translate3d(0%,0%,0) scale(1.00)}
    33%{transform:translate3d(-6%,4%,0) scale(1.05)}
    66%{transform:translate3d(4%,-5%,0) scale(0.96)}
    100%{transform:translate3d(0%,0%,0) scale(1.00)}
  }
  @keyframes neuralPulse { 0%,100%{opacity:0.018} 50%{opacity:0.040} }
  @keyframes holoGlitch {
    0%,88%,100%{filter:none;transform:none}
    90%{filter:hue-rotate(25deg) brightness(1.05);transform:skewX(0.4deg)}
    92%{filter:none;transform:none}
  }
  @keyframes flipIn  {
    from{transform:translateY(60%) scaleY(0.5);opacity:0}
    to{transform:translateY(0) scaleY(1);opacity:1}
  }
  @keyframes scanPulse { 0%,100%{opacity:0.30} 50%{opacity:0.70} }
`;

// ─── Ambient aurora background ────────────────────────────────────────────────
function AmbientBackground({ theme }) {
  return (
    <>
      <style>{CSS_ANIMS}</style>
      <div aria-hidden="true" style={{
        position:"absolute",inset:-60,pointerEvents:"none",zIndex:0,
        animation:"auroraDrift1 24s ease-in-out infinite",
        background:`radial-gradient(ellipse 58% 38% at 78% 18%, ${theme.glow} 0%, transparent 65%)`,
        willChange:"transform",
      }} />
      <div aria-hidden="true" style={{
        position:"absolute",inset:-60,pointerEvents:"none",zIndex:0,
        animation:"auroraDrift2 32s ease-in-out infinite",
        background:`radial-gradient(ellipse 45% 55% at 12% 82%, ${theme.secondary} 0%, transparent 60%)`,
        willChange:"transform",
      }} />
      <div aria-hidden="true" style={{
        position:"absolute",inset:0,pointerEvents:"none",zIndex:0,
        backgroundImage:`linear-gradient(rgba(0,240,255,0.022) 1px,transparent 1px),linear-gradient(90deg,rgba(0,240,255,0.022) 1px,transparent 1px)`,
        backgroundSize:"44px 44px",
        animation:"neuralPulse 8s ease-in-out infinite",
        maskImage:"radial-gradient(ellipse 90% 80% at 50% 50%, black 40%, transparent 100%)",
        WebkitMaskImage:"radial-gradient(ellipse 90% 80% at 50% 50%, black 40%, transparent 100%)",
      }} />
    </>
  );
}

// ─── Flip digit (morphing numeral) ───────────────────────────────────────────
function FlipDigit({ value, color, fontSize }) {
  const [displayed, setDisplayed] = useState(value);
  const [anim,      setAnim]      = useState(false);
  useEffect(() => {
    if (value === displayed) return;
    setAnim(true);
    const t = setTimeout(() => { setDisplayed(value); setAnim(false); }, 200);
    return () => clearTimeout(t);
  }, [value, displayed]);
  return (
    <span style={{
      fontSize,
      fontFamily: "'Orbitron', monospace",
      fontWeight: 900,
      color,
      letterSpacing: "0.01em",
      userSelect: "none",
      display: "inline-block",
      textShadow: `0 0 18px ${color}CC, 0 0 48px ${color}55`,
      filter: `drop-shadow(0 0 10px ${color}88)`,
      animation: anim ? "flipIn 0.22s cubic-bezier(0.34,1.56,0.64,1)" : "none",
      willChange: "transform",
      minWidth: fontSize * 0.62,
      textAlign: "center",
    }}>
      {displayed}
    </span>
  );
}

// ─── Clock ring geometry ──────────────────────────────────────────────────────
const CX = 106, CY = 106;
const R_SEC = 90, C_SEC = 2 * Math.PI * R_SEC;
const R_MIN = 74, C_MIN = 2 * Math.PI * R_MIN;
const R_BAT = 104;          // outermost arc = battery level
const C_BAT = 2 * Math.PI * R_BAT;
const CLOCK_TICKS = Array.from({ length: 60 }, (_, i) => {
  const a = (i / 60) * 2 * Math.PI;
  const major = i % 5 === 0;
  return {
    x1: CX + Math.sin(a) * (R_SEC - 2),
    y1: CY - Math.cos(a) * (R_SEC - 2),
    x2: CX + Math.sin(a) * (R_SEC - (major ? 9 : 5)),
    y2: CY - Math.cos(a) * (R_SEC - (major ? 9 : 5)),
    major,
  };
});

// ─── Cortex Command Clock ─────────────────────────────────────────────────────
function CortexClock({ now, is24h, onToggle, theme, battery, weather }) {
  const hour   = now.getHours();
  const minute = now.getMinutes();
  const second = now.getSeconds();
  const ampm   = hour >= 12 ? "PM" : "AM";
  const h12    = hour % 12 || 12;
  const dispH  = is24h ? hour : h12;
  const hStr   = String(dispH).padStart(2, "0");
  const mStr   = String(minute).padStart(2, "0");
  const sStr   = String(second).padStart(2, "0");
  const dateStr = now.toLocaleDateString([], { weekday: "long", month: "long", day: "numeric" });

  const secOffset = C_SEC - (second / 60) * C_SEC;
  const minOffset = C_MIN - ((minute * 60 + second) / 3600) * C_MIN;

  const C = theme.accent;

  // Battery arc color
  const batLevel = battery?.level ?? null;
  const batCharging = battery?.charging ?? false;
  const batColor = batCharging ? "#39FF14"
    : batLevel !== null && batLevel <= 20 ? "#FF3C3C"
    : batLevel !== null && batLevel <= 40 ? "#F59E0B"
    : C;
  const batFill  = batLevel !== null ? (batLevel / 100) * C_BAT : 0;

  const wx = weather ? wmoLookup(weather.code) : null;
  const SIZE = 212;

  return (
    <motion.div
      initial={{ opacity: 0, scale: 0.86 }}
      animate={{ opacity: 1, scale: 1 }}
      transition={{ type: "spring", damping: 24, stiffness: 240, delay: 0.06 }}
      style={{ display: "flex", flexDirection: "column", alignItems: "center", gap: 8, position: "relative", zIndex: 1 }}
    >
      {/* Weather + battery info strip */}
      {(wx || battery) && (
        <motion.div
          initial={{ opacity: 0, y: -6 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ delay: 0.32 }}
          style={{
            display: "flex", alignItems: "center", gap: 8,
            padding: "5px 14px", borderRadius: 20,
            background: "rgba(0,0,0,0.30)", border: "1px solid rgba(255,255,255,0.07)",
            backdropFilter: "blur(14px)", WebkitBackdropFilter: "blur(14px)",
          }}
        >
          {wx && (
            <>
              <i className={`fa-solid ${wx.icon}`} style={{ color: wx.col, fontSize: 12, filter: `drop-shadow(0 0 4px ${wx.col}70)` }} />
              <span style={{ fontSize: 12, color: "rgba(255,255,255,0.60)", fontFamily: "'Outfit', sans-serif" }}>
                {weather.temp}°C · {wx.label}
              </span>
            </>
          )}
          {wx && battery && <div style={{ width: 1, height: 12, background: "rgba(255,255,255,0.12)" }} />}
          {battery && (
            <>
              <i
                className={`fa-solid ${batCharging ? "fa-bolt" : batLevel > 60 ? "fa-battery-full" : batLevel > 30 ? "fa-battery-half" : "fa-battery-quarter"}`}
                style={{ color: batColor, fontSize: 11, filter: batCharging ? "drop-shadow(0 0 4px #39FF1490)" : "none" }}
              />
              <span style={{ fontSize: 11, color: "rgba(255,255,255,0.38)", fontFamily: "'Outfit', sans-serif" }}>
                {batLevel}%{batCharging ? " ⚡" : ""}
              </span>
            </>
          )}
        </motion.div>
      )}

      {/* Tap anywhere on the clock face to toggle 12/24h */}
      <motion.button
        onClick={onToggle}
        whileTap={{ scale: 0.97 }}
        title={is24h ? "Tap for 12h" : "Tap for 24h"}
        aria-label={is24h ? "Switch to 12-hour format" : "Switch to 24-hour format"}
        style={{ background: "none", border: "none", cursor: "pointer", WebkitTapHighlightColor: "transparent", padding: 0, position: "relative" }}
      >
        <svg width={SIZE} height={SIZE} viewBox={`0 0 ${SIZE} ${SIZE}`} style={{ overflow: "visible", display: "block" }}>
          {/* Battery level arc — outermost ring */}
          {batLevel !== null && (
            <>
              <circle cx={CX} cy={CY} r={R_BAT} fill="none" stroke={`${batColor}0E`} strokeWidth={3} />
              <motion.circle
                cx={CX} cy={CY} r={R_BAT}
                fill="none" stroke={batColor} strokeWidth={2.5} strokeLinecap="round"
                strokeDasharray={String(C_BAT)}
                animate={{ strokeDashoffset: C_BAT - batFill }}
                transition={{ duration: 1.6, ease: [0.34, 1.56, 0.64, 1] }}
                style={{
                  filter: `drop-shadow(0 0 5px ${batColor}70)`,
                  transform: "rotate(-90deg)",
                  transformOrigin: `${CX}px ${CY}px`,
                }}
              />
            </>
          )}

          {/* HUD corner brackets */}
          {[[10,10,0],[SIZE-10,10,90],[10,SIZE-10,-90],[SIZE-10,SIZE-10,180]].map(([x,y,deg],i) => (
            <g key={i} transform={`rotate(${deg},${x},${y})`}>
              <path d={`M${x-8} ${y+8} L${x-8} ${y-8} L${x+8} ${y-8}`}
                fill="none" stroke={C} strokeWidth={1.5} strokeLinecap="round" strokeLinejoin="round" opacity={0.42} />
            </g>
          ))}

          {/* Tick marks */}
          {CLOCK_TICKS.map((t, i) => (
            <line key={i} x1={t.x1} y1={t.y1} x2={t.x2} y2={t.y2}
              stroke={t.major ? `${C}55` : `${C}1E`}
              strokeWidth={t.major ? 1.5 : 0.8}
              strokeLinecap="round"
            />
          ))}

          {/* Seconds ring */}
          <circle cx={CX} cy={CY} r={R_SEC} fill="none" stroke={`${C}0C`} strokeWidth={2} />
          <motion.circle
            cx={CX} cy={CY} r={R_SEC}
            fill="none" stroke={`${C}78`} strokeWidth={2} strokeLinecap="round"
            strokeDasharray={String(C_SEC)}
            animate={{ strokeDashoffset: secOffset }}
            transition={{ duration: 0.85, ease: "linear" }}
            style={{ transform: "rotate(-90deg)", transformOrigin: `${CX}px ${CY}px`, filter: `drop-shadow(0 0 4px ${C}70)` }}
          />

          {/* Minutes ring */}
          <circle cx={CX} cy={CY} r={R_MIN} fill="none" stroke={`${C}09`} strokeWidth={2.5} />
          <motion.circle
            cx={CX} cy={CY} r={R_MIN}
            fill="none" stroke={`${C}70`} strokeWidth={2.5} strokeLinecap="round"
            strokeDasharray={String(C_MIN)}
            animate={{ strokeDashoffset: minOffset }}
            transition={{ duration: 1.0, ease: "linear" }}
            style={{ transform: "rotate(-90deg)", transformOrigin: `${CX}px ${CY}px`, filter: `drop-shadow(0 0 4px ${C}55)` }}
          />

          {/* Second hand sweep line */}
          <line
            x1={CX} y1={CY}
            x2={CX + Math.sin((second / 60) * 2 * Math.PI) * (R_SEC - 12)}
            y2={CY - Math.cos((second / 60) * 2 * Math.PI) * (R_SEC - 12)}
            stroke={`${C}28`} strokeWidth={1} strokeLinecap="round"
          />

          {/* Horizontal scan line */}
          <line x1={16} y1={CY} x2={SIZE - 16} y2={CY}
            stroke={`${C}14`} strokeWidth={0.6}
            style={{ animation: "scanPulse 3s ease-in-out infinite" }}
          />
        </svg>

        {/* Center: large morphing digits */}
        <div style={{
          position: "absolute", inset: 0,
          display: "flex", flexDirection: "column",
          alignItems: "center", justifyContent: "center",
          gap: 2,
        }}>
          <div style={{ display: "flex", alignItems: "baseline", gap: 1, animation: "holoGlitch 18s ease-in-out infinite" }}>
            <FlipDigit value={hStr} color={C} fontSize={56} />
            <motion.span
              animate={{ opacity: second % 2 === 0 ? 1 : 0.08 }}
              transition={{ duration: 0.06 }}
              style={{
                fontSize: 40, fontFamily: "'Orbitron', monospace", fontWeight: 900,
                color: C, lineHeight: 1, paddingBottom: 4, userSelect: "none",
                textShadow: `0 0 16px ${C}CC, 0 0 36px ${C}66`,
              }}
            >:</motion.span>
            <FlipDigit value={mStr} color={C} fontSize={56} />
          </div>

          {/* Seconds */}
          <div style={{
            fontSize: 11, fontFamily: "'Orbitron', monospace", fontWeight: 700,
            color: C, letterSpacing: "0.28em",
            textShadow: `0 0 8px ${C}AA`, opacity: 0.72, userSelect: "none",
          }}>
            :{sStr}
          </div>

          {/* AM/PM — only in 12h mode, styled as minimal badge */}
          {!is24h && (
            <div style={{
              marginTop: 2,
              fontSize: 8, fontFamily: "'Outfit', sans-serif", fontWeight: 700,
              color: `${C}70`, letterSpacing: "0.18em", userSelect: "none",
            }}>
              {ampm}
            </div>
          )}
        </div>
      </motion.button>

      {/* Date line */}
      <div style={{
        fontSize: 11.5, fontFamily: "'Outfit', sans-serif",
        color: "rgba(255,255,255,0.30)", letterSpacing: "0.05em",
        textTransform: "uppercase", userSelect: "none", textAlign: "center",
      }}>
        {dateStr}
      </div>
    </motion.div>
  );
}

// ─── Cortex status line — replaces the old generic CORTEX BRIEF card ──────────
function CortexStatusLine({ status, theme }) {
  return (
    <motion.div
      initial={{ opacity: 0, y: 6 }}
      animate={{ opacity: 1, y: 0 }}
      transition={{ delay: 0.38, type: "spring", damping: 26, stiffness: 280 }}
      style={{
        display: "flex", alignItems: "center", gap: 8,
        padding: "7px 16px", borderRadius: 24,
        background: `${theme.accent}0C`, border: `1px solid ${theme.accent}1A`,
        backdropFilter: "blur(16px)", WebkitBackdropFilter: "blur(16px)",
      }}
    >
      <motion.div
        animate={{ scale: [1, 1.6, 1], opacity: [1, 0.35, 1] }}
        transition={{ duration: 2.6, repeat: Infinity, ease: "easeInOut" }}
        style={{
          width: 5, height: 5, borderRadius: "50%",
          background: theme.accent, boxShadow: `0 0 8px ${theme.accent}`,
          flexShrink: 0,
        }}
      />
      <span style={{
        fontSize: 12, color: "rgba(255,255,255,0.54)",
        fontFamily: "'Outfit', sans-serif", fontWeight: 400,
        userSelect: "none",
      }}>
        {status}
      </span>
    </motion.div>
  );
}

// ─── Quick app icons ──────────────────────────────────────────────────────────
const QUICK_APPS = [
  { id: "chat",     name: "AI Chat",  icon: "fa-comments",    color: "#00F0FF" },
  { id: "notes",    name: "Notes",    icon: "fa-note-sticky",  color: "#F59E0B" },
  { id: "tasks",    name: "Tasks",    icon: "fa-list-check",   color: "#39FF14" },
  { id: "calendar", name: "Calendar", icon: "fa-calendar",     color: "#FB923C" },
  { id: "music",    name: "Music",    icon: "fa-music",        color: "#F472B6" },
  { id: "memory",   name: "Memory",   icon: "fa-brain",        color: "#2DD4BF" },
];

function QuickApp({ app, onPress, delay }) {
  const [pressed, setPressed] = useState(false);
  return (
    <motion.button
      initial={{ opacity: 0, scale: 0.72, y: 8 }}
      animate={{ opacity: 1, scale: pressed ? 0.76 : 1, y: 0 }}
      transition={pressed
        ? { type: "spring", stiffness: 700, damping: 18, mass: 0.14 }
        : { delay, type: "spring", damping: 22, stiffness: 380 }
      }
      onPointerDown={() => setPressed(true)}
      onPointerUp={() => { setPressed(false); onPress(app.id); }}
      onPointerLeave={() => setPressed(false)}
      onPointerCancel={() => setPressed(false)}
      aria-label={`Open ${app.name}`}
      style={{
        display: "flex", flexDirection: "column", alignItems: "center", gap: 5,
        background: "transparent", border: "none", cursor: "pointer",
        padding: "5px 2px",
        WebkitTapHighlightColor: "transparent",
        touchAction: "manipulation", userSelect: "none",
      }}
    >
      <div style={{
        width: 48, height: 48, borderRadius: 17,
        background: `linear-gradient(145deg, ${app.color}1C 0%, ${app.color}09 100%)`,
        border: `1px solid ${app.color}28`,
        display: "flex", alignItems: "center", justifyContent: "center",
        boxShadow: pressed
          ? `0 2px 10px rgba(0,0,0,0.65), 0 0 20px ${app.color}44`
          : `0 4px 18px rgba(0,0,0,0.38), inset 0 1px 0 rgba(255,255,255,0.08)`,
        backdropFilter: "blur(12px)", WebkitBackdropFilter: "blur(12px)",
        position: "relative", overflow: "hidden",
        transition: "box-shadow 0.14s ease",
        willChange: "transform",
      }}>
        <div style={{ position:"absolute",inset:0, background:`radial-gradient(ellipse at 35% 25%, ${app.color}12 0%, transparent 65%)`, pointerEvents:"none" }} />
        <i className={`fa-solid ${app.icon}`} style={{ color: app.color, fontSize: 19, filter: `drop-shadow(0 0 8px ${app.color}80)`, position: "relative", zIndex: 1 }} />
      </div>
      <span style={{
        fontSize: 9, fontFamily: "'Outfit', sans-serif", fontWeight: 500,
        color: "rgba(255,255,255,0.55)", textAlign: "center",
        maxWidth: 50, overflow: "hidden", textOverflow: "ellipsis", whiteSpace: "nowrap",
        userSelect: "none",
      }}>
        {app.name}
      </span>
    </motion.button>
  );
}

function QuickAppsRow({ onOpenApp, theme }) {
  return (
    <motion.div
      initial={{ opacity: 0, y: 14 }}
      animate={{ opacity: 1, y: 0 }}
      transition={{ delay: 0.44, type: "spring", damping: 26, stiffness: 260 }}
      style={{
        ...GLASS,
        borderColor: "rgba(255,255,255,0.065)",
        padding: "10px 8px 8px",
        margin: "0 14px",
      }}
    >
      <div style={{ display: "grid", gridTemplateColumns: "repeat(6, 1fr)", justifyItems: "center" }}>
        {QUICK_APPS.map((app, i) => (
          <QuickApp key={app.id} app={app} onPress={onOpenApp} delay={0.46 + i * 0.04} />
        ))}
      </div>
    </motion.div>
  );
}

// ─── Cortex search bar (thumb-accessible — near the bottom) ───────────────────
const SEARCH_PHRASES = [
  "Ask Cortex anything…",
  "Open an app…",
  "Set a reminder…",
  "Search memories…",
  "What's on my calendar?",
  "Search the web…",
];

function CortexSearchBar({ onTap, theme }) {
  const [phIdx,   setPhIdx]   = useState(0);
  const [active,  setActive]  = useState(false);
  const [think,   setThink]   = useState(false);
  const thinkRef = useRef(null);

  useEffect(() => {
    const id = setInterval(() => setPhIdx((i) => (i + 1) % SEARCH_PHRASES.length), 3200);
    return () => clearInterval(id);
  }, []);
  useEffect(() => () => { if (thinkRef.current) clearTimeout(thinkRef.current); }, []);

  const handleTap = useCallback(() => {
    setThink(true);
    thinkRef.current = setTimeout(() => { setThink(false); onTap(); }, 280);
  }, [onTap]);

  return (
    <motion.div
      initial={{ opacity: 0, y: 10 }}
      animate={{ opacity: 1, y: 0 }}
      transition={{ delay: 0.52, type: "spring", damping: 26, stiffness: 260 }}
      style={{ padding: "0 14px" }}
    >
      <motion.button
        onPointerDown={() => setActive(true)}
        onPointerUp={() => { setActive(false); handleTap(); }}
        onPointerLeave={() => setActive(false)}
        aria-label="Open Cortex search"
        animate={{
          scale: active ? 0.978 : 1,
          boxShadow: active
            ? `0 0 0 2px ${theme.accent}55, 0 0 28px ${theme.glow}`
            : `0 0 0 1px rgba(255,255,255,0.06), 0 4px 20px rgba(0,0,0,0.40)`,
        }}
        transition={{ type: "spring", stiffness: 500, damping: 28 }}
        style={{
          width: "100%",
          display: "flex", alignItems: "center", gap: 10,
          padding: "12px 14px", borderRadius: 20,
          background: "rgba(5, 7, 20, 0.76)",
          backdropFilter: "blur(40px) saturate(210%)",
          WebkitBackdropFilter: "blur(40px) saturate(210%)",
          border: `1px solid ${active ? `${theme.accent}38` : "rgba(255,255,255,0.09)"}`,
          cursor: "pointer",
          WebkitTapHighlightColor: "transparent",
          touchAction: "manipulation",
          transition: "border-color 0.18s ease",
        }}
      >
        {/* Cortex brain icon */}
        <div style={{
          width: 32, height: 32, borderRadius: 11, flexShrink: 0,
          background: `linear-gradient(135deg, ${theme.accent}28, ${theme.accent}0C)`,
          border: `1px solid ${theme.accent}30`,
          display: "flex", alignItems: "center", justifyContent: "center",
        }}>
          <AnimatePresence mode="wait">
            {think ? (
              <motion.div key="thinking" initial={{ opacity: 0 }} animate={{ opacity: 1 }} exit={{ opacity: 0 }}
                style={{ display: "flex", gap: 3 }}>
                {[0,1,2].map((i) => (
                  <motion.div key={i}
                    animate={{ y: [0, -4, 0], opacity: [0.4, 1, 0.4] }}
                    transition={{ duration: 0.65, repeat: Infinity, delay: i * 0.14 }}
                    style={{ width: 4, height: 4, borderRadius: "50%", background: theme.accent }}
                  />
                ))}
              </motion.div>
            ) : (
              <motion.i key="brain" initial={{ opacity: 0 }} animate={{ opacity: 1 }} exit={{ opacity: 0 }}
                className="fa-solid fa-brain"
                style={{ color: theme.accent, fontSize: 13, filter: `drop-shadow(0 0 5px ${theme.accent}80)` }}
              />
            )}
          </AnimatePresence>
        </div>

        {/* Cycling placeholder */}
        <div style={{ flex: 1, position: "relative", height: 20, overflow: "hidden" }}>
          <AnimatePresence mode="wait">
            <motion.span key={phIdx}
              initial={{ opacity: 0, y: 9 }} animate={{ opacity: 1, y: 0 }} exit={{ opacity: 0, y: -9 }}
              transition={{ duration: 0.22, ease: "easeOut" }}
              style={{
                position: "absolute", inset: 0, display: "flex", alignItems: "center",
                fontSize: 13.5, fontFamily: "'Outfit', sans-serif",
                color: "rgba(255,255,255,0.25)", userSelect: "none", whiteSpace: "nowrap",
              }}
            >
              {SEARCH_PHRASES[phIdx]}
            </motion.span>
          </AnimatePresence>
        </div>

        {/* AI pulse badge */}
        <div style={{
          display: "flex", alignItems: "center", gap: 4,
          padding: "3px 8px", borderRadius: 20, flexShrink: 0,
          background: `${theme.accent}14`, border: `1px solid ${theme.accent}22`,
        }}>
          <motion.div
            animate={{ scale: [1, 1.5, 1], opacity: [1, 0.4, 1] }}
            transition={{ duration: 2.2, repeat: Infinity }}
            style={{ width: 4, height: 4, borderRadius: "50%", background: theme.accent, boxShadow: `0 0 6px ${theme.accent}` }}
          />
          <span style={{ fontSize: 9, color: theme.accent, fontFamily: "'Outfit', sans-serif", fontWeight: 700, letterSpacing: "0.10em" }}>AI</span>
        </div>
      </motion.button>
    </motion.div>
  );
}

// ─── App Library swipe hint ───────────────────────────────────────────────────
function AppLibraryHint({ onOpen }) {
  return (
    <motion.button
      initial={{ opacity: 0 }}
      animate={{ opacity: 1 }}
      transition={{ delay: 0.60 }}
      onClick={onOpen}
      style={{
        display: "flex", flexDirection: "column", alignItems: "center", gap: 3,
        background: "none", border: "none", cursor: "pointer",
        WebkitTapHighlightColor: "transparent", touchAction: "manipulation",
        padding: "4px 20px",
      }}
    >
      <motion.i
        className="fa-solid fa-chevron-up"
        animate={{ y: [-2, 2, -2] }}
        transition={{ duration: 2.0, repeat: Infinity, ease: "easeInOut" }}
        style={{ fontSize: 10, color: "rgba(255,255,255,0.22)" }}
      />
      <span style={{ fontSize: 9.5, color: "rgba(255,255,255,0.18)", fontFamily: "'Outfit', sans-serif", letterSpacing: "0.05em" }}>
        App Library
      </span>
    </motion.button>
  );
}

// ─── Cortex Command Center page ───────────────────────────────────────────────
function HomePage({ onOpenApp, onOpenSearch, onOpenDrawer }) {
  const now     = useClock();
  const battery = useBattery();
  const network = useNetwork();
  const weather = useWeather();
  const [is24h, toggleFormat] = useClockFormat();

  const theme = useMemo(() => getTheme(now.getHours()), [now]); // eslint-disable-line react-hooks/exhaustive-deps
  const status = useMemo(
    () => getCortexStatus(now.getHours(), weather, battery, network),
    [now, weather, battery, network] // eslint-disable-line react-hooks/exhaustive-deps
  );

  return (
    <div style={{
      position: "absolute", inset: 0, overflow: "hidden",
      display: "flex", flexDirection: "column",
      alignItems: "center", justifyContent: "space-between",
      padding: "12px 0 10px",
    }}>
      <AmbientBackground theme={theme} />

      {/* ── Hero: Cortex Command Clock ── */}
      <div style={{
        flex: 1, display: "flex", flexDirection: "column",
        alignItems: "center", justifyContent: "center",
        gap: 10, position: "relative", zIndex: 1, width: "100%",
      }}>
        <CortexClock
          now={now}
          is24h={is24h}
          onToggle={toggleFormat}
          theme={theme}
          battery={battery}
          weather={weather}
        />
        <CortexStatusLine status={status} theme={theme} />
      </div>

      {/* ── Quick Apps ── */}
      <div style={{ width: "100%", position: "relative", zIndex: 1, paddingBottom: 6 }}>
        <QuickAppsRow onOpenApp={onOpenApp} theme={theme} />
      </div>

      {/* ── Thumb-accessible Cortex Search ── */}
      <div style={{ width: "100%", position: "relative", zIndex: 1, paddingBottom: 4 }}>
        <CortexSearchBar onTap={onOpenSearch} theme={theme} />
      </div>

      {/* ── App Library hint ── */}
      <div style={{ position: "relative", zIndex: 1 }}>
        <AppLibraryHint onOpen={onOpenDrawer} />
      </div>
    </div>
  );
}

// ─── Main export ──────────────────────────────────────────────────────────────
export default function MobileHomeScreen({ onOpenApp, onOpenSearch }) {
  const [showDrawer, setShowDrawer] = useState(false);
  const [globalPage, setGlobalPage] = useState(1);   // 0=Widgets, 1=Home
  const [direction,  setDirection]  = useState(0);

  // Gesture state
  const touchStartX   = useRef(null);
  const touchStartY   = useRef(null);
  const axisLocked    = useRef(null);
  const peekRef       = useRef(null);
  const peekRafId     = useRef(null);
  const peekTimerId   = useRef(null);
  const showDrawerRef = useRef(false);

  useEffect(() => { showDrawerRef.current = showDrawer; }, [showDrawer]);
  useEffect(() => () => {
    if (peekRafId.current)   cancelAnimationFrame(peekRafId.current);
    if (peekTimerId.current) clearTimeout(peekTimerId.current);
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
    if (peekRef.current) peekRef.current.style.transition = "none";
  }, []);

  const handleTouchMove = useCallback((e) => {
    if (touchStartX.current === null) return;
    const dxA = Math.abs(e.touches[0].clientX - touchStartX.current);
    const dyA = Math.abs(e.touches[0].clientY - touchStartY.current);
    if (axisLocked.current === null && (dxA > 7 || dyA > 7)) {
      axisLocked.current = dxA > dyA ? "h" : "v";
    }
    if (axisLocked.current === "v" && !showDrawerRef.current) {
      const swipeUp = touchStartY.current - e.touches[0].clientY;
      if (swipeUp > 0 && peekRef.current) {
        const clamped = Math.min(swipeUp, 140);
        if (peekRafId.current) cancelAnimationFrame(peekRafId.current);
        peekRafId.current = requestAnimationFrame(() => {
          if (peekRef.current) {
            peekRef.current.style.transform = `translate3d(0,${-clamped}px,0)`;
            peekRef.current.style.opacity   = String(Math.min(0.95, clamped / 100));
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

    if (axis === "v" && dy < -60 && globalPage === 1 && !showDrawerRef.current) {
      resetPeek();
      setShowDrawer(true);
      return;
    }
    resetPeek();
    if (axis === "h" && Math.abs(dx) > 48) {
      if (dx < 0) navigate(1);
      if (dx > 0) navigate(-1);
    }
  }, [navigate, globalPage, resetPeek]);

  const variants = {
    initial: (dir) => ({ opacity: 0, x: dir > 0 ?  "20%" : "-20%", scale: 0.96 }),
    animate:          { opacity: 1, x: "0%",                          scale: 1    },
    exit:    (dir) => ({ opacity: 0, x: dir > 0 ? "-20%" :  "20%",   scale: 0.96 }),
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
          zIndex: 8, pointerEvents: "auto", overflowX: "hidden",
        }}
        onTouchStart={handleTouchStart}
        onTouchMove={handleTouchMove}
        onTouchEnd={handleTouchEnd}
      >
        {/* Page indicator pills */}
        <div style={{
          position: "absolute", top: 10, left: 0, right: 0,
          display: "flex", justifyContent: "center", gap: 5,
          zIndex: 20, pointerEvents: "none",
        }}>
          {[0, 1].map((i) => (
            <motion.div
              key={i}
              animate={{ width: i === globalPage ? 20 : 5, opacity: i === globalPage ? 0.88 : 0.24 }}
              transition={{ type: "spring", stiffness: 500, damping: 32 }}
              style={{ height: 5, borderRadius: 3, background: "#fff" }}
            />
          ))}
        </div>

        <AnimatePresence initial={false} custom={direction} mode="popLayout">
          {globalPage === 0 && (
            <motion.div
              key="widgets"
              custom={direction}
              variants={variants}
              initial="initial" animate="animate" exit="exit"
              transition={{ type: "spring", damping: 32, stiffness: 380, mass: 0.55 }}
              style={{ position: "absolute", inset: 0, overflowY: "auto", WebkitOverflowScrolling: "touch" }}
            >
              <MobileWidgetView />
            </motion.div>
          )}
          {globalPage === 1 && (
            <motion.div
              key="home"
              custom={direction}
              variants={variants}
              initial="initial" animate="animate" exit="exit"
              transition={{ type: "spring", damping: 32, stiffness: 380, mass: 0.55 }}
              style={{ position: "absolute", inset: 0 }}
            >
              <HomePage
                onOpenApp={onOpenApp}
                onOpenSearch={onOpenSearch}
                onOpenDrawer={() => setShowDrawer(true)}
              />
            </motion.div>
          )}
        </AnimatePresence>

        {/* Widgets page hint */}
        {globalPage === 1 && (
          <motion.div
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            transition={{ delay: 0.55 }}
            style={{
              position: "absolute", left: 10, top: "50%",
              transform: "translateY(-50%)",
              zIndex: 15, pointerEvents: "none",
              display: "flex", alignItems: "center", gap: 3,
            }}
          >
            <motion.i
              className="fa-solid fa-chevron-left"
              animate={{ x: [-3, 0, -3] }}
              transition={{ repeat: 3, duration: 1.1, delay: 1.8 }}
              style={{ fontSize: 9, color: "rgba(255,255,255,0.28)" }}
            />
            <span style={{ fontSize: 9, color: "rgba(255,255,255,0.20)", fontFamily: "'Outfit', sans-serif" }}>Widgets</span>
          </motion.div>
        )}
      </motion.div>

      {/* App Drawer peek strip */}
      <div
        ref={peekRef}
        aria-hidden="true"
        style={{
          position: "absolute",
          bottom: -90, left: 0, right: 0, height: 110,
          borderRadius: "22px 22px 0 0",
          background: "rgba(10,12,22,0.82)",
          backdropFilter: "blur(32px) saturate(180%)",
          WebkitBackdropFilter: "blur(32px) saturate(180%)",
          border: "1px solid rgba(255,255,255,0.10)", borderBottom: "none",
          zIndex: 30, pointerEvents: "none", opacity: 0,
          transform: "translate3d(0,0,0)", willChange: "transform, opacity",
          display: "flex", alignItems: "flex-start", justifyContent: "center", paddingTop: 10,
        }}
      >
        <div style={{ width: 36, height: 4, borderRadius: 2, background: "rgba(255,255,255,0.30)" }} />
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
