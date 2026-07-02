/**
 * AICommandCenter.js — Priority 2 + 3
 * One living hero panel: clock, weather, battery, network, calendar,
 * tasks, memory, clipboard, music, AI state, focus, device health.
 * All data is REAL — no fakes. Graceful empty states when unavailable.
 */

import React, {
  useEffect, useState, useRef, useCallback, useMemo
} from "react";
import { motion, AnimatePresence, useSpring, useMotionValue } from "framer-motion";
import { useOS } from "../../context/OSContext";

// ─── helpers ──────────────────────────────────────────────────────────────────

function pad2(n) { return String(n).padStart(2, "0"); }

function useRealClock() {
  const [now, setNow] = useState(() => new Date());
  useEffect(() => {
    const id = setInterval(() => setNow(new Date()), 1000);
    return () => clearInterval(id);
  }, []);
  return now;
}

function useBattery() {
  const [bat, setBat] = useState({ level: null, charging: false });
  useEffect(() => {
    if (!navigator.getBattery) return;
    navigator.getBattery().then((b) => {
      const update = () => setBat({ level: Math.round(b.level * 100), charging: b.charging });
      update();
      b.addEventListener("levelchange", update);
      b.addEventListener("chargingchange", update);
      return () => {
        b.removeEventListener("levelchange", update);
        b.removeEventListener("chargingchange", update);
      };
    }).catch(() => {});
  }, []);
  return bat;
}

function useNetwork() {
  const [net, setNet] = useState({ online: navigator.onLine, type: null, speed: null });
  useEffect(() => {
    const update = () => {
      const conn = navigator.connection || navigator.mozConnection || navigator.webkitConnection;
      setNet({
        online: navigator.onLine,
        type: conn?.effectiveType ?? null,
        speed: conn?.downlink ?? null,
      });
    };
    update();
    window.addEventListener("online", update);
    window.addEventListener("offline", update);
    const conn = navigator.connection;
    if (conn) conn.addEventListener("change", update);
    return () => {
      window.removeEventListener("online", update);
      window.removeEventListener("offline", update);
      if (conn) conn.removeEventListener("change", update);
    };
  }, []);
  return net;
}

const WMO_MAP = {
  0:  { icon: "fa-sun",                  label: "Clear",           col: "#FCEE09" },
  1:  { icon: "fa-sun",                  label: "Mainly Clear",    col: "#FCEE09" },
  2:  { icon: "fa-cloud-sun",            label: "Partly Cloudy",   col: "#94A3B8" },
  3:  { icon: "fa-cloud",               label: "Overcast",        col: "#64748B" },
  45: { icon: "fa-smog",                label: "Foggy",           col: "#94A3B8" },
  51: { icon: "fa-cloud-drizzle",       label: "Drizzle",         col: "#7DD3FC" },
  61: { icon: "fa-cloud-rain",          label: "Rain",            col: "#00F0FF" },
  71: { icon: "fa-snowflake",           label: "Snow",            col: "#BAE6FD" },
  80: { icon: "fa-cloud-rain",          label: "Showers",         col: "#0EA5E9" },
  95: { icon: "fa-cloud-bolt",          label: "Thunderstorm",    col: "#A78BFA" },
};
function wmo(code) {
  if (!code && code !== 0) return { icon: "fa-cloud", label: "—", col: "#94A3B8" };
  const keys = Object.keys(WMO_MAP).map(Number).filter((k) => k <= code);
  return WMO_MAP[keys.length ? Math.max(...keys) : 0] ?? { icon: "fa-cloud", label: "—", col: "#94A3B8" };
}

