import React, { useState, useRef, useCallback, useMemo } from "react";
import { motion, AnimatePresence } from "framer-motion";
import { APPS } from "../lib/apps";

// ── Group definitions ──────────────────────────────────────────────────────────

const GROUPS = [
  { id: "all",          label: "All" },
  { id: "ai",           label: "AI" },
  { id: "productivity", label: "Productivity" },
  { id: "media",        label: "Media" },
  { id: "system",       label: "System" },
  { id: "data",         label: "Data" },
  { id: "social",       label: "Social" },
];

// ── App icon for drawer ────────────────────────────────────────────────────────

function AppDrawerIcon({ app, onPress, delay = 0 }) {
  const [pressed, setPressed] = useState(false);

  return (
    <motion.div
      initial={{ opacity: 0, scale: 0.65, y: 12 }}
      animate={{ opacity: 1, scale: 1, y: 0 }}
      transition={{ delay, type: "spring", damping: 22, stiffness: 360, mass: 0.35 }}
      style={{ display: "flex", flexDirection: "column", alignItems: "center" }}
    >
      <motion.button
        onPointerDown={() => setPressed(true)}
        onPointerUp={() => { setPressed(false); onPress(app.id); }}
        onPointerLeave={() => setPressed(false)}
        animate={{ scale: pressed ? 0.80 : 1 }}
        transition={{ type: "spring", stiffness: 600, damping: 22, mass: 0.18 }}
        style={{
          display: "flex",
          flexDirection: "column",
          alignItems: "center",
          gap: 6,
          background: "transparent",
          border: "none",
          cursor: "pointer",
          padding: "9px 4px",
          WebkitTapHighlightColor: "transparent",
          touchAction: "manipulation",
          userSelect: "none",
          minWidth: 64,
        }}
      >
        <div style={{
          width: 56, height: 56, borderRadius: 16,
          background: `linear-gradient(145deg, ${app.color}1C 0%, ${app.color}09 100%)`,
          border: `1px solid ${app.color}2A`,
          display: "flex", alignItems: "center", justifyContent: "center",
          boxShadow: `0 4px 20px rgba(0,0,0,0.42), inset 0 1px 0 rgba(255,255,255,0.07)`,
          backdropFilter: "blur(20px)",
          WebkitBackdropFilter: "blur(20px)",
          position: "relative",
          overflow: "hidden",
        }}>
          {/* Inner glow */}
          <div style={{
            position: "absolute", inset: 0,
            background: `radial-gradient(ellipse at 35% 25%, ${app.color}12 0%, transparent 65%)`,
            pointerEvents: "none",
          }} />
          <i
            className={`fa-solid ${app.icon}`}
            style={{
              color: app.color,
              fontSize: 22,
              filter: `drop-shadow(0 0 7px ${app.color}80)`,
              position: "relative",
              zIndex: 1,
            }}
          />
        </div>
        <span style={{
          fontSize: 10,
          fontFamily: "'Outfit', sans-serif",
          fontWeight: 500,
          color: "rgba(255,255,255,0.72)",
          textAlign: "center",
          lineHeight: 1.2,
          maxWidth: 66,
          overflow: "hidden",
          textOverflow: "ellipsis",
          whiteSpace: "nowrap",
          textShadow: "0 1px 6px rgba(0,0,0,0.90)",
          userSelect: "none",
        }}>
          {app.name}
        </span>
      </motion.button>
    </motion.div>
  );
}

// ── Main Drawer ────────────────────────────────────────────────────────────────

