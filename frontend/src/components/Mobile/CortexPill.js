import React, { useState } from "react";
import { motion, AnimatePresence } from "framer-motion";

/**
 * OmniverseOS — Samsung One UI Cortex Pill
 * - Floating rounded pill bar with One UI blue accent glow
 * - Tactile active state with quick squircle actions
 */
export default function CortexPill({ onOpenApp, onQuerySubmit, embedded = false }) {
  const [active, setActive] = useState(false);
  const [inputVal, setInputVal] = useState("");
  const [isThinking, setIsThinking] = useState(false);
  const [thinkingStep, setThinkingStep] = useState(0);

  const thinkingSteps = [
    "Analyzing prompt context...",
    "Querying Cortex neural memory...",
    "Synthesizing structured response...",
    "Response ready",
  ];

  const handleSubmit = (e) => {
    e.preventDefault();
    const query = inputVal.trim();
    if (!query) return;

    setIsThinking(true);
    setThinkingStep(0);

    const timer1 = setTimeout(() => setThinkingStep(1), 500);
    const timer2 = setTimeout(() => setThinkingStep(2), 1000);
    const timer3 = setTimeout(() => {
      setThinkingStep(3);
      setTimeout(() => {
        setIsThinking(false);
        if (onQuerySubmit) onQuerySubmit(query);
        else if (onOpenApp) onOpenApp("chat");
        setInputVal("");
        setActive(false);
      }, 350);
    }, 1500);

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
      style={embedded ? {
        position: "relative",
        width: "100%",
        maxWidth: 420,
        pointerEvents: "auto",
        fontFamily: "'Outfit', sans-serif",
      } : {
        position: "fixed",
        bottom: "calc(82px + env(safe-area-inset-bottom, 12px))",
        left: "50%",
        transform: "translateX(-50%)",
        zIndex: 120,
        width: "calc(100% - 28px)",
        maxWidth: 420,
        pointerEvents: "auto",
        fontFamily: "'Outfit', sans-serif",
      }}
      data-testid="cortex-pill-container"
    >
      <AnimatePresence mode="wait">
        {!active ? (
          /* ONE UI RESTING PILL */
          <motion.div
            key="resting-pill"
            initial={{ scale: 0.92, opacity: 0 }}
            animate={{ scale: 1, opacity: 1 }}
            exit={{ scale: 0.92, opacity: 0 }}
            onClick={() => setActive(true)}
            onDoubleClick={() => {
              setActive(true);
              if (onOpenApp) onOpenApp("voice");
            }}
            whileTap={{ scale: 0.96 }}
            style={{
              padding: "13px 22px",
              borderRadius: 32,
              background: "rgba(12, 15, 26, 0.95)",
              border: "1px solid rgba(62, 123, 250, 0.35)",
              boxShadow: "0 12px 36px rgba(0, 0, 0, 0.8), 0 0 20px rgba(62, 123, 250, 0.2)",
              backdropFilter: "blur(24px)",
              WebkitBackdropFilter: "blur(24px)",
              display: "flex",
              alignItems: "center",
              justifyContent: "space-between",
              cursor: "pointer",
            }}
            data-testid="cortex-pill-resting"
          >
            <div style={{ display: "flex", alignItems: "center", gap: 11 }}>
              <motion.div
                animate={{ scale: [1, 1.25, 1], opacity: [0.8, 1, 0.8] }}
                transition={{ duration: 2, repeat: Infinity, ease: "easeInOut" }}
                style={{
                  width: 10,
                  height: 10,
                  borderRadius: "50%",
                  background: "#3E7BFA",
                  boxShadow: "0 0 12px #3E7BFA",
                }}
              />
              <span style={{ fontSize: 13.5, fontWeight: 700, color: "#F8FAFC", letterSpacing: "0.02em" }}>
                ✦ Cortex Intelligence
              </span>
            </div>

            <div style={{ display: "flex", alignItems: "center", gap: 12 }}>
              <i className="fa-solid fa-microphone text-slate-400" style={{ fontSize: 13 }} />
              <i className="fa-solid fa-chevron-up text-[#3E7BFA]" style={{ fontSize: 12 }} />
            </div>
          </motion.div>
        ) : (
          /* ONE UI EXPANDED SURFACE */
          <motion.div
            key="active-surface"
            initial={{ opacity: 0, y: 16, scale: 0.95 }}
            animate={{ opacity: 1, y: 0, scale: 1 }}
            exit={{ opacity: 0, y: 16, scale: 0.95 }}
            style={{
              padding: 18,
              borderRadius: 28,
              background: "rgba(10, 13, 24, 0.97)",
              border: "1px solid rgba(62, 123, 250, 0.45)",
              boxShadow: "0 24px 64px rgba(0, 0, 0, 0.9), 0 0 32px rgba(62, 123, 250, 0.25)",
              backdropFilter: "blur(32px)",
              WebkitBackdropFilter: "blur(32px)",
              display: "flex",
              flexDirection: "column",
              gap: 14,
            }}
          >
            {/* Header / Dismiss */}
            <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center" }}>
              <div style={{ fontSize: 11, fontWeight: 700, color: "#3E7BFA", letterSpacing: "0.1em", textTransform: "uppercase" }}>
                Cortex One UI Prompt
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
                  border: "1px solid rgba(62, 123, 250, 0.3)",
                  color: "#fff",
                  fontSize: 13,
                  outline: "none",
                }}
              />
              <button
                type="submit"
                disabled={isThinking || !inputVal.trim()}
                style={{
                  padding: "10px 16px",
                  borderRadius: 16,
                  background: inputVal.trim() ? "#3E7BFA" : "rgba(255, 255, 255, 0.1)",
                  border: "none",
                  color: "#fff",
                  fontWeight: 700,
                  fontSize: 13,
                  cursor: "pointer",
                }}
              >
                Send
              </button>
            </form>

            {/* Quick Action Chips */}
            <div style={{ display: "flex", gap: 6, flexWrap: "wrap" }}>
              {["Summarize Notes", "Deconstruct Problem", "Model Face-Off"].map((chip, idx) => (
                <button
                  key={idx}
                  onClick={() => handleChipClick(chip)}
                  style={{
                    padding: "6px 12px",
                    borderRadius: 14,
                    background: "rgba(62, 123, 250, 0.12)",
                    border: "1px solid rgba(62, 123, 250, 0.25)",
                    color: "#93C5FD",
                    fontSize: 11,
                    fontWeight: 600,
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
