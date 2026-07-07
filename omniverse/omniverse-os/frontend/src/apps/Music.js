import React, { useState, useEffect, useRef, useCallback } from "react";
import { motion, AnimatePresence } from "framer-motion";
import { toast } from "sonner";

// ── Curated library ────────────────────────────────────────────────────────
// Priority order: live-radio streams (never go down) → official artist
// channels (VEVO / label-verified) → well-known long-standing uploads.
// Auto-skip handles any stale IDs gracefully.
const LIBRARY = [
  // ── Live radio — 24/7 streams, almost impossible to take down ─────────
  { id: "jfKfPfyJRdk", title: "Lofi Hip Hop Radio",      artist: "Lofi Girl",           genre: "Lo-Fi",    live: true  },
  { id: "5ksYslH7rms", title: "Chillhop Radio",          artist: "Chillhop Music",      genre: "Lo-Fi",    live: true  },
  { id: "4xDzrJKXOOY", title: "Synthwave Radio",         artist: "Nightwave Plaza",     genre: "Synthwave",live: true  },
  { id: "7NOSDKb0HlU", title: "Late Night Vibes",        artist: "Lofi Records",        genre: "Lo-Fi",    live: true  },
  { id: "Na0w3Mz46GA", title: "Dark Synth Radio",        artist: "Retrowave",           genre: "Synthwave",live: true  },
  { id: "UPnQXBOllBE", title: "Deep Focus Radio",        artist: "Chill Nation",        genre: "Lo-Fi",    live: true  },

  // ── Synthwave / Electronic ─────────────────────────────────────────────
  { id: "wCTSOiJ0Gbs", title: "Nightcall",               artist: "Kavinsky",            genre: "Synthwave" },
  { id: "qB3yKCWKRsE", title: "Turbo Killer",            artist: "Carpenter Brut",      genre: "Synthwave" },
  { id: "MV_3Dpw-BRY", title: "Dark All Day",            artist: "Gunship",             genre: "Synthwave" },
  { id: "dX3k_QDnzHE", title: "Midnight City",           artist: "M83",                 genre: "Synthwave" },
  { id: "gAjR4_CbPpQ", title: "Harder Better Faster",    artist: "Daft Punk",           genre: "Electronic"},
  { id: "5NV6Rdv1h3I", title: "Get Lucky",               artist: "Daft Punk",           genre: "Electronic"},
  { id: "tCnBrrnBKoE", title: "D.A.N.C.E.",              artist: "Justice",             genre: "Electronic"},
  { id: "3sMNDGYPCOk", title: "Awake",                   artist: "Tycho",               genre: "Synthwave" },
  { id: "y8OnoxKotPQ", title: "Redline",                 artist: "Electric Youth",      genre: "Synthwave" },
  { id: "RxabLA7UQ9k", title: "Midnight Cruising",       artist: "Midnight",            genre: "Synthwave" },
  { id: "G2OhFoYjWGk", title: "Neon Noir",               artist: "Dance With The Dead", genre: "Cyberpunk" },
  { id: "W4ha7hCNvCQ", title: "Crystals",                artist: "The Midnight",        genre: "Synthwave" },
  { id: "JvKIWJHaMiQ", title: "Days of Thunder",         artist: "The Midnight",        genre: "Synthwave" },
  { id: "otcv_Q-9xRE", title: "America 2",               artist: "The Midnight",        genre: "Synthwave" },

  // ── Cyberpunk / OST ────────────────────────────────────────────────────
  { id: "b_09K4NFBXQ", title: "Cyberpunk 2077 OST",      artist: "Marcin Przybylowicz", genre: "Cyberpunk" },
  { id: "lTRiuFIWV54", title: "Night City Radio",         artist: "CDPR",               genre: "Cyberpunk" },
  { id: "5yx6BWlEVcY", title: "Ghost in the Shell OST",  artist: "Kenji Kawai",         genre: "Ambient"   },
  { id: "pi_rFNn6sSs", title: "Blade Runner Blues",      artist: "Vangelis",            genre: "Ambient"   },

  // ── Ambient / Focus ────────────────────────────────────────────────────
  { id: "hHW1oY26kxQ", title: "Music for Airports",      artist: "Brian Eno",           genre: "Ambient"   },
  { id: "5qJp6xlKEug", title: "The Sun's Gone Dim",      artist: "Johann Johannsson",   genre: "Ambient"   },
  { id: "MzDJQNvM6xk", title: "Trans-Europe Express",    artist: "Kraftwerk",           genre: "Electronic"},
];

