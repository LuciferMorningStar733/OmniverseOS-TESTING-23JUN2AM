import React, { useState } from "react";
import { motion } from "framer-motion";

export default function ProblemCoreNode({ coreNodes, onNext }) {
  const [selectedNode, setSelectedNode] = useState(null);

  return (
    <div
      style={{
        width: "100%",
        height: "100%",
        display: "flex",
        flexDirection: "column",
        alignItems: "center",
        justifyContent: "space-between",
        padding: 24,
        background: "#030408",
        position: "relative",
        overflow: "hidden",
      }}
      data-testid="problem-core-node-phase"
    >
      <div style={{ textAlign: "center", zIndex: 10 }}>
        <div style={{ fontSize: 11, fontFamily: "monospace", color: "#00F0FF", letterSpacing: "0.2em" }}>
          PHASE 2 // CORE PROBLEM NODE EMERGENCE
        </div>
        <h2 style={{ fontSize: 22, fontWeight: 900, color: "#fff", margin: "4px 0" }}>
          The system has constructed your internal problem model.
        </h2>
      </div>

      {/* Orbiting Interactive Node Universe */}
      <div
        style={{
          position: "relative",
          width: "100%",
          maxWidth: 640,
          height: 380,
          display: "flex",
          alignItems: "center",
          justifyContent: "center",
        }}
      >
        {/* Central Core Node */}
        <motion.div
          initial={{ scale: 0 }}
          animate={{ scale: 1 }}
          transition={{ type: "spring", damping: 18, stiffness: 200 }}
          style={{
            position: "absolute",
            width: 140,
            height: 140,
            borderRadius: "50%",
            background: "radial-gradient(circle at 35% 35%, #00F0FF, #030408)",
            boxShadow: "0 0 50px rgba(0, 240, 255, 0.6), inset 0 0 20px rgba(0,240,255,0.4)",
            display: "flex",
            flexDirection: "column",
            alignItems: "center",
            justifyContent: "center",
            padding: 12,
            textAlign: "center",
            zIndex: 5,
            border: "2px solid #00F0FF",
          }}
        >
          <i className="fa-solid fa-atom" style={{ color: "#fff", fontSize: 24, marginBottom: 4 }} />
          <div style={{ fontSize: 11, fontWeight: 900, color: "#fff", lineHeight: 1.2 }}>
            CORE PROBLEM NODE
          </div>
        </motion.div>

        {/* Orbiting Concept Nodes */}
        {coreNodes.orbitingNodes.map((node, i) => {
          const total = coreNodes.orbitingNodes.length;
          const angle = (i / total) * (Math.PI * 2);
          const radius = 170;
          const x = Math.cos(angle) * radius;
          const y = Math.sin(angle) * radius;

          return (
            <React.Fragment key={node.id}>
              {/* Connector SVG Line */}
              <svg
                style={{
                  position: "absolute",
                  inset: 0,
                  width: "100%",
                  height: "100%",
                  pointerEvents: "none",
                  zIndex: 1,
                }}
              >
                <line
                  x1="50%"
                  y1="50%"
                  x2={`calc(50% + ${x}px)`}
                  y2={`calc(50% + ${y}px)`}
                  stroke={node.color}
                  strokeWidth="1"
                  strokeDasharray="4 4"
                  opacity="0.6"
                />
              </svg>

              {/* Node Circle */}
              <motion.div
                initial={{ opacity: 0, scale: 0 }}
                animate={{ opacity: 1, scale: 1 }}
                transition={{ delay: 0.15 * i, duration: 0.4 }}
                onClick={() => setSelectedNode(node)}
                whileHover={{ scale: 1.15 }}
                style={{
                  position: "absolute",
                  transform: `translate(${x}px, ${y}px)`,
                  padding: "8px 14px",
                  borderRadius: 14,
                  background: "rgba(10, 14, 28, 0.9)",
                  border: `1px solid ${node.color}`,
                  boxShadow: `0 0 20px ${node.color}40`,
                  color: "#fff",
                  fontSize: 10,
                  fontFamily: "'JetBrains Mono', monospace",
                  fontWeight: 800,
                  cursor: "pointer",
                  zIndex: 6,
                  whiteSpace: "nowrap",
                }}
              >
                {node.label}
              </motion.div>
            </React.Fragment>
          );
        })}
      </div>

      {/* Selected Node Details Drawer */}
      {selectedNode && (
        <motion.div
          initial={{ opacity: 0, y: 10 }}
          animate={{ opacity: 1, y: 0 }}
          style={{
            padding: 14,
            borderRadius: 12,
            background: "rgba(10, 14, 28, 0.95)",
            border: `1px solid ${selectedNode.color}`,
            maxWidth: 480,
            textAlign: "center",
            zIndex: 10,
          }}
        >
          <div style={{ fontSize: 12, fontWeight: 900, color: selectedNode.color }}>{selectedNode.label}</div>
          <div style={{ fontSize: 12, color: "rgba(255,255,255,0.8)", marginTop: 4 }}>{selectedNode.desc}</div>
        </motion.div>
      )}

      {/* Advance Button */}
      <div style={{ zIndex: 10, marginTop: 10 }}>
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
            boxShadow: "0 0 20px rgba(0, 240, 255, 0.4)",
            display: "flex",
            alignItems: "center",
            gap: 8,
          }}
        >
          OPEN SPATIAL OMNIVERSE MAP <i className="fa-solid fa-arrow-right" />
        </button>
      </div>
    </div>
  );
}
