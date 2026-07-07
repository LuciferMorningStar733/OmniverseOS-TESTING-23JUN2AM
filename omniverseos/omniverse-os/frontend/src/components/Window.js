import React, { useState, useEffect, useCallback, useRef, memo } from "react";
import { motion, useMotionValue, animate, AnimatePresence } from "framer-motion";
import { useOS } from "../context/OSContext";
import { getApp } from "../lib/apps";
import ErrorBoundary from "./ErrorBoundary";
import { useBreakpoint } from "../hooks/useBreakpoint";

/* ── Design tokens ────────────────────────────────────────────────────────── */
const SHADOW_ACTIVE   = (c) => `0 0 0 1px ${c}22, 0 32px 80px rgba(0,0,0,0.60), 0 8px 32px rgba(0,0,0,0.40), inset 0 1px 0 rgba(255,255,255,0.06)`;
const SHADOW_INACTIVE = `0 0 0 1px rgba(255,255,255,0.07), 0 16px 48px rgba(0,0,0,0.45), 0 4px 16px rgba(0,0,0,0.30), inset 0 1px 0 rgba(255,255,255,0.03)`;
const BLUR            = "blur(32px) saturate(180%)";

const MIN_W = 340;
const MIN_H = 220;
const SNAP_THRESHOLD = 18;

/* ── Hex window controls ─────────────────────────────────────────────────── */
const HEX_CLIP     = "polygon(25% 0%, 75% 0%, 100% 50%, 75% 100%, 25% 100%, 0% 50%)";
const HEX_STYLE_ID = "omni-hex-btn-styles";

function injectHexStyles() {
  if (typeof document === "undefined" || document.getElementById(HEX_STYLE_ID)) return;
  const el = document.createElement("style");
  el.id = HEX_STYLE_ID;
  el.textContent = `
    @keyframes omni-hex-scan {
      from { background-position-x: 0 }
      to   { background-position-x: 16px }
    }
    @keyframes omni-win-module-bar {
      from { height: 4px; opacity: 0.4; }
      to   { height: 14px; opacity: 1; }
    }
  `;
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
        filter: hovered
          ? `drop-shadow(0 0 6px ${color}) drop-shadow(0 0 12px ${color}66)`
          : "none",
        transition: "filter 0.15s ease",
        transform: hovered ? "scale(1.12)" : "scale(1)",
      }}
    >
      <div style={{
        position: "absolute", inset: 0, clipPath: HEX_CLIP,
        background: hovered ? color : `rgba(${rgba},0.18)`,
        transition: "background 0.15s ease",
      }} />
      <div style={{
        position: "absolute", inset: 1.5, clipPath: HEX_CLIP,
        background: hovered ? "rgba(0,0,0,0.40)" : "rgba(5,5,10,0.90)",
        transition: "background 0.15s ease",
      }} />
      {hovered && (
        <div style={{
          position: "absolute", inset: 0, clipPath: HEX_CLIP,
          background: "repeating-linear-gradient(90deg, transparent, transparent 3px, rgba(255,255,255,0.04) 3px, rgba(255,255,255,0.04) 4px)",
          backgroundSize: "16px 100%",
          animation: "omni-hex-scan 0.6s linear infinite",
        }} />
      )}
      <div style={{
        position: "absolute", inset: 0,
        display: "flex", alignItems: "center", justifyContent: "center",
        fontSize: 9, fontWeight: 700,
        color: hovered ? "#000" : color,
        fontFamily: "monospace", lineHeight: 1,
        transition: "color 0.15s ease",
        zIndex: 2, userSelect: "none",
      }}>
        {icon}
      </div>
    </button>
  );
});

