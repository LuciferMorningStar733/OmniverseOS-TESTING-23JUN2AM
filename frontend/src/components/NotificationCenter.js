import React, { useCallback } from "react";
import { AnimatePresence, motion } from "framer-motion";
import { useOS } from "../context/OSContext";
import { useBreakpoint } from "../hooks/useBreakpoint";

const TYPE_COLOR = {
  error:   "#FF003C",
  danger:  "#FF003C",
  warning: "#F59E0B",
  success: "#39FF14",
  info:    "#00F0FF",
};

function getColor(type) {
  return TYPE_COLOR[type] || "#00F0FF";
}

function getIcon(type) {
  if (type === "error" || type === "danger") return "fa-circle-exclamation";
  if (type === "warning")  return "fa-triangle-exclamation";
  if (type === "success")  return "fa-circle-check";
  return "fa-circle-info";
}

const ACTION_COLOR = {
  open_app:     "#00F0FF",
  open_url:     "#A855F7",
  reply_cortex: "#39FF14",
  dismiss:      "#FF003C",
};

const STAGGER = { staggerChildren: 0.055, delayChildren: 0.05 };
const ITEM_V  = {
  hidden:  { opacity: 0, x: 28, scale: 0.96 },
  show:    { opacity: 1, x: 0,  scale: 1, transition: { type: "spring", stiffness: 340, damping: 26 } },
  exit:    { opacity: 0, x: 40, scale: 0.94, transition: { duration: 0.18 } },
};

function NotifAction({ action, onDismiss, nId, openApp, setNotifOpen }) {
  const color = ACTION_COLOR[action.type] || "#00F0FF";

  const handleClick = useCallback(() => {
    try {
      switch (action.type) {
        case "open_app":
          openApp?.(action.payload);
          setNotifOpen?.(false);
          break;
        case "open_url":
          openApp?.("browser");
          window.dispatchEvent(new CustomEvent("cortex:navigate", { detail: { url: action.payload } }));
          setNotifOpen?.(false);
          break;
        case "reply_cortex":
          openApp?.("chat");
          setNotifOpen?.(false);
          break;
        case "dismiss":
          onDismiss(nId);
          break;
        default:
          break;
      }
    } catch { /* silent */ }
  }, [action, nId, onDismiss, openApp, setNotifOpen]);

  return (
    <button
      onClick={handleClick}
      style={{
        padding: "3px 10px",
        borderRadius: 6,
        fontSize: 10.5,
        fontFamily: "'JetBrains Mono', monospace",
        border: `1px solid ${color}30`,
        background: `${color}0e`,
        color: color,
        cursor: "pointer",
        transition: "all 0.15s",
        display: "flex",
        alignItems: "center",
        gap: 4,
        WebkitTapHighlightColor: "transparent",
        flexShrink: 0,
      }}
      onMouseEnter={(e) => { e.currentTarget.style.background = `${color}20`; e.currentTarget.style.borderColor = `${color}60`; }}
      onMouseLeave={(e) => { e.currentTarget.style.background = `${color}0e`; e.currentTarget.style.borderColor = `${color}30`; }}
    >
      {action.type === "open_app" && <i className="fa-solid fa-arrow-up-right-from-square" style={{ fontSize: 8 }} />}
      {action.type === "open_url" && <i className="fa-solid fa-link" style={{ fontSize: 8 }} />}
      {action.type === "reply_cortex" && <i className="fa-solid fa-wand-magic-sparkles" style={{ fontSize: 8 }} />}
      {action.label}
    </button>
  );
}

