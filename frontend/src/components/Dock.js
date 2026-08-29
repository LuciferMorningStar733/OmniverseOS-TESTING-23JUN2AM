import React, { useState, useRef, useCallback, useEffect, useMemo, memo } from "react";
import { motion, AnimatePresence, useAnimate } from "framer-motion";
import { useOS } from "../context/OSContext";
import { APPS } from "../lib/apps";
import { useBreakpoint } from "../hooks/useBreakpoint";
import { playClick } from "../lib/soundEngine";
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
                  delay: (n - 1 - i) * 0.048,
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
const DockTooltip = memo(function DockTooltip({ name, visible }) {
  return (
    <AnimatePresence>
      {visible && (
        <motion.div
          initial={{ opacity: 0, y: 6, scale: 0.80 }}
          animate={{ opacity: 1, y: 0, scale: 1 }}
          exit={{ opacity: 0, y: 6, scale: 0.80 }}
          transition={{ type: "spring", stiffness: 480, damping: 24, mass: 0.2 }}
          style={{
            position: "absolute",
            bottom: "calc(100% + 10px)",
            left: "50%", x: "-50%",
            background: "rgba(8,10,18,0.92)",
            border: "1px solid rgba(255,255,255,0.12)",
            borderRadius: 8,
            padding: "4px 10px",
            fontSize: 11,
            fontFamily: "'Outfit', 'JetBrains Mono', sans-serif",
            fontWeight: 600,
            color: "rgba(255,255,255,0.88)",
            whiteSpace: "nowrap",
            pointerEvents: "none",
            zIndex: 100,
            backdropFilter: "blur(16px)",
            WebkitBackdropFilter: "blur(16px)",
            boxShadow: "0 8px 24px rgba(0,0,0,0.5)",
          }}
        >
          {name}
        </motion.div>
      )}
    </AnimatePresence>
  );
});

/* Cosine bell-curve proximity scale helper */
function useScale(index, hoverIndex) {
  return useMemo(() => {
    if (hoverIndex === null) return 1;
    // Respect prefers-reduced-motion
    if (typeof window !== "undefined" && window.matchMedia?.("(prefers-reduced-motion: reduce)").matches) {
      return 1;
    }
    const dist = Math.abs(index - hoverIndex);
    const radius = 2.5; // continuous cosine bell radius over ~2.5 slots
    if (dist >= radius) return 1;
    const cosineFactor = (1 + Math.cos((Math.PI * dist) / radius)) / 2;
    return 1 + 0.45 * cosineFactor; // Smooth bell curve: 1.45 peak, ~1.29 neighbors, 1.0 distant
  }, [index, hoverIndex]);
}

const DesktopDockIcon = memo(function DesktopDockIcon({
  app, index, scale, isActive, open, openApp,
}) {
  const [scope, animateScope] = useAnimate();
  const [tooltipVisible, setTooltipVisible] = useState(false);
  const [bouncing, setBouncing] = useState(false);

  // App attention trigger listener (e.g. response finished, task reminder)
  useEffect(() => {
    const handler = (e) => {
      if (e.detail?.appId === app.id || e.detail === app.id) {
        setBouncing(true);
        animateScope(scope.current, {
          y: [0, -20, 0, -12, 0, -5, 0],
        }, {
          duration: 1.2,
          ease: "easeInOut",
          times: [0, 0.2, 0.4, 0.6, 0.75, 0.9, 1],
        }).then(() => setBouncing(false));
      }
    };
    window.addEventListener("omniverse:dock-attention", handler);
    return () => window.removeEventListener("omniverse:dock-attention", handler);
  }, [app.id, animateScope, scope]);

  const handleClick = useCallback(async () => {
    playClick();
    // macOS Launchpad-matched launch sequence: compress → pulse → bounce → settle
    await animateScope(scope.current, {
      scale: [1, 0.78, 1.32, 0.93, 1.07, 0.98, 1],
      y:     [0,  6,   -10,  3,   -3,   1,    0],
    }, {
      duration: 0.52,
      ease: "easeOut",
      times: [0, 0.12, 0.38, 0.56, 0.74, 0.88, 1],
    });
    openApp(app.id);
  }, [animateScope, scope, openApp, app.id]);

  const handleMouseEnter = useCallback(() => {
    setTooltipVisible(true);
  }, []);

  const handleMouseLeave = useCallback(() => {
    setTooltipVisible(false);
  }, []);

  /* Per-app glow ring color */
  const ringStyle = useMemo(() => ({
    boxShadow: `0 0 0 1.5px ${app.color}45, 0 0 18px ${app.color}28, 0 0 36px ${app.color}12`,
  }), [app.color]);

  return (
    <motion.button
      ref={scope}
      data-testid={`dock-item-${app.id}`}
      aria-label={`Open ${app.name}`}
      aria-current={isActive ? "page" : undefined}
      onMouseEnter={handleMouseEnter}
      onMouseLeave={handleMouseLeave}
      onClick={handleClick}
      animate={{ scale: scale || 1 }}
      transition={{ type: "spring", stiffness: 440, damping: 22, mass: 0.22 }}
      className="group relative flex-shrink-0"
      style={{
        width: 46, height: 46,
        display: "flex", alignItems: "center", justifyContent: "center",
        borderRadius: 14,
        background: isActive ? `${app.color}14` : "rgba(255,255,255,0.03)",
        transformOrigin: "bottom center",
        cursor: "pointer", border: "none", outline: "none", padding: 0,
        transition: "background 0.22s ease",
        willChange: "transform",
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
            className="absolute inset-0 rounded-xl"
            style={ringStyle}
          />
        )}
      </AnimatePresence>

      <i
        className={`fa-solid ${app.icon} text-lg`}
        style={{
          color: app.color,
          filter: isActive
            ? `drop-shadow(0 0 8px ${app.color}) drop-shadow(0 0 16px ${app.color}65)`
            : `drop-shadow(0 0 3px ${app.color}30)`,
          transition: "filter 0.22s ease",
        }}
      />

      {/* Running indicator — illuminated LED pill for active focused app, dot for background running app */}
      {open && (
        <motion.span
          layoutId={`running-dot-${app.id}`}
          className="absolute rounded-full"
          style={{
            bottom: -5, left: "50%", x: "-50%",
            width: isActive ? 16 : 4,
            height: isActive ? 4 : 4,
            borderRadius: 2,
            background: isActive ? app.color : "rgba(0,240,255,0.65)",
            boxShadow: isActive
              ? `0 0 10px ${app.color}BB, 0 0 20px ${app.color}44`
              : "0 0 6px rgba(0,240,255,0.5)",
            transition: "width 0.36s cubic-bezier(0.34,1.56,0.64,1), background 0.22s ease, box-shadow 0.22s ease",
          }}
        />
      )}

      <DockTooltip name={app.name} visible={tooltipVisible} />
    </motion.button>
  );
});

