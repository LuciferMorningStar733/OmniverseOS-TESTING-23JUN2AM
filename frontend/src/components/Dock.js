import React, { useState, useRef, useCallback, useEffect, useMemo, memo } from "react";
import { motion, AnimatePresence, useAnimate, useMotionValue, useSpring, useTransform } from "framer-motion";
import { useOS } from "../context/OSContext";
import { APPS } from "../lib/apps";
import { useBreakpoint } from "../hooks/useBreakpoint";
import { playClick, playGlassTap, playWindowOpen } from "../lib/soundEngine";
// Keep in sync with PINNED_APP_IDS in MobileHomeScreen.js
const PINNED_APP_IDS = ["voice", "browser", "files", "settings"];

/* ── Long-press quick-action menu ─────────────────────────────────────────── */
const QuickMenu = memo(function QuickMenu({ appId, x, y, onClose, onOpen, onCloseApp, isOpen }) {
  const app = APPS.find((a) => a.id === appId);
  if (!app) return null;

  return (
    <>
      <div
        onClick={onClose}
        style={{
          position: "fixed", inset: 0, zIndex: 9990,
          background: "rgba(0,0,0,0.30)",
          backdropFilter: "blur(6px)",
          WebkitBackdropFilter: "blur(6px)",
        }}
      />
      <motion.div
        initial={{ opacity: 0, scale: 0.85, y: 10 }}
        animate={{ opacity: 1, scale: 1, y: 0 }}
        exit={{ opacity: 0, scale: 0.85, y: 10 }}
        transition={{ type: "spring", damping: 22, stiffness: 400, mass: 0.30 }}
        style={{
          position: "fixed",
          left: Math.min(x - 80, window.innerWidth - 176),
          top: Math.max(y - 160, 80),
          zIndex: 9991, width: 160, borderRadius: 16,
          background: "rgba(10,12,20,0.94)",
          border: "1px solid rgba(255,255,255,0.12)",
          boxShadow: "0 24px 64px rgba(0,0,0,0.75), 0 0 0 1px rgba(0,240,255,0.07)",
          backdropFilter: "blur(32px) saturate(180%)",
          WebkitBackdropFilter: "blur(32px) saturate(180%)",
          overflow: "hidden",
        }}
      >
        <div style={{
          padding: "12px 14px 10px",
          borderBottom: "1px solid rgba(255,255,255,0.07)",
          display: "flex", alignItems: "center", gap: 8,
          background: `linear-gradient(135deg, ${app.color}08, transparent)`,
        }}>
          <i className={`fa-solid ${app.icon}`} style={{ color: app.color, fontSize: 14, filter: `drop-shadow(0 0 4px ${app.color}80)` }} />
          <span style={{ fontSize: 13, fontWeight: 700, color: "#fff", fontFamily: "'Outfit', sans-serif" }}>
            {app.name}
          </span>
        </div>

        {isOpen ? (
          <>
            <QuickAction icon="fa-arrow-up-right-from-square" label="Bring to front" color="#00F0FF" onClick={onOpen} />
            <QuickAction icon="fa-xmark" label="Close app" color="#FF003C" onClick={onCloseApp} danger />
          </>
        ) : (
          <QuickAction icon="fa-play" label="Open app" color="#39FF14" onClick={onOpen} />
        )}
      </motion.div>
    </>
  );
});

const QuickAction = memo(function QuickAction({ icon, label, color, onClick, danger }) {
  const [pressed, setPressed] = useState(false);
  return (
    <button
      onPointerDown={() => setPressed(true)}
      onPointerUp={() => setPressed(false)}
      onPointerLeave={() => setPressed(false)}
      onClick={onClick}
      style={{
        width: "100%", padding: "11px 14px",
        display: "flex", alignItems: "center", gap: 10,
        background: pressed
          ? danger ? "rgba(255,0,60,0.16)" : "rgba(255,255,255,0.07)"
          : "transparent",
        border: "none", cursor: "pointer",
        transition: "background 0.10s ease",
        borderBottom: "1px solid rgba(255,255,255,0.04)",
        WebkitTapHighlightColor: "transparent",
        touchAction: "manipulation",
      }}
    >
      <i className={`fa-solid ${icon}`} style={{ color, fontSize: 13, width: 16, textAlign: "center" }} />
      <span style={{ fontSize: 13, color: danger ? "#FF4466" : "rgba(255,255,255,0.85)", fontFamily: "'Outfit', sans-serif" }}>
        {label}
      </span>
    </button>
  );
});

