import React from "react";
import { motion } from "framer-motion";
import { getApp } from "../../lib/apps";

<<<<<<< HEAD
export default function MobileSmartDock({ onOpenApp, onOpenDrawer, onOpenChat }) {
  const PINNED_IDS = ["chat", "notes", "swarm", "files"];
=======
/**
 * OmniverseOS — Samsung One UI Mobile Smart Dock
 * - Smooth squircle icon containers (20px radius)
 * - Deep One UI glassmorphism dock container
 * - Tactile touch response and glowing indicator badges
 */
export default function MobileSmartDock({ onOpenApp, onOpenDrawer }) {
  const hour = new Date().getHours();

  // Compute adaptive preset for time of day
  let presetAppIds = ["cortex", "notes", "blackbox", "mirror"];
  if (hour >= 5 && hour < 12) {
    presetAppIds = ["calendar", "tasks", "notes", "chat"];
  } else if (hour >= 12 && hour < 18) {
    presetAppIds = ["chat", "blackbox", "code", "files"];
  } else {
    presetAppIds = ["memory", "mirror", "music", "chat"];
  }

  const smartApps = APPS.filter((a) => presetAppIds.includes(a.id)).slice(0, 4);
>>>>>>> beba0a9 (Revamp mobile UI to Samsung One UI style and verify all AI apps click-by-click with Reticle.)

  return (
    <div
      style={{
        width: "100%",
        display: "flex",
        alignItems: "center",
<<<<<<< HEAD
        justifyContent: "space-between",
        padding: "8px 14px",
        background: "rgba(6, 10, 22, 0.88)",
        borderRadius: 26,
        border: "1px solid rgba(0, 240, 255, 0.2)",
        backdropFilter: "blur(24px)",
        boxShadow: "0 10px 40px rgba(0, 0, 0, 0.7), inset 0 1px 0 rgba(255, 255, 255, 0.1)",
      }}
      data-testid="mobile-smart-dock"
    >
      {/* App 1 & App 2 */}
      {PINNED_IDS.slice(0, 2).map((appId) => {
        const app = getApp(appId) || { id: appId, name: appId, icon: "fa-cube", color: "#00F0FF" };
        return (
          <motion.div
            key={app.id}
            whileTap={{ scale: 0.88 }}
            onClick={() => onOpenApp(app.id)}
            style={{
=======
        justifyContent: "space-around",
        padding: "10px 14px",
        background: "rgba(15, 18, 32, 0.92)",
        borderRadius: 28,
        border: "1px solid rgba(255, 255, 255, 0.12)",
        boxShadow: "0 20px 48px rgba(0, 0, 0, 0.75), 0 0 1px rgba(255, 255, 255, 0.2)",
        backdropFilter: "blur(28px) saturate(180%)",
        WebkitBackdropFilter: "blur(28px) saturate(180%)",
      }}
      data-testid="mobile-smart-dock"
    >
      {smartApps.map((app) => (
        <motion.div
          key={app.id}
          whileTap={{ scale: 0.86 }}
          onClick={() => onOpenApp(app.id)}
          style={{
            display: "flex",
            flexDirection: "column",
            alignItems: "center",
            gap: 4,
            cursor: "pointer",
            WebkitTapHighlightColor: "transparent",
          }}
        >
          <div
            style={{
              width: 48,
              height: 48,
              borderRadius: 18,
              background: `linear-gradient(145deg, ${app.color}28 0%, ${app.color}0D 100%)`,
              border: `1px solid ${app.color}45`,
              boxShadow: `0 6px 20px rgba(0,0,0,0.5), 0 0 12px ${app.color}30`,
>>>>>>> beba0a9 (Revamp mobile UI to Samsung One UI style and verify all AI apps click-by-click with Reticle.)
              display: "flex",
              flexDirection: "column",
              alignItems: "center",
<<<<<<< HEAD
              gap: 3,
              cursor: "pointer",
            }}
          >
            <div
              style={{
                width: 44,
                height: 44,
                borderRadius: 15,
                background: `linear-gradient(135deg, ${app.color}25 0%, rgba(5, 8, 16, 0.8) 100%)`,
                border: `1px solid ${app.color}55`,
                boxShadow: `0 4px 16px ${app.color}25`,
                display: "flex",
                alignItems: "center",
                justifyContent: "center",
                position: "relative",
              }}
            >
              <i className={`fa-solid ${app.icon}`} style={{ color: app.color, fontSize: 18 }} />
              {/* Active glow dot */}
              <div
                style={{
                  position: "absolute",
                  bottom: -2,
                  width: 4,
                  height: 4,
                  borderRadius: "50%",
                  background: app.color,
                  boxShadow: `0 0 6px ${app.color}`,
                }}
              />
            </div>
            <span style={{ fontSize: 9.5, fontWeight: 700, color: "rgba(255, 255, 255, 0.75)" }}>
              {app.name}
            </span>
          </motion.div>
        );
      })}

      {/* ── Central Cortex Orb (Hero Action Button) ───────────────────── */}
      <motion.div
        whileTap={{ scale: 0.9 }}
        onClick={() => (onOpenChat ? onOpenChat() : onOpenApp("chat"))}
        style={{
          display: "flex",
          flexDirection: "column",
          alignItems: "center",
          gap: 3,
          cursor: "pointer",
          margin: "0 4px",
        }}
      >
        <div
          style={{
            width: 52,
            height: 52,
            borderRadius: "50%",
            background: "radial-gradient(circle at 35% 35%, #00F0FF 0%, #7B2FFF 60%, #030408 100%)",
            border: "1.5px solid rgba(0, 240, 255, 0.8)",
            boxShadow: "0 0 24px rgba(0, 240, 255, 0.6), 0 0 40px rgba(123, 47, 255, 0.35)",
            display: "flex",
            alignItems: "center",
            justifyContent: "center",
            position: "relative",
          }}
        >
          {/* Animated pulsing orbit ring */}
          <motion.div
            animate={{ rotate: 360 }}
            transition={{ duration: 6, repeat: Infinity, ease: "linear" }}
            style={{
              position: "absolute",
              inset: -4,
              borderRadius: "50%",
              border: "1px dashed rgba(0, 240, 255, 0.4)",
              pointerEvents: "none",
            }}
          />
          <i className="fa-solid fa-atom" style={{ color: "#fff", fontSize: 22, filter: "drop-shadow(0 0 6px #00F0FF)" }} />
        </div>
        <span style={{ fontSize: 9.5, fontWeight: 900, color: "#00F0FF", letterSpacing: "0.05em" }}>
          CORTEX
        </span>
      </motion.div>

      {/* App 3 & App 4 */}
      {PINNED_IDS.slice(2, 4).map((appId) => {
        const app = getApp(appId) || { id: appId, name: appId, icon: "fa-cube", color: "#39FF14" };
        return (
          <motion.div
            key={app.id}
            whileTap={{ scale: 0.88 }}
            onClick={() => onOpenApp(app.id)}
            style={{
              display: "flex",
              flexDirection: "column",
              alignItems: "center",
              gap: 3,
              cursor: "pointer",
            }}
          >
            <div
              style={{
                width: 44,
                height: 44,
                borderRadius: 15,
                background: `linear-gradient(135deg, ${app.color}25 0%, rgba(5, 8, 16, 0.8) 100%)`,
                border: `1px solid ${app.color}55`,
                boxShadow: `0 4px 16px ${app.color}25`,
                display: "flex",
                alignItems: "center",
                justifyContent: "center",
                position: "relative",
              }}
            >
              <i className={`fa-solid ${app.icon}`} style={{ color: app.color, fontSize: 18 }} />
              <div
                style={{
                  position: "absolute",
                  bottom: -2,
                  width: 4,
                  height: 4,
                  borderRadius: "50%",
                  background: app.color,
                  boxShadow: `0 0 6px ${app.color}`,
                }}
              />
            </div>
            <span style={{ fontSize: 9.5, fontWeight: 700, color: "rgba(255, 255, 255, 0.75)" }}>
              {app.name}
            </span>
          </motion.div>
        );
      })}
=======
              justifyContent: "center",
              position: "relative",
            }}
          >
            <i className={`fa-solid ${app.icon}`} style={{ color: app.color, fontSize: 19 }} />
          </div>
          <span style={{ fontSize: 10, fontWeight: 600, color: "rgba(248,250,252,0.85)", fontFamily: "'Outfit', sans-serif" }}>
            {app.name}
          </span>
        </motion.div>
      ))}
>>>>>>> beba0a9 (Revamp mobile UI to Samsung One UI style and verify all AI apps click-by-click with Reticle.)

      {/* Samsung One UI App Drawer Launcher */}
      <motion.div
<<<<<<< HEAD
        whileTap={{ scale: 0.88 }}
=======
        whileTap={{ scale: 0.86 }}
>>>>>>> beba0a9 (Revamp mobile UI to Samsung One UI style and verify all AI apps click-by-click with Reticle.)
        onClick={onOpenDrawer}
        style={{
          display: "flex",
          flexDirection: "column",
          alignItems: "center",
          gap: 3,
          cursor: "pointer",
          WebkitTapHighlightColor: "transparent",
        }}
      >
        <div
          style={{
<<<<<<< HEAD
            width: 44,
            height: 44,
            borderRadius: 15,
            background: "rgba(255, 255, 255, 0.05)",
            border: "1px solid rgba(255, 255, 255, 0.15)",
=======
            width: 48,
            height: 48,
            borderRadius: 18,
            background: "linear-gradient(145deg, rgba(62, 123, 250, 0.25) 0%, rgba(62, 123, 250, 0.08) 100%)",
            border: "1px solid rgba(62, 123, 250, 0.4)",
            boxShadow: "0 6px 20px rgba(0,0,0,0.5), 0 0 12px rgba(62, 123, 250, 0.25)",
>>>>>>> beba0a9 (Revamp mobile UI to Samsung One UI style and verify all AI apps click-by-click with Reticle.)
            display: "flex",
            alignItems: "center",
            justifyContent: "center",
            color: "#60A5FA",
          }}
        >
<<<<<<< HEAD
          <i className="fa-solid fa-grip" style={{ fontSize: 18, color: "rgba(255, 255, 255, 0.85)" }} />
        </div>
        <span style={{ fontSize: 9.5, fontWeight: 700, color: "rgba(255, 255, 255, 0.75)" }}>
          Drawer
=======
          <i className="fa-solid fa-grip-vertical" style={{ fontSize: 19 }} />
        </div>
        <span style={{ fontSize: 10, fontWeight: 600, color: "#60A5FA", fontFamily: "'Outfit', sans-serif" }}>
          Apps
>>>>>>> beba0a9 (Revamp mobile UI to Samsung One UI style and verify all AI apps click-by-click with Reticle.)
        </span>
      </motion.div>
    </div>
  );
}
