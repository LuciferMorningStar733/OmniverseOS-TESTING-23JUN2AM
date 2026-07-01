import React, { useState, useRef, useCallback, useEffect } from "react";
import { motion, AnimatePresence } from "framer-motion";
import { APPS } from "../lib/apps";

// Apps shown in the pinned dock (excluded from main grid count for page layout)
export const PINNED_APP_IDS = ["dashboard", "chat", "voice", "browser", "settings"];

const COLS = 4;
const PAGE_SIZE = 16; // 4 rows × 4 cols per page

function useClock() {
  const [now, setNow] = useState(() => new Date());
  useEffect(() => {
    const id = setInterval(() => setNow(new Date()), 1000);
    return () => clearInterval(id);
  }, []);
  return now;
}

function AppIcon({ app, onPress, delay = 0 }) {
  const [pressed, setPressed] = useState(false);

  const handlePointerDown = useCallback(() => setPressed(true), []);
  const handlePointerUp = useCallback(() => {
    setPressed(false);
    onPress(app.id);
  }, [onPress, app.id]);
  const handlePointerLeave = useCallback(() => setPressed(false), []);

  return (
    <motion.div
      initial={{ opacity: 0, scale: 0.6, y: 24 }}
      animate={{ opacity: 1, scale: 1, y: 0 }}
      transition={{ delay, type: "spring", damping: 22, stiffness: 320, mass: 0.38 }}
      style={{ display: "flex", flexDirection: "column", alignItems: "center" }}
    >
      <motion.button
        onPointerDown={handlePointerDown}
        onPointerUp={handlePointerUp}
        onPointerLeave={handlePointerLeave}
        animate={{ scale: pressed ? 0.84 : 1 }}
        transition={{ type: "spring", stiffness: 600, damping: 22, mass: 0.2 }}
        style={{
          display: "flex",
          flexDirection: "column",
          alignItems: "center",
          gap: 6,
          background: "transparent",
          border: "none",
          cursor: "pointer",
          padding: "10px 4px",
          WebkitTapHighlightColor: "transparent",
          touchAction: "manipulation",
          userSelect: "none",
          minWidth: 64,
        }}
      >
        <div
          style={{
            width: 58,
            height: 58,
            borderRadius: 14,
            background: `linear-gradient(145deg, ${app.color}1A 0%, ${app.color}0A 100%)`,
            border: `1px solid ${app.color}30`,
            display: "flex",
            alignItems: "center",
            justifyContent: "center",
            boxShadow: `0 6px 20px rgba(0,0,0,0.40), 0 2px 6px rgba(0,0,0,0.25), inset 0 1px 0 rgba(255,255,255,0.09)`,
            backdropFilter: "blur(24px)",
            WebkitBackdropFilter: "blur(24px)",
            position: "relative",
            overflow: "hidden",
          }}
        >
          <div
            style={{
              position: "absolute",
              inset: 0,
              background: `radial-gradient(ellipse at 35% 25%, ${app.color}14 0%, transparent 65%)`,
              pointerEvents: "none",
            }}
          />
          <i
            className={`fa-solid ${app.icon}`}
            style={{
              color: app.color,
              fontSize: 24,
              filter: `drop-shadow(0 0 8px ${app.color}90)`,
              position: "relative",
              zIndex: 1,
            }}
          />
        </div>
        <span
          style={{
            fontSize: 10.5,
            fontFamily: "'Outfit', sans-serif",
            fontWeight: 500,
            color: "rgba(255,255,255,0.82)",
            textAlign: "center",
            lineHeight: 1.2,
            maxWidth: 66,
            overflow: "hidden",
            textOverflow: "ellipsis",
            whiteSpace: "nowrap",
            textShadow: "0 1px 6px rgba(0,0,0,0.9)",
            userSelect: "none",
            letterSpacing: "0.01em",
          }}
        >
          {app.name}
        </span>
      </motion.button>
    </motion.div>
  );
}

