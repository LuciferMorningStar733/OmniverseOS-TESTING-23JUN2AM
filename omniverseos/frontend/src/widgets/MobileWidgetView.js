import React, { Suspense, useCallback, useState, useMemo } from "react";
import { motion, AnimatePresence } from "framer-motion";
import { useWidgetManager } from "./WidgetManagerContext";
import { getWidgetDef } from "./widgetRegistry";
import WidgetStore from "./WidgetStore";
import ErrorBoundary from "../components/ErrorBoundary";

const GLASS = {
  background: "rgba(8, 10, 20, 0.72)",
  backdropFilter: "blur(32px) saturate(180%)",
  WebkitBackdropFilter: "blur(32px) saturate(180%)",
  border: "1px solid rgba(255,255,255,0.09)",
  borderRadius: 22,
  boxShadow: "0 8px 40px rgba(0,0,0,0.55), inset 0 1px 0 rgba(255,255,255,0.07)",
};

// Featured widgets for onboarding — enhanced with descriptions
const FEATURED_WIDGETS = [
  { id: "ai-command-center", name: "AI Command Center", description: "Clock · Weather · Battery · Network · AI State", icon: "fa-microchip-ai",   color: "#00F0FF" },
  { id: "cortex-living",     name: "Cortex Living AI",  description: "Living OS AI · typed messages · activity",      icon: "fa-brain",           color: "#00F0FF" },
  { id: "cortex-smart",      name: "Cortex Smart",      description: "Clock · Weather · AI Brief · Tasks",            icon: "fa-sparkles",        color: "#00F0FF" },
  { id: "chrono",            name: "Chrono-Atmo",       description: "Clock + live weather radar",                    icon: "fa-satellite-dish",  color: "#A855F7" },
  { id: "cortex",            name: "Cortex AI",         description: "Daily briefing by Cortex",                      icon: "fa-brain",           color: "#2DD4BF" },
  { id: "calendar",          name: "Calendar",          description: "Your upcoming events",                          icon: "fa-calendar",        color: "#60A5FA" },
  { id: "todo",              name: "Tasks",             description: "Your to-do list",                               icon: "fa-list-check",      color: "#39FF14" },
];

function Loader() {
  return (
    <div style={{ display: "flex", alignItems: "center", justifyContent: "center", gap: 5, padding: "20px 0" }}>
      {[0, 1, 2].map((i) => (
        <span
          key={i}
          style={{
            display: "inline-block",
            width: 5, height: 5, borderRadius: "50%",
            background: "#00F0FF",
            animation: `typingDot 1.1s ease-in-out ${i * 0.16}s infinite`,
            opacity: 0.6,
          }}
        />
      ))}
    </div>
  );
}