/* ── Mobile native header ────────────────────────────────────────────────── */
const MobileHeader = memo(function MobileHeader({ app, onClose }) {
  return (
    <div
      onPointerDown={(e) => e.stopPropagation()}
      onTouchStart={(e) => e.stopPropagation()}
      style={{
        height: 54, minHeight: 54,
        display: "flex", alignItems: "center",
        padding: "0 4px",
        borderBottom: "1px solid rgba(255,255,255,0.10)",
        background: "rgba(5,5,14,0.80)",
        position: "relative", flexShrink: 0, zIndex: 10,
      }}
    >
      <button
        onClick={onClose}
        style={{
          width: 52, height: 52,
          display: "flex", alignItems: "center", justifyContent: "center",
          background: "transparent", border: "none", cursor: "pointer",
          color: "#00F0FF", fontSize: 18, zIndex: 2,
          WebkitTapHighlightColor: "transparent",
          touchAction: "manipulation", flexShrink: 0,
          transition: "opacity 0.15s",
        }}
      >
        <i className="fa-solid fa-chevron-left" />
      </button>

      <div style={{
        position: "absolute", left: 0, right: 0, top: 0, bottom: 0,
        display: "flex", alignItems: "center", justifyContent: "center",
        gap: 8, pointerEvents: "none",
      }}>
        <i
          className={`fa-solid ${app.icon}`}
          style={{ color: app.color, fontSize: 14, filter: `drop-shadow(0 0 6px ${app.color})` }}
        />
        <span style={{
          fontSize: 15, fontWeight: 700,
          fontFamily: "'Outfit', sans-serif",
          color: "#ffffff", letterSpacing: "0.01em",
          maxWidth: "52vw",
          overflow: "hidden", textOverflow: "ellipsis", whiteSpace: "nowrap",
        }}>
          {app.name}
        </span>
      </div>

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
          touchAction: "manipulation", flexShrink: 0,
          transition: "background 0.15s, box-shadow 0.15s",
        }}
        onMouseEnter={(e) => {
          e.currentTarget.style.background = "rgba(255,0,60,0.22)";
          e.currentTarget.style.boxShadow = "0 0 12px rgba(255,0,60,0.3)";
        }}
        onMouseLeave={(e) => {
          e.currentTarget.style.background = "rgba(255,0,60,0.10)";
          e.currentTarget.style.boxShadow = "none";
        }}
      >
        <i className="fa-solid fa-xmark" />
      </button>
    </div>
  );
});

