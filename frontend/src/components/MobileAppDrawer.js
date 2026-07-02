import React, { useState, useRef, useCallback, useMemo, useEffect } from "react";
import { motion, AnimatePresence } from "framer-motion";
import { APPS } from "../lib/apps";

const GROUPS = [
  { id: "all",          label: "All" },
  { id: "ai",           label: "AI" },
  { id: "productivity", label: "Productivity" },
  { id: "media",        label: "Media" },
  { id: "system",       label: "System" },
  { id: "data",         label: "Data" },
  { id: "social",       label: "Social" },
];

// ── Refresh-rate detector — samples 40 frames for accuracy ───────────────────
let SCREEN_HZ = 60;
let HZ_READY   = false;
const HZ_CALLBACKS = [];
function onHzReady(fn) { HZ_READY ? fn(SCREEN_HZ) : HZ_CALLBACKS.push(fn); }

(function detectHz() {
  let last = null, frames = 0, sum = 0;
  function tick(ts) {
    if (last !== null) {
      const d = ts - last;
      if (d > 0 && d < 100) { sum += d; frames++; }
    }
    last = ts;
    if (frames < 40) { requestAnimationFrame(tick); return; }
    SCREEN_HZ = Math.round(1000 / (sum / frames));
    HZ_READY  = true;
    HZ_CALLBACKS.forEach(fn => fn(SCREEN_HZ));
    HZ_CALLBACKS.length = 0;
  }
  requestAnimationFrame(tick);
})();

// ── Force-FPS heartbeat — keeps compositor at native refresh rate ─────────────
// Without this, browsers may power-gate to 60hz even on 120hz displays when
// no "interesting" animation is running.  A no-op rAF loop is enough to keep
// the VSync budget open.
let hbRaf = null;
let hbActive = false;
function startHeartbeat() {
  if (hbActive) return;
  hbActive = true;
  function beat() { if (hbActive) hbRaf = requestAnimationFrame(beat); }
  hbRaf = requestAnimationFrame(beat);
}
function stopHeartbeat() {
  hbActive = false;
  if (hbRaf) { cancelAnimationFrame(hbRaf); hbRaf = null; }
}

// ── App icon ─────────────────────────────────────────────────────────────────
function AppDrawerIcon({ app, onPress, delay = 0 }) {
  const [pressed, setPressed] = useState(false);

  return (
    <motion.div
      initial={{ opacity: 0, scale: 0.72, y: 10 }}
      animate={{ opacity: 1, scale: 1, y: 0 }}
      transition={{ delay, type: "spring", damping: 20, stiffness: 400, mass: 0.28 }}
      style={{ display: "flex", flexDirection: "column", alignItems: "center" }}
    >
      {/* Priority 5 — spring-physics press animation via motion.button */}
      <motion.button
        onPointerDown={() => setPressed(true)}
        onPointerUp={() => { setPressed(false); onPress(app.id); }}
        onPointerLeave={() => setPressed(false)}
        onPointerCancel={() => setPressed(false)}
        animate={{ scale: pressed ? 0.78 : 1 }}
        transition={{ type: "spring", stiffness: 600, damping: 20, mass: 0.18 }}
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
          willChange: "transform",
        }}
      >
        <div style={{
          width: 56, height: 56, borderRadius: 18,
          background: `linear-gradient(145deg, ${app.color}22 0%, ${app.color}09 100%)`,
          border: `1px solid ${app.color}30`,
          display: "flex", alignItems: "center", justifyContent: "center",
          boxShadow: "0 6px 24px rgba(0,0,0,0.48), inset 0 1px 0 rgba(255,255,255,0.09)",
          backdropFilter: "blur(16px)",
          WebkitBackdropFilter: "blur(16px)",
          position: "relative",
          overflow: "hidden",
          transform: "translateZ(0)",
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
      </motion.button>
    </motion.div>
  );
}

