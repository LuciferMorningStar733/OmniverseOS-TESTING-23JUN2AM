import React, { useEffect, useState } from "react";
import { motion } from "framer-motion";

const CITIES = [
  { name: "New York",   tz: "America/New_York",     flag: "🇺🇸", color: "#00F0FF" },
  { name: "London",     tz: "Europe/London",         flag: "🇬🇧", color: "#FCEE09" },
  { name: "Tokyo",      tz: "Asia/Tokyo",            flag: "🇯🇵", color: "#FF003C" },
  { name: "Mumbai",     tz: "Asia/Kolkata",          flag: "🇮🇳", color: "#FF6B35" },
  { name: "Sydney",     tz: "Australia/Sydney",      flag: "🇦🇺", color: "#39FF14" },
  { name: "Dubai",      tz: "Asia/Dubai",            flag: "🇦🇪", color: "#C778DD" },
  { name: "Berlin",     tz: "Europe/Berlin",         flag: "🇩🇪", color: "#60A5FA" },
  { name: "São Paulo",  tz: "America/Sao_Paulo",     flag: "🇧🇷", color: "#F472B6" },
];

function getTime(tz) {
  try {
    return new Date().toLocaleTimeString("en", { timeZone: tz, hour12: false, hour: "2-digit", minute: "2-digit" });
  } catch { return "--:--"; }
}

function getOffset(tz) {
  try {
    const local = new Date();
    const target = new Date(local.toLocaleString("en-US", { timeZone: tz }));
    const diff = Math.round((target - local) / 3600000);
    return diff >= 0 ? `UTC+${diff}` : `UTC${diff}`;
  } catch { return ""; }
}

function isDaytime(tz) {
  try {
    const h = parseInt(new Date().toLocaleString("en-US", { timeZone: tz, hour: "2-digit", hour12: false }), 10);
    return h >= 6 && h < 20;
  } catch { return true; }
}

function MiniDial({ hour, color }) {
  const pct = ((hour % 12) / 12) * 100;
  const r = 10, circ = 2 * Math.PI * r;
  return (
    <svg width={28} height={28} viewBox="0 0 28 28" style={{ flexShrink: 0 }}>
      <circle cx={14} cy={14} r={r} fill="none" stroke="rgba(255,255,255,0.06)" strokeWidth={3} />
      <circle cx={14} cy={14} r={r} fill="none" stroke={color} strokeWidth={3}
        strokeLinecap="round"
        strokeDasharray={circ}
        strokeDashoffset={circ * (1 - pct / 100)}
        style={{ transform: "rotate(-90deg)", transformOrigin: "center", filter: `drop-shadow(0 0 3px ${color}80)` }} />
    </svg>
  );
}

export default function WorldClockWidget() {
  const [now, setNow] = useState(new Date());
  const [pinned, setPinned] = useState(["New York", "London", "Tokyo", "Mumbai"]);

  useEffect(() => {
    const t = setInterval(() => setNow(new Date()), 5000);
    return () => clearInterval(t);
  }, []);

  const shown = CITIES.filter(c => pinned.includes(c.name));
  const hour = (tz) => parseInt(new Date().toLocaleString("en-US", { timeZone: tz, hour: "2-digit", hour12: false }), 10);

  return (
    <div className="w-full h-full flex flex-col px-3 py-2 gap-1 select-none overflow-hidden">
      <div className="font-mono text-[9px] uppercase tracking-[0.15em] text-slate-600 flex-shrink-0 mb-0.5">
        // World Clock
      </div>
      <div className="flex flex-col gap-1.5 flex-1 overflow-y-auto scrollbar-none">
        {shown.map((city, i) => {
          const time = getTime(city.tz);
          const offset = getOffset(city.tz);
          const day = isDaytime(city.tz);
          const h = hour(city.tz);
          return (
            <motion.div key={city.name}
              initial={{ opacity: 0, x: -8 }} animate={{ opacity: 1, x: 0 }}
              transition={{ delay: i * 0.06, duration: 0.22, ease: "easeOut" }}
              className="flex items-center gap-2">
              <MiniDial hour={h} color={city.color} />
              <div className="flex-1 min-w-0">
                <div className="flex items-center gap-1.5">
                  <span style={{ fontSize: 11 }}>{city.flag}</span>
                  <span className="text-[11px] font-medium text-slate-200 truncate">{city.name}</span>
                </div>
                <div className="font-mono text-[9px]" style={{ color: "rgba(255,255,255,0.3)" }}>
                  {offset} · {day ? "☀️" : "🌙"}
                </div>
              </div>
              <div className="font-mono font-bold tabular-nums text-sm flex-shrink-0" style={{ color: city.color }}>
                {time}
              </div>
            </motion.div>
          );
        })}
      </div>
    </div>
  );
}
