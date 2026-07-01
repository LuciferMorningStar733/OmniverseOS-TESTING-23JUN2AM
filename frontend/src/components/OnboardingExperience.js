import React, { useCallback, useEffect, useRef, useState } from "react";
import { AnimatePresence, motion } from "framer-motion";

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

// ── Slide data ────────────────────────────────────────────────────────────────
const SLIDES = [
  {
    id: "welcome",
    eyebrow: null,
    title: "Welcome to\nOmniverseOS",
    subtitle: "The AI-powered desktop that knows you.\nRunning entirely in your browser.",
    accent: "#00F0FF",
    icon: null,
    interactive: "begin",
  },
  {
    id: "desktop",
    eyebrow: "// YOUR WORKSPACE",
    title: "A desktop built\nfor the future",
    subtitle: "Floating windows. Live widgets. A dock that remembers what you love. Every pixel has a purpose.",
    accent: "#00F0FF",
    icon: "fa-desktop",
    highlights: [
      { label: "Topbar", pos: { top: "8%",   left: "50%" } },
      { label: "Dock",   pos: { bottom: "8%", left: "50%" } },
      { label: "Widgets",pos: { top: "40%",   left: "10%" } },
    ],
    interactive: "next",
  },
  {
    id: "palette",
    eyebrow: "// COMMAND PALETTE",
    title: "Everything at\nyour fingertips",
    subtitle: "Press ⌘K (or Ctrl+K) from anywhere. Launch apps, search files, ask Cortex — without lifting your hands off the keyboard.",
    accent: "#00F0FF",
    icon: "fa-magnifying-glass",
    interactive: "palette",
  },
  {
    id: "cortex",
    eyebrow: "// MEET CORTEX",
    title: "Your AI isn't\njust a chatbot",
    subtitle: "Cortex controls your desktop, remembers your preferences, searches the web, and thinks alongside you.",
    accent: "#CF9EFF",
    icon: "fa-brain",
    interactive: "cortex-chat",
    chat: [
      { role: "user",      text: "Hey Cortex, what can you do?" },
      { role: "assistant", text: "I can open apps, search anything, remember your workflow, answer questions, generate images, and even control your desktop — all by voice or text." },
    ],
  },
  {
    id: "mission",
    eyebrow: "// MISSION CONTROL",
    title: "See everything,\nall at once",
    subtitle: "Ctrl+Tab opens Mission Control — a bird's-eye view of every window. Drag, close, switch. Like a real OS.",
    accent: "#39FF14",
    icon: "fa-table-cells-large",
    interactive: "next",
  },
  {
    id: "memory",
    eyebrow: "// AI MEMORY",
    title: "Cortex remembers\nso you don't have to",
    subtitle: "Every conversation, every preference, every context — stored and recalled automatically. Your OS gets smarter every day.",
    accent: "#CF9EFF",
    icon: "fa-microchip",
    interactive: "next",
    memories: [
      "User prefers dark mode and minimal notifications",
      "Often works on Python projects after 9pm",
      "Favorite apps: Code Editor, Notes, AI Chat",
    ],
  },
  {
    id: "ready",
    eyebrow: "// YOU'RE READY",
    title: "Enter\nOmniverseOS",
    subtitle: "One person built this. In a browser. For you.\nLet's go.",
    accent: "#00F0FF",
    icon: null,
    interactive: "enter",
  },
];

// ── Animated typing text ───────────────────────────────────────────────────
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

// ── Mock Command Palette ───────────────────────────────────────────────────
const PALETTE_COMMANDS = [
  { icon: "fa-brain",          label: "Open Cortex",          tag: "App"    },
  { icon: "fa-folder-open",    label: "Open File Manager",    tag: "App"    },
  { icon: "fa-magnifying-glass",label: "Search the web…",    tag: "Search" },
  { icon: "fa-image",          label: "Generate an image",    tag: "AI"     },
  { icon: "fa-calendar",       label: "Open Calendar",        tag: "App"    },
];

