import React, { useState, useEffect } from "react";
import { motion, AnimatePresence } from "framer-motion";
import CortexPill from "./Mobile/CortexPill";
import MobileIntelligenceStacks from "./Mobile/MobileIntelligenceStacks";
import MobileSmartDock from "./Mobile/MobileSmartDock";
import MobileAIChat from "./Mobile/MobileAIChat";
import MobileAppDrawer from "./MobileAppDrawer";
import { useOS } from "../context/OSContext";
import { getUserNickname } from "../lib/userNickname";

export default function MobileHomeScreen({ onOpenApp, onOpenSearch }) {
  const { user } = useOS();
  const [drawerOpen, setDrawerOpen] = useState(false);
  const [chatOpen, setChatOpen] = useState(false);
  const [userName, setUserName] = useState(() => getUserNickname(user, "there"));

  useEffect(() => {
    setUserName(getUserNickname(user, "there"));
    const handleNameChange = () => {
      setUserName(getUserNickname(user, "there"));
    };
    window.addEventListener("omniverse:user-name-changed", handleNameChange);
    window.addEventListener("storage", handleNameChange);
    return () => {
      window.removeEventListener("omniverse:user-name-changed", handleNameChange);
      window.removeEventListener("storage", handleNameChange);
    };
  }, [user]);

  const hour = new Date().getHours();
  const period = hour < 5 ? "night" : hour < 12 ? "morning" : hour < 17 ? "afternoon" : "evening";

  return (
    <div
      style={{
        width: "100%",
        height: "100%",
        position: "fixed",
        inset: 0,
        background: "radial-gradient(circle at 50% 30%, #080D1A 0%, #030407 100%)",
        color: "#fff",
        display: "flex",
        flexDirection: "column",
        justifyContent: "space-between",
        padding: "16px 0 90px 0",
        overflowY: "auto",
        zIndex: 10,
      }}
      data-testid="mobile-home-screen"
    >
      {/* Top Living Cortex Presence & Context Header */}
      <div style={{ padding: "0 20px" }}>
        <div style={{ display: "flex", alignItems: "center", justifyContent: "space-between" }}>
          <div style={{ display: "flex", alignItems: "center", gap: 8 }}>
            <motion.div
              animate={{ scale: [1, 1.2, 1], opacity: [0.7, 1, 0.7] }}
              transition={{ duration: 2, repeat: Infinity }}
              style={{ width: 8, height: 8, borderRadius: "50%", background: "#00F0FF", boxShadow: "0 0 10px #00F0FF" }}
            />
            <span style={{ fontSize: 10, fontFamily: "monospace", color: "#00F0FF", letterSpacing: "0.15em" }}>
              CORTEX OS // LIVING ENTITY
            </span>
          </div>

          <button
            onClick={() => setChatOpen(true)}
            style={{
              padding: "6px 12px",
              borderRadius: 12,
              background: "rgba(0,240,255,0.1)",
              border: "1px solid rgba(0,240,255,0.3)",
              color: "#00F0FF",
              fontSize: 11,
              fontWeight: 800,
              cursor: "pointer",
            }}
          >
            <i className="fa-solid fa-comments mr-1.5" /> CHAT
          </button>
        </div>

        {/* Hero Context Greeting */}
        <div style={{ marginTop: 16 }}>
          <h1 style={{ fontSize: 24, fontWeight: 900, color: "#fff", margin: 0, lineHeight: 1.2 }}>
            Good {period}, {userName}.
          </h1>
          <div style={{ fontSize: 13, color: "rgba(255,255,255,0.6)", marginTop: 4 }}>
            3 priority items compete for your attention.
          </div>
        </div>
      </div>

      {/* Central Action Surface ("What do you need?") */}
      <div style={{ padding: "0 20px", margin: "16px 0" }}>
        <div
          onClick={() => setChatOpen(true)}
          style={{
            padding: 18,
            borderRadius: 20,
            background: "rgba(10, 14, 28, 0.85)",
            border: "1px solid rgba(0, 240, 255, 0.25)",
            boxShadow: "0 10px 30px rgba(0, 240, 255, 0.1)",
            cursor: "pointer",
          }}
        >
          <div style={{ fontSize: 10, fontFamily: "monospace", color: "rgba(255,255,255,0.4)", marginBottom: 4 }}>
            CENTRAL ACTION SURFACE
          </div>
          <div style={{ fontSize: 15, fontWeight: 700, color: "#fff" }}>
            "What do you need to focus on today?"
          </div>

          <div style={{ display: "flex", gap: 6, flexWrap: "wrap", marginTop: 12 }}>
            {["Fix my schedule", "Help me think", "Open strategy workspace"].map((chip) => (
              <span
                key={chip}
                style={{
                  fontSize: 10,
                  padding: "4px 8px",
                  borderRadius: 8,
                  background: "rgba(255,255,255,0.06)",
                  color: "rgba(255,255,255,0.75)",
                  fontFamily: "monospace",
                }}
              >
                {chip}
              </span>
            ))}
          </div>
        </div>
      </div>

      {/* Mobile Intelligence Stacks */}
      <MobileIntelligenceStacks onOpenApp={onOpenApp} />

      {/* Mobile Smart Dock */}
      <div style={{ padding: "16px 16px 0 16px" }}>
        <MobileSmartDock onOpenApp={onOpenApp} onOpenDrawer={() => setDrawerOpen(true)} />
      </div>

      {/* Cortex Pill */}
      <CortexPill onOpenApp={onOpenApp} onQuerySubmit={() => setChatOpen(true)} />

      {/* App Drawer Modal */}
      <AnimatePresence>
        {drawerOpen && (
          <MobileAppDrawer
            isOpen={drawerOpen}
            onClose={() => setDrawerOpen(false)}
            onOpenApp={(id) => {
              setDrawerOpen(false);
              onOpenApp(id);
            }}
          />
        )}
      </AnimatePresence>

      {/* Full-Screen Mobile AI Chat */}
      <AnimatePresence>
        {chatOpen && <MobileAIChat onClose={() => setChatOpen(false)} />}
      </AnimatePresence>
    </div>
  );
}
