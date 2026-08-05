import React, { useState, useRef, useCallback, useEffect } from "react";
import { streamSSE } from "../lib/api";
import { toast } from "sonner";
import { useToolSessions } from "../hooks/useToolSessions";
import ToolHistorySidebar from "../components/ToolHistorySidebar";
import FollowupThread from "../components/FollowupThread";
import { readCrossToolContext, clearCrossToolContext } from "../lib/crossToolBridge";

const ACCENT = "#7B2FFF";

// ── Section config ──────────────────────────────────────────────────────────
const SECTION_CONFIG = {
  HEADING: {
    color: "#5BB8FF", dimColor: "rgba(91,184,255,0.12)", borderColor: "rgba(91,184,255,0.22)",
    label: "WHERE YOU'RE HEADING", icon: "fa-compass", description: "Trajectory projection based on current behaviour",
  },
  GAP: {
    color: "#F59E0B", dimColor: "rgba(245,158,11,0.10)", borderColor: "rgba(245,158,11,0.22)",
    label: "THE GAP", icon: "fa-triangle-exclamation", description: "Distance between trajectory and stated destination",
  },
  DELTA: {
    color: "#7B2FFF", dimColor: "rgba(123,47,255,0.10)", borderColor: "rgba(123,47,255,0.22)",
    label: "THE DELTA", icon: "fa-sliders", description: "Specific behavioural levers that alter the trajectory",
  },
};

function identifySection(headerText) {
  const upper = headerText.toUpperCase();
  if (upper.includes("HEADING") || upper.includes("WHERE")) return "HEADING";
  if (upper.includes("GAP"))   return "GAP";
  if (upper.includes("DELTA")) return "DELTA";
  return null;
}

function parseYearLine(line) {
  const clean = line.replace(/\*\*/g, "").trim();
  const m =
    clean.match(/^(1[\s-]?year[s]?)[:\s]+(.+)/i) ||
    clean.match(/^(3[\s-]?year[s]?)[:\s]+(.+)/i) ||
    clean.match(/^(5[\s-]?year[s]?)[:\s]+(.+)/i);
  if (m) return { badge: m[1].replace(/\s+/g, " ").toUpperCase(), text: m[2].trim() };
  return null;
}

function InlineText({ text, baseColor = "rgba(255,255,255,0.85)" }) {
  const parts = text.split(/(\*\*[^*]+\*\*)/g);
  return (
    <>
      {parts.map((part, i) =>
        part.startsWith("**") && part.endsWith("**") ? (
          <strong key={i} style={{ color: "#fff", fontWeight: 600 }}>{part.slice(2, -2)}</strong>
        ) : (
          <span key={i} style={{ color: baseColor }}>{part}</span>
        )
      )}
    </>
  );
}

function YearCard({ badge, text, sectionColor }) {
  return (
    <div style={{
      display: "flex", gap: 14, alignItems: "flex-start",
      padding: "12px 16px", borderRadius: 10,
      background: "rgba(91,184,255,0.04)", border: "1px solid rgba(91,184,255,0.12)", marginBottom: 8,
    }}>
      <div style={{
        flexShrink: 0, display: "flex", alignItems: "center", justifyContent: "center",
        width: 38, height: 38, borderRadius: 8,
        background: `${sectionColor}12`, border: `1px solid ${sectionColor}28`,
      }}>
        <span style={{
          fontFamily: "'JetBrains Mono', monospace", fontSize: 9.5,
          color: sectionColor, letterSpacing: "0.06em", fontWeight: 700, textAlign: "center", lineHeight: 1.2,
        }}>
          {badge.replace(" YEARS", "Y").replace(" YEAR", "Y")}
        </span>
      </div>
      <p style={{ margin: 0, fontSize: 13.5, lineHeight: 1.75, flex: 1 }}>
        <InlineText text={text} />
      </p>
    </div>
  );
}

function DeltaItem({ index, text, sectionColor }) {
  return (
    <div style={{
      display: "flex", gap: 14, alignItems: "flex-start",
      padding: "10px 14px", borderRadius: 8,
      background: `${sectionColor}08`, border: `1px solid ${sectionColor}18`, marginBottom: 7,
    }}>
      <span style={{
        flexShrink: 0, fontFamily: "'JetBrains Mono', monospace",
        fontSize: 9, fontWeight: 700, color: `${sectionColor}99`,
        width: 22, paddingTop: 2, letterSpacing: "0.04em",
      }}>
        {String(index).padStart(2, "0")}
      </span>
      <p style={{ margin: 0, fontSize: 13.5, lineHeight: 1.75, flex: 1 }}>
        <InlineText text={text} />
      </p>
    </div>
  );
}

