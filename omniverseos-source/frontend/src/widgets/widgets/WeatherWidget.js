import React from "react";

// Placeholder — no external API key needed. Shows a static but polished UI.
const CONDITIONS = [
  { icon: "fa-sun", label: "Clear", temp: 22, color: "#FCEE09" },
  { icon: "fa-cloud-sun", label: "Partly Cloudy", temp: 18, color: "#94A3B8" },
  { icon: "fa-cloud-rain", label: "Light Rain", temp: 14, color: "#00F0FF" },
];

const cond = CONDITIONS[new Date().getDate() % CONDITIONS.length];

export default function WeatherWidget() {
  return (
    <div className="w-full h-full flex flex-col items-center justify-center gap-1.5 px-2 select-none">
      <i className={`fa-solid ${cond.icon} text-3xl`} style={{ color: cond.color, filter: `drop-shadow(0 0 8px ${cond.color}80)` }} />
      <div className="font-mono font-bold text-xl" style={{ color: "#fff" }}>
        {cond.temp}°C
      </div>
      <div className="text-[10px] font-mono" style={{ color: "rgba(255,255,255,0.35)" }}>
        {cond.label}
      </div>
      <div className="text-[9px] font-mono" style={{ color: "rgba(255,255,255,0.2)" }}>
        // weather placeholder
      </div>
    </div>
  );
}
