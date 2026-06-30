import React, { useState } from "react";

const TRACKS = [
  { title: "Neural Drift",   artist: "Cortex AI" },
  { title: "Quantum Pulse",  artist: "Omniverse" },
  { title: "Neon Horizon",   artist: "Cyber OS"  },
];

export default function MusicWidget() {
  const [playing, setPlaying] = useState(false);
  const [track] = useState(TRACKS[0]);

  return (
    <div className="w-full h-full flex flex-col items-center justify-center gap-2 px-2 select-none">
      {/* Album art placeholder */}
      <div
        className="w-10 h-10 rounded-xl flex items-center justify-center"
        style={{
          background: "linear-gradient(135deg,#39FF1440,#00F0FF20)",
          border: "1px solid rgba(57,255,20,0.2)",
        }}
      >
        <i className="fa-solid fa-music text-sm" style={{ color: "#39FF14" }} />
      </div>

      <div className="text-center">
        <div className="text-[11px] font-mono font-semibold" style={{ color: "#fff" }}>{track.title}</div>
        <div className="text-[9px] font-mono" style={{ color: "rgba(255,255,255,0.35)" }}>{track.artist}</div>
      </div>

      {/* Controls */}
      <div className="flex items-center gap-2">
        <button className="text-[10px]" style={{ color: "rgba(255,255,255,0.3)", cursor: "pointer", background: "none", border: "none" }}>
          <i className="fa-solid fa-backward-step" />
        </button>
        <button
          onClick={() => setPlaying((p) => !p)}
          className="w-8 h-8 rounded-full flex items-center justify-center"
          style={{
            background: "rgba(57,255,20,0.15)",
            border: "1px solid rgba(57,255,20,0.3)",
            color: "#39FF14", cursor: "pointer",
          }}
        >
          <i className={`fa-solid ${playing ? "fa-pause" : "fa-play"} text-[11px]`} style={{ marginLeft: playing ? 0 : 1 }} />
        </button>
        <button className="text-[10px]" style={{ color: "rgba(255,255,255,0.3)", cursor: "pointer", background: "none", border: "none" }}>
          <i className="fa-solid fa-forward-step" />
        </button>
      </div>

      <div className="text-[8px] font-mono" style={{ color: "rgba(255,255,255,0.15)" }}>// placeholder</div>
    </div>
  );
}
