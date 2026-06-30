import React, { useCallback, useEffect, useRef, useState } from "react";
import { toast } from "sonner";
import { motion, AnimatePresence } from "framer-motion";
import { useOS } from "../context/OSContext";
import BrowserIntelBar from "../components/BrowserIntelBar";

// ── Constants ──────────────────────────────────────────────────────────────
const HOME_URL = "https://en.wikipedia.org/wiki/Main_Page";

const QUICK_LINKS = [
  { name: "YouTube",    url: "https://www.youtube.com",           icon: "fa-brands fa-youtube",     color: "#FF003C" },
  { name: "GitHub",     url: "https://github.com",                icon: "fa-brands fa-github",      color: "#E2E8F0" },
  { name: "Reddit",     url: "https://www.reddit.com",            icon: "fa-brands fa-reddit",      color: "#FF6314" },
  { name: "Google",     url: "https://www.google.com",            icon: "fa-brands fa-google",      color: "#00F0FF" },
  { name: "Wikipedia",  url: "https://en.wikipedia.org",          icon: "fa-solid fa-book-open",    color: "#FCEE09" },
  { name: "MDN",        url: "https://developer.mozilla.org",     icon: "fa-solid fa-code",         color: "#39FF14" },
  { name: "Telegram",   url: "https://web.telegram.org",          icon: "fa-brands fa-telegram",    color: "#00B0D8" },
  { name: "X / Twitter",url: "https://www.x.com",                icon: "fa-brands fa-x-twitter",   color: "#E2E8F0" },
  { name: "News",       url: "https://news.google.com",           icon: "fa-solid fa-newspaper",    color: "#94A3B8" },
];

// Sites that send X-Frame-Options: DENY/SAMEORIGIN — we know ahead of time
const BLOCKED_HOSTS = new Set([
  "www.youtube.com", "youtube.com",
  "www.google.com", "google.com",
  "mail.google.com", "news.google.com", "drive.google.com", "calendar.google.com",
  "www.twitter.com", "twitter.com", "www.x.com", "x.com",
  "www.instagram.com", "instagram.com",
  "www.facebook.com", "facebook.com",
  "www.netflix.com", "netflix.com",
  "discord.com", "www.discord.com",
  "web.telegram.org", "www.telegram.org",
  "www.reddit.com", "reddit.com",
  "open.spotify.com", "www.spotify.com",
  "www.amazon.com", "amazon.com",
  "www.linkedin.com", "linkedin.com",
  "www.notion.so", "notion.so",
  "www.figma.com", "figma.com",
  "www.canva.com", "canva.com",
  "stackoverflow.com", "www.stackoverflow.com",
]);

// ── Helpers ────────────────────────────────────────────────────────────────
function isKnownBlocked(url) {
  try {
    return BLOCKED_HOSTS.has(new URL(url).hostname);
  } catch { return false; }
}

