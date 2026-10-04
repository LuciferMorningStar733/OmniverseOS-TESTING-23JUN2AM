import React, { useState, useEffect } from "react";
import { motion, AnimatePresence } from "framer-motion";
import MobileIntelligenceStacks from "./Mobile/MobileIntelligenceStacks";
import MobileSmartDock from "./Mobile/MobileSmartDock";
import CortexPill from "./Mobile/CortexPill";
import MobileAppDrawer from "./MobileAppDrawer";
import MobileAIChat from "./Mobile/MobileAIChat";
import { APPS } from "../lib/apps";

export default function MobileHomeScreen({ onOpenApp }) {
  const [drawerOpen, setDrawerOpen] = useState(false);
  const [chatOpen, setChatOpen] = useState(false);
  const [initialChatPrompt, setInitialChatPrompt] = useState("");
  const [controlCenterOpen, setControlCenterOpen] = useState(false);
  const [quickNote, setQuickNote] = useState("");
  const [noteSaved, setNoteSaved] = useState(false);
  const [wifiActive, setWifiActive] = useState(true);
  const [quantumMesh, setQuantumMesh] = useState(true);
  const [focusMode, setFocusMode] = useState(false);
  const [batterySaver, setBatterySaver] = useState(false);

  // Time & Weather State
  const [timeStr, setTimeStr] = useState("");
  const [dateStr, setDateStr] = useState("");
  const [greeting, setGreeting] = useState("Good Day");
  const [period, setPeriod] = useState("Morning");
  const [trackIndex, setTrackIndex] = useState(0);
  const [isPlaying, setIsPlaying] = useState(false);

  const TRACKS = [
    { title: "Synthetic Horizons", artist: "Cortex Audio Labs" },
    { title: "Neural Resonance", artist: "Omniverse Sub-Zero" },
    { title: "Cybernetic Pulse", artist: "DeepSeek Ambient" },
  ];

  useEffect(() => {
    const updateTime = () => {
      const now = new Date();
      const hrs = now.getHours();
      const mins = now.getMinutes().toString().padStart(2, "0");
      const secs = now.getSeconds().toString().padStart(2, "0");
      setTimeStr(`${hrs}:${mins}:${secs}`);

      const options = { weekday: "short", month: "short", day: "numeric" };
      setDateStr(now.toLocaleDateString("en-US", options));

      if (hrs < 12) {
        setGreeting("Good Morning");
        setPeriod("Morning");
      } else if (hrs < 17) {
        setGreeting("Good Afternoon");
        setPeriod("Afternoon");
      } else {
        setGreeting("Good Evening");
        setPeriod("Evening");
      }
    };
    updateTime();
    const interval = setInterval(updateTime, 1000);
    return () => clearInterval(interval);
  }, []);

  const openChatWithPrompt = (prompt) => {
    setInitialChatPrompt(prompt);
    setChatOpen(true);
  };

  const handleSaveQuickNote = () => {
    if (!quickNote.trim()) return;
    try {
      const notes = JSON.parse(localStorage.getItem("omniverse_notes") || "[]");
      notes.unshift({
        id: Date.now().toString(),
        title: "Quick Note",
        content: quickNote.trim(),
        date: new Date().toISOString(),
      });
      localStorage.setItem("omniverse_notes", JSON.stringify(notes));
      setNoteSaved(true);
      setTimeout(() => {
        setQuickNote("");
        setNoteSaved(false);
      }, 1200);
    } catch (e) {
      console.warn("Could not save quick note:", e);
    }
  };

  return (
    <div
      style={{
        width: "100%",
        minHeight: "100%",
        position: "fixed",
        inset: 0,
        background: "radial-gradient(ellipse at 50% 20%, #111424 0%, #07080E 70%, #030407 100%)",
        color: "#fff",
        display: "flex",
        flexDirection: "column",
        justifyContent: "space-between",
        padding: "env(safe-area-inset-top, 12px) 0 max(80px, env(safe-area-inset-bottom, 80px)) 0",
        overflowY: "auto",
        WebkitOverflowScrolling: "touch",
        zIndex: 10,
        fontFamily: "'Outfit', -apple-system, BlinkMacSystemFont, sans-serif",
      }}
      data-testid="mobile-home-screen"
    >
      {/* ── ONE UI TOP VIEWING AREA (Reachability Header) ────────────────────── */}
      <div style={{ padding: "16px 22px 0 22px" }}>
        {/* Top Status Bar & Quick Actions */}
        <div style={{ display: "flex", alignItems: "center", justifyContent: "space-between" }}>
          <div style={{ display: "flex", alignItems: "center", gap: 10 }}>
            <motion.div
              animate={{ scale: [1, 1.25, 1], opacity: [0.75, 1, 0.75] }}
              transition={{ duration: 2.2, repeat: Infinity, ease: "easeInOut" }}
              style={{
                width: 9,
                height: 9,
                borderRadius: "50%",
                background: "#3E7BFA",
                boxShadow: "0 0 12px #3E7BFA",
              }}
            />
            <span style={{ fontSize: 11, fontWeight: 700, color: "#4D8DFF", letterSpacing: "0.12em", textTransform: "uppercase" }}>
              One UI · Cortex Core
            </span>
          </div>

          {/* Center: Live Time */}
          <div style={{ fontSize: 11, fontFamily: "monospace", color: "#fff", fontWeight: 700, letterSpacing: "0.08em" }}>
            {timeStr.slice(0, 5) || "12:00"}
          </div>

          {/* Right: Quantum Telemetry & Battery */}
          <div style={{ display: "flex", alignItems: "center", gap: 10 }}>
            <span style={{ fontSize: 9.5, fontFamily: "monospace", color: "#39FF14" }}>
              12ms
            </span>
            <div style={{ display: "flex", alignItems: "center", gap: 4, color: "rgba(255, 255, 255, 0.8)" }}>
              <i className="fa-solid fa-bolt" style={{ fontSize: 9, color: "#00F0FF" }} />
              <span style={{ fontSize: 9.5, fontFamily: "monospace" }}>94%</span>
            </div>
          </div>
        </div>
      </div>

      {/* ── 2. CYBERPUNK CLOCK & AMBIENT WEATHER HUD ─────────────────────── */}
      <div style={{ padding: "0 20px", marginBottom: 18 }}>
        <div style={{ display: "flex", alignItems: "flex-end", justifyContent: "space-between" }}>
          <div>
            <div style={{ fontSize: 38, fontWeight: 900, fontFamily: "'Outfit', sans-serif", letterSpacing: "-0.03em", lineHeight: 1 }}>
              {timeStr ? timeStr.slice(0, 5) : "12:00"}
              <span style={{ fontSize: 18, color: "#00F0FF", fontWeight: 600, marginLeft: 4 }}>
                {timeStr ? timeStr.slice(5) : ":00"}
              </span>
            </div>
            <div style={{ fontSize: 13, color: "rgba(255, 255, 255, 0.65)", marginTop: 4, fontWeight: 600 }}>
              {dateStr || "Today"} · {greeting}, Operator
            </div>
          </div>

          {/* Weather Glance Card */}
          <button
            onClick={() => setChatOpen(true)}
            style={{
              padding: "7px 14px",
              borderRadius: 20,
              background: "rgba(62, 123, 250, 0.16)",
              border: "1px solid rgba(62, 123, 250, 0.35)",
              color: "#60A5FA",
              fontSize: 11.5,
              fontWeight: 700,
              cursor: "pointer",
              boxShadow: "0 4px 14px rgba(62, 123, 250, 0.15)",
              backdropFilter: "blur(12px)",
              display: "flex",
              alignItems: "center",
              gap: 6,
            }}
          >
            <i className="fa-solid fa-sparkles text-[#60A5FA]" /> AI Assistant
          </button>
        </div>

        {/* Big One UI Header Title */}
        <div style={{ marginTop: 22 }}>
          <h1 style={{ fontSize: 28, fontWeight: 800, color: "#F8FAFC", margin: 0, lineHeight: 1.15, letterSpacing: "-0.02em" }}>
            Good {period}, Operator
          </h1>
          <div style={{ fontSize: 13.5, color: "#94A3B8", marginTop: 6, fontWeight: 400 }}>
            System operational · 3 Cortex insights awaiting review
          </div>
        </div>
      </div>

      {/* ── ONE UI CENTRAL WIDGET SURFACE ───────────────────────────────────── */}
      <div style={{ padding: "0 18px", margin: "14px 0" }}>
        <motion.div
          whileTap={{ scale: 0.98 }}
          onClick={() => setChatOpen(true)}
          style={{
            padding: "20px 22px",
            borderRadius: 28,
            background: "linear-gradient(135deg, rgba(20, 26, 46, 0.85) 0%, rgba(12, 15, 28, 0.95) 100%)",
            border: "1px solid rgba(255, 255, 255, 0.12)",
            boxShadow: "0 16px 40px rgba(0, 0, 0, 0.6), 0 0 30px rgba(62, 123, 250, 0.12)",
            backdropFilter: "blur(24px)",
            cursor: "pointer",
          }}
        >
          <div style={{ display: "flex", alignItems: "center", justifyContent: "space-between", marginBottom: 8 }}>
            <span style={{ fontSize: 10.5, fontWeight: 700, color: "#3E7BFA", letterSpacing: "0.1em", textTransform: "uppercase" }}>
              CORTEX INTELLIGENCE SURFACE
            </span>
            <span style={{ fontSize: 10, color: "#64748B", fontWeight: 600 }}>Tap to invoke</span>
          </div>

          <div style={{ fontSize: 16, fontWeight: 700, color: "#F8FAFC", lineHeight: 1.3 }}>
            "What would you like to achieve right now?"
          </div>

          <div style={{ display: "flex", gap: 7, flexWrap: "wrap", marginTop: 14 }}>
            {["⚡ Optimize Schedule", "🧠 Deep Analysis", "🛡️ Adversary Spar", "📊 Market Radar"].map((chip) => (
              <span
                key={chip}
                style={{
                  fontSize: 11,
                  padding: "5px 12px",
                  borderRadius: 16,
                  background: "rgba(255, 255, 255, 0.07)",
                  border: "1px solid rgba(255, 255, 255, 0.12)",
                  color: "#CBD5E1",
                  fontWeight: 600,
                }}
              >
                {chip}
              </span>
            ))}
          </div>
        </motion.div>
      </div>

      {/* ── ONE UI INTELLIGENCE STACKS & CARDS ──────────────────────────────── */}
      <MobileIntelligenceStacks onOpenApp={onOpenApp} />

      {/* ── ONE UI BOTTOM INTERACTION ZONE (Smart Dock & Action Surface) ─────── */}
      <div style={{ padding: "12px 14px 0 14px" }}>
        <MobileSmartDock onOpenApp={onOpenApp} onOpenDrawer={() => setDrawerOpen(true)} />
      </div>

      {/* ── ONE UI FLOATING CORTEX PILL ────────────────────────────────────── */}
      <CortexPill onOpenApp={onOpenApp} onQuerySubmit={() => setChatOpen(true)} />

      {/* ── APP DRAWER MODAL (120HZ COMPOSITOR) ───────────────────────── */}
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

      {/* ── FULL-SCREEN MOBILE AI CHAT ─────────────────────────────────── */}
      <AnimatePresence>
        {chatOpen && (
          <MobileAIChat
            initialPrompt={initialChatPrompt}
            onClose={() => {
              setChatOpen(false);
              setInitialChatPrompt("");
            }}
          />
        )}
      </AnimatePresence>

      {/* ── QUICK CONTROL CENTER OVERLAY ─────────────────────────────── */}
      <AnimatePresence>
        {controlCenterOpen && (
          <motion.div
            initial={{ opacity: 0, y: -40 }}
            animate={{ opacity: 1, y: 0 }}
            exit={{ opacity: 0, y: -40 }}
            style={{
              position: "fixed",
              top: 12,
              left: 16,
              right: 16,
              zIndex: 300,
              padding: "18px",
              borderRadius: 24,
              background: "rgba(6, 10, 24, 0.98)",
              border: "1.5px solid rgba(0, 240, 255, 0.4)",
              boxShadow: "0 20px 60px rgba(0, 0, 0, 0.9), 0 0 30px rgba(0, 240, 255, 0.3)",
              backdropFilter: "blur(32px)",
            }}
          >
            <div style={{ display: "flex", alignItems: "center", justifyContent: "space-between", marginBottom: 14 }}>
              <div style={{ display: "flex", alignItems: "center", gap: 8 }}>
                <i className="fa-solid fa-sliders" style={{ color: "#00F0FF", fontSize: 14 }} />
                <span style={{ fontSize: 13, fontWeight: 900, letterSpacing: "0.05em", color: "#fff" }}>
                  CONTROL CENTER // 2099
                </span>
              </div>
              <button
                onClick={() => setControlCenterOpen(false)}
                style={{
                  width: 28,
                  height: 28,
                  borderRadius: "50%",
                  background: "rgba(255, 255, 255, 0.08)",
                  border: "none",
                  color: "rgba(255, 255, 255, 0.6)",
                  cursor: "pointer",
                }}
              >
                <i className="fa-solid fa-xmark" style={{ fontSize: 12 }} />
              </button>
            </div>

            {/* Quick Toggles Grid */}
            <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr", gap: 10, marginBottom: 14 }}>
              {[
                { label: "Wi-Fi 7", active: wifiActive, toggle: () => setWifiActive(!wifiActive), icon: "fa-wifi" },
                { label: "Quantum Mesh", active: quantumMesh, toggle: () => setQuantumMesh(!quantumMesh), icon: "fa-atom" },
                { label: "Focus Tunnel", active: focusMode, toggle: () => setFocusMode(!focusMode), icon: "fa-moon" },
                { label: "Battery Saver", active: batterySaver, toggle: () => setBatterySaver(!batterySaver), icon: "fa-battery-three-quarters" },
              ].map((tog) => (
                <button
                  key={tog.label}
                  onClick={tog.toggle}
                  style={{
                    padding: "12px",
                    borderRadius: 16,
                    background: tog.active ? "rgba(0, 240, 255, 0.16)" : "rgba(255, 255, 255, 0.04)",
                    border: `1px solid ${tog.active ? "#00F0FF" : "rgba(255, 255, 255, 0.08)"}`,
                    color: tog.active ? "#00F0FF" : "rgba(255, 255, 255, 0.6)",
                    display: "flex",
                    alignItems: "center",
                    gap: 10,
                    cursor: "pointer",
                  }}
                >
                  <i className={`fa-solid ${tog.icon}`} style={{ fontSize: 14 }} />
                  <div style={{ textAlign: "left" }}>
                    <div style={{ fontSize: 11, fontWeight: 800 }}>{tog.label}</div>
                    <div style={{ fontSize: 9, opacity: 0.7, fontFamily: "monospace" }}>
                      {tog.active ? "ON" : "OFF"}
                    </div>
                  </div>
                </button>
              ))}
            </div>

            {/* Quick App Shortcut Row */}
            <div style={{ display: "flex", gap: 8, justifyContent: "space-between" }}>
              {[
                { id: "settings", name: "Settings", icon: "fa-gear" },
                { id: "finance", name: "Finance", icon: "fa-chart-line" },
                { id: "analytics", name: "Analytics", icon: "fa-chart-pie" },
                { id: "code", name: "Code", icon: "fa-code" },
              ].map((shortcut) => (
                <button
                  key={shortcut.id}
                  onClick={() => {
                    setControlCenterOpen(false);
                    onOpenApp(shortcut.id);
                  }}
                  style={{
                    flex: 1,
                    padding: "8px 4px",
                    borderRadius: 12,
                    background: "rgba(255, 255, 255, 0.05)",
                    border: "1px solid rgba(255, 255, 255, 0.08)",
                    color: "#fff",
                    fontSize: 10,
                    fontWeight: 700,
                    cursor: "pointer",
                    display: "flex",
                    flexDirection: "column",
                    alignItems: "center",
                    gap: 4,
                  }}
                >
                  <i className={`fa-solid ${shortcut.icon}`} style={{ fontSize: 12, color: "#00F0FF" }} />
                  <span>{shortcut.name}</span>
                </button>
              ))}
            </div>
          </motion.div>
        )}
      </AnimatePresence>
    </div>
  );
}
