import React, { useState } from "react";
import { motion, AnimatePresence } from "framer-motion";
import { useOS } from "../context/OSContext";
import { APPS } from "../lib/apps";

export default function AdaptiveDock() {
  const { windows, activeId, openApp, minimize, focusWindow } = useOS();
  const [drawerOpen, setDrawerOpen] = useState(false);
  const [hoveredIdx, setHoveredIdx] = useState(null);

  // Categorize apps
  const activeWindows = windows.filter((w) => !w.minimized);
  const openAppIds = windows.map((w) => w.app);

  const pinnedIds = ["cortex", "notes", "blackbox", "mirror", "files", "browser"];

  // Dock items array
  const dockApps = APPS.filter(
    (app) => openAppIds.includes(app.id) || pinnedIds.includes(app.id)
  );

  const handleIconClick = (appId) => {
    const existing = windows.find((w) => w.app === appId);
    if (existing) {
      if (existing.minimized) {
        updateWindow(existing.id, { minimized: false });
        focusWindow(existing.id);
      } else if (existing.id === activeId) {
        minimize(existing.id);
      } else {
        focusWindow(existing.id);
      }
    } else {
      openApp(appId);
    }
  };

  return (
    <>
      <motion.div
        initial={{ y: 40, opacity: 0 }}
        animate={{ y: 0, opacity: 1 }}
        transition={{ duration: 0.4, ease: "easeOut" }}
        style={{
          position: "fixed",
          bottom: 16,
          left: "50%",
          transform: "translateX(-50%)",
          zIndex: 80,
          padding: "8px 14px",
          borderRadius: 22,
          background: "rgba(8, 11, 20, 0.85)",
          border: "1px solid rgba(255, 255, 255, 0.12)",
          backdropFilter: "blur(24px)",
          boxShadow: "0 20px 50px rgba(0, 0, 0, 0.8), 0 0 30px rgba(0, 240, 255, 0.1)",
          display: "flex",
          alignItems: "center",
          gap: 10,
        }}
        data-testid="adaptive-dock"
      >
        {dockApps.map((app, idx) => {
          const isOpen = openAppIds.includes(app.id);
          const isActive = windows.find((w) => w.app === app.id)?.id === activeId;

          // Cosine Magnification
          let scale = 1;
          if (hoveredIdx !== null) {
            const distance = Math.abs(hoveredIdx - idx);
            if (distance === 0) scale = 1.35;
            else if (distance === 1) scale = 1.15;
          }

          return (
            <div
              key={app.id}
              onMouseEnter={() => setHoveredIdx(idx)}
              onMouseLeave={() => setHoveredIdx(null)}
              onClick={() => handleIconClick(app.id)}
              style={{
                position: "relative",
                display: "flex",
                flexDirection: "column",
                alignItems: "center",
                cursor: "pointer",
              }}
              data-testid={`dock-icon-${app.id}`}
            >
              <motion.div
                animate={{ scale }}
                transition={{ type: "spring", stiffness: 350, damping: 25 }}
                style={{
                  width: 44,
                  height: 44,
                  borderRadius: 14,
                  background: isActive
                    ? `radial-gradient(circle at 35% 35%, ${app.color}, #05070D)`
                    : "rgba(255, 255, 255, 0.05)",
                  border: `1px solid ${isActive ? app.color : "rgba(255,255,255,0.1)"}`,
                  boxShadow: isActive ? `0 0 18px ${app.color}60` : "none",
                  display: "flex",
                  alignItems: "center",
                  justifyContent: "center",
                  position: "relative",
                }}
              >
                <i className={`fa-solid ${app.icon}`} style={{ color: isActive ? "#fff" : app.color, fontSize: 18 }} />
              </motion.div>

              {/* Indicator Dot/Pill */}
              {isOpen && (
                <div
                  style={{
                    position: "absolute",
                    bottom: -6,
                    width: isActive ? 16 : 4,
                    height: 4,
                    borderRadius: 2,
                    background: isActive ? "#00F0FF" : "rgba(255,255,255,0.4)",
                    boxShadow: isActive ? "0 0 8px #00F0FF" : "none",
                    transition: "all 0.2s ease",
                  }}
                />
              )}
            </div>
          );
        })}

        {/* Separator Line */}
        <div style={{ width: 1, height: 28, background: "rgba(255,255,255,0.12)", margin: "0 2px" }} />

        {/* App Drawer Trigger */}
        <button
          onClick={() => setDrawerOpen(true)}
          style={{
            width: 44,
            height: 44,
            borderRadius: 14,
            background: "rgba(255,255,255,0.04)",
            border: "1px solid rgba(255,255,255,0.1)",
            color: "rgba(255,255,255,0.7)",
            fontSize: 16,
            cursor: "pointer",
            display: "flex",
            alignItems: "center",
            justifyContent: "center",
          }}
          title="Open Intelligent App Drawer"
          data-testid="dock-app-drawer-trigger"
        >
          <i className="fa-solid fa-grip" />
        </button>
      </motion.div>

      {/* App Drawer Modal */}
      <AnimatePresence>
        {drawerOpen && (
          <div
            style={{
              position: "fixed",
              inset: 0,
              zIndex: 100,
              background: "rgba(3, 4, 8, 0.85)",
              backdropFilter: "blur(20px)",
              display: "flex",
              alignItems: "center",
              justifyContent: "center",
              padding: 24,
            }}
            onClick={() => setDrawerOpen(false)}
            data-testid="app-drawer-backdrop"
          >
            <motion.div
              initial={{ opacity: 0, scale: 0.95 }}
              animate={{ opacity: 1, scale: 1 }}
              exit={{ opacity: 0, scale: 0.95 }}
              onClick={(e) => e.stopPropagation()}
              className="glass-panel"
              style={{
                width: "100%",
                maxWidth: 720,
                padding: 24,
                borderColor: "rgba(0, 240, 255, 0.25)",
                boxShadow: "0 0 50px rgba(0, 240, 255, 0.15)",
              }}
              data-testid="app-drawer"
            >
              <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center", marginBottom: 16 }}>
                <div>
                  <div style={{ fontSize: 16, fontWeight: 900, color: "#fff" }}>INTELLIGENT APP DRAWER</div>
                  <div style={{ fontSize: 11, color: "rgba(255,255,255,0.45)", fontFamily: "monospace" }}>30 Applications Registered</div>
                </div>
                <button
                  onClick={() => setDrawerOpen(false)}
                  style={{ background: "none", border: "none", color: "rgba(255,255,255,0.5)", cursor: "pointer", fontSize: 16 }}
                >
                  <i className="fa-solid fa-xmark" />
                </button>
              </div>

              <div style={{ display: "grid", gridTemplateColumns: "repeat(auto-fill, minmax(120px, 1fr))", gap: 12, maxHeight: 420, overflowY: "auto" }}>
                {APPS.map((app) => (
                  <div
                    key={app.id}
                    onClick={() => {
                      openApp(app.id);
                      setDrawerOpen(false);
                    }}
                    className="glass-card"
                    style={{
                      padding: 14,
                      display: "flex",
                      flexDirection: "column",
                      alignItems: "center",
                      gap: 8,
                      cursor: "pointer",
                    }}
                  >
                    <div style={{ width: 38, height: 38, borderRadius: 12, background: `${app.color}20`, border: `1px solid ${app.color}50`, display: "flex", alignItems: "center", justifyContent: "center" }}>
                      <i className={`fa-solid ${app.icon}`} style={{ color: app.color, fontSize: 16 }} />
                    </div>
                    <div style={{ fontSize: 11, fontWeight: 700, color: "#fff", textAlign: "center" }}>
                      {app.name}
                    </div>
                  </div>
                ))}
              </div>
            </motion.div>
          </div>
        )}
      </AnimatePresence>
    </>
  );
}
