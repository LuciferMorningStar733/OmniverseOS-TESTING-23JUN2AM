import React, { Suspense, useCallback, useRef, useState } from "react";
import { motion, useMotionValue } from "framer-motion";
import {
  CELL_H, CELL_W, GAP,
  colToX, rowToY, widgetW, widgetH,
  xToCol, yToRow,
} from "./widgetRegistry";
import { useWidgetManager } from "./WidgetManagerContext";

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
  const pxH = item.collapsed ? 40 : widgetH(item.h);

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
        width: pxW,
        height: pxH,
        zIndex: dragging ? 50 : (hovered ? 20 : 10),
        cursor: item.pinned ? "default" : (dragging ? "grabbing" : "grab"),
        userSelect: "none",
        touchAction: "none",
      }}
      initial={{ opacity: 0, scale: 0.92 }}
      animate={{ opacity: 1, scale: 1 }}
      exit={{ opacity: 0, scale: 0.88 }}
      transition={{ type: "spring", stiffness: 380, damping: 32 }}
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
              // Hide preset if it's identical to another (e.g. S==M when minW==maxW)
              // But always show all three for clarity; just dim duplicates
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

        {/* Content */}
        {!item.collapsed && (
          <div
            className="absolute left-0 right-0 bottom-0"
            style={{ top: 41, overflowY: "auto", overflowX: "hidden" }}
          >
            <Suspense fallback={<Loader />}>
              <def.Component item={item} />
            </Suspense>
          </div>
        )}
      </div>
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
