import React, { useCallback, useEffect, useRef, useState } from "react";
import { AnimatePresence, motion } from "framer-motion";
import { WALLPAPERS } from "../lib/wallpapers";

export const ONBOARDING_KEY = "omniverse_onboarding_v1_done";

export function hasSeenOnboarding() {
  try { return !!localStorage.getItem(ONBOARDING_KEY); } catch { return false; }
}
export function markOnboardingDone() {
  try { localStorage.setItem(ONBOARDING_KEY, "1"); } catch {}
}
export function resetOnboarding() {
  try { localStorage.removeItem(ONBOARDING_KEY); } catch {}
}

const SLIDES = [
  { id: "welcome", title: null, subtitle: "The AI-powered desktop. Running entirely in your browser.", accent: "#00F0FF" },
  { id: "cortex-intro", eyebrow: "// MEET CORTEX", title: "Meet Cortex", subtitle: "Cortex controls your desktop, remembers everything, and thinks alongside you.", accent: "#CF9EFF" },
  { id: "choose-name", eyebrow: "// IDENTIFICATION", title: "What should Cortex\ncall you?", subtitle: "This helps personalize your workspace.", accent: "#00F0FF" },
  { id: "location", eyebrow: "// ENVIRONMENT", title: "Locating you...", subtitle: "Enhances weather and time context.", accent: "#39FF14" },
  { id: "wallpaper", eyebrow: "// AESTHETICS", title: "Choose your world.", subtitle: "You can change this later.", accent: "#00F0FF" },
  { id: "voice-test", eyebrow: "// COMMUNICATION", title: "Cortex has a voice.", subtitle: "Let's make sure you can hear it.", accent: "#CF9EFF" },
  { id: "window-tutorial", eyebrow: "// WINDOWS", title: "Windows that work\nyour way.", subtitle: "Drag any window anywhere. Snap to edges. Stack them up.", accent: "#00F0FF" },
  { id: "widget-tutorial", eyebrow: "// WIDGETS", title: "Live widgets.\nYour data at a glance.", subtitle: "Widgets are resizable and repositionable.", accent: "#39FF14" },
  { id: "mission-control", eyebrow: "// WORKSPACE", title: "See everything,\nall at once.", subtitle: "Press Ctrl+Tab to open Mission Control. Bird's-eye view of every window.", accent: "#00F0FF" },
  { id: "command-palette", eyebrow: "// COMMAND", title: "Everything at\nyour fingertips.", subtitle: "Press ⌘K from anywhere.", accent: "#CF9EFF" },
  { id: "search", eyebrow: "// DISCOVERY", title: "Find anything instantly.", subtitle: "Universal search across files, apps, and your entire AI memory.", accent: "#00F0FF" },
  { id: "memory", eyebrow: "// INTELLIGENCE", title: "Cortex remembers\nso you don't have to.", subtitle: "Every preference, every context — stored and recalled.", accent: "#CF9EFF" },
  { id: "quick-launch", eyebrow: "// NAVIGATION", title: "Your favorites,\nalways ready.", subtitle: "Pin your favorite apps to the dock. One click to launch.", accent: "#00F0FF" },
  { id: "workspace-restore", eyebrow: "// PERSISTENCE", title: "Your workspace is\nalways waiting.", subtitle: "OmniverseOS saves your entire workspace. Pick up exactly where you left off.", accent: "#39FF14" },
  { id: "ai-assistant", eyebrow: "// ASSISTANCE", title: "Your AI is ready.", subtitle: "Just ask.", accent: "#CF9EFF" },
  { id: "ready", eyebrow: "// SYSTEM READY", title: "You're all set.", subtitle: "One person built this. In a browser. For you.", accent: "#00F0FF" }
];

const PALETTE_COMMANDS = [
  { icon: "fa-brain", label: "Open Cortex", tag: "App" },
  { icon: "fa-note-sticky", label: "New Note", tag: "Action" },
  { icon: "fa-gear", label: "Settings", tag: "App" },
];

const CORTEX_CHAT = [
  { role: "user", text: "Help me focus today" },
  { role: "assistant", text: "Of course. I've opened your Notes app and set a Pomodoro timer. Your workspace is clear." }
];

const MEMORY_CHIPS = [
  "Prefers dark mode",
  "Python projects after 9pm",
  "Favorite: Cortex + Notes"
];

function TypedText({ text, delay = 0, speed = 28, style, className }) {
  const [displayed, setDisplayed] = useState("");
  const [done, setDone] = useState(false);

  useEffect(() => {
    setDisplayed("");
    setDone(false);
    let i = 0;
    const timer = setTimeout(() => {
      const interval = setInterval(() => {
        i++;
        setDisplayed(text.slice(0, i));
        if (i >= text.length) { clearInterval(interval); setDone(true); }
      }, speed);
      return () => clearInterval(interval);
    }, delay);
    return () => clearTimeout(timer);
  }, [text, delay, speed]);

  return (
    <span className={className} style={style}>
      {displayed}
      {!done && <span style={{ opacity: 0.6 }}>▌</span>}
    </span>
  );
}

function NextButton({ onClick, text = "Next →", disabled = false, accent, style = {} }) {
  return (
    <motion.button
      initial={{ opacity: 0, y: 10 }}
      animate={{ opacity: disabled ? 0.5 : 1, y: 0 }}
      transition={{ delay: 0.5 }}
      onClick={onClick}
      disabled={disabled}
      style={{
        padding: "11px 28px", borderRadius: 50,
        background: disabled ? "rgba(255,255,255,0.05)" : `${accent}14`,
        border: `1px solid ${disabled ? "rgba(255,255,255,0.1)" : `${accent}40`}`,
        color: disabled ? "rgba(255,255,255,0.4)" : accent,
        fontSize: 14, fontWeight: 600, cursor: disabled ? "default" : "pointer",
        transition: "all 0.18s", fontFamily: "inherit", marginTop: 20,
        ...style
      }}
      onMouseEnter={(e) => { if(!disabled) { e.currentTarget.style.background = `${accent}22`; e.currentTarget.style.transform = "scale(1.02)"; } }}
      onMouseLeave={(e) => { if(!disabled) { e.currentTarget.style.background = `${accent}14`; e.currentTarget.style.transform = "scale(1)"; } }}
    >
      {text}
    </motion.button>
  );
}

