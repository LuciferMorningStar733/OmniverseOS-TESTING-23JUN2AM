import React, { useState, useCallback } from "react";
import { motion } from "framer-motion";
import { useOS } from "../context/OSContext";
import WallpaperStudio from "../components/WallpaperStudio";
import { useMobilePrefs, LOCK_TIMEOUT_OPTIONS } from "../hooks/useMobilePrefs";
import { useBreakpoint } from "../hooks/useBreakpoint";
import { getPreferredProvider, setPreferredProvider, getVoicePrefs, setVoicePrefs, authApi } from "../lib/api";
import { useBrightnessContext } from "../context/BrightnessContext";
import LocationSetup, { getStoredCity } from "../components/LocationSetup";
import { resetBootFlag } from "../components/BootScreen";
import { resetOnboarding } from "../components/OnboardingExperience";
import { toast } from "sonner";
import {
  getAllSoundPrefs, setSoundsEnabled, setSoundCategory,
  playClick, playNotification, playBoot, playAIProcess, playAmbientTick,
} from "../lib/soundEngine";

/* ── Toggle row ────────────────────────────────────────────────────────────── */
function ToggleRow({ label, desc, value, onChange }) {
  return (
    <div
      className="flex items-center justify-between py-2.5"
      style={{ borderBottom: "1px solid rgba(255,255,255,0.06)" }}
    >
      <div>
        <div className="text-sm text-white font-medium">{label}</div>
        {desc && <div className="text-xs text-slate-500 mt-0.5">{desc}</div>}
      </div>
      <button
        onClick={() => onChange(!value)}
        style={{
          width: 44, height: 26, borderRadius: 13, flexShrink: 0,
          background: value ? "#00F0FF" : "rgba(255,255,255,0.12)",
          border: "none", cursor: "pointer", position: "relative",
          transition: "background 0.22s ease",
          boxShadow: value ? "0 0 12px rgba(0,240,255,0.5)" : "none",
          WebkitTapHighlightColor: "transparent",
        }}
      >
        <div style={{
          position: "absolute",
          top: 3, left: value ? 21 : 3,
          width: 20, height: 20, borderRadius: "50%",
          background: "#fff",
          transition: "left 0.22s ease",
          boxShadow: "0 1px 4px rgba(0,0,0,0.3)",
        }} />
      </button>
    </div>
  );
}

/* ── Segmented control ─────────────────────────────────────────────────────── */
function Segmented({ options, value, onChange }) {
  return (
    <div style={{
      display: "flex", flexWrap: "wrap", gap: 6, marginTop: 10,
    }}>
      {options.map((opt) => (
        <button
          key={opt.value}
          onClick={() => onChange(opt.value)}
          style={{
            padding: "6px 12px",
            borderRadius: 8,
            fontSize: 12,
            fontFamily: "'JetBrains Mono', monospace",
            border: value === opt.value
              ? "1px solid rgba(0,240,255,0.6)"
              : "1px solid rgba(255,255,255,0.10)",
            background: value === opt.value
              ? "rgba(0,240,255,0.12)"
              : "rgba(255,255,255,0.04)",
            color: value === opt.value ? "#00F0FF" : "rgba(255,255,255,0.55)",
            cursor: "pointer",
            transition: "all 0.18s ease",
            minHeight: 36,
            WebkitTapHighlightColor: "transparent",
          }}
        >
          {opt.label}
        </button>
      ))}
    </div>
  );
}

const PROVIDER_OPTIONS = [
  { value: "auto",       label: "Auto",        desc: "Tries Gemini first, falls back automatically" },
  { value: "gemini",     label: "Gemini",       desc: "Google Gemini Flash 2.5" },
  { value: "groq",       label: "Groq",         desc: "Llama 3.3 70B via Groq" },
  { value: "cerebras",   label: "Cerebras",     desc: "Llama 3.3 70B via Cerebras" },
  { value: "openrouter", label: "OpenRouter",   desc: "Llama 3.3 70B via OpenRouter" },
];

/* ── Main Settings component ───────────────────────────────────────────────── */
const VOICE_PROVIDER_OPTIONS = [
  { value: "stream",  label: "StreamElements (Free)", desc: "Amazon Polly Neural voices — human quality, no API key required" },
  { value: "browser", label: "Browser (local)",        desc: "Uses your device's built-in voices — Microsoft Edge Neural, Chrome, Apple" },
];

