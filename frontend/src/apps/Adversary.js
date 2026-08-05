import React, { useState, useRef, useCallback, useEffect } from "react";
import { streamSSE } from "../lib/api";
import { toast } from "sonner";
import { useToolSessions } from "../hooks/useToolSessions";
import ToolHistorySidebar from "../components/ToolHistorySidebar";
import FollowupThread from "../components/FollowupThread";
import { writeCrossToolContext, adversaryToWarRoom } from "../lib/crossToolBridge";

// ── Phase constants ────────────────────────────────────────────────────────
const PHASE = { IDLE: "idle", ATTACKING: "attacking", SURVIVING: "surviving", DONE: "done" };

// ── Streaming text display with blinking cursor ────────────────────────────
function StreamPanel({ text, color, label, icon, loading, placeholder }) {
  const bottomRef = useRef(null);
  useEffect(() => {
    if (text) bottomRef.current?.scrollIntoView({ behavior: "smooth", block: "nearest" });
  }, [text]);

  return (
    <div style={{
      flex: 1, minHeight: 0, display: "flex", flexDirection: "column",
      border: `1px solid ${color}22`,
      borderRadius: 16,
      background: `linear-gradient(160deg, ${color}08 0%, rgba(0,0,0,0.4) 100%)`,
      overflow: "hidden",
      transition: "border-color 0.4s",
      ...(loading ? { borderColor: `${color}55` } : {}),
    }}>
      {/* Header */}
      <div style={{
        padding: "12px 18px", display: "flex", alignItems: "center", gap: 10,
        borderBottom: `1px solid ${color}18`,
        background: `${color}08`,
      }}>
        <i className={`fa-solid ${icon}`} style={{ color, fontSize: 13 }} />
        <span style={{
          fontFamily: "'JetBrains Mono', monospace", fontSize: 10,
          color: `${color}cc`, letterSpacing: "0.15em", textTransform: "uppercase",
        }}>
          {label}
        </span>
        {loading && (
          <div style={{ marginLeft: "auto", display: "flex", gap: 4 }}>
            {[0,1,2].map(i => (
              <div key={i} style={{
                width: 5, height: 5, borderRadius: "50%", background: color,
                animation: `pulse 1.2s ease-in-out ${i * 0.2}s infinite`,
                opacity: 0.7,
              }} />
            ))}
          </div>
        )}
      </div>

      {/* Content */}
      <div style={{
        flex: 1, overflowY: "auto", padding: "18px 20px",
        fontFamily: "'Inter', sans-serif", fontSize: 13.5, lineHeight: 1.75,
        color: text ? "rgba(255,255,255,0.88)" : "rgba(255,255,255,0.2)",
        whiteSpace: "pre-wrap", wordBreak: "break-word",
      }}>
        {text || (!loading && placeholder)}
        {loading && !text && (
          <span style={{ color: `${color}99`, fontFamily: "'JetBrains Mono', monospace", fontSize: 11 }}>
            Initialising...
          </span>
        )}
        {text && loading && (
          <span style={{
            display: "inline-block", width: 2, height: "1em",
            background: color, marginLeft: 2, verticalAlign: "middle",
            animation: "blink 0.8s step-end infinite",
          }} />
        )}
        <div ref={bottomRef} />
      </div>
    </div>
  );
}

