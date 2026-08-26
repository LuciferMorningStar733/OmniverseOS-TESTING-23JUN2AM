import React, { useState } from "react";
import { motion, AnimatePresence } from "framer-motion";

export default function CortexPill({ onOpenApp, onQuerySubmit }) {
  const [active, setActive] = useState(false);
  const [inputVal, setInputVal] = useState("");
  const [isThinking, setIsThinking] = useState(false);
  const [thinkingStep, setThinkingStep] = useState(0);

  const thinkingSteps = [
    "Mapping your situation...",
    "Checking your context...",
    "Connecting 3 related memories...",
    "Answer ready",
  ];

  const handleSubmit = (e) => {
    e.preventDefault();
    if (!inputVal.trim()) return;
    setIsThinking(true);
    setThinkingStep(0);

    const timer1 = setTimeout(() => setThinkingStep(1), 600);
    const timer2 = setTimeout(() => setThinkingStep(2), 1200);
    const timer3 = setTimeout(() => {
      setThinkingStep(3);
      setTimeout(() => {
        setIsThinking(false);
        if (onQuerySubmit) onQuerySubmit(inputVal);
        else if (onOpenApp) onOpenApp("cortex");
        setInputVal("");
        setActive(false);
      }, 400);
    }, 1800);

    return () => {
      clearTimeout(timer1);
      clearTimeout(timer2);
      clearTimeout(timer3);
    };
  };

  return (
    <div
      style={{
        position: "fixed",
        bottom: 20,
        left: "50%",
        transform: "translateX(-50%)",
        zIndex: 120,
        width: "calc(100% - 32px)",
        maxWidth: 420,
        pointerEvents: "auto",
      }}
      data-testid="cortex-pill-container"
    >
      <AnimatePresence mode="wait">
        {!active ? (
          /* RESTING PILL */
          <motion.div
            key="resting-pill"
            initial={{ scale: 0.9, opacity: 0 }}
            animate={{ scale: 1, opacity: 1 }}
            exit={{ scale: 0.9, opacity: 0 }}
            onClick={() => setActive(true)}
            onDoubleClick={() => {
              setActive(true);
              if (onOpenApp) onOpenApp("voice");
            }}
            whileTap={{ scale: 0.95 }}
            style={{
              padding: "12px 20px",
              borderRadius: 30,
              background: "rgba(8, 12, 24, 0.92)",
              border: "1px solid rgba(0, 240, 255, 0.3)",
              boxShadow: "0 10px 30px rgba(0, 0, 0, 0.8), 0 0 20px rgba(0, 240, 255, 0.2)",
              backdropFilter: "blur(20px)",
              display: "flex",
              alignItems: "center",
              justifyContent: "space-between",
              cursor: "pointer",
            }}
            data-testid="cortex-pill-resting"
          >
            <div style={{ display: "flex", alignItems: "center", gap: 10 }}>
              <motion.div
                animate={{ scale: [1, 1.25, 1], opacity: [0.8, 1, 0.8] }}
                transition={{ duration: 2, repeat: Infinity, ease: "easeInOut" }}
                style={{
                  width: 10,
                  height: 10,
                  borderRadius: "50%",
                  background: "#00F0FF",
                  boxShadow: "0 0 12px #00F0FF",
                }}
              />
              <span style={{ fontSize: 13, fontWeight: 800, color: "#fff", letterSpacing: "0.04em" }}>
                ✦ Cortex Standing By
              </span>
            </div>

            <div style={{ display: "flex", alignItems: "center", gap: 12 }}>
              <i className="fa-solid fa-microphone" style={{ color: "rgba(255,255,255,0.6)", fontSize: 13 }} />
              <i className="fa-solid fa-chevron-up" style={{ color: "#00F0FF", fontSize: 11 }} />
            </div>
          </motion.div>
        ) : (
          /* EXPANDED ACTIVE INTERACTION SURFACE */
          <motion.div
            key="active-surface"
            initial={{ opacity: 0, y: 20, scale: 0.95 }}
            animate={{ opacity: 1, y: 0, scale: 1 }}
            exit={{ opacity: 0, y: 20, scale: 0.95 }}
            style={{
              padding: 16,
              borderRadius: 24,
              background: "rgba(6, 9, 18, 0.96)",
              border: "1px solid rgba(0, 240, 255, 0.4)",
              boxShadow: "0 20px 60px rgba(0, 0, 0, 0.9), 0 0 40px rgba(0, 240, 255, 0.25)",
              backdropFilter: "blur(30px)",
              display: "flex",
              flexDirection: "column",
              gap: 12,
            }}
            data-testid="cortex-pill-active"
          >
            {/* Header / Dismiss */}
            <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center" }}>
              <div style={{ fontSize: 11, fontFamily: "monospace", color: "#00F0FF", fontWeight: 800 }}>
                CORTEX INTELLIGENCE SURFACE
              </div>
              <button
                onClick={() => setActive(false)}
                style={{ background: "none", border: "none", color: "rgba(255,255,255,0.5)", cursor: "pointer" }}
              >
                <i className="fa-solid fa-xmark" />
              </button>
            </div>

            {/* Thinking Status or Input */}
            {isThinking ? (
              <div style={{ padding: "16px 0", textAlign: "center" }}>
                <motion.div
                  animate={{ scale: [1, 1.1, 1] }}
                  transition={{ duration: 0.8, repeat: Infinity }}
                  style={{ fontSize: 13, fontWeight: 800, color: "#00F0FF", marginBottom: 6 }}
                >
                  {thinkingSteps[thinkingStep]}
                </motion.div>
                <div style={{ fontSize: 10, fontFamily: "monospace", color: "rgba(255,255,255,0.5)" }}>
                  PROCESSING CONTEXTUAL MEMORY
                </div>
              </div>
            ) : (
              <form onSubmit={handleSubmit} style={{ display: "flex", gap: 8 }}>
                <input
                  type="text"
                  autoFocus
                  placeholder="Ask Cortex anything or state a problem..."
                  value={inputVal}
                  onChange={(e) => setInputVal(e.target.value)}
                  style={{
                    flex: 1,
                    padding: "10px 14px",
                    borderRadius: 14,
                    background: "rgba(255,255,255,0.05)",
                    border: "1px solid rgba(255,255,255,0.12)",
                    color: "#fff",
                    fontSize: 13,
                    outline: "none",
                  }}
                />
                <button
                  type="submit"
                  style={{
                    padding: "10px 16px",
                    borderRadius: 14,
                    background: "linear-gradient(135deg, #00F0FF, #7B2FFF)",
                    color: "#000",
                    fontWeight: 900,
                    border: "none",
                    cursor: "pointer",
                  }}
                >
                  <i className="fa-solid fa-paper-plane" />
                </button>
              </form>
            )}

            {/* Quick Action Chips */}
            <div style={{ display: "flex", gap: 6, flexWrap: "wrap" }}>
              {["Focus Mode", "Black Box", "Mirror Reality", "Voice Assistant"].map((chip) => (
                <button
                  key={chip}
                  onClick={() => {
                    if (chip === "Focus Mode" && onOpenApp) onOpenApp("focus");
                    if (chip === "Black Box" && onOpenApp) onOpenApp("blackbox");
                    if (chip === "Mirror Reality" && onOpenApp) onOpenApp("mirror");
                    if (chip === "Voice Assistant" && onOpenApp) onOpenApp("voice");
                    setActive(false);
                  }}
                  style={{
                    padding: "6px 12px",
                    borderRadius: 10,
                    background: "rgba(255,255,255,0.04)",
                    border: "1px solid rgba(255,255,255,0.1)",
                    color: "rgba(255,255,255,0.75)",
                    fontSize: 10,
                    fontWeight: 700,
                    cursor: "pointer",
                  }}
                >
                  {chip}
                </button>
              ))}
            </div>
          </motion.div>
        )}
      </AnimatePresence>
    </div>
  );
}
