import React, { useState, useRef, useCallback, useMemo, useEffect } from "react";
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

// ── App icon ───────────────────────────────────────────────────────────────────

function AppDrawerIcon({ app, onPress, delay = 0 }) {
  const [pressed, setPressed] = useState(false);

  return (
    <motion.div
      initial={{ opacity: 0, scale: 0.72, y: 10 }}
      animate={{ opacity: 1, scale: 1, y: 0 }}
      transition={{ delay, type: "spring", damping: 20, stiffness: 400, mass: 0.28 }}
      style={{ display: "flex", flexDirection: "column", alignItems: "center" }}
    >
      <button
        onPointerDown={() => setPressed(true)}
        onPointerUp={() => { setPressed(false); onPress(app.id); }}
        onPointerLeave={() => setPressed(false)}
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
          transform: pressed ? "scale(0.80)" : "scale(1)",
          transition: "transform 0.12s cubic-bezier(0.34,1.56,0.64,1)",
        }}
      >
        <div style={{
          width: 56, height: 56, borderRadius: 18,
          background: `linear-gradient(145deg, ${app.color}22 0%, ${app.color}09 100%)`,
          border: `1px solid ${app.color}30`,
          display: "flex", alignItems: "center", justifyContent: "center",
          boxShadow: pressed
            ? `0 2px 8px rgba(0,0,0,0.60), 0 0 16px ${app.color}25`
            : `0 6px 24px rgba(0,0,0,0.48), inset 0 1px 0 rgba(255,255,255,0.09)`,
          backdropFilter: "blur(16px)",
          WebkitBackdropFilter: "blur(16px)",
          position: "relative",
          overflow: "hidden",
          transition: "box-shadow 0.12s ease",
        }}>
          <div style={{
            position: "absolute", inset: 0,
            background: `radial-gradient(ellipse at 35% 25%, ${app.color}16 0%, transparent 65%)`,
            pointerEvents: "none",
          }} />
          <i
            className={`fa-solid ${app.icon}`}
            style={{
              color: app.color,
              fontSize: 22,
              filter: `drop-shadow(0 0 8px ${app.color}90)`,
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
      </button>
    </motion.div>
  );
}

// ── Main Drawer ────────────────────────────────────────────────────────────────
// Uses direct DOM manipulation during gesture — zero React re-renders at 120fps.