function normalizeUrl(raw) {
  const s = (raw || "").trim();
  if (!s) return HOME_URL;
  if (/^https?:\/\//i.test(s)) return s;
  if (/^([\w-]+\.)+[\w-]+(\/|$)/.test(s) && !s.includes(" "))
    return "https://" + s;
  return "https://www.google.com/search?q=" + encodeURIComponent(s);
}

function getHostname(url) {
  try { return new URL(url).hostname.replace(/^www\./, ""); }
  catch { return url; }
}

function getFaviconUrl(url) {
  try { return new URL(url).origin + "/favicon.ico"; }
  catch { return null; }
}

// ── Blocked state panel ────────────────────────────────────────────────────
function BlockedPanel({ currentUrl, hostname, onNavigateHome }) {
  const [copied, setCopied] = useState(false);

  const handleCopy = useCallback(() => {
    navigator.clipboard.writeText(currentUrl).then(() => {
      setCopied(true);
      toast.success("URL copied!", { duration: 1800 });
      setTimeout(() => setCopied(false), 2000);
    }).catch(() => toast.error("Copy failed"));
  }, [currentUrl]);

  const isKnown = isKnownBlocked(currentUrl);

  return (
    <motion.div
      key={currentUrl}
      initial={{ opacity: 0, scale: 0.96, y: 12 }}
      animate={{ opacity: 1, scale: 1,    y: 0  }}
      transition={{ type: "spring", damping: 26, stiffness: 320, mass: 0.4 }}
      className="absolute inset-0 flex flex-col items-center justify-center gap-6 text-center p-8 sm:p-10"
    >
      {/* Icon cluster */}
      <div className="relative">
        <motion.div
          animate={{ opacity: [0.5, 1, 0.5] }}
          transition={{ duration: 3, repeat: Infinity, ease: "easeInOut" }}
          className="w-20 h-20 rounded-2xl bg-[#FCEE09]/10 border border-[#FCEE09]/20 flex items-center justify-center"
        >
          <i className="fa-solid fa-shield-halved text-3xl text-[#FCEE09]" />
        </motion.div>
        <motion.div
          initial={{ scale: 0 }}
          animate={{ scale: 1 }}
          transition={{ delay: 0.15, type: "spring", stiffness: 480, damping: 20 }}
          className="absolute -bottom-1 -right-1 w-7 h-7 rounded-full bg-[#FF003C]/20 border border-[#FF003C]/40 flex items-center justify-center"
        >
          <i className="fa-solid fa-xmark text-[11px] text-[#FF003C]" />
        </motion.div>
      </div>

      {/* Text */}
      <div>
        <div className="mono-label text-[#FCEE09] mb-2">// IFRAME RESTRICTED</div>
        <h3 className="font-heading text-xl font-bold mb-2">{hostname}</h3>
        <p className="text-xs text-slate-500 font-mono max-w-xs leading-relaxed">
          {isKnown
            ? <>This site blocks embedding via <span className="text-[#FCEE09]/80">X-Frame-Options: DENY</span> — a deliberate security policy by {hostname}.</>
            : <>This site did not respond to the embed request. It may block iframes or require authentication.</>
          }
        </p>

        {/* Cortex hint */}
        <div
          className="mt-3 text-[10px] font-mono text-[#00F0FF]/30 flex items-center justify-center gap-1.5"
          style={{ animation: "pulse 2.5s ease-in-out infinite" }}
        >
          <i className="fa-solid fa-wand-magic-sparkles text-[9px]" />
          Try asking Cortex: "Open {hostname} in a new tab"
        </div>
      </div>

      {/* Action buttons */}
      <div className="flex flex-col sm:flex-row gap-2 w-full max-w-sm">
        <button
          onClick={() => window.open(currentUrl, "_blank", "noopener,noreferrer")}
          className="neon-btn primary flex items-center gap-2 justify-center flex-1"
        >
          <i className="fa-solid fa-arrow-up-right-from-square text-xs" />
          Open in New Tab
        </button>

        <button
          onClick={handleCopy}
          className="neon-btn flex items-center gap-2 justify-center"
          style={{
            background: copied ? "rgba(57,255,20,0.10)" : undefined,
            borderColor: copied ? "rgba(57,255,20,0.35)" : undefined,
            color: copied ? "#39FF14" : undefined,
            transition: "all 0.18s ease",
          }}
        >
          <i className={`fa-solid ${copied ? "fa-check" : "fa-copy"} text-xs`} />
          {copied ? "Copied!" : "Copy URL"}
        </button>

        <button
          onClick={onNavigateHome}
          className="neon-btn flex items-center gap-2 justify-center"
        >
          <i className="fa-solid fa-house text-xs" />
          Home
        </button>
      </div>
    </motion.div>
  );
}

// ── Main component ─────────────────────────────────────────────────────────
export default function Browser() {
  const { trackUrl, openApp } = useOS();
  const [addressInput, setAddressInput] = useState("");
  const [currentUrl,   setCurrentUrl]   = useState("");
  const [iframeUrl,    setIframeUrl]     = useState("");
  const [loading,      setLoading]       = useState(false);
  const [blocked,      setBlocked]       = useState(false);
  const [canBack,      setCanBack]       = useState(false);
  const [canFwd,       setCanFwd]        = useState(false);
  const [favicon,      setFavicon]       = useState(null);
  const [faviconErr,   setFaviconErr]    = useState(false);

  // History managed via ref to avoid stale-closure bugs
  const histRef       = useRef({ list: [], idx: -1 });
  const iframeRef     = useRef(null);
  const blockTimerRef = useRef(null);

  // ── navigate ──────────────────────────────────────────────────────────────
  const navigate = useCallback((rawUrl) => {
    const url = normalizeUrl(rawUrl);
    const isBlocked = isKnownBlocked(url);

    const { list, idx } = histRef.current;
    const newList = [...list.slice(0, idx + 1), url];
    histRef.current = { list: newList, idx: newList.length - 1 };
    setCanBack(newList.length > 1);
    setCanFwd(false);

    clearTimeout(blockTimerRef.current);
    setCurrentUrl(url);
    // Cortex unification: write canonical key (read by cortexContext + AIDock)
    // alongside legacy key for back-compat. Track in timeline + memory.
    localStorage.setItem("cortex_current_url", url);
    localStorage.setItem("omniverse_browser_url", url);
    trackUrl?.(url);
    setAddressInput(url);
    setFavicon(getFaviconUrl(url));
    setFaviconErr(false);

  }, [trackUrl]);

  // Listen for Cortex Actions navigation events
  useEffect(() => {
    const handler = (e) => { if (e.detail?.url) navigate(e.detail.url); };
    window.addEventListener("cortex:navigate", handler);
    return () => window.removeEventListener("cortex:navigate", handler);
  }, [navigate]);

  useEffect(() => () => clearTimeout(blockTimerRef.current), []);

  // ── iframe handlers ───────────────────────────────────────────────────────
  const handleIframeLoad = () => {
    clearTimeout(blockTimerRef.current);
    try {
      const doc = iframeRef.current?.contentDocument;
      if (doc && doc.body && doc.body.innerHTML === "") {
        setBlocked(true);
        setIframeUrl("");
      }
    } catch {
      // Cross-origin: assume loaded OK
    }
    setLoading(false);
  };

  const handleIframeError = () => {
    clearTimeout(blockTimerRef.current);
    setBlocked(true);
    setLoading(false);
    setIframeUrl("");
  };

  // ── history navigation ────────────────────────────────────────────────────
  const goBack = () => {
    const { list, idx } = histRef.current;
    if (idx <= 0) return;
    const newIdx = idx - 1;
    histRef.current = { list, idx: newIdx };
    setCanBack(newIdx > 0);
    setCanFwd(true);
    const url = list[newIdx];
    clearTimeout(blockTimerRef.current);
    setCurrentUrl(url);
    localStorage.setItem("cortex_current_url", url);
    localStorage.setItem("omniverse_browser_url", url);
    trackUrl?.(url);
    setAddressInput(url);
    setFavicon(getFaviconUrl(url)); setFaviconErr(false);
    if (isKnownBlocked(url)) {
      setIframeUrl(""); setBlocked(true); setLoading(false);
    } else {
      setBlocked(false); setLoading(true); setIframeUrl(url);
      blockTimerRef.current = setTimeout(() => { setLoading(false); setBlocked(true); setIframeUrl(""); }, 6000);
    }
  };

  const goForward = () => {
    const { list, idx } = histRef.current;
    if (idx >= list.length - 1) return;
    const newIdx = idx + 1;
    histRef.current = { list, idx: newIdx };
    setCanBack(true);
    setCanFwd(newIdx < list.length - 1);
    const url = list[newIdx];
    clearTimeout(blockTimerRef.current);
    setCurrentUrl(url);
    localStorage.setItem("cortex_current_url", url);
    localStorage.setItem("omniverse_browser_url", url);
    trackUrl?.(url);
    setAddressInput(url);
    setFavicon(getFaviconUrl(url)); setFaviconErr(false);
    if (isKnownBlocked(url)) {
      setIframeUrl(""); setBlocked(true); setLoading(false);
    } else {
      setBlocked(false); setLoading(true); setIframeUrl(url);
      blockTimerRef.current = setTimeout(() => { setLoading(false); setBlocked(true); setIframeUrl(""); }, 6000);
    }
  };

  const refresh = () => {
    if (!currentUrl || isKnownBlocked(currentUrl)) return;
    clearTimeout(blockTimerRef.current);
    const url = currentUrl;
    setIframeUrl("");
    setLoading(true);
    setBlocked(false);
    setTimeout(() => {
      setIframeUrl(url);
      blockTimerRef.current = setTimeout(() => { setLoading(false); setBlocked(true); setIframeUrl(""); }, 6000);
    }, 80);
  };

  const handleAddressSubmit = (e) => {
    e.preventDefault();
    navigate(addressInput);
  };

  // ── render ────────────────────────────────────────────────────────────────
  const hostname = getHostname(currentUrl);

  return (
    <div className="flex flex-col h-full text-white bg-[#05050A]" data-testid="browser-app">
      <style>{`
        @keyframes browserLoadBar {
          0%   { transform: scaleX(0.08); opacity: 1; }
          60%  { transform: scaleX(0.72); opacity: 1; }
          100% { transform: scaleX(0.08); opacity: 0.4; }
        }
        .browser-load-bar {
          transform-origin: left center;
          animation: browserLoadBar 1.6s ease-in-out infinite;
        }
      `}</style>

      {/* ── Top chrome ── */}
      <div className="flex-shrink-0 bg-black/70 backdrop-blur-md border-b border-white/[0.07]">
        {/* Nav row */}
        <div className="flex items-center gap-1.5 px-3 pt-2 pb-2">
          {/* Back */}
          <button
            onClick={goBack}
            disabled={!canBack}
            title="Back"
            className="w-7 h-7 flex items-center justify-center rounded-lg text-slate-400 hover:text-white hover:bg-white/10 disabled:opacity-20 disabled:cursor-not-allowed transition-all"
          >
            <i className="fa-solid fa-chevron-left text-[11px]" />
          </button>
          {/* Forward */}
          <button
            onClick={goForward}
            disabled={!canFwd}
            title="Forward"
            className="w-7 h-7 flex items-center justify-center rounded-lg text-slate-400 hover:text-white hover:bg-white/10 disabled:opacity-20 disabled:cursor-not-allowed transition-all"
          >
            <i className="fa-solid fa-chevron-right text-[11px]" />
          </button>
          {/* Refresh */}
          <button
            onClick={refresh}
            disabled={!currentUrl || loading || blocked}
            title="Refresh"
            className="w-7 h-7 flex items-center justify-center rounded-lg text-slate-400 hover:text-white hover:bg-white/10 disabled:opacity-20 disabled:cursor-not-allowed transition-all"
          >
            <i className={`fa-solid ${loading ? "fa-circle-notch fa-spin" : "fa-rotate-right"} text-[11px]`} />
          </button>
          {/* Home */}
          <button
            onClick={() => navigate(HOME_URL)}
            title="Home"
            className="w-7 h-7 flex items-center justify-center rounded-lg text-slate-400 hover:text-white hover:bg-white/10 transition-all"
          >
            <i className="fa-solid fa-house text-[11px]" />
          </button>

          {/* Address bar */}
          <form onSubmit={handleAddressSubmit} className="flex-1 flex items-center gap-2">
            <div className="flex-1 flex items-center gap-2 bg-white/[0.05] border border-white/[0.09] rounded-xl px-3 h-8 focus-within:border-[#00F0FF]/50 focus-within:bg-white/[0.08] transition-all min-w-0">
              {/* Favicon / security icon */}
              {currentUrl && favicon && !faviconErr ? (
                <img
                  src={favicon}
                  alt=""
                  className="w-3.5 h-3.5 object-contain opacity-60 flex-shrink-0"
                  onError={() => setFaviconErr(true)}
                />
              ) : (
                <i className={`fa-solid ${currentUrl ? "fa-lock" : "fa-globe"} text-[9px] flex-shrink-0 ${currentUrl ? "text-[#39FF14]/60" : "text-[#00F0FF]/40"}`} />
              )}
              <input
                data-testid="browser-url-input"
                value={addressInput}
                onChange={(e) => setAddressInput(e.target.value)}
                onFocus={(e) => e.target.select()}
                placeholder="Search or enter URL…"
                className="flex-1 bg-transparent text-xs text-white outline-none placeholder-slate-600 font-mono min-w-0"
                spellCheck={false}
                autoComplete="off"
              />
              {addressInput && (
                <button
                  type="button"
                  onClick={() => setAddressInput("")}
                  className="text-slate-600 hover:text-slate-300 flex-shrink-0 transition-colors"
                >
                  <i className="fa-solid fa-xmark text-[10px]" />
                </button>
              )}
            </div>
            <button type="submit" className="sr-only">Go</button>
          </form>

          {/* Open in new tab */}
          {currentUrl && (
            <button
              onClick={() => window.open(currentUrl, "_blank", "noopener,noreferrer")}
              title="Open in new tab"
              className="w-7 h-7 flex items-center justify-center rounded-lg text-slate-500 hover:text-[#00F0FF] hover:bg-[#00F0FF]/10 transition-all flex-shrink-0"
            >
              <i className="fa-solid fa-arrow-up-right-from-square text-[11px]" />
            </button>
          )}
        </div>

        {/* Loading bar */}
        {loading && (
          <div className="h-[2px] bg-[#00F0FF]/10 mx-3 rounded-full overflow-hidden mb-1.5">
            <div className="h-full bg-[#00F0FF] rounded-full browser-load-bar" />
          </div>
        )}

        {/* Quick-links strip */}
        <div className="flex items-center gap-1 px-3 pb-2 overflow-x-auto scrollbar-none">
          {QUICK_LINKS.map((b) => (
            <button
              key={b.name}
              onClick={() => navigate(b.url)}
              className="flex items-center gap-1.5 px-2.5 py-[5px] rounded-lg bg-white/[0.03] hover:bg-white/[0.08] border border-white/[0.06] hover:border-white/[0.14] transition-all text-[11px] font-mono whitespace-nowrap flex-shrink-0"
            >
              <i className={`${b.icon} text-[10px]`} style={{ color: b.color }} />
              <span className="text-slate-300">{b.name}</span>
            </button>
          ))}
        </div>

        {/* Priority 5 — Contextual Cortex actions for the current site */}
        <BrowserIntelBar url={currentUrl} onOpenChat={() => openApp("chat")} />
      </div>

      {/* ── Content area ── */}
      <div className="flex-1 relative overflow-hidden">

        {/* Empty / new tab state */}
        {!currentUrl && (
          <div className="absolute inset-0 flex flex-col items-center justify-center gap-5 text-center p-10">
            <div className="w-14 h-14 rounded-2xl bg-[#00F0FF]/10 border border-[#00F0FF]/20 flex items-center justify-center mb-2">
              <i className="fa-solid fa-globe text-2xl text-[#00F0FF]" />
            </div>
            <div>
              <div className="mono-label mb-1">// OmniverseOS Browser</div>
              <h2 className="font-heading text-2xl font-bold mb-2">New Tab</h2>
              <p className="text-xs text-slate-500 font-mono max-w-xs leading-relaxed">
                Type a URL, search query, or pick a quick link above.
              </p>
            </div>
            <p className="text-[10px] text-[#00F0FF]/30 font-mono mt-1">
              // Ask Cortex: "Open YouTube" · "Search GitHub for React AI"
            </p>
          </div>
        )}

        {/* Blocked / embed-restricted state — animated */}
        <AnimatePresence mode="wait">
          {blocked && currentUrl && (
            <BlockedPanel
              key={currentUrl}
              currentUrl={currentUrl}
              hostname={hostname}
              onNavigateHome={() => navigate(HOME_URL)}
            />
          )}
        </AnimatePresence>

        {/* Iframe */}
        {iframeUrl && (
          <iframe
            key={iframeUrl}
            ref={iframeRef}
            src={iframeUrl}
            title={hostname}
            onLoad={handleIframeLoad}
            onError={handleIframeError}
            className="absolute inset-0 w-full h-full border-0"
            style={{ opacity: loading ? 0 : 1, transition: "opacity 0.3s ease" }}
            allow="fullscreen; autoplay; clipboard-write"
          />
        )}

        {/* Loading skeleton while iframe loads */}
        {loading && iframeUrl && (
          <div className="absolute inset-0 flex flex-col items-center justify-center gap-3 pointer-events-none">
            <motion.div
              animate={{ opacity: [0.3, 0.8, 0.3] }}
              transition={{ duration: 1.5, repeat: Infinity, ease: "easeInOut" }}
            >
              <i className="fa-solid fa-globe text-[#00F0FF]/30 text-2xl" />
            </motion.div>
            <div className="text-[11px] text-slate-600 font-mono">
              Loading {hostname}…
            </div>
            {/* Shimmer bars */}
            <div className="flex flex-col gap-2 mt-4 w-48 opacity-20">
              {[80, 55, 70, 45].map((w, i) => (
                <div
                  key={i}
                  style={{ width: `${w}%`, height: 6, borderRadius: 3, background: "rgba(0,240,255,0.3)", animation: `pulse 1.4s ease-in-out ${i * 0.15}s infinite` }}
                />
              ))}
            </div>
          </div>
        )}
      </div>
    </div>
  );
}
