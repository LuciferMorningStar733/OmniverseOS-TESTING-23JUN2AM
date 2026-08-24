import React, { useState, useEffect, useRef } from "react";
import { motion, AnimatePresence } from "framer-motion";
import { useOS } from "../context/OSContext";
import { getApp } from "../lib/apps";

const SPOTLIGHT_APPS = [
  { id: "chat", name: "AIChat Assistant", icon: "fa-wand-magic-sparkles", color: "#00F0FF", category: "AI Tools" },
  { id: "voice", name: "Cortex Voice", icon: "fa-microphone", color: "#39FF14", category: "AI Tools" },
  { id: "notes", name: "Notes & Ideas", icon: "fa-sticky-note", color: "#FCEE09", category: "Productivity" },
  { id: "tasks", name: "Tasks & To-Dos", icon: "fa-list-check", color: "#39FF14", category: "Productivity" },
  { id: "calendar", name: "Calendar & Schedule", icon: "fa-calendar", color: "#00F0FF", category: "Productivity" },
  { id: "finance", name: "Finance & Accounts", icon: "fa-dollar-sign", color: "#F59E0B", category: "Productivity" },
  { id: "music", name: "Music Player", icon: "fa-music", color: "#C778DD", category: "Media" },
  { id: "code", name: "Code Editor", icon: "fa-code", color: "#60A5FA", category: "Developer" },
  { id: "files", name: "File Manager", icon: "fa-folder-open", color: "#94A3B8", category: "System" },
  { id: "settings", name: "System Settings", icon: "fa-gear", color: "#00F0FF", category: "System" },
];