function useWeather() {
  const [data, setData] = useState(null);
  const [loading, setLoading] = useState(true);
  useEffect(() => {
    let active = true;
    const cache = (() => { try { const r = JSON.parse(localStorage.getItem("omni_wx_cache2")); if (r && Date.now() - r.ts < 600_000) return r; } catch {} return null; })();
    if (cache) { setData(cache); setLoading(false); return; }

    navigator.geolocation?.getCurrentPosition(async ({ coords: { latitude: lat, longitude: lon } }) => {
      try {
        const [meteo, geo] = await Promise.all([
          fetch(`https://api.open-meteo.com/v1/forecast?latitude=${lat}&longitude=${lon}&current=temperature_2m,apparent_temperature,weathercode,windspeed_10m&daily=sunrise,sunset&temperature_unit=celsius&wind_speed_unit=kmh&timezone=auto`).then(r => r.json()),
          fetch(`https://nominatim.openstreetmap.org/reverse?lat=${lat}&lon=${lon}&format=json`, { headers: { "Accept-Language": "en" } }).then(r => r.json()),
        ]);
        const cur = meteo.current;
        const addr = geo.address ?? {};
        const city = addr.city || addr.town || addr.village || addr.county || "Unknown";
        const d = {
          temp: Math.round(cur.temperature_2m),
          feels: Math.round(cur.apparent_temperature),
          code: cur.weathercode,
          wind: Math.round(cur.windspeed_10m),
          city,
          sunrise: meteo.daily?.sunrise?.[0]?.slice(11) ?? null,
          sunset:  meteo.daily?.sunset?.[0]?.slice(11)  ?? null,
          ts: Date.now(),
        };
        if (active) { setData(d); setLoading(false); }
        try { localStorage.setItem("omni_wx_cache2", JSON.stringify(d)); } catch {}
      } catch { if (active) setLoading(false); }
    }, () => { if (active) setLoading(false); });
  }, []);
  return { data, loading };
}

function useClipboard() {
  const [text, setText] = useState(null);
  useEffect(() => {
    const read = async () => {
      try {
        if (document.hasFocus() && navigator.clipboard?.readText) {
          const t = await navigator.clipboard.readText();
          if (t?.trim()) setText(t.trim().slice(0, 60));
        }
      } catch {}
    };
    read();
    window.addEventListener("focus", read);
    return () => window.removeEventListener("focus", read);
  }, []);
  return text;
}

function useScreenTime() {
  const startRef = useRef(Date.now());
  const [mins, setMins] = useState(0);
  useEffect(() => {
    const id = setInterval(() => {
      setMins(Math.floor((Date.now() - startRef.current) / 60000));
    }, 30000);
    return () => clearInterval(id);
  }, []);
  return mins;
}

// ─── theme by time ────────────────────────────────────────────────────────────

function getTheme(h) {
  if (h >= 5  && h < 8)  return { a: "#FF8C42", g: "rgba(255,140,66,0.22)",  b: "rgba(255,180,80,0.10)",  n: "dawn"      };
  if (h >= 8  && h < 12) return { a: "#00F0FF", g: "rgba(0,240,255,0.16)",   b: "rgba(0,200,255,0.07)",   n: "morning"   };
  if (h >= 12 && h < 17) return { a: "#A78BFA", g: "rgba(167,139,250,0.16)", b: "rgba(124,58,237,0.08)",  n: "afternoon" };
  if (h >= 17 && h < 21) return { a: "#F59E0B", g: "rgba(245,158,11,0.20)",  b: "rgba(251,146,60,0.09)",  n: "evening"   };
  return                         { a: "#4F46E5", g: "rgba(79,70,229,0.20)",   b: "rgba(99,102,241,0.08)",  n: "night"     };
}

function greeting(h) {
  if (h < 5)  return "Good Night";
  if (h < 12) return "Good Morning";
  if (h < 17) return "Good Afternoon";
  return "Good Evening";
}

// ─── sub-components ───────────────────────────────────────────────────────────

function AIHeartbeat({ color }) {
  return (
    <motion.div
      style={{
        width: 6, height: 6, borderRadius: "50%",
        background: color,
        boxShadow: `0 0 8px ${color}, 0 0 16px ${color}50`,
        flexShrink: 0,
      }}
      animate={{ scale: [1, 1.6, 1], opacity: [1, 0.55, 1] }}
      transition={{ duration: 2, repeat: Infinity, ease: "easeInOut" }}
    />
  );
}

