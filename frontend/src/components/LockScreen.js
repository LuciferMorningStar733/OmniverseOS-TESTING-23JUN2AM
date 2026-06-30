import React, { useEffect, useState } from "react";
import { motion, useMotionValue, useTransform, animate } from "framer-motion";

const SWIPE_THRESHOLD = -70;

export default function LockScreen({ onUnlock }) {
  const [time, setTime] = useState(new Date());
  const [hint, setHint]   = useState(false);

  /* ── Live clock ────────────────────────────────────────────────────────── */
  useEffect(() => {
    const t = setInterval(() => setTime(new Date()), 1000);
    return () => clearInterval(t);
  }, []);

  /* Show swipe hint after 1.5 s */
  useEffect(() => {
    const t = setTimeout(() => setHint(true), 1500);
    return () => clearTimeout(t);
  }, []);

  /* ── Swipe-up motion values ────────────────────────────────────────────── */
  const y       = useMotionValue(0);
  const opacity = useTransform(y, [0, SWIPE_THRESHOLD], [1, 0]);
  const scale   = useTransform(y, [0, SWIPE_THRESHOLD], [1, 0.94]);

  function handleDragEnd(_, info) {
    if (info.offset.y < SWIPE_THRESHOLD || info.velocity.y < -600) {
      animate(y, -window.innerHeight, {
        type: "tween", duration: 0.28, ease: "easeIn",
        onComplete: onUnlock,
      });
    } else {
      animate(y, 0, { type: "spring", damping: 30, stiffness: 340 });
    }
  }

  /* ── Formatted strings ─────────────────────────────────────────────────── */
  const HH = time.toLocaleTimeString([], { hour: "2-digit", minute: "2-digit", hour12: false });
  const [hours, mins] = HH.split(":");
  const dateStr = time.toLocaleDateString(undefined, {
    weekday: "long", month: "long", day: "numeric",
  });

  return (
    <motion.div
      initial={{ opacity: 0 }}
      animate={{ opacity: 1 }}
      exit={{ opacity: 0, y: -80 }}
      transition={{ duration: 0.3, ease: "easeOut" }}
      style={{
        position: "fixed",
        inset: 0,
        zIndex: 9999,
        touchAction: "none",
        y,
        scale,
        opacity,
      }}
      drag="y"
      dragConstraints={{ top: -window.innerHeight, bottom: 0 }}
      dragElastic={{ top: 0.25, bottom: 0 }}
      dragMomentum={false}
      onDragEnd={handleDragEnd}
    >
      {/* ── Background ───────────────────────────────────────────────────── */}
      <div
        style={{
          position: "absolute",
          inset: 0,
          background: "linear-gradient(160deg, #05050A 0%, #0a0f1e 40%, #050a14 100%)",
        }}
      />

      {/* Grid overlay */}
      <div
        style={{
          position: "absolute",
          inset: 0,
          backgroundImage:
            "linear-gradient(rgba(0,240,255,0.04) 1px, transparent 1px), linear-gradient(90deg, rgba(0,240,255,0.04) 1px, transparent 1px)",
          backgroundSize: "40px 40px",
          maskImage: "radial-gradient(ellipse 80% 80% at 50% 50%, black 30%, transparent 100%)",
          WebkitMaskImage: "radial-gradient(ellipse 80% 80% at 50% 50%, black 30%, transparent 100%)",
        }}
      />

      {/* Ambient glow */}
      <div
        style={{
          position: "absolute",
          top: "30%",
          left: "50%",
          transform: "translate(-50%, -50%)",
          width: 320,
          height: 320,
          borderRadius: "50%",
          background: "radial-gradient(circle, rgba(0,240,255,0.07) 0%, transparent 70%)",
          pointerEvents: "none",
        }}
      />

      {/* Scanline */}
      <div
        style={{
          position: "absolute",
          inset: 0,
          backgroundImage:
            "repeating-linear-gradient(0deg, transparent, transparent 2px, rgba(0,0,0,0.08) 2px, rgba(0,0,0,0.08) 4px)",
          pointerEvents: "none",
          opacity: 0.4,
        }}
      />

      {/* ── Content ──────────────────────────────────────────────────────── */}
      <div
        style={{
          position: "relative",
          height: "100%",
          display: "flex",
          flexDirection: "column",
          alignItems: "center",
          justifyContent: "center",
          gap: 0,
          paddingTop: "env(safe-area-inset-top, 0px)",
          paddingBottom: "env(safe-area-inset-bottom, 0px)",
          userSelect: "none",
        }}
      >
        {/* OS badge */}
        <motion.div
          initial={{ opacity: 0, y: -16 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ delay: 0.2, duration: 0.5 }}
          style={{
            display: "flex",
            alignItems: "center",
            gap: 8,
            marginBottom: 48,
          }}
        >
          <div
            style={{
              width: 28, height: 28, borderRadius: 8,
              background: "linear-gradient(135deg,#00F0FF,#FF003C)",
              display: "flex", alignItems: "center", justifyContent: "center",
            }}
          >
            <i className="fa-solid fa-infinity" style={{ color: "#000", fontSize: 12 }} />
          </div>
          <span
            style={{
              fontFamily: "'Unbounded', sans-serif",
              fontWeight: 700,
              fontSize: 13,
              letterSpacing: "0.15em",
              color: "rgba(255,255,255,0.6)",
            }}
          >
            OMNIVERSE OS
          </span>
        </motion.div>

        {/* Clock */}
        <motion.div
          initial={{ opacity: 0, scale: 0.92 }}
          animate={{ opacity: 1, scale: 1 }}
          transition={{ delay: 0.1, duration: 0.5, ease: "easeOut" }}
          style={{
            display: "flex",
            alignItems: "flex-start",
            gap: 4,
            lineHeight: 1,
            marginBottom: 16,
          }}
        >
          <span
            style={{
              fontFamily: "'Unbounded', sans-serif",
              fontWeight: 800,
              fontSize: "clamp(72px, 22vw, 108px)",
              color: "#ffffff",
              textShadow:
                "0 0 40px rgba(0,240,255,0.25), 0 0 80px rgba(0,240,255,0.10)",
              letterSpacing: "-0.04em",
            }}
          >
            {hours}
          </span>
          <motion.span
            animate={{ opacity: [1, 0.2, 1] }}
            transition={{ duration: 1, repeat: Infinity, ease: "steps(2)" }}
            style={{
              fontFamily: "'Unbounded', sans-serif",
              fontWeight: 800,
              fontSize: "clamp(72px, 22vw, 108px)",
              color: "#00F0FF",
              textShadow: "0 0 30px rgba(0,240,255,0.6), 0 0 60px rgba(0,240,255,0.3)",
              letterSpacing: "-0.04em",
              marginTop: "0.05em",
            }}
          >
            :
          </motion.span>
          <span
            style={{
              fontFamily: "'Unbounded', sans-serif",
              fontWeight: 800,
              fontSize: "clamp(72px, 22vw, 108px)",
              color: "#ffffff",
              textShadow:
                "0 0 40px rgba(0,240,255,0.25), 0 0 80px rgba(0,240,255,0.10)",
              letterSpacing: "-0.04em",
            }}
          >
            {mins}
          </span>
        </motion.div>

        {/* Date */}
        <motion.p
          initial={{ opacity: 0, y: 8 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ delay: 0.3, duration: 0.5 }}
          style={{
            fontFamily: "'Outfit', sans-serif",
            fontWeight: 400,
            fontSize: "clamp(14px, 4vw, 18px)",
            color: "rgba(255,255,255,0.55)",
            letterSpacing: "0.04em",
            marginBottom: 80,
            textAlign: "center",
          }}
        >
          {dateStr}
        </motion.p>

        {/* Cyan divider */}
        <motion.div
          initial={{ scaleX: 0, opacity: 0 }}
          animate={{ scaleX: 1, opacity: 1 }}
          transition={{ delay: 0.5, duration: 0.6, ease: "easeOut" }}
          style={{
            width: 120,
            height: 1,
            background: "linear-gradient(90deg, transparent, #00F0FF, transparent)",
            boxShadow: "0 0 12px rgba(0,240,255,0.5)",
            marginBottom: 32,
          }}
        />

        {/* Swipe-up hint */}
        {hint && (
          <motion.div
            initial={{ opacity: 0, y: 10 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ duration: 0.5 }}
            style={{
              display: "flex",
              flexDirection: "column",
              alignItems: "center",
              gap: 10,
            }}
          >
            {/* Animated chevrons */}
            <div style={{ display: "flex", flexDirection: "column", alignItems: "center", gap: 2 }}>
              {[0, 1, 2].map((i) => (
                <motion.i
                  key={i}
                  className="fa-solid fa-chevron-up"
                  animate={{ opacity: [0.2, 1, 0.2], y: [4, 0, 4] }}
                  transition={{
                    duration: 1.6,
                    repeat: Infinity,
                    delay: i * 0.18,
                    ease: "easeInOut",
                  }}
                  style={{
                    color: "#00F0FF",
                    fontSize: 14,
                    filter: "drop-shadow(0 0 4px rgba(0,240,255,0.7))",
                  }}
                />
              ))}
            </div>

            <span
              style={{
                fontFamily: "'JetBrains Mono', monospace",
                fontSize: 11,
                letterSpacing: "0.18em",
                color: "rgba(255,255,255,0.4)",
                textTransform: "uppercase",
              }}
            >
              swipe up to unlock
            </span>
          </motion.div>
        )}
      </div>
    </motion.div>
  );
}
