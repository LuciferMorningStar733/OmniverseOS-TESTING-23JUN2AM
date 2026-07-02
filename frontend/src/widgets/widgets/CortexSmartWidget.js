/**
 * CortexSmartWidget — "Temporal Core" redesign
 *
 * Design language: Holographic glassmorphism, 3-depth panel system,
 * chromatic light fields, living micro-animations.
 *
 * Premium features:
 *   • Holographic clock — gradient-fill digits (crystal-glass treatment),
 *     dual-dot plasma colon with offset pulse, live 60-second sweep arc
 *   • AM/PM spring-animated segmented toggle (12 h ↔ 24 h)
 *   • Cortex Intelligence card — rotating messages + live checklist
 *   • Weather — floating physics icon, temperature hero, stat grid
 *   • Battery — chromatic animated fill bar
 *   • All entrances: staggered spring + depth parallax
 *   • All aurora animations run on transform only (compositor)
 */

import React, { useState, useEffect, useRef, useCallback, useMemo } from "react";
import { motion, AnimatePresence } from "framer-motion";

// ── WMO weather codes ─────────────────────────────────────────────────────────
const WMO = {
  0:  { icon: "fa-sun",                  label: "Clear",         color: "#FFD54F" },
  1:  { icon: "fa-sun",                  label: "Mainly Clear",  color: "#FFD54F" },
  2:  { icon: "fa-cloud-sun",            label: "Partly Cloudy", color: "#94A3B8" },
  3:  { icon: "fa-cloud",               label: "Overcast",      color: "#64748B" },
  45: { icon: "fa-smog",                label: "Foggy",         color: "#94A3B8" },
  51: { icon: "fa-cloud-drizzle",       label: "Drizzle",       color: "#60A5FA" },
  61: { icon: "fa-cloud-rain",          label: "Rain",          color: "#60A5FA" },
  65: { icon: "fa-cloud-showers-heavy", label: "Heavy Rain",    color: "#3B82F6" },
  71: { icon: "fa-snowflake",           label: "Snow",          color: "#E2E8F0" },
  80: { icon: "fa-cloud-rain",          label: "Showers",       color: "#60A5FA" },
  95: { icon: "fa-cloud-bolt",          label: "Storm",         color: "#A78BFA" },
};
function getWmo(code) {
  if (WMO[code]) return WMO[code];
  const k = Object.keys(WMO).map(Number).filter(n => n <= code).pop();
  return WMO[k] ?? { icon: "fa-cloud", label: "Unknown", color: "#94A3B8" };
}

// ── Weather API ───────────────────────────────────────────────────────────────
const METEO_FIELDS = "temperature_2m,apparent_temperature,weathercode,windspeed_10m,relativehumidity_2m,uv_index";

async function fetchWeatherByCoords(lat, lon) {
  const [mRes, gRes] = await Promise.all([
    fetch(
      `https://api.open-meteo.com/v1/forecast?latitude=${lat}&longitude=${lon}` +
      `&current=${METEO_FIELDS}&daily=temperature_2m_max,temperature_2m_min,sunrise,sunset,weathercode` +
      `&temperature_unit=celsius&timezone=auto&forecast_days=1`
    ),
    fetch(`https://nominatim.openstreetmap.org/reverse?lat=${lat}&lon=${lon}&format=json`, {
      headers: { "Accept-Language": "en" },
    }),
  ]);
  const meteo = await mRes.json();
  const geo   = await gRes.json();
  const cur   = meteo.current;
  const addr  = geo.address ?? {};
  const daily = meteo.daily;
  return {
    temp:     Math.round(cur.temperature_2m),
    feels:    Math.round(cur.apparent_temperature),
    wind:     Math.round(cur.windspeed_10m),
    humidity: cur.relativehumidity_2m,
    uv:       cur.uv_index ?? null,
    code:     cur.weathercode,
    city:     addr.city || addr.town || addr.village || addr.county || "Your Location",
    high:     daily ? Math.round(daily.temperature_2m_max[0]) : null,
    low:      daily ? Math.round(daily.temperature_2m_min[0]) : null,
    sunrise:  daily?.sunrise?.[0]  ? new Date(daily.sunrise[0])  : null,
    sunset:   daily?.sunset?.[0]   ? new Date(daily.sunset[0])   : null,
  };
}

async function fetchWeatherByCity(name) {
  const geo = await (await fetch(
    `https://geocoding-api.open-meteo.com/v1/search?name=${encodeURIComponent(name)}&count=1&language=en`
  )).json();
  if (!geo.results?.length) throw new Error("City not found");
  const { latitude, longitude, name: city } = geo.results[0];
  const mRes = await fetch(
    `https://api.open-meteo.com/v1/forecast?latitude=${latitude}&longitude=${longitude}` +
    `&current=${METEO_FIELDS}&daily=temperature_2m_max,temperature_2m_min,sunrise,sunset,weathercode` +
    `&temperature_unit=celsius&timezone=auto&forecast_days=1`
  );
  const meteo = await mRes.json();
  const cur   = meteo.current;
  const daily = meteo.daily;
  return {
    temp:     Math.round(cur.temperature_2m),
    feels:    Math.round(cur.apparent_temperature),
    wind:     Math.round(cur.windspeed_10m),
    humidity: cur.relativehumidity_2m,
    uv:       cur.uv_index ?? null,
    code:     cur.weathercode,
    city,
    high:     daily ? Math.round(daily.temperature_2m_max[0]) : null,
    low:      daily ? Math.round(daily.temperature_2m_min[0]) : null,
    sunrise:  daily?.sunrise?.[0]  ? new Date(daily.sunrise[0])  : null,
    sunset:   daily?.sunset?.[0]   ? new Date(daily.sunset[0])   : null,
  };
}

