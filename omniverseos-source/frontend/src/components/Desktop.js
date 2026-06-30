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
import CortexWelcomeCard from "./CortexWelcomeCard";
import { getApp } from "../lib/apps";
import { AnimatePresence, motion } from "framer-motion";
import { getWallpaper } from "../lib/wallpapers";
import WidgetCanvas from "../widgets/WidgetCanvas";
// rememberActiveApp + trackEvent("app_open") are handled inside OSContext.openApp.
// trackEvent("url_visit") + rememberLastUrl are handled inside OSContext.trackUrl.
function AmbientParticles() {
  const canvasRef = useRef(null);
  const frameRef = useRef(null);
  const particles = useRef([]);
  useEffect(() => {
    const canvas = canvasRef.current;
    if (!canvas) return;
    const ctx = canvas.getContext("2d");
    function resize() {
      canvas.width = window.innerWidth;
      canvas.height = window.innerHeight;
    }
    resize();
    window.addEventListener("resize", resize, { passive: true });
    const COUNT = 28;
    particles.current = Array.from({ length: COUNT }, () => ({
      x: Math.random() * canvas.width,
      y: Math.random() * canvas.height,
      size: Math.random() * 1.4 + 0.3,
      vx: (Math.random() - 0.5) * 0.12,
      vy: (Math.random() - 0.5) * 0.12,
      alpha: Math.random() * 0.18 + 0.04,
      pulse: Math.random() * Math.PI * 2,
    }));
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
      for (const p of particles.current) {
        p.x += p.vx;
        p.y += p.vy;
        if (p.x < 0) p.x = width;
        if (p.x > width) p.x = 0;
        if (p.y < 0) p.y = height;
        if (p.y > height) p.y = 0;
        const breathe = Math.sin(t + p.pulse) * 0.5 + 0.5;
        const alpha = p.alpha * (0.4 + breathe * 0.6);
        ctx.beginPath();
        ctx.arc(p.x, p.y, p.size, 0, Math.PI * 2);
        ctx.fillStyle = `rgba(0,240,255,${alpha.toFixed(3)})`;
        ctx.fill();
      }
      const gridSpacing = 48;
      ctx.strokeStyle = "rgba(0,240,255,0.018)";
      ctx.lineWidth = 0.5;
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
      for (const blip of blips) {
        if (!blip.active && Math.random() < 0.0008) {
          blip.active = true;
          blip.timer = 0;
        }
        if (blip.active) {
          blip.timer += 0.06;
          const progress = blip.timer;
          const bAlpha = Math.max(0, Math.sin(progress * Math.PI));
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
  const {
    windows, setPaletteOpen, paletteOpen, wallpaper, focusWindow, activeId,
    openApp, closeWindow, minimize, updateWindow, toggleMaximize,
    notifOpen, setNotifOpen, pushNotification, clearNotifications, trackUrl,
  } = useOS();
  const { isMobile } = useBreakpoint();
  const wp = getWallpaper(wallpaper);
  const [locked, setLocked] = useState(false);
  const [missionOpen, setMissionOpen] = useState(false);
  const idleTimer = useRef(null);
  const [showWelcome, setShowWelcome] = useState(true);
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
  useEffect(() => {
    // Single global keyboard handler — extend here, never add a parallel listener.
    const isTypingTarget = (el) => {
      if (!el) return false;
      const tag = el.tagName;
      if (tag === "INPUT" || tag === "TEXTAREA" || tag === "SELECT") return true;
      if (el.isContentEditable) return true;
      return false;
    };
    const handler = (e) => {
      // ── Esc closes overlays (works even while typing) ─────────────────────
      if (e.key === "Escape") {
        if (paletteOpen) { setPaletteOpen(false); return; }
        if (missionOpen) { setMissionOpen(false); return; }
        if (showWelcome && windows.filter((w) => !w.minimized).length === 0) { setShowWelcome(false); return; }
        return;
      }

      // Suppress all other shortcuts while typing.
      if (isTypingTarget(e.target)) return;

      const mod = e.metaKey || e.ctrlKey;

      // Ctrl/Cmd + K → Universal Search
      if (mod && !e.shiftKey && !e.altKey && e.key.toLowerCase() === "k") {
        e.preventDefault();
        setPaletteOpen(true);
        return;
      }

      // Ctrl/Cmd + , → Settings
      if (mod && !e.shiftKey && !e.altKey && e.key === ",") {
        e.preventDefault();
        setShowWelcome(false);
        openApp("settings");
        return;
      }

      // Ctrl/Cmd + Shift + A/B/T → App shortcuts
      if (mod && e.shiftKey && !e.altKey) {
        const k = e.key.toLowerCase();
        const target =
          k === "a" ? "chat"   :
          k === "b" ? "browser":
          k === "t" ? "tasks"  : null;
        if (target) {
          e.preventDefault();
          setShowWelcome(false);
          openApp(target);
          return;
        }
      }

      // Ctrl+Tab → Mission Control (desktop only)
      if (!isMobile && e.ctrlKey && e.key === "Tab") {
        e.preventDefault();
        setMissionOpen((open) => !open);
      }
    };
    window.addEventListener("keydown", handler);
    // Universal Search → Mission Control action dispatches this event
    const onOpenMission = () => setMissionOpen(true);
    window.addEventListener("om:open-mission", onOpenMission);
    return () => {
      window.removeEventListener("keydown", handler);
      window.removeEventListener("om:open-mission", onOpenMission);
    };
  }, [isMobile, paletteOpen, missionOpen, showWelcome, windows, openApp, setPaletteOpen]);
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
  const handleOpenApp = useCallback((appId) => {
    // OSContext.openApp records timeline + memory — no duplicate tracking here.
    setShowWelcome(false);
    openApp(appId);
  }, [openApp]);
  const handleOpenUrl = useCallback((url) => {
    // trackUrl handles both timeline + memory.
    setShowWelcome(false);
    if (trackUrl) trackUrl(url);
    openApp("browser");
    // Browser app listens to this event to navigate.
    window.dispatchEvent(new CustomEvent("cortex:navigate", { detail: { url } }));
  }, [trackUrl, openApp]);
  const windowLayerStyle = useMemo(() => isMobile
    ? { top: 60, left: 0, right: 0, bottom: 80 }
    : { top: 0, left: 0, right: 0, bottom: 0 },
  [isMobile]);
  const openWindows = useMemo(() => windows.filter((w) => !w.minimized), [windows]);
  const showDots = isMobile && openWindows.length > 1;
  const showCortexWelcome = !isMobile && showWelcome && openWindows.length === 0;
  return (
    <div
      className="relative w-full h-full overflow-hidden bg-[#05050A]"
      data-testid="desktop-root"
      onTouchStart={handleTouchStart}
      onTouchMove={handleTouchMove}
      onTouchEnd={handleTouchEnd}
    >
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
      {!isMobile && <AmbientParticles />}
      <div className="absolute inset-0 scanline opacity-20 pointer-events-none" style={{ zIndex: 2 }} />
      <motion.div
        initial={{ opacity: 0, y: -8 }}
        animate={{ opacity: 1, y: 0 }}
        transition={{ delay: 0.35, duration: 0.45, ease: "easeOut" }}
        style={{ zIndex: 50, position: "relative" }}
      >
        <TopBar onOpenMissionControl={() => setMissionOpen(true)} />
      </motion.div>
      {!isMobile && <WidgetCanvas topOffset={60} />}
      <AnimatePresence>
        {showCortexWelcome && (
          <motion.div
            key="cortex-welcome"
            initial={{ opacity: 0, scale: 0.96 }}
            animate={{ opacity: 1, scale: 1 }}
            exit={{ opacity: 0, scale: 0.96 }}
            transition={{ duration: 0.3, ease: "easeOut" }}
            style={{ zIndex: 15, position: "absolute", inset: 0, pointerEvents: "none" }}
          >
            <div style={{ pointerEvents: "auto" }}>
              <CortexWelcomeCard
                onOpenApp={handleOpenApp}
                onOpenUrl={handleOpenUrl}
                onDismiss={() => setShowWelcome(false)}
              />
            </div>
          </motion.div>
        )}
      </AnimatePresence>
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