export default function MobileHomeScreen({ onOpenApp }) {
  const now = useClock();
  const [page, setPage] = useState(0);
  const touchStartX = useRef(null);
  const touchStartY = useRef(null);
  const locked = useRef(false);

  const gridApps = APPS;
  const totalPages = Math.ceil(gridApps.length / PAGE_SIZE);

  const handleTouchStart = useCallback((e) => {
    touchStartX.current = e.touches[0].clientX;
    touchStartY.current = e.touches[0].clientY;
    locked.current = false;
  }, []);

  const handleTouchMove = useCallback((e) => {
    if (touchStartX.current === null) return;
    const dx = Math.abs(e.touches[0].clientX - touchStartX.current);
    const dy = Math.abs(e.touches[0].clientY - touchStartY.current);
    if (!locked.current && (dx > 8 || dy > 8)) {
      locked.current = dy > dx;
    }
  }, []);

  const handleTouchEnd = useCallback(
    (e) => {
      if (touchStartX.current === null || locked.current) return;
      const dx = e.changedTouches[0].clientX - touchStartX.current;
      const dy = Math.abs(e.changedTouches[0].clientY - touchStartY.current);
      touchStartX.current = null;
      if (dy > 55 || Math.abs(dx) < 48) return;
      if (dx < 0 && page < totalPages - 1) setPage((p) => p + 1);
      if (dx > 0 && page > 0) setPage((p) => p - 1);
    },
    [page, totalPages]
  );

  const currentApps = gridApps.slice(page * PAGE_SIZE, (page + 1) * PAGE_SIZE);

  const timeStr = now.toLocaleTimeString([], { hour: "2-digit", minute: "2-digit" });
  const dateStr = now.toLocaleDateString([], { weekday: "long", month: "long", day: "numeric" });

  return (
    <motion.div
      initial={{ opacity: 0 }}
      animate={{ opacity: 1 }}
      exit={{ opacity: 0 }}
      transition={{ duration: 0.22, ease: "easeOut" }}
      style={{
        position: "absolute",
        top: 60,
        left: 0,
        right: 0,
        bottom: 88,
        display: "flex",
        flexDirection: "column",
        zIndex: 8,
        pointerEvents: "auto",
        overflowX: "hidden",
      }}
      onTouchStart={handleTouchStart}
      onTouchMove={handleTouchMove}
      onTouchEnd={handleTouchEnd}
    >
      {/* ── Clock ──────────────────────────────────────────────────── */}
      <motion.div
        initial={{ opacity: 0, y: -12 }}
        animate={{ opacity: 1, y: 0 }}
        transition={{ delay: 0.12, duration: 0.42, ease: "easeOut" }}
        style={{
          display: "flex",
          flexDirection: "column",
          alignItems: "center",
          paddingTop: 20,
          paddingBottom: 12,
          flexShrink: 0,
        }}
      >
        <div
          style={{
            fontSize: "clamp(56px, 15vw, 72px)",
            fontFamily: "'Outfit', sans-serif",
            fontWeight: 200,
            color: "#ffffff",
            letterSpacing: "-0.02em",
            lineHeight: 1,
            textShadow: "0 2px 24px rgba(0,0,0,0.6), 0 0 60px rgba(0,240,255,0.08)",
            userSelect: "none",
          }}
        >
          {timeStr}
        </div>
        <div
          style={{
            fontSize: 14,
            fontFamily: "'Outfit', sans-serif",
            fontWeight: 400,
            color: "rgba(255,255,255,0.55)",
            marginTop: 6,
            letterSpacing: "0.02em",
            textShadow: "0 1px 8px rgba(0,0,0,0.7)",
            userSelect: "none",
          }}
        >
          {dateStr}
        </div>
      </motion.div>

      {/* ── App Grid ───────────────────────────────────────────────── */}
      <div style={{ flex: 1, minHeight: 0, display: "flex", flexDirection: "column" }}>
        <AnimatePresence mode="wait" initial={false}>
          <motion.div
            key={page}
            initial={{ opacity: 0, x: page === 0 ? -24 : 24 }}
            animate={{ opacity: 1, x: 0 }}
            exit={{ opacity: 0, x: page === 0 ? 24 : -24 }}
            transition={{ type: "spring", damping: 30, stiffness: 340, mass: 0.4 }}
            style={{
              display: "grid",
              gridTemplateColumns: `repeat(${COLS}, 1fr)`,
              alignContent: "start",
              padding: "4px 8px",
              flex: 1,
            }}
          >
            {currentApps.map((app, i) => (
              <AppIcon
                key={app.id}
                app={app}
                onPress={onOpenApp}
                delay={i * 0.018}
              />
            ))}
          </motion.div>
        </AnimatePresence>
      </div>

      {/* ── Page dots ──────────────────────────────────────────────── */}
      {totalPages > 1 && (
        <div
          style={{
            display: "flex",
            justifyContent: "center",
            alignItems: "center",
            gap: 6,
            paddingBottom: 16,
            paddingTop: 4,
            flexShrink: 0,
          }}
        >
          {Array.from({ length: totalPages }, (_, i) => (
            <motion.button
              key={i}
              onClick={() => setPage(i)}
              animate={{
                width: i === page ? 18 : 6,
                background: i === page ? "#00F0FF" : "rgba(255,255,255,0.28)",
              }}
              transition={{ type: "spring", damping: 22, stiffness: 320 }}
              style={{
                height: 6,
                borderRadius: 3,
                border: "none",
                padding: 0,
                cursor: "pointer",
                boxShadow: i === page ? "0 0 10px rgba(0,240,255,0.65)" : "none",
                WebkitTapHighlightColor: "transparent",
              }}
            />
          ))}
        </div>
      )}
    </motion.div>
  );
}
