import React, { useState, useRef, useCallback, useMemo, memo } from "react";
import { motion, AnimatePresence, useAnimate } from "framer-motion";
import { useOS } from "../context/OSContext";
import { APPS } from "../lib/apps";
import { useBreakpoint } from "../hooks/useBreakpoint";
import { playClick } from "../lib/soundEngine";
import { PINNED_APP_IDS } from "./MobileHomeScreen";

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
        <div
          className="flex items-center justify-center"
          style={{
            width: 44, height: 44, borderRadius: 12,
            background: isActive ? `${app.color}18` : "rgba(255,255,255,0.06)",
            border: isActive ? `1.5px solid ${app.color}40` : "1px solid rgba(255,255,255,0.06)",
            transition: "background 0.22s ease, border-color 0.22s ease",
          }}
        >
          <i
            className={`fa-solid ${app.icon}`}
            style={{
              color: app.color, fontSize: 20,
              filter: isActive
                ? `drop-shadow(0 0 7px ${app.color}) drop-shadow(0 0 14px ${app.color}60)`
                : "none",
              transition: "filter 0.22s ease",
            }}
          />
        </div>

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

function MobileDock() {
  const { openApp, closeWindow, windows, activeId, focusWindow } = useOS();

  const pinnedApps = useMemo(
    () => APPS.filter((a) => PINNED_APP_IDS.includes(a.id))
         .sort((a, b) => PINNED_APP_IDS.indexOf(a.id) - PINNED_APP_IDS.indexOf(b.id)),
    []
  );

  return (
    <motion.div
      initial={{ y: 120, opacity: 0 }}
      animate={{ y: 0, opacity: 1 }}
      transition={{ delay: 0.20, type: "spring", damping: 22, stiffness: 220 }}
      className="absolute left-0 right-0 bottom-0 z-40 pointer-events-none"
      data-testid="dock-root"
      style={{ paddingBottom: "env(safe-area-inset-bottom, 0px)" }}
    >
      <div
        style={{
          background: "rgba(6,8,14,0.88)",
          backdropFilter: "blur(48px) saturate(220%)",
          WebkitBackdropFilter: "blur(48px) saturate(220%)",
          borderTop: "1px solid rgba(255,255,255,0.09)",
          boxShadow: "0 -12px 48px rgba(0,0,0,0.60), inset 0 1px 0 rgba(255,255,255,0.07)",
          minHeight: 88,
          paddingTop: 8,
          paddingBottom: "calc(8px + env(safe-area-inset-bottom, 0px))",
          paddingLeft: 16,
          paddingRight: 16,
          display: "flex",
          alignItems: "center",
          justifyContent: "space-around",
          pointerEvents: "auto",
        }}
      >
        {pinnedApps.map((app) => (
          <MobileDockIcon
            key={app.id} app={app}
            windows={windows} activeId={activeId}
            openApp={openApp} focusWindow={focusWindow} closeWindow={closeWindow}
          />
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
          initial={{ opacity: 0, y: 4, scale: 0.90 }}
          animate={{ opacity: 1, y: 0, scale: 1 }}
          exit={{ opacity: 0, y: 4, scale: 0.90 }}
          transition={{ duration: 0.12, ease: "easeOut" }}
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

/* Magnification scale helper extracted so it's recomputed only when deps change */
function useScale(index, hoverIndex) {
  return useMemo(() => {
    if (hoverIndex === null) return 1;
    const d = Math.abs(index - hoverIndex);
    if (d === 0) return 1.42;
    if (d === 1) return 1.22;
    if (d === 2) return 1.08;
    return 1;
  }, [index, hoverIndex]);
}

const DesktopDockIcon = memo(function DesktopDockIcon({
  app, index, hoverIndex, isActive, open, onHover, onLeave, openApp,
}) {
  const [scope, animateScope] = useAnimate();
  const [tooltipVisible, setTooltipVisible] = useState(false);
  const scale = useScale(index, hoverIndex);

  const handleClick = useCallback(async () => {
    playClick();
    await animateScope(scope.current, {
      scale: [1, 0.80, 1.24, 0.94, 1.04, 1],
      y:     [0,  6,   -8,   2,   -2,   0],
    }, {
      duration: 0.46,
      ease: "easeOut",
      times: [0, 0.14, 0.40, 0.64, 0.82, 1],
    });
    openApp(app.id);
  }, [animateScope, scope, openApp, app.id]);

  const handleMouseEnter = useCallback(() => {
    onHover(index);
    setTooltipVisible(true);
  }, [onHover, index]);

  const handleMouseLeave = useCallback(() => {
    onLeave();
    setTooltipVisible(false);
  }, [onLeave]);

  /* Per-app glow ring color */
  const ringStyle = useMemo(() => ({
    boxShadow: `0 0 0 1.5px ${app.color}45, 0 0 18px ${app.color}28, 0 0 36px ${app.color}12`,
  }), [app.color]);

  return (
    <motion.button
      ref={scope}
      data-testid={`dock-item-${app.id}`}
      onMouseEnter={handleMouseEnter}
      onMouseLeave={handleMouseLeave}
      onClick={handleClick}
      animate={{ scale }}
      transition={{ type: "spring", stiffness: 350, damping: 20, mass: 0.35 }}
      className="group relative flex-shrink-0"
      style={{
        width: 44, height: 44,
        display: "flex", alignItems: "center", justifyContent: "center",
        borderRadius: 12,
        background: isActive ? `${app.color}12` : "transparent",
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
        className={`fa-solid ${app.icon} text-base`}
        style={{
          color: app.color,
          filter: isActive
            ? `drop-shadow(0 0 7px ${app.color}) drop-shadow(0 0 14px ${app.color}55)`
            : `drop-shadow(0 0 3px ${app.color}30)`,
          transition: "filter 0.22s ease",
        }}
      />

      {/* Running indicator — pill for active, dot for background */}
      {open && (
        <motion.span
          layoutId={`running-dot-${app.id}`}
          className="absolute rounded-full"
          style={{
            bottom: -5, left: "50%", x: "-50%",
            width: isActive ? 8 : 4,
            height: isActive ? 4 : 4,
            borderRadius: 2,
            background: isActive ? app.color : "rgba(0,240,255,0.55)",
            boxShadow: isActive
              ? `0 0 10px ${app.color}BB, 0 0 20px ${app.color}44`
              : "0 0 6px rgba(0,240,255,0.4)",
            transition: "width 0.28s cubic-bezier(0.34,1.56,0.64,1), background 0.22s ease, box-shadow 0.22s ease",
          }}
        />
      )}

      <DockTooltip name={app.name} visible={tooltipVisible} />
    </motion.button>
  );
});

function DesktopDock({ isTablet }) {
  const { openApp, windows, activeId } = useOS();
  const [hoverIndex, setHoverIndex] = useState(null);

  /* Stable onLeave so memo'd DesktopDockIcon only re-renders when needed */
  const onLeave = useCallback(() => setHoverIndex(null), []);

  /* Pre-compute per-app state so the expensive find() isn't inside render */
  const appStates = useMemo(() => APPS.map((app) => {
    const win      = windows.find((w) => w.app === app.id);
    const open     = Boolean(win);
    const isActive = open && win?.id === activeId;
    return { app, open, isActive };
  }), [windows, activeId]);

  return (
    <motion.div
      initial={{ y: 120, opacity: 0 }}
      animate={{ y: 0, opacity: 1 }}
      transition={{ delay: 0.25, type: "spring", damping: 22, stiffness: 220 }}
      className="absolute left-0 right-0 bottom-4 z-40 flex justify-center pointer-events-none"
      data-testid="dock-root"
    >
      <div
        className={`pointer-events-auto flex items-end ${isTablet ? "gap-1" : "gap-1.5"} px-3 py-2.5 rounded-2xl`}
        style={{
          background: "rgba(7,9,15,0.60)",
          backdropFilter: "blur(32px) saturate(190%)",
          WebkitBackdropFilter: "blur(32px) saturate(190%)",
          border: "1px solid rgba(255,255,255,0.09)",
          boxShadow: "0 24px 64px rgba(0,0,0,0.60), inset 0 1px 0 rgba(255,255,255,0.09), 0 0 0 1px rgba(0,240,255,0.04)",
          maxWidth: "calc(100vw - 16px)",
        }}
        onMouseLeave={onLeave}
      >
        {appStates.map(({ app, open, isActive }, i) => (
          <DesktopDockIcon
            key={app.id}
            app={app}
            index={i}
            hoverIndex={hoverIndex}
            isActive={isActive}
            open={open}
            onHover={setHoverIndex}
            onLeave={onLeave}
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
  return isMobile ? <MobileDock /> : <DesktopDock isTablet={isTablet} />;
}
