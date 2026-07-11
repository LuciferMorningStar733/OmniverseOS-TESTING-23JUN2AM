import React, { useState, useEffect, useRef } from "react";
import { motion, AnimatePresence } from "framer-motion";

/* ── Timing config ───────────────────────────────────────────────────────── */
const STEPS = [
  { id: "cortex",    label: "Initializing Cortex AI",     status: "OK",        bar: "#00F0FF", startAt: 180,  fillMs: 520 },
  { id: "memory",    label: "Loading Memory Engine",       status: "OK",        bar: "#00F0FF", startAt: 750,  fillMs: 460 },
  { id: "neural",    label: "Loading Neural Engine",       status: "OK",        bar: "#00F0FF", startAt: 1260, fillMs: 590 },
  { id: "weather",   label: "Connecting Weather Sensors",  status: "Connected", bar: "#39FF14", startAt: 1900, fillMs: 340 },
  { id: "workspace", label: "Mounting Workspace",          status: "Ready",     bar: "#C778DD", startAt: 2280, fillMs: 420 },
];

const GREETING_AT = 2860;
const EXIT_AT     = 3480;
const DONE_AT     = 3900;

/* ── Helpers ─────────────────────────────────────────────────────────────── */
function getGreeting() {
  const h = new Date().getHours();
  if (h < 12) return "Good morning";
  if (h < 17) return "Good afternoon";
  return "Good evening";
}

function getFirstName(user) {
  if (user?.name)  return user.name.split(" ")[0];
  if (user?.email) return user.email.split("@")[0];
  return "Operator";
}

/* ── Scanline / flicker CSS injected once ────────────────────────────────── */
const BOOT_CSS = `
@keyframes boot-flicker {
  0%,100% { opacity:1 } 92% { opacity:1 } 93% { opacity:0.4 } 94% { opacity:1 }
  97% { opacity:1 } 98% { opacity:0.6 } 99% { opacity:1 }
}
@keyframes boot-blink {
  0%,49% { opacity:1 } 50%,100% { opacity:0 }
}
.boot-flicker { animation: boot-flicker 6s infinite; }
.boot-blink   { animation: boot-blink 0.9s infinite; }
`;

