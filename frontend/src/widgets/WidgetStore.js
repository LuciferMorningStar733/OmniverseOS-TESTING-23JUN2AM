import React, { useState, useRef, useCallback } from "react";
import { motion, AnimatePresence } from "framer-motion";
import { WIDGET_REGISTRY } from "./widgetRegistry";
import { useWidgetManager } from "./WidgetManagerContext";

const GLASS = {
  background: "rgba(6, 8, 16, 0.94)",
  backdropFilter: "blur(40px) saturate(180%)",
  WebkitBackdropFilter: "blur(40px) saturate(180%)",
  border: "1px solid rgba(255,255,255,0.10)",
  borderRadius: 20,
  boxShadow:
    "0 24px 80px rgba(0,0,0,0.75), 0 0 0 1px rgba(0,240,255,0.06), inset 0 1px 0 rgba(255,255,255,0.08)",
};

const WIDGET_DESCRIPTIONS = {
  chrono:     "Unified clock + live atmospheric sensor — futuristic 2038 panel",
  cortex:     "Cortex AI chat assistant",
  calendar:   "Monthly calendar view",
  todo:       "Task list & to-do manager",
  system:     "AI model health status",
  activity:   "Recent OS activity log",
  quicknotes: "Fast sticky note pad",
  music:      "Music player controls",
  news:       "Latest news headlines",
};

/* ─── Ripple ─────────────────────────────────────────────────── */
function useRipple() {
  const [ripples, setRipples] = useState([]);
  const trigger = useCallback((e) => {
    const rect = e.currentTarget.getBoundingClientRect();
    const x = e.clientX - rect.left;
    const y = e.clientY - rect.top;
    const id = Date.now();
    setRipples((r) => [...r, { id, x, y }]);
    setTimeout(() => setRipples((r) => r.filter((rp) => rp.id !== id)), 600);
  }, []);
  return [ripples, trigger];
}

/* ─── Add / Remove button with ripple + press ──────────────────── */
function ActionBtn({ isActive, justAdded, justRemoved, onClick }) {
  const [ripples, triggerRipple] = useRipple();
  const [pressed, setPressed] = useState(false);

  const handleClick = useCallback((e) => {
    triggerRipple(e);
    onClick();
  }, [onClick, triggerRipple]);

  const label = justAdded   ? (<><i className="fa-solid fa-check" style={{ fontSize: 9 }} /> Added!</>)
              : justRemoved ? (<><i className="fa-solid fa-check" style={{ fontSize: 9 }} /> Removed</>)
              : isActive    ? (<><i className="fa-solid fa-minus" style={{ fontSize: 9 }} /> Remove</>)
                            : (<><i className="fa-solid fa-plus"  style={{ fontSize: 9 }} /> Add</>);

  const accentR = isActive ? "255,0,60" : "0,240,255";
  const accent  = isActive ? "#FF6B7A"  : "#00F0FF";

  return (
    <button
      onClick={handleClick}
      onMouseDown={() => setPressed(true)}
      onMouseUp={() => setPressed(false)}
      onMouseLeave={() => setPressed(false)}
      style={{
        position: "relative",
        overflow: "hidden",
        height: 30,
        minWidth: 72,
        padding: "0 14px",
        borderRadius: 9,
        border: `1px solid rgba(${accentR},${justAdded || justRemoved ? 0.6 : isActive ? 0.35 : 0.4})`,
        background: justAdded || justRemoved
          ? `rgba(${accentR},0.28)`
          : `rgba(${accentR},0.09)`,
        color: accent,
        fontSize: 10.5,
        fontFamily: "monospace",
        cursor: "pointer",
        display: "flex",
        alignItems: "center",
        justifyContent: "center",
        gap: 5,
        flexShrink: 0,
        whiteSpace: "nowrap",
        transform: pressed ? "scale(0.93)" : "scale(1)",
        boxShadow: pressed
          ? `0 0 18px rgba(${accentR},0.45), inset 0 0 8px rgba(${accentR},0.15)`
          : `0 0 0px rgba(${accentR},0)`,
        transition: "transform 0.1s ease, box-shadow 0.18s ease, background 0.18s ease, border-color 0.18s ease",
      }}
      onMouseEnter={(e) => {
        if (!justAdded && !justRemoved) {
          e.currentTarget.style.background = `rgba(${accentR},0.20)`;
          e.currentTarget.style.boxShadow  = `0 0 16px rgba(${accentR},0.35)`;
          e.currentTarget.style.borderColor = `rgba(${accentR},0.65)`;
        }
      }}
      onMouseLeave={(e) => {
        setPressed(false);
        if (!justAdded && !justRemoved) {
          e.currentTarget.style.background  = `rgba(${accentR},0.09)`;
          e.currentTarget.style.boxShadow   = `0 0 0px rgba(${accentR},0)`;
          e.currentTarget.style.borderColor = `rgba(${accentR},${isActive ? 0.35 : 0.4})`;
        }
      }}
    >
      {ripples.map((rp) => (
        <span
          key={rp.id}
          style={{
            position: "absolute",
            left: rp.x - 40,
            top: rp.y - 40,
            width: 80,
            height: 80,
            borderRadius: "50%",
            background: `rgba(${accentR},0.30)`,
            transform: "scale(0)",
            animation: "omni-ripple 0.55s ease-out forwards",
            pointerEvents: "none",
          }}
        />
      ))}
      {label}
    </button>
  );
}

