import React, { useState } from "react";

const SIDEBAR_ITEMS = {
  pinned: [
    { id: "favorites", label: "Favorites", icon: "fa-heart", color: "#EC4899" },
    { id: "recently-saved", label: "Recently Saved", icon: "fa-clock", color: "#60A5FA" },
    { id: "map", label: "Map", icon: "fa-map-location-dot", color: "#34D399" },
    { id: "videos", label: "Videos", icon: "fa-video", color: "#F472B6" },
    { id: "screenshots", label: "Screenshots", icon: "fa-crop-simple", color: "#A78BFA" },
    { id: "people", label: "People & Pets", icon: "fa-user-group", color: "#FBBF24" },
    { id: "deleted", label: "Recently Deleted", icon: "fa-lock", color: "#9CA3AF" },
    { id: "scotland", label: "Scotland/England 2024", icon: "fa-folder", color: "#60A5FA" },
    { id: "nz", label: "New Zealand 2023", icon: "fa-folder", color: "#60A5FA" },
  ],
  sharing: [
    { id: "shared-albums", label: "Shared Albums", icon: "fa-folder-shared" },
    { id: "shared-with-you", label: "Shared with You", icon: "fa-user-friends" },
    { id: "shared-lib", label: "For Your Shared Lib...", badge: "9", icon: "fa-images" },
  ]
};

const PHOTOS_GRID = [
  {
    id: "img-1135",
    name: "IMG_1135.HEIC",
    title: "Stadium Sunset Crowd",
    bgGradient: "linear-gradient(135deg, #1e3c72 0%, #2a5298 50%, #e65c00 100%)",
    stadiumEffect: true,
  },
  {
    id: "img-1136",
    name: "IMG_1136.HEIC",
    title: "Arena Lights Wide",
    bgGradient: "linear-gradient(135deg, #0f2027 0%, #203a43 50%, #2c5364 100%)",
    stadiumEffect: true,
  },
  {
    id: "img-1137",
    name: "IMG_1137.HEIC",
    title: "Matchday Panoramic",
    bgGradient: "linear-gradient(135deg, #232526 0%, #414345 50%, #ff8c00 100%)",
    stadiumEffect: true,
  },
  {
    id: "img-1138",
    name: "IMG_1138.HEIC",
    title: "Golden Hour Stadium",
    bgGradient: "linear-gradient(135deg, #40e0d0 0%, #ff8c00 50%, #ff0080 100%)",
    stadiumEffect: true,
  },
  {
    id: "img-1139",
    name: "IMG_1139.HEIC",
    title: "Evening Crowd Stand",
    bgGradient: "linear-gradient(135deg, #111827 0%, #1f2937 60%, #f59e0b 100%)",
    stadiumEffect: true,
  },
  {
    id: "img-1140",
    name: "IMG_1140.HEIC",
    title: "Concert Arena Overhead",
    bgGradient: "linear-gradient(135deg, #1e1b4b 0%, #312e81 50%, #d97706 100%)",
    stadiumEffect: true,
  },
];

