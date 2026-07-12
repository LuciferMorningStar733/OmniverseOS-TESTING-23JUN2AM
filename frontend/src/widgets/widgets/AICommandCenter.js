/**
 * AICommandCenter.js — 2038 CYAN SCI-FI EDITION
 * Futuristic cyan-first command widget with dynamic auto-fit hero layout.
 * Keeps real data behavior, adds stronger cyberpunk visual identity.
 */

import React, {
  useEffect, useState, useRef, useCallback, useMemo
} from "react";
import { motion, AnimatePresence, useSpring, useMotionValue } from "framer-motion";
import { useOS } from "../../context/OSContext";

// ─── helpers ──────────────────────────────────────────────────────────────────

function pad2(n) { return String(n).padStart(2, "0"); }

function useRealClock() {
  const [now, setNow] = useState(() => new Date());
  useEffect(() => {
    const id = setInterval(() => setNow(new Date()), 1000);
    return () => clearInterval(id);
  }, []);
  return now;
}

function useBattery() {
  const [bat, setBat] = useState({ level: null, charging: false });
  useEffect(() => {
    if (!navigator.getBattery) return;
    navigator.getBattery().then((b) => {
      const update = () => setBat({ level: Math.round(b.level * 100), charging: b.charging });
      update();
      b.addEventListener("levelchange", update);
      b.addEventListener("chargingchange", update);
      return () => {
        b.removeEventListener("levelchange", update);
        b.removeEventListener("chargingchange", update);
      };
    }).catch(() => {});
  }, []);
  return bat;
}

function useNetwork() {
  const [net, setNet] = useState({ online: navigator.onLine, type: null, speed: null });
  useEffect(() => {
    const update = () => {
      const conn = navigator.connection || navigator.mozConnection || navigator.webkitConnection;
      setNet({
        online: navigator.onLine,
        type: conn?.effectiveType ?? null,
        speed: conn?.downlink ?? null,
      });
    };
    update();
    window.addEventListener("online", update);
    window.addEventListener("offline", update);
    const conn = navigator.connection;
    if (conn) conn.addEventListener("change", update);
    return () => {
      window.removeEventListener("online", update);
      window.removeEventListener("offline", update);
      if (conn) conn.removeEventListener("change", update);
    };
  }, []);
  return net;
}

function useClipboard() {
  const [text, setText] = useState("");
  useEffect(() => {
    let alive = true;
    const read = async () => {
      try {
        if (!navigator.clipboard?.readText) return;
        const t = await navigator.clipboard.readText();
        if (alive) setText(t || "");
      } catch (_) {}
    };
    read();
    const id = setInterval(read, 4000);
    return () => {
      alive = false;
      clearInterval(id);
    };
  }, []);
  return text;
}

function useGeoWeather() {
  const [state, setState] = useState({
    city: "Locating...",
    tempC: null,
    condition: "—",
  });

  useEffect(() => {
    let active = true;
    if (!navigator.geolocation) {
      setState({ city: "Location Off", tempC: null, condition: "Unavailable" });
      return;
    }

    navigator.geolocation.getCurrentPosition(async (pos) => {
      try {
        const { latitude, longitude } = pos.coords;

        const r1 = await fetch(
          `https://geocode.maps.co/reverse?lat=${latitude}&lon=${longitude}`
        );
        const j1 = await r1.json();

        const city =
          j1?.address?.city ||
          j1?.address?.town ||
          j1?.address?.village ||
          j1?.address?.state ||
          "Unknown";

        const r2 = await fetch(
          `https://api.open-meteo.com/v1/forecast?latitude=${latitude}&longitude=${longitude}&current=temperature_2m,weather_code`
        );
        const j2 = await r2.json();

        const tempC = Math.round(j2?.current?.temperature_2m ?? 0);
        const code = j2?.current?.weather_code;

        const conditionMap = {
          0: "Clear",
          1: "Mostly Clear",
          2: "Partly Cloudy",
          3: "Cloudy",
          45: "Fog",
          48: "Fog",
          51: "Drizzle",
          53: "Drizzle",
          55: "Drizzle",
          61: "Rain",
          63: "Rain",
          65: "Heavy Rain",
          71: "Snow",
          73: "Snow",
          75: "Heavy Snow",
          80: "Showers",
          81: "Showers",
          82: "Storm Showers",
          95: "Storm",
          96: "Storm",
          99: "Storm",
        };

        if (active) {
          setState({
            city,
            tempC,
            condition: conditionMap[code] || "Unknown",
          });
        }
      } catch (_) {
        if (active) {
          setState({ city: "Weather Unavailable", tempC: null, condition: "Offline" });
        }
      }
    }, () => {
      setState({ city: "Location Blocked", tempC: null, condition: "Unavailable" });
    });

    return () => { active = false; };
  }, []);

  return state;
}

