import React, { useCallback, useEffect, useRef, useState } from "react";
import { aiApi, memoryApi } from "../lib/api";
import {
  browserSpeak,
  cancelSpeech,
  getAvailableVoices,
  loadVoices,
  getPreferredVoiceName,
  savePreferredVoiceName,
  getBestVoice,
  isBrowserTTSSupported,
} from "../lib/browserTTS";
import {
  streamSpeak,
  isStreamTTSAvailable,
  STREAM_VOICES,
  DEFAULT_STREAM_VOICE,
  getStreamVoiceId,
  saveStreamVoiceId,
} from "../lib/streamTTS";
import { parseActions, executeActions } from "../lib/cortexActions";
import { useOS } from "../context/OSContext";
import { toast } from "sonner";
import { normalizeTranscript } from "../lib/speechCorrection.js";
import VoiceWaveform from "../components/VoiceWaveform";

// ── Inline OS context builder ─────────────────────────────────────────────
function buildVoiceContextPrompt(windows, activeId) {
  const now = new Date();
  const timeStr = now.toLocaleTimeString("en-US", { hour: "numeric", minute: "2-digit", hour12: true });
  const dateStr = now.toLocaleDateString("en-US", { weekday: "long", month: "long", day: "numeric" });

  const userLocation = (() => {
    try { const raw = localStorage.getItem("cortex_user_location"); return raw ? JSON.parse(raw) : null; }
    catch { return null; }
  })();

  const openWindows = windows || [];
  const activeWindow = openWindows.find(w => w.id === activeId);
  const openAppIds = [...new Set(openWindows.map(w => w.app).filter(Boolean))];

  let prompt = "You are OmniverseOS Cortex — a friendly, witty cyberpunk AI assistant living inside an operating system.\n\n";
  prompt += `Current time: ${timeStr}, ${dateStr}\n`;
  if (userLocation?.city) {
    const loc = [userLocation.city, userLocation.region, userLocation.country].filter(Boolean).join(", ");
    prompt += `User location: ${loc}\n`;
    prompt += `Always tailor answers to this region (prices, availability, local brands, variants) unless the user specifies otherwise.\n`;
  }
  prompt += "\n=== CURRENT OS STATE ===\n";
  if (activeWindow?.app) prompt += `Active app: ${activeWindow.app}\n`;
  if (openAppIds.length > 0) {
    prompt += `Open apps (${openWindows.length}): ${openAppIds.join(", ")}\n`;
  } else {
    prompt += "No apps currently open.\n";
  }
  return prompt;
}

// ── Constants ──────────────────────────────────────────────────────────────
const VOICE_SESSION_KEY  = "cortex_voice_history";
const VOICE_SETTINGS_KEY = "cortex_voice_settings_v2";
const MAX_HISTORY_PAIRS  = 15;
const SILENCE_TIMEOUT_MS = 2400; // continuous=true: stop after 2.4s silence

function getDefaultVoiceSettings() {
  return {
    continuousConversation: true,
    conversationTimeout: "never",
    autoResumeListen: true,
    wakeWordEnabled: false,
    bargeIn: false,
    voiceFeedback: true,
    preferredVoiceName: null,
    rate: 1.0,
    pitch: 1.0,
    volume: 1.0,
    autoSelectBestVoice: true,
    voiceEngine: "stream",
    streamVoiceId: DEFAULT_STREAM_VOICE,
  };
}

const TIMEOUT_OPTIONS = [
  { value: "never", label: "Never"  },
  { value: "5",     label: "5 min"  },
  { value: "15",    label: "15 min" },
  { value: "30",    label: "30 min" },
  { value: "60",    label: "1 hour" },
];

// ── Session storage helpers ───────────────────────────────────────────────
function loadVoiceHistory() {
  try {
    const raw = localStorage.getItem(VOICE_SESSION_KEY);
    if (!raw) return [];
    const parsed = JSON.parse(raw);
    return Array.isArray(parsed) ? parsed : [];
  } catch { return []; }
}

function saveVoiceHistory(history) {
  try { localStorage.setItem(VOICE_SESSION_KEY, JSON.stringify(history)); } catch {}
}

function loadSettings() {
  try {
    const raw = localStorage.getItem(VOICE_SETTINGS_KEY);
    if (!raw) return getDefaultVoiceSettings();
    return { ...getDefaultVoiceSettings(), ...JSON.parse(raw) };
  } catch { return getDefaultVoiceSettings(); }
}

function saveSettings(s) {
  try { localStorage.setItem(VOICE_SETTINGS_KEY, JSON.stringify(s)); } catch {}
}

// ── Markdown stripper ─────────────────────────────────────────────────────
function stripMarkdown(text) {
  if (!text) return "";
  return text
    .replace(/```[\s\S]*?```/g, "")
    .replace(/`([^`]+)`/g, "$1")
    .replace(/\*\*(.+?)\*\*/g, "$1")
    .replace(/__(.+?)__/g, "$1")
    .replace(/\*(.+?)\*/g, "$1")
    .replace(/_(.+?)_/g, "$1")
    .replace(/^#{1,6}\s+/gm, "")
    .replace(/^[=-]{2,}$/gm, "")
    .replace(/^[\s]*[-*+]\s+/gm, "")
    .replace(/^[\s]*\d+\.\s+/gm, "")
    .replace(/^[-*_]{3,}\s*$/gm, "")
    .replace(/\[([^\]]+)\]\([^)]+\)/g, "$1")
    .replace(/\[([^\]]+)\]/g, "$1")
    .replace(/<[^>]+>/g, "")
    .replace(/([A-Za-z0-9][^.!?:\n]*?):\s*\n/g, "$1. ")
    .replace(/\n{2,}/g, ". ")
    .replace(/\n/g, " ")
    .replace(/\s{2,}/g, " ")
    .replace(/([*_]){1,2}/g, "")
    .trim();
}

// ── Emotion detector ──────────────────────────────────────────────────────
const EMOTION_PATTERNS = {
  greeting:    /\b(hello|hi|hey|good morning|good evening|welcome|greetings)\b/i,
  excited:     /[!]{2,}|\b(amazing|incredible|fantastic|wow|awesome|brilliant|extraordinary|spectacular)\b/i,
  happy:       /\b(great|wonderful|excellent|perfect|glad|happy|joy|delighted|pleased|thrilled)\b/i,
  thinking:    /\b(let me think|processing|analyzing|considering|hmm|interesting|actually|well|so|calculating)\b/i,
  question:    /\?{1,}$/m,
  warning:     /\b(careful|warning|caution|danger|important|critical|alert|note that|be aware|watch out)\b/i,
  serious:     /\b(unfortunately|however|issue|problem|error|failed|cannot|unable|denied|restricted|sorry)\b/i,
  celebration: /\b(congratulations|success|achieved|done|complete|finished|excellent work|well done|celebrate)\b/i,
  sad:         /\b(sad|unfortunate|regret|apologies|sorry to hear|that's tough|difficult|hard time)\b/i,
};

function detectEmotion(text) {
  if (!text || text.length < 5) return "neutral";
  for (const [emotion, pattern] of Object.entries(EMOTION_PATTERNS)) {
    if (pattern.test(text)) return emotion;
  }
  return "neutral";
}

// ── Reset phrases ─────────────────────────────────────────────────────────
const RESET_PHRASES = [
  /\bstart new conversation\b/i,
  /\bforget this conversation\b/i,
  /\bnew chat\b/i,
  /\bclear conversation\b/i,
  /\breset conversation\b/i,
  /\bstart over\b/i,
];

function isResetPhrase(text) {
  return RESET_PHRASES.some((p) => p.test(text));
}

// ── Dynamic greeting ──────────────────────────────────────────────────────
function getContextGreeting(conversation, userName) {
  const h = new Date().getHours();
  const name = userName ? `, ${userName.split(" ")[0]}` : "";

  if (conversation.length > 0) {
    const pool = [
      "Welcome back.",
      "I've restored your session.",
      "Ready to continue.",
      "Awaiting your command.",
      `Welcome back${name}.`,
      "Picking up where we left off.",
    ];
    return pool[Math.floor(Math.random() * pool.length)];
  }

  const timePool =
    h < 5  ? ["Still awake, I see.", "Late night session.", "The night is young."] :
    h < 12 ? [`Good morning${name}.`, "Systems online.", "Ready for the day.", "What are we building today?"] :
    h < 17 ? [`Good afternoon${name}.`, "Awaiting your command.", "What would you like to explore?"] :
             [`Good evening${name}.`, "Systems operational.", "Ready when you are.", "I've been expecting you."];

  return timePool[Math.floor(Math.random() * timePool.length)];
}

// ── Premium phase labels (Cortex identity) ────────────────────────────────
const PHASE_LABELS = {
  idle:      "Standing By",
  listening: "Listening",
  thinking:  "Processing",
  speaking:  "Generating Response",
  muted:     "Offline",
};

const PHASE_COLORS = {
  idle:      "#4A9EFF",
  listening: "#00E5FF",
  thinking:  "#A78BFA",
  speaking:  "#4A9EFF",
  muted:     "#475569",
};

// ── Rotating thinking messages ─────────────────────────────────────────────
const THINKING_MSGS = [
  "Processing",
  "Understanding",
  "Searching Memory",
  "Analyzing Context",
  "Synthesizing",
  "Formulating",
  "Cross-referencing",
];

// ── CSS keyframes string ──────────────────────────────────────────────────
const CORTEX_KEYFRAMES = `
  @keyframes cortexBreathe {
    0%, 100% { transform: scale(1);    opacity: 0.85; }
    50%       { transform: scale(1.04); opacity: 1;    }
  }
  @keyframes cortexListen {
    0%, 100% { transform: scale(1);    box-shadow: 0 0 0 0 rgba(0,229,255,0); }
    50%       { transform: scale(1.06); box-shadow: 0 0 0 18px rgba(0,229,255,0); }
  }
  @keyframes cortexPulseRing {
    0%   { transform: scale(0.92); opacity: 0.8; }
    100% { transform: scale(1.18); opacity: 0;   }
  }
  @keyframes cortexSpin {
    from { transform: rotate(0deg);   }
    to   { transform: rotate(360deg); }
  }
  @keyframes cortexSpinR {
    from { transform: rotate(0deg);    }
    to   { transform: rotate(-360deg); }
  }
  @keyframes cortexWave {
    0%, 100% { transform: scaleY(0.3);  }
    50%       { transform: scaleY(1.0);  }
  }
  @keyframes cortexFadeUp {
    from { opacity: 0; transform: translateY(10px); }
    to   { opacity: 1; transform: translateY(0);    }
  }
  @keyframes cortexStatusDot {
    0%, 100% { opacity: 1; }
    50%       { opacity: 0.3; }
  }
  @keyframes cortexGlowPulse {
    0%, 100% { opacity: 0.4; }
    50%       { opacity: 0.9; }
  }
  @keyframes wakeFlash {
    0%, 100% { opacity: 0; }
    50%       { opacity: 1; }
  }
  @keyframes orbPulse {
    0%, 100% { transform: scale(1);    opacity: 1;    }
    50%       { transform: scale(1.06); opacity: 0.85; }
  }
  @keyframes cortexCountdown {
    from { stroke-dashoffset: 0;   }
    to   { stroke-dashoffset: 534; }
  }
