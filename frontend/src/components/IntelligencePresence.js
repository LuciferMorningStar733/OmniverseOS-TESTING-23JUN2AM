import React from "react";
import { motion } from "framer-motion";

export default function IntelligencePresence({ state = "CALM" }) {
  // State definitions
  const configs = {
    CALM: { color: "#00F0FF", label: "CORTEX LINKED", pulse: false },
    THINKING: { color: "#00F0FF", label: "ANALYZING...", pulse: true },
    MULTI_AGENT: { color: "#A855F7", label: "3 AGENTS REASONING", pulse: true },
    HIGH_CONFIDENCE: { color: "#F59E0B", label: "INSIGHT DETECTED", pulse: false },
    WARNING: { color: "#FF003C", label: "TENSION DETECTED", pulse: true },
  };

  const current = configs[state] || configs.CALM;

  return (
    <div
      style={{
        display: "flex",
        alignItems: "center",
        gap: 8,
        padding: "4px 10px",
        borderRadius: 20,
        background: "rgba(255, 255, 255, 0.03)",
        border: `1px solid ${current.color}35`,
        backdropFilter: "blur(12px)",
      }}
      data-testid="intelligence-presence"
    >
      {/* Dynamic Abstract Presence Node */}
      <motion.div
        animate={
          current.pulse
            ? { scale: [1, 1.2, 1], opacity: [0.7, 1, 0.7] }
            : { scale: 1, opacity: 1 }
        }
        transition={{ duration: 1.5, repeat: current.pulse ? Infinity : 0, ease: "easeInOut" }}
        style={{
          width: 8,
          height: 8,
          borderRadius: "50%",
          background: current.color,
          boxShadow: `0 0 10px ${current.color}`,
        }}
      />

      <span
        style={{
          fontSize: 10,
          fontFamily: "'JetBrains Mono', monospace",
          fontWeight: 800,
          color: "#fff",
          letterSpacing: "0.08em",
        }}
      >
        {current.label}
      </span>
    </div>
  );
}
