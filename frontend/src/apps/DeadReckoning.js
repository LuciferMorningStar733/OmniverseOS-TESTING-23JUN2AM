import React, { useState, useRef, useCallback, useEffect } from "react";
import { streamSSE } from "../lib/api";
import { toast } from "sonner";

const ACCENT = "#7B2FFF";

// ── Markdown-lite renderer — handles ## headers and plain text ─────────────
function RenderOutput({ text }) {
  if (!text) return null;

  const lines = text.split("\n");
  const elements = [];
  let key = 0;

  for (let i = 0; i < lines.length; i++) {
    const line = lines[i];

    if (line.startsWith("## ")) {
      const sectionTitle = line.slice(3).trim();
      // Colour-code the three sections
      const sectionColor =
        sectionTitle.toUpperCase().includes("HEADING") || sectionTitle.toUpperCase().includes("WHERE")
          ? "#FF003C"
          : sectionTitle.toUpperCase().includes("GAP")
          ? "#F59E0B"
          : sectionTitle.toUpperCase().includes("DELTA")
          ? "#39FF14"
          : ACCENT;

      elements.push(
        <div key={key++} style={{
          marginTop: i === 0 ? 0 : 28, marginBottom: 10,
          display: "flex", alignItems: "center", gap: 10,
        }}>
          <div style={{ width: 3, height: 18, borderRadius: 2, background: sectionColor, flexShrink: 0 }} />
          <span style={{
            fontFamily: "'JetBrains Mono', monospace", fontSize: 10,
            color: sectionColor, letterSpacing: "0.2em", textTransform: "uppercase", fontWeight: 700,
          }}>
            {sectionTitle}
          </span>
        </div>
      );
    } else if (line.trim() === "") {
      elements.push(<div key={key++} style={{ height: 8 }} />);
    } else {
      elements.push(
        <p key={key++} style={{
          margin: "0 0 6px 0", lineHeight: 1.8,
          color: "rgba(255,255,255,0.85)", fontSize: 13.5,
        }}>
          {line}
        </p>
      );
    }
  }

  return <div>{elements}</div>;
}