`;

// ── AI Core Orb — single interactive element ──────────────────────────────
// audioLevels: float[7] in 0–1 from the Web Audio AnalyserNode.
// Falls back to CSS keyframe animation when undefined/empty.
function AICoreOrb({ phase, onClick, onTouchStart, onTouchEnd, audioLevels, silenceKey }) {
  const isListening = phase === "listening";
  const isSpeaking  = phase === "speaking";
  const isThinking  = phase === "thinking";
  const isIdle      = phase === "idle";
  const isMuted     = phase === "muted";

  const coreColors = {
    idle:      { primary: "#4A9EFF", secondary: "#1E3A6E", glow: "rgba(74,158,255,0.35)"  },
    listening: { primary: "#00E5FF", secondary: "#003D4D", glow: "rgba(0,229,255,0.45)"   },
    thinking:  { primary: "#A78BFA", secondary: "#2D1B69", glow: "rgba(167,139,250,0.40)" },
    speaking:  { primary: "#4A9EFF", secondary: "#1A2F5E", glow: "rgba(74,158,255,0.40)"  },
    muted:     { primary: "#475569", secondary: "#1E2530", glow: "rgba(71,85,105,0.20)"   },
  };
  const c = coreColors[phase] || coreColors.idle;

  const orbAnimation = isListening
    ? "cortexListen 1.2s ease-in-out infinite"
    : isSpeaking
    ? "cortexBreathe 0.8s ease-in-out infinite"
    : isThinking
    ? "none"
    : isIdle
    ? "cortexBreathe 3.5s ease-in-out infinite"
    : "none";

  return (
    <button
      onClick={onClick}
      onTouchStart={onTouchStart}
      onTouchEnd={onTouchEnd}
      style={{
        position: "relative",
        width: 180,
        height: 180,
        background: "none",
        border: "none",
        cursor: "pointer",
        display: "flex",
        alignItems: "center",
        justifyContent: "center",
        WebkitTapHighlightColor: "transparent",
        outline: "none",
        flexShrink: 0,
      }}
      aria-label={PHASE_LABELS[phase]}
      title={PHASE_LABELS[phase]}
    >
      {/* Outermost ambient glow */}
      <div style={{
        position: "absolute",
        width: 180, height: 180,
        borderRadius: "50%",
        background: `radial-gradient(circle, ${c.glow} 0%, transparent 70%)`,
        animation: (isListening || isSpeaking) ? "cortexGlowPulse 1.5s ease-in-out infinite" : "none",
        pointerEvents: "none",
      }} />

      {/* Silence countdown ring — thin arc draining over 2.4s, resets on every result */}
      {isListening && (
        <svg
          key={silenceKey}
          style={{
            position: "absolute",
            width: 180, height: 180,
            top: 0, left: 0,
            pointerEvents: "none",
            transform: "rotate(-90deg)", // arc starts at 12 o'clock
            overflow: "visible",
          }}
        >
          {/* Track — faint full circle */}
          <circle cx={90} cy={90} r={85} fill="none"
            stroke={`${c.primary}18`} strokeWidth={2.5} />
          {/* Draining arc — 2 * π * 85 ≈ 534 */}
          <circle cx={90} cy={90} r={85} fill="none"
            stroke={c.primary} strokeWidth={2.5} strokeLinecap="round"
            strokeDasharray={534} strokeDashoffset={0}
            style={{ animation: `cortexCountdown ${SILENCE_TIMEOUT_MS / 1000}s linear forwards`, opacity: 0.7 }}
          />
        </svg>
      )}

      {/* Outer ring — spins while thinking */}
      <div style={{
        position: "absolute",
        width: 158, height: 158,
        borderRadius: "50%",
        border: isThinking
          ? `1.5px solid ${c.primary}55`
          : isListening
          ? `1px solid ${c.primary}40`
          : `1px solid ${c.primary}25`,
        animation: isThinking ? "cortexSpin 3s linear infinite" : "none",
        pointerEvents: "none",
      }} />

      {/* Second ring — counter-spins while thinking */}
      {isThinking && (
        <div style={{
          position: "absolute",
          width: 140, height: 140,
          borderRadius: "50%",
          border: `1px dashed ${c.primary}35`,
          animation: "cortexSpinR 5s linear infinite",
          pointerEvents: "none",
        }} />
      )}

      {/* Pulse ring — expands while listening/speaking */}
      {(isListening || isSpeaking) && (
        <div style={{
          position: "absolute",
          width: 130, height: 130,
          borderRadius: "50%",
          border: `1.5px solid ${c.primary}`,
          animation: "cortexPulseRing 1.4s ease-out infinite",
          pointerEvents: "none",
        }} />
      )}

      {/* Core body */}
      <div style={{
        position: "relative",
        width: 120, height: 120,
        borderRadius: "50%",
        background: `radial-gradient(circle at 38% 34%, ${c.primary}18 0%, ${c.secondary}80 55%, #05050Acc 100%)`,
        border: `1.5px solid ${c.primary}50`,
        boxShadow: `0 0 40px ${c.glow}, inset 0 1px 0 ${c.primary}20`,
        display: "flex",
        alignItems: "center",
        justifyContent: "center",
        animation: orbAnimation,
        transition: "border-color 0.4s ease, box-shadow 0.4s ease",
        backdropFilter: "blur(4px)",
      }}>

        {/* Inner glow */}
        <div style={{
          position: "absolute",
          width: 60, height: 60,
          borderRadius: "50%",
          background: `radial-gradient(circle, ${c.primary}22 0%, transparent 70%)`,
          pointerEvents: "none",
        }} />

        {/* Icon */}
        <div style={{ position: "relative", zIndex: 1 }}>
          {isThinking ? (
            <div style={{
              width: 28, height: 28,
              border: `2px solid ${c.primary}`,
              borderTopColor: "transparent",
              borderRadius: "50%",
              animation: "cortexSpin 0.8s linear infinite",
            }} />
          ) : isListening ? (
            /* Waveform bars — live mic levels when available, CSS fallback otherwise */
            (() => {
              const FALLBACK = [0.5, 0.85, 1, 0.7, 0.9, 0.6, 0.8];
              const levels   = audioLevels && audioLevels.length === 7 ? audioLevels : null;
              const hasLive  = levels && levels.some(l => l > 0.15);
              return (
                <div style={{ display: "flex", alignItems: "center", gap: 3, height: 28 }}>
                  {FALLBACK.map((fallH, i) => {
                    const barH = hasLive
                      ? Math.max(4, Math.round(levels[i] * 26))
                      : Math.round(fallH * 26);
                    return (
                      <div key={i} style={{
                        width: 3,
                        borderRadius: 2,
                        backgroundColor: c.primary,
                        height: `${barH}px`,
                        // Live: smooth hardware-interpolated transition. Fallback: CSS keyframe.
                        transition: hasLive ? "height 55ms linear" : "none",
                        animation: hasLive
                          ? "none"
                          : `cortexWave 0.6s ease-in-out ${(i * 0.09).toFixed(2)}s infinite alternate`,
                        boxShadow: `0 0 ${hasLive ? Math.round(levels?.[i] * 10 + 3) : 6}px ${c.primary}80`,
                        willChange: "height",
                      }} />
                    );
                  })}
                </div>
              );
            })()
          ) : isSpeaking ? (
            /* Speaking waveform — faster */
            <div style={{ display: "flex", alignItems: "center", gap: 3, height: 28 }}>
              {[0.6, 0.95, 0.75, 1, 0.65, 0.9, 0.5].map((h, i) => (
                <div key={i} style={{
                  width: 3,
                  borderRadius: 2,
                  backgroundColor: c.primary,
                  height: `${Math.round(h * 24)}px`,
                  animation: `cortexWave 0.45s ease-in-out ${(i * 0.07).toFixed(2)}s infinite alternate`,
                  boxShadow: `0 0 6px ${c.primary}80`,
                }} />
              ))}
            </div>
          ) : isMuted ? (
            <i className="fa-solid fa-microphone-slash" style={{ fontSize: 22, color: c.primary, opacity: 0.6 }} />
          ) : (
            /* Idle — subtle mic icon */
            <i className="fa-solid fa-microphone" style={{
              fontSize: 22,
              color: c.primary,
              filter: `drop-shadow(0 0 8px ${c.primary})`,
            }} />
          )}
        </div>
      </div>
    </button>
  );
}

// ── Status indicator ──────────────────────────────────────────────────────
function StatusBadge({ phase, thinkingMsg }) {
  const c = PHASE_COLORS[phase] || PHASE_COLORS.idle;
  const label = phase === "thinking" ? thinkingMsg : PHASE_LABELS[phase];
  const pulseDot = phase === "listening" || phase === "speaking";

  return (
    <div style={{
      display: "flex",
      alignItems: "center",
      gap: 8,
      padding: "6px 14px",
      borderRadius: 20,
      background: `${c}10`,
      border: `1px solid ${c}30`,
      animation: "cortexFadeUp 0.25s ease",
    }}>
      <div style={{
        width: 6, height: 6,
        borderRadius: "50%",
        backgroundColor: c,
        boxShadow: `0 0 8px ${c}`,
        animation: pulseDot ? "cortexStatusDot 1.1s ease-in-out infinite" : "none",
        flexShrink: 0,
      }} />
      <span style={{
        fontSize: 11,
        fontFamily: "'JetBrains Mono', monospace",
        letterSpacing: "0.12em",
        textTransform: "uppercase",
        color: c,
        fontWeight: 600,
      }}>
        {label}
      </span>
    </div>
  );
}

// ── Toggle ────────────────────────────────────────────────────────────────
function Toggle({ value, onChange, disabled, ariaLabel }) {
  return (
    <button
      onClick={() => !disabled && onChange(!value)}
      disabled={disabled}
      aria-label={ariaLabel}
      aria-pressed={value}
      style={{
        width: 44, height: 26, borderRadius: 13, flexShrink: 0,
        background: value ? "#4A9EFF" : "rgba(255,255,255,0.10)",
        border: "none", cursor: disabled ? "not-allowed" : "pointer",
        position: "relative", transition: "background 0.22s ease",
        boxShadow: value ? "0 0 12px rgba(74,158,255,0.4)" : "none",
        opacity: disabled ? 0.4 : 1,
        WebkitTapHighlightColor: "transparent",
      }}
    >
      <div style={{
        position: "absolute", top: 3, left: value ? 21 : 3,
        width: 20, height: 20, borderRadius: "50%",
        background: "#fff", transition: "left 0.22s ease",
        boxShadow: "0 1px 4px rgba(0,0,0,0.3)",
      }} />
    </button>
  );
}

function SettingRow({ label, desc, children }) {
  return (
    <div
      className="flex items-center justify-between py-2.5"
      style={{ borderBottom: "1px solid rgba(255,255,255,0.05)" }}
    >
      <div style={{ flex: 1, paddingRight: 12 }}>
        <div className="text-sm text-white font-medium">{label}</div>
        {desc && <div className="text-xs text-slate-500 mt-0.5">{desc}</div>}
      </div>
      {children}
    </div>
  );
}

// ── Segmented control ─────────────────────────────────────────────────────
function Segmented({ options, value, onChange }) {
  return (
    <div style={{ display: "flex", flexWrap: "wrap", gap: 6, marginTop: 8 }}>
      {options.map((opt) => (
        <button
          key={opt.value}
          onClick={() => onChange(opt.value)}
          style={{
            padding: "5px 11px", borderRadius: 8,
            fontSize: 11, fontFamily: "'JetBrains Mono', monospace",
            border: value === opt.value
              ? "1px solid rgba(74,158,255,0.6)"
              : "1px solid rgba(255,255,255,0.08)",
            background: value === opt.value
              ? "rgba(74,158,255,0.12)" : "rgba(255,255,255,0.03)",
            color: value === opt.value ? "#4A9EFF" : "rgba(255,255,255,0.45)",
            cursor: "pointer", transition: "all 0.15s ease",
            WebkitTapHighlightColor: "transparent",
          }}
        >
          {opt.label}
        </button>
      ))}
    </div>
  );
}

// ── Quality badge ─────────────────────────────────────────────────────────
function QualityBadge({ quality }) {
  const map = {
    Neural:   { bg: "rgba(74,158,255,0.12)",  border: "rgba(74,158,255,0.35)",  color: "#4A9EFF"  },
    Enhanced: { bg: "rgba(57,255,20,0.10)",   border: "rgba(57,255,20,0.30)",   color: "#39FF14"  },
    Standard: { bg: "rgba(255,255,255,0.06)", border: "rgba(255,255,255,0.15)", color: "rgba(255,255,255,0.55)" },
    Basic:    { bg: "rgba(255,160,0,0.08)",   border: "rgba(255,160,0,0.25)",   color: "#FFA000"  },
  };
  const s = map[quality] || map.Standard;
  return (
    <span style={{
      fontSize: 8, fontFamily: "monospace", fontWeight: 700,
      padding: "1px 5px", borderRadius: 3,
      background: s.bg, border: `1px solid ${s.border}`, color: s.color,
      letterSpacing: "0.06em",
    }}>
      {quality?.toUpperCase()}
    </span>
  );
}

// ── Section header ────────────────────────────────────────────────────────
function SectionHeader({ label }) {
  return (
    <div style={{
      fontFamily: "'JetBrains Mono', monospace",
      fontSize: 9, letterSpacing: "0.18em", textTransform: "uppercase",
      color: "rgba(74,158,255,0.55)", marginBottom: 12, fontWeight: 600,
    }}>
      {label}
    </div>
  );
}

// ── Card wrapper ──────────────────────────────────────────────────────────
function Card({ children, style }) {
  return (
    <div style={{
      borderRadius: 16,
      background: "rgba(255,255,255,0.025)",
      border: "1px solid rgba(255,255,255,0.06)",
      padding: 16,
      marginBottom: 12,
      ...style,
    }}>
      {children}
    </div>
  );
}

