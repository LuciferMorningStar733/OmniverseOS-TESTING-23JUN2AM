import React, { useState } from "react";

const REAL_PHOTOS = [
  {
    id: "photo-01",
    name: "Cyberpunk_Metropolis_Tokyo.jpg",
    title: "Shibuya Neon Night",
    category: "favorites",
    url: "https://images.unsplash.com/photo-1503899036084-c55cdd92da26?auto=format&fit=crop&w=1200&q=80",
    thumb: "https://images.unsplash.com/photo-1503899036084-c55cdd92da26?auto=format&fit=crop&w=400&q=80",
    camera: "Sony α7R V",
    lens: "FE 24-70mm f/2.8 GM II",
    aperture: "f/2.8",
    shutter: "1/160s",
    iso: "ISO 400",
    resolution: "3840 x 2160 (4K UHD)",
    size: "14.8 MB",
    date: "Oct 2, 2026",
    location: "Shibuya City, Tokyo, Japan"
  },
  {
    id: "photo-02",
    name: "Deep_Space_Carina_Nebula.jpg",
    title: "Carina Cosmic Pillars",
    category: "favorites",
    url: "https://images.unsplash.com/photo-1451187580459-43490279c0fa?auto=format&fit=crop&w=1200&q=80",
    thumb: "https://images.unsplash.com/photo-1451187580459-43490279c0fa?auto=format&fit=crop&w=400&q=80",
    camera: "James Webb Space Telescope (NIRCam)",
    lens: "Infrared Optical Assembly",
    aperture: "f/1.2 Equivalent",
    shutter: "12,000s Exposure",
    iso: "Quantum Sensor",
    resolution: "4096 x 2304",
    size: "22.4 MB",
    date: "Sep 28, 2026",
    location: "Carina Nebula (7,600 light-years)"
  },
  {
    id: "photo-03",
    name: "Nordic_Lofoten_Fjords.jpg",
    title: "Lofoten Sunset Ridge",
    category: "favorites",
    url: "https://images.unsplash.com/photo-1507525428034-b723cf961d3e?auto=format&fit=crop&w=1200&q=80",
    thumb: "https://images.unsplash.com/photo-1507525428034-b723cf961d3e?auto=format&fit=crop&w=400&q=80",
    camera: "Fujifilm GFX 100 II",
    lens: "GF 23mm f/4 R LM WR",
    aperture: "f/8.0",
    shutter: "1/4s",
    iso: "ISO 100",
    resolution: "3840 x 2160",
    size: "18.2 MB",
    date: "Sep 15, 2026",
    location: "Reine, Lofoten, Norway"
  },
  {
    id: "photo-04",
    name: "Kyoto_Bamboo_Forest_Mist.jpg",
    title: "Arashiyama Bamboo Grove",
    category: "recently-saved",
    url: "https://images.unsplash.com/photo-1493976040374-85c8e12f0c0e?auto=format&fit=crop&w=1200&q=80",
    thumb: "https://images.unsplash.com/photo-1493976040374-85c8e12f0c0e?auto=format&fit=crop&w=400&q=80",
    camera: "Leica SL2",
    lens: "Apo-Summicron-SL 35mm f/2 ASPH",
    aperture: "f/2.0",
    shutter: "1/500s",
    iso: "ISO 200",
    resolution: "3840 x 2560",
    size: "16.1 MB",
    date: "Aug 20, 2026",
    location: "Kyoto, Japan"
  },
  {
    id: "photo-05",
    name: "Swiss_Alps_Matterhorn_Dawn.jpg",
    title: "Matterhorn Alpine Glow",
    category: "recently-saved",
    url: "https://images.unsplash.com/photo-1464822759023-fed622ff2c3b?auto=format&fit=crop&w=1200&q=80",
    thumb: "https://images.unsplash.com/photo-1464822759023-fed622ff2c3b?auto=format&fit=crop&w=400&q=80",
    camera: "Nikon Z9",
    lens: "NIKKOR Z 14-24mm f/2.8 S",
    aperture: "f/5.6",
    shutter: "1/250s",
    iso: "ISO 64",
    resolution: "3840 x 2160",
    size: "19.5 MB",
    date: "Aug 12, 2026",
    location: "Zermatt, Switzerland"
  },
  {
    id: "photo-06",
    name: "Big_Sur_Pacific_Coastline.jpg",
    title: "Big Sur Coastal Ridge",
    category: "screenshots",
    url: "https://images.unsplash.com/photo-1447752875215-b2761acb3c5d?auto=format&fit=crop&w=1200&q=80",
    thumb: "https://images.unsplash.com/photo-1447752875215-b2761acb3c5d?auto=format&fit=crop&w=400&q=80",
    camera: "Canon EOS R3",
    lens: "RF 15-35mm f/2.8L IS USM",
    aperture: "f/11",
    shutter: "1/60s",
    iso: "ISO 100",
    resolution: "3840 x 2160",
    size: "12.7 MB",
    date: "Jul 30, 2026",
    location: "California Highway 1, USA"
  },
  {
    id: "photo-07",
    name: "Quantum_Laser_Optical_Lab.jpg",
    title: "Photonics Resonator",
    category: "screenshots",
    url: "https://images.unsplash.com/photo-1507668077129-56e32842fceb?auto=format&fit=crop&w=1200&q=80",
    thumb: "https://images.unsplash.com/photo-1507668077129-56e32842fceb?auto=format&fit=crop&w=400&q=80",
    camera: "Hasselblad X2D 100C",
    lens: "XCD 38mm f/2.5 V",
    aperture: "f/4.0",
    shutter: "1/1000s",
    iso: "ISO 800",
    resolution: "3840 x 2880",
    size: "25.1 MB",
    date: "Jul 18, 2026",
    location: "MIT Quantum Optics Facility"
  },
  {
    id: "photo-08",
    name: "Icelandic_Volcanic_Basalt.jpg",
    title: "Reynisdrangar Lava Fields",
    category: "videos",
    url: "https://images.unsplash.com/photo-1470071459604-3b5ec3a7fe05?auto=format&fit=crop&w=1200&q=80",
    thumb: "https://images.unsplash.com/photo-1470071459604-3b5ec3a7fe05?auto=format&fit=crop&w=400&q=80",
    camera: "DJI Mavic 3 Pro",
    lens: "Hasselblad 24mm f/2.8",
    aperture: "f/5.6",
    shutter: "1/120s",
    iso: "ISO 200",
    resolution: "3840 x 2160",
    size: "15.9 MB",
    date: "Jun 14, 2026",
    location: "Vik, Iceland"
  }
];

