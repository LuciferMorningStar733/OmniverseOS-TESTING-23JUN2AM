import React, { useState, useCallback } from "react";

/**
 * Mobile-only adaptive quick action capsules. Every action maps to a REAL
 * OS capability (openApp / a real prompt sent to Cortex) — nothing here is
 * decorative or fake. Each capsule has its own loading state while its
 * action resolves.
 */
const ACTIONS = [
  { id: "summarize",  label: "Summarize my day",  icon: "fa-sun",              kind: "prompt", value: "Summarize my day" },
  { id: "browser",    label: "Open Browser",      icon: "fa-globe",            kind: "app",    value: "browser" },
  { id: "files",      label: "Open Files",        icon: "fa-folder-open",      kind: "app",    value: "files" },
  { id: "notes",      label: "Notes",             icon: "fa-note-sticky",      kind: "app",    value: "notes" },
  { id: "memory",     label: "Search memories",   icon: "fa-brain",            kind: "app",    value: "memory" },
  { id: "clipboard",  label: "Clipboard history",  icon: "fa-clipboard",        kind: "app",    value: "clipboard" },
  { id: "settings",   label: "Change wallpaper",  icon: "fa-image",            kind: "app",    value: "settings" },
];

export default function MobileQuickActions({ openApp, onPrompt, disabled }) {
  const [loadingId, setLoadingId] = useState(null);

  const handleTap = useCallback(async (action) => {
    if (disabled || loadingId) return;
    setLoadingId(action.id);
    try {
      if (action.kind === "app") {
        openApp(action.value);
      } else if (action.kind === "prompt") {
        onPrompt(action.value);
      }
    } finally {
      setTimeout(() => setLoadingId(null), 380);
    }
  }, [disabled, loadingId, openApp, onPrompt]);

  return (
    <div
      className="flex gap-2 overflow-x-auto"
      style={{
        padding: "8px 12px",
        borderBottom: "1px solid rgba(255,255,255,0.06)",
        background: "rgba(0,0,0,0.18)",
        scrollbarWidth: "none",
      }}
    >
      {ACTIONS.map((a) => {
        const isLoading = loadingId === a.id;
        return (
          <button
            key={a.id}
            onClick={() => handleTap(a)}
            disabled={disabled}
            data-testid={`quick-action-${a.id}`}
            style={{
              flexShrink: 0,
              display: "flex", alignItems: "center", gap: 6,
              padding: "7px 12px",
              borderRadius: 18,
              background: isLoading ? "rgba(0,240,255,0.16)" : "rgba(255,255,255,0.04)",
              border: `1px solid ${isLoading ? "rgba(0,240,255,0.45)" : "rgba(255,255,255,0.09)"}`,
              color: isLoading ? "#00F0FF" : "rgba(226,232,240,0.85)",
              fontSize: 12,
              whiteSpace: "nowrap",
              opacity: disabled ? 0.4 : 1,
              transition: "background 0.18s ease, border-color 0.18s ease, transform 0.12s ease",
              WebkitTapHighlightColor: "transparent",
            }}
            onTouchStart={(e) => { e.currentTarget.style.transform = "scale(0.94)"; }}
            onTouchEnd={(e) => { e.currentTarget.style.transform = "scale(1)"; }}
          >
            {isLoading
              ? <i className="fa-solid fa-circle-notch fa-spin" style={{ fontSize: 11 }} />
              : <i className={`fa-solid ${a.icon}`} style={{ fontSize: 11, opacity: 0.85 }} />}
            {a.label}
          </button>
        );
      })}
    </div>
  );
}
