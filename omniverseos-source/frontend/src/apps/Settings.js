import React, { useState } from "react";
import { motion } from "framer-motion";
import { useOS } from "../context/OSContext";
import { WALLPAPERS } from "../lib/wallpapers";
import { useMobilePrefs, LOCK_TIMEOUT_OPTIONS } from "../hooks/useMobilePrefs";
import { useBreakpoint } from "../hooks/useBreakpoint";
import { getPreferredProvider, setPreferredProvider } from "../lib/api";

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
export default function Settings() {
  const { user, logout, wallpaper, setWallpaper } = useOS();
  const { prefs, setPref } = useMobilePrefs();
  const { isMobile } = useBreakpoint();
  const [preferredProvider, setPreferredProviderState] = useState(getPreferredProvider);

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

      {/* Wallpaper section */}
      <div className="glass-light rounded-xl p-4 sm:p-5 mb-3">
        <div className="flex items-baseline justify-between mb-3">
          <div>
            <div className="mono-label">// Wallpaper</div>
            <h3 className="font-heading text-base font-bold">Desktop background</h3>
          </div>
          <span className="text-[10px] font-mono text-slate-500 uppercase tracking-widest">
            {WALLPAPERS.length} scenes
          </span>
        </div>

        <div className="grid grid-cols-1 sm:grid-cols-2 gap-3" data-testid="wallpaper-grid">
          {WALLPAPERS.map((w) => {
            const active = wallpaper === w.id;
            return (
              <motion.button
                key={w.id}
                data-testid={`wallpaper-${w.id}`}
                onClick={() => setWallpaper(w.id)}
                whileHover={{ y: -3, scale: 1.015 }}
                whileTap={{ scale: 0.98 }}
                transition={{ type: "spring", stiffness: 320, damping: 20 }}
                className={`relative rounded-xl overflow-hidden text-left border transition-colors ${
                  active
                    ? "border-[#00F0FF] shadow-[0_0_0_3px_rgba(0,240,255,0.18),0_18px_40px_rgba(0,0,0,0.5)]"
                    : "border-white/10 hover:border-white/30"
                }`}
                style={{ aspectRatio: "16 / 10" }}
              >
                <div className={`absolute inset-0 ${w.className}`}>
                  <div
                    className="wp-typo"
                    style={{
                      fontSize: "clamp(18px, 3vw, 32px)",
                      WebkitTextStroke: "0.7px rgba(0,240,255,0.5)",
                      textShadow: "0 0 10px rgba(0,240,255,0.25)",
                    }}
                  >
                    {w.typo.main}
                    {w.typo.line2 && (
                      <span style={{ WebkitTextStroke: "0.7px rgba(255,0,60,0.65)" }}>
                        {w.typo.line2}
                      </span>
                    )}
                  </div>
                </div>

                <div className="absolute inset-x-0 bottom-0 px-3 py-2 bg-gradient-to-t from-black/90 via-black/55 to-transparent">
                  <div className="text-xs font-semibold text-white">{w.name}</div>
                  <div className="text-[9px] font-mono uppercase tracking-widest text-slate-400">{w.id}</div>
                </div>

                {active && (
                  <motion.div
                    initial={{ scale: 0, opacity: 0 }}
                    animate={{ scale: 1, opacity: 1 }}
                    transition={{ type: "spring", stiffness: 380, damping: 18 }}
                    className="absolute top-2 right-2 w-6 h-6 rounded-full bg-[#00F0FF] text-black flex items-center justify-center text-[11px] shadow-[0_0_14px_rgba(0,240,255,0.7)]"
                  >
                    <i className="fa-solid fa-check" />
                  </motion.div>
                )}
              </motion.button>
            );
          })}
        </div>
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