/* ── Mobile dock icon ──────────────────────────────────────────────────────── */
const MobileDockIcon = memo(function MobileDockIcon({ app, windows, activeId, openApp, focusWindow, closeWindow }) {
  const [scope, animate] = useAnimate();
  const pressTimerRef  = useRef(null);
  const didLongPress   = useRef(false);
  const touchActiveRef = useRef(false);
  const [quickMenu, setQuickMenu] = useState(null);

  const win      = windows.find((w) => w.app === app.id);
  const open     = Boolean(win);
  const isActive = open && win?.id === activeId;

  /* Shared launch logic — used by both touch and click paths */
  const launch = useCallback(() => {
    animate(scope.current, {
      scale: [1, 0.76, 1.14, 0.94, 1],
      y:     [0, 5,    -5,   2,    0],
    }, {
      duration: 0.44, ease: "easeOut",
      times: [0, 0.18, 0.52, 0.78, 1],
    });
    openApp(app.id);
  }, [animate, scope, openApp, app.id]);

  const handleTouchStart = useCallback((e) => {
    didLongPress.current = false;
    touchActiveRef.current = true;
    const rect = e.currentTarget.getBoundingClientRect();
    pressTimerRef.current = setTimeout(() => {
      didLongPress.current = true;
      if (navigator.vibrate) navigator.vibrate(35);
      setQuickMenu({
        appId: app.id,
        x: rect.left + rect.width / 2,
        y: rect.top,
      });
    }, 450);
  }, [app.id]);

  const handleTouchEnd = useCallback(() => {
    clearTimeout(pressTimerRef.current);
    if (!didLongPress.current) launch();
    // mark that this interaction was touch so the click handler can skip
    setTimeout(() => { touchActiveRef.current = false; }, 300);
  }, [launch]);

  const handleTouchMove = useCallback(() => {
    clearTimeout(pressTimerRef.current);
  }, []);

  /* Mouse/hybrid click — only fires when no touch event handled it */
  const handleClick = useCallback(() => {
    if (touchActiveRef.current) return;
    launch();
  }, [launch]);

  return (
    <>
      <motion.button
        ref={scope}
        data-testid={`dock-item-${app.id}`}
        aria-label={`Open ${app.name}`}
        role="button"
        onTouchStart={handleTouchStart}
        onTouchEnd={handleTouchEnd}
        onTouchMove={handleTouchMove}
        onClick={handleClick}
        whileTap={{ scale: 0.76, y: 5 }}
        transition={{ type: "spring", stiffness: 440, damping: 14, mass: 0.22 }}
        className="relative flex-shrink-0 flex flex-col items-center justify-center select-none"
        style={{
          width: 68, height: 76,
          minWidth: 60,
          borderRadius: 14,
          background: "transparent",
          boxShadow: "none",
          transition: "background 0.22s ease, box-shadow 0.22s ease",
          WebkitTapHighlightColor: "transparent",
          touchAction: "none", userSelect: "none",
          willChange: "transform",
          gap: 2,
        }}
      >
        {/* Priority 4 — active glow halo behind icon (AnimatePresence for exit) */}
        <AnimatePresence>
          {isActive && (
            <motion.div
              key="halo"
              initial={{ opacity: 0, scale: 0.55 }}
              animate={{ opacity: 1, scale: 1 }}
              exit={{ opacity: 0, scale: 0.55 }}
              transition={{ type: "spring", damping: 18, stiffness: 340, mass: 0.25 }}
              style={{
                position: "absolute",
                top: 4, left: "50%",
                width: 48, height: 48, borderRadius: 16,
                background: `radial-gradient(ellipse at 50% 30%, ${app.color}36 0%, transparent 72%)`,
                boxShadow: `0 0 24px ${app.color}55`,
                pointerEvents: "none", zIndex: 0,
              }}
              // Use motion x prop instead of CSS translateX for cross-browser consistency
              x="-50%"
            />
          )}
        </AnimatePresence>

        <motion.div
          className="flex items-center justify-center"
          animate={{
            background: isActive ? `${app.color}22` : "rgba(255,255,255,0.06)",
            borderColor: isActive ? `${app.color}55` : "rgba(255,255,255,0.07)",
            boxShadow: isActive
              ? `inset 0 1px 0 rgba(255,255,255,0.12), 0 0 14px ${app.color}30`
              : "none",
          }}
          transition={{ duration: 0.22 }}
          style={{
            width: 44, height: 44, borderRadius: 12,
            border: "1.5px solid",
            position: "relative", zIndex: 1,
          }}
        >
          <i
            className={`fa-solid ${app.icon}`}
            style={{
              color: app.color, fontSize: 20,
              filter: isActive
                ? `drop-shadow(0 0 8px ${app.color}) drop-shadow(0 0 16px ${app.color}70)`
                : `drop-shadow(0 0 3px ${app.color}30)`,
              transition: "filter 0.22s ease",
            }}
          />
        </motion.div>

        <span style={{
          fontSize: 9.5,
          fontFamily: "'Outfit', sans-serif",
          color: isActive ? "#fff" : "rgba(255,255,255,0.45)",
          marginTop: 3,
          maxWidth: 60,
          overflow: "hidden", textOverflow: "ellipsis", whiteSpace: "nowrap",
          letterSpacing: "0.01em",
          lineHeight: 1.2,
          transition: "color 0.22s ease",
          userSelect: "none",
        }}>
          {app.name}
        </span>

        {open && (
          <motion.div
            layoutId={`running-dot-${app.id}`}
            style={{
              position: "absolute", bottom: 2, left: "50%",
              x: "-50%",
              width: isActive ? 16 : 3, height: 3, borderRadius: 2,
              background: isActive ? app.color : "rgba(255,255,255,0.30)",
              boxShadow: isActive ? `0 0 8px ${app.color}CC` : "none",
              transition: "width 0.25s cubic-bezier(0.34,1.56,0.64,1), background 0.25s ease, box-shadow 0.25s ease",
            }}
          />
        )}
      </motion.button>

      <AnimatePresence>
        {quickMenu && (
          <QuickMenu
            key="quick-menu"
            appId={quickMenu.appId}
            x={quickMenu.x}
            y={quickMenu.y}
            onClose={() => setQuickMenu(null)}
            onOpen={() => {
              const w = windows.find((w2) => w2.app === quickMenu.appId);
              if (w) focusWindow(w.id);
              else openApp(quickMenu.appId);
              setQuickMenu(null);
            }}
            onCloseApp={() => {
              const w = windows.find((w2) => w2.app === quickMenu.appId);
              if (w) closeWindow(w.id);
              setQuickMenu(null);
            }}
            isOpen={open}
          />
        )}
      </AnimatePresence>
    </>
  );
});

