/**
 * SwarmGoal — P14: Multi-Agent Swarm Goal app.
 *
 * The user types (or pastes from AIChat) a big goal. Four specialized agents
 * run in parallel on the backend (Research, Writer, Scheduler, Planner),
 * streaming their results live. When all complete, a merged synthesis is shown.
 *
 * Opening from AIChat:
 *   AIChat sets localStorage.cortex_swarm_goal, then calls openApp("swarm").
 *   SwarmGoal reads the goal on mount and auto-starts.
 */
import React, { useCallback, useEffect, useRef, useState } from "react";
import { motion, AnimatePresence } from "framer-motion";
import { runSwarm } from "../lib/swarmApi";
import MarkdownRenderer from "../components/MarkdownRenderer";

// ── Agent definitions (display only — backend owns the actual prompts) ─────
const AGENT_DEFS = [
  {
    id:    "Research",
    icon:  "fa-magnifying-glass",
    color: "#00F0FF",
    label: "Research",
    desc:  "Gathering context, facts, and relevant background",
  },
  {
    id:    "Writer",
    icon:  "fa-pen-nib",
    color: "#A855F7",
    label: "Writer",
    desc:  "Drafting content, messaging, and narrative",
  },
  {
    id:    "Scheduler",
    icon:  "fa-calendar-days",
    color: "#FB923C",
    label: "Scheduler",
    desc:  "Mapping timeline, milestones, and calendar blocks",
  },
  {
    id:    "Planner",
    icon:  "fa-diagram-project",
    color: "#39FF14",
    label: "Planner",
    desc:  "Breaking down tasks, dependencies, and next steps",
  },
];

// ── Agent status card ──────────────────────────────────────────────────────
function AgentCard({ def, status, result, expanded, onToggle }) {
  const isDone    = status === "done";
  const isRunning = status === "running";
  const isIdle    = status === "idle";

  return (
    <motion.div
      layout
      initial={{ opacity: 0, y: 12 }}
      animate={{ opacity: 1, y: 0 }}
      transition={{ duration: 0.3 }}
      style={{
        borderRadius: 12,
        background: isDone
          ? "rgba(255,255,255,0.04)"
          : "rgba(255,255,255,0.02)",
        border: `1px solid ${isDone ? `${def.color}30` : "rgba(255,255,255,0.07)"}`,
        overflow: "hidden",
        transition: "border-color 0.3s",
      }}
    >
      {/* Header */}
      <button
        onClick={isDone ? onToggle : undefined}
        style={{
          width: "100%", display: "flex", alignItems: "center",
          gap: 12, padding: "12px 16px",
          background: "none", border: "none",
          cursor: isDone ? "pointer" : "default",
          textAlign: "left",
        }}
      >
        {/* Icon */}
        <div style={{
          width: 36, height: 36, borderRadius: 10, flexShrink: 0,
          background: `${def.color}15`,
          border: `1px solid ${def.color}25`,
          display: "flex", alignItems: "center", justifyContent: "center",
        }}>
          {isRunning ? (
            <div style={{
              width: 14, height: 14, borderRadius: "50%",
              border: `2px solid ${def.color}40`,
              borderTopColor: def.color,
              animation: "spin 0.8s linear infinite",
            }} />
          ) : (
            <i
              className={`fa-solid ${isDone ? "fa-check" : def.icon}`}
              style={{
                color: isDone ? def.color : "rgba(255,255,255,0.2)",
                fontSize: 14,
              }}
            />
          )}
        </div>

        {/* Label + desc */}
        <div style={{ flex: 1, minWidth: 0 }}>
          <div style={{
            fontSize: 13, fontWeight: 600,
            fontFamily: "'Outfit', sans-serif",
            color: isIdle ? "rgba(255,255,255,0.3)" : "#fff",
          }}>
            {def.label}
            {result?.elapsed_ms && (
              <span style={{ fontSize: 10, color: "rgba(255,255,255,0.25)", marginLeft: 8, fontWeight: 400 }}>
                {(result.elapsed_ms / 1000).toFixed(1)}s
              </span>
            )}
          </div>
          <div style={{
            fontSize: 11, color: "rgba(255,255,255,0.3)",
            fontFamily: "'Outfit', sans-serif", marginTop: 1,
          }}>
            {isRunning ? "Working…" : isDone ? "Complete" : def.desc}
          </div>
        </div>

        {/* Expand chevron */}
        {isDone && (
          <i
            className={`fa-solid fa-chevron-${expanded ? "up" : "down"}`}
            style={{ color: "rgba(255,255,255,0.2)", fontSize: 11 }}
          />
        )}
      </button>

      {/* Output (expandable) */}
      <AnimatePresence>
        {isDone && expanded && result?.output && (
          <motion.div
            initial={{ height: 0, opacity: 0 }}
            animate={{ height: "auto", opacity: 1 }}
            exit={{ height: 0, opacity: 0 }}
            transition={{ duration: 0.25 }}
            style={{ overflow: "hidden" }}
          >
            <div style={{
              borderTop: "1px solid rgba(255,255,255,0.06)",
              padding: "12px 16px 14px",
              fontSize: 12,
              color: "rgba(255,255,255,0.7)",
              fontFamily: "'Outfit', sans-serif",
              lineHeight: 1.65,
              maxHeight: 260,
              overflowY: "auto",
            }}>
              <MarkdownRenderer content={result.output} />
            </div>
          </motion.div>
        )}
      </AnimatePresence>
    </motion.div>
  );
}