// ── Main component ────────────────────────────────────────────────────────
export default function Voice() {
  const [phase, setPhase]                       = useState("idle");
  const [transcript, setTranscript]             = useState("");
  const [interimText, setInterimText]           = useState("");
  const [conversation, setConversation]         = useState(loadVoiceHistory);
  const [settings, setSettings]                 = useState(loadSettings);
  const [activeView, setActiveView]             = useState("voice");
  const [availableVoices, setAvailableVoices]   = useState([]);
  const [previewingVoice, setPreviewingVoice]   = useState(null);
  const [voiceError, setVoiceError]             = useState(null);
  const [detectedEmotion, setDetectedEmotion]   = useState("neutral");
  const [sessionTurnCount, setSessionTurnCount] = useState(0);
  const [lastActivityTime, setLastActivityTime] = useState(Date.now());
  const [wakeWordActive, setWakeWordActive]      = useState(false);
  const [historyBadge, setHistoryBadge]         = useState(0);
  const [isAtBottom, setIsAtBottom]             = useState(true);
  const [isLivePreviewing, setIsLivePreviewing] = useState(false);
  const [thinkingMsg, setThinkingMsg]           = useState("Processing");
  const [greeting, setGreeting]                 = useState("");
  // Live mic levels from the Web Audio AnalyserNode (7 floats, 0–1 each)
  const [audioLevels, setAudioLevels]           = useState(() => new Array(7).fill(0));
  const [silenceKey, setSilenceKey]             = useState(0);

  const { openApp, windows, activeId } = useOS();

  const mountedRef          = useRef(true);
  const historyScrollRef    = useRef(null);
  const previewTimerRef     = useRef(null);
  const startedRef          = useRef(false);
  const recogRef            = useRef(null);
  const transcriptRef       = useRef("");
  const finalizedUntilRef   = useRef(0);
  const abortRef            = useRef(null);
  const cancelSpeechRef     = useRef(null);
  const orbSwipeTouchY      = useRef(null);
  const conversationRef     = useRef([]);
  const settingsRef         = useRef(settings);
  const autoListenTimerRef  = useRef(null);
  const timeoutTimerRef     = useRef(null);
  // Barge-in detector refs
  const bargeInRecogRef     = useRef(null);
  const bargeInActiveRef    = useRef(false);
  const bargeTranscriptRef  = useRef("");
  const wakeRecogRef        = useRef(null);
  const phaseRef            = useRef("idle");
  const startListeningRef   = useRef(null);
  const windowsRef          = useRef(windows);
  const activeIdRef         = useRef(activeId);
  const sessionClearedRef   = useRef(false);
  const silenceTimerRef     = useRef(null);
  // Waveform animation refs (simulated — no getUserMedia conflict with SpeechRecognition)
  const animFrameRef        = useRef(null);
  const smoothedLevelsRef   = useRef(new Array(7).fill(0));
  // true when the recognition was stopped deliberately (silence timer / user tap / error).
  // false = browser ended it unexpectedly (Android Chrome fires onend even with continuous=true).
  const intentionalStopRef  = useRef(false);
  // Monotonically identifies the active TTS request. Browser speech can emit
  // late onerror/onend callbacks after cancel(), and those callbacks must not
  // end a newer response or restart listening at the wrong time.
  const speechGenerationRef = useRef(0);
  // Unlock AudioContext on first tap so TTS works on Android Chrome.
  const audioUnlockedRef    = useRef(false);

  // Keep refs in sync
  useEffect(() => { conversationRef.current = conversation; }, [conversation]);
  useEffect(() => { settingsRef.current = settings; }, [settings]);
  useEffect(() => { phaseRef.current = phase; }, [phase]);
  useEffect(() => { windowsRef.current = windows; }, [windows]);
  useEffect(() => { activeIdRef.current = activeId; }, [activeId]);

  // Build greeting on mount + when conversation changes
  useEffect(() => {
    const user = (() => {
      try { const u = JSON.parse(localStorage.getItem("cortex_user") || "{}"); return u?.name || null; }
      catch { return null; }
    })();
    setGreeting(getContextGreeting(conversation, user));
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  // Rotate thinking messages
  useEffect(() => {
    if (phase !== "thinking") { setThinkingMsg("Processing"); return; }
    let i = 0;
    const id = setInterval(() => {
      i = (i + 1) % THINKING_MSGS.length;
      setThinkingMsg(THINKING_MSGS[i]);
    }, 1200);
    return () => clearInterval(id);
  }, [phase]);

  // Auto-scroll history
  useEffect(() => {
    const el = historyScrollRef.current;
    if (!el || activeView !== "history") return;
    const distFromBottom = el.scrollHeight - el.scrollTop - el.clientHeight;
    if (distFromBottom < 120) el.scrollTo({ top: el.scrollHeight, behavior: "smooth" });
  }, [conversation, activeView]);

  useEffect(() => {
    if (activeView === "history") setHistoryBadge(0);
  }, [activeView]);

  const handleHistoryScroll = useCallback(() => {
    const el = historyScrollRef.current;
    if (!el) return;
    const distFromBottom = el.scrollHeight - el.scrollTop - el.clientHeight;
    setIsAtBottom(distFromBottom < 80);
  }, []);

  // Load browser voices
  useEffect(() => {
    mountedRef.current = true;

    loadVoices().then(() => {
      if (!mountedRef.current) return;
      const voices = getAvailableVoices();
      setAvailableVoices(voices);
      if (settings.autoSelectBestVoice && !settings.preferredVoiceName) {
        const best = getBestVoice();
        if (best) {
          savePreferredVoiceName(best.name);
          updateSettings({ preferredVoiceName: best.name });
        }
      }
    });

    const onChanged = () => {
      if (!mountedRef.current) return;
      setAvailableVoices(getAvailableVoices());
    };
    window.speechSynthesis?.addEventListener("voiceschanged", onChanged);

    const localLenAtMount = conversationRef.current.length;
    aiApi.history("main").then((msgs) => {
      if (!mountedRef.current || !Array.isArray(msgs) || msgs.length === 0) return;
      if (startedRef.current || phaseRef.current !== "idle" || sessionClearedRef.current) return;
      const voiceHistory = msgs
        .filter((m) => m.content && !m.pending && !m.error)
        .slice(-MAX_HISTORY_PAIRS * 2)
        .map((m) => ({ role: m.role, content: String(m.content) }));
      if (voiceHistory.length > localLenAtMount && conversationRef.current.length === localLenAtMount) {
        setConversation(voiceHistory);
        conversationRef.current = voiceHistory;
        saveVoiceHistory(voiceHistory);
      }
    }).catch(() => {});

    return () => {
      mountedRef.current = false;
      speechGenerationRef.current += 1;
      window.speechSynthesis?.removeEventListener("voiceschanged", onChanged);
      clearTimeout(autoListenTimerRef.current);
      clearTimeout(timeoutTimerRef.current);
      clearTimeout(silenceTimerRef.current);
      cancelSpeechRef.current?.();
      abortRef.current?.abort();
      stopBargeInDetector();
      stopWakeWord();
      // Clean up waveform animation
      cancelAnimationFrame(animFrameRef.current);
    };
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  const resetConversation = useCallback((silent = false) => {
    sessionClearedRef.current = true;
    setConversation([]);
    saveVoiceHistory([]);
    setSessionTurnCount(0);
    setTranscript("");
    setInterimText("");
    setDetectedEmotion("neutral");
    if (!silent) {
      toast.success("Conversation cleared", { duration: 2000, style: { fontSize: 12 } });
    }
  }, []);

  // Conversation timeout
  useEffect(() => {
    clearTimeout(timeoutTimerRef.current);
    const mins = parseInt(settings.conversationTimeout, 10);
    if (!mins || isNaN(mins)) return;
    timeoutTimerRef.current = setTimeout(() => {
      if (!mountedRef.current) return;
      resetConversation(true);
      toast("Session timed out — starting fresh", { duration: 3000, style: { fontSize: 12 } });
    }, mins * 60 * 1000);
    return () => clearTimeout(timeoutTimerRef.current);
  }, [lastActivityTime, settings.conversationTimeout, resetConversation]);

  // Settings helpers
  const updateSettings = useCallback((patch) => {
    setSettings((prev) => {
      const next = { ...prev, ...patch };
      saveSettings(next);
      return next;
    });
  }, []);

  // Live preview
  const triggerLivePreview = useCallback((patch) => {
    clearTimeout(previewTimerRef.current);
    previewTimerRef.current = setTimeout(() => {
      cancelSpeechRef.current?.();
      cancelSpeechRef.current = null;
      window.speechSynthesis?.cancel();

      const merged = { ...settingsRef.current, ...patch };
      const phrase = "Testing — this is Cortex speaking.";
      const done = () => { if (mountedRef.current) setIsLivePreviewing(false); };
      setIsLivePreviewing(true);

      if (merged.voiceEngine !== "browser" && isStreamTTSAvailable()) {
        const cancel = streamSpeak(phrase, {
          voiceId: merged.streamVoiceId || getStreamVoiceId(),
          rate: merged.rate || 1.0, volume: merged.volume ?? 1.0,
          onEnd: done,
          onError: () => {
            if (!isBrowserTTSSupported()) { done(); return; }
            cancelSpeechRef.current = browserSpeak(phrase, {
              rate: merged.rate || 1.0, pitch: merged.pitch || 1.0, volume: merged.volume ?? 1.0,
              onEnd: done, onError: done,
            });
          },
        });
        cancelSpeechRef.current = cancel;
      } else if (isBrowserTTSSupported()) {
        const cancel = browserSpeak(phrase, {
          rate: merged.rate || 1.0, pitch: merged.pitch || 1.0, volume: merged.volume ?? 1.0,
          onEnd: done, onError: done,
        });
        cancelSpeechRef.current = cancel;
      } else {
        done();
      }
    }, 250);
  }, []); // eslint-disable-line react-hooks/exhaustive-deps

  // Conversation helpers
  const appendToConversation = useCallback((role, content) => {
    setConversation((prev) => {
      const next = [...prev, { role, content, ts: Date.now() }];
      const trimmed = next.slice(-(MAX_HISTORY_PAIRS * 2));
      saveVoiceHistory(trimmed);
      return trimmed;
    });
    setHistoryBadge((b) => b + 1);
  }, []);

  // Stop speaking
  const stopSpeaking = useCallback(() => {
    speechGenerationRef.current += 1;
    stopBargeInDetector();
    clearTimeout(autoListenTimerRef.current);
    cancelSpeechRef.current?.();
    cancelSpeechRef.current = null;
    cancelSpeech();
    if (mountedRef.current) {
      setPhase("idle");
      setDetectedEmotion("neutral");
    }
  }, []); // eslint-disable-line react-hooks/exhaustive-deps

  // Browser TTS speak
  const speakBrowser = useCallback((rawText) => {
    if (!rawText?.trim()) return;
    const cleanText = stripMarkdown(rawText);
    if (!cleanText) return;

    const speechGeneration = ++speechGenerationRef.current;
    const s = settingsRef.current;
    setDetectedEmotion(detectEmotion(rawText));
    if (mountedRef.current) {
      setPhase("speaking");
      // Arm barge-in detector so user can naturally interrupt Cortex's speech
      startBargeInDetector();
    }

    cancelSpeechRef.current?.();
    cancelSpeechRef.current = null;

    const handleEnd = () => {
      if (speechGeneration !== speechGenerationRef.current) return;
      stopBargeInDetector();
      cancelSpeechRef.current = null;
      if (!mountedRef.current) return;
      setPhase("idle");
      setDetectedEmotion("neutral");
      if (settingsRef.current.autoResumeListen && settingsRef.current.continuousConversation) {
        clearTimeout(autoListenTimerRef.current);
        autoListenTimerRef.current = setTimeout(() => {
          if (mountedRef.current && !startedRef.current && phaseRef.current === "idle") {
            startListeningRef.current?.();
          }
        }, 900);
      }
    };

    const browserFallback = () => {
      if (!isBrowserTTSSupported()) {
        setVoiceError("Voice synthesis not supported in this browser.");
        if (mountedRef.current) setPhase("idle");
        return;
      }
      const preferredName = s.preferredVoiceName || getPreferredVoiceName();
      const allRaw = window.speechSynthesis?.getVoices() || [];
      const preferredVoice = preferredName ? allRaw.find((v) => v.name === preferredName) || null : null;
      let retryCount = 0;
      const attemptBrowser = (voiceObj) => {
        const cancel = browserSpeak(cleanText, {
          voice: voiceObj, rate: s.rate || 1.0, pitch: s.pitch || 1.0, volume: s.volume ?? 1.0,
          onStart: () => {
            if (speechGeneration === speechGenerationRef.current && mountedRef.current) {
              setPhase("speaking");
            }
          },
          onEnd: handleEnd,
          onError: (err) => {
            if (speechGeneration !== speechGenerationRef.current) return;
            cancelSpeechRef.current = null;
            if (!mountedRef.current) return;
            if (retryCount < 2) {
              retryCount++;
              const voices = getAvailableVoices();
              attemptBrowser(voices[retryCount]?.voice || null);
            } else {
              // All TTS paths failed — go to idle and auto-listen if enabled.
              // Don't show a blocking error; just silently recover.
              if (mountedRef.current) {
                setPhase("idle");
                clearTimeout(autoListenTimerRef.current);
                autoListenTimerRef.current = setTimeout(() => {
                  if (mountedRef.current && !startedRef.current && phaseRef.current === "idle") {
                    startListeningRef.current?.();
                  }
                }, 800);
              }
            }
          },
        });
        cancelSpeechRef.current = cancel;
      };
      attemptBrowser(preferredVoice);
    };

    // Primary: Stream TTS
    if (s.voiceEngine !== "browser" && isStreamTTSAvailable()) {
      const cancel = streamSpeak(cleanText, {
        voiceId: s.streamVoiceId || getStreamVoiceId(),
        rate: s.rate || 1.0, volume: s.volume ?? 1.0,
        onStart: () => {
          if (speechGeneration === speechGenerationRef.current && mountedRef.current) {
            setPhase("speaking");
            // Start barge-in detector after TTS begins (browser AEC is active)
            startBargeInDetector();
          }
        },
        onEnd: handleEnd,
        onError: (err) => {
          if (speechGeneration !== speechGenerationRef.current) return;
          console.warn("[StreamTTS] falling back to browser TTS:", err?.message);
          browserFallback();
        },
      });
      cancelSpeechRef.current = cancel;
      return;
    }

    // Fallback: Browser TTS (also arm barge-in after phase transitions to speaking)
    browserFallback();
  }, []); // eslint-disable-line react-hooks/exhaustive-deps

  // ── STT: start listening ──────────────────────────────────────────────────
  // FIX (Priority 3): continuous=true + silence detection timer.
  // The previous continuous=false caused immediate stop after first silence.
  const startListening = useCallback((initialText = "") => {
    const SR = window.SpeechRecognition || window.webkitSpeechRecognition;
    if (!SR) {
      toast.error("Speech recognition is not supported in this browser.");
      return;
    }
    if (startedRef.current) return;

    clearTimeout(autoListenTimerRef.current);
    clearTimeout(silenceTimerRef.current);
    intentionalStopRef.current = false; // fresh session — any onend is unexpected until we say otherwise

    if (phaseRef.current === "speaking") {
      cancelSpeechRef.current?.();
      cancelSpeechRef.current = null;
      cancelSpeech();
    }

    const r = new SR();
    r.continuous      = true;   // FIX: keep recognition alive — silence timer drives stop
    r.interimResults  = true;
    // Use the browser/OS configured language for accent-robust recognition.
    // "en-IN" for Indian users, "en-GB" for UK users, etc. — far better than
    // hard-coding "en-US" for all English speakers worldwide.
    r.lang            = navigator.language || "en-US";
    r.maxAlternatives = 3;

    transcriptRef.current     = initialText.trim();
    finalizedUntilRef.current = 0;
    setTranscript(transcriptRef.current);
    setInterimText("");
    setVoiceError(null);
    setPhase("listening");
    startedRef.current = true;

    // Reset silence timer — restarted on every result event
    const resetSilenceTimer = () => {
      clearTimeout(silenceTimerRef.current);
      setSilenceKey((k) => k + 1); // restart the countdown ring animation
      silenceTimerRef.current = setTimeout(() => {
        if (startedRef.current && recogRef.current) {
          intentionalStopRef.current = true; // silence timeout = deliberate stop
          try { recogRef.current.stop(); } catch {}
        }
      }, SILENCE_TIMEOUT_MS);
    };

    // Start silence timer immediately — catches "no speech" case
    resetSilenceTimer();

    r.onresult = (e) => {
      resetSilenceTimer(); // extend window on every result
      let finalText = "";
      let interim   = "";
      for (let i = Math.max(e.resultIndex, finalizedUntilRef.current); i < e.results.length; i++) {
        const res  = e.results[i];
        const best = Array.from({ length: res.length }, (_, j) => res[j])
          .reduce((a, b) => (a.confidence >= b.confidence ? a : b));
        if (res.isFinal) {
          finalText += normalizeTranscript(best.transcript, {
            browserUrl: window.location.href, activeAppId: "voice",
          });
          finalizedUntilRef.current = i + 1;
        } else {
          interim += best.transcript;
        }
      }
      if (finalText) {
        transcriptRef.current += (transcriptRef.current ? " " : "") + finalText;
      }
      if (mountedRef.current) {
        if (transcriptRef.current) setTranscript(transcriptRef.current);
        setInterimText(interim);
      }
    };

    r.onerror = (e) => {
      clearTimeout(silenceTimerRef.current);
      intentionalStopRef.current = true; // errors count as intentional (don't auto-restart)
      startedRef.current = false;
      if (mountedRef.current) {
        setPhase("idle");
        setInterimText("");
      }
      if (e.error === "not-allowed") {
        setVoiceError("Microphone access denied — please allow access and try again.");
      } else if (e.error !== "aborted" && e.error !== "no-speech") {
        toast.error(`Microphone error: ${e.error}`);
      }
    };

    r.onend = async () => {
      clearTimeout(silenceTimerRef.current);
      startedRef.current = false;
      const text = transcriptRef.current.trim();
      if (mountedRef.current) setInterimText("");
      if (!text) {
        // Android Chrome fires onend early even with continuous=true (network-dependent STT).
        // If the stop was NOT intentional and we're still in listening phase, silently restart.
        if (!intentionalStopRef.current && mountedRef.current && phaseRef.current === "listening") {
          setTimeout(() => {
            if (mountedRef.current && phaseRef.current === "listening" && !startedRef.current) {
              startListeningRef.current?.();
            }
          }, 150);
          return;
        }
        if (mountedRef.current) setPhase("idle");
        return;
      }
      if (!mountedRef.current) return;

      if (isResetPhrase(text)) {
        resetConversation();
        if (mountedRef.current) setPhase("idle");
        return;
      }

      setLastActivityTime(Date.now());
      setPhase("thinking");

      const detectedActions = parseActions(text);
      if (detectedActions.length > 0) {
        executeActions(detectedActions, { openApp }).catch(() => {});
      }

      abortRef.current?.abort();
      const ctrl = new AbortController();
      abortRef.current = ctrl;

      const historyToSend = conversationRef.current.slice(-20).map((m) => ({
        role: m.role, content: m.content,
      }));

      try {
        let fetchedMemories = [];
        try { fetchedMemories = await memoryApi.relevant(text, 5); } catch {}

        let systemPrompt = buildVoiceContextPrompt(windowsRef.current, activeIdRef.current);

        if (fetchedMemories.length > 0) {
          systemPrompt += "\n\n=== CORTEX LONG-TERM MEMORY ===\n";
          systemPrompt += "Permanently remembered facts. Use naturally without re-asking.\n";
          fetchedMemories.forEach((m, i) => {
            systemPrompt += `${i + 1}. [${m.category}] ${m.content}\n`;
          });
        }

        systemPrompt += `\n\n=== VOICE RESPONSE RULES — follow strictly ===
- Keep every response to 1–3 sentences unless the user explicitly asks for detail or a list.
- Use natural spoken language only. No markdown, no bullet points, no headers, no asterisks, no code blocks.
- Sound like a brilliant friend, not a manual. Be warm, direct, and conversational.
- Use contractions (I'm, you're, it's, I'll) for natural flow.
- Never repeat the user's question back to them.
- If you don't know something, say so in one sentence and offer what you can.
- Avoid filler phrases like "Certainly!", "Of course!", "Great question!" — just answer.
- Numbers, dates, times: speak them out (twenty-four, not 24; half past three, not 3:30).
- If given a task like opening an app, confirm briefly: "Done." or "Opening that now."`;

        let fullResponse = "";
        await aiApi.chatStreamResilient(
          {
            session_id: "main",
            message: text,
            provider: "gemini",
            model: "gemini-2.5-flash",
            history: historyToSend,
            system: systemPrompt,
          },
          (delta) => { fullResponse += delta; },
          // onStatus — discard partial content when a provider retry is triggered
          // so the TTS doesn't speak a fragment from the failed attempt followed
          // by the full response from the retry (duplicate/garbled output).
          (status) => {
            if (status?.stage === "switching") fullResponse = "";
          },
          ctrl.signal,
        );
        if (!mountedRef.current || ctrl.signal.aborted) return;

        // Strip any internal CMD syntax that may have leaked into the voice response.
        // CMD tags ([CMD:...]) are meant for the desktop UI action system, not TTS.
        const cleanResponse = fullResponse.replace(/\[CMD:[^\]]*\]/gi, "").trim();

        if (cleanResponse) {
          appendToConversation("user", text);
          appendToConversation("assistant", cleanResponse);
          setSessionTurnCount((n) => n + 1);
          memoryApi.extract(text, cleanResponse).catch(() => {});

          if (settingsRef.current.voiceFeedback) {
            speakBrowser(cleanResponse);
          } else {
            if (mountedRef.current) setPhase("idle");
          }
        } else {
          // Empty after cleanup — treat as a silent failure (provider returned nothing useful)
          if (mountedRef.current) setPhase("idle");
        }
      } catch (err) {
        if (err?.name === "AbortError") return; // user cancelled — not a failure
        if (!mountedRef.current) return;
        setPhase("idle");

        // Categorise the failure so the toast is informative, not generic.
        if (err?.code === "OFFLINE") {
          toast.error("No internet connection — check your network and try again.", { duration: 6000 });
        } else if (err?.status === 429) {
          toast.error("Cortex is busy — Flash and backup providers are both rate-limited. Try again in a moment.", { duration: 7000 });
        } else if (err?.status === 503 || err?.status === 502) {
          toast.error("Cortex providers are temporarily overloaded. Please try again shortly.", { duration: 7000 });
        } else if (err?.name === "TimeoutError" || err?.message?.includes("timed out")) {
          toast.error("Cortex took too long to respond — please try again.", { duration: 5000 });
        } else {
          toast.error("Cortex response failed — please try again.", { duration: 4000 });
        }
      }
    };

    recogRef.current = r;
    try { r.start(); } catch (e) {
      clearTimeout(silenceTimerRef.current);
      startedRef.current = false;
      setPhase("idle");
      toast.error("Failed to start microphone. Please try again.");
    }
  }, [speakBrowser, openApp, appendToConversation, resetConversation]);

  useEffect(() => { startListeningRef.current = startListening; }, [startListening]);

  const stopListening = useCallback(() => {
    clearTimeout(silenceTimerRef.current);
    intentionalStopRef.current = true; // user tapped stop = intentional
    try { recogRef.current?.stop(); } catch {}
    startedRef.current = false;
    if (mountedRef.current) setPhase("idle");
  }, []);

  // ── Wake word ─────────────────────────────────────────────────────────────
  const startWakeWord = useCallback(() => {
    const SR = window.SpeechRecognition || window.webkitSpeechRecognition;
    if (!SR) return;
    if (wakeRecogRef.current) return;

    const r = new SR();
    r.continuous     = true;
    r.interimResults = false;
    r.lang           = "en-US";

    r.onresult = (e) => {
      for (let i = e.resultIndex; i < e.results.length; i++) {
        const transcript = (e.results[i][0]?.transcript || "").toLowerCase();
        if (
          transcript.includes("hey cortex") ||
          transcript.includes("hi cortex") ||
          transcript.includes("hello cortex") ||
          /\bcortex\b/.test(transcript)
        ) {
          if (phaseRef.current === "idle") {
            setWakeWordActive(true);
            setTimeout(() => setWakeWordActive(false), 2000);
            startListening();
          }
          break;
        }
      }
    };

    r.onerror = (e) => {
      if (e.error === "aborted") return;
      setTimeout(() => {
        if (mountedRef.current && settingsRef.current.wakeWordEnabled) {
          wakeRecogRef.current = null;
          startWakeWord();
        }
      }, 2000);
    };

    r.onend = () => {
      wakeRecogRef.current = null;
      if (mountedRef.current && settingsRef.current.wakeWordEnabled) {
        setTimeout(() => { if (mountedRef.current) startWakeWord(); }, 500);
      }
    };

    wakeRecogRef.current = r;
    try { r.start(); } catch { wakeRecogRef.current = null; }
  }, [startListening]);

  const stopWakeWord = useCallback(() => {
    if (wakeRecogRef.current) {
      wakeRecogRef.current.onend  = null;
      wakeRecogRef.current.onerror = null;
      try { wakeRecogRef.current.stop(); } catch {}
      wakeRecogRef.current = null;
    }
  }, []);

  // ── Barge-in detector — listens for real user speech while Cortex speaks ───
  // Uses the browser's built-in AEC so Cortex's own TTS audio is filtered out.
  // Only triggers when a real utterance (≥3 chars) is detected mid-playback.
  const stopBargeInDetector = useCallback(() => {
    bargeInActiveRef.current = false;
    bargeTranscriptRef.current = "";
    if (bargeInRecogRef.current) {
      bargeInRecogRef.current.onend    = null;
      bargeInRecogRef.current.onresult = null;
      bargeInRecogRef.current.onerror  = null;
      try { bargeInRecogRef.current.stop(); } catch {}
      bargeInRecogRef.current = null;
    }
  }, []);

  const startBargeInDetector = useCallback(() => {
    const SR = window.SpeechRecognition || window.webkitSpeechRecognition;
    if (!SR || !settingsRef.current.bargeIn) return;
    if (bargeInRecogRef.current) return; // already running

    bargeInActiveRef.current = true;
    bargeTranscriptRef.current = "";

    const tryStart = () => {
      if (!bargeInActiveRef.current || !mountedRef.current) return;
      if (bargeInRecogRef.current) return;

      const r = new SR();
      r.continuous      = false;   // short sessions → browser restarts = auto-recovery
      r.interimResults  = true;    // fire immediately on first speech fragment
      r.lang            = navigator.language || "en-US";
      r.maxAlternatives = 1;

      r.onresult = (e) => {
        let latestTranscript = "";
        for (let i = e.resultIndex; i < e.results.length; i++) {
          const transcript = (e.results[i][0]?.transcript || "").trim();
          latestTranscript = transcript || latestTranscript;
        }
        if (latestTranscript) bargeTranscriptRef.current = latestTranscript;

        // Minimum 3 chars of real speech — filters out single phoneme noise.
        // Use only the latest interim transcript: browser recognition usually
        // replaces interim text on each result, so concatenating it would
        // duplicate words in the interruption handoff.
        if (latestTranscript.length >= 3 && phaseRef.current === "speaking") {
          const interruption = normalizeTranscript(latestTranscript, {
            browserUrl: window.location.href, activeAppId: "voice",
          }).trim();
          bargeInActiveRef.current = false;
          bargeInRecogRef.current  = null;
          try { r.stop(); } catch {}

          // Stop TTS immediately
          cancelSpeechRef.current?.();
          cancelSpeechRef.current = null;
          cancelSpeech();
          clearTimeout(autoListenTimerRef.current);
          if (mountedRef.current) {
            setPhase("idle");
            setDetectedEmotion("neutral");
          }
          speechGenerationRef.current += 1;
          // Brief pause then start main recognition with the words already
          // captured by the detector, so the interruption becomes the next
          // turn instead of being silently discarded.
          setTimeout(() => {
            if (mountedRef.current) startListeningRef.current?.(interruption);
          }, 120);
        }
      };

      r.onerror = (e) => {
        bargeInRecogRef.current = null;
        // Suppress aborted / no-speech / not-allowed — don't log noise
        if (e.error === "aborted" || e.error === "not-allowed") return;
        // Restart on transient network/audio errors if still needed
        if (bargeInActiveRef.current && phaseRef.current === "speaking") {
          setTimeout(tryStart, 600);
        }
      };

      r.onend = () => {
        bargeInRecogRef.current = null;
        // Auto-restart so detector stays alive for the full TTS duration
        if (bargeInActiveRef.current && phaseRef.current === "speaking") {
          setTimeout(tryStart, 200);
        }
      };

      bargeInRecogRef.current = r;
      try { r.start(); } catch { bargeInRecogRef.current = null; }
    };

    tryStart();
  }, []); // eslint-disable-line react-hooks/exhaustive-deps

  // Turning barge-in off while Cortex is speaking must tear down the
  // microphone listener immediately; otherwise the old mode remains active
  // until the current response ends.
  useEffect(() => {
    if (!settings.bargeIn) stopBargeInDetector();
  }, [settings.bargeIn, stopBargeInDetector]);

  useEffect(() => {
    if (settings.wakeWordEnabled) startWakeWord();
    else stopWakeWord();
  }, [settings.wakeWordEnabled, startWakeWord, stopWakeWord]);

  // ── Web Audio analyser — real-time mic level visualizer ───────────────────
  // Samples 7 frequency bands from the mic stream at ~60 fps via rAF.
  // Simulated waveform animation — drives the same audioLevels bars with a
  // random-walk so they look organic, without calling getUserMedia which would
  // fight SpeechRecognition for exclusive mic access and cause it to abort.
  const startAudioAnalyser = useCallback(() => {
    if (animFrameRef.current) return;
    const tick = () => {
      if (!mountedRef.current) return;
      const prev = smoothedLevelsRef.current;
      const next = prev.map((p) => {
        const target = Math.random();
        // Rise fast, fall slower → natural "voice activity" feel
        return p + (target - p) * (target > p ? 0.4 : 0.18);
      });
      smoothedLevelsRef.current = next;
      setAudioLevels([...next]);
      animFrameRef.current = requestAnimationFrame(tick);
    };
    animFrameRef.current = requestAnimationFrame(tick);
  }, []);

  const stopAudioAnalyser = useCallback(() => {
    cancelAnimationFrame(animFrameRef.current);
    animFrameRef.current = null;
    smoothedLevelsRef.current = new Array(7).fill(0);
    if (mountedRef.current) setAudioLevels(new Array(7).fill(0));
  }, []);

  // Start / stop the analyser whenever the phase enters or leaves "listening".
  useEffect(() => {
    if (phase === "listening") {
      startAudioAnalyser();
    } else {
      stopAudioAnalyser();
    }
  }, [phase, startAudioAnalyser, stopAudioAnalyser]);

  // ── Main button click ─────────────────────────────────────────────────────
  const handleMicClick = useCallback(() => {
    // Unlock AudioContext on first user tap — required on Android Chrome for TTS.
    // Must happen inside a gesture handler (not async) to satisfy the browser's
    // "audio was started by user gesture" security requirement.
    if (!audioUnlockedRef.current) {
      audioUnlockedRef.current = true;
      try {
        const tmp = new (window.AudioContext || window.webkitAudioContext)();
        tmp.resume().then(() => tmp.close()).catch(() => {});
      } catch {}
    }

    if (phase === "listening") {
      stopListening();
    } else if (phase === "speaking") {
      stopSpeaking();
      setTimeout(() => { if (mountedRef.current) startListening(); }, 150);
    } else if (phase === "thinking") {
      abortRef.current?.abort();
      if (mountedRef.current) setPhase("idle");
    } else {
      startListening();
    }
  }, [phase, startListening, stopListening, stopSpeaking]);

  // ── Voice preview ─────────────────────────────────────────────────────────
  const handleVoicePreview = useCallback((voiceName) => {
    if (previewingVoice === voiceName) {
      cancelSpeech();
      setPreviewingVoice(null);
      return;
    }
    cancelSpeech();
    setPreviewingVoice(voiceName);

    const allRaw = window.speechSynthesis?.getVoices() || [];
    const voiceObj = allRaw.find((v) => v.name === voiceName) || null;

    browserSpeak("Hello, I'm Cortex. Ready to assist.", {
      voice: voiceObj,
      rate: settingsRef.current.rate || 1.0,
      pitch: settingsRef.current.pitch || 1.0,
      volume: settingsRef.current.volume ?? 1.0,
      onEnd:  () => { if (mountedRef.current) setPreviewingVoice(null); },
      onError: () => {
        if (mountedRef.current) {
          setPreviewingVoice(null);
          toast.error(`Preview failed for "${voiceName}"`, { duration: 2000 });
        }
      },
    });
  }, [previewingVoice]);

  // ── Replay last response ──────────────────────────────────────────────────
  const replayLast = useCallback(() => {
    const hist = conversationRef.current;
    const last = [...hist].reverse().find((m) => m.role === "assistant");
    if (last) speakBrowser(last.content);
  }, [speakBrowser]);

  // ── Derived state ─────────────────────────────────────────────────────────
  const isListening = phase === "listening";
  const isSpeaking  = phase === "speaking";
  const isThinking  = phase === "thinking";

  const lastAssistantMsg = [...conversation].reverse().find((m) => m.role === "assistant");
  const selectedVoiceName = settings.preferredVoiceName || getPreferredVoiceName();
  const selectedVoiceInfo = availableVoices.find((v) => v.name === selectedVoiceName);

  // ── Tab labels ────────────────────────────────────────────────────────────
  const TAB_LABELS = {
    voice:    "CORTEX",
    history:  "MISSION LOG",
    settings: "NEURAL ENGINE",
  };

  return (
    <div
      className="flex flex-col h-full text-white overflow-hidden"
      data-testid="voice-app"
      style={{ background: "linear-gradient(160deg, #05050A 0%, #080D1A 60%, #05050A 100%)" }}
    >
      <style>{CORTEX_KEYFRAMES}</style>

      {/* ── Nav bar ──────────────────────────────────────────────────────── */}
      <div style={{
        display: "flex",
        borderBottom: "1px solid rgba(255,255,255,0.06)",
        background: "rgba(5,5,10,0.7)",
        backdropFilter: "blur(20px)",
        flexShrink: 0,
      }}>
        {["voice", "history", "settings"].map((tab) => {
          const active = activeView === tab;
          return (
            <button
              key={tab}
              onClick={() => setActiveView(tab)}
              style={{
                flex: 1, padding: "13px 0", position: "relative",
                fontSize: 9, fontFamily: "'JetBrains Mono', monospace",
                letterSpacing: "0.14em", textTransform: "uppercase",
                color: active ? "#4A9EFF" : "rgba(255,255,255,0.22)",
                background: "none", border: "none",
                borderBottom: active ? "1.5px solid #4A9EFF" : "1.5px solid transparent",
                cursor: "pointer", transition: "all 0.2s ease",
                WebkitTapHighlightColor: "transparent",
                fontWeight: active ? 700 : 500,
              }}
            >
              {TAB_LABELS[tab]}
              {tab === "history" && historyBadge > 0 && (
                <span style={{
                  position: "absolute", top: 6, right: "calc(50% - 24px)",
                  minWidth: 14, height: 14, borderRadius: 7,
                  background: "#4A9EFF", color: "#000",
                  fontSize: 8, fontWeight: 700, lineHeight: "14px",
                  textAlign: "center", padding: "0 3px",
                }}>
                  {historyBadge > 99 ? "99+" : historyBadge}
                </span>
              )}
            </button>
          );
        })}
      </div>

      {/* ═══════════════════════════════════════════════════════════════════ */}
      {/* CORTEX TAB                                                         */}
      {/* ═══════════════════════════════════════════════════════════════════ */}
      {activeView === "voice" && (
        <div
          className="flex flex-col items-center flex-1 overflow-y-auto"
          style={{ padding: "28px 20px 100px", position: "relative" }}
        >
          {/* Title */}
          <div style={{ textAlign: "center", marginBottom: 6 }}>
            <h1 style={{
              fontFamily: "'Unbounded', sans-serif",
              fontSize: "clamp(28px, 6vw, 42px)",
              fontWeight: 800,
              letterSpacing: "0.22em",
              background: "linear-gradient(135deg, #ffffff 30%, #4A9EFF 70%)",
              WebkitBackgroundClip: "text",
              WebkitTextFillColor: "transparent",
              backgroundClip: "text",
              margin: 0,
              lineHeight: 1.1,
            }}>
              CORTEX
            </h1>
          </div>

          {/* Dynamic greeting */}
          {greeting && (
            <p style={{
              fontFamily: "'JetBrains Mono', monospace",
              fontSize: 12, color: "rgba(255,255,255,0.35)",
              letterSpacing: "0.06em", marginBottom: 24, marginTop: 4,
              animation: "cortexFadeUp 0.6s ease",
              textAlign: "center",
            }}>
              {greeting}
            </p>
          )}

          {/* Meta row */}
          <div style={{ display: "flex", alignItems: "center", gap: 8, marginBottom: 28 }}>
            {conversation.length > 0 && (
              <div style={{
                display: "flex", alignItems: "center", gap: 6,
                fontSize: 10, fontFamily: "'JetBrains Mono', monospace",
                padding: "4px 10px", borderRadius: 12,
                border: "1px solid rgba(74,158,255,0.2)",
                background: "rgba(74,158,255,0.05)",
                color: "rgba(74,158,255,0.65)",
              }}>
                <i className="fa-solid fa-wave-square" style={{ fontSize: 8 }} />
                {Math.ceil(conversation.length / 2)} exchanges
              </div>
            )}
            {conversation.length > 0 && (
              <button
                onClick={resetConversation}
                style={{
                  display: "flex", alignItems: "center", gap: 5,
                  fontSize: 10, fontFamily: "'JetBrains Mono', monospace",
                  padding: "4px 10px", borderRadius: 12,
                  border: "1px solid rgba(255,255,255,0.08)",
                  background: "rgba(255,255,255,0.03)",
                  color: "rgba(255,255,255,0.3)",
                  cursor: "pointer", transition: "all 0.15s ease",
                }}
                onMouseEnter={(e) => {
                  e.currentTarget.style.color = "rgba(255,80,80,0.8)";
                  e.currentTarget.style.borderColor = "rgba(255,80,80,0.25)";
                }}
                onMouseLeave={(e) => {
                  e.currentTarget.style.color = "rgba(255,255,255,0.3)";
                  e.currentTarget.style.borderColor = "rgba(255,255,255,0.08)";
                }}
              >
                <i className="fa-solid fa-rotate-left" style={{ fontSize: 8 }} />
                New Session
              </button>
            )}
            {settings.wakeWordEnabled && (
              <div style={{
                display: "flex", alignItems: "center", gap: 5,
                fontSize: 10, fontFamily: "'JetBrains Mono', monospace",
                padding: "4px 10px", borderRadius: 12,
                border: `1px solid ${wakeWordActive ? "rgba(74,158,255,0.6)" : "rgba(74,158,255,0.2)"}`,
                background: wakeWordActive ? "rgba(74,158,255,0.12)" : "rgba(74,158,255,0.04)",
                color: wakeWordActive ? "#4A9EFF" : "rgba(74,158,255,0.4)",
                animation: wakeWordActive ? "wakeFlash 0.3s ease" : "none",
              }}>
                <i className="fa-solid fa-microphone-lines" style={{ fontSize: 8 }} />
                Hey Cortex
              </div>
            )}
          </div>

          {/* ── AI Core — single primary interaction ── */}
          <AICoreOrb
            phase={phase}
            audioLevels={audioLevels}
            silenceKey={silenceKey}
            onClick={handleMicClick}
            onTouchStart={(e) => { orbSwipeTouchY.current = e.touches[0]?.clientY ?? null; }}
            onTouchEnd={(e) => {
              const startY = orbSwipeTouchY.current;
              orbSwipeTouchY.current = null;
              if (startY == null) return;
              const deltaY = (e.changedTouches[0]?.clientY ?? startY) - startY;
              if (deltaY >= 40 && isSpeaking) {
                e.preventDefault();
                stopSpeaking();
                setTimeout(() => { if (mountedRef.current) startListening(); }, 150);
              }
            }}
          />

          {/* Status badge */}
          <div style={{ marginTop: 20, marginBottom: 8 }}>
            <StatusBadge phase={phase} thinkingMsg={thinkingMsg} />
          </div>

          {/* ── Waveform visualizer ── */}
          <div style={{
            marginBottom: 12,
            opacity: phase === "idle" ? 0.35 : 1,
            transition: "opacity 0.5s ease",
          }}>
            <VoiceWaveform
              mode={phase}
              color={isListening ? "#FF4A6E" : isSpeaking ? "#4A9EFF" : isThinking ? "#CF9EFF" : "#00F0FF"}
              width={220}
              height={48}
            />
          </div>

          {/* ── Stop / Interrupt button (visible only during speaking or thinking) ── */}
          {(isSpeaking || isThinking) && (
            <button
              onClick={() => {
                if (isSpeaking) {
                  stopSpeaking();
                  if (settings.continuousConversation && settings.autoResumeListen) {
                    setTimeout(() => { if (mountedRef.current) startListening(); }, 150);
                  }
                } else if (isThinking) {
                  abortRef.current?.abort();
                  if (mountedRef.current) setPhase("idle");
                }
              }}
              style={{
                display: "flex", alignItems: "center", gap: 8,
                padding: "9px 20px", borderRadius: 24,
                background: "rgba(255,0,60,0.1)",
                border: "1px solid rgba(255,0,60,0.45)",
                color: "#FF4466",
                fontSize: 12, fontFamily: "'JetBrains Mono', monospace",
                letterSpacing: "0.08em", cursor: "pointer",
                marginBottom: 12,
                animation: "cortexFadeUp 0.2s ease",
                transition: "all 0.15s ease",
                boxShadow: "0 0 16px rgba(255,0,60,0.12)",
              }}
              onMouseEnter={(e) => {
                e.currentTarget.style.background = "rgba(255,0,60,0.2)";
                e.currentTarget.style.boxShadow = "0 0 24px rgba(255,0,60,0.25)";
              }}
              onMouseLeave={(e) => {
                e.currentTarget.style.background = "rgba(255,0,60,0.1)";
                e.currentTarget.style.boxShadow = "0 0 16px rgba(255,0,60,0.12)";
              }}
            >
              <i className="fa-solid fa-stop" style={{ fontSize: 10 }} />
              {isSpeaking ? "STOP" : "CANCEL"}
            </button>
          )}

          {/* Sub-hints */}
          <div style={{
            fontFamily: "'JetBrains Mono', monospace",
            fontSize: 10, color: "rgba(255,255,255,0.2)",
            letterSpacing: "0.06em", textAlign: "center", marginBottom: 16, minHeight: 16,
          }}>
            {isListening && "Speak now — silence will send"}
            {isSpeaking && settings.autoResumeListen && settings.continuousConversation && "Tap to interrupt · Will auto-listen after"}
            {isSpeaking && !(settings.autoResumeListen && settings.continuousConversation) && "Tap to interrupt"}
            {isThinking && "Tap to cancel"}
            {!isListening && !isSpeaking && !isThinking && "Tap the core to speak"}
          </div>

          {/* Selected voice */}
          {selectedVoiceInfo && settings.voiceEngine === "browser" && (
            <div style={{
              display: "flex", alignItems: "center", gap: 6,
              fontSize: 10, fontFamily: "'JetBrains Mono', monospace",
              padding: "4px 12px", borderRadius: 12,
              border: "1px solid rgba(255,255,255,0.07)",
              background: "rgba(255,255,255,0.03)",
              color: "rgba(255,255,255,0.3)", marginBottom: 16,
            }}>
              <i className="fa-solid fa-volume-high" style={{ fontSize: 8 }} />
              {selectedVoiceInfo.name}
              <QualityBadge quality={selectedVoiceInfo.quality} />
            </div>
          )}

          {/* Error */}
          {voiceError && (
            <div style={{
              display: "flex", alignItems: "center", gap: 8,
              fontSize: 11, fontFamily: "'JetBrains Mono', monospace",
              padding: "10px 14px", borderRadius: 10,
              border: "1px solid rgba(255,160,0,0.3)",
              background: "rgba(255,160,0,0.06)",
              color: "#FFA000", marginBottom: 14, maxWidth: 340, textAlign: "center",
              animation: "cortexFadeUp 0.2s ease",
            }}>
              <i className="fa-solid fa-triangle-exclamation" style={{ fontSize: 10, flexShrink: 0 }} />
              {voiceError}
            </div>
          )}

          {/* Live transcript */}
          {(transcript || interimText) && (
            <div style={{
              width: "100%", maxWidth: 480,
              padding: "14px 16px", borderRadius: 14, marginBottom: 12,
              background: "rgba(255,255,255,0.03)",
              border: "1px solid rgba(255,255,255,0.07)",
              animation: "cortexFadeUp 0.2s ease",
            }}>
              <div style={{
                fontFamily: "'JetBrains Mono', monospace",
                fontSize: 9, letterSpacing: "0.14em", color: "rgba(74,158,255,0.5)",
                textTransform: "uppercase", marginBottom: 6,
              }}>
                Voice Input
              </div>
              <p style={{ fontSize: 13, color: "rgba(255,255,255,0.85)", lineHeight: 1.6, margin: 0 }}>
                {transcript}
                {interimText && (
                  <span style={{ color: "rgba(255,255,255,0.35)", fontStyle: "italic" }}>
                    {transcript ? " " : ""}{interimText}
                  </span>
                )}
              </p>
            </div>
          )}

          {/* Recent conversation */}
          {conversation.length > 0 && (
            <div style={{ width: "100%", maxWidth: 480, marginBottom: 12 }}>
              {conversation.slice(-4).map((msg, i) => {
                const isUser = msg.role === "user";
                return (
                  <div
                    key={i}
                    style={{
                      marginBottom: 8, padding: "10px 14px", borderRadius: 12,
                      background: isUser ? "rgba(74,158,255,0.05)" : "rgba(167,139,250,0.04)",
                      border: isUser ? "1px solid rgba(74,158,255,0.12)" : "1px solid rgba(167,139,250,0.10)",
                      animation: `cortexFadeUp 0.2s ease ${i * 0.04}s both`,
                    }}
                  >
                    <div style={{
                      fontFamily: "'JetBrains Mono', monospace",
                      fontSize: 9, letterSpacing: "0.12em", textTransform: "uppercase",
                      color: isUser ? "rgba(74,158,255,0.5)" : "rgba(167,139,250,0.5)",
                      marginBottom: 4,
                    }}>
                      {isUser ? "You" : "Cortex"}
                    </div>
                    <p style={{
                      fontSize: 12, color: "rgba(255,255,255,0.75)", lineHeight: 1.55,
                      margin: 0, whiteSpace: "pre-wrap",
                      overflow: "hidden",
                      display: "-webkit-box",
                      WebkitLineClamp: 3,
                      WebkitBoxOrient: "vertical",
                    }}>
                      {msg.content.length > 260 ? msg.content.slice(0, 260) + "…" : msg.content}
                    </p>
                  </div>
                );
              })}

              {lastAssistantMsg && !isSpeaking && !isListening && !isThinking && (
                <button
                  onClick={replayLast}
                  style={{
                    display: "flex", alignItems: "center", gap: 6,
                    fontSize: 10, fontFamily: "'JetBrains Mono', monospace",
                    color: "rgba(167,139,250,0.45)", background: "none", border: "none",
                    cursor: "pointer", padding: "4px 2px", transition: "color 0.15s",
                  }}
                  onMouseEnter={(e) => { e.currentTarget.style.color = "#A78BFA"; }}
                  onMouseLeave={(e) => { e.currentTarget.style.color = "rgba(167,139,250,0.45)"; }}
                >
                  <i className="fa-solid fa-rotate-right" style={{ fontSize: 9 }} />
                  Replay last response
                </button>
              )}
            </div>
          )}
        </div>
      )}

      {/* ═══════════════════════════════════════════════════════════════════ */}
      {/* MISSION LOG TAB                                                    */}
      {/* ═══════════════════════════════════════════════════════════════════ */}
      {activeView === "history" && (
        <div
          ref={historyScrollRef}
          onScroll={handleHistoryScroll}
          className="flex-1 overflow-y-auto"
          style={{ overscrollBehavior: "contain" }}
        >
          <div style={{
            position: "sticky", top: 0, zIndex: 10,
            display: "flex", alignItems: "center", justifyContent: "space-between",
            padding: "12px 16px",
            background: "rgba(5,5,10,0.9)",
            backdropFilter: "blur(20px)",
            borderBottom: "1px solid rgba(255,255,255,0.05)",
          }}>
            <div style={{
              fontFamily: "'JetBrains Mono', monospace",
              fontSize: 10, letterSpacing: "0.14em", textTransform: "uppercase",
              color: "rgba(74,158,255,0.65)",
            }}>
              Conversation Memory
              {conversation.length > 0 && (
                <span style={{ color: "rgba(255,255,255,0.2)", marginLeft: 10 }}>
                  {Math.ceil(conversation.length / 2)} turns
                </span>
              )}
            </div>
            <div style={{ display: "flex", gap: 8 }}>
              {conversation.length > 0 && (
                <>
                  <button
                    onClick={() => {
                      const text = conversation.map((m) =>
                        `[${m.role === "user" ? "You" : "Cortex"}]  ${m.content}`
                      ).join("\n\n");
                      navigator.clipboard?.writeText(text).then(() =>
                        toast.success("Copied", { duration: 1500, style: { fontSize: 12 } })
                      );
                    }}
                    style={{
                      display: "flex", alignItems: "center", gap: 5,
                      fontSize: 9, fontFamily: "'JetBrains Mono', monospace",
                      padding: "5px 10px", borderRadius: 8,
                      border: "1px solid rgba(74,158,255,0.2)",
                      background: "rgba(74,158,255,0.05)",
                      color: "rgba(74,158,255,0.6)", cursor: "pointer",
                    }}
                  >
                    <i className="fa-solid fa-copy" style={{ fontSize: 8 }} />
                    Export
                  </button>
                  <button
                    onClick={() => resetConversation()}
                    style={{
                      display: "flex", alignItems: "center", gap: 5,
                      fontSize: 9, fontFamily: "'JetBrains Mono', monospace",
                      padding: "5px 10px", borderRadius: 8,
                      border: "1px solid rgba(255,80,80,0.2)",
                      background: "rgba(255,80,80,0.05)",
                      color: "rgba(255,80,80,0.6)", cursor: "pointer",
                    }}
                  >
                    <i className="fa-solid fa-trash" style={{ fontSize: 8 }} />
                    Clear
                  </button>
                </>
              )}
            </div>
          </div>

          {conversation.length === 0 ? (
            <div style={{ display: "flex", flexDirection: "column", alignItems: "center", padding: "60px 24px", textAlign: "center" }}>
              <i className="fa-solid fa-wave-square" style={{ fontSize: 36, color: "rgba(74,158,255,0.15)", marginBottom: 16 }} />
              <p style={{ fontFamily: "'JetBrains Mono', monospace", fontSize: 11, color: "rgba(255,255,255,0.2)", lineHeight: 1.7 }}>
                No conversations recorded.<br />
                Activate the Core on the Cortex tab<br />
                to begin a session.
              </p>
            </div>
          ) : (
            <div style={{ padding: "16px 16px 32px", maxWidth: 640, margin: "0 auto" }}>
              {conversation.map((msg, i) => {
                const isUser = msg.role === "user";
                const ts = msg.ts ? new Date(msg.ts) : null;
                const timeLabel = ts
                  ? ts.toLocaleTimeString([], { hour: "2-digit", minute: "2-digit" })
                  : null;

                return (
                  <div
                    key={i}
                    style={{
                      display: "flex", flexDirection: "column",
                      alignItems: isUser ? "flex-end" : "flex-start",
                      marginBottom: 12,
                      animation: `cortexFadeUp 0.2s ease ${Math.min(i, 8) * 0.03}s both`,
                    }}
                  >
                    <div style={{
                      display: "flex", alignItems: "center", gap: 8, marginBottom: 4, padding: "0 2px",
                      flexDirection: isUser ? "row-reverse" : "row",
                    }}>
                      <span style={{
                        fontFamily: "'JetBrains Mono', monospace",
                        fontSize: 9, letterSpacing: "0.12em", textTransform: "uppercase",
                        color: isUser ? "rgba(74,158,255,0.5)" : "rgba(167,139,250,0.5)",
                      }}>
                        {isUser ? "You" : "Cortex"}
                      </span>
                      {timeLabel && (
                        <span style={{ fontSize: 9, color: "rgba(255,255,255,0.2)", fontFamily: "monospace" }}>
                          {timeLabel}
                        </span>
                      )}
                    </div>

                    <div style={{
                      maxWidth: "85%", padding: "10px 14px",
                      borderRadius: isUser ? "16px 16px 4px 16px" : "16px 16px 16px 4px",
                      background: isUser ? "rgba(74,158,255,0.07)" : "rgba(167,139,250,0.06)",
                      border: isUser ? "1px solid rgba(74,158,255,0.15)" : "1px solid rgba(167,139,250,0.12)",
                      fontSize: 13, lineHeight: 1.6,
                      color: "rgba(255,255,255,0.85)",
                      wordBreak: "break-word", whiteSpace: "pre-wrap",
                    }}>
                      {msg.content}
                    </div>

                    {!isUser && (
                      <div style={{ display: "flex", gap: 4, marginTop: 4, padding: "0 2px" }}>
                        <button
                          onClick={() => speakBrowser(msg.content)}
                          disabled={isSpeaking || isListening}
                          style={{
                            fontSize: 9, fontFamily: "'JetBrains Mono', monospace",
                            letterSpacing: "0.08em", padding: "3px 7px",
                            color: isSpeaking || isListening ? "rgba(167,139,250,0.2)" : "rgba(167,139,250,0.45)",
                            background: "none", border: "none",
                            cursor: isSpeaking || isListening ? "default" : "pointer",
                            transition: "color 0.15s",
                          }}
                          onMouseEnter={(e) => { if (!isSpeaking && !isListening) e.currentTarget.style.color = "#A78BFA"; }}
                          onMouseLeave={(e) => { e.currentTarget.style.color = isSpeaking || isListening ? "rgba(167,139,250,0.2)" : "rgba(167,139,250,0.45)"; }}
                        >
                          <i className="fa-solid fa-volume-high" style={{ fontSize: 8, marginRight: 4 }} />
                          Play
                        </button>
                        <button
                          onClick={() => navigator.clipboard?.writeText(msg.content).then(() =>
                            toast.success("Copied", { duration: 1200, style: { fontSize: 12 } })
                          )}
                          style={{
                            fontSize: 9, fontFamily: "'JetBrains Mono', monospace",
                            letterSpacing: "0.08em", padding: "3px 7px",
                            color: "rgba(255,255,255,0.2)", background: "none", border: "none",
                            cursor: "pointer", transition: "color 0.15s",
                          }}
                          onMouseEnter={(e) => { e.currentTarget.style.color = "rgba(255,255,255,0.55)"; }}
                          onMouseLeave={(e) => { e.currentTarget.style.color = "rgba(255,255,255,0.2)"; }}
                        >
                          <i className="fa-solid fa-copy" style={{ fontSize: 8, marginRight: 4 }} />
                          Copy
                        </button>
                      </div>
                    )}
                  </div>
                );
              })}
            </div>
          )}

          {!isAtBottom && conversation.length > 0 && (
            <button
              onClick={() => historyScrollRef.current?.scrollTo({ top: historyScrollRef.current.scrollHeight, behavior: "smooth" })}
              style={{
                position: "sticky", bottom: 16,
                display: "flex", alignItems: "center", justifyContent: "center",
                width: 34, height: 34, borderRadius: "50%",
                background: "rgba(74,158,255,0.12)",
                border: "1px solid rgba(74,158,255,0.3)",
                color: "#4A9EFF", margin: "0 auto",
                cursor: "pointer", fontSize: 11,
                animation: "cortexFadeUp 0.2s ease",
              }}
            >
              <i className="fa-solid fa-chevron-down" />
            </button>
          )}
        </div>
      )}

      {/* ═══════════════════════════════════════════════════════════════════ */}
      {/* NEURAL ENGINE TAB                                                  */}
      {/* ═══════════════════════════════════════════════════════════════════ */}
      {activeView === "settings" && (
        <div className="flex-1 overflow-y-auto" style={{ padding: "16px 16px 32px" }}>

          {/* Conversation Memory */}
          <Card>
            <SectionHeader label="Conversation Memory" />

            <SettingRow label="Continuous Mode" desc="Keep context alive between sessions">
              <Toggle value={settings.continuousConversation} onChange={(v) => updateSettings({ continuousConversation: v })} />
            </SettingRow>

            <SettingRow label="Auto-Listen" desc="Resume listening automatically after Cortex speaks">
              <Toggle
                value={settings.autoResumeListen}
                onChange={(v) => updateSettings({ autoResumeListen: v })}
                disabled={!settings.continuousConversation}
              />
            </SettingRow>

            <SettingRow label="Voice Feedback" desc="Cortex speaks responses aloud">
              <Toggle value={settings.voiceFeedback} onChange={(v) => updateSettings({ voiceFeedback: v })} />
            </SettingRow>

            <div style={{ paddingTop: 10 }}>
              <div style={{ fontSize: 13, color: "#fff", fontWeight: 500, marginBottom: 4 }}>Session Timeout</div>
              <div style={{ fontSize: 11, color: "rgba(255,255,255,0.35)", marginBottom: 4 }}>Auto-reset after inactivity</div>
              <Segmented
                options={TIMEOUT_OPTIONS}
                value={settings.conversationTimeout}
                onChange={(v) => updateSettings({ conversationTimeout: v })}
              />
            </div>

            {conversation.length > 0 && (
              <div style={{ marginTop: 14 }}>
                <button
                  onClick={() => resetConversation()}
                  style={{
                    display: "flex", alignItems: "center", gap: 8,
                    fontSize: 12, fontFamily: "'JetBrains Mono', monospace",
                    padding: "8px 14px", borderRadius: 10,
                    background: "rgba(255,80,80,0.05)",
                    border: "1px solid rgba(255,80,80,0.2)",
                    color: "rgba(255,80,80,0.7)", cursor: "pointer",
                    transition: "background 0.15s",
                  }}
                  onMouseEnter={(e) => { e.currentTarget.style.background = "rgba(255,80,80,0.12)"; }}
                  onMouseLeave={(e) => { e.currentTarget.style.background = "rgba(255,80,80,0.05)"; }}
                >
                  <i className="fa-solid fa-trash" style={{ fontSize: 10 }} />
                  Clear Memory Bank
                  <span style={{ fontSize: 10, opacity: 0.6 }}>({Math.ceil(conversation.length / 2)} turns)</span>
                </button>
              </div>
            )}
          </Card>

          {/* Wake Word */}
          <Card>
            <SectionHeader label="Voice Activation" />

             <SettingRow
               label={`Barge-In ${settings.bargeIn ? "ON" : "OFF"}`}
               desc={settings.bargeIn ? "Speak to stop Cortex and start your next turn" : "Cortex finishes speaking unless you stop it"}
             >
               <Toggle
                 value={settings.bargeIn}
                 onChange={(v) => updateSettings({ bargeIn: v })}
                 ariaLabel={`Barge-In ${settings.bargeIn ? "on" : "off"}`}
               />
            </SettingRow>

            {settings.bargeIn && (
              <div style={{
                marginTop: 4, marginBottom: 10, padding: "10px 12px", borderRadius: 10,
                background: "rgba(0,229,255,0.05)", border: "1px solid rgba(0,229,255,0.15)",
                fontSize: 11, fontFamily: "'JetBrains Mono', monospace",
                color: "rgba(0,229,255,0.65)", lineHeight: 1.6,
              }}>
                <i className="fa-solid fa-circle-info" style={{ marginRight: 6 }} />
                Speak 3+ syllables to interrupt Cortex mid-response. Echo cancellation prevents Cortex's voice from triggering itself.
              </div>
            )}

            <SettingRow label={`"Hey Cortex" Wake Word`} desc='Say "Hey Cortex" to activate hands-free'>
              <Toggle value={settings.wakeWordEnabled} onChange={(v) => updateSettings({ wakeWordEnabled: v })} />
            </SettingRow>

            {settings.wakeWordEnabled && (
              <div style={{
                marginTop: 10, padding: "10px 12px", borderRadius: 10,
                background: "rgba(74,158,255,0.06)", border: "1px solid rgba(74,158,255,0.18)",
                fontSize: 11, fontFamily: "'JetBrains Mono', monospace",
                color: "rgba(74,158,255,0.75)", lineHeight: 1.6,
              }}>
                <i className="fa-solid fa-circle-info" style={{ marginRight: 6 }} />
                Say <strong>"Hey Cortex"</strong> or <strong>"Hi Cortex"</strong> to activate.
              </div>
            )}
          </Card>

          {/* Voice Matrix */}
          <Card>
            <SectionHeader label="Voice Matrix" />
            <p style={{ fontSize: 11, color: "rgba(255,255,255,0.3)", marginBottom: 14, marginTop: -4, lineHeight: 1.6 }}>
              Human mode uses Amazon Neural TTS via StreamElements (free, no key needed). Browser uses your device's built-in voice engine.
            </p>

            <div style={{ display: "flex", gap: 8, marginBottom: 16 }}>
              {[
                { key: "stream",  label: "Neural Human", desc: "Amazon Polly · Realistic" },
                { key: "browser", label: "Device Voice",  desc: "Browser built-in" },
              ].map(({ key, label, desc }) => {
                const active = settings.voiceEngine === key;
                return (
                  <button
                    key={key}
                    onClick={() => updateSettings({ voiceEngine: key })}
                    style={{
                      flex: 1, borderRadius: 12, padding: "10px 8px", textAlign: "center",
                      background: active ? "rgba(74,158,255,0.10)" : "rgba(255,255,255,0.03)",
                      border: active ? "1px solid rgba(74,158,255,0.45)" : "1px solid rgba(255,255,255,0.06)",
                      color: active ? "#4A9EFF" : "rgba(255,255,255,0.4)",
                      cursor: "pointer", transition: "all 0.15s ease",
                    }}
                  >
                    <div style={{ fontSize: 12, fontWeight: 600, marginBottom: 2 }}>{label}</div>
                    <div style={{ fontSize: 10, fontFamily: "'JetBrains Mono', monospace", opacity: 0.6 }}>{desc}</div>
                  </button>
                );
              })}
            </div>

            {isLivePreviewing && (
              <div style={{
                display: "inline-flex", alignItems: "center", gap: 6,
                padding: "5px 12px", borderRadius: 10, marginBottom: 12,
                background: "rgba(74,158,255,0.08)", border: "1px solid rgba(74,158,255,0.2)",
                animation: "cortexFadeUp 0.15s ease",
              }}>
                <i className="fa-solid fa-volume-high" style={{ fontSize: 10, color: "#4A9EFF" }} />
                <span style={{ fontSize: 10, fontFamily: "'JetBrains Mono', monospace", color: "#4A9EFF", letterSpacing: "0.08em" }}>
                  Testing voice…
                </span>
              </div>
            )}

            <div style={{ borderTop: "1px solid rgba(255,255,255,0.05)", paddingTop: 12, marginBottom: 4 }}>
              <div style={{ display: "flex", justifyContent: "space-between", marginBottom: 4 }}>
                <div style={{ fontSize: 13, color: "#fff", fontWeight: 500 }}>Speed</div>
                <span style={{ fontSize: 9, fontFamily: "'JetBrains Mono', monospace", color: "rgba(74,158,255,0.4)" }}>tap to preview</span>
              </div>
              <Segmented
                options={[
                  { value: 0.75, label: "0.75×" }, { value: 0.9, label: "0.9×" },
                  { value: 1.0,  label: "1×"    }, { value: 1.15, label: "1.15×" },
                  { value: 1.3,  label: "1.3×"  },
                ]}
                value={settings.rate}
                onChange={(v) => { updateSettings({ rate: v }); triggerLivePreview({ rate: v }); }}
              />
            </div>

            {settings.voiceEngine === "browser" && (
              <div style={{ borderTop: "1px solid rgba(255,255,255,0.05)", paddingTop: 12, marginBottom: 4 }}>
                <div style={{ display: "flex", justifyContent: "space-between", marginBottom: 4 }}>
                  <div style={{ fontSize: 13, color: "#fff", fontWeight: 500 }}>Pitch</div>
                  <span style={{ fontSize: 9, fontFamily: "'JetBrains Mono', monospace", color: "rgba(74,158,255,0.4)" }}>tap to preview</span>
                </div>
                <Segmented
                  options={[
                    { value: 0.8, label: "Low" }, { value: 1.0, label: "Normal" }, { value: 1.2, label: "High" },
                  ]}
                  value={settings.pitch}
                  onChange={(v) => { updateSettings({ pitch: v }); triggerLivePreview({ pitch: v }); }}
                />
              </div>
            )}

            <div style={{ borderTop: "1px solid rgba(255,255,255,0.05)", paddingTop: 12 }}>
              <div style={{ display: "flex", justifyContent: "space-between", marginBottom: 4 }}>
                <div style={{ fontSize: 13, color: "#fff", fontWeight: 500 }}>Volume</div>
                <span style={{ fontSize: 9, fontFamily: "'JetBrains Mono', monospace", color: "rgba(74,158,255,0.4)" }}>tap to preview</span>
              </div>
              <Segmented
                options={[
                  { value: 0.5, label: "50%" }, { value: 0.7, label: "70%" },
                  { value: 0.85, label: "85%" }, { value: 1.0, label: "100%" },
                ]}
                value={settings.volume}
                onChange={(v) => { updateSettings({ volume: v }); triggerLivePreview({ volume: v }); }}
              />
            </div>
          </Card>

          {/* Neural Voice Selection (stream engine) */}
          {settings.voiceEngine !== "browser" && (
            <Card>
              <SectionHeader label="Neural Voice Selection" />
              <p style={{ fontSize: 11, color: "rgba(255,255,255,0.3)", marginBottom: 14, marginTop: -4, lineHeight: 1.6 }}>
                Amazon Neural voices — free, no account needed. Tap ▶ to preview any voice.
              </p>

              <div style={{ display: "flex", flexDirection: "column", gap: 8 }}>
                {STREAM_VOICES.map((v) => {
                  const isSelected = (settings.streamVoiceId || DEFAULT_STREAM_VOICE) === v.id;
                  const isPreviewing = previewingVoice === v.id;
                  return (
                    <div
                      key={v.id}
                      onClick={() => { updateSettings({ streamVoiceId: v.id }); saveStreamVoiceId(v.id); }}
                      style={{
                        display: "flex", alignItems: "center", justifyContent: "space-between",
                        padding: "12px 14px", borderRadius: 12, cursor: "pointer",
                        background: isSelected ? "rgba(74,158,255,0.07)" : "rgba(255,255,255,0.02)",
                        border: isSelected ? "1px solid rgba(74,158,255,0.4)" : "1px solid rgba(255,255,255,0.05)",
                        transition: "all 0.15s ease",
                        animation: "cortexFadeUp 0.15s ease both",
                      }}
                    >
                      <div style={{ flex: 1, minWidth: 0 }}>
                        <div style={{ display: "flex", alignItems: "center", gap: 8, flexWrap: "wrap" }}>
                          <span style={{ fontSize: 13, fontWeight: 500, color: isSelected ? "#4A9EFF" : "rgba(255,255,255,0.85)" }}>
                            {v.label}
                          </span>
                          <span style={{
                            fontSize: 8, fontFamily: "monospace", fontWeight: 700,
                            padding: "1px 5px", borderRadius: 3,
                            background: "rgba(57,255,20,0.08)", border: "1px solid rgba(57,255,20,0.2)", color: "#39FF14",
                          }}>
                            NEURAL
                          </span>
                          <span style={{ fontSize: 10, fontFamily: "'JetBrains Mono', monospace", color: "rgba(255,255,255,0.3)" }}>
                            {v.gender === "M" ? "♂" : "♀"} {v.accent}
                          </span>
                        </div>
                        <div style={{ fontSize: 10, fontFamily: "'JetBrains Mono', monospace", color: "rgba(255,255,255,0.25)", marginTop: 2 }}>
                          {v.note}
                        </div>
                      </div>

                      <button
                        onClick={(e) => {
                          e.stopPropagation();
                          if (isPreviewing) {
                            cancelSpeechRef.current?.();
                            cancelSpeechRef.current = null;
                            setPreviewingVoice(null);
                          } else {
                            cancelSpeechRef.current?.();
                            cancelSpeechRef.current = null;
                            setPreviewingVoice(v.id);
                            const phrase = `Hi, I'm ${v.label}. Cortex is online.`;
                            const cancel = streamSpeak(phrase, {
                              voiceId: v.id,
                              rate: settings.rate || 1.0,
                              volume: settings.volume ?? 1.0,
                              onEnd:   () => { if (mountedRef.current) setPreviewingVoice(null); },
                              onError: () => { if (mountedRef.current) setPreviewingVoice(null); },
                            });
                            cancelSpeechRef.current = cancel;
                          }
                        }}
                        style={{
                          display: "flex", alignItems: "center", gap: 5,
                          marginLeft: 10, padding: "6px 10px", borderRadius: 8,
                          fontSize: 10, fontFamily: "'JetBrains Mono', monospace",
                          background: isPreviewing ? "rgba(74,158,255,0.12)" : "rgba(255,255,255,0.05)",
                          border: isPreviewing ? "1px solid rgba(74,158,255,0.35)" : "1px solid rgba(255,255,255,0.08)",
                          color: isPreviewing ? "#4A9EFF" : "rgba(255,255,255,0.45)",
                          cursor: "pointer", flexShrink: 0,
                        }}
                      >
                        <i className={`fa-solid ${isPreviewing ? "fa-stop" : "fa-play"}`} style={{ fontSize: 8, animation: isPreviewing ? "cortexStatusDot 1s infinite" : "none" }} />
                        {isPreviewing ? "Stop" : "Try"}
                      </button>
                    </div>
                  );
                })}
              </div>
            </Card>
          )}

          {/* Browser voice list */}
          {settings.voiceEngine === "browser" && (
            <Card>
              <div style={{ display: "flex", alignItems: "center", justifyContent: "space-between", marginBottom: 14 }}>
                <SectionHeader label="Device Voice Selection" />
                <button
                  onClick={() => {
                    loadVoices().then(() => {
                      setAvailableVoices(getAvailableVoices());
                      toast.success("Voice list refreshed", { duration: 1500 });
                    });
                  }}
                  style={{
                    display: "flex", alignItems: "center", gap: 5,
                    fontSize: 9, fontFamily: "'JetBrains Mono', monospace",
                    color: "rgba(74,158,255,0.5)", cursor: "pointer",
                    background: "none", border: "none", padding: 0,
                    transition: "color 0.15s",
                  }}
                  onMouseEnter={(e) => { e.currentTarget.style.color = "#4A9EFF"; }}
                  onMouseLeave={(e) => { e.currentTarget.style.color = "rgba(74,158,255,0.5)"; }}
                >
                  <i className="fa-solid fa-rotate-right" style={{ fontSize: 8 }} />
                  Refresh
                </button>
              </div>

              <SettingRow label="Auto-Select Best Voice" desc="Automatically choose highest quality available">
                <Toggle
                  value={settings.autoSelectBestVoice}
                  onChange={(v) => {
                    updateSettings({ autoSelectBestVoice: v });
                    if (v) {
                      const best = getBestVoice();
                      if (best) {
                        savePreferredVoiceName(best.name);
                        updateSettings({ autoSelectBestVoice: v, preferredVoiceName: best.name });
                      }
                    }
                  }}
                />
              </SettingRow>

              {availableVoices.length === 0 ? (
                <p style={{ fontSize: 11, color: "rgba(255,255,255,0.3)", textAlign: "center", padding: "20px 0", fontFamily: "'JetBrains Mono', monospace" }}>
                  No voices detected. Try refreshing or check browser permissions.
                </p>
              ) : (
                <div style={{ display: "flex", flexDirection: "column", gap: 8, marginTop: 12 }}>
                  {availableVoices.map((v) => {
                    const isSelected = selectedVoiceName === v.name;
                    const isPreviewing = previewingVoice === v.name;
                    return (
                      <div
                        key={v.name}
                        onClick={() => {
                          updateSettings({ preferredVoiceName: v.name, autoSelectBestVoice: false });
                          savePreferredVoiceName(v.name);
                        }}
                        style={{
                          display: "flex", alignItems: "center", justifyContent: "space-between",
                          padding: "10px 12px", borderRadius: 10, cursor: "pointer",
                          background: isSelected ? "rgba(74,158,255,0.06)" : "rgba(255,255,255,0.02)",
                          border: isSelected ? "1px solid rgba(74,158,255,0.35)" : "1px solid rgba(255,255,255,0.05)",
                          transition: "all 0.15s ease",
                          animation: "cortexFadeUp 0.15s ease both",
                        }}
                      >
                        <div style={{ flex: 1, minWidth: 0 }}>
                          <div style={{ display: "flex", alignItems: "center", gap: 6, flexWrap: "wrap" }}>
                            <span style={{
                              fontSize: 12, fontWeight: 500,
                              color: isSelected ? "#4A9EFF" : "rgba(255,255,255,0.8)",
                              overflow: "hidden", textOverflow: "ellipsis", whiteSpace: "nowrap",
                            }}>
                              {v.name}
                            </span>
                            <QualityBadge quality={v.quality} />
                            {v.default && <span style={{ fontSize: 8, fontFamily: "monospace", color: "rgba(255,255,255,0.3)" }}>DEFAULT</span>}
                          </div>
                          <div style={{ fontSize: 10, fontFamily: "'JetBrains Mono', monospace", color: "rgba(255,255,255,0.25)", marginTop: 2 }}>
                            {v.engine} · {v.lang} · {v.local ? "Local" : "Remote"}
                          </div>
                        </div>

                        <button
                          onClick={(e) => { e.stopPropagation(); handleVoicePreview(v.name); }}
                          style={{
                            display: "flex", alignItems: "center", gap: 5,
                            marginLeft: 10, padding: "5px 10px", borderRadius: 8,
                            fontSize: 9, fontFamily: "'JetBrains Mono', monospace",
                            background: isPreviewing ? "rgba(74,158,255,0.12)" : "rgba(255,255,255,0.04)",
                            border: isPreviewing ? "1px solid rgba(74,158,255,0.35)" : "1px solid rgba(255,255,255,0.07)",
                            color: isPreviewing ? "#4A9EFF" : "rgba(255,255,255,0.4)",
                            cursor: "pointer", flexShrink: 0,
                          }}
                        >
                          <i className={`fa-solid ${isPreviewing ? "fa-stop" : "fa-play"}`} style={{ fontSize: 8 }} />
                          {isPreviewing ? "Stop" : "▶"}
                        </button>
                      </div>
                    );
                  })}
                </div>
              )}
            </Card>
          )}

          <div style={{ height: 24 }} />
        </div>
      )}
    </div>
  );
}