// ─── Priority 9: Mobile dock with touch-magnification physics ─────────────────

function useMobileDockMagnification(count) {
  const [touchX, setTouchX] = useState(null);
  const pillRef = useRef(null);

  const getScales = useCallback((tx) => {
    if (tx === null || !pillRef.current) return Array(count).fill(1);
    const rect   = pillRef.current.getBoundingClientRect();
    const slotW  = rect.width / count;
    return Array.from({ length: count }, (_, i) => {
      const iconCenterX = rect.left + slotW * i + slotW / 2;
      const dist        = Math.abs(tx - iconCenterX);
      const maxDist     = slotW * 1.8;
      if (dist >= maxDist) return 1;
      const t = 1 - dist / maxDist;
      return 1 + t * t * 0.38;           // max 1.38× at touch center
    });
  }, [count]);

  const scales = useMemo(() => getScales(touchX), [getScales, touchX]);

  const onTouchMove = useCallback((e) => {
    setTouchX(e.touches[0]?.clientX ?? null);
  }, []);

  const onTouchEnd = useCallback(() => {
    setTouchX(null);
  }, []);

  return { pillRef, scales, onTouchMove, onTouchEnd };
}

function MobileDock() {
  const { openApp, closeWindow, windows, activeId, focusWindow } = useOS();

  const pinnedApps = useMemo(
    () => APPS.filter((a) => PINNED_APP_IDS.includes(a.id))
         .sort((a, b) => PINNED_APP_IDS.indexOf(a.id) - PINNED_APP_IDS.indexOf(b.id)),
    []
  );

  const { pillRef, scales, onTouchMove, onTouchEnd } =
    useMobileDockMagnification(pinnedApps.length);

  // ── Visibility rule: dock only lives on the homescreen ───────────────────
  // Any non-minimized window → dock vanishes with a futuristic exit sequence.
  const hasOpenWindows = windows.some((w) => !w.minimized);

  // Auto-hide when user scrolls down in the home feed (existing behaviour)
  const [scrollHidden, setScrollHidden] = useState(false);
  const lastScrollY = useRef(0);
  useEffect(() => {
    const handler = ({ detail }) => {
      const y = detail?.scrollY ?? 0;
      if (y > lastScrollY.current + 18 && y > 55) setScrollHidden(true);
      else if (y < lastScrollY.current - 10 || y < 30) setScrollHidden(false);
      lastScrollY.current = y;
    };
    window.addEventListener("aiHomeScroll", handler);
    return () => window.removeEventListener("aiHomeScroll", handler);
  }, []);

  // Clear scroll-hide the moment the user returns to the homescreen
  useEffect(() => {
    if (!hasOpenWindows) setScrollHidden(false);
  }, [hasOpenWindows]);

  const dockVisible = !hasOpenWindows && !scrollHidden;
  const n = pinnedApps.length;

  // Track appearance events so the scan-line re-fires every time the dock
  // materialises (AnimatePresence key trick).
  const [scanKey, setScanKey] = useState(0);
  const prevVisible = useRef(false);
  useEffect(() => {
    if (dockVisible && !prevVisible.current) setScanKey((k) => k + 1);
    prevVisible.current = dockVisible;
  }, [dockVisible]);

  return (
    <motion.div
      initial={{ y: 120, opacity: 0, scale: 0.88 }}
      animate={{
        y:       dockVisible ? 0   : 110,
        opacity: dockVisible ? 1   : 0,
        scale:   dockVisible ? 1   : 0.84,
      }}
      transition={dockVisible
        /* Spring entry — slightly delayed so icons can stagger in cleanly */
        ? { type: "spring", damping: 26, stiffness: 260, delay: 0.06,
            opacity: { duration: 0.22, delay: 0.06 } }
        /* Ease-in exit — snappy collapse that clears before the app settles */
        : { duration: 0.28, ease: [0.55, 0, 1, 0.45],
            opacity: { duration: 0.20 }, scale: { duration: 0.24 } }
      }
      className="absolute left-0 right-0 bottom-0 z-40 pointer-events-none"
      data-testid="dock-root"
      style={{
        paddingBottom: "env(safe-area-inset-bottom, 0px)",
        display: "flex",
        justifyContent: "center",
        paddingLeft: 20,
        paddingRight: 20,
        paddingTop: 10,
      }}
    >
      {/* ── Floating glass pill ─────────────────────────────────────────── */}
      <div
        ref={pillRef}
        onTouchMove={onTouchMove}
        onTouchEnd={onTouchEnd}
        onTouchCancel={onTouchEnd}
        style={{
          pointerEvents: dockVisible ? "auto" : "none",
          position: "relative",
          overflow: "hidden",
          background: "rgba(5, 7, 15, 0.84)",
          backdropFilter: "blur(56px) saturate(230%)",
          WebkitBackdropFilter: "blur(56px) saturate(230%)",
          border: "1px solid rgba(255,255,255,0.10)",
          borderRadius: 30,
          boxShadow: "0 12px 48px rgba(0,0,0,0.70), 0 0 0 1px rgba(0,240,255,0.04), inset 0 1px 0 rgba(255,255,255,0.09), inset 0 -1px 0 rgba(0,0,0,0.30)",
          paddingTop: 9,
          paddingBottom: "calc(9px + env(safe-area-inset-bottom, 0px))",
          paddingLeft: 14,
          paddingRight: 14,
          display: "flex",
          alignItems: "flex-end",
          justifyContent: "space-around",
          gap: 2,
          minWidth: 232,
        }}
      >
        {/* ── Cyan scan-line sweep on every dock materialisation ────────
            Fires a light beam across the pill immediately after the pill
            springs into view, giving a "system online" boot feel.       */}
        <AnimatePresence>
          {dockVisible && (
            <motion.div
              key={`scan-${scanKey}`}
              initial={{ x: "-120%", opacity: 1 }}
              animate={{ x: "180%",  opacity: 0 }}
              exit={{}}
              transition={{ duration: 0.52, ease: [0.22, 1, 0.36, 1], delay: 0.18 }}
              style={{
                position: "absolute",
                inset: 0,
                width: "50%",
                background:
                  "linear-gradient(90deg, transparent 0%, rgba(0,240,255,0.10) 30%, rgba(0,240,255,0.28) 50%, rgba(0,240,255,0.10) 70%, transparent 100%)",
                pointerEvents: "none",
                zIndex: 20,
                borderRadius: "inherit",
              }}
            />
          )}
        </AnimatePresence>

        {/* ── Dock icons with staggered entry / exit ────────────────────
            Entry:  left → right stagger, spring bounce, blur clears
            Exit:   right → left stagger, scale crush, blur spreads      */}
        {pinnedApps.map((app, i) => (
          <motion.div
            key={app.id}
            initial={{ opacity: 0, scale: 0.3, y: 22, filter: "blur(6px)" }}
            animate={dockVisible
              ? {
                  /* Magnification drives scale+y; opacity+blur are appearance */
                  scale:  scales[i],
                  y:      scales[i] > 1 ? -(scales[i] - 1) * 28 : 0,
                  opacity: 1,
                  filter: "blur(0px)",
                }
              : {
                  scale:   0.3,
                  y:       22,
                  opacity: 0,
                  filter:  "blur(6px)",
                }
            }
            transition={dockVisible
              /* Entry: spring with left-to-right stagger */
              ? {
                  type: "spring", stiffness: 460, damping: 22, mass: 0.24,
                  delay: 0.10 + i * 0.07,
                  opacity: { duration: 0.22, ease: "easeOut", delay: 0.10 + i * 0.07 },
                  filter:  { duration: 0.18, ease: "easeOut", delay: 0.10 + i * 0.07 },
                }
              /* Exit: ease-in with right-to-left (reverse) stagger */
              : {
                  duration: 0.18,
                  ease: [0.4, 0, 1, 1],
                  delay: (pinnedApps.length - 1 - i) * 0.048,
                }
            }
            style={{ transformOrigin: "bottom center", willChange: "transform, opacity, filter" }}
          >
            <MobileDockIcon
              app={app}
              windows={windows} activeId={activeId}
              openApp={openApp} focusWindow={focusWindow} closeWindow={closeWindow}
            />
          </motion.div>
        ))}
      </div>
    </motion.div>
  );
}

