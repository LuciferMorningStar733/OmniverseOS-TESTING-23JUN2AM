import React from "react";
import { motion } from "framer-motion";

export default function PhaseConfession({ inputText, setInputText, typingAnalysis, onSubmit, isTransitioning }) {
  return (
    <div
      style={{
        width: "100%",
        height: "100%",
        display: "flex",
        flexDirection: "column",
        alignItems: "center",
        justifyContent: "center",
        padding: 24,
        background: "radial-gradient(circle at 50% 40%, rgba(0, 240, 255, 0.06), #030408 80%)",
        position: "relative",
      }}
      data-testid="phase-confession"
    >
      {/* Live Ambient Signals Header */}
      <div style={{ display: "flex", gap: 8, flexWrap: "wrap", justifyContent: "center", marginBottom: 20 }}>
        {typingAnalysis.signals.map((sig, idx) => (
          <motion.span
            key={idx}
            initial={{ opacity: 0, scale: 0.9 }}
            animate={{ opacity: 1, scale: 1 }}
            style={{
              padding: "4px 10px",
              borderRadius: 20,
              background: "rgba(0, 240, 255, 0.08)",
              border: "1px solid rgba(0, 240, 255, 0.25)",
              fontSize: 10,
              fontFamily: "'JetBrains Mono', monospace",
              color: "#00F0FF",
              fontWeight: 700,
              letterSpacing: "0.05em",
            }}
          >
            ● {sig}
          </motion.span>
        ))}
      </div>

      {/* Intimate Input Void */}
      <motion.div
        initial={{ opacity: 0, y: 20 }}
        animate={{ opacity: 1, y: 0 }}
        transition={{ duration: 0.6 }}
        style={{
          width: "100%",
          maxWidth: 680,
          display: "flex",
          flexDirection: "column",
          gap: 16,
        }}
      >
        <div style={{ textAlign: "center", marginBottom: 6 }}>
          <div style={{ fontSize: 11, fontFamily: "monospace", color: "rgba(255,255,255,0.4)", letterSpacing: "0.2em" }}>
            PHASE 1 // THE CONFESSION
          </div>
          <h2 style={{ fontSize: 26, fontWeight: 900, color: "#fff", letterSpacing: "-0.02em", margin: "6px 0 0" }}>
            Tell OmniverseOS something nobody else would understand.
          </h2>
        </div>

        <div style={{ position: "relative" }}>
          <textarea
            data-testid="confession-input"
            rows={5}
            placeholder="Paste your impossible problem, business dilemma, messy code architecture, strategic trade-off, or contradictory decision..."
            value={inputText}
            onChange={(e) => setInputText(e.target.value)}
            style={{
              width: "100%",
              background: "rgba(8, 12, 24, 0.85)",
              border: "1px solid rgba(0, 240, 255, 0.3)",
              borderRadius: 20,
              padding: 20,
              color: "#fff",
              fontSize: 15,
              lineHeight: 1.6,
              outline: "none",
              boxShadow: "0 0 40px rgba(0, 240, 255, 0.12), inset 0 0 20px rgba(0,0,0,0.6)",
              backdropFilter: "blur(20px)",
              fontFamily: "inherit",
              resize: "none",
            }}
          />

          {/* Typing word counter */}
          <div style={{ position: "absolute", bottom: 14, right: 18, fontSize: 11, fontFamily: "monospace", color: "rgba(255,255,255,0.35)" }}>
            {typingAnalysis.wordCount} words indexed
          </div>
        </div>

        <div style={{ display: "flex", justifyContent: "center", marginTop: 8 }}>
          <motion.button
            data-testid="confession-submit"
            disabled={isTransitioning || !inputText.trim()}
            onClick={onSubmit}
            whileHover={{ scale: 1.03 }}
            whileTap={{ scale: 0.96 }}
            style={{
              padding: "15px 36px",
              borderRadius: 16,
              background: "linear-gradient(135deg, #00F0FF, #A855F7)",
              color: "#000",
              fontSize: 14,
              fontWeight: 900,
              border: "none",
              cursor: "pointer",
              boxShadow: "0 0 30px rgba(0, 240, 255, 0.4)",
              display: "flex",
              alignItems: "center",
              gap: 10,
              letterSpacing: "0.05em",
            }}
          >
            {isTransitioning ? (
              <>
                <i className="fa-solid fa-spinner fa-spin" />
                INITIATING REALITY SPLIT…
              </>
            ) : (
              <>
                <i className="fa-solid fa-bolt" />
                ENTER THE OMNIVERSE
              </>
            )}
          </motion.button>
        </div>
      </motion.div>
    </div>
  );
}
