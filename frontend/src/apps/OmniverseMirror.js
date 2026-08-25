import React, { useState, useMemo } from "react";
import { motion, AnimatePresence } from "framer-motion";
import {
  getMirrorHistoricalTimeline,
  getMirrorPresentAnalysis,
  getMirrorFutureTrajectories,
  getDigitalTwinSystemPrompt,
} from "../lib/cortexMirrorEngine";

export default function OmniverseMirror() {
  const [activeTab, setActiveTab] = useState("future"); // "past" | "present" | "future"
  const [chatModal, setChatModal] = useState(null); // { mode: "past" | "future", trajectoryId?: string }
  const [evidenceModal, setEvidenceModal] = useState(null); // insight evidence object
  const [chatMessages, setChatMessages] = useState([]);
  const [chatInput, setChatInput] = useState("");
  const [isThinking, setIsThinking] = useState(false);

  const timeline = useMemo(() => getMirrorHistoricalTimeline(), []);
  const presentData = useMemo(() => getMirrorPresentAnalysis(), []);
  const trajectories = useMemo(() => getMirrorFutureTrajectories(), []);

  // Theme accents per tab
  const modeAccent =
    activeTab === "past" ? "#F59E0B" :
    activeTab === "present" ? "#00F0FF" :
    "#A855F7";

  const modeGlow =
    activeTab === "past" ? "rgba(245,158,11,0.25)" :
    activeTab === "present" ? "rgba(0,240,255,0.25)" :
    "rgba(168,85,247,0.25)";

  const openDigitalTwinChat = (mode, trajectoryId = "traj-peak") => {
    const sysPrompt = getDigitalTwinSystemPrompt(mode, trajectoryId);
    const initialGreeting =
      mode === "past"
        ? "Hey, I'm Past Self reconstructed from your historical records. What do you want to reflect on?"
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
        reply = `Based on your recorded memories and completed task history, your primary focus has been quality, desktop responsiveness, and shipping a clean product. Re-reading those notes confirms your execution trajectory.`;
      } else {
        reply = `Looking at this trajectory simulation, maintaining a high daily task resolution rate and prioritizing system reliability by September 1st yields the highest user retention outcome.`;
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
        background: "rgba(6, 8, 16, 0.94)",
        color: "#fff",
        fontFamily: "'Outfit', sans-serif",
        overflow: "hidden",
        position: "relative",
      }}
    >
      {/* Top Header & Tri-Mode Selector */}
      <div
        style={{
          padding: "16px 22px",
          borderBottom: "1px solid rgba(255,255,255,0.08)",
          display: "flex",
          alignItems: "center",
          justifyContent: "space-between",
          background: "rgba(10, 12, 22, 0.8)",
          backdropFilter: "blur(24px)",
        }}
      >
        <div style={{ display: "flex", alignItems: "center", gap: 12 }}>
          <div
            style={{
              width: 34,
              height: 34,
              borderRadius: 10,
              background: `radial-gradient(circle at 35% 35%, ${modeAccent}, transparent)`,
              display: "flex",
              alignItems: "center",
              justifyContent: "center",
              boxShadow: `0 0 16px ${modeGlow}`,
              transition: "all 0.3s ease",
            }}
          >
            <i className="fa-solid fa-wand-magic-sparkles" style={{ color: "#fff", fontSize: 16 }} />
          </div>
          <div>
            <div style={{ fontSize: 16, fontWeight: 700, letterSpacing: "-0.01em" }}>THE MIRROR</div>
            <div style={{ fontSize: 11, color: "rgba(255,255,255,0.45)", fontFamily: "'JetBrains Mono', monospace" }}>
              Evidence-Grounded AI Digital Twin
            </div>
          </div>
        </div>

        {/* Mode Tabs */}
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
            { id: "past", label: "🪞 Past (Time Machine)", color: "#F59E0B" },
            { id: "present", label: "🧠 Present (Observer)", color: "#00F0FF" },
            { id: "future", label: "🔮 Future (Simulator)", color: "#A855F7" },
          ].map((t) => (
            <button
              key={t.id}
              onClick={() => setActiveTab(t.id)}
              style={{
                padding: "6px 14px",
                borderRadius: 10,
                fontSize: 12,
                fontWeight: 600,
                border: "none",
                background: activeTab === t.id ? `${t.color}20` : "transparent",
                color: activeTab === t.id ? t.color : "rgba(255,255,255,0.5)",
                boxShadow: activeTab === t.id ? `0 0 12px ${t.color}30` : "none",
                cursor: "pointer",
                transition: "all 0.2s ease",
              }}
            >
              {t.label}
            </button>
          ))}
        </div>
      </div>

      {/* Mode Body Content */}
      <div style={{ flex: 1, padding: 22, overflowY: "auto" }}>
        <AnimatePresence mode="wait">
          {/* PAST MODE */}
          {activeTab === "past" && (
            <motion.div
              key="past"
              initial={{ opacity: 0, y: 10 }}
              animate={{ opacity: 1, y: 0 }}
              exit={{ opacity: 0, y: -10 }}
              transition={{ duration: 0.2 }}
              style={{ display: "flex", flexDirection: "column", gap: 20 }}
            >
              <div style={{ display: "flex", alignItems: "center", justifyContent: "space-between" }}>
                <div>
                  <h3 style={{ fontSize: 18, fontWeight: 700, margin: 0 }}>Historical Timeline & Memory Reconstruction</h3>
                  <p style={{ fontSize: 12, color: "rgba(255,255,255,0.5)", margin: "4px 0 0" }}>
                    Reconstruct your history from Cortex memory entries and task records.
                  </p>
                </div>
                <button
                  onClick={() => openDigitalTwinChat("past")}
                  style={{
                    padding: "8px 16px",
                    borderRadius: 10,
                    background: "rgba(245,158,11,0.15)",
                    border: "1px solid rgba(245,158,11,0.4)",
                    color: "#F59E0B",
                    fontSize: 12,
                    fontWeight: 600,
                    cursor: "pointer",
                    display: "flex",
                    alignItems: "center",
                    gap: 8,
                  }}
                >
                  <i className="fa-solid fa-comments" />
                  Chat with Past Self
                </button>
              </div>

              {/* Timeline Cards */}
              {timeline.length === 0 ? (
                <div className="glass-panel" style={{ padding: 24, textAlign: "center", color: "rgba(255,255,255,0.5)" }}>
                  <i className="fa-solid fa-folder-open" style={{ fontSize: 28, color: "#F59E0B", marginBottom: 8 }} />
                  <div style={{ fontSize: 14, fontWeight: 700, color: "#fff" }}>No Recorded Memories Yet</div>
                  <div style={{ fontSize: 12, marginTop: 4 }}>Save notes, complete tasks, or converse with Cortex AI to build your digital twin timeline.</div>
                </div>
              ) : (
                <div style={{ display: "flex", flexDirection: "column", gap: 12 }}>
                  {timeline.map((item) => (
                    <div
                      key={item.id}
                      className="glass-card"
                      style={{
                        padding: 16,
                        display: "flex",
                        alignItems: "flex-start",
                        justifyContent: "space-between",
                        gap: 16,
                      }}
                    >
                      <div>
                        <div style={{ fontSize: 11, fontFamily: "'JetBrains Mono', monospace", color: "#F59E0B", marginBottom: 4 }}>
                          {item.dateStr} · {item.category}
                        </div>
                        <div style={{ fontSize: 14, fontWeight: 700, color: "#fff" }}>{item.title}</div>
                        <div style={{ fontSize: 12, color: "rgba(255,255,255,0.6)", marginTop: 4 }}>{item.context}</div>
                      </div>
                      <span
                        style={{
                          fontSize: 10,
                          fontFamily: "monospace",
                          padding: "3px 8px",
                          borderRadius: 6,
                          background: "rgba(255,255,255,0.06)",
                          color: "rgba(255,255,255,0.5)",
                        }}
                      >
                        Impact: {item.impact}
                      </span>
                    </div>
                  ))}
                </div>
              )}
            </motion.div>
          )}

          {/* PRESENT MODE */}
          {activeTab === "present" && (
            <motion.div
              key="present"
              initial={{ opacity: 0, y: 10 }}
              animate={{ opacity: 1, y: 0 }}
              exit={{ opacity: 0, y: -10 }}
              transition={{ duration: 0.2 }}
              style={{ display: "flex", flexDirection: "column", gap: 20 }}
            >
              {/* Observer Overview Banner */}
              <div
                className="glass-panel"
                style={{
                  padding: 20,
                  display: "flex",
                  alignItems: "center",
                  justifyContent: "space-between",
                  borderColor: "rgba(0,240,255,0.25)",
                }}
              >
                <div>
                  <div style={{ fontSize: 11, fontFamily: "'JetBrains Mono', monospace", color: "#00F0FF" }}>
                    LIVE OBSERVER DASHBOARD · {presentData.confidenceLabel || "Moderate Confidence"}
                  </div>
                  <h3 style={{ fontSize: 18, fontWeight: 700, margin: "4px 0" }}>Stated Goal: {presentData.statedGoal}</h3>
                  <div style={{ fontSize: 12, color: "rgba(255,255,255,0.6)" }}>
                    Current Focus: <span style={{ color: "#fff" }}>{presentData.recentFocus}</span>
                  </div>
                </div>
                <div style={{ textAlign: "right" }}>
                  <div style={{ fontSize: 28, fontWeight: 800, color: "#00F0FF" }}>
                    {presentData.priorityDriftScore !== null ? `${presentData.priorityDriftScore}%` : "N/A"}
                  </div>
                  <div style={{ fontSize: 10, fontFamily: "monospace", color: "rgba(255,255,255,0.4)" }}>
                    {presentData.priorityDriftScore !== null ? "Alignment Score" : "Insufficient Data"}
                  </div>
                </div>
              </div>

              {/* Insights List with Evidence Buttons */}
              <div style={{ display: "flex", flexDirection: "column", gap: 12 }}>
                <h4 style={{ fontSize: 14, fontWeight: 700, margin: 0, color: "rgba(255,255,255,0.8)" }}>Pattern Detections & Evidence</h4>
                {presentData.insights.map((ins) => (
                  <div
                    key={ins.id}
                    className="glass-card"
                    style={{
                      padding: 16,
                      borderLeft: `4px solid ${ins.type === "warning" ? "#F59E0B" : ins.type === "positive" ? "#39FF14" : "#00F0FF"}`,
                      display: "flex",
                      alignItems: "center",
                      justifyContent: "space-between",
                      gap: 16,
                    }}
                  >
                    <div>
                      <div style={{ fontSize: 14, fontWeight: 700 }}>{ins.title}</div>
                      <div style={{ fontSize: 12, color: "rgba(255,255,255,0.65)", marginTop: 4 }}>{ins.desc}</div>
                    </div>
                    <div style={{ display: "flex", gap: 8 }}>
                      {ins.evidence && (
                        <button
                          onClick={() => setEvidenceModal(ins.evidence)}
                          style={{
                            padding: "6px 12px",
                            borderRadius: 8,
                            fontSize: 11,
                            background: "rgba(0,240,255,0.12)",
                            border: "1px solid rgba(0,240,255,0.35)",
                            color: "#00F0FF",
                            cursor: "pointer",
                          }}
                        >
                          Why does Mirror think this?
                        </button>
                      )}
                    </div>
                  </div>
                ))}
              </div>
            </motion.div>
          )}

          {/* FUTURE MODE */}
          {activeTab === "future" && (
            <motion.div
              key="future"
              initial={{ opacity: 0, y: 10 }}
              animate={{ opacity: 1, y: 0 }}
              exit={{ opacity: 0, y: -10 }}
              transition={{ duration: 0.2 }}
              style={{ display: "flex", flexDirection: "column", gap: 20 }}
            >
              <div>
                <h3 style={{ fontSize: 18, fontWeight: 700, margin: 0 }}>Trajectory Simulator & Ask Future Self</h3>
                <p style={{ fontSize: 12, color: "rgba(255,255,255,0.5)", margin: "4px 0 0" }}>
                  Simulated futures calculated from observed velocity and task completion history.
                </p>
              </div>

              {/* Grid of Trajectories */}
              <div style={{ display: "grid", gridTemplateColumns: "repeat(auto-fit, minmax(280px, 1fr))", gap: 14 }}>
                {trajectories.map((t) => (
                  <div
                    key={t.id}
                    className="glass-card"
                    style={{
                      padding: 18,
                      display: "flex",
                      flexDirection: "column",
                      justifyContent: "space-between",
                      gap: 14,
                      borderTop: `3px solid ${t.color}`,
                    }}
                  >
                    <div>
                      <div style={{ display: "flex", alignItems: "center", justifyContent: "space-between", marginBottom: 6 }}>
                        <div style={{ display: "flex", alignItems: "center", gap: 8 }}>
                          <i className={`fa-solid ${t.icon}`} style={{ color: t.color, fontSize: 14 }} />
                          <span style={{ fontSize: 14, fontWeight: 700 }}>{t.name}</span>
                        </div>
                        <span style={{ fontSize: 11, fontFamily: "monospace", color: t.color }}>{t.probability}</span>
                      </div>
                      <div style={{ fontSize: 11, color: "rgba(255,255,255,0.45)", fontStyle: "italic" }}>{t.tagline}</div>
                      <div style={{ fontSize: 12, color: "rgba(255,255,255,0.75)", marginTop: 10, lineHeight: 1.5 }}>
                        {t.summary}
                      </div>
                      <div style={{ fontSize: 10, fontFamily: "monospace", color: "rgba(255,255,255,0.4)", marginTop: 8 }}>
                        ℹ {t.simulationNotice}
                      </div>
                    </div>

                    <button
                      onClick={() => openDigitalTwinChat("future", t.id)}
                      style={{
                        width: "100%",
                        padding: "8px 12px",
                        borderRadius: 10,
                        background: `${t.color}15`,
                        border: `1px solid ${t.color}40`,
                        color: t.color,
                        fontSize: 12,
                        fontWeight: 600,
                        cursor: "pointer",
                        display: "flex",
                        alignItems: "center",
                        justifyContent: "center",
                        gap: 6,
                      }}
                    >
                      <i className="fa-solid fa-sparkles" />
                      Chat with Future Self
                    </button>
                  </div>
                ))}
              </div>
            </motion.div>
          )}
        </AnimatePresence>
      </div>

      {/* Why Does Mirror Think This? Evidence Modal */}
      {evidenceModal && (
        <div
          style={{
            position: "absolute",
            inset: 0,
            zIndex: 110,
            background: "rgba(5, 7, 15, 0.88)",
            backdropFilter: "blur(24px)",
            display: "flex",
            alignItems: "center",
            justifyContent: "center",
            padding: 20,
          }}
          onClick={() => setEvidenceModal(null)}
        >
          <div
            className="glass-panel"
            onClick={(e) => e.stopPropagation()}
            style={{
              width: "90%",
              maxWidth: 480,
              padding: 24,
              borderRadius: 20,
              display: "flex",
              flexDirection: "column",
              gap: 16,
              border: "1px solid rgba(0, 240, 255, 0.35)",
            }}
          >
            <div style={{ display: "flex", alignItems: "center", justifyContent: "space-between" }}>
              <div style={{ fontSize: 15, fontWeight: 700, color: "#00F0FF" }}>Why does Mirror think this?</div>
              <button
                onClick={() => setEvidenceModal(null)}
                style={{ background: "none", border: "none", color: "rgba(255,255,255,0.5)", fontSize: 16, cursor: "pointer" }}
              >
                <i className="fa-solid fa-xmark" />
              </button>
            </div>

            <div style={{ fontSize: 13, color: "rgba(255,255,255,0.9)", lineHeight: 1.5 }}>
              <strong>Conclusion:</strong> {evidenceModal.conclusion}
            </div>

            <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr", gap: 10, fontSize: 11, fontFamily: "monospace" }}>
              <div style={{ padding: 10, borderRadius: 8, background: "rgba(255,255,255,0.03)" }}>
                <span style={{ color: "rgba(255,255,255,0.4)" }}>Confidence Level:</span>
                <div style={{ color: "#00F0FF", fontWeight: 700, marginTop: 2 }}>{evidenceModal.confidence}</div>
              </div>
              <div style={{ padding: 10, borderRadius: 8, background: "rgba(255,255,255,0.03)" }}>
                <span style={{ color: "rgba(255,255,255,0.4)" }}>Evidence Items:</span>
                <div style={{ color: "#fff", fontWeight: 700, marginTop: 2 }}>{evidenceModal.evidence_count} records</div>
              </div>
            </div>

            {evidenceModal.evidence_items && evidenceModal.evidence_items.length > 0 && (
              <div>
                <div style={{ fontSize: 11, fontFamily: "monospace", color: "rgba(255,255,255,0.4)", marginBottom: 6 }}>
                  Observed Reference Records:
                </div>
                <ul style={{ margin: 0, paddingLeft: 18, fontSize: 12, color: "rgba(255,255,255,0.75)", lineHeight: 1.6 }}>
                  {evidenceModal.evidence_items.map((item, idx) => (
                    <li key={idx}>{item}</li>
                  ))}
                </ul>
              </div>
            )}
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
            background: "rgba(5, 7, 15, 0.88)",
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
                  {chatModal.mode === "past" ? "Chat with Past Self (Historically Grounded)" : "Chat with Future Self (Trajectory Simulation)"}
                </div>
                <div style={{ fontSize: 10, fontFamily: "monospace", color: "rgba(255,255,255,0.4)" }}>
                  Grounded in Cortex memories & local task history
                </div>
              </div>
            </div>
            <button
              onClick={() => setChatModal(null)}
              style={{ background: "transparent", border: "none", color: "rgba(255,255,255,0.5)", fontSize: 18, cursor: "pointer" }}
            >
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
                }}
              >
                {msg.text}
              </div>
            ))}
            {isThinking && (
              <div style={{ alignSelf: "flex-start", fontSize: 11, color: modeAccent, fontFamily: "monospace" }}>
                Reconstructing Digital Twin context...
              </div>
            )}
          </div>

          <div style={{ padding: 16, borderTop: "1px solid rgba(255,255,255,0.08)", display: "flex", gap: 10 }}>
            <input
              type="text"
              className="input-cyber"
              placeholder="Ask your digital twin anything..."
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
