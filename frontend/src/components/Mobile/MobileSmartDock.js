import React, { useState } from "react";
import { motion } from "framer-motion";
import { APPS } from "../../lib/apps";

export default function MobileSmartDock({ onOpenApp, onOpenDrawer }) {
  const hour = new Date().getHours();

  // Compute adaptive preset
  let presetAppIds = ["cortex", "notes", "blackbox", "mirror"];
  if (hour >= 5 && hour < 12) {
    presetAppIds = ["calendar", "tasks", "focus", "notes"];
  } else if (hour >= 12 && hour < 18) {
    presetAppIds = ["cortex", "blackbox", "code", "files"];
  } else {
    presetAppIds = ["memory", "mirror", "music", "focus"];
  }

  const smartApps = APPS.filter((a) => presetAppIds.includes(a.id));

  return (
    <div
      style={{
        width: "100%",
        display: "flex",
        alignItems: "center",
        justifyContent: "space-around",
        padding: "10px 16px",
        background: "rgba(8, 12, 24, 0.9)",
        borderRadius: 22,
        border: "1px solid rgba(255, 255, 255, 0.1)",
        backdropFilter: "blur(20px)",
      }}
      data-testid="mobile-smart-dock"
    >
      {smartApps.map((app) => (
        <motion.div
          key={app.id}
          whileTap={{ scale: 0.9 }}
          onClick={() => onOpenApp(app.id)}
          style={{
            display: "flex",
            flexDirection: "column",
            alignItems: "center",
            gap: 4,
            cursor: "pointer",
          }}
        >
          <div
            style={{
              width: 44,
              height: 44,
              borderRadius: 14,
              background: `radial-gradient(circle at 35% 35%, ${app.color}, #030408)`,
              border: `1px solid ${app.color}`,
              boxShadow: `0 0 16px ${app.color}40`,
              display: "flex",
              alignItems: "center",
              justifyContent: "center",
            }}
          >
            <i className={`fa-solid ${app.icon}`} style={{ color: "#fff", fontSize: 18 }} />
          </div>
          <span style={{ fontSize: 10, fontWeight: 700, color: "rgba(255,255,255,0.8)" }}>
            {app.name}
          </span>
        </motion.div>
      ))}

      {/* App Drawer Trigger */}
      <motion.div
        whileTap={{ scale: 0.9 }}
        onClick={onOpenDrawer}
        style={{
          display: "flex",
          flexDirection: "column",
          alignItems: "center",
          gap: 4,
          cursor: "pointer",
        }}
      >
        <div
          style={{
            width: 44,
            height: 44,
            borderRadius: 14,
            background: "rgba(255,255,255,0.06)",
            border: "1px solid rgba(255,255,255,0.15)",
            display: "flex",
            alignItems: "center",
            justifyContent: "center",
            color: "#fff",
          }}
        >
          <i className="fa-solid fa-grip" style={{ fontSize: 18 }} />
        </div>
        <span style={{ fontSize: 10, fontWeight: 700, color: "rgba(255,255,255,0.8)" }}>
          Drawer
        </span>
      </motion.div>
    </div>
  );
}
