import React, { useState, useMemo } from "react";
import { motion, AnimatePresence } from "framer-motion";
import {
  processOmniverseZero,
  runAIWarRoomPanel,
  collidePossibilities,
  getWhatAmIMissing,
  getProblemTimeMachine,
  getDontSolveItYetEngine,
  getOmniverseBranches,
  runFinalBossAudit,
  getImpossibleSynthesis,
  getOmniverseVerdict,
} from "../lib/cortexZeroEngine";

export default function OmniverseZero() {
  const [inputText, setInputText] = useState("");
  const [isProcessing, setIsProcessing] = useState(false);
  const [activeTab, setActiveTab] = useState("zero"); // "zero" | "warroom" | "collider" | "missing" | "timemachine" | "dontsolve" | "branches" | "finalboss" | "synthesis" | "verdict"

  // Collide inputs
  const [itemA, setItemA] = useState("OmniverseOS Web Desktop");
  const [itemB, setItemB] = useState("Voice AI Memory Core");

  // Computed data
  const zeroData = useMemo(() => processOmniverseZero(inputText), [inputText]);
  const warRoomData = useMemo(() => runAIWarRoomPanel(inputText), [inputText]);
  const colliderData = useMemo(() => collidePossibilities(itemA, itemB), [itemA, itemB]);
  const missingData = useMemo(() => getWhatAmIMissing(inputText), [inputText]);
  const timeMachineData = useMemo(() => getProblemTimeMachine(inputText), [inputText]);
  const dontSolveData = useMemo(() => getDontSolveItYetEngine(inputText), [inputText]);
  const branchesData = useMemo(() => getOmniverseBranches(), []);
  const finalBossData = useMemo(() => runFinalBossAudit(inputText), [inputText]);
  const synthesisData = useMemo(() => getImpossibleSynthesis(), []);
  const verdictData = useMemo(() => getOmniverseVerdict(inputText), [inputText]);

  const handleEnterOmniverse = () => {
    if (!inputText.trim()) return;
    setIsProcessing(true);
    setTimeout(() => {
      setIsProcessing(false);
      setActiveTab("zero");
    }, 900);
  };

  return (
    <div
      style={{
        width: "100%",
        height: "100%",
        display: "flex",
        flexDirection: "column",
        background: "rgba(5, 7, 14, 0.96)",
        color: "#fff",
        fontFamily: "'Outfit', sans-serif",
        overflow: "hidden",
        position: "relative",
      }}
      data-testid="omniverse-zero-app"
    >
      {/* Header Banner */}
      <div
        style={{
          padding: "16px 22px",
          borderBottom: "1px solid rgba(0, 240, 255, 0.2)",
          display: "flex",
          alignItems: "center",
          justifyContent: "space-between",
          background: "linear-gradient(180deg, rgba(10, 15, 30, 0.95), rgba(6, 9, 18, 0.85))",
          backdropFilter: "blur(24px)",
        }}
      >
        <div style={{ display: "flex", alignItems: "center", gap: 12 }}>
          <div
            style={{
              width: 38,
              height: 38,
              borderRadius: 12,
              background: "radial-gradient(circle at 35% 35%, #00F0FF, transparent)",
              display: "flex",
              alignItems: "center",
              justifyContent: "center",
              boxShadow: "0 0 20px rgba(0, 240, 255, 0.4)",
            }}
          >
            <i className="fa-solid fa-atom" style={{ color: "#fff", fontSize: 18 }} />
          </div>
          <div>
            <div style={{ fontSize: 18, fontWeight: 800, letterSpacing: "-0.01em", color: "#00F0FF" }}>
              OMNIVERSE ZERO
            </div>
            <div style={{ fontSize: 11, color: "rgba(255,255,255,0.5)", fontFamily: "'JetBrains Mono', monospace" }}>
              "Drop anything in. Discover what you're missing."
            </div>
          </div>
        </div>

        {/* Action Button */}
        <button
          onClick={handleEnterOmniverse}
          disabled={isProcessing}
          style={{
            padding: "10px 22px",
            borderRadius: 12,
            background: "linear-gradient(135deg, #00F0FF, #A855F7)",
            color: "#000",
            fontSize: 13,
            fontWeight: 800,
            border: "none",
            cursor: "pointer",
            boxShadow: "0 0 20px rgba(0, 240, 255, 0.4)",
            display: "flex",
            alignItems: "center",
            gap: 8,
          }}
        >
          {isProcessing ? (
            <>
              <i className="fa-solid fa-spinner fa-spin" />
              Spinning Intelligence Space…
            </>
          ) : (
            <>
              <i className="fa-solid fa-bolt" />
              ENTER OMNIVERSE
            </>
          )}
        </button>
      </div>

      {/* Sub-System Mode Navigation */}
      <div
        style={{
          padding: "8px 16px",
          background: "rgba(255,255,255,0.02)",
          borderBottom: "1px solid rgba(255,255,255,0.06)",
          display: "flex",
          alignItems: "center",
          gap: 6,
          overflowX: "auto",
          WebkitOverflowScrolling: "touch",
        }}
      >
        {[
          { id: "zero", label: "🥇 Omniverse Zero", color: "#00F0FF" },
          { id: "warroom", label: "🥈 AI War Room Panel", color: "#39FF14" },
          { id: "collider", label: "🥉 Possibility Collider", color: "#A855F7" },
          { id: "missing", label: "4️⃣ What Am I Missing?", color: "#FF003C" },
          { id: "timemachine", label: "5️⃣ Problem Time Machine", color: "#F59E0B" },
          { id: "dontsolve", label: "6️⃣ Don't Solve It Yet", color: "#FB923C" },
          { id: "branches", label: "7️⃣ Omniverse Branches", color: "#00F0FF" },
          { id: "finalboss", label: "8️⃣ Final Boss Audit", color: "#39FF14" },
          { id: "synthesis", label: "9️⃣ Impossible Synthesis", color: "#A855F7" },
          { id: "verdict", label: "🔟 Omniverse Verdict", color: "#FF003C" },
        ].map((t) => (
          <button
            key={t.id}
            onClick={() => setActiveTab(t.id)}
            style={{
              padding: "6px 12px",
              borderRadius: 8,
              fontSize: 11,
              fontWeight: 700,
              border: "none",
              background: activeTab === t.id ? `${t.color}25` : "transparent",
              color: activeTab === t.id ? t.color : "rgba(255,255,255,0.5)",
              boxShadow: activeTab === t.id ? `0 0 12px ${t.color}35` : "none",
              cursor: "pointer",
              whiteSpace: "nowrap",
              transition: "all 0.2s ease",
            }}
          >
            {t.label}
          </button>
        ))}
      </div>

      {/* Main Container */}
      <div style={{ flex: 1, padding: 20, overflowY: "auto", display: "flex", flexDirection: "column", gap: 18 }}>
        {/* Top Drop/Paste Hero Area */}
        <div className="glass-panel" style={{ padding: 16, borderColor: "rgba(0,240,255,0.25)" }}>
          <div style={{ fontSize: 11, fontFamily: "'JetBrains Mono', monospace", color: "#00F0FF", marginBottom: 6 }}>
            HERO INPUT: PASTE MESSY SITUATION / PROBLEM / IDEA / DECISION / CODE / SCREENSHOT TEXT
          </div>
          <textarea
            data-testid="zero-input"
            rows={3}
            placeholder="Paste your complex problem, business decision, messy idea, or contradictory thoughts here..."
            value={inputText}
            onChange={(e) => setInputText(e.target.value)}
            style={{
              width: "100%",
              background: "rgba(0,0,0,0.3)",
              border: "1px solid rgba(255,255,255,0.1)",
              borderRadius: 10,
              padding: 12,
              color: "#fff",
              fontSize: 13,
              fontFamily: "inherit",
              resize: "vertical",
              outline: "none",
            }}
          />
        </div>

        {/* Tab Content Display */}
        <AnimatePresence mode="wait">
          {/* OMNIVERSE ZERO TAB */}
          {activeTab === "zero" && (
            <motion.div
              key="zero"
              initial={{ opacity: 0, y: 10 }}
              animate={{ opacity: 1, y: 0 }}
              exit={{ opacity: 0, y: -10 }}
              transition={{ duration: 0.2 }}
              style={{ display: "flex", flexDirection: "column", gap: 18 }}
            >
              {/* Killer Output Banner */}
              <div
                className="glass-panel"
                style={{
                  padding: 22,
                  borderColor: "rgba(0, 240, 255, 0.4)",
                  background: "linear-gradient(135deg, rgba(0,240,255,0.12), rgba(168,85,247,0.12))",
                  boxShadow: "0 0 26px rgba(0,240,255,0.15)",
                }}
              >
                <div style={{ fontSize: 11, fontFamily: "monospace", color: "#00F0FF", fontWeight: 700 }}>
                  💥 THE OMNIVERSE ZERO REVEAL
                </div>
                <h3 style={{ fontSize: 18, fontWeight: 800, margin: "8px 0", color: "#fff" }}>
                  {zeroData.killerOutput.realProblem}
                </h3>
                <div style={{ fontSize: 12, color: "rgba(255,255,255,0.6)" }}>
                  Indexed {zeroData.wordCount} words · Mapped Facts, Assumptions & Unknowns below.
                </div>
              </div>

              {/* Living Intelligence Universe Map */}
              <div style={{ display: "grid", gridTemplateColumns: "repeat(3, 1fr)", gap: 14 }}>
                {/* FACTS */}
                <div className="glass-card" style={{ padding: 16, borderTop: "3px solid #39FF14" }}>
                  <div style={{ fontSize: 12, fontWeight: 800, color: "#39FF14", marginBottom: 8 }}>
                    <i className="fa-solid fa-circle-check mr-1.5" /> VERIFIED FACTS
                  </div>
                  {zeroData.map.facts.map((f, i) => (
                    <div key={i} style={{ fontSize: 12, color: "rgba(255,255,255,0.8)", marginBottom: 6, lineHeight: 1.4 }}>
                      • {f}
                    </div>
                  ))}
                </div>

                {/* ASSUMPTIONS */}
                <div className="glass-card" style={{ padding: 16, borderTop: "3px solid #F59E0B" }}>
                  <div style={{ fontSize: 12, fontWeight: 800, color: "#F59E0B", marginBottom: 8 }}>
                    <i className="fa-solid fa-triangle-exclamation mr-1.5" /> CHALLENGED ASSUMPTIONS
                  </div>
                  {zeroData.map.assumptions.map((a, i) => (
                    <div key={i} style={{ fontSize: 12, color: "rgba(255,255,255,0.8)", marginBottom: 6, lineHeight: 1.4 }}>
                      • {a}
                    </div>
                  ))}
                </div>

                {/* UNKNOWNS */}
                <div className="glass-card" style={{ padding: 16, borderTop: "3px solid #FF003C" }}>
                  <div style={{ fontSize: 12, fontWeight: 800, color: "#FF003C", marginBottom: 8 }}>
                    <i className="fa-solid fa-circle-question mr-1.5" /> CRITICAL UNKNOWNS
                  </div>
                  {zeroData.map.unknowns.map((u, i) => (
                    <div key={i} style={{ fontSize: 12, color: "rgba(255,255,255,0.8)", marginBottom: 6, lineHeight: 1.4 }}>
                      • {u}
                    </div>
                  ))}
                </div>
              </div>
            </motion.div>
          )}

          {/* AI WAR ROOM PANEL TAB */}
          {activeTab === "warroom" && (
            <motion.div
              key="warroom"
              initial={{ opacity: 0, y: 10 }}
              animate={{ opacity: 1, y: 0 }}
              exit={{ opacity: 0, y: -10 }}
              transition={{ duration: 0.2 }}
              style={{ display: "flex", flexDirection: "column", gap: 18 }}
            >
              {/* What Everyone Missed Banner */}
              <div className="glass-panel" style={{ padding: 20, borderColor: "rgba(57,255,20,0.35)" }}>
                <div style={{ fontSize: 11, fontFamily: "monospace", color: "#39FF14", fontWeight: 700 }}>
                  🎯 THE THING EVERYONE MISSED
                </div>
                <div style={{ fontSize: 15, fontWeight: 700, margin: "6px 0", color: "#fff", lineHeight: 1.5 }}>
                  {warRoomData.thingEveryoneMissed}
                </div>
              </div>

              {/* 5 Agent Roles Panel */}
              <div style={{ display: "grid", gridTemplateColumns: "repeat(auto-fit, minmax(220px, 1fr))", gap: 12 }}>
                {warRoomData.panel.map((agent) => (
                  <div key={agent.role} className="glass-card" style={{ padding: 14, borderLeft: `3px solid ${agent.color}` }}>
                    <div style={{ fontSize: 13, fontWeight: 800, color: agent.color, display: "flex", alignItems: "center", gap: 6 }}>
                      <i className={`fa-solid ${agent.icon}`} /> {agent.role}
                    </div>
                    <div style={{ fontSize: 12, color: "rgba(255,255,255,0.75)", marginTop: 6, lineHeight: 1.4 }}>
                      {agent.statement}
                    </div>
                  </div>
                ))}
              </div>
            </motion.div>
          )}

          {/* POSSIBILITY COLLIDER TAB */}
          {activeTab === "collider" && (
            <motion.div
              key="collider"
              initial={{ opacity: 0, y: 10 }}
              animate={{ opacity: 1, y: 0 }}
              exit={{ opacity: 0, y: -10 }}
              transition={{ duration: 0.2 }}
              style={{ display: "flex", flexDirection: "column", gap: 18 }}
            >
              {/* Inputs */}
              <div className="glass-panel" style={{ padding: 16, display: "grid", gridTemplateColumns: "1fr 1fr", gap: 12 }}>
                <div>
                  <div style={{ fontSize: 10, fontFamily: "monospace", color: "rgba(255,255,255,0.4)" }}>ITEM A</div>
                  <input
                    className="input-cyber"
                    value={itemA}
                    onChange={(e) => setItemA(e.target.value)}
                    placeholder="First item..."
                  />
                </div>
                <div>
                  <div style={{ fontSize: 10, fontFamily: "monospace", color: "rgba(255,255,255,0.4)" }}>ITEM B</div>
                  <input
                    className="input-cyber"
                    value={itemB}
                    onChange={(e) => setItemB(e.target.value)}
                    placeholder="Second item..."
                  />
                </div>
              </div>

              {/* Connections */}
              <div className="glass-panel" style={{ padding: 20, borderColor: "rgba(168,85,247,0.3)" }}>
                <div style={{ fontSize: 11, fontFamily: "monospace", color: "#A855F7" }}>⚡ UNEXPECTED COLLISION DETECTED</div>
                <h4 style={{ fontSize: 15, fontWeight: 700, margin: "6px 0" }}>{colliderData.topConnection.title}</h4>
                <p style={{ fontSize: 13, color: "rgba(255,255,255,0.8)", lineHeight: 1.5 }}>
                  {colliderData.topConnection.desc}
                </p>
              </div>
            </motion.div>
          )}

          {/* WHAT AM I MISSING TAB */}
          {activeTab === "missing" && (
            <motion.div
              key="missing"
              initial={{ opacity: 0, y: 10 }}
              animate={{ opacity: 1, y: 0 }}
              exit={{ opacity: 0, y: -10 }}
              transition={{ duration: 0.2 }}
              style={{ display: "flex", flexDirection: "column", gap: 18 }}
            >
              <div className="glass-panel" style={{ padding: 20, borderColor: "rgba(255,0,60,0.3)" }}>
                <div style={{ fontSize: 11, fontFamily: "monospace", color: "#FF003C" }}>4️⃣ BLIND SPOT DETECTOR</div>
                <h3 style={{ fontSize: 17, fontWeight: 800, margin: "6px 0" }}>{missingData.theMissedQuestion}</h3>
                <div style={{ display: "flex", flexDirection: "column", gap: 10, marginTop: 12 }}>
                  {missingData.blindSpots.map((b, i) => (
                    <div key={i} className="glass-card" style={{ padding: 12, borderLeft: "3px solid #FF003C" }}>
                      <div style={{ fontSize: 13, fontWeight: 700 }}>{b.title}</div>
                      <div style={{ fontSize: 12, color: "rgba(255,255,255,0.7)", marginTop: 2 }}>{b.desc}</div>
                    </div>
                  ))}
                </div>
              </div>
            </motion.div>
          )}

          {/* PROBLEM TIME MACHINE TAB */}
          {activeTab === "timemachine" && (
            <motion.div
              key="timemachine"
              initial={{ opacity: 0, y: 10 }}
              animate={{ opacity: 1, y: 0 }}
              exit={{ opacity: 0, y: -10 }}
              transition={{ duration: 0.2 }}
              style={{ display: "flex", flexDirection: "column", gap: 18 }}
            >
              <div className="glass-panel" style={{ padding: 20, borderColor: "rgba(245,158,11,0.3)" }}>
                <div style={{ fontSize: 11, fontFamily: "monospace", color: "#F59E0B" }}>5️⃣ PROBLEM TIME MACHINE</div>
                <h4 style={{ fontSize: 16, fontWeight: 700, margin: "6px 0" }}>Problem Origin & Cheapest Escape Point</h4>
                <div style={{ display: "flex", flexDirection: "column", gap: 10, marginTop: 10 }}>
                  {timeMachineData.timeline.map((item, idx) => (
                    <div key={idx} className="glass-card" style={{ padding: 12, display: "flex", alignItems: "center", justifyContent: "space-between" }}>
                      <div>
                        <div style={{ fontSize: 11, fontFamily: "monospace", color: "#F59E0B" }}>{item.phase}</div>
                        <div style={{ fontSize: 13, fontWeight: 700, color: "#fff" }}>{item.detail}</div>
                      </div>
                      <span style={{ fontSize: 10, fontFamily: "monospace", padding: "4px 8px", borderRadius: 6, background: "rgba(255,255,255,0.06)" }}>
                        {item.impact}
                      </span>
                    </div>
                  ))}
                </div>
              </div>
            </motion.div>
          )}

          {/* DON'T SOLVE IT YET TAB */}
          {activeTab === "dontsolve" && (
            <motion.div
              key="dontsolve"
              initial={{ opacity: 0, y: 10 }}
              animate={{ opacity: 1, y: 0 }}
              exit={{ opacity: 0, y: -10 }}
              transition={{ duration: 0.2 }}
              style={{ display: "flex", flexDirection: "column", gap: 18 }}
            >
              <div className="glass-panel" style={{ padding: 22, borderColor: "rgba(251,146,60,0.3)" }}>
                <div style={{ fontSize: 11, fontFamily: "monospace", color: "#FB923C", fontWeight: 700 }}>
                  6️⃣ DON'T SOLVE THIS YET
                </div>
                <h3 style={{ fontSize: 18, fontWeight: 800, margin: "8px 0" }}>{dontSolveData.warning}</h3>
                <div style={{ fontSize: 14, color: "#00F0FF", fontWeight: 700, margin: "10px 0" }}>
                  Question That Changes Everything: "{dontSolveData.questionThatChangesEverything}"
                </div>
              </div>
            </motion.div>
          )}

          {/* OMNIVERSE BRANCHES TAB */}
          {activeTab === "branches" && (
            <motion.div
              key="branches"
              initial={{ opacity: 0, y: 10 }}
              animate={{ opacity: 1, y: 0 }}
              exit={{ opacity: 0, y: -10 }}
              transition={{ duration: 0.2 }}
              style={{ display: "flex", flexDirection: "column", gap: 18 }}
            >
              <div className="glass-panel" style={{ padding: 20, borderColor: "rgba(0,240,255,0.3)" }}>
                <div style={{ fontSize: 11, fontFamily: "monospace", color: "#00F0FF" }}>7️⃣ INTERACTIVE DECISION BRANCHES</div>
                <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr", gap: 14, margin: "12px 0" }}>
                  <div className="glass-card" style={{ padding: 16, borderTop: "3px solid #39FF14" }}>
                    <div style={{ fontSize: 14, fontWeight: 700, color: "#39FF14" }}>{branchesData.pathA.name}</div>
                    <div style={{ fontSize: 12, color: "rgba(255,255,255,0.7)", marginTop: 6 }}>Best: {branchesData.pathA.bestCase}</div>
                  </div>
                  <div className="glass-card" style={{ padding: 16, borderTop: "3px solid #FF003C" }}>
                    <div style={{ fontSize: 14, fontWeight: 700, color: "#FF003C" }}>{branchesData.pathB.name}</div>
                    <div style={{ fontSize: 12, color: "rgba(255,255,255,0.7)", marginTop: 6 }}>Best: {branchesData.pathB.bestCase}</div>
                  </div>
                </div>
                <div style={{ fontSize: 12, color: "#00F0FF", fontWeight: 700 }}>
                  Recommendation: {branchesData.recommendation}
                </div>
              </div>
            </motion.div>
          )}

          {/* FINAL BOSS AUDIT TAB */}
          {activeTab === "finalboss" && (
            <motion.div
              key="finalboss"
              initial={{ opacity: 0, y: 10 }}
              animate={{ opacity: 1, y: 0 }}
              exit={{ opacity: 0, y: -10 }}
              transition={{ duration: 0.2 }}
              style={{ display: "flex", flexDirection: "column", gap: 18 }}
            >
              <div className="glass-panel" style={{ padding: 20, borderColor: "rgba(57,255,20,0.3)" }}>
                <div style={{ fontSize: 11, fontFamily: "monospace", color: "#39FF14" }}>8️⃣ THE FINAL BOSS AUDIT</div>
                <h3 style={{ fontSize: 18, fontWeight: 800, margin: "6px 0", color: "#39FF14" }}>{finalBossData.theWinner.title}</h3>
                <div style={{ fontSize: 13, color: "rgba(255,255,255,0.85)", lineHeight: 1.5 }}>
                  {finalBossData.theWinner.description}
                </div>
              </div>
            </motion.div>
          )}

          {/* IMPOSSIBLE SYNTHESIS TAB */}
          {activeTab === "synthesis" && (
            <motion.div
              key="synthesis"
              initial={{ opacity: 0, y: 10 }}
              animate={{ opacity: 1, y: 0 }}
              exit={{ opacity: 0, y: -10 }}
              transition={{ duration: 0.2 }}
              style={{ display: "flex", flexDirection: "column", gap: 18 }}
            >
              <div className="glass-panel" style={{ padding: 20, borderColor: "rgba(168,85,247,0.3)" }}>
                <div style={{ fontSize: 11, fontFamily: "monospace", color: "#A855F7" }}>9️⃣ IMPOSSIBLE SYNTHESIS (IDEA GENOME)</div>
                <div style={{ fontSize: 14, fontWeight: 700, margin: "10px 0", color: "#fff", lineHeight: 1.5 }}>
                  {synthesisData.ideaGenome}
                </div>
              </div>
            </motion.div>
          )}

          {/* OMNIVERSE VERDICT TAB */}
          {activeTab === "verdict" && (
            <motion.div
              key="verdict"
              initial={{ opacity: 0, y: 10 }}
              animate={{ opacity: 1, y: 0 }}
              exit={{ opacity: 0, y: -10 }}
              transition={{ duration: 0.2 }}
              style={{ display: "flex", flexDirection: "column", gap: 18 }}
            >
              <div className="glass-panel" style={{ padding: 22, borderColor: "rgba(255,0,60,0.3)" }}>
                <div style={{ fontSize: 11, fontFamily: "monospace", color: "#FF003C", fontWeight: 700 }}>
                  🔟 THE OMNIVERSE VERDICT
                </div>
                <h3 style={{ fontSize: 18, fontWeight: 800, margin: "6px 0" }}>{verdictData.theBet}</h3>
                <div style={{ fontSize: 13, color: "rgba(255,255,255,0.8)", margin: "8px 0" }}>
                  <strong>Why:</strong> {verdictData.why}
                </div>
                <div style={{ fontSize: 12, color: "#FF7090" }}>
                  <strong>What Could Destroy This:</strong> {verdictData.whatCouldDestroyThis}
                </div>
              </div>
            </motion.div>
          )}
        </AnimatePresence>
      </div>
    </div>
  );
}