function WelcomeVisual({ onNext }) {
  const accent = "#00F0FF";
  return (
    <div style={{ display: "flex", flexDirection: "column", alignItems: "center", gap: 32 }}>
      <motion.div
        animate={{ scale: [1, 1.1, 1], opacity: [0.4, 0.1, 0.4] }}
        transition={{ repeat: Infinity, duration: 3 }}
        style={{ width: 120, height: 120, borderRadius: "50%", background: `radial-gradient(circle, ${accent}20 0%, transparent 70%)`, border: `2px solid ${accent}40`, boxShadow: `0 0 40px ${accent}30`, display: "flex", alignItems: "center", justifyContent: "center" }}
      >
        <span style={{ fontFamily: "monospace", fontWeight: 900, fontSize: 32, color: accent, letterSpacing: -1 }}>OS</span>
      </motion.div>
      <div style={{ display: "flex", gap: 2 }}>
        {"OmniverseOS".split("").map((char, i) => (
          <motion.span
            key={i}
            initial={{ opacity: 0, y: 20 }}
            animate={{ opacity: 1, y: 0, textShadow: [`0 0 0px transparent`, `0 0 10px ${accent}`, `0 0 0px transparent`] }}
            transition={{ delay: i * 0.05, duration: 0.5, textShadow: { repeat: Infinity, duration: 2, delay: i * 0.1 } }}
            style={{ fontSize: "clamp(32px, 6vw, 48px)", fontWeight: 800, fontFamily: "'Space Grotesk', system-ui, sans-serif", color: "#fff" }}
          >
            {char}
          </motion.span>
        ))}
      </div>
      <NextButton onClick={onNext} accent={accent} text="Begin →" style={{ padding: "14px 36px", fontSize: 16 }} />
    </div>
  );
}

function CortexIntroVisual({ accent, onNext }) {
  return (
    <div style={{ display: "flex", flexDirection: "column", alignItems: "center", gap: 32 }}>
      <div style={{ position: "relative", width: 120, height: 120, display: "flex", alignItems: "center", justifyContent: "center" }}>
        <motion.div animate={{ scale: [1, 1.4, 1], opacity: [0.2, 0.5, 0.2] }} transition={{ repeat: Infinity, duration: 3 }} style={{ position: "absolute", width: "100%", height: "100%", borderRadius: "50%", border: `1px dashed ${accent}` }} />
        <motion.div animate={{ rotate: 360 }} transition={{ repeat: Infinity, duration: 20, ease: "linear" }} style={{ position: "absolute", width: 80, height: 80, border: `2px solid ${accent}40`, borderRadius: "30% 70% 70% 30% / 30% 30% 70% 70%" }} />
        <i className="fa-solid fa-brain" style={{ fontSize: 40, color: accent }} />
      </div>
      <NextButton onClick={onNext} accent={accent} text="Next →" />
    </div>
  );
}

function NameInput({ accent, onNext, onNameSet }) {
  const [name, setName] = useState(() => {
    try { return localStorage.getItem("omniverse_user_name") || ""; } catch { return ""; }
  });
  const [focused, setFocused] = useState(false);
  const handleNext = () => {
    if (name.trim()) {
      try { localStorage.setItem("omniverse_user_name", name.trim()); } catch {}
      onNameSet?.(name.trim());
      onNext();
    }
  };
  return (
    <div style={{ display: "flex", flexDirection: "column", alignItems: "center", gap: 24, width: "100%" }}>
      <motion.div
        animate={{ boxShadow: focused ? `0 0 20px ${accent}40` : "none", borderColor: focused ? accent : "rgba(255,255,255,0.2)" }}
        style={{ width: "100%", maxWidth: 300, display: "flex", padding: "12px 16px", background: "rgba(255,255,255,0.03)", borderRadius: 12, border: "1px solid rgba(255,255,255,0.2)", transition: "all 0.3s" }}
      >
        <input 
          value={name} onChange={e => setName(e.target.value)}
          onFocus={() => setFocused(true)} onBlur={() => setFocused(false)}
          placeholder="Enter your name..."
          onKeyDown={e => e.key === "Enter" && handleNext()}
          style={{ background: "transparent", border: "none", outline: "none", color: "#fff", fontSize: 16, width: "100%", textAlign: "center", fontFamily: "inherit" }}
          autoFocus
        />
      </motion.div>
      <NextButton onClick={handleNext} disabled={!name.trim()} accent={accent} text="Next →" />
    </div>
  );
}

