import React from "react";
import { motion, AnimatePresence } from "framer-motion";
import { useBlackBoxExperience } from "./useBlackBoxExperience";
import PhaseConfession from "./PhaseConfession";
import ProblemCoreNode from "./ProblemCoreNode";
import OmniverseMap from "./OmniverseMap";
import IntelligenceCollision from "./IntelligenceCollision";
import HiddenCenterOfGravity from "./HiddenCenterOfGravity";
import FutureCollision from "./FutureCollision";
import OmniverseVerdict from "./OmniverseVerdict";

export default function BlackBoxExperience() {
  const {
    inputText,
    setInputText,
    phase,
    setPhase,
    isTransitioning,
    submitConfession,
    nextPhase,
    prevPhase,
    resetExperience,
    selectedReality,
    setSelectedReality,
    selectedFutureA,
    setSelectedFutureA,
    selectedFutureB,
    setSelectedFutureB,
    typingAnalysis,
    coreNodes,
    realities,
    agentCollisions,
    hiddenGravity,
    futureModel,
    verdictData,
  } = useBlackBoxExperience();

  const phasesList = [
    { num: 1, label: "Confession" },
    { num: 2, label: "Core Node" },
    { num: 3, label: "Spatial Map" },
    { num: 4, label: "Collision" },
    { num: 5, label: "Gravity" },
    { num: 6, label: "Futures" },
    { num: 7, label: "Verdict" },
  ];

  return (
    <div
      style={{
        width: "100%",
        height: "100%",
        display: "flex",
        flexDirection: "column",
        background: "#030408",
        color: "#fff",
        fontFamily: "'Outfit', sans-serif",
        overflow: "hidden",
        position: "relative",
      }}
      data-testid="black-box-experience"
    >
      {/* Header & Phase Progress Bar */}
      <div
        style={{
          padding: "12px 20px",
          borderBottom: "1px solid rgba(255, 255, 255, 0.08)",
          display: "flex",
          alignItems: "center",
          justifyContent: "space-between",
          background: "rgba(8, 10, 18, 0.95)",
          backdropFilter: "blur(24px)",
          zIndex: 50,
        }}
      >
        <div style={{ display: "flex", alignItems: "center", gap: 10 }}>
          <div
            style={{
              width: 34,
              height: 34,
              borderRadius: 10,
              background: "radial-gradient(circle at 35% 35%, #00F0FF, #000)",
              display: "flex",
              alignItems: "center",
              justifyContent: "center",
              boxShadow: "0 0 16px rgba(0, 240, 255, 0.4)",
            }}
          >
            <i className="fa-solid fa-box-open" style={{ color: "#00F0FF", fontSize: 15 }} />
          </div>
          <div>
            <div style={{ fontSize: 16, fontWeight: 900, letterSpacing: "-0.01em", color: "#fff" }}>
              THE BLACK BOX
            </div>
            <div style={{ fontSize: 10, color: "rgba(255,255,255,0.45)", fontFamily: "'JetBrains Mono', monospace" }}>
              "Your problem creates its own universe."
            </div>
          </div>
        </div>

        {/* Cinematic Step Progress Tracker */}
        {phase > 0 && (
          <div style={{ display: "flex", gap: 6, alignItems: "center" }}>
            {phasesList.map((p, idx) => (
              <button
                key={p.num}
                onClick={() => setPhase(idx)}
                style={{
                  padding: "4px 10px",
                  borderRadius: 8,
                  fontSize: 10,
                  fontFamily: "'JetBrains Mono', monospace",
                  fontWeight: 800,
                  border: "none",
                  background: phase === idx ? "rgba(0,240,255,0.2)" : "rgba(255,255,255,0.04)",
                  color: phase === idx ? "#00F0FF" : "rgba(255,255,255,0.4)",
                  cursor: "pointer",
                }}
              >
                0{p.num} {p.label}
              </button>
            ))}
          </div>
        )}
      </div>

      {/* Main Experience Flow Area */}
      <div style={{ flex: 1, position: "relative", overflow: "hidden" }}>
        <AnimatePresence mode="wait">
          {phase === 0 && (
            <motion.div
              key="phase-0"
              initial={{ opacity: 0 }}
              animate={{ opacity: 1 }}
              exit={{ opacity: 0 }}
              transition={{ duration: 0.3 }}
              style={{ width: "100%", height: "100%" }}
            >
              <PhaseConfession
                inputText={inputText}
                setInputText={setInputText}
                typingAnalysis={typingAnalysis}
                onSubmit={submitConfession}
                isTransitioning={isTransitioning}
              />
            </motion.div>
          )}

          {phase === 1 && (
            <motion.div
              key="phase-1"
              initial={{ opacity: 0, scale: 0.98 }}
              animate={{ opacity: 1, scale: 1 }}
              exit={{ opacity: 0, scale: 0.98 }}
              transition={{ duration: 0.3 }}
              style={{ width: "100%", height: "100%" }}
            >
              <ProblemCoreNode coreNodes={coreNodes} onNext={nextPhase} />
            </motion.div>
          )}

          {phase === 2 && (
            <motion.div
              key="phase-2"
              initial={{ opacity: 0, x: 20 }}
              animate={{ opacity: 1, x: 0 }}
              exit={{ opacity: 0, x: -20 }}
              transition={{ duration: 0.3 }}
              style={{ width: "100%", height: "100%" }}
            >
              <OmniverseMap
                realities={realities}
                selectedReality={selectedReality}
                setSelectedReality={setSelectedReality}
                onNext={nextPhase}
              />
            </motion.div>
          )}

          {phase === 3 && (
            <motion.div
              key="phase-3"
              initial={{ opacity: 0, x: 20 }}
              animate={{ opacity: 1, x: 0 }}
              exit={{ opacity: 0, x: -20 }}
              transition={{ duration: 0.3 }}
              style={{ width: "100%", height: "100%" }}
            >
              <IntelligenceCollision agentCollisions={agentCollisions} onNext={nextPhase} />
            </motion.div>
          )}

          {phase === 4 && (
            <motion.div
              key="phase-4"
              initial={{ opacity: 0, scale: 0.95 }}
              animate={{ opacity: 1, scale: 1 }}
              exit={{ opacity: 0, scale: 0.95 }}
              transition={{ duration: 0.3 }}
              style={{ width: "100%", height: "100%" }}
            >
              <HiddenCenterOfGravity hiddenGravity={hiddenGravity} onNext={nextPhase} />
            </motion.div>
          )}

          {phase === 5 && (
            <motion.div
              key="phase-5"
              initial={{ opacity: 0, x: 20 }}
              animate={{ opacity: 1, x: 0 }}
              exit={{ opacity: 0, x: -20 }}
              transition={{ duration: 0.3 }}
              style={{ width: "100%", height: "100%" }}
            >
              <FutureCollision
                futureModel={futureModel}
                selectedFutureA={selectedFutureA}
                setSelectedFutureA={setSelectedFutureA}
                selectedFutureB={selectedFutureB}
                setSelectedFutureB={setSelectedFutureB}
                onNext={nextPhase}
              />
            </motion.div>
          )}

          {phase === 6 && (
            <motion.div
              key="phase-6"
              initial={{ opacity: 0, y: 15 }}
              animate={{ opacity: 1, y: 0 }}
              exit={{ opacity: 0, y: -15 }}
              transition={{ duration: 0.3 }}
              style={{ width: "100%", height: "100%" }}
            >
              <OmniverseVerdict verdictData={verdictData} onReset={resetExperience} />
            </motion.div>
          )}
        </AnimatePresence>
      </div>
    </div>
  );
}