function DesktopDock({ isTablet }) {
  const { openApp, windows, activeId } = useOS();
  const containerRef = useRef(null);
  const [mouseX, setMouseX] = useState(null);

  const handleMouseMove = useCallback((e) => {
    setMouseX(e.clientX);
  }, []);

  const handleMouseLeave = useCallback(() => {
    setMouseX(null);
  }, []);

  /* Pre-compute per-app state so find() isn't run on every mouse event */
  const appStates = useMemo(() => APPS.map((app) => {
    const win      = windows.find((w) => w.app === app.id);
    const open     = Boolean(win);
    const isActive = open && win?.id === activeId;
    return { app, open, isActive };
  }), [windows, activeId]);

  const count = appStates.length;

  /* Continuous mouse-position bell-curve magnification */
  const scales = useMemo(() => {
    if (mouseX === null || !containerRef.current) return Array(count).fill(1);
    if (typeof window !== "undefined" && window.matchMedia?.("(prefers-reduced-motion: reduce)").matches) {
      return Array(count).fill(1);
    }
    const rect = containerRef.current.getBoundingClientRect();
    const iconW = rect.width / count;
    const radius = Math.max(140, iconW * 2.8);
    return appStates.map((_, i) => {
      const centerX = rect.left + iconW * i + iconW / 2;
      const dist = Math.abs(mouseX - centerX);
      if (dist >= radius) return 1;
      const cosine = (1 + Math.cos((Math.PI * dist) / radius)) / 2;
      return 1 + 0.48 * cosine; // Smooth continuous 1.48 peak scale
    });
  }, [mouseX, count, appStates]);

  const isAwakened = mouseX !== null;

  return (
    <motion.div
      initial={{ y: 120, opacity: 0 }}
      animate={{ y: 0, opacity: 1 }}
      transition={{ delay: 0.25, type: "spring", damping: 22, stiffness: 220 }}
      className="absolute left-0 right-0 bottom-4 z-40 flex justify-center pointer-events-none"
      data-testid="dock-root"
    >
      <div
        ref={containerRef}
        onMouseMove={handleMouseMove}
        onMouseLeave={handleMouseLeave}
        className={`pointer-events-auto flex items-end ${isTablet ? "gap-1" : "gap-2"} px-4 py-3 rounded-2xl transition-all duration-300`}
        style={{
          background: isAwakened ? "rgba(8,12,24,0.88)" : "rgba(6,8,15,0.65)",
          backdropFilter: "blur(36px) saturate(210%)",
          WebkitBackdropFilter: "blur(36px) saturate(210%)",
          border: isAwakened ? "1px solid rgba(0,240,255,0.22)" : "1px solid rgba(255,255,255,0.09)",
          boxShadow: isAwakened
            ? "0 28px 70px rgba(0,0,0,0.85), inset 0 1px 0 rgba(255,255,255,0.15), 0 0 35px rgba(0,240,255,0.12)"
            : "0 20px 50px rgba(0,0,0,0.60), inset 0 1px 0 rgba(255,255,255,0.08)",
          maxWidth: "calc(100vw - 24px)",
          overflowX: "auto",
        }}
      >
        {appStates.map(({ app, open, isActive }, i) => (
          <DesktopDockIcon
            key={app.id}
            app={app}
            index={i}
            scale={scales[i]}
            isActive={isActive}
            open={open}
            openApp={openApp}
          />
        ))}
      </div>
    </motion.div>
  );
}

/* ── Export ─────────────────────────────────────────────────────────────────── */
export default function Dock() {
  const { isMobile, isTablet } = useBreakpoint();
  // Phones and tablets both use the mobile dock (fullscreen app shell)
  const isTouch = isMobile || isTablet;
  return isTouch ? <MobileDock /> : <DesktopDock isTablet={false} />;
}
