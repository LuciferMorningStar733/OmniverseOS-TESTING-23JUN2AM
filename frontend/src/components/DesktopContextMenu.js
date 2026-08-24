import React, { useEffect, useState } from "react";
import { motion, AnimatePresence } from "framer-motion";
import { useOS } from "../context/OSContext";
import { playClick } from "../lib/soundEngine";

export default function DesktopContextMenu() {
  const { openApp } = useOS();
  const [pos, setPos] = useState(null);

  useEffect(() => {
    const handleContextMenu = (e) => {
      // Only open context menu if clicking directly on the desktop background/wallpaper
      if (
        e.target.dataset.testid === "desktop-wallpaper" ||
        e.target.classList.contains("wp-base") ||
        e.target.id === "desktop-background"
      ) {
        e.preventDefault();
        playClick();
        setPos({ x: e.clientX, y: e.clientY });
      } else {
        setPos(null);
      }
    };

    const handleClick = () => setPos(null);

    window.addEventListener("contextmenu", handleContextMenu);
    window.addEventListener("click", handleClick);
    return () => {
      window.removeEventListener("contextmenu", handleContextMenu);
      window.removeEventListener("click", handleClick);
    };
  }, []);

  if (!pos) return null;

  const MENU_ITEMS = [
    { label: "New Sticky Note", icon: "fa-sticky-note", color: "#FCEE09", action: () => openApp("notes") },
    { label: "Change Wallpaper", icon: "fa-image", color: "#00F0FF", action: () => openApp("settings") },
    { label: "Tile Open Windows", icon: "fa-[#39FF14] fa-table-cells-large", color: "#39FF14", action: () => window.dispatchEvent(new CustomEvent("cortex:tile-windows")) },
    { label: "System Task Manager", icon: "fa-microchip", color: "#F59E0B", action: () => openApp("settings") },
    { label: "System Preferences", icon: "fa-gear", color: "#C778DD", action: () => openApp("settings") },
  ];

  return (
    <AnimatePresence>
      <motion.div
        initial={{ opacity: 0, scale: 0.95 }}
        animate={{ opacity: 1, scale: 1 }}
        exit={{ opacity: 0, scale: 0.95 }}
        transition={{ duration: 0.12 }}
        style={{
          position: "fixed",
          top: pos.y,
          left: pos.x,
          zIndex: 99999,
          width: 200,
          borderRadius: 14,
          padding: 6,
          background: "rgba(10, 12, 22, 0.92)",
          border: "1px solid rgba(0, 240, 255, 0.3)",
          boxShadow: "0 12px 40px rgba(0,0,0,0.7), 0 0 20px rgba(0,240,255,0.15)",
          backdropFilter: "blur(24px)",
          WebkitBackdropFilter: "blur(24px)",
          color: "#fff",
        }}
      >
        <div style={{ fontSize: 9, fontFamily: "monospace", color: "rgba(0,240,255,0.6)", padding: "4px 8px 6px", textTransform: "uppercase", letterSpacing: "0.1em" }}>
          Desktop Actions
        </div>
        {MENU_ITEMS.map((item, i) => (
          <button
            key={i}
            onClick={() => {
              item.action();
              setPos(null);
            }}
            style={{
              width: "100%",
              padding: "7px 10px",
              borderRadius: 8,
              border: "none",
              background: "transparent",
              color: "rgba(255,255,255,0.85)",
              fontSize: 11.5,
              fontFamily: "'Outfit', sans-serif",
              cursor: "pointer",
              display: "flex",
              alignItems: "center",
              gap: 10,
              textAlign: "left",
              transition: "background 0.12s",
            }}
            onMouseEnter={(e) => {
              e.currentTarget.style.background = "rgba(0,240,255,0.12)";
              e.currentTarget.style.color = "#00F0FF";
            }}
            onMouseLeave={(e) => {
              e.currentTarget.style.background = "transparent";
              e.currentTarget.style.color = "rgba(255,255,255,0.85)";
            }}
          >
            <i className={`fa-solid ${item.icon}`} style={{ color: item.color, fontSize: 11, width: 14 }} />
            <span>{item.label}</span>
          </button>
        ))}
      </motion.div>
    </AnimatePresence>
  );
}
