/**
 * FocusTunnel — Focused work mode for OmniverseOS.
 *
 * Features:
 *  - Timed focus session (25 / 45 / 60 / custom minutes)
 *  - Distraction suppression: no interrupts, no notifications badge
 *  - Minimal overlay with live countdown
 *  - Post-focus summary generation via Gemini
 *  - Dismissible at any time
 *
 * Usage:
 *   <FocusTunnel
 *     active={focusActive}
 *     onStart={(durationMin) => setFocusActive(true)}
 *     onEnd={(summary) => setFocusActive(false)}
 *   />
 *
 * The parent toggles focus mode by calling onStart/onEnd.
 */
import React, { useCallback, useEffect, useRef, useState } from "react";
import { motion, AnimatePresence } from "framer-motion";
import { aiApi } from "../lib/api";
import { crud } from "../lib/api";

// ─── Duration picker ──────────────────────────────────────────────────────────
const PRESET_DURATIONS = [
  { label: "25 min", value: 25 },
  { label: "45 min", value: 45 },
  { label: "60 min", value: 60 },
  { label: "90 min", value: 90 },
];

function DurationPicker({ onStart }) {
  const [custom, setCustom] = useState("");
  const [selected, setSelected] = useState(25);

  const start = () => {
    const mins = custom ? parseInt(custom, 10) : selected;
    if (!mins || mins < 1 || mins > 480) return;
    onStart(mins);
  };

  return (
    <div style={{
      display: "flex", flexDirection: "column", alignItems: "center", gap: 28,
      padding: "40px 32px",
    }}>
      {/* Cortex orb */}
      <div style={{
        width: 80, height: 80, borderRadius: "50%",
        background: "linear-gradient(135deg, rgba(0,240,255,0.3), rgba(123,47,255,0.3))",
        border: "1px solid rgba(0,240,255,0.25)",
        display: "flex", alignItems: "center", justifyContent: "center",
        boxShadow: "0 0 40px rgba(0,240,255,0.15)",
      }}>
        <i className="fa-solid fa-brain" style={{ color: "#00F0FF", fontSize: 30 }} />
      </div>

      <div style={{ textAlign: "center" }}>
        <div style={{
          fontSize: 20, fontWeight: 600,
          fontFamily: "'Outfit', sans-serif", color: "#fff",
          marginBottom: 6,
        }}>
          Enter Focus Mode
        </div>
        <div style={{
          fontSize: 13, color: "rgba(255,255,255,0.4)",
          fontFamily: "'Outfit', sans-serif",
        }}>
          Interrupts silenced. Notifications hidden. You're in control.
        </div>
      </div>

      {/* Preset buttons */}
      <div style={{ display: "flex", gap: 10 }}>
        {PRESET_DURATIONS.map((p) => (
          <button
            key={p.value}
            onClick={() => { setSelected(p.value); setCustom(""); }}
            style={{
              padding: "8px 16px",
              background: selected === p.value && !custom
                ? "rgba(0,240,255,0.12)" : "rgba(255,255,255,0.04)",
              border: `1px solid ${selected === p.value && !custom ? "rgba(0,240,255,0.35)" : "rgba(255,255,255,0.1)"}`,
              borderRadius: 10, cursor: "pointer",
              color: selected === p.value && !custom ? "#00F0FF" : "rgba(255,255,255,0.5)",
              fontSize: 13, fontFamily: "'Outfit', sans-serif",
              transition: "all 0.15s",
            }}
          >
            {p.label}
          </button>
        ))}
      </div>

      {/* Custom */}
      <div style={{ display: "flex", alignItems: "center", gap: 10 }}>
        <input
          value={custom}
          onChange={(e) => { setCustom(e.target.value.replace(/\D/, "")); }}
          placeholder="Custom min…"
          maxLength={3}
          style={{
            width: 120, padding: "8px 14px",
            background: "rgba(255,255,255,0.04)",
            border: `1px solid ${custom ? "rgba(0,240,255,0.3)" : "rgba(255,255,255,0.1)"}`,
            borderRadius: 10, color: custom ? "#00F0FF" : "rgba(255,255,255,0.4)",
            fontSize: 13, fontFamily: "'Outfit', sans-serif",
            outline: "none", textAlign: "center",
          }}
        />
        <span style={{
          fontSize: 12, color: "rgba(255,255,255,0.3)",
          fontFamily: "'Outfit', sans-serif",
        }}>minutes</span>
      </div>

      {/* Start button */}
      <button
        onClick={start}
        style={{
          padding: "13px 48px",
          background: "linear-gradient(135deg, rgba(0,240,255,0.15), rgba(123,47,255,0.12))",
          border: "1px solid rgba(0,240,255,0.35)",
          borderRadius: 14, cursor: "pointer",
          color: "#00F0FF", fontSize: 15, fontWeight: 600,
          fontFamily: "'Outfit', sans-serif",
          boxShadow: "0 0 24px rgba(0,240,255,0.12)",
          transition: "all 0.2s",
        }}
        onMouseEnter={(e) => {
          e.currentTarget.style.boxShadow = "0 0 40px rgba(0,240,255,0.2)";
        }}
        onMouseLeave={(e) => {
          e.currentTarget.style.boxShadow = "0 0 24px rgba(0,240,255,0.12)";
        }}
      >
        Start Focus Session
      </button>
    </div>
  );
}