function MobileWidgetCard({ item, def }) {
  const { toggleCollapse, removeWidget, togglePin } = useWidgetManager();
  const [showMenu, setShowMenu] = useState(false);
  const [pressTimer, setPressTimer] = useState(null);

  const accentColor = def?.color || "#00F0FF";

  const handleTouchStart = useCallback(() => {
    const t = setTimeout(() => setShowMenu(true), 500);
    setPressTimer(t);
  }, []);

  const handleTouchEnd = useCallback(() => {
    clearTimeout(pressTimer);
  }, [pressTimer]);

  const cardHeight = item.collapsed
    ? 48
    : def
    ? Math.max(140, (item.h || def.defaultH) * 100)
    : 160;

  return (
    <motion.div
      layout
      initial={{ opacity: 0, y: 20, scale: 0.96 }}
      animate={{ opacity: 1, y: 0, scale: 1 }}
      exit={{ opacity: 0, scale: 0.92 }}
      transition={{ type: "spring", stiffness: 340, damping: 28 }}
      onTouchStart={handleTouchStart}
      onTouchEnd={handleTouchEnd}
      onTouchCancel={handleTouchEnd}
      style={{ position: "relative", marginBottom: 12, touchAction: "pan-y" }}
    >
      <div
        style={{
          ...GLASS,
          overflow: "hidden",
          height: cardHeight,
          transition: "height 0.32s cubic-bezier(0.4,0,0.2,1)",
        }}
      >
        {/* Header */}
        <div
          style={{
            display: "flex",
            alignItems: "center",
            justifyContent: "space-between",
            padding: "0 14px",
            height: 46,
            flexShrink: 0,
          }}
        >
          <div style={{ display: "flex", alignItems: "center", gap: 8 }}>
            <div
              style={{
                width: 28,
                height: 28,
                borderRadius: 8,
                background: `${accentColor}18`,
                border: `1px solid ${accentColor}30`,
                display: "flex",
                alignItems: "center",
                justifyContent: "center",
                flexShrink: 0,
              }}
            >
              <i
                className={`fa-solid ${def?.icon || "fa-square"}`}
                style={{ color: accentColor, fontSize: 11 }}
              />
            </div>
            <span
              style={{
                fontSize: 12,
                fontFamily: "'Outfit', sans-serif",
                fontWeight: 600,
                color: "rgba(255,255,255,0.85)",
                letterSpacing: "0.01em",
              }}
            >
              {def?.name || item.id}
            </span>
            {item.pinned && (
              <i className="fa-solid fa-thumbtack" style={{ fontSize: 9, color: `${accentColor}60` }} />
            )}
          </div>

          <div style={{ display: "flex", alignItems: "center", gap: 6 }}>
            <button
              onTouchEnd={(e) => { e.stopPropagation(); toggleCollapse(item.id); }}
              onClick={() => toggleCollapse(item.id)}
              style={{
                width: 28, height: 28, borderRadius: 8,
                background: "rgba(255,255,255,0.06)",
                border: "1px solid rgba(255,255,255,0.10)",
                color: "rgba(255,255,255,0.5)",
                fontSize: 10, cursor: "pointer",
                display: "flex", alignItems: "center", justifyContent: "center",
                WebkitTapHighlightColor: "transparent",
              }}
            >
              <i className={`fa-solid ${item.collapsed ? "fa-chevron-down" : "fa-chevron-up"}`} />
            </button>
          </div>
        </div>

        {/* Separator */}
        {!item.collapsed && (
          <div style={{ height: 1, background: "rgba(255,255,255,0.06)", margin: "0 14px" }} />
        )}

        {/* Widget content */}
        {!item.collapsed && (
          <div
            style={{
              position: "absolute",
              top: 47,
              left: 0,
              right: 0,
              bottom: 0,
              overflowY: "auto",
              overflowX: "hidden",
              WebkitOverflowScrolling: "touch",
            }}
          >
            <ErrorBoundary>
              <Suspense fallback={<Loader />}>
                <def.Component item={item} />
              </Suspense>
            </ErrorBoundary>
          </div>
        )}
      </div>

      {/* Long-press context menu */}
      <AnimatePresence>
        {showMenu && (
          <motion.div
            initial={{ opacity: 0, scale: 0.85, y: -8 }}
            animate={{ opacity: 1, scale: 1, y: 0 }}
            exit={{ opacity: 0, scale: 0.85, y: -8 }}
            transition={{ type: "spring", stiffness: 420, damping: 28 }}
            style={{
              position: "absolute",
              top: 50, right: 12,
              background: "rgba(10,12,22,0.96)",
              backdropFilter: "blur(32px)",
              WebkitBackdropFilter: "blur(32px)",
              border: "1px solid rgba(255,255,255,0.12)",
              borderRadius: 14,
              padding: "6px 0",
              zIndex: 200,
              minWidth: 160,
              boxShadow: "0 16px 48px rgba(0,0,0,0.7)",
            }}
          >
            {[
              {
                label: item.pinned ? "Unpin Widget" : "Pin Widget",
                icon: "fa-thumbtack",
                color: "#00F0FF",
                action: () => { togglePin(item.id); setShowMenu(false); },
              },
              {
                label: item.collapsed ? "Expand Widget" : "Collapse Widget",
                icon: item.collapsed ? "fa-chevron-down" : "fa-chevron-up",
                color: "rgba(255,255,255,0.7)",
                action: () => { toggleCollapse(item.id); setShowMenu(false); },
              },
              {
                label: "Remove Widget",
                icon: "fa-xmark",
                color: "#FF003C",
                action: () => { removeWidget(item.id); setShowMenu(false); },
              },
            ].map((item2) => (
              <button
                key={item2.label}
                onTouchEnd={(e) => { e.stopPropagation(); item2.action(); }}
                onClick={item2.action}
                style={{
                  display: "flex",
                  alignItems: "center",
                  gap: 10,
                  width: "100%",
                  padding: "10px 16px",
                  background: "transparent",
                  border: "none",
                  cursor: "pointer",
                  color: item2.color,
                  fontSize: 13,
                  fontFamily: "'Outfit', sans-serif",
                  fontWeight: 500,
                  WebkitTapHighlightColor: "transparent",
                  textAlign: "left",
                }}
              >
                <i className={`fa-solid ${item2.icon}`} style={{ fontSize: 11, width: 14, textAlign: "center" }} />
                {item2.label}
              </button>
            ))}

            {/* Dismiss tap outside */}
            <div
              style={{ position: "fixed", inset: 0, zIndex: -1 }}
              onTouchEnd={() => setShowMenu(false)}
              onClick={() => setShowMenu(false)}
            />
          </motion.div>
        )}
      </AnimatePresence>
    </motion.div>
  );
}

