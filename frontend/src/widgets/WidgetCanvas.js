import React, { useRef } from "react";
import { AnimatePresence, motion } from "framer-motion";
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

      {/* Add Widget FAB — positioned top-left of canvas area, away from Dock and Cortex widget */}
      <motion.button
        onClick={openStore}
        title="Add widgets"
        initial={{ opacity: 0, scale: 0.8 }}
        animate={{ opacity: 1, scale: 1 }}
        whileHover={{ scale: 1.10 }}
        whileTap={{ scale: 0.92 }}
        transition={{ type: "spring", stiffness: 400, damping: 26 }}
        style={{
          position: "fixed",
          top: topOffset + 12,
          right: 18,
          width: 36,
          height: 36,
          borderRadius: 10,
          background: "rgba(6,8,16,0.84)",
          border: "1px solid rgba(0,240,255,0.30)",
          backdropFilter: "blur(20px)",
          WebkitBackdropFilter: "blur(20px)",
          color: "#00F0FF",
          fontSize: 13,
          display: "flex",
          alignItems: "center",
          justifyContent: "center",
          cursor: "pointer",
          boxShadow: "0 0 16px rgba(0,240,255,0.14), 0 4px 16px rgba(0,0,0,0.45)",
          zIndex: 100,
          pointerEvents: "auto",
        }}
      >
        <i className="fa-solid fa-plus" />
      </motion.button>

      {/* Widget Store modal */}
      {showStore && <WidgetStore onClose={closeStore} />}
    </div>
  );
}
