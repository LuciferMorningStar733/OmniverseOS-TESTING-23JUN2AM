import React, { Suspense, useCallback, useMemo, useRef, useState } from "react";
import ErrorBoundary from "../components/ErrorBoundary";
import { motion, useMotionValue } from "framer-motion";
import {
  CELL_H, CELL_W, GAP,
  colToX, rowToY, widgetW, widgetH,
  xToCol, yToRow,
} from "./widgetRegistry";
import { useWidgetManager } from "./WidgetManagerContext";
import { useContainerSize } from "./useContainerSize";

const HEADER_H = 40;

// Widgets were authored/tuned against their own `defaultW`/`defaultH` grid
// footprint (fixed px font sizes, icon sizes, paddings baked into each
// widget component). Historically the S/M/L buttons only ever changed the
// *shell's* width/height — the widget content itself never knew the box
// around it had changed, so Small clipped/overflowed and Large left dead
// space. Rather than hand-edit font sizes in every one of the 21 widget
// components (which would just bake in a different set of hardcoded
// numbers), the Smart Widget Layout Engine measures the real rendered
// content area with ResizeObserver and uniformly scales the widget's
// natural (reference) layout to fit whatever box it's been given — the
// same "scale-to-fit" technique dashboard tools (Grafana panels, OS
// desktop widgets) use for user-resizable content.
const SCALE_MIN = 0.6;
const SCALE_MAX = 1.6;

const GLASS = {
  background: "rgba(6, 8, 14, 0.65)",
  backdropFilter: "blur(28px) saturate(180%)",
  WebkitBackdropFilter: "blur(28px) saturate(180%)",
  border: "1px solid rgba(255,255,255,0.08)",
  borderRadius: 20,
  boxShadow: "0 8px 40px rgba(0,0,0,0.5), inset 0 1px 0 rgba(255,255,255,0.06)",
};

function Loader() {
  return (
    <div
      style={{
        width: "100%", height: "100%",
        display: "flex", flexDirection: "column",
        alignItems: "center", justifyContent: "center",
        gap: 8,
      }}
    >
      <div style={{ display: "flex", gap: 5 }}>
        {[0, 1, 2].map((i) => (
          <span
            key={i}
            style={{
              display: "inline-block",
              width: 4, height: 4, borderRadius: "50%",
              background: "#00F0FF",
              animation: `typingDot 1.1s ease-in-out ${i * 0.16}s infinite`,
              opacity: 0.6,
            }}
          />
        ))}
      </div>
    </div>
  );
}

/** Compute S / M / L size presets from a widget definition's min/max bounds.
 *  Enumerates all valid (w, h) grid sizes, sorts by area, then picks
 *  the smallest, a genuine mid-point, and the largest — guaranteeing
 *  three distinct steps even when the range is narrow. */
function getSizePresets(def) {
  if (!def) return null;
  const { minW, minH, maxW, maxH } = def;
  // Build every valid grid size
  const sizes = [];
  for (let w = minW; w <= maxW; w++) {
    for (let h = minH; h <= maxH; h++) {
      sizes.push({ w, h, area: w * h });
    }
  }
  // Sort by area ascending, break ties by h then w
  sizes.sort((a, b) => a.area - b.area || a.h - b.h || a.w - b.w);
  const n = sizes.length;
  const s = sizes[0];
  const l = sizes[n - 1];
  // M = genuine middle step: prefer one strictly between S and L by area
  const between = sizes.filter(sz => sz.area > s.area && sz.area < l.area);
  let m;
  if (between.length) {
    m = between[Math.floor(between.length / 2)];
  } else if (n > 2) {
    // No area gap between S and L — pick the floor-middle by index
    m = sizes[Math.floor(n / 2)];
  } else {
    // Only 2 distinct sizes → S and L are enough; M mirrors S
    m = s;
  }
  return [
    { label: "S", w: s.w, h: s.h },
    { label: "M", w: m.w, h: m.h },
    { label: "L", w: l.w, h: l.h },
  ];
}