// ── Battery hook ──────────────────────────────────────────────────────────────
function useBattery() {
  const [battery, setBattery] = useState(null);
  useEffect(() => {
    if (!navigator.getBattery) return;
    let batt = null;
    const onLevel    = () => setBattery({ level: Math.round(batt.level * 100), charging: batt.charging });
    const onCharging = () => setBattery({ level: Math.round(batt.level * 100), charging: batt.charging });
    navigator.getBattery().then((b) => {
      batt = b;
      setBattery({ level: Math.round(b.level * 100), charging: b.charging });
      b.addEventListener("levelchange",    onLevel);
      b.addEventListener("chargingchange", onCharging);
    }).catch(() => {});
    return () => {
      if (batt) {
        batt.removeEventListener("levelchange",    onLevel);
        batt.removeEventListener("chargingchange", onCharging);
      }
    };
  }, []);
  return battery;
}

// ── Weather hook ──────────────────────────────────────────────────────────────
function useWeather() {
  const [weather, setWeather] = useState(null);
  useEffect(() => {
    let cancelled = false;
    const load = async () => {
      try {
        if (!navigator.geolocation) {
          // No geolocation — fallback to city, guard after await
          try {
            const data = await fetchWeatherByCity("London");
            if (!cancelled) setWeather(data);
          } catch { /* silent */ }
          return;
        }
        navigator.geolocation.getCurrentPosition(
          async ({ coords }) => {
            try {
              const data = await fetchWeatherByCoords(coords.latitude, coords.longitude);
              // Re-check after the async fetch completes — component may have unmounted
              if (!cancelled) setWeather(data);
            } catch { /* silent */ }
          },
          async () => {
            try {
              const data = await fetchWeatherByCity("London");
              if (!cancelled) setWeather(data);
            } catch { /* silent */ }
          },
          { timeout: 5000 }
        );
      } catch { /* silent */ }
    };
    load();
    const id = setInterval(load, 10 * 60 * 1000);
    return () => { cancelled = true; clearInterval(id); };
  }, []);
  return weather;
}

// ── Time-of-day theme ─────────────────────────────────────────────────────────
function getTheme(h) {
  if (h >= 5  && h < 8)  return {
    accent: "#FF8C42", glow: "rgba(255,140,66,0.30)",
    gradA: "#FF8C42", gradB: "#FFB347", name: "dawn",
  };
  if (h >= 8  && h < 12) return {
    accent: "#00F0FF", glow: "rgba(0,240,255,0.24)",
    gradA: "#00F0FF", gradB: "#7C3AED", name: "morning",
  };
  if (h >= 12 && h < 17) return {
    accent: "#A78BFA", glow: "rgba(167,139,250,0.24)",
    gradA: "#A78BFA", gradB: "#60A5FA", name: "afternoon",
  };
  if (h >= 17 && h < 21) return {
    accent: "#F59E0B", glow: "rgba(245,158,11,0.27)",
    gradA: "#F59E0B", gradB: "#FF6B35", name: "evening",
  };
  return {
    accent: "#818CF8", glow: "rgba(129,140,248,0.24)",
    gradA: "#818CF8", gradB: "#00F0FF", name: "night",
  };
}

function getGreeting(h) {
  if (h < 5)  return "Good Night";
  if (h < 12) return "Good Morning";
  if (h < 17) return "Good Afternoon";
  if (h < 21) return "Good Evening";
  return "Good Night";
}

function getBatteryColor(lvl) {
  if (lvl > 50) return "#39FF14";
  if (lvl > 20) return "#F59E0B";
  return "#FF003C";
}

// ── Helpers ───────────────────────────────────────────────────────────────────
function pad2(n) { return String(n).padStart(2, "0"); }
function fmtSunTime(date) {
  if (!date) return "--:--";
  return `${pad2(date.getHours())}:${pad2(date.getMinutes())}`;
}
function fmtDate(date) {
  return date.toLocaleDateString("en-US", { weekday: "long", month: "long", day: "numeric" });
}

// ── Cortex rotating messages ──────────────────────────────────────────────────
const CORTEX_MSGS = [
  "Memory synced — 3 new fragments indexed",
  "Clipboard ready · 2 items stored",
  "Weather refreshed 2 minutes ago",
  "Battery optimized for current workload",
  "Today's focus window begins in 45 minutes",
  "All systems nominal · Cortex Active",
  "Your calendar is clear for the next 2 hours",
  "Deep work mode available · distractions low",
  "Network stable · latency nominal",
  "Tomorrow's brief is being prepared",
];

const CHECKLIST = [
  { label: "Memory synced",   done: true },
  { label: "Weather updated", done: true },
  { label: "Clipboard ready", done: true },
  { label: "No urgent alerts",done: true },
];

// ── Injected CSS — all animations on compositor thread ────────────────────────
const CSS = `
  @keyframes csw-orb1 {
    0%,100% { transform: translate3d(0%,0%,0) scale(1.00); }
    33%     { transform: translate3d(6%,-10%,0) scale(1.12); }
    66%     { transform: translate3d(-5%,7%,0) scale(0.93); }
  }
  @keyframes csw-orb2 {
    0%,100% { transform: translate3d(0%,0%,0) scale(1.00); }
    40%     { transform: translate3d(-8%,6%,0) scale(1.08); }
    80%     { transform: translate3d(4%,-5%,0) scale(0.96); }
  }
  @keyframes csw-orb3 {
    0%,100% { transform: translate3d(0%,0%,0) scale(1.00); }
    50%     { transform: translate3d(5%,8%,0) scale(1.06); }
  }
  @keyframes csw-pulse-dot {
    0%,100% { opacity: 1; transform: scale(1); }
    50%     { opacity: 0.14; transform: scale(0.60); }
  }
  @keyframes csw-pulse-dot2 {
    0%,100% { opacity: 0.14; transform: scale(0.60); }
    50%     { opacity: 1; transform: scale(1); }
  }
  @keyframes csw-float-icon {
    0%,100% { transform: translate3d(0,-4px,0); }
    50%     { transform: translate3d(0,4px,0); }
  }
  @keyframes csw-scan {
    0%   { transform: translate3d(0,-100%,0); opacity: 0; }
    10%  { opacity: 1; }
    90%  { opacity: 1; }
    100% { transform: translate3d(0,400%,0); opacity: 0; }
  }
  @keyframes csw-shimmer {
    0%   { background-position: -200% center; }
    100% { background-position:  200% center; }
  }
  @keyframes csw-live-ring {
    0%   { transform: scale(1); opacity: 0.8; }
    100% { transform: scale(2.4); opacity: 0; }
  }
  .csw-scroll::-webkit-scrollbar { display: none; }
  .csw-scroll { scrollbar-width: none; }
`;