const GENRES = ["All", "Lo-Fi", "Synthwave", "Electronic", "Cyberpunk", "Ambient", "Custom"];

// ── YouTube thumbnail ──────────────────────────────────────────────────────
const thumb = (id) => `https://img.youtube.com/vi/${id}/mqdefault.jpg`;

// ── Load YT IFrame API once globally ──────────────────────────────────────
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

// ── Time formatter ─────────────────────────────────────────────────────────
function fmt(s) {
  if (!s || isNaN(s)) return "–:––";
  const m = Math.floor(s / 60);
  const sec = Math.floor(s % 60).toString().padStart(2, "0");
  return `${m}:${sec}`;
}

// ── Extract YouTube ID from URL or bare ID ─────────────────────────────────
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

// ── Shuffle array (Fisher–Yates) ───────────────────────────────────────────
function shuffle(arr) {
  const a = [...arr];
  for (let i = a.length - 1; i > 0; i--) {
    const j = Math.floor(Math.random() * (i + 1));
    [a[i], a[j]] = [a[j], a[i]];
  }
  return a;
}

// ── Animated waveform bars ─────────────────────────────────────────────────
function Waveform({ active, color = "#00F0FF" }) {
  return (
    <div className="flex items-end gap-[2px] h-4" aria-hidden>
      {[0.6, 1, 0.75, 0.9, 0.55, 0.8, 0.65].map((h, i) => (
        <motion.div
          key={i}
          style={{ height: 16, originY: 1, backgroundColor: color, width: 3, borderRadius: 2 }}
          animate={
            active
              ? { scaleY: [h, 1, 0.3, h], opacity: [0.75, 1, 0.55, 0.75] }
              : { scaleY: 0.2, opacity: 0.25 }
          }
          transition={{ duration: 0.75 + i * 0.1, repeat: Infinity, ease: "easeInOut", delay: i * 0.07 }}
        />
      ))}
    </div>
  );
}

// ── REPEAT modes ──────────────────────────────────────────────────────────
const REPEAT = { OFF: "off", ONE: "one", ALL: "all" };