export default function WidgetShell({ item, def, canvasRef }) {
  const { updateWidget, toggleCollapse, togglePin, removeWidget } = useWidgetManager();
  const [hovered, setHovered] = useState(false);
  const [dragging, setDragging] = useState(false);
  const [sizeFlash, setSizeFlash] = useState(null); // "S" | "M" | "L" — briefly highlights applied preset

  const pxX = colToX(item.x);
  const pxY = rowToY(item.y);
  const pxW = widgetW(item.w);
  const pxH = item.collapsed ? 40 : (def?.autoHeight ? "auto" : widgetH(item.h));
  // For autoHeight widgets the drag wrapper must NOT lock a fixed pixel width —
  // the glass card drives its own fit-content width instead.
  const autoFit = !!(def?.autoHeight);

  const mx = useMotionValue(pxX);
  const my = useMotionValue(pxY);

  // Keep motion values in sync when layout changes (after snap)
  const prevPos = useRef({ x: pxX, y: pxY });
  if (prevPos.current.x !== pxX || prevPos.current.y !== pxY) {
    prevPos.current = { x: pxX, y: pxY };
    mx.set(pxX);
    my.set(pxY);
  }

  const handleDragEnd = useCallback((_, info) => {
    setDragging(false);
    const newPxX = pxX + info.offset.x;
    const newPxY = pxY + info.offset.y;
    const newCol = xToCol(newPxX);
    const newRow = yToRow(newPxY);
    updateWidget(item.id, { x: newCol, y: newRow });
    mx.set(colToX(newCol));
    my.set(rowToY(newRow));
  }, [item.id, pxX, pxY, mx, my, updateWidget]);

  const accentColor = def?.color || "#00F0FF";
  const sizePresets = getSizePresets(def);

  const applySize = useCallback((preset) => {
    updateWidget(item.id, { w: preset.w, h: preset.h });
    setSizeFlash(preset.label);
    setTimeout(() => setSizeFlash(null), 900);
  }, [item.id, updateWidget]);

  // ── Smart Widget Layout Engine ────────────────────────────────────────────
  // Measure the real content box (post header, post padding) and scale the
  // widget's natural layout to fit it. `contentRef` is attached to the
  // content wrapper below; `measured` updates live via ResizeObserver as the
  // shell resizes (S/M/L buttons, or a future drag-resize handle — this
  // requires no changes here since it reacts to actual rendered size, not to
  // *how* the size changed).
  const [contentRef, measured] = useContainerSize();

  // Reference size = the box this widget's internal px values were designed
  // for (its own default grid footprint). Falls back to the current size so
  // an unregistered/def-less widget just renders 1:1 with no distortion.
  const refW = def ? widgetW(def.defaultW) : measured.width;
  const refH = def ? widgetH(def.defaultH) - HEADER_H : measured.height;

  const scale = useMemo(() => {
    if (!measured.width || !measured.height || !refW || !refH) return 1;
    const raw = def?.autoHeight ? (measured.width / refW) : Math.min(measured.width / refW, measured.height / refH);
    return Math.min(SCALE_MAX, Math.max(SCALE_MIN, raw));
  }, [measured.width, measured.height, refW, refH]);

  return (
    <motion.div
      drag={!item.pinned}
      dragMomentum={false}
      dragElastic={0.08}
      dragTransition={{ bounceStiffness: 520, bounceDamping: 36 }}
      dragConstraints={canvasRef}
      onDragStart={() => setDragging(true)}
      onDragEnd={handleDragEnd}
      style={{
        x: mx, y: my,
        position: "absolute",
        zIndex: dragging ? 50 : (hovered ? 20 : 10),
        cursor: item.pinned ? "default" : (dragging ? "grabbing" : "grab"),
        userSelect: "none",
        touchAction: "none",
        // autoFit: let the inner glass card set its own fit-content width
        ...(autoFit ? { width: "fit-content" } : {}),
      }}
      initial={{ opacity: 0, scale: 0.92, ...(autoFit ? {} : { width: pxW }), height: pxH }}
      animate={{ opacity: 1, scale: 1,  ...(autoFit ? {} : { width: pxW }), height: pxH }}
      exit={{ opacity: 0, scale: 0.88 }}
      transition={{
        opacity: { type: "spring", stiffness: 380, damping: 32 },
        scale:   { type: "spring", stiffness: 380, damping: 32 },
        width:   { type: "spring", stiffness: 300, damping: 30 },
        height:  { type: "spring", stiffness: 300, damping: 30 },
      }}
      onHoverStart={() => setHovered(true)}
      onHoverEnd={() => setHovered(false)}
    >
      {/* Glow ring on hover */}
      <motion.div
        className="absolute inset-0 rounded-[20px] pointer-events-none"
        animate={{ opacity: hovered ? 1 : 0 }}
        transition={{ duration: 0.2 }}
        style={{
          boxShadow: `0 0 0 1.5px ${accentColor}40, 0 0 24px ${accentColor}20`,
        }}
      />

      {/* Glass card */}
      {def?.autoHeight ? (
        // ── Auto-height layout: flex-column, shell shrinks to content ─────────
        <motion.div
          layout
          transition={{ type: "spring", stiffness: 350, damping: 25, mass: 0.8 }}
          style={{
            ...GLASS,
            borderRadius: 20,
            // omni-directional sizing: shrink-wrap to content, bounded
            width: "fit-content",
            minWidth: 250,
            maxWidth: 450,
            position: "relative",
            display: "flex",
            flexDirection: "column",
            // neural breathing — subtle cyan glow deepens on hover
            boxShadow: hovered
              ? `0 8px 40px rgba(0,0,0,0.5), inset 0 1px 0 rgba(255,255,255,0.06), 0 0 30px rgba(0,255,255,0.15)`
              : GLASS.boxShadow,
            transition: "box-shadow 1000ms ease",
          }}
        >
          {/* Header bar */}
          <div
            className="flex items-center justify-between px-3"
            style={{ height: 40, flexShrink: 0, zIndex: 2, position: "relative" }}
          >
            <div className="flex items-center gap-1.5 min-w-0">
              <i
                className={`fa-solid ${def?.icon || "fa-square"} text-[10px] flex-shrink-0`}
                style={{ color: accentColor }}
              />
              <span
                className="text-[10px] font-mono uppercase tracking-[0.18em] truncate"
                style={{ color: "rgba(255,255,255,0.35)" }}
              >
                {def?.name || item.id}
              </span>
              {item.pinned && (
                <i className="fa-solid fa-thumbtack text-[8px] text-[#00F0FF]/40 flex-shrink-0" />
              )}
            </div>

            {/* Controls — visible on hover */}
            <motion.div
              className="flex items-center gap-0.5"
              animate={{ opacity: hovered ? 1 : 0 }}
              transition={{ duration: 0.15 }}
            >
              {sizePresets && sizePresets.map((preset) => {
                const isCurrent = item.w === preset.w && item.h === preset.h;
                const isFlash   = sizeFlash === preset.label;
                return (
                  <SizeBtn
                    key={preset.label}
                    label={preset.label}
                    active={isCurrent}
                    flash={isFlash}
                    color={accentColor}
                    title={`${preset.label === "S" ? "Small" : preset.label === "M" ? "Medium" : "Large"} — ${preset.w}×${preset.h}`}
                    onClick={() => applySize(preset)}
                  />
                );
              })}
              {sizePresets && (
                <div style={{ width: 1, height: 14, background: "rgba(255,255,255,0.1)", margin: "0 2px", flexShrink: 0 }} />
              )}
              <CtrlBtn icon="fa-thumbtack" active={item.pinned} color="#00F0FF" title={item.pinned ? "Unpin" : "Pin"} onClick={() => togglePin(item.id)} />
              <CtrlBtn icon={item.collapsed ? "fa-chevron-down" : "fa-chevron-up"} title={item.collapsed ? "Expand" : "Collapse"} onClick={() => toggleCollapse(item.id)} />
              <CtrlBtn icon="fa-xmark" color="#FF003C" title="Remove widget" onClick={() => removeWidget(item.id)} />
            </motion.div>
          </div>

          {/* Separator */}
          {!item.collapsed && (
            <div style={{ height: 1, background: "rgba(255,255,255,0.06)", margin: "0 12px", flexShrink: 0 }} />
          )}

          {/* Content — no fixed height; wraps to natural content size */}
          {!item.collapsed && (
            <div style={{ position: "relative" }}>
              <ErrorBoundary>
                <Suspense fallback={<Loader />}>
                  <def.Component item={item} />
                </Suspense>
              </ErrorBoundary>
            </div>
          )}
        </motion.div>
      ) : (
        // ── Fixed-height layout: absolute-positioned, scale engine active ─────
        <div
          className="absolute inset-0 overflow-hidden"
          style={{ ...GLASS, borderRadius: 20 }}
        >
          {/* Header bar */}
          <div
            className="absolute top-0 left-0 right-0 flex items-center justify-between px-3"
            style={{ height: 40, zIndex: 2 }}
          >
            <div className="flex items-center gap-1.5 min-w-0">
              <i
                className={`fa-solid ${def?.icon || "fa-square"} text-[10px] flex-shrink-0`}
                style={{ color: accentColor }}
              />
              <span
                className="text-[10px] font-mono uppercase tracking-[0.18em] truncate"
                style={{ color: "rgba(255,255,255,0.35)" }}
              >
                {def?.name || item.id}
              </span>
              {item.pinned && (
                <i className="fa-solid fa-thumbtack text-[8px] text-[#00F0FF]/40 flex-shrink-0" />
              )}
            </div>

            {/* Controls — visible on hover */}
            <motion.div
              className="flex items-center gap-0.5"
              animate={{ opacity: hovered ? 1 : 0 }}
              transition={{ duration: 0.15 }}
            >
              {/* Size presets */}
              {sizePresets && sizePresets.map((preset) => {
                const isCurrent = item.w === preset.w && item.h === preset.h;
                const isFlash   = sizeFlash === preset.label;
                return (
                  <SizeBtn
                    key={preset.label}
                    label={preset.label}
                    active={isCurrent}
                    flash={isFlash}
                    color={accentColor}
                    title={`${preset.label === "S" ? "Small" : preset.label === "M" ? "Medium" : "Large"} — ${preset.w}×${preset.h}`}
                    onClick={() => applySize(preset)}
                  />
                );
              })}

              {/* Divider */}
              {sizePresets && (
                <div style={{ width: 1, height: 14, background: "rgba(255,255,255,0.1)", margin: "0 2px", flexShrink: 0 }} />
              )}

              <CtrlBtn
                icon={item.pinned ? "fa-thumbtack" : "fa-thumbtack"}
                active={item.pinned}
                color="#00F0FF"
                title={item.pinned ? "Unpin" : "Pin"}
                onClick={() => togglePin(item.id)}
              />
              <CtrlBtn
                icon={item.collapsed ? "fa-chevron-down" : "fa-chevron-up"}
                title={item.collapsed ? "Expand" : "Collapse"}
                onClick={() => toggleCollapse(item.id)}
              />
              <CtrlBtn
                icon="fa-xmark"
                color="#FF003C"
                title="Remove widget"
                onClick={() => removeWidget(item.id)}
              />
            </motion.div>
          </div>

          {/* Separator */}
          <div
            className="absolute left-3 right-3 pointer-events-none"
            style={{
              top: 40,
              height: 1,
              background: "rgba(255,255,255,0.06)",
              display: item.collapsed ? "none" : "block",
            }}
          />

          {/* Content — measured by the Smart Widget Layout Engine */}
          {!item.collapsed && (
            <div
              ref={contentRef}
              className="absolute left-0 right-0 bottom-0 flex items-center justify-center"
              style={{ top: HEADER_H, overflow: "hidden" }}
            >
              <div
                style={{
                  width: refW || "100%",
                  height: refH || "100%",
                  minWidth: refW || undefined,
                  minHeight: refH || undefined,
                  overflowY: "auto",
                  overflowX: "hidden",
                  transform: `scale(${scale})`,
                  transformOrigin: "center center",
                  transition: "transform 0.25s cubic-bezier(0.22, 1, 0.36, 1)",
                  willChange: "transform",
                }}
              >
                <ErrorBoundary>
                  <Suspense fallback={<Loader />}>
                    <def.Component item={item} />
                  </Suspense>
                </ErrorBoundary>
              </div>
            </div>
          )}
        </div>
      )}
    </motion.div>
  );
}

