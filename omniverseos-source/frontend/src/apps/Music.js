import React, { useState, useEffect, useRef, useCallback } from "react";
import { motion, AnimatePresence } from "framer-motion";

/* ── Curated library — real YouTube IDs, cyberpunk / synthwave / lo-fi ── */
const LIBRARY = [
  { id: "wCTSOiJ0Gbs", title: "Nightcall",             artist: "Kavinsky",           genre: "Synthwave" },
  { id: "qB3yKCWKRsE", title: "Turbo Killer",          artist: "Carpenter Brut",      genre: "Synthwave" },
  { id: "MV_3Dpw-BRY", title: "Dark All Day",          artist: "Gunship",             genre: "Synthwave" },
  { id: "y8OnoxKotPQ", title: "Redline",               artist: "Electric Youth",      genre: "Synthwave" },
  { id: "pi_rFNn6sSs", title: "Blade Runner Blues",    artist: "Vangelis",            genre: "Ambient"   },
  { id: "5qJp6xlKEug", title: "Juno",                  artist: "Johann Johannsson",   genre: "Ambient"   },
  { id: "jfKfPfyJRdk", title: "Lofi Hip Hop Radio",    artist: "Lofi Girl",           genre: "Lo-Fi"     },
  { id: "7NOSDKb0HlU", title: "Late Night Coding",     artist: "ChilledCow",          genre: "Lo-Fi"     },
  { id: "4xDzrJKXOOY", title: "Synthwave Radio",       artist: "Pixel Thunder",       genre: "Synthwave" },
  { id: "b_09K4NFBXQ", title: "Cyberpunk 2077 OST",   artist: "Marcin Przybylowicz", genre: "Cyberpunk" },
  { id: "lTRiuFIWV54", title: "Night City Radio",      artist: "CDPR",                genre: "Cyberpunk" },
  { id: "5yx6BWlEVcY", title: "Ghost in the Shell OST","artist": "Kenji Kawai",       genre: "Ambient"   },
  { id: "RxabLA7UQ9k", title: "Midnight Cruising",     artist: "Midnight",            genre: "Synthwave" },
  { id: "G2OhFoYjWGk", title: "Neon Noir",             artist: "Dance With The Dead", genre: "Cyberpunk" },
  { id: "UPnQXBOllBE", title: "Deep Focus Radio",      artist: "LoFi Records",        genre: "Lo-Fi"     },
];

const GENRES = ["All", "Synthwave", "Cyberpunk", "Lo-Fi", "Ambient"];

/* ── YouTube thumbnail URL ── */
const thumb = (id) => `https://img.youtube.com/vi/${id}/mqdefault.jpg`;

/* ── Load YT IFrame API once globally ── */
let YT_API_LOADED = false;
let YT_API_CALLBACKS = [];

function loadYTApi(cb) {
  if (window.YT && window.YT.Player) { cb(); return; }
  YT_API_CALLBACKS.push(cb);
  if (YT_API_LOADED) return;
  YT_API_LOADED = true;
  window.onYouTubeIframeAPIReady = () => {
    YT_API_CALLBACKS.forEach((fn) => fn());
    YT_API_CALLBACKS = [];
  };
  const tag = document.createElement("script");
  tag.src = "https://www.youtube.com/iframe_api";
  document.head.appendChild(tag);
}

/* ── Format seconds → m:ss ── */
function fmt(s) {
  if (!s || isNaN(s)) return "0:00";
  const m = Math.floor(s / 60);
  const sec = Math.floor(s % 60).toString().padStart(2, "0");
  return `${m}:${sec}`;
}

/* ── Animated waveform bars (shown while playing) ── */
function Waveform({ active }) {
  return (
    <div className="flex items-end gap-[2px] h-4" aria-hidden>
      {[0.6, 1, 0.75, 0.9, 0.55, 0.8, 0.65].map((h, i) => (
        <motion.div
          key={i}
          className="w-[3px] rounded-full bg-[#00F0FF]"
          animate={active ? { scaleY: [h, 1, 0.4, h], opacity: [0.8, 1, 0.6, 0.8] } : { scaleY: 0.2, opacity: 0.3 }}
          transition={{ duration: 0.8 + i * 0.1, repeat: Infinity, ease: "easeInOut", delay: i * 0.07 }}
          style={{ height: 16, originY: 1 }}
        />
      ))}
    </div>
  );
}

