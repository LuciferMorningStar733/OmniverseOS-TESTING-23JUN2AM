import React, { useState, useRef, useCallback, useEffect, useMemo } from "react";
import { motion, AnimatePresence } from "framer-motion";
import MobileWidgetView from "../widgets/MobileWidgetView";
import MobileAppDrawer from "./MobileAppDrawer";

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

// ── Time-of-day adaptive theme ─────────────────────────────────────────────────

function getTheme(hour) {
  if (hour >= 5  && hour < 8)  return { accent: "#FF8C42", glow: "rgba(255,140,66,0.22)", secondary: "rgba(255,180,80,0.10)", name: "dawn"      };
  if (hour >= 8  && hour < 12) return { accent: "#00F0FF", glow: "rgba(0,240,255,0.16)",  secondary: "rgba(0,200,255,0.07)",  name: "morning"   };
  if (hour >= 12 && hour < 17) return { accent: "#A78BFA", glow: "rgba(167,139,250,0.16)",secondary: "rgba(124,58,237,0.08)", name: "afternoon" };
  if (hour >= 17 && hour < 21) return { accent: "#F59E0B", glow: "rgba(245,158,11,0.20)", secondary: "rgba(251,146,60,0.09)", name: "evening"   };
  return                               { accent: "#4F46E5", glow: "rgba(79,70,229,0.20)",  secondary: "rgba(99,102,241,0.08)", name: "night"     };
}

// ── Text helpers ───────────────────────────────────────────────────────────────

function getGreeting(hour) {
  if (hour < 5)  return "Good Night";
  if (hour < 12) return "Good Morning";
  if (hour < 17) return "Good Afternoon";
  return "Good Evening";
}

function getAIBriefText(hour) {
  if (hour < 6)  return "Night analysis complete. Cortex catalogued 14 memory fragments and prepared your morning context.";
  if (hour < 9)  return "Morning brief ready. 2 tasks due today, calendar clear before 10 AM. Your focus window is open.";
  if (hour < 12) return "3 events before noon. High-focus period — Cortex suggests deep work now while your energy peaks.";
  if (hour < 15) return "Post-lunch check-in. 2 research threads identified from your morning sessions. On track.";
  if (hour < 18) return "Energy transition zone. Creative tasks before 6 PM for peak output — Cortex recommends a brief break first.";
  return "Evening summary ready. You're ahead on 3 priorities. Tomorrow's brief is being prepared.";
}

