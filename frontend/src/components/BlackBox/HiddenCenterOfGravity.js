import React from "react";
import { motion } from "framer-motion";

export default function HiddenCenterOfGravity({ hiddenGravity, onNext }) {
  return (
    <div
      style={{
        width: "100%",
        height: "100%",
        display: "flex",
        flexDirection: "column",
        alignItems: "center",
        justifyContent: "space-between",
        padding: 32,
        background: "#020305",
        position: "relative",
      }}
      data-testid="hidden-gravity-phase"
    >
      <div style={{ textAlign: "center" }}>
        <div style={{ fontSize: 11, fontFamily: "monospace", color: "#00F0FF", letterSpacing: "0.25em" }}>
          PHASE 5 // THE HIDDEN CENTER OF GRAVITY
        </div>
        <div style={{ fontSize: 12, color: "rgba(255,255,255,0.4)", marginTop: 4 }}>
          The real problem beneath your stated problem.
        </div>
      </div>

      {/* Quiet Screenshot-Worthy Revelation Card */}
      <motion.div
        initial={{ opacity: 0, scale: 0.95 }}
        animate={{ opacity: 1, scale: 1 }}
        transition={{ duration: 0.6, ease: "easeOut" }}
        style={{
          width: "100%",
          maxWidth: 600,
          padding: 32,
          borderRadius: 24,
          background: "linear-gradient(135deg, rgba(0,240,255,0.08), rgba(168,85,247,0.08))",
          border: "1px solid rgba(0, 240, 255, 0.4)",
          boxShadow: "0 0 60px rgba(0, 240, 255, 0.2)",
          backdropFilter: "blur(30px)",
          display: "flex",
          flexDirection: "column",
          gap: 16,
        }}
      >
        <div>
          <div style={{ fontSize: 10, fontFamily: "monospace", color: "rgba(255,255,255,0.4)", marginBottom: 4 }}>
            YOU CAME HERE ASKING
          </div>
          <div style={{ fontSize: 14, fontWeight: 700, color: "rgba(255,255,255,0.7)" }}>
            {hiddenGravity.statedQuestion}
          </div>
        </div>

        <div style={{ height: 1, background: "rgba(0, 240, 255, 0.2)" }} />

        <div>
          <div style={{ fontSize: 10, fontFamily: "monospace", color: "#00F0FF", fontWeight: 800, marginBottom: 4 }}>
            BUT THE SYSTEM DISCOVERED
          </div>
          <h3 style={{ fontSize: 20, fontWeight: 900, color: "#fff", lineHeight: 1.4, margin: 0 }}>
            {hiddenGravity.hiddenInsight}
          </h3>
        </div>

        <div style={{ fontSize: 13, color: "rgba(255,255,255,0.75)", lineHeight: 1.6 }}>
          <strong>Why this matters:</strong> {hiddenGravity.whyItMatters}
        </div>
      </motion.div>

      {/* Advance Button */}
      <div>
        <button
          onClick={onNext}
          style={{
            padding: "12px 28px",
            borderRadius: 14,
            background: "linear-gradient(135deg, #00F0FF, #39FF14)",
            color: "#000",
            fontSize: 13,
            fontWeight: 900,
            border: "none",
            cursor: "pointer",
            boxShadow: "0 0 24px rgba(0, 240, 255, 0.4)",
            display: "flex",
            alignItems: "center",
            gap: 8,
          }}
        >
          ENTER FUTURE COLLISION ENGINE <i className="fa-solid fa-arrow-right" />
        </button>
      </div>
    </div>
  );
}
