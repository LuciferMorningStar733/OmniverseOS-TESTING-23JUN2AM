import React, { useEffect, useRef, useState } from "react";
import { motion, AnimatePresence } from "framer-motion";
import { getStoredCity } from "./LocationSetup";
import { speakGreeting, buildGreetingText } from "../lib/voiceGreeting";

const AUTO_DISMISS_MS = 9000;

function getGreetingText(name) {
  const h = new Date().getHours();
  const period = h < 5 ? "night" : h < 12 ? "morning" : h < 17 ? "afternoon" : "evening";
  return `Good ${period}, ${name || "there"}.`;
}

function useWeatherSummary(city) {
  const [summary, setSummary] = useState(null);
  useEffect(() => {
    if (!city) return;
    let cancelled = false;
    (async () => {
      try {
        const geoRes = await fetch(
          `https://nominatim.openstreetmap.org/search?q=${encodeURIComponent(city)}&format=json&limit=1`,
          { headers: { "Accept-Language": "en" } }
        );
        const geo = await geoRes.json();
        if (!geo?.[0] || cancelled) return;
        const { lat, lon } = geo[0];
        const wxRes = await fetch(
          `https://api.open-meteo.com/v1/forecast?latitude=${lat}&longitude=${lon}&current_weather=true`
        );
        const wx = await wxRes.json();
        if (cancelled) return;
        const { temperature, weathercode } = wx.current_weather || {};
        const code = weathercode ?? 0;
        const emoji =
          code === 0 ? "☀️" :
          code < 3  ? "🌤" :
          code < 50 ? "☁️" :
          code < 70 ? "🌧" :
          code < 80 ? "🌩" : "⛈";
        const desc =
          code === 0 ? "Clear skies" :
          code < 3  ? "Partly cloudy" :
          code < 50 ? "Overcast" :
          code < 70 ? "Rain expected today" :
          code < 80 ? "Thunderstorms nearby" : "Severe weather";
        setSummary({ city, emoji, desc, temp: Math.round(temperature) });
      } catch {
        setSummary({ city, emoji: "🌐", desc: "Weather unavailable", temp: null });
      }
    })();
    return () => { cancelled = true; };
  }, [city]);
  return summary;
}

