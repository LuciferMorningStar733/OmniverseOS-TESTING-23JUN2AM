import React, { useState, useEffect, useCallback, useRef, memo } from "react";
import { motion, useMotionValue, animate, AnimatePresence } from "framer-motion";
import { useOS } from "../context/OSContext";
import { getApp } from "../lib/apps";
import ErrorBoundary from "./ErrorBoundary";
import { useBreakpoint } from "../hooks/useBreakpoint";

/* ── Design tokens ────────────────────────────────────────────────────────── */
const SHADOW_ACTIVE = (c) =>
  `0 0 0 1px ${c}28, 0 4px 12px rgba(0,0,0,0.35), 0 24px 60px rgba(0,0,0,0.65), 0 48px 100px rgba(0,0,0,0.40), inset 0 1px 0 rgba(255,255,255,0.08), inset 0 -1px 0 rgba(0,0,0,0.20)`;
const SHADOW_INACTIVE =
  `0 0 0 1px rgba(255,255,255,0.06), 0 4px 8px rgba(0,0,0,0.25), 0 12px 40px rgba(0,0,0,0.45), 0 32px 64px rgba(0,0,0,0.30), inset 0 1px 0 rgba(255,255,255,0.04)`;
const BLUR = "blur(32px) saturate(180%)";

const MIN_W = 340;
const MIN_H = 220;
const SNAP_THRESHOLD = 22;
const KEEP_VISIBLE   = 90;  // px — min visible title bar width

/* ── Liquid Drag: edge-snap activation zones ─────────────────────────────── */
/* Distance from a viewport edge at which the snap PREVIEW appears.
   Below this the pointer is still freeform — the preview only commits
   on pointerup while the pointer is inside the zone. */
const EDGE_ZONE = 24;

/* Compute which snap region (if any) the pointer is currently activating.
   Returns one of: "left" | "right" | "top" | "tl" | "tr" | "bl" | "br" | null
   plus the target rect to render as the ghost preview. */