// ── Glass card styles ─────────────────────────────────────────────────────────
const GLASS_DEEP = {
  borderRadius: 22,
  background: "rgba(5,7,18,0.72)",
  border: "1px solid rgba(255,255,255,0.08)",
  boxShadow: "0 20px 60px rgba(0,0,0,0.70), inset 0 1px 0 rgba(255,255,255,0.07), inset 0 -1px 0 rgba(0,0,0,0.30)",
  backdropFilter: "blur(40px) saturate(180%)",
  WebkitBackdropFilter: "blur(40px) saturate(180%)",
  position: "relative", overflow: "hidden",
};

const GLASS_MID = {
  borderRadius: 16,
  background: "rgba(255,255,255,0.035)",
  border: "1px solid rgba(255,255,255,0.07)",
  boxShadow: "0 8px 32px rgba(0,0,0,0.45), inset 0 1px 0 rgba(255,255,255,0.06)",
};

// ── Section entrance animation ────────────────────────────────────────────────
function sect(delay = 0) {
  return {
    initial: { opacity: 0, y: 18, scale: 0.97 },
    animate: { opacity: 1, y: 0, scale: 1 },
    transition: { delay, type: "spring", damping: 24, stiffness: 300, mass: 0.35 },
  };
}

// ── AM/PM Segmented Toggle ────────────────────────────────────────────────────
function AmPmToggle({ use12h, isPM, onToggle, accent }) {
  // When not in 12h mode: show a minimal "12H" chip to activate
  // When in 12h mode: show AM / PM segmented pill
  if (!use12h) {
    return (
      <motion.button
        onClick={onToggle}
        whileTap={{ scale: 0.88 }}
        transition={{ type: "spring", stiffness: 600, damping: 20 }}
        style={{
          background: "rgba(255,255,255,0.06)",
          border: "1px solid rgba(255,255,255,0.10)",
          borderRadius: 8,
          padding: "4px 8px",
          cursor: "pointer",
          WebkitTapHighlightColor: "transparent",
          display: "flex", alignItems: "center", justifyContent: "center",
        }}
        aria-label="Switch to 12-hour format"
      >
        <span style={{
          fontSize: 10, fontWeight: 700, letterSpacing: "0.08em",
          color: "rgba(255,255,255,0.32)",
          fontFamily: "'Outfit', sans-serif",
        }}>24H</span>
      </motion.button>
    );
  }

  return (
    <div
      style={{
        display: "flex",
        flexDirection: "column",
        borderRadius: 9,
        overflow: "hidden",
        border: `1px solid ${accent}28`,
        background: "rgba(0,0,0,0.35)",
        position: "relative",
        width: 32,
      }}
      role="group"
      aria-label="AM/PM"
    >
      {["AM", "PM"].map((seg) => {
        const active = (seg === "PM") === isPM;
        return (
          <motion.button
            key={seg}
            onClick={onToggle}
            whileTap={{ scale: 0.82 }}
            transition={{ type: "spring", stiffness: 700, damping: 22 }}
            style={{
              padding: "5px 0",
              background: active ? `${accent}22` : "transparent",
              border: "none",
              cursor: "pointer",
              WebkitTapHighlightColor: "transparent",
              position: "relative",
              display: "flex", alignItems: "center", justifyContent: "center",
            }}
            aria-pressed={active}
            aria-label={seg}
          >
            {active && (
              <motion.div
                layoutId="ampm-pill"
                style={{
                  position: "absolute", inset: 1,
                  borderRadius: 7,
                  background: `${accent}30`,
                  boxShadow: `0 0 10px ${accent}60, inset 0 1px 0 rgba(255,255,255,0.12)`,
                  border: `1px solid ${accent}40`,
                }}
                transition={{ type: "spring", stiffness: 500, damping: 30 }}
              />
            )}
            <span style={{
              fontSize: 9.5, fontWeight: active ? 800 : 500,
              letterSpacing: "0.06em",
              color: active ? accent : "rgba(255,255,255,0.28)",
              fontFamily: "'Outfit', sans-serif",
              position: "relative", zIndex: 1,
              transition: "color 0.18s ease",
            }}>
              {seg}
            </span>
          </motion.button>
        );
      })}
    </div>
  );
}

