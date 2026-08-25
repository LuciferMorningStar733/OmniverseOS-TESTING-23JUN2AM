import React, { useState, useMemo } from "react";
import { motion, AnimatePresence } from "framer-motion";
import {
  openBlackBox,
  buildImpossibleRoom,
  runInfiniteDebate,
  getUnaskedAnswer,
  runDeadEndMachine,
  runHumanitySimulator,
} from "../lib/cortexBlackBoxEngine";

export default function BlackBoxApp() {
  const [inputText, setInputText] = useState("");
  const [isOpening, setIsOpening] = useState(false);
  const [isOpen, setIsOpen] = useState(false);
  const [activeTab, setActiveTab] = useState("blackbox"); // "blackbox" | "room" | "debate" | "unasked" | "deadend" | "humanity"
  const [selectedRoom, setSelectedRoom] = useState("reality"); // "reality" | "failure" | "future" | "competition" | "impossible"

  const blackBoxData = useMemo(() => openBlackBox(inputText), [inputText]);
  const roomData = useMemo(() => buildImpossibleRoom(inputText), [inputText]);
  const debateData = useMemo(() => runInfiniteDebate(inputText), [inputText]);
  const unaskedData = useMemo(() => getUnaskedAnswer(inputText), [inputText]);
  const deadEndData = useMemo(() => runDeadEndMachine(inputText), [inputText]);
  const humanityData = useMemo(() => runHumanitySimulator(inputText), [inputText]);

  const handleUnlockBlackBox = () => {
    if (!inputText.trim()) return;
    setIsOpening(true);
    setTimeout(() => {
      setIsOpening(false);
      setIsOpen(true);
      setActiveTab("blackbox");
    }, 1000);
  };

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
      data-testid="black-box-app"
    >
      {/* Header Banner */}
      <div
        style={{
          padding: "14px 20px",
          borderBottom: "1px solid rgba(255, 255, 255, 0.1)",
          display: "flex",
          alignItems: "center",
          justifyContent: "space-between",
          background: "rgba(8, 10, 18, 0.95)",
          backdropFilter: "blur(24px)",
        }}
      >
        <div style={{ display: "flex", alignItems: "center", gap: 12 }}>
          <div
            style={{
              width: 36,
              height: 36,
              borderRadius: 12,
              background: "radial-gradient(circle at 35% 35%, #00F0FF, #000)",
              display: "flex",
              alignItems: "center",
              justifyContent: "center",
              boxShadow: "0 0 20px rgba(0, 240, 255, 0.4)",
            }}
          >
            <i className="fa-solid fa-box-open" style={{ color: "#00F0FF", fontSize: 16 }} />
          </div>
          <div>
            <div style={{ fontSize: 17, fontWeight: 800, letterSpacing: "-0.01em", color: "#fff" }}>
              THE BLACK BOX
            </div>
            <div style={{ fontSize: 11, color: "rgba(255,255,255,0.45)", fontFamily: "'JetBrains Mono', monospace" }}>
              "Your problem is not sent to AI. Your problem creates its own universe."
            </div>
          </div>
        </div>

        {/* Sub-System Tabs */}
        {isOpen && (
          <div style={{ display: "flex", gap: 4, padding: 3, borderRadius: 12, background: "rgba(255,255,255,0.04)" }}>
            {[
              { id: "blackbox", label: "🥇 The Black Box", color: "#00F0FF" },
              { id: "room", label: "🥈 Impossible Room", color: "#A855F7" },
              { id: "debate", label: "🥉 Infinite Debate", color: "#39FF14" },
              { id: "unasked", label: "4️⃣ Unasked Answer", color: "#F59E0B" },
              { id: "deadend", label: "5️⃣ Dead-End Machine", color: "#FF003C" },
            ].map((t) => (
              <button
                key={t.id}
                onClick={() => setActiveTab(t.id)}
                style={{
                  padding: "5px 12px",
                  borderRadius: 8,
                  fontSize: 11,
                  fontWeight: 700,
                  border: "none",
                  background: activeTab === t.id ? `${t.color}25` : "transparent",
                  color: activeTab === t.id ? t.color : "rgba(255,255,255,0.5)",
                  cursor: "pointer",
                }}
              >
                {t.label}
              </button>
            ))}
          </div>
        )}
      </div>

      {/* Hero Entry Input Mode */}
      <div style={{ flex: 1, padding: 22, overflowY: "auto", display: "flex", flexDirection: "column", gap: 20 }}>
        <div
          className="glass-panel"
          style={{
            padding: 24,
            borderColor: "rgba(0,240,255,0.3)",
            background: "radial-gradient(circle at 50% 0%, rgba(0,240,255,0.08), transparent 70%)",
            boxShadow: "0 0 30px rgba(0,0,0,0.8)",
          }}
        >
          <div style={{ fontSize: 12, fontFamily: "'JetBrains Mono', monospace", color: "#00F0FF", marginBottom: 8, fontWeight: 700 }}>
            TELL OMNIVERSEOS SOMETHING NOBODY ELSE WOULD UNDERSTAND
          </div>
          <textarea
            rows={3}
            placeholder="Paste your impossible problem, business idea, career trade-off, or contradictory situation..."
            value={inputText}
            onChange={(e) => setInputText(e.target.value)}
            style={{
              width: "100%",
              background: "rgba(0,0,0,0.5)",
              border: "1px solid rgba(255,255,255,0.12)",
              borderRadius: 12,
              padding: 14,
              color: "#fff",
              fontSize: 14,
              fontFamily: "inherit",
              resize: "vertical",
              outline: "none",
            }}
          />

          <div style={{ marginTop: 14, display: "flex", justifyContent: "flex-end" }}>
            <button
              onClick={handleUnlockBlackBox}
              disabled={isOpening || !inputText.trim()}
              style={{
                padding: "12px 28px",
                borderRadius: 14,
                background: "linear-gradient(135deg, #00F0FF, #A855F7)",
                color: "#000",
                fontSize: 13,
                fontWeight: 900,
                border: "none",
                cursor: "pointer",
                boxShadow: "0 0 24px rgba(0,240,255,0.4)",
                display: "flex",
                alignItems: "center",
                gap: 10,
              }}
            >
              {isOpening ? (
                <>
                  <i className="fa-solid fa-spinner fa-spin" />
                  Creating Intelligence Architecture…
                </>
              ) : (
                <>
                  <i className="fa-solid fa-bolt" />
                  UNLOCK THE BLACK BOX
                </>
              )}
            </button>
          </div>
        </div>

        {/* Revealed Content Display */}
        {isOpen && (
          <AnimatePresence mode="wait">
            {/* BLACK BOX REVEAL */}
            {activeTab === "blackbox" && (
              <motion.div
                key="blackbox"
                initial={{ opacity: 0, scale: 0.97 }}
                animate={{ opacity: 1, scale: 1 }}
                exit={{ opacity: 0, scale: 0.97 }}
                transition={{ duration: 0.25 }}
                style={{ display: "flex", flexDirection: "column", gap: 18 }}
              >
                {/* Audit Reveal Header */}
                <div className="glass-panel" style={{ padding: 22, borderColor: "rgba(0,240,255,0.4)" }}>
                  <div style={{ fontSize: 11, fontFamily: "monospace", color: "#00F0FF", fontWeight: 700 }}>
                    FOR YOUR PROBLEM, OMNIVERSE CREATED:
                  </div>

                  <div style={{ display: "grid", gridTemplateColumns: "repeat(3, 1fr)", gap: 12, margin: "14px 0" }}>
                    <div style={{ padding: 12, borderRadius: 10, background: "rgba(0,240,255,0.08)", border: "1px solid rgba(0,240,255,0.2)" }}>
                      <div style={{ fontSize: 18, fontWeight: 900, color: "#00F0FF" }}>✓ 11</div>
                      <div style={{ fontSize: 11, color: "rgba(255,255,255,0.7)" }}>Specialist Perspectives</div>
                    </div>
                    <div style={{ padding: 12, borderRadius: 10, background: "rgba(168,85,247,0.08)", border: "1px solid rgba(168,85,247,0.2)" }}>
                      <div style={{ fontSize: 18, fontWeight: 900, color: "#A855F7" }}>✓ 3</div>
                      <div style={{ fontSize: 11, color: "rgba(255,255,255,0.7)" }}>Simulations</div>
                    </div>
                    <div style={{ padding: 12, borderRadius: 10, background: "rgba(57,255,20,0.08)", border: "1px solid rgba(57,255,20,0.2)" }}>
                      <div style={{ fontSize: 18, fontWeight: 900, color: "#39FF14" }}>✓ 47</div>
                      <div style={{ fontSize: 11, color: "rgba(255,255,255,0.7)" }}>Assumptions Challenged</div>
                    </div>
                  </div>

                  <div style={{ fontSize: 16, fontWeight: 800, color: "#fff", lineHeight: 1.5, marginTop: 10 }}>
                    {blackBoxData.architecture.unexpectedConclusion}
                  </div>
                </div>

                {/* Specialist Perspectives */}
                <div style={{ display: "grid", gridTemplateColumns: "repeat(auto-fit, minmax(240px, 1fr))", gap: 12 }}>
                  {blackBoxData.architecture.specialistPerspectives.map((sp, idx) => (
                    <div key={idx} className="glass-card" style={{ padding: 14, borderLeft: "3px solid #00F0FF" }}>
                      <div style={{ fontSize: 12, fontWeight: 800, color: "#00F0FF" }}>{sp.role}</div>
                      <div style={{ fontSize: 12, color: "rgba(255,255,255,0.75)", marginTop: 4 }}>{sp.insight}</div>
                    </div>
                  ))}
                </div>
              </motion.div>
            )}

            {/* THE IMPOSSIBLE ROOM */}
            {activeTab === "room" && (
              <motion.div
                key="room"
                initial={{ opacity: 0, y: 10 }}
                animate={{ opacity: 1, y: 0 }}
                exit={{ opacity: 0, y: -10 }}
                transition={{ duration: 0.2 }}
                style={{ display: "flex", flexDirection: "column", gap: 18 }}
              >
                <div className="glass-panel" style={{ padding: 20, borderColor: "rgba(168,85,247,0.3)" }}>
                  <div style={{ fontSize: 11, fontFamily: "monospace", color: "#A855F7", fontWeight: 700 }}>
                    🥈 2. THE IMPOSSIBLE ROOM — EXPLORABLE GLASS PERSPECTIVES
                  </div>
                  <h3 style={{ fontSize: 18, fontWeight: 800, margin: "6px 0" }}>Idea: "{roomData.idea}"</h3>

                  {/* Room Selector */}
                  <div style={{ display: "flex", gap: 8, margin: "14px 0" }}>
                    {[
                      { id: "reality", label: "Reality Room", color: "#00F0FF" },
                      { id: "failure", label: "Failure Room", color: "#FF003C" },
                      { id: "future", label: "Future Room", color: "#39FF14" },
                      { id: "competition", label: "Competition Room", color: "#F59E0B" },
                      { id: "impossible", label: "Impossible 100x Room", color: "#A855F7" },
                    ].map((rm) => (
                      <button
                        key={rm.id}
                        onClick={() => setSelectedRoom(rm.id)}
                        style={{
                          padding: "8px 14px",
                          borderRadius: 10,
                          fontSize: 12,
                          fontWeight: 700,
                          border: "none",
                          background: selectedRoom === rm.id ? `${rm.color}25` : "rgba(255,255,255,0.04)",
                          color: selectedRoom === rm.id ? rm.color : "rgba(255,255,255,0.6)",
                          cursor: "pointer",
                        }}
                      >
                        {rm.label}
                      </button>
                    ))}
                  </div>

                  {/* Active Room View */}
                  <div className="glass-card" style={{ padding: 20, borderLeft: `4px solid #A855F7` }}>
                    <div style={{ fontSize: 16, fontWeight: 800, color: "#fff" }}>
                      {roomData.rooms[selectedRoom]?.title}
                    </div>
                    <div style={{ fontSize: 11, fontFamily: "monospace", color: "#A855F7", margin: "4px 0 10px" }}>
                      Status: {roomData.rooms[selectedRoom]?.status}
                    </div>
                    <div style={{ fontSize: 13, color: "rgba(255,255,255,0.85)", lineHeight: 1.6 }}>
                      {roomData.rooms[selectedRoom]?.desc || roomData.rooms[selectedRoom]?.flaw}
                    </div>
                    {roomData.rooms[selectedRoom]?.propagatedImpact && (
                      <div style={{ marginTop: 12, fontSize: 11, fontFamily: "monospace", color: "#FF003C", padding: 8, borderRadius: 6, background: "rgba(255,0,60,0.1)" }}>
                        💥 PROPAGATED IMPACT: {roomData.rooms[selectedRoom].propagatedImpact}
                      </div>
                    )}
                  </div>
                </div>
              </motion.div>
            )}

            {/* INFINITE DEBATE */}
            {activeTab === "debate" && (
              <motion.div
                key="debate"
                initial={{ opacity: 0, y: 10 }}
                animate={{ opacity: 1, y: 0 }}
                exit={{ opacity: 0, y: -10 }}
                transition={{ duration: 0.2 }}
                style={{ display: "flex", flexDirection: "column", gap: 18 }}
              >
                <div className="glass-panel" style={{ padding: 20, borderColor: "rgba(57,255,20,0.3)" }}>
                  <div style={{ fontSize: 11, fontFamily: "monospace", color: "#39FF14" }}>
                    🥉 3. THE INFINITE DEBATE — AUTONOMOUS AGENT SPAWNS
                  </div>
                  <h4 style={{ fontSize: 16, fontWeight: 700, margin: "6px 0" }}>Topic: {debateData.topic}</h4>
                  <div style={{ display: "flex", flexDirection: "column", gap: 10, margin: "14px 0" }}>
                    {debateData.participants.map((p, idx) => (
                      <div key={idx} className="glass-card" style={{ padding: 12, borderLeft: "3px solid #39FF14" }}>
                        <div style={{ fontSize: 12, fontWeight: 800, color: "#39FF14" }}>{p.name}</div>
                        <div style={{ fontSize: 12, color: "rgba(255,255,255,0.8)", marginTop: 2 }}>{p.stance}</div>
                      </div>
                    ))}
                  </div>
                  <div style={{ fontSize: 12, color: "#39FF14", fontWeight: 700 }}>
                    Evolution: {debateData.evolvedSynthesis}
                  </div>
                </div>
              </motion.div>
            )}

            {/* UNASKED ANSWER */}
            {activeTab === "unasked" && (
              <motion.div
                key="unasked"
                initial={{ opacity: 0, y: 10 }}
                animate={{ opacity: 1, y: 0 }}
                exit={{ opacity: 0, y: -10 }}
                transition={{ duration: 0.2 }}
                style={{ display: "flex", flexDirection: "column", gap: 18 }}
              >
                <div className="glass-panel" style={{ padding: 22, borderColor: "rgba(245,158,11,0.3)" }}>
                  <div style={{ fontSize: 11, fontFamily: "monospace", color: "#F59E0B" }}>
                    4️⃣ THE UNASKED ANSWER
                  </div>
                  <div style={{ fontSize: 13, color: "rgba(255,255,255,0.6)", marginTop: 4 }}>
                    Direct Answer: {unaskedData.directAnswer}
                  </div>

                  <div className="glass-card" style={{ padding: 18, marginTop: 14, borderLeft: "4px solid #F59E0B" }}>
                    <div style={{ fontSize: 14, fontWeight: 800, color: "#F59E0B" }}>
                      {unaskedData.unaskedAnswer.headline}
                    </div>
                    <div style={{ fontSize: 13, color: "#fff", margin: "8px 0", lineHeight: 1.5 }}>
                      {unaskedData.unaskedAnswer.deeperInsight}
                    </div>
                  </div>
                </div>
              </motion.div>
            )}

            {/* DEAD-END MACHINE */}
            {activeTab === "deadend" && (
              <motion.div
                key="deadend"
                initial={{ opacity: 0, y: 10 }}
                animate={{ opacity: 1, y: 0 }}
                exit={{ opacity: 0, y: -10 }}
                transition={{ duration: 0.2 }}
                style={{ display: "flex", flexDirection: "column", gap: 18 }}
              >
                <div className="glass-panel" style={{ padding: 20, borderColor: "rgba(255,0,60,0.3)" }}>
                  <div style={{ fontSize: 11, fontFamily: "monospace", color: "#FF003C" }}>
                    5️⃣ THE DEAD-END MACHINE — DOOMED PATH SIMULATOR
                  </div>
                  <div style={{ display: "grid", gridTemplateColumns: "repeat(4, 1fr)", gap: 10, margin: "14px 0" }}>
                    <div style={{ padding: 10, borderRadius: 8, background: "rgba(255,0,60,0.1)", textAlign: "center" }}>
                      <div style={{ fontSize: 20, fontWeight: 900, color: "#FF003C" }}>{deadEndData.distribution.deadEnds}%</div>
                      <div style={{ fontSize: 10, color: "rgba(255,255,255,0.6)" }}>Dead Ends</div>
                    </div>
                    <div style={{ padding: 10, borderRadius: 8, background: "rgba(245,158,11,0.1)", textAlign: "center" }}>
                      <div style={{ fontSize: 20, fontWeight: 900, color: "#F59E0B" }}>{deadEndData.distribution.traps}%</div>
                      <div style={{ fontSize: 10, color: "rgba(255,255,255,0.6)" }}>Traps</div>
                    </div>
                    <div style={{ padding: 10, borderRadius: 8, background: "rgba(255,255,255,0.05)", textAlign: "center" }}>
                      <div style={{ fontSize: 20, fontWeight: 900, color: "#94A3B8" }}>{deadEndData.distribution.mediocre}%</div>
                      <div style={{ fontSize: 10, color: "rgba(255,255,255,0.6)" }}>Mediocre</div>
                    </div>
                    <div style={{ padding: 10, borderRadius: 8, background: "rgba(57,255,20,0.1)", textAlign: "center" }}>
                      <div style={{ fontSize: 20, fontWeight: 900, color: "#39FF14" }}>{deadEndData.distribution.highPotential}%</div>
                      <div style={{ fontSize: 10, color: "rgba(255,255,255,0.6)" }}>High Potential</div>
                    </div>
                  </div>

                  <div className="glass-card" style={{ padding: 16, borderLeft: "3px solid #39FF14" }}>
                    <div style={{ fontSize: 14, fontWeight: 800, color: "#39FF14" }}>{deadEndData.winningPath.title}</div>
                    <div style={{ fontSize: 12, color: "rgba(255,255,255,0.8)", marginTop: 4 }}>{deadEndData.winningPath.reason}</div>
                  </div>
                </div>
              </motion.div>
            )}
          </AnimatePresence>
        )}
      </div>
    </div>
  );
}
