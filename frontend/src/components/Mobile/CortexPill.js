import React, { useState } from "react";
import { motion, AnimatePresence } from "framer-motion";

/**
 * OmniverseOS — Samsung One UI Cortex Pill
 * - Floating rounded pill bar with One UI blue accent glow
 * - Tactile active state with quick squircle actions
 */
export default function CortexPill({ onOpenApp, onQuerySubmit }) {
  const [active, setActive] = useState(false);
  const [inputVal, setInputVal] = useState("");
  const [isThinking, setIsThinking] = useState(false);
  const [thinkingStep, setThinkingStep] = useState(0);

  const thinkingSteps = [
<<<<<<< HEAD
    "Mapping prompt context...",
    "Querying neural vector memory...",
    "Connecting 4 agent deliberators...",
    "Answer formulated",
=======
    "Analyzing prompt context...",
    "Querying Cortex neural memory...",
    "Synthesizing structured response...",
    "Response ready",
>>>>>>> beba0a9 (Revamp mobile UI to Samsung One UI style and verify all AI apps click-by-click with Reticle.)
  ];

  const handleSubmit = (e) => {
    e.preventDefault();
    const query = inputVal.trim();
    if (!query) return;

    setIsThinking(true);
    setThinkingStep(0);

<<<<<<< HEAD
    const timer1 = setTimeout(() => setThinkingStep(1), 350);
    const timer2 = setTimeout(() => setThinkingStep(2), 750);
=======
    const timer1 = setTimeout(() => setThinkingStep(1), 500);
    const timer2 = setTimeout(() => setThinkingStep(2), 1000);
>>>>>>> beba0a9 (Revamp mobile UI to Samsung One UI style and verify all AI apps click-by-click with Reticle.)
    const timer3 = setTimeout(() => {
      setThinkingStep(3);
      setTimeout(() => {
        setIsThinking(false);
        if (onQuerySubmit) onQuerySubmit(query);
        else if (onOpenApp) onOpenApp("chat");
        setInputVal("");
        setActive(false);
<<<<<<< HEAD
      }, 300);
    }, 1100);
=======
      }, 350);
    }, 1500);
>>>>>>> beba0a9 (Revamp mobile UI to Samsung One UI style and verify all AI apps click-by-click with Reticle.)

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
<<<<<<< HEAD
        bottom: 24,
=======
        bottom: "max(18px, env(safe-area-inset-bottom, 18px))",
>>>>>>> beba0a9 (Revamp mobile UI to Samsung One UI style and verify all AI apps click-by-click with Reticle.)
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
<<<<<<< HEAD
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
=======
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
>>>>>>> beba0a9 (Revamp mobile UI to Samsung One UI style and verify all AI apps click-by-click with Reticle.)
              display: "flex",
              alignItems: "center",
              justifyContent: "space-between",
              cursor: "pointer",
            }}
            data-testid="cortex-pill-resting"
          >
<<<<<<< HEAD
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
=======
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
>>>>>>> beba0a9 (Revamp mobile UI to Samsung One UI style and verify all AI apps click-by-click with Reticle.)
              display: "flex",
              flexDirection: "column",
              gap: 14,
            }}
          >
<<<<<<< HEAD
            {/* Header */}
            <div style={{ display: "flex", alignItems: "center", justifyContent: "space-between" }}>
              <div style={{ display: "flex", alignItems: "center", gap: 8 }}>
                <div style={{ width: 8, height: 8, borderRadius: "50%", background: "#00F0FF", boxShadow: "0 0 10px #00F0FF" }} />
                <span style={{ fontSize: 11, fontFamily: "monospace", color: "#00F0FF", letterSpacing: "0.1em", fontWeight: 800 }}>
                  CORTEX NEURAL DISPATCH
                </span>
=======
            {/* Header / Dismiss */}
            <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center" }}>
              <div style={{ fontSize: 11, fontWeight: 700, color: "#3E7BFA", letterSpacing: "0.1em", textTransform: "uppercase" }}>
                Cortex One UI Prompt
>>>>>>> beba0a9 (Revamp mobile UI to Samsung One UI style and verify all AI apps click-by-click with Reticle.)
              </div>
              <button
                onClick={() => setActive(false)}
                style={{
<<<<<<< HEAD
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
=======
                  background: "rgba(255, 255, 255, 0.08)",
                  border: "none",
                  borderRadius: "50%",
                  width: 26,
                  height: 26,
                  color: "#94A3B8",
                  cursor: "pointer",
                  display: "flex",
                  alignItems: "center",
                  justifyContent: "center",
                }}
              >
                <i className="fa-solid fa-xmark" style={{ fontSize: 12 }} />
              </button>
            </div>

            {/* Thinking Status or Input */}
            {isThinking ? (
              <div style={{ padding: "16px 0", textAlign: "center" }}>
                <motion.div
                  animate={{ scale: [1, 1.08, 1] }}
                  transition={{ duration: 0.8, repeat: Infinity }}
                  style={{ fontSize: 13.5, fontWeight: 700, color: "#3E7BFA", marginBottom: 6 }}
                >
                  {thinkingSteps[thinkingStep]}
                </motion.div>
                <div style={{ fontSize: 10.5, color: "#64748B", fontWeight: 600 }}>
                  PROCESSING NEURAL REASONING
                </div>
              </div>
            ) : (
              <form onSubmit={handleSubmit} style={{ display: "flex", gap: 10 }}>
                <input
                  type="text"
                  autoFocus
                  placeholder="Ask Cortex or state a task..."
                  value={inputVal}
                  onChange={(e) => setInputVal(e.target.value)}
                  style={{
                    flex: 1,
                    padding: "11px 16px",
                    borderRadius: 20,
                    background: "rgba(255, 255, 255, 0.06)",
                    border: "1px solid rgba(255, 255, 255, 0.12)",
                    color: "#F8FAFC",
                    fontSize: 13.5,
                    outline: "none",
                  }}
                />
                <button
                  type="submit"
                  style={{
                    padding: "11px 18px",
                    borderRadius: 20,
                    background: "linear-gradient(135deg, #3E7BFA 0%, #6C5CE7 100%)",
                    color: "#FFF",
                    fontWeight: 700,
                    border: "none",
                    cursor: "pointer",
                    boxShadow: "0 4px 16px rgba(62, 123, 250, 0.35)",
                  }}
                >
                  <i className="fa-solid fa-paper-plane" />
                </button>
              </form>
            )}

            {/* Quick Action Chips */}
            <div style={{ display: "flex", gap: 7, flexWrap: "wrap" }}>
              {["Focus Mode", "Black Box", "Mirror Reality", "Voice AI"].map((chip) => (
                <button
                  key={chip}
                  onClick={() => {
                    if (chip === "Focus Mode" && onOpenApp) onOpenApp("focus");
                    if (chip === "Black Box" && onOpenApp) onOpenApp("blackbox");
                    if (chip === "Mirror Reality" && onOpenApp) onOpenApp("mirror");
                    if (chip === "Voice AI" && onOpenApp) onOpenApp("voice");
                    setActive(false);
                  }}
                  style={{
                    padding: "6px 13px",
                    borderRadius: 16,
                    background: "rgba(255, 255, 255, 0.06)",
                    border: "1px solid rgba(255, 255, 255, 0.1)",
                    color: "#CBD5E1",
                    fontSize: 11,
                    fontWeight: 600,
>>>>>>> beba0a9 (Revamp mobile UI to Samsung One UI style and verify all AI apps click-by-click with Reticle.)
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
