import React, { useState } from "react";
import DemoBadge from "../components/DemoBadge";

const shows = [
  { title: "Cyber Code", img: "https://images.unsplash.com/photo-1518709268805-4e9042af9f23?w=400", genre: "Sci-Fi" },
  { title: "Neon Heist", img: "https://images.unsplash.com/photo-1574267432553-4b4628081c31?w=400", genre: "Thriller" },
  { title: "Ghost Protocol", img: "https://images.unsplash.com/photo-1478720568477-152d9b164e26?w=400", genre: "Action" },
  { title: "Synth Dreams", img: "https://images.unsplash.com/photo-1542204625-ca960f9a0f51?w=400", genre: "Drama" },
  { title: "Pixel War", img: "https://images.unsplash.com/photo-1551103782-8ab07afd45c1?w=400", genre: "Anime" },
  { title: "Void Runners", img: "https://images.unsplash.com/photo-1518837695005-2083093ee35b?w=400", genre: "Sci-Fi" },
  { title: "Holo City", img: "https://images.unsplash.com/photo-1493514789931-586cb221d7a7?w=400", genre: "Documentary" },
  { title: "Static Echoes", img: "https://images.unsplash.com/photo-1536440136628-849c177e76a1?w=400", genre: "Horror" },
];

export default function Watchlist() {
  const [list, setList] = useState(() => {
    try { return JSON.parse(localStorage.getItem("omni_watchlist") || "[]"); } catch { return []; }
  });
  const toggle = (t) => {
    const next = list.includes(t) ? list.filter(x => x !== t) : [...list, t];
    setList(next);
    localStorage.setItem("omni_watchlist", JSON.stringify(next));
  };

  const feature = shows[0];

  return (
    <div className="h-full overflow-y-auto text-white" data-testid="watchlist-app">
      <DemoBadge note="Static titles. Watchlist saves to your browser only." />
      <div className="relative h-60">
        <img src={feature.img} alt="" className="absolute inset-0 w-full h-full object-cover opacity-50" />
        <div className="absolute inset-0 bg-gradient-to-t from-[#05050A] to-transparent" />
        <div className="absolute bottom-4 left-6">
          <div className="mono-label text-[#FF003C]">// Featured</div>
          <h1 className="font-heading text-3xl font-black">{feature.title}</h1>
          <p className="text-sm text-slate-300 mt-1 max-w-md">A neon-soaked thriller about the dawn of conscious code.</p>
          <button onClick={() => toggle(feature.title)} className="neon-btn primary mt-3"><i className="fa-solid fa-plus mr-2"></i>{list.includes(feature.title) ? "In Watchlist" : "Add to Watchlist"}</button>
        </div>
      </div>

      <div className="p-5">
        <div className="mono-label mb-2">// All Titles</div>
        <h3 className="font-heading text-lg font-bold mb-3">Continue Watching</h3>
        <div className="grid grid-cols-4 gap-3">
          {shows.map((s) => (
            <button key={s.title} onClick={() => toggle(s.title)} className="relative group rounded-lg overflow-hidden">
              <img src={s.img} alt={s.title} className="w-full aspect-[2/3] object-cover group-hover:scale-105 transition" />
              <div className="absolute inset-0 bg-gradient-to-t from-black/80 to-transparent flex items-end p-2">
                <div>
                  <div className="text-sm font-bold">{s.title}</div>
                  <div className="text-[10px] text-[#00F0FF] font-mono uppercase">{s.genre}</div>
                </div>
              </div>
              {list.includes(s.title) && <div className="absolute top-2 right-2 w-6 h-6 rounded-full bg-[#39FF14] text-black flex items-center justify-center text-xs"><i className="fa-solid fa-check"></i></div>}
            </button>
          ))}
        </div>
      </div>
    </div>
  );
}
