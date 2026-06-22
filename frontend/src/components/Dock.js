import React from "react";
import { motion } from "framer-motion";
import { useOS } from "../context/OSContext";
import { APPS } from "../lib/apps";

export default function Dock() {
  const { openApp, windows, activeId } = useOS();

  return (
    <motion.div
      initial={{ y: 120, opacity: 0 }}
      animate={{ y: 0, opacity: 1 }}
      transition={{ delay: 0.3 }}
      className="absolute left-1/2 -translate-x-1/2 bottom-3 z-40"
      data-testid="dock-root"
    >
      <div className="glass rounded-2xl px-3 py-2 flex items-center gap-1.5 window-shadow">
        {APPS.map((app) => {
          const open = windows.some((w) => w.app === app.id);
          const isActive = open && windows.find((w) => w.app === app.id)?.id === activeId;
          return (
            <button
              key={app.id}
              data-testid={`dock-item-${app.id}`}
              onClick={() => openApp(app.id)}
              className="group relative w-11 h-11 rounded-xl flex items-center justify-center transition-all hover:bg-white/10 hover:-translate-y-1"
              style={{ background: isActive ? "rgba(0,240,255,0.12)" : "transparent" }}
              title={app.name}
            >
              <i className={`fa-solid ${app.icon} text-base`} style={{ color: app.color }}></i>
              {open && (
                <span className="absolute -bottom-1 left-1/2 -translate-x-1/2 w-1 h-1 rounded-full bg-[#00F0FF]" />
              )}
              <span className="pointer-events-none absolute -top-9 left-1/2 -translate-x-1/2 opacity-0 group-hover:opacity-100 transition-opacity bg-black/90 border border-white/10 px-2 py-1 rounded text-[10px] font-mono whitespace-nowrap text-white">
                {app.name}
              </span>
            </button>
          );
        })}
      </div>
    </motion.div>
  );
}
