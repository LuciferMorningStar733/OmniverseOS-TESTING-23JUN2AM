/**
 * FollowupThread — P9 multi-turn conversation panel for Adversary, War Room, Dead Reckoning.
 *
 * Props:
 *   tool        "adversary" | "warroom" | "deadreckoning"
 *   context     string  — original run output sent as context to the backend
 *   accentColor CSS color string
 *   onNewTurn   optional callback(messages) — notified after each exchange
 */
import React, { useState, useRef, useCallback, useEffect } from "react";
import { streamSSE } from "../lib/api";
import { toast } from "sonner";

export default function FollowupThread({ tool, context = "", accentColor = "#00F0FF", onNewTurn }) {
  const [thread,    setThread]    = useState([]); // [{id, role, content}]
  const [input,     setInput]     = useState("");
  const [streaming, setStreaming] = useState(false);
  const abortRef   = useRef(null);
  const mountedRef = useRef(true);
  const bottomRef  = useRef(null);
  const inputRef   = useRef(null);

  useEffect(() => {
    mountedRef.current = true;
    return () => { mountedRef.current = false; };
  }, []);

  useEffect(() => {
    // Reset thread when tool/context changes (new run selected)
    setThread([]);
    setInput("");
  }, [context]);

  useEffect(() => {
    bottomRef.current?.scrollIntoView({ behavior: "smooth", block: "nearest" });
  }, [thread]);

  const send = useCallback(async () => {
    const trimmed = input.trim();
    if (!trimmed || streaming) return;

    const userId = `u-${Date.now()}`;
    const asstId = `a-${Date.now()}`;

    setInput("");
    setStreaming(true);

    // Append user message + empty assistant placeholder
    setThread((prev) => [
      ...prev,
      { id: userId, role: "user", content: trimmed },
      { id: asstId, role: "assistant", content: "", streaming: true },
    ]);

    // Build history from current thread (exclude the new placeholder)
    const historyForReq = thread.map((m) => ({ role: m.role, content: m.content }));

    const ctrl = new AbortController();
    abortRef.current = ctrl;

    let accumulated = "";
    try {
      await streamSSE(
        "/ai/tool/followup",
        { tool, context, history: historyForReq, message: trimmed },
        (chunk) => {
          if (!mountedRef.current) return;
          accumulated += chunk;
          setThread((prev) =>
            prev.map((m) =>
              m.id === asstId ? { ...m, content: accumulated, streaming: true } : m
            )
          );
        },
        ctrl.signal,
      );

      if (mountedRef.current) {
        setThread((prev) =>
          prev.map((m) => m.id === asstId ? { ...m, content: accumulated, streaming: false } : m)
        );
        onNewTurn?.([
          ...historyForReq,
          { role: "user", content: trimmed },
          { role: "assistant", content: accumulated },
        ]);
      }
    } catch (err) {
      if (err?.name === "AbortError") {
        if (mountedRef.current) {
          setThread((prev) =>
            prev.map((m) => m.id === asstId ? { ...m, streaming: false } : m)
          );
        }
        return;
      }
      if (!mountedRef.current) return;
      setThread((prev) => prev.filter((m) => m.id !== asstId));
      toast.error("Follow-up failed — try again.");
    } finally {
      if (mountedRef.current) setStreaming(false);
    }
  }, [input, streaming, thread, tool, context, onNewTurn]);

  const handleKeyDown = useCallback((e) => {
    if (e.key === "Enter" && !e.shiftKey) {
      e.preventDefault();
      send();
    }
  }, [send]);

  const cancel = useCallback(() => {
    abortRef.current?.abort();
  }, []);

  if (!context) return null;

  return (
    <div style={{
      borderTop: `1px solid ${accentColor}18`,
      marginTop: 16,
      paddingTop: 14,
      display: "flex",
      flexDirection: "column",
      gap: 0,
    }}>
      {/* Thread header */}
      <div style={{
        display: "flex", alignItems: "center", gap: 8, marginBottom: 12,
        fontFamily: "'JetBrains Mono', monospace", fontSize: 9.5,
        color: `${accentColor}60`, letterSpacing: "0.16em", textTransform: "uppercase",
      }}>
        <i className="fa-solid fa-comments" style={{ fontSize: 9 }} />
        Continue the conversation
        {thread.length > 0 && (
          <span style={{ color: `${accentColor}40`, marginLeft: 4 }}>
            · {Math.floor(thread.length / 2)} follow-up{thread.length !== 2 ? "s" : ""}
          </span>
        )}
      </div>

      {/* Thread messages */}
      {thread.length > 0 && (
        <div style={{
          display: "flex", flexDirection: "column", gap: 10, marginBottom: 14,
          maxHeight: 380, overflowY: "auto", paddingRight: 4,
        }}>
          {thread.map((msg) => (
            <div
              key={msg.id}
              style={{
                display: "flex",
                flexDirection: msg.role === "user" ? "row-reverse" : "row",
                gap: 8, alignItems: "flex-start",
              }}
            >
              {/* Avatar dot */}
              <div style={{
                flexShrink: 0, marginTop: 4,
                width: 22, height: 22, borderRadius: "50%",
                background: msg.role === "user" ? "rgba(255,255,255,0.1)" : `${accentColor}18`,
                border: `1px solid ${msg.role === "user" ? "rgba(255,255,255,0.12)" : accentColor + "30"}`,
                display: "flex", alignItems: "center", justifyContent: "center",
              }}>
                <i
                  className={`fa-solid ${msg.role === "user" ? "fa-user" : "fa-robot"}`}
                  style={{ fontSize: 9, color: msg.role === "user" ? "rgba(255,255,255,0.5)" : accentColor }}
                />
              </div>

              {/* Bubble */}
              <div style={{
                maxWidth: "82%",
                padding: "9px 13px",
                borderRadius: msg.role === "user" ? "10px 10px 3px 10px" : "10px 10px 10px 3px",
                background: msg.role === "user"
                  ? "rgba(255,255,255,0.06)"
                  : `${accentColor}0b`,
                border: msg.role === "user"
                  ? "1px solid rgba(255,255,255,0.1)"
                  : `1px solid ${accentColor}20`,
                fontFamily: "'Inter', sans-serif",
                fontSize: 13, lineHeight: 1.75,
                color: "rgba(255,255,255,0.88)",
                whiteSpace: "pre-wrap", wordBreak: "break-word",
              }}>
                {msg.content || (
                  <span style={{ color: `${accentColor}55`, fontFamily: "'JetBrains Mono', monospace", fontSize: 10 }}>
                    Thinking…
                  </span>
                )}
                {msg.streaming && msg.content && (
                  <span style={{
                    display: "inline-block", width: 2, height: "0.9em",
                    background: accentColor, marginLeft: 2, verticalAlign: "text-bottom",
                    borderRadius: 1, opacity: 0.8,
                    animation: "blink 0.8s step-end infinite",
                  }} />
                )}
              </div>
            </div>
          ))}
          <div ref={bottomRef} />
        </div>
      )}

      {/* Input row */}
      <div style={{ display: "flex", gap: 8, alignItems: "flex-end" }}>
        <textarea
          ref={inputRef}
          value={input}
          onChange={(e) => setInput(e.target.value)}
          onKeyDown={handleKeyDown}
          placeholder='Ask a follow-up… ("explain point 4", "re-evaluate if I fix X")'
          disabled={streaming}
          rows={2}
          style={{
            flex: 1, background: `${accentColor}07`,
            border: `1px solid ${accentColor}20`, borderRadius: 10,
            color: "rgba(255,255,255,0.9)", fontFamily: "'Inter', sans-serif",
            fontSize: 13, lineHeight: 1.6, padding: "9px 13px",
            resize: "none", outline: "none", boxSizing: "border-box",
            transition: "border-color 0.2s",
            opacity: streaming ? 0.5 : 1,
          }}
          onFocus={(e) => { e.target.style.borderColor = `${accentColor}45`; }}
          onBlur={(e) => { e.target.style.borderColor = `${accentColor}20`; }}
        />
        {streaming ? (
          <button
            onClick={cancel}
            style={{
              flexShrink: 0, padding: "9px 14px", borderRadius: 9, cursor: "pointer",
              background: "rgba(255,0,60,0.1)", border: "1px solid rgba(255,0,60,0.3)",
              color: "#FF7090", fontFamily: "'JetBrains Mono', monospace",
              fontSize: 10, letterSpacing: "0.08em",
            }}
          >
            <i className="fa-solid fa-stop" style={{ fontSize: 9, marginRight: 4 }} />
            stop
          </button>
        ) : (
          <button
            onClick={send}
            disabled={!input.trim()}
            style={{
              flexShrink: 0, padding: "9px 16px", borderRadius: 9,
              cursor: input.trim() ? "pointer" : "not-allowed",
              background: input.trim() ? `${accentColor}18` : "rgba(255,255,255,0.04)",
              border: `1px solid ${input.trim() ? accentColor + "35" : "rgba(255,255,255,0.08)"}`,
              color: input.trim() ? accentColor : "rgba(255,255,255,0.2)",
              fontFamily: "'JetBrains Mono', monospace", fontSize: 10,
              letterSpacing: "0.08em", transition: "all 0.15s",
            }}
          >
            <i className="fa-solid fa-paper-plane" style={{ fontSize: 9 }} />
          </button>
        )}
      </div>

      {/* Hint */}
      {thread.length === 0 && (
        <div style={{
          marginTop: 6, fontFamily: "'JetBrains Mono', monospace", fontSize: 9.5,
          color: "rgba(255,255,255,0.18)", letterSpacing: "0.04em",
        }}>
          Enter to send · Shift+Enter for newline
        </div>
      )}
    </div>
  );
}