// ── Main app ───────────────────────────────────────────────────────────────
export default function SwarmGoal() {
  const [goal, setGoal]           = useState("");
  const [running, setRunning]     = useState(false);
  const [agentStatus, setAgentStatus] = useState({}); // id → "idle"|"running"|"done"
  const [agentResults, setAgentResults] = useState({}); // id → result object
  const [synthesis, setSynthesis] = useState("");
  const [done, setDone]           = useState(false);
  const [error, setError]         = useState("");
  const [expanded, setExpanded]   = useState({}); // id → bool
  const abortRef = useRef(null);

  // Read goal from AIChat pre-fill
  useEffect(() => {
    const stored = localStorage.getItem("cortex_swarm_goal");
    if (stored) {
      setGoal(stored);
      localStorage.removeItem("cortex_swarm_goal");
    }
  }, []);

  // Auto-start if goal was pre-filled from AIChat
  const didAutoStart = useRef(false);
  useEffect(() => {
    if (goal && !didAutoStart.current && !running && !done) {
      const stored = sessionStorage.getItem("cortex_swarm_autostart");
      if (stored) {
        sessionStorage.removeItem("cortex_swarm_autostart");
        didAutoStart.current = true;
        startSwarm(goal);
      }
    }
  // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [goal]);

  const startSwarm = useCallback(async (goalText) => {
    if (!goalText?.trim()) return;
    abortRef.current?.abort();
    const ctrl = new AbortController();
    abortRef.current = ctrl;

    setRunning(true);
    setDone(false);
    setSynthesis("");
    setError("");
    setAgentResults({});
    setExpanded({});

    // All agents start as "running"
    const initStatus = {};
    AGENT_DEFS.forEach((a) => { initStatus[a.id] = "running"; });
    setAgentStatus(initStatus);

    await runSwarm(
      goalText,
      {
        onAgent(agent) {
          setAgentStatus((prev) => ({ ...prev, [agent.name]: "done" }));
          setAgentResults((prev) => ({ ...prev, [agent.name]: agent }));
          // Auto-expand first completed agent
          setExpanded((prev) => {
            const anyExpanded = Object.values(prev).some(Boolean);
            return anyExpanded ? prev : { ...prev, [agent.name]: true };
          });
        },
        onSynthesis(text) {
          setSynthesis(text);
        },
        onDone() {
          setRunning(false);
          setDone(true);
        },
        onError(err) {
          setRunning(false);
          setError(err?.message || "Swarm failed — check connection.");
        },
      },
      ctrl.signal,
    );
  }, []);

  const handleSubmit = (e) => {
    e.preventDefault();
    startSwarm(goal);
  };

  const handleReset = () => {
    abortRef.current?.abort();
    setRunning(false);
    setDone(false);
    setSynthesis("");
    setError("");
    setAgentStatus({});
    setAgentResults({});
    setExpanded({});
    didAutoStart.current = false;
  };

  const doneCount = Object.values(agentStatus).filter((s) => s === "done").length;

  return (
    <div style={{
      height: "100%", overflowY: "auto",
      background: "linear-gradient(160deg, rgba(7,7,18,0.97) 0%, rgba(12,5,28,0.97) 100%)",
      padding: "24px 20px",
      fontFamily: "'Outfit', sans-serif",
      display: "flex", flexDirection: "column", gap: 20,
    }}>
      {/* spin keyframe */}
      <style>{`
        @keyframes spin { to { transform: rotate(360deg); } }
        @keyframes swarmPulse {
          0%,100% { opacity: 0.5; transform: scale(1); }
          50% { opacity: 1; transform: scale(1.15); }
        }
      `}</style>

      {/* ── Header ────────────────────────────────────────────────────── */}
      <div style={{ display: "flex", alignItems: "center", gap: 14 }}>
        <div style={{
          width: 44, height: 44, borderRadius: 14,
          background: "linear-gradient(135deg, rgba(0,240,255,0.15), rgba(123,47,255,0.15))",
          border: "1px solid rgba(0,240,255,0.2)",
          display: "flex", alignItems: "center", justifyContent: "center",
        }}>
          <i className="fa-solid fa-share-nodes" style={{ color: "#00F0FF", fontSize: 18 }} />
        </div>
        <div>
          <div style={{ fontSize: 18, fontWeight: 700, color: "#fff", letterSpacing: "-0.01em" }}>
            Swarm Goal
          </div>
          <div style={{ fontSize: 12, color: "rgba(255,255,255,0.35)" }}>
            4 AI agents working in parallel
          </div>
        </div>
        {(running || done) && (
          <button
            onClick={handleReset}
            style={{
              marginLeft: "auto",
              padding: "6px 14px", borderRadius: 8,
              background: "rgba(255,255,255,0.05)",
              border: "1px solid rgba(255,255,255,0.1)",
              color: "rgba(255,255,255,0.4)", fontSize: 11,
              cursor: "pointer",
            }}
          >
            New Goal
          </button>
        )}
      </div>

      {/* ── Goal input ────────────────────────────────────────────────── */}
      {!running && !done && (
        <form onSubmit={handleSubmit} style={{ display: "flex", flexDirection: "column", gap: 10 }}>
          <textarea
            value={goal}
            onChange={(e) => setGoal(e.target.value)}
            placeholder="Describe a big goal… e.g. 'Prepare me for my product launch next Friday' or 'Research and plan a content strategy for Q3'"
            rows={4}
            style={{
              width: "100%", padding: "14px 16px",
              borderRadius: 12, resize: "vertical",
              background: "rgba(255,255,255,0.04)",
              border: "1px solid rgba(255,255,255,0.1)",
              color: "#fff", fontSize: 13,
              fontFamily: "'Outfit', sans-serif",
              lineHeight: 1.6,
              outline: "none",
              boxSizing: "border-box",
            }}
          />
          <button
            type="submit"
            disabled={!goal.trim()}
            style={{
              padding: "12px 0", borderRadius: 10,
              background: goal.trim()
                ? "linear-gradient(135deg, rgba(0,240,255,0.15), rgba(123,47,255,0.15))"
                : "rgba(255,255,255,0.03)",
              border: `1px solid ${goal.trim() ? "rgba(0,240,255,0.3)" : "rgba(255,255,255,0.07)"}`,
              color: goal.trim() ? "#00F0FF" : "rgba(255,255,255,0.2)",
              fontSize: 13, fontWeight: 600,
              cursor: goal.trim() ? "pointer" : "not-allowed",
              transition: "all 0.2s",
            }}
          >
            <i className="fa-solid fa-share-nodes" style={{ marginRight: 8 }} />
            Launch Swarm
          </button>
        </form>
      )}

      {/* ── Running: goal echo + progress ─────────────────────────────── */}
      {(running || done) && (
        <>
          <div style={{
            padding: "12px 16px", borderRadius: 10,
            background: "rgba(0,240,255,0.04)",
            border: "1px solid rgba(0,240,255,0.12)",
          }}>
            <div style={{ fontSize: 10, color: "rgba(0,240,255,0.5)", marginBottom: 4, letterSpacing: "0.08em", textTransform: "uppercase" }}>
              Goal
            </div>
            <div style={{ fontSize: 13, color: "rgba(255,255,255,0.75)", lineHeight: 1.5 }}>{goal}</div>
          </div>

          {/* Progress bar */}
          <div style={{ display: "flex", alignItems: "center", gap: 12 }}>
            <div style={{
              flex: 1, height: 3, borderRadius: 2,
              background: "rgba(255,255,255,0.07)", overflow: "hidden",
            }}>
              <motion.div
                animate={{ width: `${(doneCount / AGENT_DEFS.length) * 100}%` }}
                transition={{ duration: 0.5 }}
                style={{
                  height: "100%",
                  background: "linear-gradient(90deg, #00F0FF, #7B2FFF)",
                  borderRadius: 2,
                }}
              />
            </div>
            <span style={{ fontSize: 11, color: "rgba(255,255,255,0.35)", whiteSpace: "nowrap" }}>
              {doneCount}/{AGENT_DEFS.length} agents
            </span>
          </div>

          {/* Agent cards */}
          <div style={{ display: "flex", flexDirection: "column", gap: 8 }}>
            {AGENT_DEFS.map((def) => (
              <AgentCard
                key={def.id}
                def={def}
                status={agentStatus[def.id] || "idle"}
                result={agentResults[def.id]}
                expanded={!!expanded[def.id]}
                onToggle={() => setExpanded((prev) => ({ ...prev, [def.id]: !prev[def.id] }))}
              />
            ))}
          </div>

          {/* Error */}
          {error && (
            <div style={{
              padding: "10px 14px", borderRadius: 10,
              background: "rgba(255,0,60,0.07)",
              border: "1px solid rgba(255,0,60,0.2)",
              fontSize: 12, color: "#FF6B8A",
            }}>
              {error}
            </div>
          )}

          {/* Synthesis */}
          <AnimatePresence>
            {synthesis && (
              <motion.div
                initial={{ opacity: 0, y: 16 }}
                animate={{ opacity: 1, y: 0 }}
                transition={{ duration: 0.4 }}
                style={{
                  padding: "18px 18px",
                  borderRadius: 14,
                  background: "rgba(123,47,255,0.07)",
                  border: "1px solid rgba(123,47,255,0.2)",
                }}
              >
                <div style={{
                  display: "flex", alignItems: "center", gap: 8, marginBottom: 14,
                }}>
                  <i className="fa-solid fa-wand-magic-sparkles" style={{ color: "#A855F7", fontSize: 14 }} />
                  <span style={{
                    fontSize: 12, fontWeight: 700,
                    color: "#A855F7", letterSpacing: "0.06em",
                    textTransform: "uppercase",
                  }}>
                    Synthesis
                  </span>
                </div>
                <div style={{
                  fontSize: 13, color: "rgba(255,255,255,0.8)",
                  lineHeight: 1.7,
                }}>
                  <MarkdownRenderer content={synthesis} />
                </div>
              </motion.div>
            )}
          </AnimatePresence>
        </>
      )}
    </div>
  );
}