// ── Main component ─────────────────────────────────────────────────────────
export default function DeadReckoning() {
  const [input,    setInput]    = useState("");
  const [loading,  setLoading]  = useState(false);
  const [output,   setOutput]   = useState("");
  const [done,     setDone]     = useState(false);
  const abortRef   = useRef(null);
  const mountedRef = useRef(true);
  const bottomRef  = useRef(null);

  useEffect(() => { mountedRef.current = true; return () => { mountedRef.current = false; }; }, []);

  // Auto-scroll as output streams in
  useEffect(() => {
    if (output) bottomRef.current?.scrollIntoView({ behavior: "smooth", block: "nearest" });
  }, [output]);

  const calculate = useCallback(async () => {
    const trimmed = input.trim();
    if (!trimmed || loading) return;

    setOutput("");
    setDone(false);
    const ctrl = new AbortController();
    abortRef.current = ctrl;
    setLoading(true);

    try {
      await streamSSE(
        "/ai/deadreckoning",
        { input: trimmed },
        (chunk) => {
          if (!mountedRef.current) return;
          setOutput(prev => prev + chunk);
        },
        ctrl.signal,
      );
      if (mountedRef.current) setDone(true);
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
  }, [input, loading]);

  const reset = useCallback(() => {
    abortRef.current?.abort();
    setInput("");
    setOutput("");
    setDone(false);
    setLoading(false);
  }, []);

  return (
    <div style={{
      height: "100%", display: "flex", flexDirection: "column",
      background: "radial-gradient(ellipse at bottom left, rgba(123,47,255,0.07) 0%, transparent 65%)",
      padding: "20px 24px", gap: 16, color: "#fff", overflowY: "auto",
    }}>
      <style>{`
        @keyframes blink { 0%,100%{opacity:1} 50%{opacity:0} }
        @keyframes fadeSlideUp { from{opacity:0;transform:translateY(6px)} to{opacity:1;transform:translateY(0)} }
        .dr-textarea::-webkit-scrollbar{width:4px}
        .dr-textarea::-webkit-scrollbar-thumb{background:rgba(123,47,255,0.3);border-radius:4px}
        .dr-output::-webkit-scrollbar{width:4px}
        .dr-output::-webkit-scrollbar-thumb{background:rgba(123,47,255,0.2);border-radius:4px}
      `}</style>

      {/* ── Header ───────────────────────────────────────────────────────── */}
      <div style={{ flexShrink: 0 }}>
        <div style={{
          fontFamily: "'JetBrains Mono', monospace", fontSize: 10,
          color: `${ACCENT}99`, letterSpacing: "0.2em", textTransform: "uppercase", marginBottom: 4,
        }}>
          // trajectory analysis · no optimism
        </div>
        <div style={{ display: "flex", alignItems: "baseline", gap: 12 }}>
          <h1 style={{ fontSize: 22, fontWeight: 800, margin: 0, letterSpacing: "-0.02em" }}>
            Dead Reckoning
          </h1>
          <span style={{
            fontSize: 11, fontFamily: "'JetBrains Mono', monospace",
            color: "rgba(255,255,255,0.3)",
          }}>
            where your current behaviour actually leads
          </span>
        </div>
      </div>

      {/* ── Input ────────────────────────────────────────────────────────── */}
      {!output && !loading && (
        <div style={{ flexShrink: 0, animation: "fadeSlideUp 0.25s ease" }}>
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
                background: input.trim()
                  ? `linear-gradient(135deg, ${ACCENT}, #5b21b6)`
                  : `${ACCENT}0a`,
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
                  background: "rgba(255,255,255,0.05)", border: "1px solid rgba(255,255,255,0.12)",
                  color: "rgba(255,255,255,0.4)", fontSize: 11,
                  fontFamily: "'JetBrains Mono', monospace", whiteSpace: "nowrap",
                }}
              >
                New Assessment
              </button>
            )}
            {loading && (
              <button
                onClick={() => { abortRef.current?.abort(); setLoading(false); }}
                style={{
                  padding: "4px 12px", borderRadius: 6, cursor: "pointer",
                  background: `${ACCENT}10`, border: `1px solid ${ACCENT}30`,
                  color: ACCENT, fontSize: 11, fontFamily: "'JetBrains Mono', monospace",
                }}
              >
                Abort
              </button>
            )}
          </div>

          {/* Status bar */}
          {loading && (
            <div style={{
              flexShrink: 0, padding: "7px 14px", borderRadius: 8,
              background: `${ACCENT}08`, border: `1px solid ${ACCENT}20`,
              fontFamily: "'JetBrains Mono', monospace", fontSize: 10,
              color: `${ACCENT}aa`, letterSpacing: "0.12em",
              display: "flex", alignItems: "center", gap: 8,
            }}>
              <div style={{ display: "flex", gap: 4 }}>
                {[0,1,2].map(i => (
                  <div key={i} style={{
                    width: 4, height: 4, borderRadius: "50%", background: ACCENT,
                    animation: `pulse 1.2s ease-in-out ${i * 0.2}s infinite`,
                  }} />
                ))}
              </div>
              <style>{`@keyframes pulse{0%,100%{transform:scale(1);opacity:0.5}50%{transform:scale(1.5);opacity:1}}`}</style>
              COMPUTING TRAJECTORY — analysing behavioural compounding…
            </div>
          )}

          {/* Output */}
          <div className="dr-output" style={{
            flex: 1, minHeight: 0, overflowY: "auto",
            padding: "20px 22px", borderRadius: 14,
            background: "rgba(0,0,0,0.3)",
            border: `1px solid ${ACCENT}15`,
            animation: "fadeSlideUp 0.3s ease",
          }}>
            <RenderOutput text={output} />

            {/* Streaming cursor */}
            {loading && output && (
              <span style={{
                display: "inline-block", width: 2, height: "1em",
                background: ACCENT, marginLeft: 2, verticalAlign: "middle",
                animation: "blink 0.8s step-end infinite",
              }} />
            )}

            {/* Done stamp */}
            {done && (
              <div style={{
                marginTop: 24, paddingTop: 16,
                borderTop: `1px solid ${ACCENT}18`,
                fontFamily: "'JetBrains Mono', monospace", fontSize: 10,
                color: `${ACCENT}55`, letterSpacing: "0.15em",
              }}>
                // TRAJECTORY LOCKED · {new Date().toLocaleTimeString([], { hour: "2-digit", minute: "2-digit" })}
              </div>
            )}

            {/* Loading skeleton when nothing yet */}
            {loading && !output && (
              <div style={{ display: "flex", flexDirection: "column", gap: 8 }}>
                {[90,75,85,60,80].map((w, i) => (
                  <div key={i} style={{
                    height: 14, borderRadius: 4, width: `${w}%`,
                    background: `${ACCENT}12`,
                    animation: `pulse 1.5s ease-in-out ${i * 0.1}s infinite`,
                  }} />
                ))}
              </div>
            )}

            <div ref={bottomRef} />
          </div>
        </div>
      )}

      {/* ── Empty state ───────────────────────────────────────────────────── */}
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
  );
}