// ── Featured Widget Card for Onboarding ────────────────────────────────────────

function FeaturedWidgetCard({ widget, onAddWidget, delay }) {
  const [pressed, setPressed] = useState(false);

  return (
    <motion.div
      initial={{ opacity: 0, y: 16, scale: 0.92 }}
      animate={{ opacity: 1, y: 0, scale: 1 }}
      transition={{ delay, type: "spring", damping: 26, stiffness: 320 }}
    >
      <motion.button
        onPointerDown={() => setPressed(true)}
        onPointerUp={() => { setPressed(false); onAddWidget(widget.id); }}
        onPointerLeave={() => setPressed(false)}
        animate={{ scale: pressed ? 0.96 : 1 }}
        transition={{ type: "spring", stiffness: 600, damping: 22, mass: 0.16 }}
        onClick={() => onAddWidget(widget.id)}
        style={{
          width: "100%",
          display: "flex",
          alignItems: "center",
          gap: 14,
          padding: "14px 16px",
          borderRadius: 16,
          background: `linear-gradient(135deg, ${widget.color}12 0%, ${widget.color}04 100%)`,
          border: `1px solid ${widget.color}24`,
          cursor: "pointer",
          WebkitTapHighlightColor: "transparent",
          touchAction: "manipulation",
          transition: "background 0.16s ease, border-color 0.16s ease",
        }}
      >
        <div style={{
          width: 44, height: 44, borderRadius: 12, flexShrink: 0,
          background: `${widget.color}16`,
          border: `1px solid ${widget.color}30`,
          display: "flex", alignItems: "center", justifyContent: "center",
        }}>
          <i className={`fa-solid ${widget.icon}`} style={{ color: widget.color, fontSize: 18 }} />
        </div>
        <div style={{ flex: 1, textAlign: "left" }}>
          <div style={{ fontSize: 13, fontWeight: 600, color: "rgba(255,255,255,0.82)", fontFamily: "'Outfit', sans-serif" }}>
            {widget.name}
          </div>
          <div style={{ fontSize: 11, color: "rgba(255,255,255,0.38)", fontFamily: "'Outfit', sans-serif", marginTop: 1 }}>
            {widget.description}
          </div>
        </div>
        <motion.div
          animate={{ x: pressed ? 3 : 0 }}
          transition={{ type: "spring", stiffness: 400, damping: 20 }}
          style={{ flexShrink: 0 }}
        >
          <i className="fa-solid fa-plus" style={{ color: widget.color, fontSize: 14 }} />
        </motion.div>
      </motion.button>
    </motion.div>
  );
}

// ── Empty State with Featured Widgets Onboarding ────────────────────────────────