// ─── Active timer display ─────────────────────────────────────────────────────
function ActiveTimer({ secondsLeft, totalSeconds, onEnd, topic, onTopicChange }) {
  const pct = totalSeconds > 0 ? ((totalSeconds - secondsLeft) / totalSeconds) * 100 : 0;
  const mins = Math.floor(secondsLeft / 60);
  const secs = secondsLeft % 60;

  const circumference = 2 * Math.PI * 54;
  const dash = (pct / 100) * circumference;

  return (
    <div style={{
      display: "flex", flexDirection: "column", alignItems: "center",
      gap: 24, padding: "36px 32px",
    }}>
      {/* Circular progress */}
      <div style={{ position: "relative", width: 140, height: 140 }}>
        <svg width="140" height="140" style={{ transform: "rotate(-90deg)" }}>
          <circle cx="70" cy="70" r="54" fill="none"
            stroke="rgba(0,240,255,0.08)" strokeWidth="6" />
          <circle cx="70" cy="70" r="54" fill="none"
            stroke="#00F0FF" strokeWidth="6"
            strokeDasharray={`${dash} ${circumference}`}
            strokeLinecap="round"
            style={{ transition: "stroke-dasharray 1s linear", filter: "drop-shadow(0 0 6px #00F0FF)" }}
          />
        </svg>
        <div style={{
          position: "absolute", inset: 0,
          display: "flex", flexDirection: "column",
          alignItems: "center", justifyContent: "center",
        }}>
          <div style={{
            fontSize: 26, fontWeight: 600,
            fontFamily: "'JetBrains Mono', monospace",
            color: "#fff", lineHeight: 1,
          }}>
            {String(mins).padStart(2, "0")}:{String(secs).padStart(2, "0")}
          </div>
          <div style={{
            fontSize: 9, color: "rgba(0,240,255,0.5)",
            fontFamily: "'JetBrains Mono', monospace",
            marginTop: 2, textTransform: "uppercase", letterSpacing: "0.1em",
          }}>
            remaining
          </div>
        </div>
      </div>

      {/* Focus topic */}
      <div style={{ width: "100%", maxWidth: 280 }}>
        <div style={{
          fontSize: 10, fontFamily: "'JetBrains Mono', monospace",
          color: "rgba(0,240,255,0.4)", textTransform: "uppercase",
          letterSpacing: "0.08em", marginBottom: 6, textAlign: "center",
        }}>
          Focus goal
        </div>
        <input
          value={topic}
          onChange={(e) => onTopicChange(e.target.value)}
          placeholder="What are you working on? (optional)"
          style={{
            width: "100%", padding: "8px 14px",
            background: "rgba(255,255,255,0.04)",
            border: "1px solid rgba(255,255,255,0.1)",
            borderRadius: 10, color: "rgba(255,255,255,0.7)",
            fontSize: 12, fontFamily: "'Outfit', sans-serif",
            outline: "none", textAlign: "center", boxSizing: "border-box",
          }}
        />
      </div>

      {/* Status */}
      <div style={{
        display: "flex", alignItems: "center", gap: 8,
        padding: "7px 16px",
        background: "rgba(0,240,255,0.06)",
        border: "1px solid rgba(0,240,255,0.15)",
        borderRadius: 20,
      }}>
        <div style={{
          width: 7, height: 7, borderRadius: "50%",
          background: "#00F0FF",
          animation: "focusPulse 2s ease-in-out infinite",
        }} />
        <span style={{
          fontSize: 11, fontFamily: "'Outfit', sans-serif",
          color: "rgba(0,240,255,0.8)",
        }}>
          Focus mode active · interrupts silenced
        </span>
        <style>{`@keyframes focusPulse { 0%,100%{opacity:1;} 50%{opacity:0.3;} }`}</style>
      </div>

      {/* End button */}
      <button
        onClick={onEnd}
        style={{
          padding: "9px 28px",
          background: "rgba(255,0,60,0.06)",
          border: "1px solid rgba(255,0,60,0.2)",
          borderRadius: 10, cursor: "pointer",
          color: "#FF4466", fontSize: 12,
          fontFamily: "'Outfit', sans-serif",
        }}
      >
        End Session Early
      </button>
    </div>
  );
}