/* ─── Toast ──────────────────────────────────────────────────── */
function Toast({ message, visible }) {
  return (
    <AnimatePresence>
      {visible && (
        <motion.div
          initial={{ opacity: 0, y: 12, scale: 0.94 }}
          animate={{ opacity: 1, y: 0,  scale: 1 }}
          exit={{ opacity: 0, y: 8, scale: 0.96 }}
          transition={{ type: "spring", stiffness: 400, damping: 30 }}
          style={{
            position: "absolute",
            bottom: -44,
            left: "50%",
            transform: "translateX(-50%)",
            background: "rgba(6,8,16,0.92)",
            border: "1px solid rgba(0,240,255,0.3)",
            borderRadius: 10,
            padding: "7px 16px",
            fontSize: 11,
            fontFamily: "monospace",
            color: "#00F0FF",
            whiteSpace: "nowrap",
            pointerEvents: "none",
            zIndex: 210,
            boxShadow: "0 0 18px rgba(0,240,255,0.2), 0 8px 24px rgba(0,0,0,0.5)",
          }}
        >
          {message}
        </motion.div>
      )}
    </AnimatePresence>
  );
}

/* ─── Main WidgetStore ────────────────────────────────────────── */
export default function WidgetStore({ onClose }) {
  const { layout, addWidget, removeWidget } = useWidgetManager();
  const [added,   setAdded]   = useState(null);
  const [removed, setRemoved] = useState(null);
  const [toast,   setToast]   = useState({ msg: "", show: false });
  const toastTimer = useRef(null);

  const scrollRef = useRef(null);

  const activeIds = new Set(layout.map((w) => w.id));

  const showToast = useCallback((msg) => {
    clearTimeout(toastTimer.current);
    setToast({ msg, show: true });
    toastTimer.current = setTimeout(() => setToast((t) => ({ ...t, show: false })), 2000);
  }, []);

  const handleAdd = useCallback((def) => {
    addWidget(def);
    setAdded(def.id);
    showToast(`✓ ${def.name} added to desktop`);
    setTimeout(() => setAdded(null), 1400);
  }, [addWidget, showToast]);

  const handleRemove = useCallback((def) => {
    removeWidget(def.id);
    setRemoved(def.id);
    showToast(`${def.name} removed`);
    setTimeout(() => setRemoved(null), 1400);
  }, [removeWidget, showToast]);

  /* Fix scroll — forward wheel events to the inner scrollable div */
  const handleBackdropWheel = useCallback((e) => {
    if (scrollRef.current) {
      scrollRef.current.scrollTop += e.deltaY;
      e.preventDefault();
    }
  }, []);

  return (
    <AnimatePresence>
      {/* Backdrop */}
      <motion.div
        key="ws-backdrop"
        initial={{ opacity: 0 }}
        animate={{ opacity: 1 }}
        exit={{ opacity: 0 }}
        transition={{ duration: 0.18 }}
        onClick={onClose}
        style={{
          position: "fixed", inset: 0,
          background: "rgba(0,0,0,0.5)",
          zIndex: 200,
        }}
      />

      {/* Panel — centered on screen, never overlaps any window or Cortex panel */}
      <motion.div
        key="ws-panel"
        initial={{ opacity: 0, scale: 0.93, y: 20 }}
        animate={{ opacity: 1, scale: 1, y: 0 }}
        exit={{ opacity: 0, scale: 0.95, y: 12 }}
        transition={{ type: "spring", stiffness: 380, damping: 30 }}
        onClick={(e) => e.stopPropagation()}
        onWheel={handleBackdropWheel}
        style={{
          position: "fixed",
          /* Center on screen — avoids Cortex panel, windows, dock */
          top: "50%",
          left: "50%",
          transform: "translate(-50%, -50%)",
          width: 360,
          maxHeight: "72vh",
          display: "flex",
          flexDirection: "column",
          zIndex: 201,
          ...GLASS,
        }}
      >
        {/* Ripple keyframe injection */}
        <style>{`
          @keyframes omni-ripple {
            to { transform: scale(1); opacity: 0; }
          }
        `}</style>

        {/* Header */}
        <div style={{
          display: "flex", alignItems: "center", justifyContent: "space-between",
          padding: "16px 18px 12px",
          borderBottom: "1px solid rgba(255,255,255,0.07)",
          flexShrink: 0,
        }}>
          <div style={{ display: "flex", alignItems: "center", gap: 9 }}>
            <i className="fa-solid fa-table-cells-large" style={{ color: "#00F0FF", fontSize: 13 }} />
            <span style={{
              fontSize: 12, fontFamily: "monospace",
              letterSpacing: "0.14em", color: "rgba(255,255,255,0.85)",
              textTransform: "uppercase",
            }}>
              Widget Store
            </span>
          </div>

          <div style={{ display: "flex", alignItems: "center", gap: 10 }}>
            <span style={{ fontSize: 10, fontFamily: "monospace", color: "rgba(255,255,255,0.3)" }}>
              {activeIds.size} active
            </span>

            {/* Close button — bigger hitbox, proper hover */}
            <button
              onClick={onClose}
              title="Close"
              style={{
                width: 32, height: 32, borderRadius: 10,
                border: "1px solid rgba(255,255,255,0.10)",
                background: "transparent",
                color: "rgba(255,255,255,0.45)",
                cursor: "pointer",
                display: "flex", alignItems: "center", justifyContent: "center",
                fontSize: 12,
                transition: "all 0.15s ease",
                flexShrink: 0,
              }}
              onMouseEnter={(e) => {
                e.currentTarget.style.background   = "rgba(255,0,60,0.20)";
                e.currentTarget.style.color        = "#FF4466";
                e.currentTarget.style.borderColor  = "rgba(255,0,60,0.45)";
                e.currentTarget.style.boxShadow    = "0 0 12px rgba(255,0,60,0.25)";
              }}
              onMouseLeave={(e) => {
                e.currentTarget.style.background  = "transparent";
                e.currentTarget.style.color       = "rgba(255,255,255,0.45)";
                e.currentTarget.style.borderColor = "rgba(255,255,255,0.10)";
                e.currentTarget.style.boxShadow   = "none";
              }}
            >
              <i className="fa-solid fa-xmark" />
            </button>
          </div>
        </div>

        {/* Subtitle */}
        <div style={{ padding: "10px 18px 8px", flexShrink: 0 }}>
          <p style={{
            fontSize: 10.5, color: "rgba(255,255,255,0.32)",
            fontFamily: "monospace", margin: 0, lineHeight: 1.5,
          }}>
            Tap <span style={{ color: "#00F0FF" }}>+</span> to add a widget to your desktop.
            Drag &amp; resize widgets once on the desktop.
          </p>
        </div>

        {/* Widget list — scroll fixed */}
        <div
          ref={scrollRef}
          style={{
            overflowY: "scroll",
            overflowX: "hidden",
            padding: "4px 12px 16px",
            flex: 1,
            /* Smooth scrolling on trackpad / touch */
            WebkitOverflowScrolling: "touch",
            scrollbarWidth: "thin",
            scrollbarColor: "rgba(0,240,255,0.18) transparent",
          }}
          onWheel={(e) => e.stopPropagation()}
        >
          {WIDGET_REGISTRY.map((def) => {
            const isActive    = activeIds.has(def.id);
            const justAdded   = added === def.id;
            const justRemoved = removed === def.id;

            return (
              <motion.div
                key={def.id}
                layout
                style={{
                  display: "flex",
                  alignItems: "center",
                  gap: 12,
                  padding: "10px 8px",
                  borderRadius: 13,
                  marginBottom: 3,
                  background: isActive ? "rgba(0,240,255,0.05)" : "transparent",
                  border: isActive
                    ? "1px solid rgba(0,240,255,0.14)"
                    : "1px solid transparent",
                  transition: "background 0.2s, border-color 0.2s",
                }}
              >
                {/* Icon */}
                <div style={{
                  width: 36, height: 36, borderRadius: 10, flexShrink: 0,
                  background: `${def.color}18`,
                  border: `1px solid ${def.color}30`,
                  display: "flex", alignItems: "center", justifyContent: "center",
                }}>
                  <i className={`fa-solid ${def.icon}`} style={{ color: def.color, fontSize: 13 }} />
                </div>

                {/* Info */}
                <div style={{ flex: 1, minWidth: 0 }}>
                  <div style={{
                    fontSize: 11.5, fontWeight: 600,
                    color: "rgba(255,255,255,0.88)", fontFamily: "monospace",
                  }}>
                    {def.name}
                  </div>
                  <div style={{
                    fontSize: 9.5, color: "rgba(255,255,255,0.30)",
                    marginTop: 2, fontFamily: "monospace",
                    lineHeight: 1.4,
                    whiteSpace: "nowrap", overflow: "hidden", textOverflow: "ellipsis",
                  }}>
                    {WIDGET_DESCRIPTIONS[def.id] || "Desktop widget"}
                  </div>
                </div>

                {/* Action button */}
                <ActionBtn
                  isActive={isActive}
                  justAdded={justAdded}
                  justRemoved={justRemoved}
                  onClick={() => isActive ? handleRemove(def) : handleAdd(def)}
                />
              </motion.div>
            );
          })}
        </div>

        {/* Toast */}
        <div style={{ position: "relative" }}>
          <Toast message={toast.msg} visible={toast.show} />
        </div>
      </motion.div>
    </AnimatePresence>
  );
}
