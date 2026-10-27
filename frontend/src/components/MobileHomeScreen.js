import React, { useState } from "react";
import { motion, AnimatePresence } from "framer-motion";
import WindowsPhoneLiveTiles from "./Mobile/WindowsPhoneLiveTiles";
import WindowsPhoneAppList from "./Mobile/WindowsPhoneAppList";
import WindowsPhoneNavBar from "./Mobile/WindowsPhoneNavBar";
import WindowsPhoneTaskSwitcher from "./Mobile/WindowsPhoneTaskSwitcher";

export default function MobileHomeScreen({ onOpenApp, onOpenSearch }) {
  const [activePivot, setActivePivot] = useState("start"); // "start" | "all-apps"
  const [taskSwitcherOpen, setTaskSwitcherOpen] = useState(false);

  return (
    <div
      style={{
        position: "fixed",
        inset: 0,
        background: "#000000",
        color: "#ffffff",
        overflow: "hidden",
        zIndex: 10,
        display: "flex",
        flexDirection: "column",
        fontFamily: "'Segoe UI', 'Outfit', -apple-system, sans-serif",
      }}
      data-testid="mobile-home-screen"
    >
      {/* ── PANORAMA HORIZONTAL VIEWPORT CONTAINER ──────────────────────── */}
      <div
        style={{
          flex: 1,
          width: "100%",
          height: "100%",
          position: "relative",
          overflow: "hidden",
        }}
      >
        <AnimatePresence mode="wait" initial={false}>
          {activePivot === "start" ? (
            <motion.div
              key="metro-start"
              initial={{ x: -40, opacity: 0 }}
              animate={{ x: 0, opacity: 1 }}
              exit={{ x: -40, opacity: 0 }}
              transition={{ duration: 0.22, ease: "easeOut" }}
              style={{
                width: "100%",
                height: "100%",
                position: "absolute",
                inset: 0,
              }}
            >
              <WindowsPhoneLiveTiles
                onOpenApp={onOpenApp}
                onNavigateToAppList={() => setActivePivot("all-apps")}
                onOpenSearch={onOpenSearch}
              />
            </motion.div>
          ) : (
            <motion.div
              key="metro-all-apps"
              initial={{ x: 40, opacity: 0 }}
              animate={{ x: 0, opacity: 1 }}
              exit={{ x: 40, opacity: 0 }}
              transition={{ duration: 0.22, ease: "easeOut" }}
              style={{
                width: "100%",
                height: "100%",
                position: "absolute",
                inset: 0,
              }}
            >
              <WindowsPhoneAppList
                onOpenApp={onOpenApp}
                onNavigateToStart={() => setActivePivot("start")}
              />
            </motion.div>
          )}
        </AnimatePresence>
      </div>

      {/* ── WINDOWS PHONE TASK SWITCHER CAROUSEL ──────────────────────── */}
      <WindowsPhoneTaskSwitcher
        isOpen={taskSwitcherOpen}
        onClose={() => setTaskSwitcherOpen(false)}
        onOpenApp={onOpenApp}
      />

      {/* ── ICONIC 3-BUTTON SOFT NAVIGATION BAR (← ⊞ 🔍) ─────────────── */}
      <WindowsPhoneNavBar
        activePivot={activePivot}
        onNavigateToStart={() => setActivePivot("start")}
        onOpenSearch={onOpenSearch}
        onToggleTaskSwitcher={() => setTaskSwitcherOpen((prev) => !prev)}
        hasOpenWindows={false}
      />
    </div>
  );
}
