import React, { useCallback, useEffect, useRef, useState, useMemo } from "react";
import { useOS } from "../context/OSContext";
import { useBreakpoint } from "../hooks/useBreakpoint";
import { loadMobilePrefs } from "../hooks/useMobilePrefs";
import Window from "./Window";
import Dock from "./Dock";
import TopBar from "./TopBar";
import LockScreen from "./LockScreen";
import CommandPalette from "./CommandPalette";
import NotificationCenter from "./NotificationCenter";
import MissionControl from "./MissionControl";
import AIDock from "./AIDock";
import { getApp } from "../lib/apps";
import { AnimatePresence, motion } from "framer-motion";
import { getWallpaper } from "../lib/wallpapers";
import WidgetCanvas from "../widgets/WidgetCanvas";

/* ?? Ambient desktop particle layer ?????????????????????????????????????????
   A lightweight canvas that renders:
   . Subtle drifting particles (no performance impact)
   . Occasional corner telemetry blips
   The canvas is pointer-events-none so it never blocks interaction.       */

function AmbientParticles() {
  const canvasRef = useRef(null);
  const frameRef  = useRef(null);
  const particles = useRef([]);

  useEffect(() => {
    const canvas = canvasRef.current;
    if (!canvas) return;
    const ctx    = canvas.getContext("2d");

    function resize() {
      canvas.width  = window.innerWidth;
      canvas.height = window.innerHeight;
    }
    resize();
    window.addEventListener("resize", resize, { passive: true });

    // Initialise particles
    const COUNT = 28;
    particles.current = Array.from({ length: COUNT }, () => ({
      x:    Math.random() * canvas.width,
      y:    Math.random() * canvas.height,
      size: Math.random() * 1.4 + 0.3,
      vx:   (Math.random() - 0.5) * 0.12,
      vy:   (Math.random() - 0.5) * 0.12,
      alpha:Math.random() * 0.18 + 0.04,
      pulse:Math.random() * Math.PI * 2,   // phase offset for breathing glow
    }));

    // Telemetry blips (corner decorations that briefly light up)
    const blips = [
      { cx: 0.02, cy: 0.06 },
      { cx: 0.98, cy: 0.06 },
      { cx: 0.02, cy: 0.94 },
      { cx: 0.98, cy: 0.94 },
    ].map((b) => ({ ...b, active: false, timer: 0 }));

    let t = 0;

    function draw() {
      const { width, height } = canvas;
      ctx.clearRect(0, 0, width, height);
      t += 0.012;

      // Draw particles
      for (const p of particles.current) {
        p.x += p.vx;
        p.y += p.vy;
        // Wrap edges
        if (p.x < 0)      p.x = width;
        if (p.x > width)  p.x = 0;
        if (p.y < 0)      p.y = height;
        if (p.y > height) p.y = 0;

        const breathe = Math.sin(t + p.pulse) * 0.5 + 0.5;
        const alpha   = p.alpha * (0.4 + breathe * 0.6);

        ctx.beginPath();
        ctx.arc(p.x, p.y, p.size, 0, Math.PI * 2);
        ctx.fillStyle = `rgba(0,240,255,${alpha.toFixed(3)})`;
        ctx.fill();
      }

      // Draw subtle grid overlay (very faint)
      const gridSpacing = 48;
      ctx.strokeStyle = "rgba(0,240,255,0.018)";
      ctx.lineWidth   = 0.5;
      for (let gx = 0; gx < width; gx += gridSpacing) {
        ctx.beginPath();
        ctx.moveTo(gx, 0);
        ctx.lineTo(gx, height);
        ctx.stroke();
      }
      for (let gy = 0; gy < height; gy += gridSpacing) {
        ctx.beginPath();
        ctx.moveTo(0, gy);
        ctx.lineTo(width, gy);
        ctx.stroke();
      }

      // Telemetry corner blips
      for (const blip of blips) {
        // Random activation
        if (!blip.active && Math.random() < 0.0008) {
          blip.active = true;
          blip.timer  = 0;
        }
        if (blip.active) {
          blip.timer += 0.06;
          const progress = blip.timer;
          const bAlpha   = Math.max(0, Math.sin(progress * Math.PI));
          const bx = blip.cx * width;
          const by = blip.cy * height;
          const radius = 3 + progress * 6;

          ctx.beginPath();
          ctx.arc(bx, by, radius, 0, Math.PI * 2);
          ctx.strokeStyle = `rgba(0,240,255,${(bAlpha * 0.5).toFixed(3)})`;
          ctx.lineWidth = 1;
          ctx.stroke();

          ctx.beginPath();
          ctx.arc(bx, by, 2, 0, Math.PI * 2);
          ctx.fillStyle = `rgba(0,240,255,${(bAlpha * 0.8).toFixed(3)})`;
          ctx.fill();

          if (progress > Math.PI) blip.active = false;
        }
      }

      frameRef.current = requestAnimationFrame(draw);
    }

    frameRef.current = requestAnimationFrame(draw);

    return () => {
      cancelAnimationFrame(frameRef.current);
      window.removeEventListener("resize", resize);
    };
  }, []);

  return (
    <canvas
      ref={canvasRef}
      className="absolute inset-0 pointer-events-none"
      style={{ zIndex: 1, opacity: 1 }}
    />
  );
}