const SIDEBAR_ITEMS = [
  { id: "all", label: "All Photos", icon: "fa-images", count: 8 },
  { id: "favorites", label: "Favorites", icon: "fa-heart", color: "#EC4899", count: 3 },
  { id: "recently-saved", label: "Recently Saved", icon: "fa-clock", color: "#60A5FA", count: 2 },
  { id: "screenshots", label: "Screenshots & Art", icon: "fa-crop-simple", color: "#A78BFA", count: 2 },
  { id: "videos", label: "Videos & Media", icon: "fa-video", color: "#F472B6", count: 1 },
];

export default function PhotosApp() {
  const [selectedSidebar, setSelectedSidebar] = useState("all");
  const [searchQuery, setSearchQuery] = useState("");
  const [activePhoto, setActivePhoto] = useState(null);
  const [customPhotos, setCustomPhotos] = useState([]);

  const handleUploadPhoto = (e) => {
    const file = e.target.files?.[0];
    if (!file) return;

    const reader = new FileReader();
    reader.onload = (event) => {
      const dataUrl = event.target?.result;
      const newPhoto = {
        id: `upload-${Date.now()}`,
        name: file.name,
        title: file.name.replace(/\.[^/.]+$/, ""),
        category: "all",
        url: dataUrl,
        thumb: dataUrl,
        camera: "User Uploaded Asset",
        lens: "Native Local File",
        aperture: "Custom",
        shutter: "Local",
        iso: "Local",
        resolution: "Native Resolution",
        size: `${(file.size / (1024 * 1024)).toFixed(1)} MB`,
        date: "Just now",
        location: "Local Machine Storage"
      };
      setCustomPhotos([newPhoto, ...customPhotos]);
      setActivePhoto(newPhoto);
    };
    reader.readAsDataURL(file);
  };

  const allCombined = [...customPhotos, ...REAL_PHOTOS];

  const filteredPhotos = allCombined.filter((p) => {
    const matchesCategory = selectedSidebar === "all" || p.category === selectedSidebar;
    const matchesSearch = !searchQuery || 
      p.title.toLowerCase().includes(searchQuery.toLowerCase()) || 
      p.name.toLowerCase().includes(searchQuery.toLowerCase()) ||
      p.location.toLowerCase().includes(searchQuery.toLowerCase());
    return matchesCategory && matchesSearch;
  });

  return (
    <div className="flex h-full w-full bg-[#f6f6f7] text-[#1c1c1e] font-sans overflow-hidden select-none" data-testid="photos-app">
      {/* ── macOS Light Glass Sidebar ── */}
      <div className="w-56 bg-[#eef0f3]/90 border-r border-[#d1d5db] flex flex-col p-3 flex-shrink-0 backdrop-blur-md">
        <div className="flex items-center justify-between mb-3 px-2">
          <div>
            <div className="font-bold text-sm text-[#111827]">Photos Library</div>
            <div className="text-[11px] text-[#6b7280]">{allCombined.length} Real 4K Assets</div>
          </div>
          <label className="text-[#007aff] hover:text-[#0056b3] text-xs font-semibold cursor-pointer flex items-center gap-1 bg-[#007aff]/10 px-2 py-1 rounded-md transition-colors">
            <i className="fa-solid fa-plus text-[10px]" />
            <span>Upload</span>
            <input type="file" accept="image/*" onChange={handleUploadPhoto} className="hidden" />
          </label>
        </div>

        {/* Navigation list */}
        <div className="flex-1 overflow-y-auto space-y-1 text-xs">
          <div className="px-2 text-[10px] font-semibold tracking-wider text-[#9ca3af] uppercase mb-1">
            Library Categories
          </div>
          {SIDEBAR_ITEMS.map((item) => {
            const active = selectedSidebar === item.id;
            return (
              <button
                key={item.id}
                onClick={() => setSelectedSidebar(item.id)}
                className={`w-full flex items-center justify-between px-2.5 py-1.5 rounded-md transition-colors text-left ${
                  active ? "bg-[#007aff] text-white font-medium shadow-sm" : "hover:bg-[#e2e5e9] text-[#374151]"
                }`}
              >
                <div className="flex items-center gap-2 truncate">
                  <i className={`fa-solid ${item.icon}`} style={{ color: active ? "#ffffff" : item.color }} />
                  <span className="truncate">{item.label}</span>
                </div>
              </button>
            );
          })}
        </div>

        <div className="pt-2 border-t border-[#d1d5db] text-[10px] text-slate-500 text-center font-mono">
          High-Res 4K Asset Manager
        </div>
      </div>

      {/* ── Main Content Area ── */}
      <div className="flex-1 flex flex-col min-w-0 bg-white">
        {/* Top Control Bar */}
        <div className="h-11 border-b border-[#e5e7eb] px-4 flex items-center justify-between bg-[#f9fafb]">
          <div className="flex items-center gap-2">
            <h2 className="text-sm font-bold text-slate-800">
              {SIDEBAR_ITEMS.find((s) => s.id === selectedSidebar)?.label || "Photos"}
            </h2>
            <span className="text-xs text-slate-400 font-mono">({filteredPhotos.length} items)</span>
          </div>

          <div className="flex items-center gap-3">
            <div className="relative">
              <i className="fa-solid fa-magnifying-glass absolute left-2.5 top-2.5 text-slate-400 text-xs" />
              <input
                type="text"
                placeholder="Search location, title..."
                value={searchQuery}
                onChange={(e) => setSearchQuery(e.target.value)}
                className="pl-8 pr-3 py-1 bg-white border border-[#d1d5db] rounded-lg text-xs text-slate-800 placeholder-slate-400 focus:outline-none focus:ring-1 focus:ring-[#007aff] w-48 shadow-sm"
              />
            </div>
          </div>
        </div>

        {/* ── Real Photo Grid ── */}
        <div className="flex-1 overflow-y-auto p-4">
          <div className="grid grid-cols-2 sm:grid-cols-3 md:grid-cols-4 gap-3">
            {filteredPhotos.map((photo) => (
              <div
                key={photo.id}
                onClick={() => setActivePhoto(photo)}
                className="group relative aspect-[4/3] rounded-xl overflow-hidden border border-slate-200 bg-slate-900 cursor-pointer shadow-sm hover:shadow-md transition-all duration-200 hover:scale-[1.02]"
              >
                <img
                  src={photo.thumb}
                  alt={photo.title}
                  className="w-full h-full object-cover transition-transform duration-300 group-hover:scale-105"
                  loading="lazy"
                />
                <div className="absolute inset-0 bg-gradient-to-t from-black/80 via-transparent to-transparent opacity-0 group-hover:opacity-100 transition-opacity p-2.5 flex flex-col justify-end">
                  <div className="text-white text-xs font-bold truncate">{photo.title}</div>
                  <div className="text-white/70 text-[10px] font-mono truncate">{photo.location}</div>
                </div>
              </div>
            ))}
          </div>
        </div>
      </div>

      {/* ── High-Res Photo Lightbox Modal ── */}
      {activePhoto && (
        <div className="fixed inset-0 z-50 bg-black/90 backdrop-blur-xl flex flex-col items-center justify-between p-4 text-white">
          {/* Lightbox Header */}
          <div className="w-full flex items-center justify-between max-w-5xl border-b border-white/10 pb-3">
            <div>
              <h3 className="text-base font-bold">{activePhoto.title}</h3>
              <p className="text-xs text-white/60 font-mono">{activePhoto.name} · {activePhoto.location}</p>
            </div>
            <button
              onClick={() => setActivePhoto(null)}
              className="w-8 h-8 rounded-full bg-white/10 hover:bg-white/20 border border-white/20 flex items-center justify-center text-white transition-colors"
            >
              <i className="fa-solid fa-xmark text-sm" />
            </button>
          </div>

          {/* Lightbox Main Image */}
          <div className="flex-1 flex items-center justify-center p-4 max-h-[70vh] w-full">
            <img
              src={activePhoto.url}
              alt={activePhoto.title}
              className="max-h-full max-w-full object-contain rounded-lg shadow-2xl border border-white/10"
            />
          </div>

          {/* Lightbox EXIF Telemetry Footer */}
          <div className="w-full max-w-5xl bg-white/5 border border-white/10 rounded-xl p-3 backdrop-blur-md grid grid-cols-2 sm:grid-cols-4 gap-2 text-xs font-mono">
            <div>
              <span className="text-white/40 block text-[10px]">CAMERA & LENS</span>
              <span className="font-semibold text-cyan-400">{activePhoto.camera}</span>
            </div>
            <div>
              <span className="text-white/40 block text-[10px]">EXIF SETTINGS</span>
              <span className="font-semibold text-emerald-400">{activePhoto.aperture} · {activePhoto.shutter} · {activePhoto.iso}</span>
            </div>
            <div>
              <span className="text-white/40 block text-[10px]">RESOLUTION & SIZE</span>
              <span className="font-semibold text-purple-400">{activePhoto.resolution} ({activePhoto.size})</span>
            </div>
            <div>
              <span className="text-white/40 block text-[10px]">DATE STAMP</span>
              <span className="font-semibold text-amber-400">{activePhoto.date}</span>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