function MockPalette({ accent }) {
  const [query, setQuery] = useState("");
  const [focused, setFocused] = useState(false);
  const filtered = PALETTE_COMMANDS.filter((c) =>
    !query || c.label.toLowerCase().includes(query.toLowerCase())
  );

  return (
    <motion.div
      initial={{ opacity: 0, y: -12, scale: 0.97 }}
      animate={{ opacity: 1, y: 0, scale: 1 }}
      transition={{ duration: 0.35, ease: "easeOut" }}
      style={{
        background: "rgba(10,12,20,0.95)",
        border: `1px solid ${accent}40`,
        borderRadius: 16,
        overflow: "hidden",
        boxShadow: `0 0 60px ${accent}20, 0 24px 64px rgba(0,0,0,0.6)`,
        width: "100%",
        maxWidth: 420,
        margin: "0 auto",
      }}
    >
      <div
        style={{
          display: "flex",
          alignItems: "center",
          gap: 10,
          padding: "14px 16px",
          borderBottom: "1px solid rgba(255,255,255,0.06)",
        }}
      >
        <i className="fa-solid fa-magnifying-glass" style={{ color: accent, fontSize: 14, opacity: 0.7 }} />
        <input
          value={query}
          onChange={(e) => setQuery(e.target.value)}
          onFocus={() => setFocused(true)}
          onBlur={() => setFocused(false)}
          placeholder="Search apps, files, commands, ask anything…"
          autoFocus
          style={{
            flex: 1,
            background: "transparent",
            border: "none",
            outline: "none",
            color: "#fff",
            fontSize: 14,
            fontFamily: "inherit",
          }}
        />
        <kbd style={{ fontSize: 10, color: "rgba(255,255,255,0.3)", fontFamily: "monospace", background: "rgba(255,255,255,0.06)", padding: "2px 6px", borderRadius: 4 }}>ESC</kbd>
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
              style={{
                display: "flex", alignItems: "center", gap: 12,
                padding: "11px 16px",
                cursor: "pointer",
                borderBottom: "1px solid rgba(255,255,255,0.04)",
                transition: "background 0.15s",
              }}
              onMouseEnter={(e) => { e.currentTarget.style.background = `${accent}10`; }}
              onMouseLeave={(e) => { e.currentTarget.style.background = "transparent"; }}
            >
              <i className={`fa-solid ${cmd.icon}`} style={{ color: accent, fontSize: 13, width: 18, textAlign: "center" }} />
              <span style={{ flex: 1, fontSize: 13, color: "rgba(255,255,255,0.85)" }}>{cmd.label}</span>
              <span style={{ fontSize: 10, color: "rgba(255,255,255,0.3)", fontFamily: "monospace", background: "rgba(255,255,255,0.06)", padding: "2px 6px", borderRadius: 4 }}>{cmd.tag}</span>
            </motion.div>
          ))}
        </AnimatePresence>
        {filtered.length === 0 && (
          <div style={{ padding: "20px 16px", color: "rgba(255,255,255,0.3)", fontSize: 13, textAlign: "center" }}>
            No results for "{query}"
          </div>
        )}
      </div>
    </motion.div>
  );
}

// ── Cortex demo chat ───────────────────────────────────────────────────────
function CortexChat({ messages, accent }) {
  const [visibleCount, setVisibleCount] = useState(0);
  useEffect(() => {
    if (visibleCount >= messages.length) return;
    const delay = visibleCount === 0 ? 400 : 1200;
    const t = setTimeout(() => setVisibleCount((c) => c + 1), delay);
    return () => clearTimeout(t);
  }, [visibleCount, messages.length]);

  return (
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
              background: msg.role === "user"
                ? "rgba(0,240,255,0.1)"
                : "rgba(207,158,255,0.08)",
              border: `1px solid ${msg.role === "user" ? "rgba(0,240,255,0.2)" : "rgba(207,158,255,0.2)"}`,
              borderRadius: msg.role === "user" ? "18px 18px 4px 18px" : "18px 18px 18px 4px",
              padding: "10px 14px",
            }}
          >
            {msg.role === "assistant" && i === visibleCount - 1 ? (
              <TypedText
                text={msg.text}
                speed={18}
                style={{ fontSize: 13, lineHeight: 1.5, color: "rgba(255,255,255,0.88)", display: "block" }}
              />
            ) : (
              <span style={{ fontSize: 13, lineHeight: 1.5, color: "rgba(255,255,255,0.88)" }}>{msg.text}</span>
            )}
          </motion.div>
        ))}
      </AnimatePresence>
    </div>
  );
}

