import React, { useState } from "react";
import { motion, AnimatePresence } from "framer-motion";

export default function MobileIntelligenceStacks({ onOpenApp }) {
  const [expandedStack, setExpandedStack] = useState(null);

  const stacks = [
    {
      id: "now",
      title: "NOW",
      color: "#00F0FF",
      summary: "3 priority signals require attention",
      items: [
        { label: "Beta Onboarding Blocked", type: "Task", app: "tasks" },
        { label: "Calendar Conflict at 4:00 PM", type: "Calendar", app: "calendar" },
        { label: "Unanswered Agent Clarification", type: "Cortex", app: "cortex" },
      ],
    },
    {
      id: "mind",
      title: "MIND",
      color: "#A855F7",
      summary: "Cortex detected a recurring behavioral pattern",
      items: [
        { label: "Feature addition preference breaking launch velocity", type: "Mirror", app: "mirror" },
        { label: "5 delayed decision nodes saved in memory", type: "Memory", app: "memory" },
      ],
    },
    {
      id: "next",
      title: "NEXT",
      color: "#39FF14",
      summary: "Tomorrow is 85% scheduled — preparation ready",
      items: [
        { label: "OmniverseOS Public Beta Launch Review", type: "Schedule", app: "calendar" },
        { label: "Recommended Focus Tunnel block: 2.5 hours", type: "Focus", app: "focus" },
      ],
    },
  ];

  return (
    <div
      style={{
        width: "100%",
        display: "flex",
        flexDirection: "column",
        gap: 10,
        padding: "0 16px",
      }}
      data-testid="mobile-intelligence-stacks"
    >
      <div style={{ fontSize: 10, fontFamily: "monospace", color: "rgba(255,255,255,0.4)", letterSpacing: "0.15em" }}>
        INTELLIGENCE STACKS
      </div>

      {stacks.map((st) => {
        const isExp = expandedStack === st.id;
        return (
          <motion.div
            key={st.id}
            onClick={() => setExpandedStack(isExp ? null : st.id)}
            whileTap={{ scale: 0.98 }}
            style={{
              padding: 14,
              borderRadius: 18,
              background: "rgba(8, 12, 24, 0.85)",
              border: `1px solid ${isExp ? st.color : "rgba(255,255,255,0.08)"}`,
              boxShadow: isExp ? `0 0 24px ${st.color}25` : "none",
              cursor: "pointer",
              transition: "all 0.25s ease",
            }}
          >
            <div style={{ display: "flex", alignItems: "center", justifyContent: "space-between" }}>
              <div style={{ display: "flex", alignItems: "center", gap: 10 }}>
                <span
                  style={{
                    fontSize: 10,
                    fontFamily: "monospace",
                    fontWeight: 900,
                    padding: "2px 8px",
                    borderRadius: 6,
                    background: `${st.color}20`,
                    color: st.color,
                  }}
                >
                  {st.title}
                </span>
                <span style={{ fontSize: 12, fontWeight: 700, color: "#fff" }}>{st.summary}</span>
              </div>
              <i
                className={`fa-solid fa-chevron-${isExp ? "up" : "down"}`}
                style={{ color: "rgba(255,255,255,0.4)", fontSize: 11 }}
              />
            </div>

            <AnimatePresence>
              {isExp && (
                <motion.div
                  initial={{ height: 0, opacity: 0 }}
                  animate={{ height: "auto", opacity: 1 }}
                  exit={{ height: 0, opacity: 0 }}
                  style={{ overflow: "hidden", marginTop: 12, display: "flex", flexDirection: "column", gap: 8 }}
                >
                  {st.items.map((item, idx) => (
                    <div
                      key={idx}
                      onClick={(e) => {
                        e.stopPropagation();
                        if (onOpenApp) onOpenApp(item.app);
                      }}
                      style={{
                        padding: 10,
                        borderRadius: 12,
                        background: "rgba(255,255,255,0.04)",
                        border: "1px solid rgba(255,255,255,0.08)",
                        display: "flex",
                        justifyContent: "space-between",
                        alignItems: "center",
                      }}
                    >
                      <div style={{ fontSize: 12, color: "rgba(255,255,255,0.9)", fontWeight: 600 }}>
                        {item.label}
                      </div>
                      <span style={{ fontSize: 9, fontFamily: "monospace", color: st.color }}>
                        {item.type} <i className="fa-solid fa-arrow-right ml-1" />
                      </span>
                    </div>
                  ))}
                </motion.div>
              )}
            </AnimatePresence>
          </motion.div>
        );
      })}
    </div>
  );
}
