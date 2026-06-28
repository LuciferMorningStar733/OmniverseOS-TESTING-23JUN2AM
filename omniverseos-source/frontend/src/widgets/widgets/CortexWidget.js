import React, { useEffect, useState } from "react";
import { useOS } from "../../context/OSContext";
import { getPreferredProvider, PROVIDER_LABELS } from "../../lib/api";

const QUICK_PROMPTS = [
  "What can you help me with?",
  "Summarise my day",
  "Write a quick note",
  "Search the web for…",
];

function greeting() {
  const h = new Date().getHours();
  if (h < 12) return "Good morning";
  if (h < 18) return "Good afternoon";
  return "Good evening";
}

export default function CortexWidget() {
  const { user, openApp } = useOS();
  const [provider, setProvider] = useState(getPreferredProvider());

  useEffect(() => {
    const interval = setInterval(() => setProvider(getPreferredProvider()), 2000);
    return () => clearInterval(interval);
  }, []);

  const providerLabel = PROVIDER_LABELS[provider] || "Gemini";

  return (
    <div className="w-full h-full flex flex-col px-4 py-3 gap-3 select-none">
      {/* Greeting */}
      <div>
        <div
          className="font-heading font-bold leading-tight"
          style={{ fontSize: 18, color: "#fff" }}
        >
          {greeting()}, {user?.name?.split(" ")[0] || "User"}.
        </div>
        <div className="text-xs font-mono mt-0.5 flex items-center gap-1.5" style={{ color: "rgba(255,255,255,0.35)" }}>
          <span
            className="inline-flex items-center gap-1 px-1.5 py-0.5 rounded-full"
            style={{ border: "1px solid rgba(0,240,255,0.2)", background: "rgba(0,240,255,0.07)" }}
          >
            <span className="w-1.5 h-1.5 rounded-full bg-[#39FF14] animate-pulse inline-block" />
            <span style={{ color: "#00F0FF" }}>{providerLabel}</span>
          </span>
          <span>active</span>
        </div>
      </div>

      {/* Quick prompts */}
      <div className="flex flex-col gap-1.5 flex-1">
        <div className="text-[10px] font-mono uppercase tracking-widest mb-0.5" style={{ color: "rgba(255,255,255,0.2)" }}>
          Quick actions
        </div>
        {QUICK_PROMPTS.map((p, i) => (
          <button
            key={i}
            onClick={() => {
              openApp("chat");
              setTimeout(() => {
                window.dispatchEvent(new CustomEvent("cortex:prompt", { detail: { text: p } }));
              }, 80);
            }}
            className="text-left text-xs font-mono px-3 py-1.5 rounded-lg transition-all duration-150"
            style={{
              background: "rgba(0,240,255,0.06)",
              border: "1px solid rgba(0,240,255,0.12)",
              color: "rgba(255,255,255,0.65)",
              cursor: "pointer",
            }}
            onMouseEnter={(e) => { e.currentTarget.style.background = "rgba(0,240,255,0.12)"; e.currentTarget.style.color = "#fff"; }}
            onMouseLeave={(e) => { e.currentTarget.style.background = "rgba(0,240,255,0.06)"; e.currentTarget.style.color = "rgba(255,255,255,0.65)"; }}
          >
            <i className="fa-solid fa-chevron-right text-[8px] mr-2" style={{ color: "#00F0FF" }} />
            {p}
          </button>
        ))}
      </div>

      {/* Open Cortex button */}
      <button
        onClick={() => openApp("chat")}
        className="flex items-center justify-center gap-2 rounded-xl py-2 text-xs font-mono font-semibold transition-all"
        style={{
          background: "linear-gradient(135deg, rgba(0,240,255,0.18), rgba(0,240,255,0.06))",
          border: "1px solid rgba(0,240,255,0.3)",
          color: "#00F0FF",
          cursor: "pointer",
          boxShadow: "0 0 16px rgba(0,240,255,0.15)",
        }}
        onMouseEnter={(e) => { e.currentTarget.style.boxShadow = "0 0 24px rgba(0,240,255,0.3)"; }}
        onMouseLeave={(e) => { e.currentTarget.style.boxShadow = "0 0 16px rgba(0,240,255,0.15)"; }}
      >
        <i className="fa-solid fa-comments text-sm" />
        Open Cortex
      </button>
    </div>
  );
}
