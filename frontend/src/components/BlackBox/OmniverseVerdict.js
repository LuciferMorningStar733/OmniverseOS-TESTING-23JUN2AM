import React, { useState } from "react";
import { motion } from "framer-motion";

export default function OmniverseVerdict({ verdictData, onReset }) {
  const [step, setStep] = useState(1);

  const sections = [
    { num: 1, title: "WHAT YOU THINK THE PROBLEM IS", text: verdictData.whatYouThink, color: "#00F0FF" },
    { num: 2, title: "WHAT THE SYSTEM FOUND", text: verdictData.whatSystemFound, color: "#A855F7" },
    { num: 3, title: "THE HIGHEST-LEVERAGE DECISION", text: verdictData.highestLeverageDecision, color: "#39FF14" },
    { num: 4, title: "WHAT YOU ARE STILL MISSING", text: verdictData.whatYouAreMissing, color: "#F59E0B" },
    { num: 5, title: "THE COST OF DOING NOTHING", text: verdictData.costOfDoingNothing, color: "#FF003C" },
    { num: 6, title: "THE FIRST ACTION", text: verdictData.firstAction, color: "#00F0FF" },
  ];

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
      data-testid="omniverse-verdict-phase"
    >
      <div>
        <div style={{ fontSize: 11, fontFamily: "monospace", color: "#39FF14", letterSpacing: "0.2em" }}>
          PHASE 7 // THE OMNIVERSE VERDICT
        </div>
        <h2 style={{ fontSize: 22, fontWeight: 900, color: "#fff", margin: "4px 0" }}>
          The Earned Final Synthesis.
        </h2>
      </div>

      {/* Progressive Unfolding List */}
      <div style={{ display: "flex", flexDirection: "column", gap: 12, overflowY: "auto", paddingRight: 4 }}>
        {sections.slice(0, step).map((sec) => (
          <motion.div
            key={sec.num}
            initial={{ opacity: 0, y: 10 }}
            animate={{ opacity: 1, y: 0 }}
            style={{
              padding: 16,
              borderRadius: 16,
              background: "rgba(10, 14, 28, 0.85)",
              borderLeft: `4px solid ${sec.color}`,
              boxShadow: `0 0 20px ${sec.color}20`,
            }}
          >
            <div style={{ fontSize: 10, fontFamily: "monospace", color: sec.color, fontWeight: 800 }}>
              0{sec.num} // {sec.title}
            </div>
            <div style={{ fontSize: 14, fontWeight: 700, color: "#fff", marginTop: 4, lineHeight: 1.5 }}>
              {sec.text}
            </div>
          </motion.div>
        ))}
      </div>

      {/* Unfold Actions */}
      <div style={{ display: "flex", alignItems: "center", justifyContent: "space-between" }}>
        {step < 6 ? (
          <button
            onClick={() => setStep((s) => s + 1)}
            style={{
              padding: "12px 24px",
              borderRadius: 14,
              background: "linear-gradient(135deg, #39FF14, #00F0FF)",
              color: "#000",
              fontSize: 13,
              fontWeight: 900,
              border: "none",
              cursor: "pointer",
              boxShadow: "0 0 20px rgba(57, 255, 20, 0.4)",
            }}
          >
            UNFOLD NEXT REVELATION ({step}/6) <i className="fa-solid fa-chevron-down ml-1" />
          </button>
        ) : (
          <button
            onClick={onReset}
            style={{
              padding: "12px 24px",
              borderRadius: 14,
              background: "rgba(255,255,255,0.08)",
              border: "1px solid rgba(255,255,255,0.2)",
              color: "#fff",
              fontSize: 13,
              fontWeight: 800,
              cursor: "pointer",
            }}
          >
            <i className="fa-solid fa-rotate-left mr-1.5" /> RE-ENTER THE BLACK BOX
          </button>
        )}
      </div>
    </div>
  );
}