// ─── Summary view ─────────────────────────────────────────────────────────────
function SummaryView({ summary, duration, topic, onClose }) {
  return (
    <div style={{
      display: "flex", flexDirection: "column", alignItems: "center",
      gap: 20, padding: "36px 32px",
    }}>
      <div style={{
        width: 60, height: 60, borderRadius: "50%",
        background: "rgba(57,255,20,0.1)",
        border: "1px solid rgba(57,255,20,0.25)",
        display: "flex", alignItems: "center", justifyContent: "center",
        boxShadow: "0 0 30px rgba(57,255,20,0.1)",
      }}>
        <i className="fa-solid fa-circle-check" style={{ color: "#39FF14", fontSize: 24 }} />
      </div>

      <div style={{ textAlign: "center" }}>
        <div style={{
          fontSize: 18, fontWeight: 600,
          fontFamily: "'Outfit', sans-serif", color: "#fff", marginBottom: 4,
        }}>
          Focus session complete
        </div>
        <div style={{
          fontSize: 12, color: "rgba(255,255,255,0.4)",
          fontFamily: "'Outfit', sans-serif",
        }}>
          {duration} minutes{topic ? ` · ${topic}` : ""}
        </div>
      </div>

      {summary && (
        <div style={{
          width: "100%", maxWidth: 340,
          padding: "14px 16px",
          background: "rgba(0,240,255,0.05)",
          border: "1px solid rgba(0,240,255,0.15)",
          borderRadius: 12,
        }}>
          <div style={{
            fontSize: 10, fontFamily: "'JetBrains Mono', monospace",
            color: "rgba(0,240,255,0.5)", textTransform: "uppercase",
            letterSpacing: "0.08em", marginBottom: 8,
          }}>
            Cortex Reflection
          </div>
          <div style={{
            fontSize: 12.5, color: "#94a3b8", lineHeight: 1.6,
            fontFamily: "'Outfit', sans-serif",
          }}>
            {summary}
          </div>
        </div>
      )}

      <button
        onClick={onClose}
        style={{
          padding: "10px 32px",
          background: "rgba(0,240,255,0.1)",
          border: "1px solid rgba(0,240,255,0.3)",
          borderRadius: 12, cursor: "pointer",
          color: "#00F0FF", fontSize: 13, fontWeight: 500,
          fontFamily: "'Outfit', sans-serif",
        }}
      >
        Return to Desktop
      </button>
    </div>
  );
}

