import React, { useState, useEffect } from "react";
import { motion, AnimatePresence } from "framer-motion";
import CortexPill from "./Mobile/CortexPill";
import MobileIntelligenceStacks from "./Mobile/MobileIntelligenceStacks";
import MobileSmartDock from "./Mobile/MobileSmartDock";
import MobileAIChat from "./Mobile/MobileAIChat";
import MobileAppDrawer from "./MobileAppDrawer";

export default function MobileHomeScreen({ onOpenApp, onOpenSearch }) {
  const [drawerOpen, setDrawerOpen] = useState(false);
  const [chatOpen, setChatOpen] = useState(false);
  const [initialChatPrompt, setInitialChatPrompt] = useState("");
  const [controlCenterOpen, setControlCenterOpen] = useState(false);

  // Live Clock & Date
  const [timeStr, setTimeStr] = useState("");
  const [dateStr, setDateStr] = useState("");
  const [greeting, setGreeting] = useState("Good day");

  // Mini Music Player State
  const [isPlaying, setIsPlaying] = useState(false);
  const [trackIndex, setTrackIndex] = useState(0);
  const TRACKS = [
    { title: "Cyber Pulse 2099", artist: "Vangelis Neural" },
    { title: "Quantum Horizon", artist: "Cortex Core" },
    { title: "Synthetic Rain", artist: "Neotokyo Grid" },
  ];

  // Quick Scratchpad
  const [quickNote, setQuickNote] = useState("");
  const [noteSaved, setNoteSaved] = useState(false);

  // Quick Controls Toggles
  const [wifiActive, setWifiActive] = useState(true);
  const [quantumMesh, setQuantumMesh] = useState(true);
  const [focusMode, setFocusMode] = useState(false);
  const [batterySaver, setBatterySaver] = useState(false);

  useEffect(() => {
    const updateTime = () => {
      const now = new Date();
      setTimeStr(
        now.toLocaleTimeString([], { hour: "2-digit", minute: "2-digit", second: "2-digit", hour12: false })
      );
      setDateStr(
        now.toLocaleDateString([], { weekday: "short", month: "short", day: "numeric" })
      );
      const hour = now.getHours();
      setGreeting(
        hour < 5 ? "Good night" : hour < 12 ? "Good morning" : hour < 17 ? "Good afternoon" : "Good evening"
      );
    };
    updateTime();
    const interval = setInterval(updateTime, 1000);
    return () => clearInterval(interval);
  }, []);

  const openChatWithPrompt = (promptText) => {
    setInitialChatPrompt(promptText);
    setChatOpen(true);
  };

  const handleSaveQuickNote = () => {
    if (!quickNote.trim()) return;
    try {
      const existing = JSON.parse(localStorage.getItem("omniverse_notes_scratch") || "[]");
      existing.unshift({
        id: Date.now(),
        text: quickNote,
        created: new Date().toISOString(),
      });
      localStorage.setItem("omniverse_notes_scratch", JSON.stringify(existing));
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
        background: "radial-gradient(ellipse at 50% 15%, #0d1530 0%, #030408 75%)",
        color: "#fff",
        display: "flex",
        flexDirection: "column",
        padding: "12px 0 110px 0",
        overflowY: "auto",
        WebkitOverflowScrolling: "touch",
        zIndex: 10,
      }}
      data-testid="mobile-home-screen"
    >
      {/* ── 1. CORTEX DYNAMIC ISLAND / STATUS CAPSULE ─────────────────────── */}
      <div style={{ padding: "0 16px", marginBottom: 16 }}>
        <motion.div
          whileTap={{ scale: 0.97 }}
          onClick={() => setControlCenterOpen(true)}
          style={{
            padding: "8px 14px",
            borderRadius: 24,
            background: "rgba(10, 16, 32, 0.85)",
            border: "1px solid rgba(0, 240, 255, 0.25)",
            boxShadow: "0 4px 20px rgba(0, 0, 0, 0.5), 0 0 15px rgba(0, 240, 255, 0.15)",
            backdropFilter: "blur(20px)",
            display: "flex",
            alignItems: "center",
            justifyContent: "space-between",
            cursor: "pointer",
          }}
        >
          {/* Left: Cortex Entity indicator */}
          <div style={{ display: "flex", alignItems: "center", gap: 8 }}>
            <motion.div
              animate={{ scale: [1, 1.3, 1], opacity: [0.7, 1, 0.7] }}
              transition={{ duration: 1.8, repeat: Infinity }}
              style={{
                width: 8,
                height: 8,
                borderRadius: "50%",
                background: "#00F0FF",
                boxShadow: "0 0 10px #00F0FF",
              }}
            />
            <span style={{ fontSize: 10, fontFamily: "monospace", color: "#00F0FF", letterSpacing: "0.12em", fontWeight: 800 }}>
              CORTEX // 2099
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
        </motion.div>
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
          <div
            style={{
              padding: "8px 12px",
              borderRadius: 16,
              background: "rgba(255, 255, 255, 0.04)",
              border: "1px solid rgba(255, 255, 255, 0.08)",
              display: "flex",
              alignItems: "center",
              gap: 8,
              textAlign: "right",
            }}
          >
            <div>
              <div style={{ fontSize: 13, fontWeight: 800, color: "#fff" }}>24°C</div>
              <div style={{ fontSize: 9.5, color: "rgba(255, 255, 255, 0.5)", fontFamily: "monospace" }}>NEOTOKYO</div>
            </div>
            <i className="fa-solid fa-cloud-moon" style={{ fontSize: 18, color: "#00F0FF" }} />
          </div>
        </div>
      </div>

      {/* ── 3. CENTRAL ACTION SURFACE (DIRECT PROMPT DISPATCH) ───────────── */}
      <div style={{ padding: "0 16px", marginBottom: 18 }}>
        <div
          style={{
            padding: "16px 18px",
            borderRadius: 22,
            background: "radial-gradient(ellipse at 70% 0%, rgba(0, 240, 255, 0.12) 0%, rgba(10, 15, 30, 0.9) 100%)",
            border: "1px solid rgba(0, 240, 255, 0.3)",
            boxShadow: "0 10px 30px rgba(0, 0, 0, 0.6), 0 0 20px rgba(0, 240, 255, 0.12)",
          }}
        >
          <div style={{ display: "flex", alignItems: "center", justifyContent: "space-between", marginBottom: 6 }}>
            <span style={{ fontSize: 10, fontFamily: "monospace", color: "#00F0FF", letterSpacing: "0.12em", fontWeight: 800 }}>
              CENTRAL NEURAL DISPATCH
            </span>
            <button
              onClick={() => setChatOpen(true)}
              style={{
                fontSize: 10.5,
                fontWeight: 800,
                color: "#00F0FF",
                background: "rgba(0, 240, 255, 0.15)",
                border: "1px solid rgba(0, 240, 255, 0.4)",
                padding: "3px 10px",
                borderRadius: 12,
                cursor: "pointer",
              }}
            >
              FULL CHAT →
            </button>
          </div>

          <div
            onClick={() => setChatOpen(true)}
            style={{
              fontSize: 15,
              fontWeight: 800,
              color: "#fff",
              cursor: "pointer",
              marginBottom: 12,
            }}
          >
            "What complex challenge do you need solved?"
          </div>

          {/* Complex Prompt Action Chips */}
          <div style={{ display: "flex", gap: 6, flexWrap: "wrap" }}>
            {[
              { label: "Quantum Decoherence", query: "Derive the theoretical foundations of quantum computing and decoherence." },
              { label: "Startup Stress-Test", query: "Stress-test my startup thesis: Universal Basic Income funded by AI automation taxes." },
              { label: "Microgrid Dispatch", query: "Develop an autonomous renewable microgrid dispatch plan with storage buffers." },
              { label: "Superconductors", query: "Synthesize a technical research plan for ambient pressure room-temperature superconductors." },
            ].map((chip) => (
              <button
                key={chip.label}
                onClick={() => openChatWithPrompt(chip.query)}
                style={{
                  fontSize: 10.5,
                  padding: "5px 10px",
                  borderRadius: 10,
                  background: "rgba(255, 255, 255, 0.05)",
                  border: "1px solid rgba(255, 255, 255, 0.12)",
                  color: "rgba(255, 255, 255, 0.85)",
                  cursor: "pointer",
                  display: "flex",
                  alignItems: "center",
                  gap: 4,
                  fontWeight: 600,
                }}
              >
                <span style={{ color: "#00F0FF" }}>✦</span> {chip.label}
              </button>
            ))}
          </div>
        </div>
      </div>

      {/* ── 4. GLANCEABLE WIDGETS SHELF (AUDIO & SCRATCHPAD) ─────────────── */}
      <div style={{ padding: "0 16px", marginBottom: 18, display: "grid", gridTemplateColumns: "1fr 1fr", gap: 10 }}>
        {/* Mini Music Player Widget */}
        <div
          style={{
            padding: "14px",
            borderRadius: 18,
            background: "rgba(8, 12, 24, 0.85)",
            border: "1px solid rgba(244, 114, 182, 0.25)",
            boxShadow: "0 4px 20px rgba(0, 0, 0, 0.4)",
            display: "flex",
            flexDirection: "column",
            justifyContent: "space-between",
          }}
        >
          <div>
            <div style={{ display: "flex", alignItems: "center", justifyContent: "space-between" }}>
              <span style={{ fontSize: 9.5, fontFamily: "monospace", color: "#F472B6", fontWeight: 800 }}>AUDIO FEED</span>
              <i className="fa-solid fa-music" style={{ fontSize: 11, color: "#F472B6" }} />
            </div>
            <div style={{ fontSize: 12, fontWeight: 800, color: "#fff", marginTop: 6, whiteSpace: "nowrap", overflow: "hidden", textOverflow: "ellipsis" }}>
              {TRACKS[trackIndex].title}
            </div>
            <div style={{ fontSize: 10, color: "rgba(255, 255, 255, 0.5)", marginTop: 1 }}>
              {TRACKS[trackIndex].artist}
            </div>
          </div>

          <div style={{ display: "flex", alignItems: "center", justifyContent: "space-between", marginTop: 12 }}>
            {/* Equalizer animation */}
            <div style={{ display: "flex", alignItems: "center", gap: 2 }}>
              {[12, 18, 8, 15, 10].map((h, i) => (
                <motion.div
                  key={i}
                  animate={{ height: isPlaying ? [4, h, 4] : 4 }}
                  transition={{ duration: 0.8, repeat: Infinity, delay: i * 0.12 }}
                  style={{ width: 2.5, borderRadius: 2, background: "#F472B6" }}
                />
              ))}
            </div>

            <div style={{ display: "flex", alignItems: "center", gap: 6 }}>
              <button
                onClick={() => setTrackIndex((trackIndex + 1) % TRACKS.length)}
                style={{
                  width: 26,
                  height: 26,
                  borderRadius: "50%",
                  background: "rgba(255, 255, 255, 0.08)",
                  border: "none",
                  color: "#fff",
                  display: "flex",
                  alignItems: "center",
                  justifyContent: "center",
                  cursor: "pointer",
                }}
              >
                <i className="fa-solid fa-forward-step" style={{ fontSize: 9 }} />
              </button>
              <button
                onClick={() => setIsPlaying(!isPlaying)}
                style={{
                  width: 32,
                  height: 32,
                  borderRadius: "50%",
                  background: "linear-gradient(135deg, #F472B6 0%, #7B2FFF 100%)",
                  border: "none",
                  color: "#fff",
                  display: "flex",
                  alignItems: "center",
                  justifyContent: "center",
                  cursor: "pointer",
                }}
              >
                <i className={`fa-solid ${isPlaying ? "fa-pause" : "fa-play"}`} style={{ fontSize: 11, marginLeft: isPlaying ? 0 : 2 }} />
              </button>
            </div>
          </div>
        </div>

        {/* Neural Scratchpad Widget */}
        <div
          style={{
            padding: "14px",
            borderRadius: 18,
            background: "rgba(8, 12, 24, 0.85)",
            border: "1px solid rgba(245, 158, 11, 0.25)",
            boxShadow: "0 4px 20px rgba(0, 0, 0, 0.4)",
            display: "flex",
            flexDirection: "column",
            justifyContent: "space-between",
          }}
        >
          <div>
            <div style={{ display: "flex", alignItems: "center", justifyContent: "space-between" }}>
              <span style={{ fontSize: 9.5, fontFamily: "monospace", color: "#F59E0B", fontWeight: 800 }}>SCRATCHPAD</span>
              <i className="fa-solid fa-pen-nib" style={{ fontSize: 11, color: "#F59E0B" }} />
            </div>
            <input
              type="text"
              placeholder="Quick thought..."
              value={quickNote}
              onChange={(e) => setQuickNote(e.target.value)}
              style={{
                width: "100%",
                background: "transparent",
                border: "none",
                outline: "none",
                color: "#fff",
                fontSize: 12,
                marginTop: 8,
              }}
            />
          </div>

          <div style={{ display: "flex", alignItems: "center", justifyContent: "space-between", marginTop: 8 }}>
            <span style={{ fontSize: 9, color: "rgba(255, 255, 255, 0.4)", fontFamily: "monospace" }}>
              {noteSaved ? "SAVED ✓" : "LOCAL STORE"}
            </span>
            <button
              onClick={handleSaveQuickNote}
              disabled={!quickNote.trim()}
              style={{
                padding: "3px 8px",
                borderRadius: 8,
                background: noteSaved ? "rgba(57, 255, 20, 0.2)" : "rgba(245, 158, 11, 0.2)",
                border: `1px solid ${noteSaved ? "#39FF14" : "rgba(245, 158, 11, 0.4)"}`,
                color: noteSaved ? "#39FF14" : "#F59E0B",
                fontSize: 9.5,
                fontWeight: 800,
                cursor: quickNote.trim() ? "pointer" : "default",
              }}
            >
              {noteSaved ? "Saved" : "Save"}
            </button>
          </div>
        </div>
      </div>

      {/* ── 5. INTELLIGENCE STACKS (TOTAL REVAMP) ────────────────────────── */}
      <div style={{ marginBottom: 18 }}>
        <MobileIntelligenceStacks onOpenApp={onOpenApp} />
      </div>

      {/* ── 6. SMART DOCK (PINNED APPS & CORTEX ORB) ─────────────────────── */}
      <div style={{ padding: "0 16px", marginBottom: 20 }}>
        <MobileSmartDock
          onOpenApp={onOpenApp}
          onOpenDrawer={() => setDrawerOpen(true)}
          onOpenChat={() => setChatOpen(true)}
        />
      </div>

      {/* ── 7. CORTEX PILL (PERSISTENT FLOATING ANCHOR) ──────────────────── */}
      <CortexPill
        onOpenApp={onOpenApp}
        onQuerySubmit={(query) => openChatWithPrompt(query)}
      />

      {/* ── 8. APP DRAWER MODAL (120HZ COMPOSITOR) ───────────────────────── */}
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

      {/* ── 9. FULL-SCREEN MOBILE AI CHAT ─────────────────────────────────── */}
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

      {/* ── 10. QUICK CONTROL CENTER OVERLAY ─────────────────────────────── */}
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