function computeSnapTarget(pointerX, pointerY, viewW, viewH, topPad, bottomPad) {
  const nearL = pointerX <= EDGE_ZONE;
  const nearR = pointerX >= viewW - EDGE_ZONE;
  const nearT = pointerY <= topPad + EDGE_ZONE;
  const nearB = pointerY >= viewH - bottomPad - EDGE_ZONE;
  const usableH = viewH - topPad - bottomPad;
  if (nearT && nearL) return { key: "tl", x: 0,           y: topPad,             w: viewW / 2, h: usableH / 2 };
  if (nearT && nearR) return { key: "tr", x: viewW / 2,   y: topPad,             w: viewW / 2, h: usableH / 2 };
  if (nearB && nearL) return { key: "bl", x: 0,           y: topPad + usableH/2, w: viewW / 2, h: usableH / 2 };
  if (nearB && nearR) return { key: "br", x: viewW / 2,   y: topPad + usableH/2, w: viewW / 2, h: usableH / 2 };
  if (nearT)          return { key: "top",   x: 0, y: topPad, w: viewW, h: usableH };  // maximize
  if (nearL)          return { key: "left",  x: 0, y: topPad, w: viewW / 2, h: usableH };
  if (nearR)          return { key: "right", x: viewW / 2, y: topPad, w: viewW / 2, h: usableH };
  return null;
}

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
    @keyframes omni-win-open {
      from { opacity: 0; transform: scale(0.88) translateY(16px); }
      to   { opacity: 1; transform: scale(1) translateY(0); }
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
      aria-label={label}
      style={{
        position: "relative", width: 22, height: 22,
        background: "transparent", border: "none", cursor: "pointer", padding: 0,
        filter: hovered
          ? `drop-shadow(0 0 6px ${color}) drop-shadow(0 0 14px ${color}66)`
          : "none",
        transition: "filter var(--transition-fast) ease, transform var(--transition-fast) cubic-bezier(0.34,1.56,0.64,1)",
        transform: hovered ? "scale(1.18)" : "scale(1)",
      }}
    >
      <div style={{
        position: "absolute", inset: 0, clipPath: HEX_CLIP,
        background: hovered ? color : `rgba(${rgba},0.18)`,
        transition: "background var(--transition-fast) ease",
      }} />
      <div style={{
        position: "absolute", inset: 1.5, clipPath: HEX_CLIP,
        background: hovered ? "rgba(0,0,0,0.40)" : "rgba(5,5,10,0.90)",
        transition: "background var(--transition-fast) ease",
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
        transition: "color var(--transition-fast) ease",
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
          display: "flex", alignItems: "center", gap: 4,
          height: 52, paddingLeft: 4, paddingRight: 8,
          background: "transparent", border: "none", cursor: "pointer",
          color: "#00F0FF", zIndex: 2,
          WebkitTapHighlightColor: "transparent",
          touchAction: "manipulation", flexShrink: 0,
          transition: "opacity var(--transition-fast)",
        }}
      >
        <i className="fa-solid fa-chevron-left" style={{ fontSize: 18 }} />
        <span style={{ fontSize: 14, fontFamily: "'Outfit', sans-serif", fontWeight: 500 }}>Back</span>
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
        aria-label="Close"
        style={{
          width: 44, height: 44,
          display: "flex", alignItems: "center", justifyContent: "center",
          background: "rgba(255,255,255,0.055)",
          border: "1px solid rgba(255,255,255,0.10)",
          borderRadius: 12,
          cursor: "pointer",
          color: "rgba(255,255,255,0.48)", zIndex: 2,
          marginLeft: "auto",
          WebkitTapHighlightColor: "transparent",
          touchAction: "manipulation", flexShrink: 0,
          transition: "background var(--transition-fast), border-color var(--transition-fast), color var(--transition-fast)",
        }}
        onPointerEnter={(e) => {
          e.currentTarget.style.background = "rgba(255,50,80,0.16)";
          e.currentTarget.style.borderColor = "rgba(255,50,80,0.35)";
          e.currentTarget.style.color = "#FF6080";
        }}
        onPointerLeave={(e) => {
          e.currentTarget.style.background = "rgba(255,255,255,0.055)";
          e.currentTarget.style.borderColor = "rgba(255,255,255,0.10)";
          e.currentTarget.style.color = "rgba(255,255,255,0.48)";
        }}
      >
        <i className="fa-solid fa-xmark" style={{ fontSize: 13 }} />
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
  { dir: "n",  style: { top: 0, left: 10, right: 10, height: 5 },          cursor: "n-resize"  },
  { dir: "s",  style: { bottom: 0, left: 10, right: 10, height: 5 },       cursor: "s-resize"  },
  { dir: "e",  style: { right: 0, top: 10, bottom: 10, width: 5 },         cursor: "e-resize"  },
  { dir: "w",  style: { left: 0, top: 10, bottom: 10, width: 5 },          cursor: "w-resize"  },
  { dir: "ne", style: { top: 0, right: 0, width: 16, height: 16 },         cursor: "ne-resize" },
  { dir: "nw", style: { top: 0, left: 0, width: 16, height: 16 },          cursor: "nw-resize" },
  { dir: "se", style: { bottom: 0, right: 0, width: 16, height: 16 },      cursor: "se-resize" },
  { dir: "sw", style: { bottom: 0, left: 0, width: 16, height: 16 },       cursor: "sw-resize" },
];

