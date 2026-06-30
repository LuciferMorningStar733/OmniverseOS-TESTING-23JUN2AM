import React, { useState } from "react";
import { motion, AnimatePresence } from "framer-motion";
import { WIDGET_REGISTRY } from "./widgetRegistry";
import { useWidgetManager } from "./WidgetManagerContext";

const GLASS = {
  background: "rgba(6, 8, 16, 0.92)",
  backdropFilter: "blur(40px) saturate(180%)",
  WebkitBackdropFilter: "blur(40px) saturate(180%)",
  border: "1px solid rgba(255,255,255,0.09)",
  borderRadius: 20,
  boxShadow: "0 24px 80px rgba(0,0,0,0.7), inset 0 1px 0 rgba(255,255,255,0.07)",
};

const WIDGET_DESCRIPTIONS = {
  clock:      "Live clock with date display",
  cortex:     "Cortex AI chat assistant",
  calendar:   "Monthly calendar view",
  todo:       "Task list & to-do manager",
  weather:    "Current weather & forecast",
  system:     "AI model health status",
  activity:   "Recent OS activity log",
  quicknotes: "Fast sticky note pad",
  music:      "Music player controls",
  news:       "Latest news headlines",
};

export default function WidgetStore({ onClose }) {
  const { layout, addWidget, removeWidget } = useWidgetManager();
  const [added, setAdded]   = useState(null); // id of last-added widget (for flash)
  const [removed, setRemoved] = useState(null);

  const activeIds = new Set(layout.map(w => w.id));

  const handleAdd = (def) => {
    addWidget(def);
    setAdded(def.id);
    setTimeout(() => setAdded(null), 1200);
  };

  const handleRemove = (id) => {
    removeWidget(id);
    setRemoved(id);
    setTimeout(() => setRemoved(null), 1200);
  };

  return (
    <AnimatePresence>
      {/* Backdrop */}
      <motion.div
        key="backdrop"
        initial={{ opacity: 0 }}
        animate={{ opacity: 1 }}
        exit={{ opacity: 0 }}
        onClick={onClose}
        style={{
          position: "fixed", inset: 0,
          background: "rgba(0,0,0,0.45)",
          zIndex: 200,
        }}
      />

      {/* Panel */}
      <motion.div
        key="panel"
        initial={{ opacity: 0, y: 24, scale: 0.96 }}
        animate={{ opacity: 1, y: 0, scale: 1 }}
        exit={{ opacity: 0, y: 16, scale: 0.97 }}
        transition={{ type: "spring", stiffness: 380, damping: 32 }}
        onClick={e => e.stopPropagation()}
        style={{
          position: "fixed",
          right: 68,
          bottom: 68,
          width: 340,
          maxHeight: "70vh",
          display: "flex",
          flexDirection: "column",
          zIndex: 201,
          ...GLASS,
        }}
      >
        {/* Header */}
        <div style={{
          display: "flex", alignItems: "center", justifyContent: "space-between",
          padding: "16px 18px 12px",
          borderBottom: "1px solid rgba(255,255,255,0.06)",
          flexShrink: 0,
        }}>
          <div style={{ display: "flex", alignItems: "center", gap: 9 }}>
            <i className="fa-solid fa-table-cells-large" style={{ color: "#00F0FF", fontSize: 13 }} />
            <span style={{ fontSize: 12, fontFamily: "monospace", letterSpacing: "0.14em", color: "rgba(255,255,255,0.8)", textTransform: "uppercase" }}>
              Widget Store
            </span>
          </div>
          <div style={{ display: "flex", alignItems: "center", gap: 10 }}>
            <span style={{ fontSize: 10, fontFamily: "monospace", color: "rgba(255,255,255,0.3)" }}>
              {activeIds.size} active
            </span>
            <button
              onClick={onClose}
              style={{
                width: 24, height: 24, borderRadius: 8, border: "1px solid rgba(255,255,255,0.1)",
                background: "transparent", color: "rgba(255,255,255,0.4)",
                cursor: "pointer", display: "flex", alignItems: "center", justifyContent: "center",
                fontSize: 10, transition: "all 0.15s",
              }}
              onMouseEnter={e => { e.currentTarget.style.background = "rgba(255,0,60,0.18)"; e.currentTarget.style.color = "#FF003C"; }}
              onMouseLeave={e => { e.currentTarget.style.background = "transparent"; e.currentTarget.style.color = "rgba(255,255,255,0.4)"; }}
            >
              <i className="fa-solid fa-xmark" />
            </button>
          </div>
        </div>

        {/* Subtitle */}
        <div style={{ padding: "10px 18px 8px", flexShrink: 0 }}>
          <p style={{ fontSize: 10.5, color: "rgba(255,255,255,0.3)", fontFamily: "monospace", margin: 0 }}>
            Tap <span style={{ color: "#00F0FF" }}>+</span> to add a widget to your desktop.
            Widgets can be moved &amp; resized by dragging.
          </p>
        </div>

        {/* Widget list */}
        <div style={{ overflowY: "auto", padding: "6px 12px 16px", flex: 1 }}>
          {WIDGET_REGISTRY.map(def => {
            const isActive = activeIds.has(def.id);
            const justAdded   = added === def.id;
            const justRemoved = removed === def.id;
            return (
              <div
                key={def.id}
                style={{
                  display: "flex",
                  alignItems: "center",
                  gap: 12,
                  padding: "10px 8px",
                  borderRadius: 12,
                  marginBottom: 2,
                  background: isActive ? "rgba(0,240,255,0.05)" : "transparent",
                  border: isActive ? "1px solid rgba(0,240,255,0.12)" : "1px solid transparent",
                  transition: "all 0.2s",
                }}
              >
                {/* Icon */}
                <div style={{
                  width: 34, height: 34, borderRadius: 10, flexShrink: 0,
                  background: `${def.color}18`,
                  border: `1px solid ${def.color}30`,
                  display: "flex", alignItems: "center", justifyContent: "center",
                }}>
                  <i className={`fa-solid ${def.icon}`} style={{ color: def.color, fontSize: 13 }} />
                </div>

                {/* Info */}
                <div style={{ flex: 1, minWidth: 0 }}>
                  <div style={{ fontSize: 11.5, fontWeight: 600, color: "rgba(255,255,255,0.85)", fontFamily: "monospace" }}>
                    {def.name}
                  </div>
                  <div style={{ fontSize: 10, color: "rgba(255,255,255,0.3)", marginTop: 1, fontFamily: "monospace" }}>
                    {WIDGET_DESCRIPTIONS[def.id] || "Desktop widget"}
                  </div>
                </div>

                {/* Action button */}
                <button
                  onClick={() => isActive ? handleRemove(def.id) : handleAdd(def)}
                  style={{
                    height: 28,
                    padding: "0 12px",
                    borderRadius: 8,
                    border: isActive
                      ? "1px solid rgba(255,0,60,0.3)"
                      : "1px solid rgba(0,240,255,0.35)",
                    background: justAdded
                      ? "rgba(0,240,255,0.25)"
                      : justRemoved
                        ? "rgba(255,0,60,0.25)"
                        : isActive
                          ? "rgba(255,0,60,0.08)"
                          : "rgba(0,240,255,0.08)",
                    color: isActive ? "#FF6B7A" : "#00F0FF",
                    fontSize: 10.5,
                    fontFamily: "monospace",
                    cursor: "pointer",
                    display: "flex",
                    alignItems: "center",
                    gap: 5,
                    transition: "all 0.18s",
                    flexShrink: 0,
                    whiteSpace: "nowrap",
                  }}
                  onMouseEnter={e => {
                    if (!justAdded && !justRemoved) {
                      e.currentTarget.style.background = isActive ? "rgba(255,0,60,0.18)" : "rgba(0,240,255,0.18)";
                    }
                  }}
                  onMouseLeave={e => {
                    if (!justAdded && !justRemoved) {
                      e.currentTarget.style.background = isActive ? "rgba(255,0,60,0.08)" : "rgba(0,240,255,0.08)";
                    }
                  }}
                >
                  {justAdded ? (
                    <><i className="fa-solid fa-check" style={{ fontSize: 9 }} /> Added!</>
                  ) : justRemoved ? (
                    <><i className="fa-solid fa-check" style={{ fontSize: 9 }} /> Removed</>
                  ) : isActive ? (
                    <><i className="fa-solid fa-minus" style={{ fontSize: 9 }} /> Remove</>
                  ) : (
                    <><i className="fa-solid fa-plus" style={{ fontSize: 9 }} /> Add</>
                  )}
                </button>
              </div>
            );
          })}
        </div>
      </motion.div>
    </AnimatePresence>
  );
}
