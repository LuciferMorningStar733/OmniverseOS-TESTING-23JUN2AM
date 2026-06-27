import React, { useCallback, useEffect, useRef, useState } from "react";
import { aiApi } from "../lib/api";
import { parseActions, executeActions } from "../lib/cortexActions";
import { useOS } from "../context/OSContext";
import { toast } from "sonner";

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
// Returns an emotion tag from the content of the AI response.
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

// Returns prosody parameters (pitch, rate, volume, pauseFactor) based on emotion + gender
function getProsody(emotion, gender) {
  // Base values per gender
  const base = gender === "male"
    ? { pitch: 0.90, rate: 0.92, volume: 1.0 }
    : { pitch: 1.10, rate: 0.96, volume: 1.0 };

  // Emotion modifiers (delta from base)
  const mods = {
    greeting:    { pitch:  0.06, rate:  0.03, volume:  0.0  },
    excited:     { pitch:  0.14, rate:  0.10, volume:  0.05 },
    happy:       { pitch:  0.08, rate:  0.04, volume:  0.0  },
    thinking:    { pitch: -0.04, rate: -0.06, volume: -0.05 },
    question:    { pitch:  0.10, rate: -0.02, volume:  0.0  },
    warning:     { pitch: -0.06, rate: -0.05, volume:  0.05 },
    serious:     { pitch: -0.08, rate: -0.08, volume: -0.05 },
    celebration: { pitch:  0.12, rate:  0.08, volume:  0.05 },
    sad:         { pitch: -0.10, rate: -0.10, volume: -0.08 },
    neutral:     { pitch:  0,    rate:  0,    volume:  0    },
  };

  const mod = mods[emotion] || mods.neutral;

  return {
    pitch:  Math.min(2, Math.max(0.1, base.pitch  + mod.pitch)),
    rate:   Math.min(2, Math.max(0.1, base.rate   + mod.rate)),
    volume: Math.min(1, Math.max(0.3, base.volume + mod.volume)),
  };
}

// ── Smart text chunker for natural pauses ─────────────────────────────────
// Splits long text into sentence-level chunks so pauses feel natural
// and Chrome doesn't stall on a single enormous utterance.
function chunkText(text, maxLen = 220) {
  if (!text) return [];
  // Split on sentence endings, keeping the delimiter
  const sentences = text.match(/[^.!?]+[.!?]+[\s]*/g) || [text];
  const chunks = [];
  let current = "";

  for (const sentence of sentences) {
    if ((current + sentence).length <= maxLen) {
      current += sentence;
    } else {
      if (current.trim()) chunks.push(current.trim());
      // If a single sentence exceeds maxLen, split on comma/semicolon
      if (sentence.length > maxLen) {
        const parts = sentence.match(/.{1,200}(?:[,;]\s*|$)/g) || [sentence];
        for (const part of parts) {
          if (part.trim()) chunks.push(part.trim());
        }
        current = "";
      } else {
        current = sentence;
      }
    }
  }
  if (current.trim()) chunks.push(current.trim());
  return chunks.filter(Boolean);
}

// ── Voice preference lists ─────────────────────────────────────────────────
const MALE_VOICE_PREFS = [
  "Microsoft Ryan Online (Natural) - English (United Kingdom)",
  "Microsoft Guy Online (Natural) - English (United States)",
  "Microsoft Eric Online (Natural) - English (United States)",
  "Microsoft Liam Online (Natural) - English (Canada)",
  "Google UK English Male",
  "Arthur",
  "Daniel",
  "Microsoft George - English (United Kingdom)",
  "Microsoft George",
  "Microsoft David - English (United States)",
  "Microsoft David",
];

const FEMALE_VOICE_PREFS = [
  "Microsoft Aria Online (Natural) - English (United States)",
  "Microsoft Jenny Online (Natural) - English (United States)",
  "Microsoft Sonia Online (Natural) - English (United Kingdom)",
  "Microsoft Libby Online (Natural) - English (United Kingdom)",
  "Microsoft Mia Online (Natural) - English (United Kingdom)",
  "Microsoft Leah Online (Natural) - English (United Kingdom)",
  "Microsoft Clara Online (Natural) - English (Canada)",
  "Google UK English Female",
  "Samantha",
  "Karen",
  "Moira",
  "Serena",
  "Kate",
  "Veena",
  "Victoria",
  "Microsoft Hazel - English (United Kingdom)",
  "Microsoft Susan - English (United Kingdom)",
  "Microsoft Zira - English (United States)",
];

