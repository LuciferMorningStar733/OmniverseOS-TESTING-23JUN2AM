import React, { useState } from "react";
import DemoBadge from "../components/DemoBadge";

const seed = [
  { id: "dQw4w9WgXcQ", title: "Cyberpunk Night Drive — 4K", views: "2.3M", channel: "NightOps" },
  { id: "9bZkp7q19f0", title: "Synthwave Mix 2026", views: "892K", channel: "RetroFM" },
  { id: "kJQP7kiw5Fk", title: "Tokyo Neon Tour", views: "1.1M", channel: "Wander" },
  { id: "fJ9rUzIMcZQ", title: "AI Music Production", views: "412K", channel: "Cortex Lab" },
  { id: "L_jWHffIx5E", title: "Vaporwave Aesthetic", views: "765K", channel: "VHS" },
  { id: "60ItHLz5WEA", title: "Future Tech Showcase", views: "1.9M", channel: "OmniCast" },
];

export default function Videos() {
  const [sel, setSel] = useState(seed[0]);
  return (
    <div className="grid grid-cols-3 h-full text-white" data-testid="videos-app">
      <div className="col-span-3"><DemoBadge note="Curated YouTube samples. Personal subscriptions coming soon." /></div>
      <div className="col-span-2 p-5 flex flex-col">
        <div className="mono-label">// Stream</div>
        <h2 className="font-heading text-xl font-bold mb-3">{sel.title}</h2>
        <div className="flex-1 rounded-xl overflow-hidden bg-black border border-white/10">
          <iframe data-testid="video-player" width="100%" height="100%" src={`https://www.youtube.com/embed/${sel.id}`} title={sel.title} frameBorder="0" allow="accelerometer; autoplay; clipboard-write; encrypted-media; gyroscope; picture-in-picture" allowFullScreen className="w-full h-full"></iframe>
        </div>
        <div className="mt-3 text-sm text-slate-400">{sel.channel} • {sel.views} views</div>
      </div>
      <div className="border-l border-white/10 p-4 overflow-y-auto">
        <div className="mono-label mb-3">// Trending</div>
        <div className="space-y-2">
          {seed.map((v) => (
            <button key={v.id} onClick={() => setSel(v)} className={`w-full text-left flex gap-2 p-2 rounded-lg transition ${sel.id === v.id ? "bg-[#00F0FF]/10" : "hover:bg-white/5"}`}>
              <img src={`https://img.youtube.com/vi/${v.id}/mqdefault.jpg`} alt="" className="w-24 h-14 object-cover rounded" />
              <div className="flex-1 min-w-0">
                <div className="text-xs font-medium line-clamp-2">{v.title}</div>
                <div className="text-[10px] text-slate-500 mt-1">{v.channel}</div>
              </div>
            </button>
          ))}
        </div>
      </div>
    </div>
  );
}