/* ── Loading fallback ────────────────────────────────────────────────────── */
function LoadingModule() {
  return (
    <div className="w-full h-full flex flex-col items-center justify-center gap-3">
      <div style={{ display: "flex", gap: 5, alignItems: "flex-end", height: 18 }}>
        {[0, 1, 2, 3, 4].map((i) => (
          <div
            key={i}
            style={{
              width: 3, borderRadius: 2,
              background: "linear-gradient(to top, #00F0FF44, #00F0FF)",
              animation: `omni-win-module-bar 0.65s ease-in-out ${i * 0.1}s infinite alternate`,
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

/* ── Resize handles (desktop only) ──────────────────────────────────────── */
const RESIZE_HANDLES = [
  { dir: "n",  style: { top: 0, left: 8, right: 8, height: 6 },          cursor: "n-resize"  },
  { dir: "s",  style: { bottom: 0, left: 8, right: 8, height: 6 },       cursor: "s-resize"  },
  { dir: "e",  style: { right: 0, top: 8, bottom: 8, width: 6 },         cursor: "e-resize"  },
  { dir: "w",  style: { left: 0, top: 8, bottom: 8, width: 6 },          cursor: "w-resize"  },
  { dir: "ne", style: { top: 0, right: 0, width: 14, height: 14 },       cursor: "ne-resize" },
  { dir: "nw", style: { top: 0, left: 0, width: 14, height: 14 },        cursor: "nw-resize" },
  { dir: "se", style: { bottom: 0, right: 0, width: 14, height: 14 },    cursor: "se-resize" },
  { dir: "sw", style: { bottom: 0, left: 0, width: 14, height: 14 },     cursor: "sw-resize" },
];

function ResizeHandles({ win, updateWindow, dragEnabled }) {
  const resizeRef = useRef(null);

  const startResize = useCallback((e, dir) => {
    e.preventDefault();
    e.stopPropagation();
    e.currentTarget.setPointerCapture(e.pointerId);
    resizeRef.current = {
      dir,
      startX: e.clientX, startY: e.clientY,
      startW: win.w, startH: win.h,
      startWinX: win.x, startWinY: win.y,
    };
  }, [win]);

  const onPointerMove = useCallback((e, dir) => {
    if (!resizeRef.current || resizeRef.current.dir !== dir) return;
    const { startX, startY, startW, startH, startWinX, startWinY } = resizeRef.current;
    const dx = e.clientX - startX;
    const dy = e.clientY - startY;
    let newW = startW, newH = startH, newX = startWinX, newY = startWinY;

    if (dir.includes("e")) newW = Math.max(MIN_W, startW + dx);
    if (dir.includes("s")) newH = Math.max(MIN_H, startH + dy);
    if (dir.includes("w")) { newW = Math.max(MIN_W, startW - dx); newX = startWinX + startW - newW; }
    if (dir.includes("n")) { newH = Math.max(MIN_H, startH - dy); newY = startWinY + startH - newH; }

    updateWindow(win.id, { w: Math.round(newW), h: Math.round(newH), x: Math.round(newX), y: Math.round(newY) });
  }, [win.id, updateWindow]);

  const endResize = useCallback(() => {
    resizeRef.current = null;
  }, []);

  if (!dragEnabled) return null;

  return (
    <>
      {RESIZE_HANDLES.map(({ dir, style, cursor }) => (
        <div
          key={dir}
          style={{
            position: "absolute", zIndex: 20, cursor,
            ...style,
          }}
          onPointerDown={(e) => startResize(e, dir)}
          onPointerMove={(e) => onPointerMove(e, dir)}
          onPointerUp={endResize}
          onPointerCancel={endResize}
        />
      ))}
    </>
  );
}

/* ── Snap helper ─────────────────────────────────────────────────────────── */
function snapPosition(x, y, w, h, viewW, viewH) {
  let nx = x, ny = y;
  if (Math.abs(x) < SNAP_THRESHOLD)           nx = 0;
  if (Math.abs(y) < SNAP_THRESHOLD)           ny = 0;
  if (Math.abs(x + w - viewW) < SNAP_THRESHOLD) nx = viewW - w;
  if (Math.abs(y + h - viewH) < SNAP_THRESHOLD) ny = viewH - h;
  return { nx, ny };
}

/* ── Window ──────────────────────────────────────────────────────────────── */
export default function Window({ win, children }) {
  const { closeWindow, focusWindow, updateWindow, toggleMaximize, minimize, activeId } = useOS();
  const app      = getApp(win.app);
  const isActive = activeId === win.id;
  const { isMobile } = useBreakpoint();

  const [viewport, setViewport] = useState({ w: window.innerWidth, h: window.innerHeight });
  const [isDragging, setIsDragging] = useState(false);

  useEffect(() => {
    let timer;
    const handleResize = () => {
      clearTimeout(timer);
      timer = setTimeout(() => setViewport({ w: window.innerWidth, h: window.innerHeight }), 100);
    };
    window.addEventListener("resize", handleResize, { passive: true });
    return () => { window.removeEventListener("resize", handleResize); clearTimeout(timer); };
  }, []);

  /* ── Swipe-to-close (mobile) ─────────────────────────────────────────── */
  const swipeY = useMotionValue(0);

  const handleSwipeEnd = useCallback((_, info) => {
    if (info.offset.y > 90 || info.velocity.y > 600) {
      closeWindow(win.id);
    } else {
      animate(swipeY, 0, { type: "spring", damping: 30, stiffness: 380 });
    }
  }, [win.id, swipeY, closeWindow]);

  const handleClose    = useCallback(() => closeWindow(win.id),    [closeWindow, win.id]);
  const handleMinimize = useCallback(() => minimize(win.id),       [minimize, win.id]);
  const handleMaximize = useCallback(() => toggleMaximize(win.id), [toggleMaximize, win.id]);
  const handleFocus    = useCallback(() => { if (!isActive) focusWindow(win.id); }, [isActive, focusWindow, win.id]);

  if (win.minimized) return null;

  /* ── Geometry ────────────────────────────────────────────────────────── */
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

  const accentColor = app?.color || "#00F0FF";

  /* ══ MOBILE ══════════════════════════════════════════════════════════════ */
  if (isMobile) {
    return (
      <motion.div
        key={win.id}
        initial={{ opacity: 0, y: 56, scale: 0.96 }}
        animate={{ opacity: 1, y: 0, scale: 1 }}
        exit={{
          opacity: 0, y: 60, scale: 0.94,
          transition: { duration: 0.18, ease: [0.4, 0, 0.8, 0] },
        }}
        transition={{
          type: "spring", damping: 28, stiffness: 380, mass: 0.40,
          opacity: { duration: 0.14, ease: "easeOut" },
        }}
        drag="y"
        dragConstraints={{ top: 0, bottom: 0 }}
        dragElastic={{ top: 0, bottom: 0.35 }}
        dragMomentum={false}
        onDragEnd={handleSwipeEnd}
        onTouchStart={handleFocus}
        data-testid={`window-${win.app}`}
        className="glass overflow-hidden"
        style={{
          position: "absolute",
          top: 0, left: 0,
          width: animW, height: animH,
          zIndex: win.z,
          willChange: "transform, opacity",
          display: "flex", flexDirection: "column",
          borderRadius: 0,
          boxShadow: isActive
            ? `inset 0 0 0 1px ${accentColor}22, 0 0 0 1px rgba(255,255,255,0.04)`
            : "inset 0 0 0 1px rgba(255,255,255,0.04)",
          transition: "box-shadow 0.22s ease",
        }}
      >
        <div style={{
          position: "absolute", top: 7, left: "50%",
          transform: "translateX(-50%)",
          width: 36, height: 4, borderRadius: 2,
          background: "rgba(255,255,255,0.22)",
          zIndex: 20, pointerEvents: "none",
        }} />

        <MobileHeader app={app} onClose={handleClose} />

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

  /* ══ DESKTOP / TABLET ════════════════════════════════════════════════════ */
  return (
    <motion.div
      key={win.id}
      initial={{ opacity: 0, scale: 0.90, x: animX, y: animY + 20, width: animW, height: animH }}
      animate={{ opacity: 1, scale: 1,    x: animX, y: animY,       width: animW, height: animH }}
      exit={{
        opacity: 0, scale: 0.88, y: animY + 14,
        transition: {
          duration: 0.16, ease: [0.4, 0, 0.8, 0],
          opacity: { duration: 0.10 },
        },
      }}
      transition={{
        type: "spring", damping: 26, stiffness: 360, mass: 0.45,
        opacity: { duration: 0.14, ease: "easeOut" },
        scale: { type: "spring", damping: 26, stiffness: 360 },
        /* Instant commit after drag — no spring bounce on position */
        x: isDragging ? { type: "tween", duration: 0 } : { type: "spring", damping: 26, stiffness: 360 },
        y: isDragging ? { type: "tween", duration: 0 } : { type: "spring", damping: 26, stiffness: 360 },
        width:  { type: "spring", damping: 28, stiffness: 280 },
        height: { type: "spring", damping: 28, stiffness: 280 },
      }}
      drag={dragEnabled}
      dragHandle={dragEnabled ? ".window-handle" : undefined}
      dragMomentum={false}
      dragElastic={0}
      dragConstraints={dragEnabled ? {
        top: 0, left: -win.w + 120,
        right: viewport.w - 120, bottom: viewport.h - 60,
      } : false}
      onDragStart={() => setIsDragging(true)}
      onDragEnd={(_, info) => {
        if (!dragEnabled) return;
        const rawX = win.x + info.offset.x;
        const rawY = win.y + info.offset.y;
        const { nx, ny } = snapPosition(rawX, rawY, win.w, win.h, viewport.w, viewport.h);
        updateWindow(win.id, { x: Math.round(nx), y: Math.round(ny) });
        /* Tiny delay to let animate commit before re-enabling spring */
        setTimeout(() => setIsDragging(false), 32);
      }}
      onMouseDown={handleFocus}
      onTouchStart={handleFocus}
      className="absolute overflow-hidden rounded-2xl"
      style={{
        zIndex: win.z,
        top: 0, left: 0,
        willChange: "transform, opacity",
        boxShadow: isActive ? SHADOW_ACTIVE(accentColor) : SHADOW_INACTIVE,
        backdropFilter: BLUR,
        WebkitBackdropFilter: BLUR,
        background: "rgba(8,10,18,0.55)",
        border: `1px solid ${isActive ? `${accentColor}18` : "rgba(255,255,255,0.07)"}`,
        transition: "box-shadow 0.25s ease, border-color 0.25s ease",
      }}
      data-testid={`window-${win.app}`}
    >
      {/* Desktop title bar */}
      <div
        className="window-handle h-11 flex items-center justify-between px-3 border-b flex-shrink-0"
        style={{
          cursor: isDragging ? "grabbing" : dragEnabled ? "grab" : "default",
          background: isActive
            ? `linear-gradient(to bottom, rgba(255,255,255,0.055), rgba(255,255,255,0.02))`
            : "rgba(255,255,255,0.02)",
          borderBottomColor: isActive ? `${accentColor}14` : "rgba(255,255,255,0.08)",
          transition: "background 0.22s ease, border-color 0.22s ease",
          userSelect: "none",
        }}
        onDoubleClick={handleMaximize}
      >
        <div className="flex items-center gap-2">
          <HexBtn
            testId={`window-close-${win.app}`}
            onClick={(e) => { e.stopPropagation(); handleClose(); }}
            color="#FF003C" icon="✕" label="Close"
          />
          <HexBtn
            testId={`window-min-${win.app}`}
            onClick={(e) => { e.stopPropagation(); handleMinimize(); }}
            color="#FCEE09" icon="−" label="Minimize"
          />
          <HexBtn
            testId={`window-max-${win.app}`}
            onClick={(e) => { e.stopPropagation(); handleMaximize(); }}
            color="#39FF14" icon="⤡" label="Maximize"
          />
        </div>

        <div className="flex items-center gap-2 text-xs">
          <i
            className={`fa-solid ${app.icon}`}
            style={{
              color: app.color,
              filter: isActive
                ? `drop-shadow(0 0 5px ${app.color}80)`
                : `drop-shadow(0 0 3px ${app.color}40)`,
              transition: "filter 0.22s ease",
            }}
          />
          <span
            className="font-mono uppercase tracking-widest truncate max-w-[140px] sm:max-w-none"
            style={{
              color: isActive ? "rgba(255,255,255,0.80)" : "rgba(255,255,255,0.45)",
              fontSize: 10, letterSpacing: "0.14em",
              transition: "color 0.22s ease",
            }}
          >
            {app.name}
          </span>
        </div>

        <div className="w-16" />
      </div>

      {/* Window content */}
      <div className="w-full overflow-hidden" style={{ height: "calc(100% - 44px)" }}>
        <ErrorBoundary>
          <React.Suspense fallback={<LoadingModule />}>
            {children}
          </React.Suspense>
        </ErrorBoundary>
      </div>

      {/* Resize handles */}
      <ResizeHandles win={win} updateWindow={updateWindow} dragEnabled={dragEnabled} />

      {/* Active accent top glow line */}
      <AnimatePresence>
        {isActive && (
          <motion.div
            initial={{ opacity: 0, scaleX: 0 }}
            animate={{ opacity: 1, scaleX: 1 }}
            exit={{ opacity: 0, scaleX: 0 }}
            transition={{ duration: 0.22, ease: "easeOut" }}
            style={{
              position: "absolute", top: 0, left: "10%", right: "10%", height: 1,
              background: `linear-gradient(90deg, transparent, ${accentColor}60, transparent)`,
              pointerEvents: "none", zIndex: 25,
            }}
          />
        )}
      </AnimatePresence>
    </motion.div>
  );
}