/* ── Desktop dock icon ─────────────────────────────────────────────────────── */
const DockTooltip = memo(function DockTooltip({ name, visible, offsetY }) {
  return (
    <AnimatePresence>
      {visible && (
        <motion.div
          initial={{ opacity: 0, y: 6, scale: 0.88 }}
          animate={{ opacity: 1, y: 0, scale: 1 }}
          exit={{ opacity: 0, y: 4, scale: 0.88 }}
          transition={{ type: "spring", stiffness: 450, damping: 26, mass: 0.2 }}
          style={{
            position: "absolute",
            bottom: "calc(100% + 14px)",
            left: "50%",
            x: "-50%",
            y: offsetY,
            background: "rgba(12, 16, 28, 0.92)",
            backdropFilter: "blur(20px) saturate(190%)",
            WebkitBackdropFilter: "blur(20px) saturate(190%)",
            border: "1px solid rgba(255, 255, 255, 0.16)",
            borderRadius: 8,
            padding: "4px 11px",
            fontSize: 12,
            fontFamily: "'Outfit', -apple-system, BlinkMacSystemFont, sans-serif",
            fontWeight: 600,
            letterSpacing: "0.01em",
            color: "#ffffff",
            whiteSpace: "nowrap",
            pointerEvents: "none",
            zIndex: 100,
            boxShadow: "0 10px 28px rgba(0, 0, 0, 0.65), 0 0 1px rgba(255, 255, 255, 0.25)",
          }}
        >
          {name}
          <div
            style={{
              position: "absolute",
              top: "100%",
              left: "50%",
              transform: "translateX(-50%)",
              width: 0,
              height: 0,
              borderLeft: "5px solid transparent",
              borderRight: "5px solid transparent",
              borderTop: "5px solid rgba(12, 16, 28, 0.92)",
            }}
          />
        </motion.div>
      )}
    </AnimatePresence>
  );
});