function SectionHeader({ config, isFirst }) {
  return (
    <div style={{
      marginTop: isFirst ? 0 : 28, marginBottom: 14,
      padding: "10px 16px", borderRadius: 8,
      background: config.dimColor, border: `1px solid ${config.borderColor}`,
      display: "flex", alignItems: "center", gap: 10,
    }}>
      <i className={`fa-solid ${config.icon}`} style={{ fontSize: 13, color: config.color, flexShrink: 0 }} />
      <div style={{ flex: 1 }}>
        <div style={{
          fontFamily: "'JetBrains Mono', monospace", fontSize: 10,
          color: config.color, letterSpacing: "0.18em", textTransform: "uppercase", fontWeight: 700,
        }}>{config.label}</div>
        <div style={{ fontSize: 11, color: "rgba(255,255,255,0.35)", marginTop: 2, fontFamily: "'Inter', sans-serif" }}>
          {config.description}
        </div>
      </div>
    </div>
  );
}

const EPISTEMIC_PATTERNS = [
  { re: /^(assumption[s]?)[:\s]/i, label: "ASSUMPTION", color: "#F59E0B" },
  { re: /^(projection)[:\s]/i,     label: "PROJECTION", color: "#5BB8FF" },
  { re: /^(confidence)[:\s]/i,     label: "CONFIDENCE", color: "#39FF14" },
  { re: /^(uncertainty)[:\s]/i,    label: "UNCERTAIN",  color: "#FF7090" },
];

function EpistemicLine({ label, color, text }) {
  return (
    <div style={{ display: "flex", gap: 8, alignItems: "flex-start", marginBottom: 6 }}>
      <span style={{
        flexShrink: 0, fontFamily: "'JetBrains Mono', monospace", fontSize: 9,
        fontWeight: 700, color, letterSpacing: "0.1em",
        padding: "2px 6px", borderRadius: 4,
        background: `${color}12`, border: `1px solid ${color}28`, marginTop: 2,
      }}>{label}</span>
      <p style={{ margin: 0, fontSize: 13.5, lineHeight: 1.75, color: "rgba(255,255,255,0.75)" }}>
        <InlineText text={text} />
      </p>
    </div>
  );
}

function RenderOutput({ text }) {
  if (!text) return null;
  const sectionChunks = text.split(/(?=^## )/m);
  const rendered = [];

  sectionChunks.forEach((chunk, chunkIdx) => {
    const lines = chunk.split("\n");
    const firstLine = lines[0].trim();

    if (firstLine.startsWith("## ")) {
      const headerText = firstLine.slice(3).trim();
      const sectionKey = identifySection(headerText);
      const config = sectionKey ? SECTION_CONFIG[sectionKey] : null;
      const bodyLines = lines.slice(1);

      rendered.push(
        <SectionHeader
          key={`hdr-${chunkIdx}`}
          config={config || { label: headerText, color: ACCENT, dimColor: `${ACCENT}0a`, borderColor: `${ACCENT}20`, icon: "fa-circle", description: "" }}
          isFirst={chunkIdx === 0}
        />
      );

      const bodyElements = [];
      let deltaCount = 0;

      bodyLines.forEach((line, li) => {
        const trimmed = line.trim();
        if (!trimmed) {
          bodyElements.push(<div key={`sp-${chunkIdx}-${li}`} style={{ height: 4 }} />);
          return;
        }

        if (sectionKey === "HEADING") {
          const yearMatch = parseYearLine(trimmed);
          if (yearMatch) {
            bodyElements.push(
              <YearCard key={`yr-${chunkIdx}-${li}`} badge={yearMatch.badge} text={yearMatch.text} sectionColor={config.color} />
            );
            return;
          }
        }

        if (sectionKey === "DELTA") {
          const isBullet = /^[-*•]\s+/.test(trimmed);
          const isNumbered = /^\d+[.)]\s+/.test(trimmed);
          if (isBullet || isNumbered) {
            const itemText = trimmed.replace(/^[-*•]\s+/, "").replace(/^\d+[.)]\s+/, "");
            deltaCount++;
            bodyElements.push(
              <DeltaItem key={`di-${chunkIdx}-${li}`} index={deltaCount} text={itemText} sectionColor={config.color} />
            );
            return;
          }
        }

        let epistemicMatch = null;
        for (const ep of EPISTEMIC_PATTERNS) {
          const m = trimmed.match(ep.re);
          if (m) { epistemicMatch = { label: ep.label, color: ep.color, text: trimmed.slice(m[0].length).trim() }; break; }
        }
        if (epistemicMatch) {
          bodyElements.push(
            <EpistemicLine key={`ep-${chunkIdx}-${li}`} label={epistemicMatch.label} color={epistemicMatch.color} text={epistemicMatch.text} />
          );
          return;
        }

        bodyElements.push(
          <p key={`p-${chunkIdx}-${li}`} style={{ margin: "0 0 8px 0", fontSize: 13.5, lineHeight: 1.8 }}>
            <InlineText text={trimmed} baseColor={sectionKey === "GAP" ? "rgba(255,230,180,0.82)" : "rgba(255,255,255,0.82)"} />
          </p>
        );
      });

      rendered.push(<div key={`body-${chunkIdx}`} style={{ marginBottom: 4 }}>{bodyElements}</div>);
    } else if (chunk.trim()) {
      rendered.push(
        <p key={`pre-${chunkIdx}`} style={{ fontSize: 13.5, lineHeight: 1.8, color: "rgba(255,255,255,0.75)", marginBottom: 8 }}>
          <InlineText text={chunk.trim()} />
        </p>
      );
    }
  });

  return <>{rendered}</>;
}

