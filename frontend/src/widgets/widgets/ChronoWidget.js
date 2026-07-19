import React, { useEffect, useRef, useState, useCallback } from "react";
import { motion, AnimatePresence } from "framer-motion";

const LS_CITY      = "omni_weather_city";
const LS_FMT       = "omni_clock_24h";
const DEFAULT_CITY = "New York";

// ── WMO codes ────────────────────────────────────────────────────────────────
const WMO = {
  0:  { icon: "fa-sun",                   label: "Clear",           color: "#FFD54F" },
  1:  { icon: "fa-sun",                   label: "Mainly Clear",    color: "#FFD54F" },
  2:  { icon: "fa-cloud-sun",             label: "Partly Cloudy",   color: "#94A3B8" },
  3:  { icon: "fa-cloud",                 label: "Overcast",        color: "#64748B" },
  45: { icon: "fa-smog",                  label: "Foggy",           color: "#94A3B8" },
  48: { icon: "fa-smog",                  label: "Icy Fog",         color: "#94A3B8" },
  51: { icon: "fa-cloud-drizzle",         label: "Light Drizzle",   color: "#42A5F5" },
  53: { icon: "fa-cloud-drizzle",         label: "Drizzle",         color: "#42A5F5" },
  55: { icon: "fa-cloud-drizzle",         label: "Heavy Drizzle",   color: "#1E88E5" },
  61: { icon: "fa-cloud-rain",            label: "Light Rain",      color: "#42A5F5" },
  63: { icon: "fa-cloud-rain",            label: "Rain",            color: "#1E88E5" },
  65: { icon: "fa-cloud-showers-heavy",   label: "Heavy Rain",      color: "#0D47A1" },
  71: { icon: "fa-snowflake",             label: "Light Snow",      color: "#E3F2FD" },
  73: { icon: "fa-snowflake",             label: "Snow",            color: "#E3F2FD" },
  75: { icon: "fa-snowflake",             label: "Heavy Snow",      color: "#BBDEFB" },
  80: { icon: "fa-cloud-rain",            label: "Rain Showers",    color: "#42A5F5" },
  81: { icon: "fa-cloud-showers-heavy",   label: "Showers",         color: "#1E88E5" },
  82: { icon: "fa-cloud-showers-heavy",   label: "Heavy Showers",   color: "#0D47A1" },
  95: { icon: "fa-cloud-bolt",            label: "Thunderstorm",    color: "#7E57C2" },
  99: { icon: "fa-cloud-bolt",            label: "Severe Storm",    color: "#4527A0" },
};
function wmo(code) {
  if (WMO[code]) return WMO[code];
  const k = Object.keys(WMO).map(Number).filter(n => n <= code).pop();
  return WMO[k] ?? { icon: "fa-cloud", label: "Unknown", color: "#94A3B8" };
}

// ── Hourly parsing ────────────────────────────────────────────────────────────
function parseHourly(hourlyJson) {
  if (!hourlyJson?.time) return [];
  const nowH = new Date(); nowH.setMinutes(0, 0, 0);
  return hourlyJson.time
    .map((t, i) => ({ time: new Date(t), temp: Math.round(hourlyJson.temperature_2m[i]), code: hourlyJson.weathercode[i] }))
    .filter(h => h.time >= nowH)
    .slice(0, 120);
}

// ── API constants ─────────────────────────────────────────────────────────────
const METEO_CURRENT = "temperature_2m,apparent_temperature,weathercode,windspeed_10m,relativehumidity_2m";
const METEO_HOURLY  = "temperature_2m,weathercode";
const METEO_SUFFIX  = "&temperature_unit=celsius&wind_speed_unit=kmh&timezone=auto&forecast_days=5";