export default function WelcomePanel({ user, notifications, onDismiss }) {
  const [visible,  setVisible]  = useState(true);
  const [speaking, setSpeaking] = useState(false);
  const cancelSpeechRef = useRef(null);
  const dismissT1       = useRef(null);
  const dismissT2       = useRef(null);
  const city    = getStoredCity();
  const weather = useWeatherSummary(city);

  const now     = new Date();
  const timeStr = now.toLocaleTimeString([], { hour: "2-digit", minute: "2-digit" });
  const firstName = user?.name?.split(" ")[0] || null;
  const greetingDisplay = getGreetingText(firstName);

  // ── Voice greeting: fires once when panel mounts ─────────────────
  useEffect(() => {
    // Short delay so the OS sounds have settled before speaking
    const voiceDelay = setTimeout(() => {
      const text   = buildGreetingText(firstName, null); // speak immediately, no weather yet
      setSpeaking(true);
      const cancel = speakGreeting(text);
      cancelSpeechRef.current = cancel;
      setSpeaking(false);
    }, 600);

    return () => {
      clearTimeout(voiceDelay);
      cancelSpeechRef.current?.();
    };
  // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []); // intentionally run once on mount

  // ── Auto-dismiss ─────────────────────────────────────────────────
  useEffect(() => {
    dismissT1.current = setTimeout(() => {
      setVisible(false);
      dismissT2.current = setTimeout(onDismiss, 500);
    }, AUTO_DISMISS_MS);
    return () => {
      clearTimeout(dismissT1.current);
      clearTimeout(dismissT2.current);
    };
  }, [onDismiss]);

  const handleDismiss = () => {
    cancelSpeechRef.current?.();
    clearTimeout(dismissT1.current);
    clearTimeout(dismissT2.current);
    setVisible(false);
    setTimeout(onDismiss, 400);
  };

  return (
    <AnimatePresence>
      {visible && (
        <motion.div
          initial={{ opacity: 0, y: -22, scale: 0.95 }}
          animate={{ opacity: 1, y: 0, scale: 1 }}
          exit={{ opacity: 0, y: -14, scale: 0.97 }}
          transition={{ type: "spring", stiffness: 340, damping: 28 }}
          style={{
            position: "fixed",
            top: 54,
            left: "50%",
            transform: "translateX(-50%)",
            width: 348,
            background: "rgba(6,8,16,0.97)",
            backdropFilter: "blur(40px) saturate(180%)",
            WebkitBackdropFilter: "blur(40px) saturate(180%)",
            border: "1px solid rgba(0,240,255,0.14)",
            borderRadius: 20,
            boxShadow: "0 24px 64px rgba(0,0,0,0.80), 0 0 0 1px rgba(0,240,255,0.07)",
            padding: "20px 22px 16px",
            zIndex: 500,
            cursor: "pointer",
          }}
          onClick={handleDismiss}
          role="dialog"
          aria-label="Welcome panel"
        >
          {/* Dismiss hint */}
          <div style={{
            position: "absolute", top: 10, right: 13,
            fontSize: 10, fontFamily: "monospace",
            color: "rgba(255,255,255,0.18)", userSelect: "none",
          }}>
            click to dismiss
          </div>

          {/* Speaker indicator */}
          {speaking && (
            <div style={{
              position: "absolute", top: 10, left: 14,
              display: "flex", alignItems: "center", gap: 4,
            }}>
              {[0, 1, 2].map((i) => (
                <span key={i} style={{
                  display: "inline-block",
                  width: 3, borderRadius: 2,
                  background: "#00F0FF",
                  animation: `cortexWave 0.6s ease-in-out ${i * 0.12}s infinite alternate`,
                  minHeight: 8,
                }} />
              ))}
            </div>
          )}

          {/* Greeting */}
          <div style={{
            fontFamily: "'Unbounded', sans-serif",
            fontSize: 17, fontWeight: 700, color: "#fff",
            marginBottom: 3, lineHeight: 1.3,
          }}>
            {greetingDisplay}
          </div>

          {/* Sub-label */}
          <div style={{
            fontFamily: "monospace", fontSize: 9.5,
            color: "rgba(0,240,255,0.50)", letterSpacing: "0.18em",
            textTransform: "uppercase", marginBottom: 14,
          }}>
            OmniverseOS · Online
          </div>

          {/* Time */}
          <div style={{
            display: "flex", alignItems: "baseline", gap: 8, marginBottom: 14,
          }}>
            <span style={{ fontFamily: "monospace", fontSize: 22, fontWeight: 700, color: "#00F0FF", letterSpacing: "0.04em" }}>
              {timeStr}
            </span>
            <span style={{ fontFamily: "monospace", fontSize: 11, color: "rgba(255,255,255,0.35)" }}>
              {now.toLocaleDateString(undefined, { weekday: "long", month: "short", day: "numeric" })}
            </span>
          </div>

          {/* Divider */}
          <div style={{ height: 1, background: "rgba(255,255,255,0.07)", marginBottom: 14 }} />

          {/* Weather */}
          {city ? (
            <div style={{ marginBottom: 12 }}>
              <div style={{
                fontSize: 9.5, fontFamily: "monospace",
                color: "rgba(255,255,255,0.28)", textTransform: "uppercase",
                letterSpacing: "0.15em", marginBottom: 7,
              }}>
                Weather
              </div>
              {weather ? (
                <div style={{ display: "flex", alignItems: "center", gap: 12 }}>
                  <span style={{ fontSize: 28, lineHeight: 1 }}>{weather.emoji}</span>
                  <div>
                    <div style={{ fontSize: 13, fontWeight: 600, color: "#A855F7" }}>
                      {weather.city}
                    </div>
                    <div style={{ fontSize: 12, color: "rgba(255,255,255,0.55)" }}>
                      {weather.desc}
                      {weather.temp != null ? ` · ${weather.temp}°C` : ""}
                    </div>
                  </div>
                </div>
              ) : (
                <div style={{ display: "flex", alignItems: "center", gap: 8 }}>
                  <div style={{
                    width: 28, height: 28, borderRadius: "50%",
                    background: "rgba(168,85,247,0.1)",
                    animation: "pulse 1.4s ease infinite",
                  }} />
                  <div style={{ fontSize: 11, color: "rgba(255,255,255,0.28)", fontFamily: "monospace" }}>
                    Fetching weather…
                  </div>
                </div>
              )}
            </div>
          ) : (
            <div style={{ marginBottom: 12, fontSize: 11.5, color: "rgba(255,255,255,0.30)", fontFamily: "monospace" }}>
              ⚙️  No location set — open Settings to enable weather.
            </div>
          )}

          {/* Notifications */}
          {notifications > 0 && (
            <div style={{
              display: "flex", alignItems: "center", gap: 8,
              padding: "8px 12px", borderRadius: 10, marginBottom: 4,
              background: "rgba(255,0,60,0.06)",
              border: "1px solid rgba(255,0,60,0.14)",
            }}>
              <i className="fa-solid fa-bell" style={{ color: "#FF003C", fontSize: 11 }} />
              <span style={{ fontSize: 11.5, color: "rgba(255,255,255,0.60)" }}>
                {notifications} unread notification{notifications !== 1 ? "s" : ""}
              </span>
            </div>
          )}

          {/* Auto-dismiss progress bar */}
          <div style={{
            height: 2, background: "rgba(255,255,255,0.07)",
            borderRadius: 1, marginTop: 14, overflow: "hidden",
          }}>
            <motion.div
              initial={{ width: "100%" }}
              animate={{ width: "0%" }}
              transition={{ duration: AUTO_DISMISS_MS / 1000, ease: "linear" }}
              style={{
                height: "100%",
                background: "linear-gradient(to right, #00F0FF, #7B2FFF)",
                borderRadius: 1,
              }}
            />
          </div>
        </motion.div>
      )}
    </AnimatePresence>
  );
}
