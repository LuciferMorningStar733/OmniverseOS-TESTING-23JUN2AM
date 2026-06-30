import React, { useRef } from "react";
import { AnimatePresence } from "framer-motion";
import { useWidgetManager } from "./WidgetManagerContext";
import { getWidgetDef } from "./widgetRegistry";
import WidgetShell from "./WidgetShell";
import WidgetStore from "./WidgetStore";

export default function WidgetCanvas({ topOffset = 60 }) {
  const { visible, layout, showStore, openStore, closeStore } = useWidgetManager();
  const canvasRef = useRef(null);

  if (!visible) return null;

  return (
    <div
      ref={canvasRef}
      className="absolute left-4 right-4 bottom-0 pointer-events-none"
      style={{ top: topOffset, zIndex: 5, overflow: "visible" }}
    >
      <AnimatePresence>
        {layout.map((item) => {
          const def = getWidgetDef(item.id);
          if (!def) return null;
          return (
            <div key={item.id} className="pointer-events-auto">
              <WidgetShell item={item} def={def} canvasRef={canvasRef} />
            </div>
          );
        })}
      </AnimatePresence>

      {/* Add Widget FAB */}
      <button
        onClick={openStore}
        title="Add widgets"
        style={{
          position: "fixed",
          bottom: 72,
          right: 18,
          width: 40,
          height: 40,
          borderRadius: 20,
          background: "rgba(6,8,16,0.82)",
          border: "1px solid rgba(0,240,255,0.35)",
          backdropFilter: "blur(20px)",
          WebkitBackdropFilter: "blur(20px)",
          color: "#00F0FF",
          fontSize: 16,
          display: "flex",
          alignItems: "center",
          justifyContent: "center",
          cursor: "pointer",
          boxShadow: "0 0 18px rgba(0,240,255,0.18), 0 4px 20px rgba(0,0,0,0.5)",
          zIndex: 100,
          transition: "all 0.2s",
          pointerEvents: "auto",
        }}
        onMouseEnter={e => {
          e.currentTarget.style.background = "rgba(0,240,255,0.15)";
          e.currentTarget.style.boxShadow = "0 0 28px rgba(0,240,255,0.35), 0 4px 20px rgba(0,0,0,0.5)";
          e.currentTarget.style.transform = "scale(1.08)";
        }}
        onMouseLeave={e => {
          e.currentTarget.style.background = "rgba(6,8,16,0.82)";
          e.currentTarget.style.boxShadow = "0 0 18px rgba(0,240,255,0.18), 0 4px 20px rgba(0,0,0,0.5)";
          e.currentTarget.style.transform = "scale(1)";
        }}
      >
        <i className="fa-solid fa-plus" />
      </button>

      {/* Widget Store modal */}
      {showStore && <WidgetStore onClose={closeStore} />}
    </div>
  );
}