async function fetchByCoords(lat, lon) {
  const [meteoRes, geoRes] = await Promise.all([
    fetch(`https://api.open-meteo.com/v1/forecast?latitude=${lat}&longitude=${lon}&current=${METEO_CURRENT}&hourly=${METEO_HOURLY}${METEO_SUFFIX}`),
    fetch(`https://nominatim.openstreetmap.org/reverse?lat=${lat}&lon=${lon}&format=json`, { headers: { "Accept-Language": "en" } }),
  ]);
  const meteo = await meteoRes.json();
  const geo   = await geoRes.json();
  const cur   = meteo.current;
  const addr  = geo.address ?? {};
  return {
    temp: Math.round(cur.temperature_2m), feels: Math.round(cur.apparent_temperature),
    wind: Math.round(cur.windspeed_10m), humidity: cur.relativehumidity_2m ?? null,
    code: cur.weathercode, city: addr.city || addr.town || addr.village || addr.county || "Unknown",
    hourly: parseHourly(meteo.hourly),
  };
}
async function fetchByCity(cityName) {
  const geo = await (await fetch(`https://geocoding-api.open-meteo.com/v1/search?name=${encodeURIComponent(cityName)}&count=1&language=en`)).json();
  if (!geo.results?.length) throw new Error("City not found");
  const { latitude, longitude, name } = geo.results[0];
  const meteo = await (await fetch(`https://api.open-meteo.com/v1/forecast?latitude=${latitude}&longitude=${longitude}&current=${METEO_CURRENT}&hourly=${METEO_HOURLY}${METEO_SUFFIX}`)).json();
  const cur = meteo.current;
  return {
    temp: Math.round(cur.temperature_2m), feels: Math.round(cur.apparent_temperature),
    wind: Math.round(cur.windspeed_10m), humidity: cur.relativehumidity_2m ?? null,
    code: cur.weathercode, city: name, hourly: parseHourly(meteo.hourly),
  };
}
function savedCity() { try { return localStorage.getItem(LS_CITY) || ""; } catch { return ""; } }

// ── SVG seconds arc with gradient ────────────────────────────────────────────
function SecondsArc({ seconds, size = 64 }) {
  const r = size / 2 - 4, cx = size / 2, cy = size / 2;
  const circ = 2 * Math.PI * r;
  const dash  = (seconds / 60) * circ;
  const gradId = "chrono-ring-grad";
  return (
    <svg width={size} height={size} style={{ position: "absolute", top: 0, left: 0, pointerEvents: "none" }}>
      <defs>
        <linearGradient id={gradId} x1="0%" y1="0%" x2="100%" y2="100%">
          <stop offset="0%"   stopColor="#63F6FF" />
          <stop offset="100%" stopColor="#00C8FF" />
        </linearGradient>
      </defs>
      <circle cx={cx} cy={cy} r={r} fill="none" stroke="rgba(0,240,255,0.07)" strokeWidth={2} />
      <circle cx={cx} cy={cy} r={r} fill="none" stroke={`url(#${gradId})`} strokeWidth={2}
        strokeDasharray={`${dash} ${circ - dash}`} strokeDashoffset={circ / 4} strokeLinecap="round"
        style={{ filter: "drop-shadow(0 0 3px #63F6FF)" }} />
    </svg>
  );
}

// ── Corner brackets ───────────────────────────────────────────────────────────
function Brackets({ color = "#00E5FF", size = 10, thickness = 1.5, opacity = 0.4 }) {
  const s = { position: "absolute", width: size, height: size, opacity };
  const b = `${thickness}px solid ${color}`;
  return (
    <>
      <div style={{ ...s, top: 0,    left: 0,  borderTop: b,    borderLeft: b }} />
      <div style={{ ...s, top: 0,    right: 0, borderTop: b,    borderRight: b }} />
      <div style={{ ...s, bottom: 0, left: 0,  borderBottom: b, borderLeft: b }} />
      <div style={{ ...s, bottom: 0, right: 0, borderBottom: b, borderRight: b }} />
    </>
  );
}

// ── Hex ticker ────────────────────────────────────────────────────────────────
function HexTicker({ seed }) {
  const vals = Array.from({ length: 8 }, (_, i) =>
    ((seed * 7 + i * 31 + Date.now() / 1000) & 0xFF).toString(16).toUpperCase().padStart(2, "0")
  );
  return (
    <span style={{ fontFamily: "monospace", fontSize: 7.5, color: "rgba(0,229,255,0.22)", letterSpacing: "0.08em" }}>
      {vals.join(" ")}
    </span>
  );
}

