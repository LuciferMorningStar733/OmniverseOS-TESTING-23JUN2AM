import React, { useState, useRef, useEffect, useCallback, memo } from "react";
import { motion, AnimatePresence, useAnimate } from "framer-motion";
import { useOS } from "../context/OSContext";
import { APPS } from "../lib/apps";
import { useBreakpoint } from "../hooks/useBreakpoint";

/* ── Long-press quick-action menu ─────────────────────────────────────────── */

const QuickMenu = memo(function QuickMenu({ appId, x, y, onClose, onOpen, onCloseApp, isOpen }) {
  const app = APPS.find((a) => a.id === appId);
  if (!app) return null;

  return (
    <>
      {/* Backdrop */}
      <div
        onClick={onClose}
        style={{
          position: "fixed", inset: 0, zIndex: 9990,
          background: "rgba(0,0,0,0.35)",
          backdropFilter: "blur(4px)",
          WebkitBackdropFilter: "blur(4px)",
        }}
      />

      {/* Menu */}
      <motion.div
        initial={{ opacity: 0, scale: 0.88, y: 8 }}
        animate={{ opacity: 1, scale: 1,    y: 0 }}
        exit={{ opacity: 0, scale: 0.88, y: 8 }}
        transition={{ type: "spring", damping: 24, stiffness: 380, mass: 0.35 }}
        style={{
          position: "fixed",
          left: Math.min(x - 80, window.innerWidth - 176),
          top: Math.max(y - 160, 80),
          zIndex: 9991,
          width: 160,
          borderRadius: 16,
          background: "rgba(12,14,22,0.92)",
          border: "1px solid rgba(255,255,255,0.12)",
          boxShadow: "0 24px 60px rgba(0,0,0,0.7), 0 0 0 1px rgba(0,240,255,0.06)",
          backdropFilter: "blur(28px)",
          WebkitBackdropFilter: "blur(28px)",
          overflow: "hidden",
        }}
      >
        {/* App header */}
        <div style={{
          padding: "12px 14px 10px",
          borderBottom: "1px solid rgba(255,255,255,0.08)",
          display: "flex", alignItems: "center", gap: 8,
        }}>
          <i className={`fa-solid ${app.icon}`} style={{ color: app.color, fontSize: 14 }} />
          <span style={{ fontSize: 13, fontWeight: 700, color: "#fff", fontFamily: "'Outfit', sans-serif" }}>
            {app.name}
          </span>
        </div>

        {/* Actions */}
        {isOpen ? (
          <>
            <QuickAction icon="fa-arrow-up-right-from-square" label="Bring to front" color="#00F0FF" onClick={onOpen} />
            <QuickAction icon="fa-xmark"                      label="Close app"      color="#FF003C" onClick={onCloseApp} danger />
          </>
        ) : (
          <QuickAction icon="fa-play" label="Open app" color="#39FF14" onClick={onOpen} />
        )}
      </motion.div>
    </>
  );
});

function QuickAction({ icon, label, color, onClick, danger }) {
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
          ? danger ? "rgba(255,0,60,0.15)" : "rgba(255,255,255,0.07)"
          : "transparent",
        border: "none", cursor: "pointer",
        transition: "background 0.12s ease",
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
}

/* ── Mobile dock ───────────────────────────────────────────────────────────── */

