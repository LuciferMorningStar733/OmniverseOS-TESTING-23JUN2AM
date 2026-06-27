import React, { useEffect, useRef, useState } from "react";

const WMO = {
  0:  { icon: "fa-sun",                label: "Clear",          color: "#FCEE09" },
  1:  { icon: "fa-sun",                label: "Mainly Clear",   color: "#FCEE09" },
  2:  { icon: "fa-cloud-sun",          label: "Partly Cloudy",  color: "#94A3B8" },
  3:  { icon: "fa-cloud",              label: "Overcast",       color: "#64748B" },
  45: { icon: "fa-smog",              label: "Foggy",          color: "#94A3B8" },
  48: { icon: "fa-smog",              label: "Icy Fog",        color: "#94A3B8" },
  51: { icon: "fa-cloud-drizzle",     label: "Light Drizzle",  color: "#7DD3FC" },
  53: { icon: "fa-cloud-drizzle",     label: "Drizzle",        color: "#7DD3FC" },
  55: { icon: "fa-cloud-drizzle",     label: "Heavy Drizzle",  color: "#38BDF8" },
  61: { icon: "fa-cloud-rain",        label: "Light Rain",     color: "#00F0FF" },
  63: { icon: "fa-cloud-rain",        label: "Rain",           color: "#00F0FF" },
  65: { icon: "fa-cloud-showers-heavy", label: "Heavy Rain",   color: "#0EA5E9" },
  71: { icon: "fa-snowflake",         label: "Light Snow",     color: "#BAE6FD" },
  73: { icon: "fa-snowflake",         label: "Snow",           color: "#BAE6FD" },
  75: { icon: "fa-snowflake",         label: "Heavy Snow",     color: "#E0F2FE" },
  77: { icon: "fa-snowflake",         label: "Snow Grains",    color: "#E0F2FE" },
  80: { icon: "fa-cloud-rain",        label: "Rain Showers",   color: "#00F0FF" },
  81: { icon: "fa-cloud-showers-heavy", label: "Showers",      color: "#0EA5E9" },
  82: { icon: "fa-cloud-showers-heavy", label: "Heavy Showers",color: "#0284C7" },
  85: { icon: "fa-snowflake",         label: "Snow Showers",   color: "#BAE6FD" },
  86: { icon: "fa-snowflake",         label: "Heavy Snow Showers", color: "#E0F2FE" },
  95: { icon: "fa-cloud-bolt",        label: "Thunderstorm",   color: "#A78BFA" },
  96: { icon: "fa-cloud-bolt",        label: "Thunderstorm",   color: "#A78BFA" },
  99: { icon: "fa-cloud-bolt",        label: "Severe Storm",   color: "#7C3AED" },
};

function wmo(code) {
  if (WMO[code]) return WMO[code];
  const fallback = Object.keys(WMO).map(Number).filter(k => k <= code).pop();
  return WMO[fallback] ?? { icon: "fa-cloud", label: "Unknown", color: "#94A3B8" };
}

async function fetchWeather(lat, lon) {
  const [meteoRes, geoRes] = await Promise.all([
    fetch(
      `https://api.open-meteo.com/v1/forecast?latitude=${lat}&longitude=${lon}` +
      `&current=temperature_2m,apparent_temperature,weathercode,windspeed_10m` +
      `&temperature_unit=celsius&wind_speed_unit=kmh&timezone=auto`
    ),
    fetch(
      `https://nominatim.openstreetmap.org/reverse?lat=${lat}&lon=${lon}&format=json`,
      { headers: { "Accept-Language": "en" } }
    ),
  ]);

  const meteo = await meteoRes.json();
  const geo   = await geoRes.json();

  const cur   = meteo.current;
  const addr  = geo.address ?? {};
  const city  = addr.city || addr.town || addr.village || addr.county || "Unknown";

  return {
    temp:      Math.round(cur.temperature_2m),
    feels:     Math.round(cur.apparent_temperature),
    wind:      Math.round(cur.windspeed_10m),
    code:      cur.weathercode,
    city,
  };
}

export default function WeatherWidget() {
  const [data,   setData]   = useState(null);
  const [status, setStatus] = useState("locating");
  const intervalRef = useRef(null);

  useEffect(() => {
    let cancelled = false;

    async function load() {
      setStatus("locating");
      if (!navigator.geolocation) { setStatus("no-geo"); return; }

      navigator.geolocation.getCurrentPosition(
        async (pos) => {
          if (cancelled) return;
          setStatus("loading");
          try {
            const result = await fetchWeather(pos.coords.latitude, pos.coords.longitude);
            if (!cancelled) { setData(result); setStatus("ok"); }
          } catch {
            if (!cancelled) setStatus("error");
          }
        },
        () => { if (!cancelled) setStatus("denied"); },
        { timeout: 8000 }
      );
    }

    load();
    intervalRef.current = setInterval(load, 10 * 60 * 1000);
    return () => { cancelled = true; clearInterval(intervalRef.current); };
  }, []);

  if (status === "ok" && data) {
    const cond = wmo(data.code);
    return (
      <div className="w-full h-full flex flex-col items-center justify-center gap-1 px-2 select-none">
        <i
          className={`fa-solid ${cond.icon} text-3xl`}
          style={{ color: cond.color, filter: `drop-shadow(0 0 8px ${cond.color}80)` }}
        />
        <div className="font-mono font-bold text-xl" style={{ color: "#fff" }}>
          {data.temp}°C
        </div>
        <div className="text-[10px] font-mono" style={{ color: "rgba(255,255,255,0.6)" }}>
          {cond.label}
        </div>
        <div className="text-[9px] font-mono" style={{ color: "rgba(255,255,255,0.35)" }}>
          {data.city}
        </div>
        <div className="text-[8px] font-mono" style={{ color: "rgba(255,255,255,0.2)" }}>
          Feels {data.feels}° · Wind {data.wind} km/h
        </div>
      </div>
    );
  }

  const msg = {
    "locating": "Locating…",
    "loading":  "Loading…",
    "denied":   "Location denied",
    "no-geo":   "Not supported",
    "error":    "Unavailable",
  }[status] ?? "…";

  return (
    <div className="w-full h-full flex flex-col items-center justify-center gap-1 select-none">
      <i className="fa-solid fa-cloud text-2xl" style={{ color: "rgba(255,255,255,0.2)" }} />
      <div className="text-[9px] font-mono" style={{ color: "rgba(255,255,255,0.25)" }}>
        {msg}
      </div>
    </div>
  );
}
