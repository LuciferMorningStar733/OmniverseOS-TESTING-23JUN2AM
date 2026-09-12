import React, { useState } from "react";
import { useOS } from "../context/OSContext";
import { motion } from "framer-motion";

const DESKTOP_SHORTCUTS = [
  { id: "files",      name: "Omniverse Drive",   icon: "fa-folder-closed",     color: "#60A5FA", bg: "linear-gradient(135deg, #3B82F6, #1D4ED8)" },
  { id: "chat",       name: "Cortex Neural AI", icon: "fa-brain",             color: "#00F0FF", bg: "linear-gradient(135deg, #06B6D4, #0891B2)" },
  { id: "projects",   name: "Project DNA",       icon: "fa-diagram-project", color: "#A855F7", bg: "linear-gradient(135deg, #8B5CF6, #6D28D9)" },
  { id: "code",       name: "Code Studio",       icon: "fa-code",            color: "#39FF14", bg: "linear-gradient(135deg, #10B981, #047857)" },
  { id: "adversary",  name: "Adversary Lab",     icon: "fa-crosshairs",      color: "#FF003C", bg: "linear-gradient(135deg, #EF4444, #B91C1C)" },
  { id: "settings",   name: "System Settings",   icon: "fa-gear",            color: "#94A3B8", bg: "linear-gradient(135deg, #64748B, #334155)" },
];

export default function DesktopIcons() {
  const { openApp } = useOS();
  const [selectedId, setSelectedId] = useState(null);

  return (
    <div
      className="absolute top-14 right-6 bottom-20 z-10 flex flex-col flex-wrap-reverse align-content-start gap-5 pointer-events-auto select-none"
      onClick={() => setSelectedId(null)}
      style={{ padding: 12, maxWait: 500 }}
    >
      {DESKTOP_SHORTCUTS.map((item) => {
        const isSelected = selectedId === item.id;
        return (
          <motion.div
            key={item.id}
            whileHover={{ scale: 1.05 }}
            whileTap={{ scale: 0.95 }}
            onClick={(e) => {
              e.stopPropagation();
              setSelectedId(item.id);
            }}
            onDoubleClick={(e) => {
              e.stopPropagation();
              openApp(item.id);
            }}
            className="flex flex-col items-center justify-center gap-1.5 cursor-pointer rounded-xl p-2 transition-all duration-150"
            style={{
              width: 84,
              background: isSelected ? "rgba(0, 240, 255, 0.15)" : "transparent",
              border: isSelected ? "1px solid rgba(0, 240, 255, 0.4)" : "1px solid transparent",
              boxShadow: isSelected ? "0 0 16px rgba(0, 240, 255, 0.2)" : "none",
            }}
          >
            {/* Squircle Icon Badge */}
            <div
              className="w-12 h-12 rounded-2xl flex items-center justify-center relative shadow-lg"
              style={{
                background: item.bg,
                boxShadow: "inset 0 1px 1px rgba(255,255,255,0.4), inset 0 -1px 2px rgba(0,0,0,0.3), 0 8px 20px rgba(0,0,0,0.45)",
                border: "1px solid rgba(255,255,255,0.18)",
              }}
            >
              <i
                className={`fa-solid ${item.icon} text-xl text-white`}
                style={{ filter: "drop-shadow(0 2px 4px rgba(0,0,0,0.5))" }}
              />
            </div>

            {/* Label */}
            <span
              className="text-[11px] font-medium text-center text-white/90 leading-tight tracking-tight max-w-[80px] truncate"
              style={{
                fontFamily: "'Outfit', sans-serif",
                textShadow: "0 1px 4px rgba(0, 0, 0, 0.9), 0 0 8px rgba(0, 0, 0, 0.8)",
              }}
            >
              {item.name}
            </span>
          </motion.div>
        );
      })}
    </div>
  );
}
