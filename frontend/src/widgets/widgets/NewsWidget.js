import React from "react";

const HEADLINES = [
  "AI achieves new benchmark in reasoning tasks",
  "Quantum computing reaches commercial milestone",
  "Cybersecurity consortium launches global framework",
];

export default function NewsWidget() {
  return (
    <div className="w-full h-full flex flex-col px-3 py-2 gap-1.5 select-none">
      {HEADLINES.map((h, i) => (
        <div
          key={i}
          className="flex items-start gap-2 py-1"
          style={{ borderBottom: i < HEADLINES.length - 1 ? "1px solid rgba(255,255,255,0.05)" : "none" }}
        >
          <span
            className="text-[9px] font-mono flex-shrink-0 mt-0.5 px-1 py-0.5 rounded"
            style={{ background: "rgba(255,0,60,0.12)", color: "#FF003C" }}
          >
            {String(i + 1).padStart(2, "0")}
          </span>
          <span className="text-[11px] font-mono leading-snug" style={{ color: "rgba(255,255,255,0.65)" }}>
            {h}
          </span>
        </div>
      ))}
      <div className="text-[9px] font-mono mt-auto" style={{ color: "rgba(255,255,255,0.15)" }}>
        // news feed placeholder
      </div>
    </div>
  );
}
