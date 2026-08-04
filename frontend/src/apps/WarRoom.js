import React, { useState, useRef, useCallback, useEffect } from "react";
import { api } from "../lib/api";
import { toast } from "sonner";
import { useToolSessions } from "../hooks/useToolSessions";
import ToolHistorySidebar from "../components/ToolHistorySidebar";

// ── Agent colour palette ───────────────────────────────────────────────────
const AGENT_META = {
  investor:   { icon: "fa-chart-line",           accent: "#F59E0B", name: "The Investor",        role: "Capital & returns" },
  customer:   { icon: "fa-user",                 accent: "#39FF14", name: "The Customer",         role: "Real-world use"    },
  competitor: { icon: "fa-flag",                 accent: "#FF003C", name: "The Competitor",       role: "Market threats"    },
  critic:     { icon: "fa-triangle-exclamation", accent: "#A855F7", name: "The Internal Critic",  role: "Internal flaws"    },
  journalist: { icon: "fa-newspaper",            accent: "#60A5FA", name: "The Journalist",       role: "Public narrative"  },
};

const AGENT_ORDER = ["investor", "customer", "competitor", "critic", "journalist"];

// ── Typing animation — reveals text char-by-char when it first appears ─────
function AnimatedText({ text, color }) {
  const [shown, setShown] = useState(0);
  const prevText = useRef("");

  useEffect(() => {
    if (text.length > prevText.current.length) {
      const newChars = text.length - prevText.current.length;
      let i = 0;
      const tick = () => {
        i++;
        setShown(prevText.current.length + i);
        if (i < newChars) requestAnimationFrame(tick);
      };
      requestAnimationFrame(tick);
    }
    prevText.current = text;
  }, [text]);

  const displayText = text.slice(0, shown);
  const cursor = shown < text.length;

  return (
    <span style={{ color: "rgba(255,255,255,0.88)", lineHeight: 1.7, whiteSpace: "pre-wrap", wordBreak: "break-word" }}>
      {displayText}
      {cursor && (
        <span style={{
          display: "inline-block", width: 2, height: "1em",
          background: color, marginLeft: 1, verticalAlign: "middle",
          animation: "blink 0.7s step-end infinite",
        }} />
      )}
    </span>
  );
}

// ── Individual agent card ──────────────────────────────────────────────────
function AgentCard({ agent, loading, revealed }) {
  const meta  = AGENT_META[agent.id] || { icon: "fa-robot", accent: "#00F0FF", name: agent.id, role: "" };
  const color = meta.accent;

  return (
    <div style={{
      background: loading
        ? `radial-gradient(ellipse at top, ${color}12 0%, rgba(0,0,0,0.5) 100%)`
        : agent.text
        ? `radial-gradient(ellipse at top, ${color}09 0%, rgba(0,0,0,0.5) 100%)`
        : "rgba(0,0,0,0.35)",
      border: `1px solid ${loading ? color + "44" : color + "1a"}`,
      borderRadius: 14,
      padding: "16px 18px",
      display: "flex",
      flexDirection: "column",
      gap: 10,
      transition: "border-color 0.4s, background 0.4s",
      animation: revealed ? "popIn 0.4s cubic-bezier(0.34,1.56,0.64,1) both" : "none",
    }}>
      {/* Agent header */}
      <div style={{ display: "flex", alignItems: "center", gap: 10 }}>
        <div style={{
          width: 32, height: 32, borderRadius: 8,
          background: `${color}18`, border: `1px solid ${color}30`,
          display: "flex", alignItems: "center", justifyContent: "center", flexShrink: 0,
        }}>
          <i className={`fa-solid ${meta.icon}`} style={{ color, fontSize: 13 }} />
        </div>
        <div>
          <div style={{ fontWeight: 700, fontSize: 13, color: "#fff" }}>{meta.name || agent.name}</div>
          <div style={{ fontSize: 10, fontFamily: "'JetBrains Mono', monospace", color: `${color}99`, marginTop: 1 }}>
            {meta.role || agent.role}
          </div>
        </div>
        {loading && (
          <div style={{ marginLeft: "auto", display: "flex", gap: 4 }}>
            {[0,1,2].map(i => (
              <div key={i} style={{
                width: 5, height: 5, borderRadius: "50%", background: color,
                animation: `pulse 1.2s ease-in-out ${i * 0.2}s infinite`,
              }} />
            ))}
          </div>
        )}
      </div>

      {/* Response */}
      <div style={{
        fontSize: 13, lineHeight: 1.7,
        color: agent.text ? "rgba(255,255,255,0.88)" : "rgba(255,255,255,0.2)",
        minHeight: 60,
        borderTop: `1px solid ${color}12`, paddingTop: 10,
        fontStyle: agent.error ? "italic" : "normal",
      }}>
        {agent.error ? (
          <span style={{ color: "#FF003C99" }}>Agent unavailable — try again.</span>
        ) : agent.text ? (
          <AnimatedText text={agent.text} color={color} />
        ) : loading ? (
          <span style={{ color: `${color}55`, fontFamily: "'JetBrains Mono', monospace", fontSize: 11 }}>
            Formulating response…
          </span>
        ) : null}
      </div>
    </div>
  );
}