function LocationVisual({ accent, onNext }) {
  const [status, setStatus] = useState("locating"); 
  const [locText, setLocText] = useState("");

  useEffect(() => {
    let mounted = true;
    if (navigator.geolocation) {
      navigator.geolocation.getCurrentPosition(
        async (pos) => {
          try {
            const res = await fetch(`https://nominatim.openstreetmap.org/reverse?format=json&lat=${pos.coords.latitude}&lon=${pos.coords.longitude}`);
            if (!res.ok) throw new Error();
            const data = await res.json();
            if (mounted) {
              const city = data.address?.city || data.address?.town || data.address?.village || "";
              const country = data.address?.country || "";
              if (city && country) {
                setLocText(`${city}, ${country}`);
              } else {
                setLocText("Earth");
              }
              setStatus("success");
            }
          } catch {
            if (mounted) { setLocText("Earth"); setStatus("success"); }
          }
        },
        () => {
          if (mounted) setStatus("failed");
        }, { timeout: 4000 }
      );
    } else {
      setStatus("failed");
    }
    return () => { mounted = false; };
  }, []);

  return (
    <div style={{ display: "flex", flexDirection: "column", alignItems: "center", gap: 24, minHeight: 160 }}>
      <AnimatePresence mode="wait">
        {status === "locating" && (
          <motion.div key="locating" initial={{ opacity: 0 }} animate={{ opacity: 1 }} exit={{ opacity: 0 }} style={{ display: "flex", alignItems: "center", justifyContent: "center", height: 80 }}>
            <motion.div animate={{ scale: [1, 2.5, 1], opacity: [0.8, 0, 0.8] }} transition={{ repeat: Infinity, duration: 1.5 }} style={{ width: 30, height: 30, borderRadius: "50%", background: accent }} />
          </motion.div>
        )}
        {status === "success" && (
          <motion.div key="success" initial={{ scale: 0.8, opacity: 0 }} animate={{ scale: 1, opacity: 1 }} style={{ display: "flex", flexDirection: "column", alignItems: "center", gap: 12, height: 80 }}>
            <i className="fa-solid fa-location-dot" style={{ fontSize: 32, color: accent }} />
            <span style={{ fontSize: 16, color: "#fff", fontWeight: 500 }}>Hello from {locText}!</span>
          </motion.div>
        )}
        {status === "failed" && (
          <motion.div key="failed" initial={{ opacity: 0 }} animate={{ opacity: 1 }} style={{ color: "rgba(255,255,255,0.6)", height: 80, display: "flex", alignItems: "center" }}>
            No location needed — Cortex works everywhere.
          </motion.div>
        )}
      </AnimatePresence>
      <NextButton onClick={onNext} disabled={status === "locating"} accent={accent} text="Next →" />
    </div>
  );
}

function WallpaperSelection({ accent, onNext, onWallpaperSelect }) {
  const [selected, setSelected] = useState(null);
  const wps = WALLPAPERS.slice(0, 12);
  
  const handleSelect = (id) => {
    setSelected(id);
    onWallpaperSelect?.(id);
  };

  return (
    <div style={{ display: "flex", flexDirection: "column", alignItems: "center", gap: 32, width: "100%" }}>
      <div style={{ display: "grid", gridTemplateColumns: "repeat(auto-fit, minmax(80px, 1fr))", gap: 12, width: "100%", maxWidth: 420 }}>
        {wps.map((wp, i) => (
          <motion.div
            key={wp.id}
            initial={{ opacity: 0, y: 10 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ delay: i * 0.05 }}
            onClick={() => handleSelect(wp.id)}
            style={{ display: "flex", flexDirection: "column", alignItems: "center", gap: 6, cursor: "pointer" }}
          >
            <motion.div
              animate={{ borderColor: selected === wp.id ? wp.accent : "rgba(255,255,255,0.1)", scale: selected === wp.id ? 1.05 : 1 }}
              style={{
                width: 80, height: 60, borderRadius: 8,
                background: `radial-gradient(circle at top left, ${wp.accent}50, #000)`,
                border: "2px solid",
                boxShadow: selected === wp.id ? `0 0 16px ${wp.accent}60` : "none",
                transition: "box-shadow 0.2s"
              }}
            />
            <span style={{ fontSize: 9, fontFamily: "monospace", color: selected === wp.id ? wp.accent : "rgba(255,255,255,0.5)", textAlign: "center" }}>
              {wp.name.slice(0, 12)}{wp.name.length > 12 ? "..." : ""}
            </span>
          </motion.div>
        ))}
      </div>
      <NextButton onClick={onNext} disabled={!selected} accent={accent} text="Confirm →" />
    </div>
  );
}

function VoiceTestVisual({ accent, onNext }) {
  const [status, setStatus] = useState("idle");
  const playVoice = () => {
    try {
      let name = "there";
      try { name = localStorage.getItem("omniverse_user_name") || "there"; } catch {}
      const msg = new SpeechSynthesisUtterance(`Hello ${name}, I am Cortex. Welcome to Omniverse OS.`);
      msg.onstart = () => setStatus("speaking");
      msg.onend = () => setStatus("done");
      msg.onerror = () => setStatus("done");
      window.speechSynthesis.speak(msg);
    } catch {
      setStatus("done");
    }
  };

  return (
    <div style={{ display: "flex", flexDirection: "column", alignItems: "center", gap: 24 }}>
      <div style={{ height: 60, display: "flex", alignItems: "center", gap: 6 }}>
        {Array.from({ length: 12 }).map((_, i) => (
          <motion.div
            key={i}
            animate={{ height: status === "speaking" ? [10, 20 + Math.random() * 30, 10] : 10 }}
            transition={{ repeat: Infinity, duration: 0.5 + Math.random() * 0.3, ease: "easeInOut" }}
            style={{ width: 6, background: accent, borderRadius: 3 }}
          />
        ))}
      </div>
      <div style={{ fontSize: 13, color: "rgba(255,255,255,0.5)", fontFamily: "monospace" }}>
        {status === "idle" ? "Ready..." : status === "speaking" ? "Speaking..." : "Done"}
      </div>
      <div style={{ display: "flex", gap: 12, marginTop: 10, alignItems: "center" }}>
        <button onClick={playVoice} style={{ padding: "11px 24px", background: "rgba(255,255,255,0.05)", border: "1px solid rgba(255,255,255,0.1)", borderRadius: 50, color: "#fff", cursor: "pointer", fontSize: 14, fontWeight: 600, height: 44, marginTop: 20 }}>Play Voice</button>
        <NextButton onClick={onNext} accent={accent} text="Next →" style={{ margin: 0, height: 44, marginTop: 20 }} />
      </div>
    </div>
  );
}

