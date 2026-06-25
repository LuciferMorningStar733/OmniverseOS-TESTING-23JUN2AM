import React, { useState } from "react";
import { motion } from "framer-motion";
import { useOS } from "../context/OSContext";
import { APPS } from "../lib/apps";

export default function Dock() {
  const { openApp, windows, activeId } = useOS();
  const [hoveredId, setHoveredId] = useState(null);

  return (
    <motion.div
      initial={{ y: 120, opacity: 0 }}
      animate={{ y: 0, opacity: 1 }}
      transition={{ delay: 0.3, type: "spring", stiffness: 300, damping: 30 }}
      className="fixed left-1/2 -translate-x-1/2 bottom-4 z-40"
      data-testid="dock-root"
    >
      {/* Premium Glass Container with Layered Shadows */}
      <div 
        className="relative"
        style={{
          background: "rgba(24, 24, 27, 0.75)",
          backdropFilter: "blur(32px)",
          WebkitBackdropFilter: "blur(32px)",
          borderRadius: "24px",
          padding: "14px 18px",
          border: "1px solid rgba(255, 255, 255, 0.08)",
          boxShadow: `
            0 2px 8px rgba(0, 0, 0, 0.20),
            0 8px 24px rgba(0, 0, 0, 0.15),
            0 0 48px rgba(0, 240, 255, 0.06)
          `,
        }}
      >
        <div className="flex items-center gap-2">
          {APPS.map((app, index) => {
            const open = windows.some((w) => w.app === app.id);
            const isActive = open && windows.find((w) => w.app === app.id)?.id === activeId;
            const isHovered = hoveredId === app.id;
            
            // Icon magnification based on hover
            const scale = isHovered ? 1.35 : 1;
            const translateY = isHovered ? -8 : 0;

            return (
              <div key={app.id} className="relative flex flex-col items-center">
                {/* Main Icon Button */}
                <motion.button
                  data-testid={`dock-item-${app.id}`}
                  onClick={() => {
                    openApp(app.id);
                  }}
                  onMouseEnter={() => setHoveredId(app.id)}
                  onMouseLeave={() => setHoveredId(null)}
                  className="group relative flex items-center justify-center"
                  style={{
                    width: "48px",
                    height: "48px",
                    borderRadius: "14px",
                    background: isActive 
                      ? "rgba(0, 240, 255, 0.12)" 
                      : "transparent",
                    border: isActive
                      ? "1px solid rgba(0, 240, 255, 0.20)"
                      : "1px solid transparent",
                    transition: "all 250ms cubic-bezier(0.25, 0.46, 0.45, 0.94)",
                  }}
                  animate={{
                    scale,
                    y: translateY,
                  }}
                  whileHover={{
                    background: "rgba(255, 255, 255, 0.08)",
                  }}
                  whileTap={{
                    scale: 0.92,
                    y: 0,
                  }}
                  transition={{
                    type: "spring",
                    stiffness: 400,
                    damping: 25,
                  }}
                  title={app.name}
                >
                  {/* App Icon */}
                  <motion.i 
                    className={`fa-solid ${app.icon}`}
                    style={{ 
                      fontSize: "18px",
                      color: app.color,
                      filter: isHovered ? "drop-shadow(0 0 8px currentColor)" : "none",
                    }}
                    animate={{
                      filter: isHovered 
                        ? `drop-shadow(0 0 8px ${app.color})` 
                        : "drop-shadow(0 0 0px transparent)",
                    }}
                  />

                  {/* Tooltip */}
                  <motion.span 
                    className="pointer-events-none absolute whitespace-nowrap text-white"
                    style={{
                      top: "-40px",
                      left: "50%",
                      transform: "translateX(-50%)",
                      background: "rgba(0, 0, 0, 0.90)",
                      border: "1px solid rgba(255, 255, 255, 0.10)",
                      padding: "4px 10px",
                      borderRadius: "8px",
                      fontSize: "11px",
                      fontWeight: "500",
                      backdropFilter: "blur(8px)",
                      WebkitBackdropFilter: "blur(8px)",
                    }}
                    initial={{ opacity: 0, y: 4 }}
                    animate={{ 
                      opacity: isHovered ? 1 : 0,
                      y: isHovered ? 0 : 4,
                    }}
                    transition={{ duration: 0.15 }}
                  >
                    {app.name}
                  </motion.span>
                </motion.button>

                {/* Running Indicator - Crimson Glow for Active Apps */}
                {open && (
                  <motion.span 
                    className="absolute"
                    style={{
                      bottom: "-6px",
                      left: "50%",
                      width: "4px",
                      height: "4px",
                      borderRadius: "9999px",
                      background: "#DC2626",
                      boxShadow: "0 0 12px rgba(220, 38, 38, 0.8), 0 0 24px rgba(220, 38, 38, 0.4)",
                      transform: "translateX(-50%)",
                    }}
                    initial={{ scale: 0, opacity: 0 }}
                    animate={{ 
                      scale: 1, 
                      opacity: 1,
                    }}
                    exit={{ scale: 0, opacity: 0 }}
                    transition={{
                      type: "spring",
                      stiffness: 500,
                      damping: 30,
                    }}
                  />
                )}
              </div>
            );
          })}
        </div>
      </div>
    </motion.div>
  );
}
