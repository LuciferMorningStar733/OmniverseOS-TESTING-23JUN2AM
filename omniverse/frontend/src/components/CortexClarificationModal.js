/**
 * CortexClarificationModal.js
 * OmniverseOS — Cortex Ambiguity Resolution Dialog
 *
 * Shown when Cortex detects ambiguous intent and needs user clarification
 * before sending the request to the LLM.
 *
 * Features:
 *  - Keyboard navigation (↑/↓ to move, Enter to confirm, Esc to close)
 *  - Animated appearance / disappearance via framer-motion
 *  - Matches OmniverseOS cyberpunk visual style
 *  - No browser alert() dialogs
 */

import React, { useEffect, useRef, useState, useCallback } from "react";
import { AnimatePresence, motion } from "framer-motion";

const ICON_MAP = {
  motorcycle:  "fa-motorcycle",
  camera:      "fa-camera",
  code:        "fa-code",
  globe:       "fa-globe",
  music:       "fa-music",
  gamepad:     "fa-gamepad",
  "note-sticky": "fa-note-sticky",
  apple:       "fa-apple",
  google:      "fa-google",
  default:     "fa-circle-question",
};

function getIcon(iconName) {
  if (!iconName) return ICON_MAP.default;
  return ICON_MAP[iconName] || `fa-${iconName}`;
}

/**
 * @param {object}   props
 * @param {boolean}  props.open       - Whether the modal is visible
 * @param {string}   props.question   - The clarifying question text
 * @param {Array}    props.options     - [{ id, label, icon }]
 * @param {function} props.onSelect   - Called with the selected option object
 * @param {function} props.onClose    - Called when dismissed (Esc / backdrop click)
 */