const RATE_OPTIONS = [
  { value: 0.75, label: "0.75×" },
  { value: 0.9,  label: "0.9×"  },
  { value: 1.0,  label: "1×"    },
  { value: 1.15, label: "1.15×" },
  { value: 1.3,  label: "1.3×"  },
];

const VOLUME_OPTIONS = [
  { value: 0.5,  label: "50%"  },
  { value: 0.7,  label: "70%"  },
  { value: 0.85, label: "85%"  },
  { value: 1.0,  label: "100%" },
];

export default function Settings() {
  const { user, logout } = useOS();
  const { prefs, setPref } = useMobilePrefs();
  const { isMobile } = useBreakpoint();
  const [preferredProvider, setPreferredProviderState] = useState(getPreferredProvider);
  const { brightness, setBrightness } = useBrightnessContext();
  const [showLocationSetup, setShowLocationSetup] = useState(false);
  const currentCity = getStoredCity();

  const [voicePrefs, setVoicePrefsState] = useState(() => getVoicePrefs());

  function handleVoicePrefChange(key, value) {
    const next = { ...voicePrefs, [key]: value };
    setVoicePrefsState(next);
    setVoicePrefs(next);
  }

  function handleProviderChange(val) {
    setPreferredProvider(val);
    setPreferredProviderState(val);
  }

  return (
    <div className="p-4 sm:p-6 text-white overflow-y-auto h-full" data-testid="settings-app">
      <div className="mono-label">// Profile</div>
      <h2 className="font-heading text-2xl font-bold mb-5">Settings</h2>

      {/* Profile card */}
      <div className="glass-light rounded-xl p-4 sm:p-5 mb-3 flex items-center gap-3 sm:gap-4">
        <div className="w-12 h-12 sm:w-16 sm:h-16 rounded-full bg-gradient-to-br from-[#00F0FF] to-[#FF003C] flex items-center justify-center text-xl sm:text-2xl font-bold text-black flex-shrink-0">
          {user?.name?.[0]?.toUpperCase()}
        </div>
        <div className="min-w-0">
          <div className="font-heading text-base sm:text-lg font-bold truncate">{user?.name}</div>
          <div className="text-sm text-slate-400 truncate">{user?.email}</div>
          <div className="mono-label opacity-60 mt-1">
            Joined {new Date(user?.created_at).toLocaleDateString()}
          </div>
        </div>
      </div>

      {/* Brightness */}
      <div className="glass-light rounded-xl p-4 sm:p-5 mb-3">
        <div className="mono-label">// Display</div>
        <h3 className="font-heading text-base font-bold mb-3">Brightness</h3>
        <div style={{ display: "flex", alignItems: "center", gap: 12 }}>
          <i className="fa-solid fa-moon" style={{ color: "#F59E0B", fontSize: 13, flexShrink: 0 }} />
          <input
            type="range" min={10} max={100} step={1} value={brightness}
            onChange={(e) => setBrightness(Number(e.target.value))}
            style={{
              flex: 1, appearance: "none", WebkitAppearance: "none",
              height: 6, borderRadius: 3, outline: "none", cursor: "pointer",
              background: `linear-gradient(to right, #F59E0B ${brightness}%, rgba(255,255,255,0.12) ${brightness}%)`,
            }}
          />
          <i className="fa-solid fa-sun" style={{ color: "#F59E0B", fontSize: 13, flexShrink: 0 }} />
          <span style={{ fontFamily: "monospace", fontSize: 12, color: "#F59E0B", minWidth: 38, textAlign: "right" }}>{brightness}%</span>
        </div>
        <p className="text-xs text-slate-500 mt-2">Shortcut: Ctrl + Shift + B</p>
      </div>

      {/* Location */}
      <div className="glass-light rounded-xl p-4 sm:p-5 mb-3">
        <div className="mono-label">// Location</div>
        <h3 className="font-heading text-base font-bold mb-1">Weather Location</h3>
        <p className="text-xs text-slate-500 mb-3">Used by Cortex for weather, greetings, and suggestions.</p>
        <div style={{ display: "flex", alignItems: "center", justifyContent: "space-between" }}>
          <div style={{ display: "flex", alignItems: "center", gap: 8 }}>
            <i className="fa-solid fa-location-dot" style={{ color: "#A855F7", fontSize: 13 }} />
            <span style={{ fontSize: 13, color: currentCity ? "#fff" : "rgba(255,255,255,0.35)" }}>
              {currentCity || "Not set"}
            </span>
          </div>
          <button
            onClick={() => setShowLocationSetup(true)}
            style={{
              padding: "6px 14px", borderRadius: 8, fontSize: 12,
              border: "1px solid rgba(168,85,247,0.4)",
              background: "rgba(168,85,247,0.10)", color: "#A855F7",
              cursor: "pointer", fontFamily: "monospace", transition: "all 0.15s",
            }}
            onMouseEnter={(e) => { e.currentTarget.style.background = "rgba(168,85,247,0.20)"; }}
            onMouseLeave={(e) => { e.currentTarget.style.background = "rgba(168,85,247,0.10)"; }}
          >
            {currentCity ? "Change" : "Set Location"}
          </button>
        </div>
        {showLocationSetup && (
          <LocationSetup onComplete={(city) => { setShowLocationSetup(false); }} />
        )}
      </div>

      {/* Wallpaper Studio */}
      <div className="glass-light rounded-xl p-4 sm:p-5 mb-3">
        <div className="mb-4">
          <div className="mono-label">// Wallpaper Studio</div>
          <h3 className="font-heading text-base font-bold">Desktop background</h3>
          <p className="text-xs text-slate-500 mt-0.5">24 built-in scenes · upload · favorites · random</p>
        </div>
        <WallpaperStudio />
      </div>

      {/* Mobile section — visible on all screens but most useful on mobile */}
      <div className="glass-light rounded-xl p-4 sm:p-5 mb-3">
        <div className="mono-label">// Mobile</div>
        <h3 className="font-heading text-base font-bold mb-4">Mobile experience</h3>

        <ToggleRow
          label="Lock screen"
          desc="Auto-lock after inactivity"
          value={prefs.lockEnabled}
          onChange={(v) => setPref("lockEnabled", v)}
        />

        {prefs.lockEnabled && (
          <div style={{ paddingTop: 12, paddingBottom: 4 }}>
            <div className="text-xs text-slate-400 font-mono uppercase tracking-widest mb-1">
              Lock after
            </div>
            <Segmented
              options={LOCK_TIMEOUT_OPTIONS}
              value={prefs.lockTimeout}
              onChange={(v) => setPref("lockTimeout", v)}
            />
          </div>
        )}

        <ToggleRow
          label="Swipe navigation"
          desc="Swipe left/right to switch apps"
          value={prefs.swipeNav}
          onChange={(v) => setPref("swipeNav", v)}
        />

        <ToggleRow
          label="Reduce motion"
          desc="Use simpler transitions for performance"
          value={prefs.reduceMotion}
          onChange={(v) => setPref("reduceMotion", v)}
        />

        <div className="mt-3 flex items-center gap-2 py-2">
          <i className="fa-solid fa-circle-info text-[#00F0FF] text-xs" />
          <span className="text-xs text-slate-500">
            Long-press any dock icon for quick actions
          </span>
        </div>
      </div>

      {/* System Sounds — Priority 10 */}
      <SoundSettingsSection />

      {/* Cortex AI Provider */}
      <div className="glass-light rounded-xl p-4 sm:p-5 mb-3">
        <div className="mono-label">// Cortex</div>
        <h3 className="font-heading text-base font-bold mb-1">Preferred AI Provider</h3>
        <p className="text-xs text-slate-500 mb-4">
          Auto uses Gemini first and falls back automatically if it's unavailable.
        </p>
        <div className="space-y-2">
          {PROVIDER_OPTIONS.map((opt) => {
            const active = preferredProvider === opt.value;
            return (
              <button
                key={opt.value}
                onClick={() => handleProviderChange(opt.value)}
                style={{
                  width: "100%", textAlign: "left", padding: "10px 14px",
                  borderRadius: 10,
                  border: active ? "1px solid rgba(0,240,255,0.55)" : "1px solid rgba(255,255,255,0.08)",
                  background: active ? "rgba(0,240,255,0.08)" : "rgba(255,255,255,0.03)",
                  cursor: "pointer", display: "flex", alignItems: "center", gap: 12,
                  transition: "all 0.18s ease",
                  WebkitTapHighlightColor: "transparent",
                }}
              >
                <div style={{
                  width: 16, height: 16, borderRadius: "50%", flexShrink: 0,
                  border: active ? "4px solid #00F0FF" : "2px solid rgba(255,255,255,0.25)",
                  background: active ? "#00F0FF" : "transparent",
                  boxShadow: active ? "0 0 8px rgba(0,240,255,0.6)" : "none",
                  transition: "all 0.18s ease",
                }} />
                <div>
                  <div style={{ fontSize: 13, fontWeight: 600, color: active ? "#00F0FF" : "rgba(255,255,255,0.85)" }}>
                    {opt.label}
                  </div>
                  <div style={{ fontSize: 11, color: "rgba(255,255,255,0.35)", fontFamily: "'JetBrains Mono', monospace", marginTop: 1 }}>
                    {opt.desc}
                  </div>
                </div>
              </button>
            );
          })}
        </div>
      </div>

      {/* Cortex Voice */}
      <div className="glass-light rounded-xl p-4 sm:p-5 mb-3">
        <div className="mono-label">// Voice</div>
        <h3 className="font-heading text-base font-bold mb-1">Cortex Voice</h3>
        <p className="text-xs text-slate-500 mb-4">
          StreamElements uses Amazon Polly Neural voices — human quality, completely free, no API key required. Browser uses your device's built-in voices (Microsoft Edge Neural on Windows, Apple on macOS/iOS).
        </p>

        {/* Provider */}
        <div className="mb-4">
          <div className="text-xs text-slate-400 font-mono uppercase tracking-widest mb-2">Voice Provider</div>
          <div className="space-y-2">
            {VOICE_PROVIDER_OPTIONS.map((opt) => {
              const active = voicePrefs.provider === opt.value;
              return (
                <button
                  key={opt.value}
                  onClick={() => handleVoicePrefChange("provider", opt.value)}
                  style={{
                    width: "100%", textAlign: "left", padding: "10px 14px",
                    borderRadius: 10,
                    border: active ? "1px solid rgba(0,240,255,0.55)" : "1px solid rgba(255,255,255,0.08)",
                    background: active ? "rgba(0,240,255,0.08)" : "rgba(255,255,255,0.03)",
                    cursor: "pointer", display: "flex", alignItems: "center", gap: 12,
                    transition: "all 0.18s ease",
                    WebkitTapHighlightColor: "transparent",
                  }}
                >
                  <div style={{
                    width: 16, height: 16, borderRadius: "50%", flexShrink: 0,
                    border: active ? "4px solid #00F0FF" : "2px solid rgba(255,255,255,0.25)",
                    background: active ? "#00F0FF" : "transparent",
                    boxShadow: active ? "0 0 8px rgba(0,240,255,0.6)" : "none",
                    transition: "all 0.18s ease",
                  }} />
                  <div>
                    <div style={{ fontSize: 13, fontWeight: 600, color: active ? "#00F0FF" : "rgba(255,255,255,0.85)" }}>
                      {opt.label}
                    </div>
                    <div style={{ fontSize: 11, color: "rgba(255,255,255,0.35)", fontFamily: "'JetBrains Mono', monospace", marginTop: 1 }}>
                      {opt.desc}
                    </div>
                  </div>
                </button>
              );
            })}
          </div>
        </div>

        {/* Speech rate */}
        <div className="mb-4">
          <div className="text-xs text-slate-400 font-mono uppercase tracking-widest mb-2">Speech Rate</div>
          <Segmented
            options={RATE_OPTIONS}
            value={voicePrefs.rate}
            onChange={(v) => handleVoicePrefChange("rate", v)}
          />
        </div>

        {/* Volume */}
        <div>
          <div className="text-xs text-slate-400 font-mono uppercase tracking-widest mb-2">Volume</div>
          <Segmented
            options={VOLUME_OPTIONS}
            value={voicePrefs.volume}
            onChange={(v) => handleVoicePrefChange("volume", v)}
          />
        </div>
      </div>

      {/* System info */}
      <div className="glass-light rounded-xl p-4 sm:p-5 space-y-3 mb-3">
        <div className="mono-label">// System</div>
        {[
          ["Theme",    "Cyberpunk Dark"],
          ["AI Model", "Gemini 2.5 Flash"],
          ["Storage",  "MongoDB"],
          ["Build",    "OmniverseOS v1.0.0"],
        ].map(([k, v]) => (
          <div key={k} className="flex justify-between text-sm py-1">
            <span className="text-slate-400">{k}</span>
            <span className="font-mono text-[#00F0FF] truncate ml-4 text-right">{v}</span>
          </div>
        ))}
      </div>

      {/* Demo / Debug */}
      <div className="glass-light rounded-xl p-4 sm:p-5 mb-3">
        <div className="mono-label">// Demo</div>
        <h3 className="font-heading text-base font-bold mb-1">Intro Sequence</h3>
        <p className="text-xs text-slate-500 mb-3">
          Replay the JARVIS boot animation or the cinematic onboarding experience.
        </p>
        <div style={{ display: "flex", flexDirection: "column", gap: 8 }}>
          <button
            onClick={() => { resetBootFlag(); window.location.reload(); }}
            style={{
              width: "100%", padding: "10px 16px", borderRadius: 10,
              border: "1px solid rgba(0,240,255,0.25)",
              background: "rgba(0,240,255,0.06)",
              color: "#00F0FF", cursor: "pointer",
              fontFamily: "monospace", fontSize: 12,
              display: "flex", alignItems: "center", justifyContent: "center", gap: 8,
              transition: "all 0.18s",
            }}
            onMouseEnter={(e) => { e.currentTarget.style.background = "rgba(0,240,255,0.14)"; e.currentTarget.style.boxShadow = "0 0 18px rgba(0,240,255,0.15)"; }}
            onMouseLeave={(e) => { e.currentTarget.style.background = "rgba(0,240,255,0.06)"; e.currentTarget.style.boxShadow = "none"; }}
          >
            <i className="fa-solid fa-rotate-right" />
            Replay Boot + Voice Greeting
          </button>
          <button
            onClick={() => {
              resetOnboarding();
              window.dispatchEvent(new CustomEvent("omniverse:replay-onboarding"));
            }}
            style={{
              width: "100%", padding: "10px 16px", borderRadius: 10,
              border: "1px solid rgba(207,158,255,0.25)",
              background: "rgba(207,158,255,0.06)",
              color: "#CF9EFF", cursor: "pointer",
              fontFamily: "monospace", fontSize: 12,
              display: "flex", alignItems: "center", justifyContent: "center", gap: 8,
              transition: "all 0.18s",
            }}
            onMouseEnter={(e) => { e.currentTarget.style.background = "rgba(207,158,255,0.14)"; e.currentTarget.style.boxShadow = "0 0 18px rgba(207,158,255,0.15)"; }}
            onMouseLeave={(e) => { e.currentTarget.style.background = "rgba(207,158,255,0.06)"; e.currentTarget.style.boxShadow = "none"; }}
          >
            <i className="fa-solid fa-wand-magic-sparkles" />
            Replay Onboarding Experience
          </button>
        </div>
      </div>

      {/* Security — Change Password */}
      <ChangePasswordSection />

      <button onClick={logout} className="neon-btn danger w-full justify-center">
        <i className="fa-solid fa-right-from-bracket mr-2" />Logout
      </button>
    </div>
  );
}