const getAppGradient = (app) => {
  switch (app.group) {
    case "ai":
      return "linear-gradient(135deg, #00F0FF 0%, #0077FF 100%)";
    case "productivity":
      return "linear-gradient(135deg, #F59E0B 0%, #D97706 100%)";
    case "system":
      return app.id === "code"
        ? "linear-gradient(135deg, #39FF14 0%, #059669 100%)"
        : "linear-gradient(135deg, #3B82F6 0%, #1D4ED8 100%)";
    case "media":
      return "linear-gradient(135deg, #EC4899 0%, #BE185D 100%)";
    case "data":
      return "linear-gradient(135deg, #10B981 0%, #047857 100%)";
    case "social":
      return "linear-gradient(135deg, #8B5CF6 0%, #6D28D9 100%)";
    default:
      return `linear-gradient(135deg, ${app.color} 0%, #0F172A 100%)`;
  }
};

const DesktopDockIcon = memo(function DesktopDockIcon({
  app, mouseX, isActive, open, openApp,
}) {
  const iconRef = useRef(null);
  const [scope, animateScope] = useAnimate();
  const [isHovered, setIsHovered] = useState(false);

  // Proximity distance from icon center to cursor position
  const distance = useTransform(mouseX, (val) => {
    const bounds = iconRef.current?.getBoundingClientRect() ?? { x: 0, width: 0 };
    return val - (bounds.x + bounds.width / 2);
  });

  // Smooth proximity magnification wave
  const scaleSync = useTransform(distance, [-140, 0, 140], [1, 1.55, 1]);
  const scale = useSpring(scaleSync, { mass: 0.1, stiffness: 380, damping: 24 });

  // Width expansion so neighboring icons gracefully part
  const widthSync = useTransform(distance, [-140, 0, 140], [52, 74, 52]);
  const width = useSpring(widthSync, { mass: 0.1, stiffness: 380, damping: 24 });

  // Lift upward from dock shelf
  const translateYSync = useTransform(distance, [-140, 0, 140], [0, -14, 0]);
  const translateY = useSpring(translateYSync, { mass: 0.1, stiffness: 380, damping: 24 });

  // Floating tooltip offset: lifts dynamically with icon magnification
  const tooltipYSync = useTransform(distance, [-140, 0, 140], [0, -20, 0]);
  const tooltipY = useSpring(tooltipYSync, { mass: 0.1, stiffness: 380, damping: 24 });

  const handleClick = useCallback(async () => {
    if (open) { playClick(); } else { playWindowOpen(); }
    if (scope.current) {
      animateScope(scope.current, {
        scale: [1, 0.78, 1.25, 0.94, 1.05, 1],
        y:     [0,  4,   -8,   2,   -1,   0],
      }, {
        duration: 0.44,
        ease: "easeOut",
        times: [0, 0.15, 0.45, 0.70, 0.88, 1],
      });
    }
    openApp(app.id);
  }, [animateScope, scope, openApp, app.id, open]);

  /* Per-app glow ring style */
  const ringStyle = useMemo(() => ({
    boxShadow: `0 0 0 1.5px ${app.color}77, 0 0 20px ${app.color}45, 0 0 40px ${app.color}20`,
  }), [app.color]);

  return (
    <motion.div
      ref={iconRef}
      style={{ width, height: 50 }}
      className="relative flex flex-col items-center justify-end flex-shrink-0"
    >
      <DockTooltip name={app.name} visible={isHovered} offsetY={tooltipY} />

      <motion.button
        data-testid={`dock-item-${app.id}`}
        data-dock-icon={app.id}
        aria-label={`Open ${app.name}`}
        aria-current={isActive ? "page" : undefined}
        onMouseEnter={() => setIsHovered(true)}
        onMouseLeave={() => setIsHovered(false)}
        onClick={handleClick}
        style={{
          width: 50,
          height: 50,
          scale,
          y: translateY,
          transformOrigin: "bottom center",
          display: "flex",
          alignItems: "center",
          justifyContent: "center",
          background: "transparent",
          cursor: "pointer",
          border: "none",
          outline: "none",
          padding: 0,
          willChange: "transform",
          position: "relative",
        }}
      >
        {/* Active glow ring */}
        <AnimatePresence>
          {isActive && (
            <motion.div
              layoutId={`active-ring-${app.id}`}
              initial={{ opacity: 0 }}
              animate={{ opacity: 1 }}
              exit={{ opacity: 0 }}
              className="absolute inset-0 rounded-[14px]"
              style={ringStyle}
            />
          )}
        </AnimatePresence>

        {/* Squircle Badge Container with click bounce ref */}
        <motion.div
          ref={scope}
          className="w-11 h-11 rounded-[13px] flex items-center justify-center relative shadow-md"
          style={{
            background: getAppGradient(app),
            boxShadow: isActive
              ? `0 0 16px ${app.color}90, inset 0 1px 1px rgba(255,255,255,0.5), inset 0 -1px 2px rgba(0,0,0,0.4)`
              : "inset 0 1px 1px rgba(255,255,255,0.4), inset 0 -1px 2px rgba(0,0,0,0.3), 0 4px 12px rgba(0,0,0,0.45)",
            border: "1px solid rgba(255,255,255,0.22)",
            transition: "box-shadow 0.22s ease",
          }}
        >
          <i
            className={`fa-solid ${app.icon} text-lg text-white`}
            style={{ filter: "drop-shadow(0 2px 4px rgba(0,0,0,0.5))" }}
          />
        </motion.div>

        {/* Running indicator — pill for active focused app, dot for background running app */}
        {open && (
          <motion.span
            layoutId={`running-dot-${app.id}`}
            className="absolute rounded-full"
            style={{
              bottom: -5,
              left: "50%",
              x: "-50%",
              width: isActive ? 16 : 4,
              height: 4,
              borderRadius: 2,
              background: isActive ? app.color : "rgba(0,240,255,0.85)",
              boxShadow: isActive
                ? `0 0 10px ${app.color}FF, 0 0 20px ${app.color}66`
                : "0 0 6px rgba(0,240,255,0.6)",
              transition: "width 0.36s cubic-bezier(0.34,1.56,0.64,1), background 0.22s ease, box-shadow 0.22s ease",
            }}
          />
        )}
      </motion.button>
    </motion.div>
  );
});

