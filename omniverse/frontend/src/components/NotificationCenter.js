import React from "react";
import { AnimatePresence, motion } from "framer-motion";
import { useOS } from "../context/OSContext";

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

const STAGGER = { staggerChildren: 0.055, delayChildren: 0.05 };
const ITEM_V  = {
  hidden:  { opacity: 0, x: 28, scale: 0.96 },
  show:    { opacity: 1, x: 0,  scale: 1, transition: { type: "spring", stiffness: 340, damping: 26 } },
  exit:    { opacity: 0, x: 20, scale: 0.96, transition: { duration: 0.18 } },
};

export default function NotificationCenter() {
  const { notifOpen, setNotifOpen, notifications, clearNotifications } = useOS();

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
            initial={{ x: 360, opacity: 0 }}
            animate={{ x: 0, opacity: 1 }}
            exit={{ x: 360, opacity: 0 }}
            transition={{ type: "spring", stiffness: 320, damping: 28, mass: 0.35 }}
            onClick={(e) => e.stopPropagation()}
            className="absolute right-3 top-12 bottom-3 w-80 rounded-2xl overflow-hidden flex flex-col"
            style={{
              background: "rgba(6,8,16,0.95)",
              backdropFilter: "blur(40px) saturate(180%)",
              WebkitBackdropFilter: "blur(40px) saturate(180%)",
              border: "1px solid rgba(255,255,255,0.09)",
              boxShadow: "0 24px 80px rgba(0,0,0,0.75), 0 0 0 1px rgba(0,240,255,0.05)",
            }}
          >
            {/* Header */}
            <div style={{
              display: "flex", alignItems: "center", justifyContent: "space-between",
              padding: "14px 16px 12px",
              borderBottom: "1px solid rgba(255,255,255,0.07)",
              flexShrink: 0,
            }}>
              <div>
                <div style={{ fontFamily: "'Unbounded', sans-serif", fontWeight: 700, color: "#fff", fontSize: 14 }}>
                  Notifications
                </div>
                <div style={{ fontFamily: "monospace", fontSize: 9, letterSpacing: "0.18em", color: "rgba(0,240,255,0.5)", textTransform: "uppercase", marginTop: 2 }}>
                  // {notifications.length} pending
                </div>
              </div>
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
            </div>

            {/* List */}
            <div style={{ flex: 1, overflowY: "auto", padding: "10px 10px 12px", WebkitOverflowScrolling: "touch" }}>
              {notifications.length === 0 && (
                <motion.div
                  initial={{ opacity: 0, y: 12 }}
                  animate={{ opacity: 1, y: 0 }}
                  transition={{ delay: 0.15 }}
                  style={{ textAlign: "center", paddingTop: 60, color: "rgba(255,255,255,0.25)" }}
                >
                  <i className="fa-regular fa-bell-slash" style={{ fontSize: 36, display: "block", marginBottom: 12, opacity: 0.3 }} />
                  <div style={{ fontSize: 13, fontFamily: "'Outfit', sans-serif" }}>All quiet on the network.</div>
                </motion.div>
              )}

              <motion.div
                variants={STAGGER}
                initial="hidden"
                animate="show"
                style={{ display: "flex", flexDirection: "column", gap: 8 }}
              >
                {notifications.map((n) => {
                  const color = getColor(n.type);
                  const icon  = getIcon(n.type);
                  return (
                    <motion.div
                      key={n.id}
                      variants={ITEM_V}
                      layout
                      style={{
                        padding: "10px 12px",
                        borderRadius: 12,
                        background: "rgba(255,255,255,0.04)",
                        border: `1px solid ${color}22`,
                        boxShadow: `inset 0 0 0 1px ${color}0A`,
                      }}
                    >
                      <div style={{ display: "flex", alignItems: "center", gap: 8, marginBottom: 4 }}>
                        <i
                          className={`fa-solid ${icon}`}
                          style={{ color, fontSize: 10, flexShrink: 0, filter: `drop-shadow(0 0 4px ${color}80)` }}
                        />
                        <div style={{ fontSize: 12.5, fontWeight: 600, color: "#fff", flex: 1 }}>
                          {n.title}
                        </div>
                      </div>
                      <div style={{ fontSize: 11.5, color: "rgba(255,255,255,0.5)", paddingLeft: 18, lineHeight: 1.4 }}>
                        {n.message}
                      </div>
                      <div style={{
                        fontFamily: "monospace", fontSize: 9.5,
                        color: "rgba(255,255,255,0.22)", paddingLeft: 18,
                        marginTop: 5, letterSpacing: "0.05em",
                      }}>
                        {new Date(n.time).toLocaleTimeString([], { hour: "2-digit", minute: "2-digit" })}
                      </div>
                    </motion.div>
                  );
                })}
              </motion.div>
            </div>
          </motion.div>
        </motion.div>
      )}
    </AnimatePresence>
  );
}
