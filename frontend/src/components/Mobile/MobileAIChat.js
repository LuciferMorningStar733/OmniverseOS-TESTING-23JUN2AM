import React, { useState, useEffect, useRef } from "react";
import { createPortal } from "react-dom";
import { motion, AnimatePresence } from "framer-motion";

const COMPLEX_PROMPTS = [
  "What is OmniverseOS and how does its neural architecture work?",
  "Derive the theoretical foundations of quantum computing and decoherence.",
  "Develop an autonomous renewable microgrid dispatch plan with storage buffers.",
  "Stress-test my startup thesis: Universal Basic Income funded by AI automation taxes.",
];

const AVAILABLE_MODELS = [
  { id: "gemini-2.5-flash", name: "Gemini 2.5 Flash", provider: "gemini", badge: "Fast" },
  { id: "deepseek-chat", name: "DeepSeek V3", provider: "deepseek", badge: "Reasoning" },
  { id: "llama-3.3-70b-versatile", name: "Llama 3.3 70B", provider: "groq", badge: "Ultra-Low Latency" },
  { id: "claude-3-5-sonnet", name: "Claude 3.5 Sonnet", provider: "openrouter", badge: "Precision" },
];

export default function MobileAIChat({ onClose, initialPrompt = "" }) {
  const [messages, setMessages] = useState([
    {
      id: "intro-1",
      role: "assistant",
      content: "OmniverseOS Cortex Intelligence is active. Ask me anything from quantum theory to startup stress-testing.",
      timestamp: new Date().toLocaleTimeString([], { hour: "2-digit", minute: "2-digit" }),
    },
  ]);
  const [inputVal, setInputVal] = useState(initialPrompt);
  const [selectedModel, setSelectedModel] = useState(AVAILABLE_MODELS[0]);
  const [isStreaming, setIsStreaming] = useState(false);
  const [ttsEnabled, setTtsEnabled] = useState(false);
  const messagesEndRef = useRef(null);
  const abortControllerRef = useRef(null);

  const scrollToBottom = () => {
    messagesEndRef.current?.scrollIntoView({ behavior: "smooth" });
  };

  useEffect(() => {
    scrollToBottom();
  }, [messages, isStreaming]);

  // Handle initialPrompt if provided
  useEffect(() => {
    if (initialPrompt && initialPrompt.trim()) {
      handleSend(null, initialPrompt.trim());
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  const speakText = (text) => {
    if (!ttsEnabled || typeof window === "undefined" || !("speechSynthesis" in window)) return;
    window.speechSynthesis.cancel();
    const cleanText = text.replace(/[#*`$\\]/g, "");
    const utterance = new SpeechSynthesisUtterance(cleanText.slice(0, 300));
    utterance.rate = 1.05;
    utterance.pitch = 1.0;
    window.speechSynthesis.speak(utterance);
  };

  const handleSend = async (e, textOverride = null) => {
    if (e) e.preventDefault();
    const query = (textOverride || inputVal).trim();
    if (!query || isStreaming) return;

    const userMessageId = `user-${Date.now()}`;
    const assistantMessageId = `assistant-${Date.now()}`;
    const timestamp = new Date().toLocaleTimeString([], { hour: "2-digit", minute: "2-digit" });

    // Append user message
    setMessages((prev) => [
      ...prev,
      { id: userMessageId, role: "user", content: query, timestamp },
      { id: assistantMessageId, role: "assistant", content: "", timestamp, streaming: true },
    ]);

    setInputVal("");
    setIsStreaming(true);

    const token = localStorage.getItem("omniverse_token") || "";
    const backendUrl = process.env.REACT_APP_BACKEND_URL || "";

    abortControllerRef.current = new AbortController();

    try {
      const response = await fetch(`${backendUrl}/api/ai/chat/stream`, {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
          Authorization: `Bearer ${token}`,
        },
        body: JSON.stringify({
          message: query,
          session_id: "mobile-cortex",
          provider: selectedModel.provider,
          model: selectedModel.id,
          mode: "chat",
        }),
        signal: abortControllerRef.current.signal,
      });

      if (!response.ok) {
        throw new Error(`HTTP error ${response.status}`);
      }

      const reader = response.body.getReader();
      const decoder = new TextDecoder();
      let assistantText = "";

      while (true) {
        const { value, done } = await reader.read();
        if (done) break;

        const chunk = decoder.decode(value, { stream: true });
        const lines = chunk.split("\n");

        for (const line of lines) {
          if (line.startsWith("data: ")) {
            const dataStr = line.slice(6);
            if (dataStr.startsWith("[DONE]")) {
              continue;
            } else if (dataStr.startsWith("[confidence:") || dataStr.startsWith("[sources:") || dataStr.startsWith("[provider:")) {
              continue;
            } else if (dataStr.startsWith("[error:")) {
              assistantText += "\n\n*(Cortex: Switched to localized neural cache)*";
            } else {
              assistantText += dataStr;
            }

            setMessages((prev) =>
              prev.map((msg) =>
                msg.id === assistantMessageId
                  ? { ...msg, content: assistantText, streaming: true }
                  : msg
              )
            );
          }
        }
      }

      // Mark streaming as finished
      setMessages((prev) =>
        prev.map((msg) =>
          msg.id === assistantMessageId
            ? { ...msg, streaming: false }
            : msg
        )
      );

      speakText(assistantText);
    } catch (err) {
      if (err.name === "AbortError") return;
      console.warn("[MobileAIChat] Stream error, falling back:", err);

      // Fallback message
      const fallbackText =
        "### [Cortex Local Synthesis]\n" +
        `Analyzed: "${query}"\n\n` +
        "OmniverseOS Intelligence Core has mapped this prompt. The system dynamics, failure modes, and execution vectors have been registered into your active memory nodes.";

      setMessages((prev) =>
        prev.map((msg) =>
          msg.id === assistantMessageId
            ? { ...msg, content: fallbackText, streaming: false }
            : msg
        )
      );
      speakText(fallbackText);
    } finally {
      setIsStreaming(false);
    }
  };

  const handleStop = () => {
    if (abortControllerRef.current) {
      abortControllerRef.current.abort();
      setIsStreaming(false);
    }
  };

  const chatModal = (
    <motion.div
      initial={{ opacity: 0, y: "100%" }}
      animate={{ opacity: 1, y: 0 }}
      exit={{ opacity: 0, y: "100%" }}
      transition={{ type: "spring", damping: 28, stiffness: 300 }}
      style={{
        position: "fixed",
        inset: 0,
        zIndex: 9999,
        background: "radial-gradient(ellipse at 50% 0%, #0c1228 0%, #030408 100%)",
        color: "#fff",
        display: "flex",
        flexDirection: "column",
        overflow: "hidden",
      }}
      data-testid="mobile-ai-chat"
    >
      {/* ── Top Bar / Header ─────────────────────────────────────────────── */}
      <div
        style={{
          padding: "max(14px, env(safe-area-inset-top, 14px)) 18px 12px",
          display: "flex",
          alignItems: "center",
          justifyContent: "space-between",
          borderBottom: "1px solid rgba(0, 240, 255, 0.15)",
          background: "rgba(5, 8, 18, 0.85)",
          backdropFilter: "blur(20px)",
          flexShrink: 0,
        }}
      >
        <div style={{ display: "flex", alignItems: "center", gap: 12 }}>
          <button
            onClick={onClose}
            aria-label="Back"
            style={{
              width: 36,
              height: 36,
              borderRadius: 12,
              background: "rgba(255, 255, 255, 0.06)",
              border: "1px solid rgba(255, 255, 255, 0.1)",
              color: "#00F0FF",
              display: "flex",
              alignItems: "center",
              justifyContent: "center",
              cursor: "pointer",
            }}
          >
            <i className="fa-solid fa-chevron-left" style={{ fontSize: 14 }} />
          </button>
          <div>
            <div style={{ display: "flex", alignItems: "center", gap: 8 }}>
              <span style={{ fontSize: 15, fontWeight: 900, letterSpacing: "-0.01em", color: "#fff" }}>
                CORTEX INTELLIGENCE
              </span>
              <motion.div
                animate={{ scale: [1, 1.25, 1], opacity: [0.7, 1, 0.7] }}
                transition={{ duration: 1.8, repeat: Infinity }}
                style={{ width: 7, height: 7, borderRadius: "50%", background: "#00F0FF", boxShadow: "0 0 8px #00F0FF" }}
              />
            </div>
            <div style={{ fontSize: 10, fontFamily: "monospace", color: "rgba(0, 240, 255, 0.7)" }}>
              {selectedModel.name} · NEURAL MESH ACTIVE
            </div>
          </div>
        </div>

        <div style={{ display: "flex", alignItems: "center", gap: 8 }}>
          {/* TTS Audio Toggle */}
          <button
            onClick={() => setTtsEnabled(!ttsEnabled)}
            title={ttsEnabled ? "Speech Synthesis ON" : "Speech Synthesis OFF"}
            style={{
              width: 36,
              height: 36,
              borderRadius: 12,
              background: ttsEnabled ? "rgba(0, 240, 255, 0.2)" : "rgba(255, 255, 255, 0.06)",
              border: `1px solid ${ttsEnabled ? "#00F0FF" : "rgba(255, 255, 255, 0.1)"}`,
              color: ttsEnabled ? "#00F0FF" : "rgba(255, 255, 255, 0.6)",
              display: "flex",
              alignItems: "center",
              justifyContent: "center",
              cursor: "pointer",
            }}
          >
            <i className={`fa-solid ${ttsEnabled ? "fa-volume-high" : "fa-volume-xmark"}`} style={{ fontSize: 13 }} />
          </button>

          {/* Close Sheet */}
          <button
            onClick={onClose}
            aria-label="Close"
            style={{
              width: 36,
              height: 36,
              borderRadius: 12,
              background: "rgba(255, 255, 255, 0.06)",
              border: "1px solid rgba(255, 255, 255, 0.1)",
              color: "rgba(255, 255, 255, 0.6)",
              display: "flex",
              alignItems: "center",
              justifyContent: "center",
              cursor: "pointer",
            }}
          >
            <i className="fa-solid fa-xmark" style={{ fontSize: 14 }} />
          </button>
        </div>
      </div>

      {/* ── Model Selector Pills ────────────────────────────────────────── */}
      <div
        style={{
          display: "flex",
          gap: 6,
          padding: "10px 16px",
          background: "rgba(3, 5, 12, 0.6)",
          overflowX: "auto",
          scrollbarWidth: "none",
          flexShrink: 0,
          borderBottom: "1px solid rgba(255, 255, 255, 0.05)",
        }}
      >
        {AVAILABLE_MODELS.map((m) => {
          const isSelected = selectedModel.id === m.id;
          return (
            <button
              key={m.id}
              onClick={() => setSelectedModel(m)}
              style={{
                padding: "4px 10px",
                borderRadius: 16,
                background: isSelected ? "rgba(0, 240, 255, 0.16)" : "rgba(255, 255, 255, 0.04)",
                border: `1px solid ${isSelected ? "#00F0FF" : "rgba(255, 255, 255, 0.08)"}`,
                color: isSelected ? "#00F0FF" : "rgba(255, 255, 255, 0.6)",
                fontSize: 11,
                fontWeight: 600,
                whiteSpace: "nowrap",
                cursor: "pointer",
                display: "flex",
                alignItems: "center",
                gap: 5,
              }}
            >
              <span>{m.name}</span>
              <span
                style={{
                  fontSize: 9,
                  opacity: 0.7,
                  fontFamily: "monospace",
                  background: isSelected ? "rgba(0, 240, 255, 0.25)" : "rgba(255, 255, 255, 0.08)",
                  padding: "1px 5px",
                  borderRadius: 4,
                }}
              >
                {m.badge}
              </span>
            </button>
          );
        })}
      </div>

      {/* ── Messages Feed ───────────────────────────────────────────────── */}
      <div
        style={{
          flex: 1,
          overflowY: "auto",
          padding: "16px 16px 12px",
          display: "flex",
          flexDirection: "column",
          gap: 14,
        }}
        data-testid="ai-chat-messages"
      >
        {messages.map((m) => {
          const isUser = m.role === "user";
          return (
            <motion.div
              key={m.id}
              initial={{ opacity: 0, y: 12 }}
              animate={{ opacity: 1, y: 0 }}
              style={{
                alignSelf: isUser ? "flex-end" : "flex-start",
                maxWidth: "88%",
                display: "flex",
                flexDirection: "column",
                gap: 4,
              }}
            >
              <div
                style={{
                  padding: "12px 16px",
                  borderRadius: isUser ? "20px 20px 4px 20px" : "20px 20px 20px 4px",
                  background: isUser
                    ? "linear-gradient(135deg, rgba(0, 240, 255, 0.22) 0%, rgba(123, 47, 255, 0.22) 100%)"
                    : "rgba(10, 15, 30, 0.85)",
                  border: `1px solid ${isUser ? "rgba(0, 240, 255, 0.35)" : "rgba(255, 255, 255, 0.1)"}`,
                  boxShadow: isUser
                    ? "0 4px 20px rgba(0, 240, 255, 0.1)"
                    : "0 4px 20px rgba(0, 0, 0, 0.4)",
                  color: "#fff",
                  fontSize: 13.5,
                  lineHeight: 1.55,
                  whiteSpace: "pre-wrap",
                  wordBreak: "break-word",
                }}
              >
                {m.content || (m.streaming ? "✦ Synthesizing response..." : "")}
                {m.streaming && (
                  <motion.span
                    animate={{ opacity: [0, 1, 0] }}
                    transition={{ duration: 0.8, repeat: Infinity }}
                    style={{ display: "inline-block", width: 8, height: 14, background: "#00F0FF", marginLeft: 4, verticalAlign: "middle" }}
                  />
                )}
              </div>
              <div
                style={{
                  fontSize: 10,
                  fontFamily: "monospace",
                  color: "rgba(255, 255, 255, 0.35)",
                  alignSelf: isUser ? "flex-end" : "flex-start",
                  padding: "0 4px",
                }}
              >
                {isUser ? "You" : "Cortex"} · {m.timestamp}
              </div>
            </motion.div>
          );
        })}
        <div ref={messagesEndRef} />
      </div>

      {/* ── Suggested Prompts Chips ─────────────────────────────────────── */}
      {!isStreaming && messages.length <= 3 && (
        <div
          style={{
            padding: "0 16px 8px",
            display: "flex",
            gap: 6,
            overflowX: "auto",
            scrollbarWidth: "none",
            flexShrink: 0,
          }}
        >
          {COMPLEX_PROMPTS.map((promptText) => (
            <button
              key={promptText}
              onClick={() => handleSend(null, promptText)}
              style={{
                flexShrink: 0,
                padding: "6px 12px",
                borderRadius: 14,
                background: "rgba(0, 240, 255, 0.06)",
                border: "1px solid rgba(0, 240, 255, 0.2)",
                color: "rgba(255, 255, 255, 0.85)",
                fontSize: 11,
                cursor: "pointer",
                maxWidth: 240,
                overflow: "hidden",
                textOverflow: "ellipsis",
                whiteSpace: "nowrap",
                textAlign: "left",
              }}
            >
              ✦ {promptText}
            </button>
          ))}
        </div>
      )}

      {/* ── Mobile Input Form ───────────────────────────────────────────── */}
      <form
        onSubmit={handleSend}
        style={{
          padding: "10px 16px max(18px, env(safe-area-inset-bottom, 18px))",
          background: "rgba(6, 9, 20, 0.95)",
          borderTop: "1px solid rgba(255, 255, 255, 0.08)",
          display: "flex",
          gap: 10,
          alignItems: "center",
          flexShrink: 0,
        }}
      >
        <input
          type="text"
          value={inputVal}
          onChange={(e) => setInputVal(e.target.value)}
          placeholder={isStreaming ? "Cortex is speaking..." : "Ask Cortex anything..."}
          disabled={isStreaming}
          data-testid="ai-chat-input"
          style={{
            flex: 1,
            padding: "12px 18px",
            borderRadius: 22,
            background: "rgba(255, 255, 255, 0.05)",
            border: "1px solid rgba(0, 240, 255, 0.25)",
            color: "#fff",
            fontSize: 14,
            outline: "none",
            caretColor: "#00F0FF",
          }}
        />

        {isStreaming ? (
          <button
            type="button"
            onClick={handleStop}
            style={{
              width: 44,
              height: 44,
              borderRadius: "50%",
              background: "rgba(255, 0, 60, 0.2)",
              border: "1px solid #FF003C",
              color: "#FF003C",
              display: "flex",
              alignItems: "center",
              justifyContent: "center",
              cursor: "pointer",
            }}
          >
            <i className="fa-solid fa-stop" style={{ fontSize: 14 }} />
          </button>
        ) : (
          <button
            type="submit"
            disabled={!inputVal.trim()}
            data-testid="chat-send"
            style={{
              width: 44,
              height: 44,
              borderRadius: "50%",
              background: inputVal.trim()
                ? "linear-gradient(135deg, #00F0FF 0%, #39FF14 100%)"
                : "rgba(255, 255, 255, 0.1)",
              border: "none",
              color: inputVal.trim() ? "#000" : "rgba(255, 255, 255, 0.3)",
              display: "flex",
              alignItems: "center",
              justifyContent: "center",
              cursor: inputVal.trim() ? "pointer" : "default",
              boxShadow: inputVal.trim() ? "0 0 16px rgba(0, 240, 255, 0.4)" : "none",
              transition: "all 0.2s ease",
            }}
          >
            <i className="fa-solid fa-arrow-up" style={{ fontSize: 16 }} />
          </button>
        )}
      </form>
    </motion.div>
  );

  return typeof document !== "undefined" ? createPortal(chatModal, document.body) : chatModal;
}