export default function SpotlightSearch({ isOpen, onClose }) {
  const { openApp } = useOS();
  const [query, setQuery] = useState("");
  const [selectedIndex, setSelectedIndex] = useState(0);
  const inputRef = useRef(null);

  // Focus input on open
  useEffect(() => {
    if (isOpen) {
      setTimeout(() => inputRef.current?.focus(), 50);
      setQuery("");
      setSelectedIndex(0);
    }
  }, [isOpen]);

  // Global keydown listener for Cmd+K / Ctrl+K
  useEffect(() => {
    const handleKeyDown = (e) => {
      if ((e.metaKey || e.ctrlKey) && e.key === "k") {
        e.preventDefault();
        if (isOpen) onClose();
      }
    };
    window.addEventListener("keydown", handleKeyDown);
    return () => window.removeEventListener("keydown", handleKeyDown);
  }, [isOpen, onClose]);

  // Filter apps
  const filtered = SPOTLIGHT_APPS.filter(
    (app) => app.name.toLowerCase().includes(query.toLowerCase()) || app.category.toLowerCase().includes(query.toLowerCase())
  );

  const handleKeyDown = (e) => {
    if (e.key === "ArrowDown") {
      e.preventDefault();
      setSelectedIndex((prev) => (prev + 1) % (filtered.length || 1));
    } else if (e.key === "ArrowUp") {
      e.preventDefault();
      setSelectedIndex((prev) => (prev - 1 + filtered.length) % (filtered.length || 1));
    } else if (e.key === "Enter" && filtered[selectedIndex]) {
      e.preventDefault();
      openApp(filtered[selectedIndex].id);
      onClose();
    } else if (e.key === "Escape") {
      onClose();
    }
  };

  if (!isOpen) return null;

  return (
    <AnimatePresence>
      <motion.div
        initial={{ opacity: 0 }}
        animate={{ opacity: 1 }}
        exit={{ opacity: 0 }}
        onClick={onClose}
        style={{
          position: "fixed",
          inset: 0,
          zIndex: 99999,
          background: "rgba(0,0,0,0.5)",
          backdropFilter: "blur(12px)",
          display: "flex",
          alignItems: "flex-start",
          justifyContent: "center",
          paddingTop: "14vh",
        }}
      >
        <motion.div
          initial={{ opacity: 0, scale: 0.94, y: -20 }}
          animate={{ opacity: 1, scale: 1, y: 0 }}
          exit={{ opacity: 0, scale: 0.94, y: -20 }}
          transition={{ type: "spring", stiffness: 400, damping: 30 }}
          onClick={(e) => e.stopPropagation()}
          style={{
            width: "90%",
            maxWidth: 540,
            borderRadius: 20,
            background: "rgba(10, 12, 22, 0.95)",
            border: "1px solid rgba(0, 240, 255, 0.3)",
            boxShadow: "0 24px 80px rgba(0,0,0,0.8), 0 0 30px rgba(0,240,255,0.15)",
            overflow: "hidden",
            color: "#fff",
          }}
        >
          {/* Search Bar Input */}
          <div style={{ display: "flex", alignItems: "center", gap: 12, padding: "16px 20px", borderBottom: "1px solid rgba(255,255,255,0.08)" }}>
            <i className="fa-solid fa-magnifying-glass" style={{ color: "#00F0FF", fontSize: 16 }} />
            <input
              ref={inputRef}
              type="text"
              placeholder="Spotlight Search apps, files, actions… (⌘K)"
              value={query}
              onChange={(e) => {
                setQuery(e.target.value);
                setSelectedIndex(0);
              }}
              onKeyDown={handleKeyDown}
              style={{
                flex: 1,
                background: "transparent",
                border: "none",
                outline: "none",
                color: "#fff",
                fontSize: 15,
                fontFamily: "'Outfit', sans-serif",
              }}
            />
            <span style={{ fontSize: 10, fontFamily: "monospace", color: "rgba(255,255,255,0.3)", padding: "2px 6px", borderRadius: 4, background: "rgba(255,255,255,0.06)" }}>
              ESC to close
            </span>
          </div>

          {/* Results List */}
          <div style={{ maxHeight: 320, overflowY: "auto", padding: "8px 10px" }}>
            {filtered.length === 0 ? (
              <div style={{ padding: "24px 0", textAlign: "center", color: "rgba(255,255,255,0.3)", fontSize: 12, fontFamily: "monospace" }}>
                No matching apps found
              </div>
            ) : (
              filtered.map((app, index) => {
                const active = index === selectedIndex;
                return (
                  <button
                    key={app.id}
                    onClick={() => {
                      openApp(app.id);
                      onClose();
                    }}
                    onMouseEnter={() => setSelectedIndex(index)}
                    style={{
                      width: "100%",
                      padding: "10px 14px",
                      borderRadius: 12,
                      border: active ? `1px solid ${app.color}50` : "1px solid transparent",
                      background: active ? `${app.color}15` : "transparent",
                      cursor: "pointer",
                      display: "flex",
                      alignItems: "center",
                      justifyContent: "space-between",
                      transition: "all 0.12s",
                    }}
                  >
                    <div style={{ display: "flex", alignItems: "center", gap: 12 }}>
                      <div
                        style={{
                          width: 32,
                          height: 32,
                          borderRadius: 9,
                          background: `${app.color}20`,
                          display: "flex",
                          alignItems: "center",
                          justifyContent: "center",
                        }}
                      >
                        <i className={`fa-solid ${app.icon}`} style={{ color: app.color, fontSize: 13 }} />
                      </div>
                      <div style={{ textAlign: "left" }}>
                        <div style={{ fontSize: 13, fontWeight: 600, color: active ? "#fff" : "rgba(255,255,255,0.85)" }}>{app.name}</div>
                        <div style={{ fontSize: 10, fontFamily: "monospace", color: "rgba(255,255,255,0.35)" }}>{app.category}</div>
                      </div>
                    </div>
                    {active && <span style={{ fontSize: 11, fontFamily: "monospace", color: app.color }}>Press ↵ to open</span>}
                  </button>
                );
              })
            )}
          </div>
        </motion.div>
      </motion.div>
    </AnimatePresence>
  );
}
