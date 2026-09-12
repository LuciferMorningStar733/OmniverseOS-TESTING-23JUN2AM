import React, { useState } from "react";
import { useOS } from "../context/OSContext";
import { motion } from "framer-motion";

const DESKTOP_SHORTCUTS = [
  { id: "settings",   name: "Mandrill",          sub: "24 TB, 4.05 TB free", icon: "fa-robot",             color: "#F59E0B", bg: "linear-gradient(135deg, #F59E0B, #B45309)" },
  { id: "tasks",      name: "To Do",             sub: "7 items",             icon: "fa-folder-closed",     color: "#60A5FA", bg: "linear-gradient(135deg, #3B82F6, #1D4ED8)" },
  { id: "files",      name: "Omniverse Drive",   sub: "System Vault",        icon: "fa-hard-drive",        color: "#00F0FF", bg: "linear-gradient(135deg, #06B6D4, #0891B2)" },
  { id: "chat",       name: "Cortex AI",         sub: "Active Assistant",    icon: "fa-brain",             color: "#A855F7", bg: "linear-gradient(135deg, #8B5CF6, #6D28D9)" },
  { id: "projects",   name: "Project DNA",       sub: "Build Workspace",     icon: "fa-diagram-project", color: "#39FF14", bg: "linear-gradient(135deg, #10B981, #047857)" },
];

export default function DesktopIcons() {
  const { openApp } = useOS();
  const [selectedId, setSelectedId] = useState(null);

  return (
    <div
      className="absolute top-12 right-16 bottom-20 z-10 flex flex-col gap-5 pointer-events-auto select-none items-center"
      onClick={() => setSelectedId(null)}
      style={{ padding: 12 }}
    >
      {DESKTOP_SHORTCUTS.map((item) => {
        const isSelected = selectedId === item.id;
        return (
          <motion.div
            key={item.id}
            whileHover={{ scale: 1.06 }}
            whileTap={{ scale: 0.94 }}
            onClick={(e) => {
              e.stopPropagation();
              setSelectedId(item.id);
            }}
            onDoubleClick={(e) => {
              e.stopPropagation();
              openApp(item.id);
            }}
            className="flex flex-col items-center justify-center gap-1 cursor-pointer rounded-xl p-2 transition-all duration-150"
            style={{
              width: 96,
              background: isSelected ? "rgba(0, 240, 255, 0.18)" : "transparent",
              border: isSelected ? "1px solid rgba(0, 240, 255, 0.45)" : "1px solid transparent",
              boxShadow: isSelected ? "0 0 20px rgba(0, 240, 255, 0.25)" : "none",
            }}
          >
            {/* Icon Badge */}
            <div
              className="w-12 h-12 rounded-2xl flex items-center justify-center relative shadow-lg"
              style={{
                background: item.bg,
                boxShadow: "inset 0 1px 1px rgba(255,255,255,0.4), inset 0 -1px 2px rgba(0,0,0,0.3), 0 8px 24px rgba(0,0,0,0.5)",
                border: "1px solid rgba(255,255,255,0.22)",
              }}
            >
              <i
                className={`fa-solid ${item.icon} text-xl text-white`}
                style={{ filter: "drop-shadow(0 2px 4px rgba(0,0,0,0.6))" }}
              />
            </div>

            {/* Label */}
            <span
              className="text-[12px] font-semibold text-center text-white leading-tight tracking-tight max-w-[90px] truncate mt-1"
              style={{
                fontFamily: "'Outfit', ui-sans-serif, sans-serif",
                textShadow: "0 1px 4px rgba(0, 0, 0, 0.9), 0 0 10px rgba(0, 0, 0, 0.9)",
              }}
            >
              {item.name}
            </span>
            {item.sub && (
              <span
                className="text-[9.5px] font-normal text-center text-white/75 leading-none max-w-[90px] truncate"
                style={{
                  fontFamily: "'Outfit', sans-serif",
                  textShadow: "0 1px 3px rgba(0, 0, 0, 0.9)",
                }}
              >
                {item.sub}
              </span>
            )}
          </motion.div>
        );
      })}
    </div>
  );
}
