import React, { useEffect, useState } from "react";
import { motion, AnimatePresence } from "framer-motion";
import { getStoredCity } from "./LocationSetup";

const AUTO_DISMISS_MS = 8000;

function getGreeting(name) {
  const h = new Date().getHours();
  const period = h < 12 ? "morning" : h < 17 ? "afternoon" : "evening";
  return `Good ${period}, ${name || "there"}.`;
}

function useWeatherSummary(city) {
  const [summary, setSummary] = useState(null);
  useEffect(() => {
    if (!city) return;
    let cancelled = false;
    (async () => {
      try {
        // Geocode city → lat/lon
        const geoRes = await fetch(
          `https://nominatim.openstreetmap.org/search?q=${encodeURIComponent(city)}&format=json&limit=1`,
          { headers: { "Accept-Language": "en" } }
        );
        const geo = await geoRes.json();
        if (!geo?.[0] || cancelled) return;
        const { lat, lon } = geo[0];

        // Fetch current weather
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
  const [visible, setVisible] = useState(true);
  const city = getStoredCity();
  const weather = useWeatherSummary(city);

  const now = new Date();
  const timeStr = now.toLocaleTimeString([], { hour: "2-digit", minute: "2-digit" });

  useEffect(() => {
    const t = setTimeout(() => {
      setVisible(false);
      setTimeout(onDismiss, 500);
    }, AUTO_DISMISS_MS);
    return () => clearTimeout(t);
  }, [onDismiss]);

  const handleDismiss = () => {
    setVisible(false);
    setTimeout(onDismiss, 500);
  };

  const greeting = getGreeting(user?.name?.split(" ")[0]);

  return (
    <AnimatePresence>
      {visible && (
        <motion.div
          initial={{ opacity: 0, y: -20, scale: 0.96 }}
          animate={{ opacity: 1, y: 0, scale: 1 }}
          exit={{ opacity: 0, y: -16, scale: 0.97 }}
          transition={{ type: "spring", stiffness: 360, damping: 30 }}
          style={{
            position: "fixed",
            top: 54,
            left: "50%",
            transform: "translateX(-50%)",
            width: 340,
            background: "rgba(6,8,16,0.96)",
            backdropFilter: "blur(40px) saturate(180%)",
            WebkitBackdropFilter: "blur(40px) saturate(180%)",
            border: "1px solid rgba(0,240,255,0.14)",
            borderRadius: 18,
            boxShadow: "0 20px 60px rgba(0,0,0,0.75), 0 0 0 1px rgba(0,240,255,0.06)",
            padding: "18px 20px",
            zIndex: 500,
          }}
          onClick={handleDismiss}
        >
          {/* Dismiss hint */}
          <div style={{
            position: "absolute", top: 8, right: 10,
            fontSize: 10, fontFamily: "monospace",
            color: "rgba(255,255,255,0.2)",
          }}>
            Click to dismiss
          </div>

          {/* Greeting */}
          <div style={{ fontFamily: "'Unbounded', sans-serif", fontSize: 16, fontWeight: 700, color: "#fff", marginBottom: 4 }}>
            {greeting}
          </div>

          {/* Time */}
          <div style={{ fontFamily: "monospace", fontSize: 11, color: "#00F0FF", marginBottom: 14, letterSpacing: "0.1em" }}>
            {timeStr} · {now.toLocaleDateString(undefined, { weekday: "long", month: "short", day: "numeric" })}
          </div>

          {/* Divider */}
          <div style={{ height: 1, background: "rgba(255,255,255,0.06)", marginBottom: 14 }} />

          {/* Weather */}
          {city ? (
            <div style={{ marginBottom: 12 }}>
              <div style={{ fontSize: 10, fontFamily: "monospace", color: "rgba(255,255,255,0.3)", textTransform: "uppercase", letterSpacing: "0.12em", marginBottom: 6 }}>
                Weather
              </div>
              {weather ? (
                <div style={{ display: "flex", alignItems: "center", gap: 10 }}>
                  <span style={{ fontSize: 24 }}>{weather.emoji}</span>
                  <div>
                    <div style={{ fontSize: 13, fontWeight: 600, color: "#A855F7" }}>{weather.city}</div>
                    <div style={{ fontSize: 12, color: "rgba(255,255,255,0.6)" }}>
                      {weather.desc}{weather.temp != null ? ` · ${weather.temp}°C` : ""}
                    </div>
                  </div>
                </div>
              ) : (
                <div style={{ fontSize: 11, color: "rgba(255,255,255,0.3)", fontFamily: "monospace" }}>Loading weather…</div>
              )}
            </div>
          ) : (
            <div style={{ marginBottom: 12, fontSize: 12, color: "rgba(255,255,255,0.35)", fontFamily: "monospace" }}>
              ⚙️ Location not set — go to Settings to configure weather.
            </div>
          )}

          {/* Notifications count */}
          {notifications > 0 && (
            <div style={{
              display: "flex", alignItems: "center", gap: 8,
              padding: "8px 12px", borderRadius: 10,
              background: "rgba(255,0,60,0.07)",
              border: "1px solid rgba(255,0,60,0.15)",
            }}>
              <i className="fa-solid fa-bell" style={{ color: "#FF003C", fontSize: 11 }} />
              <span style={{ fontSize: 12, color: "rgba(255,255,255,0.65)" }}>
                {notifications} unread notification{notifications !== 1 ? "s" : ""}
              </span>
            </div>
          )}

          {/* Auto-dismiss progress bar */}
          <div style={{ height: 2, background: "rgba(255,255,255,0.07)", borderRadius: 1, marginTop: 14, overflow: "hidden" }}>
            <motion.div
              initial={{ width: "100%" }}
              animate={{ width: "0%" }}
              transition={{ duration: AUTO_DISMISS_MS / 1000, ease: "linear" }}
              style={{ height: "100%", background: "linear-gradient(to right, #00F0FF, #7B2FFF)", borderRadius: 1 }}
            />
          </div>
        </motion.div>
      )}
    </AnimatePresence>
  );
}
