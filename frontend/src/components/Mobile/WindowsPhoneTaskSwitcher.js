import React from "react";
import { motion, AnimatePresence } from "framer-motion";
import { useOS } from "../../context/OSContext";
import { getApp } from "../../lib/apps";

export default function WindowsPhoneTaskSwitcher({ isOpen, onClose, onOpenApp }) {
  const { openWindows, activeId, closeWindow, focusWindow } = useOS();

  if (!isOpen) return null;

  return (
    <AnimatePresence>
      <motion.div
        initial={{ opacity: 0, scale: 1.05 }}
        animate={{ opacity: 1, scale: 1 }}
        exit={{ opacity: 0, scale: 0.95 }}
        transition={{ duration: 0.22, ease: "easeOut" }}
        style={{
          position: "fixed",
          inset: 0,
          background: "rgba(0,0,0,0.92)",
          backdropFilter: "blur(16px)",
          WebkitBackdropFilter: "blur(16px)",
          zIndex: 9998,
          display: "flex",
          flexDirection: "column",
          padding: "calc(20px + env(safe-area-inset-top, 0px)) 16px calc(70px + env(safe-area-inset-bottom, 0px)) 16px",
          fontFamily: "'Segoe UI', 'Outfit', sans-serif",
          boxSizing: "border-box",
        }}
        onClick={onClose}
      >
        {/* Header */}
        <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center", marginBottom: 20 }}>
          <h2 style={{ margin: 0, fontSize: 32, fontWeight: 300, color: "#ffffff", textTransform: "lowercase" }}>
            multitasking
          </h2>
          <button
            onClick={onClose}
            style={{
              background: "transparent",
              border: "none",
              color: "rgba(255,255,255,0.7)",
              fontSize: 18,
              cursor: "pointer",
            }}
          >
            <i className="fa-solid fa-xmark" />
          </button>
        </div>

        {/* Horizontal Cards Carousel */}
        {openWindows.length === 0 ? (
          <div style={{ flex: 1, display: "flex", flexDirection: "column", alignItems: "center", justifyContent: "center", color: "rgba(255,255,255,0.5)" }}>
            <i className="fa-solid fa-window-restore" style={{ fontSize: 36, marginBottom: 12, opacity: 0.4 }} />
            <div style={{ fontSize: 15 }}>No running applications</div>
          </div>
        ) : (
          <div
            style={{
              flex: 1,
              display: "flex",
              gap: 16,
              overflowX: "auto",
              padding: "10px 4px",
              alignItems: "center",
              WebkitOverflowScrolling: "touch",
            }}
            onClick={(e) => e.stopPropagation()}
          >
            {openWindows.map((win) => {
              const app = getApp(win.app) || { name: win.app, icon: "fa-window-maximize", color: "#0078D7" };
              const isActive = win.id === activeId;

              return (
                <motion.div
                  key={win.id}
                  whileTap={{ scale: 0.96 }}
                  onClick={() => {
                    focusWindow(win.id);
                    onClose();
                  }}
                  style={{
                    width: 220,
                    height: 360,
                    flexShrink: 0,
                    background: "#0c0e18",
                    border: `2px solid ${isActive ? "#00A4EF" : "rgba(255,255,255,0.18)"}`,
                    borderRadius: 3,
                    display: "flex",
                    flexDirection: "column",
                    overflow: "hidden",
                    cursor: "pointer",
                    boxShadow: "0 8px 30px rgba(0,0,0,0.7)",
                    position: "relative",
                  }}
                >
                  {/* Card Titlebar */}
                  <div
                    style={{
                      padding: "10px 12px",
                      background: app.color || "#0078D7",
                      display: "flex",
                      alignItems: "center",
                      justifyContent: "space-between",
                      color: "#ffffff",
                    }}
                  >
                    <div style={{ display: "flex", alignItems: "center", gap: 8, overflow: "hidden" }}>
                      <i className={`fa-solid ${app.icon}`} style={{ fontSize: 13 }} />
                      <span style={{ fontSize: 13, fontWeight: 600, whiteSpace: "nowrap", overflow: "hidden", textOverflow: "ellipsis" }}>
                        {app.name}
                      </span>
                    </div>

                    <button
                      onClick={(e) => {
                        e.stopPropagation();
                        closeWindow(win.id);
                      }}
                      style={{
                        background: "rgba(0,0,0,0.3)",
                        border: "none",
                        color: "#ffffff",
                        width: 24,
                        height: 24,
                        borderRadius: "50%",
                        display: "flex",
                        alignItems: "center",
                        justifyContent: "center",
                        cursor: "pointer",
                      }}
                    >
                      <i className="fa-solid fa-xmark" style={{ fontSize: 10 }} />
                    </button>
                  </div>

                  {/* Card Body Preview Placeholder */}
                  <div
                    style={{
                      flex: 1,
                      display: "flex",
                      flexDirection: "column",
                      alignItems: "center",
                      justifyContent: "center",
                      gap: 12,
                      padding: 16,
                      background: "radial-gradient(ellipse at center, rgba(255,255,255,0.03) 0%, transparent 80%)",
                    }}
                  >
                    <i
                      className={`fa-solid ${app.icon}`}
                      style={{ fontSize: 48, color: app.color || "#0078D7", opacity: 0.8 }}
                    />
                    <span style={{ fontSize: 12, color: "rgba(255,255,255,0.6)" }}>Tap to switch</span>
                  </div>
                </motion.div>
              );
            })}
          </div>
        )}
      </motion.div>
    </AnimatePresence>
  );
}
