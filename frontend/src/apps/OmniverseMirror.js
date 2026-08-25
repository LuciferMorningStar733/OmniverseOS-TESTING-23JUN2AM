import React, { useState, useMemo } from "react";
import { motion, AnimatePresence } from "framer-motion";
import {
  getMirrorHistoricalTimeline,
  getMirrorPresentAnalysis,
  getMirrorFutureTrajectories,
  getDigitalTwinSystemPrompt,
  getParallelLifeSimulator,
  getPersonalCounterfactualMemory,
  getSelfContradictionEngine,
  getPersonalCausalUniverse,
  getCognitiveShadow,
  getDecisionTimeTravel,
  getPersonalRedTeam,
  getIdentityDriftEngine,
  getForgottenIntelligenceEngine,
  getImpossibleQuestionEngine,
} from "../lib/cortexMirrorEngine";

export default function OmniverseMirror() {
  const [activeTab, setActiveTab] = useState("impossible"); // "impossible" | "past" | "present" | "future" | "causal"
  const [chatModal, setChatModal] = useState(null); // { mode: "past" | "future" | "3way", trajectoryId?: string }
  const [evidenceModal, setEvidenceModal] = useState(null);
  const [contradictionModal, setContradictionModal] = useState(false);
  const [signatureModal, setSignatureModal] = useState(false);
  const [chatMessages, setChatMessages] = useState([]);
  const [chatInput, setChatInput] = useState("");
  const [isThinking, setIsThinking] = useState(false);

  const { timeline, eras } = useMemo(() => {
    const res = getMirrorHistoricalTimeline();
    return Array.isArray(res) ? { timeline: res, eras: [] } : res;
  }, []);
  const presentData = useMemo(() => getMirrorPresentAnalysis(), []);
  const trajectories = useMemo(() => getMirrorFutureTrajectories(), []);
  const parallelData = useMemo(() => getParallelLifeSimulator(), []);
  const counterfactualData = useMemo(() => getPersonalCounterfactualMemory(), []);
  const contradictionData = useMemo(() => getSelfContradictionEngine(), []);
  const causalData = useMemo(() => getPersonalCausalUniverse(), []);
  const cognitiveShadowData = useMemo(() => getCognitiveShadow(), []);
  const timeTravelData = useMemo(() => getDecisionTimeTravel(), []);
  const redTeamData = useMemo(() => getPersonalRedTeam(), []);
  const identityData = useMemo(() => getIdentityDriftEngine(), []);
  const forgottenData = useMemo(() => getForgottenIntelligenceEngine(), []);
  const impossibleData = useMemo(() => getImpossibleQuestionEngine(), []);

  // Theme accents
  const modeAccent =
    activeTab === "impossible" ? "#00F0FF" :
    activeTab === "past" ? "#F59E0B" :
    activeTab === "present" ? "#39FF14" :
    activeTab === "future" ? "#A855F7" :
    "#FB923C";

  const modeGlow = `${modeAccent}30`;

  const openDigitalTwinChat = (mode, trajectoryId = "traj-peak") => {
    const initialGreeting =
      mode === "past"
        ? "Hey, I'm Past Self reconstructed from your historical records. What do you want to reflect on?"
        : mode === "3way"
        ? "Temporal Identity Session active: Past You (June 2026), Present You (August 2026), and Future You (September 2026) are online."
        : "Greetings from a projected future trajectory. Ask me strategic questions about your current path.";

    setChatMessages([{ sender: "twin", text: initialGreeting }]);
    setChatModal({ mode, trajectoryId });
  };

  const handleSendChat = () => {
    if (!chatInput.trim() || isThinking) return;
    const userText = chatInput;
    setChatMessages((prev) => [...prev, { sender: "user", text: userText }]);
    setChatInput("");
    setIsThinking(true);

    setTimeout(() => {
      let reply = "";
      if (chatModal?.mode === "past") {
        reply = `Past Self: Based on June records, we focused heavily on building core architecture. Seeing our current progress proves the effort was worth it.`;
      } else if (chatModal?.mode === "3way") {
        reply = `[PAST YOU]: We started with desktop window management.\n[PRESENT YOU]: Now we're executing Apple-level evidence grounding.\n[FUTURE YOU]: Maintain 100% daily task resolution for a flawless launch.`;
      } else {
        reply = `Future Self: Looking back from 6 months ahead, locking feature scope today guarantees a September 1st release.`;
      }
      setChatMessages((prev) => [...prev, { sender: "twin", text: reply }]);
      setIsThinking(false);
    }, 1200);
  };

  return (
    <div
      style={{
        width: "100%",
        height: "100%",
        display: "flex",
        flexDirection: "column",
        background: "rgba(6, 8, 16, 0.95)",
        color: "#fff",
        fontFamily: "'Outfit', sans-serif",
        overflow: "hidden",
        position: "relative",
      }}
    >
      {/* Top Header & Tri-Mode Selector */}
      <div
        style={{
          padding: "14px 20px",
          borderBottom: "1px solid rgba(255,255,255,0.08)",
          display: "flex",
          alignItems: "center",
          justifyContent: "space-between",
          background: "rgba(10, 12, 22, 0.85)",
          backdropFilter: "blur(24px)",
        }}
      >
        <div style={{ display: "flex", alignItems: "center", gap: 12 }}>
          <div
            style={{
              width: 36,
              height: 36,
              borderRadius: 12,
              background: `radial-gradient(circle at 35% 35%, ${modeAccent}, transparent)`,
              display: "flex",
              alignItems: "center",
              justifyContent: "center",
              boxShadow: `0 0 18px ${modeGlow}`,
              transition: "all 0.3s ease",
            }}
          >
            <i className="fa-solid fa-infinity" style={{ color: "#fff", fontSize: 16 }} />
          </div>
          <div>
            <div style={{ fontSize: 16, fontWeight: 800, letterSpacing: "-0.01em" }}>OMNIVERSE MIRROR ∞</div>
            <div style={{ fontSize: 11, color: "rgba(255,255,255,0.5)", fontFamily: "'JetBrains Mono', monospace" }}>
              Personal Causal, Temporal & Adversarial AI System
            </div>
          </div>
        </div>

        {/* Mode Navigation */}
        <div
          style={{
            display: "flex",
            alignItems: "center",
            gap: 4,
            padding: 4,
            borderRadius: 14,
            background: "rgba(255,255,255,0.04)",
            border: "1px solid rgba(255,255,255,0.08)",
          }}
        >
          {[
            { id: "impossible", label: "🚨 Impossible Question", color: "#00F0FF" },
            { id: "past", label: "🪞 Past & Counterfactuals", color: "#F59E0B" },
            { id: "present", label: "🧠 Present & Shadow", color: "#39FF14" },
            { id: "future", label: "🔮 Future & Parallel", color: "#A855F7" },
            { id: "causal", label: "🌌 Causal Universe", color: "#FB923C" },
          ].map((t) => (
            <button
              key={t.id}
              onClick={() => setActiveTab(t.id)}
              aria-label={`Switch to ${t.label}`}
              className="neon-btn"
              style={{
                padding: "6px 12px",
                borderRadius: 10,
                fontSize: 11,
                fontWeight: 600,
                border: "none",
                background: activeTab === t.id ? `${t.color}25` : "transparent",
                color: activeTab === t.id ? t.color : "rgba(255,255,255,0.6)",
                boxShadow: activeTab === t.id ? `0 0 14px ${t.color}40` : "none",
                cursor: "pointer",
                transition: "all 0.25s cubic-bezier(0.16, 1, 0.3, 1)",
              }}
            >
              {t.label}
            </button>
          ))}
        </div>
      </div>

      {/* Signature Hero Bar */}
      <div
        style={{
          padding: "10px 20px",
          background: "linear-gradient(90deg, rgba(0,240,255,0.12), rgba(168,85,247,0.12))",
          borderBottom: "1px solid rgba(0,240,255,0.2)",
          display: "flex",
          alignItems: "center",
          justifyContent: "space-between",
        }}
      >
        <div style={{ display: "flex", alignItems: "center", gap: 10 }}>
          <i className="fa-solid fa-sparkles" style={{ color: "#00F0FF", fontSize: 14 }} />
          <span style={{ fontSize: 13, fontWeight: 700, color: "#fff" }}>
            SIGNATURE FEATURE: Ask OmniverseOS the Ultimate Synthesis Question
          </span>
        </div>
        <button
          onClick={() => setSignatureModal(true)}
          style={{
            padding: "6px 16px",
            borderRadius: 10,
            background: "#00F0FF",
            color: "#000",
            fontSize: 12,
            fontWeight: 800,
            border: "none",
            cursor: "pointer",
            boxShadow: "0 0 14px rgba(0,240,255,0.4)",
            display: "flex",
            alignItems: "center",
            gap: 6,
          }}
        >
          <i className="fa-solid fa-wand-magic-sparkles" />
          "What do you know about me that I don't know about myself?"
        </button>
      </div>

      {/* Body Content */}
      <div style={{ flex: 1, padding: 20, overflowY: "auto" }}>
        <AnimatePresence mode="wait">
          {/* IMPOSSIBLE QUESTION TAB */}
          {activeTab === "impossible" && (
            <motion.div
              key="impossible"
              initial={{ opacity: 0, y: 10 }}
              animate={{ opacity: 1, y: 0 }}
              exit={{ opacity: 0, y: -10 }}
              transition={{ duration: 0.2 }}
              style={{ display: "flex", flexDirection: "column", gap: 18 }}
            >
              <div className="glass-panel" style={{ padding: 22, borderColor: "rgba(0,240,255,0.3)" }}>
                <div style={{ fontSize: 11, fontFamily: "monospace", color: "#00F0FF" }}>10. 🚨 THE IMPOSSIBLE QUESTION ENGINE</div>
                <h3 style={{ fontSize: 20, fontWeight: 800, margin: "6px 0" }}>
                  "What do you know about me that I don't know about myself?"
                </h3>
                <p style={{ fontSize: 13, color: "rgba(255,255,255,0.75)", lineHeight: 1.6, margin: "8px 0 16px" }}>
                  {impossibleData.signatureAnswer.synthesis}
                </p>
                <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr", gap: 12, fontSize: 12, fontFamily: "monospace" }}>
                  <div style={{ padding: 12, borderRadius: 10, background: "rgba(255,255,255,0.03)", border: "1px solid rgba(255,255,255,0.08)" }}>
                    <span style={{ color: "rgba(255,255,255,0.4)" }}>Key Observed Pattern:</span>
                    <div style={{ color: "#39FF14", fontWeight: 700, marginTop: 4 }}>{impossibleData.signatureAnswer.keyPattern}</div>
                  </div>
                  <div style={{ padding: 12, borderRadius: 10, background: "rgba(255,255,255,0.03)", border: "1px solid rgba(255,255,255,0.08)" }}>
                    <span style={{ color: "rgba(255,255,255,0.4)" }}>Recommended Action to Maximize Goal:</span>
                    <div style={{ color: "#00F0FF", fontWeight: 700, marginTop: 4 }}>{impossibleData.signatureAnswer.actionToMaximizeGoal}</div>
                  </div>
                </div>
              </div>
            </motion.div>
          )}

          {/* PAST & COUNTERFACTUALS TAB */}
          {activeTab === "past" && (
            <motion.div
              key="past"
              initial={{ opacity: 0, y: 10 }}
              animate={{ opacity: 1, y: 0 }}
              exit={{ opacity: 0, y: -10 }}
              transition={{ duration: 0.2 }}
              style={{ display: "flex", flexDirection: "column", gap: 18 }}
            >
              {/* 2. Personal Counterfactual Memory */}
              <div className="glass-panel" style={{ padding: 20, borderColor: "rgba(245,158,11,0.3)" }}>
                <div style={{ display: "flex", alignItems: "center", justifyBetween: "space-between", marginBottom: 12 }}>
                  <div>
                    <div style={{ fontSize: 11, fontFamily: "monospace", color: "#F59E0B" }}>2. 🥈 PERSONAL COUNTERFACTUAL MEMORY</div>
                    <h3 style={{ fontSize: 16, fontWeight: 700, margin: "2px 0" }}>Personal Butterfly Effect Graph</h3>
                  </div>
                  <button
                    onClick={() => openDigitalTwinChat("3way")}
                    style={{
                      padding: "6px 14px",
                      borderRadius: 10,
                      background: "rgba(245,158,11,0.15)",
                      border: "1px solid rgba(245,158,11,0.4)",
                      color: "#F59E0B",
                      fontSize: 11,
                      fontWeight: 700,
                      cursor: "pointer",
                      display: "flex",
                      alignItems: "center",
                      gap: 6,
                    }}
                  >
                    <i className="fa-solid fa-hourglass-half" />
                    6. ⏳ Decision Time Travel (3-Way Chat)
                  </button>
                </div>

                <div style={{ display: "flex", flexDirection: "column", gap: 8 }}>
                  {counterfactualData.pivotalNode.causalChain.map((item) => (
                    <div key={item.step} style={{ display: "flex", alignItems: "center", gap: 12, fontSize: 12 }}>
                      <span style={{ padding: "4px 8px", borderRadius: 6, background: "rgba(245,158,11,0.15)", color: "#F59E0B", fontFamily: "monospace", fontSize: 10, fontWeight: 700 }}>
                        {item.label}
                      </span>
                      <span style={{ color: "rgba(255,255,255,0.85)" }}>{item.desc}</span>
                    </div>
                  ))}
                </div>
              </div>

              {/* Historical Eras */}
              {eras && eras.length > 0 && (
                <div style={{ display: "flex", flexDirection: "column", gap: 10 }}>
                  <div style={{ fontSize: 12, fontWeight: 700, color: "#F59E0B", fontFamily: "'JetBrains Mono', monospace" }}>
                    HISTORICAL ERAS
                  </div>
                  <div style={{ display: "grid", gridTemplateColumns: "repeat(auto-fit, minmax(260px, 1fr))", gap: 12 }}>
                    {eras.map((era) => (
                      <div key={era.id} className="glass-card" style={{ padding: 14, borderLeft: "3px solid #F59E0B" }}>
                        <div style={{ fontSize: 14, fontWeight: 700 }}>{era.name}</div>
                        <div style={{ fontSize: 11, color: "#F59E0B", margin: "2px 0 6px", fontFamily: "monospace" }}>{era.dateRange}</div>
                        <div style={{ fontSize: 12, color: "rgba(255,255,255,0.7)" }}>{era.summary}</div>
                      </div>
                    ))}
                  </div>
                </div>
              )}
            </motion.div>
          )}

          {/* PRESENT & SHADOW TAB */}
          {activeTab === "present" && (
            <motion.div
              key="present"
              initial={{ opacity: 0, y: 10 }}
              animate={{ opacity: 1, y: 0 }}
              exit={{ opacity: 0, y: -10 }}
              transition={{ duration: 0.2 }}
              style={{ display: "flex", flexDirection: "column", gap: 18 }}
            >
              {/* 3. Self-Contradiction Engine & 5. Cognitive Shadow */}
              <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr", gap: 14 }}>
                {/* Contradiction Card */}
                <div className="glass-panel" style={{ padding: 18, borderColor: "rgba(255,0,60,0.3)" }}>
                  <div style={{ fontSize: 11, fontFamily: "monospace", color: "#FF003C" }}>3. 🥉 SELF-CONTRADICTION ENGINE</div>
                  <h4 style={{ fontSize: 15, fontWeight: 700, margin: "4px 0" }}>Accountability Receipts</h4>
                  <div style={{ fontSize: 12, color: "rgba(255,255,255,0.7)", margin: "6px 0 12px" }}>
                    {contradictionData.receipt.actualBehavior}
                  </div>
                  <button
                    onClick={() => setContradictionModal(true)}
                    style={{
                      padding: "6px 12px",
                      borderRadius: 8,
                      background: "rgba(255,0,60,0.15)",
                      border: "1px solid rgba(255,0,60,0.4)",
                      color: "#FF7090",
                      fontSize: 11,
                      fontWeight: 700,
                      cursor: "pointer",
                    }}
                  >
                    View Contradiction Receipts
                  </button>
                </div>

                {/* Cognitive Shadow Card */}
                <div className="glass-panel" style={{ padding: 18, borderColor: "rgba(57,255,20,0.3)" }}>
                  <div style={{ fontSize: 11, fontFamily: "monospace", color: "#39FF14" }}>5. 🧠 COGNITIVE SHADOW</div>
                  <h4 style={{ fontSize: 15, fontWeight: 700, margin: "4px 0" }}>Metacognition Monitor</h4>
                  <div style={{ fontSize: 12, color: "rgba(255,255,255,0.7)", margin: "6px 0" }}>
                    Pattern: <strong>{cognitiveShadowData.patternDetected}</strong>
                  </div>
                  <div style={{ fontSize: 11, color: "rgba(255,255,255,0.5)", lineHeight: 1.5 }}>
                    {cognitiveShadowData.alertMessage}
                  </div>
                </div>
              </div>

              {/* 8. Identity Drift Engine */}
              <div className="glass-panel" style={{ padding: 18, borderColor: "rgba(0,240,255,0.25)" }}>
                <div style={{ fontSize: 11, fontFamily: "monospace", color: "#00F0FF" }}>8. 🪞 IDENTITY DRIFT ENGINE</div>
                <h4 style={{ fontSize: 15, fontWeight: 700, margin: "4px 0" }}>Living Identity Map</h4>
                <div style={{ display: "grid", gridTemplateColumns: "repeat(3, 1fr)", gap: 10, margin: "10px 0" }}>
                  {identityData.profileBreakdown.map((item) => (
                    <div key={item.archetype} style={{ padding: 10, borderRadius: 8, background: "rgba(255,255,255,0.03)" }}>
                      <div style={{ fontSize: 12, fontWeight: 700 }}>{item.archetype}</div>
                      <div style={{ fontSize: 11, fontFamily: "monospace", color: "#00F0FF" }}>{item.bar} {item.level}%</div>
                    </div>
                  ))}
                </div>
                <div style={{ fontSize: 11, color: "rgba(255,255,255,0.6)" }}>ℹ {identityData.driftInsight}</div>
              </div>
            </motion.div>
          )}

          {/* FUTURE & PARALLEL TAB */}
          {activeTab === "future" && (
            <motion.div
              key="future"
              initial={{ opacity: 0, y: 10 }}
              animate={{ opacity: 1, y: 0 }}
              exit={{ opacity: 0, y: -10 }}
              transition={{ duration: 0.2 }}
              style={{ display: "flex", flexDirection: "column", gap: 18 }}
            >
              {/* 1. Parallel Life Simulator & 7. Personal Red Team */}
              <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr", gap: 14 }}>
                {/* Parallel Life Card */}
                <div className="glass-panel" style={{ padding: 18, borderColor: "rgba(168,85,247,0.3)" }}>
                  <div style={{ fontSize: 11, fontFamily: "monospace", color: "#A855F7" }}>1. 🥇 PARALLEL LIFE SIMULATOR</div>
                  <h4 style={{ fontSize: 15, fontWeight: 700, margin: "4px 0" }}>Alternate Lifeline Branch</h4>
                  <div style={{ fontSize: 12, color: "#A855F7", fontWeight: 700 }}>{parallelData.simulatedBranch.title}</div>
                  <div style={{ fontSize: 11, color: "rgba(255,255,255,0.7)", margin: "6px 0" }}>
                    30-Day Projection: {parallelData.simulatedBranch.day30Outcome}
                  </div>
                  <div style={{ fontSize: 10, fontFamily: "monospace", color: "rgba(255,255,255,0.4)" }}>
                    Probability: {parallelData.simulatedBranch.projectedProbability}
                  </div>
                </div>

                {/* Personal Red Team Card */}
                <div className="glass-panel" style={{ padding: 18, borderColor: "rgba(255,0,60,0.3)" }}>
                  <div style={{ fontSize: 11, fontFamily: "monospace", color: "#FF003C" }}>7. 🔥 PERSONAL RED TEAM</div>
                  <h4 style={{ fontSize: 15, fontWeight: 700, margin: "4px 0" }}>Adversarial Audit</h4>
                  <div style={{ fontSize: 11, color: "#FF7090", lineHeight: 1.5, margin: "6px 0" }}>
                    {redTeamData.adversaryArgument}
                  </div>
                  <div style={{ fontSize: 10, fontFamily: "monospace", color: "rgba(255,255,255,0.5)" }}>
                    Bias: {redTeamData.historicalBias}
                  </div>
                </div>
              </div>

              {/* Trajectories */}
              <div style={{ display: "grid", gridTemplateColumns: "repeat(auto-fit, minmax(260px, 1fr))", gap: 12 }}>
                {trajectories.map((t) => (
                  <div key={t.id} className="glass-card" style={{ padding: 16, borderTop: `3px solid ${t.color}` }}>
                    <div style={{ fontSize: 14, fontWeight: 700 }}>{t.name}</div>
                    <div style={{ fontSize: 11, color: t.color, margin: "2px 0 6px", fontFamily: "monospace" }}>{t.probability} · {t.projectedLaunchDate}</div>
                    <div style={{ fontSize: 12, color: "rgba(255,255,255,0.7)" }}>{t.summary}</div>
                  </div>
                ))}
              </div>
            </motion.div>
          )}

          {/* CAUSAL UNIVERSE & FORGOTTEN INTEL TAB */}
          {activeTab === "causal" && (
            <motion.div
              key="causal"
              initial={{ opacity: 0, y: 10 }}
              animate={{ opacity: 1, y: 0 }}
              exit={{ opacity: 0, y: -10 }}
              transition={{ duration: 0.2 }}
              style={{ display: "flex", flexDirection: "column", gap: 18 }}
            >
              {/* 4. Personal Causal Universe */}
              <div className="glass-panel" style={{ padding: 20, borderColor: "rgba(251,146,60,0.3)" }}>
                <div style={{ fontSize: 11, fontFamily: "monospace", color: "#FB923C" }}>4. 🌌 PERSONAL CAUSAL UNIVERSE</div>
                <h3 style={{ fontSize: 16, fontWeight: 700, margin: "4px 0" }}>Motivation & Decision Causal Graph</h3>
                <div style={{ display: "flex", gap: 10, flexWrap: "wrap", margin: "12px 0" }}>
                  {causalData.causalNodes.map((n) => (
                    <div key={n.id} style={{ padding: "8px 12px", borderRadius: 8, background: "rgba(251,146,60,0.12)", border: "1px solid rgba(251,146,60,0.3)" }}>
                      <div style={{ fontSize: 10, color: "#FB923C", fontFamily: "monospace" }}>{n.type}</div>
                      <div style={{ fontSize: 12, fontWeight: 700 }}>{n.title}</div>
                    </div>
                  ))}
                </div>
                <div style={{ fontSize: 12, color: "rgba(255,255,255,0.75)", lineHeight: 1.5 }}>
                  {causalData.backwardTrace}
                </div>
              </div>

              {/* 9. Forgotten Intelligence Engine */}
              <div className="glass-panel" style={{ padding: 20, borderColor: "rgba(0,240,255,0.25)" }}>
                <div style={{ fontSize: 11, fontFamily: "monospace", color: "#00F0FF" }}>9. 🌐 FORGOTTEN INTELLIGENCE ENGINE</div>
                <h3 style={{ fontSize: 16, fontWeight: 700, margin: "4px 0" }}>Discovered Forgotten Knowledge</h3>
                <div style={{ fontSize: 12, color: "#00F0FF", margin: "4px 0 12px" }}>{forgottenData.summary}</div>
                <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr", gap: 12 }}>
                  {forgottenData.discoveredItems.map((item, idx) => (
                    <div key={idx} style={{ padding: 12, borderRadius: 10, background: "rgba(255,255,255,0.03)", border: "1px solid rgba(255,255,255,0.08)" }}>
                      <div style={{ fontSize: 13, fontWeight: 700 }}>{item.title}</div>
                      <div style={{ fontSize: 11, color: "rgba(255,255,255,0.6)", margin: "4px 0" }}>{item.context}</div>
                      <div style={{ fontSize: 10, color: "#39FF14", fontFamily: "monospace" }}>{item.relevance}</div>
                    </div>
                  ))}
                </div>
              </div>
            </motion.div>
          )}
        </AnimatePresence>
      </div>

      {/* Signature Impossible Question Modal */}
      {signatureModal && (
        <div
          style={{
            position: "absolute",
            inset: 0,
            zIndex: 120,
            background: "rgba(5, 7, 15, 0.92)",
            backdropFilter: "blur(28px)",
            display: "flex",
            alignItems: "center",
            justifyContent: "center",
            padding: 20,
          }}
          onClick={() => setSignatureModal(false)}
        >
          <div
            className="glass-panel"
            onClick={(e) => e.stopPropagation()}
            style={{
              width: "90%",
              maxWidth: 560,
              padding: 26,
              borderRadius: 24,
              display: "flex",
              flexDirection: "column",
              gap: 16,
              border: "1px solid rgba(0, 240, 255, 0.4)",
              boxShadow: "0 0 30px rgba(0,240,255,0.2)",
            }}
          >
            <div style={{ display: "flex", alignItems: "center", justifyContent: "space-between" }}>
              <div style={{ fontSize: 16, fontWeight: 800, color: "#00F0FF" }}>
                🚨 THE IMPOSSIBLE QUESTION SYNTHESIS
              </div>
              <button onClick={() => setSignatureModal(false)} style={{ background: "none", border: "none", color: "rgba(255,255,255,0.5)", fontSize: 18, cursor: "pointer" }}>
                <i className="fa-solid fa-xmark" />
              </button>
            </div>

            <div style={{ fontSize: 15, fontWeight: 700, color: "#fff" }}>
              "What do you know about me that I don't know about myself?"
            </div>

            <div style={{ fontSize: 13, color: "rgba(255,255,255,0.85)", lineHeight: 1.6 }}>
              {impossibleData.signatureAnswer.synthesis}
            </div>

            <div style={{ padding: 12, borderRadius: 10, background: "rgba(0,240,255,0.08)", border: "1px solid rgba(0,240,255,0.2)" }}>
              <div style={{ fontSize: 11, fontFamily: "monospace", color: "#00F0FF" }}>RECOMMENDED NEXT ACTION</div>
              <div style={{ fontSize: 13, fontWeight: 700, marginTop: 4 }}>{impossibleData.signatureAnswer.actionToMaximizeGoal}</div>
            </div>
          </div>
        </div>
      )}

      {/* Contradiction Receipts Modal */}
      {contradictionModal && (
        <div
          style={{
            position: "absolute",
            inset: 0,
            zIndex: 115,
            background: "rgba(5, 7, 15, 0.9)",
            backdropFilter: "blur(24px)",
            display: "flex",
            alignItems: "center",
            justifyContent: "center",
            padding: 20,
          }}
          onClick={() => setContradictionModal(false)}
        >
          <div
            className="glass-panel"
            onClick={(e) => e.stopPropagation()}
            style={{
              width: "90%",
              maxWidth: 500,
              padding: 24,
              borderRadius: 20,
              display: "flex",
              flexDirection: "column",
              gap: 14,
              border: "1px solid rgba(255,0,60,0.35)",
            }}
          >
            <div style={{ display: "flex", alignItems: "center", justifyContent: "space-between" }}>
              <div style={{ fontSize: 15, fontWeight: 700, color: "#FF7090" }}>Self-Contradiction Receipts</div>
              <button onClick={() => setContradictionModal(false)} style={{ background: "none", border: "none", color: "rgba(255,255,255,0.5)", fontSize: 18, cursor: "pointer" }}>
                <i className="fa-solid fa-xmark" />
              </button>
            </div>

            <div style={{ display: "flex", flexDirection: "column", gap: 10 }}>
              {contradictionData.receipt.evidenceReceipts.map((r, i) => (
                <div key={i} style={{ padding: 12, borderRadius: 10, background: "rgba(255,255,255,0.03)", border: "1px solid rgba(255,255,255,0.06)" }}>
                  <div style={{ fontSize: 11, fontFamily: "monospace", fontWeight: 700 }}>{r.label}</div>
                  <div style={{ fontSize: 12, color: "rgba(255,255,255,0.85)", marginTop: 4 }}>{r.text}</div>
                </div>
              ))}
            </div>
          </div>
        </div>
      )}

      {/* Digital Twin Chat Modal */}
      {chatModal && (
        <div
          style={{
            position: "absolute",
            inset: 0,
            zIndex: 100,
            background: "rgba(5, 7, 15, 0.92)",
            backdropFilter: "blur(24px)",
            display: "flex",
            flexDirection: "column",
          }}
        >
          <div
            style={{
              padding: "14px 20px",
              borderBottom: "1px solid rgba(255,255,255,0.1)",
              display: "flex",
              alignItems: "center",
              justifyContent: "space-between",
              background: "rgba(10,12,22,0.9)",
            }}
          >
            <div style={{ display: "flex", alignItems: "center", gap: 10 }}>
              <i className="fa-solid fa-robot" style={{ color: modeAccent, fontSize: 16 }} />
              <div>
                <div style={{ fontSize: 14, fontWeight: 700 }}>
                  {chatModal.mode === "past"
                    ? "Chat with Past Self"
                    : chatModal.mode === "3way"
                    ? "Decision Time Travel (Past ── Present ── Future)"
                    : "Chat with Future Self"}
                </div>
                <div style={{ fontSize: 10, fontFamily: "monospace", color: "rgba(255,255,255,0.4)" }}>
                  Grounded in Cortex memories & local task history
                </div>
              </div>
            </div>
            <button onClick={() => setChatModal(null)} style={{ background: "transparent", border: "none", color: "rgba(255,255,255,0.5)", fontSize: 18, cursor: "pointer" }}>
              <i className="fa-solid fa-xmark" />
            </button>
          </div>

          <div style={{ flex: 1, padding: 20, overflowY: "auto", display: "flex", flexDirection: "column", gap: 12 }}>
            {chatMessages.map((msg, i) => (
              <div
                key={i}
                style={{
                  alignSelf: msg.sender === "user" ? "flex-end" : "flex-start",
                  maxWidth: "80%",
                  padding: "12px 16px",
                  borderRadius: 16,
                  background: msg.sender === "user" ? `${modeAccent}25` : "rgba(255,255,255,0.05)",
                  border: `1px solid ${msg.sender === "user" ? `${modeAccent}45` : "rgba(255,255,255,0.08)"}`,
                  color: "#fff",
                  fontSize: 13,
                  lineHeight: 1.5,
                  whiteSpace: "pre-wrap",
                }}
              >
                {msg.text}
              </div>
            ))}
            {isThinking && (
              <div style={{ alignSelf: "flex-start", fontSize: 11, color: modeAccent, fontFamily: "monospace" }}>
                Reconstructing Temporal Identity context...
              </div>
            )}
          </div>

          <div style={{ padding: 16, borderTop: "1px solid rgba(255,255,255,0.08)", display: "flex", gap: 10 }}>
            <input
              type="text"
              className="input-cyber"
              placeholder="Ask your temporal identity anything..."
              value={chatInput}
              onChange={(e) => setChatInput(e.target.value)}
              onKeyDown={(e) => e.key === "Enter" && handleSendChat()}
            />
            <button
              onClick={handleSendChat}
              style={{
                padding: "0 20px",
                borderRadius: 10,
                background: modeAccent,
                color: "#000",
                fontWeight: 700,
                border: "none",
                cursor: "pointer",
              }}
            >
              Send
            </button>
          </div>
        </div>
      )}
    </div>
  );
}
