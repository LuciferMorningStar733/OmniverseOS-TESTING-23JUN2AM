import React, { useCallback, useEffect, useRef, useState } from "react";
import {
  aiApi,
  ttsApi,
  getVoicePrefs,
  setVoicePrefs,
  GEMINI_VOICES,
  GEMINI_VOICE_FEMALE,
  GEMINI_VOICE_MALE,
} from "../lib/api";
import { parseActions, executeActions } from "../lib/cortexActions";
import { useOS } from "../context/OSContext";
import { toast } from "sonner";
import { normalizeTranscript } from "../lib/speechCorrection.js";

// ── Constants ──────────────────────────────────────────────────────────────
const CONV_PREFS_KEY = "omniverse_cortex_conv_prefs";
const DEFAULT_CONV_PREFS = {
  liveMode: false,
  autoResumeListening: true,
  sessionTimeout: 15, // minutes; 0 = never
  continuousConversation: true,
};
const TIMEOUT_OPTIONS = [
  { value: 0,  label: "Never"    },
  { value: 5,  label: "5 min"   },
  { value: 15, label: "15 min"  },
  { value: 30, label: "30 min"  },
  { value: 60, label: "1 hour"  },
];
const MAX_HISTORY_PAIRS = 15; // keep last 15 user+assistant pairs (30 messages)

