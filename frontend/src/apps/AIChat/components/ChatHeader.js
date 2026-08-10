import React from "react";
import ModelSelect from "./ModelSelector";

export const StatusPanel = React.memo(function StatusPanel({ status }) {
  if (!status) return null;

  const isFailover   = status.stage === "unavailable" || status.stage === "switching";
  const isGenerating = status.stage === "generating";

  const accentColor = isFailover ? "#F59E0B" : isGenerating ? "#39FF14" : "#00F0FF";
  const glowColor   = isFailover ? "rgba(245,158,11,0.3)" : isGenerating ? "rgba(57,255,20,0.25)" : "rgba(0,240,255,0.25)";

  const stageLabel = {
    connecting:  "Connecting",
    generating:  "Generating",
    unavailable: "Rerouting",
    switching:   "Switching",
  }[status.stage] || "Processing";

  return (
    <div className="flex justify-start" style={{ animation: "fadeSlideUp 0.2s ease both" }}>
      <div style={{
        display: "flex", alignItems: "flex-start", gap: 10,
        padding: "10px 14px",
        borderRadius: 14,
        background: "rgba(6,8,16,0.75)",
        border: `1px solid ${accentColor}22`,
        backdropFilter: "blur(16px)",
        boxShadow: `0 0 20px ${glowColor}, 0 4px 16px rgba(0,0,0,0.3)`,
        maxWidth: 320,
        minWidth: 160,
      }}>
        <div style={{
          width: 28, height: 28, borderRadius: "50%", flexShrink: 0, marginTop: 1,
          background: `radial-gradient(circle at 38% 35%, ${accentColor}cc 0%, ${accentColor}44 60%, transparent 100%)`,
          boxShadow: `0 0 12px ${glowColor}`,
          animation: isGenerating ? "thinkingOrb 1.4s ease-in-out infinite" : "orbPulse 2s ease-in-out infinite",
          display: "flex", alignItems: "center", justifyContent: "center",
        }}>
          <i className={`fa-solid ${isFailover ? "fa-arrow-right-arrow-left" : "fa-wand-magic-sparkles"}`}
            style={{ fontSize: 10, color: "rgba(255,255,255,0.9)", textShadow: `0 0 6px ${accentColor}` }} />
        </div>
        <div style={{ flex: 1, minWidth: 0 }}>
          <div style={{
            fontSize: 9, fontFamily: "'JetBrains Mono', monospace",
            letterSpacing: "0.14em", textTransform: "uppercase",
            color: `${accentColor}88`, marginBottom: 3,
          }}>
            {stageLabel}
          </div>
          <div style={{
            fontSize: 12.5, color: isFailover ? "#FCD34D" : isGenerating ? "rgba(255,255,255,0.75)" : "rgba(0,240,255,0.8)",
            lineHeight: 1.4, fontFamily: "'Outfit', sans-serif",
          }}>
            {status.text}
          </div>
        </div>
      </div>
    </div>
  );
});

export function ChatHeader({
  sidebarOpen,
  onToggleSidebar,
  selectedModelValue,
  onModelChange,
  loading,
  onClearHistory,
}) {
  return (
    <div
      className="flex items-center justify-between px-3 py-2 border-b border-white/10"
      style={{ background: "rgba(10,12,20,0.85)", backdropFilter: "blur(12px)" }}
    >
      <div className="flex items-center gap-2">
        <button
          onClick={onToggleSidebar}
          className="p-1.5 rounded-lg text-slate-400 hover:text-white hover:bg-white/5 transition-colors"
          title={sidebarOpen ? "Hide Sessions" : "Show Sessions"}
        >
          <i className="fa-solid fa-sidebar text-sm" />
        </button>
        <ModelSelect value={selectedModelValue} onChange={onModelChange} disabled={loading} />
      </div>

      <div className="flex items-center gap-2">
        <button
          onClick={onClearHistory}
          className="p-1.5 rounded-lg text-slate-400 hover:text-red-400 hover:bg-white/5 transition-colors text-xs"
          title="Clear Conversation"
        >
          <i className="fa-solid fa-trash-can" />
        </button>
      </div>
    </div>
  );
}

export default ChatHeader;