export default function Desktop() {
  const { windows, setPaletteOpen, wallpaper, focusWindow, activeId } = useOS();
  const { isMobile } = useBreakpoint();
  const wp = getWallpaper(wallpaper);

  /* ?? Lock screen (mobile only) ???????????????????????????????????????????? */
  const [locked, setLocked]   = useState(false);
  const [missionOpen, setMissionOpen] = useState(false);
  const idleTimer             = useRef(null);

  const getIdleMs = useCallback(() => {
    const prefs = loadMobilePrefs();
    if (!prefs.lockEnabled || prefs.lockTimeout === 0) return 0;
    return prefs.lockTimeout * 1000;
  }, []);

  const resetIdle = useCallback(() => {
    if (!isMobile) return;
    const ms = getIdleMs();
    clearTimeout(idleTimer.current);
    if (ms > 0) {
      idleTimer.current = setTimeout(() => setLocked(true), ms);
    }
  }, [isMobile, getIdleMs]);

  useEffect(() => {
    if (!isMobile) return;
    const events = ["touchstart", "touchmove", "mousedown", "keydown", "scroll"];
    events.forEach((ev) => window.addEventListener(ev, resetIdle, { passive: true }));
    resetIdle();
    return () => {
      clearTimeout(idleTimer.current);
      events.forEach((ev) => window.removeEventListener(ev, resetIdle));
    };
  }, [isMobile, resetIdle]);

  /* ?? Keyboard shortcut (desktop) ??????????????????????????????????????????? */
  useEffect(() => {
    const handler = (e) => {
      if ((e.metaKey || e.ctrlKey) && e.key.toLowerCase() === "k") {
        e.preventDefault();
        setPaletteOpen(true);
        return;
      }
      if (!isMobile && e.ctrlKey && e.key === "Tab") {
        e.preventDefault();
        setMissionOpen((open) => !open);
      }
    };
    window.addEventListener("keydown", handler);
    return () => window.removeEventListener("keydown", handler);
  }, [isMobile, setPaletteOpen]);

  /* ?? Swipe left/right to switch apps (mobile) ????????????????????????????? */
  const swipeStartX = useRef(null);
  const swipeStartY = useRef(null);
  const swipeLocked = useRef(false);

  const handleTouchStart = useCallback((e) => {
    if (!isMobile || locked) return;
    const prefs = loadMobilePrefs();
    if (!prefs.swipeNav) return;
    swipeStartX.current = e.touches[0].clientX;
    swipeStartY.current = e.touches[0].clientY;
    swipeLocked.current = false;
  }, [isMobile, locked]);

  const handleTouchMove = useCallback((e) => {
    if (!isMobile || swipeStartX.current === null) return;
    const dx = Math.abs(e.touches[0].clientX - swipeStartX.current);
    const dy = Math.abs(e.touches[0].clientY - swipeStartY.current);
    if (!swipeLocked.current && (dx > 10 || dy > 10)) {
      swipeLocked.current = dy > dx;
    }
  }, [isMobile]);

  const handleTouchEnd = useCallback((e) => {
    if (!isMobile || swipeStartX.current === null || locked) return;
    const dx = e.changedTouches[0].clientX - swipeStartX.current;
    const dy = Math.abs(e.changedTouches[0].clientY - swipeStartY.current);
    swipeStartX.current = null;

    if (swipeLocked.current || dy > 60) return;
    if (Math.abs(dx) < 80) return;

    const openWindows = windows.filter((w) => !w.minimized);
    if (openWindows.length < 2) return;

    const currentIdx = openWindows.findIndex((w) => w.id === activeId);
    if (currentIdx === -1) return;

    if (dx < 0) {
      focusWindow(openWindows[(currentIdx + 1) % openWindows.length].id);
    } else {
      focusWindow(openWindows[(currentIdx - 1 + openWindows.length) % openWindows.length].id);
    }
  }, [isMobile, locked, windows, activeId, focusWindow]);

  /* ?? Layout ???????????????????????????????????????????????????????????????? */
  const windowLayerStyle = useMemo(() => isMobile
    ? { top: 60, left: 0, right: 0, bottom: 80 }
    : { top: 0,  left: 0, right: 0, bottom: 0  },
  [isMobile]);

  const openWindows = useMemo(() => windows.filter((w) => !w.minimized), [windows]);
  const showDots    = isMobile && openWindows.length > 1;

  return (
    <div
      className="relative w-full h-full overflow-hidden bg-[#05050A]"
      data-testid="desktop-root"
      onTouchStart={handleTouchStart}
      onTouchMove={handleTouchMove}
      onTouchEnd={handleTouchEnd}
    >
      {/* Wallpaper */}
      <AnimatePresence mode="wait">
        <motion.div
          key={wp.id}
          initial={{ opacity: 0 }}
          animate={{ opacity: 1 }}
          exit={{ opacity: 0 }}
          transition={{ duration: 0.7, ease: "easeInOut" }}
          className={`wp-base ${wp.className}`}
          style={{ zIndex: 0 }}
        >
          {wp.typo?.main && (
            <div className="wp-typo">
              {wp.typo.main}
              {wp.typo.line2 && <span>{wp.typo.line2}</span>}
            </div>
          )}
          {wp.typo?.sub && <div className="wp-typo-sub">{wp.typo.sub}</div>}
          {wp.id === "quantum-horizon" && <div className="wp-fog" />}
          {(wp.id === "neural-core" || wp.id === "ai-nexus") && <div className="wp-beams" />}
        </motion.div>
      </AnimatePresence>

      {/* Ambient particle layer - desktop only, performance-safe */}
      {!isMobile && <AmbientParticles />}

      {/* Scanline overlay */}
      <div className="absolute inset-0 scanline opacity-20 pointer-events-none" style={{ zIndex: 2 }} />

      {/* TopBar */}
      <motion.div
        initial={{ opacity: 0, y: -8 }}
        animate={{ opacity: 1,  y: 0 }}
        transition={{ delay: 0.35, duration: 0.45, ease: "easeOut" }}
        style={{ zIndex: 50, position: "relative" }}
      >
        <TopBar onOpenMissionControl={() => setMissionOpen(true)} />
      </motion.div>

      {/* Widget canvas - sits above wallpaper, below windows */}
      {!isMobile && <WidgetCanvas topOffset={60} />}

      {/* Window layer */}
      <div className="absolute z-10 pointer-events-none" style={windowLayerStyle}>
        <AnimatePresence>
          {windows.map((w) => {
            const app = getApp(w.app);
            if (!app) return null;
            return (
              <div key={w.id} className="pointer-events-auto">
                <Window win={w}>
                  <app.Component />
                </Window>
              </div>
            );
          })}
        </AnimatePresence>
      </div>

      {/* App switcher dots */}
      {showDots && (
        <div
          className="absolute z-30 flex items-center gap-1.5 pointer-events-none"
          style={{ bottom: 88, left: "50%", transform: "translateX(-50%)" }}
        >
          {openWindows.map((w) => (
            <div
              key={w.id}
              style={{
                width: w.id === activeId ? 20 : 6, height: 6, borderRadius: 3,
                background: w.id === activeId ? "#00F0FF" : "rgba(255,255,255,0.3)",
                boxShadow: w.id === activeId ? "0 0 8px rgba(0,240,255,0.7)" : "none",
                transition: "width 0.25s ease, background 0.25s ease",
              }}
            />
          ))}
        </div>
      )}

      <Dock />
      {!isMobile && <AIDock />}
      <CommandPalette />
      <NotificationCenter />
      {!isMobile && (
        <MissionControl
          open={missionOpen}
          onClose={() => setMissionOpen(false)}
        />
      )}

      {/* Lock screen */}
      <AnimatePresence>
        {isMobile && locked && (
          <LockScreen
            key="lockscreen"
            onUnlock={() => { setLocked(false); resetIdle(); }}
          />
        )}
      </AnimatePresence>
    </div>
  );
}
