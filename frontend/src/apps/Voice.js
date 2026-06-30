import React, { useCallback, useEffect, useRef, useState } from "react";
import { aiApi } from "../lib/api";
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
import { parseActions, executeActions } from "../lib/cortexActions";
import { useOS } from "../context/OSContext";
import { toast } from "sonner";
import { normalizeTranscript } from "../lib/speechCorrection.js";

// ── Constants ──────────────────────────────────────────────────────────────
const VOICE_SESSION_KEY   = "cortex_voice_history";
const VOICE_SETTINGS_KEY  = "cortex_voice_settings_v2";
const MAX_HISTORY_PAIRS   = 15; // max user+assistant pairs kept

const DEFAULT_VOICE_SETTINGS = {
  continuousConversation: true,
  conversationTimeout: "never", // "never" | "5" | "15" | "30" | "60" (minutes)
  autoResumeListen: true,
  wakeWordEnabled: false,
  voiceFeedback: true,
  preferredVoiceName: null,
  rate: 1.0,
  pitch: 1.0,
  volume: 1.0,
  autoSelectBestVoice: true,
  ttsEngine: "browser", // "browser" (always)
};

const TIMEOUT_OPTIONS = [
  { value: "never", label: "Never"   },
  { value: "5",     label: "5 min"   },
  { value: "15",    label: "15 min"  },
  { value: "30",    label: "30 min"  },
  { value: "60",    label: "1 hour"  },
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
    if (!raw) return { ...DEFAULT_VOICE_SETTINGS };
    return { ...DEFAULT_VOICE_SETTINGS, ...JSON.parse(raw) };
  } catch { return { ...DEFAULT_VOICE_SETTINGS }; }
}

function saveSettings(s) {
  try { localStorage.setItem(VOICE_SETTINGS_KEY, JSON.stringify(s)); } catch {}
}

// ── Markdown stripper ──────────────────────────────────────────────────────
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

// ── Emotion detector ───────────────────────────────────────────────────────
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

// ── New conversation reset phrases ────────────────────────────────────────
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

// ── Real-time waveform visualizer ──────────────────────────────────────────
const BAR_SCALES = [0.35, 0.65, 1, 0.8, 0.55, 0.75, 0.95, 0.6, 0.4];

function WaveVisualizer({ color, active, useCssAnimation }) {
  return (
    <div className="flex items-end gap-[3px]" style={{ height: 36 }}>
      {BAR_SCALES.map((scale, i) => (
        <div
          key={i}
          style={{
            width: 4, borderRadius: 2, backgroundColor: color,
            height: active ? `${Math.round(scale * 34)}px` : 4,
            opacity: active ? 0.85 : 0.2,
            animation: active && useCssAnimation
              ? `cortexWave 0.65s ease-in-out ${(i * 0.08).toFixed(2)}s infinite alternate`
              : "none",
            transition: active ? "none" : "height 0.35s ease, opacity 0.35s ease",
          }}
        />
      ))}
    </div>
  );
}

// ── Orb component — animated voice orb ───────────────────────────────────
function VoiceOrb({ phase }) {
  const colors = {
    idle:      { inner: "#00F0FF", outer: "rgba(0,240,255,0.15)", glow: "0 0 40px rgba(0,240,255,0.3)"  },
    listening: { inner: "#FF003C", outer: "rgba(255,0,60,0.2)",   glow: "0 0 60px rgba(255,0,60,0.5)"   },
    thinking:  { inner: "#CF9EFF", outer: "rgba(207,158,255,0.2)", glow: "0 0 50px rgba(207,158,255,0.4)" },
    speaking:  { inner: "#00F0FF", outer: "rgba(0,240,255,0.25)", glow: "0 0 60px rgba(0,240,255,0.5)"  },
    muted:     { inner: "#64748B", outer: "rgba(100,116,139,0.1)", glow: "none"                          },
  };
  const c = colors[phase] || colors.idle;
  const pulse = phase === "listening" || phase === "speaking";

  return (
    <div
      className="relative flex items-center justify-center"
      style={{ width: 140, height: 140 }}
    >
      {/* Outer glow ring */}
      <div
        style={{
          position: "absolute",
          width: "100%", height: "100%",
          borderRadius: "50%",
          background: c.outer,
          boxShadow: c.glow,
          animation: pulse ? "orbPulse 1.5s ease-in-out infinite" : "none",
          transition: "background 0.4s ease, box-shadow 0.4s ease",
        }}
      />
      {/* Inner orb */}
      <div
        style={{
          position: "relative",
          width: 96, height: 96,
          borderRadius: "50%",
          background: `radial-gradient(circle at 35% 35%, ${c.inner}cc, ${c.inner}44 60%, transparent)`,
          border: `2px solid ${c.inner}55`,
          boxShadow: c.glow,
          transition: "all 0.4s ease",
          display: "flex",
          alignItems: "center",
          justifyContent: "center",
        }}
      >
        <OrbIcon phase={phase} color={c.inner} />
      </div>
    </div>
  );
}

function OrbIcon({ phase, color }) {
  const iconMap = {
    idle:      "fa-microphone",
    listening: "fa-stop",
    thinking:  "fa-circle-notch fa-spin",
    speaking:  "fa-volume-high",
    muted:     "fa-microphone-slash",
  };
  return (
    <i
      className={`fa-solid ${iconMap[phase] || "fa-microphone"} text-2xl`}
      style={{ color, filter: `drop-shadow(0 0 6px ${color})` }}
    />
  );
}

// ── Phase label ──────────────────────────────────────────────────────────
const PHASE_LABELS = {
  idle:      "Tap to speak",
  listening: "Listening…",
  thinking:  "Thinking…",
  speaking:  "Speaking…",
  muted:     "Muted",
};