// ── Force-FPS pill button ─────────────────────────────────────────────────────
function FpsPill({ detectedHz, forced, onToggle }) {
  const targetHz = Math.max(detectedHz, 60);
  const label    = forced ? `${targetHz}hz ✓` : `${targetHz}hz`;
  const color    = forced ? "#39FF14" : "rgba(255,255,255,0.28)";
  const bg       = forced ? "rgba(57,255,20,0.12)" : "rgba(255,255,255,0.055)";
  const border   = forced ? "rgba(57,255,20,0.36)" : "rgba(255,255,255,0.09)";
  const glow     = forced ? "0 0 14px rgba(57,255,20,0.30)" : "none";

  return (
    <motion.button
      whileTap={{ scale: 0.86 }}
      onClick={onToggle}
      title={forced ? "Force FPS active — tap to disable" : "Tap to force max refresh rate"}
      style={{
        display: "flex", alignItems: "center", gap: 5,
        padding: "5px 10px", borderRadius: 20,
        background: bg,
        border: `1px solid ${border}`,
        cursor: "pointer",
        WebkitTapHighlightColor: "transparent",
        boxShadow: glow,
        transition: "all 0.18s ease",
        flexShrink: 0,
      }}
    >
      {/* Indicator dot */}
      <motion.div
        animate={forced
          ? { opacity: [1, 0.25, 1], scale: [1, 1.5, 1] }
          : { opacity: 1, scale: 1 }
        }
        transition={forced
          ? { repeat: Infinity, duration: 1.4, ease: "easeInOut" }
          : {}
        }
        style={{
          width: 5, height: 5, borderRadius: "50%",
          background: color,
          boxShadow: forced ? `0 0 6px ${color}` : "none",
          flexShrink: 0,
        }}
      />
      {/* Icon */}
      <i
        className="fa-solid fa-gauge-high"
        style={{
          fontSize: 10,
          color,
          filter: forced ? `drop-shadow(0 0 4px ${color})` : "none",
          transition: "all 0.18s ease",
        }}
      />
      {/* Label */}
      <span style={{
        fontSize: 10,
        fontFamily: "'Outfit', sans-serif",
        fontWeight: forced ? 700 : 500,
        color,
        letterSpacing: "0.04em",
        lineHeight: 1,
        transition: "all 0.18s ease",
        userSelect: "none",
      }}>
        {label}
      </span>
    </motion.button>
  );
}

// ── CSS injected once ─────────────────────────────────────────────────────────
// The @keyframes below run a zero-visual-delta animation on the sheet and
// backdrop. On Chromium/WebKit, an active CSS animation keeps the layer on the
// high-refresh VSync budget — this is the same trick game engines use to avoid
// the browser dropping to 60hz after a few seconds of "stillness".
const DRAWER_CSS = `
  @keyframes drawerIn {
    from { transform: translate3d(0, 100%, 0); }
    to   { transform: translate3d(0, 0, 0); }
  }
  @keyframes backdropIn {
    from { opacity: 0; }
    to   { opacity: 1; }
  }
  @keyframes hbSheet {
    0%,100% { transform: translate3d(0,0,0) translateZ(0); }
    50%     { transform: translate3d(0,0,0) translateZ(0.001px); }
  }
  @keyframes hbBackdrop {
    0%,100% { opacity: 1; }
    50%     { opacity: 0.9999; }
  }
  .omni-force-fps-sheet    { animation: hbSheet    8s linear infinite !important; }
  .omni-force-fps-backdrop { animation: hbBackdrop 8s linear infinite !important; }
`;