// ── Conversation prefs helpers ─────────────────────────────────────────────
function loadConvPrefs() {
  try {
    const raw = localStorage.getItem(CONV_PREFS_KEY);
    return raw ? { ...DEFAULT_CONV_PREFS, ...JSON.parse(raw) } : { ...DEFAULT_CONV_PREFS };
  } catch { return { ...DEFAULT_CONV_PREFS }; }
}
function saveConvPrefs(prefs) {
  localStorage.setItem(CONV_PREFS_KEY, JSON.stringify(prefs));
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

// ── Text chunker ───────────────────────────────────────────────────────────
const SOFT_MAX = 500;
const HARD_MAX = 700;
const ABBREV_RE = /\b(?:Mr|Mrs|Ms|Dr|Prof|Sr|Jr|vs|etc|e\.g|i\.e|approx|est|fig|dept|vol|ave|blvd|st|no|pp|cf)\.\s*$/i;

function splitIntoSentences(text) {
  const raw = text.match(/[^!?.]*[!?.]+(?=\s|$)|[^!?.]+$/g) || [text];
  const sentences = [];
  for (const part of raw) {
    const trimmed = part.trim();
    if (!trimmed) continue;
    if (sentences.length > 0 && ABBREV_RE.test(sentences[sentences.length - 1])) {
      sentences[sentences.length - 1] += " " + trimmed;
    } else {
      sentences.push(trimmed);
    }
  }
  return sentences;
}

function splitOnClauses(sentence) {
  const CLAUSE_RE = /(?<=\S)\s*[—–]\s*(?=\S)|(?<=\S);\s+(?=\S)|(?<=\S),\s+(?=\w)/;
  const parts = sentence.split(CLAUSE_RE).map(p => p.trim()).filter(Boolean);
  if (parts.length <= 1) return [sentence];
  const results = [];
  let buf = "";
  for (const clause of parts) {
    if (!buf) { buf = clause; continue; }
    if ((buf + " " + clause).length <= SOFT_MAX) { buf += " " + clause; }
    else { results.push(buf); buf = clause; }
  }
  if (buf) results.push(buf);
  return results;
}

function chunkText(text) {
  if (!text?.trim()) return [];
  const paragraphs = text.split(/\n{2,}/).map(p => p.trim()).filter(Boolean);
  const allChunks = [];
  for (const para of paragraphs) {
    const sentences = splitIntoSentences(para);
    let buffer = "";
    for (const sentence of sentences) {
      const candidate = buffer ? buffer + " " + sentence : sentence;
      if (candidate.length <= SOFT_MAX) {
        buffer = candidate;
      } else {
        if (buffer) allChunks.push(buffer);
        if (sentence.length > HARD_MAX) {
          const clauses = splitOnClauses(sentence);
          let cb = "";
          for (const c of clauses) {
            const cc = cb ? cb + " " + c : c;
            if (cc.length <= SOFT_MAX) { cb = cc; } else { if (cb) allChunks.push(cb); cb = c; }
          }
          if (cb) allChunks.push(cb);
          buffer = "";
        } else {
          buffer = sentence;
        }
      }
    }
    if (buffer) allChunks.push(buffer);
  }
  return allChunks.filter(Boolean);
}

// ── Waveform visualizer ────────────────────────────────────────────────────
const BAR_SCALES = [0.35, 0.65, 1, 0.8, 0.55, 0.75, 0.95, 0.6, 0.4];
const FREQ_BINS  = [2, 3, 5, 7, 9, 11, 14, 17, 20];

function WaveVisualizer({ color, active, analyserRef, useCssAnimation }) {
  const barsRef = useRef([]);
  const rafRef  = useRef(null);

  useEffect(() => {
    const analyser = analyserRef?.current;
    if (!active || useCssAnimation || !analyser) {
      cancelAnimationFrame(rafRef.current);
      barsRef.current.forEach((el) => {
        if (!el) return;
        el.style.transition = "height 0.3s ease, opacity 0.3s ease";
        el.style.height     = "4px";
        el.style.opacity    = "0.25";
        el.style.animation  = "none";
      });
      return;
    }
    const buf = new Uint8Array(analyser.frequencyBinCount);
    function draw() {
      rafRef.current = requestAnimationFrame(draw);
      analyser.getByteFrequencyData(buf);
      barsRef.current.forEach((el, i) => {
        if (!el) return;
        const raw  = buf[FREQ_BINS[i] % buf.length] ?? 0;
        const norm = raw / 255;
        const px   = Math.max(3, Math.round(norm * 28) + 3);
        el.style.transition = "none";
        el.style.height     = `${px}px`;
        el.style.opacity    = String(Math.max(0.25, 0.35 + norm * 0.6));
        el.style.animation  = "none";
      });
    }
    draw();
    return () => cancelAnimationFrame(rafRef.current);
  }, [active, useCssAnimation, analyserRef]);

  return (
    <div className="flex items-end gap-[3px]" style={{ height: 32 }}>
      {BAR_SCALES.map((scale, i) => (
        <div
          key={i}
          ref={(el) => { barsRef.current[i] = el; }}
          style={{
            width: 3, borderRadius: 2, backgroundColor: color,
            height: (active && useCssAnimation) ? `${Math.round(scale * 30)}px` : 4,
            opacity: (active && useCssAnimation) ? 0.85 : 0.25,
            animation: (active && useCssAnimation)
              ? `cortexWave 0.65s ease-in-out ${(i * 0.08).toFixed(2)}s infinite alternate`
              : "none",
            transition: (active && useCssAnimation) ? "none" : "height 0.35s ease, opacity 0.35s ease",
          }}
        />
      ))}
    </div>
  );
}

// ── Audio playback via Web Audio API ──────────────────────────────────────
function playAudioUrl(objectUrl, volume, analyserRef, onAudioCreated) {
  return new Promise((resolve, reject) => {
    const audio = new Audio(objectUrl);
    audio.volume = Math.min(1, Math.max(0, volume ?? 1));
    onAudioCreated?.(audio);

    let ctx = null;
    try {
      ctx = new (window.AudioContext || window.webkitAudioContext)();
      const source   = ctx.createMediaElementSource(audio);
      const analyser = ctx.createAnalyser();
      analyser.fftSize               = 128;
      analyser.smoothingTimeConstant = 0.78;
      source.connect(analyser);
      analyser.connect(ctx.destination);
      if (analyserRef) analyserRef.current = analyser;
    } catch (_) {
      if (analyserRef) analyserRef.current = null;
    }

    const cleanup = () => {
      URL.revokeObjectURL(objectUrl);
      if (analyserRef) analyserRef.current = null;
      ctx?.close().catch(() => {});
    };

    audio.onended = () => { cleanup(); resolve(); };
    audio.onerror = (e) => { cleanup(); reject(e); };
    audio.play().catch((e) => { cleanup(); reject(e); });
  });
}

// ── State indicator pill ────────────────────────────────────────────────────
function StateIndicator({ phase, liveMode }) {
  const states = {
    idle:      { label: "Idle",      color: "rgba(255,255,255,0.25)", icon: "fa-circle",           pulse: false },
    listening: { label: "Listening", color: "#FF003C",                icon: "fa-microphone",        pulse: true  },
    thinking:  { label: "Thinking",  color: "#CF9EFF",                icon: "fa-brain",             pulse: true  },
    speaking:  { label: "Speaking",  color: "#00F0FF",                icon: "fa-waveform-lines",   pulse: false },
  };
  const meta = states[phase] || states.idle;
  return (
    <div
      className="flex items-center gap-2 px-3 py-1.5 rounded-full border text-[11px] font-mono"
      style={{
        borderColor: `${meta.color}40`,
        background: `${meta.color}10`,
        color: meta.color,
        transition: "all 0.3s ease",
      }}
    >
      <i className={`fa-solid ${meta.icon} text-[10px] ${meta.pulse ? "animate-pulse" : ""}`} />
      {meta.label}
      {liveMode && phase === "idle" && (
        <span className="text-[9px] opacity-60 ml-0.5">· Live</span>
      )}
    </div>
  );
}

// ── Settings panel ─────────────────────────────────────────────────────────
function SettingsPanel({ prefs, onChange, onClose }) {
  return (
    <div className="glass-light rounded-2xl p-5 w-full max-w-sm border border-white/10">
      <div className="flex items-center justify-between mb-4">
        <span className="text-xs font-mono text-white/70 tracking-widest uppercase">// Conversation Settings</span>
        <button onClick={onClose} className="text-slate-500 hover:text-white text-xs transition-colors">
          <i className="fa-solid fa-xmark" />
        </button>
      </div>

      {/* Live Mode */}
      <SettingRow
        label="Live Mode"
        desc="Auto-resume listening after Cortex speaks"
        value={prefs.liveMode}
        onChange={(v) => onChange({ ...prefs, liveMode: v })}
      />

      {/* Continuous Conversation */}
      <SettingRow
        label="Continuous Conversation"
        desc="Preserve context across all mic presses"
        value={prefs.continuousConversation}
        onChange={(v) => onChange({ ...prefs, continuousConversation: v })}
      />

      {/* Auto Resume Listening */}
      {prefs.liveMode && (
        <SettingRow
          label="Auto-Resume Listening"
          desc="Automatically listen again after speaking"
          value={prefs.autoResumeListening}
          onChange={(v) => onChange({ ...prefs, autoResumeListening: v })}
        />
      )}

      {/* Session Timeout */}
      <div className="py-2.5" style={{ borderBottom: "1px solid rgba(255,255,255,0.06)" }}>
        <div className="text-sm text-white font-medium mb-1">Conversation Timeout</div>
        <div className="text-xs text-slate-500 mb-2">Clear context after inactivity</div>
        <div className="flex flex-wrap gap-1.5">
          {TIMEOUT_OPTIONS.map((opt) => (
            <button
              key={opt.value}
              onClick={() => onChange({ ...prefs, sessionTimeout: opt.value })}
              className="text-[10px] font-mono px-2.5 py-1 rounded-lg border transition-all"
              style={{
                borderColor: prefs.sessionTimeout === opt.value ? "rgba(0,240,255,0.6)" : "rgba(255,255,255,0.10)",
                background: prefs.sessionTimeout === opt.value ? "rgba(0,240,255,0.12)" : "rgba(255,255,255,0.04)",
                color: prefs.sessionTimeout === opt.value ? "#00F0FF" : "rgba(255,255,255,0.55)",
              }}
            >
              {opt.label}
            </button>
          ))}
        </div>
      </div>
    </div>
  );
}

function SettingRow({ label, desc, value, onChange }) {
  return (
    <div className="flex items-center justify-between py-2.5" style={{ borderBottom: "1px solid rgba(255,255,255,0.06)" }}>
      <div>
        <div className="text-sm text-white font-medium">{label}</div>
        {desc && <div className="text-xs text-slate-500 mt-0.5">{desc}</div>}
      </div>
      <button
        onClick={() => onChange(!value)}
        style={{
          width: 40, height: 22, borderRadius: 11, flexShrink: 0,
          background: value ? "#00F0FF" : "rgba(255,255,255,0.12)",
          border: "none", cursor: "pointer", position: "relative",
          transition: "background 0.22s ease",
          boxShadow: value ? "0 0 12px rgba(0,240,255,0.45)" : "none",
        }}
      >
        <div style={{
          position: "absolute",
          top: 2, left: value ? 20 : 2,
          width: 18, height: 18, borderRadius: "50%",
          background: "#fff",
          transition: "left 0.22s ease",
          boxShadow: "0 1px 4px rgba(0,0,0,0.3)",
        }} />
      </button>
    </div>
  );
}

// ── Conversation history bubbles ───────────────────────────────────────────
function HistoryBubble({ message }) {
  const isUser = message.role === "user";
  return (
    <div className={`flex ${isUser ? "justify-end" : "justify-start"} mb-2`}>
      <div
        className="max-w-[85%] rounded-xl px-3 py-2 text-[12px] leading-relaxed"
        style={{
          background: isUser ? "rgba(0,240,255,0.10)" : "rgba(255,255,255,0.05)",
          border: isUser ? "1px solid rgba(0,240,255,0.20)" : "1px solid rgba(255,255,255,0.08)",
          color: isUser ? "#e2f8ff" : "rgba(255,255,255,0.80)",
          borderRadius: isUser ? "12px 12px 4px 12px" : "12px 12px 12px 4px",
        }}
      >
        {message.content}
      </div>
    </div>
  );
}

// ── Main Component ─────────────────────────────────────────────────────────
export default function Voice() {
  const [phase, setPhase]               = useState("idle");
  const [transcript, setTranscript]     = useState("");
  const [interimText, setInterimText]   = useState("");
  const [response, setResponse]         = useState("");
  const [voiceGender, setVoiceGender]   = useState("female");
  const [geminiVoice, setGeminiVoice]   = useState(GEMINI_VOICE_FEMALE);
  const [actionsLog, setActionsLog]     = useState([]);
  const [detectedEmotion, setDetectedEmotion] = useState("neutral");
  const [previewingVoice, setPreviewingVoice] = useState(null);
  const [voiceUnavailable, setVoiceUnavailable] = useState(false);

  // Conversation state
  const [conversationHistory, setConversationHistory] = useState([]); // [{role,content}]
  const [convPrefs, setConvPrefs] = useState(loadConvPrefs);
  const [showSettings, setShowSettings] = useState(false);
  const [showHistory, setShowHistory] = useState(false);
  const [lastInteraction, setLastInteraction] = useState(null);

  const { openApp } = useOS();

  const mountedRef        = useRef(true);
  const startedRef        = useRef(false);
  const recogRef          = useRef(null);
  const transcriptRef     = useRef("");
  const finalizedUntilRef = useRef(0);
  const abortRef          = useRef(null);
  const voiceGenderRef    = useRef("female");
  const geminiVoiceRef    = useRef(GEMINI_VOICE_FEMALE);
  const speakAbortRef     = useRef(null);
  const previewAbortRef   = useRef(null);
  const analyserRef       = useRef(null);
  const activeAudioRef    = useRef(null);
  const sessionTimerRef   = useRef(null);
  // Refs for use inside callbacks (avoid stale closures)
  const convHistoryRef    = useRef([]);
  const convPrefsRef      = useRef(convPrefs);
  const phaseRef          = useRef("idle");

  useEffect(() => { voiceGenderRef.current = voiceGender; }, [voiceGender]);
  useEffect(() => { geminiVoiceRef.current = geminiVoice; }, [geminiVoice]);
  useEffect(() => { convHistoryRef.current = conversationHistory; }, [conversationHistory]);
  useEffect(() => { convPrefsRef.current = convPrefs; }, [convPrefs]);
  useEffect(() => { phaseRef.current = phase; }, [phase]);

  // ── Handle prefs changes ──────────────────────────────────────────────────
  const handlePrefsChange = useCallback((newPrefs) => {
    setConvPrefs(newPrefs);
    saveConvPrefs(newPrefs);
  }, []);

  // ── Session timeout ────────────────────────────────────────────────────────
  const resetSessionTimer = useCallback(() => {
    clearTimeout(sessionTimerRef.current);
    const mins = convPrefsRef.current.sessionTimeout;
    if (!mins) return; // 0 = never
    sessionTimerRef.current = setTimeout(() => {
      if (!mountedRef.current) return;
      setConversationHistory([]);
      convHistoryRef.current = [];
      setResponse("");
      setTranscript("");
      setActionsLog([]);
      toast("Conversation cleared — session timeout", { duration: 3000, style: { fontSize: 12 } });
    }, mins * 60 * 1000);
  }, []);

  // ── On mount: restore voice pref ──────────────────────────────────────────
  useEffect(() => {
    mountedRef.current = true;
    const saved = getVoicePrefs();
    if (saved.selectedVoice) {
      const allVoices = [...GEMINI_VOICES.female, ...GEMINI_VOICES.male];
      const match = allVoices.find((v) => v.name === saved.selectedVoice);
      if (match) {
        setGeminiVoice(match.name);
        const isMale = GEMINI_VOICES.male.some((v) => v.name === match.name);
        setVoiceGender(isMale ? "male" : "female");
      }
    }
    return () => {
      mountedRef.current = false;
      clearTimeout(sessionTimerRef.current);
      abortRef.current?.abort();
      speakAbortRef.current?.abort();
      previewAbortRef.current?.abort();
      recogRef.current?.stop();
      if (activeAudioRef.current) {
        activeAudioRef.current.pause();
        activeAudioRef.current.src = "";
        activeAudioRef.current = null;
      }
    };
  }, []);

  // ── Clear conversation ────────────────────────────────────────────────────
  const clearConversation = useCallback(() => {
    clearTimeout(sessionTimerRef.current);
    setConversationHistory([]);
    convHistoryRef.current = [];
    setResponse("");
    setTranscript("");
    setActionsLog([]);
    setLastInteraction(null);
    setShowHistory(false);
  }, []);

  // ── Gemini TTS ────────────────────────────────────────────────────────────
  const speakGemini = useCallback(async (cleanText, gender, volume) => {
    if (!cleanText) return;
    const chunks = chunkText(cleanText);
    if (!chunks.length) return;

    if (mountedRef.current) {
      setPhase("speaking");
      setVoiceUnavailable(false);
    }

    const voiceName = geminiVoiceRef.current || (gender === "male" ? GEMINI_VOICE_MALE : GEMINI_VOICE_FEMALE);
    const ctrl      = new AbortController();
    speakAbortRef.current = ctrl;

    async function fetchChunk(text) {
      if (ctrl.signal.aborted) throw new DOMException("Aborted", "AbortError");
      return ttsApi.synthesizeGemini({ text, voice: voiceName, signal: ctrl.signal });
    }

    let interrupted = false;
    try {
      let nextFetch = fetchChunk(chunks[0]);
      for (let i = 0; i < chunks.length; i++) {
        if (!mountedRef.current || ctrl.signal.aborted) { interrupted = true; break; }
        const audioUrl = await nextFetch;
        if (i + 1 < chunks.length) nextFetch = fetchChunk(chunks[i + 1]);
        if (!mountedRef.current || ctrl.signal.aborted) {
          URL.revokeObjectURL(audioUrl);
          interrupted = true;
          break;
        }
        await playAudioUrl(audioUrl, volume ?? 1, analyserRef, (el) => {
          activeAudioRef.current = el;
        });
      }
    } catch (err) {
      if (err?.name === "AbortError") { interrupted = true; return; }
      throw err;
    } finally {
      activeAudioRef.current = null;
      if (mountedRef.current && !ctrl.signal.aborted) {
        setPhase("idle");
        setDetectedEmotion("neutral");
        // Live Mode: auto-resume listening after speaking (if not interrupted)
        const prefs = convPrefsRef.current;
        if (!interrupted && prefs.liveMode && prefs.autoResumeListening) {
          // Small delay before auto-listening so it feels natural
          setTimeout(() => {
            if (mountedRef.current && phaseRef.current === "idle") {
              startListeningRef.current?.();
            }
          }, 800);
        }
      }
    }
  }, []);

  const speak = useCallback(async (rawText) => {
    if (!rawText?.trim()) return;
    speakAbortRef.current?.abort();
    const cleanText = stripMarkdown(rawText);
    if (!cleanText) return;
    const emotion = detectEmotion(rawText);
    setDetectedEmotion(emotion);
    const gender = voiceGenderRef.current;
    const prefs  = getVoicePrefs();
    try {
      await speakGemini(cleanText, gender, prefs.volume);
    } catch (err) {
      if (!mountedRef.current) return;
      const status = err?.status;
      if (status === 429) {
        setVoiceUnavailable(true);
        toast.warning("Voice quota reached — response shown as text", { duration: 4000, style: { fontSize: 12 } });
      } else {
        setVoiceUnavailable(true);
        toast.error("Voice temporarily unavailable — response shown as text", { duration: 4000, style: { fontSize: 12 } });
      }
      if (mountedRef.current) setPhase("idle");
    }
  }, [speakGemini]);

  const stopSpeaking = useCallback((thenListen = false) => {
    speakAbortRef.current?.abort();
    if (activeAudioRef.current) {
      activeAudioRef.current.pause();
      activeAudioRef.current.src = "";
      activeAudioRef.current = null;
    }
    if (mountedRef.current) {
      setPhase("idle");
      setDetectedEmotion("neutral");
      if (thenListen) {
        setTimeout(() => {
          if (mountedRef.current && phaseRef.current === "idle") {
            startListeningRef.current?.();
          }
        }, 200);
      }
    }
  }, []);

  // ── Voice preview ─────────────────────────────────────────────────────────
  const handleVoicePreview = useCallback(async (voiceName) => {
    previewAbortRef.current?.abort();
    if (previewingVoice === voiceName) {
      if (mountedRef.current) setPreviewingVoice(null);
      return;
    }
    const ctrl = new AbortController();
    previewAbortRef.current = ctrl;
    if (mountedRef.current) setPreviewingVoice(voiceName);
    try {
      const url = await ttsApi.synthesizeGemini({
        text: "Hello, I'm your Cortex assistant. How can I help?",
        voice: voiceName,
        signal: ctrl.signal,
      });
      if (ctrl.signal.aborted) { URL.revokeObjectURL(url); return; }
      await playAudioUrl(url, getVoicePrefs().volume ?? 1, null, null);
    } catch (err) {
      if (err?.name !== "AbortError") toast.error("Preview failed");
    } finally {
      if (mountedRef.current) setPreviewingVoice(null);
    }
  }, [previewingVoice]);

  const handleVoiceSelect = useCallback((name) => {
    setGeminiVoice(name);
    setVoicePrefs({ ...getVoicePrefs(), selectedVoice: name });
  }, []);

  const handleGenderToggle = useCallback(() => {
    setVoiceGender((g) => {
      const next = g === "male" ? "female" : "male";
      const defaultVoice = next === "male" ? GEMINI_VOICE_MALE : GEMINI_VOICE_FEMALE;
      setGeminiVoice(defaultVoice);
      setVoicePrefs({ ...getVoicePrefs(), selectedVoice: defaultVoice });
      return next;
    });
  }, []);

  // ── STT: listen ────────────────────────────────────────────────────────────
  // Exposed via ref so speakGemini's auto-resume can call it safely
  const startListeningRef = useRef(null);

  const start = useCallback(() => {
    const SR = window.SpeechRecognition || window.webkitSpeechRecognition;
    if (!SR) return toast.error("Speech recognition is not supported in this browser.");
    if (startedRef.current) return;
    if (phaseRef.current === "speaking") {
      // Interruption: stop TTS then listen
      stopSpeaking(true);
      return;
    }

    const r = new SR();
    r.continuous      = false;
    r.interimResults  = true;
    r.lang            = "en-US";
    r.maxAlternatives = 3;

    transcriptRef.current     = "";
    finalizedUntilRef.current = 0;
    setTranscript("");
    setInterimText("");
    setActionsLog([]);
    setDetectedEmotion("neutral");
    setVoiceUnavailable(false);
    setPhase("listening");
    startedRef.current = true;
    setLastInteraction(Date.now());
    resetSessionTimer();

    r.onresult = (e) => {
      let finalText = "";
      let interim   = "";
      for (let i = Math.max(e.resultIndex, finalizedUntilRef.current); i < e.results.length; i++) {
        const result = e.results[i];
        const best   = Array.from({ length: result.length }, (_, j) => result[j])
          .reduce((a, b) => (a.confidence >= b.confidence ? a : b));
        if (result.isFinal) {
          finalText += normalizeTranscript(best.transcript, { browserUrl: window.location.href, activeAppId: "voice" });
          finalizedUntilRef.current = i + 1;
        } else {
          interim += best.transcript;
        }
      }
      if (finalText) transcriptRef.current += (transcriptRef.current ? " " : "") + finalText;
      if (mountedRef.current) {
        if (transcriptRef.current) setTranscript(transcriptRef.current);
        setInterimText(interim);
      }
    };

    r.onerror = (e) => {
      startedRef.current = false;
      if (mountedRef.current) { setPhase("idle"); setInterimText(""); }
      if (e.error !== "aborted" && e.error !== "no-speech") {
        toast.error(`Microphone error: ${e.error}`);
      }
    };

    r.onend = async () => {
      startedRef.current = false;
      const text = transcriptRef.current.trim();
      if (mountedRef.current) setInterimText("");
      if (!text) { if (mountedRef.current) setPhase("idle"); return; }
      if (!mountedRef.current) return;

      setPhase("thinking");
      setLastInteraction(Date.now());

      // ── Check for session reset voice commands ────────────────────────────
      const resetPhrases = ["start over", "new chat", "new conversation", "forget this conversation", "clear context"];
      if (resetPhrases.some((p) => text.toLowerCase().includes(p))) {
        clearConversation();
        await speak("Starting a new conversation. How can I help you?");
        return;
      }

      // ── Execute Cortex Actions ────────────────────────────────────────────
      const detectedActions = parseActions(text);
      if (detectedActions.length > 0) {
        executeActions(detectedActions, { openApp })
          .then((results) => {
            if (!mountedRef.current) return;
            setActionsLog(results.map((r) => ({
              label: r.action.label || r.action.type,
              success: r.success,
            })));
          })
          .catch(() => {});
      }

      abortRef.current?.abort();
      const ctrl = new AbortController();
      abortRef.current = ctrl;

      // ── Build history to send ─────────────────────────────────────────────
      const shouldSendHistory = convPrefsRef.current.continuousConversation;
      const currentHistory    = convHistoryRef.current;
      // Trim to last MAX_HISTORY_PAIRS exchanges (2 messages per exchange)
      const trimmedHistory    = currentHistory.slice(-(MAX_HISTORY_PAIRS * 2));

      try {
        let fullResponse = "";
        await aiApi.chatStreamResilient(
          {
            session_id: "voice",
            message: text,
            provider: "gemini",
            model: "gemini-2.5-flash",
            ...(shouldSendHistory && trimmedHistory.length > 0 ? { history: trimmedHistory } : {}),
          },
          (delta) => { fullResponse += delta; },
          null,
          ctrl.signal,
        );

        if (!mountedRef.current || ctrl.signal.aborted) return;

        setResponse(fullResponse);

        // ── Append to conversation history ────────────────────────────────
        const newPairs = [
          { role: "user",      content: text         },
          { role: "assistant", content: fullResponse  },
        ];
        setConversationHistory((prev) => {
          const updated = [...prev, ...newPairs].slice(-(MAX_HISTORY_PAIRS * 2));
          convHistoryRef.current = updated;
          return updated;
        });
        setLastInteraction(Date.now());
        resetSessionTimer();

        speak(fullResponse);
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
    r.start();
  }, [speak, stopSpeaking, openApp, clearConversation, resetSessionTimer]);

  // Expose start via ref for auto-resume
  useEffect(() => { startListeningRef.current = start; }, [start]);

  const stop = useCallback(() => {
    recogRef.current?.stop();
    startedRef.current = false;
    if (mountedRef.current) setPhase("idle");
  }, []);

  // ── Derived state ──────────────────────────────────────────────────────────
  const isListening = phase === "listening";
  const isSpeaking  = phase === "speaking";
  const isThinking  = phase === "thinking";
  const waveColor   = isListening ? "#FF003C" : "#00F0FF";
  const waveActive  = isListening || isSpeaking;
  const accentColor = voiceGender === "male" ? "#00F0FF" : "#c084fc";

  const buttonClass = isListening
    ? "bg-[#FF003C]/20 border-2 border-[#FF003C] shadow-[0_0_40px_rgba(255,0,60,0.4)] animate-pulse"
    : isSpeaking
    ? "bg-[#00F0FF]/15 border-2 border-[#00F0FF] shadow-[0_0_40px_rgba(0,240,255,0.35)]"
    : isThinking
    ? "bg-white/5 border-2 border-white/20 cursor-not-allowed"
    : "bg-[#00F0FF]/10 border-2 border-[#00F0FF]/40 hover:border-[#00F0FF] hover:shadow-[0_0_30px_rgba(0,240,255,0.3)]";

  const buttonIcon = isListening
    ? "fa-stop text-[#FF003C]"
    : isSpeaking
    ? "fa-waveform-lines text-[#00F0FF]"
    : isThinking
    ? "fa-circle-notch fa-spin text-white/30"
    : "fa-microphone text-[#00F0FF]";

  const buttonTitle = isListening
    ? "Stop listening"
    : isSpeaking
    ? "Interrupt — start listening"
    : isThinking
    ? "Processing…"
    : "Tap to speak";

  const statusText = isListening
    ? "Listening… tap to stop"
    : isSpeaking
    ? "Speaking — tap mic to interrupt"
    : isThinking
    ? "Processing request…"
    : convPrefs.liveMode
    ? "Live mode active — tap to speak"
    : "Tap to speak";

  const handleButtonClick = isListening
    ? stop
    : isSpeaking
    ? () => stopSpeaking(true)  // interrupt → auto-start listening
    : isThinking
    ? undefined
    : start;

  const EMOTION_META = {
    greeting:    { label: "Greeting",    icon: "fa-hand-wave",            color: "#00F0FF"               },
    excited:     { label: "Excited",     icon: "fa-bolt",                 color: "#FCEE09"               },
    happy:       { label: "Happy",       icon: "fa-face-smile",           color: "#39FF14"               },
    thinking:    { label: "Thinking",    icon: "fa-brain",                color: "#CF9EFF"               },
    question:    { label: "Question",    icon: "fa-circle-question",      color: "#00F0FF"               },
    warning:     { label: "Warning",     icon: "fa-triangle-exclamation", color: "#FCEE09"               },
    serious:     { label: "Serious",     icon: "fa-shield-halved",        color: "#94A3B8"               },
    celebration: { label: "Celebration", icon: "fa-party-horn",           color: "#FF003C"               },
    sad:         { label: "Sad",         icon: "fa-cloud-rain",           color: "#64748B"               },
    neutral:     { label: "Neutral",     icon: "fa-circle",               color: "rgba(255,255,255,0.2)" },
  };
  const emotionMeta = EMOTION_META[detectedEmotion] || EMOTION_META.neutral;
  const historyCount = Math.floor(conversationHistory.length / 2);

  return (
    <div className="flex flex-col h-full text-white" data-testid="voice-app">
      <style>{`
        @keyframes cortexWave {
          from { transform: scaleY(0.25); }
          to   { transform: scaleY(1.15); }
        }
        @keyframes fadeSlideUp {
          from { opacity: 0; transform: translateY(8px); }
          to   { opacity: 1; transform: translateY(0); }
        }
        @keyframes emotionPop {
          0%   { transform: scale(0.8); opacity: 0; }
          60%  { transform: scale(1.08); }
          100% { transform: scale(1); opacity: 1; }
        }
        @keyframes livePulse {
          0%, 100% { opacity: 0.4; transform: scale(1); }
          50%       { opacity: 1;   transform: scale(1.18); }
        }
        .action-chip { animation: fadeSlideUp 0.25s ease both; }
        .emotion-tag { animation: emotionPop 0.3s ease both; }
        .live-dot    { animation: livePulse 1.8s ease-in-out infinite; }
      `}</style>

      {/* ── Two-column layout: history | main ── */}
      <div className="flex flex-col sm:flex-row h-full overflow-hidden">

        {/* ── LEFT: Conversation history sidebar ─── */}
        {(showHistory || conversationHistory.length > 0) && (
          <div
            className="sm:w-64 flex-shrink-0 border-b sm:border-b-0 sm:border-r border-white/10 flex flex-col"
            style={{ maxHeight: showHistory ? 220 : 0, overflow: "hidden", transition: "max-height 0.3s ease" }}
          >
            {/* Always visible on sm screens if history exists */}
          </div>
        )}

        {/* Desktop sidebar always visible when history exists */}
        <div
          className="hidden sm:flex flex-col border-r border-white/10"
          style={{
            width: conversationHistory.length > 0 ? 240 : 0,
            minWidth: conversationHistory.length > 0 ? 240 : 0,
            overflow: "hidden",
            transition: "width 0.3s ease, min-width 0.3s ease",
          }}
        >
          {conversationHistory.length > 0 && (
            <>
              <div className="flex items-center justify-between px-4 py-3 border-b border-white/10 flex-shrink-0">
                <span className="text-[10px] font-mono text-slate-500 uppercase tracking-widest">// History</span>
                <span className="text-[10px] font-mono text-slate-600">{historyCount} exchange{historyCount !== 1 ? "s" : ""}</span>
              </div>
              <div className="flex-1 overflow-y-auto px-3 py-2">
                {conversationHistory.map((msg, i) => (
                  <HistoryBubble key={i} message={msg} />
                ))}
              </div>
              <div className="px-3 py-2 border-t border-white/10">
                <button
                  onClick={clearConversation}
                  className="w-full text-[10px] font-mono py-1.5 rounded-lg border border-white/10 text-slate-500 hover:text-red-400 hover:border-red-400/30 transition-all"
                >
                  <i className="fa-solid fa-rotate-left mr-1.5 text-[9px]" />
                  New Conversation
                </button>
              </div>
            </>
          )}
        </div>

        {/* ── RIGHT / MAIN: controls ─── */}
        <div className="flex-1 flex flex-col items-center justify-start overflow-y-auto p-5 sm:p-8">

          {/* Header row */}
          <div className="w-full max-w-lg flex items-center justify-between mb-5">
            <div>
              <div className="mono-label">// Voice Interface</div>
              <h2 className="font-heading text-xl sm:text-2xl font-bold">
                Speak to the Cortex
              </h2>
            </div>
            <div className="flex items-center gap-2">
              {/* Live mode badge */}
              {convPrefs.liveMode && (
                <div className="flex items-center gap-1.5 text-[10px] font-mono px-2.5 py-1 rounded-full border border-[#39FF14]/30 bg-[#39FF14]/10 text-[#39FF14]">
                  <span className="live-dot w-1.5 h-1.5 rounded-full bg-[#39FF14] inline-block" />
                  Live
                </div>
              )}
              {/* Settings button */}
              <button
                onClick={() => setShowSettings((s) => !s)}
                className="w-8 h-8 rounded-lg border border-white/10 bg-white/[0.04] flex items-center justify-center text-slate-400 hover:text-white hover:border-white/25 transition-all"
                title="Conversation settings"
              >
                <i className="fa-solid fa-sliders text-[11px]" />
              </button>
              {/* Mobile history toggle */}
              {conversationHistory.length > 0 && (
                <button
                  onClick={() => setShowHistory((s) => !s)}
                  className="sm:hidden w-8 h-8 rounded-lg border border-white/10 bg-white/[0.04] flex items-center justify-center text-slate-400 hover:text-white transition-all"
                  title="Show conversation history"
                >
                  <i className="fa-solid fa-message-lines text-[11px]" />
                  {historyCount > 0 && (
                    <span className="absolute -top-1 -right-1 w-4 h-4 rounded-full bg-[#00F0FF] text-black text-[8px] flex items-center justify-center font-bold">
                      {historyCount}
                    </span>
                  )}
                </button>
              )}
            </div>
          </div>

          {/* ── Settings panel ── */}
          {showSettings && (
            <div className="w-full max-w-lg mb-4 animate-[fadeSlideUp_0.2s_ease]">
              <SettingsPanel
                prefs={convPrefs}
                onChange={handlePrefsChange}
                onClose={() => setShowSettings(false)}
              />
            </div>
          )}

          {/* ── Mobile: conversation history accordion ── */}
          {showHistory && conversationHistory.length > 0 && (
            <div className="sm:hidden w-full max-w-lg glass-light rounded-xl mb-4 overflow-hidden">
              <div className="flex items-center justify-between px-4 py-2 border-b border-white/10">
                <span className="text-[10px] font-mono text-slate-500 uppercase tracking-widest">// Conversation</span>
                <button onClick={() => { clearConversation(); setShowHistory(false); }} className="text-[10px] font-mono text-red-400/60 hover:text-red-400">
                  New Conversation
                </button>
              </div>
              <div className="max-h-48 overflow-y-auto p-3">
                {conversationHistory.map((msg, i) => (
                  <HistoryBubble key={i} message={msg} />
                ))}
              </div>
            </div>
          )}

          {/* ── State indicator + badges ── */}
          <div className="flex items-center gap-2 mb-5 flex-wrap justify-center">
            <StateIndicator phase={phase} liveMode={convPrefs.liveMode} />

            {/* Gender toggle */}
            <button
              onClick={handleGenderToggle}
              disabled={isSpeaking}
              className={`flex items-center gap-1.5 px-3 py-1 rounded-full border text-xs font-mono transition-all duration-200
                ${voiceGender === "male"
                  ? "border-[#00F0FF]/40 text-[#00F0FF] bg-[#00F0FF]/10 hover:bg-[#00F0FF]/15"
                  : "border-purple-400/40 text-purple-300 bg-purple-500/10 hover:bg-purple-500/15"
                } ${isSpeaking ? "opacity-40 cursor-not-allowed" : ""}`}
            >
              <i className={`fa-solid ${voiceGender === "male" ? "fa-mars" : "fa-venus"} text-[10px]`} />
              {voiceGender === "male" ? "Male" : "Female"}
            </button>

            {voiceUnavailable && !isSpeaking && (
              <div className="flex items-center gap-1 text-[10px] font-mono px-2 py-1 rounded-full border border-orange-400/30 bg-orange-400/10 text-orange-300">
                <i className="fa-solid fa-circle-exclamation text-[9px]" />
                Text-only
              </div>
            )}

            {isSpeaking && detectedEmotion !== "neutral" && (
              <div
                className="emotion-tag flex items-center gap-1.5 px-2.5 py-1 rounded-full border text-xs font-mono"
                style={{ borderColor: `${emotionMeta.color}40`, background: `${emotionMeta.color}10`, color: emotionMeta.color }}
              >
                <i className={`fa-solid ${emotionMeta.icon} text-[10px]`} />
                {emotionMeta.label}
              </div>
            )}

            {/* Context indicator */}
            {historyCount > 0 && !isSpeaking && (
              <div className="flex items-center gap-1 text-[10px] font-mono px-2 py-1 rounded-full border border-[#00F0FF]/20 bg-[#00F0FF]/05 text-[#00F0FF]/60">
                <i className="fa-solid fa-comments text-[9px]" />
                {historyCount} in context
              </div>
            )}
          </div>

          {/* ── Voice selector ── */}
          <div className="flex flex-col items-center gap-2 mb-5 w-full max-w-sm">
            <div className="flex items-center gap-2 justify-center">
              <span className="text-[10px] text-slate-600 font-mono uppercase tracking-widest">gemini voice</span>
              <span className="text-[10px] font-mono" style={{ color: `${accentColor}60` }}>·</span>
              <span className="text-[10px] font-mono" style={{ color: `${accentColor}80` }}>{geminiVoice}</span>
            </div>
            <div className="flex flex-wrap gap-1.5 justify-center">
              {(GEMINI_VOICES[voiceGender] || []).map((v) => {
                const isActive     = geminiVoice === v.name;
                const isPreviewing = previewingVoice === v.name;
                return (
                  <div
                    key={v.name}
                    className={`flex items-stretch rounded-lg border overflow-hidden transition-all duration-150
                      ${isSpeaking ? "opacity-40 pointer-events-none" : ""}
                      ${isActive
                        ? voiceGender === "male"
                          ? "border-[#00F0FF] shadow-[0_0_10px_rgba(0,240,255,0.2)]"
                          : "border-purple-400 shadow-[0_0_10px_rgba(168,85,247,0.2)]"
                        : "border-white/10 hover:border-white/20"
                      }`}
                  >
                    <button
                      onClick={() => handleVoiceSelect(v.name)}
                      disabled={isSpeaking}
                      className={`flex flex-col items-start px-3 py-1.5 text-[10px] font-mono transition-colors
                        ${isActive
                          ? voiceGender === "male" ? "bg-[#00F0FF]/15 text-[#00F0FF]" : "bg-purple-500/15 text-purple-200"
                          : "bg-white/5 text-slate-400 hover:text-slate-200"
                        }`}
                    >
                      <span className="font-semibold tracking-wide">{v.label}</span>
                      <span className="text-[9px] opacity-60 mt-0.5">{v.desc}</span>
                    </button>
                    <button
                      onClick={() => handleVoicePreview(v.name)}
                      disabled={isSpeaking}
                      className={`flex items-center justify-center w-7 border-l text-[10px] transition-all
                        ${isSpeaking ? "cursor-not-allowed" : "cursor-pointer"}
                        ${isPreviewing
                          ? voiceGender === "male"
                            ? "border-[#00F0FF]/40 bg-[#00F0FF]/20 text-[#00F0FF]"
                            : "border-purple-400/40 bg-purple-500/20 text-purple-300"
                          : isActive
                            ? voiceGender === "male"
                              ? "border-[#00F0FF]/30 bg-[#00F0FF]/10 text-[#00F0FF]/60 hover:text-[#00F0FF]"
                              : "border-purple-400/30 bg-purple-500/10 text-purple-300/60 hover:text-purple-200"
                            : "border-white/10 bg-white/5 text-slate-600 hover:text-slate-300"
                        }`}
                    >
                      <i className={`fa-solid text-[8px] ${isPreviewing ? "fa-stop animate-pulse" : "fa-play"}`} />
                    </button>
                  </div>
                );
              })}
            </div>
            {previewingVoice && (
              <div className="flex items-center gap-1.5 text-[10px] font-mono mt-1" style={{ color: `${accentColor}99` }}>
                <i className="fa-solid fa-circle-notch fa-spin text-[8px]" />
                Previewing {previewingVoice}…
                <button onClick={() => { previewAbortRef.current?.abort(); setPreviewingVoice(null); }} className="ml-1 opacity-50 hover:opacity-100">cancel</button>
              </div>
            )}
          </div>

          {/* ── Waveform / thinking ── */}
          <div className="mb-5" style={{ height: 32 }}>
            {isThinking ? (
              <div className="flex items-center gap-2 text-xs font-mono text-[#CF9EFF]/60 h-full">
                <i className="fa-solid fa-brain animate-pulse text-[#CF9EFF]/60" />
                Thinking…
              </div>
            ) : (
              <WaveVisualizer
                color={waveColor}
                active={waveActive}
                analyserRef={analyserRef}
                useCssAnimation={isListening}
              />
            )}
          </div>

          {/* ── Main mic button ── */}
          <button
            onClick={handleButtonClick}
            disabled={isThinking}
            title={buttonTitle}
            className={`w-24 h-24 sm:w-28 sm:h-28 rounded-full flex items-center justify-center transition-all duration-300 mb-5 ${buttonClass}`}
            style={{ minWidth: 96, minHeight: 96 }}
          >
            <i className={`fa-solid text-3xl sm:text-4xl ${buttonIcon}`} />
          </button>

          {/* Status label */}
          <p className="text-sm text-slate-400 mb-5 text-center" style={{ minHeight: 20 }}>
            {statusText}
          </p>

          {/* ── Current transcript ── */}
          {(transcript || interimText) && (
            <div className="w-full max-w-lg glass-light rounded-xl p-4 mb-3">
              <div className="mono-label mb-1">// You said</div>
              <p className="text-sm text-white">
                {transcript}
                {interimText && (
                  <span className="text-slate-500 italic">{transcript ? " " : ""}{interimText}</span>
                )}
              </p>
            </div>
          )}

          {/* ── Action chips ── */}
          {actionsLog.length > 0 && (
            <div className="w-full max-w-lg flex flex-wrap gap-2 mb-3">
              {actionsLog.map((a, i) => (
                <span
                  key={i}
                  className={`action-chip text-[10px] font-mono px-2.5 py-1 rounded-full border flex items-center gap-1.5
                    ${a.success ? "bg-[#39FF14]/10 border-[#39FF14]/30 text-[#39FF14]" : "bg-red-500/10 border-red-500/30 text-red-400"}`}
                >
                  <i className={`fa-solid ${a.success ? "fa-check" : "fa-xmark"} text-[9px]`} />
                  {a.label}
                </span>
              ))}
            </div>
          )}

          {/* ── Cortex response ── */}
          {response && (
            <div className="w-full max-w-lg glass-light rounded-xl p-4 border border-[#00F0FF]/20 mb-4">
              <div className="flex items-center justify-between mb-2">
                <div className="mono-label text-[#00F0FF]">// Cortex response</div>
                <div className="flex items-center gap-2">
                  {historyCount > 1 && (
                    <span className="text-[10px] font-mono text-slate-600">
                      Turn {historyCount}
                    </span>
                  )}
                  {!isSpeaking && (
                    <button
                      onClick={() => speak(response)}
                      className="flex items-center gap-1 text-[10px] font-mono text-[#00F0FF]/40 hover:text-[#00F0FF]/80 transition-colors"
                    >
                      <i className="fa-solid fa-rotate-right text-[9px]" />
                      Replay
                    </button>
                  )}
                </div>
              </div>
              <p className="text-sm text-slate-200 leading-relaxed whitespace-pre-wrap">{response}</p>
            </div>
          )}

          {/* ── New Conversation button (shown when history exists) ── */}
          {historyCount > 0 && phase === "idle" && (
            <button
              onClick={clearConversation}
              className="flex items-center gap-1.5 text-[11px] font-mono text-slate-600 hover:text-red-400 transition-colors mb-2"
            >
              <i className="fa-solid fa-rotate-left text-[10px]" />
              New Conversation
            </button>
          )}

          {/* ── Continuous conversation hint ── */}
          {!convPrefs.continuousConversation && historyCount === 0 && phase === "idle" && (
            <p className="text-[10px] font-mono text-slate-600 text-center mt-2">
              Continuous conversation is off · each session is independent
            </p>
          )}
        </div>
      </div>
    </div>
  );
}
