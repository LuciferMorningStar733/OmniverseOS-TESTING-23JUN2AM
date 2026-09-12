import React, { useState, useRef, useEffect, useCallback } from "react";
import { motion, AnimatePresence } from "framer-motion";
import { useOS } from "../context/OSContext";
import { APPS } from "../lib/apps";
import { useBreakpoint } from "../hooks/useBreakpoint";

const DockItem = React.memo(function DockItem({
  app,
  isOpen,
  isActive,
  mouseX,
  isTouch,
  prefersReducedMotion,
  isBouncing,
  isHovered,
  onHover,
  onLeave,
  onClick,
}) {
  const itemRef = useRef(null);
  const [distance, setDistance] = useState(Infinity);

  useEffect(() => {
    if (isTouch || prefersReducedMotion || mouseX === null || !itemRef.current) {
      setDistance(Infinity);
      return;
    }
    const rect = itemRef.current.getBoundingClientRect();
    const centerX = rect.left + rect.width / 2;
    setDistance(Math.abs(mouseX - centerX));
  }, [mouseX, isTouch, prefersReducedMotion]);

  const RADIUS = 110;
  let scale = 1;
  let translateY = 0;

  if (!isTouch && !prefersReducedMotion && distance < RADIUS) {
    const factor = Math.cos((distance / RADIUS) * (Math.PI / 2));
    const power = factor * factor;
    scale = 1 + power * 0.22;
    translateY = -7 * power;
  }

  return (
    <div
      ref={itemRef}
      onMouseEnter={onHover}
      onMouseLeave={onLeave}
      onClick={onClick}
      style={{
        position: "relative",
        display: "flex",
        flexDirection: "column",
        alignItems: "center",
        cursor: "pointer",
        padding: "0 2px",
      }}
      data-testid={`dock-icon-${app.id}`}
    >
      {/* Floating Tooltip */}
      <AnimatePresence>
        {!isTouch && isHovered && (
          <motion.div
            initial={{ opacity: 0, y: 6, scale: 0.92 }}
            animate={{ opacity: 1, y: 0, scale: 1 }}
            exit={{ opacity: 0, y: 4, scale: 0.92 }}
            transition={{ duration: 0.15, ease: "easeOut" }}
            style={{
              position: "absolute",
              bottom: "100%",
              marginBottom: 10,
              padding: "4px 10px",
              borderRadius: 8,
              background: "rgba(10, 14, 26, 0.92)",
              border: "1px solid rgba(255, 255, 255, 0.15)",
              backdropFilter: "blur(12px)",
              color: "#ffffff",
              fontSize: 11,
              fontFamily: "'JetBrains Mono', monospace",
              fontWeight: 600,
              letterSpacing: "0.04em",
              whiteSpace: "nowrap",
              pointerEvents: "none",
              zIndex: 100,
              boxShadow: "0 8px 24px rgba(0, 0, 0, 0.6), 0 0 10px rgba(0, 240, 255, 0.1)",
            }}
          >
            {app.name}
          </motion.div>
        )}
      </AnimatePresence>

      <motion.div
        animate={
          isBouncing && !prefersReducedMotion
            ? { y: [0, -12, 0, -5, 0], scale: [1, 1.14, 0.96, 1.04, 1] }
            : { scale, y: translateY }
        }
        transition={{
          type: "spring",
          stiffness: 420,
          damping: 26,
          mass: 0.5,
        }}
        style={{
          width: 44,
          height: 44,
          borderRadius: 14,
          background: isActive
            ? `radial-gradient(circle at 35% 35%, ${app.color}, #05070D)`
            : isHovered
            ? "rgba(255, 255, 255, 0.10)"
            : "rgba(255, 255, 255, 0.05)",
          border: `1px solid ${isActive ? app.color : isHovered ? "rgba(255,255,255,0.25)" : "rgba(255,255,255,0.1)"}`,
          boxShadow: isActive
            ? `0 0 18px ${app.color}60`
            : isHovered
            ? `0 0 14px rgba(255,255,255,0.15)`
            : "none",
          display: "flex",
          alignItems: "center",
          justifyContent: "center",
          position: "relative",
          willChange: "transform",
        }}
      >
        <i
          className={`fa-solid ${app.icon}`}
          style={{
            color: isActive ? "#fff" : app.color,
            fontSize: 18,
            filter: isActive ? `drop-shadow(0 0 6px ${app.color})` : "none",
            transition: "filter 0.2s ease, color 0.2s ease",
          }}
        />
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
            background: isActive ? "#00F0FF" : "rgba(255,255,255,0.45)",
            boxShadow: isActive ? "0 0 10px #00F0FF" : "none",
            transition: "all 0.25s ease",
          }}
        />
      )}
    </div>
  );
});

export default function AdaptiveDock() {
  const { windows, activeId, openApp, minimize, focusWindow, updateWindow } = useOS();
  const [drawerOpen, setDrawerOpen] = useState(false);
  const [hoveredAppId, setHoveredAppId] = useState(null);
  const [bouncingAppId, setBouncingAppId] = useState(null);
  const [mouseX, setMouseX] = useState(null);
  const lastClickRef = useRef(0);

  const { isTouch } = useBreakpoint();
  const prefersReducedMotion = typeof window !== "undefined" && window.matchMedia?.("(prefers-reduced-motion: reduce)")?.matches;

  const openAppIds = windows.map((w) => w.app);
  const pinnedIds = ["chat", "notes", "files", "browser", "settings", "blackbox", "mirror"];

  const dockApps = APPS.filter(
    (app) => openAppIds.includes(app.id) || pinnedIds.includes(app.id)
  );

  const handleIconClick = useCallback((appId) => {
    const now = Date.now();
    if (now - lastClickRef.current < 400) return;
    lastClickRef.current = now;

    setBouncingAppId(appId);
    setTimeout(() => setBouncingAppId(null), 600);

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
  }, [windows, activeId, updateWindow, focusWindow, minimize, openApp]);

  const onMouseMove = useCallback((e) => {
    if (!isTouch && !prefersReducedMotion) {
      setMouseX(e.clientX);
    }
  }, [isTouch, prefersReducedMotion]);

  const onMouseLeave = useCallback(() => {
    setMouseX(null);
    setHoveredAppId(null);
  }, []);

  return (
    <>
      <motion.div
        initial={{ y: 40, opacity: 0 }}
        animate={{ y: 0, opacity: 1 }}
        transition={{ duration: 0.4, ease: "easeOut" }}
        onMouseMove={onMouseMove}
        onMouseLeave={onMouseLeave}
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
        {dockApps.map((app) => {
          const isOpen = openAppIds.includes(app.id);
          const isActive = windows.find((w) => w.app === app.id)?.id === activeId;

          return (
            <DockItem
              key={app.id}
              app={app}
              isOpen={isOpen}
              isActive={isActive}
              mouseX={mouseX}
              isTouch={isTouch}
              prefersReducedMotion={prefersReducedMotion}
              isBouncing={bouncingAppId === app.id}
              isHovered={hoveredAppId === app.id}
              onHover={() => setHoveredAppId(app.id)}
              onLeave={() => hoveredAppId === app.id && setHoveredAppId(null)}
              onClick={() => handleIconClick(app.id)}
            />
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
            transition: "all 0.2s ease",
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
                    data-testid={`drawer-app-${app.id}`}
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