const MALE_VOICE_KEYWORDS   = ["male", "man", "george", "daniel", "arthur", "alex", "david", "james", "ryan", "guy", "eric", "liam"];
const FEMALE_VOICE_KEYWORDS = ["female", "woman", "aria", "jenny", "sonia", "libby", "mia", "leah", "clara", "samantha", "karen", "moira", "serena", "kate", "hazel", "susan", "zira", "veena", "victoria"];

function pickBestVoice(gender) {
  // Must be called after voiceschanged fires — voices array will be populated
  const voices = window.speechSynthesis?.getVoices() ?? [];
  if (!voices.length) return null;

  const prefs = gender === "male" ? MALE_VOICE_PREFS : FEMALE_VOICE_PREFS;

  // 1. Exact name match
  for (const name of prefs) {
    const v = voices.find((v) => v.name === name);
    if (v) return v;
  }
  // 2. Partial name match (handles OS locale suffix)
  for (const name of prefs) {
    const v = voices.find((v) => v.name.includes(name) || name.includes(v.name));
    if (v) return v;
  }
  // 3. Keyword-based fallback
  const keywords = gender === "male" ? MALE_VOICE_KEYWORDS : FEMALE_VOICE_KEYWORDS;
  for (const kw of keywords) {
    const v = voices.find((v) => v.name.toLowerCase().includes(kw));
    if (v) return v;
  }
  // 4. Any en-GB for female
  if (gender === "female") {
    const gb = voices.filter((v) => v.lang === "en-GB");
    if (gb.length) return gb[0];
    const notMale = voices.filter((v) =>
      v.lang.startsWith("en") &&
      !MALE_VOICE_KEYWORDS.some((kw) => v.name.toLowerCase().includes(kw))
    );
    if (notMale.length) return notMale[0];
  }
  // 5. Any English
  const gb = voices.filter((v) => v.lang === "en-GB");
  if (gb.length) return gb[0];
  return voices.find((v) => v.lang.startsWith("en-")) ?? voices[0] ?? null;
}

// ── Animated equaliser bars ────────────────────────────────────────────────
const BAR_SCALES = [0.35, 0.65, 1, 0.8, 0.55, 0.75, 0.95, 0.6, 0.4];

function WaveBars({ color, active }) {
  return (
    <div className="flex items-end gap-[3px]" style={{ height: 32 }}>
      {BAR_SCALES.map((scale, i) => (
        <div
          key={i}
          style={{
            width: 3,
            borderRadius: 2,
            backgroundColor: color,
            height: active ? `${Math.round(scale * 30)}px` : 4,
            opacity: active ? 0.85 : 0.25,
            animation: active
              ? `cortexWave 0.65s ease-in-out ${(i * 0.08).toFixed(2)}s infinite alternate`
              : "none",
            transition: "height 0.35s ease, opacity 0.35s ease",
          }}
        />
      ))}
    </div>
  );
}

