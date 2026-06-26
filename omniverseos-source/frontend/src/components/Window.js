import React, { useState, useEffect, useCallback, memo } from "react";
import { motion, useMotionValue, animate } from "framer-motion";
import { useOS } from "../context/OSContext";
import { getApp } from "../lib/apps";
import ErrorBoundary from "./ErrorBoundary";
import { useBreakpoint } from "../hooks/useBreakpoint";

/* ── Hex window controls (desktop only) ─────────────────────────────────────── */

const HEX_CLIP     = "polygon(25% 0%, 75% 0%, 100% 50%, 75% 100%, 25% 100%, 0% 50%)";
const HEX_STYLE_ID = "omni-hex-btn-styles";

function injectHexStyles() {
  if (typeof document === "undefined" || document.getElementById(HEX_STYLE_ID)) return;
  const el = document.createElement("style");
  el.id = HEX_STYLE_ID;
  el.textContent = "@keyframes omni-hex-scan { from { background-position-x: 0 } to { background-position-x: 16px } }";
  document.head.appendChild(el);
}
injectHexStyles();

const HexBtn = memo(function HexBtn({ color, icon, label, testId, onClick }) {
  const [hovered, setHovered] = useState(false);
  const rgba =
    color === "#FF003C" ? "255,0,60" :
    color === "#FCEE09" ? "252,238,9" :
    "0,240,255";
  return (
    <button
      data-testid={testId}
      onClick={onClick}
      onMouseEnter={() => setHovered(true)}
      onMouseLeave={() => setHovered(false)}
      title={label}
      style={{
        position: "relative", width: 22, height: 22,
        background: "transparent", border: "none", cursor: "pointer", padding: 0,
        filter: hovered ? `drop-shadow(0 0 5px ${color}) drop-shadow(0 0 10px ${color}88)` : "none",
        transition: "filter 0.18s ease",
      }}
    >
      <div style={{ position: "absolute", inset: 0, clipPath: HEX_CLIP, background: hovered ? color : `rgba(${rgba},0.18)`, transition: "background 0.18s ease" }} />
      <div style={{ position: "absolute", inset: 1.5, clipPath: HEX_CLIP, background: hovered ? "rgba(0,0,0,0.40)" : "rgba(5,5,10,0.90)", transition: "background 0.18s ease" }} />
      {hovered && <div style={{ position: "absolute", inset: 0, clipPath: HEX_CLIP, background: "repeating-linear-gradient(90deg, transparent, transparent 3px, rgba(255,255,255,0.04) 3px, rgba(255,255,255,0.04) 4px)", backgroundSize: "16px 100%", animation: "omni-hex-scan 0.6s linear infinite" }} />}
      <div style={{ position: "absolute", inset: 0, display: "flex", alignItems: "center", justifyContent: "center", fontSize: 9, fontWeight: 700, color: hovered ? "#000" : color, fontFamily: "monospace", lineHeight: 1, transition: "color 0.18s ease", zIndex: 2, userSelect: "none" }}>
        {icon}
      </div>
    </button>
  );
});

/* ── Mobile native header ────────────────────────────────────────────────────── */
// stopPropagation on pointerDown prevents the parent drag from capturing button taps

const MobileHeader = memo(function MobileHeader({ app, onClose }) {
  return (
    <div
      onPointerDown={(e) => e.stopPropagation()}
      onTouchStart={(e) => e.stopPropagation()}
      style={{
        height: 54,
        minHeight: 54,
        display: "flex",
        alignItems: "center",
        padding: "0 4px",
        borderBottom: "1px solid rgba(255,255,255,0.10)",
        background: "rgba(5,5,14,0.80)",
        position: "relative",
        flexShrink: 0,
        zIndex: 10,
      }}
    >
      {/* ← Back */}
      <button
        onClick={onClose}
        style={{
          width: 52, height: 52,
          display: "flex", alignItems: "center", justifyContent: "center",
          background: "transparent", border: "none", cursor: "pointer",
          color: "#00F0FF", fontSize: 18, zIndex: 2,
          WebkitTapHighlightColor: "transparent",
          touchAction: "manipulation",
          flexShrink: 0,
        }}
      >
        <i className="fa-solid fa-chevron-left" />
      </button>

      {/* App name — centered absolutely so both buttons sit at edges */}
      <div style={{
        position: "absolute", left: 0, right: 0, top: 0, bottom: 0,
        display: "flex", alignItems: "center", justifyContent: "center",
        gap: 8, pointerEvents: "none",
      }}>
        <i
          className={`fa-solid ${app.icon}`}
          style={{ color: app.color, fontSize: 14, filter: `drop-shadow(0 0 5px ${app.color})` }}
        />
        <span style={{
          fontSize: 15, fontWeight: 700,
          fontFamily: "'Outfit', sans-serif",
          color: "#ffffff",
          letterSpacing: "0.01em",
          maxWidth: "52vw",
          overflow: "hidden", textOverflow: "ellipsis", whiteSpace: "nowrap",
        }}>
          {app.name}
        </span>
      </div>

      {/* ✕ Close */}
      <button
        onClick={onClose}
        style={{
          width: 52, height: 52,
          display: "flex", alignItems: "center", justifyContent: "center",
          background: "rgba(255,0,60,0.10)",
          border: "1px solid rgba(255,0,60,0.25)",
          borderRadius: 12,
          cursor: "pointer",
          color: "#FF003C", fontSize: 18, zIndex: 2,
          marginLeft: "auto",
          WebkitTapHighlightColor: "transparent",
          touchAction: "manipulation",
          flexShrink: 0,
        }}
      >
        <i className="fa-solid fa-xmark" />
      </button>
    </div>
  );
});

