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

// ── Smart semantic text chunker ────────────────────────────────────────────
// Larger chunks = fewer API requests = less quota usage.
// Targets 2-4 complete sentences (~500 chars soft limit).
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
    if ((buf + " " + clause).length <= SOFT_MAX) {
      buf += " " + clause;
    } else {
      results.push(buf);
      buf = clause;
    }
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

// ── Real-time waveform visualizer ─────────────────────────────────────────
// Reads live FFT data from AnalyserNode (Web Audio API) via requestAnimationFrame.
// Falls back to CSS keyframe animation during listening (no audio stream).
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
        el.style.height  = "4px";
        el.style.opacity = "0.25";
        el.style.animation = "none";
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
        el.style.height  = `${px}px`;
        el.style.opacity = String(Math.max(0.25, 0.35 + norm * 0.6));
        el.style.animation = "none";
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

// ── Play an Object URL via HTMLAudioElement + Web Audio API ───────────────
// Routes audio through AnalyserNode so WaveVisualizer gets live FFT data.
// Revokes the Object URL automatically after playback.
// onAudioCreated(audio) is called synchronously before play() so callers can
// store the element and call audio.pause() immediately on stop/unmount.
function playAudioUrl(objectUrl, volume, analyserRef, onAudioCreated) {
  return new Promise((resolve, reject) => {
    const audio = new Audio(objectUrl);
    audio.volume = Math.min(1, Math.max(0, volume ?? 1));

    // Expose the element immediately — before play() — so stopSpeaking() can
    // call audio.pause() the moment the user taps Stop.
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

    audio.onended  = () => { cleanup(); resolve(); };
    audio.onerror  = (e) => { cleanup(); reject(e); };
    audio.play().catch((e) => { cleanup(); reject(e); });
  });
}