/* ── Trash dock icon with magnification & tooltip ──────────────────────────── */
const TrashDockIcon = memo(function TrashDockIcon({ mouseX, openApp }) {
  const iconRef = useRef(null);
  const [isHovered, setIsHovered] = useState(false);
  const [scope, animateScope] = useAnimate();

  const distance = useTransform(mouseX, (val) => {
    const bounds = iconRef.current?.getBoundingClientRect() ?? { x: 0, width: 0 };
    return val - (bounds.x + bounds.width / 2);
  });

  const scaleSync = useTransform(distance, [-140, 0, 140], [1, 1.55, 1]);
  const scale = useSpring(scaleSync, { mass: 0.1, stiffness: 380, damping: 24 });

  const widthSync = useTransform(distance, [-140, 0, 140], [52, 74, 52]);
  const width = useSpring(widthSync, { mass: 0.1, stiffness: 380, damping: 24 });

  const translateYSync = useTransform(distance, [-140, 0, 140], [0, -14, 0]);
  const translateY = useSpring(translateYSync, { mass: 0.1, stiffness: 380, damping: 24 });

  const tooltipYSync = useTransform(distance, [-140, 0, 140], [0, -20, 0]);
  const tooltipY = useSpring(tooltipYSync, { mass: 0.1, stiffness: 380, damping: 24 });

  const handleClick = useCallback(async () => {
    playGlassTap();
    if (scope.current) {
      animateScope(scope.current, {
        scale: [1, 0.78, 1.25, 0.94, 1.05, 1],
        y:     [0,  4,   -8,   2,   -1,   0],
      }, {
        duration: 0.44,
        ease: "easeOut",
        times: [0, 0.15, 0.45, 0.70, 0.88, 1],
      });
    }
    openApp("files");
  }, [animateScope, scope, openApp]);

  return (
    <motion.div
      ref={iconRef}
      style={{ width, height: 50 }}
      className="relative flex flex-col items-center justify-end flex-shrink-0"
    >
      <DockTooltip name="Trash" visible={isHovered} offsetY={tooltipY} />

      <motion.button
        data-testid="dock-trash"
        aria-label="Trash"
        onMouseEnter={() => setIsHovered(true)}
        onMouseLeave={() => setIsHovered(false)}
        onClick={handleClick}
        style={{
          width: 50,
          height: 50,
          scale,
          y: translateY,
          transformOrigin: "bottom center",
          display: "flex",
          alignItems: "center",
          justifyContent: "center",
          background: "transparent",
          cursor: "pointer",
          border: "none",
          outline: "none",
          padding: 0,
          willChange: "transform",
          position: "relative",
        }}
      >
        <motion.div
          ref={scope}
          className="w-11 h-11 rounded-[13px] flex items-center justify-center relative shadow-md transition-all duration-200"
          style={{
            background: "linear-gradient(135deg, rgba(255,255,255,0.18) 0%, rgba(255,255,255,0.06) 100%)",
            border: "1px solid rgba(255,255,255,0.22)",
            boxShadow: isHovered
              ? "0 4px 16px rgba(255,255,255,0.25), inset 0 1px 1px rgba(255,255,255,0.4)"
              : "0 4px 12px rgba(0,0,0,0.40), inset 0 1px 1px rgba(255,255,255,0.2)",
          }}
        >
          <i
            className="fa-solid fa-trash-can text-lg text-slate-200"
            style={{ filter: "drop-shadow(0 2px 4px rgba(0,0,0,0.5))" }}
          />
        </motion.div>
      </motion.button>
    </motion.div>
  );
});

