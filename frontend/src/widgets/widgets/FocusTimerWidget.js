import React, { useEffect, useState, useRef, useCallback } from "react";
import { motion, AnimatePresence } from "framer-motion";

const PRESETS = [
  { label:"25m Focus",   work:25, break:5  },
  { label:"50m Deep",    work:50, break:10 },
  { label:"90m Flow",    work:90, break:20 },
  { label:"Custom",      work:25, break:5  },
];

const MODES = { work:"FOCUS", break:"BREAK", idle:"READY" };
const MODE_COLORS = { work:"#00F0FF", break:"#39FF14", idle:"rgba(255,255,255,0.3)" };

export default function FocusTimerWidget() {
  const [preset,   setPreset]   = useState(0);
  const [seconds,  setSeconds]  = useState(PRESETS[0].work * 60);
  const [total,    setTotal]    = useState(PRESETS[0].work * 60);
  const [running,  setRunning]  = useState(false);
  const [mode,     setMode]     = useState("idle");   // "idle" | "work" | "break"
  const [sessions, setSessions] = useState(0);
  const intervalRef = useRef(null);

  const stop = useCallback(() => {
    clearInterval(intervalRef.current);
    intervalRef.current = null;
    setRunning(false);
  }, []);

  useEffect(() => {
    if (running) {
      intervalRef.current = setInterval(() => {
        setSeconds(s => {
          if (s <= 1) {
            stop();
            setMode(m => {
              if (m === "work") {
                setSessions(n => n + 1);
                setSeconds(PRESETS[preset].break * 60);
                setTotal(PRESETS[preset].break * 60);
                return "break";
              } else {
                setSeconds(PRESETS[preset].work * 60);
                setTotal(PRESETS[preset].work * 60);
                return "idle";
              }
            });
            return 0;
          }
          return s - 1;
        });
      }, 1000);
    }
    return () => clearInterval(intervalRef.current);
  }, [running, preset, stop]);

  const handleStart = () => {
    if (mode === "idle") setMode("work");
    setRunning(true);
  };

  const handleReset = () => {
    stop();
    setMode("idle");
    setSeconds(PRESETS[preset].work * 60);
    setTotal(PRESETS[preset].work * 60);
  };

  const handlePreset = (i) => {
    stop();
    setPreset(i);
    setMode("idle");
    setSeconds(PRESETS[i].work * 60);
    setTotal(PRESETS[i].work * 60);
  };

  const mm = Math.floor(seconds / 60).toString().padStart(2, "0");
  const ss = (seconds % 60).toString().padStart(2, "0");
  const pct = total > 0 ? 1 - seconds / total : 0;
  const color = MODE_COLORS[mode];

  const r = 36, circ = 2 * Math.PI * r;
  const dash = circ * pct;

  return (
    <div className="w-full h-full flex flex-col items-center justify-between px-3 py-2 select-none gap-1.5">
      {/* Mode label */}
      <div className="flex items-center gap-1.5 w-full justify-between">
        <div className="font-mono text-[9px] uppercase tracking-[0.15em]" style={{ color }}>
          {MODES[mode]}
        </div>
        <div className="flex items-center gap-1">
          {Array.from({ length: Math.min(sessions, 4) }).map((_, i) => (
            <span key={i} className="w-1.5 h-1.5 rounded-full" style={{ background: "#00F0FF" }} />
          ))}
          {sessions > 4 && <span className="font-mono text-[8px]" style={{ color: "#00F0FF" }}>+{sessions-4}</span>}
        </div>
      </div>

      {/* Ring + time */}
      <div className="relative flex items-center justify-center flex-1">
        <svg width={90} height={90} viewBox="0 0 90 90" style={{ overflow: "visible" }}>
          <circle cx={45} cy={45} r={r} fill="none" stroke="rgba(255,255,255,0.05)" strokeWidth={6} />
          <motion.circle cx={45} cy={45} r={r} fill="none" stroke={color} strokeWidth={6}
            strokeLinecap="round"
            style={{
              transform: "rotate(-90deg)", transformOrigin: "center",
              filter: `drop-shadow(0 0 6px ${color}80)`,
              strokeDasharray: circ,
              strokeDashoffset: circ - dash,
              transition: "stroke-dashoffset 0.9s ease, stroke 0.4s",
            }} />
        </svg>
        <div className="absolute inset-0 flex flex-col items-center justify-center">
          <div className="font-mono font-black tabular-nums" style={{ fontSize: 22, color, lineHeight: 1 }}>
            {mm}:{ss}
          </div>
          <div className="font-mono text-[9px] mt-0.5" style={{ color: "rgba(255,255,255,0.3)" }}>
            {Math.round(pct * 100)}%
          </div>
        </div>
      </div>

      {/* Controls */}
      <div className="flex gap-2 w-full justify-center">
        <button onClick={handleReset}
          className="flex-1 py-1 rounded-lg font-mono text-[9px] uppercase tracking-wider transition-colors"
          style={{ background: "rgba(255,255,255,0.04)", border: "1px solid rgba(255,255,255,0.08)", color: "rgba(255,255,255,0.4)", cursor: "pointer" }}>
          <i className="fa-solid fa-rotate-left text-[9px]" />
        </button>
        <button onClick={running ? stop : handleStart}
          className="flex-[2] py-1 rounded-lg font-mono text-[9px] uppercase tracking-wider transition-all"
          style={{ background: running ? "rgba(255,0,60,0.12)" : `${color}18`, border: `1px solid ${running ? "#FF003C40" : color+"40"}`, color: running ? "#FF003C" : color, cursor: "pointer" }}>
          <i className={`fa-solid ${running ? "fa-pause" : "fa-play"} text-[9px] mr-1`} />
          {running ? "Pause" : "Start"}
        </button>
      </div>

      {/* Preset chips */}
      <div className="flex gap-1 w-full overflow-x-auto">
        {PRESETS.map((p, i) => (
          <button key={i} onClick={() => handlePreset(i)}
            className="flex-shrink-0 px-1.5 py-0.5 rounded-md font-mono text-[8px] transition-all"
            style={{ background: preset === i ? "rgba(0,240,255,0.12)" : "rgba(255,255,255,0.03)", border: preset === i ? "1px solid rgba(0,240,255,0.3)" : "1px solid rgba(255,255,255,0.06)", color: preset === i ? "#00F0FF" : "rgba(255,255,255,0.35)", cursor: "pointer" }}>
            {p.label}
          </button>
        ))}
      </div>
    </div>
  );
}