function WindowTutorialVisual({ accent, onNext }) {
  return (
    <div style={{ display: "flex", flexDirection: "column", alignItems: "center", gap: 32 }}>
      <div style={{ position: "relative", width: 340, height: 180, display: "flex", alignItems: "center", justifyContent: "center" }}>
        <motion.div
          animate={{ x: [-60, 60, -60], y: [-10, 10, -10] }}
          transition={{ repeat: Infinity, duration: 8, ease: "easeInOut" }}
          style={{ width: 220, height: 140, background: "rgba(10,12,20,0.9)", border: "1px solid rgba(255,255,255,0.1)", borderRadius: 10, boxShadow: "0 10px 40px rgba(0,0,0,0.6)", overflow: "hidden" }}
        >
          <div style={{ height: 28, background: "rgba(255,255,255,0.05)", borderBottom: "1px solid rgba(255,255,255,0.05)", display: "flex", alignItems: "center", padding: "0 10px", gap: 6 }}>
            <div style={{ width: 10, height: 10, borderRadius: "50%", background: "#FF5F56" }} />
            <div style={{ width: 10, height: 10, borderRadius: "50%", background: "#FFBD2E" }} />
            <div style={{ width: 10, height: 10, borderRadius: "50%", background: "#27C93F" }} />
          </div>
          <div style={{ padding: 16 }}>
            <div style={{ width: "80%", height: 10, background: "rgba(255,255,255,0.1)", borderRadius: 4, marginBottom: 12 }} />
            <div style={{ width: "60%", height: 10, background: "rgba(255,255,255,0.1)", borderRadius: 4, marginBottom: 12 }} />
            <div style={{ width: "40%", height: 10, background: "rgba(255,255,255,0.1)", borderRadius: 4 }} />
          </div>
        </motion.div>
      </div>
      <NextButton onClick={onNext} accent={accent} text="Got it →" />
    </div>
  );
}

function WidgetTutorialVisual({ accent, onNext }) {
  return (
    <div style={{ display: "flex", flexDirection: "column", alignItems: "center", gap: 32 }}>
      <div style={{ height: 180, display: "flex", alignItems: "center", justifyContent: "center" }}>
        <motion.div
          animate={{ width: [180, 240, 180], height: [120, 160, 120] }}
          transition={{ repeat: Infinity, duration: 4, ease: "easeInOut" }}
          style={{ background: "rgba(255,255,255,0.05)", border: `1px solid ${accent}40`, borderRadius: 16, position: "relative", padding: 20, display: "flex", flexDirection: "column", justifyContent: "center", boxShadow: `0 8px 32px ${accent}10` }}
        >
          <div style={{ fontSize: 11, color: "rgba(255,255,255,0.5)", marginBottom: 12, fontFamily: "monospace" }}>SYSTEM STATS</div>
          <div style={{ fontSize: 24, fontWeight: 800, color: accent }}>CPU: 24%</div>
          <div style={{ fontSize: 14, color: "#fff", marginTop: 4 }}>RAM: 3.2 GB</div>
          <motion.div animate={{ opacity: [0.3, 1, 0.3] }} transition={{ repeat: Infinity, duration: 2 }} style={{ position: "absolute", bottom: 10, right: 10, width: 12, height: 12, borderRight: "2px solid rgba(255,255,255,0.5)", borderBottom: "2px solid rgba(255,255,255,0.5)" }} />
        </motion.div>
      </div>
      <NextButton onClick={onNext} accent={accent} text="Nice →" />
    </div>
  );
}

function MissionControlVisual({ accent, onNext }) {
  const icons = ["fa-folder", "fa-globe", "fa-note-sticky", "fa-brain"];
  return (
    <div style={{ display: "flex", flexDirection: "column", alignItems: "center", gap: 32 }}>
      <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr", gap: 12, width: 280, padding: 12, background: "rgba(255,255,255,0.02)", borderRadius: 16, border: "1px solid rgba(255,255,255,0.05)" }}>
        {icons.map((ic, i) => (
          <motion.div key={i} initial={{ scale: 0.8, opacity: 0 }} animate={{ scale: 1, opacity: 1 }} transition={{ delay: i * 0.1, type: "spring" }} style={{ height: 80, background: "rgba(255,255,255,0.08)", borderRadius: 8, border: `1px solid ${accent}40`, display: "flex", alignItems: "center", justifyContent: "center", boxShadow: "0 4px 12px rgba(0,0,0,0.3)" }}>
            <i className={`fa-solid ${ic}`} style={{ color: accent, fontSize: 24 }} />
          </motion.div>
        ))}
      </div>
      <NextButton onClick={onNext} accent={accent} text="Got it →" />
    </div>
  );
}

