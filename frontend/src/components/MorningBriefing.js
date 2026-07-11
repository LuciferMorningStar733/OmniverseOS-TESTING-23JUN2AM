/**
 * MorningBriefing — Cortex overnight briefing modal.
 *
 * Full-screen cinematic overlay. Appears after login when Cortex
 * has prepared insights from notes, tasks, and calendar events.
 * Nothing is auto-committed — user reviews and dismisses each item.
 */
import React, { useEffect, useState, useRef } from "react";
import { motion, AnimatePresence } from "framer-motion";
import { runNightAgent, shouldRunNightAgent, getStoredBrief, clearNightBrief, stampLastSeen } from "../lib/nightAgent";

const URGENCY_COLORS = {
  high:   { bg: "rgba(255,0,60,0.08)",  border: "rgba(255,0,60,0.25)",  text: "#FF6B7A" },
  normal: { bg: "rgba(0,240,255,0.06)", border: "rgba(0,240,255,0.18)", text: "#00F0FF" },
  low:    { bg: "rgba(255,255,255,0.04)", border: "rgba(255,255,255,0.10)", text: "#64748b" },
};

const TYPE_ACCENT = {
  warning: "#FF003C",
  prep:    "#00F0FF",
  insight: "#7B2FFF",
  action:  "#39FF14",
};

function TypedText({ text, speed = 18, onDone }) {
  const [shown, setShown] = useState("");
  const i = useRef(0);
  useEffect(() => {
    if (!text) return;
    i.current = 0;
    setShown("");
    const iv = setInterval(() => {
      i.current++;
      setShown(text.slice(0, i.current));
      if (i.current >= text.length) { clearInterval(iv); onDone?.(); }
    }, speed);
    return () => clearInterval(iv);
  }, [text, speed, onDone]);
  return <span>{shown}</span>;
}

function BriefItem({ item, index, visible }) {
  const col = URGENCY_COLORS[item.urgency] || URGENCY_COLORS.normal;
  const accent = TYPE_ACCENT[item.type] || "#00F0FF";

  return (
    <motion.div
      initial={{ opacity: 0, x: -24 }}
      animate={visible ? { opacity: 1, x: 0 } : { opacity: 0, x: -24 }}
      transition={{ duration: 0.45, delay: index * 0.12, ease: [0.22, 1, 0.36, 1] }}
      style={{
        background:   col.bg,
        border:       `1px solid ${col.border}`,
        borderLeft:   `3px solid ${accent}`,
        borderRadius: 12,
        padding:      "14px 16px",
        display:      "flex",
        gap:          14,
        alignItems:   "flex-start",
      }}
    >
      {/* Icon */}
      <div style={{
        width: 34, height: 34, borderRadius: 8, flexShrink: 0,
        background: `${accent}18`,
        border:     `1px solid ${accent}30`,
        display:    "flex", alignItems: "center", justifyContent: "center",
      }}>
        <i className={item.icon} style={{ color: accent, fontSize: 13 }} />
      </div>

      {/* Text */}
      <div style={{ flex: 1, minWidth: 0 }}>
        <div style={{
          fontSize: 13, fontWeight: 700, color: "#e2e8f0",
          fontFamily: "'Outfit', sans-serif", marginBottom: 4,
        }}>
          {item.title}
        </div>
        <div style={{
          fontSize: 12, color: "#94a3b8", lineHeight: 1.55,
          fontFamily: "'Outfit', sans-serif",
        }}>
          {item.body}
        </div>
      </div>

      {/* Urgency badge */}
      {item.urgency === "high" && (
        <span style={{
          flexShrink: 0, fontSize: 9, fontWeight: 700, fontFamily: "monospace",
          color: "#FF6B7A", background: "rgba(255,0,60,0.12)",
          border: "1px solid rgba(255,0,60,0.3)", borderRadius: 4,
          padding: "2px 6px", letterSpacing: "0.08em", textTransform: "uppercase",
        }}>
          urgent
        </span>
      )}
    </motion.div>
  );
}

