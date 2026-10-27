import React, { useState, useEffect } from "react";
import { motion } from "framer-motion";

/**
 * WindowsPhoneTile
 * Recreates the iconic Windows Phone Metro Live Tile with 3D perspective tilt,
 * fluid spring physics, live flipping secondary faces, notification badges,
 * and bold Segoe/Outfit typography.
 */
export default function WindowsPhoneTile({
  app,
  size = "medium", // 'wide', 'medium', 'small'
  title,
  icon,
  accentColor = "#0078D7",
  badge,
  statusText,
  secondaryContent,
  onClick,
  canFlip = false,
  flipInterval = 5000,
  delay = 0,
}) {
  const [isFlipped, setIsFlipped] = useState(false);
  const [tilt, setTilt] = useState({ x: 0, y: 0, scale: 1 });

  // Handle live tile periodic flip (iconic Windows Phone live cycle)
  useEffect(() => {
    if (!canFlip || !secondaryContent) return;
    const interval = setInterval(() => {
      setIsFlipped((prev) => !prev);
    }, flipInterval);
    return () => clearInterval(interval);
  }, [canFlip, secondaryContent, flipInterval]);

  // Iconic Metro 3D Perspective Tilt on Touch / Pointer Down
  const handlePointerDown = (e) => {
    const rect = e.currentTarget.getBoundingClientRect();
    const x = e.clientX - rect.left - rect.width / 2;
    const y = e.clientY - rect.top - rect.height / 2;
    // Calculate tilt angles based on touch position
    const rotateX = -(y / (rect.height / 2)) * 14;
    const rotateY = (x / (rect.width / 2)) * 14;
    setTilt({ x: rotateX, y: rotateY, scale: 0.95 });
  };

  const handlePointerUp = () => {
    setTilt({ x: 0, y: 0, scale: 1 });
  };

  // Dimensions based on size
  // Wide: spans 2 columns, height ~110px
  // Medium: square ~110px x 110px
  // Small: 1/4 size ~50px x 50px
  const isWide = size === "wide";
  const isSmall = size === "small";

  const displayTitle = title || app?.name;
  const displayIcon = icon || app?.icon;
  const displayColor = accentColor || app?.color || "#0078D7";

  return (
    <motion.div
      initial={{ opacity: 0, scale: 0.85, y: 15 }}
      animate={{ opacity: 1, scale: 1, y: 0 }}
      transition={{
        delay,
        type: "spring",
        damping: 24,
        stiffness: 350,
        mass: 0.35,
      }}
      style={{
        gridColumn: isWide ? "span 2" : "span 1",
        gridRow: isSmall ? "span 1" : "span 1",
        perspective: 800,
        WebkitPerspective: 800,
        userSelect: "none",
        WebkitUserSelect: "none",
      }}
    >
      <div
        role="button"
        tabIndex={0}
        aria-label={displayTitle}
        data-testid={`tile-${app?.id || 'tile'}`}
        onPointerDown={handlePointerDown}
        onPointerUp={handlePointerUp}
        onPointerLeave={handlePointerUp}
        onPointerCancel={handlePointerUp}
        onClick={() => onClick && onClick(app?.id)}
        onKeyDown={(e) => {
          if (e.key === "Enter" || e.key === " ") {
            onClick && onClick(app?.id);
          }
        }}
        style={{
          width: "100%",
          height: isSmall ? 52 : isWide ? 116 : 116,
          background: displayColor,
          borderRadius: 2, // Iconic Windows Phone sharp rectangular tile with subtle 2px rounding
          position: "relative",
          cursor: "pointer",
          overflow: "hidden",
          boxShadow: "0 4px 16px rgba(0,0,0,0.5), inset 0 0 0 1px rgba(255,255,255,0.14)",
          transform: `perspective(800px) rotateX(${tilt.x}deg) rotateY(${tilt.y}deg) scale(${tilt.scale})`,
          transition: "transform 0.12s cubic-bezier(0.2, 0.8, 0.2, 1), box-shadow 0.15s ease",
          transformStyle: "preserve-3d",
          WebkitTransformStyle: "preserve-3d",
        }}
      >
        {/* Subtle Metro glass reflection sheen */}
        <div
          style={{
            position: "absolute",
            top: 0,
            left: 0,
            right: 0,
            height: "45%",
            background: "linear-gradient(180deg, rgba(255,255,255,0.18) 0%, rgba(255,255,255,0) 100%)",
            pointerEvents: "none",
            zIndex: 1,
          }}
        />

        {/* Flipping Container for Live Tile functionality */}
        <div
          style={{
            width: "100%",
            height: "100%",
            position: "relative",
            transform: isFlipped ? "rotateX(180deg)" : "rotateX(0deg)",
            transition: "transform 0.65s cubic-bezier(0.4, 0.0, 0.2, 1)",
            transformStyle: "preserve-3d",
            WebkitTransformStyle: "preserve-3d",
          }}
        >
          {/* ── FRONT FACE ────────────────────────────────────────── */}
          <div
            style={{
              position: "absolute",
              inset: 0,
              padding: isSmall ? "6px" : "10px 12px",
              display: "flex",
              flexDirection: "column",
              justifyContent: "space-between",
              backfaceVisibility: "hidden",
              WebkitBackfaceVisibility: "hidden",
              zIndex: 2,
            }}
          >
            {/* Top row: Icon + Badge */}
            <div style={{ display: "flex", alignItems: "flex-start", justifyContent: "space-between" }}>
              <i
                className={`fa-solid ${displayIcon}`}
                style={{
                  fontSize: isSmall ? 18 : isWide ? 26 : 24,
                  color: "#ffffff",
                  filter: "drop-shadow(0 2px 4px rgba(0,0,0,0.3))",
                }}
              />
              {badge !== undefined && badge !== null && (
                <div
                  style={{
                    background: "rgba(0,0,0,0.45)",
                    border: "1px solid rgba(255,255,255,0.3)",
                    color: "#ffffff",
                    fontSize: isSmall ? 8.5 : 10,
                    fontWeight: 700,
                    padding: isSmall ? "1px 4px" : "2px 7px",
                    borderRadius: 3,
                    fontFamily: "'Segoe UI', 'Outfit', sans-serif",
                    letterSpacing: "0.02em",
                  }}
                >
                  {badge}
                </div>
              )}
            </div>

            {/* Middle Live Status (for Wide tiles) */}
            {isWide && statusText && (
              <div
                style={{
                  fontSize: 11,
                  fontWeight: 500,
                  color: "rgba(255,255,255,0.92)",
                  lineHeight: 1.25,
                  margin: "4px 0",
                  fontFamily: "'Segoe UI', 'Outfit', sans-serif",
                }}
              >
                {statusText}
              </div>
            )}

            {/* Bottom Row: App Name (Iconic lower-case Segoe UI aesthetic) */}
            {!isSmall && (
              <div
                style={{
                  display: "flex",
                  alignItems: "flex-end",
                  justifyContent: "space-between",
                }}
              >
                <span
                  style={{
                    color: "#ffffff",
                    fontSize: isWide ? 13 : 11.5,
                    fontWeight: 600,
                    fontFamily: "'Segoe UI', 'Outfit', -apple-system, sans-serif",
                    letterSpacing: "-0.01em",
                    whiteSpace: "nowrap",
                    overflow: "hidden",
                    textOverflow: "ellipsis",
                    maxWidth: "85%",
                    textShadow: "0 1px 2px rgba(0,0,0,0.4)",
                  }}
                >
                  {displayTitle}
                </span>

                {/* Sub-counter if available */}
                {statusText && !isWide && (
                  <span
                    style={{
                      fontSize: 9,
                      fontWeight: 600,
                      color: "rgba(255,255,255,0.75)",
                      fontFamily: "monospace",
                    }}
                  >
                    {statusText}
                  </span>
                )}
              </div>
            )}
          </div>

          {/* ── BACK FACE (Secondary Live Information) ───────────── */}
          {secondaryContent && (
            <div
              style={{
                position: "absolute",
                inset: 0,
                padding: "10px 12px",
                display: "flex",
                flexDirection: "column",
                justifyContent: "space-between",
                background: "rgba(0,0,0,0.85)",
                backfaceVisibility: "hidden",
                WebkitBackfaceVisibility: "hidden",
                transform: "rotateX(180deg)",
                zIndex: 2,
              }}
            >
              <div style={{ fontSize: 9.5, fontWeight: 700, color: displayColor, textTransform: "uppercase", letterSpacing: "0.08em" }}>
                {displayTitle} · LIVE
              </div>
              <div
                style={{
                  fontSize: 11,
                  color: "#f8fafc",
                  lineHeight: 1.3,
                  fontWeight: 500,
                  fontFamily: "'Segoe UI', 'Outfit', sans-serif",
                }}
              >
                {secondaryContent}
              </div>
              <div style={{ display: "flex", justifyContent: "flex-end" }}>
                <i className={`fa-solid ${displayIcon}`} style={{ fontSize: 13, color: displayColor }} />
              </div>
            </div>
          )}
        </div>
      </div>
    </motion.div>
  );
}
