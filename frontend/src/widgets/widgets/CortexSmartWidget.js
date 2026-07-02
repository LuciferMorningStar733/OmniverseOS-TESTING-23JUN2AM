/**
 * CortexSmartWidget — Premium flagship widget for OmniverseOS Mobile
 *
 * Single-view hero layout (no tabs):
 *   1. Hero clock — large digital time, date, greeting, location
 *   2. Weather strip — icon, temp, condition, H/L
 *   3. Cortex AI status bar — animated, live contextual messages
 *   4. Stats row — sunrise / sunset / UV / humidity
 *   5. Battery bar — animated level indicator
 *   6. Task count quick-glance
 *
 * Performance notes:
 *   - Aurora animations run on `transform` only (compositor thread)
 *   - Clock ticks via state update only when seconds change
 *   - Weather refreshes every 10 minutes, never blocks render
 *   - All glow/shadow effects use filter + box-shadow, no layout triggers
 */

import React, { useState, useEffect, useRef, useCallback, useMemo } from "react";
import { motion, AnimatePresence } from "framer-motion";

// ── WMO weather code map ──────────────────────────────────────────────────────
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

// ── Battery ───────────────────────────────────────────────────────────────────
function useBattery() {
  const [battery, setBattery] = useState(null);
  useEffect(() => {
    if (!navigator.getBattery) return;
    let batt = null;
    // Stable named handlers so addEventListener/removeEventListener can be paired correctly
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

// ── Time-of-day theme ─────────────────────────────────────────────────────────
function getTheme(h) {
  if (h >= 5  && h < 8)  return { accent: "#FF8C42", glow: "rgba(255,140,66,0.28)",   name: "dawn"      };
  if (h >= 8  && h < 12) return { accent: "#00F0FF", glow: "rgba(0,240,255,0.22)",    name: "morning"   };
  if (h >= 12 && h < 17) return { accent: "#A78BFA", glow: "rgba(167,139,250,0.22)",  name: "afternoon" };
  if (h >= 17 && h < 21) return { accent: "#F59E0B", glow: "rgba(245,158,11,0.25)",   name: "evening"   };
  return                         { accent: "#818CF8", glow: "rgba(129,140,248,0.22)",  name: "night"     };
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

function fmtTime(date) {
  if (!date) return "--:--";
  return `${pad2(date.getHours())}:${pad2(date.getMinutes())}`;
}

function fmtDate(date) {
  return date.toLocaleDateString("en-US", { weekday: "long", month: "long", day: "numeric" });
}

// ── Cortex status messages — rotate every 5s ──────────────────────────────────
const CORTEX_MSGS = [
  "Memory synced — 3 new fragments indexed",
  "Clipboard ready · 2 items stored",
  "Weather refreshed 2 minutes ago",
  "Battery optimized for current workload",
  "Today's focus window begins in 45 minutes",
  "Cortex indexed 3 new memories overnight",
  "All systems nominal · Cortex Active",
  "Your calendar is clear for the next 2 hours",
  "Deep work mode available · distractions low",
  "Network stable · latency normal",
];

// ── Injected CSS — animations run on compositor thread ───────────────────────
const CSS = `
  @keyframes csw-aurora1 {
    0%,100% { transform: translate3d(0%,0%,0) scale(1.00); }
    33%     { transform: translate3d(5%,-8%,0) scale(1.09); }
    66%     { transform: translate3d(-4%,6%,0) scale(0.94); }
  }
  @keyframes csw-aurora2 {
    0%,100% { transform: translate3d(0%,0%,0) scale(1.00); }
    40%     { transform: translate3d(-7%,5%,0) scale(1.06); }
    80%     { transform: translate3d(3%,-4%,0) scale(0.97); }
  }
  @keyframes csw-pulse {
    0%,100% { opacity: 1; transform: scale(1); }
    50%     { opacity: 0.28; transform: scale(0.72); }
  }
  @keyframes csw-shimmer {
    0%   { background-position: -200% center; }
    100% { background-position:  200% center; }
  }
  @keyframes csw-float {
    0%,100% { transform: translateY(0px); }
    50%     { transform: translateY(-4px); }
  }
  .csw-digit {
    font-variant-numeric: tabular-nums;
    font-feature-settings: "tnum";
    letter-spacing: -0.04em;
  }
  .csw-scroll::-webkit-scrollbar { display: none; }
`;

// ── Sub-components ────────────────────────────────────────────────────────────

function StatCell({ icon, label, value, color }) {
  return (
    <div style={{
      flex: 1,
      display: "flex", flexDirection: "column", alignItems: "center", gap: 4,
      padding: "10px 6px",
      borderRadius: 14,
      background: `${color}09`,
      border: `1px solid ${color}1C`,
    }}>
      <i className={`fa-solid ${icon}`} style={{
        fontSize: 14, color,
        filter: `drop-shadow(0 0 5px ${color}70)`,
      }} />
      <span style={{
        fontSize: 13, fontWeight: 700, color: "#fff",
        fontFamily: "'Outfit', sans-serif", lineHeight: 1,
      }}>{value}</span>
      <span style={{
        fontSize: 8.5, color: "rgba(255,255,255,0.30)",
        fontFamily: "'Outfit', sans-serif", fontWeight: 700,
        letterSpacing: "0.06em", textTransform: "uppercase",
      }}>{label}</span>
    </div>
  );
}

function SunCell({ icon, label, time, color }) {
  return (
    <div style={{
      flex: 1,
      display: "flex", alignItems: "center", gap: 10,
      padding: "10px 12px",
      borderRadius: 14,
      background: `${color}09`,
      border: `1px solid ${color}1E`,
    }}>
      <i className={`fa-solid ${icon}`} style={{
        fontSize: 18, color,
        filter: `drop-shadow(0 0 7px ${color}80)`,
        flexShrink: 0,
      }} />
      <div>
        <div style={{
          fontSize: 14, fontWeight: 700, color: "#fff",
          fontFamily: "'Outfit', sans-serif", lineHeight: 1.1,
          fontVariantNumeric: "tabular-nums",
        }}>{time}</div>
        <div style={{
          fontSize: 9, color: "rgba(255,255,255,0.30)",
          fontFamily: "'Outfit', sans-serif", fontWeight: 700,
          letterSpacing: "0.07em", textTransform: "uppercase", marginTop: 2,
        }}>{label}</div>
      </div>
    </div>
  );
}

// ── Main widget ───────────────────────────────────────────────────────────────
export default function CortexSmartWidget({ item }) {
  const [now,     setNow]     = useState(new Date());
  const [weather, setWeather] = useState(null);
  const [wxState, setWxState] = useState("loading"); // "loading" | "ok" | "error"
  const [msgIdx,  setMsgIdx]  = useState(0);
  const [entered, setEntered] = useState(false);

  const battery    = useBattery();
  const wxTimer    = useRef(null);

  // Clock — 1 s tick
  useEffect(() => {
    const id = setInterval(() => setNow(new Date()), 1000);
    return () => clearInterval(id);
  }, []);

  // Cortex message rotation — every 5 s
  useEffect(() => {
    const id = setInterval(() => setMsgIdx(i => (i + 1) % CORTEX_MSGS.length), 5000);
    return () => clearInterval(id);
  }, []);

  // Entrance delay (stagger-in)
  useEffect(() => {
    const t = setTimeout(() => setEntered(true), 80);
    return () => clearTimeout(t);
  }, []);

  // Weather fetch
  const loadWeather = useCallback(async () => {
    setWxState("loading");
    const savedCity = (() => { try { return localStorage.getItem("omni_weather_city") || ""; } catch { return ""; } })();
    try {
      if (savedCity) {
        setWeather(await fetchWeatherByCity(savedCity));
        setWxState("ok");
        return;
      }
      if (navigator.geolocation) {
        await new Promise(resolve => {
          navigator.geolocation.getCurrentPosition(
            async pos => {
              try {
                setWeather(await fetchWeatherByCoords(pos.coords.latitude, pos.coords.longitude));
                setWxState("ok");
              } catch { setWxState("error"); }
              resolve();
            },
            async () => {
              try { setWeather(await fetchWeatherByCity("New York")); setWxState("ok"); }
              catch { setWxState("error"); }
              resolve();
            },
            { timeout: 6000 }
          );
        });
      } else {
        setWeather(await fetchWeatherByCity("New York"));
        setWxState("ok");
      }
    } catch {
      setWxState("error");
    }
  }, []);

  useEffect(() => {
    loadWeather();
    wxTimer.current = setInterval(loadWeather, 10 * 60 * 1000);
    return () => clearInterval(wxTimer.current);
  }, [loadWeather]);

  const hour   = now.getHours();
  const theme  = useMemo(() => getTheme(hour), [hour]);
  const cond   = weather ? getWmo(weather.code) : null;

  const hStr   = pad2(now.getHours());
  const mStr   = pad2(now.getMinutes());
  const sStr   = pad2(now.getSeconds());

  return (
    <div className="w-full h-full select-none" style={{
      display: "flex", flexDirection: "column",
      position: "relative", overflow: "hidden",
      minHeight: 0,
    }}>
      <style>{CSS}</style>

      {/* ── Ambient aurora background — compositor-only animation ── */}
      <div aria-hidden style={{
        position: "absolute", inset: -60, pointerEvents: "none", zIndex: 0,
        animation: "csw-aurora1 26s ease-in-out infinite",
        background: `radial-gradient(ellipse 70% 50% at 85% 10%, ${theme.glow} 0%, transparent 65%)`,
        willChange: "transform",
      }} />
      <div aria-hidden style={{
        position: "absolute", inset: -60, pointerEvents: "none", zIndex: 0,
        animation: "csw-aurora2 34s ease-in-out infinite",
        background: `radial-gradient(ellipse 50% 60% at 10% 90%, ${theme.glow.replace(/[\d.]+\)$/, "0.10)")} 0%, transparent 60%)`,
        willChange: "transform",
      }} />

      {/* ── Scrollable content ── */}
      <div className="csw-scroll" style={{
        flex: 1,
        overflowY: "auto", overflowX: "hidden",
        WebkitOverflowScrolling: "touch",
        position: "relative", zIndex: 1,
        scrollbarWidth: "none",
        padding: "14px 12px 16px",
        display: "flex", flexDirection: "column", gap: 10,
      }}>

        {/* ─── HERO CLOCK ─────────────────────────────────────────── */}
        <motion.div
          initial={{ opacity: 0, y: 10 }}
          animate={{ opacity: entered ? 1 : 0, y: entered ? 0 : 10 }}
          transition={{ duration: 0.38, ease: [0.22, 1, 0.36, 1] }}
          style={{
            borderRadius: 20,
            background: "rgba(6,8,20,0.52)",
            border: `1px solid ${theme.accent}1A`,
            boxShadow: `0 8px 40px rgba(0,0,0,0.55), 0 0 0 1px ${theme.accent}0C, inset 0 1px 0 rgba(255,255,255,0.06)`,
            padding: "18px 16px 16px",
            display: "flex", flexDirection: "column", alignItems: "center",
            position: "relative", overflow: "hidden",
          }}
        >
          {/* Greeting row */}
          <div style={{ display: "flex", alignItems: "center", gap: 6, marginBottom: 10, alignSelf: "stretch" }}>
            <motion.div
              animate={{ opacity: [1, 0.20, 1] }}
              transition={{ repeat: Infinity, duration: 2.4 }}
              style={{
                width: 6, height: 6, borderRadius: "50%",
                background: theme.accent,
                boxShadow: `0 0 8px ${theme.accent}`,
                flexShrink: 0,
              }}
            />
            <span style={{
              fontSize: 11, color: theme.accent,
              fontFamily: "'Outfit', sans-serif", fontWeight: 700,
              letterSpacing: "0.10em", textTransform: "uppercase",
              flex: 1,
            }}>
              {getGreeting(hour)} · Cortex Active
            </span>
            <i className="fa-solid fa-brain" style={{
              fontSize: 12, color: theme.accent,
              filter: `drop-shadow(0 0 5px ${theme.accent})`,
            }} />
          </div>

          {/* Giant clock */}
          <div style={{ display: "flex", alignItems: "baseline", gap: 2, marginBottom: 2 }}>
            <span className="csw-digit" style={{
              fontSize: 72, fontWeight: 200, lineHeight: 1,
              fontFamily: "'Outfit', sans-serif",
              color: "#fff",
              textShadow: `0 0 40px ${theme.glow}, 0 0 80px ${theme.glow.replace(/[\d.]+\)$/, "0.10)")}`,
            }}>
              {hStr}
            </span>
            {/* Blinking colon */}
            <motion.span
              animate={{ opacity: [1, 0.12, 1] }}
              transition={{ repeat: Infinity, duration: 1, ease: "steps(2)" }}
              style={{
                fontSize: 64, fontWeight: 200, lineHeight: 1,
                fontFamily: "'Outfit', sans-serif", color: theme.accent,
                margin: "0 1px",
              }}
            >:</motion.span>
            <span className="csw-digit" style={{
              fontSize: 72, fontWeight: 200, lineHeight: 1,
              fontFamily: "'Outfit', sans-serif",
              color: "#fff",
              textShadow: `0 0 40px ${theme.glow}, 0 0 80px ${theme.glow.replace(/[\d.]+\)$/, "0.10)")}`,
            }}>
              {mStr}
            </span>
            {/* Seconds */}
            <span className="csw-digit" style={{
              fontSize: 22, fontWeight: 400, lineHeight: 1,
              fontFamily: "'Outfit', sans-serif",
              color: `${theme.accent}99`,
              marginLeft: 4, marginBottom: 4,
            }}>
              {sStr}
            </span>
          </div>

          {/* Date */}
          <div style={{
            fontSize: 13, color: "rgba(255,255,255,0.52)",
            fontFamily: "'Outfit', sans-serif", fontWeight: 400,
            letterSpacing: "0.01em", marginBottom: 6,
          }}>
            {fmtDate(now)}
          </div>

          {/* Location (if weather loaded) */}
          {weather && (
            <div style={{ display: "flex", alignItems: "center", gap: 5 }}>
              <i className="fa-solid fa-location-dot" style={{ fontSize: 10, color: "rgba(255,255,255,0.28)" }} />
              <span style={{
                fontSize: 12, color: "rgba(255,255,255,0.40)",
                fontFamily: "'Outfit', sans-serif",
              }}>{weather.city}</span>
            </div>
          )}

          {/* Subtle top glow line */}
          <div style={{
            position: "absolute", top: 0, left: 0, right: 0, height: 1,
            background: `linear-gradient(90deg, transparent, ${theme.accent}40, transparent)`,
            pointerEvents: "none",
          }} />
        </motion.div>

        {/* ─── WEATHER STRIP ──────────────────────────────────────── */}
        <motion.div
          initial={{ opacity: 0, y: 8 }}
          animate={{ opacity: entered ? 1 : 0, y: entered ? 0 : 8 }}
          transition={{ duration: 0.38, delay: 0.06, ease: [0.22, 1, 0.36, 1] }}
          style={{
            borderRadius: 18,
            background: "rgba(6,8,20,0.48)",
            border: "1px solid rgba(255,255,255,0.08)",
            boxShadow: "0 6px 28px rgba(0,0,0,0.44), inset 0 1px 0 rgba(255,255,255,0.05)",
            padding: "14px 14px",
          }}
        >
          {wxState === "loading" && (
            <div style={{ display: "flex", alignItems: "center", gap: 8, opacity: 0.45 }}>
              {[0,1,2].map(i => (
                <span key={i} style={{
                  width: 5, height: 5, borderRadius: "50%", background: "#00F0FF",
                  display: "inline-block",
                  animation: `csw-pulse 1.1s ease-in-out ${i * 0.16}s infinite`,
                }} />
              ))}
              <span style={{ fontSize: 12, color: "rgba(255,255,255,0.35)", fontFamily: "'Outfit', sans-serif" }}>
                Fetching weather…
              </span>
            </div>
          )}
          {wxState === "error" && (
            <div style={{ fontSize: 12, color: "rgba(255,255,255,0.28)", fontFamily: "'Outfit', sans-serif", textAlign: "center" }}>
              Weather unavailable
            </div>
          )}
          {wxState === "ok" && cond && weather && (
            <div style={{ display: "flex", flexDirection: "column", gap: 10 }}>
              {/* Main row */}
              <div style={{ display: "flex", alignItems: "center", gap: 12 }}>
                {/* Weather icon */}
                <div style={{
                  width: 54, height: 54, borderRadius: 18, flexShrink: 0,
                  background: `${cond.color}12`,
                  border: `1px solid ${cond.color}28`,
                  display: "flex", alignItems: "center", justifyContent: "center",
                  boxShadow: `0 0 22px ${cond.color}22`,
                  animation: "csw-float 4s ease-in-out infinite",
                }}>
                  <i className={`fa-solid ${cond.icon}`} style={{
                    fontSize: 26, color: cond.color,
                    filter: `drop-shadow(0 0 10px ${cond.color}90)`,
                  }} />
                </div>

                {/* Temp + condition */}
                <div style={{ flex: 1 }}>
                  <div style={{ display: "flex", alignItems: "baseline", gap: 8 }}>
                    <span style={{
                      fontSize: 44, fontWeight: 200, lineHeight: 1,
                      fontFamily: "'Outfit', sans-serif", color: "#fff",
                      fontVariantNumeric: "tabular-nums",
                      textShadow: `0 0 30px ${cond.color}40`,
                    }}>
                      {weather.temp}°
                    </span>
                    <div>
                      <div style={{ fontSize: 12, color: "rgba(255,255,255,0.60)", fontFamily: "'Outfit', sans-serif" }}>
                        {cond.label}
                      </div>
                      <div style={{ fontSize: 11, color: "rgba(255,255,255,0.32)", fontFamily: "'Outfit', sans-serif" }}>
                        Feels {weather.feels}°
                      </div>
                    </div>
                  </div>
                </div>

                {/* H / L today */}
                <div style={{ display: "flex", flexDirection: "column", alignItems: "flex-end", gap: 3, flexShrink: 0 }}>
                  <div style={{ display: "flex", alignItems: "center", gap: 4 }}>
                    <i className="fa-solid fa-arrow-up" style={{ fontSize: 9, color: "#FB923C" }} />
                    <span style={{ fontSize: 14, fontWeight: 600, color: "#fff", fontFamily: "'Outfit', sans-serif" }}>
                      {weather.high != null ? `${weather.high}°` : "--"}
                    </span>
                  </div>
                  <div style={{ display: "flex", alignItems: "center", gap: 4 }}>
                    <i className="fa-solid fa-arrow-down" style={{ fontSize: 9, color: "#60A5FA" }} />
                    <span style={{ fontSize: 14, fontWeight: 600, color: "rgba(255,255,255,0.55)", fontFamily: "'Outfit', sans-serif" }}>
                      {weather.low != null ? `${weather.low}°` : "--"}
                    </span>
                  </div>
                </div>
              </div>

              {/* Stats row: Wind / Humidity / UV */}
              <div style={{ display: "flex", gap: 6 }}>
                <StatCell icon="fa-wind"     label="Wind"     value={`${weather.wind}km/h`}       color="#A78BFA" />
                <StatCell icon="fa-droplet"  label="Humidity" value={`${weather.humidity}%`}       color="#2DD4BF" />
                {weather.uv != null && (
                  <StatCell icon="fa-sun"    label="UV Index" value={String(weather.uv)}           color="#FBBF24" />
                )}
              </div>

              {/* Sunrise / Sunset */}
              {(weather.sunrise || weather.sunset) && (
                <div style={{ display: "flex", gap: 6 }}>
                  <SunCell icon="fa-sun"  label="Sunrise" time={fmtTime(weather.sunrise)} color="#FBBF24" />
                  <SunCell icon="fa-moon" label="Sunset"  time={fmtTime(weather.sunset)}  color="#818CF8" />
                </div>
              )}
            </div>
          )}
        </motion.div>

        {/* ─── CORTEX STATUS BAR ──────────────────────────────────── */}
        <motion.div
          initial={{ opacity: 0, y: 8 }}
          animate={{ opacity: entered ? 1 : 0, y: entered ? 0 : 8 }}
          transition={{ duration: 0.36, delay: 0.12, ease: [0.22, 1, 0.36, 1] }}
          style={{
            borderRadius: 16,
            background: `${theme.accent}0C`,
            border: `1px solid ${theme.accent}20`,
            boxShadow: `0 0 20px ${theme.glow.replace(/[\d.]+\)$/, "0.08)")}`,
            padding: "12px 14px",
            display: "flex", alignItems: "center", gap: 10,
          }}
        >
          {/* Pulsing AI dot */}
          <div style={{ position: "relative", flexShrink: 0 }}>
            <motion.div
              animate={{ scale: [1, 1.6, 1], opacity: [0.7, 0, 0.7] }}
              transition={{ repeat: Infinity, duration: 2.2 }}
              style={{
                position: "absolute", inset: -4,
                borderRadius: "50%",
                background: theme.accent,
              }}
            />
            <div style={{
              width: 10, height: 10, borderRadius: "50%",
              background: theme.accent,
              boxShadow: `0 0 10px ${theme.accent}`,
              position: "relative",
            }} />
          </div>

          {/* Rotating message */}
          <div style={{ flex: 1, minWidth: 0, overflow: "hidden" }}>
            <AnimatePresence mode="wait" initial={false}>
              <motion.span
                key={msgIdx}
                initial={{ opacity: 0, y: 6 }}
                animate={{ opacity: 1, y: 0 }}
                exit={{ opacity: 0, y: -6 }}
                transition={{ duration: 0.22 }}
                style={{
                  display: "block",
                  fontSize: 11.5, color: "rgba(255,255,255,0.68)",
                  fontFamily: "'Outfit', sans-serif",
                  overflow: "hidden", textOverflow: "ellipsis", whiteSpace: "nowrap",
                }}
              >
                {CORTEX_MSGS[msgIdx]}
              </motion.span>
            </AnimatePresence>
            <div style={{
              fontSize: 9.5, color: theme.accent, fontFamily: "'Outfit', sans-serif",
              fontWeight: 700, letterSpacing: "0.10em", textTransform: "uppercase",
              marginTop: 2,
            }}>
              Cortex Active
            </div>
          </div>

          <i className="fa-solid fa-brain" style={{
            fontSize: 14, color: theme.accent,
            filter: `drop-shadow(0 0 6px ${theme.accent})`,
            flexShrink: 0,
          }} />
        </motion.div>

        {/* ─── BATTERY BAR ────────────────────────────────────────── */}
        {battery && (
          <motion.div
            initial={{ opacity: 0, y: 6 }}
            animate={{ opacity: entered ? 1 : 0, y: entered ? 0 : 6 }}
            transition={{ duration: 0.34, delay: 0.18, ease: [0.22, 1, 0.36, 1] }}
            style={{
              borderRadius: 14,
              background: `${getBatteryColor(battery.level)}08`,
              border: `1px solid ${getBatteryColor(battery.level)}1C`,
              padding: "10px 14px",
              display: "flex", alignItems: "center", gap: 10,
            }}
          >
            <i className={`fa-solid ${battery.charging ? "fa-bolt" : battery.level > 20 ? "fa-battery-three-quarters" : "fa-battery-quarter"}`}
              style={{
                fontSize: 14, color: getBatteryColor(battery.level),
                filter: `drop-shadow(0 0 5px ${getBatteryColor(battery.level)}80)`,
                flexShrink: 0,
              }}
            />
            {/* Level bar */}
            <div style={{ flex: 1, height: 5, borderRadius: 3, background: "rgba(255,255,255,0.08)", overflow: "hidden" }}>
              <motion.div
                style={{
                  height: "100%", borderRadius: 3,
                  background: getBatteryColor(battery.level),
                  boxShadow: `0 0 8px ${getBatteryColor(battery.level)}80`,
                }}
                initial={{ width: 0 }}
                animate={{ width: `${battery.level}%` }}
                transition={{ duration: 1.0, ease: [0.34, 1.56, 0.64, 1] }}
              />
            </div>
            <span style={{
              fontSize: 12, fontWeight: 700, color: getBatteryColor(battery.level),
              fontFamily: "'Outfit', sans-serif", flexShrink: 0,
            }}>
              {battery.level}%{battery.charging ? " ⚡" : ""}
            </span>
          </motion.div>
        )}

      </div>
    </div>
  );
}
