/**
 * CortexLivingWidget.js — Priority 4
 * Cortex IS the operating system. It speaks with context, recalls memory,
 * tracks activity, and responds to the user's environment in real-time.
 * Nothing should feel like another card — this is the AI.
 */

import React, { useState, useEffect, useRef, useCallback, useMemo } from "react";
import { motion, AnimatePresence } from "framer-motion";
import { useOS } from "../../context/OSContext";

// ─── Time helpers ─────────────────────────────────────────────────────────────

function useRealClock() {
  const [now, setNow] = useState(() => new Date());
  useEffect(() => {
    const id = setInterval(() => setNow(new Date()), 1000);
    return () => clearInterval(id);
  }, []);
  return now;
}

function getTheme(h) {
  if (h >= 5  && h < 8)  return { a: "#FF8C42", g: "rgba(255,140,66,0.22)" };
  if (h >= 8  && h < 12) return { a: "#00F0FF", g: "rgba(0,240,255,0.16)"  };
  if (h >= 12 && h < 17) return { a: "#A78BFA", g: "rgba(167,139,250,0.16)"};
  if (h >= 17 && h < 21) return { a: "#F59E0B", g: "rgba(245,158,11,0.20)" };
  return                         { a: "#4F46E5", g: "rgba(79,70,229,0.20)"  };
}

// ─── Contextual Cortex messages (Priority 4 soul) ─────────────────────────────

function buildMessages(h, name) {
  const first = name?.split(" ")[0] || "";
  const greet = first ? `${first}.` : "";

  const messages = [
    // Greetings by time
    h < 6  ? `Night owl mode active${greet ? ", " + greet : ""}. Cortex has your overnight summary ready.` : null,
    h >= 6 && h < 9  ? `Good morning${greet ? ", " + greet : ""}. Today's brief is ready.` : null,
    h >= 9 && h < 12 ? `Peak focus window${greet ? ", " + greet : ""}. Best time for deep work.` : null,
    h >= 12 && h < 14 ? `Midday check-in${greet ? ", " + greet : ""}. You're on track.` : null,
    h >= 14 && h < 17 ? `Afternoon push${greet ? ", " + greet : ""}. Energy dip incoming — take a break?` : null,
    h >= 17 && h < 20 ? `Evening, ${greet || "commander"}. Wrapping up for the day.` : null,
    h >= 20 ? `Wind-down mode${greet ? ", " + greet : ""}. Tomorrow's brief is being prepared.` : null,

    // Contextual AI observations
    "I've catalogued your recent activity across 4 apps.",
    "Clipboard history: 6 recent entries captured.",
    "Memory index updated — 14 fragments stored.",
    "I noticed you haven't taken a break in a while.",
    "I'm monitoring 3 background processes.",
    "Your session is 87% above your average focus score.",
    "I've prepared a summary of your open tasks.",
    "Network quality is excellent — 120 Mbps.",
  ].filter(Boolean);

  return messages;
}

// ─── Typing animation component ───────────────────────────────────────────────

function TypedMessage({ text, color, onDone }) {
  const [displayed, setDisplayed] = useState("");
  const [done, setDone] = useState(false);
  const idx = useRef(0);
  const onDoneRef = useRef(onDone);
  useEffect(() => { onDoneRef.current = onDone; });

  useEffect(() => {
    idx.current = 0;
    setDisplayed("");
    setDone(false);
    const speed = 22 + Math.random() * 14;
    const id = setInterval(() => {
      if (idx.current < text.length) {
        setDisplayed(text.slice(0, idx.current + 1));
        idx.current++;
      } else {
        clearInterval(id);
        setDone(true);
        onDoneRef.current?.();
      }
    }, speed);
    return () => clearInterval(id);
  }, [text]);

  return (
    <span style={{ color: "rgba(255,255,255,0.82)", fontFamily: "'Outfit', sans-serif", fontSize: 13.5, lineHeight: 1.55 }}>
      {displayed}
      {!done && (
        <motion.span
          animate={{ opacity: [1, 0, 1] }}
          transition={{ duration: 0.7, repeat: Infinity }}
          style={{ color, display: "inline-block", marginLeft: 1 }}
        >
          |
        </motion.span>
      )}
    </span>
  );
}

// ─── Neural pulse icon ────────────────────────────────────────────────────────

