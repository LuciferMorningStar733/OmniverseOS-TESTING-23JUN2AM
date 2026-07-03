import React, { useState, useEffect, useRef } from "react";

/* ── Live device telemetry hooks — all values are REAL, never fabricated ──── */
function useBatteryLevel() {
  const [battery, setBattery] = useState(null); // { level: 0-1, charging } | null if unsupported
  useEffect(() => {
    let batteryRef;
    let mounted = true;
    if (typeof navigator.getBattery !== "function") return;
    navigator.getBattery().then((b) => {
      if (!mounted) return;
      batteryRef = b;
      const update = () => mounted && setBattery({ level: b.level, charging: b.charging });
      update();
      b.addEventListener("levelchange", update);
      b.addEventListener("chargingchange", update);
    }).catch(() => {});
    return () => {
      mounted = false;
      if (batteryRef) {
        batteryRef.removeEventListener?.("levelchange", () => {});
        batteryRef.removeEventListener?.("chargingchange", () => {});
      }
    };
  }, []);
  return battery;
}

function useConnectionInfo() {
  const [conn, setConn] = useState(null); // { effectiveType } | null if unsupported
  useEffect(() => {
    const nc = navigator.connection || navigator.mozConnection || navigator.webkitConnection;
    if (!nc) return;
    const update = () => setConn({ effectiveType: nc.effectiveType, downlink: nc.downlink });
    update();
    nc.addEventListener?.("change", update);
    return () => nc.removeEventListener?.("change", update);
  }, []);
  return conn;
}

function useLocalClock() {
  const [now, setNow] = useState(() => new Date());
  useEffect(() => {
    const id = setInterval(() => setNow(new Date()), 1000);
    return () => clearInterval(id);
  }, []);
  return now;
}

function formatTime(d) {
  return d.toLocaleTimeString([], { hour: "2-digit", minute: "2-digit" });
}

/**
 * Mobile-only Cortex header — identity, live status, model selector, and an
 * expandable "Cortex Profile" telemetry panel built entirely from real
 * browser APIs and real conversation state (no fabricated numbers).
 */