export default function PhotosApp() {
  const [selectedSidebar, setSelectedSidebar] = useState("favorites");
  const [searchQuery, setSearchQuery] = useState("");

  return (
    <div className="flex h-full w-full bg-[#f6f6f7] text-[#1c1c1e] font-sans overflow-hidden select-none" data-testid="photos-app">
      {/* ── macOS Light Glass Sidebar ── */}
      <div className="w-56 bg-[#eef0f3]/90 border-r border-[#d1d5db] flex flex-col p-3 flex-shrink-0 backdrop-blur-md">
        <div className="flex items-center justify-between mb-3 px-2">
          <div>
            <div className="font-bold text-sm text-[#111827]">Library</div>
            <div className="text-[11px] text-[#6b7280]">Jun 19, 2026</div>
          </div>
          <button className="text-slate-400 hover:text-slate-700 text-xs">
            <i className="fa-solid fa-sidebar" />
          </button>
        </div>

        {/* Navigation list */}
        <div className="flex-1 overflow-y-auto space-y-4 pr-1 text-xs">
          <div>
            <div className="px-2 text-[10px] font-semibold tracking-wider text-[#9ca3af] uppercase mb-1">
              Pinned
            </div>
            {SIDEBAR_ITEMS.pinned.map((item) => {
              const active = selectedSidebar === item.id;
              return (
                <button
                  key={item.id}
                  onClick={() => setSelectedSidebar(item.id)}
                  className={`w-full flex items-center justify-between px-2 py-1.5 rounded-md transition-colors text-left ${
                    active ? "bg-[#007aff] text-white font-medium shadow-sm" : "hover:bg-[#e2e5e9] text-[#374151]"
                  }`}
                >
                  <div className="flex items-center gap-2 truncate">
                    <i className={`fa-solid ${item.icon} ${active ? "text-white" : ""}`} style={{ color: active ? "#fff" : item.color, width: 14 }} />
                    <span className="truncate">{item.label}</span>
                  </div>
                </button>
              );
            })}
          </div>

          <div>
            <div className="px-2 text-[10px] font-semibold tracking-wider text-[#9ca3af] uppercase mb-1">
              Sharing
            </div>
            {SIDEBAR_ITEMS.sharing.map((item) => {
              const active = selectedSidebar === item.id;
              return (
                <button
                  key={item.id}
                  onClick={() => setSelectedSidebar(item.id)}
                  className={`w-full flex items-center justify-between px-2 py-1.5 rounded-md transition-colors text-left ${
                    active ? "bg-[#007aff] text-white font-medium" : "hover:bg-[#e2e5e9] text-[#374151]"
                  }`}
                >
                  <div className="flex items-center gap-2 truncate">
                    <i className={`fa-solid ${item.icon} text-slate-400`} style={{ width: 14 }} />
                    <span className="truncate">{item.label}</span>
                  </div>
                  {item.badge && (
                    <span className={`text-[10px] px-1.5 py-0.2 rounded-full font-semibold ${active ? "bg-white/20 text-white" : "bg-slate-200 text-slate-600"}`}>
                      {item.badge}
                    </span>
                  )}
                </button>
              );
            })}
          </div>
        </div>
      </div>

      {/* ── Main Photos Area ── */}
      <div className="flex-1 flex flex-col min-w-0 bg-white">
        {/* Toolbar Header */}
        <div className="h-11 border-b border-[#e5e7eb] px-4 flex items-center justify-between bg-[#fcfcfd]">
          <div className="flex items-center gap-3">
            <span className="font-semibold text-xs text-[#111827]">All Photos</span>
            <span className="text-[11px] text-[#9ca3af]">↕</span>
            <div className="h-4 w-px bg-slate-200" />
            <div className="flex items-center gap-1.5 text-slate-400 text-xs">
              <i className="fa-solid fa-minus cursor-pointer hover:text-slate-600" />
              <div className="w-16 h-1 bg-slate-200 rounded-full relative">
                <div className="w-8 h-full bg-[#007aff] rounded-full" />
              </div>
              <i className="fa-solid fa-plus cursor-pointer hover:text-slate-600" />
            </div>
          </div>

          <div className="flex items-center gap-2 text-slate-500 text-xs">
            <button className="p-1.5 hover:bg-slate-100 rounded-md">
              <i className="fa-solid fa-sliders" />
            </button>
            <button className="p-1.5 hover:bg-slate-100 rounded-md">
              <i className="fa-solid fa-[#007aff] fa-info-circle text-[#007aff]" />
            </button>
            <button className="p-1.5 hover:bg-slate-100 rounded-md">
              <i className="fa-solid fa-arrow-up-from-bracket" />
            </button>
            <button className="p-1.5 hover:bg-slate-100 rounded-md">
              <i className="fa-solid fa-heart" />
            </button>
            {/* Search Input */}
            <div className="relative flex items-center ml-2">
              <i className="fa-solid fa-magnifying-glass absolute left-2.5 text-slate-400 text-[11px]" />
              <input
                type="text"
                placeholder="Search"
                value={searchQuery}
                onChange={(e) => setSearchQuery(e.target.value)}
                className="pl-7 pr-3 py-1 bg-[#f3f4f6] text-xs text-slate-800 rounded-lg border border-[#e5e7eb] focus:outline-none focus:ring-1 focus:ring-[#007aff] w-36"
              />
            </div>
          </div>
        </div>

        {/* Gallery Grid */}
        <div className="flex-1 overflow-y-auto p-4 bg-[#f8fafc]">
          <div className="grid grid-cols-2 md:grid-cols-3 gap-3">
            {PHOTOS_GRID.map((photo) => (
              <div
                key={photo.id}
                className="group relative rounded-lg overflow-hidden border border-slate-200/80 bg-slate-900 shadow-sm hover:shadow-md transition-all duration-200 cursor-pointer aspect-video"
              >
                {/* Simulated High-Res Stadium Image Background */}
                <div
                  className="absolute inset-0 transition-transform duration-300 group-hover:scale-105"
                  style={{ background: photo.bgGradient }}
                >
                  {/* Stadium Glow & Pitch Overlay */}
                  <div className="absolute inset-0 bg-gradient-to-t from-black/70 via-black/20 to-transparent" />
                  <div className="absolute bottom-3 left-3 right-3 flex items-end justify-between text-white">
                    <span className="text-[11px] font-mono font-medium drop-shadow-md">
                      {photo.name}
                    </span>
                    <i className="fa-solid fa-users text-xs text-white/80 drop-shadow-md" />
                  </div>
                </div>

                {/* Favorite badge */}
                <div className="absolute top-2 right-2 opacity-0 group-hover:opacity-100 transition-opacity">
                  <i className="fa-solid fa-heart text-white/90 drop-shadow" />
                </div>
              </div>
            ))}
          </div>
        </div>
      </div>
    </div>
  );
}
