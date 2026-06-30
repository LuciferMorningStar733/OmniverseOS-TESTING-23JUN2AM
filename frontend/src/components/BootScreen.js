import React, { useEffect, useState } from "react";
import { motion, AnimatePresence } from "framer-motion";

const LS_BOOTED = "omniverse_has_booted";

const STEPS = [
  "Initializing Cortex...",
  "Loading Workspace...",
  "Restoring Memory...",
  "Connecting Weather...",
  "Synchronizing Desktop...",
  "Ready.",
];

/** Returns true if this is the very first boot (clears the flag after reading) */
export function isFirstBoot() {
  const booted = localStorage.getItem(LS_BOOTED);
  if (!booted) {
    localStorage.setItem(LS_BOOTED, "1");
    return true;
  }
  return false;
}

export default function BootScreen({ onComplete }) {
  const [stepIndex, setStepIndex] = useState(0);
  const [done, setDone] = useState(false);

  useEffect(() => {
    // Cycle through steps
    const step = STEPS[stepIndex];
    const isLast = stepIndex >= STEPS.length - 1;
    const delay = step === "Ready." ? 700 : 420;

    const t = setTimeout(() => {
      if (isLast) {
        setDone(true);
        setTimeout(() => onComplete(), 700);
      } else {
        setStepIndex((i) => i + 1);
      }
    }, delay);

    return () => clearTimeout(t);
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
          {/* Ambient glow */}
          <div style={{
            position: "absolute",
            top: "30%",
            left: "50%",
            transform: "translate(-50%,-50%)",
            width: 400,
            height: 400,
            borderRadius: "50%",
            background: "radial-gradient(circle, rgba(0,240,255,0.06) 0%, transparent 70%)",
            pointerEvents: "none",
          }} />

          {/* Logo */}
          <motion.div
            initial={{ opacity: 0, scale: 0.85 }}
            animate={{ opacity: 1, scale: 1 }}
            transition={{ type: "spring", stiffness: 260, damping: 22, delay: 0.1 }}
            style={{
              width: 72,
              height: 72,
              borderRadius: 20,
              background: "linear-gradient(135deg, #00F0FF, #7B2FFF)",
              display: "flex",
              alignItems: "center",
              justifyContent: "center",
              marginBottom: 32,
              boxShadow: "0 0 60px rgba(0,240,255,0.25), 0 0 120px rgba(123,47,255,0.15)",
            }}
          >
            <i className="fa-solid fa-infinity" style={{ color: "#000", fontSize: 28 }} />
          </motion.div>

          {/* OS Name */}
          <motion.div
            initial={{ opacity: 0, y: 8 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ delay: 0.25, duration: 0.4 }}
            style={{
              fontFamily: "'Unbounded', sans-serif",
              fontSize: 22,
              fontWeight: 700,
              color: "#fff",
              letterSpacing: "0.05em",
              marginBottom: 8,
            }}
          >
            OmniverseOS
          </motion.div>

          <motion.div
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            transition={{ delay: 0.4 }}
            style={{
              fontFamily: "monospace",
              fontSize: 10,
              letterSpacing: "0.22em",
              color: "rgba(0,240,255,0.45)",
              textTransform: "uppercase",
              marginBottom: 48,
            }}
          >
            v1.0 · FINAL RELEASE
          </motion.div>

          {/* Steps */}
          <div style={{ width: 280, height: 24 }}>
            <AnimatePresence mode="wait">
              <motion.div
                key={stepIndex}
                initial={{ opacity: 0, y: 6 }}
                animate={{ opacity: 1, y: 0 }}
                exit={{ opacity: 0, y: -6 }}
                transition={{ duration: 0.22 }}
                style={{
                  fontFamily: "monospace",
                  fontSize: 12,
                  color: STEPS[stepIndex] === "Ready."
                    ? "#39FF14"
                    : "rgba(0,240,255,0.7)",
                  textAlign: "center",
                  letterSpacing: "0.05em",
                }}
              >
                {STEPS[stepIndex]}
              </motion.div>
            </AnimatePresence>
          </div>

          {/* Progress bar */}
          <div style={{ width: 200, height: 2, background: "rgba(255,255,255,0.07)", borderRadius: 1, marginTop: 20, overflow: "hidden" }}>
            <motion.div
              animate={{ width: `${((stepIndex + 1) / STEPS.length) * 100}%` }}
              transition={{ type: "spring", stiffness: 180, damping: 24 }}
              style={{ height: "100%", background: "linear-gradient(to right, #00F0FF, #7B2FFF)", borderRadius: 1 }}
            />
          </div>
        </motion.div>
      )}
    </AnimatePresence>
  );
}
