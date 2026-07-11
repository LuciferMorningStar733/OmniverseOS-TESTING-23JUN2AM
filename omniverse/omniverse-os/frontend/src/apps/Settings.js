import React, { useState } from "react";
import { motion } from "framer-motion";
import { useOS } from "../context/OSContext";
import WallpaperStudio from "../components/WallpaperStudio";
import { useMobilePrefs, LOCK_TIMEOUT_OPTIONS } from "../hooks/useMobilePrefs";
import { useBreakpoint } from "../hooks/useBreakpoint";
import { getPreferredProvider, setPreferredProvider, getVoicePrefs, setVoicePrefs } from "../lib/api";

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
  { value: "google",  label: "Google Cloud TTS",  desc: "Premium neural voice — Journey female or male (default)" },
  { value: "browser", label: "Browser (local)",    desc: "Emergency fallback — uses your device's built-in voices" },
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
          Google Cloud TTS uses Journey neural voices for a natural, premium sound. Browser is the emergency fallback.
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

      <button onClick={logout} className="neon-btn danger w-full justify-center">
        <i className="fa-solid fa-right-from-bracket mr-2" />Logout
      </button>
    </div>
  );
}
