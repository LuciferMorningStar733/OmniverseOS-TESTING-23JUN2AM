import React from "react";
import { motion, AnimatePresence } from "framer-motion";
import { useOS } from "../context/OSContext";
import { getApp } from "../lib/apps";

export default function StageManager({ active, onToggle }) {
  const { windows, activeId, focusWindow } = useOS();

  if (!active) return null;

  // Background non-active windows
  const backgroundWindows = windows.filter((w) => w.id !== activeId && !w.minimized);

  return (
    <div
      style={{
        position: "fixed",
        left: 12,
        top: 50,
        bottom: 80,
        zIndex: 35,
        display: "flex",
        flexDirection: "column",
        gap: 12,
        justifyContent: "center",
        pointerEvents: "auto",
      }}
    >
      <AnimatePresence>
        {backgroundWindows.map((win) => {
          const app = getApp(win.app);
          return (
            <motion.button
              key={win.id}
              initial={{ opacity: 0, x: -30, scale: 0.8 }}
              animate={{ opacity: 1, x: 0, scale: 1 }}
              exit={{ opacity: 0, x: -30, scale: 0.8 }}
              whileHover={{ scale: 1.06, x: 6 }}
              whileTap={{ scale: 0.94 }}
              onClick={() => focusWindow(win.id)}
              style={{
                width: 90,
                height: 60,
                borderRadius: 12,
                background: "rgba(10, 12, 22, 0.75)",
                border: "1px solid rgba(0, 240, 255, 0.25)",
                boxShadow: "0 8px 24px rgba(0,0,0,0.5), inset 0 0 0 1px rgba(255,255,255,0.08)",
                backdropFilter: "blur(16px)",
                WebkitBackdropFilter: "blur(16px)",
                cursor: "pointer",
                display: "flex",
                flexDirection: "column",
                alignItems: "center",
                justifyContent: "center",
                gap: 4,
                color: "#fff",
                transition: "all 0.2s ease",
              }}
            >
              <i className={`fa-solid ${app?.icon || "fa-window-maximize"}`} style={{ color: app?.color || "#00F0FF", fontSize: 16 }} />
              <span style={{ fontSize: 9, fontWeight: 600, fontFamily: "'Outfit', sans-serif", whiteSpace: "nowrap", overflow: "hidden", textOverflow: "ellipsis", maxWidth: 80 }}>
                {app?.name || "Window"}
              </span>
            </motion.button>
          );
        })}
      </AnimatePresence>
    </div>
  );
}
