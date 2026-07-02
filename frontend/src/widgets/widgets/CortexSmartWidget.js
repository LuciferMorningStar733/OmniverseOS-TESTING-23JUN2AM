import React, { useState, useEffect, useRef, useCallback, useMemo } from "react";
import { motion, AnimatePresence } from "framer-motion";

// ── WMO weather codes ─────────────────────────────────────────────────────────
const WMO = {
  0:  { icon: "fa-sun",                  label: "Clear",         color: "#FFD54F", bg: "rgba(255,213,79,0.12)"  },
  1:  { icon: "fa-sun",                  label: "Mainly Clear",  color: "#FFD54F", bg: "rgba(255,213,79,0.12)"  },
  2:  { icon: "fa-cloud-sun",            label: "Partly Cloudy", color: "#94A3B8", bg: "rgba(148,163,184,0.10)" },
  3:  { icon: "fa-cloud",               label: "Overcast",      color: "#64748B", bg: "rgba(100,116,139,0.10)" },
  45: { icon: "fa-smog",                label: "Foggy",         color: "#94A3B8", bg: "rgba(148,163,184,0.10)" },
  51: { icon: "fa-cloud-drizzle",       label: "Drizzle",       color: "#42A5F5", bg: "rgba(66,165,245,0.12)"  },
  61: { icon: "fa-cloud-rain",          label: "Rain",          color: "#42A5F5", bg: "rgba(66,165,245,0.12)"  },
  65: { icon: "fa-cloud-showers-heavy", label: "Heavy Rain",    color: "#0D47A1", bg: "rgba(13,71,161,0.14)"   },
  71: { icon: "fa-snowflake",           label: "Snow",          color: "#E3F2FD", bg: "rgba(227,242,253,0.12)" },
  80: { icon: "fa-cloud-rain",          label: "Showers",       color: "#42A5F5", bg: "rgba(66,165,245,0.12)"  },
  95: { icon: "fa-cloud-bolt",          label: "Storm",         color: "#7E57C2", bg: "rgba(126,87,194,0.14)"  },
};
function getWmo(code) {
  if (WMO[code]) return WMO[code];
  const k = Object.keys(WMO).map(Number).filter(n => n <= code).pop();
  return WMO[k] ?? { icon: "fa-cloud", label: "Unknown", color: "#94A3B8", bg: "rgba(148,163,184,0.10)" };
}

// ── Weather fetch ─────────────────────────────────────────────────────────────
const METEO = "temperature_2m,apparent_temperature,weathercode,windspeed_10m,relativehumidity_2m,uv_index";

