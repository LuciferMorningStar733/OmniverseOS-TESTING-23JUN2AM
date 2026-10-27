import React, { useState, useMemo } from "react";
import { motion } from "framer-motion";
import { APPS } from "../../lib/apps";

export default function WindowsPhoneAppList({ onOpenApp, onNavigateToStart }) {
  const [searchQuery, setSearchQuery] = useState("");

  // Sort and group all 31 apps alphabetically
  const { sortedApps, groupedApps } = useMemo(() => {
    const sorted = [...APPS].sort((a, b) => a.name.localeCompare(b.name));
    
    // Group by first letter
    const groups = {};
    sorted.forEach((app) => {
      const letter = app.name[0].toUpperCase();
      if (!groups[letter]) groups[letter] = [];
      groups[letter].push(app);
    });

    return { sortedApps: sorted, groupedApps: groups };
  }, []);

  // Filtered list when searching
  const filteredApps = useMemo(() => {
    if (!searchQuery.trim()) return null;
    const q = searchQuery.toLowerCase();
    return sortedApps.filter(
      (app) =>
        app.name.toLowerCase().includes(q) ||
        app.id.toLowerCase().includes(q) ||
        (app.group && app.group.toLowerCase().includes(q))
    );
  }, [searchQuery, sortedApps]);

  return (
    <div
      style={{
        width: "100%",
        minHeight: "100%",
        background: "#000000",
        color: "#ffffff",
        padding: "calc(68px + env(safe-area-inset-top, 0px)) 16px calc(80px + env(safe-area-inset-bottom, 0px)) 16px",
        overflowY: "auto",
        WebkitOverflowScrolling: "touch",
        boxSizing: "border-box",
        fontFamily: "'Segoe UI', 'Outfit', -apple-system, sans-serif",
      }}
      data-testid="windows-phone-app-list"
    >
      {/* ── METRO PIVOT HEADER ────────────────────────────────────────── */}
      <div
        style={{
          display: "flex",
          justifyContent: "space-between",
          alignItems: "baseline",
          paddingBottom: 16,
        }}
      >
        <button
          onClick={onNavigateToStart}
          style={{
            background: "transparent",
            border: "none",
            color: "rgba(255,255,255,0.65)",
            fontSize: 15,
            fontWeight: 400,
            cursor: "pointer",
            display: "flex",
            alignItems: "center",
            gap: 6,
            padding: 0,
            fontFamily: "'Segoe UI', 'Outfit', sans-serif",
            textTransform: "lowercase",
            WebkitTapHighlightColor: "transparent",
          }}
        >
          <i className="fa-solid fa-arrow-left" style={{ fontSize: 13, color: "#00A4EF" }} />
          <span>start</span>
        </button>

        <h1
          style={{
            margin: 0,
            fontSize: 42,
            fontWeight: 300,
            letterSpacing: "-0.04em",
            fontFamily: "'Segoe UI', 'Outfit', sans-serif",
            color: "#ffffff",
            lineHeight: 1,
            textTransform: "lowercase",
          }}
        >
          all apps
        </h1>
      </div>

      {/* ── METRO SEARCH BOX ──────────────────────────────────────────── */}
      <div style={{ marginBottom: 20 }}>
        <div
          style={{
            display: "flex",
            alignItems: "center",
            background: "rgba(255,255,255,0.08)",
            border: "2px solid rgba(255,255,255,0.25)",
            borderRadius: 0, // Classic sharp Metro search box
            padding: "8px 12px",
            gap: 8,
          }}
        >
          <i className="fa-solid fa-magnifying-glass" style={{ color: "#00A4EF", fontSize: 13 }} />
          <input
            type="text"
            value={searchQuery}
            onChange={(e) => setSearchQuery(e.target.value)}
            placeholder="search omniverseos..."
            style={{
              background: "transparent",
              border: "none",
              outline: "none",
              color: "#ffffff",
              fontSize: 14,
              fontFamily: "'Segoe UI', 'Outfit', sans-serif",
              width: "100%",
            }}
          />
          {searchQuery && (
            <button
              onClick={() => setSearchQuery("")}
              style={{
                background: "transparent",
                border: "none",
                color: "rgba(255,255,255,0.5)",
                cursor: "pointer",
                padding: "2px 6px",
              }}
            >
              <i className="fa-solid fa-xmark" style={{ fontSize: 12 }} />
            </button>
          )}
        </div>
      </div>

      {/* ── APPS DISPLAY ──────────────────────────────────────────────── */}
      {filteredApps ? (
        // Search Results View
        <div style={{ display: "flex", flexDirection: "column", gap: 12 }}>
          {filteredApps.length === 0 ? (
            <div style={{ padding: "24px 0", textAlign: "center", color: "rgba(255,255,255,0.5)", fontSize: 13 }}>
              No applications match "{searchQuery}"
            </div>
          ) : (
            filteredApps.map((app) => (
              <AppRowItem key={app.id} app={app} onOpenApp={onOpenApp} />
            ))
          )}
        </div>
      ) : (
        // Categorized Alphabetical List View
        <div style={{ display: "flex", flexDirection: "column", gap: 20 }}>
          {Object.keys(groupedApps)
            .sort()
            .map((letter) => (
              <div key={letter}>
                {/* Metro Jump-List Header Box */}
                <div
                  style={{
                    width: 34,
                    height: 34,
                    background: "#0078D7", // Windows Phone Accent Jump-List Square
                    display: "flex",
                    alignItems: "center",
                    justifyContent: "center",
                    color: "#ffffff",
                    fontSize: 16,
                    fontWeight: 700,
                    fontFamily: "'Segoe UI', 'Outfit', sans-serif",
                    marginBottom: 12,
                    boxShadow: "0 2px 8px rgba(0,0,0,0.4)",
                  }}
                >
                  {letter}
                </div>

                {/* Apps under this letter */}
                <div style={{ display: "flex", flexDirection: "column", gap: 10, paddingLeft: 4 }}>
                  {groupedApps[letter].map((app) => (
                    <AppRowItem key={app.id} app={app} onOpenApp={onOpenApp} />
                  ))}
                </div>
              </div>
            ))}
        </div>
      )}
    </div>
  );
}

