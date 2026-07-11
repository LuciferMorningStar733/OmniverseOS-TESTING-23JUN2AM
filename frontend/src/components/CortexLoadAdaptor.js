/**
 * CortexLoadAdaptor — P13: Passive UI overlay that responds to cognitive load.
 *
 * flow state     → subtle "FLOW" pill near the clock; Cortex goes quiet
 * scattered state → amber nudge card suggesting Focus Tunnel or task review
 * normal          → invisible; no UI overhead
 *
 * Props:
 *   onSuggestFocus {Function} — called when user clicks "Focus Tunnel" in the nudge
 */
import React, { useEffect, useRef, useState } from "react";
import { motion, AnimatePresence } from "framer-motion";
import { useCognitiveLoad } from "../context/CognitiveLoadContext";
import { useOS } from "../context/OSContext";

export default function CortexLoadAdaptor({ onSuggestFocus }) {
  const { score, state } = useCognitiveLoad();
  const { openApp }      = useOS();
  const [dismissed, setDismissed] = useState(false);
  const prevState = useRef(state);

  // Reset dismissal whenever we transition INTO scattered
  useEffect(() => {
    if (state === "scattered" && prevState.current !== "scattered") {
      setDismissed(false);
    }
    prevState.current = state;
  }, [state]);

  const showNudge = state === "scattered" && !dismissed;
  const showFlow  = state === "flow";

  return (
    <>
      {/* ── Flow indicator pill ─────────────────────────────────────────── */}
      <AnimatePresence>
        {showFlow && (
          <motion.div
            key="flow-pill"
            initial={{ opacity: 0, y: -10 }}
            animate={{ opacity: 1, y: 0 }}
            exit={{ opacity: 0, y: -10 }}
            transition={{ duration: 0.35 }}
            style={{
              position: "fixed",
              top: 13,
              right: 90,
              zIndex: 9100,
              display: "flex",
              alignItems: "center",
              gap: 6,
              padding: "3px 12px 3px 8px",
              borderRadius: 20,
              background: "rgba(0,240,255,0.07)",
              border: "1px solid rgba(0,240,255,0.18)",
              backdropFilter: "blur(12px)",
              pointerEvents: "none",
              userSelect: "none",
            }}
          >
            <span style={{
              display: "inline-block",
              width: 6, height: 6,
              borderRadius: "50%",
              background: "#00F0FF",
              boxShadow: "0 0 6px rgba(0,240,255,0.8)",
            }} />
            <span style={{
              fontSize: 9,
              fontFamily: "'JetBrains Mono', monospace",
              color: "rgba(0,240,255,0.65)",
              letterSpacing: "0.12em",
              textTransform: "uppercase",
            }}>
              flow
            </span>
          </motion.div>
        )}
      </AnimatePresence>

      {/* ── Scattered nudge card ────────────────────────────────────────── */}
      <AnimatePresence>
        {showNudge && (
          <motion.div
            key="scattered-nudge"
            initial={{ opacity: 0, x: 24 }}
            animate={{ opacity: 1, x: 0 }}
            exit={{ opacity: 0, x: 24 }}
            transition={{ duration: 0.35, ease: [0.22, 1, 0.36, 1] }}
            style={{
              position: "fixed",
              bottom: 100,
              right: 18,
              zIndex: 9100,
              width: 248,
              padding: "14px 16px",
              borderRadius: 14,
              background: "rgba(12,12,22,0.94)",
              border: "1px solid rgba(245,158,11,0.28)",
              backdropFilter: "blur(24px)",
              boxShadow: "0 12px 40px rgba(0,0,0,0.5)",
            }}
          >
            {/* Header row */}
            <div style={{ display: "flex", alignItems: "center", justifyContent: "space-between", marginBottom: 10 }}>
              <div style={{ display: "flex", alignItems: "center", gap: 7 }}>
                <span style={{
                  display: "inline-block", width: 7, height: 7,
                  borderRadius: "50%", background: "#F59E0B",
                  boxShadow: "0 0 8px rgba(245,158,11,0.7)",
                }} />
                <span style={{
                  fontSize: 10, fontWeight: 700,
                  fontFamily: "'Outfit', sans-serif",
                  color: "#F59E0B",
                  letterSpacing: "0.06em",
                  textTransform: "uppercase",
                }}>
                  Cortex · Load Sensing
                </span>
              </div>
              <button
                onClick={() => setDismissed(true)}
                style={{
                  background: "none", border: "none", cursor: "pointer",
                  color: "rgba(255,255,255,0.3)", fontSize: 13, lineHeight: 1, padding: 2,
                }}
              >
                <i className="fa-solid fa-xmark" />
              </button>
            </div>

            {/* Message */}
            <p style={{
              margin: "0 0 13px 0",
              fontSize: 12,
              fontFamily: "'Outfit', sans-serif",
              color: "rgba(255,255,255,0.55)",
              lineHeight: 1.55,
            }}>
              High context-switching detected — load score{" "}
              <strong style={{ color: "#F59E0B" }}>{score}</strong>.{" "}
              Consider entering Focus Tunnel to reclaim your attention.
            </p>

            {/* Action buttons */}
            <div style={{ display: "flex", gap: 8 }}>
              <button
                onClick={() => { onSuggestFocus?.(); setDismissed(true); }}
                style={{
                  flex: 1, padding: "7px 0", borderRadius: 8,
                  background: "rgba(0,240,255,0.1)",
                  border: "1px solid rgba(0,240,255,0.3)",
                  color: "#00F0FF", fontSize: 11, fontWeight: 600,
                  fontFamily: "'Outfit', sans-serif", cursor: "pointer",
                  transition: "background 0.15s",
                }}
              >
                <i className="fa-solid fa-brain" style={{ marginRight: 5 }} />
                Focus Tunnel
              </button>
              <button
                onClick={() => { openApp("tasks"); setDismissed(true); }}
                style={{
                  flex: 1, padding: "7px 0", borderRadius: 8,
                  background: "rgba(255,255,255,0.04)",
                  border: "1px solid rgba(255,255,255,0.1)",
                  color: "rgba(255,255,255,0.45)", fontSize: 11,
                  fontFamily: "'Outfit', sans-serif", cursor: "pointer",
                  transition: "background 0.15s",
                }}
              >
                <i className="fa-solid fa-list-check" style={{ marginRight: 5 }} />
                View Tasks
              </button>
            </div>
          </motion.div>
        )}
      </AnimatePresence>
    </>
  );
}
