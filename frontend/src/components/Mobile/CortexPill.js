import React, { useState } from "react";
import { motion, AnimatePresence } from "framer-motion";

export default function CortexPill({ onOpenApp, onQuerySubmit }) {
  const [active, setActive] = useState(false);
  const [inputVal, setInputVal] = useState("");
  const [isThinking, setIsThinking] = useState(false);
  const [thinkingStep, setThinkingStep] = useState(0);

  const thinkingSteps = [
    "Mapping prompt context...",
    "Querying neural vector memory...",
    "Connecting 4 agent deliberators...",
    "Answer formulated",
  ];

  const handleSubmit = (e) => {
    e.preventDefault();
    const query = inputVal.trim();
    if (!query) return;

    setIsThinking(true);
    setThinkingStep(0);

    const timer1 = setTimeout(() => setThinkingStep(1), 350);
    const timer2 = setTimeout(() => setThinkingStep(2), 750);
    const timer3 = setTimeout(() => {
      setThinkingStep(3);
      setTimeout(() => {
        setIsThinking(false);
        if (onQuerySubmit) onQuerySubmit(query);
        else if (onOpenApp) onOpenApp("chat");
        setInputVal("");
        setActive(false);
      }, 300);
    }, 1100);

    return () => {
      clearTimeout(timer1);
      clearTimeout(timer2);
      clearTimeout(timer3);
    };
  };

  const handleChipClick = (chipPrompt) => {
    if (onQuerySubmit) onQuerySubmit(chipPrompt);
    else if (onOpenApp) onOpenApp("chat");
    setActive(false);
  };

  return (
    <div
      style={{
        position: "fixed",
        bottom: 24,
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
          /* ── RESTING PILL ─────────────────────────────────────────────── */
          <motion.div
            key="resting-pill"
            initial={{ scale: 0.95, opacity: 0 }}
            animate={{ scale: 1, opacity: 1 }}
            exit={{ scale: 0.95, opacity: 0 }}
            onClick={() => setActive(true)}
            whileTap={{ scale: 0.96 }}
            style={{
              padding: "10px 18px",
              borderRadius: 30,
              background: "rgba(6, 10, 24, 0.94)",
              border: "1px solid rgba(0, 240, 255, 0.4)",
              boxShadow: "0 8px 30px rgba(0, 0, 0, 0.8), 0 0 20px rgba(0, 240, 255, 0.25)",
              backdropFilter: "blur(24px)",
              display: "flex",
              alignItems: "center",
              justifyContent: "space-between",
              cursor: "pointer",
            }}
            data-testid="cortex-pill-resting"
          >
            <div style={{ display: "flex", alignItems: "center", gap: 10 }}>
              {/* Dynamic waveform pulse */}
              <div style={{ display: "flex", alignItems: "center", gap: 2 }}>
                {[8, 14, 18, 12, 6].map((h, i) => (
                  <motion.div
                    key={i}
                    animate={{ height: [h * 0.4, h, h * 0.4] }}
                    transition={{ duration: 1.2, repeat: Infinity, delay: i * 0.15 }}
                    style={{
                      width: 2.5,
                      borderRadius: 2,
                      background: "#00F0FF",
                      boxShadow: "0 0 6px #00F0FF",
                    }}
                  />
                ))}
              </div>
              <span style={{ fontSize: 13, fontWeight: 800, color: "#fff", letterSpacing: "0.02em" }}>
                ✦ Cortex Command
              </span>
            </div>

            <div style={{ display: "flex", alignItems: "center", gap: 8 }}>
              <span
                style={{
                  fontSize: 10,
                  fontFamily: "monospace",
                  color: "rgba(0, 240, 255, 0.7)",
                  background: "rgba(0, 240, 255, 0.1)",
                  padding: "2px 8px",
                  borderRadius: 10,
                }}
              >
                TAP TO PROMPT
              </span>
              <div
                style={{
                  width: 28,
                  height: 28,
                  borderRadius: "50%",
                  background: "rgba(0, 240, 255, 0.15)",
                  border: "1px solid rgba(0, 240, 255, 0.3)",
                  display: "flex",
                  alignItems: "center",
                  justifyContent: "center",
                  color: "#00F0FF",
                }}
              >
                <i className="fa-solid fa-microphone" style={{ fontSize: 11 }} />
              </div>
            </div>
          </motion.div>
        ) : (
          /* ── EXPANDED PILL ────────────────────────────────────────────── */
          <motion.div
            key="expanded-pill"
            initial={{ scale: 0.95, opacity: 0, y: 10 }}
            animate={{ scale: 1, opacity: 1, y: 0 }}
            exit={{ scale: 0.95, opacity: 0, y: 10 }}
            style={{
              padding: "16px",
              borderRadius: 24,
              background: "rgba(6, 10, 24, 0.98)",
              border: "1.5px solid #00F0FF",
              boxShadow: "0 16px 50px rgba(0, 0, 0, 0.9), 0 0 30px rgba(0, 240, 255, 0.35)",
              backdropFilter: "blur(28px)",
              display: "flex",
              flexDirection: "column",
              gap: 12,
            }}
          >
            {/* Header */}
            <div style={{ display: "flex", alignItems: "center", justifyContent: "space-between" }}>
              <div style={{ display: "flex", alignItems: "center", gap: 8 }}>
                <div style={{ width: 8, height: 8, borderRadius: "50%", background: "#00F0FF", boxShadow: "0 0 10px #00F0FF" }} />
                <span style={{ fontSize: 11, fontFamily: "monospace", color: "#00F0FF", letterSpacing: "0.1em", fontWeight: 800 }}>
                  CORTEX NEURAL DISPATCH
                </span>
              </div>
              <button
                onClick={() => setActive(false)}
                style={{
                  width: 24,
                  height: 24,
                  borderRadius: "50%",
                  background: "rgba(255, 255, 255, 0.08)",
                  border: "none",
                  color: "rgba(255, 255, 255, 0.6)",
                  display: "flex",
                  alignItems: "center",
                  justifyContent: "center",
                  cursor: "pointer",
                }}
              >
                <i className="fa-solid fa-xmark" style={{ fontSize: 11 }} />
              </button>
            </div>

            {/* Input Form */}
            <form onSubmit={handleSubmit} style={{ display: "flex", gap: 8 }}>
              <input
                autoFocus
                type="text"
                placeholder={isThinking ? thinkingSteps[thinkingStep] : "What do you need Cortex to solve?"}
                value={inputVal}
                onChange={(e) => setInputVal(e.target.value)}
                disabled={isThinking}
                style={{
                  flex: 1,
                  padding: "10px 14px",
                  borderRadius: 16,
                  background: "rgba(255, 255, 255, 0.06)",
                  border: "1px solid rgba(0, 240, 255, 0.3)",
                  color: "#fff",
                  fontSize: 13,
                  outline: "none",
                }}
              />
              <button
                type="submit"
                disabled={!inputVal.trim() || isThinking}
                style={{
                  padding: "0 16px",
                  borderRadius: 16,
                  background: inputVal.trim() && !isThinking
                    ? "linear-gradient(135deg, #00F0FF, #39FF14)"
                    : "rgba(255, 255, 255, 0.1)",
                  border: "none",
                  color: "#000",
                  fontWeight: 900,
                  fontSize: 12,
                  cursor: inputVal.trim() ? "pointer" : "default",
                }}
              >
                {isThinking ? (
                  <i className="fa-solid fa-spinner fa-spin" />
                ) : (
                  <i className="fa-solid fa-arrow-right" />
                )}
              </button>
            </form>

            {/* Quick Action Chips */}
            <div style={{ display: "flex", gap: 6, flexWrap: "wrap" }}>
              {[
                "Quantum Decoherence",
                "Startup Stress Test",
                "Microgrid Dispatch",
                "Generate Cyber City",
              ].map((chip) => (
                <button
                  key={chip}
                  onClick={() => handleChipClick(chip)}
                  style={{
                    fontSize: 10.5,
                    padding: "4px 9px",
                    borderRadius: 8,
                    background: "rgba(255, 255, 255, 0.05)",
                    border: "1px solid rgba(255, 255, 255, 0.1)",
                    color: "rgba(255, 255, 255, 0.8)",
                    cursor: "pointer",
                  }}
                >
                  ✦ {chip}
                </button>
              ))}
            </div>
          </motion.div>
        )}
      </AnimatePresence>
    </div>
  );
}