const CtrlBtn = React.memo(function CtrlBtn({ icon, active, color = "rgba(255,255,255,0.5)", title, onClick }) {
  return (
    <button
      onClick={(e) => { e.stopPropagation(); onClick?.(); }}
      title={title}
      className="w-6 h-6 rounded-lg flex items-center justify-center transition-all duration-150"
      style={{
        background: active ? `${color}22` : "transparent",
        border: active ? `1px solid ${color}44` : "1px solid transparent",
        cursor: "pointer",
        color: active ? color : "rgba(255,255,255,0.4)",
        flexShrink: 0,
      }}
      onMouseEnter={(e) => { e.currentTarget.style.background = `${color}20`; e.currentTarget.style.color = color; }}
      onMouseLeave={(e) => { e.currentTarget.style.background = active ? `${color}22` : "transparent"; e.currentTarget.style.color = active ? color : "rgba(255,255,255,0.4)"; }}
    >
      <i className={`fa-solid ${icon} text-[9px]`} />
    </button>
  );
});

const SizeBtn = React.memo(function SizeBtn({ label, active, flash, color = "#00F0FF", title, onClick }) {
  return (
    <button
      onClick={(e) => { e.stopPropagation(); onClick?.(); }}
      title={title}
      style={{
        width: 18,
        height: 18,
        borderRadius: 5,
        border: active
          ? `1px solid ${color}60`
          : "1px solid rgba(255,255,255,0.12)",
        background: flash
          ? `${color}35`
          : active
            ? `${color}18`
            : "transparent",
        cursor: "pointer",
        color: active ? color : "rgba(255,255,255,0.38)",
        fontSize: 8,
        fontWeight: 700,
        fontFamily: "monospace",
        letterSpacing: "0.05em",
        display: "flex",
        alignItems: "center",
        justifyContent: "center",
        flexShrink: 0,
        transition: "all 0.15s",
        boxShadow: active ? `0 0 6px ${color}30` : "none",
      }}
      onMouseEnter={(e) => {
        e.currentTarget.style.background = `${color}28`;
        e.currentTarget.style.color = color;
        e.currentTarget.style.border = `1px solid ${color}50`;
      }}
      onMouseLeave={(e) => {
        e.currentTarget.style.background = flash ? `${color}35` : active ? `${color}18` : "transparent";
        e.currentTarget.style.color = active ? color : "rgba(255,255,255,0.38)";
        e.currentTarget.style.border = active ? `1px solid ${color}60` : "1px solid rgba(255,255,255,0.12)";
      }}
    >
      {label}
    </button>
  );
});