export default function CortexClarificationModal({ open, question, options = [], onSelect, onClose }) {
  const [focusedIndex, setFocusedIndex] = useState(0);
  const containerRef = useRef(null);

  // Reset focused index whenever modal opens
  useEffect(() => {
    if (open) setFocusedIndex(0);
  }, [open]);

  // Keyboard navigation
  const handleKeyDown = useCallback(
    (e) => {
      if (!open) return;
      switch (e.key) {
        case "ArrowDown":
        case "Tab":
          e.preventDefault();
          setFocusedIndex((i) => (i + 1) % options.length);
          break;
        case "ArrowUp":
          e.preventDefault();
          setFocusedIndex((i) => (i - 1 + options.length) % options.length);
          break;
        case "Enter":
          e.preventDefault();
          if (options[focusedIndex]) onSelect(options[focusedIndex]);
          break;
        case "Escape":
          e.preventDefault();
          onClose();
          break;
        default:
          break;
      }
    },
    [open, options, focusedIndex, onSelect, onClose],
  );

  useEffect(() => {
    window.addEventListener("keydown", handleKeyDown);
    return () => window.removeEventListener("keydown", handleKeyDown);
  }, [handleKeyDown]);

  return (
    <AnimatePresence>
      {open && (
        <>
          {/* Backdrop */}
          <motion.div
            key="clarification-backdrop"
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            exit={{ opacity: 0 }}
            transition={{ duration: 0.18 }}
            onClick={onClose}
            style={{
              position: "fixed",
              inset: 0,
              background: "rgba(0,0,0,0.55)",
              backdropFilter: "blur(6px)",
              WebkitBackdropFilter: "blur(6px)",
              zIndex: 9000,
            }}
          />

          {/* Modal panel */}
          <motion.div
            key="clarification-panel"
            ref={containerRef}
            role="dialog"
            aria-modal="true"
            aria-label="Cortex needs clarification"
            initial={{ opacity: 0, scale: 0.94, y: -16 }}
            animate={{ opacity: 1, scale: 1,    y: 0    }}
            exit={{   opacity: 0, scale: 0.94, y: -16   }}
            transition={{ type: "spring", stiffness: 340, damping: 28 }}
            style={{
              position: "fixed",
              top: "50%",
              left: "50%",
              transform: "translate(-50%, -50%)",
              width: "min(440px, calc(100vw - 32px))",
              background: "rgba(8,10,18,0.97)",
              border: "1px solid rgba(0,240,255,0.22)",
              borderRadius: 18,
              boxShadow:
                "0 0 0 1px rgba(0,240,255,0.06), 0 32px 80px rgba(0,0,0,0.85), 0 0 40px rgba(0,240,255,0.08)",
              zIndex: 9001,
              overflow: "hidden",
            }}
          >
            {/* Scanline accent bar */}
            <div
              style={{
                height: 2,
                background: "linear-gradient(90deg, transparent, #00F0FF 30%, #CF9EFF 70%, transparent)",
                opacity: 0.6,
              }}
            />

            {/* Header */}
            <div style={{ padding: "20px 24px 0" }}>
              <div
                style={{
                  display: "flex",
                  alignItems: "center",
                  gap: 10,
                  marginBottom: 6,
                }}
              >
                <div
                  style={{
                    width: 32,
                    height: 32,
                    borderRadius: 10,
                    background: "rgba(0,240,255,0.10)",
                    border: "1px solid rgba(0,240,255,0.22)",
                    display: "flex",
                    alignItems: "center",
                    justifyContent: "center",
                    flexShrink: 0,
                  }}
                >
                  <i
                    className="fa-solid fa-wand-magic-sparkles"
                    style={{ fontSize: 13, color: "#00F0FF" }}
                  />
                </div>
                <div>
                  <div
                    style={{
                      fontSize: 9,
                      fontFamily: "'JetBrains Mono', monospace",
                      color: "rgba(0,240,255,0.55)",
                      letterSpacing: "0.18em",
                      textTransform: "uppercase",
                      marginBottom: 1,
                    }}
                  >
                    // Cortex needs clarification
                  </div>
                  <div
                    style={{
                      fontSize: 14,
                      fontWeight: 700,
                      color: "#E2E8F0",
                      fontFamily: "'JetBrains Mono', monospace",
                      letterSpacing: "0.01em",
                    }}
                  >
                    I found multiple possible matches.
                  </div>
                </div>
              </div>

              {question && (
                <p
                  style={{
                    fontSize: 12,
                    color: "rgba(255,255,255,0.45)",
                    fontFamily: "'JetBrains Mono', monospace",
                    margin: "10px 0 0",
                    lineHeight: 1.6,
                  }}
                >
                  {question}
                </p>
              )}
            </div>

            {/* Options */}
            <div style={{ padding: "14px 16px 16px" }}>
              {options.map((opt, idx) => {
                const isFocused = idx === focusedIndex;
                return (
                  <motion.button
                    key={opt.id}
                    initial={{ opacity: 0, x: -8 }}
                    animate={{ opacity: 1, x: 0 }}
                    transition={{ delay: idx * 0.055 + 0.08 }}
                    onClick={() => onSelect(opt)}
                    onMouseEnter={() => setFocusedIndex(idx)}
                    style={{
                      display: "flex",
                      alignItems: "center",
                      gap: 14,
                      width: "100%",
                      padding: "12px 16px",
                      marginBottom: idx < options.length - 1 ? 6 : 0,
                      borderRadius: 12,
                      cursor: "pointer",
                      border: isFocused
                        ? "1px solid rgba(0,240,255,0.45)"
                        : "1px solid rgba(255,255,255,0.07)",
                      background: isFocused
                        ? "rgba(0,240,255,0.08)"
                        : "rgba(255,255,255,0.03)",
                      boxShadow: isFocused
                        ? "0 0 16px rgba(0,240,255,0.12), inset 0 0 0 1px rgba(0,240,255,0.08)"
                        : "none",
                      transition: "all 0.15s ease",
                      textAlign: "left",
                    }}
                  >
                    {/* Icon */}
                    <div
                      style={{
                        width: 36,
                        height: 36,
                        borderRadius: 10,
                        background: isFocused
                          ? "rgba(0,240,255,0.15)"
                          : "rgba(255,255,255,0.06)",
                        border: isFocused
                          ? "1px solid rgba(0,240,255,0.3)"
                          : "1px solid rgba(255,255,255,0.08)",
                        display: "flex",
                        alignItems: "center",
                        justifyContent: "center",
                        flexShrink: 0,
                        transition: "all 0.15s ease",
                      }}
                    >
                      <i
                        className={`fa-solid ${getIcon(opt.icon)}`}
                        style={{
                          fontSize: 14,
                          color: isFocused ? "#00F0FF" : "rgba(255,255,255,0.45)",
                          transition: "color 0.15s ease",
                        }}
                      />
                    </div>

                    {/* Label */}
                    <span
                      style={{
                        fontSize: 13,
                        fontFamily: "'JetBrains Mono', monospace",
                        color: isFocused ? "#E2E8F0" : "rgba(255,255,255,0.6)",
                        fontWeight: isFocused ? 600 : 400,
                        transition: "all 0.15s ease",
                        flex: 1,
                        lineHeight: 1.4,
                      }}
                    >
                      {opt.label}
                    </span>

                    {/* Enter hint on focused */}
                    {isFocused && (
                      <motion.div
                        initial={{ opacity: 0, scale: 0.8 }}
                        animate={{ opacity: 1, scale: 1 }}
                        style={{
                          fontSize: 9,
                          fontFamily: "monospace",
                          color: "rgba(0,240,255,0.5)",
                          border: "1px solid rgba(0,240,255,0.25)",
                          borderRadius: 4,
                          padding: "2px 5px",
                          letterSpacing: "0.05em",
                          flexShrink: 0,
                        }}
                      >
                        ENTER
                      </motion.div>
                    )}
                  </motion.button>
                );
              })}
            </div>

            {/* Footer hint */}
            <div
              style={{
                padding: "0 24px 14px",
                display: "flex",
                gap: 14,
                justifyContent: "center",
              }}
            >
              {[
                { keys: "↑ ↓", desc: "navigate" },
                { keys: "ENTER", desc: "confirm" },
                { keys: "ESC", desc: "dismiss" },
              ].map(({ keys, desc }) => (
                <div
                  key={keys}
                  style={{
                    display: "flex",
                    alignItems: "center",
                    gap: 4,
                    fontSize: 9,
                    fontFamily: "'JetBrains Mono', monospace",
                    color: "rgba(255,255,255,0.22)",
                  }}
                >
                  <span
                    style={{
                      border: "1px solid rgba(255,255,255,0.15)",
                      borderRadius: 3,
                      padding: "1px 4px",
                      fontSize: 8,
                      letterSpacing: "0.06em",
                    }}
                  >
                    {keys}
                  </span>
                  <span>{desc}</span>
                </div>
              ))}
            </div>
          </motion.div>
        </>
      )}
    </AnimatePresence>
  );
}