// ── Day label helper ──────────────────────────────────────────────────────────
const DAY_SHORT = ["SUN","MON","TUE","WED","THU","FRI","SAT"];
const MON_SHORT = ["JAN","FEB","MAR","APR","MAY","JUN","JUL","AUG","SEP","OCT","NOV","DEC"];
function dayLabel(date) {
  const today = new Date(), tom = new Date(today); tom.setDate(today.getDate() + 1);
  if (date.toDateString() === today.toDateString()) return "TODAY";
  if (date.toDateString() === tom.toDateString())   return "TOMORROW";
  return `${DAY_SHORT[date.getDay()]} ${date.getDate()} ${MON_SHORT[date.getMonth()]}`;
}

// ── 5-day forecast strip ──────────────────────────────────────────────────────
function ForecastStrip({ hourly, onClose }) {
  if (!hourly?.length) return (
    <div style={{ padding: "16px 12px", fontFamily: "monospace", fontSize: 9, color: "rgba(255,255,255,0.3)", textAlign: "center" }}>
      FORECAST DATA UNAVAILABLE
    </div>
  );
  const days = [];
  let curDay = null;
  for (const h of hourly) {
    const ds = h.time.toDateString();
    if (ds !== curDay) { days.push({ label: dayLabel(h.time), hours: [] }); curDay = ds; }
    days[days.length - 1].hours.push(h);
  }
  const allTemps = hourly.map(h => h.temp);
  const minTemp = Math.min(...allTemps), maxTemp = Math.max(...allTemps);
  const tempRange = maxTemp - minTemp || 1;

  return (
    <motion.div
      initial={{ opacity: 0, y: 20 }} animate={{ opacity: 1, y: 0 }} exit={{ opacity: 0, y: 20 }}
      transition={{ type: "spring", stiffness: 340, damping: 30 }}
      style={{ position: "absolute", inset: 0, background: "rgba(6,8,14,0.97)", backdropFilter: "blur(24px)", WebkitBackdropFilter: "blur(24px)", display: "flex", flexDirection: "column", zIndex: 10 }}
    >
      <div style={{ display: "flex", alignItems: "center", justifyContent: "space-between", padding: "8px 10px 6px", borderBottom: "1px solid rgba(0,229,255,0.08)", flexShrink: 0 }}>
        <span style={{ fontFamily: "monospace", fontSize: 7.5, letterSpacing: "0.2em", color: "rgba(0,229,255,0.5)" }}>ATMO.FORECAST // 5-DAY HOURLY</span>
        <button onClick={onClose} style={{ background: "transparent", border: "1px solid rgba(0,229,255,0.2)", borderRadius: 5, color: "rgba(0,229,255,0.5)", fontSize: 8, fontFamily: "monospace", padding: "2px 7px", cursor: "pointer", letterSpacing: "0.1em" }}
          onMouseEnter={e => { e.currentTarget.style.color="#00E5FF"; e.currentTarget.style.borderColor="rgba(0,229,255,0.5)"; }}
          onMouseLeave={e => { e.currentTarget.style.color="rgba(0,229,255,0.5)"; e.currentTarget.style.borderColor="rgba(0,229,255,0.2)"; }}>
          ✕ CLOSE
        </button>
      </div>
      <div style={{ flex: 1, overflowX: "auto", overflowY: "hidden", display: "flex", alignItems: "stretch", padding: "0 4px", scrollbarWidth: "thin", scrollbarColor: "rgba(0,229,255,0.2) transparent", WebkitOverflowScrolling: "touch" }}>
        <div style={{ display: "flex", alignItems: "flex-start", height: "100%" }}>
          {days.map((day, di) => (
            <div key={di} style={{ display: "flex", flexDirection: "column", flexShrink: 0 }}>
              <div style={{ padding: "6px 8px 4px", fontFamily: "monospace", fontSize: 7.5, letterSpacing: "0.15em", color: di === 0 ? "#00E5FF" : "rgba(255,255,255,0.3)", borderBottom: `1px solid ${di === 0 ? "rgba(0,229,255,0.25)" : "rgba(255,255,255,0.06)"}`, whiteSpace: "nowrap", background: di === 0 ? "rgba(0,229,255,0.04)" : "transparent" }}>
                {day.label}
              </div>
              <div style={{ display: "flex", flex: 1 }}>
                {day.hours.map((h, hi) => {
                  const c = wmo(h.code);
                  const pct = (h.temp - minTemp) / tempRange;
                  const tc = pct < 0.33 ? "#A78BFA" : pct < 0.66 ? "#00E5FF" : "#FCEE09";
                  return (
                    <div key={hi} style={{ width: 44, display: "flex", flexDirection: "column", alignItems: "center", justifyContent: "space-between", padding: "6px 3px", borderRight: "1px solid rgba(255,255,255,0.04)", gap: 3, transition: "background 0.15s" }}
                      onMouseEnter={e => e.currentTarget.style.background = "rgba(0,229,255,0.05)"}
                      onMouseLeave={e => e.currentTarget.style.background = "transparent"}>
                      <div style={{ fontFamily: "monospace", fontSize: 7.5, color: "rgba(255,255,255,0.3)" }}>{h.time.getHours().toString().padStart(2,"0")}:00</div>
                      <i className={`fa-solid ${c.icon}`} style={{ fontSize: 13, color: c.color, filter: `drop-shadow(0 0 4px ${c.color}60)` }} />
                      <div style={{ width: 3, height: 28, borderRadius: 2, background: "rgba(255,255,255,0.06)", position: "relative", overflow: "hidden" }}>
                        <div style={{ position: "absolute", bottom: 0, width: "100%", height: `${Math.round(pct * 100)}%`, background: tc, borderRadius: 2, boxShadow: `0 0 4px ${tc}80` }} />
                      </div>
                      <div style={{ fontFamily: "monospace", fontSize: 9.5, fontWeight: 700, color: tc }}>{h.temp}°</div>
                    </div>
                  );
                })}
              </div>
            </div>
          ))}
        </div>
      </div>
      <div style={{ display: "flex", alignItems: "center", gap: 10, justifyContent: "center", padding: "5px 0 6px", borderTop: "1px solid rgba(0,229,255,0.06)", flexShrink: 0 }}>
        {[["#A78BFA",`${minTemp}° min`],["#00E5FF","mid"],["#FCEE09",`${maxTemp}° max`]].map(([col,lbl]) => (
          <div key={lbl} style={{ display: "flex", alignItems: "center", gap: 4 }}>
            <div style={{ width: 6, height: 6, borderRadius: 2, background: col, boxShadow: `0 0 4px ${col}` }} />
            <span style={{ fontFamily: "monospace", fontSize: 7.5, color: "rgba(255,255,255,0.3)" }}>{lbl}</span>
          </div>
        ))}
        <span style={{ fontFamily: "monospace", fontSize: 7, color: "rgba(255,255,255,0.15)" }}>scroll →</span>
      </div>
    </motion.div>
  );
}

