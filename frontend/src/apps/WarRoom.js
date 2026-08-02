import React, { useState, useRef, useCallback, useEffect } from "react";
import { api } from "../lib/api";
import { toast } from "sonner";

// ── Agent colour palette ───────────────────────────────────────────────────
const AGENT_META = {
  investor:   { icon: "fa-chart-line",       accent: "#F59E0B" },
  customer:   { icon: "fa-user",             accent: "#39FF14" },
  competitor: { icon: "fa-flag",             accent: "#FF003C" },
  critic:     { icon: "fa-triangle-exclamation", accent: "#A855F7" },
  journalist: { icon: "fa-newspaper",        accent: "#60A5FA" },
};

// ── Typing animation — reveals text char-by-char when it first appears ─────
function AnimatedText({ text, color }) {
  const [shown, setShown] = useState(0);
  const prevText = useRef("");

  useEffect(() => {
    // Only animate new characters appended (streaming); already-shown chars stay instant
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
  const meta  = AGENT_META[agent.id] || { icon: "fa-robot", accent: "#00F0FF" };
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
          <div style={{ fontWeight: 700, fontSize: 13, color: "#fff" }}>{agent.name}</div>
          <div style={{ fontSize: 10, fontFamily: "'JetBrains Mono', monospace", color: `${color}99`, marginTop: 1 }}>
            {agent.role}
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
  const [situation, setSituation] = useState("");
  const [loading,   setLoading]   = useState(false);
  const [agents,    setAgents]    = useState([]);   // [{id,name,role,color,text,error}]
  const [revealed,  setRevealed]  = useState(false);
  const mountedRef = useRef(true);

  useEffect(() => { mountedRef.current = true; return () => { mountedRef.current = false; }; }, []);

  const convene = useCallback(async () => {
    const trimmed = situation.trim();
    if (!trimmed || loading) return;

    setLoading(true);
    setAgents([]);
    setRevealed(false);

    try {
      const res = await api.post("/ai/warroom", { situation: trimmed });
      if (!mountedRef.current) return;
      setAgents(res.data.agents || []);
      setRevealed(true);
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
  }, [situation, loading]);

  const reset = useCallback(() => {
    setSituation("");
    setAgents([]);
    setRevealed(false);
  }, []);

  return (
    <div style={{
      height: "100%", display: "flex", flexDirection: "column",
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

      {/* ── Header ───────────────────────────────────────────────────────── */}
      <div style={{ flexShrink: 0 }}>
        <div style={{
          fontFamily: "'JetBrains Mono', monospace", fontSize: 10,
          color: "#F59E0B99", letterSpacing: "0.2em", textTransform: "uppercase", marginBottom: 4,
        }}>
          // five minds · one room
        </div>
        <div style={{ display: "flex", alignItems: "baseline", gap: 12 }}>
          <h1 style={{ fontSize: 22, fontWeight: 800, margin: 0, letterSpacing: "-0.02em" }}>
            The War Room
          </h1>
          <span style={{
            fontSize: 11, fontFamily: "'JetBrains Mono', monospace",
            color: "rgba(255,255,255,0.3)",
          }}>
            five hostile minds react simultaneously
          </span>
        </div>
      </div>

      {/* ── Input ────────────────────────────────────────────────────────── */}
      <div style={{ flexShrink: 0 }}>
        <textarea
          className="warroom-textarea"
          value={situation}
          onChange={e => setSituation(e.target.value)}
          disabled={loading}
          placeholder="Describe your pitch, idea, strategy, or decision. Include as much context as you can — market, audience, what you're trying to achieve. The more specific, the sharper the intel."
          rows={4}
          style={{
            width: "100%", background: "rgba(245,158,11,0.04)",
            border: "1px solid rgba(245,158,11,0.2)", borderRadius: 12,
            color: "rgba(255,255,255,0.9)", fontFamily: "'Inter', sans-serif",
            fontSize: 14, lineHeight: 1.7, padding: "14px 18px",
            resize: "none", outline: "none", boxSizing: "border-box",
            opacity: loading ? 0.5 : 1, transition: "border-color 0.2s",
          }}
          onFocus={e => { e.target.style.borderColor = "rgba(245,158,11,0.5)"; }}
          onBlur={e => { e.target.style.borderColor = "rgba(245,158,11,0.2)"; }}
        />
        <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center", marginTop: 10 }}>
          {agents.length > 0 && !loading && (
            <button
              onClick={reset}
              style={{
                padding: "8px 16px", borderRadius: 8, cursor: "pointer",
                background: "rgba(255,255,255,0.05)", border: "1px solid rgba(255,255,255,0.1)",
                color: "rgba(255,255,255,0.45)", fontSize: 11,
                fontFamily: "'JetBrains Mono', monospace",
              }}
            >
              New Situation
            </button>
          )}
          <div style={{ marginLeft: "auto" }}>
            <button
              onClick={convene}
              disabled={loading || !situation.trim()}
              style={{
                padding: "11px 28px", borderRadius: 10,
                cursor: loading || !situation.trim() ? "not-allowed" : "pointer",
                background: loading || !situation.trim()
                  ? "rgba(245,158,11,0.08)"
                  : "linear-gradient(135deg, #F59E0B, #d97706)",
                border: "1px solid rgba(245,158,11,0.4)",
                color: loading || !situation.trim() ? "rgba(245,158,11,0.3)" : "#000",
                fontFamily: "'JetBrains Mono', monospace", fontSize: 12,
                fontWeight: 700, letterSpacing: "0.12em", textTransform: "uppercase",
                boxShadow: !loading && situation.trim() ? "0 0 24px rgba(245,158,11,0.25)" : "none",
                transition: "all 0.2s",
              }}
            >
              {loading ? (
                <>
                  <i className="fa-solid fa-circle-notch fa-spin" style={{ marginRight: 8 }} />
                  Convening…
                </>
              ) : (
                <>
                  <i className="fa-solid fa-chess-king" style={{ marginRight: 8 }} />
                  Convene War Room
                </>
              )}
            </button>
          </div>
        </div>
      </div>

      {/* ── Loading placeholder grid ──────────────────────────────────────── */}
      {loading && agents.length === 0 && (
        <div style={{
          display: "grid",
          gridTemplateColumns: "repeat(auto-fill, minmax(260px, 1fr))",
          gap: 14, animation: "fadeSlideUp 0.3s ease",
        }}>
          {["investor","customer","competitor","critic","journalist"].map(id => (
            <AgentCard
              key={id}
              agent={{ id, name: AGENT_META[id] ? ({
                investor:"The Investor", customer:"The Customer",
                competitor:"The Competitor", critic:"The Internal Critic",
                journalist:"The Journalist",
              })[id] : id, role: "", text: "", error: null }}
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
            <div key={agent.id} style={{ animationDelay: `${i * 0.08}s` }}>
              <AgentCard agent={agent} loading={false} revealed={revealed} />
            </div>
          ))}
        </div>
      )}

      {/* ── Empty state ───────────────────────────────────────────────────── */}
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
  );
}