export default function MobileAppDrawer({ onClose, onOpenApp }) {
  const [search, setSearch]           = useState("");
  const [activeGroup, setActiveGroup] = useState("all");
  const [mounted, setMounted]         = useState(false);
  const inputRef                      = useRef(null);
  const sheetRef                      = useRef(null);
  const backdropRef                   = useRef(null);

  // Gesture tracking — all refs, never touches React state during drag
  const touchStartY  = useRef(0);
  const touchStartX  = useRef(0);
  const lastY        = useRef(0);
  const lastT        = useRef(0);
  const velocity     = useRef(0);       // px/ms
  const dragY        = useRef(0);       // current translated px
  const dragging     = useRef(false);
  const axisLocked   = useRef(null);    // "v" | "h" | null
  const rafId        = useRef(null);
  const sheetH       = useRef(0);

  // Entry: double-rAF ensures CSS transition fires after browser paint
  useEffect(() => {
    const id1 = requestAnimationFrame(() => {
      const id2 = requestAnimationFrame(() => setMounted(true));
      return () => cancelAnimationFrame(id2);
    });
    return () => cancelAnimationFrame(id1);
  }, []);

  useEffect(() => {
    if (sheetRef.current) sheetH.current = sheetRef.current.offsetHeight;
  }, [mounted]);

  // ── Native touch — fires on compositor thread, no React re-renders ──────────

  const handleTouchStart = useCallback((e) => {
    touchStartY.current = e.touches[0].clientY;
    touchStartX.current = e.touches[0].clientX;
    lastY.current       = e.touches[0].clientY;
    lastT.current       = e.timeStamp;
    velocity.current    = 0;
    dragY.current       = 0;
    dragging.current    = false;
    axisLocked.current  = null;
  }, []);

  const handleTouchMove = useCallback((e) => {
    const y   = e.touches[0].clientY;
    const x   = e.touches[0].clientX;
    const dyA = Math.abs(y - touchStartY.current);
    const dxA = Math.abs(x - touchStartX.current);

    if (axisLocked.current === null && (dyA > 5 || dxA > 5)) {
      axisLocked.current = dyA >= dxA ? "v" : "h";
    }
    if (axisLocked.current !== "v") return;

    const rawDy = y - touchStartY.current;

    // Only start if pulling downward
    if (!dragging.current && rawDy > 3) {
      dragging.current = true;
      if (sheetRef.current) {
        sheetRef.current.style.transition = "none";
        sheetRef.current.style.willChange = "transform";
      }
    }
    if (!dragging.current) return;

    // Track velocity
    const dt = e.timeStamp - lastT.current;
    if (dt > 0) velocity.current = (y - lastY.current) / dt;
    lastY.current = y;
    lastT.current = e.timeStamp;

    // Rubber-band resistance when pulling past closed state (upward)
    let translated = rawDy < 0 ? rawDy * 0.06 : rawDy;
    dragY.current = translated;

    if (rafId.current) cancelAnimationFrame(rafId.current);
    rafId.current = requestAnimationFrame(() => {
      if (sheetRef.current) {
        sheetRef.current.style.transform = `translate3d(0,${translated}px,0)`;
      }
      if (backdropRef.current) {
        const h = sheetH.current || window.innerHeight * 0.88;
        const p = 1 - Math.max(0, translated) / h;
        backdropRef.current.style.opacity = String(Math.min(1, Math.max(0, p)));
      }
    });
  }, []);

  const handleTouchEnd = useCallback(() => {
    if (!dragging.current) return;
    dragging.current = false;
    if (rafId.current) cancelAnimationFrame(rafId.current);

    const h   = sheetH.current || window.innerHeight * 0.88;
    const vel = velocity.current;  // px/ms, positive = moving down
    const dy  = dragY.current;

    // Close when dragged > 28% of height OR flicked down at > 0.5 px/ms
    const shouldClose = dy > h * 0.28 || vel > 0.50;

    if (!sheetRef.current) return;
    sheetRef.current.style.willChange = "auto";

    if (shouldClose) {
      sheetRef.current.style.transition = "transform 0.26s cubic-bezier(0.4,0,1,1)";
      sheetRef.current.style.transform  = `translate3d(0,${h + 60}px,0)`;
      if (backdropRef.current) {
        backdropRef.current.style.transition = "opacity 0.24s ease";
        backdropRef.current.style.opacity    = "0";
      }
      setTimeout(onClose, 260);
    } else {
      // Spring snap-back — slight overshoot feel
      sheetRef.current.style.transition = "transform 0.44s cubic-bezier(0.175,0.885,0.32,1.10)";
      sheetRef.current.style.transform  = "translate3d(0,0,0)";
      if (backdropRef.current) {
        backdropRef.current.style.transition = "opacity 0.32s ease";
        backdropRef.current.style.opacity    = "1";
      }
    }
  }, [onClose]);

  // Filtered app list
  const filteredApps = useMemo(() => {
    const q = search.trim().toLowerCase();
    if (q) return APPS.filter((a) =>
      a.name.toLowerCase().includes(q) || (a.group || "").toLowerCase().includes(q)
    );
    if (activeGroup !== "all") return APPS.filter((a) => a.group === activeGroup);
    return APPS;
  }, [search, activeGroup]);

  return (
    <>
      {/* GPU-composited backdrop */}
      <div
        ref={backdropRef}
        onClick={onClose}
        style={{
          position: "fixed", inset: 0, zIndex: 90,
          background: "rgba(0,0,0,0.55)",
          backdropFilter: "blur(14px)",
          WebkitBackdropFilter: "blur(14px)",
          opacity: mounted ? 1 : 0,
          transition: "opacity 0.22s ease",
          willChange: "opacity",
        }}
      />

      {/* Sheet — CSS transition only, no Framer Motion on the container */}
      <div
        ref={sheetRef}
        onTouchStart={handleTouchStart}
        onTouchMove={handleTouchMove}
        onTouchEnd={handleTouchEnd}
        style={{
          position: "fixed",
          left: 0, right: 0, bottom: 0,
          zIndex: 91,
          height: "88vh",
          borderRadius: "28px 28px 0 0",
          background: "rgba(4, 6, 14, 0.97)",
          backdropFilter: "blur(64px) saturate(240%)",
          WebkitBackdropFilter: "blur(64px) saturate(240%)",
          border: "1px solid rgba(255,255,255,0.10)",
          borderBottom: "none",
          boxShadow: "0 -32px 80px rgba(0,0,0,0.82), 0 0 0 1px rgba(0,240,255,0.05), inset 0 1px 0 rgba(255,255,255,0.08)",
          display: "flex",
          flexDirection: "column",
          overflow: "hidden",
          // Entry: starts off-screen, slides up with iOS-style curve
          transform: mounted ? "translate3d(0,0,0)" : "translate3d(0,100%,0)",
          transition: mounted
            ? "transform 0.50s cubic-bezier(0.32,0.72,0,1)"
            : "none",
          willChange: "transform",
          contain: "layout style paint",
        }}
      >
        {/* Subtle top glow line */}
        <div style={{
          position: "absolute", top: 0, left: 0, right: 0, height: 1,
          background: "linear-gradient(90deg, transparent, rgba(0,240,255,0.22), rgba(167,139,250,0.22), transparent)",
          pointerEvents: "none",
        }} />

        {/* Drag handle */}
        <div style={{
          display: "flex", justifyContent: "center",
          paddingTop: 12, paddingBottom: 8, flexShrink: 0,
          cursor: "ns-resize",
        }}>
          <div style={{
            width: 40, height: 4, borderRadius: 2,
            background: "rgba(255,255,255,0.22)",
            boxShadow: "0 0 10px rgba(0,240,255,0.15)",
          }} />
        </div>

        {/* Header */}
        <div style={{ padding: "4px 20px 0", flexShrink: 0 }}>
          <div style={{
            display: "flex", alignItems: "center", justifyContent: "space-between",
            marginBottom: 14,
          }}>
            <div>
              <div style={{
                fontSize: 20, fontWeight: 700, color: "#fff",
                fontFamily: "'Outfit', sans-serif", letterSpacing: "-0.02em",
              }}>
                App Library
              </div>
              <div style={{
                fontSize: 9.5, color: "rgba(0,240,255,0.50)",
                fontFamily: "'Outfit', sans-serif", fontWeight: 600,
                letterSpacing: "0.12em", textTransform: "uppercase", marginTop: 1,
              }}>
                {APPS.length} Applications · Cortex Indexed
              </div>
            </div>
            <motion.button
              whileTap={{ scale: 0.84 }}
              onClick={onClose}
              style={{
                width: 34, height: 34, borderRadius: 11,
                background: "rgba(255,255,255,0.07)",
                border: "1px solid rgba(255,255,255,0.10)",
                display: "flex", alignItems: "center", justifyContent: "center",
                cursor: "pointer",
                WebkitTapHighlightColor: "transparent",
                color: "rgba(255,255,255,0.50)",
                fontSize: 13,
                boxShadow: "0 2px 12px rgba(0,0,0,0.30)",
              }}
            >
              <i className="fa-solid fa-xmark" />
            </motion.button>
          </div>

          {/* Search */}
          <div style={{
            display: "flex", alignItems: "center", gap: 10,
            padding: "10px 14px", borderRadius: 16,
            background: "rgba(255,255,255,0.055)",
            border: "1px solid rgba(255,255,255,0.10)",
            marginBottom: 14,
            boxShadow: "inset 0 1px 0 rgba(255,255,255,0.04)",
          }}>
            <i className="fa-solid fa-magnifying-glass" style={{ color: "rgba(255,255,255,0.30)", fontSize: 13 }} />
            <input
              ref={inputRef}
              value={search}
              onChange={(e) => setSearch(e.target.value)}
              placeholder="Search apps…"
              style={{
                flex: 1, background: "transparent", border: "none", outline: "none",
                fontSize: 14, fontFamily: "'Outfit', sans-serif",
                fontWeight: 400, color: "#fff", caretColor: "#00F0FF",
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
                    background: "rgba(255,255,255,0.10)", border: "none",
                    borderRadius: 6, width: 22, height: 22,
                    display: "flex", alignItems: "center", justifyContent: "center",
                    cursor: "pointer", color: "rgba(255,255,255,0.50)",
                    fontSize: 11, WebkitTapHighlightColor: "transparent",
                  }}
                >
                  <i className="fa-solid fa-xmark" />
                </motion.button>
              )}
            </AnimatePresence>
          </div>

          {/* Group chips */}
          {!search && (
            <div style={{
              display: "flex", gap: 7, overflowX: "auto",
              paddingBottom: 14, scrollbarWidth: "none",
              WebkitOverflowScrolling: "touch",
            }}>
              {GROUPS.map((g) => {
                const active = activeGroup === g.id;
                return (
                  <motion.button
                    key={g.id}
                    whileTap={{ scale: 0.88 }}
                    onClick={() => setActiveGroup(g.id)}
                    style={{
                      flexShrink: 0, padding: "5px 14px", borderRadius: 20,
                      background: active ? "rgba(0,240,255,0.14)" : "rgba(255,255,255,0.055)",
                      border: `1px solid ${active ? "rgba(0,240,255,0.36)" : "rgba(255,255,255,0.08)"}`,
                      color: active ? "#00F0FF" : "rgba(255,255,255,0.42)",
                      fontSize: 12, fontFamily: "'Outfit', sans-serif", fontWeight: 500,
                      cursor: "pointer", WebkitTapHighlightColor: "transparent",
                      boxShadow: active ? "0 0 16px rgba(0,240,255,0.16)" : "none",
                      transition: "all 0.16s ease",
                    }}
                  >
                    {g.label}
                  </motion.button>
                );
              })}
            </div>
          )}
        </div>

        {/* App grid — momentum scrolling, no React overhead */}
        <div style={{
          flex: 1, overflowY: "auto", overflowX: "hidden",
          WebkitOverflowScrolling: "touch",
          padding: "0 12px 64px",
          scrollbarWidth: "none", msOverflowStyle: "none",
          overscrollBehavior: "contain",
        }}>
          <AnimatePresence mode="wait">
            {filteredApps.length > 0 ? (
              <motion.div
                key={search + activeGroup}
                initial={{ opacity: 0 }}
                animate={{ opacity: 1 }}
                exit={{ opacity: 0 }}
                transition={{ duration: 0.10 }}
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
                    delay={Math.min(i * 0.012, 0.24)}
                  />
                ))}
              </motion.div>
            ) : (
              <motion.div
                key="empty"
                initial={{ opacity: 0, y: 12 }}
                animate={{ opacity: 1, y: 0 }}
                exit={{ opacity: 0 }}
                transition={{ duration: 0.20 }}
                style={{
                  display: "flex", flexDirection: "column",
                  alignItems: "center", justifyContent: "center",
                  padding: "60px 24px", gap: 12,
                }}
              >
                <div style={{
                  width: 56, height: 56, borderRadius: 18,
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
      </div>
    </>
  );
}
