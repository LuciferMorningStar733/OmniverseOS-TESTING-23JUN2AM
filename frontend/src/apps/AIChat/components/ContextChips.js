import React from "react";
import { getAppName } from "../../../lib/appNames";

const CHIP_ACCENT = {
  active:    { c: "#00F0FF", label: "Active" },
  open:      { c: "#60A5FA", label: "Workspace" },
  memory:    { c: "#CF9EFF", label: "Memory"    },
  url:       { c: "#39FF14", label: "Browser"   },
  workspace: { c: "#F59E0B", label: "Workspace" },
};

function Chip({ icon, label, accent, disabledState, onToggle, chipKey, title }) {
  const dim = disabledState;
  return (
    <button
      onClick={() => onToggle(chipKey)}
      title={dim ? `${title || label} — click to include again` : `${title || label} — click × to exclude from next reply`}
      className="context-chip"
      style={{
        display: "inline-flex", alignItems: "center", gap: 6,
        padding: "3px 8px 3px 9px",
        borderRadius: 999,
        fontFamily: "'JetBrains Mono', monospace",
        fontSize: 10.5, letterSpacing: "0.02em",
        cursor: "pointer",
        userSelect: "none",
        whiteSpace: "nowrap",
        border: `1px solid ${dim ? "rgba(255,255,255,0.10)" : accent + "55"}`,
        background: dim ? "rgba(255,255,255,0.03)" : accent + "18",
        color: dim ? "rgba(255,255,255,0.35)" : accent,
        textDecoration: dim ? "line-through" : "none",
        transition: "all 0.15s ease",
        flexShrink: 0,
      }}
    >
      <i className={`fa-solid ${icon}`} style={{ fontSize: 9 }} />
      <span>{label}</span>
      <i className={`fa-solid ${dim ? "fa-plus" : "fa-xmark"}`} style={{ fontSize: 9, opacity: 0.7, marginLeft: 2 }} />
    </button>
  );
}

export function ContextChips({ windows = [], activeId, relevantMemories = [], disabled = {}, onToggle }) {
  const activeWin = windows.find(w => w.id === activeId) || null;
  const activeName = activeWin ? getAppName(activeWin.app) : null;
  const otherCount = Math.max(0, windows.length - (activeWin ? 1 : 0));

  let browserUrl = null;
  try { browserUrl = localStorage.getItem("cortex_current_url") || null; } catch { /* ignore */ }
  let browserHost = null;
  if (browserUrl) {
    try { browserHost = new URL(browserUrl).hostname.replace(/^www\./, ""); } catch { browserHost = null; }
  }

  const chips = [];
  if (activeName) {
    chips.push({ key: "workspace", icon: "fa-square-caret-right", label: activeName, accent: CHIP_ACCENT.active.c, title: `Active app: ${activeName}` });
  }
  if (otherCount > 0) {
    chips.push({ key: "workspace", icon: "fa-layer-group", label: `+${otherCount} open`, accent: CHIP_ACCENT.open.c, title: `${otherCount} other app${otherCount === 1 ? "" : "s"} open` });
  }
  if (browserHost) {
    chips.push({ key: "workspace", icon: "fa-globe", label: browserHost.slice(0, 26), accent: CHIP_ACCENT.url.c, title: `Browser: ${browserUrl}` });
  }
  if (relevantMemories.length > 0) {
    chips.push({ key: "memory", icon: "fa-brain", label: `${relevantMemories.length} ${relevantMemories.length === 1 ? "memory" : "memories"}`, accent: CHIP_ACCENT.memory.c, title: "Relevant long-term memories" });
  }

  if (chips.length === 0) return null;

  return (
    <div
      data-testid="context-chips"
      style={{
        display: "flex", alignItems: "center", gap: 6,
        padding: "6px 12px 6px",
        borderTop: "1px solid rgba(255,255,255,0.05)",
        borderBottom: "1px solid rgba(255,255,255,0.05)",
        background: "rgba(0,240,255,0.02)",
        overflowX: "auto",
        scrollbarWidth: "none",
        WebkitOverflowScrolling: "touch",
        flexShrink: 0,
      }}
      className="scrollbar-none"
    >
      <span style={{
        fontFamily: "'JetBrains Mono', monospace",
        fontSize: 9, letterSpacing: "0.12em",
        color: "rgba(255,255,255,0.30)",
        textTransform: "uppercase",
        flexShrink: 0,
        marginRight: 2,
      }}>
        Context
      </span>

      {chips.map((c, i) => (
        <Chip
          key={`${c.key}-${i}`}
          chipKey={c.key}
          icon={c.icon}
          label={c.label}
          accent={c.accent}
          title={c.title}
          disabledState={Boolean(disabled[c.key])}
          onToggle={onToggle}
        />
      ))}
    </div>
  );
}

export default ContextChips;