/* ── Sound Settings section ────────────────────────────────────────────────── */
function SoundSettingsSection() {
  const [prefs, setPrefs] = useState(() => getAllSoundPrefs());

  const setMaster = useCallback((on) => {
    setSoundsEnabled(on);
    setPrefs((p) => ({ ...p, master: on }));
    if (on) setTimeout(() => playClick(), 80);
  }, []);

  const setCat = useCallback((cat, on) => {
    setSoundCategory(cat, on);
    setPrefs((p) => ({ ...p, [cat]: on }));
    // Play a preview of the toggled category after a short delay
    if (on) {
      setTimeout(() => {
        if (cat === "clicks")  playClick();
        if (cat === "notifs")  playNotification();
        if (cat === "startup") playBoot();
        if (cat === "ai")      playAIProcess();
        if (cat === "ambient") playAmbientTick();
      }, 100);
    }
  }, []);

  const CATEGORIES = [
    {
      key: "clicks",
      label: "UI Sounds",
      desc: "Clicks, window opens/closes, hover pings",
      icon: "fa-computer-mouse",
      color: "#00F0FF",
    },
    {
      key: "notifs",
      label: "Notifications",
      desc: "Alert chimes and error tones",
      icon: "fa-bell",
      color: "#A855F7",
    },
    {
      key: "startup",
      label: "Startup",
      desc: "JARVIS boot sequence sound",
      icon: "fa-power-off",
      color: "#39FF14",
    },
    {
      key: "ai",
      label: "AI Processing",
      desc: "Neural pulse when Cortex is thinking",
      icon: "fa-brain",
      color: "#CF9EFF",
    },
    {
      key: "ambient",
      label: "Ambient Ticks",
      desc: "Subtle system heartbeat in background",
      icon: "fa-wave-square",
      color: "#F59E0B",
    },
  ];

  return (
    <div className="glass-light rounded-xl p-4 sm:p-5 mb-3">
      <div className="mono-label">// System Sounds</div>
      <h3 className="font-heading text-base font-bold mb-1">Sound Engine</h3>
      <p className="text-xs text-slate-500 mb-4">
        Procedurally synthesized — no audio files. All sounds are generated in real-time by the Web Audio API.
      </p>

      {/* Master toggle */}
      <div
        style={{
          display: "flex", alignItems: "center", justifyContent: "space-between",
          padding: "12px 14px", borderRadius: 12, marginBottom: 12,
          background: prefs.master
            ? "linear-gradient(135deg, rgba(0,240,255,0.08), rgba(0,240,255,0.03))"
            : "rgba(255,255,255,0.03)",
          border: prefs.master
            ? "1px solid rgba(0,240,255,0.25)"
            : "1px solid rgba(255,255,255,0.08)",
          transition: "all 0.25s ease",
        }}
      >
        <div style={{ display: "flex", alignItems: "center", gap: 10 }}>
          <i
            className={`fa-solid ${prefs.master ? "fa-volume-high" : "fa-volume-xmark"}`}
            style={{
              color: prefs.master ? "#00F0FF" : "rgba(255,255,255,0.25)",
              fontSize: 16,
              filter: prefs.master ? "drop-shadow(0 0 6px rgba(0,240,255,0.7))" : "none",
              transition: "all 0.25s ease",
            }}
          />
          <div>
            <div style={{ fontSize: 14, fontWeight: 700, color: prefs.master ? "#fff" : "rgba(255,255,255,0.45)" }}>
              System Sounds
            </div>
            <div style={{ fontSize: 11, color: "rgba(255,255,255,0.35)", fontFamily: "'JetBrains Mono', monospace", marginTop: 1 }}>
              {prefs.master ? "All synthesized audio active" : "All audio disabled"}
            </div>
          </div>
        </div>
        <button
          onClick={() => setMaster(!prefs.master)}
          style={{
            width: 48, height: 28, borderRadius: 14, flexShrink: 0,
            background: prefs.master ? "#00F0FF" : "rgba(255,255,255,0.10)",
            border: "none", cursor: "pointer", position: "relative",
            transition: "background 0.25s ease",
            boxShadow: prefs.master ? "0 0 16px rgba(0,240,255,0.55)" : "none",
            WebkitTapHighlightColor: "transparent",
          }}
        >
          <div style={{
            position: "absolute",
            top: 4, left: prefs.master ? 23 : 4,
            width: 20, height: 20, borderRadius: "50%",
            background: "#fff",
            transition: "left 0.25s ease",
            boxShadow: "0 1px 4px rgba(0,0,0,0.3)",
          }} />
        </button>
      </div>

      {/* Per-category toggles */}
      {prefs.master && (
        <motion.div
          initial={{ opacity: 0, y: -6 }}
          animate={{ opacity: 1, y: 0 }}
          exit={{ opacity: 0, y: -6 }}
          transition={{ duration: 0.2 }}
          style={{
            borderRadius: 10,
            border: "1px solid rgba(255,255,255,0.07)",
            overflow: "hidden",
          }}
        >
          {CATEGORIES.map((cat, i) => (
            <div
              key={cat.key}
              style={{
                display: "flex", alignItems: "center", justifyContent: "space-between",
                padding: "11px 14px",
                borderBottom: i < CATEGORIES.length - 1 ? "1px solid rgba(255,255,255,0.05)" : "none",
                background: prefs[cat.key]
                  ? `linear-gradient(90deg, ${cat.color}06, transparent)`
                  : "transparent",
                transition: "background 0.2s ease",
              }}
            >
              <div style={{ display: "flex", alignItems: "center", gap: 10 }}>
                <i
                  className={`fa-solid ${cat.icon}`}
                  style={{
                    color: prefs[cat.key] ? cat.color : "rgba(255,255,255,0.20)",
                    fontSize: 13,
                    width: 16, textAlign: "center",
                    filter: prefs[cat.key] ? `drop-shadow(0 0 4px ${cat.color}80)` : "none",
                    transition: "all 0.2s ease",
                  }}
                />
                <div>
                  <div style={{
                    fontSize: 13, fontWeight: 600,
                    color: prefs[cat.key] ? "rgba(255,255,255,0.90)" : "rgba(255,255,255,0.35)",
                    transition: "color 0.2s ease",
                  }}>
                    {cat.label}
                  </div>
                  <div style={{ fontSize: 11, color: "rgba(255,255,255,0.28)", fontFamily: "'JetBrains Mono', monospace", marginTop: 1 }}>
                    {cat.desc}
                  </div>
                </div>
              </div>
              <button
                onClick={() => setCat(cat.key, !prefs[cat.key])}
                style={{
                  width: 40, height: 24, borderRadius: 12, flexShrink: 0,
                  background: prefs[cat.key] ? cat.color : "rgba(255,255,255,0.08)",
                  border: "none", cursor: "pointer", position: "relative",
                  transition: "background 0.22s ease",
                  boxShadow: prefs[cat.key] ? `0 0 10px ${cat.color}50` : "none",
                  WebkitTapHighlightColor: "transparent",
                }}
              >
                <div style={{
                  position: "absolute",
                  top: 3, left: prefs[cat.key] ? 19 : 3,
                  width: 18, height: 18, borderRadius: "50%",
                  background: "#fff",
                  transition: "left 0.22s ease",
                  boxShadow: "0 1px 3px rgba(0,0,0,0.3)",
                }} />
              </button>
            </div>
          ))}
        </motion.div>
      )}

      <p className="text-xs text-slate-600 mt-3">
        Toggling a category plays a preview. Sounds require a user interaction to initialize the audio context.
      </p>
    </div>
  );
}

