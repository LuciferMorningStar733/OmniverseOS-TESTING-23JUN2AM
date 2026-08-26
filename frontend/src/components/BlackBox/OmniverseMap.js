import React from "react";
import { motion } from "framer-motion";

export default function OmniverseMap({ realities, selectedReality, setSelectedReality, onNext }) {
  const activeObj = realities.realities.find((r) => r.id === selectedReality) || realities.realities[0];

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
      data-testid="omniverse-map-phase"
    >
      <div>
        <div style={{ fontSize: 11, fontFamily: "monospace", color: "#00F0FF", letterSpacing: "0.2em" }}>
          PHASE 3 // SPATIAL OMNIVERSE MAP
        </div>
        <h2 style={{ fontSize: 22, fontWeight: 900, color: "#fff", margin: "4px 0" }}>
          Explore the diverging spatial realities of your problem.
        </h2>
      </div>

      {/* Spatial Reality Field */}
      <div style={{ display: "grid", gridTemplateColumns: "repeat(auto-fit, minmax(180px, 1fr))", gap: 12 }}>
        {realities.realities.map((r) => (
          <motion.div
            key={r.id}
            onClick={() => setSelectedReality(r.id)}
            whileHover={{ scale: 1.04 }}
            whileTap={{ scale: 0.96 }}
            style={{
              padding: 16,
              borderRadius: 16,
              background: selectedReality === r.id ? `${r.color}20` : "rgba(255,255,255,0.03)",
              border: `2px solid ${selectedReality === r.id ? r.color : "rgba(255,255,255,0.08)"}`,
              boxShadow: selectedReality === r.id ? `0 0 24px ${r.color}40` : "none",
              cursor: "pointer",
              transition: "all 0.2s ease",
            }}
          >
            <div style={{ fontSize: 10, fontFamily: "monospace", color: r.color, fontWeight: 800 }}>{r.status}</div>
            <div style={{ fontSize: 14, fontWeight: 900, color: "#fff", margin: "4px 0" }}>{r.name}</div>
          </motion.div>
        ))}
      </div>

      {/* Focused Reality Detail View */}
      <motion.div
        key={activeObj.id}
        initial={{ opacity: 0, y: 10 }}
        animate={{ opacity: 1, y: 0 }}
        transition={{ duration: 0.2 }}
        style={{
          padding: 20,
          borderRadius: 20,
          background: "rgba(10, 14, 28, 0.9)",
          border: `1px solid ${activeObj.color}`,
          boxShadow: `0 0 30px ${activeObj.color}25`,
        }}
      >
        <div style={{ fontSize: 11, fontFamily: "monospace", color: activeObj.color, fontWeight: 800 }}>
          SELECTED SPATIAL BRANCH: {activeObj.name}
        </div>
        <div style={{ fontSize: 15, fontWeight: 800, color: "#fff", margin: "6px 0", lineHeight: 1.5 }}>
          {activeObj.desc}
        </div>

        <div style={{ display: "flex", gap: 8, marginTop: 10, flexWrap: "wrap" }}>
          {activeObj.variables.map((v, i) => (
            <span
              key={i}
              style={{
                fontSize: 10,
                fontFamily: "monospace",
                padding: "4px 8px",
                borderRadius: 6,
                background: "rgba(255,255,255,0.06)",
                color: "rgba(255,255,255,0.8)",
              }}
            >
              Tension Node: {v}
            </span>
          ))}
        </div>
      </motion.div>

      {/* Advance Button */}
      <div style={{ display: "flex", justifyContent: "flex-end" }}>
        <button
          onClick={onNext}
          style={{
            padding: "12px 28px",
            borderRadius: 14,
            background: "linear-gradient(135deg, #00F0FF, #A855F7)",
            color: "#000",
            fontSize: 13,
            fontWeight: 900,
            border: "none",
            cursor: "pointer",
            boxShadow: "0 0 20px rgba(0, 240, 255, 0.4)",
            display: "flex",
            alignItems: "center",
            gap: 8,
          }}
        >
          ENTER INTELLIGENCE COLLISION <i className="fa-solid fa-arrow-right" />
        </button>
      </div>
    </div>
  );
}