async function fetchWeatherByCoords(lat, lon) {
  const [mRes, gRes] = await Promise.all([
    fetch(`https://api.open-meteo.com/v1/forecast?latitude=${lat}&longitude=${lon}&current=${METEO}&daily=temperature_2m_max,temperature_2m_min,sunrise,sunset,weathercode&temperature_unit=celsius&timezone=auto&forecast_days=1`),
    fetch(`https://nominatim.openstreetmap.org/reverse?lat=${lat}&lon=${lon}&format=json`, { headers: { "Accept-Language": "en" } }),
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
  const geo = await (await fetch(`https://geocoding-api.open-meteo.com/v1/search?name=${encodeURIComponent(name)}&count=1&language=en`)).json();
  if (!geo.results?.length) throw new Error("City not found");
  const { latitude, longitude, name: city } = geo.results[0];
  const mRes = await fetch(`https://api.open-meteo.com/v1/forecast?latitude=${latitude}&longitude=${longitude}&current=${METEO}&daily=temperature_2m_max,temperature_2m_min,sunrise,sunset,weathercode&temperature_unit=celsius&timezone=auto&forecast_days=1`);
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

// ── Time-of-day theme ─────────────────────────────────────────────────────────
function getTheme(h) {
  if (h >= 5  && h < 8)  return { accent: "#FF8C42", glow: "rgba(255,140,66,0.28)",  name: "dawn"      };
  if (h >= 8  && h < 12) return { accent: "#00F0FF", glow: "rgba(0,240,255,0.22)",   name: "morning"   };
  if (h >= 12 && h < 17) return { accent: "#A78BFA", glow: "rgba(167,139,250,0.22)", name: "afternoon" };
  if (h >= 17 && h < 21) return { accent: "#F59E0B", glow: "rgba(245,158,11,0.24)",  name: "evening"   };
  return                         { accent: "#818CF8", glow: "rgba(129,140,248,0.22)", name: "night"     };
}

function getGreeting(h) {
  if (h < 5)  return "Good Night";
  if (h < 12) return "Good Morning";
  if (h < 17) return "Good Afternoon";
  return "Good Evening";
}

function getBatteryColor(pct) {
  if (pct >= 50) return "#39FF14";
  if (pct >= 20) return "#F59E0B";
  return "#FF003C";
}

// ── Format sunrise/sunset ─────────────────────────────────────────────────────
function fmtTime(d) {
  if (!d) return "--:--";
  return d.toLocaleTimeString([], { hour: "2-digit", minute: "2-digit", hour12: true });
}

// ── Cortex live messages cycling ──────────────────────────────────────────────
const CORTEX_MESSAGES = [
  "Memory synced · 14 fragments indexed",
  "Clipboard ready · 3 recent items",
  "Weather refreshed · conditions stable",
  "Battery optimised · 6h remaining",
  "Focus window opens in 45 min",
  "3 memories indexed overnight",
  "Your reading pace: 2.3× above avg",
  "Today's priority: 2 tasks due",
];

// ── Pulsing dot ───────────────────────────────────────────────────────────────
function PulseDot({ color }) {
  return (
    <motion.div
      animate={{ opacity: [1, 0.20, 1], scale: [1, 1.5, 1] }}
      transition={{ repeat: Infinity, duration: 2.4, ease: "easeInOut" }}
      style={{ width: 6, height: 6, borderRadius: "50%", background: color, boxShadow: `0 0 8px ${color}`, flexShrink: 0 }}
    />
  );
}

// ── CSS animations ────────────────────────────────────────────────────────────
const CSS = `
  @keyframes csw-aurora1 {
    0%,100%{ transform:translate3d(0,0,0) scale(1); }
    40%    { transform:translate3d(6%,-8%,0) scale(1.08); }
    70%    { transform:translate3d(-4%,5%,0) scale(0.96); }
  }
  @keyframes csw-aurora2 {
    0%,100%{ transform:translate3d(0,0,0) scale(1); }
    35%    { transform:translate3d(-5%,6%,0) scale(1.05); }
    65%    { transform:translate3d(4%,-4%,0) scale(0.97); }
  }
  @keyframes csw-float {
    0%,100%{ transform:translate3d(0,0,0); }
    50%    { transform:translate3d(0,-3px,0); }
  }
  @keyframes csw-scanline {
    0%  { transform:translate3d(0,-100%,0); opacity:0; }
    5%  { opacity:0.4; }
    95% { opacity:0.4; }
    100%{ transform:translate3d(0,100%,0); opacity:0; }
  }
  @keyframes csw-msgSlide {
    0%   { opacity:0; transform:translate3d(0,8px,0); }
    12%  { opacity:1; transform:translate3d(0,0,0); }
    80%  { opacity:1; transform:translate3d(0,0,0); }
    100% { opacity:0; transform:translate3d(0,-6px,0); }
  }
`;

// ── Battery hook ─────────────────────────────────────────────────────────────
function useBattery() {
  const [batt, setBatt] = useState(null);
  useEffect(() => {
    if (!navigator.getBattery) return;
    navigator.getBattery().then(b => {
      setBatt({ level: Math.round(b.level * 100), charging: b.charging });
      const update = () => setBatt({ level: Math.round(b.level * 100), charging: b.charging });
      b.addEventListener("levelchange", update);
      b.addEventListener("chargingchange", update);
      return () => { b.removeEventListener("levelchange", update); b.removeEventListener("chargingchange", update); };
    }).catch(() => {});
  }, []);
  return batt;
}

// ── Tab: Clock + Weather ──────────────────────────────────────────────────────
function ClockWeatherTab({ now, weather, wxStatus, theme }) {
  const h   = now.getHours();
  const m   = now.getMinutes();
  const s   = now.getSeconds();
  const hh  = String(h).padStart(2, "0");
  const mm  = String(m).padStart(2, "0");
  const cond = weather ? getWmo(weather.code) : null;
  const secPct = s / 60;
  const battery = useBattery();

  return (
    <div style={{ display: "flex", flexDirection: "column", gap: 0 }}>
      {/* Large clock */}
      <div style={{ padding: "18px 18px 0", position: "relative", zIndex: 1 }}>
        <div style={{ display: "flex", alignItems: "flex-end", gap: 0, userSelect: "none" }}>
          <span style={{
            fontSize: "clamp(52px,14vw,72px)",
            fontFamily: "'Outfit', sans-serif",
            fontWeight: 100,
            color: "#fff",
            letterSpacing: "-0.04em",
            lineHeight: 1,
            textShadow: `0 0 60px ${theme.glow}, 0 2px 20px rgba(0,0,0,0.60)`,
          }}>{hh}</span>
          <motion.span
            animate={{ opacity: s % 2 === 0 ? 1 : 0.12 }}
            transition={{ duration: 0.08 }}
            style={{
              fontSize: "clamp(42px,11vw,58px)",
              fontFamily: "'Outfit', sans-serif",
              fontWeight: 100,
              color: theme.accent,
              letterSpacing: "-0.04em",
              lineHeight: 1,
              paddingBottom: 2,
              filter: s % 2 === 0 ? `drop-shadow(0 0 12px ${theme.accent})` : "none",
            }}
          >:</motion.span>
          <span style={{
            fontSize: "clamp(52px,14vw,72px)",
            fontFamily: "'Outfit', sans-serif",
            fontWeight: 100,
            color: "#fff",
            letterSpacing: "-0.04em",
            lineHeight: 1,
            textShadow: `0 0 60px ${theme.glow}, 0 2px 20px rgba(0,0,0,0.60)`,
          }}>{mm}</span>
        </div>

        {/* Seconds bar */}
        <div style={{ height: 2, borderRadius: 2, background: "rgba(255,255,255,0.06)", marginTop: 8, overflow: "hidden" }}>
          <motion.div
            style={{ height: "100%", borderRadius: 2, background: `linear-gradient(90deg, ${theme.accent}70, ${theme.accent})`, boxShadow: `0 0 8px ${theme.accent}90` }}
            animate={{ width: `${secPct * 100}%` }}
            transition={{ duration: 0.7, ease: "linear" }}
          />
        </div>

        {/* Date + CORTEX pill */}
        <div style={{ display: "flex", alignItems: "center", justifyContent: "space-between", marginTop: 8 }}>
          <span style={{ fontSize: 12.5, color: "rgba(255,255,255,0.38)", fontFamily: "'Outfit', sans-serif", userSelect: "none" }}>
            {now.toLocaleDateString([], { weekday: "long", month: "long", day: "numeric" })}
          </span>
          <div style={{ display: "flex", alignItems: "center", gap: 5, padding: "3px 9px", borderRadius: 20, background: "rgba(0,0,0,0.45)", border: `1px solid ${theme.accent}28` }}>
            <PulseDot color={theme.accent} />
            <span style={{ fontSize: 8.5, color: theme.accent, fontFamily: "'Outfit', sans-serif", fontWeight: 700, letterSpacing: "0.08em", userSelect: "none" }}>
              CORTEX
            </span>
          </div>
        </div>
      </div>

      {/* Divider */}
      <div style={{ height: 1, background: `linear-gradient(90deg, transparent, ${theme.accent}20, transparent)`, margin: "12px 0" }} />

      {/* Weather section */}
      <div style={{ padding: "0 18px 16px" }}>
        {wxStatus === "loading" && (
          <div style={{ display: "flex", alignItems: "center", gap: 8, opacity: 0.4 }}>
            <i className="fa-solid fa-cloud" style={{ color: "#94A3B8", fontSize: 22 }} />
            <span style={{ fontSize: 13, color: "rgba(255,255,255,0.35)", fontFamily: "'Outfit', sans-serif" }}>Fetching weather…</span>
          </div>
        )}
        {wxStatus === "ok" && weather && (() => {
          const cond2 = getWmo(weather.code);
          return (
            <div style={{ display: "flex", flexDirection: "column", gap: 10 }}>
              {/* Main weather row */}
              <div style={{ display: "flex", alignItems: "center", gap: 12 }}>
                <div style={{
                  width: 52, height: 52, borderRadius: 16, flexShrink: 0,
                  background: cond2.bg,
                  border: `1px solid ${cond2.color}30`,
                  display: "flex", alignItems: "center", justifyContent: "center",
                  boxShadow: `0 0 20px ${cond2.color}20`,
                }}>
                  <i className={`fa-solid ${cond2.icon}`} style={{ fontSize: 24, color: cond2.color, filter: `drop-shadow(0 0 8px ${cond2.color}80)` }} />
                </div>
                <div style={{ flex: 1 }}>
                  <div style={{ display: "flex", alignItems: "baseline", gap: 6 }}>
                    <span style={{ fontSize: 36, fontWeight: 200, color: "#fff", fontFamily: "'Outfit', sans-serif", letterSpacing: "-0.03em", lineHeight: 1 }}>
                      {weather.temp}°
                    </span>
                    <div style={{ display: "flex", flexDirection: "column" }}>
                      <span style={{ fontSize: 10.5, color: "rgba(255,255,255,0.55)", fontFamily: "'Outfit', sans-serif" }}>{cond2.label}</span>
                      <span style={{ fontSize: 10, color: "rgba(255,255,255,0.32)", fontFamily: "'Outfit', sans-serif" }}>Feels {weather.feels}°</span>
                    </div>
                  </div>
                  <div style={{ display: "flex", alignItems: "center", gap: 4, marginTop: 3 }}>
                    <i className="fa-solid fa-location-dot" style={{ fontSize: 9, color: "rgba(255,255,255,0.30)" }} />
                    <span style={{ fontSize: 11, color: "rgba(255,255,255,0.45)", fontFamily: "'Outfit', sans-serif" }}>{weather.city}</span>
                  </div>
                </div>
              </div>

              {/* Weather stats grid */}
              <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr 1fr 1fr", gap: 6 }}>
                {[
                  { icon: "fa-thermometer-half", label: "High", val: weather.high != null ? `${weather.high}°` : "--", color: "#FB923C" },
                  { icon: "fa-thermometer-quarter", label: "Low", val: weather.low != null ? `${weather.low}°` : "--", color: "#60A5FA" },
                  { icon: "fa-wind",                label: "Wind", val: `${weather.wind}km/h`,                           color: "#A78BFA" },
                  { icon: "fa-droplet",             label: "Hum",  val: `${weather.humidity}%`,                          color: "#2DD4BF" },
                ].map(item => (
                  <div key={item.label} style={{
                    display: "flex", flexDirection: "column", alignItems: "center", gap: 3,
                    padding: "8px 4px", borderRadius: 12,
                    background: `${item.color}0A`,
                    border: `1px solid ${item.color}18`,
                  }}>
                    <i className={`fa-solid ${item.icon}`} style={{ fontSize: 12, color: item.color, filter: `drop-shadow(0 0 4px ${item.color}60)` }} />
                    <span style={{ fontSize: 11.5, fontWeight: 600, color: "#fff", fontFamily: "'Outfit', sans-serif" }}>{item.val}</span>
                    <span style={{ fontSize: 8.5, color: "rgba(255,255,255,0.30)", fontFamily: "'Outfit', sans-serif", letterSpacing: "0.04em" }}>{item.label.toUpperCase()}</span>
                  </div>
                ))}
              </div>

              {/* Sunrise / sunset */}
              <div style={{ display: "flex", gap: 8 }}>
                {[
                  { icon: "fa-sun", label: "Sunrise", val: fmtTime(weather.sunrise), color: "#FBBF24" },
                  { icon: "fa-moon", label: "Sunset",  val: fmtTime(weather.sunset),  color: "#818CF8" },
                ].map(item => (
                  <div key={item.label} style={{
                    flex: 1, display: "flex", alignItems: "center", gap: 8,
                    padding: "8px 10px", borderRadius: 12,
                    background: `${item.color}09`,
                    border: `1px solid ${item.color}18`,
                  }}>
                    <i className={`fa-solid ${item.icon}`} style={{ fontSize: 14, color: item.color, filter: `drop-shadow(0 0 5px ${item.color}60)` }} />
                    <div>
                      <div style={{ fontSize: 12, fontWeight: 600, color: "#fff", fontFamily: "'Outfit', sans-serif" }}>{item.val}</div>
                      <div style={{ fontSize: 9, color: "rgba(255,255,255,0.28)", fontFamily: "'Outfit', sans-serif", letterSpacing: "0.06em" }}>{item.label.toUpperCase()}</div>
                    </div>
                  </div>
                ))}
              </div>

              {/* Battery if available */}
              {battery && (
                <div style={{
                  display: "flex", alignItems: "center", gap: 8,
                  padding: "8px 12px", borderRadius: 12,
                  background: `${getBatteryColor(battery.level)}08`,
                  border: `1px solid ${getBatteryColor(battery.level)}20`,
                }}>
                  <i className={`fa-solid ${battery.charging ? "fa-bolt" : battery.level > 20 ? "fa-battery-three-quarters" : "fa-battery-quarter"}`}
                    style={{ fontSize: 13, color: getBatteryColor(battery.level), filter: `drop-shadow(0 0 4px ${getBatteryColor(battery.level)}60)` }} />
                  <div style={{ flex: 1 }}>
                    <div style={{ height: 4, borderRadius: 2, background: "rgba(255,255,255,0.08)", overflow: "hidden" }}>
                      <motion.div
                        style={{ height: "100%", borderRadius: 2, background: getBatteryColor(battery.level), boxShadow: `0 0 6px ${getBatteryColor(battery.level)}80` }}
                        initial={{ width: 0 }}
                        animate={{ width: `${battery.level}%` }}
                        transition={{ duration: 1.2, ease: [0.34, 1.56, 0.64, 1] }}
                      />
                    </div>
                  </div>
                  <span style={{ fontSize: 11, fontWeight: 600, color: getBatteryColor(battery.level), fontFamily: "'Outfit', sans-serif" }}>
                    {battery.level}%{battery.charging ? " ⚡" : ""}
                  </span>
                </div>
              )}
            </div>
          );
        })()}
        {wxStatus === "error" && (
          <div style={{ fontSize: 12, color: "rgba(255,255,255,0.30)", fontFamily: "'Outfit', sans-serif", textAlign: "center", padding: "12px 0" }}>
            Weather unavailable — tap to retry
          </div>
        )}
      </div>
    </div>
  );
}

// ── Tab: Cortex AI Brief ──────────────────────────────────────────────────────
function CortexBriefTab({ now, theme, msgIdx }) {
  const h = now.getHours();

  const briefs = [
    { time: "< 6",  text: "Night analysis complete. Cortex catalogued 14 memory fragments and optimised your context for tomorrow. Your sleep window was 7.4h — above your weekly average." },
    { time: "< 9",  text: "Morning brief ready. 2 tasks due today, your calendar is clear before 10 AM. High-focus window is open — Cortex recommends deep work now while your energy peaks." },
    { time: "< 12", text: "3 events before noon. Cortex detected a research thread from yesterday's session — follow-up added to Memory. Your attention score is tracking above average." },
    { time: "< 15", text: "Post-lunch check-in. 2 open research threads from this morning. Cortex suggests a 15-minute walk before your 3 PM focus block for optimal energy." },
    { time: "< 18", text: "Energy transition zone. Creative tasks perform best before 6 PM for you. Cortex identified 3 pending items that can be cleared in under 10 minutes." },
    { time: "def",  text: "Evening summary ready. You're ahead on 3 priorities. Cortex is preparing tomorrow's brief based on today's activity. Memory updated with 5 new items." },
  ];

  const brief = h < 6 ? briefs[0] : h < 9 ? briefs[1] : h < 12 ? briefs[2] : h < 15 ? briefs[3] : h < 18 ? briefs[4] : briefs[5];

  const checkItems = [
    { label: "Memory synced",      done: true  },
    { label: "Weather updated",    done: true  },
    { label: "Clipboard ready",    done: true  },
    { label: "No urgent alerts",   done: true  },
    { label: "Focus window set",   done: h >= 8 && h < 18 },
    { label: "Tomorrow's prep",    done: h >= 20 },
  ];

  return (
    <div style={{ padding: "16px 18px 18px", display: "flex", flexDirection: "column", gap: 14 }}>
      {/* Header */}
      <div style={{ display: "flex", alignItems: "center", gap: 10 }}>
        <div style={{
          width: 38, height: 38, borderRadius: 12, flexShrink: 0,
          background: `linear-gradient(135deg, ${theme.accent}30, ${theme.accent}0C)`,
          border: `1px solid ${theme.accent}40`,
          display: "flex", alignItems: "center", justifyContent: "center",
          boxShadow: `0 0 20px ${theme.glow}`,
        }}>
          <i className="fa-solid fa-brain" style={{ color: theme.accent, fontSize: 17, filter: `drop-shadow(0 0 6px ${theme.accent})` }} />
        </div>
        <div style={{ flex: 1 }}>
          <div style={{ fontSize: 11, color: theme.accent, fontFamily: "'Outfit', sans-serif", fontWeight: 700, letterSpacing: "0.10em", textTransform: "uppercase" }}>
            Cortex Brief
          </div>
          <div style={{ fontSize: 11.5, color: "rgba(255,255,255,0.42)", fontFamily: "'Outfit', sans-serif", marginTop: 1 }}>
            {now.toLocaleDateString([], { weekday: "long" })} · AI Daily Summary
          </div>
        </div>
        <div style={{ display: "flex", alignItems: "center", gap: 4 }}>
          <PulseDot color={theme.accent} />
          <span style={{ fontSize: 8.5, color: theme.accent, fontFamily: "'Outfit', sans-serif", fontWeight: 700, letterSpacing: "0.08em" }}>LIVE</span>
        </div>
      </div>

      {/* Brief text */}
      <p style={{
        fontSize: 13.5, fontFamily: "'Outfit', sans-serif", fontWeight: 400,
        color: "rgba(255,255,255,0.68)", lineHeight: 1.6, margin: 0,
      }}>
        {brief.text}
      </p>

      {/* Checklist */}
      <div>
        <div style={{ fontSize: 9.5, color: "rgba(255,255,255,0.24)", fontFamily: "'Outfit', sans-serif", fontWeight: 700, letterSpacing: "0.09em", textTransform: "uppercase", marginBottom: 9 }}>
          Cortex has already:
        </div>
        <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr", gap: "7px 10px" }}>
          {checkItems.map((item, i) => (
            <div key={item.label} style={{ display: "flex", alignItems: "center", gap: 7 }}>
              <motion.div
                initial={{ scale: 0, opacity: 0 }}
                animate={{
                  scale: item.done ? 1 : 0.8,
                  opacity: item.done ? 1 : 0.35,
                  background: item.done ? theme.accent : "rgba(255,255,255,0.08)",
                  borderColor: item.done ? theme.accent : "rgba(255,255,255,0.12)",
                }}
                transition={{ delay: i * 0.08, duration: 0.22 }}
                style={{
                  width: 16, height: 16, borderRadius: 5, flexShrink: 0,
                  display: "flex", alignItems: "center", justifyContent: "center",
                  border: "1px solid",
                  boxShadow: item.done ? `0 0 8px ${theme.glow}` : "none",
                }}
              >
                {item.done && (
                  <i className="fa-solid fa-check" style={{ fontSize: 7, color: "rgba(0,0,0,0.85)" }} />
                )}
              </motion.div>
              <span style={{
                fontSize: 11.5, fontFamily: "'Outfit', sans-serif", lineHeight: 1.3,
                color: item.done ? "rgba(255,255,255,0.78)" : "rgba(255,255,255,0.22)",
              }}>
                {item.label}
              </span>
            </div>
          ))}
        </div>
      </div>

      {/* Live Cortex message ticker */}
      <div style={{
        padding: "10px 12px", borderRadius: 13,
        background: `${theme.accent}0C`,
        border: `1px solid ${theme.accent}1E`,
        overflow: "hidden", position: "relative", minHeight: 38,
      }}>
        <div style={{ fontSize: 9.5, color: theme.accent, fontFamily: "'Outfit', sans-serif", fontWeight: 700, letterSpacing: "0.09em", textTransform: "uppercase", marginBottom: 3, opacity: 0.70 }}>
          Cortex · Live
        </div>
        <AnimatePresence mode="wait">
          <motion.div
            key={msgIdx}
            initial={{ opacity: 0, y: 6 }}
            animate={{ opacity: 1, y: 0 }}
            exit={{ opacity: 0, y: -6 }}
            transition={{ duration: 0.35 }}
            style={{ fontSize: 12.5, color: "rgba(255,255,255,0.72)", fontFamily: "'Outfit', sans-serif" }}
          >
            {CORTEX_MESSAGES[msgIdx % CORTEX_MESSAGES.length]}
          </motion.div>
        </AnimatePresence>
      </div>
    </div>
  );
}

// ── Tab: Calendar + Tasks ─────────────────────────────────────────────────────
const CAL_EVENTS = [
  { time: "10:00 AM", title: "Team Sync",       color: "#00F0FF" },
  { time: "2:30 PM",  title: "Project Review",  color: "#FB923C" },
  { time: "5:00 PM",  title: "Focus Session",   color: "#A855F7" },
];
const TASKS = [
  { title: "Review OmniverseOS performance",  done: true,  color: "#39FF14" },
  { title: "Deploy widget framework update",  done: false, color: "#00F0FF" },
  { title: "Write morning brief automation",  done: false, color: "#A78BFA" },
  { title: "Check Cortex memory snapshots",   done: true,  color: "#F59E0B" },
];

function CalTasksTab({ theme }) {
  const [doneMap, setDoneMap] = useState(() => {
    const m = {};
    TASKS.forEach((t, i) => { m[i] = t.done; });
    return m;
  });

  const today = new Date();
  const dateLabel = today.toLocaleDateString([], { weekday: "long", month: "long", day: "numeric" });

  return (
    <div style={{ padding: "16px 18px 18px", display: "flex", flexDirection: "column", gap: 14 }}>
      {/* Calendar */}
      <div>
        <div style={{ display: "flex", alignItems: "center", gap: 7, marginBottom: 11 }}>
          <i className="fa-solid fa-calendar" style={{ color: "#FB923C", fontSize: 13, filter: "drop-shadow(0 0 5px rgba(251,146,60,0.70))" }} />
          <span style={{ fontSize: 13, fontWeight: 700, color: "rgba(255,255,255,0.88)", fontFamily: "'Outfit', sans-serif" }}>Today's Schedule</span>
          <span style={{ fontSize: 10, color: "rgba(255,255,255,0.28)", fontFamily: "'Outfit', sans-serif", marginLeft: "auto" }}>{CAL_EVENTS.length} events</span>
        </div>
        <div style={{ display: "flex", flexDirection: "column", gap: 0 }}>
          {CAL_EVENTS.map((ev, i) => (
            <div key={i} style={{
              display: "flex", alignItems: "center", gap: 10,
              padding: "9px 0",
              borderBottom: i < CAL_EVENTS.length - 1 ? "1px solid rgba(255,255,255,0.045)" : "none",
            }}>
              <div style={{ width: 3, height: 34, borderRadius: 2, background: `linear-gradient(to bottom, ${ev.color}, ${ev.color}50)`, boxShadow: `0 0 8px ${ev.color}60`, flexShrink: 0 }} />
              <div style={{ flex: 1 }}>
                <div style={{ fontSize: 13, color: "rgba(255,255,255,0.86)", fontFamily: "'Outfit', sans-serif", fontWeight: 500 }}>{ev.title}</div>
                <div style={{ fontSize: 10.5, color: "rgba(255,255,255,0.30)", fontFamily: "'Outfit', sans-serif", marginTop: 1 }}>{ev.time}</div>
              </div>
              <div style={{
                padding: "2px 8px", borderRadius: 20,
                background: `${ev.color}12`, border: `1px solid ${ev.color}22`,
              }}>
                <span style={{ fontSize: 9, color: ev.color, fontFamily: "'Outfit', sans-serif", fontWeight: 600 }}>EVENT</span>
              </div>
            </div>
          ))}
        </div>
      </div>

      {/* Divider */}
      <div style={{ height: 1, background: `linear-gradient(90deg, transparent, ${theme.accent}18, transparent)` }} />

      {/* Tasks */}
      <div>
        <div style={{ display: "flex", alignItems: "center", gap: 7, marginBottom: 11 }}>
          <i className="fa-solid fa-list-check" style={{ color: "#39FF14", fontSize: 13, filter: "drop-shadow(0 0 5px rgba(57,255,20,0.60))" }} />
          <span style={{ fontSize: 13, fontWeight: 700, color: "rgba(255,255,255,0.88)", fontFamily: "'Outfit', sans-serif" }}>Tasks</span>
          <span style={{ fontSize: 10, color: "rgba(255,255,255,0.28)", fontFamily: "'Outfit', sans-serif", marginLeft: "auto" }}>
            {Object.values(doneMap).filter(Boolean).length}/{TASKS.length} done
          </span>
        </div>
        <div style={{ display: "flex", flexDirection: "column", gap: 6 }}>
          {TASKS.map((task, i) => (
            <motion.button
              key={i}
              whileTap={{ scale: 0.98 }}
              onClick={() => setDoneMap(m => ({ ...m, [i]: !m[i] }))}
              style={{
                display: "flex", alignItems: "center", gap: 10,
                padding: "9px 10px", borderRadius: 12,
                background: doneMap[i] ? `${task.color}0A` : "rgba(255,255,255,0.04)",
                border: `1px solid ${doneMap[i] ? task.color + "22" : "rgba(255,255,255,0.07)"}`,
                cursor: "pointer", WebkitTapHighlightColor: "transparent",
                transition: "all 0.18s ease",
                textAlign: "left",
              }}
            >
              <motion.div
                animate={{
                  background: doneMap[i] ? task.color : "transparent",
                  borderColor: doneMap[i] ? task.color : "rgba(255,255,255,0.20)",
                  boxShadow: doneMap[i] ? `0 0 10px ${task.color}60` : "none",
                }}
                transition={{ duration: 0.20 }}
                style={{
                  width: 18, height: 18, borderRadius: 6, flexShrink: 0,
                  border: "1.5px solid",
                  display: "flex", alignItems: "center", justifyContent: "center",
                }}
              >
                <AnimatePresence>
                  {doneMap[i] && (
                    <motion.i
                      key="check"
                      initial={{ scale: 0, rotate: -15 }}
                      animate={{ scale: 1, rotate: 0 }}
                      exit={{ scale: 0 }}
                      transition={{ type: "spring", damping: 14, stiffness: 500 }}
                      className="fa-solid fa-check"
                      style={{ fontSize: 8, color: "rgba(0,0,0,0.85)" }}
                    />
                  )}
                </AnimatePresence>
              </motion.div>
              <span style={{
                fontSize: 12.5, fontFamily: "'Outfit', sans-serif",
                color: doneMap[i] ? "rgba(255,255,255,0.38)" : "rgba(255,255,255,0.78)",
                textDecoration: doneMap[i] ? "line-through" : "none",
                textDecorationColor: "rgba(255,255,255,0.25)",
                transition: "all 0.18s ease",
                flex: 1,
              }}>
                {task.title}
              </span>
            </motion.button>
          ))}
        </div>
      </div>
    </div>
  );
}

// ── Main Widget ───────────────────────────────────────────────────────────────
export default function CortexSmartWidget({ item }) {
  const [now,      setNow]      = useState(new Date());
  const [tab,      setTab]      = useState(0);          // 0=clock, 1=brief, 2=tasks
  const [weather,  setWeather]  = useState(null);
  const [wxStatus, setWxStatus] = useState("loading");
  const [msgIdx,   setMsgIdx]   = useState(0);
  const wxTimerRef = useRef(null);

  // Clock tick
  useEffect(() => {
    const id = setInterval(() => setNow(new Date()), 1000);
    return () => clearInterval(id);
  }, []);

  // Cortex message cycle — every 4s
  useEffect(() => {
    const id = setInterval(() => setMsgIdx(i => (i + 1) % CORTEX_MESSAGES.length), 4000);
    return () => clearInterval(id);
  }, []);

  // Weather fetch
  const loadWeather = useCallback(async () => {
    setWxStatus("loading");
    const savedCity = (() => { try { return localStorage.getItem("omni_weather_city") || ""; } catch { return ""; } })();
    if (savedCity) {
      try { setWeather(await fetchWeatherByCity(savedCity)); setWxStatus("ok"); return; } catch {}
    }
    if (navigator.geolocation) {
      await new Promise(resolve => {
        navigator.geolocation.getCurrentPosition(
          async pos => {
            try { setWeather(await fetchWeatherByCoords(pos.coords.latitude, pos.coords.longitude)); setWxStatus("ok"); }
            catch { setWxStatus("error"); }
            resolve();
          },
          async () => {
            try { setWeather(await fetchWeatherByCity("New York")); setWxStatus("ok"); }
            catch { setWxStatus("error"); }
            resolve();
          },
          { timeout: 6000 }
        );
      });
    } else {
      try { setWeather(await fetchWeatherByCity("New York")); setWxStatus("ok"); }
      catch { setWxStatus("error"); }
    }
  }, []);

  useEffect(() => {
    loadWeather();
    wxTimerRef.current = setInterval(loadWeather, 10 * 60 * 1000);
    return () => clearInterval(wxTimerRef.current);
  }, [loadWeather]);

  const hour  = now.getHours();
  const theme = useMemo(() => getTheme(hour), [hour]);

  const TABS = [
    { icon: "fa-clock",       label: "Clock" },
    { icon: "fa-brain",       label: "Brief" },
    { icon: "fa-list-check",  label: "Tasks" },
  ];

  return (
    <div className="w-full h-full select-none" style={{
      display: "flex", flexDirection: "column",
      position: "relative", overflow: "hidden",
      minHeight: 0,
    }}>
      <style>{CSS}</style>

      {/* Ambient aurora */}
      <div aria-hidden style={{
        position: "absolute", inset: -40, pointerEvents: "none", zIndex: 0,
        animation: "csw-aurora1 28s ease-in-out infinite",
        background: `radial-gradient(ellipse 60% 40% at 80% 15%, ${theme.glow} 0%, transparent 65%)`,
        willChange: "transform",
      }} />
      <div aria-hidden style={{
        position: "absolute", inset: -40, pointerEvents: "none", zIndex: 0,
        animation: "csw-aurora2 36s ease-in-out infinite",
        background: `radial-gradient(ellipse 45% 55% at 15% 85%, ${theme.glow.replace("0.22","0.10").replace("0.28","0.12").replace("0.24","0.10")} 0%, transparent 60%)`,
        willChange: "transform",
      }} />

      {/* Content area */}
      <div style={{ flex: 1, overflowY: "auto", overflowX: "hidden", WebkitOverflowScrolling: "touch", position: "relative", zIndex: 1, scrollbarWidth: "none" }}>
        <AnimatePresence mode="wait" initial={false}>
          <motion.div
            key={tab}
            initial={{ opacity: 0, x: 12 }}
            animate={{ opacity: 1, x: 0 }}
            exit={{ opacity: 0, x: -12 }}
            transition={{ duration: 0.20, ease: "easeOut" }}
          >
            {tab === 0 && <ClockWeatherTab now={now} weather={weather} wxStatus={wxStatus} theme={theme} />}
            {tab === 1 && <CortexBriefTab now={now} theme={theme} msgIdx={msgIdx} />}
            {tab === 2 && <CalTasksTab theme={theme} />}
          </motion.div>
        </AnimatePresence>
      </div>

      {/* Tab bar */}
      <div style={{
        display: "flex", gap: 4,
        padding: "8px 10px 10px",
        borderTop: `1px solid rgba(255,255,255,0.07)`,
        flexShrink: 0, position: "relative", zIndex: 2,
        background: "rgba(0,0,0,0.30)",
        backdropFilter: "blur(20px)",
        WebkitBackdropFilter: "blur(20px)",
      }}>
        {TABS.map((t, i) => {
          const active = tab === i;
          return (
            <motion.button
              key={t.label}
              whileTap={{ scale: 0.90 }}
              onClick={() => setTab(i)}
              style={{
                flex: 1, display: "flex", flexDirection: "column", alignItems: "center", gap: 3,
                padding: "7px 4px",
                borderRadius: 12,
                background: active ? `${theme.accent}14` : "transparent",
                border: `1px solid ${active ? theme.accent + "30" : "transparent"}`,
                cursor: "pointer", WebkitTapHighlightColor: "transparent",
                transition: "all 0.18s ease",
                boxShadow: active ? `0 0 14px ${theme.glow}` : "none",
              }}
            >
              <i className={`fa-solid ${t.icon}`} style={{
                fontSize: 14,
                color: active ? theme.accent : "rgba(255,255,255,0.30)",
                filter: active ? `drop-shadow(0 0 5px ${theme.accent})` : "none",
                transition: "all 0.18s ease",
              }} />
              <span style={{
                fontSize: 9.5,
                color: active ? theme.accent : "rgba(255,255,255,0.28)",
                fontFamily: "'Outfit', sans-serif", fontWeight: active ? 700 : 400,
                letterSpacing: "0.05em",
                transition: "all 0.18s ease",
              }}>
                {t.label.toUpperCase()}
              </span>
            </motion.button>
          );
        })}
      </div>
    </div>
  );
}