/* ── Component ───────────────────────────────────────────────────────────── */
export default function BootScreen({ user, onComplete }) {
  /* step state: undefined → "filling" → "done" */
  const [stepState, setStepState] = useState({});
  const [greetVisible, setGreetVisible] = useState(false);
  const [exiting,      setExiting]      = useState(false);
  const timers = useRef([]);

  useEffect(() => {
    /* inject CSS once */
    if (!document.getElementById("boot-css")) {
      const s = document.createElement("style");
      s.id = "boot-css";
      s.textContent = BOOT_CSS;
      document.head.appendChild(s);
    }

    STEPS.forEach(step => {
      timers.current.push(
        setTimeout(() => setStepState(s => ({ ...s, [step.id]: "filling" })), step.startAt)
      );
      timers.current.push(
        setTimeout(() => setStepState(s => ({ ...s, [step.id]: "done" })),    step.startAt + step.fillMs)
      );
    });

    timers.current.push(setTimeout(() => setGreetVisible(true), GREETING_AT));
    timers.current.push(setTimeout(() => setExiting(true),      EXIT_AT));
    timers.current.push(setTimeout(() => onComplete(),          DONE_AT));

    return () => timers.current.forEach(clearTimeout);
  }, []); /* eslint-disable-line react-hooks/exhaustive-deps */

  const greeting  = getGreeting();
  const firstName = getFirstName(user);

  return (
    <motion.div
      className="boot-flicker"
      animate={{ opacity: exiting ? 0 : 1 }}
      transition={{ duration: 0.55, ease: "easeInOut" }}
      style={{
        position: "fixed", inset: 0, zIndex: 9999,
        background: "#05050A",
        display: "flex", alignItems: "center", justifyContent: "center",
        overflow: "hidden",
      }}
    >
      {/* Background layers */}
      <div className="absolute inset-0 bg-grid opacity-25 pointer-events-none" />
      <div className="absolute inset-0 scanline pointer-events-none" />
      <div style={{
        position: "absolute", inset: 0, pointerEvents: "none",
        background: "radial-gradient(ellipse 55% 45% at 50% 48%, rgba(0,240,255,0.05) 0%, transparent 70%)",
      }} />

      {/* Corner decorations */}
      {[
        { top: 20, left: 20,  borderTop: "1px solid rgba(0,240,255,0.2)", borderLeft:  "1px solid rgba(0,240,255,0.2)" },
        { top: 20, right: 20, borderTop: "1px solid rgba(0,240,255,0.2)", borderRight: "1px solid rgba(0,240,255,0.2)" },
        { bottom: 20, left: 20,  borderBottom: "1px solid rgba(0,240,255,0.2)", borderLeft:  "1px solid rgba(0,240,255,0.2)" },
        { bottom: 20, right: 20, borderBottom: "1px solid rgba(0,240,255,0.2)", borderRight: "1px solid rgba(0,240,255,0.2)" },
      ].map((s, i) => (
        <div key={i} style={{ position: "absolute", width: 20, height: 20, ...s }} />
      ))}

      {/* Content panel */}
      <div style={{ width: "100%", maxWidth: 460, padding: "0 28px" }}>

        {/* ── Logo header ─────────────────────────────────────────────── */}
        <motion.div
          initial={{ opacity: 0, y: -14 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ duration: 0.55, ease: "easeOut" }}
          style={{ marginBottom: 44, textAlign: "center" }}
        >
          <div style={{
            width: 60, height: 60, borderRadius: 18, margin: "0 auto 18px",
            display: "flex", alignItems: "center", justifyContent: "center",
            background: "linear-gradient(135deg, #00F0FF, #FF003C)",
            boxShadow: "0 0 50px rgba(0,240,255,0.28), 0 0 100px rgba(0,240,255,0.10)",
          }}>
            <i className="fa-solid fa-infinity" style={{ color: "#000", fontSize: 24 }} />
          </div>

          <div style={{
            fontFamily: "'JetBrains Mono', monospace",
            fontSize: 11, letterSpacing: "0.38em",
            color: "rgba(0,240,255,0.75)", textTransform: "uppercase", marginBottom: 5,
          }}>
            OMNIVERSE AI CORE
          </div>
          <div style={{
            fontFamily: "'JetBrains Mono', monospace",
            fontSize: 9.5, letterSpacing: "0.22em",
            color: "rgba(255,255,255,0.22)",
          }}>
            v2.0 — BOOT SEQUENCE
          </div>
        </motion.div>

        {/* ── Boot steps ──────────────────────────────────────────────── */}
        <div style={{ display: "flex", flexDirection: "column", gap: 18 }}>
          {STEPS.map(step => {
            const state    = stepState[step.id];
            const visible  = state !== undefined;
            const filling  = state === "filling";
            const done     = state === "done";
            const fillSecs = step.fillMs / 1000;

            if (!visible) return null;

            return (
              <motion.div
                key={step.id}
                initial={{ opacity: 0, x: -12 }}
                animate={{ opacity: 1, x: 0 }}
                transition={{ duration: 0.22, ease: "easeOut" }}
              >
                {/* Label + status row */}
                <div style={{
                  display: "flex", justifyContent: "space-between",
                  alignItems: "center", marginBottom: 6,
                }}>
                  <span style={{
                    fontFamily: "'JetBrains Mono', monospace",
                    fontSize: 11,
                    color: done ? "rgba(255,255,255,0.42)" : "#E2E8F0",
                    letterSpacing: "0.015em",
                    transition: "color 0.4s",
                  }}>
                    {step.label}
                  </span>

                  <span style={{
                    fontFamily: "'JetBrains Mono', monospace",
                    fontSize: 9.5, letterSpacing: "0.12em",
                    color: done
                      ? (step.bar === "#39FF14" ? "#39FF14" : step.bar === "#C778DD" ? "#C778DD" : "#39FF14")
                      : "rgba(0,240,255,0.35)",
                    minWidth: 60, textAlign: "right",
                  }}>
                    {done
                      ? step.status
                      : <span className="boot-blink">▌</span>
                    }
                  </span>
                </div>

                {/* Track */}
                <div style={{
                  height: 3, background: "rgba(255,255,255,0.05)",
                  borderRadius: 2, overflow: "hidden", position: "relative",
                }}>
                  {/* Fill bar */}
                  <motion.div
                    initial={{ width: "0%" }}
                    animate={{ width: (filling || done) ? "100%" : "0%" }}
                    transition={{ duration: fillSecs, ease: "linear" }}
                    style={{
                      position: "absolute", inset: 0,
                      background: done
                        ? (step.bar === "#39FF14"
                            ? "linear-gradient(90deg, #39FF14, rgba(57,255,20,0.6))"
                            : step.bar === "#C778DD"
                              ? "linear-gradient(90deg, #C778DD, rgba(199,120,221,0.6))"
                              : "linear-gradient(90deg, #39FF14, rgba(57,255,20,0.6))")
                        : `linear-gradient(90deg, ${step.bar}, rgba(0,240,255,0.5))`,
                      borderRadius: 2,
                      boxShadow: done ? "none" : `0 0 8px ${step.bar}80`,
                    }}
                  />
                  {/* Shimmer on active bar */}
                  {filling && (
                    <motion.div
                      animate={{ x: ["-100%", "200%"] }}
                      transition={{ duration: fillSecs * 0.8, ease: "easeInOut", repeat: Infinity }}
                      style={{
                        position: "absolute", top: 0, bottom: 0, width: "30%",
                        background: "linear-gradient(90deg, transparent, rgba(255,255,255,0.35), transparent)",
                        borderRadius: 2,
                      }}
                    />
                  )}
                </div>
              </motion.div>
            );
          })}
        </div>

        {/* ── Greeting ────────────────────────────────────────────────── */}
        <AnimatePresence>
          {greetVisible && (
            <motion.div
              initial={{ opacity: 0, y: 20 }}
              animate={{ opacity: 1, y: 0 }}
              transition={{ duration: 0.65, ease: "easeOut" }}
              style={{ marginTop: 52, textAlign: "center" }}
            >
              {/* Divider */}
              <div style={{
                display: "flex", alignItems: "center", gap: 10, marginBottom: 24,
              }}>
                <div style={{ flex: 1, height: 1, background: "rgba(0,240,255,0.12)" }} />
                <span style={{
                  fontFamily: "'JetBrains Mono', monospace",
                  fontSize: 9, letterSpacing: "0.22em",
                  color: "rgba(0,240,255,0.45)", textTransform: "uppercase",
                }}>SYSTEM READY</span>
                <div style={{ flex: 1, height: 1, background: "rgba(0,240,255,0.12)" }} />
              </div>

              <div style={{
                fontFamily: "Outfit, sans-serif",
                fontSize: 13, fontWeight: 400, letterSpacing: "0.06em",
                color: "rgba(255,255,255,0.45)", textTransform: "uppercase",
                marginBottom: 8,
              }}>
                {greeting}
              </div>
              <div style={{
                fontFamily: "Outfit, sans-serif",
                fontSize: 38, fontWeight: 800,
                letterSpacing: "-0.03em", lineHeight: 1.1,
                background: "linear-gradient(135deg, #FFFFFF 30%, rgba(0,240,255,0.85))",
                WebkitBackgroundClip: "text", WebkitTextFillColor: "transparent",
                backgroundClip: "text",
              }}>
                {firstName}
              </div>
            </motion.div>
          )}
        </AnimatePresence>

      </div>

      {/* Bottom status bar */}
      <div style={{
        position: "absolute", bottom: 28, left: 28, right: 28,
        display: "flex", alignItems: "center", justifyContent: "space-between",
      }}>
        <span style={{
          fontFamily: "'JetBrains Mono', monospace",
          fontSize: 9, letterSpacing: "0.2em",
          color: "rgba(255,255,255,0.15)", textTransform: "uppercase",
        }}>
          OmniverseOS — Secure Boot
        </span>
        <span style={{
          fontFamily: "'JetBrains Mono', monospace",
          fontSize: 9, letterSpacing: "0.15em",
          color: "rgba(0,240,255,0.25)",
        }}>
          {Object.values(stepState).filter(v => v === "done").length}/{STEPS.length} MODULES
        </span>
      </div>
    </motion.div>
  );
}