export default function MobileCortexHeader({
  streaming,
  isRecording,
  activeProvider,
  modelSelectSlot,
  userLocation,
  contextCount,
  approxContextTokens,
  memoryCount,
  memoryCountLoading,
}) {
  const [expanded, setExpanded] = useState(false);
  const battery = useBatteryLevel();
  const connection = useConnectionInfo();
  const now = useLocalClock();
  const rotateRef = useRef(null);

  const statusLabel = streaming ? "thinking…" : isRecording ? "listening" : "online";
  const statusColor = streaming ? "rgba(207,158,255,0.85)" : isRecording ? "rgba(255,80,80,0.9)" : "rgba(0,240,255,0.85)";

  return (
    <div style={{ flexShrink: 0 }}>
      <style>{`
        @keyframes cortexBreathe {
          0%, 100% { transform: scale(1); box-shadow: 0 0 0 1px rgba(0,240,255,0.28), 0 0 18px rgba(0,240,255,0.22); }
          50%       { transform: scale(1.05); box-shadow: 0 0 0 1px rgba(0,240,255,0.42), 0 0 30px rgba(0,240,255,0.4); }
        }
        @keyframes cortexRingSpin {
          from { transform: rotate(0deg); }
          to   { transform: rotate(360deg); }
        }
        @keyframes cortexOnlineDot {
          0%, 100% { opacity: 1; box-shadow: 0 0 0 0 rgba(0,240,255,0.5); }
          50%       { opacity: 0.6; box-shadow: 0 0 0 4px rgba(0,240,255,0); }
        }
        @keyframes panelSlideDown {
          from { opacity: 0; transform: translateY(-8px); max-height: 0; }
          to   { opacity: 1; transform: translateY(0); max-height: 320px; }
        }
      `}</style>

      {/* Header row */}
      <div
        className="flex items-center justify-between gap-2"
        style={{
          padding: "10px 14px",
          borderBottom: expanded ? "none" : "1px solid rgba(255,255,255,0.07)",
          background: "rgba(0,0,0,0.30)",
          backdropFilter: "blur(14px) saturate(160%)",
        }}
      >
        <button
          onClick={() => setExpanded((e) => !e)}
          data-testid="mobile-cortex-profile-toggle"
          style={{
            display: "flex", alignItems: "center", gap: 10,
            background: "transparent", border: "none", padding: 0, cursor: "pointer",
            WebkitTapHighlightColor: "transparent", minWidth: 0,
          }}
        >
          <div style={{ position: "relative", width: 38, height: 38, flexShrink: 0 }}>
            {/* Rotating neural ring */}
            <svg width="38" height="38" viewBox="0 0 38 38" style={{ position: "absolute", inset: 0, animation: "cortexRingSpin 6s linear infinite" }}>
              <circle cx="19" cy="19" r="17" fill="none" stroke="rgba(0,240,255,0.35)" strokeWidth="1" strokeDasharray="4 5" />
            </svg>
            {/* Breathing orb */}
            <div style={{
              position: "absolute", inset: 4, borderRadius: "50%",
              background: streaming
                ? "radial-gradient(circle at 40% 35%, rgba(207,158,255,0.85) 0%, rgba(0,240,255,0.55) 60%, rgba(0,0,0,0.3) 100%)"
                : "radial-gradient(circle at 40% 35%, rgba(0,240,255,0.9) 0%, rgba(0,170,210,0.5) 60%, rgba(0,0,0,0.4) 100%)",
              animation: "cortexBreathe 3.2s ease-in-out infinite",
              display: "flex", alignItems: "center", justifyContent: "center",
            }}>
              <i className="fa-solid fa-wand-magic-sparkles" style={{ fontSize: 12, color: "#fff", textShadow: "0 0 8px rgba(0,240,255,0.9)" }} />
            </div>
            <span style={{
              position: "absolute", bottom: -1, right: -1, width: 9, height: 9, borderRadius: "50%",
              background: "#00F0FF", border: "2px solid rgba(5,5,14,0.9)",
              animation: "cortexOnlineDot 2s ease-in-out infinite",
            }} />
          </div>

          <div style={{ textAlign: "left", minWidth: 0 }}>
            <div style={{ display: "flex", alignItems: "center", gap: 6 }}>
              <span style={{ fontSize: 15, fontWeight: 700, color: "#fff", letterSpacing: "-0.2px" }}>Cortex</span>
              <i className={`fa-solid fa-chevron-${expanded ? "up" : "down"}`} style={{ fontSize: 9, color: "rgba(255,255,255,0.35)" }} />
            </div>
            <div style={{
              fontSize: 10, fontFamily: "'JetBrains Mono', monospace",
              letterSpacing: "0.1em", textTransform: "uppercase", color: statusColor,
              display: "flex", alignItems: "center", gap: 4,
            }}>
              <span>●</span> {statusLabel}
              {activeProvider && <span style={{ opacity: 0.5 }}>· {activeProvider}</span>}
            </div>
          </div>
        </button>

        <div style={{ flexShrink: 0 }}>{modelSelectSlot}</div>
      </div>

      {/* Expandable Cortex Profile panel — all real data, no fabrication */}
      {expanded && (
        <div
          style={{
            padding: "12px 14px 14px",
            background: "rgba(0,10,20,0.55)",
            borderBottom: "1px solid rgba(0,240,255,0.12)",
            animation: "panelSlideDown 0.22s cubic-bezier(0.34,1.56,0.64,1) both",
            display: "grid",
            gridTemplateColumns: "1fr 1fr",
            gap: 8,
          }}
        >
          <ProfileStat icon="fa-clock" label="Local time" value={formatTime(now)} />
          <ProfileStat
            icon="fa-location-dot"
            label="Location"
            value={userLocation?.city ? [userLocation.city, userLocation.country].filter(Boolean).join(", ") : "Not set"}
            dim={!userLocation?.city}
          />
          <ProfileStat
            icon={battery?.charging ? "fa-bolt" : "fa-battery-three-quarters"}
            label="Battery"
            value={battery ? `${Math.round(battery.level * 100)}%${battery.charging ? " ⚡" : ""}` : "Unsupported"}
            dim={!battery}
          />
          <ProfileStat
            icon="fa-signal"
            label="Connection"
            value={connection?.effectiveType ? connection.effectiveType.toUpperCase() : "Unknown"}
            dim={!connection}
          />
          <ProfileStat
            icon="fa-brain"
            label="Context window"
            value={contextCount > 0 ? `${contextCount} msgs · ~${approxContextTokens} tok` : "Empty"}
            dim={contextCount === 0}
          />
          <ProfileStat
            icon="fa-database"
            label="Saved memories"
            value={memoryCountLoading ? "…" : memoryCount != null ? `${memoryCount}` : "N/A"}
            dim={!memoryCountLoading && !memoryCount}
          />
        </div>
      )}
    </div>
  );
}

function ProfileStat({ icon, label, value, dim }) {
  return (
    <div style={{
      display: "flex", alignItems: "center", gap: 8,
      padding: "7px 9px", borderRadius: 10,
      background: "rgba(255,255,255,0.03)",
      border: "1px solid rgba(255,255,255,0.06)",
    }}>
      <div style={{
        width: 24, height: 24, borderRadius: 7, flexShrink: 0,
        display: "flex", alignItems: "center", justifyContent: "center",
        background: "rgba(0,240,255,0.08)", border: "1px solid rgba(0,240,255,0.18)",
      }}>
        <i className={`fa-solid ${icon}`} style={{ fontSize: 10, color: "rgba(0,240,255,0.85)" }} />
      </div>
      <div style={{ minWidth: 0 }}>
        <div style={{ fontSize: 8.5, textTransform: "uppercase", letterSpacing: "0.08em", color: "rgba(255,255,255,0.35)", fontFamily: "'JetBrains Mono', monospace" }}>
          {label}
        </div>
        <div style={{
          fontSize: 12, fontWeight: 600, color: dim ? "rgba(255,255,255,0.35)" : "#E2E8F0",
          overflow: "hidden", textOverflow: "ellipsis", whiteSpace: "nowrap",
        }}>
          {value}
        </div>
      </div>
    </div>
  );
}
