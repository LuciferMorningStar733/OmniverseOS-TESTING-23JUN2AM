import React from "react";
import { motion } from "framer-motion";
import { APPS } from "../../lib/apps";

/**
 * OmniverseOS — Samsung One UI Mobile Smart Dock
 * - Smooth squircle icon containers (20px radius)
 * - Deep One UI glassmorphism dock container
 * - Tactile touch response and glowing indicator badges
 */
export default function MobileSmartDock({ onOpenApp, onOpenDrawer }) {
  const hour = new Date().getHours();

  // Compute adaptive preset for time of day
  let presetAppIds = ["chat", "notes", "blackbox", "mirror"];
  if (hour >= 5 && hour < 12) {
    presetAppIds = ["calendar", "tasks", "notes", "chat"];
  } else if (hour >= 12 && hour < 18) {
    presetAppIds = ["chat", "blackbox", "code", "files"];
  } else {
    presetAppIds = ["memory", "mirror", "music", "chat"];
  }

  const smartApps = APPS.filter((a) => presetAppIds.includes(a.id)).slice(0, 4);

  return (
    <div
      style={{
        width: "100%",
        display: "flex",
        alignItems: "center",
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
              display: "flex",
              alignItems: "center",
              justifyContent: "center",
              color: app.color,
              fontSize: 20,
            }}
          >
            <i className={`fa-solid ${app.icon}`} />
          </div>
          <span
            style={{
              fontSize: 10,
              fontWeight: 600,
              color: "rgba(255, 255, 255, 0.75)",
              maxWidth: 52,
              textAlign: "center",
              overflow: "hidden",
              textOverflow: "ellipsis",
              whiteSpace: "nowrap",
            }}
          >
            {app.name}
          </span>
        </motion.div>
      ))}

      {/* App Drawer Launcher */}
      <motion.div
        data-testid="app-drawer-trigger"
        whileTap={{ scale: 0.86 }}
        onClick={onOpenDrawer}
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
            background: "rgba(255, 255, 255, 0.08)",
            border: "1px solid rgba(255, 255, 255, 0.18)",
            display: "flex",
            alignItems: "center",
            justifyContent: "center",
            color: "#fff",
            fontSize: 18,
          }}
        >
          <i className="fa-solid fa-grip" />
        </div>
        <span style={{ fontSize: 10, fontWeight: 600, color: "rgba(255, 255, 255, 0.75)" }}>Apps</span>
      </motion.div>
    </div>
  );
}
