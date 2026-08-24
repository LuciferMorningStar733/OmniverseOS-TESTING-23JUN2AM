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

import CortexWelcomeCard from "./CortexWelcomeCard";
import BootScreen, { isFirstBoot } from "./BootScreen";
import OnboardingExperience, { hasSeenOnboarding, markOnboardingDone } from "./OnboardingExperience";
import WelcomePanel from "./WelcomePanel";
import LocationSetup, { isLocationSetupDone } from "./LocationSetup";
import BrightnessOverlay, { BrightnessFilter } from "./BrightnessOverlay";
import { useBrightnessContext } from "../context/BrightnessContext";
import { getApp } from "../lib/apps";
import { AnimatePresence, motion } from "framer-motion";
import { getWallpaper } from "../lib/wallpapers";
import WallpaperFX from "./WallpaperFX";
import WidgetCanvas from "../widgets/WidgetCanvas";
import MobileHomeScreen from "./MobileHomeScreen";
import MorningBriefing from "./MorningBriefing";
import { shouldRunNightAgent, stampLastSeen } from "../lib/nightAgent";
import CortexInterrupts from "./CortexInterrupts";
import FocusTunnel from "./FocusTunnel";
import CortexLoadAdaptor from "./CortexLoadAdaptor";
import { CognitiveLoadProvider } from "../context/CognitiveLoadContext";
import ControlCenter from "./ControlCenter";
import SpotlightSearch from "./SpotlightSearch";
import DesktopContextMenu from "./DesktopContextMenu";
import { tileLeft, tileRight, tileTopLeft, tileTopRight } from "../lib/WindowTileEngine";
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
function Desktop() {
  const {
    windows, setPaletteOpen, paletteOpen, wallpaper, setWallpaper, focusWindow, activeId,
    openApp, closeWindow, minimize, updateWindow, toggleMaximize,
    notifOpen, setNotifOpen, pushNotification, clearNotifications, trackUrl,
    notifications, user,
  } = useOS();
  const { isMobile, isTablet, isDesktop, isTouch } = useBreakpoint();
  const wp = getWallpaper(wallpaper);
  const [locked, setLocked] = useState(false);
  const [missionOpen, setMissionOpen] = useState(false);
  const [controlCenterOpen, setControlCenterOpen] = useState(false);
  const [spotlightOpen, setSpotlightOpen] = useState(false);
  const idleTimer = useRef(null);
  const [showWelcome, setShowWelcome] = useState(true);

  // Listen for global custom events to open Control Center & Spotlight & Tiling
  useEffect(() => {
    const handleCC = () => setControlCenterOpen((v) => !v);
    const handleSL = () => setSpotlightOpen((v) => !v);
    const handleTile = () => {
      const openWins = windows.filter((w) => !w.minimized);
      if (openWins.length === 0) return;
      const updated = openWins.map((w, i) => {
        let geo = tileLeft();
        if (openWins.length === 2) {
          geo = i === 0 ? tileLeft() : tileRight();
        } else if (openWins.length >= 3) {
          const tiles = [tileTopLeft(), tileTopRight(), tileLeft(), tileRight()];
          geo = tiles[i % 4];
        }
        return { ...w, ...geo };
      });
      setWindows(updated);
    };

    window.addEventListener("cortex:open-control-center", handleCC);
    window.addEventListener("cortex:open-spotlight", handleSL);
    window.addEventListener("cortex:tile-windows", handleTile);
    return () => {
      window.removeEventListener("cortex:open-control-center", handleCC);
      window.removeEventListener("cortex:open-spotlight", handleSL);
      window.removeEventListener("cortex:tile-windows", handleTile);
    };
  }, [windows, setWindows]);

  // ── Boot / first-run / brightness ──────────────────────────────────────────
  const [showBoot,       setShowBoot]       = useState(() => isFirstBoot());
  const [showWelcomeP,   setShowWelcomeP]   = useState(false);
  const [showLocation,   setShowLocation]   = useState(false);
  const [showOnboarding, setShowOnboarding] = useState(false);
  // Morning briefing — shown when returning after ≥ 3 hours away
  const [showMorningBrief, setShowMorningBrief] = useState(false);
  // Phase 1: Focus Tunnel
  const [focusActive, setFocusActive] = useState(false);

  // ── P13: Cognitive load signals ─────────────────────────────────────────
  const prevWindowLen = useRef(0);
  useEffect(() => {
    const count = windows.length;
    // Dispatch window-count for scorer
    window.dispatchEvent(new CustomEvent("cortex:window-count", { detail: { count } }));
    // Dispatch app-open when a new window is added
    if (count > prevWindowLen.current) {
      window.dispatchEvent(new CustomEvent("cortex:app-open"));
    }
    prevWindowLen.current = count;
  }, [windows]);

  useEffect(() => {
    window.dispatchEvent(new CustomEvent("cortex:focus-tunnel", { detail: { active: focusActive } }));
  }, [focusActive]);
  const brightness = useBrightnessContext();
  const { toggleOverlay: toggleBrightness } = brightness;

  const handleBootComplete = useCallback(() => {
    setShowBoot(false);
    if (!isLocationSetupDone()) {
      setShowLocation(true);
    } else if (shouldRunNightAgent()) {
      // Returning user after long absence — Cortex morning briefing first
      setShowMorningBrief(true);
    } else {
      setShowWelcomeP(true);
    }
  }, []);

  // Guard: if showLocation somehow becomes true for a user who already
  // completed setup (e.g. hot-reload, multi-tab race), dismiss it immediately.
  useEffect(() => {
    if (showLocation && isLocationSetupDone()) {
      setShowLocation(false);
      if (shouldRunNightAgent()) {
        setShowMorningBrief(true);
      } else {
        setShowWelcomeP(true);
      }
    }
  }, [showLocation]);

  // Stamp last-seen on every page visibility change so the gap is accurate
  useEffect(() => {
    stampLastSeen();
    const onVis = () => { if (document.visibilityState === "hidden") stampLastSeen(); };
    document.addEventListener("visibilitychange", onVis);
    return () => document.removeEventListener("visibilitychange", onVis);
  }, []);

  const handleLocationComplete = useCallback((city) => {
    setShowLocation(false);
    // If the user explicitly SKIPPED (city === null), also treat it as
    // "I want to explore, not sit through intro slides" and short-circuit
    // the onboarding chain.  This prevents the confusing UX of clicking
    // × on LocationSetup only to be immediately dropped into a second
    // full-screen overlay.  Users who *entered* a city still get the
    // friendly first-run onboarding they signed up for.
    if (city === null) {
      markOnboardingDone();
      setShowWelcomeP(true);
      return;
    }
    if (!hasSeenOnboarding()) {
      setShowOnboarding(true);
    } else {
      setShowWelcomeP(true);
    }
  }, []);

  const handleOnboardingComplete = useCallback(() => {
    markOnboardingDone();
    setShowOnboarding(false);
    setShowWelcomeP(true);
  }, []);

  const handleOnboardingWallpaperSelect = useCallback((wallpaperId) => {
    setWallpaper(wallpaperId);
  }, [setWallpaper]);

  // Allow Settings to trigger onboarding replay via custom event
  useEffect(() => {
    const handler = () => { setShowOnboarding(true); };
    window.addEventListener("omniverse:replay-onboarding", handler);
    return () => window.removeEventListener("omniverse:replay-onboarding", handler);
  }, []);

  // ── Idle lock — phones & tablets both get auto-lock ─────────────────────
  const getIdleMs = useCallback(() => {
    const prefs = loadMobilePrefs();
    if (!prefs.lockEnabled || prefs.lockTimeout === 0) return 0;
    return prefs.lockTimeout * 1000;
  }, []);
  const resetIdle = useCallback(() => {
    if (!isTouch) return;
    const ms = getIdleMs();
    clearTimeout(idleTimer.current);
    if (ms > 0) {
      idleTimer.current = setTimeout(() => setLocked(true), ms);
    }
  }, [isTouch, getIdleMs]);
  useEffect(() => {
    if (!isTouch) return;
    const events = ["touchstart", "touchmove", "mousedown", "keydown", "scroll"];
    events.forEach((ev) => window.addEventListener(ev, resetIdle, { passive: true }));
    resetIdle();
    return () => {
      clearTimeout(idleTimer.current);
      events.forEach((ev) => window.removeEventListener(ev, resetIdle));
    };
  }, [isTouch, resetIdle]);
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

      // Ctrl + Shift + B → Brightness
      if (e.ctrlKey && e.shiftKey && e.key.toLowerCase() === "b") {
        e.preventDefault();
        toggleBrightness();
        return;
      }

      // Ctrl + Shift + F → Focus Tunnel
      if (e.ctrlKey && e.shiftKey && e.key.toLowerCase() === "f") {
        e.preventDefault();
        setFocusActive((v) => !v);
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
      if (isDesktop && e.ctrlKey && e.key === "Tab") {
        e.preventDefault();
        setMissionOpen((open) => !open);
      }
    };
    window.addEventListener("keydown", handler);
    // Universal Search → Mission Control action dispatches this event
    const onOpenMission = () => setMissionOpen(true);
    const onOpenFocus   = () => setFocusActive(true);
    window.addEventListener("om:open-mission", onOpenMission);
    window.addEventListener("om:open-focus", onOpenFocus);
    return () => {
      window.removeEventListener("keydown", handler);
      window.removeEventListener("om:open-mission", onOpenMission);
      window.removeEventListener("om:open-focus", onOpenFocus);
    };
  }, [isDesktop, paletteOpen, missionOpen, showWelcome, windows, openApp, setPaletteOpen, toggleBrightness]);

  // ── Swipe gestures — available on both phones and tablets ───────────────
  const swipeStartX = useRef(null);
  const swipeStartY = useRef(null);
  const swipeLocked = useRef(false);
  const handleTouchStart = useCallback((e) => {
    if (!isTouch || locked) return;
    const prefs = loadMobilePrefs();
    if (!prefs.swipeNav) return;
    swipeStartX.current = e.touches[0].clientX;
    swipeStartY.current = e.touches[0].clientY;
    swipeLocked.current = false;
  }, [isTouch, locked]);
  const handleTouchMove = useCallback((e) => {
    if (!isTouch || swipeStartX.current === null) return;
    const dx = Math.abs(e.touches[0].clientX - swipeStartX.current);
    const dy = Math.abs(e.touches[0].clientY - swipeStartY.current);
    if (!swipeLocked.current && (dx > 10 || dy > 10)) {
      swipeLocked.current = dy > dx;
    }
  }, [isTouch]);
  const handleTouchEnd = useCallback((e) => {
    if (!isTouch || swipeStartX.current === null || locked) return;
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
  }, [isTouch, locked, windows, activeId, focusWindow]);
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

  // ── Window layer: offset below topbar. Tablet uses 48px topbar, mobile 60px.
  const windowLayerStyle = useMemo(() => {
    if (!isTouch) return { top: 0, left: 0, right: 0, bottom: 0 };
    return { top: isMobile ? 60 : 48, left: 0, right: 0, bottom: 0 };
  }, [isTouch, isMobile]);

  const openWindows = useMemo(() => windows.filter((w) => !w.minimized), [windows]);
  // Swipe dots: shown on phones and tablets when multiple apps are open
  const showDots = isTouch && openWindows.length > 1;
  // Cortex welcome card: desktop only
  const showCortexWelcome = isDesktop && showWelcome && openWindows.length === 0;
  return (
    <motion.div
      initial={{ opacity: 0, scale: 0.95, filter: "blur(20px)" }}
      animate={{ opacity: 1, scale: 1, filter: "blur(0px)" }}
      transition={{ duration: 1.5, ease: [0.16, 1, 0.3, 1] }}
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
          style={{
            zIndex: 0,
            ...(wp.dataURL ? {
              backgroundImage: `url(${wp.dataURL})`,
              backgroundSize: "cover",
              backgroundPosition: "center",
            } : {}),
          }}
        >
          {wp.fx && !wp.dataURL && isDesktop && <WallpaperFX fxType={wp.fx} accent={wp.accent} />}
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
      {/* Ambient particles: desktop only (performance on tablets) */}
      {isDesktop && <AmbientParticles />}
      <div className="absolute inset-0 scanline opacity-20 pointer-events-none" style={{ zIndex: 2 }} />
      <motion.div
        initial={{ opacity: 0, y: -8 }}
        animate={{ opacity: 1, y: 0 }}
        transition={{ delay: 0.35, duration: 0.45, ease: "easeOut" }}
        style={{ zIndex: 50, position: "relative" }}
      >
        <TopBar onOpenMissionControl={() => setMissionOpen(true)} onOpenBrightness={brightness.openOverlay} />
      </motion.div>
      {/* Widget canvas: desktop only */}
      {isDesktop && <WidgetCanvas topOffset={60} />}

      {/* ── Touch Home Screen (shown when no app is open on phone or tablet) ── */}
      <AnimatePresence>
        {isTouch && openWindows.length === 0 && (
          <MobileHomeScreen key="mobile-home" onOpenApp={handleOpenApp} onOpenSearch={() => setPaletteOpen(true)} />
        )}
      </AnimatePresence>

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
      <CommandPalette />
      <NotificationCenter />
      <ControlCenter isOpen={controlCenterOpen} onClose={() => setControlCenterOpen(false)} />
      <SpotlightSearch isOpen={spotlightOpen} onClose={() => setSpotlightOpen(false)} />
      <DesktopContextMenu />
      {/* Mission Control: desktop only */}
      {isDesktop && (
        <MissionControl
          open={missionOpen}
          onClose={() => setMissionOpen(false)}
        />
      )}
      {/* Lock screen: phones and tablets */}
      <AnimatePresence>
        {isTouch && locked && (
          <LockScreen
            key="lockscreen"
            onUnlock={() => { setLocked(false); resetIdle(); }}
          />
        )}
      </AnimatePresence>

      {/* ── Priority 4: Global Brightness ── */}
      <BrightnessFilter brightness={brightness.brightness} />
      <BrightnessOverlay
        brightness={brightness.brightness}
        setBrightness={brightness.setBrightness}
        open={brightness.open}
        onClose={brightness.closeOverlay}
      />

      {/* ── Priority 6: JARVIS Boot Screen (first load only) ── */}
      <AnimatePresence>
        {showBoot && (
          <BootScreen key="boot" onComplete={handleBootComplete} />
        )}
      </AnimatePresence>

      {/* ── Priority 1: Cinematic Onboarding (first-ever login) ── */}
      <AnimatePresence>
        {showOnboarding && !showBoot && (
          <motion.div
            key="onboarding"
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            exit={{ opacity: 0 }}
            transition={{ duration: 0.4 }}
            style={{ position: "absolute", inset: 0, zIndex: 9000 }}
          >
            <OnboardingExperience
              onComplete={handleOnboardingComplete}
              onWallpaperSelect={handleOnboardingWallpaperSelect}
            />
          </motion.div>
        )}
      </AnimatePresence>

      {/* ── Morning Briefing (Cortex overnight analysis) ── */}
      <AnimatePresence>
        {showMorningBrief && !showBoot && !showOnboarding && !showLocation && (
          <MorningBriefing
            key="morning-brief"
            onDismiss={() => {
              setShowMorningBrief(false);
              setShowWelcomeP(true);
            }}
          />
        )}
      </AnimatePresence>

      {/* ── Priority 7: Welcome Panel (post-boot, desktop only) ── */}
      {!showBoot && showWelcomeP && isDesktop && (
        <WelcomePanel
          user={user}
          notifications={notifications.length}
          onDismiss={() => setShowWelcomeP(false)}
        />
      )}

      {/* ── Priority 5: First-run Location Setup ── */}
      <AnimatePresence>
        {showLocation && !showBoot && (
          <LocationSetup key="location" onComplete={handleLocationComplete} />
        )}
      </AnimatePresence>

      {/* ── Phase 1 Priority 7: Cortex Interrupts (proactive suggestions) ── */}
      {!showBoot && !showOnboarding && (
        <CortexInterrupts focusMode={focusActive} userId={user?.id} />
      )}

      {/* ── Phase 1 Priority 8: Focus Tunnel ── */}
      <AnimatePresence>
        {focusActive && (
          <FocusTunnel
            key="focus-tunnel"
            active={focusActive}
            onActivate={() => setFocusActive(true)}
            onDeactivate={() => setFocusActive(false)}
          />
        )}
      </AnimatePresence>

      {/* ── P13: Cognitive Load Adaptor ── */}
      <CortexLoadAdaptor onSuggestFocus={() => setFocusActive(true)} />
    </motion.div>
  );
}

// Wrap with CognitiveLoadProvider so all children can call useCognitiveLoad()
const DesktopWithCognitiveLoad = () => (
  <CognitiveLoadProvider>
    <Desktop />
  </CognitiveLoadProvider>
);
export { DesktopWithCognitiveLoad as default };