function EmptyWidgetsOnboarding({ onOpenStore, onAddWidget }) {
  return (
    <motion.div
      initial={{ opacity: 0, y: 16 }}
      animate={{ opacity: 1, y: 0 }}
      transition={{ delay: 0.1, duration: 0.4 }}
      style={{
        display: "flex",
        flexDirection: "column",
        padding: "28px 16px 24px",
        gap: 22,
      }}
    >
      {/* Welcome Message */}
      <motion.div
        initial={{ opacity: 0, scale: 0.95 }}
        animate={{ opacity: 1, scale: 1 }}
        transition={{ delay: 0.15, type: "spring", damping: 28, stiffness: 300 }}
        style={{
          textAlign: "center",
          paddingBottom: 8,
        }}
      >
        <div style={{
          width: 64, height: 64, borderRadius: 18,
          background: "linear-gradient(135deg, rgba(0,240,255,0.12), rgba(124,58,237,0.08))",
          border: "1px solid rgba(0,240,255,0.18)",
          display: "flex", alignItems: "center", justifyContent: "center",
          margin: "0 auto 16px",
          boxShadow: "0 0 24px rgba(0,240,255,0.08)",
        }}>
          <i className="fa-solid fa-wand-magic-sparkles" style={{ fontSize: 28, color: "#00F0FF", filter: "drop-shadow(0 0 4px rgba(0,240,255,0.8))" }} />
        </div>
        <div style={{ fontSize: 16.5, fontWeight: 700, color: "rgba(255,255,255,0.90)", marginBottom: 8, fontFamily: "'Outfit', sans-serif", letterSpacing: "-0.01em" }}>
          Widgets Bring Cortex to Life
        </div>
        <div style={{ fontSize: 12.5, color: "rgba(255,255,255,0.42)", fontFamily: "'Outfit', sans-serif", lineHeight: 1.6 }}>
          Personalize your workspace with real-time information and AI-powered insights.
        </div>
      </motion.div>

      {/* Featured Widgets List */}
      <motion.div
        initial={{ opacity: 0 }}
        animate={{ opacity: 1 }}
        transition={{ delay: 0.24, duration: 0.3 }}
        style={{ display: "flex", flexDirection: "column", gap: 10 }}
      >
        <div style={{
          fontSize: 10.5,
          color: "rgba(255,255,255,0.30)",
          fontFamily: "'Outfit', sans-serif",
          letterSpacing: "0.09em",
          textTransform: "uppercase",
          fontWeight: 700,
          paddingLeft: 2,
        }}>
          Choose Your First Widget
        </div>
        {FEATURED_WIDGETS.map((widget, i) => (
          <FeaturedWidgetCard
            key={widget.id}
            widget={widget}
            onAddWidget={onAddWidget}
            delay={0.32 + i * 0.05}
          />
        ))}
      </motion.div>

      {/* CTA Button */}
      <motion.button
        initial={{ opacity: 0, y: 8 }}
        animate={{ opacity: 1, y: 0 }}
        transition={{ delay: 0.64, type: "spring", damping: 24, stiffness: 280 }}
        onClick={onOpenStore}
        style={{
          padding: "12px 20px",
          borderRadius: 14,
          background: "linear-gradient(135deg, rgba(0,240,255,0.16), rgba(0,240,255,0.04))",
          border: "1px solid rgba(0,240,255,0.30)",
          color: "#00F0FF",
          fontSize: 13,
          fontWeight: 600,
          fontFamily: "'Outfit', sans-serif",
          cursor: "pointer",
          WebkitTapHighlightColor: "transparent",
          letterSpacing: "0.01em",
          transition: "all 0.22s ease",
        }}
        onMouseEnter={(e) => {
          e.currentTarget.style.background = "linear-gradient(135deg, rgba(0,240,255,0.22), rgba(0,240,255,0.08))";
          e.currentTarget.style.boxShadow = "0 0 20px rgba(0,240,255,0.18)";
        }}
        onMouseLeave={(e) => {
          e.currentTarget.style.background = "linear-gradient(135deg, rgba(0,240,255,0.16), rgba(0,240,255,0.04))";
          e.currentTarget.style.boxShadow = "none";
        }}
      >
        <i className="fa-solid fa-grid-2" style={{ marginRight: 8 }} />
        Explore All Widgets
      </motion.button>

      {/* Footer Message */}
      <motion.div
        initial={{ opacity: 0 }}
        animate={{ opacity: 1 }}
        transition={{ delay: 0.70, duration: 0.4 }}
        style={{
          textAlign: "center",
          paddingTop: 4,
        }}
      >
        <div style={{ fontSize: 11, color: "rgba(255,255,255,0.22)", fontFamily: "'Outfit', sans-serif" }}>
          Add and customize widgets anytime from this panel.
        </div>
      </motion.div>
    </motion.div>
  );
}

// ── Empty State Fallback (After User Removes All Widgets) ────────────────────────