// ── Main component ─────────────────────────────────────────────────────────
export default function DeadReckoning() {
  const [input,       setInput]       = useState("");
  const [loading,     setLoading]     = useState(false);
  const [output,      setOutput]      = useState("");
  const [done,        setDone]        = useState(false);
  const [sidebarOpen, setSidebarOpen] = useState(false);
  const [crossImport, setCrossImport] = useState(null); // P11
  const abortRef   = useRef(null);
  const mountedRef = useRef(true);
  const bottomRef  = useRef(null);
  const sessionRef = useRef(null);

  const {
    sessions, activeSessionId, loading: sessionsLoading,
    createSession, switchSession, renameSession, deleteSession, saveRun, loadRun,
  } = useToolSessions("deadreckoning");

  useEffect(() => { mountedRef.current = true; return () => { mountedRef.current = false; }; }, []);

  // ── Load run when switching sessions ──────────────────────────────────────
  useEffect(() => {
    if (!activeSessionId) return;
    loadRun(activeSessionId).then((msgs) => {
      if (!mountedRef.current || !msgs.length) return;
      const userMsg = msgs.find((m) => m.role === "user");
      const asstMsg = msgs.find((m) => m.role === "assistant");
      if (userMsg) setInput(userMsg.content || "");
      if (asstMsg) { setOutput(asstMsg.content || ""); setDone(true); }
      else { setOutput(""); setDone(false); }
    });
  // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [activeSessionId]);

  // P11: Cross-tool import from War Room
  useEffect(() => {
    const imported = readCrossToolContext("deadreckoning");
    if (imported) setCrossImport(imported);
  }, []);

  useEffect(() => {
    if (output) bottomRef.current?.scrollIntoView({ behavior: "smooth", block: "nearest" });
  }, [output]);

  const calculate = useCallback(async () => {
    const trimmed = input.trim();
    if (!trimmed || loading) return;

    // Create session for this run
    const shortTitle = trimmed.length > 55 ? trimmed.slice(0, 55) + "…" : trimmed;
    const sess = await createSession(shortTitle);
    sessionRef.current = sess?.session_id || null;

    setOutput("");
    setDone(false);
    const ctrl = new AbortController();
    abortRef.current = ctrl;
    setLoading(true);

    let accumulated = "";
    try {
      await streamSSE(
        "/ai/deadreckoning",
        { input: trimmed },
        (chunk) => {
          if (!mountedRef.current) return;
          accumulated += chunk;
          setOutput(prev => prev + chunk);
        },
        ctrl.signal,
      );
      if (mountedRef.current) {
        setDone(true);
        // Save to session
        if (sessionRef.current) {
          const ts = new Date().toISOString();
          saveRun(sessionRef.current, [
            { role: "user",      content: trimmed,     meta: {}, created_at: ts },
            { role: "assistant", content: accumulated, meta: {}, created_at: ts },
          ], trimmed);
        }
      }
    } catch (err) {
      if (err?.name === "AbortError") return;
      if (!mountedRef.current) return;
      toast.error(
        err?.status === 429
          ? "Rate limited — try again in a moment."
          : "Calculation failed — please try again.",
      );
    } finally {
      if (mountedRef.current) setLoading(false);
    }
  }, [input, loading, createSession, saveRun]);

  const reset = useCallback(() => {
    abortRef.current?.abort();
    setInput("");
    setOutput("");
    setDone(false);
    setLoading(false);
    sessionRef.current = null;
  }, []);

  return (
    <div style={{ height: "100%", display: "flex", flexDirection: "row", overflow: "hidden" }}>
      {/* ── History sidebar ─────────────────────────────────────────────── */}
      {sidebarOpen && (
        <ToolHistorySidebar
          sessions={sessions}
          activeSessionId={activeSessionId}
          onSelect={(id) => { switchSession(id); setSidebarOpen(false); }}
          onNewRun={() => { reset(); setSidebarOpen(false); }}
          onRename={renameSession}
          onDelete={deleteSession}
          accentColor={ACCENT}
          loading={sessionsLoading}
          label="Dead Reckoning Runs"
        />
      )}

      {/* ── Main area ───────────────────────────────────────────────────── */}
      <div style={{
        flex: 1, minWidth: 0, display: "flex", flexDirection: "column",
        background: "radial-gradient(ellipse at bottom left, rgba(123,47,255,0.07) 0%, transparent 65%)",
        padding: "20px 24px", gap: 16, color: "#fff", overflowY: "auto",
      }}>
        <style>{`
          @keyframes pulse { 0%, 100% { opacity: 0.4; } 50% { opacity: 0.9; } }
          @keyframes drFadeUp { from { opacity: 0; transform: translateY(6px); } to { opacity: 1; transform: translateY(0); } }
          .dr-textarea:focus { outline: none; }
          .dr-textarea::-webkit-scrollbar { width: 4px; }
          .dr-textarea::-webkit-scrollbar-track { background: transparent; }
          .dr-textarea::-webkit-scrollbar-thumb { background: ${ACCENT}33; border-radius: 4px; }
        `}</style>

        {/* ── Header ──────────────────────────────────────────────────────── */}
        <div style={{ flexShrink: 0, display: "flex", alignItems: "flex-start", gap: 10 }}>
          <button
            onClick={() => setSidebarOpen(v => !v)}
            title={sidebarOpen ? "Hide history" : "Show history"}
            style={{
              marginTop: 2, flexShrink: 0,
              width: 28, height: 28, borderRadius: 7, border: "none", cursor: "pointer",
              background: sidebarOpen ? `${ACCENT}20` : "rgba(255,255,255,0.06)",
              color: sidebarOpen ? ACCENT : "rgba(255,255,255,0.4)",
              display: "flex", alignItems: "center", justifyContent: "center",
              transition: "background 0.15s, color 0.15s",
            }}
          >
            <i className="fa-solid fa-clock-rotate-left" style={{ fontSize: 12 }} />
          </button>
          <div style={{ flex: 1 }}>
            <div style={{ display: "flex", alignItems: "center", gap: 10, marginBottom: 4 }}>
              <i className="fa-solid fa-compass-drafting" style={{ color: ACCENT, fontSize: 18 }} />
              <span style={{
                fontFamily: "'JetBrains Mono', monospace", fontSize: 13, fontWeight: 700,
                color: "#fff", letterSpacing: "0.08em",
              }}>DEAD RECKONING</span>
            </div>
            <div style={{
              fontFamily: "'JetBrains Mono', monospace", fontSize: 10,
              color: "rgba(255,255,255,0.3)", letterSpacing: "0.08em",
            }}>
              No motivation. No judgment. Just physics. Behaviour compounds.
            </div>
          </div>
        </div>

        {/* P11: Cross-tool import banner from War Room */}
        {crossImport && !output && !loading && (
          <div style={{
            flexShrink: 0, padding: "10px 14px", borderRadius: 10,
            background: `${ACCENT}0a`, border: `1px solid ${ACCENT}25`,
            display: "flex", alignItems: "center", gap: 10, animation: "drFadeUp 0.3s ease",
          }}>
            <i className="fa-solid fa-arrow-right-to-bracket" style={{ color: ACCENT, fontSize: 11 }} />
            <span style={{ flex: 1, fontSize: 12, color: "rgba(255,255,255,0.65)", fontFamily: "'Inter', sans-serif" }}>
              Context from <strong style={{ color: ACCENT }}>War Room</strong>: {crossImport.label}
            </span>
            <button
              onClick={() => {
                setInput(crossImport.context);
                clearCrossToolContext();
                setCrossImport(null);
              }}
              style={{
                padding: "4px 12px", borderRadius: 6, cursor: "pointer",
                background: `${ACCENT}18`, border: `1px solid ${ACCENT}30`,
                color: ACCENT, fontFamily: "'JetBrains Mono', monospace", fontSize: 10,
              }}
            >Load</button>
            <button
              onClick={() => { clearCrossToolContext(); setCrossImport(null); }}
              style={{
                width: 22, height: 22, borderRadius: 5, cursor: "pointer",
                background: "transparent", border: "none",
                color: "rgba(255,255,255,0.25)", fontSize: 12, display: "flex", alignItems: "center", justifyContent: "center",
              }}
            >×</button>
          </div>
        )}

        {/* ── Input form ───────────────────────────────────────────────────── */}
        {!loading && !output && (
          <div style={{ flex: 1, display: "flex", flexDirection: "column", gap: 12, animation: "drFadeUp 0.25s ease" }}>
            <div style={{
              marginBottom: 10, padding: "10px 14px", borderRadius: 10,
              background: `${ACCENT}0a`, border: `1px solid ${ACCENT}20`,
              fontFamily: "'JetBrains Mono', monospace", fontSize: 10.5,
              color: "rgba(255,255,255,0.4)", lineHeight: 1.7,
            }}>
              <i className="fa-solid fa-circle-info" style={{ marginRight: 6, color: `${ACCENT}aa` }} />
              Be honest about what you <em>actually</em> do — not what you intend to do.
              Include: your current habits, the decisions you keep making, things you keep avoiding, and what you say you want.
              The analysis is only as accurate as the input.
            </div>

            <textarea
              className="dr-textarea"
              value={input}
              onChange={e => setInput(e.target.value)}
              placeholder={`Example:\n"I want to start a company but I spend 3 hours a day on social media. I save about $200/month. I keep saying I'll quit my job 'when the time is right' but haven't started building anything. I want financial freedom and to be my own boss."`}
              rows={8}
              style={{
                width: "100%", background: `${ACCENT}05`,
                border: `1px solid ${ACCENT}22`, borderRadius: 12,
                color: "rgba(255,255,255,0.9)", fontFamily: "'Inter', sans-serif",
                fontSize: 13.5, lineHeight: 1.8, padding: "14px 18px",
                resize: "none", outline: "none", boxSizing: "border-box",
                transition: "border-color 0.2s",
              }}
              onFocus={e => { e.target.style.borderColor = `${ACCENT}55`; }}
              onBlur={e => { e.target.style.borderColor = `${ACCENT}22`; }}
            />

            <div style={{ display: "flex", justifyContent: "flex-end", marginTop: 10 }}>
              <button
                onClick={calculate}
                disabled={!input.trim()}
                style={{
                  padding: "11px 28px", borderRadius: 10,
                  cursor: input.trim() ? "pointer" : "not-allowed",
                  background: input.trim() ? `linear-gradient(135deg, ${ACCENT}, #5b21b6)` : `${ACCENT}0a`,
                  border: `1px solid ${ACCENT}44`,
                  color: input.trim() ? "#fff" : `${ACCENT}44`,
                  fontFamily: "'JetBrains Mono', monospace", fontSize: 12,
                  fontWeight: 700, letterSpacing: "0.12em", textTransform: "uppercase",
                  boxShadow: input.trim() ? `0 0 28px ${ACCENT}30` : "none",
                  transition: "all 0.2s",
                }}
              >
                <i className="fa-solid fa-compass-drafting" style={{ marginRight: 8 }} />
                Calculate Trajectory
              </button>
            </div>
          </div>
        )}

        {/* ── Loading / streaming output ────────────────────────────────────── */}
        {(loading || output) && (
          <div style={{ flex: 1, display: "flex", flexDirection: "column", gap: 12, minHeight: 0 }}>
            {/* Input recap + controls */}
            <div style={{
              display: "flex", alignItems: "center", gap: 10, flexShrink: 0,
              padding: "8px 14px", borderRadius: 10,
              background: "rgba(255,255,255,0.03)", border: "1px solid rgba(255,255,255,0.07)",
            }}>
              <i className="fa-solid fa-compass-drafting" style={{ color: ACCENT, fontSize: 11 }} />
              <span style={{
                flex: 1, fontFamily: "'Inter', sans-serif", fontSize: 12,
                color: "rgba(255,255,255,0.45)", overflow: "hidden",
                textOverflow: "ellipsis", whiteSpace: "nowrap",
              }}>
                {input.length > 110 ? input.slice(0, 110) + "…" : input}
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
                  new run
                </button>
              )}
              {loading && (
                <button
                  onClick={() => { abortRef.current?.abort(); setLoading(false); }}
                  style={{
                    padding: "4px 12px", borderRadius: 6, cursor: "pointer",
                    background: "rgba(255,0,60,0.07)", border: "1px solid rgba(255,0,60,0.25)",
                    color: "rgba(255,100,120,0.8)", fontFamily: "'JetBrains Mono', monospace",
                    fontSize: 10, letterSpacing: "0.05em",
                  }}
                >
                  <i className="fa-solid fa-stop" style={{ marginRight: 4, fontSize: 8 }} />
                  stop
                </button>
              )}
            </div>

            {/* Output panel */}
            <div style={{
              flex: 1, overflowY: "auto", borderRadius: 12,
              padding: "20px 22px",
              background: "rgba(255,255,255,0.02)",
              border: "1px solid rgba(255,255,255,0.06)",
            }}>
              {loading && !output && (
                <div style={{ display: "flex", flexDirection: "column", gap: 10 }}>
                  {[75, 90, 65, 82, 55, 78, 88, 60].map((w, i) => (
                    <div key={i} style={{
                      height: 13, borderRadius: 4, width: `${w}%`,
                      background: `${ACCENT}10`,
                      animation: `pulse 1.5s ease-in-out ${i * 0.12}s infinite`,
                    }} />
                  ))}
                </div>
              )}

              {output && <RenderOutput text={output} />}

              {loading && output && (
                <span style={{
                  display: "inline-block", width: 2, height: "1.1em",
                  background: ACCENT, verticalAlign: "text-bottom", marginLeft: 3,
                  borderRadius: 2, animation: "pulse 0.75s ease-in-out infinite", opacity: 0.8,
                }} />
              )}

              {done && (
                <div style={{
                  marginTop: 28, paddingTop: 14,
                  borderTop: `1px solid ${ACCENT}15`,
                  display: "flex", alignItems: "center", gap: 8,
                  fontFamily: "'JetBrains Mono', monospace", fontSize: 10,
                  color: `${ACCENT}50`, letterSpacing: "0.12em",
                }}>
                  <i className="fa-solid fa-check" style={{ fontSize: 9, color: `${ACCENT}70` }} />
                  TRAJECTORY LOCKED · {new Date().toLocaleTimeString([], { hour: "2-digit", minute: "2-digit" })}
                </div>
              )}

              {/* P9: Multi-turn follow-up thread */}
              {done && (
                <FollowupThread
                  tool="deadreckoning"
                  context={`Self-assessment:\n${input}\n\nTrajectory projection:\n${output}`}
                  accentColor={ACCENT}
                />
              )}

              <div ref={bottomRef} />
            </div>
          </div>
        )}

        {/* ── Empty state ────────────────────────────────────────────────────── */}
        {!loading && !output && !input && (
          <div style={{
            flex: 1, display: "flex", flexDirection: "column",
            alignItems: "center", justifyContent: "center", gap: 14, opacity: 0.3,
            pointerEvents: "none",
          }}>
            <i className="fa-solid fa-compass-drafting" style={{ fontSize: 40, color: ACCENT }} />
            <div style={{
              fontFamily: "'JetBrains Mono', monospace", fontSize: 11,
              color: "rgba(255,255,255,0.5)", textAlign: "center", lineHeight: 1.8,
            }}>
              No motivation. No judgment. Just physics.<br />
              Behaviour compounds.
            </div>
          </div>
        )}
      </div>
    </div>
  );
}