export default function MobileAppDrawer({ onClose, onOpenApp }) {
  const [search,      setSearch]      = useState("");
  const [activeGroup, setActiveGroup] = useState("all");
  const [mounted,     setMounted]     = useState(false);
  const [detectedHz,  setDetectedHz]  = useState(SCREEN_HZ);
  const [forceFps,    setForceFps]    = useState(false);

  const inputRef    = useRef(null);
  const sheetRef    = useRef(null);
  const backdropRef = useRef(null);
  const listRef     = useRef(null);

  // Gesture tracking refs — zero React state during drag
  const touchStartY  = useRef(0);
  const touchStartX  = useRef(0);
  const lastY        = useRef(0);
  const lastT        = useRef(0);
  const velocity     = useRef(0);
  const dragY        = useRef(0);
  const dragging     = useRef(false);
  const axisLocked   = useRef(null);
  const rafId        = useRef(null);
  const sheetH       = useRef(0);
  const closeTimerId = useRef(null);

  // Read Hz once detector finishes
  useEffect(() => {
    onHzReady(hz => setDetectedHz(hz));
  }, []);

  // Force-FPS: start/stop rAF heartbeat + CSS animation classes
  useEffect(() => {
    if (forceFps) {
      startHeartbeat();
      sheetRef.current?.classList.add("omni-force-fps-sheet");
      backdropRef.current?.classList.add("omni-force-fps-backdrop");
    } else {
      stopHeartbeat();
      sheetRef.current?.classList.remove("omni-force-fps-sheet");
      backdropRef.current?.classList.remove("omni-force-fps-backdrop");
    }
    return () => {
      // Always clean up on unmount — never leak the heartbeat
      stopHeartbeat();
    };
  }, [forceFps]);

  // Double-rAF entry: ensures browser has painted before first animated frame
  useEffect(() => {
    let id2 = null;
    const id1 = requestAnimationFrame(() => {
      id2 = requestAnimationFrame(() => setMounted(true));
    });
    return () => {
      cancelAnimationFrame(id1);
      if (id2 !== null) cancelAnimationFrame(id2);
    };
  }, []);

  useEffect(() => {
    return () => {
      if (rafId.current)        cancelAnimationFrame(rafId.current);
      if (closeTimerId.current) clearTimeout(closeTimerId.current);
    };
  }, []);

  useEffect(() => {
    if (sheetRef.current) sheetH.current = sheetRef.current.offsetHeight;
  }, [mounted]);

  // ── Native touch — compositor thread, zero React re-renders during drag ──────

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

    if (!dragging.current && rawDy > 3) {
      const listAtTop = !listRef.current || listRef.current.scrollTop < 4;
      if (!listAtTop) return;
      dragging.current = true;
      if (sheetRef.current) {
        sheetRef.current.style.transition = "none";
        sheetRef.current.style.willChange = "transform";
        // Temporarily remove the CSS animation so explicit transform wins
        sheetRef.current.classList.remove("omni-force-fps-sheet");
        // ✨ PERF: Suspend expensive 64px blur during gesture.
        // The GPU must re-composite the blur every frame while transform changes —
        // this is the single biggest cause of sub-60fps drag. Restore after snap.
        sheetRef.current.style.backdropFilter = "none";
        sheetRef.current.style.webkitBackdropFilter = "none";
      }
    }
    if (!dragging.current) return;

    const dt = e.timeStamp - lastT.current;
    if (dt > 0) velocity.current = (y - lastY.current) / dt;
    lastY.current = y;
    lastT.current = e.timeStamp;

    // Rubber-band resistance on upward pull
    const translated = rawDy < 0 ? rawDy * 0.06 : rawDy;
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
    const vel = velocity.current;
    const dy  = dragY.current;

    const shouldClose = dy > h * 0.28 || vel > 0.50;

    if (!sheetRef.current) return;
    sheetRef.current.style.willChange = "auto";
    // Re-apply force-fps animation after gesture ends
    if (forceFps) sheetRef.current.classList.add("omni-force-fps-sheet");

    if (shouldClose) {
      sheetRef.current.style.transition = "transform 0.26s cubic-bezier(0.4,0,1,1)";
      sheetRef.current.style.transform  = `translate3d(0,${h + 60}px,0)`;
      if (backdropRef.current) {
        backdropRef.current.style.transition = "opacity 0.24s ease";
        backdropRef.current.style.opacity    = "0";
      }
      if (closeTimerId.current) clearTimeout(closeTimerId.current);
      closeTimerId.current = setTimeout(() => { closeTimerId.current = null; onClose(); }, 260);
    } else {
      // Use the iOS-style deceleration spring for snap-back
      sheetRef.current.style.transition = "transform 0.42s cubic-bezier(0.22,1,0.36,1)";
      sheetRef.current.style.transform  = "translate3d(0,0,0)";
      if (backdropRef.current) {
        backdropRef.current.style.transition = "opacity 0.30s ease";
        backdropRef.current.style.opacity    = "1";
      }
      // ✨ PERF: Restore the blur after snap animation completes.
      // Defer slightly past the animation end so the compositor isn't doing
      // both a spring-settle AND a blur re-paint simultaneously.
      setTimeout(() => {
        if (sheetRef.current) {
          sheetRef.current.style.backdropFilter = "blur(64px) saturate(240%)";
          sheetRef.current.style.webkitBackdropFilter = "blur(64px) saturate(240%)";
        }
      }, 460);
    }
  }, [onClose, forceFps]);

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
      <style>{DRAWER_CSS}</style>

      {/* GPU-composited backdrop — own layer, opacity-only animation */}
      <div
        ref={backdropRef}
        onClick={onClose}
        style={{
          position: "fixed", inset: 0, zIndex: 90,
          background: "rgba(0,0,0,0.55)",
          backdropFilter: "blur(14px)",
          WebkitBackdropFilter: "blur(14px)",
          opacity: mounted ? 1 : 0,
          transition: mounted ? "opacity 0.22s ease" : "none",
          willChange: "opacity",
          transform: "translateZ(0)",
          contain: "strict",
        }}
      />

      {/* Sheet */}
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
          transform: mounted ? "translate3d(0,0,0)" : "translate3d(0,100%,0)",
          transition: mounted
            ? "transform 0.42s cubic-bezier(0.32,0.72,0,1)"
            : "none",
          willChange: "transform",
          contain: "layout style paint",
        }}
      >
        {/* Top glow line */}
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
          transform: "translateZ(0)",
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
            marginBottom: 14, gap: 10,
          }}>
            {/* Title */}
            <div style={{ flex: 1, minWidth: 0 }}>
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

            {/* Force FPS pill */}
            <FpsPill
              detectedHz={detectedHz}
              forced={forceFps}
              onToggle={() => setForceFps(f => !f)}
            />

            {/* Close */}
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
                flexShrink: 0,
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
              // Isolate horizontal scroll from vertical swipe detection
              touchAction: "pan-x",
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

        {/* App grid — momentum scroll, GPU layer, no React overhead during scroll */}
        <div ref={listRef} style={{
          flex: 1, overflowY: "auto", overflowX: "hidden",
          WebkitOverflowScrolling: "touch",
          padding: "0 12px 64px",
          scrollbarWidth: "none", msOverflowStyle: "none",
          overscrollBehavior: "contain",
          // Vertical pan only so horizontal swipe can't escape
          touchAction: "pan-y",
          transform: "translateZ(0)",
          contain: "content",
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
                  willChange: "contents",
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