export default function MobileAppDrawer({ onClose, onOpenApp }) {
  const [search, setSearch]           = useState("");
  const [activeGroup, setActiveGroup] = useState("all");
  const inputRef                      = useRef(null);
  const touchStartY                   = useRef(null);

  // Drag-to-dismiss gesture
  const handleDragStart = useCallback((e) => {
    touchStartY.current = e.touches[0].clientY;
  }, []);

  const handleDragEnd = useCallback((e) => {
    if (touchStartY.current === null) return;
    const dy = e.changedTouches[0].clientY - touchStartY.current;
    touchStartY.current = null;
    if (dy > 80) onClose();
  }, [onClose]);

  // Filtered app list
  const filteredApps = useMemo(() => {
    const q = search.trim().toLowerCase();
    if (q) {
      return APPS.filter(
        (a) => a.name.toLowerCase().includes(q) || (a.group || "").toLowerCase().includes(q)
      );
    }
    if (activeGroup !== "all") {
      return APPS.filter((a) => a.group === activeGroup);
    }
    return APPS;
  }, [search, activeGroup]);

  return (
    <>
      {/* Blurred backdrop */}
      <motion.div
        initial={{ opacity: 0 }}
        animate={{ opacity: 1 }}
        exit={{ opacity: 0 }}
        transition={{ duration: 0.20 }}
        onClick={onClose}
        style={{
          position: "fixed",
          inset: 0,
          zIndex: 90,
          background: "rgba(0,0,0,0.52)",
          backdropFilter: "blur(10px)",
          WebkitBackdropFilter: "blur(10px)",
        }}
      />

      {/* Sheet */}
      <motion.div
        initial={{ y: "100%" }}
        animate={{ y: 0 }}
        exit={{ y: "105%" }}
        transition={{ type: "spring", damping: 32, stiffness: 300, mass: 0.65 }}
        onTouchStart={handleDragStart}
        onTouchEnd={handleDragEnd}
        style={{
          position: "fixed",
          left: 0,
          right: 0,
          bottom: 0,
          zIndex: 91,
          height: "88vh",
          borderRadius: "28px 28px 0 0",
          background: "rgba(5, 7, 15, 0.97)",
          backdropFilter: "blur(56px) saturate(220%)",
          WebkitBackdropFilter: "blur(56px) saturate(220%)",
          border: "1px solid rgba(255,255,255,0.10)",
          borderBottom: "none",
          boxShadow: "0 -28px 80px rgba(0,0,0,0.75), 0 0 0 1px rgba(0,240,255,0.04)",
          display: "flex",
          flexDirection: "column",
          overflow: "hidden",
        }}
      >
        {/* Drag handle */}
        <div style={{
          display: "flex", justifyContent: "center",
          paddingTop: 12, paddingBottom: 6, flexShrink: 0,
        }}>
          <div style={{
            width: 38, height: 4, borderRadius: 2,
            background: "rgba(255,255,255,0.18)",
          }} />
        </div>

        {/* Header */}
        <div style={{ padding: "8px 20px 0", flexShrink: 0 }}>
          <div style={{
            display: "flex", alignItems: "center", justifyContent: "space-between",
            marginBottom: 14,
          }}>
            <div style={{
              fontSize: 20, fontWeight: 700, color: "#fff",
              fontFamily: "'Outfit', sans-serif", letterSpacing: "-0.02em",
            }}>
              App Library
            </div>
            <motion.button
              whileTap={{ scale: 0.86 }}
              onClick={onClose}
              style={{
                width: 32, height: 32, borderRadius: 10,
                background: "rgba(255,255,255,0.07)",
                border: "1px solid rgba(255,255,255,0.10)",
                display: "flex", alignItems: "center", justifyContent: "center",
                cursor: "pointer",
                WebkitTapHighlightColor: "transparent",
                color: "rgba(255,255,255,0.50)",
                fontSize: 13,
              }}
            >
              <i className="fa-solid fa-xmark" />
            </motion.button>
          </div>

          {/* Search bar */}
          <div style={{
            display: "flex", alignItems: "center", gap: 10,
            padding: "10px 14px",
            borderRadius: 14,
            background: "rgba(255,255,255,0.06)",
            border: "1px solid rgba(255,255,255,0.10)",
            marginBottom: 14,
          }}>
            <i className="fa-solid fa-magnifying-glass" style={{ color: "rgba(255,255,255,0.32)", fontSize: 13 }} />
            <input
              ref={inputRef}
              value={search}
              onChange={(e) => setSearch(e.target.value)}
              placeholder="Search apps…"
              style={{
                flex: 1,
                background: "transparent",
                border: "none",
                outline: "none",
                fontSize: 14,
                fontFamily: "'Outfit', sans-serif",
                fontWeight: 400,
                color: "#fff",
                caretColor: "#00F0FF",
              }}
            />
            <AnimatePresence>
              {search && (
                <motion.button
                  initial={{ opacity: 0, scale: 0.7 }}
                  animate={{ opacity: 1, scale: 1 }}
                  exit={{ opacity: 0, scale: 0.7 }}
                  onClick={() => setSearch("")}
                  style={{
                    background: "rgba(255,255,255,0.10)",
                    border: "none",
                    borderRadius: 6,
                    width: 22, height: 22,
                    display: "flex", alignItems: "center", justifyContent: "center",
                    cursor: "pointer",
                    color: "rgba(255,255,255,0.50)",
                    fontSize: 11,
                    WebkitTapHighlightColor: "transparent",
                  }}
                >
                  <i className="fa-solid fa-xmark" />
                </motion.button>
              )}
            </AnimatePresence>
          </div>

          {/* Group filter chips */}
          {!search && (
            <div style={{
              display: "flex",
              gap: 8,
              overflowX: "auto",
              paddingBottom: 14,
              scrollbarWidth: "none",
              msOverflowStyle: "none",
            }}>
              {GROUPS.map((g) => {
                const active = activeGroup === g.id;
                return (
                  <motion.button
                    key={g.id}
                    whileTap={{ scale: 0.90 }}
                    onClick={() => setActiveGroup(g.id)}
                    style={{
                      flexShrink: 0,
                      padding: "5px 14px",
                      borderRadius: 20,
                      background: active ? "rgba(0,240,255,0.16)" : "rgba(255,255,255,0.06)",
                      border: `1px solid ${active ? "rgba(0,240,255,0.38)" : "rgba(255,255,255,0.08)"}`,
                      color: active ? "#00F0FF" : "rgba(255,255,255,0.45)",
                      fontSize: 12,
                      fontFamily: "'Outfit', sans-serif",
                      fontWeight: 500,
                      cursor: "pointer",
                      WebkitTapHighlightColor: "transparent",
                      transition: "background 0.18s, border-color 0.18s, color 0.18s",
                    }}
                  >
                    {g.label}
                  </motion.button>
                );
              })}
            </div>
          )}
        </div>

        {/* App grid */}
        <div style={{
          flex: 1,
          overflowY: "auto",
          overflowX: "hidden",
          WebkitOverflowScrolling: "touch",
          padding: "0 12px 48px",
          scrollbarWidth: "none",
        }}>
          <AnimatePresence mode="wait">
            {filteredApps.length > 0 ? (
              <motion.div
                key={search + activeGroup}
                initial={{ opacity: 0 }}
                animate={{ opacity: 1 }}
                exit={{ opacity: 0 }}
                transition={{ duration: 0.14 }}
                style={{
                  display: "grid",
                  gridTemplateColumns: "repeat(4, 1fr)",
                  gap: "2px 0",
                }}
              >
                {filteredApps.map((app, i) => (
                  <AppDrawerIcon
                    key={app.id}
                    app={app}
                    onPress={onOpenApp}
                    delay={i * 0.016}
                  />
                ))}
              </motion.div>
            ) : (
              <motion.div
                key="empty"
                initial={{ opacity: 0, y: 12 }}
                animate={{ opacity: 1, y: 0 }}
                exit={{ opacity: 0 }}
                transition={{ duration: 0.22 }}
                style={{
                  display: "flex",
                  flexDirection: "column",
                  alignItems: "center",
                  justifyContent: "center",
                  padding: "60px 24px",
                  gap: 12,
                }}
              >
                <div style={{
                  width: 56, height: 56, borderRadius: 16,
                  background: "rgba(0,240,255,0.07)",
                  border: "1px solid rgba(0,240,255,0.16)",
                  display: "flex", alignItems: "center", justifyContent: "center",
                }}>
                  <i className="fa-solid fa-magnifying-glass" style={{ fontSize: 22, color: "#00F0FF", opacity: 0.45 }} />
                </div>
                <div style={{ textAlign: "center" }}>
                  <div style={{ fontSize: 15, fontWeight: 600, color: "rgba(255,255,255,0.70)", fontFamily: "'Outfit', sans-serif", marginBottom: 6 }}>
                    No results
                  </div>
                  <div style={{ fontSize: 12.5, color: "rgba(255,255,255,0.30)", fontFamily: "'Outfit', sans-serif" }}>
                    Nothing matches "{search}"
                  </div>
                </div>
              </motion.div>
            )}
          </AnimatePresence>
        </div>
      </motion.div>
    </>
  );
}
