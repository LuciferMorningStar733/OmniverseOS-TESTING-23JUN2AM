import React, { useEffect } from "react";
import { useOS } from "../context/OSContext";
import Window from "./Window";
import Dock from "./Dock";
import TopBar from "./TopBar";
import CommandPalette from "./CommandPalette";
import NotificationCenter from "./NotificationCenter";
import { getApp } from "../lib/apps";
import { AnimatePresence, motion } from "framer-motion";

export default function Desktop() {
  const { windows, openApp, setPaletteOpen, user } = useOS();

  useEffect(() => {
    if (windows.length === 0) {
      openApp("dashboard");
    }
  }, [openApp, windows.length]);

  useEffect(() => {
    const handler = (e) => {
      if ((e.metaKey || e.ctrlKey) && e.key.toLowerCase() === "k") {
        e.preventDefault();
        setPaletteOpen(true);
      }
    };
    window.addEventListener("keydown", handler);
    return () => window.removeEventListener("keydown", handler);
  }, [setPaletteOpen]);

  return (
    <div className="relative w-full h-full overflow-hidden bg-[#05050A]" data-testid="desktop-root">
      <div className="absolute inset-0 bg-grid opacity-30" />
      <div className="absolute inset-0 bg-aurora" />
      <img
        src="https://images.pexels.com/photos/15638268/pexels-photo-15638268.png"
        alt=""
        className="absolute inset-0 w-full h-full object-cover opacity-20 mix-blend-screen pointer-events-none"
      />
      <div className="absolute inset-0 scanline opacity-50 pointer-events-none" />

      <div className="absolute top-1/2 left-1/2 -translate-x-1/2 -translate-y-1/2 pointer-events-none z-0 text-center">
        <motion.div
          initial={{ opacity: 0, y: 20 }}
          animate={{ opacity: 0.12, y: 0 }}
          transition={{ delay: 0.3, duration: 1 }}
          className="font-heading text-[10vw] font-black tracking-tighter text-white"
        >
          OMNI<span style={{ color: "#00F0FF" }}>VERSE</span>
        </motion.div>
        <div className="mono-label opacity-50 mt-2">// {user?.name?.toUpperCase()} • SESSION ACTIVE</div>
      </div>

      <TopBar />

      <div className="absolute inset-0 z-10 pointer-events-none">
        <AnimatePresence>
          {windows.map((w) => {
            const app = getApp(w.app);
            if (!app) return null;
            return (
              <div key={w.id} className="pointer-events-auto">
                <Window win={w}>
                  <app.Component />
                </Window>
              </div>
            );
          })}
        </AnimatePresence>
      </div>

      <Dock />
      <CommandPalette />
      <NotificationCenter />
    </div>
  );
}