// ── Component ──────────────────────────────────────────────────────────────
export default function Voice() {
  const [phase, setPhase]             = useState("idle");
  const [transcript, setTranscript]   = useState("");
  const [interimText, setInterimText] = useState("");
  const [response, setResponse]       = useState("");
  const [voiceGender, setVoiceGender] = useState("female");
  const [actionsLog, setActionsLog]   = useState([]);
  const [detectedEmotion, setDetectedEmotion] = useState("neutral");

  const { openApp } = useOS();

  const mountedRef      = useRef(true);
  const startedRef      = useRef(false);
  const recogRef        = useRef(null);
  const transcriptRef   = useRef("");
  const abortRef        = useRef(null);
  const voiceGenderRef  = useRef("female");
  const speakTimerRef   = useRef(null);

  useEffect(() => { voiceGenderRef.current = voiceGender; }, [voiceGender]);

  // Preload voices — Chrome fires voiceschanged asynchronously
  const [voicesLoaded, setVoicesLoaded] = useState(false);
  useEffect(() => {
    mountedRef.current = true;
    const synth = window.speechSynthesis;
    const reload = () => {
      if (mountedRef.current) setVoicesLoaded(true);
    };
    synth.addEventListener("voiceschanged", reload);
    // If already populated (Firefox/Safari load synchronously)
    if (synth.getVoices().length) reload();
    return () => {
      mountedRef.current = false;
      synth.removeEventListener("voiceschanged", reload);
      synth.cancel();
      clearTimeout(speakTimerRef.current);
      abortRef.current?.abort();
    };
  }, []);

  // ── speak ─────────────────────────────────────────────────────────────────
  const speak = useCallback((rawText) => {
    if (!window.speechSynthesis || !rawText?.trim()) return;
    const synth = window.speechSynthesis;
    synth.cancel();
    clearTimeout(speakTimerRef.current);

    const cleanText = stripMarkdown(rawText);
    if (!cleanText) return;

    const emotion  = detectEmotion(rawText);
    setDetectedEmotion(emotion);

    const gender   = voiceGenderRef.current;
    const prosody  = getProsody(emotion, gender);
    const chunks   = chunkText(cleanText);

    if (!chunks.length) return;
    if (mountedRef.current) setPhase("speaking");

    // Speak chunks sequentially with a slight pause between sentences
    let chunkIdx = 0;
    let resumeTimer = null;

    function speakChunk() {
      if (!mountedRef.current || chunkIdx >= chunks.length) {
        if (mountedRef.current) setPhase("idle");
        return;
      }

      const utt    = new SpeechSynthesisUtterance(chunks[chunkIdx]);
      const voice  = pickBestVoice(gender);
      if (voice) utt.voice = voice;

      utt.rate   = prosody.rate;
      utt.pitch  = prosody.pitch;
      utt.volume = prosody.volume;
      utt.lang   = "en-US";

      // Chrome stall workaround: keep synth alive every 10s
      resumeTimer = setInterval(() => {
        if (!synth.speaking) { clearInterval(resumeTimer); return; }
        synth.resume();
      }, 10_000);

      utt.onend = () => {
        clearInterval(resumeTimer);
        chunkIdx++;
        if (!mountedRef.current) return;
        if (chunkIdx < chunks.length) {
          // Small inter-sentence pause (60ms feels natural)
          speakTimerRef.current = setTimeout(speakChunk, 60);
        } else {
          setPhase("idle");
          setDetectedEmotion("neutral");
        }
      };

      utt.onerror = (e) => {
        clearInterval(resumeTimer);
        if (e.error === "interrupted") return;
        chunkIdx++;
        if (!mountedRef.current) return;
        // On error, skip to next chunk rather than stopping entirely
        if (chunkIdx < chunks.length) {
          speakTimerRef.current = setTimeout(speakChunk, 100);
        } else {
          if (mountedRef.current) setPhase("idle");
        }
      };

      synth.speak(utt);
    }

    // Small delay lets synth.cancel() settle before the first chunk
    speakTimerRef.current = setTimeout(speakChunk, 80);
  }, []);

  const stopSpeaking = useCallback(() => {
    window.speechSynthesis?.cancel();
    clearTimeout(speakTimerRef.current);
    if (mountedRef.current) {
      setPhase("idle");
      setDetectedEmotion("neutral");
    }
  }, []);

  // ── listen ────────────────────────────────────────────────────────────────
  const start = useCallback(() => {
    const SR = window.SpeechRecognition || window.webkitSpeechRecognition;
    if (!SR) return toast.error("Speech recognition is not supported in this browser.");
    if (startedRef.current) return;

    window.speechSynthesis?.cancel();
    clearTimeout(speakTimerRef.current);

    const r = new SR();
    r.continuous       = false;
    r.interimResults   = true;
    r.lang             = "en-US";
    r.maxAlternatives  = 3;

    transcriptRef.current = "";
    setTranscript("");
    setInterimText("");
    setResponse("");
    setActionsLog([]);
    setDetectedEmotion("neutral");
    setPhase("listening");
    startedRef.current = true;

    r.onresult = (e) => {
      let finalText  = "";
      let interim    = "";

      for (let i = e.resultIndex; i < e.results.length; i++) {
        const result = e.results[i];
        const best   = Array.from({ length: result.length }, (_, j) => result[j])
          .reduce((a, b) => (a.confidence >= b.confidence ? a : b));

        if (result.isFinal) finalText += best.transcript;
        else interim += best.transcript;
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
      if (e.error !== "aborted" && e.error !== "no-speech") {
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

      setPhase("thinking");

      // Fire Cortex Actions immediately before waiting for AI
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

      try {
        let fullResponse = "";
        await aiApi.chatStreamResilient(
          { session_id: "voice", message: text, provider: "gemini", model: "gemini-2.5-flash" },
          (delta) => { fullResponse += delta; },
          null,
          ctrl.signal,
        );
        if (!mountedRef.current || ctrl.signal.aborted) return;
        setResponse(fullResponse);
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
  }, [speak, openApp]);

  const stop = useCallback(() => {
    recogRef.current?.stop();
    startedRef.current = false;
    if (mountedRef.current) setPhase("idle");
  }, []);

  // ── Derived state ──────────────────────────────────────────────────────────
  const isListening = phase === "listening";
  const isSpeaking  = phase === "speaking";
  const isThinking  = phase === "thinking";

  const waveColor  = isListening ? "#FF003C" : "#00F0FF";
  const waveActive = isListening || isSpeaking;

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
    ? "fa-volume-high text-[#00F0FF]"
    : isThinking
    ? "fa-circle-notch fa-spin text-white/30"
    : "fa-microphone text-[#00F0FF]";

  const statusText = isListening
    ? "Listening… tap to stop"
    : isSpeaking
    ? "Cortex is speaking — tap to stop"
    : isThinking
    ? "Processing request…"
    : "Tap to speak";

  const handleButtonClick =
    isListening ? stop
    : isSpeaking ? stopSpeaking
    : isThinking  ? undefined
    : start;

  // Emotion display metadata
  const EMOTION_META = {
    greeting:    { label: "Greeting",     icon: "fa-hand-wave",     color: "#00F0FF"  },
    excited:     { label: "Excited",      icon: "fa-bolt",          color: "#FCEE09"  },
    happy:       { label: "Happy",        icon: "fa-face-smile",    color: "#39FF14"  },
    thinking:    { label: "Thinking",     icon: "fa-brain",         color: "#CF9EFF"  },
    question:    { label: "Question",     icon: "fa-circle-question",color: "#00F0FF" },
    warning:     { label: "Warning",      icon: "fa-triangle-exclamation", color: "#FCEE09" },
    serious:     { label: "Serious",      icon: "fa-shield-halved", color: "#94A3B8"  },
    celebration: { label: "Celebration",  icon: "fa-party-horn",    color: "#FF003C"  },
    sad:         { label: "Sad",          icon: "fa-cloud-rain",    color: "#64748B"  },
    neutral:     { label: "Neutral",      icon: "fa-circle",        color: "rgba(255,255,255,0.2)" },
  };

  const emotionMeta = EMOTION_META[detectedEmotion] || EMOTION_META.neutral;

  return (
    <div
      className="flex flex-col h-full text-white items-center justify-center p-6 sm:p-10 overflow-y-auto"
      data-testid="voice-app"
    >
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
        .action-chip { animation: fadeSlideUp 0.25s ease both; }
        .emotion-tag { animation: emotionPop 0.3s ease both; }
      `}</style>

      <div className="mono-label mb-2">// Voice Interface</div>
      <h2 className="font-heading text-2xl sm:text-3xl font-bold mb-3 text-center">
        Speak to the Cortex
      </h2>

      {/* Voice gender toggle */}
      <div className="flex items-center gap-2 mb-8 sm:mb-10">
        <span className="text-[10px] text-slate-600 font-mono uppercase tracking-widest">voice</span>
        <button
          onClick={() => setVoiceGender((g) => (g === "male" ? "female" : "male"))}
          disabled={isSpeaking}
          title="Toggle voice gender"
          className={`flex items-center gap-1.5 px-3 py-1 rounded-full border text-xs font-mono transition-all duration-200
            ${voiceGender === "male"
              ? "border-[#00F0FF]/40 text-[#00F0FF] bg-[#00F0FF]/10 hover:bg-[#00F0FF]/15"
              : "border-purple-400/40 text-purple-300 bg-purple-500/10 hover:bg-purple-500/15"
            } ${isSpeaking ? "opacity-40 cursor-not-allowed" : ""}`}
        >
          <i className={`fa-solid ${voiceGender === "male" ? "fa-mars" : "fa-venus"} text-[10px]`} />
          {voiceGender === "male" ? "Male · JARVIS" : "Female · ARIA"}
        </button>

        {/* Emotion badge — visible while speaking */}
        {isSpeaking && detectedEmotion !== "neutral" && (
          <div
            className="emotion-tag flex items-center gap-1.5 px-2.5 py-1 rounded-full border text-xs font-mono"
            style={{
              borderColor: `${emotionMeta.color}40`,
              background: `${emotionMeta.color}10`,
              color: emotionMeta.color,
            }}
          >
            <i className={`fa-solid ${emotionMeta.icon} text-[10px]`} />
            {emotionMeta.label}
          </div>
        )}
      </div>

      {/* Equaliser bars */}
      <div className="mb-6" style={{ height: 32 }}>
        {isThinking ? (
          <div className="flex items-center gap-2 text-xs font-mono text-[#00F0FF]/50 h-full">
            <i className="fa-solid fa-circle-notch fa-spin" />
            Processing…
          </div>
        ) : (
          <WaveBars color={waveColor} active={waveActive} />
        )}
      </div>

      {/* Mic / action button */}
      <button
        onClick={handleButtonClick}
        disabled={isThinking}
        className={`w-24 h-24 sm:w-32 sm:h-32 rounded-full flex items-center justify-center transition-all duration-300 mb-6 sm:mb-8 ${buttonClass}`}
        style={{ minWidth: 96, minHeight: 96 }}
      >
        <i className={`fa-solid text-3xl sm:text-4xl ${buttonIcon}`} />
      </button>

      {/* Status label */}
      <p className="text-sm text-slate-400 mb-6 text-center" style={{ minHeight: 20 }}>
        {statusText}
      </p>

      {/* Transcript (final + interim) */}
      {(transcript || interimText) && (
        <div className="w-full max-w-lg glass-light rounded-xl p-4 mb-4">
          <div className="mono-label mb-1">// You said</div>
          <p className="text-sm text-white">
            {transcript}
            {interimText && (
              <span className="text-slate-500 italic">{transcript ? " " : ""}{interimText}</span>
            )}
          </p>
        </div>
      )}

      {/* Actions executed */}
      {actionsLog.length > 0 && (
        <div className="w-full max-w-lg flex flex-wrap gap-2 mb-4">
          {actionsLog.map((a, i) => (
            <span
              key={i}
              className={`action-chip text-[10px] font-mono px-2.5 py-1 rounded-full border flex items-center gap-1.5
                ${a.success
                  ? "bg-[#39FF14]/10 border-[#39FF14]/30 text-[#39FF14]"
                  : "bg-red-500/10 border-red-500/30 text-red-400"
                }`}
            >
              <i className={`fa-solid ${a.success ? "fa-check" : "fa-xmark"} text-[9px]`} />
              {a.label}
            </span>
          ))}
        </div>
      )}

      {/* Cortex response */}
      {response && (
        <div className="w-full max-w-lg glass-light rounded-xl p-4 border border-[#00F0FF]/20">
          <div className="flex items-center justify-between mb-2">
            <div className="mono-label text-[#00F0FF]">// Cortex response</div>
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
          <p className="text-sm text-slate-200 leading-relaxed whitespace-pre-wrap">{response}</p>
        </div>
      )}
    </div>
  );
}