/* ── Suspense fallback ────────────────────────────────────────────────────────── */
function LoadingModule() {
  return (
    <div className="w-full h-full flex flex-col items-center justify-center gap-3">
      <div style={{ display: "flex", gap: 4, alignItems: "flex-end", height: 20 }}>
        {[0, 1, 2, 3, 4].map((i) => (
          <div
            key={i}
            style={{
              width: 3, borderRadius: 2,
              background: "#00F0FF",
              opacity: 0.6,
              animation: `moduleBar 0.7s ease-in-out ${i * 0.1}s infinite alternate`,
            }}
          />
        ))}
      </div>
      <div className="font-mono text-[10px] tracking-[0.18em] text-[#00F0FF]/40 uppercase animate-pulse">
        Loading module…
      </div>
    </div>
  );
}

/* ── Window ──────────────────────────────────────────────────────────────────── */

export default function Window({ win, children }) {
  const { closeWindow, focusWindow, updateWindow, toggleMaximize, minimize, activeId } = useOS();
  const app      = getApp(win.app);
  const isActive = activeId === win.id;
  const { isMobile } = useBreakpoint();

  const [viewport, setViewport] = useState({ w: window.innerWidth, h: window.innerHeight });

  useEffect(() => {
    let timer;
    const handleResize = () => {
      clearTimeout(timer);
      timer = setTimeout(() => setViewport({ w: window.innerWidth, h: window.innerHeight }), 100);
    };
    window.addEventListener("resize", handleResize, { passive: true });
    return () => { window.removeEventListener("resize", handleResize); clearTimeout(timer); };
  }, []);

  /* ── Swipe-to-close: ONE MotionValue, no transform conflicts ─────────────
     We only use swipeY to drive the drag y-position.
     Entrance / exit visuals are handled purely by Framer Motion's
     initial / animate / exit props — no competing useTransform.           */
  const swipeY = useMotionValue(0);

  const handleSwipeEnd = useCallback((_, info) => {
    if (info.offset.y > 90 || info.velocity.y > 600) {
      closeWindow(win.id);
    } else {
      animate(swipeY, 0, { type: "spring", damping: 30, stiffness: 380 });
    }
  // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [win.id]);

  const handleClose = useCallback(() => closeWindow(win.id), [closeWindow, win.id]);

  if (win.minimized) return null;

  /* ── Geometry ──────────────────────────────────────────────────────────── */
  const topPad    = isMobile ? 60 : 56;
  const bottomPad = isMobile ? 80 : 96;
  const availH    = viewport.h - topPad - bottomPad;

  let animX, animY, animW, animH, dragEnabled;

  if (isMobile) {
    animX = 0; animY = 0;
    animW = viewport.w; animH = availH;
    dragEnabled = false;
  } else if (win.maximized) {
    animX = 8; animY = 0;
    animW = viewport.w - 16; animH = viewport.h - 96;
    dragEnabled = false;
  } else {
    animX = win.x; animY = win.y;
    animW = win.w; animH = win.h;
    dragEnabled = true;
  }

  /* ── App accent color for focus ring ───────────────────────────────────── */
  const accentColor = app?.color || "#00F0FF";

  /* ══ MOBILE ════════════════════════════════════════════════════════════════ */
  if (isMobile) {
    return (
      <motion.div
        key={win.id}
        initial={{ opacity: 0, y: 56, scale: 0.96 }}
        animate={{ opacity: 1, y: 0,  scale: 1    }}
        exit={{
          opacity: 0, y: 64, scale: 0.94,
          transition: {
            duration: 0.20,
            ease: [0.4, 0, 0.8, 0],
          },
        }}
        transition={{
          type: "spring",
          damping: 28,
          stiffness: 380,
          mass: 0.40,
          opacity: { duration: 0.14, ease: "easeOut" },
        }}
        drag="y"
        dragConstraints={{ top: 0, bottom: 0 }}
        dragElastic={{ top: 0, bottom: 0.35 }}
        dragMomentum={false}
        onDragEnd={handleSwipeEnd}
        onTouchStart={() => !isActive && focusWindow(win.id)}
        data-testid={`window-${win.app}`}
        className="glass overflow-hidden"
        style={{
          position: "absolute",
          top: 0, left: 0,
          width: animW,
          height: animH,
          zIndex: win.z,
          willChange: "transform, opacity",
          display: "flex",
          flexDirection: "column",
          borderRadius: 0,
          // Active focus ring with app accent
          boxShadow: isActive
            ? `inset 0 0 0 1px ${accentColor}30, 0 0 0 1px rgba(255,255,255,0.04)`
            : "inset 0 0 0 1px rgba(255,255,255,0.04)",
          transition: "box-shadow 0.2s ease",
        }}
      >
        {/* Drag-pill — purely decorative */}
        <div
          style={{
            position: "absolute", top: 7, left: "50%",
            transform: "translateX(-50%)",
            width: 38, height: 4, borderRadius: 2,
            background: "rgba(255,255,255,0.20)",
            zIndex: 20, pointerEvents: "none",
          }}
        />

        {/* Native header */}
        <MobileHeader app={app} onClose={handleClose} />

        {/* App content */}
        <div style={{ flex: 1, overflow: "hidden", minHeight: 0 }}>
          <ErrorBoundary>
            <React.Suspense fallback={<LoadingModule />}>
              {children}
            </React.Suspense>
          </ErrorBoundary>
        </div>
      </motion.div>
    );
  }

  /* ══ DESKTOP / TABLET ══════════════════════════════════════════════════════ */
  return (
    <motion.div
      key={win.id}
      initial={{ opacity: 0, scale: 0.94, x: animX, y: animY + 16, width: animW, height: animH }}
      animate={{ opacity: 1, scale: 1,    x: animX, y: animY,      width: animW, height: animH }}
      exit={{
        opacity: 0, scale: 0.92, y: animY + 12,
        transition: {
          duration: 0.18,
          ease: [0.4, 0, 0.8, 0],
          opacity: { duration: 0.12 },
        },
      }}
      transition={{
        type: "spring",
        damping: 24,
        stiffness: 340,
        mass: 0.50,
        opacity: { duration: 0.16, ease: "easeOut" },
        scale: { type: "spring", damping: 24, stiffness: 340 },
      }}
      drag={dragEnabled}
      dragHandle={dragEnabled ? ".window-handle" : undefined}
      dragMomentum={false}
      dragConstraints={dragEnabled ? {
        top: 0, left: -win.w + 100,
        right: viewport.w - 100, bottom: viewport.h - 100,
      } : false}
      onDragEnd={(_, info) => {
        if (!dragEnabled) return;
        updateWindow(win.id, { x: win.x + info.offset.x, y: win.y + info.offset.y });
      }}
      onMouseDown={() => !isActive && focusWindow(win.id)}
      onTouchStart={() => !isActive && focusWindow(win.id)}
      className="absolute glass overflow-hidden rounded-2xl"
      style={{
        zIndex: win.z,
        top: 0, left: 0,
        willChange: "transform, opacity",
        // Active window gets a coloured focus ring using the app's accent
        boxShadow: isActive
          ? `0 0 0 1px ${accentColor}30, 0 32px 80px rgba(0,0,0,0.55), 0 0 60px rgba(0,0,0,0.3), inset 0 1px 0 rgba(255,255,255,0.05)`
          : "0 0 0 1px rgba(255,255,255,0.07), 0 16px 40px rgba(0,0,0,0.4), inset 0 1px 0 rgba(255,255,255,0.04)",
        transition: "box-shadow 0.25s ease",
      }}
      data-testid={`window-${win.app}`}
    >
      {/* Desktop title bar */}
      <div
        className="window-handle h-11 flex items-center justify-between px-3 border-b border-white/10 flex-shrink-0"
        style={{
          cursor: dragEnabled ? "grab" : "default",
          background: isActive
            ? `linear-gradient(to bottom, rgba(255,255,255,0.04), rgba(255,255,255,0.02))`
            : "rgba(255,255,255,0.02)",
          transition: "background 0.2s ease",
        }}
      >
        <div className="flex items-center gap-2">
          <HexBtn testId={`window-close-${win.app}`} onClick={(e) => { e.stopPropagation(); closeWindow(win.id); }}      color="#FF003C" icon="✕" label="Close" />
          <HexBtn testId={`window-min-${win.app}`}   onClick={(e) => { e.stopPropagation(); minimize(win.id); }}          color="#FCEE09" icon="−" label="Minimize" />
          <HexBtn testId={`window-max-${win.app}`}   onClick={(e) => { e.stopPropagation(); toggleMaximize(win.id); }}    color="#39FF14" icon="⤡" label="Maximize" />
        </div>

        <div className="flex items-center gap-2 text-xs">
          <i className={`fa-solid ${app.icon}`} style={{ color: app.color, filter: `drop-shadow(0 0 4px ${app.color}60)` }} />
          <span className="font-mono uppercase tracking-widest text-slate-300 truncate max-w-[140px] sm:max-w-none">{app.name}</span>
        </div>

        <div className="w-16" />
      </div>

      <div className="w-full h-[calc(100%-44px)] overflow-hidden">
        <ErrorBoundary>
          <React.Suspense fallback={<LoadingModule />}>
            {children}
          </React.Suspense>
        </ErrorBoundary>
      </div>
    </motion.div>
  );
}
