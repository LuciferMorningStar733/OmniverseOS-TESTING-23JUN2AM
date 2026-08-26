import React from "react";
import { motion } from "framer-motion";

export default function IntelligenceCollision({ agentCollisions, onNext }) {
  return (
    <div
      style={{
        width: "100%",
        height: "100%",
        display: "flex",
        flexDirection: "column",
        justifyContent: "space-between",
        padding: 24,
        background: "#030408",
        position: "relative",
      }}
      data-testid="intelligence-collision-phase"
    >
      <div>
        <div style={{ fontSize: 11, fontFamily: "monospace", color: "#FF003C", letterSpacing: "0.2em" }}>
          PHASE 4 // LIVE INTELLIGENCE COLLISION
        </div>
        <h2 style={{ fontSize: 22, fontWeight: 900, color: "#fff", margin: "4px 0" }}>
          Specialist agents actively attack and refine conclusions.
        </h2>
      </div>

      {/* Live Agent Conflict Stream */}
      <div style={{ display: "flex", flexDirection: "column", gap: 14, overflowY: "auto", paddingRight: 4 }}>
        {agentCollisions.exchanges.map((ex, idx) => (
          <motion.div
            key={idx}
            initial={{ opacity: 0, x: -15 }}
            animate={{ opacity: 1, x: 0 }}
            transition={{ delay: 0.15 * idx, duration: 0.3 }}
            style={{
              padding: 16,
              borderRadius: 16,
              background: "rgba(10, 14, 28, 0.85)",
              borderLeft: `4px solid ${ex.color}`,
              boxShadow: `0 0 20px ${ex.color}20`,
            }}
          >
            <div style={{ display: "flex", alignItems: "center", gap: 8, marginBottom: 6 }}>
              <i className={`fa-solid ${ex.avatar}`} style={{ color: ex.color, fontSize: 14 }} />
              <span style={{ fontSize: 13, fontWeight: 800, color: ex.color }}>{ex.speaker}</span>
            </div>
            <div style={{ fontSize: 13, color: "rgba(255,255,255,0.9)", lineHeight: 1.5 }}>
              {ex.claim || ex.challenge || ex.evidence || ex.resolution}
            </div>
          </motion.div>
        ))}
      </div>

      {/* Advance Button */}
      <div style={{ display: "flex", justifyContent: "flex-end" }}>
        <button
          onClick={onNext}
          style={{
            padding: "12px 28px",
            borderRadius: 14,
            background: "linear-gradient(135deg, #FF003C, #A855F7)",
            color: "#fff",
            fontSize: 13,
            fontWeight: 900,
            border: "none",
            cursor: "pointer",
            boxShadow: "0 0 20px rgba(255, 0, 60, 0.4)",
            display: "flex",
            alignItems: "center",
            gap: 8,
          }}
        >
          REVEAL HIDDEN CENTER OF GRAVITY <i className="fa-solid fa-arrow-right" />
        </button>
      </div>
    </div>
  );
}