function useContainerWidth() {
  const ref = useRef(null);
  const [width, setWidth] = useState(320);

  useEffect(() => {
    if (!ref.current) return;
    const el = ref.current;
    const ro = new ResizeObserver(([entry]) => {
      setWidth(entry.contentRect.width || 320);
    });
    ro.observe(el);
    return () => ro.disconnect();
  }, []);

  return [ref, width];
}

// ─── visual tokens ────────────────────────────────────────────────────────────

const C = {
  cyan: "#6ee7ff",
  cyan2: "#22d3ee",
  cyan3: "#0ea5e9",
  cyanDeep: "#07131d",
  panel: "rgba(7,18,28,0.68)",
  panel2: "rgba(10,22,35,0.78)",
  line: "rgba(110,231,255,0.18)",
  lineStrong: "rgba(110,231,255,0.34)",
  text: "#d9faff",
  textDim: "rgba(198,245,255,0.72)",
  textFaint: "rgba(145,222,255,0.48)",
  magenta: "#ff4fd8",
  violet: "#8b5cf6",
  gold: "#f5d76e",
  green: "#4ade80",
  red: "#fb7185",
};

function GlowDot({ color = C.cyan, size = 8 }) {
  return (
    <span
      style={{
        width: size,
        height: size,
        borderRadius: 999,
        background: color,
        boxShadow: `0 0 10px ${color}, 0 0 22px ${color}`,
        display: "inline-block",
        flex: "0 0 auto",
      }}
    />
  );
}

function TinyStat({ label, value, color = C.cyan }) {
  return (
    <div
      style={{
        minWidth: 0,
        flex: 1,
        padding: "10px 12px",
        borderRadius: 16,
        background: "linear-gradient(180deg, rgba(11,25,38,0.92), rgba(6,14,24,0.82))",
        border: `1px solid ${C.line}`,
        boxShadow: `inset 0 1px 0 rgba(255,255,255,0.04), 0 0 0 1px rgba(0,0,0,0.15), 0 0 28px rgba(34,211,238,0.06)`,
        position: "relative",
        overflow: "hidden",
      }}
    >
      <div
        style={{
          position: "absolute",
          inset: 0,
          background: `radial-gradient(circle at top right, ${color}16, transparent 42%)`,
          pointerEvents: "none",
        }}
      />
      <div
        style={{
          fontSize: 10,
          letterSpacing: "0.18em",
          textTransform: "uppercase",
          color: C.textFaint,
          marginBottom: 6,
          position: "relative",
          zIndex: 1,
          whiteSpace: "nowrap",
          overflow: "hidden",
          textOverflow: "ellipsis",
        }}
      >
        {label}
      </div>
      <div
        style={{
          fontSize: 15,
          fontWeight: 700,
          color: C.text,
          position: "relative",
          zIndex: 1,
          whiteSpace: "nowrap",
          overflow: "hidden",
          textOverflow: "ellipsis",
        }}
      >
        {value}
      </div>
    </div>
  );
}

function SectionCard({ title, right, children, accent = C.cyan, minH = 0 }) {
  return (
    <motion.div
      layout
      style={{
        position: "relative",
        minHeight: minH,
        borderRadius: 20,
        padding: 14,
        overflow: "hidden",
        background: `
          linear-gradient(180deg, rgba(10,24,36,0.92), rgba(6,14,24,0.88)),
          radial-gradient(circle at top right, rgba(110,231,255,0.10), transparent 42%)
        `,
        border: `1px solid ${C.line}`,
        boxShadow: `
          inset 0 1px 0 rgba(255,255,255,0.05),
          0 10px 30px rgba(0,0,0,0.24),
          0 0 34px rgba(34,211,238,0.06)
        `,
        backdropFilter: "blur(18px)",
      }}
    >
      <div
        style={{
          position: "absolute",
          inset: 0,
          pointerEvents: "none",
          background:
            "linear-gradient(90deg, transparent, rgba(110,231,255,0.03), transparent)",
          transform: "translateX(-100%)",
          animation: "aiCommandSweep 7s linear infinite",
        }}
      />

      <div
        style={{
          display: "flex",
          alignItems: "center",
          justifyContent: "space-between",
          gap: 12,
          marginBottom: 12,
          position: "relative",
          zIndex: 1,
        }}
      >
        <div style={{ display: "flex", alignItems: "center", gap: 10, minWidth: 0 }}>
          <GlowDot color={accent} size={8} />
          <div
            style={{
              fontSize: 11,
              fontWeight: 800,
              letterSpacing: "0.18em",
              textTransform: "uppercase",
              color: C.textDim,
              whiteSpace: "nowrap",
              overflow: "hidden",
              textOverflow: "ellipsis",
            }}
          >
            {title}
          </div>
        </div>
        {right ? <div style={{ flex: "0 0 auto" }}>{right}</div> : null}
      </div>

      <div style={{ position: "relative", zIndex: 1 }}>
        {children}
      </div>
    </motion.div>
  );
}

