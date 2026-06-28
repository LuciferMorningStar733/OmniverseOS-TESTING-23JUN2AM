import React, { useState, useCallback, useRef, useEffect } from "react";
  import { motion, AnimatePresence } from "framer-motion";
  import { useOS } from "../context/OSContext";
  import {
    WALLPAPERS, WALLPAPER_CATEGORIES,
    getCustomWallpapers, addCustomWallpaper, deleteCustomWallpaper,
    getFavorites, toggleFavorite, getRecentWallpapers, trackRecentWallpaper,
  } from "../lib/wallpapers";

  /* ── Category pill ───────────────────────────────────────────────────────── */
  function CatPill({ label, active, onClick }) {
    return (
      <motion.button
        whileTap={{ scale: 0.92 }}
        onClick={onClick}
        style={{
          padding: "5px 12px", borderRadius: 20,
          fontSize: 11, fontFamily: "'JetBrains Mono', monospace",
          border: active ? "1px solid rgba(0,240,255,0.6)" : "1px solid rgba(255,255,255,0.1)",
          background: active ? "rgba(0,240,255,0.12)" : "rgba(255,255,255,0.04)",
          color: active ? "#00F0FF" : "rgba(255,255,255,0.5)",
          cursor: "pointer", flexShrink: 0,
          transition: "all 0.18s ease",
          WebkitTapHighlightColor: "transparent",
        }}
      >
        {label}
      </motion.button>
    );
  }

  /* ── Wallpaper card ──────────────────────────────────────────────────────── */
  function WallpaperCard({ wp, active, isFav, onApply, onFav, onDelete, customDataURL }) {
    return (
      <motion.div
        layout
        initial={{ opacity: 0, scale: 0.94 }}
        animate={{ opacity: 1, scale: 1 }}
        exit={{ opacity: 0, scale: 0.9 }}
        transition={{ duration: 0.2, ease: [0.22, 1, 0.36, 1] }}
        style={{ position: "relative", aspectRatio: "16 / 10" }}
      >
        <motion.button
          onClick={onApply}
          whileHover={{ y: -2, scale: 1.01 }}
          whileTap={{ scale: 0.97 }}
          transition={{ type: "spring", stiffness: 340, damping: 22 }}
          style={{
            width: "100%", height: "100%",
            borderRadius: 14, overflow: "hidden",
            border: active
              ? "2px solid rgba(0,240,255,0.8)"
              : "1px solid rgba(255,255,255,0.08)",
            boxShadow: active
              ? "0 0 0 3px rgba(0,240,255,0.18), 0 18px 40px rgba(0,0,0,0.5)"
              : "0 4px 20px rgba(0,0,0,0.3)",
            cursor: "pointer", position: "relative",
            WebkitTapHighlightColor: "transparent",
            transition: "border-color 0.2s ease, box-shadow 0.2s ease",
            background: "transparent",
          }}
        >
          {/* Preview */}
          {customDataURL ? (
            <div style={{
              position: "absolute", inset: 0,
              backgroundImage: `url(${customDataURL})`,
              backgroundSize: "cover", backgroundPosition: "center",
            }} />
          ) : (
            <div className={`absolute inset-0 ${wp.className}`}>
              {wp.typo?.main && (
                <div className="wp-typo" style={{
                  fontSize: "clamp(16px, 3vw, 28px)",
                  WebkitTextStroke: "0.7px rgba(0,240,255,0.5)",
                  textShadow: "0 0 8px rgba(0,240,255,0.2)",
                }}>
                  {wp.typo.main}
                  {wp.typo.line2 && <span style={{ WebkitTextStroke: "0.7px rgba(255,0,60,0.6)" }}>{wp.typo.line2}</span>}
                </div>
              )}
            </div>
          )}

          {/* Name overlay */}
          <div style={{
            position: "absolute", inset: "auto 0 0 0",
            padding: "20px 10px 8px",
            background: "linear-gradient(to top, rgba(0,0,0,0.9) 0%, transparent 100%)",
          }}>
            <div style={{ fontSize: 11, fontWeight: 600, color: "#fff" }}>{wp.name}</div>
            {wp.category && (
              <div style={{ fontSize: 9, fontFamily: "'JetBrains Mono', monospace",
                color: "rgba(255,255,255,0.35)", letterSpacing: "0.1em", marginTop: 1 }}>
                {wp.category.toUpperCase()}
              </div>
            )}
          </div>

          {/* Active checkmark */}
          <AnimatePresence>
            {active && (
              <motion.div
                initial={{ scale: 0, opacity: 0 }}
                animate={{ scale: 1, opacity: 1 }}
                exit={{ scale: 0, opacity: 0 }}
                transition={{ type: "spring", stiffness: 380, damping: 18 }}
                style={{
                  position: "absolute", top: 8, right: onDelete ? 30 : 8,
                  width: 22, height: 22, borderRadius: "50%",
                  background: "#00F0FF", color: "#000",
                  display: "flex", alignItems: "center", justifyContent: "center",
                  fontSize: 10, fontWeight: 700,
                  boxShadow: "0 0 14px rgba(0,240,255,0.7)",
                }}
              >
                <i className="fa-solid fa-check" />
              </motion.div>
            )}
          </AnimatePresence>
        </motion.button>

        {/* Fav button */}
        <motion.button
          whileTap={{ scale: 0.8 }}
          onClick={onFav}
          style={{
            position: "absolute", top: 7, left: 7,
            width: 24, height: 24, borderRadius: 8,
            background: "rgba(0,0,0,0.6)",
            border: "1px solid rgba(255,255,255,0.1)",
            color: isFav ? "#FCEE09" : "rgba(255,255,255,0.35)",
            cursor: "pointer", display: "flex", alignItems: "center", justifyContent: "center",
            fontSize: 10, zIndex: 2,
            WebkitTapHighlightColor: "transparent",
            transition: "color 0.2s ease",
          }}
          title={isFav ? "Remove favorite" : "Add to favorites"}
        >
          <i className={isFav ? "fa-solid fa-star" : "fa-regular fa-star"} />
        </motion.button>

        {/* Delete (custom only) */}
        {onDelete && (
          <motion.button
            whileTap={{ scale: 0.8 }}
            onClick={onDelete}
            style={{
              position: "absolute", top: 7, right: 7,
              width: 24, height: 24, borderRadius: 8,
              background: "rgba(0,0,0,0.6)",
              border: "1px solid rgba(255,0,60,0.2)",
              color: "rgba(255,0,60,0.6)", cursor: "pointer",
              display: "flex", alignItems: "center", justifyContent: "center",
              fontSize: 10, zIndex: 2, WebkitTapHighlightColor: "transparent",
            }}
            title="Delete custom wallpaper"
          >
            <i className="fa-solid fa-trash-can" />
          </motion.button>
        )}
      </motion.div>
    );
  }

  /* ── Main WallpaperStudio ────────────────────────────────────────────────── */
  export default function WallpaperStudio() {
    const { wallpaper, setWallpaper } = useOS();
    const [category,  setCategory]  = useState("All");
    const [search,    setSearch]    = useState("");
    const [favs,      setFavs]      = useState(() => getFavorites());
    const [recent,    setRecent]    = useState(() => getRecentWallpapers());
    const [customs,   setCustoms]   = useState(() => getCustomWallpapers());
    const [random,    setRandom]    = useState(false);
    const fileRef = useRef(null);

    const applyWallpaper = useCallback((id) => {
      setWallpaper(id);
      trackRecentWallpaper(id);
      setRecent(getRecentWallpapers());
    }, [setWallpaper]);

    // Random wallpaper rotation
    useEffect(() => {
      if (!random) return;
      const all = [...WALLPAPERS, ...customs];
      const interval = setInterval(() => {
        const next = all[Math.floor(Math.random() * all.length)];
        applyWallpaper(next.id);
      }, 5 * 60 * 1000); // every 5 min
      return () => clearInterval(interval);
    }, [random, customs, applyWallpaper]);

    const handleFav = useCallback((id) => {
      setFavs(toggleFavorite(id));
    }, []);

    const handleUpload = useCallback((e) => {
      const file = e.target.files?.[0];
      if (!file) return;
      const reader = new FileReader();
      reader.onload = (ev) => {
        const wp = addCustomWallpaper(file.name.replace(/\.[^.]+$/, ""), ev.target.result);
        setCustoms(getCustomWallpapers());
        applyWallpaper(wp.id);
        setCategory("Custom");
      };
      reader.readAsDataURL(file);
      e.target.value = "";
    }, [applyWallpaper]);

    const handleDeleteCustom = useCallback((id) => {
      deleteCustomWallpaper(id);
      setCustoms(getCustomWallpapers());
      if (wallpaper === id) setWallpaper("neural-core");
    }, [wallpaper, setWallpaper]);

    // Filter logic
    const builtInFiltered = (() => {
      let list = WALLPAPERS;
      if (category === "Favorites") list = list.filter((w) => favs.includes(w.id));
      else if (category !== "All" && category !== "Custom") list = list.filter((w) => w.category === category);
      if (search.trim()) list = list.filter((w) => w.name.toLowerCase().includes(search.toLowerCase()));
      return list;
    })();

    const customFiltered = (category === "All" || category === "Custom")
      ? customs.filter((w) => !search.trim() || w.name.toLowerCase().includes(search.toLowerCase()))
      : [];

    const allVisible = [...builtInFiltered, ...customFiltered];

    return (
      <div style={{ display: "flex", flexDirection: "column", gap: 14 }}>
        {/* Header row */}
        <div style={{ display: "flex", alignItems: "center", gap: 10, flexWrap: "wrap" }}>
          {/* Search */}
          <div style={{ flex: 1, minWidth: 120, position: "relative" }}>
            <i className="fa-solid fa-magnifying-glass" style={{
              position: "absolute", left: 10, top: "50%", transform: "translateY(-50%)",
              fontSize: 11, color: "rgba(255,255,255,0.3)", pointerEvents: "none",
            }} />
            <input
              type="text"
              placeholder="Search wallpapers…"
              value={search}
              onChange={(e) => setSearch(e.target.value)}
              style={{
                width: "100%", height: 34, paddingLeft: 30, paddingRight: 10,
                background: "rgba(255,255,255,0.05)",
                border: "1px solid rgba(255,255,255,0.1)",
                borderRadius: 10, outline: "none", color: "#fff",
                fontSize: 12, fontFamily: "'JetBrains Mono', monospace",
              }}
            />
          </div>

          {/* Upload button */}
          <motion.button
            whileTap={{ scale: 0.93 }}
            onClick={() => fileRef.current?.click()}
            style={{
              height: 34, padding: "0 12px", borderRadius: 10, flexShrink: 0,
              background: "rgba(0,240,255,0.08)", border: "1px solid rgba(0,240,255,0.25)",
              color: "#00F0FF", fontSize: 11, fontFamily: "'JetBrains Mono', monospace",
              cursor: "pointer", display: "flex", alignItems: "center", gap: 6,
              WebkitTapHighlightColor: "transparent",
            }}
          >
            <i className="fa-solid fa-upload" style={{ fontSize: 10 }} />
            Upload
          </motion.button>
          <input
            ref={fileRef}
            type="file" accept=".jpg,.jpeg,.png,.webp" style={{ display: "none" }}
            onChange={handleUpload}
          />

          {/* Random toggle */}
          <motion.button
            whileTap={{ scale: 0.93 }}
            onClick={() => setRandom((v) => !v)}
            title="Rotate wallpaper every 5 minutes"
            style={{
              height: 34, width: 34, borderRadius: 10, flexShrink: 0,
              background: random ? "rgba(252,238,9,0.12)" : "rgba(255,255,255,0.05)",
              border: random ? "1px solid rgba(252,238,9,0.4)" : "1px solid rgba(255,255,255,0.1)",
              color: random ? "#FCEE09" : "rgba(255,255,255,0.4)",
              cursor: "pointer", display: "flex", alignItems: "center", justifyContent: "center",
              WebkitTapHighlightColor: "transparent",
            }}
          >
            <i className="fa-solid fa-shuffle" style={{ fontSize: 12 }} />
          </motion.button>
        </div>

        {/* Category pills */}
        <div style={{ display: "flex", gap: 6, overflowX: "auto", paddingBottom: 2 }}>
          {WALLPAPER_CATEGORIES.map((cat) => (
            <CatPill
              key={cat}
              label={cat === "Favorites" ? `★ Favs (${favs.length})` : cat === "Custom" ? `Custom (${customs.length})` : cat}
              active={category === cat}
              onClick={() => setCategory(cat)}
            />
          ))}
        </div>

        {/* Recently used strip */}
        {category === "All" && recent.length > 0 && !search && (
          <div>
            <div style={{
              fontSize: 10, fontFamily: "'JetBrains Mono', monospace",
              color: "rgba(255,255,255,0.3)", letterSpacing: "0.1em",
              marginBottom: 8, textTransform: "uppercase",
            }}>Recent</div>
            <div style={{ display: "flex", gap: 8, overflowX: "auto", paddingBottom: 4 }}>
              {recent.slice(0, 6).map((id) => {
                const wp = [...WALLPAPERS, ...customs].find((w) => w.id === id);
                if (!wp) return null;
                const active = wallpaper === id;
                return (
                  <motion.button
                    key={id}
                    whileTap={{ scale: 0.94 }}
                    onClick={() => applyWallpaper(id)}
                    style={{
                      flexShrink: 0, width: 64, height: 40, borderRadius: 8, overflow: "hidden",
                      border: active ? "2px solid rgba(0,240,255,0.8)" : "1px solid rgba(255,255,255,0.1)",
                      cursor: "pointer", position: "relative", background: "transparent",
                      WebkitTapHighlightColor: "transparent",
                    }}
                  >
                    {wp.dataURL ? (
                      <div style={{
                        position: "absolute", inset: 0,
                        backgroundImage: `url(${wp.dataURL})`,
                        backgroundSize: "cover", backgroundPosition: "center",
                      }} />
                    ) : (
                      <div className={`absolute inset-0 ${wp.className}`} style={{ transform: "scale(1)" }} />
                    )}
                    {active && (
                      <div style={{
                        position: "absolute", inset: 0, display: "flex",
                        alignItems: "center", justifyContent: "center",
                        background: "rgba(0,240,255,0.1)",
                      }}>
                        <i className="fa-solid fa-check" style={{ color: "#00F0FF", fontSize: 10 }} />
                      </div>
                    )}
                  </motion.button>
                );
              })}
            </div>
          </div>
        )}

        {/* Count */}
        <div style={{
          fontSize: 10, fontFamily: "'JetBrains Mono', monospace",
          color: "rgba(255,255,255,0.3)", letterSpacing: "0.08em",
        }}>
          {allVisible.length} wallpaper{allVisible.length !== 1 ? "s" : ""} · {random ? "🔀 auto-rotating" : "manual"}
        </div>

        {/* Grid */}
        <AnimatePresence mode="popLayout">
          {allVisible.length === 0 ? (
            <motion.div
              key="empty"
              initial={{ opacity: 0 }} animate={{ opacity: 1 }}
              style={{
                padding: "40px 0", textAlign: "center",
                color: "rgba(255,255,255,0.25)", fontSize: 13,
                fontFamily: "'JetBrains Mono', monospace",
              }}
            >
              No wallpapers found
            </motion.div>
          ) : (
            <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr", gap: 10 }}>
              <AnimatePresence>
                {allVisible.map((wp) => (
                  <WallpaperCard
                    key={wp.id}
                    wp={wp}
                    active={wallpaper === wp.id}
                    isFav={favs.includes(wp.id)}
                    onApply={() => applyWallpaper(wp.id)}
                    onFav={() => handleFav(wp.id)}
                    onDelete={wp.category === "Custom" ? () => handleDeleteCustom(wp.id) : undefined}
                    customDataURL={wp.dataURL}
                  />
                ))}
              </AnimatePresence>
            </div>
          )}
        </AnimatePresence>
      </div>
    );
  }
  