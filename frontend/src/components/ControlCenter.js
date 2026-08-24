import React, { useState } from "react";
import { motion, AnimatePresence } from "framer-motion";
import { useOS } from "../context/OSContext";
import { useBrightnessContext } from "../context/BrightnessContext";
import { getAllSoundPrefs, setSoundsEnabled, playClick } from "../lib/soundEngine";
import { toast } from "sonner";

const FOCUS_MODES = [
  { id: "normal", name: "Normal", icon: "fa-sun", color: "#00F0FF" },
  { id: "work", name: "Deep Work", icon: "fa-brain", color: "#A855F7" },
  { id: "dnd", name: "Do Not Disturb", icon: "fa-moon", color: "#F59E0B" },
  { id: "matrix", name: "Cyber Matrix", icon: "fa-terminal", color: "#39FF14" },
];

export default function ControlCenter({ isOpen, onClose }) {
  const { openApp, logout } = useOS();
  const { brightness, setBrightness } = useBrightnessContext();
  const [soundPrefs, setSoundPrefs] = useState(() => getAllSoundPrefs());
  const [activeFocus, setActiveFocus] = useState("normal");

  const toggleMasterSound = () => {
    const next = !soundPrefs.master;
    setSoundsEnabled(next);
    setSoundPrefs((p) => ({ ...p, master: next }));
    if (next) playClick();
    toast.success(next ? "System sounds enabled" : "Muted all sounds");
  };

  const setFocusMode = (mode) => {
    setActiveFocus(mode.id);
    playClick();
    toast.success(`Focus Mode set to: ${mode.name}`);
  };

  if (!isOpen) return null;

  return (
    <AnimatePresence>
      <motion.div
        initial={{ opacity: 0 }}
        animate={{ opacity: 1 }}
        exit={{ opacity: 0 }}
        onClick={onClose}
        style={{
          position: "fixed",
          inset: 0,
          zIndex: 9999,
          background: "rgba(0,0,0,0.35)",
          backdropFilter: "blur(4px)",
        }}
      >
        <motion.div
          initial={{ opacity: 0, y: -20, scale: 0.96 }}
          animate={{ opacity: 1, y: 0, scale: 1 }}
          exit={{ opacity: 0, y: -20, scale: 0.96 }}
          transition={{ type: "spring", stiffness: 380, damping: 28 }}
          onClick={(e) => e.stopPropagation()}
          style={{
            position: "absolute",
            top: 40,
            right: 16,
            width: 320,
            borderRadius: 24,
            padding: 18,
            background: "rgba(10, 12, 22, 0.92)",
            border: "1px solid rgba(255, 255, 255, 0.12)",
            boxShadow: "0 24px 80px rgba(0,0,0,0.7), inset 0 0 0 1px rgba(255,255,255,0.06)",
            backdropFilter: "blur(40px) saturate(180%)",
            color: "#fff",
            display: "flex",
            flexDirection: "column",
            gap: 16,
          }}
        >
          {/* Header */}
          <div style={{ display: "flex", alignItems: "center", justifyContent: "space-between" }}>
            <div style={{ fontSize: 13, fontWeight: 700, fontFamily: "'Unbounded', sans-serif" }}>Control Center</div>
            <div style={{ fontSize: 10, fontFamily: "monospace", color: "#00F0FF", opacity: 0.8 }}>iOS FLAGSHIP</div>
          </div>

          {/* Sliders Grid */}
          <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr", gap: 12 }}>
            {/* Display Brightness */}
            <div
              style={{
                borderRadius: 16,
                padding: 12,
                background: "rgba(255,255,255,0.04)",
                border: "1px solid rgba(255,255,255,0.08)",
                display: "flex",
                flexDirection: "column",
                gap: 8,
              }}
            >
              <div style={{ display: "flex", alignItems: "center", justifyContent: "space-between" }}>
                <i className="fa-solid fa-sun" style={{ color: "#F59E0B", fontSize: 14 }} />
                <span style={{ fontSize: 11, fontFamily: "monospace", color: "#F59E0B" }}>{brightness}%</span>
              </div>
              <input
                type="range"
                min={10}
                max={100}
                value={brightness}
                onChange={(e) => setBrightness(Number(e.target.value))}
                style={{
                  width: "100%",
                  appearance: "none",
                  height: 6,
                  borderRadius: 3,
                  background: `linear-gradient(to right, #F59E0B ${brightness}%, rgba(255,255,255,0.15) ${brightness}%)`,
                  outline: "none",
                  cursor: "pointer",
                }}
              />
              <div style={{ fontSize: 10, color: "rgba(255,255,255,0.4)", fontFamily: "monospace" }}>Brightness</div>
            </div>

            {/* Sound Volume Toggle */}
            <div
              onClick={toggleMasterSound}
              style={{
                borderRadius: 16,
                padding: 12,
                background: soundPrefs.master ? "rgba(0,240,255,0.1)" : "rgba(255,255,255,0.04)",
                border: soundPrefs.master ? "1px solid rgba(0,240,255,0.4)" : "1px solid rgba(255,255,255,0.08)",
                display: "flex",
                flexDirection: "column",
                justifyContent: "space-between",
                cursor: "pointer",
                transition: "all 0.18s",
              }}
            >
              <div style={{ display: "flex", alignItems: "center", justifyContent: "space-between" }}>
                <i className={`fa-solid ${soundPrefs.master ? "fa-volume-high" : "fa-volume-xmark"}`} style={{ color: "#00F0FF", fontSize: 14 }} />
                <div style={{ width: 8, height: 8, borderRadius: "50%", background: soundPrefs.master ? "#00F0FF" : "rgba(255,255,255,0.2)" }} />
              </div>
              <div>
                <div style={{ fontSize: 11, fontWeight: 700, color: "#fff" }}>{soundPrefs.master ? "Sound On" : "Muted"}</div>
                <div style={{ fontSize: 10, color: "rgba(255,255,255,0.4)", fontFamily: "monospace" }}>Web Audio API</div>
              </div>
            </div>
          </div>

          {/* Focus Modes */}
          <div>
            <div style={{ fontSize: 10, fontFamily: "monospace", color: "rgba(255,255,255,0.35)", letterSpacing: "0.1em", textTransform: "uppercase", marginBottom: 8 }}>
              Focus Modes
            </div>
            <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr", gap: 6 }}>
              {FOCUS_MODES.map((mode) => {
                const active = activeFocus === mode.id;
                return (
                  <button
                    key={mode.id}
                    onClick={() => setFocusMode(mode)}
                    style={{
                      padding: "8px 10px",
                      borderRadius: 12,
                      border: active ? `1px solid ${mode.color}60` : "1px solid rgba(255,255,255,0.08)",
                      background: active ? `${mode.color}15` : "rgba(255,255,255,0.03)",
                      color: active ? mode.color : "rgba(255,255,255,0.6)",
                      cursor: "pointer",
                      display: "flex",
                      alignItems: "center",
                      gap: 8,
                      fontSize: 11,
                      fontFamily: "'Outfit', sans-serif",
                      fontWeight: 600,
                      transition: "all 0.15s",
                    }}
                  >
                    <i className={`fa-solid ${mode.icon}`} style={{ fontSize: 11 }} />
                    <span>{mode.name}</span>
                  </button>
                );
              })}
            </div>
          </div>

          {/* Quick Action Shortcuts */}
          <div style={{ display: "flex", gap: 8 }}>
            <button
              onClick={() => { openApp("settings"); onClose(); }}
              style={{
                flex: 1,
                padding: "10px",
                borderRadius: 12,
                background: "rgba(255,255,255,0.05)",
                border: "1px solid rgba(255,255,255,0.09)",
                color: "#fff",
                fontSize: 11,
                fontFamily: "monospace",
                cursor: "pointer",
                display: "flex",
                alignItems: "center",
                justifyContent: "center",
                gap: 6,
              }}
            >
              <i className="fa-solid fa-gear" style={{ color: "#00F0FF" }} />
              Settings
            </button>
            <button
              onClick={() => { logout(); onClose(); }}
              style={{
                padding: "10px 14px",
                borderRadius: 12,
                background: "rgba(255,0,60,0.1)",
                border: "1px solid rgba(255,0,60,0.3)",
                color: "#FF6B7A",
                fontSize: 11,
                fontFamily: "monospace",
                cursor: "pointer",
                display: "flex",
                alignItems: "center",
                justifyContent: "center",
                gap: 6,
              }}
            >
              <i className="fa-solid fa-right-from-bracket" />
              Exit
            </button>
          </div>
        </motion.div>
      </motion.div>
    </AnimatePresence>
  );
}