function AppRowItem({ app, onOpenApp }) {
  const [tilt, setTilt] = useState({ x: 0, y: 0, scale: 1 });

  const handlePointerDown = (e) => {
    const rect = e.currentTarget.getBoundingClientRect();
    const x = e.clientX - rect.left - rect.width / 2;
    const y = e.clientY - rect.top - rect.height / 2;
    setTilt({ x: -(y / 20) * 8, y: (x / 50) * 8, scale: 0.97 });
  };

  const handlePointerUp = () => {
    setTilt({ x: 0, y: 0, scale: 1 });
  };

  return (
    <div
      onPointerDown={handlePointerDown}
      onPointerUp={handlePointerUp}
      onPointerLeave={handlePointerUp}
      onPointerCancel={handlePointerUp}
      onClick={() => onOpenApp(app.id)}
      style={{
        display: "flex",
        alignItems: "center",
        gap: 14,
        padding: "6px 8px",
        cursor: "pointer",
        borderRadius: 2,
        background: "transparent",
        transform: `perspective(600px) rotateX(${tilt.x}deg) rotateY(${tilt.y}deg) scale(${tilt.scale})`,
        transition: "transform 0.1s ease, background 0.15s ease",
        WebkitTapHighlightColor: "transparent",
      }}
    >
      {/* Metro App Icon Box */}
      <div
        style={{
          width: 44,
          height: 44,
          minWidth: 44,
          background: app.color || "#0078D7",
          display: "flex",
          alignItems: "center",
          justifyContent: "center",
          borderRadius: 2,
          boxShadow: "0 2px 8px rgba(0,0,0,0.5), inset 0 0 0 1px rgba(255,255,255,0.15)",
        }}
      >
        <i className={`fa-solid ${app.icon}`} style={{ color: "#ffffff", fontSize: 18 }} />
      </div>

      {/* App Title & Category Subtitle */}
      <div style={{ display: "flex", flexDirection: "column", gap: 2, minWidth: 0 }}>
        <span
          style={{
            fontSize: 16,
            fontWeight: 500,
            color: "#ffffff",
            fontFamily: "'Segoe UI', 'Outfit', sans-serif",
            letterSpacing: "-0.01em",
            whiteSpace: "nowrap",
            overflow: "hidden",
            textOverflow: "ellipsis",
          }}
        >
          {app.name}
        </span>
        <span
          style={{
            fontSize: 10.5,
            color: "rgba(255,255,255,0.5)",
            fontFamily: "'Segoe UI', 'Outfit', sans-serif",
            textTransform: "uppercase",
            letterSpacing: "0.05em",
          }}
        >
          {app.group || "application"}
        </span>
      </div>
    </div>
  );
}