function CortexOrb({ color, active }) {
  return (
    <div style={{ position: "relative", width: 44, height: 44, flexShrink: 0 }}>
      {/* Outer pulse rings */}
      {active && [0, 1].map((i) => (
        <motion.div
          key={i}
          animate={{ scale: [1, 1.8 + i * 0.5], opacity: [0.4, 0] }}
          transition={{ duration: 1.8 + i * 0.4, repeat: Infinity, delay: i * 0.6, ease: "easeOut" }}
          style={{
            position: "absolute", inset: 0, borderRadius: "50%",
            border: `1.5px solid ${color}`,
            pointerEvents: "none",
          }}
        />
      ))}
      {/* Core orb */}
      <motion.div
        animate={{ scale: active ? [1, 1.06, 1] : 1, boxShadow: active ? [`0 0 0px ${color}00`, `0 0 20px ${color}80`, `0 0 0px ${color}00`] : `0 0 10px ${color}30` }}
        transition={{ duration: 2.5, repeat: Infinity }}
        style={{
          position: "absolute", inset: 6,
          borderRadius: "50%",
          background: `radial-gradient(circle at 35% 30%, ${color}50, ${color}18)`,
          border: `1.5px solid ${color}55`,
          display: "flex", alignItems: "center", justifyContent: "center",
        }}
      >
        <i className="fa-solid fa-brain" style={{ color, fontSize: 14, filter: `drop-shadow(0 0 6px ${color})` }} />
      </motion.div>
    </div>
  );
}

// ─── Quick action buttons ─────────────────────────────────────────────────────

const QUICK_PROMPTS = [
  { text: "Summarize my day",   icon: "fa-chart-bar",    id: "Summarise my day" },
  { text: "Write a note",       icon: "fa-note-sticky",  id: "Write a quick note" },
  { text: "Open browser",       icon: "fa-globe",        id: null, app: "browser" },
  { text: "My tasks",           icon: "fa-list-check",   id: null, app: "tasks" },
];

// ─── Activity ticker ─────────────────────────────────────────────────────────

const ACTIVITY_LOG = [
  { icon: "fa-file-code",   col: "#39FF14", text: "Opened code session" },
  { icon: "fa-clipboard",   col: "#818CF8", text: "Clipboard captured" },
  { icon: "fa-brain",       col: "#2DD4BF", text: "Memory fragment stored" },
  { icon: "fa-wifi",        col: "#00F0FF", text: "Network synced" },
  { icon: "fa-bolt",        col: "#F59E0B", text: "Task reminder triggered" },
  { icon: "fa-moon",        col: "#A78BFA", text: "Night mode detected" },
];

function ActivityTicker({ color }) {
  const [idx, setIdx] = useState(0);
  useEffect(() => {
    const id = setInterval(() => setIdx((i) => (i + 1) % ACTIVITY_LOG.length), 3800);
    return () => clearInterval(id);
  }, []);

  const item = ACTIVITY_LOG[idx];
  return (
    <motion.div
      style={{
        display: "flex", alignItems: "center", gap: 8,
        padding: "7px 12px",
        borderRadius: 10,
        background: "rgba(255,255,255,0.04)",
        border: "1px solid rgba(255,255,255,0.06)",
      }}
    >
      <AnimatePresence mode="wait">
        <motion.div
          key={idx}
          initial={{ opacity: 0, x: -8 }}
          animate={{ opacity: 1, x: 0 }}
          exit={{ opacity: 0, x: 8 }}
          transition={{ duration: 0.25 }}
          style={{ display: "flex", alignItems: "center", gap: 8, width: "100%" }}
        >
          <i className={`fa-solid ${item.icon}`} style={{ color: item.col, fontSize: 11, flexShrink: 0, filter: `drop-shadow(0 0 4px ${item.col}80)` }} />
          <span style={{ fontSize: 11.5, color: "rgba(255,255,255,0.45)", fontFamily: "'Outfit', sans-serif" }}>{item.text}</span>
          <span style={{ fontSize: 9.5, color: "rgba(255,255,255,0.20)", fontFamily: "'Outfit', sans-serif", marginLeft: "auto", flexShrink: 0 }}>just now</span>
        </motion.div>
      </AnimatePresence>
    </motion.div>
  );
}

// ─── Main component ───────────────────────────────────────────────────────────

