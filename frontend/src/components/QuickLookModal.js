import React, { useState, useEffect } from "react";
import { motion, AnimatePresence } from "framer-motion";
import { useOS } from "../context/OSContext";

export default function QuickLookModal() {
  const { openApp } = useOS();
  const [activeItem, setActiveItem] = useState(null);

  useEffect(() => {
    const handleKeyDown = (e) => {
      // Don't trigger if user is typing in an input or textarea
      const tag = document.activeElement?.tagName?.toLowerCase();
      if (tag === "input" || tag === "textarea" || document.activeElement?.isContentEditable) {
        return;
      }

      if (e.code === "Space") {
        e.preventDefault();
        if (activeItem) {
          setActiveItem(null);
        } else {
          // Quick Look sample file/note preview
          setActiveItem({
            name: "Project_DNA_Architecture.md",
            type: "Markdown Document",
            size: "14.2 KB",
            updated: "Just now",
            content: "# Project DNA Architecture\n\n- Sentient AI Core: Cortex 2.5\n- Acoustic Engine: Web Audio API\n- UI Material: Cyberpunk Dark Glass\n- Speed: < 5ms local execution",
          });
        }
      } else if (e.code === "Escape" && activeItem) {
        setActiveItem(null);
      }
    };

    window.addEventListener("keydown", handleKeyDown);
    return () => window.removeEventListener("keydown", handleKeyDown);
  }, [activeItem]);

  if (!activeItem) return null;

  return (
    <AnimatePresence>
      <motion.div
        initial={{ opacity: 0 }}
        animate={{ opacity: 1 }}
        exit={{ opacity: 0 }}
        onClick={() => setActiveItem(null)}
        style={{
          position: "fixed",
          inset: 0,
          zIndex: 999999,
          background: "rgba(0,0,0,0.55)",
          backdropFilter: "blur(16px)",
          display: "flex",
          alignItems: "center",
          justifyContent: "center",
        }}
      >
        <motion.div
          initial={{ opacity: 0, scale: 0.9, y: 10 }}
          animate={{ opacity: 1, scale: 1, y: 0 }}
          exit={{ opacity: 0, scale: 0.9, y: 10 }}
          transition={{ type: "spring", stiffness: 420, damping: 28 }}
          onClick={(e) => e.stopPropagation()}
          style={{
            width: "90%",
            maxWidth: 520,
            borderRadius: 22,
            padding: 22,
            background: "rgba(10, 12, 22, 0.95)",
            border: "1px solid rgba(0, 240, 255, 0.35)",
            boxShadow: "0 30px 90px rgba(0,0,0,0.8), 0 0 30px rgba(0,240,255,0.2)",
            color: "#fff",
            display: "flex",
            flexDirection: "column",
            gap: 16,
          }}
        >
          {/* Header */}
          <div style={{ display: "flex", alignItems: "center", justifyContent: "space-between", borderBottom: "1px solid rgba(255,255,255,0.08)", paddingBottom: 12 }}>
            <div style={{ display: "flex", alignItems: "center", gap: 10 }}>
              <i className="fa-solid fa-file-lines" style={{ color: "#00F0FF", fontSize: 16 }} />
              <div>
                <div style={{ fontSize: 14, fontWeight: 700, fontFamily: "'Outfit', sans-serif" }}>{activeItem.name}</div>
                <div style={{ fontSize: 10, fontFamily: "monospace", color: "rgba(255,255,255,0.4)" }}>{activeItem.type} · {activeItem.size}</div>
              </div>
            </div>
            <span style={{ fontSize: 9, fontFamily: "monospace", color: "#00F0FF", padding: "2px 8px", borderRadius: 4, background: "rgba(0,240,255,0.1)", border: "1px solid rgba(0,240,255,0.25)" }}>
              QUICK LOOK (SPACEBAR)
            </span>
          </div>

          {/* Preview Box */}
          <div
            style={{
              padding: 16,
              borderRadius: 14,
              background: "rgba(255,255,255,0.03)",
              border: "1px solid rgba(255,255,255,0.06)",
              fontFamily: "'JetBrains Mono', monospace",
              fontSize: 12,
              color: "rgba(255,255,255,0.85)",
              lineHeight: 1.6,
              whiteSpace: "pre-wrap",
              maxHeight: 240,
              overflowY: "auto",
            }}
          >
            {activeItem.content}
          </div>

          {/* Footer controls */}
          <div style={{ display: "flex", alignItems: "center", justifyContent: "space-between", paddingTop: 4 }}>
            <span style={{ fontSize: 10, fontFamily: "monospace", color: "rgba(255,255,255,0.3)" }}>Press Spacebar or ESC to dismiss</span>
            <button
              onClick={() => {
                openApp("files");
                setActiveItem(null);
              }}
              style={{
                padding: "6px 14px",
                borderRadius: 8,
                fontSize: 11,
                fontFamily: "monospace",
                background: "rgba(0,240,255,0.12)",
                border: "1px solid rgba(0,240,255,0.35)",
                color: "#00F0FF",
                cursor: "pointer",
              }}
            >
              Open in Files
            </button>
          </div>
        </motion.div>
      </motion.div>
    </AnimatePresence>
  );
}