const PHASE_COLORS = {
  idle:      "#00F0FF",
  listening: "#FF003C",
  thinking:  "#CF9EFF",
  speaking:  "#00F0FF",
  muted:     "#64748B",
};

// ── Toggle ────────────────────────────────────────────────────────────────
function Toggle({ value, onChange, disabled }) {
  return (
    <button
      onClick={() => !disabled && onChange(!value)}
      disabled={disabled}
      style={{
        width: 44, height: 26, borderRadius: 13, flexShrink: 0,
        background: value ? "#00F0FF" : "rgba(255,255,255,0.12)",
        border: "none", cursor: disabled ? "not-allowed" : "pointer",
        position: "relative", transition: "background 0.22s ease",
        boxShadow: value ? "0 0 12px rgba(0,240,255,0.5)" : "none",
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
      style={{ borderBottom: "1px solid rgba(255,255,255,0.06)" }}
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
              ? "1px solid rgba(0,240,255,0.6)"
              : "1px solid rgba(255,255,255,0.10)",
            background: value === opt.value
              ? "rgba(0,240,255,0.12)" : "rgba(255,255,255,0.04)",
            color: value === opt.value ? "#00F0FF" : "rgba(255,255,255,0.55)",
            cursor: "pointer", transition: "all 0.18s ease",
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
    Neural:   { bg: "rgba(0,240,255,0.12)",  border: "rgba(0,240,255,0.35)",  color: "#00F0FF"  },
    Enhanced: { bg: "rgba(57,255,20,0.10)",  border: "rgba(57,255,20,0.30)",  color: "#39FF14"  },
    Standard: { bg: "rgba(255,255,255,0.06)",border: "rgba(255,255,255,0.15)",color: "rgba(255,255,255,0.55)" },
    Basic:    { bg: "rgba(255,160,0,0.08)",  border: "rgba(255,160,0,0.25)",  color: "#FFA000"  },
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

// ── Main component ────────────────────────────────────────────────────────
export default function Voice() {
  const [phase, setPhase]                         = useState("idle");
  const [transcript, setTranscript]               = useState("");
  const [interimText, setInterimText]             = useState("");
  const [conversation, setConversation]           = useState(loadVoiceHistory);
  const [settings, setSettings]                   = useState(loadSettings);
  const [activeView, setActiveView]               = useState("voice"); // "voice" | "settings"
  const [availableVoices, setAvailableVoices]     = useState([]);
  const [previewingVoice, setPreviewingVoice]     = useState(null);
  const [voiceError, setVoiceError]               = useState(null);
  const [detectedEmotion, setDetectedEmotion]     = useState("neutral");
  const [sessionTurnCount, setSessionTurnCount]   = useState(0);
  const [lastActivityTime, setLastActivityTime]   = useState(Date.now());
  const [wakeWordActive, setWakeWordActive]        = useState(false);

  const { openApp } = useOS();

  const mountedRef         = useRef(true);
  const startedRef         = useRef(false);
  const recogRef           = useRef(null);
  const transcriptRef      = useRef("");
  const finalizedUntilRef  = useRef(0);
  const abortRef           = useRef(null);
  const cancelSpeechRef    = useRef(null);      // cancel() for current browser TTS
  const conversationRef    = useRef([]);         // keeps in sync for callbacks
  const settingsRef        = useRef(settings);
  const autoListenTimerRef = useRef(null);
  const timeoutTimerRef    = useRef(null);
  const wakeRecogRef       = useRef(null);
  const phaseRef           = useRef("idle");
  const startListeningRef  = useRef(null);       // populated after startListening is defined

  // Keep refs in sync
  useEffect(() => { conversationRef.current = conversation; }, [conversation]);
  useEffect(() => { settingsRef.current = settings; }, [settings]);
  useEffect(() => { phaseRef.current = phase; }, [phase]);

  // ── Load browser voices on mount ─────────────────────────────────────────
  useEffect(() => {
    mountedRef.current = true;

    loadVoices().then(() => {
      if (!mountedRef.current) return;
      const voices = getAvailableVoices();
      setAvailableVoices(voices);

      // If auto-select best and no preference saved → pick best automatically
      if (settings.autoSelectBestVoice && !settings.preferredVoiceName) {
        const best = getBestVoice();
        if (best) {
          savePreferredVoiceName(best.name);
          updateSettings({ preferredVoiceName: best.name });
        }
      }
    });

    // Also refresh voices when the list changes (some browsers load async)
    const onChanged = () => {
      if (!mountedRef.current) return;
      setAvailableVoices(getAvailableVoices());
    };
    window.speechSynthesis?.addEventListener("voiceschanged", onChanged);

    return () => {
      mountedRef.current = false;
      window.speechSynthesis?.removeEventListener("voiceschanged", onChanged);
      clearTimeout(autoListenTimerRef.current);
      clearTimeout(timeoutTimerRef.current);
      cancelSpeechRef.current?.();
      abortRef.current?.abort();
      stopWakeWord();
    };
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  // ── Conversation timeout management ─────────────────────────────────────
  useEffect(() => {
    clearTimeout(timeoutTimerRef.current);
    const mins = parseInt(settings.conversationTimeout, 10);
    if (!mins || isNaN(mins)) return;
    timeoutTimerRef.current = setTimeout(() => {
      if (!mountedRef.current) return;
      resetConversation(true);
      toast("Conversation timed out — starting fresh", {
        duration: 3000, style: { fontSize: 12, padding: "6px 14px" },
      });
    }, mins * 60 * 1000);
    return () => clearTimeout(timeoutTimerRef.current);
  }, [lastActivityTime, settings.conversationTimeout]);

  // ── Settings helpers ──────────────────────────────────────────────────────
  const updateSettings = useCallback((patch) => {
    setSettings((prev) => {
      const next = { ...prev, ...patch };
      saveSettings(next);
      return next;
    });
  }, []);

  // ── Conversation helpers ──────────────────────────────────────────────────
  const appendToConversation = useCallback((role, content) => {
    setConversation((prev) => {
      const next = [...prev, { role, content }];
      // Keep at most MAX_HISTORY_PAIRS * 2 messages
      const trimmed = next.slice(-(MAX_HISTORY_PAIRS * 2));
      saveVoiceHistory(trimmed);
      return trimmed;
    });
  }, []);

  const resetConversation = useCallback((silent = false) => {
    setConversation([]);
    saveVoiceHistory([]);
    setSessionTurnCount(0);
    setTranscript("");
    setInterimText("");
    setDetectedEmotion("neutral");
    if (!silent) {
      toast.success("Conversation cleared — fresh start", {
        duration: 2000, style: { fontSize: 12 },
      });
    }
  }, []);

  // ── Stop speaking ─────────────────────────────────────────────────────────
  const stopSpeaking = useCallback(() => {
    clearTimeout(autoListenTimerRef.current);
    cancelSpeechRef.current?.();
    cancelSpeechRef.current = null;
    cancelSpeech(); // belt-and-suspenders
    if (mountedRef.current) {
      setPhase("idle");
      setDetectedEmotion("neutral");
    }
  }, []);

  // ── Browser TTS speak ─────────────────────────────────────────────────────
  const speakBrowser = useCallback((rawText) => {
    if (!rawText?.trim()) return;
    const cleanText = stripMarkdown(rawText);
    if (!cleanText) return;

    const s = settingsRef.current;

    if (!isBrowserTTSSupported()) {
      setVoiceError("SpeechSynthesis is not supported in this browser.");
      if (mountedRef.current) setPhase("idle");
      return;
    }

    setDetectedEmotion(detectEmotion(rawText));
    if (mountedRef.current) setPhase("speaking");

    // Find preferred voice object
    const preferredName = s.preferredVoiceName || getPreferredVoiceName();
    const allRaw = window.speechSynthesis?.getVoices() || [];
    const preferredVoice = preferredName
      ? allRaw.find((v) => v.name === preferredName) || null
      : null;

    let retryCount = 0;
    const MAX_RETRIES = 2;

    const attemptSpeak = (voiceObj) => {
      const cancel = browserSpeak(cleanText, {
        voice: voiceObj,
        rate: s.rate || 1.0,
        pitch: s.pitch || 1.0,
        volume: s.volume ?? 1.0,
        onStart: () => {
          if (mountedRef.current) setPhase("speaking");
        },
        onEnd: () => {
          cancelSpeechRef.current = null;
          if (!mountedRef.current) return;
          setPhase("idle");
          setDetectedEmotion("neutral");

          // Auto-resume listening after speaking (via ref to avoid stale closure)
          if (settingsRef.current.autoResumeListen && settingsRef.current.continuousConversation) {
            clearTimeout(autoListenTimerRef.current);
            autoListenTimerRef.current = setTimeout(() => {
              if (mountedRef.current && !startedRef.current && phaseRef.current === "idle") {
                startListeningRef.current?.();
              }
            }, 900);
          }
        },
        onError: (err) => {
          cancelSpeechRef.current = null;
          if (!mountedRef.current) return;

          // Retry with next-best voice
          if (retryCount < MAX_RETRIES) {
            retryCount++;
            const voices = getAvailableVoices();
            const fallback = voices[retryCount]?.voice || null;
            console.warn(`[BrowserTTS] Error (${err.message}) — retrying with ${fallback?.name || "system default"}`);
            attemptSpeak(fallback);
          } else {
            console.error("[BrowserTTS] All voice attempts failed:", err.message);
            setVoiceError("Voice synthesis failed — check browser voice support.");
            if (mountedRef.current) setPhase("idle");
          }
        },
      });
      cancelSpeechRef.current = cancel;
    };

    // Cancel any previous speech
    cancelSpeechRef.current?.();
    cancelSpeechRef.current = null;

    attemptSpeak(preferredVoice);
  }, []);

  // ── STT: start listening ──────────────────────────────────────────────────
  const startListening = useCallback(() => {
    const SR = window.SpeechRecognition || window.webkitSpeechRecognition;
    if (!SR) {
      toast.error("Speech recognition is not supported in this browser.");
      return;
    }
    if (startedRef.current) return;

    clearTimeout(autoListenTimerRef.current);

    // If currently speaking → interrupt
    if (phaseRef.current === "speaking") {
      cancelSpeechRef.current?.();
      cancelSpeechRef.current = null;
      cancelSpeech();
    }

    const r = new SR();
    r.continuous      = false;
    r.interimResults  = true;
    r.lang            = "en-US";
    r.maxAlternatives = 3;

    transcriptRef.current    = "";
    finalizedUntilRef.current = 0;
    setTranscript("");
    setInterimText("");
    setVoiceError(null);
    setPhase("listening");
    startedRef.current = true;

    r.onresult = (e) => {
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
      startedRef.current = false;
      if (mountedRef.current) {
        setPhase("idle");
        setInterimText("");
      }
      if (e.error === "not-allowed") {
        setVoiceError("Microphone permission denied — please allow access and try again.");
      } else if (e.error !== "aborted" && e.error !== "no-speech") {
        toast.error(`Microphone error: ${e.error}`);
      }
    };

    r.onend = async () => {
      startedRef.current = false;
      const text = transcriptRef.current.trim();
      if (mountedRef.current) setInterimText("");
      if (!text) {
        if (mountedRef.current) setPhase("idle");
        return;
      }
      if (!mountedRef.current) return;

      // Check for explicit reset phrases
      if (isResetPhrase(text)) {
        resetConversation();
        if (mountedRef.current) setPhase("idle");
        return;
      }

      setLastActivityTime(Date.now());
      setPhase("thinking");

      // Cortex Actions
      const detectedActions = parseActions(text);
      if (detectedActions.length > 0) {
        executeActions(detectedActions, { openApp }).catch(() => {});
      }

      abortRef.current?.abort();
      const ctrl = new AbortController();
      abortRef.current = ctrl;

      // Build history to send to backend (last 20 messages = 10 pairs)
      const historyToSend = conversationRef.current.slice(-20).map((m) => ({
        role: m.role,
        content: m.content,
      }));

      try {
        let fullResponse = "";
        await aiApi.chatStreamResilient(
          {
            session_id: "voice",
            message: text,
            provider: "gemini",
            model: "gemini-2.5-flash",
            history: historyToSend,
          },
          (delta) => { fullResponse += delta; },
          null,
          ctrl.signal,
        );
        if (!mountedRef.current || ctrl.signal.aborted) return;

        // Persist both turns to conversation history
        appendToConversation("user", text);
        appendToConversation("assistant", fullResponse);
        setSessionTurnCount((n) => n + 1);

        // Speak the response
        if (settingsRef.current.voiceFeedback) {
          speakBrowser(fullResponse);
        } else {
          if (mountedRef.current) setPhase("idle");
        }
      } catch (err) {
        if (err?.name === "AbortError") return;
        if (!mountedRef.current) return;
        setPhase("idle");
        if (err?.status === 429) {
          toast.error("Cortex is rate-limited. Please wait a moment.");
        } else {
          toast.error("Cortex voice response failed. Please try again.");
        }
      }
    };

    recogRef.current = r;
    try { r.start(); } catch (e) {
      startedRef.current = false;
      setPhase("idle");
      toast.error("Failed to start microphone. Try again.");
    }
  }, [speakBrowser, openApp, appendToConversation, resetConversation]);

  // Keep startListeningRef in sync so speakBrowser can call it without stale closure
  useEffect(() => { startListeningRef.current = startListening; }, [startListening]);

  const stopListening = useCallback(() => {
    recogRef.current?.stop();
    startedRef.current = false;
    if (mountedRef.current) setPhase("idle");
  }, []);

  // ── Wake word detection ────────────────────────────────────────────────────
  const startWakeWord = useCallback(() => {
    const SR = window.SpeechRecognition || window.webkitSpeechRecognition;
    if (!SR) return;
    if (wakeRecogRef.current) return;

    const r = new SR();
    r.continuous    = true;
    r.interimResults = false;
    r.lang          = "en-US";

    r.onresult = (e) => {
      for (let i = e.resultIndex; i < e.results.length; i++) {
        const transcript = (e.results[i][0]?.transcript || "").toLowerCase();
        if (transcript.includes("hey cortex") || transcript.includes("hi cortex")) {
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
      // Restart on error
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
        setTimeout(() => {
          if (mountedRef.current) startWakeWord();
        }, 500);
      }
    };

    wakeRecogRef.current = r;
    try { r.start(); } catch { wakeRecogRef.current = null; }
  }, [startListening]);

  const stopWakeWord = useCallback(() => {
    if (wakeRecogRef.current) {
      wakeRecogRef.current.onend = null;
      wakeRecogRef.current.onerror = null;
      try { wakeRecogRef.current.stop(); } catch {}
      wakeRecogRef.current = null;
    }
  }, []);

  // Watch wake word setting toggle
  useEffect(() => {
    if (settings.wakeWordEnabled) {
      startWakeWord();
    } else {
      stopWakeWord();
    }
  }, [settings.wakeWordEnabled, startWakeWord, stopWakeWord]);

  // ── Main button click ─────────────────────────────────────────────────────
  const handleMicClick = useCallback(() => {
    if (phase === "listening") {
      stopListening();
    } else if (phase === "speaking") {
      stopSpeaking();
      // After stopping, start listening immediately
      setTimeout(() => {
        if (mountedRef.current) startListening();
      }, 150);
    } else if (phase === "thinking") {
      // Cancel the AI request
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

    browserSpeak("Hello, I'm Cortex. Nice to meet you.", {
      voice: voiceObj,
      rate: settingsRef.current.rate || 1.0,
      pitch: settingsRef.current.pitch || 1.0,
      volume: settingsRef.current.volume ?? 1.0,
      onEnd: () => {
        if (mountedRef.current) setPreviewingVoice(null);
      },
      onError: () => {
        if (mountedRef.current) {
          setPreviewingVoice(null);
          toast.error(`Voice preview failed for "${voiceName}"`, { duration: 2000 });
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

  // ── Derived state ──────────────────────────────────────────────────────────
  const isListening = phase === "listening";
  const isSpeaking  = phase === "speaking";
  const isThinking  = phase === "thinking";
  const isIdle      = phase === "idle";

  const lastUserMsg      = [...conversation].reverse().find((m) => m.role === "user");
  const lastAssistantMsg = [...conversation].reverse().find((m) => m.role === "assistant");

  const selectedVoiceName = settings.preferredVoiceName || getPreferredVoiceName();
  const selectedVoiceInfo = availableVoices.find((v) => v.name === selectedVoiceName);

  return (
    <div className="flex flex-col h-full text-white overflow-hidden" data-testid="voice-app">
      <style>{`
        @keyframes cortexWave {
          from { transform: scaleY(0.25); }
          to   { transform: scaleY(1.15); }
        }
        @keyframes orbPulse {
          0%, 100% { transform: scale(1);    opacity: 1;    }
          50%       { transform: scale(1.08); opacity: 0.85; }
        }
        @keyframes fadeSlideUp {
          from { opacity: 0; transform: translateY(8px); }
          to   { opacity: 1; transform: translateY(0); }
        }
        @keyframes wakeFlash {
          0%, 100% { opacity: 0; }
          50%       { opacity: 1; }
        }
      `}</style>

      {/* ── Tab bar ──────────────────────────────────────────────────────── */}
      <div
        className="flex border-b"
        style={{
          borderColor: "rgba(255,255,255,0.08)",
          background: "rgba(0,0,0,0.3)",
          backdropFilter: "blur(12px)",
          flexShrink: 0,
        }}
      >
        {["voice", "settings"].map((tab) => (
          <button
            key={tab}
            onClick={() => setActiveView(tab)}
            style={{
              flex: 1, padding: "12px 0",
              fontSize: 11, fontFamily: "'JetBrains Mono', monospace",
              letterSpacing: "0.1em", textTransform: "uppercase",
              color: activeView === tab ? "#00F0FF" : "rgba(255,255,255,0.3)",
              borderBottom: activeView === tab
                ? "2px solid #00F0FF" : "2px solid transparent",
              background: "none", border: "none",
              borderBottom: activeView === tab ? "2px solid #00F0FF" : "2px solid transparent",
              cursor: "pointer", transition: "all 0.2s ease",
              WebkitTapHighlightColor: "transparent",
            }}
          >
            {tab === "voice" ? "// Voice" : "// Settings"}
          </button>
        ))}
      </div>

      {/* ── VOICE TAB ────────────────────────────────────────────────────── */}
      {activeView === "voice" && (
        <div className="flex flex-col items-center flex-1 overflow-y-auto p-5 sm:p-8">

          {/* Header */}
          <div className="mono-label mb-1 opacity-60">// Cortex Voice Interface</div>
          <h2 className="font-heading text-xl sm:text-2xl font-bold mb-1 text-center">
            Speak to Cortex
          </h2>

          {/* Conversation info */}
          <div className="flex items-center gap-3 mb-5">
            {conversation.length > 0 ? (
              <div
                className="flex items-center gap-1.5 text-[10px] font-mono px-2.5 py-1 rounded-full border"
                style={{ borderColor: "rgba(0,240,255,0.25)", background: "rgba(0,240,255,0.06)", color: "rgba(0,240,255,0.7)" }}
              >
                <i className="fa-solid fa-comments text-[9px]" />
                {Math.ceil(conversation.length / 2)} turn{conversation.length !== 2 ? "s" : ""}
              </div>
            ) : (
              <div className="text-[10px] font-mono text-slate-600">No conversation yet</div>
            )}

            {conversation.length > 0 && (
              <button
                onClick={resetConversation}
                className="flex items-center gap-1 text-[10px] font-mono px-2.5 py-1 rounded-full border transition-all"
                style={{
                  borderColor: "rgba(255,0,60,0.3)", background: "rgba(255,0,60,0.06)",
                  color: "rgba(255,0,60,0.6)", cursor: "pointer",
                }}
                onMouseEnter={(e) => { e.currentTarget.style.background = "rgba(255,0,60,0.14)"; }}
                onMouseLeave={(e) => { e.currentTarget.style.background = "rgba(255,0,60,0.06)"; }}
                title="Start a new conversation"
              >
                <i className="fa-solid fa-plus-circle text-[9px]" />
                New Chat
              </button>
            )}

            {/* Wake word indicator */}
            {settings.wakeWordEnabled && (
              <div
                className="flex items-center gap-1 text-[10px] font-mono px-2.5 py-1 rounded-full border"
                style={{
                  borderColor: wakeWordActive ? "rgba(207,158,255,0.6)" : "rgba(207,158,255,0.2)",
                  background: wakeWordActive ? "rgba(207,158,255,0.15)" : "rgba(207,158,255,0.05)",
                  color: wakeWordActive ? "#CF9EFF" : "rgba(207,158,255,0.4)",
                  animation: wakeWordActive ? "wakeFlash 0.3s ease" : "none",
                }}
              >
                <i className="fa-solid fa-waveform text-[9px]" />
                Hey Cortex
              </div>
            )}
          </div>

          {/* Voice Orb */}
          <VoiceOrb phase={phase} />

          {/* Phase label + waveform */}
          <div className="flex flex-col items-center gap-2 my-4">
            <p
              className="text-sm font-mono font-semibold tracking-wide transition-all duration-300"
              style={{ color: PHASE_COLORS[phase] || "#00F0FF" }}
            >
              {PHASE_LABELS[phase] || "Tap to speak"}
            </p>
            <WaveVisualizer
              color={PHASE_COLORS[phase] || "#00F0FF"}
              active={isListening || isSpeaking}
              useCssAnimation={isListening}
            />
          </div>

          {/* Status sub-label */}
          {isSpeaking && settings.autoResumeListen && settings.continuousConversation && (
            <p className="text-[10px] font-mono text-slate-500 mb-4 text-center">
              Will auto-listen after speaking
            </p>
          )}
          {isListening && (
            <p className="text-[10px] font-mono text-slate-500 mb-4 text-center">
              Tap to stop • or just stop speaking
            </p>
          )}
          {isThinking && (
            <p className="text-[10px] font-mono text-slate-500 mb-4 text-center">
              Tap to cancel
            </p>
          )}
          {isSpeaking && (
            <p className="text-[10px] font-mono text-slate-500 mb-4 text-center">
              Tap to interrupt and speak
            </p>
          )}
          {!isListening && !isSpeaking && !isThinking && (
            <div className="mb-4" />
          )}

          {/* Selected voice indicator */}
          {selectedVoiceInfo && (
            <div
              className="flex items-center gap-2 text-[10px] font-mono mb-3 px-3 py-1.5 rounded-full border"
              style={{
                borderColor: "rgba(255,255,255,0.1)",
                background: "rgba(255,255,255,0.04)",
                color: "rgba(255,255,255,0.4)",
              }}
            >
              <i className="fa-solid fa-volume-high text-[9px]" />
              <span>{selectedVoiceInfo.name}</span>
              <QualityBadge quality={selectedVoiceInfo.quality} />
            </div>
          )}

          {/* Error message */}
          {voiceError && (
            <div
              className="flex items-center gap-2 text-[11px] font-mono px-3 py-2 rounded-lg border mb-4 max-w-sm text-center"
              style={{
                borderColor: "rgba(255,160,0,0.4)",
                background: "rgba(255,160,0,0.08)",
                color: "#FFA000",
              }}
            >
              <i className="fa-solid fa-triangle-exclamation text-[10px]" />
              {voiceError}
            </div>
          )}

          {/* Current transcript */}
          {(transcript || interimText) && (
            <div
              className="w-full max-w-lg rounded-xl p-4 mb-3"
              style={{
                background: "rgba(255,255,255,0.04)",
                border: "1px solid rgba(255,255,255,0.08)",
                animation: "fadeSlideUp 0.2s ease",
              }}
            >
              <div className="mono-label mb-1 text-[9px]">// You said</div>
              <p className="text-sm text-white leading-relaxed">
                {transcript}
                {interimText && (
                  <span className="text-slate-500 italic">
                    {transcript ? " " : ""}{interimText}
                  </span>
                )}
              </p>
            </div>
          )}

          {/* Conversation history (last few turns) */}
          {conversation.length > 0 && (
            <div className="w-full max-w-lg mb-3" style={{ animation: "fadeSlideUp 0.25s ease" }}>
              {/* Show last 2 exchanges (4 messages) */}
              {conversation.slice(-4).map((msg, i) => (
                <div
                  key={i}
                  className="mb-2 rounded-xl p-3"
                  style={{
                    background: msg.role === "user"
                      ? "rgba(0,240,255,0.05)"
                      : "rgba(207,158,255,0.05)",
                    border: msg.role === "user"
                      ? "1px solid rgba(0,240,255,0.12)"
                      : "1px solid rgba(207,158,255,0.12)",
                    animation: `fadeSlideUp 0.2s ease ${i * 0.04}s both`,
                  }}
                >
                  <div
                    className="mono-label mb-1 text-[9px]"
                    style={{ color: msg.role === "user" ? "#00F0FF" : "#CF9EFF" }}
                  >
                    // {msg.role === "user" ? "You" : "Cortex"}
                  </div>
                  <p className="text-xs text-slate-200 leading-relaxed whitespace-pre-wrap line-clamp-4">
                    {msg.content.length > 280 ? msg.content.slice(0, 280) + "…" : msg.content}
                  </p>
                </div>
              ))}

              {/* Replay last response */}
              {lastAssistantMsg && !isSpeaking && !isListening && !isThinking && (
                <button
                  onClick={replayLast}
                  className="flex items-center gap-1.5 text-[10px] font-mono mt-1 transition-colors"
                  style={{ color: "rgba(207,158,255,0.5)" }}
                  onMouseEnter={(e) => { e.currentTarget.style.color = "#CF9EFF"; }}
                  onMouseLeave={(e) => { e.currentTarget.style.color = "rgba(207,158,255,0.5)"; }}
                >
                  <i className="fa-solid fa-rotate-right text-[9px]" />
                  Replay response
                </button>
              )}
            </div>
          )}

          <div style={{ paddingBottom: 80 }} />
        </div>
      )}

      {/* ── SETTINGS TAB ─────────────────────────────────────────────────── */}
      {activeView === "settings" && (
        <div className="flex-1 overflow-y-auto p-4 sm:p-6">

          {/* ── Conversation Settings ──────────────────────────────────── */}
          <div
            className="rounded-xl p-4 mb-4"
            style={{ background: "rgba(255,255,255,0.03)", border: "1px solid rgba(255,255,255,0.07)" }}
          >
            <div className="mono-label mb-3">// Conversation</div>

            <SettingRow
              label="Continuous Conversation"
              desc="Keep context alive between microphone presses"
            >
              <Toggle
                value={settings.continuousConversation}
                onChange={(v) => updateSettings({ continuousConversation: v })}
              />
            </SettingRow>

            <SettingRow
              label="Auto Resume Listening"
              desc="Automatically listen again after Cortex finishes speaking"
            >
              <Toggle
                value={settings.autoResumeListen}
                onChange={(v) => updateSettings({ autoResumeListen: v })}
                disabled={!settings.continuousConversation}
              />
            </SettingRow>

            <SettingRow label="Voice Feedback" desc="Cortex speaks responses aloud">
              <Toggle
                value={settings.voiceFeedback}
                onChange={(v) => updateSettings({ voiceFeedback: v })}
              />
            </SettingRow>

            <div className="py-2.5" style={{ borderBottom: "1px solid rgba(255,255,255,0.06)" }}>
              <div className="text-sm text-white font-medium mb-1">Conversation Timeout</div>
              <div className="text-xs text-slate-500 mb-2">Auto-reset conversation after inactivity</div>
              <Segmented
                options={TIMEOUT_OPTIONS}
                value={settings.conversationTimeout}
                onChange={(v) => updateSettings({ conversationTimeout: v })}
              />
            </div>

            {conversation.length > 0 && (
              <div className="pt-3">
                <button
                  onClick={() => resetConversation()}
                  className="flex items-center gap-2 text-xs font-mono px-3 py-2 rounded-lg transition-all"
                  style={{
                    background: "rgba(255,0,60,0.06)",
                    border: "1px solid rgba(255,0,60,0.25)",
                    color: "rgba(255,0,60,0.7)", cursor: "pointer",
                  }}
                  onMouseEnter={(e) => { e.currentTarget.style.background = "rgba(255,0,60,0.14)"; }}
                  onMouseLeave={(e) => { e.currentTarget.style.background = "rgba(255,0,60,0.06)"; }}
                >
                  <i className="fa-solid fa-trash text-[10px]" />
                  Clear Conversation History
                  <span className="text-[10px] opacity-60">
                    ({Math.ceil(conversation.length / 2)} turns)
                  </span>
                </button>
              </div>
            )}
          </div>

          {/* ── Wake Word ─────────────────────────────────────────────────── */}
          <div
            className="rounded-xl p-4 mb-4"
            style={{ background: "rgba(255,255,255,0.03)", border: "1px solid rgba(255,255,255,0.07)" }}
          >
            <div className="mono-label mb-3">// Wake Word</div>

            <SettingRow
              label="Hey Cortex"
              desc={'Say "Hey Cortex" to activate without touching the screen'}
            >
              <Toggle
                value={settings.wakeWordEnabled}
                onChange={(v) => updateSettings({ wakeWordEnabled: v })}
              />
            </SettingRow>

            {settings.wakeWordEnabled && (
              <div
                className="mt-2 p-2.5 rounded-lg text-[11px] font-mono"
                style={{ background: "rgba(207,158,255,0.08)", border: "1px solid rgba(207,158,255,0.2)", color: "rgba(207,158,255,0.8)" }}
              >
                <i className="fa-solid fa-circle-info mr-1.5" />
                Say <strong>"Hey Cortex"</strong> or <strong>"Hi Cortex"</strong> to start listening.
              </div>
            )}
          </div>

          {/* ── Voice Engine ───────────────────────────────────────────────── */}
          <div
            className="rounded-xl p-4 mb-4"
            style={{ background: "rgba(255,255,255,0.03)", border: "1px solid rgba(255,255,255,0.07)" }}
          >
            <div className="mono-label mb-1">// Voice Engine</div>
            <p className="text-xs text-slate-500 mb-4">
              Using your browser's built-in speech synthesis — completely free, no API keys required.
            </p>

            {/* Engine status */}
            <div
              className="flex items-center gap-2 mb-4 px-3 py-2 rounded-lg text-xs font-mono"
              style={{
                background: isBrowserTTSSupported()
                  ? "rgba(57,255,20,0.08)" : "rgba(255,0,60,0.08)",
                border: isBrowserTTSSupported()
                  ? "1px solid rgba(57,255,20,0.25)" : "1px solid rgba(255,0,60,0.25)",
                color: isBrowserTTSSupported() ? "#39FF14" : "#FF003C",
              }}
            >
              <i className={`fa-solid ${isBrowserTTSSupported() ? "fa-circle-check" : "fa-circle-xmark"} text-[11px]`} />
              {isBrowserTTSSupported()
                ? `SpeechSynthesis supported · ${availableVoices.length} voice${availableVoices.length !== 1 ? "s" : ""} available`
                : "SpeechSynthesis not supported in this browser"
              }
            </div>

            {/* Auto-select best voice */}
            <SettingRow
              label="Auto Select Best Voice"
              desc="Automatically choose the highest quality voice available"
            >
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

            {/* Rate */}
            <div className="py-2.5" style={{ borderBottom: "1px solid rgba(255,255,255,0.06)" }}>
              <div className="text-sm text-white font-medium mb-1">Speech Rate</div>
              <Segmented
                options={[
                  { value: 0.75, label: "0.75×" },
                  { value: 0.9,  label: "0.9×"  },
                  { value: 1.0,  label: "1×"    },
                  { value: 1.15, label: "1.15×" },
                  { value: 1.3,  label: "1.3×"  },
                ]}
                value={settings.rate}
                onChange={(v) => updateSettings({ rate: v })}
              />
            </div>

            {/* Pitch */}
            <div className="py-2.5" style={{ borderBottom: "1px solid rgba(255,255,255,0.06)" }}>
              <div className="text-sm text-white font-medium mb-1">Pitch</div>
              <Segmented
                options={[
                  { value: 0.8,  label: "Low"    },
                  { value: 1.0,  label: "Normal" },
                  { value: 1.2,  label: "High"   },
                ]}
                value={settings.pitch}
                onChange={(v) => updateSettings({ pitch: v })}
              />
            </div>

            {/* Volume */}
            <div className="py-2.5">
              <div className="text-sm text-white font-medium mb-1">Volume</div>
              <Segmented
                options={[
                  { value: 0.5,  label: "50%"  },
                  { value: 0.7,  label: "70%"  },
                  { value: 0.85, label: "85%"  },
                  { value: 1.0,  label: "100%" },
                ]}
                value={settings.volume}
                onChange={(v) => updateSettings({ volume: v })}
              />
            </div>
          </div>

          {/* ── Voice List ─────────────────────────────────────────────────── */}
          <div
            className="rounded-xl p-4 mb-4"
            style={{ background: "rgba(255,255,255,0.03)", border: "1px solid rgba(255,255,255,0.07)" }}
          >
            <div className="flex items-center justify-between mb-3">
              <div className="mono-label">// Available Voices</div>
              <button
                onClick={() => {
                  loadVoices().then(() => {
                    setAvailableVoices(getAvailableVoices());
                    toast.success("Voice list refreshed", { duration: 1500 });
                  });
                }}
                className="flex items-center gap-1 text-[10px] font-mono transition-colors"
                style={{ color: "rgba(0,240,255,0.5)", cursor: "pointer" }}
                onMouseEnter={(e) => { e.currentTarget.style.color = "#00F0FF"; }}
                onMouseLeave={(e) => { e.currentTarget.style.color = "rgba(0,240,255,0.5)"; }}
              >
                <i className="fa-solid fa-rotate-right text-[9px]" />
                Refresh
              </button>
            </div>

            {availableVoices.length === 0 ? (
              <p className="text-xs text-slate-500 text-center py-4">
                No voices detected. Try refreshing or check browser permissions.
              </p>
            ) : (
              <div className="space-y-2">
                {availableVoices.map((v) => {
                  const isSelected = selectedVoiceName === v.name;
                  const isPreviewing = previewingVoice === v.name;
                  return (
                    <div
                      key={v.name}
                      className="flex items-center justify-between rounded-xl p-3 transition-all duration-150"
                      style={{
                        background: isSelected ? "rgba(0,240,255,0.07)" : "rgba(255,255,255,0.03)",
                        border: isSelected
                          ? "1px solid rgba(0,240,255,0.4)"
                          : "1px solid rgba(255,255,255,0.07)",
                        cursor: "pointer",
                        animation: "fadeSlideUp 0.15s ease both",
                      }}
                      onClick={() => {
                        updateSettings({ preferredVoiceName: v.name, autoSelectBestVoice: false });
                        savePreferredVoiceName(v.name);
                      }}
                    >
                      {/* Voice info */}
                      <div style={{ flex: 1, minWidth: 0 }}>
                        <div className="flex items-center gap-2 flex-wrap">
                          <span
                            className="text-sm font-medium truncate"
                            style={{ color: isSelected ? "#00F0FF" : "rgba(255,255,255,0.85)" }}
                          >
                            {v.name}
                          </span>
                          <QualityBadge quality={v.quality} />
                          {v.default && (
                            <span className="text-[9px] font-mono text-slate-500">DEFAULT</span>
                          )}
                        </div>
                        <div className="flex items-center gap-2 mt-0.5 flex-wrap">
                          <span className="text-[10px] font-mono text-slate-500">{v.engine}</span>
                          <span className="text-[10px] font-mono text-slate-600">·</span>
                          <span className="text-[10px] font-mono text-slate-500">{v.lang}</span>
                          <span className="text-[10px] font-mono text-slate-600">·</span>
                          <span className="text-[10px] font-mono text-slate-500">
                            {v.local ? "Local" : "Remote"}
                          </span>
                        </div>
                      </div>

                      {/* Preview button */}
                      <button
                        onClick={(e) => {
                          e.stopPropagation();
                          handleVoicePreview(v.name);
                        }}
                        title={isPreviewing ? "Stop preview" : `Preview "${v.name}"`}
                        className="flex items-center gap-1.5 ml-3 px-2.5 py-1.5 rounded-lg text-[10px] font-mono transition-all flex-shrink-0"
                        style={{
                          background: isPreviewing ? "rgba(0,240,255,0.15)" : "rgba(255,255,255,0.06)",
                          border: isPreviewing ? "1px solid rgba(0,240,255,0.4)" : "1px solid rgba(255,255,255,0.1)",
                          color: isPreviewing ? "#00F0FF" : "rgba(255,255,255,0.5)",
                          cursor: "pointer",
                        }}
                      >
                        <i className={`fa-solid ${isPreviewing ? "fa-stop animate-pulse" : "fa-play"} text-[9px]`} />
                        {isPreviewing ? "Stop" : "▶ Preview"}
                      </button>
                    </div>
                  );
                })}
              </div>
            )}
          </div>

          <div style={{ paddingBottom: 24 }} />
        </div>
      )}

      {/* ── Floating mic button (voice tab only) ─────────────────────────── */}
      {activeView === "voice" && (
        <div
          className="absolute bottom-0 left-0 right-0 flex flex-col items-center pb-6 pt-4"
          style={{
            background: "linear-gradient(to top, rgba(0,0,0,0.95) 60%, transparent)",
            pointerEvents: "none",
          }}
        >
          <button
            onClick={handleMicClick}
            disabled={false}
            className="transition-all duration-300"
            style={{
              pointerEvents: "all",
              width: 80, height: 80,
              borderRadius: "50%",
              display: "flex", alignItems: "center", justifyContent: "center",
              background: isListening
                ? "rgba(255,0,60,0.2)"
                : isSpeaking
                ? "rgba(0,240,255,0.15)"
                : isThinking
                ? "rgba(207,158,255,0.1)"
                : "rgba(0,240,255,0.1)",
              border: isListening
                ? "2px solid #FF003C"
                : isSpeaking
                ? "2px solid #00F0FF"
                : isThinking
                ? "2px solid rgba(207,158,255,0.5)"
                : "2px solid rgba(0,240,255,0.4)",
              boxShadow: isListening
                ? "0 0 40px rgba(255,0,60,0.4)"
                : isSpeaking
                ? "0 0 40px rgba(0,240,255,0.35)"
                : isThinking
                ? "0 0 20px rgba(207,158,255,0.2)"
                : "0 0 20px rgba(0,240,255,0.15)",
              animation: isListening || isSpeaking ? "orbPulse 1.5s ease-in-out infinite" : "none",
              cursor: "pointer",
            }}
            title={PHASE_LABELS[phase]}
          >
            <i
              className={`fa-solid text-2xl ${
                isListening ? "fa-stop text-[#FF003C]"
                : isSpeaking ? "fa-microphone text-[#00F0FF]"
                : isThinking ? "fa-circle-notch fa-spin text-[#CF9EFF]"
                : "fa-microphone text-[#00F0FF]"
              }`}
            />
          </button>
          <p
            className="text-[10px] font-mono mt-2 transition-all duration-300"
            style={{ color: PHASE_COLORS[phase] || "#00F0FF", pointerEvents: "none" }}
          >
            {isSpeaking ? "Tap to interrupt" : isListening ? "Tap to stop" : isThinking ? "Processing…" : "Tap to speak"}
          </p>
        </div>
      )}
    </div>
  );
}