function CommandPaletteVisual({ accent, onNext }) {
  const [query, setQuery] = useState("");
  const [focused, setFocused] = useState(false);
  const filtered = PALETTE_COMMANDS.filter((c) => !query || c.label.toLowerCase().includes(query.toLowerCase()));

  return (
    <div style={{ display: "flex", flexDirection: "column", alignItems: "center", gap: 32, width: "100%" }}>
      <motion.div
        initial={{ opacity: 0, y: -12, scale: 0.97 }}
        animate={{ opacity: 1, y: 0, scale: 1 }}
        transition={{ duration: 0.35, ease: "easeOut" }}
        style={{
          background: "rgba(10,12,20,0.95)", border: `1px solid ${accent}40`, borderRadius: 16, overflow: "hidden",
          boxShadow: `0 0 60px ${accent}20, 0 24px 64px rgba(0,0,0,0.6)`, width: "100%", maxWidth: 420, margin: "0 auto",
        }}
      >
        <div style={{ display: "flex", alignItems: "center", gap: 10, padding: "14px 16px", borderBottom: "1px solid rgba(255,255,255,0.06)" }}>
          <i className="fa-solid fa-magnifying-glass" style={{ color: accent, fontSize: 14, opacity: 0.7 }} />
          <input
            value={query} onChange={(e) => setQuery(e.target.value)}
            onFocus={() => setFocused(true)} onBlur={() => setFocused(false)}
            placeholder="Search apps, files, commands..."
            autoFocus
            style={{ flex: 1, background: "transparent", border: "none", outline: "none", color: "#fff", fontSize: 14, fontFamily: "inherit" }}
          />
          <kbd style={{ fontSize: 10, color: "rgba(255,255,255,0.3)", fontFamily: "monospace", background: "rgba(255,255,255,0.06)", padding: "2px 6px", borderRadius: 4 }}>⌘K</kbd>
        </div>
        <div style={{ maxHeight: 240, overflowY: "auto" }}>
          <AnimatePresence mode="popLayout">
            {filtered.map((cmd, i) => (
              <motion.div
                key={cmd.label}
                initial={{ opacity: 0, x: -8 }}
                animate={{ opacity: 1, x: 0 }}
                exit={{ opacity: 0, x: 8 }}
                transition={{ duration: 0.18, delay: i * 0.04 }}
                style={{ display: "flex", alignItems: "center", gap: 12, padding: "11px 16px", borderBottom: "1px solid rgba(255,255,255,0.04)" }}
              >
                <i className={`fa-solid ${cmd.icon}`} style={{ color: accent, fontSize: 13, width: 18, textAlign: "center" }} />
                <span style={{ flex: 1, fontSize: 13, color: "rgba(255,255,255,0.85)" }}>{cmd.label}</span>
                <span style={{ fontSize: 10, color: "rgba(255,255,255,0.3)", fontFamily: "monospace", background: "rgba(255,255,255,0.06)", padding: "2px 6px", borderRadius: 4 }}>{cmd.tag}</span>
              </motion.div>
            ))}
          </AnimatePresence>
        </div>
      </motion.div>
      <NextButton onClick={onNext} accent={accent} text="Got it →" />
    </div>
  );
}

function SearchVisual({ accent, onNext }) {
  const [expanded, setExpanded] = useState(false);
  useEffect(() => {
    const t = setTimeout(() => setExpanded(true), 600);
    return () => clearTimeout(t);
  }, []);

  return (
    <div style={{ display: "flex", flexDirection: "column", alignItems: "center", gap: 32, minHeight: 200 }}>
      <motion.div
        animate={{ width: expanded ? 320 : 44, borderRadius: expanded ? 12 : 22 }}
        transition={{ type: "spring", stiffness: 120, damping: 15 }}
        style={{ height: 44, background: "rgba(255,255,255,0.05)", border: `1px solid ${accent}50`, overflow: "hidden", display: "flex", alignItems: "center", padding: "0 14px", boxShadow: `0 4px 20px ${accent}20` }}
      >
        <i className="fa-solid fa-magnifying-glass" style={{ color: accent, fontSize: 16 }} />
        {expanded && (
          <motion.span initial={{ opacity: 0 }} animate={{ opacity: 1 }} transition={{ delay: 0.3 }} style={{ marginLeft: 12, color: "rgba(255,255,255,0.5)", fontSize: 14 }}>
            search across your entire system...
          </motion.span>
        )}
      </motion.div>
      {expanded && (
        <motion.div initial={{ opacity: 0, y: -10 }} animate={{ opacity: 1, y: 0 }} transition={{ delay: 0.4 }} style={{ width: 320, background: "rgba(10,12,20,0.8)", borderRadius: 12, border: "1px solid rgba(255,255,255,0.1)", padding: 8, marginTop: -16 }}>
          {[
            { icon: "fa-file-pdf", name: "finance-report.pdf" },
            { icon: "fa-file-code", name: "neural-core.md" },
            { icon: "fa-brain", name: "memory snapshot" }
          ].map((res, i) => (
            <motion.div key={i} initial={{ opacity: 0, x: -10 }} animate={{ opacity: 1, x: 0 }} transition={{ delay: 0.5 + i * 0.1 }} style={{ padding: "10px 12px", display: "flex", alignItems: "center", gap: 12, color: "#fff", fontSize: 13, borderBottom: i < 2 ? "1px solid rgba(255,255,255,0.05)" : "none" }}>
              <i className={`fa-solid ${res.icon}`} style={{ color: accent, width: 16, textAlign: "center" }} /> 
              <span style={{ opacity: 0.8 }}>{res.name}</span>
            </motion.div>
          ))}
        </motion.div>
      )}
      <NextButton onClick={onNext} accent={accent} text="Next →" />
    </div>
  );
}

function MemoryChipsVisual({ items, accent, onNext }) {
  return (
    <div style={{ display: "flex", flexDirection: "column", gap: 24, width: "100%", maxWidth: 400, margin: "0 auto", alignItems: "center" }}>
      <div style={{ display: "flex", flexDirection: "column", gap: 8, width: "100%" }}>
        {items.map((item, i) => (
          <motion.div
            key={i}
            initial={{ opacity: 0, x: -16 }}
            animate={{ opacity: 1, x: 0 }}
            transition={{ duration: 0.4, delay: i * 0.18, ease: "easeOut" }}
            style={{
              display: "flex", alignItems: "center", gap: 12,
              background: `${accent}10`, border: `1px solid ${accent}30`, borderRadius: 12, padding: "12px 16px",
            }}
          >
            <i className="fa-solid fa-microchip" style={{ color: accent, fontSize: 14 }} />
            <span style={{ fontSize: 13, color: "rgba(255,255,255,0.8)", fontFamily: "monospace" }}>{item}</span>
          </motion.div>
        ))}
      </div>
      <NextButton onClick={onNext} accent={accent} text="Next →" />
    </div>
  );
}

