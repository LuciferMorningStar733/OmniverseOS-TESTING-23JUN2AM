import React, { useState, useEffect, useCallback, useRef } from "react";
import { motion, AnimatePresence } from "framer-motion";

const LS_KEY = "omniverse_brightness";
const DEFAULT_BRIGHTNESS = 100;

/** Hook — exposes brightness state and a toggle for the overlay panel */
export function useBrightness() {
  const [brightness, setBrightnessState] = useState(() => {
    const saved = parseInt(localStorage.getItem(LS_KEY) ?? "", 10);
    return isNaN(saved) ? DEFAULT_BRIGHTNESS : Math.min(100, Math.max(10, saved));
  });
  const [open, setOpen] = useState(false);

  const setBrightness = useCallback((val) => {
    const clamped = Math.min(100, Math.max(10, Math.round(val)));
    setBrightnessState(clamped);
    localStorage.setItem(LS_KEY, String(clamped));
  }, []);

  const openOverlay  = useCallback(() => setOpen(true),  []);
  const closeOverlay = useCallback(() => setOpen(false), []);
  const toggleOverlay = useCallback(() => setOpen((v) => !v), []);

  return { brightness, setBrightness, open, openOverlay, closeOverlay, toggleOverlay };
}

/** CSS filter applied to the main desktop layer */
export function BrightnessFilter({ brightness }) {
  const pct = brightness / 100;
  // We add a tiny dark overlay that grows as brightness decreases.
  // This avoids washing-out colors (unlike CSS brightness()), giving
  // a true dimming effect similar to a physical monitor.
  const darken = Math.max(0, 1 - pct);
  return (
    <div
      aria-hidden
      style={{
        position: "fixed",
        inset: 0,
        background: `rgba(0,0,0,${darken.toFixed(3)})`,
        pointerEvents: "none",
        zIndex: 9999,
        transition: "background 0.25s ease",
      }}
    />
  );
}

/** Floating overlay panel */
export default function BrightnessOverlay({ brightness, setBrightness, open, onClose }) {
  const sliderRef = useRef(null);

  // Close on Escape
  useEffect(() => {
    if (!open) return;
    const handler = (e) => { if (e.key === "Escape") onClose(); };
    window.addEventListener("keydown", handler);
    return () => window.removeEventListener("keydown", handler);
  }, [open, onClose]);

  const steps = [10, 25, 50, 75, 100];
  const icon =
    brightness >= 80 ? "fa-sun" :
    brightness >= 50 ? "fa-cloud-sun" :
    brightness >= 25 ? "fa-moon" :
    "fa-circle-half-stroke";

  return (
    <AnimatePresence>
      {open && (
        <>
          {/* Backdrop (click-away) */}
          <motion.div
            key="br-backdrop"
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            exit={{ opacity: 0 }}
            transition={{ duration: 0.15 }}
            onClick={onClose}
            style={{ position: "fixed", inset: 0, zIndex: 2000 }}
          />

          {/* Panel */}
          <motion.div
            key="br-panel"
            initial={{ opacity: 0, scale: 0.93, y: -10 }}
            animate={{ opacity: 1, scale: 1, y: 0 }}
            exit={{ opacity: 0, scale: 0.95, y: -8 }}
            transition={{ type: "spring", stiffness: 400, damping: 30 }}
            style={{
              position: "fixed",
              top: 50,
              right: 16,
              width: 280,
              padding: "18px 20px",
              background: "rgba(6,8,16,0.96)",
              backdropFilter: "blur(40px) saturate(180%)",
              WebkitBackdropFilter: "blur(40px) saturate(180%)",
              border: "1px solid rgba(255,255,255,0.10)",
              borderRadius: 16,
              boxShadow: "0 24px 64px rgba(0,0,0,0.8), 0 0 0 1px rgba(0,240,255,0.06)",
              zIndex: 2001,
            }}
          >
            {/* Header */}
            <div style={{ display: "flex", alignItems: "center", justifyContent: "space-between", marginBottom: 16 }}>
              <div style={{ display: "flex", alignItems: "center", gap: 8 }}>
                <i
                  className={`fa-solid ${icon}`}
                  style={{ color: "#F59E0B", fontSize: 14 }}
                />
                <span style={{ fontSize: 12, fontFamily: "monospace", letterSpacing: "0.12em", color: "rgba(255,255,255,0.8)", textTransform: "uppercase" }}>
                  Brightness
                </span>
              </div>
              <span style={{ fontSize: 18, fontWeight: 700, fontFamily: "monospace", color: "#F59E0B" }}>
                {brightness}%
              </span>
            </div>

            {/* Slider */}
            <div style={{ position: "relative", paddingBottom: 4 }}>
              <input
                ref={sliderRef}
                type="range"
                min={10}
                max={100}
                step={1}
                value={brightness}
                onChange={(e) => setBrightness(Number(e.target.value))}
                style={{
                  width: "100%",
                  appearance: "none",
                  WebkitAppearance: "none",
                  height: 6,
                  borderRadius: 3,
                  background: `linear-gradient(to right, #F59E0B ${brightness}%, rgba(255,255,255,0.12) ${brightness}%)`,
                  outline: "none",
                  cursor: "pointer",
                }}
              />
            </div>

            {/* Preset steps */}
            <div style={{ display: "flex", gap: 6, marginTop: 14 }}>
              {steps.map((s) => (
                <button
                  key={s}
                  onClick={() => setBrightness(s)}
                  style={{
                    flex: 1,
                    height: 28,
                    borderRadius: 7,
                    border: brightness === s
                      ? "1px solid rgba(245,158,11,0.7)"
                      : "1px solid rgba(255,255,255,0.09)",
                    background: brightness === s
                      ? "rgba(245,158,11,0.16)"
                      : "rgba(255,255,255,0.04)",
                    color: brightness === s ? "#F59E0B" : "rgba(255,255,255,0.45)",
                    fontSize: 10,
                    fontFamily: "monospace",
                    cursor: "pointer",
                    transition: "all 0.15s",
                    boxShadow: brightness === s ? "0 0 10px rgba(245,158,11,0.2)" : "none",
                  }}
                  onMouseEnter={(e) => { if (brightness !== s) { e.currentTarget.style.background = "rgba(245,158,11,0.10)"; e.currentTarget.style.color = "#F59E0B"; } }}
                  onMouseLeave={(e) => { if (brightness !== s) { e.currentTarget.style.background = "rgba(255,255,255,0.04)"; e.currentTarget.style.color = "rgba(255,255,255,0.45)"; } }}
                >
                  {s}%
                </button>
              ))}
            </div>

            {/* Hint */}
            <div style={{ marginTop: 12, fontSize: 10, fontFamily: "monospace", color: "rgba(255,255,255,0.20)", textAlign: "center" }}>
              Shortcut: Ctrl + Shift + B
            </div>
          </motion.div>
        </>
      )}
    </AnimatePresence>
  );
}
