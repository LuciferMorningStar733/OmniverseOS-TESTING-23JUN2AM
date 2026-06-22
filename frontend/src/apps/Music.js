import React, { useState } from "react";
import DemoBadge from "../components/DemoBadge";

const tracks = [
  { title: "Neon Drift", artist: "Cyber Tokyo", duration: "3:42", cover: "https://images.pexels.com/photos/6440018/pexels-photo-6440018.jpeg?auto=compress&cs=tinysrgb&dpr=2&h=300&w=300" },
  { title: "Synthwave Sunset", artist: "Retroverse", duration: "4:18", cover: "https://images.unsplash.com/photo-1518972559570-7cc1309f3229?w=300" },
  { title: "Voltage", artist: "Pulse Engine", duration: "3:05", cover: "https://images.unsplash.com/photo-1470225620780-dba8ba36b745?w=300" },
  { title: "Ghost Frequency", artist: "Null Wave", duration: "5:21", cover: "https://images.unsplash.com/photo-1514525253161-7a46d19cd819?w=300" },
  { title: "Holo Bloom", artist: "Mirror Stack", duration: "3:55", cover: "https://images.unsplash.com/photo-1493225457124-a3eb161ffa5f?w=300" },
  { title: "Static Heart", artist: "OmniVerse", duration: "4:02", cover: "https://images.unsplash.com/photo-1571974599782-87624638275e?w=300" },
];

export default function Music() {
  const [playing, setPlaying] = useState(0);
  const [isPlaying, setIsPlaying] = useState(false);
  const t = tracks[playing];

  return (
    <div className="flex flex-col h-full text-white" data-testid="music-app">
      <DemoBadge note="Tracks are placeholders. Real playback + uploads coming soon." />
      <div className="flex-1 grid grid-cols-3 overflow-hidden">
        <div className="col-span-2 p-6 overflow-y-auto">
          <div className="mono-label">// Library</div>
          <h2 className="font-heading text-2xl font-bold mb-4">For You</h2>
          <div className="grid grid-cols-3 gap-3">
            {tracks.map((tr, i) => (
              <button key={i} data-testid={`track-${i}`} onClick={() => { setPlaying(i); setIsPlaying(true); }} className="text-left group">
                <div className="aspect-square rounded-lg overflow-hidden mb-2 relative">
                  <img src={tr.cover} alt={tr.title} className="w-full h-full object-cover group-hover:scale-105 transition" />
                  <div className="absolute inset-0 bg-black/40 opacity-0 group-hover:opacity-100 flex items-center justify-center transition">
                    <i className="fa-solid fa-play text-3xl text-[#00F0FF]"></i>
                  </div>
                </div>
                <div className="text-sm font-medium truncate">{tr.title}</div>
                <div className="text-xs text-slate-500 truncate">{tr.artist}</div>
              </button>
            ))}
          </div>
        </div>
        <div className="border-l border-white/10 p-6 flex flex-col items-center">
          <img src={t.cover} alt={t.title} className="w-40 h-40 rounded-2xl object-cover mb-4 shadow-lg" />
          <div className="font-heading text-lg font-bold">{t.title}</div>
          <div className="text-xs text-slate-400">{t.artist}</div>
          <div className="w-full mt-6">
            <div className="h-1 bg-white/10 rounded-full overflow-hidden"><div className="h-full bg-[#00F0FF]" style={{ width: "35%" }} /></div>
            <div className="flex justify-between text-[10px] font-mono text-slate-500 mt-1"><span>1:18</span><span>{t.duration}</span></div>
          </div>
        </div>
      </div>
      <div className="h-20 border-t border-white/10 px-6 flex items-center gap-4 glass">
        <img src={t.cover} alt="" className="w-12 h-12 rounded" />
        <div className="flex-1">
          <div className="text-sm font-medium">{t.title}</div>
          <div className="text-xs text-slate-500">{t.artist}</div>
        </div>
        <div className="flex items-center gap-3">
          <button onClick={() => setPlaying((p) => (p - 1 + tracks.length) % tracks.length)}><i className="fa-solid fa-backward-step text-slate-300"></i></button>
          <button data-testid="play-toggle" onClick={() => setIsPlaying(!isPlaying)} className="w-10 h-10 rounded-full bg-[#00F0FF] text-black flex items-center justify-center hover:scale-105 transition">
            <i className={`fa-solid ${isPlaying ? "fa-pause" : "fa-play"}`}></i>
          </button>
          <button onClick={() => setPlaying((p) => (p + 1) % tracks.length)}><i className="fa-solid fa-forward-step text-slate-300"></i></button>
        </div>
      </div>
    </div>
  );
}