function NotifCard({ n, onDismiss, openApp, setNotifOpen }) {
  const color = getColor(n.type);
  const icon  = getIcon(n.type);
  const hasActions = Array.isArray(n.actions) && n.actions.length > 0;

  return (
    <motion.div
      variants={ITEM_V}
      layout
      exit={{ opacity: 0, x: 60, scale: 0.94, transition: { duration: 0.20 } }}
      style={{
        padding: "10px 12px",
        borderRadius: 12,
        background: "rgba(255,255,255,0.04)",
        border: `1px solid ${color}22`,
        boxShadow: `inset 0 0 0 1px ${color}0A`,
        position: "relative",
      }}
    >
      <div style={{ display: "flex", alignItems: "flex-start", gap: 8 }}>
        <i
          className={`fa-solid ${icon}`}
          style={{ color, fontSize: 10, flexShrink: 0, marginTop: 3, filter: `drop-shadow(0 0 4px ${color}80)` }}
        />
        <div style={{ flex: 1, minWidth: 0 }}>
          <div style={{ fontSize: 12.5, fontWeight: 600, color: "#fff", marginBottom: 3, paddingRight: 24 }}>
            {n.title}
          </div>
          <div style={{ fontSize: 11.5, color: "rgba(255,255,255,0.5)", lineHeight: 1.4 }}>
            {n.message}
          </div>
          <div style={{ fontFamily: "monospace", fontSize: 9.5, color: "rgba(255,255,255,0.22)", marginTop: 5, letterSpacing: "0.05em" }}>
            {new Date(n.time).toLocaleTimeString([], { hour: "2-digit", minute: "2-digit" })}
          </div>

          {/* Action buttons */}
          {hasActions && (
            <div style={{ display: "flex", gap: 5, marginTop: 8, flexWrap: "wrap" }}>
              {n.actions.map((action, i) => (
                <NotifAction
                  key={i}
                  action={action}
                  nId={n.id}
                  onDismiss={onDismiss}
                  openApp={openApp}
                  setNotifOpen={setNotifOpen}
                />
              ))}
            </div>
          )}
        </div>
      </div>

      <button
        onClick={() => onDismiss(n.id)}
        title="Dismiss"
        style={{
          position: "absolute", top: 8, right: 8,
          width: 20, height: 20,
          display: "flex", alignItems: "center", justifyContent: "center",
          background: "rgba(255,255,255,0.06)",
          border: "1px solid rgba(255,255,255,0.08)",
          borderRadius: 6, cursor: "pointer",
          color: "rgba(255,255,255,0.35)", fontSize: 9,
          transition: "background 0.12s, color 0.12s",
        }}
        onMouseEnter={(e) => { e.currentTarget.style.background = "rgba(255,0,60,0.18)"; e.currentTarget.style.color = "#FF6B7A"; }}
        onMouseLeave={(e) => { e.currentTarget.style.background = "rgba(255,255,255,0.06)"; e.currentTarget.style.color = "rgba(255,255,255,0.35)"; }}
      >
        <i className="fa-solid fa-xmark" />
      </button>
    </motion.div>
  );
}

