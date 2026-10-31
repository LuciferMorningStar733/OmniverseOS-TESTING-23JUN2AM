import React, { useState } from "react";
import { useOS } from "../context/OSContext";
import { motion } from "framer-motion";
import { playWindowOpen } from "../lib/soundEngine";

const DESKTOP_SHORTCUTS = [
  { id: "settings",   name: "Settings",          sub: "System Controls",     icon: "fa-gear",              color: "#F59E0B", bg: "linear-gradient(135deg, #F59E0B, #B45309)" },
  { id: "tasks",      name: "Tasks",             sub: "Task Queue",          icon: "fa-list-check",        color: "#60A5FA", bg: "linear-gradient(135deg, #3B82F6, #1D4ED8)" },
  { id: "files",      name: "File Manager",      sub: "Workspace Files",     icon: "fa-folder",            color: "#00F0FF", bg: "linear-gradient(135deg, #06B6D4, #0891B2)" },
  { id: "chat",       name: "Cortex AI",         sub: "AI Assistant",        icon: "fa-brain",             color: "#A855F7", bg: "linear-gradient(135deg, #8B5CF6, #6D28D9)" },
  { id: "projects",   name: "Project DNA",       sub: "Workspace DNA",       icon: "fa-diagram-project", color: "#39FF14", bg: "linear-gradient(135deg, #10B981, #047857)" },
];

export default function DesktopIcons() {
  const { openApp } = useOS();
  const [selectedId, setSelectedId] = useState(null);

  const handleLaunch = (id) => {
    playWindowOpen();
    openApp(id);
  };

  return (
    <div
      className="absolute top-14 right-10 bottom-20 z-10 flex flex-col gap-6 pointer-events-auto select-none items-center"
      onClick={() => setSelectedId(null)}
      style={{ padding: 12 }}
    >
      {DESKTOP_SHORTCUTS.map((item) => {
        const isSelected = selectedId === item.id;
        return (
          <motion.div
            key={item.id}
            whileHover={{ scale: 1.08, y: -2 }}
            whileTap={{ scale: 0.94 }}
            transition={{ type: "spring", stiffness: 420, damping: 24 }}
            onClick={(e) => {
              e.stopPropagation();
              setSelectedId(item.id);
            }}
            onDoubleClick={(e) => {
              e.stopPropagation();
              handleLaunch(item.id);
            }}
            className="group flex flex-col items-center justify-center gap-1.5 cursor-pointer rounded-2xl p-2.5 transition-all duration-200"
            style={{
              width: 102,
              background: isSelected ? "rgba(0, 240, 255, 0.16)" : "rgba(255, 255, 255, 0.02)",
              border: isSelected ? "1px solid rgba(0, 240, 255, 0.50)" : "1px solid rgba(255, 255, 255, 0.04)",
              boxShadow: isSelected
                ? "0 0 25px rgba(0, 240, 255, 0.30), inset 0 1px 0 rgba(255,255,255,0.2)"
                : "none",
              backdropFilter: isSelected ? "blur(16px)" : "none",
            }}
          >
            {/* 2026 Spatial Icon Badge */}
            <div
              className="rounded-2xl flex items-center justify-center relative shadow-xl transition-transform duration-200 group-hover:scale-105"
              style={{
                width: 52,
                height: 52,
                background: item.bg,
                boxShadow: `inset 0 1px 1px rgba(255,255,255,0.45), inset 0 -1px 2px rgba(0,0,0,0.35), 0 10px 25px -4px ${item.color}40, 0 8px 24px rgba(0,0,0,0.6)`,
                border: "1px solid rgba(255,255,255,0.28)",
              }}
            >
              <i
                className={`fa-solid ${item.icon} text-2xl text-white`}
                style={{ filter: "drop-shadow(0 2px 6px rgba(0,0,0,0.7))" }}
              />
            </div>

            {/* Label */}
            <div className="flex flex-col items-center text-center px-1.5 py-0.5 rounded-md">
              <span
                className="text-[12px] font-semibold text-white leading-tight tracking-tight max-w-[96px] truncate"
                style={{
                  fontFamily: "'Outfit', ui-sans-serif, sans-serif",
                  textShadow: "0 1px 4px rgba(0, 0, 0, 0.95), 0 0 10px rgba(0, 0, 0, 0.95)",
                }}
              >
                {item.name}
              </span>
              {item.sub && (
                <span
                  className="text-[9.5px] font-medium text-white/80 leading-none max-w-[96px] truncate mt-0.5"
                  style={{
                    fontFamily: "'Outfit', sans-serif",
                    textShadow: "0 1px 3px rgba(0, 0, 0, 0.9)",
                  }}
                >
                  {item.sub}
                </span>
              )}
            </div>
          </motion.div>
        );
      })}
    </div>
  );
}