function StatusPill({ label, color = C.cyan }) {
  return (
    <div
      style={{
        display: "inline-flex",
        alignItems: "center",
        gap: 8,
        padding: "8px 12px",
        borderRadius: 999,
        background: "rgba(6,18,28,0.72)",
        border: `1px solid ${C.lineStrong}`,
        boxShadow: `inset 0 1px 0 rgba(255,255,255,0.03), 0 0 24px ${color}1a`,
        color: C.text,
        fontSize: 12,
        fontWeight: 700,
        whiteSpace: "nowrap",
      }}
    >
      <GlowDot color={color} size={7} />
      {label}
    </div>
  );
}

function RingMeter({ value = 72, size = 74, stroke = 8 }) {
  const r = (size - stroke) / 2;
  const c = 2 * Math.PI * r;
  const p = Math.max(0, Math.min(100, value));
  const offset = c - (p / 100) * c;

  return (
    <div style={{ position: "relative", width: size, height: size, flex: "0 0 auto" }}>
      <svg width={size} height={size} viewBox={`0 0 ${size} ${size}`}>
        <defs>
          <linearGradient id="cyanRing" x1="0" y1="0" x2="1" y2="1">
            <stop offset="0%" stopColor={C.cyan} />
            <stop offset="65%" stopColor={C.cyan2} />
            <stop offset="100%" stopColor={C.violet} />
          </linearGradient>
          <filter id="glowRing">
            <feGaussianBlur stdDeviation="2.8" result="blur" />
            <feMerge>
              <feMergeNode in="blur" />
              <feMergeNode in="SourceGraphic" />
            </feMerge>
          </filter>
        </defs>

        <circle
          cx={size / 2}
          cy={size / 2}
          r={r}
          fill="none"
          stroke="rgba(255,255,255,0.08)"
          strokeWidth={stroke}
        />
        <circle
          cx={size / 2}
          cy={size / 2}
          r={r}
          fill="none"
          stroke="url(#cyanRing)"
          strokeWidth={stroke}
          strokeLinecap="round"
          strokeDasharray={c}
          strokeDashoffset={offset}
          transform={`rotate(-90 ${size / 2} ${size / 2})`}
          filter="url(#glowRing)"
        />
      </svg>

      <div
        style={{
          position: "absolute",
          inset: 0,
          display: "grid",
          placeItems: "center",
          color: C.text,
          fontWeight: 900,
          fontSize: 16,
          textShadow: `0 0 16px ${C.cyan2}55`,
        }}
      >
        {p}%
      </div>
    </div>
  );
}