function ChangePasswordSection() {
  const [open, setOpen] = useState(false);
  const [current, setCurrent] = useState("");
  const [next, setNext] = useState("");
  const [confirm, setConfirm] = useState("");
  const [busy, setBusy] = useState(false);

  const submit = async (e) => {
    e.preventDefault();
    if (next !== confirm) { toast.error("New passwords do not match"); return; }
    if (next.length < 4) { toast.error("Password must be at least 4 characters"); return; }
    setBusy(true);
    try {
      await authApi.changePassword(current, next);
      toast.success("Password changed successfully");
      setCurrent(""); setNext(""); setConfirm("");
      setOpen(false);
    } catch (err) {
      toast.error(err?.response?.data?.detail || "Failed to change password");
    } finally {
      setBusy(false);
    }
  };

  return (
    <div style={{ border: "1px solid rgba(255,255,255,0.06)", borderRadius: 12, padding: 16, marginBottom: 12 }}>
      <div className="flex items-center justify-between">
        <div>
          <div className="text-sm text-white font-medium">Security</div>
          <div className="text-xs text-slate-500 mt-0.5">Change your account password</div>
        </div>
        <button
          onClick={() => setOpen((o) => !o)}
          style={{
            padding: "5px 12px", borderRadius: 8, fontSize: 11, fontFamily: "monospace",
            border: "1px solid rgba(0,240,255,0.25)", background: "rgba(0,240,255,0.06)",
            color: "#00F0FF", cursor: "pointer", transition: "all 0.18s",
          }}
        >
          {open ? "Cancel" : "Change Password"}
        </button>
      </div>
      {open && (
        <form onSubmit={submit} className="mt-4 space-y-3">
          <div>
            <label className="mono-label block mb-1">Current Password</label>
            <input type="password" required value={current} onChange={(e) => setCurrent(e.target.value)} className="input-cyber" placeholder="••••••••" />
          </div>
          <div>
            <label className="mono-label block mb-1">New Password</label>
            <input type="password" required value={next} onChange={(e) => setNext(e.target.value)} className="input-cyber" placeholder="••••••••" minLength={4} />
          </div>
          <div>
            <label className="mono-label block mb-1">Confirm New Password</label>
            <input type="password" required value={confirm} onChange={(e) => setConfirm(e.target.value)} className="input-cyber" placeholder="••••••••" minLength={4} />
          </div>
          <button disabled={busy} type="submit" className="neon-btn primary w-full justify-center py-2.5">
            {busy ? "Updating…" : "Update Password"}
          </button>
        </form>
      )}
    </div>
  );
}
