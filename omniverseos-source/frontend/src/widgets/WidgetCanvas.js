import React, { useRef } from "react";
import { AnimatePresence } from "framer-motion";
import { useWidgetManager } from "./WidgetManagerContext";
import { getWidgetDef } from "./widgetRegistry";
import WidgetShell from "./WidgetShell";

export default function WidgetCanvas({ topOffset = 60 }) {
  const { visible, layout } = useWidgetManager();
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
    </div>
  );
}