function HeroClock() {
  const now = useRealClock();
  const battery = useBattery();
  const net = useNetwork();
  const weather = useGeoWeather();
  const [wrapRef, width] = useContainerWidth();

  const hh = pad2(now.getHours());
  const mm = pad2(now.getMinutes());
  const ss = pad2(now.getSeconds());

  const dateLabel = now.toLocaleDateString(undefined, {
    weekday: "long",
    day: "numeric",
    month: "short",
    year: "numeric",
  });

  const fs = Math.max(26, Math.min(52, width / 5.3));
  const subFs = Math.max(11, Math.min(14, width / 23));

  return (
    <SectionCard
      title="Cortex Time Core"
      accent={C.cyan}
      right={<StatusPill label={net.online ? "Network Linked" : "Offline"} color={net.online ? C.green : C.red} />}
    >
      <div
        ref={wrapRef}
        style={{
          display: "grid",
          gridTemplateColumns: width < 290 ? "1fr" : "auto 1fr",
          gap: 12,
          alignItems: "center",
          minWidth: 0,
        }}
      >
        <div
          style={{
            display: "flex",
            justifyContent: width < 290 ? "center" : "flex-start",
          }}
        >
          <RingMeter value={battery.level ?? 72} />
        </div>

        <div style={{ minWidth: 0 }}>
          <div
            style={{
              display: "flex",
              alignItems: "baseline",
              gap: 8,
              flexWrap: "wrap",
              minWidth: 0,
            }}
          >
            <div
              style={{
                fontSize: fs,
                lineHeight: 0.92,
                fontWeight: 900,
                letterSpacing: "-0.06em",
                color: C.text,
                textShadow: `0 0 18px rgba(110,231,255,0.20), 0 0 42px rgba(14,165,233,0.12)`,
                whiteSpace: "nowrap",
              }}
            >
              {hh}:{mm}
            </div>
            <div
              style={{
                fontSize: Math.max(13, fs * 0.32),
                color: C.textDim,
                fontWeight: 700,
                paddingBottom: 6,
                letterSpacing: "0.14em",
                textTransform: "uppercase",
              }}
            >
              {ss}
            </div>
          </div>

          <div
            style={{
              fontSize: subFs,
              color: C.textDim,
              marginTop: 6,
              letterSpacing: "0.08em",
              textTransform: "uppercase",
              whiteSpace: "nowrap",
              overflow: "hidden",
              textOverflow: "ellipsis",
            }}
          >
            {dateLabel}
          </div>

          <div
            style={{
              display: "flex",
              gap: 8,
              flexWrap: "wrap",
              marginTop: 12,
            }}
          >
            <StatusPill
              label={`${weather.city}${weather.tempC !== null ? ` · ${weather.tempC}°C` : ""}`}
              color={C.cyan2}
            />
            <StatusPill
              label={battery.level !== null ? `${battery.level}% ${battery.charging ? "Charging" : "Battery"}` : "Battery N/A"}
              color={battery.charging ? C.gold : C.cyan}
            />
            <StatusPill
              label={net.type ? `${net.type}${net.speed ? ` · ${net.speed} Mbps` : ""}` : "Adaptive Link"}
              color={C.violet}
            />
          </div>
        </div>
      </div>
    </SectionCard>
  );
}

function TasksPanel() {
  const tasks = [
    "Sync active context",
    "Review memory graph",
    "Optimize provider routing",
  ];

  return (
    <SectionCard
      title="Mission Queue"
      accent={C.magenta}
      right={<StatusPill label="3 Active" color={C.magenta} />}
    >
      <div style={{ display: "grid", gap: 10 }}>
        {tasks.map((t, i) => (
          <div
            key={t}
            style={{
              display: "flex",
              alignItems: "center",
              gap: 10,
              padding: "10px 12px",
              borderRadius: 14,
              background: "rgba(8,20,31,0.72)",
              border: `1px solid ${C.line}`,
            }}
          >
            <GlowDot color={i === 0 ? C.cyan : i === 1 ? C.violet : C.gold} size={8} />
            <div
              style={{
                color: C.text,
                fontSize: 13,
                fontWeight: 600,
                minWidth: 0,
                overflow: "hidden",
                textOverflow: "ellipsis",
                whiteSpace: "nowrap",
              }}
            >
              {t}
            </div>
          </div>
        ))}
      </div>
    </SectionCard>
  );
}

function MemoryPanel() {
  const clipboard = useClipboard();

  return (
    <SectionCard
      title="Memory + Clipboard"
      accent={C.violet}
      right={<StatusPill label={clipboard ? "Live Buffer" : "Idle Buffer"} color={C.violet} />}
    >
      <div style={{ display: "grid", gap: 10 }}>
        <TinyStat label="Working Memory" value="Neural Context Synced" color={C.cyan} />
        <TinyStat label="Recall Layer" value="Conversation Graph Ready" color={C.violet} />
        <div
          style={{
            borderRadius: 16,
            padding: 12,
            background: "rgba(8,20,31,0.72)",
            border: `1px solid ${C.line}`,
          }}
        >
          <div
            style={{
              fontSize: 10,
              letterSpacing: "0.18em",
              textTransform: "uppercase",
              color: C.textFaint,
              marginBottom: 8,
            }}
          >
            Clipboard Signal
          </div>
          <div
            style={{
              color: clipboard ? C.text : C.textDim,
              fontSize: 13,
              lineHeight: 1.45,
              maxHeight: 72,
              overflow: "hidden",
            }}
          >
            {clipboard || "Clipboard waiting for new signal..."}
          </div>
        </div>
      </div>
    </SectionCard>
  );
}