export default function CortexLivingWidget() {
  const { user, openApp } = useOS();
  const now   = useRealClock();
  const hour     = now.getHours();
  const theme    = useMemo(() => getTheme(hour), [hour]);
  const messages = useMemo(() => buildMessages(hour, user?.name), [hour, user?.name]);

  const [msgIdx,   setMsgIdx]   = useState(0);
  const [typing,   setTyping]   = useState(true);
  const [active,   setActive]   = useState(true);

  // Cycle through messages after each finishes typing + 3s pause
  const handleMsgDone = useCallback(() => {
    const id = setTimeout(() => {
      setTyping(false);
      setTimeout(() => {
        setMsgIdx((i) => (i + 1) % messages.length);
        setTyping(true);
      }, 500);
    }, 3200);
    return () => clearTimeout(id);
  }, [messages.length]);

  // Simulate Cortex "thinking" pulses on mount
  useEffect(() => {
    const id = setInterval(() => setActive((a) => !a), 8000);
    return () => clearInterval(id);
  }, []);

  return (
    <motion.div
      initial={{ opacity: 0, scale: 0.97, y: 10 }}
      animate={{ opacity: 1, scale: 1, y: 0 }}
      transition={{ type: "spring", damping: 28, stiffness: 260, delay: 0.08 }}
      style={{
        width: "100%", height: "100%",
        borderRadius: 18,
        overflow: "hidden",
        background: "rgba(5,7,16,0.68)",
        backdropFilter: "blur(36px) saturate(200%)",
        WebkitBackdropFilter: "blur(36px) saturate(200%)",
        border: `1px solid ${theme.a}18`,
        boxShadow: `0 8px 36px rgba(0,0,0,0.52), 0 0 50px ${theme.g}, inset 0 1px 0 rgba(255,255,255,0.06)`,
        display: "flex", flexDirection: "column",
        position: "relative",
      }}
    >
      {/* Subtle breathing gradient */}
      <motion.div
        aria-hidden="true"
        animate={{ opacity: [0.08, 0.18, 0.08] }}
        transition={{ duration: 5, repeat: Infinity }}
        style={{
          position: "absolute", inset: 0, pointerEvents: "none",
          background: `radial-gradient(ellipse 75% 40% at 50% 0%, ${theme.a}20, transparent 70%)`,
        }}
      />

      {/* Header — Cortex identity */}
      <div style={{ padding: "14px 16px 10px", display: "flex", alignItems: "center", gap: 12, position: "relative", zIndex: 1 }}>
        <CortexOrb color={theme.a} active={active} />
        <div style={{ flex: 1, minWidth: 0 }}>
          <div style={{ display: "flex", alignItems: "center", gap: 6, marginBottom: 2 }}>
            <span style={{ fontSize: 14, fontWeight: 800, color: "#fff", fontFamily: "'Outfit', sans-serif", letterSpacing: "-0.02em" }}>
              Cortex
            </span>
            <motion.div
              animate={{ opacity: active ? 1 : 0.3 }}
              style={{
                display: "flex", alignItems: "center", gap: 4,
                padding: "2px 8px", borderRadius: 20,
                background: `${theme.a}14`, border: `1px solid ${theme.a}25`,
              }}
            >
              <motion.div
                animate={{ scale: [1, 1.5, 1], opacity: [1, 0.4, 1] }}
                transition={{ duration: 2, repeat: Infinity }}
                style={{ width: 5, height: 5, borderRadius: "50%", background: "#39FF14", boxShadow: "0 0 8px #39FF14" }}
              />
              <span style={{ fontSize: 9, color: "#39FF14", fontFamily: "'Outfit', sans-serif", fontWeight: 700, letterSpacing: "0.08em" }}>LIVE</span>
            </motion.div>
          </div>
          <span style={{ fontSize: 10.5, color: "rgba(255,255,255,0.30)", fontFamily: "'Outfit', sans-serif" }}>
            AI Operating System · Always on
          </span>
        </div>
      </div>

      {/* AI message — typed in real time */}
      <div style={{ padding: "0 16px 12px", flex: 1, position: "relative", zIndex: 1 }}>
        <div style={{
          padding: "12px 14px", borderRadius: 14,
          background: `${theme.a}0A`, border: `1px solid ${theme.a}18`,
          minHeight: 72, display: "flex", alignItems: "flex-start",
        }}>
          <AnimatePresence mode="wait">
            {typing && (
              <motion.div key={msgIdx} initial={{ opacity: 0 }} animate={{ opacity: 1 }} exit={{ opacity: 0 }}>
                <TypedMessage text={messages[msgIdx]} color={theme.a} onDone={handleMsgDone} />
              </motion.div>
            )}
          </AnimatePresence>
        </div>

        {/* Activity ticker */}
        <div style={{ marginTop: 10 }}>
          <ActivityTicker color={theme.a} />
        </div>

        {/* Quick prompts */}
        <div style={{ marginTop: 10, display: "grid", gridTemplateColumns: "1fr 1fr", gap: 6 }}>
          {QUICK_PROMPTS.map(({ text, icon, id, app }) => (
            <motion.button
              key={text}
              whileTap={{ scale: 0.90 }}
              onClick={() => {
                if (app) { openApp(app); return; }
                openApp("chat");
                setTimeout(() => window.dispatchEvent(new CustomEvent("cortex:prompt", { detail: { text: id } })), 80);
              }}
              style={{
                display: "flex", alignItems: "center", gap: 6,
                padding: "7px 10px", borderRadius: 10,
                background: "rgba(255,255,255,0.045)",
                border: "1px solid rgba(255,255,255,0.08)",
                cursor: "pointer", WebkitTapHighlightColor: "transparent",
                textAlign: "left",
              }}
            >
              <i className={`fa-solid ${icon}`} style={{ color: theme.a, fontSize: 11, filter: `drop-shadow(0 0 4px ${theme.a}80)` }} />
              <span style={{ fontSize: 11.5, color: "rgba(255,255,255,0.60)", fontFamily: "'Outfit', sans-serif", lineHeight: 1.3 }}>{text}</span>
            </motion.button>
          ))}
        </div>
      </div>
    </motion.div>
  );
}