function getCortexSuggestion(hour) {
  if (hour < 8)  return "Review your overnight memory captures";
  if (hour < 12) return "Continue building OmniverseOS";
  if (hour < 15) return "Work through your afternoon tasks";
  if (hour < 18) return "Wrap up open threads before evening";
  return "Review today's summary";
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
  @keyframes scanDrift {
    0%   { transform: translate3d(0, -8px, 0); opacity: 0; }
    8%   { opacity: 1; }
    92%  { opacity: 1; }
    100% { transform: translate3d(0, 8px, 0); opacity: 0; }
  }
`;

function AmbientBackground({ theme }) {
  return (
    <>
      <style>{AURORA_CSS}</style>
      {/* Primary aurora blob */}
      <div aria-hidden="true" style={{
        position: "absolute", inset: -60, pointerEvents: "none", zIndex: 0,
        animation: "auroraDrift1 24s ease-in-out infinite",
        background: `radial-gradient(ellipse 58% 38% at 78% 18%, ${theme.glow} 0%, transparent 65%)`,
        willChange: "transform",
      }} />
      {/* Secondary aurora blob */}
      <div aria-hidden="true" style={{
        position: "absolute", inset: -60, pointerEvents: "none", zIndex: 0,
        animation: "auroraDrift2 32s ease-in-out infinite",
        background: `radial-gradient(ellipse 45% 55% at 12% 82%, ${theme.secondary} 0%, transparent 60%)`,
        willChange: "transform",
      }} />
      {/* Subtle neural grid — very faint, 3038 vibe */}
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

// ── Premium clock ─────────────────────────────────────────────────────────────

function PremiumClock({ now, theme, userName }) {
  const hour   = now.getHours();
  const minute = now.getMinutes();
  const second = now.getSeconds();

  const hStr = String(hour  ).padStart(2, "0");
  const mStr = String(minute).padStart(2, "0");
  const colonOn = second % 2 === 0;
  const secPct  = second / 60;

  const dateStr   = now.toLocaleDateString([], { weekday: "long", month: "long", day: "numeric" });
  const greeting  = getGreeting(hour);

  return (
    <motion.div
      initial={{ opacity: 0, y: 14 }}
      animate={{ opacity: 1, y: 0 }}
      transition={{ delay: 0.08, type: "spring", damping: 30, stiffness: 280 }}
      style={{ padding: "22px 20px 14px", position: "relative", zIndex: 1 }}
    >
      {/* Split clock */}
      <div style={{ display: "flex", alignItems: "flex-end", userSelect: "none" }}>
        <span style={{
          fontSize: "clamp(56px, 15vw, 76px)",
          fontFamily: "'Outfit', sans-serif",
          fontWeight: 100,
          color: "#ffffff",
          letterSpacing: "-0.04em",
          lineHeight: 1,
          textShadow: `0 0 80px ${theme.glow}, 0 2px 22px rgba(0,0,0,0.65)`,
        }}>
          {hStr}
        </span>

        {/* Pulsing colon */}
        <motion.span
          animate={{ opacity: colonOn ? 1 : 0.10 }}
          transition={{ duration: 0.10 }}
          style={{
            fontSize: "clamp(46px, 12vw, 62px)",
            fontFamily: "'Outfit', sans-serif",
            fontWeight: 100,
            color: theme.accent,
            letterSpacing: "-0.04em",
            lineHeight: 1,
            paddingBottom: 3,
            filter: colonOn ? `drop-shadow(0 0 14px ${theme.accent})` : "none",
          }}
        >
          :
        </motion.span>

        <span style={{
          fontSize: "clamp(56px, 15vw, 76px)",
          fontFamily: "'Outfit', sans-serif",
          fontWeight: 100,
          color: "#ffffff",
          letterSpacing: "-0.04em",
          lineHeight: 1,
          textShadow: `0 0 80px ${theme.glow}, 0 2px 22px rgba(0,0,0,0.65)`,
        }}>
          {mStr}
        </span>
      </div>

      {/* Seconds progress bar */}
      <div style={{
        height: 2, borderRadius: 2,
        background: "rgba(255,255,255,0.07)",
        marginTop: 9, overflow: "hidden",
      }}>
        <motion.div
          style={{
            height: "100%", borderRadius: 2,
            background: `linear-gradient(90deg, ${theme.accent}70, ${theme.accent})`,
            boxShadow: `0 0 10px ${theme.accent}90`,
          }}
          animate={{ width: `${secPct * 100}%` }}
          transition={{ duration: 0.7, ease: "linear" }}
        />
      </div>

      {/* Date row + AI status pill */}
      <div style={{ display: "flex", alignItems: "center", justifyContent: "space-between", marginTop: 9, gap: 8 }}>
        <span style={{
          fontSize: 13, fontFamily: "'Outfit', sans-serif", fontWeight: 400,
          color: "rgba(255,255,255,0.38)", userSelect: "none", letterSpacing: "0.01em",
        }}>
          {dateStr}
        </span>

        {/* AI status pill */}
        <div style={{
          display: "flex", alignItems: "center", gap: 5,
          padding: "4px 10px", borderRadius: 20, flexShrink: 0,
          background: "rgba(6,8,20,0.65)",
          border: `1px solid ${theme.accent}28`,
          backdropFilter: "blur(16px)", WebkitBackdropFilter: "blur(16px)",
        }}>
          <motion.div
            animate={{ opacity: [1, 0.25, 1], scale: [1, 1.4, 1] }}
            transition={{ repeat: Infinity, duration: 2.6, ease: "easeInOut" }}
            style={{ width: 5, height: 5, borderRadius: "50%", background: theme.accent, boxShadow: `0 0 8px ${theme.accent}` }}
          />
          <span style={{ fontSize: 9, color: theme.accent, fontFamily: "'Outfit', sans-serif", fontWeight: 700, letterSpacing: "0.07em", userSelect: "none" }}>
            CORTEX ACTIVE
          </span>
        </div>
      </div>

      {/* Greeting */}
      <motion.div
        initial={{ opacity: 0 }}
        animate={{ opacity: 1 }}
        transition={{ delay: 0.30 }}
        style={{
          fontSize: 22, fontFamily: "'Outfit', sans-serif", fontWeight: 600,
          color: "rgba(255,255,255,0.90)", marginTop: 18, letterSpacing: "-0.02em",
          userSelect: "none", textShadow: "0 2px 18px rgba(0,0,0,0.55)",
        }}
      >
        {greeting}{userName ? `, ${userName}` : ""}
      </motion.div>
    </motion.div>
  );
}

// ── Cortex search bar ─────────────────────────────────────────────────────────

function CortexSearchBar({ onTap, theme }) {
  const [active, setActive] = useState(false);

  return (
    <motion.div
      initial={{ opacity: 0, y: -8 }}
      animate={{ opacity: 1, y: 0 }}
      transition={{ delay: 0.04, duration: 0.32, ease: "easeOut" }}
      style={{ padding: "12px 16px 0", flexShrink: 0, position: "relative", zIndex: 1 }}
    >
      <motion.button
        onPointerDown={() => setActive(true)}
        onPointerUp={() => setActive(false)}
        onPointerLeave={() => setActive(false)}
        onTouchEnd={onTap}
        onClick={onTap}
        aria-label="Search Cortex"
        whileTap={{ scale: 0.975 }}
        animate={{
          boxShadow: active
            ? `0 0 0 2px ${theme.accent}50, 0 0 28px ${theme.glow}, 0 4px 16px rgba(0,0,0,0.45)`
            : `0 0 0 1px rgba(255,255,255,0.05), 0 4px 16px rgba(0,0,0,0.35)`,
        }}
        transition={{ duration: 0.18 }}
        style={{
          width: "100%",
          display: "flex", alignItems: "center", gap: 10,
          padding: "13px 16px", borderRadius: 18,
          background: "rgba(8, 10, 24, 0.70)",
          backdropFilter: "blur(40px) saturate(210%)",
          WebkitBackdropFilter: "blur(40px) saturate(210%)",
          border: `1px solid ${active ? `${theme.accent}40` : "rgba(255,255,255,0.10)"}`,
          cursor: "pointer",
          WebkitTapHighlightColor: "transparent",
          touchAction: "manipulation",
          transition: "border-color 0.18s ease",
        }}
      >
        <div style={{
          width: 28, height: 28, borderRadius: 9, flexShrink: 0,
          background: `linear-gradient(135deg, ${theme.accent}28, ${theme.accent}0C)`,
          border: `1px solid ${theme.accent}35`,
          display: "flex", alignItems: "center", justifyContent: "center",
        }}>
          <i className="fa-solid fa-microphone" style={{ color: theme.accent, fontSize: 12, filter: `drop-shadow(0 0 5px ${theme.accent}90)` }} />
        </div>

        <span style={{
          flex: 1, fontSize: 14.5, fontFamily: "'Outfit', sans-serif",
          fontWeight: 400, color: "rgba(255,255,255,0.30)",
          textAlign: "left", userSelect: "none", letterSpacing: "0.005em",
        }}>
          Ask Cortex anything…
        </span>

        <div style={{
          padding: "4px 11px", borderRadius: 20,
          background: `${theme.accent}16`, border: `1px solid ${theme.accent}28`, flexShrink: 0,
        }}>
          <span style={{ fontSize: 9, color: theme.accent, fontFamily: "'Outfit', sans-serif", fontWeight: 700, letterSpacing: "0.10em" }}>AI</span>
        </div>
      </motion.button>
    </motion.div>
  );
}

// ── Cortex Brief card ─────────────────────────────────────────────────────────

const CHECK_ITEMS = ["Memory synced", "Weather updated", "Clipboard ready", "No urgent alerts"];

function CortexBriefCard({ now, userName, theme }) {
  const hour = now.getHours();
  const [checked, setChecked] = useState([false, false, false, false]);

  // Stagger in the checkmarks
  useEffect(() => {
    const timers = [420, 840, 1260, 1680].map((ms, i) =>
      setTimeout(() => setChecked((c) => { const n = [...c]; n[i] = true; return n; }), ms)
    );
    return () => timers.forEach(clearTimeout);
  }, []);

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
                {userName ? `Good to see you, ${userName}` : "AI Daily Summary"}
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

          {/* Brief text */}
          <p style={{
            fontSize: 13.5, fontFamily: "'Outfit', sans-serif", fontWeight: 400,
            color: "rgba(255,255,255,0.65)", lineHeight: 1.58, margin: "0 0 14px", userSelect: "none",
          }}>
            {getAIBriefText(hour)}
          </p>

          {/* Divider */}
          <div style={{ height: 1, background: "rgba(255,255,255,0.06)", margin: "0 -2px 13px" }} />

          {/* Checklist */}
          <div style={{ marginBottom: 13 }}>
            <div style={{ fontSize: 10, color: "rgba(255,255,255,0.26)", fontFamily: "'Outfit', sans-serif", fontWeight: 700, letterSpacing: "0.08em", textTransform: "uppercase", marginBottom: 9 }}>
              Cortex has already:
            </div>
            <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr", gap: "7px 10px" }}>
              {CHECK_ITEMS.map((item, i) => (
                <div key={item} style={{ display: "flex", alignItems: "center", gap: 7 }}>
                  <motion.div
                    animate={{
                      background: checked[i] ? theme.accent : "rgba(255,255,255,0.10)",
                      borderColor: checked[i] ? theme.accent : "rgba(255,255,255,0.14)",
                      boxShadow: checked[i] ? `0 0 10px ${theme.glow}` : "none",
                    }}
                    transition={{ duration: 0.22 }}
                    style={{
                      width: 17, height: 17, borderRadius: 5, flexShrink: 0,
                      display: "flex", alignItems: "center", justifyContent: "center",
                      border: "1px solid",
                    }}
                  >
                    <AnimatePresence>
                      {checked[i] && (
                        <motion.i
                          key="check"
                          initial={{ scale: 0, rotate: -20 }}
                          animate={{ scale: 1, rotate: 0 }}
                          exit={{ scale: 0 }}
                          transition={{ type: "spring", damping: 14, stiffness: 480 }}
                          className="fa-solid fa-check"
                          style={{ fontSize: 8, color: "rgba(0,0,0,0.88)" }}
                        />
                      )}
                    </AnimatePresence>
                  </motion.div>
                  <span style={{
                    fontSize: 12, fontFamily: "'Outfit', sans-serif", lineHeight: 1.3,
                    color: checked[i] ? "rgba(255,255,255,0.80)" : "rgba(255,255,255,0.25)",
                    transition: "color 0.22s ease",
                  }}>
                    {item}
                  </span>
                </div>
              ))}
            </div>
          </div>

          {/* Suggested action */}
          <motion.div
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            transition={{ delay: 2.0 }}
            style={{
              display: "flex", alignItems: "center", gap: 10,
              padding: "10px 12px", borderRadius: 13,
              background: `${theme.accent}0E`,
              border: `1px solid ${theme.accent}1E`,
            }}
          >
            <i className="fa-solid fa-lightbulb" style={{ color: theme.accent, fontSize: 12, filter: `drop-shadow(0 0 5px ${theme.accent}80)`, flexShrink: 0 }} />
            <div style={{ flex: 1, minWidth: 0 }}>
              <div style={{ fontSize: 9.5, color: theme.accent, fontFamily: "'Outfit', sans-serif", fontWeight: 700, letterSpacing: "0.08em", textTransform: "uppercase", opacity: 0.75 }}>
                Suggested
              </div>
              <div style={{ fontSize: 12.5, color: "rgba(255,255,255,0.78)", fontFamily: "'Outfit', sans-serif", marginTop: 1, overflow: "hidden", textOverflow: "ellipsis", whiteSpace: "nowrap" }}>
                {getCortexSuggestion(hour)}
              </div>
            </div>
            <i className="fa-solid fa-chevron-right" style={{ color: "rgba(255,255,255,0.18)", fontSize: 10, flexShrink: 0 }} />
          </motion.div>
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

// ── Quick stats row ───────────────────────────────────────────────────────────

const STAT_TILES = [
  { icon: "fa-calendar",   color: "#FB923C", label: "Schedule", value: "3",  unit: "events", progress: 3,  max: 8  },
  { icon: "fa-list-check", color: "#39FF14", label: "Tasks",    value: "2",  unit: "due",    progress: 2,  max: 7  },
  { icon: "fa-brain",      color: "#2DD4BF", label: "Memory",   value: "14", unit: "items",  progress: 14, max: 20 },
  { icon: "fa-bell",       color: "#F59E0B", label: "Alerts",   value: "1",  unit: "new",    progress: 1,  max: 5  },
];

function StatTile({ tile, delay }) {
  const [pressed, setPressed] = useState(false);
  return (
    <motion.button
      initial={{ opacity: 0, scale: 0.78 }}
      animate={{ opacity: 1, scale: pressed ? 0.92 : 1 }}
      transition={{ delay, type: "spring", damping: 22, stiffness: 360 }}
      onPointerDown={() => setPressed(true)}
      onPointerUp={()   => setPressed(false)}
      onPointerLeave={()=> setPressed(false)}
      aria-label={`${tile.label}: ${tile.value} ${tile.unit}`}
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
        cursor: "pointer",
        WebkitTapHighlightColor: "transparent",
        touchAction: "manipulation",
        transition: "box-shadow 0.14s ease, background 0.14s ease",
      }}
    >
      {/* Ring + icon overlay */}
      <div style={{ position: "relative" }}>
        <ProgressRing value={tile.progress} max={tile.max} color={tile.color} size={42} />
        <div style={{ position: "absolute", inset: 0, display: "flex", alignItems: "center", justifyContent: "center" }}>
          <i className={`fa-solid ${tile.icon}`} style={{ color: tile.color, fontSize: 13, filter: `drop-shadow(0 0 5px ${tile.color}90)` }} />
        </div>
      </div>

      <div style={{ fontSize: 14, fontWeight: 700, color: "#fff", fontFamily: "'Outfit', sans-serif", letterSpacing: "-0.02em", userSelect: "none", lineHeight: 1 }}>
        {tile.value}
        <span style={{ fontSize: 8.5, fontWeight: 500, color: "rgba(255,255,255,0.38)", marginLeft: 2 }}>{tile.unit}</span>
      </div>
      <div style={{ fontSize: 9.5, color: "rgba(255,255,255,0.28)", fontFamily: "'Outfit', sans-serif", letterSpacing: "0.01em", userSelect: "none" }}>
        {tile.label}
      </div>
    </motion.button>
  );
}

function QuickStatsRow() {
  return (
    <motion.div
      initial={{ opacity: 0, y: 12 }}
      animate={{ opacity: 1, y: 0 }}
      transition={{ delay: 0.22, type: "spring", damping: 28, stiffness: 260 }}
      style={{ display: "grid", gridTemplateColumns: "repeat(4, 1fr)", gap: 8, margin: "0 16px 12px", position: "relative", zIndex: 1 }}
    >
      {STAT_TILES.map((tile, i) => (
        <StatTile key={tile.label} tile={tile} delay={0.25 + i * 0.06} />
      ))}
    </motion.div>
  );
}

// ── Calendar card ─────────────────────────────────────────────────────────────

const CAL_EVENTS = [
  { time: "10:00 AM", title: "Team Sync",      color: "#00F0FF" },
  { time: "2:30 PM",  title: "Project Review", color: "#FB923C" },
  { time: "5:00 PM",  title: "Focus Session",  color: "#A855F7" },
];

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

        {CAL_EVENTS.map((ev, i) => (
          <div key={i} style={{
            display: "flex", alignItems: "center", gap: 11,
            paddingBottom: i < CAL_EVENTS.length - 1 ? 11 : 0,
            marginBottom:  i < CAL_EVENTS.length - 1 ? 11 : 0,
            borderBottom:  i < CAL_EVENTS.length - 1 ? "1px solid rgba(255,255,255,0.05)" : "none",
          }}>
            <div style={{
              width: 3, height: 36, borderRadius: 2, flexShrink: 0,
              background: `linear-gradient(to bottom, ${ev.color}, ${ev.color}50)`,
              boxShadow: `0 0 10px ${ev.color}70`,
            }} />
            <div>
              <div style={{ fontSize: 13, color: "rgba(255,255,255,0.85)", fontFamily: "'Outfit', sans-serif", fontWeight: 500 }}>{ev.title}</div>
              <div style={{ fontSize: 11, color: "rgba(255,255,255,0.30)", fontFamily: "'Outfit', sans-serif", marginTop: 2 }}>{ev.time}</div>
            </div>
          </div>
        ))}
      </div>
    </motion.div>
  );
}

// ── Memory card ───────────────────────────────────────────────────────────────

const MEM_ITEMS = [
  { icon: "fa-note-sticky", color: "#F59E0B", text: "Ideas for the new project structure" },
  { icon: "fa-brain",       color: "#2DD4BF", text: "Cortex learned your reading schedule" },
  { icon: "fa-clipboard",   color: "#818CF8", text: "Copied: API endpoint from docs" },
];

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

        {MEM_ITEMS.map((item, i) => (
          <div key={i} style={{
            display: "flex", alignItems: "flex-start", gap: 10,
            paddingBottom: i < MEM_ITEMS.length - 1 ? 10 : 0,
            marginBottom:  i < MEM_ITEMS.length - 1 ? 10 : 0,
            borderBottom:  i < MEM_ITEMS.length - 1 ? "1px solid rgba(255,255,255,0.05)" : "none",
          }}>
            <div style={{
              width: 26, height: 26, borderRadius: 8, flexShrink: 0,
              background: `${item.color}14`, border: `1px solid ${item.color}22`,
              display: "flex", alignItems: "center", justifyContent: "center", marginTop: 1,
            }}>
              <i className={`fa-solid ${item.icon}`} style={{ color: item.color, fontSize: 11 }} />
            </div>
            <span style={{ fontSize: 12.5, color: "rgba(255,255,255,0.60)", fontFamily: "'Outfit', sans-serif", lineHeight: 1.48, paddingTop: 4 }}>
              {item.text}
            </span>
          </div>
        ))}
      </div>
    </motion.div>
  );
}

// ── Recent notes card ─────────────────────────────────────────────────────────

const NOTES = [
  { title: "Project Architecture",  preview: "Microservices vs monolith trade-offs for the new…", time: "2h ago",    color: "#F59E0B" },
  { title: "Meeting Notes",         preview: "Q3 roadmap finalized. Key points: mobile-first…",  time: "Yesterday", color: "#60A5FA" },
];

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

        {NOTES.map((note, i) => (
          <div key={i} style={{
            display: "flex", alignItems: "flex-start", gap: 10,
            paddingBottom: i < NOTES.length - 1 ? 11 : 0,
            marginBottom:  i < NOTES.length - 1 ? 11 : 0,
            borderBottom:  i < NOTES.length - 1 ? "1px solid rgba(255,255,255,0.05)" : "none",
          }}>
            <div style={{
              width: 34, height: 34, borderRadius: 10, flexShrink: 0,
              background: `${note.color}14`, border: `1px solid ${note.color}22`,
              display: "flex", alignItems: "center", justifyContent: "center",
            }}>
              <i className="fa-solid fa-note-sticky" style={{ color: note.color, fontSize: 14 }} />
            </div>
            <div style={{ flex: 1, minWidth: 0 }}>
              <div style={{ display: "flex", justifyContent: "space-between", alignItems: "baseline", gap: 6 }}>
                <span style={{ fontSize: 12.5, fontWeight: 600, color: "rgba(255,255,255,0.82)", fontFamily: "'Outfit', sans-serif", overflow: "hidden", textOverflow: "ellipsis", whiteSpace: "nowrap" }}>
                  {note.title}
                </span>
                <span style={{ fontSize: 10, color: "rgba(255,255,255,0.26)", fontFamily: "'Outfit', sans-serif", flexShrink: 0 }}>{note.time}</span>
              </div>
              <div style={{ fontSize: 11.5, color: "rgba(255,255,255,0.36)", fontFamily: "'Outfit', sans-serif", marginTop: 2, overflow: "hidden", textOverflow: "ellipsis", whiteSpace: "nowrap" }}>
                {note.preview}
              </div>
            </div>
          </div>
        ))}
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
        onTouchEnd={onOpen}
        onClick={onOpen}
        style={{
          background: "none", border: "none", cursor: "pointer",
          padding: "8px 28px", WebkitTapHighlightColor: "transparent",
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

function AIHomeContent({ onOpenApp, onOpenDrawer, onOpenSearch }) {
  const now      = useClock();
  const hour     = now.getHours();
  const theme    = useMemo(() => getTheme(hour), [hour]);
  const userName = useMemo(() => {
    try { return localStorage.getItem("omniverse_user_name") || ""; } catch { return ""; }
  }, []);

  const feedRef = useRef(null);
  const handleScroll = useCallback(() => {
    if (!feedRef.current) return;
    window.dispatchEvent(new CustomEvent("aiHomeScroll", { detail: { scrollY: feedRef.current.scrollTop } }));
  }, []);

  return (
    <div style={{ display: "flex", flexDirection: "column", height: "100%", position: "relative", overflow: "hidden" }}>
      {/* Ambient aurora — behind everything */}
      <AmbientBackground theme={theme} />

      {/* Search bar — sticky at top */}
      <CortexSearchBar onTap={onOpenSearch} theme={theme} />

      {/* Scrollable feed — GPU-native momentum scroll */}
      <div
        ref={feedRef}
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

        <PremiumClock now={now} theme={theme} userName={userName} />
        <CortexBriefCard now={now} userName={userName} theme={theme} />
        <QuickStatsRow />
        <CalendarCard onOpenApp={onOpenApp} />
        <MemoryCard onOpenApp={onOpenApp} />
        <RecentNotesCard onOpenApp={onOpenApp} />
        <QuickAccessRow onOpenApp={onOpenApp} />
        <div style={{ height: 16 }} />
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

  const touchStartX  = useRef(null);
  const touchStartY  = useRef(null);
  const axisLocked   = useRef(null);
  const peekRef      = useRef(null);   // drawer-peek strip
  const peekRafId    = useRef(null);
  const showDrawerRef = useRef(false); // mirror without closure stale ref

  // Keep ref in sync
  useEffect(() => { showDrawerRef.current = showDrawer; }, [showDrawer]);

  const navigate = useCallback((delta) => {
    setGlobalPage((p) => {
      const next = Math.max(0, Math.min(1, p + delta));
      setDirection(delta);
      return next;
    });
  }, []);

  // Reset peek strip back off-screen
  const resetPeek = useCallback(() => {
    if (!peekRef.current) return;
    peekRef.current.style.transition = "transform 0.30s cubic-bezier(0.4,0,1,1), opacity 0.22s ease";
    peekRef.current.style.transform  = "translate3d(0,0,0)";
    peekRef.current.style.opacity    = "0";
    setTimeout(() => {
      if (peekRef.current) peekRef.current.style.transition = "none";
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

    // Live drawer peek — follows finger upward during swipe-up on home page
    if (axisLocked.current === "v" && !showDrawerRef.current) {
      const swipeUp = touchStartY.current - curY; // positive = moving up
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

    if (axis === "v" && dy < -60 && globalPage === 1 && !showDrawer) {
      resetPeek();
      setShowDrawer(true);
      return;
    }

    // Didn't open — snap peek back
    resetPeek();

    if (axis === "h" && Math.abs(dx) > 48) {
      if (dx < 0) navigate(1);
      if (dx > 0) navigate(-1);
    }
  }, [navigate, globalPage, showDrawer, resetPeek]);

  const pageVariants = {
    initial: (dir) => ({ opacity: 0, x: dir > 0 ?  "28%" : "-28%" }),
    animate:          { opacity: 1, x: "0%" },
    exit:    (dir) => ({ opacity: 0, x: dir > 0 ? "-28%" :  "28%" }),
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
          top: 60, left: 0, right: 0, bottom: 88,
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
              transition={{ type: "spring", damping: 32, stiffness: 340, mass: 0.45 }}
              style={{ position: "absolute", inset: 0 }}
            >
              {globalPage === 0 ? (
                <MobileWidgetView />
              ) : (
                <AIHomeContent
                  onOpenApp={onOpenApp}
                  onOpenDrawer={() => setShowDrawer(true)}
                  onOpenSearch={onOpenSearch}
                />
              )}
            </motion.div>
          </AnimatePresence>
        </div>

        {/* Page indicator — 2 tiny dots, not distracting */}
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

      {/* Live drawer-peek strip — follows finger, snaps back if not opened */}
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
        {/* Grab handle preview */}
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