function ResizeHandles({ win, updateWindow, dragEnabled, onResizeStart, onResizeEnd, viewport, topPad, bottomPad }) {
  const resizeRef = useRef(null);
  const [activeDir, setActiveDir] = useState(null);

  const startResize = useCallback((e, dir) => {
    e.preventDefault();
    e.stopPropagation();
    /* Stop framer-motion's native pointer listeners from starting a drag */
    e.nativeEvent?.stopImmediatePropagation();
    e.currentTarget.setPointerCapture(e.pointerId);
    setActiveDir(dir);
    onResizeStart?.();
    resizeRef.current = {
      dir,
      startX: e.clientX, startY: e.clientY,
      startW: win.w, startH: win.h,
      startWinX: win.x, startWinY: win.y,
    };
  }, [win, onResizeStart]);

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

    /* Clamp to viewport so the window can never be dragged fully off-screen */
    newX = Math.max(0, Math.min(viewport.w - MIN_W, newX));
    newY = Math.max(topPad, Math.min(viewport.h - bottomPad - MIN_H, newY));
    newW = Math.min(newW, viewport.w - newX);
    newH = Math.min(newH, viewport.h - topPad - bottomPad - (newY - topPad));

    updateWindow(win.id, { w: Math.round(newW), h: Math.round(newH), x: Math.round(newX), y: Math.round(newY) });
  }, [win.id, updateWindow, viewport, topPad, bottomPad]);

  const endResize = useCallback(() => {
    resizeRef.current = null;
    setActiveDir(null);
    onResizeEnd?.();
  }, [onResizeEnd]);

  if (!dragEnabled) return null;

  return (
    <>
      {RESIZE_HANDLES.map(({ dir, style, cursor }) => (
        <div
          key={dir}
          style={{
            position: "absolute", zIndex: 20, cursor,
            ...style,
            /* Subtle glow on active resize handle */
            background: activeDir === dir ? "rgba(0,240,255,0.08)" : "transparent",
            transition: "background var(--transition-fast) ease",
            /* P14 — iPad: prevent text-selection callout on resize grips */
            userSelect: "none",
            WebkitUserSelect: "none",
            WebkitTouchCallout: "none",
            touchAction: "none",
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
function snapPosition(x, y, w, h, viewW, viewH, topPad = 56, bottomPad = 96) {
  let nx = x, ny = y;

  // Edge snaps
  if (Math.abs(x) < SNAP_THRESHOLD)               nx = 0;
  if (Math.abs(y - topPad) < SNAP_THRESHOLD)      ny = topPad;
  if (Math.abs(x + w - viewW) < SNAP_THRESHOLD)   nx = viewW - w;
  if (Math.abs(y + h - (viewH - bottomPad)) < SNAP_THRESHOLD) ny = viewH - bottomPad - h;

  // Center snap (horizontal)
  const centerX = (viewW - w) / 2;
  if (Math.abs(x - centerX) < SNAP_THRESHOLD * 1.5) nx = Math.round(centerX);

  // Half-screen snaps
  const halfW = viewW / 2;
  if (Math.abs(x + w - halfW) < SNAP_THRESHOLD * 1.2) nx = halfW - w;
  if (Math.abs(x - halfW) < SNAP_THRESHOLD * 1.2)     nx = halfW;

  return { nx, ny };
}

/* ── Clamp helper ─────────────────────────────────────────────────────────── */
function clampPosition(x, y, w, h, viewW, viewH, topPad = 56, bottomPad = 96) {
  const nx = Math.max(-(w - KEEP_VISIBLE), Math.min(viewW - KEEP_VISIBLE, x));
  const ny = Math.max(topPad, Math.min(viewH - bottomPad - 40, y));
  return { nx, ny };
}

/* ── Window ──────────────────────────────────────────────────────────────── */
export default function Window({ win, children }) {
  const { closeWindow, focusWindow, updateWindow, toggleMaximize, minimize, activeId } = useOS();
  /* Guard against stale localStorage app IDs — fall back to a safe sentinel */
  const app = getApp(win.app) ?? {
    id: win.app, name: win.app, icon: "fa-window-maximize",
    color: "#00F0FF", group: "unknown",
  };
  const isActive = activeId === win.id;
  const { isMobile, isTablet, isTouch } = useBreakpoint();

  const [viewport, setViewport] = useState({ w: window.innerWidth, h: window.innerHeight });
  const [isDragging,  setIsDragging]  = useState(false);
  const [isResizing,  setIsResizing]  = useState(false);

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

  /* ── Geometry (declared BEFORE any early return so it's safe for hooks) ── */
  const topPad    = isMobile ? 60 : isTablet ? 48 : 56;
  const bottomPad = isTouch ? 0 : 96;

  /* ── LIQUID DRAG hooks — declared unconditionally at the top level of
     the component, BEFORE any early return (win.minimized / isTouch).
     Fixes react-hooks/rules-of-hooks violation from d8ad9f1. */
  const nodeRef       = useRef(null);
  const dragRef       = useRef(null);
  const [snapTarget, setSnapTarget] = useState(null);

  const commitDragEnd = useCallback((finalX, finalY) => {
    setIsDragging(false);
    setSnapTarget(null);
    if (nodeRef.current) {
      nodeRef.current.style.transform = "";
      nodeRef.current.style.transition = "";
    }
    updateWindow(win.id, { x: Math.round(finalX), y: Math.round(finalY) });
  }, [win.id, updateWindow]);

  const onTitlebarPointerDown = useCallback((e) => {
    // Touch/mobile branch and maximized windows disable liquid drag; guard here.
    if (isTouch || win.maximized) return;
    if (e.button !== undefined && e.button !== 0) return;
    const t = e.target;
    if (t && t.closest && t.closest("button, input, textarea, [data-nodrag]")) return;
    e.preventDefault();
    if (!isActive) focusWindow(win.id);
    try { e.currentTarget.setPointerCapture(e.pointerId); } catch { /* ignore */ }
    setIsDragging(true);
    dragRef.current = {
      pointerId: e.pointerId,
      startPX: e.clientX, startPY: e.clientY,
      startWX: win.x,     startWY: win.y,
      lastPX:  e.clientX, lastPY:  e.clientY,
      raf: 0, pendingSnap: null,
    };
    if (nodeRef.current) nodeRef.current.style.transition = "none";
  }, [isTouch, win.maximized, win.id, win.x, win.y, isActive, focusWindow]);

  const onTitlebarPointerMove = useCallback((e) => {
    const s = dragRef.current;
    if (!s) return;
    s.lastPX = e.clientX;
    s.lastPY = e.clientY;
    if (s.raf) return;
    s.raf = requestAnimationFrame(() => {
      s.raf = 0;
      const cur = dragRef.current;
      if (!cur || !nodeRef.current) return;
      const dx = cur.lastPX - cur.startPX;
      const dy = cur.lastPY - cur.startPY;
      nodeRef.current.style.transform = `translate3d(${dx}px, ${dy}px, 0)`;
      const target = computeSnapTarget(cur.lastPX, cur.lastPY, viewport.w, viewport.h, topPad, bottomPad);
      cur.pendingSnap = target;
      setSnapTarget(target);
    });
  }, [viewport.w, viewport.h, topPad, bottomPad]);

  const onTitlebarPointerUp = useCallback((e) => {
    const s = dragRef.current;
    if (!s) return;
    if (s.raf) { cancelAnimationFrame(s.raf); s.raf = 0; }
    try { e.currentTarget.releasePointerCapture(s.pointerId); } catch { /* ignore */ }
    const dx = s.lastPX - s.startPX;
    const dy = s.lastPY - s.startPY;
    const rawX = s.startWX + dx;
    const rawY = s.startWY + dy;
    const savedW = win.w, savedH = win.h;
    const startWX = s.startWX, startWY = s.startWY;
    const pending = s.pendingSnap;
    dragRef.current = null;
    if (pending) {
      setIsDragging(false);
      setSnapTarget(null);
      if (nodeRef.current) {
        nodeRef.current.style.transform = "";
        nodeRef.current.style.transition = "";
      }
      updateWindow(win.id, {
        x: Math.round(pending.x), y: Math.round(pending.y),
        w: Math.round(pending.w), h: Math.round(pending.h),
        _prev: { x: startWX, y: startWY, w: savedW, h: savedH },
      });
      return;
    }
    const { nx, ny } = clampPosition(rawX, rawY, savedW, savedH, viewport.w, viewport.h, topPad, bottomPad);
    commitDragEnd(nx, ny);
  }, [commitDragEnd, viewport.w, viewport.h, topPad, bottomPad, win.id, win.w, win.h, updateWindow]);

  if (win.minimized) return null;

  /* ── Geometry ────────────────────────────────────────────────────────── */
  const availH    = viewport.h - topPad - bottomPad;

  let animX, animY, animW, animH, dragEnabled;

  if (isTouch) {
    // Phones and tablets: fullscreen windows, no drag
    animX = 0; animY = 0;
    animW = viewport.w; animH = availH;
    dragEnabled = false;
  } else if (win.maximized) {
    animX = 8; animY = topPad;
    animW = viewport.w - 16; animH = viewport.h - topPad - 8;
    dragEnabled = false;
  } else {
    animX = win.x; animY = win.y;
    animW = win.w; animH = win.h;
    dragEnabled = true;
  }

  const accentColor = app?.color || "#00F0FF";

  /* ── Tight drag constraints: always keep title bar accessible ──────── */
  /* Framer drag constraints are max pixel offsets from the element's origin.
     min visible x = -(win.w - KEEP_VISIBLE)  →  offset_left  = -(win.w - KEEP_VISIBLE) - win.x
     max visible x = viewport.w - KEEP_VISIBLE →  offset_right = viewport.w - KEEP_VISIBLE - win.x  */
  const dragConstraints = dragEnabled ? {
    top:    topPad - win.y,                          // hard top: can't go above topbar
    left:   -(win.x),                                // hard left: can't go past x=0
    right:  viewport.w - win.w - win.x,              // hard right: right edge stays inside viewport
    bottom: viewport.h - bottomPad - win.h - win.y,  // hard bottom: bottom edge stays inside viewport
  } : false;

  /* ══ TOUCH (MOBILE + TABLET) — fullscreen window ══════════════════════════ */
  if (isTouch) {
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
          transition: "box-shadow var(--transition-quick) ease",
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
  /* Liquid drag pipeline hooks are declared at the top of the component
     (above win.minimized / isTouch early returns).  See the block just
     before `if (win.minimized) return null;` for the pointer handlers. */

  return (
    <>
      {/* Snap preview ghost overlay — rendered outside the window so it never
         participates in the window's transform.  Rendered only while dragging. */}
      {isDragging && snapTarget && (
        <div
          aria-hidden
          style={{
            position: "fixed",
            top: snapTarget.y, left: snapTarget.x,
            width: snapTarget.w, height: snapTarget.h,
            zIndex: 9998,
            pointerEvents: "none",
            borderRadius: 20,
            background: `linear-gradient(135deg, ${accentColor}18 0%, ${accentColor}08 100%)`,
            border: `1.5px dashed ${accentColor}90`,
            boxShadow: `inset 0 0 60px ${accentColor}22, 0 0 30px ${accentColor}30`,
            transition: "top 120ms ease, left 120ms ease, width 120ms ease, height 120ms ease, opacity 120ms ease",
            backdropFilter: "blur(6px)",
          }}
        />
      )}

    <motion.div
      key={win.id}
      ref={nodeRef}
      initial={{ opacity: 0, scale: 0.88 }}
      animate={{ opacity: 1, scale: 1 }}
      exit={{
        opacity: 0, scale: 0.86,
        transition: { duration: 0.18, ease: [0.4, 0, 0.8, 0], opacity: { duration: 0.12 } },
      }}
      transition={{
        opacity: { duration: 0.16, ease: "easeOut" },
        scale:   { type: "spring", damping: 24, stiffness: 340 },
      }}
      onMouseDown={handleFocus}
      onTouchStart={handleFocus}
      className="absolute overflow-hidden rounded-2xl"
      style={{
        zIndex: win.z,
        /* CSS positioning — the source of truth for window x/y.  During
           active dragging, an additional translate3d() is applied directly
           to the DOM node via ref, bypassing React entirely. */
        top:    animY,
        left:   animX,
        width:  animW,
        height: animH,
        willChange: isDragging ? "transform" : "opacity",
        boxShadow: isActive ? SHADOW_ACTIVE(accentColor) : SHADOW_INACTIVE,
        backdropFilter: BLUR,
        WebkitBackdropFilter: BLUR,
        background: "rgba(8,10,18,0.52)",
        border: `1px solid ${isActive ? `${accentColor}20` : "rgba(255,255,255,0.07)"}`,
        /* No `transition: all` — that would cause the window to LAG behind
           the cursor.  Only chrome (shadow, border) transitions gently. */
        transition: isDragging
          ? "none"
          : "box-shadow var(--transition-base) ease, border-color var(--transition-base) ease",
      }}
      data-testid={`window-${win.app}`}
    >
      {/* Glass noise texture layer */}
      <div style={{
        position: "absolute", inset: 0, pointerEvents: "none", zIndex: 0,
        borderRadius: "inherit",
        background: "linear-gradient(135deg, rgba(255,255,255,0.028) 0%, transparent 50%, rgba(0,0,0,0.12) 100%)",
      }} />

      {/* Active accent indicator — 1px gradient line at very top */}
      <div style={{
        position: "absolute", top: 0, left: 0, right: 0, height: 1,
        borderRadius: "20px 20px 0 0",
        background: isActive
          ? `linear-gradient(to right, transparent 0%, ${accentColor}80 20%, ${accentColor} 50%, ${accentColor}80 80%, transparent 100%)`
          : "transparent",
        pointerEvents: "none", zIndex: 10,
        transition: "background var(--transition-slow) ease",
      }} />

      {/* App-color ambient tint when active (subtle, top-down) */}
      <div style={{
        position: "absolute", inset: 0, pointerEvents: "none", zIndex: 0,
        borderRadius: "inherit",
        background: isActive
          ? `radial-gradient(ellipse 80% 30% at 50% 0%, ${accentColor}08 0%, transparent 70%)`
          : "transparent",
        transition: "background var(--transition-slow) ease",
      }} />

      {/* Desktop title bar — LIQUID DRAG SURFACE */}
      <div
        className="window-handle flex items-center justify-between px-3 border-b flex-shrink-0"
        style={{
          height: 44, minHeight: 44,
          cursor: isDragging ? "grabbing" : dragEnabled ? "grab" : "default",
          background: isActive
            ? `linear-gradient(to bottom, rgba(255,255,255,0.065), rgba(255,255,255,0.018))`
            : "rgba(255,255,255,0.018)",
          borderBottomColor: isActive ? `${accentColor}18` : "rgba(255,255,255,0.07)",
          transition: "background var(--transition-base) ease, border-color var(--transition-base) ease",
          userSelect: "none",
          WebkitUserSelect: "none",
          /* P14 — iPad: prevent iOS text-selection callout on window titlebar */
          WebkitTouchCallout: "none",
          position: "relative",
          zIndex: 1,
          touchAction: "none",  // required for pointer capture on touch devices
        }}
        onPointerDown={onTitlebarPointerDown}
        onPointerMove={onTitlebarPointerMove}
        onPointerUp={onTitlebarPointerUp}
        onPointerCancel={onTitlebarPointerUp}
        onDoubleClick={handleMaximize}
      >
        {/* Left — window controls */}
        <div className="flex items-center gap-2 flex-shrink-0">
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
            color="#39FF14" icon={win.maximized ? "⤢" : "⤡"} label={win.maximized ? "Restore" : "Maximize"}
          />
        </div>

        {/* Center — app identity (absolutely centered) */}
        <div style={{
          position: "absolute", left: 0, right: 0, top: 0, bottom: 0,
          display: "flex", alignItems: "center", justifyContent: "center",
          gap: 7, pointerEvents: "none",
        }}>
          <i
            className={`fa-solid ${app.icon}`}
            style={{
              color: app.color, fontSize: 12,
              filter: isActive
                ? `drop-shadow(0 0 6px ${app.color}90)`
                : `drop-shadow(0 0 3px ${app.color}40)`,
              transition: "filter var(--transition-base) ease",
            }}
          />
          <span
            style={{
              fontFamily: "'JetBrains Mono', monospace",
              fontWeight: 600,
              fontSize: 10,
              letterSpacing: "0.14em",
              textTransform: "uppercase",
              color: isActive ? "rgba(255,255,255,0.80)" : "rgba(255,255,255,0.40)",
              transition: "color var(--transition-base) ease",
              maxWidth: 140,
              overflow: "hidden",
              textOverflow: "ellipsis",
              whiteSpace: "nowrap",
            }}
          >
            {app.name}
          </span>
        </div>

        {/* Right — spacer to balance the hex controls */}
        <div style={{ width: 78, flexShrink: 0 }} />
      </div>

      {/* Window content */}
      <div
        className="w-full overflow-hidden"
        style={{ height: "calc(100% - 44px)", position: "relative", zIndex: 1 }}
      >
        <ErrorBoundary>
          <React.Suspense fallback={<LoadingModule />}>
            {children}
          </React.Suspense>
        </ErrorBoundary>
      </div>

      {/* Resize handles */}
      <ResizeHandles
        win={win}
        updateWindow={updateWindow}
        dragEnabled={dragEnabled}
        onResizeStart={() => setIsResizing(true)}
        onResizeEnd={() => setIsResizing(false)}
        viewport={viewport}
        topPad={topPad}
        bottomPad={bottomPad}
      />

      {/* Active accent top glow line */}
      <AnimatePresence>
        {isActive && (
          <motion.div
            initial={{ opacity: 0, scaleX: 0.3 }}
            animate={{ opacity: 1, scaleX: 1 }}
            exit={{ opacity: 0, scaleX: 0.3 }}
            transition={{ duration: 0.28, ease: [0.22, 1, 0.36, 1] }}
            style={{
              position: "absolute", top: 0, left: "8%", right: "8%", height: 1,
              background: `linear-gradient(90deg, transparent, ${accentColor}70, ${accentColor}90, ${accentColor}70, transparent)`,
              pointerEvents: "none", zIndex: 25,
            }}
          />
        )}
      </AnimatePresence>

      {/* Active inner glow */}
      <AnimatePresence>
        {isActive && (
          <motion.div
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            exit={{ opacity: 0 }}
            transition={{ duration: 0.30, ease: "easeOut" }}
            style={{
              position: "absolute", inset: 0, pointerEvents: "none", zIndex: 0,
              borderRadius: "inherit",
              boxShadow: `inset 0 0 40px ${accentColor}06, inset 0 0 1px ${accentColor}14`,
            }}
          />
        )}
      </AnimatePresence>
    </motion.div>
    </>
  );
}
