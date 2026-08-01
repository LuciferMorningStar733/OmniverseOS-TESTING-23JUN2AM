import React, { useState, useCallback } from "react";
import { motion, AnimatePresence } from "framer-motion";

const LS_CITY = "omniverse_city";
const LS_LOCATION_DONE = "omniverse_location_setup_done";

/** Returns the stored city name (or null if not set) */
export function getStoredCity() {
  return localStorage.getItem(LS_CITY) || null;
}

/** Returns true if location setup has been completed */
export function isLocationSetupDone() {
  return !!localStorage.getItem(LS_LOCATION_DONE);
}

/** Save city and mark setup complete */
export function saveCity(city) {
  localStorage.setItem(LS_CITY, city);
  localStorage.setItem(LS_LOCATION_DONE, "1");
}

/** Reverse-geocode lat/lon → city name using open-meteo's nominatim */
async function reverseGeocode(lat, lon) {
  try {
    const res = await fetch(
      `https://nominatim.openstreetmap.org/reverse?format=json&lat=${lat}&lon=${lon}`,
      { headers: { "Accept-Language": "en" } }
    );
    const data = await res.json();
    return (
      data?.address?.city ||
      data?.address?.town ||
      data?.address?.village ||
      data?.address?.county ||
      "Your location"
    );
  } catch {
    return null;
  }
}

