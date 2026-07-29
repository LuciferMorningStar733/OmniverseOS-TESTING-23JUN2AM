import React, { useState } from "react";
import DemoBadge from "../components/DemoBadge";

const seed = [
  { id: "lTRiuFIWV54", title: "Night City Radio",         views: "1.2M",  channel: "CDPR"          },
  { id: "dX3k_QDnzHE", title: "Midnight City",            views: "89M",   channel: "M83"           },
  { id: "y8OnoxKotPQ", title: "Redline",                  views: "520K",  channel: "Electric Youth" },
  { id: "gAjR4_CbPpQ", title: "Harder Better Faster",    views: "110M",  channel: "Daft Punk"     },
  { id: "RxabLA7UQ9k", title: "Midnight Cruising",        views: "890K",  channel: "Midnight"      },
  { id: "MV_3Dpw-BRY", title: "Dark All Day",             views: "8.5M",  channel: "Gunship"       },
];

export default function Videos() {
  const [sel, setSel] = useState(seed[0]);

  return (
    <div className="flex flex-col h-full text-white" data-testid="videos-app">
      <DemoBadge note="Curated YouTube samples. Personal subscriptions coming soon." />

      {/* Content area — stack on mobile, 3-col grid on desktop */}
      <div className="flex-1 flex flex-col sm:grid sm:grid-cols-3 overflow-hidden min-h-0">
        {/* Player */}
        <div className="sm:col-span-2 p-3 sm:p-5 flex flex-col min-h-0" style={{ flex: "1 1 auto", minHeight: 180 }}>
          <div className="mono-label">// Stream</div>
          <h2 className="font-heading text-base sm:text-xl font-bold mb-2 sm:mb-3 truncate">{sel.title}</h2>
          <div className="flex-1 rounded-xl overflow-hidden bg-black border border-white/10 min-h-0" style={{ minHeight: 160 }}>
            <iframe
              data-testid="video-player"
              width="100%"
              height="100%"
              src={`https://www.youtube.com/embed/${sel.id}`}
              title={sel.title}
              frameBorder="0"
              allow="accelerometer; autoplay; clipboard-write; encrypted-media; gyroscope; picture-in-picture"
              allowFullScreen
              className="w-full h-full"
              style={{ minHeight: 160 }}
            ></iframe>
          </div>
          <div className="mt-2 text-xs text-slate-400 flex-shrink-0">{sel.channel} • {sel.views} views</div>
        </div>

        {/* Playlist sidebar — horizontal scroll on mobile, vertical on desktop */}
        <div className="border-t sm:border-t-0 sm:border-l border-white/10 p-3 sm:p-4 flex-shrink-0">
          <div className="mono-label mb-2">// Trending</div>
          <div
            className="flex sm:flex-col gap-2 overflow-x-auto sm:overflow-x-visible sm:overflow-y-auto pb-1 sm:pb-0"
            style={{ WebkitOverflowScrolling: "touch" }}
          >
            {seed.map((v) => (
              <button
                key={v.id}
                onClick={() => setSel(v)}
                className={`flex-shrink-0 sm:flex-shrink text-left flex gap-2 p-2 rounded-lg transition
                  ${sel.id === v.id ? "bg-[#00F0FF]/10" : "hover:bg-white/5"}`}
                style={{ minWidth: 180, maxWidth: 220 }}
              >
                <img
                  src={`https://img.youtube.com/vi/${v.id}/mqdefault.jpg`}
                  alt=""
                  className="w-20 h-12 sm:w-24 sm:h-14 object-cover rounded flex-shrink-0"
                />
                <div className="flex-1 min-w-0">
                  <div className="text-xs font-medium line-clamp-2">{v.title}</div>
                  <div className="text-[10px] text-slate-500 mt-1">{v.channel}</div>
                </div>
              </button>
            ))}
          </div>
        </div>
      </div>
    </div>
  );
}
