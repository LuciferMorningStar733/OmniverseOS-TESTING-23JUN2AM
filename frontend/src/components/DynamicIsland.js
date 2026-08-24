import React, { useState, useEffect } from "react";
import { motion, AnimatePresence } from "framer-motion";
import { useOS } from "../context/OSContext";
import { cortexScheduler } from "../lib/cortexScheduler";
import { getActivePersona } from "../lib/cortexPersonas";

export default function DynamicIsland() {
  const { openApp } = useOS();
  const [expanded, setExpanded] = useState(false);
  const [activeJob, setActiveJob] = useState(null);
  const persona = getActivePersona();

  // Poll for active scheduled reminders
  useEffect(() => {
    const check = () => {
      const jobs = cortexScheduler.listJobs();
      setActiveJob(jobs[0] || null);
    };
    check();
    const timer = setInterval(check, 1000);
    return () => clearInterval(timer);
  }, []);

  return (
    <div style={{ position: "relative", zIndex: 100 }}>
      <motion.div
        layout
        onClick={() => setExpanded((v) => !v)}
        style={{
          height: expanded ? 72 : 28,
          minWidth: expanded ? 260 : 130,
          padding: expanded ? "10px 16px" : "0 12px",
          borderRadius: expanded ? 22 : 14,
          background: "rgba(6, 8, 16, 0.92)",
          border: `1px solid ${persona.color}40`,
          boxShadow: `0 8px 32px rgba(0,0,0,0.6), 0 0 16px ${persona.color}20`,
          backdropFilter: "blur(20px)",
          WebkitBackdropFilter: "blur(20px)",
          cursor: "pointer",
          display: "flex",
          alignItems: "center",
          justifyContent: "space-between",
          color: "#fff",
          transition: "all 0.3s cubic-bezier(0.16, 1, 0.3, 1)",
          userSelect: "none",
        }}
      >
        {!expanded ? (
          /* Collapsed Pill View */
          <div style={{ display: "flex", alignItems: "center", gap: 8, width: "100%", justifyContent: "space-between" }}>
            <div style={{ display: "flex", alignItems: "center", gap: 6 }}>
              <div
                style={{
                  width: 8,
                  height: 8,
                  borderRadius: "50%",
                  background: persona.color,
                  boxShadow: `0 0 8px ${persona.color}`,
                  animation: "orbPulse 1.5s ease-in-out infinite",
                }}
              />
              <span style={{ fontSize: 11, fontWeight: 700, fontFamily: "'JetBrains Mono', monospace", color: persona.color }}>
                {persona.name}
              </span>
            </div>

            {activeJob ? (
              <div style={{ fontSize: 10, fontFamily: "monospace", color: "rgba(255,255,255,0.6)", display: "flex", alignItems: "center", gap: 4 }}>
                <i className="fa-solid fa-clock" style={{ fontSize: 9, color: "#00F0FF" }} />
                <span>{cortexScheduler.formatRemaining(activeJob)}</span>
              </div>
            ) : (
              <div style={{ display: "flex", gap: 2 }}>
                {[0.4, 0.8, 0.5, 0.9, 0.3].map((h, i) => (
                  <div
                    key={i}
                    style={{
                      width: 2,
                      height: 10 * h,
                      background: persona.color,
                      borderRadius: 1,
                      animation: `typingWave 1s ease-in-out ${i * 0.15}s infinite`,
                    }}
                  />
                ))}
              </div>
            )}
          </div>
        ) : (
          /* Expanded Island Card View */
          <motion.div
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            style={{ width: "100%", display: "flex", alignItems: "center", justifyContent: "space-between" }}
          >
            <div style={{ display: "flex", alignItems: "center", gap: 12 }}>
              <div
                style={{
                  width: 38,
                  height: 38,
                  borderRadius: 12,
                  background: `${persona.color}20`,
                  border: `1px solid ${persona.color}50`,
                  display: "flex",
                  alignItems: "center",
                  justifyContent: "center",
                }}
              >
                <i className={`fa-solid ${persona.icon}`} style={{ fontSize: 16, color: persona.color }} />
              </div>
              <div>
                <div style={{ fontSize: 13, fontWeight: 700, color: "#fff" }}>{persona.name} Sentient Core</div>
                <div style={{ fontSize: 10, fontFamily: "monospace", color: "rgba(255,255,255,0.5)" }}>
                  {activeJob ? `⏰ Reminder: ${activeJob.title}` : "Listening & Monitoring OS State"}
                </div>
              </div>
            </div>

            <button
              onClick={(e) => {
                e.stopPropagation();
                openApp("chat");
                setExpanded(false);
              }}
              style={{
                padding: "6px 12px",
                borderRadius: 8,
                fontSize: 10,
                fontFamily: "monospace",
                background: `${persona.color}25`,
                border: `1px solid ${persona.color}60`,
                color: persona.color,
                cursor: "pointer",
              }}
            >
              Open AI
            </button>
          </motion.div>
        )}
      </motion.div>
    </div>
  );
}