function QuickLaunchVisual({ accent, onNext }) {
  const icons = ["fa-globe", "fa-folder", "fa-terminal", "fa-note-sticky", "fa-gear"];
  return (
    <div style={{ display: "flex", flexDirection: "column", alignItems: "center", gap: 40 }}>
      <div style={{ display: "flex", gap: 16, padding: "16px 24px", background: "rgba(255,255,255,0.05)", borderRadius: 24, border: "1px solid rgba(255,255,255,0.1)", backdropFilter: "blur(10px)" }}>
        {icons.map((ic, i) => (
          <motion.div key={i} initial={{ y: 20, opacity: 0 }} animate={{ y: 0, opacity: 1 }} transition={{ type: "spring", stiffness: 300, delay: 0.2 + i * 0.1 }} style={{ width: 48, height: 48, borderRadius: 14, background: "rgba(255,255,255,0.1)", display: "flex", alignItems: "center", justifyContent: "center" }} whileHover={{ y: -6, scale: 1.1, backgroundColor: `${accent}40` }}>
            <i className={`fa-solid ${ic}`} style={{ color: "#fff", fontSize: 22 }} />
          </motion.div>
        ))}
      </div>
      <NextButton onClick={onNext} accent={accent} text="Next →" />
    </div>
  );
}

function WorkspaceRestoreVisual({ accent, onNext }) {
  return (
    <div style={{ display: "flex", flexDirection: "column", alignItems: "center", gap: 32 }}>
      <motion.div initial={{ scale: 0.9, opacity: 0 }} animate={{ scale: 1, opacity: 1 }} style={{ width: 280, background: "rgba(10,12,20,0.8)", border: `1px solid ${accent}50`, borderRadius: 16, overflow: "hidden", position: "relative", boxShadow: `0 8px 32px ${accent}20` }}>
        <div style={{ padding: "12px 16px", background: "rgba(255,255,255,0.05)", borderBottom: "1px solid rgba(255,255,255,0.1)", display: "flex", justifyContent: "space-between", alignItems: "center" }}>
          <span style={{ fontSize: 12, color: accent, fontFamily: "monospace", fontWeight: "bold", letterSpacing: 1 }}>RESTORE</span>
          <i className="fa-solid fa-clock-rotate-left" style={{ color: accent, fontSize: 14 }} />
        </div>
        <div style={{ height: 140, padding: 16, display: "flex", gap: 12 }}>
          <motion.div initial={{ opacity: 0, x: -10 }} animate={{ opacity: 1, x: 0 }} transition={{ delay: 0.3 }} style={{ flex: 2, background: "rgba(255,255,255,0.1)", borderRadius: 8, border: "1px solid rgba(255,255,255,0.05)" }} />
          <div style={{ flex: 1, display: "flex", flexDirection: "column", gap: 12 }}>
            <motion.div initial={{ opacity: 0, x: 10 }} animate={{ opacity: 1, x: 0 }} transition={{ delay: 0.4 }} style={{ flex: 1, background: "rgba(255,255,255,0.1)", borderRadius: 8, border: "1px solid rgba(255,255,255,0.05)" }} />
            <motion.div initial={{ opacity: 0, x: 10 }} animate={{ opacity: 1, x: 0 }} transition={{ delay: 0.5 }} style={{ flex: 1, background: "rgba(255,255,255,0.1)", borderRadius: 8, border: "1px solid rgba(255,255,255,0.05)" }} />
          </div>
        </div>
      </motion.div>
      <NextButton onClick={onNext} accent={accent} text="Next →" />
    </div>
  );
}

function CortexChatVisual({ messages, accent, onNext }) {
  const [visibleCount, setVisibleCount] = useState(0);
  useEffect(() => {
    if (visibleCount >= messages.length) return;
    const delay = visibleCount === 0 ? 400 : 1200;
    const t = setTimeout(() => setVisibleCount((c) => c + 1), delay);
    return () => clearTimeout(t);
  }, [visibleCount, messages.length]);

  return (
    <div style={{ display: "flex", flexDirection: "column", alignItems: "center", gap: 32, width: "100%" }}>
      <div style={{ display: "flex", flexDirection: "column", gap: 10, width: "100%", maxWidth: 420, margin: "0 auto" }}>
        <AnimatePresence>
          {messages.slice(0, visibleCount).map((msg, i) => (
            <motion.div
              key={i}
              initial={{ opacity: 0, y: 12, scale: 0.96 }}
              animate={{ opacity: 1, y: 0, scale: 1 }}
              transition={{ duration: 0.35, ease: "easeOut" }}
              style={{
                alignSelf: msg.role === "user" ? "flex-end" : "flex-start",
                maxWidth: "85%",
                background: msg.role === "user" ? "rgba(0,240,255,0.1)" : "rgba(207,158,255,0.08)",
                border: `1px solid ${msg.role === "user" ? "rgba(0,240,255,0.2)" : "rgba(207,158,255,0.2)"}`,
                borderRadius: msg.role === "user" ? "18px 18px 4px 18px" : "18px 18px 18px 4px",
                padding: "10px 14px",
              }}
            >
              {msg.role === "assistant" && i === visibleCount - 1 ? (
                <TypedText text={msg.text} speed={18} style={{ fontSize: 14, lineHeight: 1.5, color: "rgba(255,255,255,0.9)", display: "block" }} />
              ) : (
                <span style={{ fontSize: 14, lineHeight: 1.5, color: "rgba(255,255,255,0.9)" }}>{msg.text}</span>
              )}
            </motion.div>
          ))}
        </AnimatePresence>
      </div>
      <NextButton onClick={onNext} accent={accent} text="Next →" />
    </div>
  );
}