function MobileDockIcon({ app, windows, activeId, openApp, focusWindow, closeWindow }) {
  const [scope, animate] = useAnimate();
  const pressTimerRef  = useRef(null);
  const didLongPress   = useRef(false);
  const [quickMenu, setQuickMenu] = useState(null);

  const win      = windows.find((w) => w.app === app.id);
  const open     = Boolean(win);
  const isActive = open && win?.id === activeId;

  const handleTouchStart = useCallback((e) => {
    didLongPress.current = false;
    const touch = e.touches[0];
    const rect  = e.currentTarget.getBoundingClientRect();
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
    if (!didLongPress.current) {
      // Bounce launch animation
      animate(scope.current, { scale: [1, 0.78, 1.12, 0.96, 1], y: [0, 4, -4, 2, 0] }, {
        duration: 0.42,
        ease: "easeOut",
        times: [0, 0.2, 0.55, 0.8, 1],
      });
      openApp(app.id);
    }
  }, [animate, scope, openApp, app.id]);

  const handleTouchMove = useCallback(() => {
    clearTimeout(pressTimerRef.current);
  }, []);

  return (
    <>
      <motion.button
        ref={scope}
        data-testid={`dock-item-${app.id}`}
        onTouchStart={handleTouchStart}
        onTouchEnd={handleTouchEnd}
        onTouchMove={handleTouchMove}
        onClick={() => {}}
        whileTap={{ scale: 0.78, y: 4 }}
        transition={{ type: "spring", stiffness: 420, damping: 14, mass: 0.25 }}
        className="relative flex-shrink-0 flex flex-col items-center justify-center select-none"
        style={{
          width: 64, height: 64,
          minWidth: 56, minHeight: 56,
          borderRadius: 14,
          background: isActive ? "rgba(0,240,255,0.12)" : "transparent",
          boxShadow: isActive ? "0 0 0 1.5px rgba(0,240,255,0.35), 0 0 20px rgba(0,240,255,0.15)" : "none",
          transition: "background 0.2s, box-shadow 0.2s",
          WebkitTapHighlightColor: "transparent",
          touchAction: "none",
          userSelect: "none",
          willChange: "transform",
        }}
      >
        {/* Icon well */}
        <div
          className="flex items-center justify-center"
          style={{
            width: 40, height: 40, borderRadius: 10,
            background: isActive ? `${app.color}18` : "rgba(255,255,255,0.05)",
            transition: "background 0.2s",
          }}
        >
          <i
            className={`fa-solid ${app.icon}`}
            style={{
              color: app.color, fontSize: 20,
              filter: isActive ? `drop-shadow(0 0 6px ${app.color})` : "none",
              transition: "filter 0.2s",
            }}
          />
        </div>

        {/* Open indicator — pill for active, dot for background */}
        {open && (
          <motion.div
            layoutId={`running-dot-${app.id}`}
            style={{
              position: "absolute", bottom: 4, left: "50%",
              transform: "translateX(-50%)",
              width: isActive ? 18 : 4, height: 3, borderRadius: 2,
              background: isActive ? "#00F0FF" : "rgba(255,255,255,0.35)",
              boxShadow: isActive ? "0 0 8px rgba(0,240,255,0.85)" : "none",
              transition: "width 0.22s ease, background 0.22s ease, box-shadow 0.22s ease",
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
}

function MobileDock() {
  const { openApp, closeWindow, windows, activeId, focusWindow } = useOS();

  return (
    <>
      <motion.div
        initial={{ y: 120, opacity: 0 }}
        animate={{ y: 0,   opacity: 1 }}
        transition={{ delay: 0.2, type: "spring", damping: 22, stiffness: 220 }}
        className="absolute left-0 right-0 bottom-0 z-40 pointer-events-none"
        data-testid="dock-root"
        style={{ paddingBottom: "env(safe-area-inset-bottom, 0px)" }}
      >
        <div
          className="pointer-events-auto w-full flex items-center justify-start"
          style={{
            background: "rgba(6,8,14,0.86)",
            backdropFilter: "blur(36px) saturate(200%)",
            WebkitBackdropFilter: "blur(36px) saturate(200%)",
            borderTop: "1px solid rgba(255,255,255,0.10)",
            boxShadow: "0 -8px 40px rgba(0,0,0,0.55), inset 0 1px 0 rgba(255,255,255,0.06)",
            minHeight: 80,
            paddingTop: 8,
            paddingBottom: 8,
            paddingLeft: 4,
            paddingRight: 4,
            overflowX: "auto",
            overflowY: "visible",
            WebkitOverflowScrolling: "touch",
            scrollbarWidth: "none",
            willChange: "transform",
          }}
        >
          {APPS.map((app) => (
            <MobileDockIcon
              key={app.id}
              app={app}
              windows={windows}
              activeId={activeId}
              openApp={openApp}
              focusWindow={focusWindow}
              closeWindow={closeWindow}
            />
          ))}
        </div>
      </motion.div>
    </>
  );
}

/* ── Desktop dock ──────────────────────────────────────────────────────────── */

function DesktopDockIcon({ app, index, hoverId, isActive, open, onHover, onClick }) {
  const [scope, animate] = useAnimate();

  const scale = (() => {
    if (!hoverId) return 1;
    const hoverIndex = APPS.findIndex((a) => a.id === hoverId);
    const d = Math.abs(index - hoverIndex);
    if (d === 0) return 1.38;
    if (d === 1) return 1.20;
    if (d === 2) return 1.07;
    return 1;
  })();

  const handleClick = useCallback(async () => {
    // Bounce: squish down → pop up → settle
    await animate(scope.current, {
      scale: [1, 0.82, 1.22, 0.95, 1.05, 1],
      y:     [0,  5,   -8,   2,   -2,   0],
    }, {
      duration: 0.48,
      ease: "easeOut",
      times: [0, 0.15, 0.40, 0.65, 0.82, 1],
    });
    onClick();
  }, [animate, scope, onClick]);

  return (
    <motion.button
      ref={scope}
      data-testid={`dock-item-${app.id}`}
      onMouseEnter={() => onHover(app.id)}
      onClick={handleClick}
      animate={{ scale }}
      transition={{ type: "spring", stiffness: 320, damping: 18, mass: 0.4 }}
      className="group relative flex-shrink-0"
      style={{
        width: 44, height: 44,
        display: "flex", alignItems: "center", justifyContent: "center",
        borderRadius: 12,
        background: isActive ? "rgba(0,240,255,0.10)" : "transparent",
        transformOrigin: "bottom center",
        cursor: "pointer",
        border: "none",
        outline: "none",
        padding: 0,
      }}
      title={app.name}
    >
      {/* Glow ring on active */}
      {isActive && (
        <motion.div
          layoutId={`active-ring-${app.id}`}
          className="absolute inset-0 rounded-xl"
          style={{ boxShadow: `0 0 0 1.5px ${app.color}40, 0 0 14px ${app.color}25` }}
        />
      )}

      <i
        className={`fa-solid ${app.icon} text-base`}
        style={{
          color: app.color,
          filter: isActive ? `drop-shadow(0 0 6px ${app.color})` : "none",
          transition: "filter 0.2s",
        }}
      />

      {/* Running dot / active pill */}
      {open && (
        <motion.span
          layoutId={`running-dot-${app.id}`}
          className="absolute -bottom-1 left-1/2 -translate-x-1/2 rounded-full"
          style={{
            width: isActive ? 6 : 4, height: isActive ? 6 : 4,
            background: isActive ? "#FF003C" : "#00F0FF",
            boxShadow: isActive ? "0 0 10px rgba(255,0,60,0.7)" : "0 0 8px rgba(0,240,255,0.5)",
            transition: "width 0.2s, height 0.2s, background 0.2s",
          }}
        />
      )}

      {/* Tooltip */}
      <span className="pointer-events-none absolute -top-10 left-1/2 -translate-x-1/2 opacity-0 group-hover:opacity-100 transition-opacity duration-150 bg-black/90 border border-white/10 px-2.5 py-1 rounded-md text-[11px] font-mono whitespace-nowrap text-white">
        {app.name}
      </span>
    </motion.button>
  );
}

function DesktopDock({ isTablet }) {
  const { openApp, windows, activeId } = useOS();
  const [hoverId, setHoverId]          = useState(null);

  const dockGap  = isTablet ? "gap-1" : "gap-1.5";
  const dockPad  = "px-3 py-2";

  return (
    <motion.div
      initial={{ y: 120, opacity: 0 }}
      animate={{ y: 0,   opacity: 1 }}
      transition={{ delay: 0.25, type: "spring", damping: 22, stiffness: 220 }}
      className="absolute left-0 right-0 bottom-4 z-40 flex justify-center pointer-events-none"
      data-testid="dock-root"
    >
      <div
        className={`pointer-events-auto flex items-end ${dockGap} ${dockPad} rounded-2xl`}
        style={{
          background: "rgba(8,10,16,0.55)",
          backdropFilter: "blur(28px) saturate(180%)",
          WebkitBackdropFilter: "blur(28px) saturate(180%)",
          border: "1px solid rgba(255,255,255,0.08)",
          boxShadow: "0 24px 60px rgba(0,0,0,0.55), inset 0 1px 0 rgba(255,255,255,0.08), 0 0 0 1px rgba(0,240,255,0.04)",
          maxWidth: "calc(100vw - 16px)",
        }}
        onMouseLeave={() => setHoverId(null)}
      >
        {APPS.map((app, i) => {
          const win      = windows.find((w) => w.app === app.id);
          const open     = Boolean(win);
          const isActive = open && win?.id === activeId;

          return (
            <DesktopDockIcon
              key={app.id}
              app={app}
              index={i}
              hoverId={hoverId}
              isActive={isActive}
              open={open}
              onHover={setHoverId}
              onClick={() => openApp(app.id)}
            />
          );
        })}
      </div>
    </motion.div>
  );
}

/* ── Export ────────────────────────────────────────────────────────────────── */

export default function Dock() {
  const { isMobile, isTablet } = useBreakpoint();
  return isMobile ? <MobileDock /> : <DesktopDock isTablet={isTablet} />;
}