export default function MorningBriefing({ onDismiss }) {
  const [phase,  setPhase]  = useState("loading"); // loading | thinking | ready
  const [status, setStatus] = useState("Checking your workspace…");
  const [brief,  setBrief]  = useState(null);
  const [itemsVisible, setItemsVisible] = useState(false);
  const ran = useRef(false);

  useEffect(() => {
    if (ran.current) return;
    ran.current = true;

    // Check for a cached brief first (e.g. page refresh mid-session)
    const stored = getStoredBrief();
    if (stored && (Date.now() - stored.generatedAt) < 30 * 60 * 1000) {
      setBrief(stored);
      setPhase("ready");
      setTimeout(() => setItemsVisible(true), 400);
      return;
    }

    // Run fresh analysis
    setPhase("thinking");
    runNightAgent({
      onStatus: setStatus,
    }).then(result => {
      if (!result) { onDismiss?.(); return; }
      setBrief(result);
      setPhase("ready");
      setTimeout(() => setItemsVisible(true), 500);
    }).catch(() => {
      onDismiss?.();
    });
  }, [onDismiss]);

  const handleDismiss = () => {
    clearNightBrief();
    stampLastSeen();
    onDismiss?.();
  };

  return (
    <motion.div
      initial={{ opacity: 0 }}
      animate={{ opacity: 1 }}
      exit={{    opacity: 0 }}
      transition={{ duration: 0.4 }}
      style={{
        position:       "fixed",
        inset:          0,
        zIndex:         8500,
        display:        "flex",
        alignItems:     "center",
        justifyContent: "center",
        padding:        24,
        background:     "rgba(3,4,10,0.92)",
        backdropFilter: "blur(40px) saturate(180%)",
        WebkitBackdropFilter: "blur(40px) saturate(180%)",
      }}
    >
      {/* Ambient glow */}
      <div style={{
        position: "absolute", top: "30%", left: "50%",
        transform: "translate(-50%,-50%)",
        width: 600, height: 300, borderRadius: "50%",
        background: "radial-gradient(ellipse, rgba(0,240,255,0.06) 0%, transparent 70%)",
        pointerEvents: "none",
      }} />

      <motion.div
        initial={{ opacity: 0, y: 32, scale: 0.96 }}
        animate={{ opacity: 1, y: 0,  scale: 1    }}
        exit={{    opacity: 0, y: 24, scale: 0.96 }}
        transition={{ duration: 0.5, ease: [0.22, 1, 0.36, 1] }}
        style={{
          width:        "100%",
          maxWidth:     560,
          background:   "rgba(8,10,20,0.95)",
          border:       "1px solid rgba(0,240,255,0.14)",
          borderRadius: 20,
          boxShadow:    "0 0 0 1px rgba(0,240,255,0.04), 0 40px 100px rgba(0,0,0,0.8)",
          overflow:     "hidden",
        }}
      >
        {/* Header */}
        <div style={{
          padding:      "20px 24px 16px",
          borderBottom: "1px solid rgba(255,255,255,0.07)",
          display:      "flex",
          alignItems:   "center",
          gap:          14,
        }}>
          {/* Cortex orb */}
          <div style={{
            width: 40, height: 40, borderRadius: "50%", flexShrink: 0,
            background:  "linear-gradient(135deg, #00F0FF, #7B2FFF)",
            boxShadow:   "0 0 20px rgba(0,240,255,0.4)",
            display:     "flex", alignItems: "center", justifyContent: "center",
            position:    "relative",
          }}>
            <i className="fa-solid fa-brain" style={{ color: "#000", fontSize: 16 }} />
            {phase === "thinking" && (
              <motion.div
                animate={{ scale: [1, 1.4, 1], opacity: [0.6, 0, 0.6] }}
                transition={{ duration: 1.8, repeat: Infinity, ease: "easeInOut" }}
                style={{
                  position: "absolute", inset: -4, borderRadius: "50%",
                  border: "2px solid rgba(0,240,255,0.5)",
                }}
              />
            )}
          </div>

          <div style={{ flex: 1, minWidth: 0 }}>
            <div style={{
              fontSize: 11, fontFamily: "monospace", letterSpacing: "0.12em",
              textTransform: "uppercase", color: "rgba(0,240,255,0.6)", marginBottom: 3,
            }}>
              Cortex · overnight analysis
            </div>
            <div style={{
              fontSize: 16, fontWeight: 700, color: "#e2e8f0",
              fontFamily: "'Outfit', sans-serif",
            }}>
              {phase === "ready" && brief
                ? <TypedText text={brief.greeting} speed={22} />
                : status
              }
            </div>
          </div>
        </div>

        {/* Body */}
        <div style={{ padding: "16px 24px 20px" }}>
          <AnimatePresence mode="wait">
            {phase === "thinking" && (
              <motion.div
                key="thinking"
                initial={{ opacity: 0 }}
                animate={{ opacity: 1 }}
                exit={{    opacity: 0 }}
                style={{ display: "flex", flexDirection: "column", gap: 10 }}
              >
                {[0.9, 0.7, 0.5].map((w, i) => (
                  <motion.div
                    key={i}
                    animate={{ opacity: [0.3, 0.7, 0.3] }}
                    transition={{ duration: 1.6, delay: i * 0.2, repeat: Infinity }}
                    style={{
                      height: 48, borderRadius: 12,
                      background: "rgba(255,255,255,0.04)",
                      border: "1px solid rgba(255,255,255,0.06)",
                      width: `${w * 100}%`,
                    }}
                  />
                ))}
                <div style={{
                  textAlign: "center", marginTop: 8,
                  fontSize: 11, fontFamily: "monospace",
                  color: "rgba(0,240,255,0.45)", letterSpacing: "0.08em",
                }}>
                  analysing notes · tasks · calendar…
                </div>
              </motion.div>
            )}

            {phase === "ready" && brief && (
              <motion.div
                key="ready"
                initial={{ opacity: 0 }}
                animate={{ opacity: 1 }}
                style={{ display: "flex", flexDirection: "column", gap: 10 }}
              >
                {brief.items.map((item, i) => (
                  <BriefItem
                    key={i}
                    item={item}
                    index={i}
                    visible={itemsVisible}
                  />
                ))}

                {/* Meta */}
                <div style={{
                  display: "flex", alignItems: "center", justifyContent: "space-between",
                  marginTop: 4,
                  fontSize: 10, fontFamily: "monospace",
                  color: "rgba(255,255,255,0.2)",
                }}>
                  <span>
                    {brief.items.length} insight{brief.items.length !== 1 ? "s" : ""} prepared
                    {brief.gapMs ? ` · ${Math.round(brief.gapMs / 3_600_000)}h gap` : ""}
                  </span>
                  <span>nothing was sent or changed</span>
                </div>
              </motion.div>
            )}
          </AnimatePresence>
        </div>

        {/* Footer */}
        {phase === "ready" && (
          <motion.div
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            transition={{ delay: 0.6 }}
            style={{
              padding:    "14px 24px",
              borderTop:  "1px solid rgba(255,255,255,0.07)",
              display:    "flex",
              justifyContent: "flex-end",
              gap:        10,
            }}
          >
            <motion.button
              whileTap={{ scale: 0.95 }}
              onClick={handleDismiss}
              style={{
                background:   "rgba(0,240,255,0.10)",
                border:       "1px solid rgba(0,240,255,0.25)",
                borderRadius: 10,
                padding:      "9px 22px",
                color:        "#00F0FF",
                fontSize:     13,
                fontWeight:   600,
                fontFamily:   "'Outfit', sans-serif",
                cursor:       "pointer",
                letterSpacing: "0.01em",
              }}
            >
              Got it — open workspace
            </motion.button>
          </motion.div>
        )}
      </motion.div>
    </motion.div>
  );
}