// ── Main component ─────────────────────────────────────────────────────────
export default function WarRoom() {
  const [situation,   setSituation]   = useState("");
  const [loading,     setLoading]     = useState(false);
  const [agents,      setAgents]      = useState([]);
  const [revealed,    setRevealed]    = useState(false);
  const [sidebarOpen, setSidebarOpen] = useState(false);
  const mountedRef  = useRef(true);
  const sessionRef  = useRef(null);

  const {
    sessions, activeSessionId, loading: sessionsLoading,
    createSession, switchSession, renameSession, deleteSession, saveRun, loadRun,
  } = useToolSessions("warroom");

  useEffect(() => { mountedRef.current = true; return () => { mountedRef.current = false; }; }, []);

  // ── Load run when switching sessions ──────────────────────────────────────
  useEffect(() => {
    if (!activeSessionId) return;
    loadRun(activeSessionId).then((msgs) => {
      if (!mountedRef.current || !msgs.length) return;
      const userMsg = msgs.find((m) => m.role === "user");
      const agentMsgs = msgs.filter((m) => m.role === "assistant");
      if (userMsg) setSituation(userMsg.content || "");
      if (agentMsgs.length > 0) {
        const restored = agentMsgs.map((m) => ({
          id:    m.meta?.agentId || m.meta?.agent || "",
          name:  m.meta?.name   || "",
          role:  m.meta?.agentRole || "",
          text:  m.content || "",
          error: false,
        }));
        setAgents(restored);
        setRevealed(true);
      } else {
        setAgents([]);
        setRevealed(false);
      }
    });
  // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [activeSessionId]);

  const convene = useCallback(async () => {
    const trimmed = situation.trim();
    if (!trimmed || loading) return;

    // Create session for this run
    const shortTitle = trimmed.length > 55 ? trimmed.slice(0, 55) + "…" : trimmed;
    const sess = await createSession(shortTitle);
    sessionRef.current = sess?.session_id || null;

    setLoading(true);
    setAgents([]);
    setRevealed(false);

    try {
      const res = await api.post("/ai/warroom", { situation: trimmed });
      if (!mountedRef.current) return;
      const agentData = res.data.agents || [];
      setAgents(agentData);
      setRevealed(true);

      // Save to session
      if (sessionRef.current) {
        const ts = new Date().toISOString();
        const messages = [
          { role: "user", content: trimmed, meta: {}, created_at: ts },
          ...agentData.map((a) => ({
            role: "assistant",
            content: a.text || "",
            meta: { agent: a.id, agentId: a.id, name: a.name, agentRole: a.role },
            created_at: ts,
          })),
        ];
        saveRun(sessionRef.current, messages, trimmed);
      }
    } catch (err) {
      if (!mountedRef.current) return;
      toast.error(
        err?.response?.status === 429
          ? "War Room rate-limited — try again in a moment."
          : "War Room failed to convene — please try again.",
      );
    } finally {
      if (mountedRef.current) setLoading(false);
    }
  }, [situation, loading, createSession, saveRun]);

  const reset = useCallback(() => {
    setSituation("");
    setAgents([]);
    setRevealed(false);
    sessionRef.current = null;
  }, []);

  const handleNewRun = useCallback(() => {
    reset();
  }, [reset]);

  return (
    <div style={{ height: "100%", display: "flex", flexDirection: "row", overflow: "hidden" }}>
      {/* ── History sidebar ─────────────────────────────────────────────── */}
      {sidebarOpen && (
        <ToolHistorySidebar
          sessions={sessions}
          activeSessionId={activeSessionId}
          onSelect={(id) => { switchSession(id); setSidebarOpen(false); }}
          onNewRun={() => { handleNewRun(); setSidebarOpen(false); }}
          onRename={renameSession}
          onDelete={deleteSession}
          accentColor="#F59E0B"
          loading={sessionsLoading}
          label="War Room Runs"
        />
      )}

      {/* ── Main area ───────────────────────────────────────────────────── */}
      <div style={{
        flex: 1, minWidth: 0, display: "flex", flexDirection: "column",
        background: "radial-gradient(ellipse at top right, rgba(245,158,11,0.05) 0%, transparent 60%)",
        padding: "20px 24px", gap: 16, color: "#fff", overflowY: "auto",
      }}>
        <style>{`
          @keyframes blink { 0%,100%{opacity:1} 50%{opacity:0} }
          @keyframes pulse { 0%,100%{transform:scale(1);opacity:0.6} 50%{transform:scale(1.5);opacity:1} }
          @keyframes popIn { from{opacity:0;transform:scale(0.92) translateY(8px)} to{opacity:1;transform:scale(1) translateY(0)} }
          @keyframes fadeSlideUp { from{opacity:0;transform:translateY(6px)} to{opacity:1;transform:translateY(0)} }
          .warroom-textarea::-webkit-scrollbar{width:4px}
          .warroom-textarea::-webkit-scrollbar-thumb{background:rgba(245,158,11,0.3);border-radius:4px}
        `}</style>

        {/* ── Header ──────────────────────────────────────────────────────── */}
        <div style={{ flexShrink: 0, display: "flex", alignItems: "flex-start", gap: 10 }}>
          <button
            onClick={() => setSidebarOpen(v => !v)}
            title={sidebarOpen ? "Hide history" : "Show history"}
            style={{
              marginTop: 2, flexShrink: 0,
              width: 28, height: 28, borderRadius: 7, border: "none", cursor: "pointer",
              background: sidebarOpen ? "rgba(245,158,11,0.14)" : "rgba(255,255,255,0.06)",
              color: sidebarOpen ? "#F59E0B" : "rgba(255,255,255,0.4)",
              display: "flex", alignItems: "center", justifyContent: "center",
              transition: "background 0.15s, color 0.15s",
            }}
          >
            <i className="fa-solid fa-clock-rotate-left" style={{ fontSize: 12 }} />
          </button>
          <div style={{ flex: 1 }}>
            <div style={{
              fontFamily: "'JetBrains Mono', monospace", fontSize: 10,
              color: "#F59E0B99", letterSpacing: "0.2em", textTransform: "uppercase", marginBottom: 4,
            }}>
              // situational war room
            </div>
            <div style={{ display: "flex", alignItems: "baseline", gap: 12 }}>
              <h1 style={{ fontSize: 22, fontWeight: 800, margin: 0, letterSpacing: "-0.02em" }}>
                The War Room
              </h1>
              <span style={{
                fontSize: 11, fontFamily: "'JetBrains Mono', monospace",
                color: "rgba(255,255,255,0.3)", flexShrink: 0,
              }}>
                five hostile minds react simultaneously
              </span>
            </div>
          </div>
        </div>

        {/* ── Input form ───────────────────────────────────────────────────── */}
        {!loading && agents.length === 0 && (
          <div style={{ flexShrink: 0, animation: "fadeSlideUp 0.25s ease" }}>
            <textarea
              className="warroom-textarea"
              value={situation}
              onChange={e => setSituation(e.target.value)}
              placeholder="Describe the situation, idea, decision, or plan you want the War Room to react to. The more specific you are, the more useful each perspective becomes."
              rows={5}
              style={{
                width: "100%", background: "rgba(245,158,11,0.04)",
                border: "1px solid rgba(245,158,11,0.2)", borderRadius: 12,
                color: "rgba(255,255,255,0.9)", fontFamily: "'Inter', sans-serif",
                fontSize: 14, lineHeight: 1.7, padding: "14px 18px",
                resize: "none", outline: "none", boxSizing: "border-box",
                transition: "border-color 0.2s",
              }}
              onFocus={e => { e.target.style.borderColor = "rgba(245,158,11,0.5)"; }}
              onBlur={e => { e.target.style.borderColor = "rgba(245,158,11,0.2)"; }}
            />
            <div style={{ display: "flex", justifyContent: "flex-end", marginTop: 10 }}>
              <button
                onClick={convene}
                disabled={!situation.trim()}
                style={{
                  padding: "11px 28px", borderRadius: 10,
                  cursor: situation.trim() ? "pointer" : "not-allowed",
                  background: situation.trim()
                    ? "linear-gradient(135deg, #F59E0B, #d97706)"
                    : "rgba(245,158,11,0.08)",
                  border: "1px solid rgba(245,158,11,0.4)",
                  color: situation.trim() ? "#fff" : "rgba(245,158,11,0.3)",
                  fontFamily: "'JetBrains Mono', monospace", fontSize: 12,
                  fontWeight: 700, letterSpacing: "0.12em", textTransform: "uppercase",
                  boxShadow: situation.trim() ? "0 0 24px rgba(245,158,11,0.3)" : "none",
                  transition: "all 0.2s",
                }}
              >
                <i className="fa-solid fa-chess-king" style={{ marginRight: 8 }} />
                Convene
              </button>
            </div>
          </div>
        )}

        {/* ── Situation recap + reset ─────────────────────────────────────── */}
        {(loading || agents.length > 0) && (
          <div style={{
            display: "flex", alignItems: "center", gap: 10, flexShrink: 0,
            padding: "8px 14px", borderRadius: 10,
            background: "rgba(255,255,255,0.03)", border: "1px solid rgba(255,255,255,0.07)",
          }}>
            <i className="fa-solid fa-chess-king" style={{ color: "#F59E0B", fontSize: 11 }} />
            <span style={{
              flex: 1, fontFamily: "'Inter', sans-serif", fontSize: 12,
              color: "rgba(255,255,255,0.45)", overflow: "hidden",
              textOverflow: "ellipsis", whiteSpace: "nowrap",
            }}>
              {situation.length > 110 ? situation.slice(0, 110) + "…" : situation}
            </span>
            {!loading && (
              <button
                onClick={reset}
                style={{
                  padding: "4px 12px", borderRadius: 6, cursor: "pointer",
                  background: "rgba(255,255,255,0.04)", border: "1px solid rgba(255,255,255,0.10)",
                  color: "rgba(255,255,255,0.45)", fontFamily: "'JetBrains Mono', monospace",
                  fontSize: 10, letterSpacing: "0.05em", transition: "all 0.15s",
                }}
                onMouseEnter={e => { e.currentTarget.style.color = "#fff"; e.currentTarget.style.borderColor = "rgba(255,255,255,0.25)"; }}
                onMouseLeave={e => { e.currentTarget.style.color = "rgba(255,255,255,0.45)"; e.currentTarget.style.borderColor = "rgba(255,255,255,0.10)"; }}
              >
                new situation
              </button>
            )}
          </div>
        )}

        {/* ── Skeleton grid while loading ─────────────────────────────────── */}
        {loading && agents.length === 0 && (
          <div style={{
            display: "grid",
            gridTemplateColumns: "repeat(auto-fill, minmax(260px, 1fr))",
            gap: 14, animation: "fadeSlideUp 0.3s ease",
          }}>
            {AGENT_ORDER.map(id => (
              <AgentCard
                key={id}
                agent={{ id, name: AGENT_META[id].name, role: AGENT_META[id].role, text: "", error: false }}
                loading={true}
                revealed={false}
              />
            ))}
          </div>
        )}

        {/* ── Results grid ─────────────────────────────────────────────────── */}
        {agents.length > 0 && (
          <div style={{
            display: "grid",
            gridTemplateColumns: "repeat(auto-fill, minmax(260px, 1fr))",
            gap: 14,
          }}>
            {agents.map((agent, i) => (
              <div key={agent.id || i} style={{ animationDelay: `${i * 0.08}s` }}>
                <AgentCard agent={agent} loading={false} revealed={revealed} />
              </div>
            ))}
          </div>
        )}

        {/* ── Empty state ──────────────────────────────────────────────────── */}
        {!loading && agents.length === 0 && (
          <div style={{
            flex: 1, display: "flex", flexDirection: "column",
            alignItems: "center", justifyContent: "center", gap: 12, opacity: 0.35,
          }}>
            <i className="fa-solid fa-chess-king" style={{ fontSize: 36, color: "#F59E0B" }} />
            <div style={{ fontFamily: "'JetBrains Mono', monospace", fontSize: 11, color: "rgba(255,255,255,0.5)", textAlign: "center" }}>
              Five minds are waiting.<br />Give them something to react to.
            </div>
          </div>
        )}
      </div>
    </div>
  );
}