// Core 7 macOS-style pinned apps for OmniverseOS (capped strictly at 8 max with running apps)
const CORE_PINNED_APP_IDS = [
  "dashboard", // System dashboard & Mission Control
  "browser",   // Web Browser
  "chat",      // AI Assistant (flagship)
  "voice",     // Cortex Voice AI
  "files",     // File Manager
  "code",      // Code Studio
  "settings",  // System Settings
];

function DesktopDock({ isTablet }) {
  const { openApp, windows, activeId } = useOS();
  const mouseX = useMotionValue(Infinity);
  const dockRef = useRef(null);

  // Maintain strictly 7-8 apps maximum:
  // Core 7 pinned apps + 1 running unpinned app (or notes if no unpinned apps are running)
  const appStates = useMemo(() => {
    const runningAppIds = [];
    windows.forEach((w) => {
      if (w.app && !runningAppIds.includes(w.app)) {
        runningAppIds.push(w.app);
      }
    });

    const runningUnpinned = runningAppIds.filter((id) => !CORE_PINNED_APP_IDS.includes(id));

    const displayIds = [...CORE_PINNED_APP_IDS];

    if (runningUnpinned.length === 0) {
      // Default 8-app layout: insert notes before settings
      displayIds.splice(6, 0, "notes");
    } else {
      // Running unpinned apps: insert up to 8 max total apps
      const extraSlots = 8 - displayIds.length;
      const toAdd = runningUnpinned.slice(0, extraSlots);
      displayIds.splice(displayIds.length - 1, 0, ...toAdd);
    }

    // Strict cap at 8 apps maximum
    const finalIds = displayIds.slice(0, 8);

    return finalIds.map((id) => {
      const app = APPS.find((a) => a.id === id);
      if (!app) return null;
      const win = windows.find((w) => w.app === id);
      const open = Boolean(win);
      const isActive = open && win?.id === activeId;
      return { app, open, isActive };
    }).filter(Boolean);
  }, [windows, activeId]);

  return (
    <motion.div
      initial={{ y: 120, opacity: 0 }}
      animate={{ y: 0, opacity: 1 }}
      transition={{ delay: 0.25, type: "spring", damping: 24, stiffness: 240 }}
      className="absolute left-0 right-0 bottom-3 z-40 flex justify-center pointer-events-none"
      data-testid="dock-root"
      style={{ overflow: "visible" }}
    >
      <div
        ref={dockRef}
        data-testid="adaptive-dock"
        onMouseMove={(e) => mouseX.set(e.pageX)}
        onMouseLeave={() => mouseX.set(Infinity)}
        className="pointer-events-auto flex items-end gap-1.5 px-3 py-2 rounded-2xl relative"
        style={{
          overflow: "visible", // CRITICAL: Allows magnification and tooltips above the dock shelf
          background: "rgba(10, 14, 26, 0.72)",
          backdropFilter: "blur(56px) saturate(240%)",
          WebkitBackdropFilter: "blur(56px) saturate(240%)",
          border: "1px solid rgba(255, 255, 255, 0.18)",
          boxShadow: "0 28px 72px rgba(0,0,0,0.80), inset 0 1.5px 0 rgba(255,255,255,0.28), 0 0 0 1px rgba(0,240,255,0.12), inset 0 -1px 2px rgba(0,0,0,0.50)",
          maxWidth: "calc(100vw - 24px)",
        }}
      >
        {/* Optical Liquid Glass Ambient Sheen Layer */}
        <div
          style={{
            position: "absolute",
            inset: 0,
            borderRadius: "inherit",
            overflow: "hidden",
            pointerEvents: "none",
            zIndex: 0,
          }}
        >
          <div
            style={{
              position: "absolute",
              inset: 0,
              background: "linear-gradient(180deg, rgba(255,255,255,0.08) 0%, transparent 60%)",
            }}
          />
        </div>

        {appStates.map(({ app, open, isActive }) => (
          <DesktopDockIcon
            key={app.id}
            app={app}
            mouseX={mouseX}
            isActive={isActive}
            open={open}
            openApp={openApp}
          />
        ))}

        {/* Vertical Separator Line between Apps and Trash */}
        <div className="w-px h-7 bg-white/20 mx-1 flex-shrink-0 self-center z-10" />

        {/* Trash Icon */}
        <TrashDockIcon mouseX={mouseX} openApp={openApp} />
      </div>
    </motion.div>
  );
}

/* ── Export ─────────────────────────────────────────────────────────────────── */
export default function Dock() {
  const { isMobile, isTablet } = useBreakpoint();
  const isTouch = isMobile || isTablet;
  // On mobile/tablet touch devices, MobileHomeScreen renders its dedicated One UI Smart Dock.
  // Suppressing MobileDock here prevents the duplicate dock collision (MOB-002).
  if (isTouch) {
    return null;
  }
  return <DesktopDock isTablet={false} />;
}