// ── Memory chips ───────────────────────────────────────────────────────────
function MemoryChips({ items, accent }) {
  return (
    <div style={{ display: "flex", flexDirection: "column", gap: 8, width: "100%", maxWidth: 400, margin: "0 auto" }}>
      {items.map((item, i) => (
        <motion.div
          key={i}
          initial={{ opacity: 0, x: -16 }}
          animate={{ opacity: 1, x: 0 }}
          transition={{ duration: 0.4, delay: i * 0.18 + 0.3, ease: "easeOut" }}
          style={{
            display: "flex", alignItems: "center", gap: 10,
            background: `${accent}08`,
            border: `1px solid ${accent}20`,
            borderRadius: 10,
            padding: "10px 14px",
          }}
        >
          <i className="fa-solid fa-circle-dot" style={{ color: accent, fontSize: 8 }} />
          <span style={{ fontSize: 12, color: "rgba(255,255,255,0.7)", fontFamily: "monospace" }}>{item}</span>
        </motion.div>
      ))}
    </div>
  );
}

// ── Mission Control mini preview ────────────────────────────────────────────
function MissionPreview({ accent }) {
  const [active, setActive] = useState(null);
  const mockWindows = [
    { id: "a", label: "AI Chat", icon: "fa-brain",        color: "#CF9EFF" },
    { id: "b", label: "Files",   icon: "fa-folder",       color: "#00F0FF" },
    { id: "c", label: "Notes",   icon: "fa-note-sticky",  color: "#FFD700" },
    { id: "d", label: "Browser", icon: "fa-globe",        color: "#39FF14" },
  ];
  return (
    <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr", gap: 10, width: "100%", maxWidth: 420, margin: "0 auto" }}>
      {mockWindows.map((w, i) => (
        <motion.div
          key={w.id}
          initial={{ opacity: 0, scale: 0.88 }}
          animate={{ opacity: 1, scale: 1 }}
          transition={{ duration: 0.35, delay: i * 0.08 + 0.2, ease: "easeOut" }}
          onClick={() => setActive(w.id === active ? null : w.id)}
          style={{
            background: active === w.id ? `${w.color}18` : "rgba(255,255,255,0.04)",
            border: `1px solid ${active === w.id ? `${w.color}50` : "rgba(255,255,255,0.08)"}`,
            borderRadius: 12,
            padding: "16px 14px",
            cursor: "pointer",
            display: "flex", flexDirection: "column", alignItems: "center", gap: 8,
            transition: "all 0.18s ease",
          }}
        >
          <i className={`fa-solid ${w.icon}`} style={{ fontSize: 22, color: active === w.id ? w.color : "rgba(255,255,255,0.4)" }} />
          <span style={{ fontSize: 11, color: active === w.id ? w.color : "rgba(255,255,255,0.5)", fontFamily: "monospace" }}>{w.label}</span>
        </motion.div>
      ))}
    </div>
  );
}

