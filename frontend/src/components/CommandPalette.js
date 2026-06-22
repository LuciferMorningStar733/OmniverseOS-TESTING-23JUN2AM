import React, { useState, useMemo } from "react";
import { AnimatePresence, motion } from "framer-motion";
import { useOS } from "../context/OSContext";
import { APPS } from "../lib/apps";

export default function CommandPalette() {
  const { paletteOpen, setPaletteOpen, openApp } = useOS();
  const [q, setQ] = useState("");

  const results = useMemo(() => {
    const text = q.trim().toLowerCase();
    if (!text) return APPS;
    return APPS.filter((a) => a.name.toLowerCase().includes(text) || a.id.includes(text));
  }, [q]);

  if (!paletteOpen) return null;

  const launch = (id) => {
    openApp(id);
    setPaletteOpen(false);
    setQ("");
  };

  return (
    <AnimatePresence>
      <motion.div
        initial={{ opacity: 0 }} animate={{ opacity: 1 }} exit={{ opacity: 0 }}
        className="absolute inset-0 z-50 bg-black/60 backdrop-blur-sm flex items-start justify-center pt-32"
        onClick={() => setPaletteOpen(false)}
        data-testid="command-palette"
      >
        <motion.div
          initial={{ y: -20, opacity: 0 }}
          animate={{ y: 0, opacity: 1 }}
          exit={{ y: -20, opacity: 0 }}
          onClick={(e) => e.stopPropagation()}
          className="w-full max-w-xl mx-4 glass rounded-2xl overflow-hidden window-shadow"
        >
          <div className="flex items-center gap-3 px-4 py-3 border-b border-white/10">
            <i className="fa-solid fa-magnifying-glass text-[#00F0FF]"></i>
            <input
              data-testid="palette-input"
              autoFocus
              value={q}
              onChange={(e) => setQ(e.target.value)}
              onKeyDown={(e) => {
                if (e.key === "Enter" && results[0]) launch(results[0].id);
                if (e.key === "Escape") setPaletteOpen(false);
              }}
              placeholder="Search apps, commands…"
              className="flex-1 bg-transparent outline-none text-base text-white placeholder:text-slate-500"
            />
            <kbd className="px-2 py-0.5 text-[10px] bg-white/10 rounded font-mono">ESC</kbd>
          </div>
          <div className="max-h-80 overflow-y-auto p-2">
            {results.length === 0 && <div className="p-6 text-center text-slate-500 text-sm">No matches</div>}
            {results.map((app) => (
              <button
                key={app.id}
                data-testid={`palette-result-${app.id}`}
                onClick={() => launch(app.id)}
                className="w-full flex items-center gap-3 px-3 py-2.5 rounded-lg hover:bg-white/[0.06] text-left transition"
              >
                <div className="w-8 h-8 rounded-md flex items-center justify-center" style={{ background: `${app.color}22` }}>
                  <i className={`fa-solid ${app.icon}`} style={{ color: app.color }}></i>
                </div>
                <div className="flex-1">
                  <div className="text-sm text-white">{app.name}</div>
                  <div className="mono-label opacity-50">{app.group}</div>
                </div>
                <i className="fa-solid fa-arrow-right text-slate-600 text-xs"></i>
              </button>
            ))}
          </div>
        </motion.div>
      </motion.div>
    </AnimatePresence>
  );
}