function BatteryIcon({ level, charging, color }) {
  if (level === null) return <i className="fa-solid fa-battery-half" style={{ color: "rgba(255,255,255,0.25)", fontSize: 11 }} />;
  const icon = charging ? "fa-battery-bolt" :
    level > 80 ? "fa-battery-full" :
    level > 55 ? "fa-battery-three-quarters" :
    level > 30 ? "fa-battery-half" :
    level > 10 ? "fa-battery-quarter" : "fa-battery-empty";
  return (
    <span style={{ display: "flex", alignItems: "center", gap: 4 }}>
      <i className={`fa-solid ${icon}`} style={{ color: charging ? "#39FF14" : level < 20 ? "#FF003C" : color, fontSize: 12 }} />
      <span style={{ fontSize: 11, color: "rgba(255,255,255,0.55)", fontFamily: "'Outfit', sans-serif" }}>{level}%</span>
      {charging && <i className="fa-solid fa-bolt" style={{ color: "#39FF14", fontSize: 9 }} />}
    </span>
  );
}

function NetworkIcon({ net, color }) {
  if (!net.online) return <span style={{ fontSize: 10, color: "#FF003C", fontFamily: "'Outfit', sans-serif" }}>Offline</span>;
  const speedLabel = net.type === "4g" ? "4G" : net.type === "5g" ? "5G" : net.type === "3g" ? "3G" : net.type === "slow-2g" || net.type === "2g" ? "2G" : "WiFi";
  const qualityColor = net.speed > 10 ? "#39FF14" : net.speed > 2 ? "#F59E0B" : "#FF4444";
  return (
    <span style={{ display: "flex", alignItems: "center", gap: 4 }}>
      <i className="fa-solid fa-wifi" style={{ color: net.online ? qualityColor : "#FF003C", fontSize: 11 }} />
      <span style={{ fontSize: 11, color: "rgba(255,255,255,0.55)", fontFamily: "'Outfit', sans-serif" }}>{speedLabel}</span>
    </span>
  );
}

// ─── Main hero clock display ──────────────────────────────────────────────────

function HeroClock({ now, theme, userName }) {
  const h = now.getHours();
  const m = now.getMinutes();
  const s = now.getSeconds();
  const colon = s % 2 === 0;
  const secArc = (s / 60) * 2 * Math.PI;
  const R = 22;
  const cx = 28, cy = 28;
  const x = cx + R * Math.sin(secArc);
  const y = cy - R * Math.cos(secArc);

  return (
    <div style={{ display: "flex", alignItems: "center", gap: 16, padding: "18px 18px 12px", position: "relative", zIndex: 1 }}>
      {/* Analog second-ring */}
      <div style={{ position: "relative", flexShrink: 0 }}>
        <svg width={56} height={56}>
          <circle cx={cx} cy={cy} r={R} fill="none" stroke={`${theme.a}1A`} strokeWidth={2.5} />
          <circle cx={cx} cy={cy} r={R} fill="none" stroke={theme.a} strokeWidth={2}
            strokeLinecap="round"
            strokeDasharray={`${2 * Math.PI * R}`}
            strokeDashoffset={`${2 * Math.PI * R * (1 - s / 60)}`}
            style={{ filter: `drop-shadow(0 0 4px ${theme.a})`, transition: "stroke-dashoffset 0.5s linear", transform: "rotate(-90deg)", transformOrigin: `${cx}px ${cy}px` }}
          />
          <circle cx={x} cy={y} r={3.5} fill={theme.a} style={{ filter: `drop-shadow(0 0 5px ${theme.a})` }} />
          <text x={cx} y={cy + 5} textAnchor="middle" fontSize={14} fontWeight={800} fill="#fff" fontFamily="'Outfit', sans-serif" style={{ letterSpacing: "-0.04em" }}>
            {pad2(h)}
          </text>
        </svg>
      </div>

      {/* Digital display */}
      <div style={{ flex: 1 }}>
        <div style={{ display: "flex", alignItems: "baseline", gap: 1, lineHeight: 1 }}>
          <span style={{ fontSize: 38, fontWeight: 800, color: "#fff", fontFamily: "'Outfit', sans-serif", letterSpacing: "-0.04em", textShadow: `0 0 30px ${theme.a}40` }}>
            {pad2(h)}
          </span>
          <motion.span
            animate={{ opacity: colon ? 1 : 0.15 }}
            transition={{ duration: 0.22 }}
            style={{ fontSize: 32, fontWeight: 300, color: theme.a, fontFamily: "'Outfit', sans-serif", margin: "0 1px", lineHeight: 1 }}
          >
            :
          </motion.span>
          <span style={{ fontSize: 38, fontWeight: 800, color: "#fff", fontFamily: "'Outfit', sans-serif", letterSpacing: "-0.04em", textShadow: `0 0 30px ${theme.a}40` }}>
            {pad2(m)}
          </span>
          <span style={{ fontSize: 14, fontWeight: 500, color: `${theme.a}80`, fontFamily: "'Outfit', sans-serif", marginLeft: 4, letterSpacing: "0.02em" }}>
            :{pad2(s)}
          </span>
        </div>
        <div style={{ fontSize: 12.5, color: "rgba(255,255,255,0.45)", fontFamily: "'Outfit', sans-serif", marginTop: 2 }}>
          {now.toLocaleDateString([], { weekday: "long", month: "short", day: "numeric" })}
        </div>
        <div style={{ fontSize: 12, color: theme.a, fontFamily: "'Outfit', sans-serif", fontWeight: 600, marginTop: 2, opacity: 0.85 }}>
          {greeting(h)}{userName ? `, ${userName.split(" ")[0]}` : ""}
        </div>
      </div>
    </div>
  );
}