// ── Main widget ───────────────────────────────────────────────────────────────
export default function ChronoWidget({ item }) {
  // item.h drives adaptive density: h<=2 = compact, h>=3 = full
  const compact = item ? item.h <= 2 : false;

  const [now,          setNow]          = useState(new Date());
  const [is24h,        setIs24h]        = useState(() => { try { return localStorage.getItem(LS_FMT) !== "false"; } catch { return true; } });
  const [weather,      setWeather]      = useState(null);
  const [wxStatus,     setWxStatus]     = useState("loading");
  const [searching,    setSearching]    = useState(false);
  const [showForecast, setShowForecast] = useState(false);
  const [searchInput,  setSearchInput]  = useState("");
  const [searchErr,    setSearchErr]    = useState("");
  const [tick,         setTick]         = useState(0);
  const inputRef    = useRef(null);
  const intervalRef = useRef(null);

  useEffect(() => {
    const t = setInterval(() => { setNow(new Date()); setTick(n => n + 1); }, 1000);
    return () => clearInterval(t);
  }, []);

  const loadWeather = useCallback(async () => {
    setWxStatus("loading");
    const city = savedCity();
    if (city) { try { setWeather(await fetchByCity(city)); setWxStatus("ok"); return; } catch {} }
    if (navigator.geolocation) {
      await new Promise(resolve => {
        navigator.geolocation.getCurrentPosition(
          async pos => { try { setWeather(await fetchByCoords(pos.coords.latitude, pos.coords.longitude)); setWxStatus("ok"); } catch { setWxStatus("error"); } resolve(); },
          () => { fetchByCity(DEFAULT_CITY).then(d => { setWeather(d); setWxStatus("ok"); }).catch(() => setWxStatus("error")).finally(resolve); },
          { timeout: 6000 }
        );
      });
    } else {
      try { setWeather(await fetchByCity(DEFAULT_CITY)); setWxStatus("ok"); } catch { setWxStatus("error"); }
    }
  }, []);

  useEffect(() => {
    loadWeather();
    intervalRef.current = setInterval(loadWeather, 10 * 60 * 1000);
    return () => clearInterval(intervalRef.current);
  }, [loadWeather]);

  const handleSearch = async () => {
    if (!searchInput.trim()) return;
    setSearchErr(""); setWxStatus("loading");
    try {
      const result = await fetchByCity(searchInput.trim());
      localStorage.setItem(LS_CITY, searchInput.trim());
      setWeather(result); setWxStatus("ok");
      setSearching(false); setSearchInput("");
    } catch { setSearchErr("LOCATION NOT FOUND"); setWxStatus(weather ? "ok" : "error"); }
  };

  const clearCity = () => { localStorage.removeItem(LS_CITY); setSearching(false); setSearchInput(""); setSearchErr(""); loadWeather(); };
  const toggle24h = () => { setIs24h(v => { const n = !v; try { localStorage.setItem(LS_FMT, String(n)); } catch {} return n; }); };

  // Clock values
  const ss   = now.getSeconds();
  const mm   = now.getMinutes();
  const hRaw = now.getHours();
  const hh   = is24h ? hRaw.toString().padStart(2,"0") : (((hRaw%12)||12)).toString().padStart(2,"0");
  const min  = mm.toString().padStart(2,"0");
  const sec  = ss.toString().padStart(2,"0");
  const ampm = hRaw >= 12 ? "PM" : "AM";
  const dayStr  = now.toLocaleDateString("en",{weekday:"short"}).toUpperCase();
  const dateStr = now.toLocaleDateString("en",{month:"short",day:"numeric",year:"numeric"}).toUpperCase();
  const tzStr   = Intl.DateTimeFormat().resolvedOptions().timeZone.replace(/_/g," ");
  const minPct  = mm / 59;
  const cond    = weather ? wmo(weather.code) : null;

  // Adaptive sizing
  const clockFontSize = compact ? 30 : 36;
  const arcSize       = compact ? 52 : 64;
  const secFontSize   = compact ? 11 : 13;
  const timePad       = compact ? "7px 12px 5px" : "10px 12px 8px";

  return (
    <div className="w-full select-none" style={{ display: "flex", flexDirection: "column", position: "relative", overflow: "hidden" }}>
      {/* Scan-lines */}
      <div style={{ position: "absolute", inset: 0, pointerEvents: "none", zIndex: 0, background: "repeating-linear-gradient(0deg, transparent, transparent 3px, rgba(0,229,255,0.012) 3px, rgba(0,229,255,0.012) 4px)" }} />

      {/* Header */}
      <div style={{ display: "flex", alignItems: "center", justifyContent: "space-between", padding: "6px 10px 4px", borderBottom: "1px solid rgba(0,229,255,0.08)", zIndex: 1, flexShrink: 0 }}>
        <span style={{ fontFamily: "monospace", fontSize: 7.5, letterSpacing: "0.2em", color: "rgba(0,229,255,0.4)" }}>SYS.CHRONO // ATM.SENSOR</span>
        <div style={{ display: "flex", alignItems: "center", gap: 4 }}>
          <span style={{ fontFamily: "monospace", fontSize: 7, color: "rgba(0,229,255,0.3)" }}>v2.038</span>
          {/* Magenta status dot */}
          <span style={{ width: 5, height: 5, borderRadius: "50%", background: "#FF4FD8", boxShadow: "0 0 6px #FF4FD8", animation: "chrono-blink 2s ease-in-out infinite" }} />
        </div>
      </div>

      {/* TIME section */}
      <div style={{ padding: timePad, zIndex: 1, flexShrink: 0, position: "relative" }}>
        <Brackets color="#00E5FF" size={8} opacity={0.3} />
        <div onClick={toggle24h} title={is24h ? "Switch to 12h" : "Switch to 24h"}
          style={{ display: "flex", alignItems: "baseline", justifyContent: "center", gap: 2, cursor: "pointer", paddingTop: compact ? 2 : 4 }}>
          <span style={{ fontFamily: "monospace", fontWeight: 800, fontSize: clockFontSize, color: "#EFFFFF", textShadow: "0 0 20px rgba(0,229,255,0.6), 0 0 40px rgba(0,229,255,0.2)", letterSpacing: "-0.02em", lineHeight: 1 }}>
            {hh}:{min}
          </span>
          {!is24h && <span style={{ fontFamily: "monospace", fontSize: 10, color: "rgba(0,229,255,0.5)", marginLeft: 3, fontWeight: 700 }}>{ampm}</span>}
        </div>

        <div style={{ display: "flex", alignItems: "center", gap: compact ? 6 : 8, marginTop: compact ? 3 : 4, paddingLeft: 4 }}>
          <div style={{ position: "relative", width: arcSize, height: arcSize, flexShrink: 0, display: "flex", alignItems: "center", justifyContent: "center" }}>
            <SecondsArc seconds={ss} size={arcSize} />
            <span style={{ fontFamily: "monospace", fontSize: secFontSize, fontWeight: 700, color: "rgba(99,246,255,0.7)", zIndex: 1 }}>:{sec}</span>
          </div>
          <div style={{ flex: 1 }}>
            <div style={{ height: 2, background: "rgba(0,229,255,0.08)", borderRadius: 2, marginBottom: compact ? 4 : 6, overflow: "hidden" }}>
              <div style={{ height: "100%", width: `${minPct * 100}%`, background: "linear-gradient(90deg, #63F6FF, #00C8FF)", borderRadius: 2, boxShadow: "0 0 6px rgba(99,246,255,0.5)", transition: "width 1s linear" }} />
            </div>
            <div style={{ fontFamily: "monospace", fontSize: compact ? 8 : 8.5, color: "rgba(255,255,255,0.4)", marginBottom: 2 }}>{dayStr} · {dateStr}</div>
            <div style={{ fontFamily: "monospace", fontSize: 7.5, color: "rgba(0,229,255,0.3)" }}>{tzStr}</div>
          </div>
        </div>

        {/* Hex ticker — hidden in compact mode */}
        {!compact && (
          <div style={{ marginTop: 4, paddingLeft: 4 }}>
            <HexTicker seed={ss} />
          </div>
        )}
      </div>

      {/* Divider — label becomes white when user can see the weather */}
      <div style={{ margin: "0 8px", height: 1, background: "linear-gradient(90deg, transparent, rgba(0,229,255,0.2) 30%, rgba(0,229,255,0.2) 70%, transparent)", flexShrink: 0, zIndex: 1, position: "relative" }}>
        <span style={{ position: "absolute", left: "50%", top: "50%", transform: "translate(-50%,-50%)", background: "rgba(6,8,14,0.9)", padding: "0 6px", fontFamily: "monospace", fontSize: 7, letterSpacing: "0.2em", color: "#F2F7FF", whiteSpace: "nowrap" }}>
          ── ATM.SENSOR ──
        </span>
      </div>

      {/* WEATHER section */}
      <div style={{ flex: 1, position: "relative", overflow: "hidden" }}>
        <div style={{ padding: compact ? "6px 12px 8px" : "8px 12px 10px", zIndex: 1, position: "relative", display: "flex", flexDirection: "column", justifyContent: "space-between", height: "100%" }}>
          <Brackets color={cond?.color || "#00E5FF"} size={7} opacity={0.2} thickness={1} />

          <AnimatePresence mode="wait">
            {searching ? (
              <motion.div key="search" initial={{ opacity:0,y:8 }} animate={{ opacity:1,y:0 }} exit={{ opacity:0,y:-8 }}
                style={{ display:"flex", flexDirection:"column", gap: compact ? 4 : 6 }}>
                <div style={{ fontFamily:"monospace", fontSize:8, color:"rgba(0,229,255,0.5)", letterSpacing:"0.15em" }}>LOCATION.INPUT ▸</div>
                <input ref={inputRef} autoFocus type="text" value={searchInput}
                  onChange={e => setSearchInput(e.target.value)}
                  onKeyDown={e => { if(e.key==="Enter") handleSearch(); if(e.key==="Escape") setSearching(false); }}
                  placeholder="City name…"
                  style={{ width:"100%", height:26, borderRadius:6, padding:"0 8px", background:"rgba(0,229,255,0.05)", border:"1px solid rgba(0,229,255,0.3)", outline:"none", color:"#00E5FF", fontSize:10, fontFamily:"monospace", caretColor:"#00E5FF" }} />
                {searchErr && <div style={{ fontSize:8, color:"#FF003C", fontFamily:"monospace", letterSpacing:"0.1em" }}>⚠ {searchErr}</div>}
                <div style={{ display:"flex", gap:5 }}>
                  {[["EXECUTE",handleSearch,"#00E5FF","rgba(0,229,255,0.08)","rgba(0,229,255,0.25)"],
                    ["CANCEL",()=>setSearching(false),"rgba(255,255,255,0.4)","rgba(255,255,255,0.04)","rgba(255,255,255,0.1)"]
                  ].map(([lbl,fn,col,bg,bdr]) => (
                    <button key={lbl} onClick={fn} style={{ flex:1, height:22, borderRadius:5, background:bg, border:`1px solid ${bdr}`, color:col, fontSize:8.5, fontFamily:"monospace", letterSpacing:"0.1em", cursor:"pointer" }}>{lbl}</button>
                  ))}
                </div>
              </motion.div>

            ) : wxStatus === "ok" && weather ? (
              <motion.div key="data" initial={{ opacity:0,y:8 }} animate={{ opacity:1,y:0 }} exit={{ opacity:0,y:-8 }}
                style={{ display:"flex", flexDirection:"column", gap: compact ? 4 : 6 }}>

                {/* Condition row — tap for forecast */}
                <div onClick={() => weather?.hourly?.length && setShowForecast(true)}
                  title={weather?.hourly?.length ? "Tap for 5-day forecast" : undefined}
                  style={{ display:"flex", alignItems:"center", gap: compact ? 8 : 10, cursor: weather?.hourly?.length ? "pointer" : "default" }}>
                  <div style={{ position:"relative", flexShrink:0 }}>
                    <i className={`fa-solid ${cond.icon}`} style={{ fontSize: compact ? 22 : 28, color:cond.color, filter:`drop-shadow(0 0 10px ${cond.color}90)` }} />
                    <div style={{ position:"absolute", inset:-4, borderRadius:"50%", border:`1px solid ${cond.color}30`, animation:"chrono-spin 8s linear infinite", pointerEvents:"none" }} />
                  </div>
                  <div>
                    <div style={{ fontFamily:"monospace", fontWeight:800, fontSize: compact ? 22 : 26, color:"#fff", textShadow:`0 0 16px ${cond.color}60`, lineHeight:1 }}>
                      {weather.temp}°<span style={{ fontSize:11, color:"rgba(255,255,255,0.4)", fontWeight:400, marginLeft:2 }}>C</span>
                    </div>
                    <div style={{ fontFamily:"monospace", fontSize:9, color:"rgba(255,255,255,0.5)", marginTop:2 }}>
                      {cond.label.toUpperCase()}
                      {weather?.hourly?.length > 0 && <span style={{ marginLeft:5, color:"rgba(0,229,255,0.4)", fontSize:7.5 }}>▸ FORECAST</span>}
                    </div>
                  </div>
                </div>

                {/* Data grid */}
                <div style={{ display:"grid", gridTemplateColumns:"1fr 1fr 1fr", gap: compact ? "3px 4px" : "4px 6px", padding: compact ? "4px 6px" : "6px 8px", background:"rgba(0,229,255,0.03)", border:"1px solid rgba(0,229,255,0.08)", borderRadius:8 }}>
                  {[["FEELS",`${weather.feels}°C`,"#00E5FF"],["WIND",`${weather.wind}km/h`,"#39FF14"],["HUMID",weather.humidity!=null?`${weather.humidity}%`:"N/A","#A78BFA"]].map(([label,val,col]) => (
                    <div key={label} style={{ textAlign:"center" }}>
                      <div style={{ fontFamily:"monospace", fontSize:7, color:"rgba(255,255,255,0.25)", letterSpacing:"0.12em" }}>{label}</div>
                      <div style={{ fontFamily:"monospace", fontSize: compact ? 10 : 11, fontWeight:700, color:col, marginTop:1 }}>{val}</div>
                    </div>
                  ))}
                </div>

                {/* Location row */}
                <div style={{ display:"flex", alignItems:"center", justifyContent:"space-between" }}>
                  <button onClick={() => setSearching(true)} style={{ display:"flex", alignItems:"center", gap:4, background:"transparent", border:"none", cursor:"pointer", color:"rgba(255,255,255,0.4)", fontFamily:"monospace", fontSize:9, padding:0 }}
                    onMouseEnter={e => e.currentTarget.style.color="#00E5FF"}
                    onMouseLeave={e => e.currentTarget.style.color="rgba(255,255,255,0.4)"}>
                    <i className="fa-solid fa-location-crosshairs" style={{ fontSize:8 }} />
                    {weather.city.toUpperCase()}
                  </button>
                  <div style={{ display:"flex", gap:4, alignItems:"center" }}>
                    {savedCity() && (
                      <button onClick={clearCity} title="Use auto-location"
                        style={{ background:"transparent", border:"none", cursor:"pointer", fontFamily:"monospace", fontSize:8, color:"rgba(255,255,255,0.2)", padding:"2px 5px" }}
                        onMouseEnter={e => e.currentTarget.style.color="#00E5FF"}
                        onMouseLeave={e => e.currentTarget.style.color="rgba(255,255,255,0.2)"}>↺ AUTO</button>
                    )}
                    <div style={{ fontFamily:"monospace", fontSize:7, letterSpacing:"0.12em", color:"#39FF14", padding:"1px 5px", border:"1px solid rgba(57,255,20,0.25)", borderRadius:4, background:"rgba(57,255,20,0.07)" }}>NOMINAL</div>
                  </div>
                </div>
              </motion.div>

            ) : (
              <motion.div key="loading" initial={{ opacity:0 }} animate={{ opacity:1 }} exit={{ opacity:0 }}
                style={{ display:"flex", flexDirection:"column", alignItems:"center", justifyContent:"center", gap:8, flex:1 }}>
                <div style={{ fontFamily:"monospace", fontSize:8, color:"rgba(0,229,255,0.35)", letterSpacing:"0.2em" }}>
                  {wxStatus==="loading" ? "SCANNING ATMOSPHERE…" : "SENSOR OFFLINE"}
                </div>
                {wxStatus === "error" && (
                  <button onClick={() => setSearching(true)} style={{ fontFamily:"monospace", fontSize:8, color:"rgba(0,229,255,0.5)", background:"transparent", border:"1px solid rgba(0,229,255,0.2)", borderRadius:5, padding:"3px 8px", cursor:"pointer" }}>SET LOCATION</button>
                )}
              </motion.div>
            )}
          </AnimatePresence>
        </div>

        {/* Forecast overlay */}
        <AnimatePresence>
          {showForecast && <ForecastStrip hourly={weather?.hourly} onClose={() => setShowForecast(false)} />}
        </AnimatePresence>
      </div>

      <style>{`
        @keyframes chrono-blink { 0%,100%{opacity:1} 50%{opacity:0.2} }
        @keyframes chrono-spin  { from{transform:rotate(0deg)} to{transform:rotate(360deg)} }
      `}</style>
    </div>
  );
}
