import React from "react";
import { motion } from "framer-motion";

export default function FutureCollision({
  futureModel,
  selectedFutureA,
  setSelectedFutureA,
  selectedFutureB,
  setSelectedFutureB,
  onNext,
}) {
  const futA = futureModel.futures.find((f) => f.id === selectedFutureA) || futureModel.futures[0];
  const futB = futureModel.futures.find((f) => f.id === selectedFutureB) || futureModel.futures[1];

  const synthesis = futureModel.synthesizeCollision(futA, futB);

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
      data-testid="future-collision-phase"
    >
      <div>
        <div style={{ fontSize: 11, fontFamily: "monospace", color: "#A855F7", letterSpacing: "0.2em" }}>
          PHASE 6 // FUTURE TIMELINE COLLISION
        </div>
        <h2 style={{ fontSize: 22, fontWeight: 900, color: "#fff", margin: "4px 0" }}>
          Collide diverging futures to expose what forces them apart.
        </h2>
      </div>

      {/* Select Two Futures to Collide */}
      <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr", gap: 14 }}>
        {/* Timeline A Selector */}
        <div>
          <div style={{ fontSize: 10, fontFamily: "monospace", color: "#00F0FF", marginBottom: 6 }}>
            TIMELINE A: {futA.name} ({futA.probability})
          </div>
          <div style={{ display: "flex", gap: 6, flexWrap: "wrap" }}>
            {futureModel.futures.map((f) => (
              <button
                key={f.id}
                onClick={() => setSelectedFutureA(f.id)}
                style={{
                  padding: "6px 12px",
                  borderRadius: 8,
                  fontSize: 11,
                  fontWeight: 700,
                  border: "none",
                  background: selectedFutureA === f.id ? "rgba(0,240,255,0.2)" : "rgba(255,255,255,0.04)",
                  color: selectedFutureA === f.id ? "#00F0FF" : "rgba(255,255,255,0.6)",
                  cursor: "pointer",
                }}
              >
                {f.name}
              </button>
            ))}
          </div>
        </div>

        {/* Timeline B Selector */}
        <div>
          <div style={{ fontSize: 10, fontFamily: "monospace", color: "#A855F7", marginBottom: 6 }}>
            TIMELINE B: {futB.name} ({futB.probability})
          </div>
          <div style={{ display: "flex", gap: 6, flexWrap: "wrap" }}>
            {futureModel.futures.map((f) => (
              <button
                key={f.id}
                onClick={() => setSelectedFutureB(f.id)}
                style={{
                  padding: "6px 12px",
                  borderRadius: 8,
                  fontSize: 11,
                  fontWeight: 700,
                  border: "none",
                  background: selectedFutureB === f.id ? "rgba(168,85,247,0.2)" : "rgba(255,255,255,0.04)",
                  color: selectedFutureB === f.id ? "#A855F7" : "rgba(255,255,255,0.6)",
                  cursor: "pointer",
                }}
              >
                {f.name}
              </button>
            ))}
          </div>
        </div>
      </div>

      {/* Collision Synthesis Result Box */}
      <motion.div
        key={`${selectedFutureA}-${selectedFutureB}`}
        initial={{ opacity: 0, scale: 0.98 }}
        animate={{ opacity: 1, scale: 1 }}
        style={{
          padding: 20,
          borderRadius: 20,
          background: "rgba(10, 14, 28, 0.9)",
          border: "1px solid rgba(168, 85, 247, 0.4)",
          boxShadow: "0 0 30px rgba(168, 85, 247, 0.25)",
        }}
      >
        <div style={{ fontSize: 11, fontFamily: "monospace", color: "#A855F7", fontWeight: 800 }}>
          ⚡ TIMELINE DIVERGENCE COLLISION SYNTHESIS
        </div>
        <div style={{ fontSize: 14, fontWeight: 700, color: "#fff", margin: "8px 0", lineHeight: 1.5 }}>
          {synthesis}
        </div>
      </motion.div>

      {/* Advance Button */}
      <div style={{ display: "flex", justifyContent: "flex-end" }}>
        <button
          onClick={onNext}
          style={{
            padding: "12px 28px",
            borderRadius: 14,
            background: "linear-gradient(135deg, #A855F7, #00F0FF)",
            color: "#000",
            fontSize: 13,
            fontWeight: 900,
            border: "none",
            cursor: "pointer",
            boxShadow: "0 0 24px rgba(168, 85, 247, 0.4)",
            display: "flex",
            alignItems: "center",
            gap: 8,
          }}
        >
          RECEIVE THE OMNIVERSE VERDICT <i className="fa-solid fa-arrow-right" />
        </button>
      </div>
    </div>
  );
}
