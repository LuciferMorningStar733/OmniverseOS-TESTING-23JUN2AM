import React, { useState } from "react";
import { motion, AnimatePresence } from "framer-motion";

export default function MobileIntelligenceStacks({ onOpenApp }) {
  const [expandedStack, setExpandedStack] = useState("now");

  const STACKS = [
    {
      id: "now",
      title: "NOW",
      icon: "fa-bolt-lightning",
      color: "#00F0FF",
      summary: "3 priority signals require strategic attention",
      items: [
        {
          label: "Autonomous Microgrid Dispatch Gate",
          tag: "CRITICAL",
          desc: "Storage buffer threshold calibrated to 94%",
          app: "swarm",
          actionText: "Launch Swarm",
        },
        {
          label: "Executive War Room Deliberation",
          tag: "PENDING",
          desc: "5 AI agents awaiting situation prompt",
          app: "warroom",
          actionText: "Convene",
        },
        {
          label: "Cortex Memory Consolidation",
          tag: "ACTIVE",
          desc: "12 new semantic nodes indexed today",
          app: "memory",
          actionText: "Inspect",
        },
      ],
    },
    {
      id: "mind",
      title: "MIND",
      icon: "fa-brain",
      color: "#A855F7",
      summary: "Cognitive telemetry & behavioral loop analysis",
      items: [
        {
          label: "Adversarial Stress Test Recommended",
          tag: "INSIGHT",
          desc: "Test latest startup thesis against ruthless critic",
          app: "adversary",
          actionText: "Attack Idea",
        },
        {
          label: "Counterfactual Mirror Projection",
          tag: "SIMULATION",
          desc: "What-if scenario analysis ready for review",
          app: "mirror",
          actionText: "Reflect",
        },
        {
          label: "First-Principles Zero Decomposition",
          tag: "FOUNDATION",
          desc: "Deep problem isolation and constraint solver",
          app: "zero",
          actionText: "Decompose",
        },
      ],
    },
    {
      id: "swarm",
      title: "SWARM",
      icon: "fa-share-nodes",
      color: "#39FF14",
      summary: "4 parallel agent synthesis engines ready",
      items: [
        {
          label: "Multi-Model Face-Off Benchmarking",
          tag: "EVAL",
          desc: "Gemini, DeepSeek, Groq, Cerebras comparative test",
          app: "faceoff",
          actionText: "Benchmark",
        },
        {
          label: "Neural Matrix Topology",
          tag: "TOPOLOGY",
          desc: "Live spatial agent relationship graph",
          app: "matrix",
          actionText: "View Graph",
        },
        {
          label: "The Black Box Autonomous Engine",
          tag: "REASONING",
          desc: "Deep hidden center of gravity synthesis",
          app: "blackbox",
          actionText: "Engage",
        },
      ],
    },
    {
      id: "next",
      title: "NEXT",
      icon: "fa-calendar-days",
      color: "#FB923C",
      summary: "Tomorrow is 85% scheduled — preparation ready",
      items: [
        {
          label: "OmniverseOS Public Launch Review",
          tag: "SCHEDULE",
          desc: "Tomorrow at 10:00 AM · Product Roadmap",
          app: "calendar",
          actionText: "Open Calendar",
        },
        {
          label: "Deep Work Focus Tunnel",
          tag: "FOCUS",
          desc: "Recommended 2.5h uninterrupted engineering block",
          app: "tasks",
          actionText: "Start Tasks",
        },
        {
          label: "Project DNA & Timeline Milestones",
          tag: "MILESTONE",
          desc: "Review sprint deliverables and decision log",
          app: "projects",
          actionText: "Projects",
        },
      ],
    },
  ];

  return (
    <div
      style={{
        width: "100%",
        display: "flex",
        flexDirection: "column",
        gap: 8,
        padding: "0 16px",
      }}
      data-testid="mobile-intelligence-stacks"
    >
      <div
        style={{
          display: "flex",
          alignItems: "center",
          justifyContent: "space-between",
          padding: "0 4px",
        }}
      >
        <span
          style={{
            fontSize: 10,
            fontFamily: "monospace",
            color: "rgba(255, 255, 255, 0.4)",
            letterSpacing: "0.15em",
            fontWeight: 700,
          }}
        >
          INTELLIGENCE STACKS // 2099
        </span>
        <span
          style={{
            fontSize: 9.5,
            color: "#00F0FF",
            fontFamily: "monospace",
            background: "rgba(0, 240, 255, 0.1)",
            padding: "2px 6px",
            borderRadius: 6,
          }}
        >
          4 CORES SYNCED
        </span>
      </div>

      {STACKS.map((st) => {
        const isExp = expandedStack === st.id;
        return (
          <motion.div
            key={st.id}
            onClick={() => setExpandedStack(isExp ? null : st.id)}
            whileTap={{ scale: 0.99 }}
            style={{
              padding: "14px 16px",
              borderRadius: 20,
              background: isExp
                ? "radial-gradient(ellipse at 80% 0%, rgba(12, 18, 38, 0.95) 0%, rgba(4, 7, 16, 0.95) 100%)"
                : "rgba(8, 12, 24, 0.75)",
              border: `1px solid ${isExp ? st.color : "rgba(255, 255, 255, 0.08)"}`,
              boxShadow: isExp
                ? `0 8px 30px rgba(0, 0, 0, 0.6), 0 0 20px ${st.color}20`
                : "0 4px 15px rgba(0, 0, 0, 0.3)",
              cursor: "pointer",
              transition: "border 0.25s ease, box-shadow 0.25s ease",
            }}
          >
            {/* Header Row */}
            <div style={{ display: "flex", alignItems: "center", justifyContent: "space-between" }}>
              <div style={{ display: "flex", alignItems: "center", gap: 10 }}>
                <span
                  style={{
                    fontSize: 10,
                    fontFamily: "monospace",
                    fontWeight: 900,
                    padding: "3px 8px",
                    borderRadius: 8,
                    background: `${st.color}22`,
                    color: st.color,
                    border: `1px solid ${st.color}40`,
                    display: "flex",
                    alignItems: "center",
                    gap: 5,
                  }}
                >
                  <i className={`fa-solid ${st.icon}`} style={{ fontSize: 9 }} />
                  {st.title}
                </span>
                <span style={{ fontSize: 12.5, fontWeight: 700, color: "#fff", letterSpacing: "-0.01em" }}>
                  {st.summary}
                </span>
              </div>
              <motion.i
                animate={{ rotate: isExp ? 180 : 0 }}
                transition={{ duration: 0.2 }}
                className="fa-solid fa-chevron-down"
                style={{ color: "rgba(255, 255, 255, 0.4)", fontSize: 11 }}
              />
            </div>

            {/* Expandable Items */}
            <AnimatePresence>
              {isExp && (
                <motion.div
                  initial={{ height: 0, opacity: 0 }}
                  animate={{ height: "auto", opacity: 1 }}
                  exit={{ height: 0, opacity: 0 }}
                  transition={{ duration: 0.25, ease: "easeOut" }}
                  style={{ overflow: "hidden" }}
                >
                  <div style={{ display: "flex", flexDirection: "column", gap: 8, paddingTop: 14 }}>
                    {st.items.map((item, idx) => (
                      <div
                        key={idx}
                        onClick={(e) => {
                          e.stopPropagation();
                          if (onOpenApp) onOpenApp(item.app);
                        }}
                        style={{
                          padding: "10px 14px",
                          borderRadius: 14,
                          background: "rgba(255, 255, 255, 0.035)",
                          border: "1px solid rgba(255, 255, 255, 0.06)",
                          display: "flex",
                          alignItems: "center",
                          justifyContent: "space-between",
                          cursor: "pointer",
                        }}
                      >
                        <div style={{ flex: 1, minWidth: 0, paddingRight: 8 }}>
                          <div style={{ display: "flex", alignItems: "center", gap: 6, marginBottom: 3 }}>
                            <span
                              style={{
                                fontSize: 9,
                                fontFamily: "monospace",
                                padding: "1px 5px",
                                borderRadius: 4,
                                background: `${st.color}25`,
                                color: st.color,
                                fontWeight: 800,
                              }}
                            >
                              {item.tag}
                            </span>
                            <span style={{ fontSize: 12, fontWeight: 700, color: "#fff", whiteSpace: "nowrap", overflow: "hidden", textOverflow: "ellipsis" }}>
                              {item.label}
                            </span>
                          </div>
                          <div style={{ fontSize: 11, color: "rgba(255, 255, 255, 0.55)" }}>
                            {item.desc}
                          </div>
                        </div>

                        <button
                          style={{
                            padding: "6px 12px",
                            borderRadius: 10,
                            background: `${st.color}20`,
                            border: `1px solid ${st.color}50`,
                            color: st.color,
                            fontSize: 10.5,
                            fontWeight: 800,
                            cursor: "pointer",
                            whiteSpace: "nowrap",
                            flexShrink: 0,
                          }}
                        >
                          {item.actionText} →
                        </button>
                      </div>
                    ))}
                  </div>
                </motion.div>
              )}
            </AnimatePresence>
          </motion.div>
        );
      })}
    </div>
  );
}