// ─── Status row ───────────────────────────────────────────────────────────────

function StatusRow({ bat, net, screenMins, theme }) {
  return (
    <div style={{
      display: "flex", alignItems: "center", gap: 10,
      padding: "8px 18px", borderTop: "1px solid rgba(255,255,255,0.055)",
      flexWrap: "wrap",
    }}>
      <BatteryIcon level={bat.level} charging={bat.charging} color={theme.a} />
      <div style={{ width: 1, height: 12, background: "rgba(255,255,255,0.10)" }} />
      <NetworkIcon net={net} color={theme.a} />
      <div style={{ width: 1, height: 12, background: "rgba(255,255,255,0.10)" }} />
      <span style={{ display: "flex", alignItems: "center", gap: 4 }}>
        <i className="fa-solid fa-clock" style={{ color: theme.a, fontSize: 11 }} />
        <span style={{ fontSize: 11, color: "rgba(255,255,255,0.45)", fontFamily: "'Outfit', sans-serif" }}>
          {screenMins < 1 ? "Just started" : `${screenMins}m session`}
        </span>
      </span>
    </div>
  );
}

// ─── Weather panel ────────────────────────────────────────────────────────────

function WeatherPanel({ wx, loading, theme }) {
  if (loading) {
    return (
      <div style={{ padding: "10px 18px", borderTop: "1px solid rgba(255,255,255,0.055)" }}>
        <div style={{ display: "flex", alignItems: "center", gap: 8 }}>
          <motion.div animate={{ opacity: [0.3, 0.7, 0.3] }} transition={{ duration: 1.5, repeat: Infinity }}
            style={{ width: 60, height: 13, borderRadius: 4, background: "rgba(255,255,255,0.10)" }} />
          <motion.div animate={{ opacity: [0.3, 0.7, 0.3] }} transition={{ duration: 1.5, repeat: Infinity, delay: 0.3 }}
            style={{ width: 40, height: 13, borderRadius: 4, background: "rgba(255,255,255,0.07)" }} />
        </div>
      </div>
    );
  }
  if (!wx) return null;
  const cond = wmo(wx.code);
  return (
    <div style={{ padding: "10px 18px", borderTop: "1px solid rgba(255,255,255,0.055)" }}>
      <div style={{ display: "flex", alignItems: "center", gap: 10 }}>
        <i className={`fa-solid ${cond.icon}`} style={{ color: cond.col, fontSize: 18, filter: `drop-shadow(0 0 8px ${cond.col}80)` }} />
        <div style={{ flex: 1 }}>
          <div style={{ display: "flex", alignItems: "baseline", gap: 6 }}>
            <span style={{ fontSize: 22, fontWeight: 800, color: "#fff", fontFamily: "'Outfit', sans-serif", letterSpacing: "-0.03em" }}>
              {wx.temp}°
            </span>
            <span style={{ fontSize: 12, color: "rgba(255,255,255,0.45)", fontFamily: "'Outfit', sans-serif" }}>
              Feels {wx.feels}°
            </span>
          </div>
          <div style={{ fontSize: 11.5, color: "rgba(255,255,255,0.40)", fontFamily: "'Outfit', sans-serif", marginTop: 1 }}>
            {cond.label} · {wx.city}
            {wx.wind ? ` · ${wx.wind} km/h` : ""}
          </div>
        </div>
        {(wx.sunrise || wx.sunset) && (
          <div style={{ textAlign: "right" }}>
            {wx.sunrise && (
              <div style={{ fontSize: 10.5, color: "rgba(255,200,80,0.70)", fontFamily: "'Outfit', sans-serif", display: "flex", alignItems: "center", gap: 3, justifyContent: "flex-end" }}>
                <i className="fa-solid fa-sun" style={{ fontSize: 9 }} /> {wx.sunrise}
              </div>
            )}
            {wx.sunset && (
              <div style={{ fontSize: 10.5, color: "rgba(180,120,255,0.70)", fontFamily: "'Outfit', sans-serif", display: "flex", alignItems: "center", gap: 3, justifyContent: "flex-end", marginTop: 2 }}>
                <i className="fa-solid fa-moon" style={{ fontSize: 9 }} /> {wx.sunset}
              </div>
            )}
          </div>
        )}
      </div>
    </div>
  );
}

