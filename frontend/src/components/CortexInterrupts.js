/**
 * CortexInterrupts — Proactive, respectful AI suggestions.
 *
 * Checks for contextual insights every 8 minutes.
 * Max one visible interrupt at a time.
 * Fully dismissible. Never intrusive during Focus mode.
 * Does not run during the first 2 minutes of a session.
 */
import React, { useCallback, useEffect, useRef, useState } from "react";
import { motion, AnimatePresence } from "framer-motion";
import { interruptsApi } from "../lib/intelligenceApi";

const CHECK_INTERVAL_MS  = 8  * 60 * 1000;  // 8 minutes between checks
const STARTUP_DELAY_MS   = 2  * 60 * 1000;  // don't check for the first 2 min
const AUTO_DISMISS_MS    = 45 * 1000;         // auto-dismiss after 45 seconds

const URGENCY_STYLES = {
  high:   { border: "rgba(255,0,60,0.35)",    bg: "rgba(255,0,60,0.07)",    dot: "#FF003C" },
  normal: { border: "rgba(0,240,255,0.25)",   bg: "rgba(0,240,255,0.06)",   dot: "#00F0FF" },
  low:    { border: "rgba(255,255,255,0.12)", bg: "rgba(255,255,255,0.04)", dot: "#64748b" },
};

const TYPE_ACCENTS = {
  reminder: "#F59E0B",
  insight:  "#7B2FFF",
  warning:  "#FF003C",
  tip:      "#00F0FF",
};

/**
 * CortexInterrupts
 *
 * Props:
 *   focusMode {boolean}   — when true, all interrupts are silenced
 *   userId    {string}    — used to gate the initial check
 */
export default function CortexInterrupts({ focusMode = false, userId }) {
  const [interrupt, setInterrupt] = useState(null);
  const dismissTimer = useRef(null);
  const checkTimer   = useRef(null);
  const mounted      = useRef(true);

  const dismiss = useCallback(() => {
    clearTimeout(dismissTimer.current);
    setInterrupt(null);
  }, []);

  const check = useCallback(async () => {
    if (!mounted.current || focusMode || !userId) return;
    try {
      const { interrupt: incoming } = await interruptsApi.check();
      if (!incoming || !mounted.current || focusMode) return;
      setInterrupt(incoming);
      // Auto-dismiss
      clearTimeout(dismissTimer.current);
      dismissTimer.current = setTimeout(() => {
        if (mounted.current) setInterrupt(null);
      }, AUTO_DISMISS_MS);
    } catch {
      // Silently ignore — interrupts are non-critical
    }
  }, [focusMode, userId]);

  useEffect(() => {
    mounted.current = true;

    // Initial check after startup delay
    const startupTimer = setTimeout(() => {
      check();
      // Schedule recurring checks
      checkTimer.current = setInterval(check, CHECK_INTERVAL_MS);
    }, STARTUP_DELAY_MS);

    return () => {
      mounted.current = false;
      clearTimeout(startupTimer);
      clearInterval(checkTimer.current);
      clearTimeout(dismissTimer.current);
    };
  }, [check]);

  // Dismiss immediately if focus mode activates
  useEffect(() => {
    if (focusMode) {
      clearTimeout(dismissTimer.current);
      setInterrupt(null);
    }
  }, [focusMode]);

  return (
    <AnimatePresence>
      {interrupt && (
        <motion.div
          key={interrupt.id}
          initial={{ opacity: 0, y: 12, scale: 0.97 }}
          animate={{ opacity: 1, y: 0, scale: 1 }}
          exit={{ opacity: 0, y: 8, scale: 0.97, transition: { duration: 0.2 } }}
          transition={{ duration: 0.3, ease: [0.22, 1, 0.36, 1] }}
          style={{
            position: "fixed",
            bottom: 88,   // above dock
            right: 18,
            zIndex: 8200,
            width: 300,
            maxWidth: "calc(100vw - 36px)",
          }}
        >
          {(() => {
            const ust = URGENCY_STYLES[interrupt.urgency] || URGENCY_STYLES.normal;
            const accent = TYPE_ACCENTS[interrupt.type] || "#00F0FF";
            return (
              <div style={{
                background: "rgba(8,10,22,0.97)",
                border: `1px solid ${ust.border}`,
                borderLeft: `3px solid ${accent}`,
                borderRadius: 14,
                padding: "14px 16px",
                boxShadow: "0 24px 60px rgba(0,0,0,0.7), 0 0 0 1px rgba(0,240,255,0.04)",
                backdropFilter: "blur(32px)",
              }}>
                {/* Header row */}
                <div style={{
                  display: "flex", alignItems: "flex-start", gap: 10, marginBottom: 8,
                }}>
                  <div style={{
                    width: 32, height: 32, borderRadius: 8, flexShrink: 0,
                    background: `${accent}15`,
                    border: `1px solid ${accent}30`,
                    display: "flex", alignItems: "center", justifyContent: "center",
                  }}>
                    <i className={interrupt.icon || "fa-solid fa-lightbulb"}
                       style={{ color: accent, fontSize: 13 }} />
                  </div>
                  <div style={{ flex: 1, minWidth: 0 }}>
                    <div style={{
                      fontSize: 12.5, fontWeight: 600,
                      fontFamily: "'Outfit', sans-serif",
                      color: "#e2e8f0", marginBottom: 3, lineHeight: 1.3,
                    }}>
                      {interrupt.title}
                    </div>
                    <div style={{
                      fontSize: 11.5, color: "#94a3b8", lineHeight: 1.5,
                      fontFamily: "'Outfit', sans-serif",
                    }}>
                      {interrupt.body}
                    </div>
                  </div>
                  <button
                    onClick={dismiss}
                    style={{
                      background: "none", border: "none", cursor: "pointer",
                      color: "rgba(255,255,255,0.3)", padding: 2, lineHeight: 1,
                      flexShrink: 0, fontSize: 14, marginTop: -2,
                    }}
                  >
                    <i className="fa-solid fa-xmark" style={{ fontSize: 12 }} />
                  </button>
                </div>

                {/* Footer */}
                <div style={{
                  display: "flex", alignItems: "center", justifyContent: "space-between",
                }}>
                  <div style={{ display: "flex", alignItems: "center", gap: 5 }}>
                    <div style={{
                      width: 5, height: 5, borderRadius: "50%",
                      background: ust.dot,
                    }} />
                    <span style={{
                      fontSize: 9.5, fontFamily: "'JetBrains Mono', monospace",
                      color: "rgba(255,255,255,0.25)", textTransform: "uppercase",
                      letterSpacing: "0.07em",
                    }}>
                      Cortex · {interrupt.type}
                    </span>
                  </div>
                  <button
                    onClick={dismiss}
                    style={{
                      fontSize: 10, fontFamily: "'Outfit', sans-serif",
                      color: "rgba(255,255,255,0.3)",
                      background: "none", border: "none", cursor: "pointer", padding: 0,
                    }}
                  >
                    Dismiss
                  </button>
                </div>
              </div>
            );
          })()}
        </motion.div>
      )}
    </AnimatePresence>
  );
}