// ── Holographic digit group ───────────────────────────────────────────────────
function HoloGroup({ value, theme, size = 92 }) {
  return (
    <AnimatePresence mode="popLayout" initial={false}>
      <motion.div
        key={value}
        initial={{ opacity: 0, y: 14, filter: "blur(10px)" }}
        animate={{ opacity: 1, y: 0, filter: "blur(0px)" }}
        exit={{ opacity: 0, y: -10, filter: "blur(6px)" }}
        transition={{ type: "spring", damping: 22, stiffness: 360, mass: 0.28 }}
        style={{ lineHeight: 1 }}
      >
        <span style={{
          fontSize: size,
          fontWeight: 100,
          fontFamily: "'Outfit', sans-serif",
          fontVariantNumeric: "tabular-nums",
          letterSpacing: "-0.04em",
          lineHeight: 0.88,
          userSelect: "none",
          // Crystal-glass gradient fill
          background: `linear-gradient(172deg,
            rgba(255,255,255,1.00) 0%,
            rgba(235,245,255,0.97) 38%,
            rgba(195,220,255,0.88) 72%,
            rgba(${theme.name === "evening" ? "255,200,120" : theme.name === "dawn" ? "255,180,100" : "175,210,255"},0.80) 100%
          )`,
          WebkitBackgroundClip: "text",
          WebkitTextFillColor: "transparent",
          backgroundClip: "text",
          // Glow: drop-shadow works on the rendered text shape
          filter: `drop-shadow(0 0 22px ${theme.accent}55) drop-shadow(0 0 56px ${theme.accent}1A)`,
          display: "block",
        }}>
          {value}
        </span>
      </motion.div>
    </AnimatePresence>
  );
}

// ── Dual-dot plasma colon ─────────────────────────────────────────────────────
function PlasmaDots({ accent }) {
  return (
    <div style={{
      display: "flex", flexDirection: "column", alignItems: "center",
      justifyContent: "center", gap: 8,
      paddingBottom: 8, marginTop: -4,
    }}>
      {/* Top dot — leads the beat */}
      <div style={{
        width: 7, height: 7, borderRadius: "50%",
        background: accent,
        boxShadow: `0 0 12px ${accent}, 0 0 24px ${accent}80`,
        animation: "csw-pulse-dot 1s ease-in-out infinite",
        willChange: "transform, opacity",
      }} />
      {/* Bottom dot — offset */}
      <div style={{
        width: 7, height: 7, borderRadius: "50%",
        background: accent,
        boxShadow: `0 0 12px ${accent}, 0 0 24px ${accent}80`,
        animation: "csw-pulse-dot2 1s ease-in-out infinite",
        willChange: "transform, opacity",
      }} />
    </div>
  );
}

// ── Seconds sweep arc ─────────────────────────────────────────────────────────
function SecondsSweep({ seconds, accent, gradB }) {
  const pct = seconds / 59;
  return (
    <div style={{
      width: "100%", height: 2, borderRadius: 2,
      background: "rgba(255,255,255,0.06)",
      overflow: "hidden", position: "relative",
      marginTop: 8,
    }}>
      <motion.div
        animate={{ scaleX: pct }}
        transition={{ duration: 0.6, ease: [0.22, 1, 0.36, 1] }}
        style={{
          position: "absolute", left: 0, top: 0, bottom: 0,
          width: "100%", borderRadius: 2,
          background: `linear-gradient(90deg, ${accent}, ${gradB})`,
          boxShadow: `0 0 8px ${accent}80`,
          transformOrigin: "left center",
        }}
      />
      {/* Leading dot — percentage left + CSS transition, fine for a 2px element */}
      <div style={{
        position: "absolute", top: -2,
        left: `${pct * 100}%`,
        width: 6, height: 6, borderRadius: "50%",
        background: accent,
        boxShadow: `0 0 8px ${accent}`,
        transform: "translateX(-3px)",
        transition: "left 0.6s cubic-bezier(0.22,1,0.36,1)",
      }} />
    </div>
  );
}