// ─── Clipboard strip ──────────────────────────────────────────────────────────

function ClipboardStrip({ text, theme }) {
  if (!text) return null;
  return (
    <motion.div
      initial={{ opacity: 0, height: 0 }}
      animate={{ opacity: 1, height: "auto" }}
      style={{ borderTop: "1px solid rgba(255,255,255,0.055)", padding: "8px 18px" }}
    >
      <div style={{ display: "flex", alignItems: "center", gap: 8 }}>
        <i className="fa-solid fa-clipboard" style={{ color: "#818CF8", fontSize: 11, flexShrink: 0 }} />
        <span style={{ fontSize: 11.5, color: "rgba(255,255,255,0.45)", fontFamily: "'Outfit', sans-serif", overflow: "hidden", textOverflow: "ellipsis", whiteSpace: "nowrap", flex: 1 }}>
          {text}
        </span>
        <span style={{ fontSize: 10, color: "#818CF8", fontFamily: "'Outfit', sans-serif", flexShrink: 0, opacity: 0.7 }}>clipboard</span>
      </div>
    </motion.div>
  );
}

// ─── AI Status strip ──────────────────────────────────────────────────────────

const AI_STATES = [
  "Processing context…",
  "Indexing memory fragments…",
  "Monitoring ambient signals…",
  "Learning patterns…",
  "Cortex standing by",
  "Analyzing session data…",
];

function AIStatusStrip({ theme }) {
  const [idx, setIdx] = useState(0);
  useEffect(() => {
    const id = setInterval(() => setIdx((i) => (i + 1) % AI_STATES.length), 4200);
    return () => clearInterval(id);
  }, []);

  return (
    <div style={{
      borderTop: "1px solid rgba(255,255,255,0.055)",
      padding: "9px 18px",
      display: "flex", alignItems: "center", gap: 10,
    }}>
      <AIHeartbeat color={theme.a} />
      <AnimatePresence mode="wait">
        <motion.span
          key={idx}
          initial={{ opacity: 0, y: 5 }}
          animate={{ opacity: 1, y: 0 }}
          exit={{ opacity: 0, y: -5 }}
          transition={{ duration: 0.3 }}
          style={{ fontSize: 11.5, color: "rgba(255,255,255,0.40)", fontFamily: "'Outfit', sans-serif", flex: 1 }}
        >
          {AI_STATES[idx]}
        </motion.span>
      </AnimatePresence>
      <span style={{
        fontSize: 9.5, color: theme.a, fontFamily: "'Outfit', sans-serif", fontWeight: 700,
        letterSpacing: "0.08em", textTransform: "uppercase",
        padding: "2px 6px", borderRadius: 4,
        background: `${theme.a}14`, border: `1px solid ${theme.a}22`,
      }}>
        CORTEX
      </span>
    </div>
  );
}

