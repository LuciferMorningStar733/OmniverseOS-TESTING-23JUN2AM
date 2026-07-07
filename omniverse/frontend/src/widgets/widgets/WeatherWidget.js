import React, { useEffect, useRef, useState, useCallback } from "react";
  import { motion, AnimatePresence } from "framer-motion";

  const LS_CITY = "omni_weather_city";
  const DEFAULT_CITY = "New York";

  const WMO = {
    0:  { icon: "fa-sun",                label: "Clear",           color: "#FCEE09" },
    1:  { icon: "fa-sun",                label: "Mainly Clear",    color: "#FCEE09" },
    2:  { icon: "fa-cloud-sun",          label: "Partly Cloudy",   color: "#94A3B8" },
    3:  { icon: "fa-cloud",              label: "Overcast",        color: "#64748B" },
    45: { icon: "fa-smog",              label: "Foggy",           color: "#94A3B8" },
    48: { icon: "fa-smog",              label: "Icy Fog",         color: "#94A3B8" },
    51: { icon: "fa-cloud-drizzle",     label: "Light Drizzle",   color: "#7DD3FC" },
    53: { icon: "fa-cloud-drizzle",     label: "Drizzle",         color: "#7DD3FC" },
    55: { icon: "fa-cloud-drizzle",     label: "Heavy Drizzle",   color: "#38BDF8" },
    61: { icon: "fa-cloud-rain",        label: "Light Rain",      color: "#00F0FF" },
    63: { icon: "fa-cloud-rain",        label: "Rain",            color: "#00F0FF" },
    65: { icon: "fa-cloud-showers-heavy", label: "Heavy Rain",    color: "#0EA5E9" },
    71: { icon: "fa-snowflake",         label: "Light Snow",      color: "#BAE6FD" },
    73: { icon: "fa-snowflake",         label: "Snow",            color: "#BAE6FD" },
    75: { icon: "fa-snowflake",         label: "Heavy Snow",      color: "#E0F2FE" },
    80: { icon: "fa-cloud-rain",        label: "Rain Showers",    color: "#00F0FF" },
    81: { icon: "fa-cloud-showers-heavy", label: "Showers",       color: "#0EA5E9" },
    82: { icon: "fa-cloud-showers-heavy", label: "Heavy Showers", color: "#0284C7" },
    95: { icon: "fa-cloud-bolt",        label: "Thunderstorm",    color: "#A78BFA" },
    96: { icon: "fa-cloud-bolt",        label: "Thunderstorm",    color: "#A78BFA" },
    99: { icon: "fa-cloud-bolt",        label: "Severe Storm",    color: "#7C3AED" },
  };

  function wmo(code) {
    if (WMO[code]) return WMO[code];
    const fallback = Object.keys(WMO).map(Number).filter(k => k <= code).pop();
    return WMO[fallback] ?? { icon: "fa-cloud", label: "Unknown", color: "#94A3B8" };
  }

  async function fetchByCoords(lat, lon) {
    const [meteoRes, geoRes] = await Promise.all([
      fetch(
        `https://api.open-meteo.com/v1/forecast?latitude=${lat}&longitude=${lon}` +
        `&current=temperature_2m,apparent_temperature,weathercode,windspeed_10m` +
        `&temperature_unit=celsius&wind_speed_unit=kmh&timezone=auto`
      ),
      fetch(`https://nominatim.openstreetmap.org/reverse?lat=${lat}&lon=${lon}&format=json`,
        { headers: { "Accept-Language": "en" } }),
    ]);
    const meteo = await meteoRes.json();
    const geo   = await geoRes.json();
    const cur   = meteo.current;
    const addr  = geo.address ?? {};
    const city  = addr.city || addr.town || addr.village || addr.county || "Unknown";
    return { temp: Math.round(cur.temperature_2m), feels: Math.round(cur.apparent_temperature),
      wind: Math.round(cur.windspeed_10m), code: cur.weathercode, city };
  }

  async function fetchByCity(cityName) {
    const geoRes = await fetch(
      `https://geocoding-api.open-meteo.com/v1/search?name=${encodeURIComponent(cityName)}&count=1&language=en`
    );
    const geoData = await geoRes.json();
    if (!geoData.results?.length) throw new Error("City not found");
    const { latitude, longitude, name } = geoData.results[0];
    const meteoRes = await fetch(
      `https://api.open-meteo.com/v1/forecast?latitude=${latitude}&longitude=${longitude}` +
      `&current=temperature_2m,apparent_temperature,weathercode,windspeed_10m` +
      `&temperature_unit=celsius&wind_speed_unit=kmh&timezone=auto`
    );
    const meteo = await meteoRes.json();
    const cur   = meteo.current;
    return { temp: Math.round(cur.temperature_2m), feels: Math.round(cur.apparent_temperature),
      wind: Math.round(cur.windspeed_10m), code: cur.weathercode, city: name };
  }

  export default function WeatherWidget() {
    const [data,         setData]        = useState(null);
    const [status,       setStatus]      = useState("loading");
    const [searching,    setSearching]   = useState(false);
    const [searchInput,  setSearchInput] = useState("");
    const [searchError,  setSearchError] = useState("");
    const intervalRef = useRef(null);
    const inputRef    = useRef(null);

    const savedCity = () => {
      try { return localStorage.getItem(LS_CITY) || ""; } catch { return ""; }
    };

    const load = useCallback(async () => {
      setStatus("loading");
      const city = savedCity();

      // Priority 1: saved city
      if (city) {
        try {
          const result = await fetchByCity(city);
          setData(result); setStatus("ok"); return;
        } catch { /* fall through to GPS */ }
      }

      // Priority 2: GPS
      if (navigator.geolocation) {
        await new Promise((resolve) => {
          navigator.geolocation.getCurrentPosition(
            async (pos) => {
              try {
                const result = await fetchByCoords(pos.coords.latitude, pos.coords.longitude);
                setData(result); setStatus("ok");
              } catch { setStatus("error"); }
              resolve();
            },
            () => {
              // Priority 3: default city
              fetchByCity(DEFAULT_CITY)
                .then((result) => { setData(result); setStatus("ok"); })
                .catch(() => setStatus("error"))
                .finally(resolve);
            },
            { timeout: 6000 }
          );
        });
      } else {
        // No geolocation — use default city
        try {
          const result = await fetchByCity(DEFAULT_CITY);
          setData(result); setStatus("ok");
        } catch { setStatus("error"); }
      }
    }, []);

    useEffect(() => {
      load();
      intervalRef.current = setInterval(load, 10 * 60 * 1000);
      return () => clearInterval(intervalRef.current);
    }, [load]);

    const handleSearch = async () => {
      if (!searchInput.trim()) return;
      setSearchError("");
      setStatus("loading");
      try {
        const result = await fetchByCity(searchInput.trim());
        localStorage.setItem(LS_CITY, searchInput.trim());
        setData(result); setStatus("ok");
        setSearching(false); setSearchInput("");
      } catch {
        setSearchError("City not found");
        setStatus(data ? "ok" : "error");
      }
    };

    const clearCity = () => {
      localStorage.removeItem(LS_CITY);
      setSearching(false); setSearchInput(""); setSearchError("");
      load();
    };

    if (searching) {
      return (
        <div className="w-full h-full flex flex-col items-center justify-center gap-2 px-2">
          <input
            ref={inputRef}
            autoFocus
            type="text"
            value={searchInput}
            onChange={(e) => setSearchInput(e.target.value)}
            onKeyDown={(e) => { if (e.key === "Enter") handleSearch(); if (e.key === "Escape") setSearching(false); }}
            placeholder="City name…"
            style={{
              width: "100%", height: 28, borderRadius: 7, padding: "0 8px",
              background: "rgba(0,240,255,0.07)", border: "1px solid rgba(0,240,255,0.25)",
              outline: "none", color: "#fff", fontSize: 11,
              fontFamily: "'JetBrains Mono', monospace",
            }}
          />
          {searchError && <div style={{ fontSize: 9, color: "#FF003C", fontFamily: "monospace" }}>{searchError}</div>}
          <div style={{ display: "flex", gap: 6 }}>
            <motion.button whileTap={{ scale: 0.9 }} onClick={handleSearch} style={{
              padding: "3px 10px", borderRadius: 6, fontSize: 10, cursor: "pointer",
              background: "rgba(0,240,255,0.12)", border: "1px solid rgba(0,240,255,0.3)",
              color: "#00F0FF", fontFamily: "monospace",
            }}>Go</motion.button>
            <motion.button whileTap={{ scale: 0.9 }} onClick={() => setSearching(false)} style={{
              padding: "3px 10px", borderRadius: 6, fontSize: 10, cursor: "pointer",
              background: "rgba(255,255,255,0.05)", border: "1px solid rgba(255,255,255,0.1)",
              color: "rgba(255,255,255,0.5)", fontFamily: "monospace",
            }}>Cancel</motion.button>
          </div>
        </div>
      );
    }

    if (status === "ok" && data) {
      const cond = wmo(data.code);
      return (
        <div className="w-full h-full flex flex-col items-center justify-center gap-1 px-2 select-none">
          <i className={`fa-solid ${cond.icon} text-3xl`}
            style={{ color: cond.color, filter: `drop-shadow(0 0 8px ${cond.color}80)` }} />
          <div className="font-mono font-bold text-xl" style={{ color: "#fff" }}>{data.temp}°C</div>
          <div style={{ fontSize: 10, fontFamily: "monospace", color: "rgba(255,255,255,0.6)" }}>{cond.label}</div>
          <motion.button
            whileTap={{ scale: 0.9 }}
            onClick={() => setSearching(true)}
            style={{
              fontSize: 9, fontFamily: "monospace", color: "rgba(255,255,255,0.5)",
              background: "transparent", border: "none", cursor: "pointer",
              display: "flex", alignItems: "center", gap: 3,
              WebkitTapHighlightColor: "transparent",
            }}
            title="Change city"
          >
            <i className="fa-solid fa-location-dot" style={{ fontSize: 8 }} />
            {data.city}
          </motion.button>
          <div style={{ fontSize: 8, fontFamily: "monospace", color: "rgba(255,255,255,0.2)" }}>
            Feels {data.feels}° · {data.wind} km/h
          </div>
          {savedCity() && (
            <motion.button
              whileTap={{ scale: 0.85 }}
              onClick={clearCity}
              title="Use automatic location"
              style={{
                fontSize: 8, fontFamily: "monospace", color: "rgba(255,255,255,0.2)",
                background: "transparent", border: "none", cursor: "pointer",
                WebkitTapHighlightColor: "transparent",
              }}
            >
              ↺ auto
            </motion.button>
          )}
        </div>
      );
    }

    return (
      <div className="w-full h-full flex flex-col items-center justify-center gap-2 select-none">
        <i className="fa-solid fa-cloud text-2xl" style={{ color: "rgba(255,255,255,0.2)" }} />
        <div style={{ fontSize: 9, fontFamily: "monospace", color: "rgba(255,255,255,0.25)" }}>
          {status === "loading" ? "Loading…" : "Unavailable"}
        </div>
        <motion.button
          whileTap={{ scale: 0.9 }}
          onClick={() => setSearching(true)}
          style={{
            fontSize: 9, fontFamily: "monospace", color: "rgba(0,240,255,0.5)",
            background: "transparent", border: "none", cursor: "pointer",
            WebkitTapHighlightColor: "transparent",
          }}
        >
          Set city manually
        </motion.button>
      </div>
    );
  }
  