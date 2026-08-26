import React, { useState } from "react";
import { motion, AnimatePresence } from "framer-motion";

export default function MobileAIChat({ onClose }) {
  const [messages, setMessages] = useState([
    { id: 1, sender: "cortex", text: "I'm listening. How can I assist your situation?" },
  ]);
  const [inputVal, setInputVal] = useState("");

  const handleSend = (e) => {
    e.preventDefault();
    if (!inputVal.trim()) return;
    const userMsg = { id: Date.now(), sender: "user", text: inputVal };
    setMessages((prev) => [...prev, userMsg]);
    const current = inputVal;
    setInputVal("");

    setTimeout(() => {
      const cortexMsg = {
        id: Date.now() + 1,
        sender: "cortex",
        text: `Analyzed "${current}". I have connected your Cortex memory and updated your active workspace trajectory.`,
      };
      setMessages((prev) => [...prev, cortexMsg]);
    }, 600);
  };

  return (
    <div
      style={{
        position: "fixed",
        inset: 0,
        zIndex: 200,
        background: "#030408",
        display: "flex",
        flexDirection: "column",
        justifyContent: "space-between",
        padding: 16,
      }}
      data-testid="mobile-ai-chat"
    >
      {/* Mobile Chat Header */}
      <div style={{ display: "flex", alignItems: "center", justifyContent: "space-between", paddingBottom: 12, borderBottom: "1px solid rgba(255,255,255,0.08)" }}>
        <div style={{ display: "flex", alignItems: "center", gap: 10 }}>
          <button onClick={onClose} style={{ background: "none", border: "none", color: "#00F0FF", fontSize: 16, cursor: "pointer" }}>
            <i className="fa-solid fa-chevron-left" />
          </button>
          <div>
            <div style={{ fontSize: 15, fontWeight: 900, color: "#fff" }}>CORTEX INTELLIGENCE</div>
            <div style={{ fontSize: 10, fontFamily: "monospace", color: "#00F0FF" }}>VOICE & CONTEXT LINKED</div>
          </div>
        </div>

        <div style={{ width: 8, height: 8, borderRadius: "50%", background: "#00F0FF", boxShadow: "0 0 10px #00F0FF" }} />
      </div>

      {/* Messages Feed */}
      <div style={{ flex: 1, overflowY: "auto", padding: "16px 0", display: "flex", flexDirection: "column", gap: 12 }}>
        <AnimatePresence>
          {messages.map((m) => (
            <motion.div
              key={m.id}
              initial={{ opacity: 0, y: 10 }}
              animate={{ opacity: 1, y: 0 }}
              style={{
                alignSelf: m.sender === "user" ? "flex-end" : "flex-start",
                maxWidth: "85%",
                padding: 14,
                borderRadius: 18,
                background: m.sender === "user" ? "linear-gradient(135deg, #00F0FF25, #7B2FFF25)" : "rgba(255,255,255,0.05)",
                border: `1px solid ${m.sender === "user" ? "#00F0FF50" : "rgba(255,255,255,0.1)"}`,
                color: "#fff",
                fontSize: 13,
                lineHeight: 1.5,
              }}
            >
              {m.text}
            </motion.div>
          ))}
        </AnimatePresence>
      </div>

      {/* Mobile Input Bar */}
      <form onSubmit={handleSend} style={{ display: "flex", gap: 8, paddingTop: 12, borderTop: "1px solid rgba(255,255,255,0.08)" }}>
        <input
          type="text"
          placeholder="Talk directly to Cortex..."
          value={inputVal}
          onChange={(e) => setInputVal(e.target.value)}
          style={{
            flex: 1,
            padding: "12px 16px",
            borderRadius: 20,
            background: "rgba(255,255,255,0.05)",
            border: "1px solid rgba(255,255,255,0.15)",
            color: "#fff",
            fontSize: 13,
            outline: "none",
          }}
        />
        <button
          type="submit"
          style={{
            padding: "12px 18px",
            borderRadius: 20,
            background: "linear-gradient(135deg, #00F0FF, #39FF14)",
            color: "#000",
            fontWeight: 900,
            border: "none",
            cursor: "pointer",
          }}
        >
          <i className="fa-solid fa-arrow-up" />
        </button>
      </form>
    </div>
  );
}