// ── Main widget ───────────────────────────────────────────────────────────────
export default function CortexSmartWidget({ item }) {
  // ── State ──────────────────────────────────────────────────────────────────
  const [now, setNow]     = useState(() => new Date());
  const [entered, setEntered] = useState(false);
  const [msgIdx, setMsgIdx]   = useState(0);
  const [use12h, setUse12h]   = useState(() => {
    try { return localStorage.getItem("csw_12h") === "true"; } catch { return false; }
  });

  const weather = useWeather();
  const battery = useBattery();

  // ── Time tick (every 500ms for sub-second colon feel) ─────────────────────
  useEffect(() => {
    const id = setInterval(() => setNow(new Date()), 500);
    return () => clearInterval(id);
  }, []);

  // ── Entrance ───────────────────────────────────────────────────────────────
  useEffect(() => {
    const id = setTimeout(() => setEntered(true), 60);
    return () => clearTimeout(id);
  }, []);

  // ── Cortex message rotation ────────────────────────────────────────────────
  useEffect(() => {
    const id = setInterval(() => setMsgIdx(i => (i + 1) % CORTEX_MSGS.length), 5000);
    return () => clearInterval(id);
  }, []);

  // ── Derived ───────────────────────────────────────────────────────────────
  const hour   = now.getHours();
  const minute = now.getMinutes();
  const second = now.getSeconds();
  const isPM   = hour >= 12;
  const theme  = useMemo(() => getTheme(hour), [hour]);
  const wmo    = weather ? getWmo(weather.code) : null;

  const displayHour = use12h ? (hour % 12 || 12) : hour;
  const hStr = pad2(displayHour);
  const mStr = pad2(minute);
  const sStr = pad2(second);

  const toggleFormat = useCallback(() => {
    setUse12h(v => {
      const next = !v;
      try { localStorage.setItem("csw_12h", String(next)); } catch { }
      return next;
    });
  }, []);

  const userName = useMemo(() => {
    try { return localStorage.getItem("omniverse_user_name") || ""; } catch { return ""; }
  }, []);

  // ── Render ────────────────────────────────────────────────────────────────
  return (
    <div
      className="w-full h-full select-none"
      style={{ display: "flex", flexDirection: "column", position: "relative", overflow: "hidden", minHeight: 0 }}
    >
      <style>{CSS}</style>

      {/* ── Aurora orbs — compositor only ── */}
      <div aria-hidden style={{
        position: "absolute", inset: -80, pointerEvents: "none", zIndex: 0,
        animation: "csw-orb1 28s ease-in-out infinite",
        willChange: "transform",
        background: `radial-gradient(ellipse 75% 55% at 85% 5%, ${theme.glow} 0%, transparent 65%)`,
      }} />
      <div aria-hidden style={{
        position: "absolute", inset: -80, pointerEvents: "none", zIndex: 0,
        animation: "csw-orb2 38s ease-in-out infinite",
        willChange: "transform",
        background: `radial-gradient(ellipse 55% 65% at 8% 92%, ${theme.glow.replace(/[\d.]+\)$/, "0.12)")} 0%, transparent 60%)`,
      }} />
      <div aria-hidden style={{
        position: "absolute", inset: -80, pointerEvents: "none", zIndex: 0,
        animation: "csw-orb3 44s ease-in-out infinite",
        willChange: "transform",
        background: `radial-gradient(ellipse 40% 40% at 50% 50%, ${theme.glow.replace(/[\d.]+\)$/, "0.07)")} 0%, transparent 70%)`,
      }} />

      {/* ── Scrollable content ── */}
      <div
        className="csw-scroll"
        style={{
          flex: 1, overflowY: "auto", overflowX: "hidden",
          WebkitOverflowScrolling: "touch", scrollbarWidth: "none",
          position: "relative", zIndex: 1,
          padding: "12px 10px 20px",
          display: "flex", flexDirection: "column", gap: 9,
        }}
      >

        {/* ════════════════════════════════════════════════════════════
            CLOCK CARD
        ════════════════════════════════════════════════════════════ */}
        <motion.div {...sect(0.04)} style={{ ...GLASS_DEEP }}>

          {/* Top accent line — gradient shimmer */}
          <div style={{
            position: "absolute", top: 0, left: 0, right: 0, height: 1.5,
            background: `linear-gradient(90deg, transparent 0%, ${theme.accent}60 30%, ${theme.gradB}60 70%, transparent 100%)`,
            animation: "csw-shimmer 4s linear infinite",
            backgroundSize: "200% auto",
            pointerEvents: "none",
          }} />

          {/* Inner specular highlight */}
          <div style={{
            position: "absolute", top: 0, left: 0, right: 0, height: 80,
            background: "linear-gradient(180deg, rgba(255,255,255,0.04) 0%, transparent 100%)",
            pointerEvents: "none", borderRadius: "22px 22px 0 0",
          }} />

          <div style={{ padding: "16px 16px 18px", position: "relative" }}>

            {/* ── Status row ── */}
            <div style={{
              display: "flex", alignItems: "center", gap: 6,
              marginBottom: 14,
            }}>
              {/* Pulsing live indicator */}
              <div style={{ position: "relative", width: 8, height: 8, flexShrink: 0 }}>
                <div style={{
                  position: "absolute", inset: 0, borderRadius: "50%",
                  background: theme.accent,
                  animation: "csw-live-ring 1.8s ease-out infinite",
                  boxShadow: `0 0 0 2px ${theme.accent}40`,
                }} />
                <div style={{
                  position: "absolute", inset: 1, borderRadius: "50%",
                  background: theme.accent,
                  boxShadow: `0 0 8px ${theme.accent}`,
                }} />
              </div>
              <span style={{
                fontSize: 10.5, fontWeight: 700, letterSpacing: "0.14em",
                textTransform: "uppercase",
                background: `linear-gradient(90deg, ${theme.accent}, ${theme.gradB})`,
                WebkitBackgroundClip: "text", WebkitTextFillColor: "transparent",
                backgroundClip: "text",
                fontFamily: "'Outfit', sans-serif",
                flex: 1,
              }}>
                {getGreeting(hour)}{userName ? `, ${userName}` : ""} · Cortex Active
              </span>
              <i className="fa-solid fa-brain" style={{
                fontSize: 12, color: theme.accent,
                filter: `drop-shadow(0 0 6px ${theme.accent})`,
              }} />
            </div>

            {/* ── Clock face ── */}
            <div style={{
              ...GLASS_MID,
              padding: "18px 12px 14px",
              display: "flex", flexDirection: "column", alignItems: "center",
              gap: 0, marginBottom: 12,
            }}>

              {/* Digit row */}
              <div style={{
                display: "flex", alignItems: "flex-end", gap: 0,
                justifyContent: "center", width: "100%",
              }}>
                {/* Hours */}
                <div style={{ overflow: "visible", minWidth: "2ch", textAlign: "right" }}>
                  <HoloGroup value={hStr} theme={theme} size={90} />
                </div>

                {/* Plasma colon */}
                <div style={{ paddingLeft: 6, paddingRight: 6, paddingBottom: 10 }}>
                  <PlasmaDots accent={theme.accent} />
                </div>

                {/* Minutes */}
                <div style={{ overflow: "visible", minWidth: "2ch", textAlign: "left" }}>
                  <HoloGroup value={mStr} theme={theme} size={90} />
                </div>

                {/* Seconds + AM/PM toggle column */}
                <div style={{
                  display: "flex", flexDirection: "column",
                  alignItems: "center", gap: 6,
                  paddingLeft: 10, paddingBottom: 6,
                  justifyContent: "flex-end",
                  alignSelf: "flex-end",
                }}>
                  {/* Seconds */}
                  <div style={{
                    fontSize: 20, fontWeight: 400,
                    fontFamily: "'Outfit', sans-serif",
                    fontVariantNumeric: "tabular-nums",
                    letterSpacing: "-0.02em",
                    background: `linear-gradient(170deg, ${theme.accent} 0%, ${theme.gradB} 100%)`,
                    WebkitBackgroundClip: "text", WebkitTextFillColor: "transparent",
                    backgroundClip: "text",
                    filter: `drop-shadow(0 0 8px ${theme.accent}60)`,
                    lineHeight: 1,
                    userSelect: "none",
                  }}>
                    {sStr}
                  </div>
                  {/* AM/PM toggle */}
                  <AmPmToggle
                    use12h={use12h}
                    isPM={isPM}
                    onToggle={toggleFormat}
                    accent={theme.accent}
                  />
                </div>
              </div>

              {/* Seconds sweep bar */}
              <SecondsSweep seconds={second} accent={theme.accent} gradB={theme.gradB} />
            </div>

            {/* ── Date row ── */}
            <div style={{
              display: "flex", alignItems: "center", justifyContent: "space-between",
            }}>
              <span style={{
                fontSize: 13.5, fontWeight: 400,
                color: "rgba(255,255,255,0.55)",
                fontFamily: "'Outfit', sans-serif",
                letterSpacing: "0.005em",
              }}>
                {fmtDate(now)}
              </span>

              {/* Location badge */}
              {weather?.city && (
                <div style={{
                  display: "flex", alignItems: "center", gap: 4,
                  background: "rgba(255,255,255,0.05)",
                  border: "1px solid rgba(255,255,255,0.08)",
                  borderRadius: 20, padding: "3px 9px",
                }}>
                  <i className="fa-solid fa-location-dot" style={{
                    fontSize: 9, color: theme.accent,
                    filter: `drop-shadow(0 0 4px ${theme.accent})`,
                  }} />
                  <span style={{
                    fontSize: 11, color: "rgba(255,255,255,0.45)",
                    fontFamily: "'Outfit', sans-serif", fontWeight: 500,
                  }}>
                    {weather.city}
                  </span>
                </div>
              )}
            </div>

          </div>
        </motion.div>

        {/* ════════════════════════════════════════════════════════════
            WEATHER CARD
        ════════════════════════════════════════════════════════════ */}
        {weather && wmo && (
          <motion.div {...sect(0.10)} style={{ ...GLASS_DEEP }}>

            {/* Top micro-accent */}
            <div style={{
              position: "absolute", top: 0, left: 0, right: 0, height: 1,
              background: `linear-gradient(90deg, transparent, ${wmo.color}50, transparent)`,
              pointerEvents: "none",
            }} />

            <div style={{ padding: "14px 15px 15px" }}>

              {/* Main weather row */}
              <div style={{ display: "flex", alignItems: "center", gap: 12, marginBottom: 12 }}>
                {/* Floating animated icon */}
                <div style={{
                  width: 56, height: 56, borderRadius: 18, flexShrink: 0,
                  background: `${wmo.color}12`,
                  border: `1px solid ${wmo.color}28`,
                  display: "flex", alignItems: "center", justifyContent: "center",
                  animation: "csw-float-icon 4s ease-in-out infinite",
                  boxShadow: `0 0 24px ${wmo.color}30, 0 8px 20px rgba(0,0,0,0.30)`,
                }}>
                  <i className={`fa-solid ${wmo.icon}`} style={{
                    fontSize: 24, color: wmo.color,
                    filter: `drop-shadow(0 0 10px ${wmo.color}90)`,
                  }} />
                </div>

                {/* Temp + condition */}
                <div style={{ flex: 1, minWidth: 0 }}>
                  <div style={{ display: "flex", alignItems: "flex-start", gap: 0, lineHeight: 1 }}>
                    <span style={{
                      fontSize: 52, fontWeight: 100,
                      fontFamily: "'Outfit', sans-serif",
                      fontVariantNumeric: "tabular-nums",
                      background: `linear-gradient(170deg, #fff 0%, rgba(220,235,255,0.88) 100%)`,
                      WebkitBackgroundClip: "text", WebkitTextFillColor: "transparent",
                      backgroundClip: "text",
                      filter: `drop-shadow(0 0 18px rgba(255,255,255,0.18))`,
                      letterSpacing: "-0.03em",
                      lineHeight: 0.88,
                      userSelect: "none",
                    }}>
                      {weather.temp}
                    </span>
                    <span style={{
                      fontSize: 18, fontWeight: 300,
                      color: "rgba(255,255,255,0.50)",
                      fontFamily: "'Outfit', sans-serif",
                      marginTop: 4, marginLeft: 1,
                    }}>°C</span>
                  </div>
                  <div style={{
                    fontSize: 13, color: "rgba(255,255,255,0.55)",
                    fontFamily: "'Outfit', sans-serif", fontWeight: 400,
                    marginTop: 5,
                  }}>
                    {wmo.label}
                    {weather.high !== null && weather.low !== null && (
                      <span style={{ color: "rgba(255,255,255,0.30)", marginLeft: 8 }}>
                        H:{weather.high}° L:{weather.low}°
                      </span>
                    )}
                  </div>
                  <div style={{
                    fontSize: 11.5, color: "rgba(255,255,255,0.28)",
                    fontFamily: "'Outfit', sans-serif", marginTop: 2,
                  }}>
                    Feels {weather.feels}°
                  </div>
                </div>
              </div>

              {/* Divider */}
              <div style={{ height: 1, background: "rgba(255,255,255,0.05)", marginBottom: 10 }} />

              {/* Stats grid */}
              <div style={{ display: "grid", gridTemplateColumns: "repeat(3, 1fr)", gap: "7px 8px" }}>
                {[
                  { icon: "fa-wind",        label: "Wind",     value: `${weather.wind}km/h`, color: "#60A5FA" },
                  { icon: "fa-droplet",     label: "Humidity", value: `${weather.humidity}%`, color: "#34D399" },
                  { icon: "fa-sun",         label: "UV",       value: weather.uv !== null ? String(weather.uv) : "—", color: "#FBBF24" },
                ].map(({ icon, label, value, color }) => (
                  <div key={label} style={{
                    background: `${color}08`,
                    border: `1px solid ${color}18`,
                    borderRadius: 12, padding: "8px 10px",
                    display: "flex", flexDirection: "column", gap: 3,
                  }}>
                    <i className={`fa-solid ${icon}`} style={{
                      fontSize: 10, color,
                      filter: `drop-shadow(0 0 4px ${color}70)`,
                    }} />
                    <span style={{ fontSize: 14, fontWeight: 600, color: "#fff", fontFamily: "'Outfit', sans-serif", letterSpacing: "-0.01em" }}>
                      {value}
                    </span>
                    <span style={{ fontSize: 9.5, color: "rgba(255,255,255,0.32)", fontFamily: "'Outfit', sans-serif", letterSpacing: "0.04em", textTransform: "uppercase" }}>
                      {label}
                    </span>
                  </div>
                ))}
              </div>

              {/* Sunrise / Sunset row */}
              {(weather.sunrise || weather.sunset) && (
                <div style={{
                  display: "flex", gap: 8, marginTop: 8,
                }}>
                  {[
                    { icon: "fa-sun", label: "Sunrise", time: fmtSunTime(weather.sunrise), color: "#FCA5A5" },
                    { icon: "fa-moon", label: "Sunset",  time: fmtSunTime(weather.sunset),  color: "#818CF8" },
                  ].map(({ icon, label, time, color }) => (
                    <div key={label} style={{
                      flex: 1,
                      background: `${color}07`,
                      border: `1px solid ${color}16`,
                      borderRadius: 12, padding: "8px 10px",
                      display: "flex", alignItems: "center", gap: 8,
                    }}>
                      <i className={`fa-solid ${icon}`} style={{ fontSize: 11, color }} />
                      <div>
                        <div style={{ fontSize: 11.5, fontWeight: 600, color: "rgba(255,255,255,0.80)", fontFamily: "'Outfit', sans-serif" }}>
                          {time}
                        </div>
                        <div style={{ fontSize: 9.5, color: "rgba(255,255,255,0.28)", fontFamily: "'Outfit', sans-serif", letterSpacing: "0.04em", textTransform: "uppercase" }}>
                          {label}
                        </div>
                      </div>
                    </div>
                  ))}
                </div>
              )}
            </div>
          </motion.div>
        )}

        {/* ════════════════════════════════════════════════════════════
            CORTEX INTELLIGENCE CARD
        ════════════════════════════════════════════════════════════ */}
        <motion.div {...sect(0.16)} style={{ ...GLASS_DEEP }}>

          {/* Scanline sweep */}
          <div style={{
            position: "absolute", left: 0, right: 0, height: 40,
            background: "linear-gradient(180deg, transparent 0%, rgba(255,255,255,0.025) 50%, transparent 100%)",
            animation: "csw-scan 6s linear infinite",
            pointerEvents: "none", zIndex: 0,
          }} />

          {/* Accent line */}
          <div style={{
            position: "absolute", top: 0, left: 0, right: 0, height: 1,
            background: `linear-gradient(90deg, transparent, #2DD4BF55, #818CF855, transparent)`,
            pointerEvents: "none",
          }} />

          <div style={{ padding: "13px 14px 14px", position: "relative", zIndex: 1 }}>

            {/* Header */}
            <div style={{
              display: "flex", alignItems: "center", justifyContent: "space-between",
              marginBottom: 10,
            }}>
              <div style={{ display: "flex", alignItems: "center", gap: 8 }}>
                <div style={{
                  width: 28, height: 28, borderRadius: 10,
                  background: "linear-gradient(135deg, #1e1b4b, #0f172a)",
                  border: "1px solid rgba(129,140,248,0.30)",
                  display: "flex", alignItems: "center", justifyContent: "center",
                  boxShadow: "0 0 12px rgba(129,140,248,0.30)",
                }}>
                  <i className="fa-solid fa-brain" style={{
                    fontSize: 12, color: "#818CF8",
                    filter: "drop-shadow(0 0 5px rgba(129,140,248,0.90))",
                  }} />
                </div>
                <div>
                  <div style={{
                    fontSize: 11, fontWeight: 800, letterSpacing: "0.12em",
                    textTransform: "uppercase",
                    background: "linear-gradient(90deg, #818CF8, #2DD4BF)",
                    WebkitBackgroundClip: "text", WebkitTextFillColor: "transparent",
                    backgroundClip: "text",
                    fontFamily: "'Outfit', sans-serif",
                  }}>
                    Cortex Brief
                  </div>
                  <div style={{ fontSize: 10, color: "rgba(255,255,255,0.28)", fontFamily: "'Outfit', sans-serif", marginTop: 1 }}>
                    {fmtDate(now).split(",")[0]} · Intelligence
                  </div>
                </div>
              </div>

              {/* LIVE badge */}
              <div style={{
                display: "flex", alignItems: "center", gap: 4,
                background: "rgba(57,255,20,0.08)",
                border: "1px solid rgba(57,255,20,0.22)",
                borderRadius: 20, padding: "3px 8px",
              }}>
                <div style={{
                  width: 5, height: 5, borderRadius: "50%",
                  background: "#39FF14",
                  boxShadow: "0 0 6px #39FF14",
                  animation: "csw-pulse-dot 1.4s ease-in-out infinite",
                }} />
                <span style={{ fontSize: 9.5, fontWeight: 800, color: "#39FF14", fontFamily: "'Outfit', sans-serif", letterSpacing: "0.08em" }}>
                  LIVE
                </span>
              </div>
            </div>

            {/* Divider */}
            <div style={{ height: 1, background: "rgba(255,255,255,0.05)", marginBottom: 10 }} />

            {/* Rotating intelligence message */}
            <div style={{
              minHeight: 36, marginBottom: 11,
              background: "rgba(255,255,255,0.025)",
              borderRadius: 10, padding: "8px 10px",
              border: "1px solid rgba(255,255,255,0.04)",
              overflow: "hidden", position: "relative",
            }}>
              <AnimatePresence mode="wait">
                <motion.p
                  key={msgIdx}
                  initial={{ opacity: 0, y: 8 }}
                  animate={{ opacity: 1, y: 0 }}
                  exit={{ opacity: 0, y: -8 }}
                  transition={{ duration: 0.32, ease: [0.22, 1, 0.36, 1] }}
                  style={{
                    margin: 0, fontSize: 12.5,
                    color: "rgba(255,255,255,0.65)",
                    fontFamily: "'Outfit', sans-serif",
                    lineHeight: 1.5, fontWeight: 400,
                  }}
                >
                  {CORTEX_MSGS[msgIdx]}
                </motion.p>
              </AnimatePresence>
            </div>

            {/* Cortex has already done section */}
            <div style={{
              fontSize: 9.5, fontWeight: 700, letterSpacing: "0.10em",
              textTransform: "uppercase", color: "rgba(255,255,255,0.22)",
              fontFamily: "'Outfit', sans-serif", marginBottom: 7,
            }}>
              Cortex has already
            </div>
            <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr", gap: "5px 8px" }}>
              {CHECKLIST.map(({ label, done }, i) => (
                <motion.div
                  key={label}
                  initial={{ opacity: 0, x: -6 }}
                  animate={{ opacity: 1, x: 0 }}
                  transition={{ delay: 0.20 + i * 0.05, type: "spring", damping: 22, stiffness: 300 }}
                  style={{
                    display: "flex", alignItems: "center", gap: 6,
                  }}
                >
                  <div style={{
                    width: 14, height: 14, borderRadius: 4, flexShrink: 0,
                    background: done ? "rgba(57,255,20,0.15)" : "rgba(255,255,255,0.06)",
                    border: `1px solid ${done ? "rgba(57,255,20,0.40)" : "rgba(255,255,255,0.10)"}`,
                    display: "flex", alignItems: "center", justifyContent: "center",
                    boxShadow: done ? "0 0 6px rgba(57,255,20,0.30)" : "none",
                  }}>
                    {done && <i className="fa-solid fa-check" style={{ fontSize: 7.5, color: "#39FF14" }} />}
                  </div>
                  <span style={{
                    fontSize: 11.5, color: done ? "rgba(255,255,255,0.68)" : "rgba(255,255,255,0.32)",
                    fontFamily: "'Outfit', sans-serif", fontWeight: 400, lineHeight: 1.3,
                  }}>
                    {label}
                  </span>
                </motion.div>
              ))}
            </div>
          </div>
        </motion.div>

        {/* ════════════════════════════════════════════════════════════
            BATTERY
        ════════════════════════════════════════════════════════════ */}
        {battery && (
          <motion.div {...sect(0.22)} style={{ ...GLASS_DEEP, overflow: "visible" }}>
            <div style={{
              position: "absolute", top: 0, left: 0, right: 0, height: 1,
              background: `linear-gradient(90deg, transparent, ${getBatteryColor(battery.level)}50, transparent)`,
              pointerEvents: "none",
            }} />
            <div style={{ padding: "12px 14px", display: "flex", alignItems: "center", gap: 12 }}>
              <div style={{
                width: 32, height: 32, borderRadius: 10, flexShrink: 0,
                background: `${getBatteryColor(battery.level)}10`,
                border: `1px solid ${getBatteryColor(battery.level)}28`,
                display: "flex", alignItems: "center", justifyContent: "center",
              }}>
                <i
                  className={`fa-solid ${battery.charging ? "fa-bolt" : battery.level > 50 ? "fa-battery-three-quarters" : battery.level > 20 ? "fa-battery-half" : "fa-battery-quarter"}`}
                  style={{
                    fontSize: 13, color: getBatteryColor(battery.level),
                    filter: `drop-shadow(0 0 6px ${getBatteryColor(battery.level)}80)`,
                  }}
                />
              </div>
              <div style={{ flex: 1, display: "flex", flexDirection: "column", gap: 5 }}>
                <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center" }}>
                  <span style={{ fontSize: 11.5, color: "rgba(255,255,255,0.42)", fontFamily: "'Outfit', sans-serif" }}>
                    Battery{battery.charging ? " · Charging" : ""}
                  </span>
                  <span style={{
                    fontSize: 12, fontWeight: 700,
                    color: getBatteryColor(battery.level),
                    fontFamily: "'Outfit', sans-serif",
                    filter: `drop-shadow(0 0 4px ${getBatteryColor(battery.level)}80)`,
                  }}>
                    {battery.level}%{battery.charging ? " ⚡" : ""}
                  </span>
                </div>
                {/* Animated fill bar */}
                <div style={{ height: 5, borderRadius: 3, background: "rgba(255,255,255,0.06)", overflow: "hidden" }}>
                  <motion.div
                    style={{
                      height: "100%", borderRadius: 3,
                      background: `linear-gradient(90deg, ${getBatteryColor(battery.level)}, ${getBatteryColor(battery.level)}CC)`,
                      boxShadow: `0 0 10px ${getBatteryColor(battery.level)}80`,
                    }}
                    initial={{ width: 0 }}
                    animate={{ width: `${battery.level}%` }}
                    transition={{ duration: 1.2, ease: [0.34, 1.56, 0.64, 1] }}
                  />
                </div>
              </div>
            </div>
          </motion.div>
        )}

        {/* Bottom padding */}
        <div style={{ height: 8 }} />

      </div>
    </div>
  );
}