export default function LocationSetup({ onComplete }) {
  const [step,    setStep]    = useState("choose"); // "choose" | "auto" | "manual"
  const [city,    setCity]    = useState("");
  const [loading, setLoading] = useState(false);
  const [error,   setError]   = useState("");

  // A1/UX: allow the user to dismiss the modal — the "location" feature is a
  // NICE-to-have (used for weather + geo-aware greetings), not a hard
  // prerequisite for the OS.  Skipping stores an empty city and marks the
  // setup done so the modal never re-prompts.
  const handleSkip = useCallback(() => {
    try {
      localStorage.setItem(LS_LOCATION_DONE, "1");
    } catch { /* ignore */ }
    onComplete(null);
  }, [onComplete]);

  // ESC key dismisses the modal (matches every other modal in the OS).
  React.useEffect(() => {
    const onKey = (e) => { if (e.key === "Escape") handleSkip(); };
    window.addEventListener("keydown", onKey);
    return () => window.removeEventListener("keydown", onKey);
  }, [handleSkip]);

  const handleAuto = useCallback(async () => {
    setStep("auto");
    setLoading(true);
    setError("");
    if (!navigator.geolocation) {
      setError("Geolocation not supported by your browser.");
      setLoading(false);
      return;
    }
    navigator.geolocation.getCurrentPosition(
      async (pos) => {
        const name = await reverseGeocode(pos.coords.latitude, pos.coords.longitude);
        if (name) {
          saveCity(name);
          onComplete(name);
        } else {
          setError("Could not determine city. Please enter manually.");
          setStep("manual");
        }
        setLoading(false);
      },
      () => {
        setError("Location access denied. Please enter your city manually.");
        setStep("manual");
        setLoading(false);
      },
      { timeout: 8000 }
    );
  }, [onComplete]);

  const handleManualSubmit = useCallback((e) => {
    e.preventDefault();
    const trimmed = city.trim();
    if (!trimmed) return;
    saveCity(trimmed);
    onComplete(trimmed);
  }, [city, onComplete]);

  return (
    <motion.div
      initial={{ opacity: 0 }}
      animate={{ opacity: 1 }}
      exit={{ opacity: 0 }}
      onClick={(e) => { if (e.target === e.currentTarget) handleSkip(); }}
      style={{
        position: "fixed", inset: 0,
        background: "rgba(0,0,0,0.72)",
        backdropFilter: "blur(16px)",
        WebkitBackdropFilter: "blur(16px)",
        display: "flex", alignItems: "center", justifyContent: "center",
        zIndex: 3000,
      }}
    >
      <motion.div
        initial={{ opacity: 0, scale: 0.92, y: 24 }}
        animate={{ opacity: 1, scale: 1, y: 0 }}
        exit={{ opacity: 0, scale: 0.95 }}
        transition={{ type: "spring", stiffness: 380, damping: 30 }}
        onClick={(e) => e.stopPropagation()}
        style={{
          width: 400,
          maxWidth: "90vw",
          background: "rgba(6,8,16,0.97)",
          border: "1px solid rgba(168,85,247,0.25)",
          borderRadius: 20,
          padding: "32px 28px",
          boxShadow: "0 32px 80px rgba(0,0,0,0.8), 0 0 0 1px rgba(168,85,247,0.08)",
          position: "relative",
        }}
      >
        {/* Close (skip) button — top-right */}
        <button
          type="button"
          onClick={handleSkip}
          aria-label="Skip location setup"
          data-testid="location-close"
          style={{
            position: "absolute", top: 12, right: 12,
            width: 30, height: 30, borderRadius: 10,
            background: "rgba(255,255,255,0.04)",
            border: "1px solid rgba(255,255,255,0.10)",
            color: "rgba(255,255,255,0.55)",
            fontSize: 12, cursor: "pointer",
            display: "flex", alignItems: "center", justifyContent: "center",
            transition: "all 0.15s",
          }}
          onMouseEnter={(e) => { e.currentTarget.style.background = "rgba(255,255,255,0.09)"; e.currentTarget.style.color = "#fff"; }}
          onMouseLeave={(e) => { e.currentTarget.style.background = "rgba(255,255,255,0.04)"; e.currentTarget.style.color = "rgba(255,255,255,0.55)"; }}
        >
          <i className="fa-solid fa-xmark" />
        </button>
        {/* Icon */}
        <div style={{ textAlign: "center", marginBottom: 20 }}>
          <div style={{
            display: "inline-flex", alignItems: "center", justifyContent: "center",
            width: 56, height: 56, borderRadius: "50%",
            background: "rgba(168,85,247,0.12)",
            border: "1px solid rgba(168,85,247,0.25)",
            marginBottom: 12,
          }}>
            <i className="fa-solid fa-location-dot" style={{ color: "#A855F7", fontSize: 22 }} />
          </div>
          <h2 style={{ margin: 0, fontFamily: "'Unbounded', sans-serif", fontSize: 18, color: "#fff", letterSpacing: "0.01em" }}>
            Set your location
          </h2>
          <p style={{ margin: "8px 0 0", fontSize: 13, color: "rgba(255,255,255,0.45)", fontFamily: "'Outfit', sans-serif", lineHeight: 1.5 }}>
            Cortex uses this for weather, greetings, and context-aware suggestions.
          </p>
        </div>

        <AnimatePresence mode="wait">
          {step === "choose" && (
            <motion.div
              key="choose"
              initial={{ opacity: 0 }} animate={{ opacity: 1 }} exit={{ opacity: 0 }}
              style={{ display: "flex", flexDirection: "column", gap: 10 }}
            >
              <button
                onClick={handleAuto}
                style={{
                  padding: "14px 18px",
                  borderRadius: 12,
                  border: "1px solid rgba(168,85,247,0.35)",
                  background: "rgba(168,85,247,0.10)",
                  color: "#fff",
                  cursor: "pointer",
                  display: "flex", alignItems: "center", gap: 12,
                  transition: "all 0.18s",
                  textAlign: "left",
                }}
                onMouseEnter={(e) => { e.currentTarget.style.background = "rgba(168,85,247,0.20)"; e.currentTarget.style.boxShadow = "0 0 18px rgba(168,85,247,0.2)"; }}
                onMouseLeave={(e) => { e.currentTarget.style.background = "rgba(168,85,247,0.10)"; e.currentTarget.style.boxShadow = "none"; }}
              >
                <div style={{ width: 36, height: 36, borderRadius: 10, background: "rgba(168,85,247,0.18)", display: "flex", alignItems: "center", justifyContent: "center", flexShrink: 0 }}>
                  <i className="fa-solid fa-crosshairs" style={{ color: "#A855F7", fontSize: 14 }} />
                </div>
                <div>
                  <div style={{ fontSize: 13, fontWeight: 600, color: "#fff" }}>📍 Detect automatically</div>
                  <div style={{ fontSize: 11, color: "rgba(255,255,255,0.4)", fontFamily: "monospace", marginTop: 2 }}>Uses your browser's location API</div>
                </div>
              </button>

              <button
                onClick={() => setStep("manual")}
                style={{
                  padding: "14px 18px",
                  borderRadius: 12,
                  border: "1px solid rgba(255,255,255,0.10)",
                  background: "rgba(255,255,255,0.04)",
                  color: "#fff",
                  cursor: "pointer",
                  display: "flex", alignItems: "center", gap: 12,
                  transition: "all 0.18s",
                  textAlign: "left",
                }}
                onMouseEnter={(e) => { e.currentTarget.style.background = "rgba(255,255,255,0.08)"; }}
                onMouseLeave={(e) => { e.currentTarget.style.background = "rgba(255,255,255,0.04)"; }}
              >
                <div style={{ width: 36, height: 36, borderRadius: 10, background: "rgba(255,255,255,0.06)", display: "flex", alignItems: "center", justifyContent: "center", flexShrink: 0 }}>
                  <i className="fa-solid fa-city" style={{ color: "rgba(255,255,255,0.6)", fontSize: 14 }} />
                </div>
                <div>
                  <div style={{ fontSize: 13, fontWeight: 600, color: "#fff" }}>🏙 Enter city manually</div>
                  <div style={{ fontSize: 11, color: "rgba(255,255,255,0.4)", fontFamily: "monospace", marginTop: 2 }}>Type your city name</div>
                </div>
              </button>

              {/* Skip — always available, matches macOS/iOS "Not now" pattern. */}
              <button
                type="button"
                onClick={handleSkip}
                data-testid="skip-location"
                style={{
                  marginTop: 4,
                  padding: "10px",
                  background: "transparent",
                  border: "none",
                  color: "rgba(255,255,255,0.45)",
                  fontSize: 12,
                  fontFamily: "'JetBrains Mono', monospace",
                  letterSpacing: "0.04em",
                  cursor: "pointer",
                  textAlign: "center",
                }}
              >
                Skip for now
              </button>
            </motion.div>
          )}

          {step === "auto" && (
            <motion.div
              key="auto"
              initial={{ opacity: 0 }} animate={{ opacity: 1 }} exit={{ opacity: 0 }}
              style={{ textAlign: "center", padding: "16px 0" }}
            >
              {loading ? (
                <>
                  <div style={{ display: "flex", gap: 6, justifyContent: "center", marginBottom: 12 }}>
                    {[0,1,2].map((i) => (
                      <span key={i} style={{
                        display: "inline-block", width: 8, height: 8, borderRadius: "50%",
                        background: "#A855F7",
                        animation: `pulse 1.1s ease-in-out ${i * 0.16}s infinite`,
                      }} />
                    ))}
                  </div>
                  <p style={{ fontSize: 13, color: "rgba(255,255,255,0.5)", fontFamily: "monospace" }}>Detecting location…</p>
                </>
              ) : error && (
                <p style={{ fontSize: 13, color: "#FF003C", fontFamily: "monospace" }}>{error}</p>
              )}
            </motion.div>
          )}

          {step === "manual" && (
            <motion.div
              key="manual"
              initial={{ opacity: 0 }} animate={{ opacity: 1 }} exit={{ opacity: 0 }}
            >
              {error && (
                <p style={{ fontSize: 12, color: "#F59E0B", fontFamily: "monospace", marginBottom: 10, textAlign: "center" }}>{error}</p>
              )}
              <form onSubmit={handleManualSubmit} style={{ display: "flex", flexDirection: "column", gap: 10 }}>
                <input
                  autoFocus
                  type="text"
                  placeholder="e.g. Hyderabad, Mumbai, London…"
                  value={city}
                  onChange={(e) => setCity(e.target.value)}
                  style={{
                    width: "100%",
                    padding: "12px 16px",
                    borderRadius: 10,
                    border: "1px solid rgba(168,85,247,0.35)",
                    background: "rgba(255,255,255,0.05)",
                    color: "#fff",
                    fontSize: 14,
                    fontFamily: "'Outfit', sans-serif",
                    outline: "none",
                    boxSizing: "border-box",
                  }}
                  onFocus={(e) => { e.currentTarget.style.borderColor = "rgba(168,85,247,0.7)"; e.currentTarget.style.boxShadow = "0 0 0 3px rgba(168,85,247,0.12)"; }}
                  onBlur={(e) => { e.currentTarget.style.borderColor = "rgba(168,85,247,0.35)"; e.currentTarget.style.boxShadow = "none"; }}
                />
                <button
                  type="submit"
                  disabled={!city.trim()}
                  style={{
                    padding: "12px",
                    borderRadius: 10,
                    border: "1px solid rgba(168,85,247,0.5)",
                    background: "rgba(168,85,247,0.20)",
                    color: "#fff",
                    fontSize: 14,
                    fontWeight: 600,
                    cursor: city.trim() ? "pointer" : "not-allowed",
                    opacity: city.trim() ? 1 : 0.5,
                    transition: "all 0.18s",
                    fontFamily: "'Outfit', sans-serif",
                  }}
                >
                  Confirm City
                </button>
                <button
                  type="button"
                  onClick={() => setStep("choose")}
                  style={{
                    background: "none", border: "none",
                    color: "rgba(255,255,255,0.35)", cursor: "pointer",
                    fontSize: 12, fontFamily: "monospace",
                  }}
                >
                  ← Back
                </button>
              </form>
            </motion.div>
          )}
        </AnimatePresence>
      </motion.div>
    </motion.div>
  );
}