// ═══════════════════════════════════════════════════════════════════════════
export default function Music() {
  const [library,      setLibrary]      = useState(LIBRARY);
  const [queue,        setQueue]        = useState(LIBRARY.map((_, i) => i));  // ordered indices
  const [queuePos,     setQueuePos]     = useState(0);   // position inside queue
  const [playing,      setPlaying]      = useState(false);
  const [loading,      setLoading]      = useState(false);
  const [progress,     setProgress]     = useState(0);
  const [currentSec,   setCurrentSec]   = useState(0);
  const [durationSec,  setDurationSec]  = useState(0);
  const [apiReady,     setApiReady]     = useState(false);
  const [volume,       setVolume]       = useState(80);
  const [shuffleOn,    setShuffleOn]    = useState(false);
  const [repeat,       setRepeat]       = useState(REPEAT.OFF);
  const [genre,        setGenre]        = useState("All");
  const [search,       setSearch]       = useState("");
  const [customUrl,    setCustomUrl]    = useState("");
  const [customErr,    setCustomErr]    = useState("");
  const [brokenIds,    setBrokenIds]    = useState(new Set());
  const [skipTimer,    setSkipTimerState] = useState(null); // ms remaining before auto-skip

  const playerRef    = useRef(null);
  const containerRef = useRef(null);
  const timerRef     = useRef(null);       // progress poll
  const skipRef      = useRef(null);       // auto-skip setTimeout
  const skipCountRef = useRef(0);          // countdown display
  const mountedRef   = useRef(true);
  const autoPlayRef  = useRef(false);      // should new track auto-play?

  useEffect(() => {
    mountedRef.current = true;
    return () => { mountedRef.current = false; clearInterval(timerRef.current); clearTimeout(skipRef.current); };
  }, []);

  // ── Current track index (from queue) ─────────────────────────────────────
  const trackIdx = queue[queuePos] ?? 0;
  const track = library[trackIdx] || library[0];

  // ── Filtered view ─────────────────────────────────────────────────────────
  const filtered = library.filter((t) => {
    if (genre !== "All" && t.genre !== genre) return false;
    if (search && !`${t.title} ${t.artist}`.toLowerCase().includes(search.toLowerCase())) return false;
    return true;
  });

  // ── Rebuild queue when shuffle or library changes ─────────────────────────
  useEffect(() => {
    const indices = library.map((_, i) => i);
    const newQueue = shuffleOn ? shuffle(indices) : indices;
    // Keep the current track at the front of the new queue
    const curIdx = trackIdx;
    const pos = newQueue.indexOf(curIdx);
    const reordered = pos >= 0 ? [curIdx, ...newQueue.filter((i) => i !== curIdx)] : newQueue;
    setQueue(reordered);
    setQueuePos(0);
  // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [shuffleOn, library.length]);

  // ── Load YouTube IFrame API ───────────────────────────────────────────────
  useEffect(() => { loadYTApi(() => { if (mountedRef.current) setApiReady(true); }); }, []);

  // ── Navigate to a specific library index ─────────────────────────────────
  const goToLibraryIndex = useCallback((libIdx, shouldPlay = true) => {
    autoPlayRef.current = shouldPlay;
    const posInQueue = queue.indexOf(libIdx);
    if (posInQueue >= 0) {
      setQueuePos(posInQueue);
    } else {
      // not in current queue — rebuild with this track first
      setQueue((q) => [libIdx, ...q.filter((i) => i !== libIdx)]);
      setQueuePos(0);
    }
  }, [queue]);

  const goNext = useCallback(() => {
    clearTimeout(skipRef.current);
    if (repeat === REPEAT.ONE) {
      // restart same track by incrementing then decrementing (forces useEffect)
      autoPlayRef.current = true;
      setQueuePos((p) => {
        setTimeout(() => setQueuePos(p), 0);
        return p;
      });
      return;
    }
    autoPlayRef.current = true;
    setQueuePos((p) => {
      const next = p + 1;
      if (next >= queue.length) {
        if (repeat === REPEAT.ALL) return 0;
        setPlaying(false);
        return p;
      }
      return next;
    });
  }, [queue.length, repeat]);

  const goPrev = useCallback(() => {
    clearTimeout(skipRef.current);
    autoPlayRef.current = true;
    if (currentSec > 3) {
      // restart current track
      playerRef.current?.seekTo(0, true);
      setCurrentSec(0);
      setProgress(0);
      return;
    }
    setQueuePos((p) => Math.max(0, p - 1));
  }, [currentSec]);

  // ── Build / rebuild YT player when track changes ──────────────────────────
  useEffect(() => {
    if (!apiReady || !containerRef.current) return;

    clearInterval(timerRef.current);
    clearTimeout(skipRef.current);
    if (playerRef.current) {
      try { playerRef.current.destroy(); } catch (_) {}
      playerRef.current = null;
    }
    if (mountedRef.current) {
      setProgress(0);
      setCurrentSec(0);
      setDurationSec(0);
      setLoading(true);
      setSkipTimerState(null);
    }

    const shouldAutoPlay = autoPlayRef.current !== false;

    playerRef.current = new window.YT.Player(containerRef.current, {
      videoId: track.id,
      playerVars: {
        autoplay:       shouldAutoPlay ? 1 : 0,
        controls:       0,
        disablekb:      1,
        modestbranding: 1,
        rel:            0,
        iv_load_policy: 3,
        playsinline:    1,
        // origin helps some restricted embeds load correctly
        origin:         window.location.origin || "https://omniverseos.app",
      },
      events: {
        onReady(e) {
          if (!mountedRef.current) return;
          e.target.setVolume(volume);
          if (shouldAutoPlay) {
            e.target.playVideo();
          }
          setLoading(false);
          setDurationSec(e.target.getDuration() || 0);
        },
        onStateChange(e) {
          if (!mountedRef.current) return;
          const { PlayerState } = window.YT;
          if (e.data === PlayerState.PLAYING) {
            setPlaying(true);
            setLoading(false);
            setDurationSec(e.target.getDuration() || 0);
            clearInterval(timerRef.current);
            timerRef.current = setInterval(() => {
              if (!mountedRef.current) return;
              const cur = e.target.getCurrentTime() || 0;
              const dur = e.target.getDuration()    || 1;
              setCurrentSec(cur);
              setProgress(cur / dur);
            }, 500);
          } else if (e.data === PlayerState.PAUSED) {
            setPlaying(false);
            clearInterval(timerRef.current);
          } else if (e.data === PlayerState.BUFFERING) {
            setLoading(true);
          } else if (e.data === PlayerState.ENDED) {
            setPlaying(false);
            clearInterval(timerRef.current);
            goNext();
          } else if (e.data === PlayerState.CUED) {
            setLoading(false);
          }
        },
        onError(e) {
          if (!mountedRef.current) return;
          setLoading(false);
          setPlaying(false);
          clearInterval(timerRef.current);

          // Mark this track as broken so the UI shows a badge
          setBrokenIds((prev) => new Set([...prev, track.id]));

          // Auto-skip to next after 3s countdown
          let remaining = 3;
          setSkipTimerState(remaining);
          const tick = setInterval(() => {
            remaining -= 1;
            if (mountedRef.current) setSkipTimerState(remaining);
            if (remaining <= 0) {
              clearInterval(tick);
              if (mountedRef.current) {
                setSkipTimerState(null);
                toast.warning(`Track unavailable — skipping to next`, { duration: 2000 });
                autoPlayRef.current = true;
                goNext();
              }
            }
          }, 1000);
          skipRef.current = tick;
        },
      },
    });

    return () => {
      clearInterval(timerRef.current);
    };
  // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [apiReady, trackIdx]);

  // ── Volume sync ───────────────────────────────────────────────────────────
  useEffect(() => {
    playerRef.current?.setVolume?.(volume);
  }, [volume]);

  // ── Controls ──────────────────────────────────────────────────────────────
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

  const toggleShuffle = useCallback(() => setShuffleOn((s) => !s), []);
  const cycleRepeat = useCallback(() => {
    setRepeat((r) => r === REPEAT.OFF ? REPEAT.ALL : r === REPEAT.ALL ? REPEAT.ONE : REPEAT.OFF);
  }, []);

  // ── Add custom YouTube URL ────────────────────────────────────────────────
  const addCustomTrack = useCallback(() => {
    setCustomErr("");
    const id = extractYTId(customUrl.trim());
    if (!id) { setCustomErr("Paste a valid YouTube URL or 11-char video ID"); return; }
    setLibrary((prev) => {
      if (prev.find((t) => t.id === id)) {
        const libIdx = prev.findIndex((t) => t.id === id);
        goToLibraryIndex(libIdx, true);
        return prev;
      }
      const newTrack = { id, title: "Custom Track", artist: "YouTube", genre: "Custom", custom: true };
      const next = [...prev, newTrack];
      goToLibraryIndex(next.length - 1, true);
      return next;
    });
    setCustomUrl("");
  }, [customUrl, goToLibraryIndex]);

  // ── Derived ───────────────────────────────────────────────────────────────
  const isBroken  = brokenIds.has(track.id);
  const accentColor = track.genre === "Lo-Fi" ? "#39FF14"
    : track.genre === "Cyberpunk" ? "#FF003C"
    : track.genre === "Ambient"   ? "#c084fc"
    : "#00F0FF";

  const repeatIcon = repeat === REPEAT.ONE ? "fa-repeat" : "fa-repeat";
  const repeatLabel = repeat === REPEAT.OFF ? "off" : repeat === REPEAT.ONE ? "1" : "all";

  // ── Pill button ───────────────────────────────────────────────────────────
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

  // ─────────────────────────────────────────────────────────────────────────
  return (
    <div className="flex flex-col h-full text-white overflow-hidden" data-testid="music-app">

      {/* ── Hidden YT player container ─────────────────────────────────────── */}
      <div style={{ position: "absolute", left: -9999, top: -9999, width: 1, height: 1, pointerEvents: "none" }}>
        <div ref={containerRef} id="yt-player-container" />
      </div>

      {/* ── Main split ─────────────────────────────────────────────────────── */}
      <div className="flex-1 flex flex-col md:flex-row overflow-hidden min-h-0">

        {/* ── LEFT: Library ─────────────────────────────────────────────────── */}
        <div className="flex-1 flex flex-col overflow-hidden border-r border-white/10 min-h-0">
          {/* Header + filters */}
          <div className="px-4 pt-4 pb-2 space-y-2 flex-shrink-0">
            <div className="flex items-center justify-between">
              <div className="mono-label">// Music Library</div>
              <span className="text-[10px] font-mono text-slate-600">{filtered.length} tracks</span>
            </div>
            <div className="relative">
              <i className="fa-solid fa-magnifying-glass absolute left-3 top-1/2 -translate-y-1/2 text-slate-500 text-xs" />
              <input
                value={search}
                onChange={(e) => setSearch(e.target.value)}
                placeholder="Search tracks or artists…"
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
          <div className="flex-1 overflow-y-auto px-4 pb-4 space-y-0.5">
            {filtered.length === 0 && (
              <div className="text-center text-slate-600 text-sm py-12">No tracks found</div>
            )}
            <AnimatePresence initial={false}>
              {filtered.map((t) => {
                const libIdx  = library.indexOf(t);
                const isActive = libIdx === trackIdx;
                const isBad   = brokenIds.has(t.id);

                return (
                  <motion.button
                    key={t.id}
                    layout
                    initial={{ opacity: 0, x: -8 }}
                    animate={{ opacity: 1, x: 0 }}
                    exit={{ opacity: 0 }}
                    transition={{ duration: 0.15 }}
                    onClick={() => goToLibraryIndex(libIdx, true)}
                    className={`w-full flex items-center gap-3 px-3 py-2 rounded-xl text-left transition-all duration-150 group ${
                      isActive
                        ? "bg-[#00F0FF]/10 border border-[#00F0FF]/25"
                        : "hover:bg-white/[0.04] border border-transparent"
                    } ${isBad ? "opacity-50" : ""}`}
                  >
                    {/* Thumbnail */}
                    <div className="relative flex-shrink-0 w-10 h-10 rounded-lg overflow-hidden bg-slate-800">
                      <img
                        src={thumb(t.id)}
                        alt=""
                        className="w-full h-full object-cover"
                        onError={(e) => { e.target.style.display = "none"; }}
                      />
                      {isActive && (
                        <div className="absolute inset-0 bg-black/50 flex items-center justify-center">
                          {loading
                            ? <i className="fa-solid fa-circle-notch fa-spin text-[#00F0FF] text-xs" />
                            : <Waveform active={playing} />
                          }
                        </div>
                      )}
                    </div>

                    {/* Title / artist */}
                    <div className="flex-1 min-w-0">
                      <div className={`text-sm font-medium truncate flex items-center gap-1.5 ${isActive ? "text-[#00F0FF]" : "text-slate-100"}`}>
                        {t.title}
                        {t.live && (
                          <span className="flex-shrink-0 text-[9px] px-1.5 py-0.5 rounded-full bg-red-500/20 border border-red-500/30 text-red-400 font-mono">
                            LIVE
                          </span>
                        )}
                        {isBad && (
                          <span className="flex-shrink-0 text-[9px] px-1.5 py-0.5 rounded-full bg-yellow-500/20 border border-yellow-500/30 text-yellow-400 font-mono">
                            unavailable
                          </span>
                        )}
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

          {/* Add custom URL */}
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

        {/* ── RIGHT: Now Playing ─────────────────────────────────────────────── */}
        <div className="w-full md:w-72 flex flex-col flex-shrink-0">
          <div className="flex-1 flex flex-col items-center justify-center p-6 gap-4">

            {/* Album art */}
            <motion.div
              key={track.id}
              initial={{ scale: 0.88, opacity: 0 }}
              animate={{ scale: 1, opacity: 1 }}
              transition={{ type: "spring", stiffness: 260, damping: 22 }}
              className="relative rounded-2xl overflow-hidden shadow-2xl flex-shrink-0"
              style={{ width: 180, height: 180 }}
            >
              <img
                src={thumb(track.id)}
                alt={track.title}
                className="w-full h-full object-cover"
                onError={(e) => {
                  e.target.style.display = "none";
                  e.target.parentElement.style.background = "#0a0a12";
                }}
              />

              {/* Playing glow ring */}
              {playing && !isBroken && (
                <motion.div
                  className="absolute inset-0 rounded-2xl"
                  animate={{ boxShadow: [`0 0 0px ${accentColor}`, `0 0 28px ${accentColor}55`, `0 0 0px ${accentColor}`] }}
                  transition={{ duration: 2.5, repeat: Infinity, ease: "easeInOut" }}
                />
              )}

              <div className="absolute inset-0 bg-gradient-to-t from-black/60 to-transparent" />

              {/* Center state: loading / waveform / error */}
              <div className="absolute inset-0 flex items-center justify-center">
                {loading && !isBroken ? (
                  <i className="fa-solid fa-circle-notch fa-spin text-white/60 text-xl" />
                ) : isBroken ? (
                  <i className="fa-solid fa-circle-exclamation text-yellow-400 text-xl" />
                ) : (
                  <div className="opacity-0 group-hover:opacity-100">
                    <Waveform active={playing} color={accentColor} />
                  </div>
                )}
              </div>

              <div className="absolute bottom-2 left-0 right-0 flex justify-center">
                {!loading && !isBroken && <Waveform active={playing} color={accentColor} />}
              </div>

              {/* LIVE badge */}
              {track.live && (
                <div className="absolute top-2 left-2 flex items-center gap-1 px-1.5 py-0.5 rounded-full bg-red-500/80 text-white text-[9px] font-mono">
                  <span className="w-1.5 h-1.5 rounded-full bg-white animate-pulse" />
                  LIVE
                </div>
              )}
            </motion.div>

            {/* Track info */}
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
                  <div className="text-[10px] font-mono mt-1" style={{ color: `${accentColor}99` }}>{track.genre}</div>
                </motion.div>
              </AnimatePresence>

              {/* Auto-skip countdown */}
              <AnimatePresence>
                {skipTimer !== null && (
                  <motion.div
                    initial={{ opacity: 0, y: 4 }}
                    animate={{ opacity: 1, y: 0 }}
                    exit={{ opacity: 0 }}
                    className="mt-2 text-[10px] font-mono text-yellow-400 flex items-center justify-center gap-1.5"
                  >
                    <i className="fa-solid fa-triangle-exclamation text-[9px]" />
                    Track unavailable — skipping in {skipTimer}s
                    <button
                      onClick={() => { clearTimeout(skipRef.current); setSkipTimerState(null); }}
                      className="underline opacity-60 hover:opacity-100"
                    >
                      cancel
                    </button>
                  </motion.div>
                )}
              </AnimatePresence>
            </div>

            {/* Volume */}
            <div className="w-full flex items-center gap-2 px-2">
              <i className="fa-solid fa-volume-low text-slate-500 text-[10px]" />
              <input
                type="range" min={0} max={100} value={volume}
                onChange={(e) => setVolume(Number(e.target.value))}
                className="flex-1 h-1 appearance-none rounded-full cursor-pointer"
                style={{ accentColor }}
              />
              <i className="fa-solid fa-volume-high text-slate-500 text-[10px]" />
              <span className="text-[10px] font-mono text-slate-600 w-6 text-right">{volume}</span>
            </div>

            {/* Shuffle + Repeat */}
            <div className="flex items-center gap-2">
              <motion.button
                whileTap={{ scale: 0.88 }}
                onClick={toggleShuffle}
                title="Shuffle"
                className={`flex items-center gap-1 px-2.5 py-1 rounded-lg text-[11px] font-mono border transition-all ${
                  shuffleOn
                    ? "bg-[#00F0FF]/15 border-[#00F0FF]/40 text-[#00F0FF]"
                    : "bg-white/[0.04] border-white/10 text-slate-500 hover:text-slate-300"
                }`}
              >
                <i className="fa-solid fa-shuffle text-[10px]" />
                {shuffleOn ? "on" : "off"}
              </motion.button>

              <motion.button
                whileTap={{ scale: 0.88 }}
                onClick={cycleRepeat}
                title={`Repeat: ${repeat}`}
                className={`flex items-center gap-1 px-2.5 py-1 rounded-lg text-[11px] font-mono border transition-all ${
                  repeat !== REPEAT.OFF
                    ? "bg-[#00F0FF]/15 border-[#00F0FF]/40 text-[#00F0FF]"
                    : "bg-white/[0.04] border-white/10 text-slate-500 hover:text-slate-300"
                }`}
              >
                <i className={`fa-solid ${repeatIcon} text-[10px]`} />
                {repeatLabel}
              </motion.button>

              <a
                href={`https://youtube.com/watch?v=${track.id}`}
                target="_blank"
                rel="noopener noreferrer"
                title="Open on YouTube"
                className="flex items-center gap-1 px-2.5 py-1 rounded-lg text-[11px] font-mono border border-white/10 bg-white/[0.04] text-slate-500 hover:text-[#FF0000] transition-colors"
              >
                <i className="fa-brands fa-youtube text-[10px]" />
              </a>
            </div>
          </div>
        </div>
      </div>

      {/* ── Player bar ─────────────────────────────────────────────────────── */}
      <div className="flex-shrink-0 border-t border-white/10 glass px-4 py-3">
        {/* Progress bar — hidden for live streams */}
        {!track.live && (
          <div
            className="w-full h-1 bg-white/10 rounded-full mb-3 cursor-pointer group relative"
            onClick={seek}
          >
            <div
              className="h-full rounded-full relative transition-all"
              style={{ width: `${progress * 100}%`, backgroundColor: accentColor }}
            >
              <div
                className="absolute right-0 top-1/2 -translate-y-1/2 w-2.5 h-2.5 rounded-full opacity-0 group-hover:opacity-100 transition-opacity"
                style={{ backgroundColor: accentColor, boxShadow: `0 0 6px ${accentColor}` }}
              />
            </div>
          </div>
        )}

        <div className="flex items-center gap-3">
          {/* Thumbnail */}
          <div className="relative flex-shrink-0 w-9 h-9 rounded-lg overflow-hidden bg-slate-800">
            <img
              src={thumb(track.id)}
              alt=""
              className="w-full h-full object-cover"
              onError={(e) => { e.target.style.display = "none"; }}
            />
            {loading && (
              <div className="absolute inset-0 bg-black/60 flex items-center justify-center">
                <i className="fa-solid fa-circle-notch fa-spin text-[8px] text-white/60" />
              </div>
            )}
          </div>

          {/* Title */}
          <div className="flex-1 min-w-0">
            <div className="text-sm font-medium truncate flex items-center gap-1.5">
              {track.title}
              {track.live && (
                <span className="text-[9px] px-1 py-0.5 rounded-full bg-red-500/20 border border-red-500/30 text-red-400 font-mono flex-shrink-0">
                  ● LIVE
                </span>
              )}
            </div>
            <div className="text-[11px] text-slate-500 truncate">{track.artist}</div>
          </div>

          {/* Time — hidden for live streams */}
          {!track.live && (
            <div className="text-[10px] font-mono text-slate-500 flex-shrink-0 tabular-nums">
              {fmt(currentSec)} / {fmt(durationSec)}
            </div>
          )}

          {/* Controls */}
          <div className="flex items-center gap-1.5 flex-shrink-0">
            <motion.button
              whileTap={{ scale: 0.85 }}
              onClick={goPrev}
              className="w-8 h-8 flex items-center justify-center rounded-lg hover:bg-white/10 transition text-slate-300"
            >
              <i className="fa-solid fa-backward-step text-sm" />
            </motion.button>

            <motion.button
              data-testid="play-toggle"
              whileTap={{ scale: 0.88 }}
              onClick={togglePlay}
              disabled={isBroken}
              className="w-10 h-10 rounded-full flex items-center justify-center shadow-lg hover:brightness-110 transition disabled:opacity-40 disabled:cursor-not-allowed"
              style={{ backgroundColor: accentColor, boxShadow: `0 0 16px ${accentColor}55` }}
            >
              {loading
                ? <i className="fa-solid fa-circle-notch fa-spin text-black text-sm" />
                : <i className={`fa-solid ${playing ? "fa-pause" : "fa-play"} text-black text-sm`} />
              }
            </motion.button>

            <motion.button
              whileTap={{ scale: 0.85 }}
              onClick={goNext}
              className="w-8 h-8 flex items-center justify-center rounded-lg hover:bg-white/10 transition text-slate-300"
            >
              <i className="fa-solid fa-forward-step text-sm" />
            </motion.button>
          </div>
        </div>

        {/* API loading / disclaimer */}
        {!apiReady ? (
          <div className="text-center text-[10px] font-mono text-slate-600 mt-2 animate-pulse">
            Loading music player…
          </div>
        ) : (
          <div className="flex items-center justify-center gap-1.5 mt-2">
            <i className="fa-brands fa-youtube text-[#FF0000]/50 text-[10px]" />
            <span className="text-[10px] font-mono text-slate-600">
              Streams via YouTube · add any track with the URL box ·{" "}
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
        )}
      </div>
    </div>
  );
}