// ── Component ──────────────────────────────────────────────────────────────
export default function Voice() {
  const [phase, setPhase]             = useState("idle");
  const [transcript, setTranscript]   = useState("");
  const [interimText, setInterimText] = useState("");
  const [response, setResponse]       = useState("");
  const [voiceGender, setVoiceGender] = useState("female");
  const [geminiVoice, setGeminiVoice] = useState(GEMINI_VOICE_FEMALE);
  const [actionsLog, setActionsLog]   = useState([]);
  const [detectedEmotion, setDetectedEmotion] = useState("neutral");
  const [previewingVoice, setPreviewingVoice] = useState(null);
  // voiceUnavailable: true when Gemini TTS quota is exhausted — show text-only mode
  const [voiceUnavailable, setVoiceUnavailable] = useState(false);

  const { openApp } = useOS();

  const mountedRef      = useRef(true);
  const startedRef      = useRef(false);
  const recogRef        = useRef(null);
  const transcriptRef   = useRef("");
  const abortRef        = useRef(null);
  const voiceGenderRef  = useRef("female");
  const geminiVoiceRef  = useRef(GEMINI_VOICE_FEMALE);
  const speakAbortRef   = useRef(null);
  const previewAbortRef = useRef(null);
  const analyserRef     = useRef(null);
  // Holds the currently-playing HTMLAudioElement so stopSpeaking() can call
  // audio.pause() immediately without waiting for the Promise to resolve.
  const activeAudioRef  = useRef(null);

  useEffect(() => { voiceGenderRef.current  = voiceGender;  }, [voiceGender]);
  useEffect(() => { geminiVoiceRef.current  = geminiVoice;  }, [geminiVoice]);

  // On mount: restore saved voice preference + preload browser voices
  useEffect(() => {
    mountedRef.current = true;

    // Restore persisted voice
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
      abortRef.current?.abort();
      speakAbortRef.current?.abort();
      previewAbortRef.current?.abort();
      // Pause any playing audio element
      if (activeAudioRef.current) {
        activeAudioRef.current.pause();
        activeAudioRef.current.src = "";
        activeAudioRef.current = null;
      }
    };
  }, []);

  // ── Gemini TTS (only voice provider) ─────────────────────────────────────
  // Pipeline: pre-fetch chunk[0] → play chunk[0] → pre-fetch chunk[1] → play…
  // Overlap keeps latency low by fetching the next chunk while playing the current.
  // Frontend blob cache in ttsApi.synthesizeGemini prevents re-fetching
  // identical chunks (voice previews, repeated phrases, replay).
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

    try {
      let nextFetch = fetchChunk(chunks[0]);

      for (let i = 0; i < chunks.length; i++) {
        if (!mountedRef.current || ctrl.signal.aborted) break;

        const audioUrl = await nextFetch;

        // Start fetching the next chunk while playing this one
        if (i + 1 < chunks.length) {
          nextFetch = fetchChunk(chunks[i + 1]);
        }

        if (!mountedRef.current || ctrl.signal.aborted) {
          URL.revokeObjectURL(audioUrl);
          break;
        }

        await playAudioUrl(audioUrl, volume ?? 1, analyserRef, (el) => {
          activeAudioRef.current = el;
        });
      }
    } catch (err) {
      if (err?.name === "AbortError") return; // intentional stop
      console.error(`[GeminiTTS] Failed | voice=${voiceName} | status=${err?.status ?? "network"} | ${err?.message}`);
      throw err; // bubble to speak() to handle quota/error
    } finally {
      if (mountedRef.current && !ctrl.signal.aborted) {
        setPhase("idle");
        setDetectedEmotion("neutral");
      }
    }
  }, []);

  // ── speak() — Gemini TTS only; no browser fallback ────────────────────────
  // On quota exhaustion (429) or any error: show "Voice temporarily unavailable"
  // and keep the response visible as text. Never use browser SpeechSynthesis.
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
        console.warn("[TTS] Gemini quota exhausted (429) — switching to text-only mode.");
        setVoiceUnavailable(true);
        toast.warning("Voice quota reached — response shown as text", {
          duration: 4000,
          style: { fontSize: 12, padding: "6px 14px" },
        });
      } else {
        console.warn("[TTS] Gemini TTS error:", err?.message);
        setVoiceUnavailable(true);
        toast.error("Voice temporarily unavailable — response shown as text", {
          duration: 4000,
          style: { fontSize: 12, padding: "6px 14px" },
        });
      }
      if (mountedRef.current) setPhase("idle");
    }
  }, [speakGemini]);

  const stopSpeaking = useCallback(() => {
    // Cancel fetch pipeline for Gemini TTS
    speakAbortRef.current?.abort();
    // Stop any currently-playing HTMLAudioElement immediately
    if (activeAudioRef.current) {
      activeAudioRef.current.pause();
      activeAudioRef.current.src = "";
      activeAudioRef.current = null;
    }
    if (mountedRef.current) {
      setPhase("idle");
      setDetectedEmotion("neutral");
    }
  }, []);

  // ── Voice preview ─────────────────────────────────────────────────────────
  // ttsApi.synthesizeGemini caches blobs by voice+text, so repeated previews
  // of the same voice never hit the backend again.
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
      const audioUrl = await ttsApi.synthesizeGemini({
        text: `Hi, I'm ${voiceName}. I'll be your Cortex voice.`,
        voice: voiceName,
        signal: ctrl.signal,
      });
      if (ctrl.signal.aborted) { URL.revokeObjectURL(audioUrl); return; }
      await playAudioUrl(audioUrl, 1.0, null);
    } catch (err) {
      if (err?.name === "AbortError") return;
      const status = err?.status;
      if (status === 429) {
        toast.warning("Voice preview quota reached — try again shortly", { duration: 3000 });
      } else {
        console.error(`[VoicePreview] Failed for ${voiceName}:`, err?.message);
        toast.error(`Preview failed for ${voiceName}`, { duration: 2000 });
      }
    } finally {
      if (mountedRef.current && previewAbortRef.current === ctrl) {
        setPreviewingVoice(null);
      }
    }
  }, [previewingVoice]);

  // ── Handle gender toggle ───────────────────────────────────────────────────
  const handleGenderToggle = useCallback(() => {
    const next = voiceGender === "male" ? "female" : "male";
    setVoiceGender(next);
    const defaultVoice = next === "male" ? GEMINI_VOICE_MALE : GEMINI_VOICE_FEMALE;
    setGeminiVoice(defaultVoice);
  }, [voiceGender]);

  // ── Handle voice selection ────────────────────────────────────────────────
  const handleVoiceSelect = useCallback((name) => {
    setGeminiVoice(name);
    setVoicePrefs({ ...getVoicePrefs(), selectedVoice: name });
  }, []);

  // ── STT: listen ───────────────────────────────────────────────────────────
  const start = useCallback(() => {
    const SR = window.SpeechRecognition || window.webkitSpeechRecognition;
    if (!SR) return toast.error("Speech recognition is not supported in this browser.");
    if (startedRef.current) return;

    speakAbortRef.current?.abort();
    if (activeAudioRef.current) {
      activeAudioRef.current.pause();
      activeAudioRef.current.src = "";
      activeAudioRef.current = null;
    }

    const r = new SR();
    r.continuous       = false;
    r.interimResults   = true;
    r.lang             = "en-US";
    r.maxAlternatives  = 3;

    transcriptRef.current = "";        finalizedUntilRef.current = 0;
    setTranscript("");
    setInterimText("");
    setResponse("");
    setActionsLog([]);
    setDetectedEmotion("neutral");
    setVoiceUnavailable(false);
    setPhase("listening");
    startedRef.current = true;

    r.onresult = (e) => {
      let finalText = "";
      let interim   = "";
      for (let i = Math.max(e.resultIndex, finalizedUntilRef.current); i < e.results.length; i++) {
        const result = e.results[i];
        const best   = Array.from({ length: result.length }, (_, j) => result[j])
          .reduce((a, b) => (a.confidence >= b.confidence ? a : b));
        if (result.isFinal) { finalText += normalizeTranscript(best.transcript, { browserUrl: window.location.href, activeAppId: "voice" }); finalizedUntilRef.current = i + 1; }
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

      // Fire Cortex Actions immediately
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
  const waveColor   = isListening ? "#FF003C" : "#00F0FF";
  const waveActive  = isListening || isSpeaking;

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

  const EMOTION_META = {
    greeting:    { label: "Greeting",     icon: "fa-hand-wave",              color: "#00F0FF"               },
    excited:     { label: "Excited",      icon: "fa-bolt",                   color: "#FCEE09"               },
    happy:       { label: "Happy",        icon: "fa-face-smile",             color: "#39FF14"               },
    thinking:    { label: "Thinking",     icon: "fa-brain",                  color: "#CF9EFF"               },
    question:    { label: "Question",     icon: "fa-circle-question",        color: "#00F0FF"               },
    warning:     { label: "Warning",      icon: "fa-triangle-exclamation",   color: "#FCEE09"               },
    serious:     { label: "Serious",      icon: "fa-shield-halved",          color: "#94A3B8"               },
    celebration: { label: "Celebration",  icon: "fa-party-horn",             color: "#FF003C"               },
    sad:         { label: "Sad",          icon: "fa-cloud-rain",             color: "#64748B"               },
    neutral:     { label: "Neutral",      icon: "fa-circle",                 color: "rgba(255,255,255,0.2)" },
  };

  const emotionMeta = EMOTION_META[detectedEmotion] || EMOTION_META.neutral;
  const accentColor  = voiceGender === "male" ? "#00F0FF" : "#c084fc";

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

      {/* Gender toggle + status badges */}
      <div className="flex items-center gap-2 mb-6">
        <span className="text-[10px] text-slate-600 font-mono uppercase tracking-widest">voice</span>

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

        {/* Voice unavailable badge */}
        {voiceUnavailable && !isSpeaking && (
          <div className="flex items-center gap-1 text-[10px] font-mono px-2 py-1 rounded-full border border-orange-400/30 bg-orange-400/10 text-orange-300">
            <i className="fa-solid fa-circle-exclamation text-[9px]" />
            Text-only
          </div>
        )}

        {/* Emotion badge */}
        {isSpeaking && detectedEmotion !== "neutral" && (
          <div
            className="emotion-tag flex items-center gap-1.5 px-2.5 py-1 rounded-full border text-xs font-mono"
            style={{ borderColor: `${emotionMeta.color}40`, background: `${emotionMeta.color}10`, color: emotionMeta.color }}
          >
            <i className={`fa-solid ${emotionMeta.icon} text-[10px]`} />
            {emotionMeta.label}
          </div>
        )}
      </div>

      {/* ── Gemini voice selector ─────────────────────────────────────────────── */}
      <div className="flex flex-col items-center gap-2 mb-6 w-full max-w-sm">
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
                {/* Select chip */}
                <button
                  onClick={() => handleVoiceSelect(v.name)}
                  disabled={isSpeaking}
                  title={`Use ${v.label} — ${v.desc}`}
                  className={`flex flex-col items-start px-3 py-1.5 text-[10px] font-mono transition-colors duration-150
                    ${isActive
                      ? voiceGender === "male"
                        ? "bg-[#00F0FF]/15 text-[#00F0FF]"
                        : "bg-purple-500/15 text-purple-200"
                      : "bg-white/5 text-slate-400 hover:text-slate-200"
                    }`}
                >
                  <span className="font-semibold tracking-wide">{v.label}</span>
                  <span className="text-[9px] opacity-60 mt-0.5">{v.desc}</span>
                </button>

                {/* Preview button */}
                <button
                  onClick={() => handleVoicePreview(v.name)}
                  disabled={isSpeaking}
                  title={isPreviewing ? `Stop preview` : `Preview ${v.label}`}
                  className={`flex items-center justify-center w-7 border-l text-[10px] transition-all duration-150
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
            <button
              onClick={() => { previewAbortRef.current?.abort(); setPreviewingVoice(null); }}
              className="ml-1 opacity-50 hover:opacity-100"
            >cancel</button>
          </div>
        )}
      </div>

      {/* Waveform / thinking indicator */}
      <div className="mb-6" style={{ height: 32 }}>
        {isThinking ? (
          <div className="flex items-center gap-2 text-xs font-mono text-[#00F0FF]/50 h-full">
            <i className="fa-solid fa-circle-notch fa-spin" />
            Processing…
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

      {/* Transcript */}
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

      {/* Action chips */}
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