/* ── Custom URL extractor ── */
function extractYTId(input) {
  const patterns = [
    /(?:youtube\.com\/watch\?v=|youtu\.be\/|youtube\.com\/embed\/)([A-Za-z0-9_-]{11})/,
    /^([A-Za-z0-9_-]{11})$/,
  ];
  for (const re of patterns) {
    const m = input.match(re);
    if (m) return m[1];
  }
  return null;
}

export default function Music() {
  const [genre,      setGenre]      = useState("All");
  const [search,     setSearch]     = useState("");
  const [trackIdx,   setTrackIdx]   = useState(0);
  const [playing,    setPlaying]    = useState(false);
  const [progress,   setProgress]   = useState(0);       // 0–1
  const [currentSec, setCurrentSec] = useState(0);
  const [durationSec,setDurationSec]= useState(0);
  const [apiReady,   setApiReady]   = useState(false);
  const [volume,     setVolume]     = useState(80);
  const [customUrl,  setCustomUrl]  = useState("");
  const [customErr,  setCustomErr]  = useState("");
  const [library,    setLibrary]    = useState(LIBRARY);

  const playerRef   = useRef(null);
  const containerRef= useRef(null);
  const timerRef    = useRef(null);

  /* ── Filtered list ── */
  const filtered = library.filter((t) => {
    if (genre !== "All" && t.genre !== genre) return false;
    if (search && !`${t.title} ${t.artist}`.toLowerCase().includes(search.toLowerCase())) return false;
    return true;
  });

  const track = library[trackIdx] || library[0];

  /* ── Load YouTube API ── */
  useEffect(() => {
    loadYTApi(() => setApiReady(true));
  }, []);

  /* ── Create / recreate player when track changes ── */
  useEffect(() => {
    if (!apiReady || !containerRef.current) return;

    if (playerRef.current) {
      try { playerRef.current.destroy(); } catch (_) {}
      playerRef.current = null;
    }
    clearInterval(timerRef.current);
    setProgress(0); setCurrentSec(0); setDurationSec(0);

    playerRef.current = new window.YT.Player(containerRef.current, {
      videoId: track.id,
      playerVars: {
        autoplay:       1,
        controls:       0,
        disablekb:      1,
        modestbranding: 1,
        rel:            0,
        iv_load_policy: 3,
        playsinline:    1,
      },
      events: {
        onReady(e) {
          e.target.setVolume(volume);
          e.target.playVideo();
          setPlaying(true);
          setDurationSec(e.target.getDuration() || 0);
        },
        onStateChange(e) {
          const s = e.data;
          if (s === window.YT.PlayerState.PLAYING) {
            setPlaying(true);
            setDurationSec(e.target.getDuration() || 0);
            clearInterval(timerRef.current);
            timerRef.current = setInterval(() => {
              const cur = e.target.getCurrentTime() || 0;
              const dur = e.target.getDuration()    || 1;
              setCurrentSec(cur);
              setProgress(cur / dur);
            }, 500);
          } else if (s === window.YT.PlayerState.PAUSED) {
            setPlaying(false);
            clearInterval(timerRef.current);
          } else if (s === window.YT.PlayerState.ENDED) {
            setPlaying(false);
            clearInterval(timerRef.current);
            setTrackIdx((i) => (i + 1) % library.length);
          }
        },
        onError() {
          setPlaying(false);
          clearInterval(timerRef.current);
        },
      },
    });

    return () => {
      clearInterval(timerRef.current);
    };
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [apiReady, trackIdx]);

  /* ── Volume sync ── */
  useEffect(() => {
    if (playerRef.current?.setVolume) playerRef.current.setVolume(volume);
  }, [volume]);

  const togglePlay = useCallback(() => {
    if (!playerRef.current) return;
    if (playing) { playerRef.current.pauseVideo(); }
    else         { playerRef.current.playVideo();  }
  }, [playing]);

  const seek = useCallback((e) => {
    if (!playerRef.current || !durationSec) return;
    const rect = e.currentTarget.getBoundingClientRect();
    const ratio = Math.max(0, Math.min(1, (e.clientX - rect.left) / rect.width));
    playerRef.current.seekTo(ratio * durationSec, true);
    setProgress(ratio);
    setCurrentSec(ratio * durationSec);
  }, [durationSec]);

  const skip = useCallback((dir) => {
    setTrackIdx((i) => (i + dir + library.length) % library.length);
  }, [library.length]);

  const addCustomTrack = useCallback(() => {
    setCustomErr("");
    const id = extractYTId(customUrl.trim());
    if (!id) { setCustomErr("Paste a valid YouTube URL or 11-char video ID"); return; }
    const newTrack = {
      id,
      title:  "Custom Track",
      artist: "YouTube",
      genre:  "Custom",
      custom: true,
    };
    setLibrary((prev) => {
      if (prev.find((t) => t.id === id)) {
        const idx = prev.findIndex((t) => t.id === id);
        setTrackIdx(idx);
        return prev;
      }
      const next = [...prev, newTrack];
      setTrackIdx(next.length - 1);
      return next;
    });
    setCustomUrl("");
  }, [customUrl]);

  /* ── Pill button ── */
  const Pill = ({ label, active, onClick }) => (
    <motion.button
      onClick={onClick}
      whileTap={{ scale: 0.92 }}
      className={`px-3 py-1 rounded-full text-[11px] font-mono font-semibold border transition-all duration-200 ${
        active
          ? "bg-[#00F0FF]/15 border-[#00F0FF]/50 text-[#00F0FF]"
          : "bg-white/[0.03] border-white/10 text-slate-400 hover:border-white/25"
      }`}
    >
      {label}
    </motion.button>
  );

  return (
    <div className="flex flex-col h-full text-white overflow-hidden" data-testid="music-app">

      {/* ── Main split ─────────────────────────────────────────────── */}
      <div className="flex-1 flex flex-col md:flex-row overflow-hidden min-h-0">

        {/* ── LEFT: Library ── */}
        <div className="flex-1 flex flex-col overflow-hidden border-r border-white/10 min-h-0">

          {/* Search + genre filters */}
          <div className="px-4 pt-4 pb-2 space-y-2 flex-shrink-0">
            <div className="mono-label">// Music Library</div>
            <div className="relative">
              <i className="fa-solid fa-magnifying-glass absolute left-3 top-1/2 -translate-y-1/2 text-slate-500 text-xs" />
              <input
                value={search}
                onChange={(e) => setSearch(e.target.value)}
                placeholder="Search tracks…"
                className="w-full pl-8 pr-3 py-1.5 rounded-lg bg-white/[0.04] border border-white/10
                  focus:border-[#00F0FF]/40 focus:outline-none text-xs font-mono text-slate-200
                  placeholder-slate-600 transition-colors"
              />
            </div>
            <div className="flex flex-wrap gap-1.5">
              {GENRES.map((g) => <Pill key={g} label={g} active={genre === g} onClick={() => setGenre(g)} />)}
            </div>
          </div>

          {/* Track list */}
          <div className="flex-1 overflow-y-auto px-4 pb-4 space-y-1">
            <AnimatePresence initial={false}>
              {filtered.length === 0 && (
                <motion.div initial={{ opacity: 0 }} animate={{ opacity: 1 }} className="text-center text-slate-600 text-sm py-12">
                  No tracks found
                </motion.div>
              )}
              {filtered.map((t, visIdx) => {
                const realIdx = library.indexOf(t);
                const isActive = realIdx === trackIdx;
                return (
                  <motion.button
                    key={t.id}
                    data-testid={`track-${visIdx}`}
                    layout
                    initial={{ opacity: 0, x: -8 }}
                    animate={{ opacity: 1, x: 0 }}
                    exit={{ opacity: 0, x: -8 }}
                    transition={{ duration: 0.18 }}
                    onClick={() => setTrackIdx(realIdx)}
                    className={`w-full flex items-center gap-3 px-3 py-2 rounded-xl text-left transition-all duration-200 group ${
                      isActive
                        ? "bg-[#00F0FF]/10 border border-[#00F0FF]/25"
                        : "hover:bg-white/[0.04] border border-transparent"
                    }`}
                  >
                    <div className="relative flex-shrink-0 w-10 h-10 rounded-lg overflow-hidden bg-slate-800">
                      <img
                        src={thumb(t.id)}
                        alt={t.title}
                        className="w-full h-full object-cover"
                        onError={(e) => { e.target.style.display = "none"; }}
                      />
                      {isActive && (
                        <div className="absolute inset-0 bg-black/50 flex items-center justify-center">
                          <Waveform active={playing} />
                        </div>
                      )}
                    </div>
                    <div className="flex-1 min-w-0">
                      <div className={`text-sm font-medium truncate ${isActive ? "text-[#00F0FF]" : "text-slate-100"}`}>
                        {t.title}
                      </div>
                      <div className="text-[11px] text-slate-500 truncate">{t.artist}</div>
                    </div>
                    <span className="text-[10px] font-mono px-1.5 py-0.5 rounded bg-white/[0.04] text-slate-600 flex-shrink-0">
                      {t.genre}
                    </span>
                  </motion.button>
                );
              })}
            </AnimatePresence>
          </div>

          {/* Custom URL input */}
          <div className="px-4 pb-3 flex-shrink-0 border-t border-white/[0.06] pt-3">
            <div className="mono-label mb-1.5">// Add YouTube URL</div>
            <div className="flex gap-2">
              <input
                value={customUrl}
                onChange={(e) => { setCustomUrl(e.target.value); setCustomErr(""); }}
                onKeyDown={(e) => e.key === "Enter" && addCustomTrack()}
                placeholder="youtube.com/watch?v=… or video ID"
                className="flex-1 px-3 py-1.5 rounded-lg bg-white/[0.04] border border-white/10
                  focus:border-[#00F0FF]/40 focus:outline-none text-xs font-mono text-slate-200
                  placeholder-slate-600 transition-colors"
              />
              <motion.button
                whileTap={{ scale: 0.92 }}
                onClick={addCustomTrack}
                className="px-3 py-1.5 rounded-lg bg-[#00F0FF]/15 border border-[#00F0FF]/35
                  text-[#00F0FF] text-xs font-mono hover:bg-[#00F0FF]/25 transition-colors"
              >
                Add
              </motion.button>
            </div>
            {customErr && <div className="text-red-400 text-[10px] mt-1 font-mono">{customErr}</div>}
          </div>
        </div>

        {/* ── RIGHT: Now playing ── */}
        <div className="w-full md:w-72 flex flex-col flex-shrink-0">

          {/* YouTube embed (hidden — audio only UX) */}
          <div className="relative overflow-hidden flex-shrink-0" style={{ height: apiReady ? 0 : 0, opacity: 0, pointerEvents: "none" }}>
            <div ref={containerRef} id="yt-player-container" />
          </div>

          {/* Album art area */}
          <div className="flex-1 flex flex-col items-center justify-center p-6 gap-4">
            <motion.div
              key={track.id}
              initial={{ scale: 0.9, opacity: 0 }}
              animate={{ scale: 1, opacity: 1 }}
              transition={{ type: "spring", stiffness: 260, damping: 22 }}
              className="relative rounded-2xl overflow-hidden shadow-2xl"
              style={{ width: 180, height: 180, flexShrink: 0 }}
            >
              <img
                src={thumb(track.id)}
                alt={track.title}
                className="w-full h-full object-cover"
                onError={(e) => { e.target.style.display = "none"; }}
              />
              {/* Glow ring when playing */}
              {playing && (
                <motion.div
                  className="absolute inset-0 rounded-2xl"
                  animate={{ boxShadow: ["0 0 0px #00F0FF", "0 0 30px rgba(0,240,255,0.35)", "0 0 0px #00F0FF"] }}
                  transition={{ duration: 2.5, repeat: Infinity, ease: "easeInOut" }}
                />
              )}
              <div className="absolute inset-0 bg-gradient-to-t from-black/60 to-transparent" />
              <div className="absolute bottom-2 left-0 right-0 flex justify-center">
                <Waveform active={playing} />
              </div>
            </motion.div>

            <div className="text-center w-full px-2">
              <AnimatePresence mode="wait">
                <motion.div
                  key={track.id}
                  initial={{ opacity: 0, y: 6 }}
                  animate={{ opacity: 1, y: 0 }}
                  exit={{ opacity: 0, y: -6 }}
                  transition={{ duration: 0.2 }}
                >
                  <div className="font-heading text-base font-bold text-white line-clamp-1">{track.title}</div>
                  <div className="text-xs text-slate-400 mt-0.5">{track.artist}</div>
                  <div className="text-[10px] font-mono text-[#00F0FF]/60 mt-1">{track.genre}</div>
                </motion.div>
              </AnimatePresence>
            </div>

            {/* Volume */}
            <div className="w-full flex items-center gap-2 px-2">
              <i className="fa-solid fa-volume-low text-slate-500 text-[10px]" />
              <input
                type="range" min={0} max={100} value={volume}
                onChange={(e) => setVolume(Number(e.target.value))}
                className="flex-1 h-1 appearance-none rounded-full cursor-pointer"
                style={{ accentColor: "#00F0FF" }}
              />
              <i className="fa-solid fa-volume-high text-slate-500 text-[10px]" />
            </div>
          </div>
        </div>
      </div>

      {/* ── Player bar ─────────────────────────────────────────────── */}
      <div className="flex-shrink-0 border-t border-white/10 glass px-4 py-3">
        {/* Progress bar */}
        <div
          className="w-full h-1 bg-white/10 rounded-full mb-3 cursor-pointer group"
          onClick={seek}
        >
          <div
            className="h-full bg-[#00F0FF] rounded-full relative transition-all"
            style={{ width: `${progress * 100}%` }}
          >
            <div className="absolute right-0 top-1/2 -translate-y-1/2 w-2.5 h-2.5 rounded-full bg-[#00F0FF]
              opacity-0 group-hover:opacity-100 transition-opacity shadow-[0_0_6px_#00F0FF]" />
          </div>
        </div>

        <div className="flex items-center gap-3">
          {/* Thumbnail + info */}
          <img
            src={thumb(track.id)}
            alt=""
            className="w-9 h-9 rounded-lg object-cover flex-shrink-0"
            onError={(e) => { e.target.style.display = "none"; }}
          />
          <div className="flex-1 min-w-0">
            <div className="text-sm font-medium truncate">{track.title}</div>
            <div className="text-[11px] text-slate-500 truncate">{track.artist}</div>
          </div>

          {/* Time */}
          <div className="text-[10px] font-mono text-slate-500 flex-shrink-0 tabular-nums">
            {fmt(currentSec)} / {fmt(durationSec)}
          </div>

          {/* Controls */}
          <div className="flex items-center gap-2 flex-shrink-0">
            <motion.button
              whileTap={{ scale: 0.85 }}
              onClick={() => skip(-1)}
              className="w-8 h-8 flex items-center justify-center rounded-lg hover:bg-white/10 transition text-slate-300"
            >
              <i className="fa-solid fa-backward-step text-sm" />
            </motion.button>

            <motion.button
              data-testid="play-toggle"
              whileTap={{ scale: 0.88 }}
              onClick={togglePlay}
              className="w-10 h-10 rounded-full bg-[#00F0FF] text-black flex items-center justify-center shadow-[0_0_16px_rgba(0,240,255,0.45)] hover:bg-[#00F0FF]/90 transition"
            >
              <i className={`fa-solid ${playing ? "fa-pause" : "fa-play"} text-sm`} />
            </motion.button>

            <motion.button
              whileTap={{ scale: 0.85 }}
              onClick={() => skip(1)}
              className="w-8 h-8 flex items-center justify-center rounded-lg hover:bg-white/10 transition text-slate-300"
            >
              <i className="fa-solid fa-forward-step text-sm" />
            </motion.button>
          </div>

          {/* YT link */}
          <a
            href={`https://youtube.com/watch?v=${track.id}`}
            target="_blank"
            rel="noopener noreferrer"
            className="text-slate-600 hover:text-[#FF0000] transition-colors flex-shrink-0"
            title="Open on YouTube"
          >
            <i className="fa-brands fa-youtube text-sm" />
          </a>
        </div>

        {/* API loading state */}
        {!apiReady && (
          <div className="text-center text-[10px] font-mono text-slate-600 mt-2 animate-pulse">
            Loading player…
          </div>
        )}

        {/* Ad disclaimer */}
        <div className="flex items-center justify-center gap-1.5 mt-2">
          <i className="fa-brands fa-youtube text-[#FF0000]/50 text-[10px]" />
          <span className="text-[10px] font-mono text-slate-600">
            Plays via YouTube · ads depend on your account —{" "}
            <a
              href="https://music.youtube.com/premium"
              target="_blank"
              rel="noopener noreferrer"
              className="text-[#00F0FF]/40 hover:text-[#00F0FF]/70 underline transition-colors"
            >
              go ad-free with Premium
            </a>
          </span>
        </div>
      </div>
    </div>
  );
}