function ReadyVisual({ accent, onEnter }) {
  return (
    <div style={{ display: "flex", flexDirection: "column", alignItems: "center", gap: 40, marginTop: 20 }}>
      <button
        onClick={onEnter}
        style={{
          padding: "18px 48px", borderRadius: 50,
          background: `linear-gradient(135deg, ${accent}30, rgba(207,158,255,0.2))`,
          border: `1.5px solid ${accent}`,
          color: "#fff", fontSize: 18, fontWeight: 700, cursor: "pointer",
          boxShadow: `0 0 40px ${accent}40, inset 0 0 20px ${accent}40`,
          transition: "all 0.3s", fontFamily: "inherit", letterSpacing: "0.02em"
        }}
        onMouseEnter={(e) => { e.currentTarget.style.boxShadow = `0 0 60px ${accent}60, inset 0 0 30px ${accent}60`; e.currentTarget.style.transform = "scale(1.05)"; }}
        onMouseLeave={(e) => { e.currentTarget.style.boxShadow = `0 0 40px ${accent}40, inset 0 0 20px ${accent}40`; e.currentTarget.style.transform = "scale(1)"; }}
      >
        Enter OmniverseOS ✦
      </button>
    </div>
  );
}

function SlideContent({ slide, onNext, onEnter, onNameSet, onWallpaperSelect }) {
  const accent = slide.accent;

  return (
    <div style={{ display: "flex", flexDirection: "column", alignItems: "center", gap: 24, width: "100%", maxWidth: 520 }}>
      {slide.eyebrow && (
        <motion.div
          initial={{ opacity: 0, y: -6 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ duration: 0.4 }}
          style={{ fontFamily: "monospace", fontSize: 11, letterSpacing: "0.12em", color: `${accent}99` }}
        >
          {slide.eyebrow}
        </motion.div>
      )}

      {slide.title && (
        <motion.h1
          initial={{ opacity: 0, y: 16 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ duration: 0.5, delay: 0.15 }}
          style={{
            fontFamily: "'Space Grotesk','DM Sans',system-ui,sans-serif",
            fontSize: "clamp(28px, 5vw, 40px)",
            fontWeight: 800,
            color: "#fff",
            textAlign: "center",
            lineHeight: 1.15,
            margin: 0,
            whiteSpace: "pre-line",
          }}
        >
          {slide.title}
        </motion.h1>
      )}

      {slide.subtitle && (
        <motion.p
          initial={{ opacity: 0, y: 10 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ duration: 0.5, delay: 0.25 }}
          style={{
            fontSize: "clamp(14px, 2vw, 16px)",
            color: "rgba(255,255,255,0.6)",
            textAlign: "center",
            lineHeight: 1.6,
            maxWidth: 440,
            margin: 0,
            whiteSpace: "pre-line",
          }}
        >
          {slide.subtitle}
        </motion.p>
      )}

      <motion.div
        initial={{ opacity: 0, y: 12 }}
        animate={{ opacity: 1, y: 0 }}
        transition={{ duration: 0.5, delay: 0.38 }}
        style={{ width: "100%", marginTop: 10 }}
      >
        {slide.id === "welcome" && <WelcomeVisual onNext={onNext} />}
        {slide.id === "cortex-intro" && <CortexIntroVisual accent={accent} onNext={onNext} />}
        {slide.id === "choose-name" && <NameInput accent={accent} onNext={onNext} onNameSet={onNameSet} />}
        {slide.id === "location" && <LocationVisual accent={accent} onNext={onNext} />}
        {slide.id === "wallpaper" && <WallpaperSelection accent={accent} onNext={onNext} onWallpaperSelect={onWallpaperSelect} />}
        {slide.id === "voice-test" && <VoiceTestVisual accent={accent} onNext={onNext} />}
        {slide.id === "window-tutorial" && <WindowTutorialVisual accent={accent} onNext={onNext} />}
        {slide.id === "widget-tutorial" && <WidgetTutorialVisual accent={accent} onNext={onNext} />}
        {slide.id === "mission-control" && <MissionControlVisual accent={accent} onNext={onNext} />}
        {slide.id === "command-palette" && <CommandPaletteVisual accent={accent} onNext={onNext} />}
        {slide.id === "search" && <SearchVisual accent={accent} onNext={onNext} />}
        {slide.id === "memory" && <MemoryChipsVisual items={MEMORY_CHIPS} accent={accent} onNext={onNext} />}
        {slide.id === "quick-launch" && <QuickLaunchVisual accent={accent} onNext={onNext} />}
        {slide.id === "workspace-restore" && <WorkspaceRestoreVisual accent={accent} onNext={onNext} />}
        {slide.id === "ai-assistant" && <CortexChatVisual messages={CORTEX_CHAT} accent={accent} onNext={onNext} />}
        {slide.id === "ready" && <ReadyVisual accent={accent} onEnter={onEnter} />}
      </motion.div>
    </div>
  );
}

