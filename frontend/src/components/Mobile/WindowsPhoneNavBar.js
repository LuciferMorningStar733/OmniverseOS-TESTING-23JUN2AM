import React, { useRef } from "react";
import { useOS } from "../../context/OSContext";
import { playClick } from "../../lib/soundEngine";

export default function WindowsPhoneNavBar({
  activePivot,
  onNavigateToStart,
  onOpenSearch,
  onToggleTaskSwitcher,
  hasOpenWindows,
}) {
  const { openWindows, activeId, closeWindow, minimize } = useOS();
  const longPressTimer = useRef(null);

  // Handle Back button
  const handleBackPointerDown = () => {
    longPressTimer.current = setTimeout(() => {
      // Trigger Windows Phone Multitasking Carousel
      if (onToggleTaskSwitcher) onToggleTaskSwitcher();
      longPressTimer.current = null;
    }, 450);
  };

  const handleBackPointerUp = () => {
    if (longPressTimer.current) {
      clearTimeout(longPressTimer.current);
      longPressTimer.current = null;

      // Normal Back click
      playClick();
      if (hasOpenWindows && activeId) {
        closeWindow(activeId);
      } else if (activePivot === "all-apps") {
        onNavigateToStart();
      }
    }
  };

  // Handle Windows Start Button
  const handleStartClick = () => {
    playClick();
    // Minimize active windows to return to Start screen
    if (hasOpenWindows) {
      openWindows.forEach((w) => minimize(w.id));
    }
    onNavigateToStart();
  };

  return (
    <div
      style={{
        position: "fixed",
        bottom: 0,
        left: 0,
        right: 0,
        height: "calc(50px + env(safe-area-inset-bottom, 0px))",
        paddingBottom: "env(safe-area-inset-bottom, 0px)",
        background: "rgba(8, 10, 18, 0.94)",
        backdropFilter: "blur(24px) saturate(180%)",
        WebkitBackdropFilter: "blur(24px) saturate(180%)",
        borderTop: "1px solid rgba(255,255,255,0.14)",
        boxShadow: "0 -8px 32px rgba(0,0,0,0.6)",
        display: "flex",
        alignItems: "center",
        justifyContent: "space-around",
        zIndex: 9999, // Above windows and desktop overlays
        userSelect: "none",
        WebkitUserSelect: "none",
      }}
      data-testid="windows-phone-nav-bar"
    >
      {/* 1. BACK BUTTON (←) */}
      <button
        onPointerDown={handleBackPointerDown}
        onPointerUp={handleBackPointerUp}
        onPointerCancel={() => clearTimeout(longPressTimer.current)}
        aria-label="Back"
        style={{
          background: "transparent",
          border: "none",
          color: "#ffffff",
          width: 64,
          height: 48,
          display: "flex",
          alignItems: "center",
          justifyContent: "center",
          cursor: "pointer",
          WebkitTapHighlightColor: "transparent",
        }}
      >
        <svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.4" strokeLinecap="round" strokeLinejoin="round">
          <line x1="19" y1="12" x2="5" y2="12"></line>
          <polyline points="12 19 5 12 12 5"></polyline>
        </svg>
      </button>

      {/* 2. WINDOWS START BUTTON (⊞) */}
      <button
        onClick={handleStartClick}
        aria-label="Start"
        style={{
          background: "transparent",
          border: "none",
          color: "#ffffff",
          width: 64,
          height: 48,
          display: "flex",
          alignItems: "center",
          justifyContent: "center",
          cursor: "pointer",
          WebkitTapHighlightColor: "transparent",
        }}
      >
        {/* Iconic Windows Phone 4-Pane Logo */}
        <svg width="18" height="18" viewBox="0 0 24 24" fill="currentColor">
          <path d="M0 3.449L9.75 2.1v9.451H0m10.949-9.602L24 0v11.4H10.949M0 12.6h9.75v9.451L0 20.699M10.949 12.6H24V24l-12.951-1.801" />
        </svg>
      </button>

      {/* 3. SEARCH BUTTON (🔍) */}
      <button
        onClick={() => { playClick(); onOpenSearch(); }}
        aria-label="Search"
        style={{
          background: "transparent",
          border: "none",
          color: "#ffffff",
          width: 64,
          height: 48,
          display: "flex",
          alignItems: "center",
          justifyContent: "center",
          cursor: "pointer",
          WebkitTapHighlightColor: "transparent",
        }}
      >
        <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.4" strokeLinecap="round" strokeLinejoin="round">
          <circle cx="11" cy="11" r="8"></circle>
          <line x1="21" y1="21" x2="16.65" y2="16.65"></line>
        </svg>
      </button>
    </div>
  );
}
