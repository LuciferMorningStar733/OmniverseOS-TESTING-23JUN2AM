import React, { useState, useEffect } from "react";
import { motion, AnimatePresence } from "framer-motion";

export default function AuthCommandPalette({ isOpen, onClose, onSelectCommand }) {
  const [query, setQuery] = useState("");

  const commands = [
    { id: "login", label: "/login", desc: "Switch to identity authentication mode", icon: "fa-right-to-bracket" },
    { id: "signup", label: "/create account", desc: "Initialize a new Omniverse workspace", icon: "fa-user-plus" },
    { id: "forgot", label: "/recover password", desc: "Send account recovery instructions", icon: "fa-key" },
    { id: "guest", label: "/continue as guest", desc: "Instant entry into guest environment", icon: "fa-rocket" },
  ];

  const filtered = commands.filter(
    (c) =>
      c.label.toLowerCase().includes(query.toLowerCase()) ||
      c.desc.toLowerCase().includes(query.toLowerCase())
  );

  useEffect(() => {
    const handleKeyDown = (e) => {
      if (e.key === "Escape" && isOpen) {
        onClose();
      }
    };
    window.addEventListener("keydown", handleKeyDown);
    return () => window.removeEventListener("keydown", handleKeyDown);
  }, [isOpen, onClose]);

  if (!isOpen) return null;

  return (
    <AnimatePresence>
      <div
        style={{
          position: "fixed",
          inset: 0,
          zIndex: 100,
          display: "flex",
          alignItems: "center",
          justifyContent: "center",
          background: "rgba(3, 4, 8, 0.8)",
          backdropFilter: "blur(16px)",
          padding: 16,
        }}
        onClick={onClose}
        data-testid="auth-command-palette-backdrop"
      >
        <motion.div
          initial={{ opacity: 0, scale: 0.95, y: -10 }}
          animate={{ opacity: 1, scale: 1, y: 0 }}
          exit={{ opacity: 0, scale: 0.95, y: -10 }}
          transition={{ duration: 0.18 }}
          onClick={(e) => e.stopPropagation()}
          className="glass-panel"
          style={{
            width: "100%",
            maxWidth: 480,
            padding: 18,
            borderColor: "rgba(0, 240, 255, 0.3)",
            boxShadow: "0 0 40px rgba(0, 240, 255, 0.2)",
          }}
          data-testid="auth-command-palette"
        >
          <div style={{ display: "flex", alignItems: "center", gap: 10, paddingBottom: 12, borderBottom: "1px solid rgba(255,255,255,0.08)" }}>
            <i className="fa-solid fa-terminal" style={{ color: "#00F0FF", fontSize: 14 }} />
            <input
              autoFocus
              type="text"
              placeholder="Type a command (/login, /guest, /create account)..."
              value={query}
              onChange={(e) => setQuery(e.target.value)}
              style={{
                flex: 1,
                background: "transparent",
                border: "none",
                color: "#fff",
                fontSize: 14,
                fontFamily: "'JetBrains Mono', monospace",
                outline: "none",
              }}
              data-testid="auth-command-input"
            />
            <span style={{ fontSize: 10, fontFamily: "monospace", color: "rgba(255,255,255,0.4)" }}>ESC</span>
          </div>

          <div style={{ marginTop: 12, display: "flex", flexDirection: "column", gap: 6, maxHeight: 240, overflowY: "auto" }}>
            {filtered.map((cmd) => (
              <div
                key={cmd.id}
                onClick={() => {
                  onSelectCommand(cmd.id);
                  onClose();
                }}
                className="glass-card"
                style={{
                  padding: "10px 14px",
                  display: "flex",
                  alignItems: "center",
                  justifyContent: "space-between",
                  cursor: "pointer",
                  transition: "all 0.15s ease",
                }}
                data-testid={`auth-command-item-${cmd.id}`}
              >
                <div style={{ display: "flex", alignItems: "center", gap: 10 }}>
                  <i className={`fa-solid ${cmd.icon}`} style={{ color: "#00F0FF", fontSize: 13 }} />
                  <div>
                    <div style={{ fontSize: 13, fontWeight: 700, color: "#fff", fontFamily: "'JetBrains Mono', monospace" }}>
                      {cmd.label}
                    </div>
                    <div style={{ fontSize: 11, color: "rgba(255,255,255,0.5)" }}>{cmd.desc}</div>
                  </div>
                </div>
                <i className="fa-solid fa-chevron-right text-xs text-slate-500" />
              </div>
            ))}

            {filtered.length === 0 && (
              <div style={{ padding: 16, textAlign: "center", fontSize: 12, color: "rgba(255,255,255,0.4)", fontFamily: "monospace" }}>
                No matching command found
              </div>
            )}
          </div>
        </motion.div>
      </div>
    </AnimatePresence>
  );
}