export default function OnboardingExperience({ onComplete, onNameSet, onWallpaperSelect }) {
  const [slideIndex, setSlideIndex] = useState(0);
  const [direction, setDirection] = useState(1);
  const slide = SLIDES[slideIndex];
  const progress = (slideIndex + 1) / SLIDES.length;
  const particlesRef = useRef(null);

  useEffect(() => {
    const canvas = particlesRef.current;
    if (!canvas) return;
    const ctx = canvas.getContext("2d");
    let raf;
    function resize() {
      canvas.width = window.innerWidth;
      canvas.height = window.innerHeight;
    }
    resize();
    window.addEventListener("resize", resize, { passive: true });
    const pts = Array.from({ length: 50 }, () => ({
      x: Math.random() * canvas.width,
      y: Math.random() * canvas.height,
      r: Math.random() * 1.2 + 0.2,
      vx: (Math.random() - 0.5) * 0.15,
      vy: (Math.random() - 0.5) * 0.15,
      a: Math.random() * 0.12 + 0.02,
      p: Math.random() * Math.PI * 2,
    }));
    let t = 0;
    function draw() {
      const { width, height } = canvas;
      ctx.clearRect(0, 0, width, height);
      t += 0.01;
      for (const p of pts) {
        p.x += p.vx; p.y += p.vy;
        if (p.x < 0) p.x = width; if (p.x > width) p.x = 0;
        if (p.y < 0) p.y = height; if (p.y > height) p.y = 0;
        const alpha = p.a * (0.4 + Math.sin(t + p.p) * 0.6);
        ctx.beginPath();
        ctx.arc(p.x, p.y, p.r, 0, Math.PI * 2);
        ctx.fillStyle = `rgba(0,240,255,${alpha.toFixed(3)})`;
        ctx.fill();
      }
      raf = requestAnimationFrame(draw);
    }
    draw();
    return () => { cancelAnimationFrame(raf); window.removeEventListener("resize", resize); };
  }, []);

  const goNext = useCallback(() => {
    if (slideIndex < SLIDES.length - 1) {
      setDirection(1);
      setSlideIndex((i) => i + 1);
    }
  }, [slideIndex]);

  const handleEnter = useCallback(() => {
    markOnboardingDone();
    onComplete?.();
  }, [onComplete]);

  const handleSkip = useCallback(() => {
    markOnboardingDone();
    onComplete?.();
  }, [onComplete]);

  // Esc dismisses onboarding from any slide (matches LocationSetup + the
  // rest of the OS's modal-dismissal convention).  Testing-agent friendly.
  useEffect(() => {
    const onKey = (e) => { if (e.key === "Escape") handleSkip(); };
    window.addEventListener("keydown", onKey);
    return () => window.removeEventListener("keydown", onKey);
  }, [handleSkip]);

  const variants = {
    enter:  (d) => ({ opacity: 0, x: d > 0 ? 60 : -60, scale: 0.97 }),
    center: { opacity: 1, x: 0, scale: 1 },
    exit:   (d) => ({ opacity: 0, x: d > 0 ? -60 : 60, scale: 0.97 }),
  };

  return (
    <div
      style={{
        position: "fixed", inset: 0, zIndex: 9999,
        background: "rgba(5,5,12,0.95)",
        backdropFilter: "blur(24px)",
        display: "flex", flexDirection: "column",
        alignItems: "center", justifyContent: "center",
        overflow: "hidden",
      }}
    >
      <canvas ref={particlesRef} style={{ position: "absolute", inset: 0, pointerEvents: "none", opacity: 0.5 }} />

      <motion.div
        key={slide.id + "-glow"}
        animate={{ opacity: [0.15, 0.25, 0.15] }}
        transition={{ repeat: Infinity, duration: 4, ease: "easeInOut" }}
        style={{
          position: "absolute",
          width: 600, height: 600,
          borderRadius: "50%",
          background: `radial-gradient(circle, ${slide.accent}18 0%, transparent 70%)`,
          pointerEvents: "none",
          top: "50%", left: "50%",
          transform: "translate(-50%, -50%)",
        }}
      />

      {slideIndex < SLIDES.length - 1 && (
        <button
          onClick={handleSkip}
          data-testid="skip-onboarding"
          style={{
            position: "absolute", top: 20, right: 20,
            background: "rgba(255,255,255,0.06)", border: "1px solid rgba(255,255,255,0.1)", color: "rgba(255,255,255,0.45)",
            padding: "7px 16px", borderRadius: 50, fontSize: 12, cursor: "pointer", fontFamily: "monospace", zIndex: 10, transition: "all 0.15s",
          }}
          onMouseEnter={(e) => { e.currentTarget.style.color = "#fff"; e.currentTarget.style.background = "rgba(255,255,255,0.1)"; }}
          onMouseLeave={(e) => { e.currentTarget.style.color = "rgba(255,255,255,0.45)"; e.currentTarget.style.background = "rgba(255,255,255,0.06)"; }}
        >
          Skip →
        </button>
      )}

      <div style={{ position: "relative", width: "100%", maxWidth: 580, padding: "0 24px", flex: 1, display: "flex", alignItems: "center", justifyContent: "center" }}>
        <AnimatePresence mode="wait" custom={direction}>
          <motion.div
            key={slide.id}
            custom={direction}
            variants={variants}
            initial="enter"
            animate="center"
            exit="exit"
            transition={{ duration: 0.42, ease: "easeInOut" }}
            style={{ width: "100%" }}
          >
            <SlideContent slide={slide} onNext={goNext} onEnter={handleEnter} onNameSet={onNameSet} onWallpaperSelect={onWallpaperSelect} />
          </motion.div>
        </AnimatePresence>
      </div>

      <div style={{ paddingBottom: 32, display: "flex", flexDirection: "column", alignItems: "center", gap: 12, zIndex: 2 }}>
        <div style={{ width: 200, height: 2, background: "rgba(255,255,255,0.08)", borderRadius: 2, overflow: "hidden" }}>
          <motion.div
            animate={{ width: `${progress * 100}%` }}
            transition={{ duration: 0.4, ease: "easeOut" }}
            style={{ height: "100%", background: slide.accent, borderRadius: 2, boxShadow: `0 0 8px ${slide.accent}80` }}
          />
        </div>
        <div style={{ display: "flex", gap: 6, alignItems: "center" }}>
          {SLIDES.map((s, i) => (
            <motion.div
              key={s.id}
              animate={{
                width: i === slideIndex ? 20 : 6,
                background: i === slideIndex ? slide.accent : "rgba(255,255,255,0.2)",
                boxShadow: i === slideIndex ? `0 0 8px ${slide.accent}80` : "none",
              }}
              transition={{ duration: 0.3 }}
              style={{ height: 6, borderRadius: 3, cursor: i < slideIndex ? "pointer" : "default" }}
              onClick={() => { if (i < slideIndex) { setDirection(-1); setSlideIndex(i); } }}
            />
          ))}
        </div>
        <span style={{ fontSize: 10, fontFamily: "monospace", color: "rgba(255,255,255,0.2)" }}>
          {slideIndex + 1} / {SLIDES.length}
        </span>
      </div>
    </div>
  );
}