// ─── Main component ───────────────────────────────────────────────────────────
export default function FocusTunnel({ active, onActivate, onDeactivate }) {
  const [phase, setPhase] = useState("picker");  // picker | active | summary
  const [durationMin, setDurationMin] = useState(25);
  const [secondsLeft, setSecondsLeft] = useState(0);
  const [topic, setTopic] = useState("");
  const [summary, setSummary] = useState("");
  const timerRef = useRef(null);
  const startedAt = useRef(null);

  const startSession = useCallback((mins) => {
    setDurationMin(mins);
    setSecondsLeft(mins * 60);
    setTopic("");
    setSummary("");
    startedAt.current = Date.now();
    setPhase("active");
    onActivate?.();
  }, [onActivate]);

  const endSession = useCallback(async (completed = false) => {
    clearInterval(timerRef.current);
    onDeactivate?.();
    setPhase("summary");

    // Generate a brief Cortex reflection
    if (topic.trim()) {
      try {
        let reflection = "";
        await aiApi.chatStreamResilient(
          {
            session_id: `focus-summary-${Date.now()}`,
            message: (
              `The user just completed a focused work session of ${durationMin} minutes on: "${topic}". ` +
              `Write 1-2 sentences of brief, encouraging, concrete reflection. ` +
              `Do NOT be generic. Reference the topic. Keep it under 80 words.`
            ),
            provider: "gemini",
            model: "gemini-2.5-flash-lite",
          },
          (chunk) => { reflection += chunk; setSummary(reflection); },
          null,
          new AbortController().signal
        );
      } catch {
        setSummary("Session complete. Your sustained focus builds momentum — keep it going.");
      }
    } else {
      setSummary(completed
        ? "Session complete. Sustained focus like this compounds over time."
        : "Session ended early. Every minute of deep work counts."
      );
    }
  }, [durationMin, topic]);

  // Countdown ticker
  useEffect(() => {
    if (phase !== "active") return;
    timerRef.current = setInterval(() => {
      setSecondsLeft((s) => {
        if (s <= 1) {
          clearInterval(timerRef.current);
          endSession(true);
          return 0;
        }
        return s - 1;
      });
    }, 1000);
    return () => clearInterval(timerRef.current);
  }, [phase, endSession]);

  const handleClose = useCallback(() => {
    clearInterval(timerRef.current);
    setPhase("picker");
    setTopic("");
    setSummary("");
    onDeactivate?.();
  }, [onDeactivate]);

  if (!active) return null;

  return (
    <motion.div
      initial={{ opacity: 0 }}
      animate={{ opacity: 1 }}
      exit={{ opacity: 0 }}
      style={{
        position: "fixed", inset: 0,
        zIndex: 8800,
        background: "rgba(3,4,12,0.94)",
        backdropFilter: "blur(48px) saturate(180%)",
        display: "flex", alignItems: "center", justifyContent: "center",
      }}
    >
      {/* Ambient */}
      <div style={{
        position: "absolute", top: "30%", left: "50%",
        transform: "translate(-50%,-50%)",
        width: 500, height: 250, borderRadius: "50%",
        background: "radial-gradient(ellipse, rgba(0,240,255,0.05) 0%, transparent 70%)",
        pointerEvents: "none",
      }} />

      <motion.div
        key={phase}
        initial={{ opacity: 0, y: 20, scale: 0.97 }}
        animate={{ opacity: 1, y: 0, scale: 1 }}
        exit={{ opacity: 0, y: -10 }}
        transition={{ duration: 0.35, ease: [0.22, 1, 0.36, 1] }}
        style={{
          width: "100%", maxWidth: 420,
          background: "rgba(8,10,22,0.96)",
          border: "1px solid rgba(0,240,255,0.12)",
          borderRadius: 20,
          boxShadow: "0 40px 100px rgba(0,0,0,0.8), 0 0 0 1px rgba(0,240,255,0.04)",
          overflow: "hidden",
          position: "relative",
        }}
      >
        {/* Top bar */}
        <div style={{
          display: "flex", alignItems: "center", justifyContent: "space-between",
          padding: "14px 18px 0",
        }}>
          <div style={{ display: "flex", alignItems: "center", gap: 8 }}>
            <div style={{
              width: 7, height: 7, borderRadius: "50%",
              background: phase === "active" ? "#00F0FF" : "#64748b",
              boxShadow: phase === "active" ? "0 0 8px #00F0FF" : "none",
            }} />
            <span style={{
              fontSize: 10, fontFamily: "'JetBrains Mono', monospace",
              color: "rgba(255,255,255,0.3)", textTransform: "uppercase",
              letterSpacing: "0.1em",
            }}>
              Focus Tunnel
            </span>
          </div>
          {phase !== "active" && (
            <button
              onClick={handleClose}
              style={{
                background: "none", border: "none", cursor: "pointer",
                color: "rgba(255,255,255,0.3)", fontSize: 16, lineHeight: 1,
              }}
            >
              <i className="fa-solid fa-xmark" style={{ fontSize: 14 }} />
            </button>
          )}
        </div>

        {/* Phase content */}
        <AnimatePresence mode="wait">
          {phase === "picker" && (
            <DurationPicker key="picker" onStart={startSession} />
          )}
          {phase === "active" && (
            <ActiveTimer
              key="active"
              secondsLeft={secondsLeft}
              totalSeconds={durationMin * 60}
              topic={topic}
              onTopicChange={setTopic}
              onEnd={() => endSession(false)}
            />
          )}
          {phase === "summary" && (
            <SummaryView
              key="summary"
              summary={summary}
              duration={durationMin}
              topic={topic}
              onClose={handleClose}
            />
          )}
        </AnimatePresence>
      </motion.div>
    </motion.div>
  );
}