export default function NotificationCenter() {
  const { notifOpen, setNotifOpen, notifications, clearNotifications, dismissNotification, openApp } = useOS();
  const { isMobile } = useBreakpoint();

  const handleDismiss = useCallback((id) => dismissNotification(id), [dismissNotification]);

  return (
    <AnimatePresence>
      {notifOpen && (
        <motion.div
          key="notif-backdrop"
          initial={{ opacity: 0 }}
          animate={{ opacity: 1 }}
          exit={{ opacity: 0 }}
          transition={{ duration: 0.18 }}
          className="absolute inset-0 z-50"
          style={{ background: "rgba(0,0,0,0.38)", backdropFilter: "blur(4px)", WebkitBackdropFilter: "blur(4px)" }}
          onClick={() => setNotifOpen(false)}
          data-testid="notification-center"
        >
            <motion.div
            key="notif-panel"
            initial={isMobile ? { y: 80, opacity: 0, scale: 0.97 } : { x: 360, opacity: 0 }}
            animate={isMobile ? { y: 0, opacity: 1, scale: 1 }    : { x: 0,   opacity: 1 }}
            exit={isMobile    ? { y: 80, opacity: 0, scale: 0.97 } : { x: 360, opacity: 0 }}
            transition={{ type: "spring", stiffness: 320, damping: 28, mass: 0.35 }}
            onClick={(e) => e.stopPropagation()}
            style={{
              position: "absolute",
              ...(isMobile
                ? { left: 8, right: 8, bottom: 8, borderRadius: 20, maxHeight: "72vh" }
                : { right: 3, top: 12, bottom: 3, width: 320, borderRadius: 20 }),
              background: "rgba(6,8,16,0.96)",
              backdropFilter: "blur(40px) saturate(180%)",
              WebkitBackdropFilter: "blur(40px) saturate(180%)",
              border: "1px solid rgba(255,255,255,0.09)",
              boxShadow: "0 24px 80px rgba(0,0,0,0.75), 0 0 0 1px rgba(0,240,255,0.05)",
              display: "flex", flexDirection: "column", overflow: "hidden",
            }}
          >
            {/* Mobile drag handle */}
            {isMobile && (
              <div style={{ width: 36, height: 4, borderRadius: 2, background: "rgba(255,255,255,0.20)", margin: "10px auto 0", flexShrink: 0 }} />
            )}

            {/* Header */}
            <div style={{
              display: "flex", alignItems: "center", justifyContent: "space-between",
              padding: isMobile ? "10px 16px 10px" : "14px 16px 12px",
              borderBottom: "1px solid rgba(255,255,255,0.07)",
              flexShrink: 0,
            }}>
              <div>
                <div style={{ fontFamily: "'Unbounded', sans-serif", fontWeight: 700, color: "#fff", fontSize: 14 }}>
                  Notifications
                </div>
                <div style={{ fontFamily: "monospace", fontSize: 9, letterSpacing: "0.18em", color: "rgba(0,240,255,0.5)", textTransform: "uppercase", marginTop: 2 }}>
                  {notifications.length > 0 ? `// ${notifications.length} pending` : "// all clear"}
                </div>
              </div>
              <div style={{ display: "flex", gap: 6, alignItems: "center" }}>
                {notifications.length > 0 && (
                  <button
                    onClick={clearNotifications}
                    style={{
                      padding: "5px 12px", borderRadius: 8, fontSize: 11,
                      border: "1px solid rgba(255,0,60,0.3)",
                      background: "rgba(255,0,60,0.07)",
                      color: "#FF6B7A",
                      cursor: "pointer", fontFamily: "monospace",
                      transition: "all 0.15s",
                    }}
                    onMouseEnter={(e) => { e.currentTarget.style.background = "rgba(255,0,60,0.18)"; }}
                    onMouseLeave={(e) => { e.currentTarget.style.background = "rgba(255,0,60,0.07)"; }}
                  >
                    Clear all
                  </button>
                )}
                <button
                  onClick={() => setNotifOpen(false)}
                  style={{
                    width: 26, height: 26, display: "flex", alignItems: "center", justifyContent: "center",
                    background: "rgba(255,255,255,0.05)", border: "1px solid rgba(255,255,255,0.09)",
                    borderRadius: 8, cursor: "pointer", color: "rgba(255,255,255,0.40)", fontSize: 10,
                    transition: "all 0.12s",
                  }}
                  onMouseEnter={(e) => { e.currentTarget.style.background = "rgba(255,255,255,0.10)"; }}
                  onMouseLeave={(e) => { e.currentTarget.style.background = "rgba(255,255,255,0.05)"; }}
                >
                  <i className="fa-solid fa-xmark" />
                </button>
              </div>
            </div>

            {/* List */}
            <div style={{ flex: 1, overflowY: "auto", padding: "10px 10px 12px", WebkitOverflowScrolling: "touch" }}>
              <AnimatePresence>
                {notifications.length === 0 && (
                  <motion.div
                    key="empty"
                    initial={{ opacity: 0, y: 12 }}
                    animate={{ opacity: 1, y: 0 }}
                    exit={{ opacity: 0 }}
                    transition={{ delay: 0.15 }}
                    style={{ textAlign: "center", paddingTop: 48, color: "rgba(255,255,255,0.25)" }}
                  >
                    <motion.i
                      className="fa-regular fa-bell-slash"
                      animate={{ opacity: [0.2, 0.4, 0.2] }}
                      transition={{ duration: 3, repeat: Infinity }}
                      style={{ fontSize: 36, display: "block", marginBottom: 12 }}
                    />
                    <div style={{ fontSize: 13, fontFamily: "'Outfit', sans-serif", marginBottom: 4 }}>All quiet on the network.</div>
                    <div style={{ fontSize: 10, fontFamily: "monospace", letterSpacing: "0.12em", color: "rgba(0,240,255,0.3)" }}>NO PENDING ALERTS</div>
                  </motion.div>
                )}
              </AnimatePresence>

              <AnimatePresence mode="popLayout">
                <motion.div variants={STAGGER} initial="hidden" animate="show" style={{ display: "flex", flexDirection: "column", gap: 8 }}>
                  {notifications.map((n) => (
                    <NotifCard
                      key={n.id}
                      n={n}
                      onDismiss={handleDismiss}
                      openApp={openApp}
                      setNotifOpen={setNotifOpen}
                    />
                  ))}
                </motion.div>
              </AnimatePresence>
            </div>
          </motion.div>
        </motion.div>
      )}
    </AnimatePresence>
  );
}