// ── Slide content ───────────────────────────────────────────────────────────
function SlideContent({ slide, onNext, onEnter }) {
  const accent = slide.accent;

  return (
    <div style={{ display: "flex", flexDirection: "column", alignItems: "center", gap: 24, width: "100%", maxWidth: 520 }}>
      {/* Eyebrow */}
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

      {/* Icon (for non-welcome, non-ready slides) */}
      {slide.icon && (
        <motion.div
          initial={{ opacity: 0, scale: 0.5 }}
          animate={{ opacity: 1, scale: 1 }}
          transition={{ duration: 0.5, ease: [0.34, 1.56, 0.64, 1] }}
          style={{
            width: 72, height: 72, borderRadius: "50%",
            background: `${accent}12`,
            border: `2px solid ${accent}35`,
            display: "flex", alignItems: "center", justifyContent: "center",
            boxShadow: `0 0 40px ${accent}25`,
          }}
        >
          <i className={`fa-solid ${slide.icon}`} style={{ fontSize: 28, color: accent }} />
        </motion.div>
      )}

      {/* Welcome-specific: OmniverseOS animated logo */}
      {slide.id === "welcome" && (
        <motion.div
          initial={{ opacity: 0, scale: 0.6 }}
          animate={{ opacity: 1, scale: 1 }}
          transition={{ duration: 0.8, ease: [0.34, 1.56, 0.64, 1] }}
          style={{ position: "relative" }}
        >
          {/* Outer glow ring */}
          <motion.div
            animate={{ scale: [1, 1.12, 1], opacity: [0.4, 0.15, 0.4] }}
            transition={{ repeat: Infinity, duration: 3, ease: "easeInOut" }}
            style={{
              position: "absolute", inset: -20,
              borderRadius: "50%",
              background: `radial-gradient(circle, ${accent}18 0%, transparent 70%)`,
            }}
          />
          <div style={{
            width: 100, height: 100, borderRadius: "50%",
            background: `radial-gradient(135deg, ${accent}20 0%, #0a0c14 100%)`,
            border: `2px solid ${accent}50`,
            display: "flex", alignItems: "center", justifyContent: "center",
            boxShadow: `0 0 60px ${accent}30`,
          }}>
            <span style={{ fontFamily: "monospace", fontWeight: 900, fontSize: 26, color: accent, letterSpacing: -1 }}>OS</span>
          </div>
        </motion.div>
      )}

      {/* Title */}
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

      {/* Subtitle */}
      <motion.p
        initial={{ opacity: 0, y: 10 }}
        animate={{ opacity: 1, y: 0 }}
        transition={{ duration: 0.5, delay: 0.25 }}
        style={{
          fontSize: "clamp(13px, 2vw, 15px)",
          color: "rgba(255,255,255,0.55)",
          textAlign: "center",
          lineHeight: 1.65,
          maxWidth: 440,
          margin: 0,
          whiteSpace: "pre-line",
        }}
      >
        {slide.subtitle}
      </motion.p>

      {/* Interactive element */}
      <motion.div
        initial={{ opacity: 0, y: 12 }}
        animate={{ opacity: 1, y: 0 }}
        transition={{ duration: 0.5, delay: 0.38 }}
        style={{ width: "100%" }}
      >
        {slide.interactive === "palette" && <MockPalette accent={accent} />}
        {slide.interactive === "cortex-chat" && <CortexChat messages={slide.chat} accent={accent} />}
        {slide.id === "mission" && <MissionPreview accent={accent} />}
        {slide.id === "memory" && <MemoryChips items={slide.memories} accent={accent} />}
      </motion.div>

      {/* CTA button */}
      <motion.div
        initial={{ opacity: 0, y: 8 }}
        animate={{ opacity: 1, y: 0 }}
        transition={{ duration: 0.45, delay: 0.5 }}
        style={{ display: "flex", gap: 12, alignItems: "center", flexWrap: "wrap", justifyContent: "center" }}
      >
        {slide.interactive === "begin" && (
          <button
            onClick={onNext}
            style={{
              padding: "14px 36px", borderRadius: 50,
              background: `linear-gradient(135deg, ${accent}22, ${accent}10)`,
              border: `1.5px solid ${accent}60`,
              color: accent, fontSize: 15, fontWeight: 700, cursor: "pointer",
              boxShadow: `0 0 32px ${accent}20`,
              transition: "all 0.2s",
              fontFamily: "inherit",
              letterSpacing: "0.02em",
            }}
            onMouseEnter={(e) => { e.currentTarget.style.background = `${accent}22`; e.currentTarget.style.boxShadow = `0 0 48px ${accent}35`; e.currentTarget.style.transform = "scale(1.03)"; }}
            onMouseLeave={(e) => { e.currentTarget.style.background = `linear-gradient(135deg, ${accent}22, ${accent}10)`; e.currentTarget.style.boxShadow = `0 0 32px ${accent}20`; e.currentTarget.style.transform = "scale(1)"; }}
          >
            Begin Experience →
          </button>
        )}
        {(slide.interactive === "next" || slide.interactive === "palette" || slide.interactive === "cortex-chat") && (
          <button
            onClick={onNext}
            style={{
              padding: "11px 28px", borderRadius: 50,
              background: `${accent}14`,
              border: `1px solid ${accent}40`,
              color: accent, fontSize: 14, fontWeight: 600, cursor: "pointer",
              transition: "all 0.18s", fontFamily: "inherit",
            }}
            onMouseEnter={(e) => { e.currentTarget.style.background = `${accent}22`; e.currentTarget.style.transform = "scale(1.02)"; }}
            onMouseLeave={(e) => { e.currentTarget.style.background = `${accent}14`; e.currentTarget.style.transform = "scale(1)"; }}
          >
            Continue →
          </button>
        )}
        {slide.interactive === "enter" && (
          <button
            onClick={onEnter}
            style={{
              padding: "15px 44px", borderRadius: 50,
              background: `linear-gradient(135deg, #00F0FF22, #CF9EFF18)`,
              border: "1.5px solid rgba(0,240,255,0.5)",
              color: "#fff", fontSize: 15, fontWeight: 700, cursor: "pointer",
              boxShadow: "0 0 60px rgba(0,240,255,0.2), 0 0 120px rgba(207,158,255,0.1)",
              transition: "all 0.22s", fontFamily: "inherit", letterSpacing: "0.02em",
            }}
            onMouseEnter={(e) => { e.currentTarget.style.boxShadow = "0 0 80px rgba(0,240,255,0.35), 0 0 140px rgba(207,158,255,0.15)"; e.currentTarget.style.transform = "scale(1.04)"; }}
            onMouseLeave={(e) => { e.currentTarget.style.boxShadow = "0 0 60px rgba(0,240,255,0.2), 0 0 120px rgba(207,158,255,0.1)"; e.currentTarget.style.transform = "scale(1)"; }}
          >
            Enter OmniverseOS ✦
          </button>
        )}
      </motion.div>
    </div>
  );
}