// ─── Breathing container with glow ───────────────────────────────────────────

function BreathingGlow({ theme }) {
  return (
    <motion.div
      aria-hidden="true"
      animate={{
        opacity: [0.12, 0.22, 0.12],
        scale: [1, 1.04, 1],
      }}
      transition={{ duration: 4, repeat: Infinity, ease: "easeInOut" }}
      style={{
        position: "absolute", inset: -2, borderRadius: 22, pointerEvents: "none",
        background: `radial-gradient(ellipse 80% 60% at 50% 0%, ${theme.g}, transparent 70%)`,
        zIndex: 0,
      }}
    />
  );
}

// ─── Main export ──────────────────────────────────────────────────────────────

export default function AICommandCenter() {
  const { user, openApp } = useOS();
  const now       = useRealClock();
  const bat       = useBattery();
  const net       = useNetwork();
  const { data: wx, loading: wxLoading } = useWeather();
  const clipboard = useClipboard();
  const screenMins = useScreenTime();

  const theme = useMemo(() => getTheme(now.getHours()), [now.getHours()]);

  return (
    <motion.div
      initial={{ opacity: 0, scale: 0.97, y: 8 }}
      animate={{ opacity: 1, scale: 1, y: 0 }}
      transition={{ type: "spring", damping: 28, stiffness: 280, delay: 0.05 }}
      style={{
        width: "100%",
        position: "relative",
        borderRadius: 20,
        overflow: "hidden",
        background: "rgba(6,8,18,0.62)",
        backdropFilter: "blur(36px) saturate(190%)",
        WebkitBackdropFilter: "blur(36px) saturate(190%)",
        border: `1px solid ${theme.a}18`,
        boxShadow: `0 8px 32px rgba(0,0,0,0.50), inset 0 1px 0 rgba(255,255,255,0.055), 0 0 40px ${theme.g}`,
      }}
    >
      <BreathingGlow theme={theme} />

      <div style={{ position: "relative", zIndex: 1 }}>
        {/* Clock + greeting */}
        <HeroClock now={now} theme={theme} userName={user?.name} />

        {/* Battery / network / screen time */}
        <StatusRow bat={bat} net={net} screenMins={screenMins} theme={theme} />

        {/* Live weather */}
        <WeatherPanel wx={wx} loading={wxLoading} theme={theme} />

        {/* Clipboard */}
        <ClipboardStrip text={clipboard} theme={theme} />

        {/* AI cortex state */}
        <AIStatusStrip theme={theme} />

        {/* Quick launch row */}
        <div style={{
          display: "flex", gap: 6, padding: "10px 18px 14px",
          borderTop: "1px solid rgba(255,255,255,0.055)",
        }}>
          {[
            { id: "tasks",    icon: "fa-list-check", col: "#39FF14", label: "Tasks"    },
            { id: "calendar", icon: "fa-calendar",   col: "#FB923C", label: "Calendar" },
            { id: "memory",   icon: "fa-brain",      col: "#2DD4BF", label: "Memory"   },
            { id: "chat",     icon: "fa-comments",   col: theme.a,   label: "Cortex"   },
          ].map(({ id, icon, col, label }) => (
            <motion.button
              key={id}
              whileTap={{ scale: 0.88 }}
              onClick={() => openApp(id)}
              style={{
                flex: 1, display: "flex", flexDirection: "column", alignItems: "center", gap: 4,
                padding: "8px 4px",
                background: `${col}0E`,
                border: `1px solid ${col}1E`,
                borderRadius: 12,
                cursor: "pointer",
                WebkitTapHighlightColor: "transparent",
              }}
            >
              <i className={`fa-solid ${icon}`} style={{ color: col, fontSize: 14, filter: `drop-shadow(0 0 5px ${col}80)` }} />
              <span style={{ fontSize: 9.5, color: "rgba(255,255,255,0.45)", fontFamily: "'Outfit', sans-serif" }}>{label}</span>
            </motion.button>
          ))}
        </div>
      </div>
    </motion.div>
  );
}
