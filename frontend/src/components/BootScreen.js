import React, { useEffect, useRef, useState } from "react";
import { motion, AnimatePresence } from "framer-motion";

const LS_BOOTED = "omniverse_has_booted";

const STEPS = [
  "Initializing Cortex...",
  "Loading Neural Core...",
  "Restoring Memory...",
  "Connecting Weather...",
  "Synchronizing Desktop...",
  "Systems Online.",
];

/** Returns true only on the very first visit ever (sets flag immediately). */
export function isFirstBoot() {
  const booted = localStorage.getItem(LS_BOOTED);
  if (!booted) {
    localStorage.setItem(LS_BOOTED, "1");
    return true;
  }
  return false;
}

/** Dev utility — clear the flag so boot shows on next load. */
export function resetBootFlag() {
  localStorage.removeItem(LS_BOOTED);
}

export default function BootScreen({ onComplete }) {
  const [stepIndex, setStepIndex] = useState(0);
  const [done, setDone]           = useState(false);

  // Store all timer IDs so we can clean them up on unmount
  const t1 = useRef(null);
  const t2 = useRef(null);

  useEffect(() => {
    return () => {
      clearTimeout(t1.current);
      clearTimeout(t2.current);
    };
  }, []);

  useEffect(() => {
    clearTimeout(t1.current);
    clearTimeout(t2.current);

    const isLast = stepIndex >= STEPS.length - 1;
    const delay  = STEPS[stepIndex] === "Systems Online." ? 650 : 400;

    t1.current = setTimeout(() => {
      if (isLast) {
        setDone(true);
        t2.current = setTimeout(() => onComplete(), 600);
      } else {
        setStepIndex((i) => i + 1);
      }
    }, delay);

    return () => {
      clearTimeout(t1.current);
      clearTimeout(t2.current);
    };
  }, [stepIndex, onComplete]);

  return (
    <AnimatePresence>
      {!done && (
        <motion.div
          key="boot"
          initial={{ opacity: 1 }}
          exit={{ opacity: 0, scale: 1.02 }}
          transition={{ duration: 0.65, ease: "easeInOut" }}
          style={{
            position: "fixed",
            inset: 0,
            background: "#05050A",
            display: "flex",
            flexDirection: "column",
            alignItems: "center",
            justifyContent: "center",
            zIndex: 9000,
          }}
        >
          {/* Radial ambient glow */}
          <div style={{
            position: "absolute",
            top: "38%",
            left: "50%",
            transform: "translate(-50%,-50%)",
            width: 520,
            height: 520,
            borderRadius: "50%",
            background: "radial-gradient(circle, rgba(0,240,255,0.07) 0%, transparent 68%)",
            pointerEvents: "none",
          }} />

          {/* Hex logo */}
          <motion.div
            initial={{ opacity: 0, scale: 0.7 }}
            animate={{ opacity: 1, scale: 1 }}
            transition={{ type: "spring", stiffness: 220, damping: 18, delay: 0.1 }}
            style={{
              width: 80, height: 80, borderRadius: 22,
              background: "linear-gradient(135deg, #00F0FF, #7B2FFF)",
              display: "flex", alignItems: "center", justifyContent: "center",
              marginBottom: 28,
              boxShadow:
                "0 0 0 1px rgba(0,240,255,0.2), " +
                "0 0 40px rgba(0,240,255,0.3), " +
                "0 0 100px rgba(123,47,255,0.18)",
            }}
          >
            <i className="fa-solid fa-infinity" style={{ color: "#000", fontSize: 30 }} />
          </motion.div>

          {/* OS name */}
          <motion.div
            initial={{ opacity: 0, y: 10 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ delay: 0.28, duration: 0.4 }}
            style={{
              fontFamily: "'Unbounded', sans-serif",
              fontSize: 24, fontWeight: 700, color: "#fff",
              letterSpacing: "0.04em", marginBottom: 6,
            }}
          >
            OmniverseOS
          </motion.div>

          <motion.div
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            transition={{ delay: 0.42 }}
            style={{
              fontFamily: "monospace", fontSize: 10,
              letterSpacing: "0.25em", color: "rgba(0,240,255,0.40)",
              textTransform: "uppercase", marginBottom: 52,
            }}
          >
            v1.0 · FINAL RELEASE
          </motion.div>

          {/* Step text */}
          <div style={{ width: 300, height: 22, textAlign: "center", marginBottom: 22 }}>
            <AnimatePresence mode="wait">
              <motion.div
                key={stepIndex}
                initial={{ opacity: 0, y: 7 }}
                animate={{ opacity: 1, y: 0 }}
                exit={{ opacity: 0, y: -7 }}
                transition={{ duration: 0.20 }}
                style={{
                  fontFamily: "monospace", fontSize: 12,
                  letterSpacing: "0.06em",
                  color: STEPS[stepIndex] === "Systems Online."
                    ? "#39FF14"
                    : "rgba(0,240,255,0.65)",
                }}
              >
                {STEPS[stepIndex]}
              </motion.div>
            </AnimatePresence>
          </div>

          {/* Progress bar */}
          <div style={{
            width: 220, height: 2,
            background: "rgba(255,255,255,0.06)",
            borderRadius: 1, overflow: "hidden",
          }}>
            <motion.div
              animate={{ width: `${((stepIndex + 1) / STEPS.length) * 100}%` }}
              transition={{ type: "spring", stiffness: 160, damping: 22 }}
              style={{
                height: "100%",
                background: "linear-gradient(to right, #00F0FF, #7B2FFF)",
                borderRadius: 1,
              }}
            />
          </div>
        </motion.div>
      )}
    </AnimatePresence>
  );
}