// ── Main component ─────────────────────────────────────────────────────────
export default function OnboardingExperience({ onComplete }) {
  const [slideIndex, setSlideIndex] = useState(0);
  const [direction, setDirection] = useState(1); // 1 = forward, -1 = back
  const slide = SLIDES[slideIndex];
  const progress = (slideIndex + 1) / SLIDES.length;
  const particlesRef = useRef(null);

  // Ambient particle canvas
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

  const variants = {
    enter:  (d) => ({ opacity: 0, x: d > 0 ? 60 : -60, scale: 0.97 }),
    center: { opacity: 1, x: 0, scale: 1 },
    exit:   (d) => ({ opacity: 0, x: d > 0 ? -60 : 60, scale: 0.97 }),
  };

  return (
    <div
      style={{
        position: "fixed", inset: 0, zIndex: 9999,
        background: "rgba(5,5,12,0.92)",
        backdropFilter: "blur(24px)",
        display: "flex", flexDirection: "column",
        alignItems: "center", justifyContent: "center",
        overflow: "hidden",
      }}
    >
      {/* Ambient particles */}
      <canvas ref={particlesRef} style={{ position: "absolute", inset: 0, pointerEvents: "none", opacity: 0.5 }} />

      {/* Radial glow matching accent */}
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

      {/* Skip button */}
      {slideIndex < SLIDES.length - 1 && (
        <button
          onClick={handleSkip}
          style={{
            position: "absolute", top: 20, right: 20,
            background: "rgba(255,255,255,0.06)",
            border: "1px solid rgba(255,255,255,0.1)",
            color: "rgba(255,255,255,0.45)",
            padding: "7px 16px", borderRadius: 50,
            fontSize: 12, cursor: "pointer", fontFamily: "monospace",
            zIndex: 10, transition: "all 0.15s",
          }}
          onMouseEnter={(e) => { e.currentTarget.style.color = "#fff"; e.currentTarget.style.background = "rgba(255,255,255,0.1)"; }}
          onMouseLeave={(e) => { e.currentTarget.style.color = "rgba(255,255,255,0.45)"; e.currentTarget.style.background = "rgba(255,255,255,0.06)"; }}
        >
          Skip →
        </button>
      )}

      {/* Slide */}
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
            <SlideContent slide={slide} onNext={goNext} onEnter={handleEnter} />
          </motion.div>
        </AnimatePresence>
      </div>

      {/* Progress dots + bar */}
      <div style={{ paddingBottom: 32, display: "flex", flexDirection: "column", alignItems: "center", gap: 12, zIndex: 2 }}>
        {/* Progress bar */}
        <div style={{ width: 180, height: 2, background: "rgba(255,255,255,0.08)", borderRadius: 2, overflow: "hidden" }}>
          <motion.div
            animate={{ width: `${progress * 100}%` }}
            transition={{ duration: 0.4, ease: "easeOut" }}
            style={{ height: "100%", background: slide.accent, borderRadius: 2, boxShadow: `0 0 8px ${slide.accent}80` }}
          />
        </div>
        {/* Dots */}
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