// ── Main component ─────────────────────────────────────────────────────────
export default function Adversary() {
  const [idea,        setIdea]        = useState("");
  const [phase,       setPhase]       = useState(PHASE.IDLE);
  const [attackText,  setAttackText]  = useState("");
  const [surviveText, setSurviveText] = useState("");
  const [sidebarOpen, setSidebarOpen] = useState(false);
  const abortRef   = useRef(null);
  const attackRef  = useRef("");
  const mountedRef = useRef(true);
  const sessionRef = useRef(null); // current run's sessionId

  const {
    sessions, activeSessionId, loading: sessionsLoading,
    createSession, switchSession, renameSession, deleteSession, saveRun, loadRun,
  } = useToolSessions("adversary");

  useEffect(() => { mountedRef.current = true; return () => { mountedRef.current = false; }; }, []);

  // ── Load run when switching sessions ────────────────────────────────────
  useEffect(() => {
    if (!activeSessionId) return;
    loadRun(activeSessionId).then((msgs) => {
      if (!mountedRef.current || !msgs.length) return;
      const userMsg  = msgs.find((m) => m.role === "user");
      const attack   = msgs.find((m) => m.role === "assistant" && m.meta?.section === "attack");
      const survive  = msgs.find((m) => m.role === "assistant" && m.meta?.section === "survive");
      if (userMsg)  setIdea(userMsg.content || "");
      if (attack)   setAttackText(attack.content || "");
      if (survive)  setSurviveText(survive.content || "");
      if (attack || survive) setPhase(PHASE.DONE);
      else setPhase(PHASE.IDLE);
    });
  // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [activeSessionId]);

  const cancel = useCallback(() => {
    abortRef.current?.abort();
    if (mountedRef.current) setPhase(attackText ? PHASE.DONE : PHASE.IDLE);
  }, [attackText]);

  const run = useCallback(async () => {
    const trimmed = idea.trim();
    if (!trimmed || phase !== PHASE.IDLE) return;

    // Create a new session for this run
    const shortTitle = trimmed.length > 55 ? trimmed.slice(0, 55) + "…" : trimmed;
    const sess = await createSession(shortTitle);
    sessionRef.current = sess?.session_id || null;

    setAttackText("");
    setSurviveText("");
    attackRef.current = "";

    const ctrl = new AbortController();
    abortRef.current = ctrl;

    try {
      // ── Phase 1: The Attack ──────────────────────────────────────────────
      setPhase(PHASE.ATTACKING);
      await streamSSE(
        "/ai/adversary",
        { idea: trimmed, phase: "attack" },
        (chunk) => {
          if (!mountedRef.current) return;
          attackRef.current += chunk;
          setAttackText(prev => prev + chunk);
        },
        ctrl.signal,
      );
      if (!mountedRef.current || ctrl.signal.aborted) return;

      // ── Phase 2: What Survived ───────────────────────────────────────────
      setPhase(PHASE.SURVIVING);
      let surviveAcc = "";
      await streamSSE(
        "/ai/adversary",
        { idea: trimmed, phase: "survive", attack_text: attackRef.current },
        (chunk) => {
          if (!mountedRef.current) return;
          surviveAcc += chunk;
          setSurviveText(prev => prev + chunk);
        },
        ctrl.signal,
      );
      if (mountedRef.current) {
        setPhase(PHASE.DONE);
        // Save to session
        if (sessionRef.current) {
          const ts = new Date().toISOString();
          saveRun(sessionRef.current, [
            { role: "user",      content: trimmed,              meta: {}, created_at: ts },
            { role: "assistant", content: attackRef.current,    meta: { section: "attack" }, created_at: ts },
            { role: "assistant", content: surviveAcc,           meta: { section: "survive" }, created_at: ts },
          ], trimmed);
        }
        // P11: make context available to War Room
        writeCrossToolContext({
          from:    "adversary",
          to:      "warroom",
          label:   `Adversary: "${trimmed.slice(0, 60)}${trimmed.length > 60 ? "…" : ""}"`,
          context: adversaryToWarRoom({ idea: trimmed, attackText: attackRef.current, surviveText: surviveAcc }),
        });
      }
    } catch (err) {
      if (err?.name === "AbortError") return;
      if (!mountedRef.current) return;
      setPhase(attackText ? PHASE.DONE : PHASE.IDLE);
      toast.error(
        err?.status === 429
          ? "Rate limited — try again in a moment."
          : "Attack failed — please try again.",
      );
    }
  }, [idea, phase, attackText, createSession, saveRun]);

  const reset = useCallback(() => {
    abortRef.current?.abort();
    setIdea("");
    setAttackText("");
    setSurviveText("");
    attackRef.current = "";
    sessionRef.current = null;
    setPhase(PHASE.IDLE);
  }, []);

  const handleNewRun = useCallback(() => {
    reset();
  }, [reset]);

  const isRunning = phase === PHASE.ATTACKING || phase === PHASE.SURVIVING;

  return (
    <div data-testid="adversary-app" style={{ height: "100%", display: "flex", flexDirection: "row", overflow: "hidden" }}>
      {/* ── History sidebar ───────────────────────────────────────────────── */}
      {sidebarOpen && (
        <ToolHistorySidebar
          sessions={sessions}
          activeSessionId={activeSessionId}
          onSelect={(id) => { switchSession(id); setSidebarOpen(false); }}
          onNewRun={() => { handleNewRun(); setSidebarOpen(false); }}
          onRename={renameSession}
          onDelete={deleteSession}
          accentColor="#FF003C"
          loading={sessionsLoading}
          label="Adversary Runs"
        />
      )}

      {/* ── Main area ────────────────────────────────────────────────────── */}
      <div style={{
        flex: 1, minWidth: 0, display: "flex", flexDirection: "column",
        background: "radial-gradient(ellipse at top left, rgba(255,0,60,0.05) 0%, transparent 60%)",
        /* P17: clamp padding on small screens */
        padding: "clamp(12px, 3vw, 24px) clamp(12px, 3vw, 24px)",
        gap: 16, color: "#fff", overflow: "hidden",
      }}>
        <style>{`
          @keyframes blink { 0%,100%{opacity:1} 50%{opacity:0} }
          @keyframes pulse { 0%,100%{transform:scale(1);opacity:0.7} 50%{transform:scale(1.4);opacity:1} }
          @keyframes fadeSlideUp { from{opacity:0;transform:translateY(6px)} to{opacity:1;transform:translateY(0)} }
          .adversary-textarea::-webkit-scrollbar{width:4px}
          .adversary-textarea::-webkit-scrollbar-thumb{background:rgba(255,0,60,0.3);border-radius:4px}
        `}</style>

        {/* ── Header ──────────────────────────────────────────────────────── */}
        <div style={{ flexShrink: 0, display: "flex", alignItems: "flex-start", gap: 10 }}>
          {/* History toggle */}
          <button
            onClick={() => setSidebarOpen(v => !v)}
            title={sidebarOpen ? "Hide history" : "Show history"}
            style={{
              marginTop: 2, flexShrink: 0,
              width: 28, height: 28, borderRadius: 7, border: "none", cursor: "pointer",
              background: sidebarOpen ? "rgba(255,0,60,0.14)" : "rgba(255,255,255,0.06)",
              color: sidebarOpen ? "#FF003C" : "rgba(255,255,255,0.4)",
              display: "flex", alignItems: "center", justifyContent: "center",
              transition: "background 0.15s, color 0.15s",
            }}
          >
            <i className="fa-solid fa-clock-rotate-left" style={{ fontSize: 12 }} />
          </button>
          <div style={{ flex: 1 }}>
            <div style={{
              fontFamily: "'JetBrains Mono', monospace", fontSize: 10,
              color: "#FF003C99", letterSpacing: "0.2em", textTransform: "uppercase", marginBottom: 4,
            }}>
              // adversary protocol
            </div>
            <div style={{ display: "flex", alignItems: "baseline", gap: 12 }}>
              <h1 style={{ fontSize: 22, fontWeight: 800, margin: 0, letterSpacing: "-0.02em" }}>
                The Adversary
              </h1>
              <span style={{
                fontSize: 11, fontFamily: "'JetBrains Mono', monospace",
                color: "rgba(255,255,255,0.3)", flexShrink: 0,
              }}>
                what survives the assault is real
              </span>
            </div>
          </div>
        </div>

        {/* ── Input area — visible only when idle ───────────────────────────── */}
        {phase === PHASE.IDLE && (
          <div style={{ flexShrink: 0, animation: "fadeSlideUp 0.25s ease" }}>
            <textarea
              className="adversary-textarea"
              value={idea}
              onChange={e => setIdea(e.target.value)}
              placeholder="Describe your idea, startup, strategy, or plan. Be as specific as possible — the more detail you give, the more precise the attack."
              rows={5}
              style={{
                width: "100%", background: "rgba(255,0,60,0.04)",
                border: "1px solid rgba(255,0,60,0.2)", borderRadius: 12,
                color: "rgba(255,255,255,0.9)", fontFamily: "'Inter', sans-serif",
                fontSize: 14, lineHeight: 1.7, padding: "14px 18px",
                resize: "none", outline: "none", boxSizing: "border-box",
                transition: "border-color 0.2s",
              }}
              onFocus={e => { e.target.style.borderColor = "rgba(255,0,60,0.5)"; }}
              onBlur={e => { e.target.style.borderColor = "rgba(255,0,60,0.2)"; }}
            />
            <div style={{ display: "flex", justifyContent: "flex-end", marginTop: 10 }}>
              <button
                onClick={run}
                disabled={!idea.trim()}
                style={{
                  padding: "11px 28px", borderRadius: 10, cursor: idea.trim() ? "pointer" : "not-allowed",
                  background: idea.trim()
                    ? "linear-gradient(135deg, #FF003C, #cc0030)"
                    : "rgba(255,0,60,0.08)",
                  border: "1px solid rgba(255,0,60,0.4)",
                  color: idea.trim() ? "#fff" : "rgba(255,0,60,0.3)",
                  fontFamily: "'JetBrains Mono', monospace", fontSize: 12,
                  fontWeight: 700, letterSpacing: "0.12em", textTransform: "uppercase",
                  boxShadow: idea.trim() ? "0 0 24px rgba(255,0,60,0.3)" : "none",
                  transition: "all 0.2s",
                }}
              >
                <i className="fa-solid fa-crosshairs" style={{ marginRight: 8 }} />
                Initiate Attack
              </button>
            </div>
          </div>
        )}

        {/* ── Running / done — two panels ───────────────────────────────────── */}
        {phase !== PHASE.IDLE && (
          <div style={{
            flex: 1, minHeight: 0, display: "flex", flexDirection: "column", gap: 12,
            animation: "fadeSlideUp 0.3s ease",
          }}>
            {/* Idea recap + controls */}
            <div style={{
              display: "flex", alignItems: "center", gap: 10, flexShrink: 0,
              padding: "8px 14px", borderRadius: 10,
              background: "rgba(255,255,255,0.03)", border: "1px solid rgba(255,255,255,0.07)",
            }}>
              <i className="fa-solid fa-bullseye" style={{ color: "#FF003C", fontSize: 11 }} />
              <span style={{
                flex: 1, fontFamily: "'Inter', sans-serif", fontSize: 12,
                color: "rgba(255,255,255,0.55)", overflow: "hidden",
                textOverflow: "ellipsis", whiteSpace: "nowrap",
              }}>
                {idea.length > 100 ? idea.slice(0, 100) + "…" : idea}
              </span>
              {isRunning ? (
                <button
                  onClick={cancel}
                  style={{
                    padding: "4px 12px", borderRadius: 6, cursor: "pointer",
                    background: "rgba(255,0,60,0.1)", border: "1px solid rgba(255,0,60,0.3)",
                    color: "#FF003C", fontSize: 11, fontFamily: "'JetBrains Mono', monospace",
                  }}
                >
                  Abort
                </button>
              ) : (
                <button
                  onClick={reset}
                  style={{
                    padding: "4px 12px", borderRadius: 6, cursor: "pointer",
                    background: "rgba(255,255,255,0.05)", border: "1px solid rgba(255,255,255,0.12)",
                    color: "rgba(255,255,255,0.5)", fontSize: 11,
                    fontFamily: "'JetBrains Mono', monospace",
                  }}
                >
                  New Idea
                </button>
              )}
            </div>

            {/* Phase status bar */}
            {isRunning && (
              <div style={{
                flexShrink: 0, padding: "6px 14px", borderRadius: 8,
                background: phase === PHASE.ATTACKING
                  ? "rgba(255,0,60,0.08)"
                  : "rgba(0,240,255,0.06)",
                border: `1px solid ${phase === PHASE.ATTACKING ? "rgba(255,0,60,0.2)" : "rgba(0,240,255,0.15)"}`,
                fontFamily: "'JetBrains Mono', monospace", fontSize: 10,
                color: phase === PHASE.ATTACKING ? "#FF003C99" : "#00F0FFaa",
                letterSpacing: "0.12em",
              }}>
                {phase === PHASE.ATTACKING
                  ? "▶ ASSAULT IN PROGRESS — analysing every assumption…"
                  : "▶ CALCULATING WHAT SURVIVED — finding the unbreakable core…"}
              </div>
            )}

            {/* Attack panel */}
            <StreamPanel
              text={attackText}
              color="#FF003C"
              label="Assault"
              icon="fa-burst"
              loading={phase === PHASE.ATTACKING}
              placeholder="The attack will appear here…"
            />

            {/* Survive panel — only once attack has started */}
            {(phase === PHASE.SURVIVING || phase === PHASE.DONE) && (
              <StreamPanel
                text={surviveText}
                color="#00F0FF"
                label="What Survived"
                icon="fa-shield-halved"
                loading={phase === PHASE.SURVIVING}
                placeholder="What couldn't be broken…"
              />
            )}

            {/* P9: Multi-turn follow-up thread */}
            {phase === PHASE.DONE && (
              <FollowupThread
                tool="adversary"
                context={`Idea:\n${idea}\n\n## ASSAULT\n${attackText}\n\n## WHAT SURVIVED\n${surviveText}`}
                accentColor="#FF003C"
              />
            )}

            {/* P11: Cross-tool — send to War Room */}
            {phase === PHASE.DONE && surviveText && (
              <div style={{ display: "flex", justifyContent: "flex-end", flexShrink: 0 }}>
                <button
                  title="Send this analysis to War Room as context"
                  onClick={() => {
                    writeCrossToolContext({
                      from:    "adversary",
                      to:      "warroom",
                      label:   `Adversary: "${idea.slice(0, 60)}${idea.length > 60 ? "…" : ""}"`,
                      context: adversaryToWarRoom({ idea, attackText, surviveText }),
                    });
                    toast.success("Context ready — open War Room to load it.", { duration: 3000 });
                  }}
                  style={{
                    padding: "6px 14px", borderRadius: 7, cursor: "pointer",
                    background: "rgba(245,158,11,0.08)", border: "1px solid rgba(245,158,11,0.22)",
                    color: "rgba(245,158,11,0.7)", fontFamily: "'JetBrains Mono', monospace",
                    fontSize: 10, letterSpacing: "0.08em", transition: "all 0.15s",
                  }}
                  onMouseEnter={(e) => { e.currentTarget.style.color = "#F59E0B"; e.currentTarget.style.background = "rgba(245,158,11,0.14)"; }}
                  onMouseLeave={(e) => { e.currentTarget.style.color = "rgba(245,158,11,0.7)"; e.currentTarget.style.background = "rgba(245,158,11,0.08)"; }}
                >
                  <i className="fa-solid fa-arrow-right" style={{ marginRight: 5, fontSize: 8 }} />
                  Send to War Room
                </button>
              </div>
            )}
          </div>
        )}
      </div>
    </div>
  );
}