function QuickActions() {
  const { openApp } = useOS?.() || {};

  const items = [
    { label: "Cortex", color: C.cyan, onClick: () => openApp?.("ai-chat") },
    { label: "Search", color: C.violet, onClick: () => openApp?.("search") },
    { label: "Tasks", color: C.magenta, onClick: () => openApp?.("tasks") },
    { label: "Memory", color: C.gold, onClick: () => openApp?.("memory") },
  ];

  return (
    <SectionCard title="Launch Grid" accent={C.gold}>
      <div style={{ display: "flex", flexWrap: "wrap", gap: 10 }}>
        {items.map((item) => (
          <motion.button
            key={item.label}
            whileHover={{ y: -2, scale: 1.02 }}
            whileTap={{ scale: 0.98 }}
            onClick={item.onClick}
            style={{
              minWidth: "calc(50% - 5px)",
              flex: "1 1 120px",
              border: `1px solid ${C.lineStrong}`,
              borderRadius: 16,
              padding: "12px 14px",
              color: C.text,
              fontWeight: 800,
              letterSpacing: "0.04em",
              background: `
                linear-gradient(180deg, rgba(10,24,36,0.94), rgba(6,14,24,0.88)),
                radial-gradient(circle at top right, ${item.color}18, transparent 46%)
              `,
              boxShadow: `inset 0 1px 0 rgba(255,255,255,0.04), 0 0 28px ${item.color}14`,
              display: "flex",
              alignItems: "center",
              justifyContent: "space-between",
              gap: 10,
              cursor: "pointer",
            }}
          >
            <span>{item.label}</span>
            <GlowDot color={item.color} size={8} />
          </motion.button>
        ))}
      </div>
    </SectionCard>
  );
}

export default function AICommandCenter() {
  return (
    <div
      style={{
        position: "relative",
        width: "100%",
        height: "100%",
        minHeight: 0,
        overflow: "hidden",
        borderRadius: 26,
        padding: 12,
        color: C.text,
        background: `
          radial-gradient(circle at top right, rgba(34,211,238,0.16), transparent 26%),
          radial-gradient(circle at bottom left, rgba(139,92,246,0.14), transparent 24%),
          linear-gradient(180deg, rgba(4,10,18,0.92), rgba(6,14,24,0.96))
        `,
        border: `1px solid ${C.lineStrong}`,
        boxShadow: `
          inset 0 1px 0 rgba(255,255,255,0.05),
          inset 0 0 40px rgba(34,211,238,0.04),
          0 18px 50px rgba(0,0,0,0.32),
          0 0 50px rgba(34,211,238,0.08)
        `,
        backdropFilter: "blur(20px)",
      }}
    >
      <style>{`
        @keyframes aiCommandSweep {
          0% { transform: translateX(-120%); }
          100% { transform: translateX(120%); }
        }

        @keyframes aiGridPulse {
          0%, 100% { opacity: 0.28; }
          50% { opacity: 0.48; }
        }
      `}</style>

      <div
        style={{
          position: "absolute",
          inset: 0,
          pointerEvents: "none",
          backgroundImage: `
            linear-gradient(rgba(110,231,255,0.06) 1px, transparent 1px),
            linear-gradient(90deg, rgba(110,231,255,0.06) 1px, transparent 1px)
          `,
          backgroundSize: "24px 24px",
          maskImage: "linear-gradient(180deg, rgba(0,0,0,0.9), rgba(0,0,0,0.28))",
          animation: "aiGridPulse 4s ease-in-out infinite",
        }}
      />

      <div
        style={{
          position: "relative",
          zIndex: 1,
          display: "grid",
          gap: 12,
          gridTemplateRows: "auto auto auto auto",
        }}
      >
        <HeroClock />

        <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr", gap: 12 }}>
          <TinyStat label="Cortex Core" value="Online" color={C.cyan} />
          <TinyStat label="Provider Mesh" value="Adaptive" color={C.magenta} />
        </div>

        <QuickActions />
        <TasksPanel />
        <MemoryPanel />
      </div>
    </div>
  );
}