function EmptyWidgetsFallback({ onOpenStore }) {
  return (
    <motion.div
      initial={{ opacity: 0, y: 16 }}
      animate={{ opacity: 1, y: 0 }}
      transition={{ delay: 0.2, duration: 0.4 }}
      style={{
        display: "flex",
        flexDirection: "column",
        alignItems: "center",
        justifyContent: "center",
        padding: "40px 24px",
        gap: 16,
      }}
    >
      <div
        style={{
          width: 64, height: 64,
          borderRadius: 18,
          background: "rgba(0,240,255,0.08)",
          border: "1px solid rgba(0,240,255,0.20)",
          display: "flex",
          alignItems: "center",
          justifyContent: "center",
        }}
      >
        <i className="fa-solid fa-grid-2" style={{ fontSize: 26, color: "#00F0FF", opacity: 0.7 }} />
      </div>
      <div style={{ textAlign: "center" }}>
        <div style={{ fontSize: 16, fontWeight: 600, color: "rgba(255,255,255,0.85)", marginBottom: 6, fontFamily: "'Outfit', sans-serif" }}>
          No Widgets Yet
        </div>
        <div style={{ fontSize: 13, color: "rgba(255,255,255,0.40)", fontFamily: "'Outfit', sans-serif", lineHeight: 1.5 }}>
          Add one to personalize your workspace
        </div>
      </div>
      <motion.button
        whileTap={{ scale: 0.94 }}
        onClick={onOpenStore}
        style={{
          padding: "10px 24px",
          borderRadius: 12,
          background: "rgba(0,240,255,0.14)",
          border: "1px solid rgba(0,240,255,0.35)",
          color: "#00F0FF",
          fontSize: 13,
          fontWeight: 600,
          fontFamily: "'Outfit', sans-serif",
          cursor: "pointer",
          WebkitTapHighlightColor: "transparent",
          letterSpacing: "0.01em",
        }}
      >
        <i className="fa-solid fa-plus" style={{ marginRight: 8 }} />
        Add Widget
      </motion.button>
    </motion.div>
  );
}

export default function MobileWidgetView() {
  const { layout, visible, openStore, showStore, closeStore, addWidget } = useWidgetManager();
  const [hasEverAddedWidget, setHasEverAddedWidget] = useState(false);

  const handleAddWidget = useCallback((widgetId) => {
    if (addWidget) {
      addWidget(widgetId);
      setHasEverAddedWidget(true);
    }
  }, [addWidget]);

  if (!visible) return null;

  const activeWidgets = layout.filter((item) => {
    const def = getWidgetDef(item.id);
    return !!def;
  });

  const isEmpty = activeWidgets.length === 0;

  return (
    <div
      style={{
        display: "flex",
        flexDirection: "column",
        height: "100%",
        overflowX: "hidden",
      }}
    >
      {/* Header */}
      <div
        style={{
          display: "flex",
          alignItems: "center",
          justifyContent: "space-between",
          padding: "16px 20px 12px",
          flexShrink: 0,
        }}
      >
        <div>
          <div style={{ fontSize: 20, fontWeight: 700, color: "#fff", fontFamily: "'Outfit', sans-serif", letterSpacing: "-0.01em" }}>
            Widgets
          </div>
          <div style={{ fontSize: 12, color: "rgba(255,255,255,0.38)", fontFamily: "'Outfit', sans-serif", marginTop: 1 }}>
            {activeWidgets.length > 0 ? `${activeWidgets.length} active` : "Swipe right from home"}
          </div>
        </div>

        <motion.button
          whileTap={{ scale: 0.88 }}
          onClick={openStore}
          style={{
            width: 36, height: 36,
            borderRadius: 11,
            background: "rgba(0,240,255,0.12)",
            border: "1px solid rgba(0,240,255,0.28)",
            color: "#00F0FF",
            fontSize: 14,
            display: "flex",
            alignItems: "center",
            justifyContent: "center",
            cursor: "pointer",
            WebkitTapHighlightColor: "transparent",
            boxShadow: "0 0 14px rgba(0,240,255,0.12)",
          }}
        >
          <i className="fa-solid fa-plus" />
        </motion.button>
      </div>

      {/* Widget List */}
      <div
        style={{
          flex: 1,
          overflowY: "auto",
          overflowX: "hidden",
          WebkitOverflowScrolling: "touch",
          padding: isEmpty ? "0" : "0 14px 20px",
          scrollBehavior: "smooth",
        }}
      >
        <AnimatePresence mode="popLayout">
          {isEmpty ? (
            hasEverAddedWidget ? (
              <EmptyWidgetsFallback
                key="empty-fallback"
                onOpenStore={openStore}
              />
            ) : (
              <EmptyWidgetsOnboarding
                key="empty-onboarding"
                onOpenStore={openStore}
                onAddWidget={handleAddWidget}
              />
            )
          ) : (
            activeWidgets.map((item) => {
              const def = getWidgetDef(item.id);
              if (!def) return null;
              return (
                <MobileWidgetCard key={item.id} item={item} def={def} />
              );
            })
          )}
        </AnimatePresence>
      </div>

      {/* Widget Store Modal */}
      {showStore && <WidgetStore onClose={closeStore} />}
    </div>
  );
}
