import React, { useCallback, useEffect, useRef, useState } from "react";
import { aiApi, ttsApi, getVoicePrefs, setVoicePrefs } from "../lib/api";
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

// ── Google TTS prosody per emotion ─────────────────────────────────────────
// Uses officially supported SSML prosody values (rate, pitch).
// pitch is in semitones (e.g. "+2st"), rate is percentage or keyword.
function getGoogleProsody(emotion, gender) {
  const isMale = gender === "male";

  const basePitch = isMale ? "-2st" : "+1st";

  const map = {
    greeting:    { rate: "105%", pitch: isMale ? "+0st" : "+3st" },
    excited:     { rate: "115%", pitch: isMale ? "+2st" : "+5st" },
    happy:       { rate: "108%", pitch: isMale ? "+1st" : "+3st" },
    thinking:    { rate: "90%",  pitch: basePitch               },
    question:    { rate: "100%", pitch: isMale ? "+1st" : "+4st" },
    warning:     { rate: "88%",  pitch: isMale ? "-3st" : "-1st" },
    serious:     { rate: "85%",  pitch: isMale ? "-3st" : "-1st" },
    celebration: { rate: "118%", pitch: isMale ? "+3st" : "+5st" },
    sad:         { rate: "80%",  pitch: isMale ? "-4st" : "-2st" },
    neutral:     { rate: "100%", pitch: basePitch               },
  };

  return map[emotion] || map.neutral;
}

// ── Browser SpeechSynthesis prosody per emotion (fallback) ─────────────────
function getBrowserProsody(emotion, gender) {
  const base = gender === "male"
    ? { pitch: 0.90, rate: 0.92, volume: 1.0 }
    : { pitch: 1.10, rate: 0.96, volume: 1.0 };

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

// ── Build SSML for Google TTS ──────────────────────────────────────────────
function buildSsml(text, prosody) {
  const escaped = text
    .replace(/&/g, "&amp;")
    .replace(/</g, "&lt;")
    .replace(/>/g, "&gt;")
    .replace(/"/g, "&quot;")
    .replace(/'/g, "&apos;");
  return `<speak><prosody rate="${prosody.rate}" pitch="${prosody.pitch}">${escaped}</prosody></speak>`;
}

// ── Smart semantic text chunker ────────────────────────────────────────────
// Splits by paragraph → sentence → clause boundaries.
// Never cuts mid-word or mid-sentence. Ideal chunk: 1–3 complete sentences.
//
// Strategy:
//  1. Paragraphs: split on \n\n+ (hard boundary, always flush)
//  2. Sentences: split on .  !  ?  followed by whitespace or end-of-string,
//     but NOT on abbreviations (Mr., Dr., e.g., i.e., vs., etc.) or
//     decimal numbers (3.14).
//  3. Accumulate sentences up to SOFT_MAX (280 chars) to keep round-trips low.
//  4. If a single sentence exceeds HARD_MAX (400 chars), split on clause
//     boundaries — em-dash, semicolon, then comma — but only at word edges.

const SOFT_MAX = 280; // target max chars per TTS chunk
const HARD_MAX = 400; // absolute max before clause-splitting kicks in

// Abbreviations that should NOT trigger a sentence split when followed by space
const ABBREV_RE = /\b(?:Mr|Mrs|Ms|Dr|Prof|Sr|Jr|vs|etc|e\.g|i\.e|approx|est|fig|dept|vol|ave|blvd|st|no|pp|cf)\.\s*$/i;

function splitIntoSentences(text) {
  // Tokenise on . ! ? followed by whitespace (or end), keeping the delimiter
  // with the preceding sentence.
  const raw = text.match(/[^!?.]*[!?.]+(?=\s|$)|[^!?.]+$/g) || [text];
  const sentences = [];

  for (const part of raw) {
    const trimmed = part.trim();
    if (!trimmed) continue;

    // If the previous chunk looks like an abbreviation, merge rather than split
    if (sentences.length > 0 && ABBREV_RE.test(sentences[sentences.length - 1])) {
      sentences[sentences.length - 1] += " " + trimmed;
    } else {
      sentences.push(trimmed);
    }
  }

  return sentences;
}

function splitOnClauses(sentence) {
  // Split on clause boundaries in preference order:
  // em-dash / en-dash, then semicolon, then comma followed by a space.
  // Always split at word boundaries — never mid-word.
  const CLAUSE_RE = /(?<=\S)\s*[—–]\s*(?=\S)|(?<=\S);\s+(?=\S)|(?<=\S),\s+(?=\w)/;
  const parts = sentence.split(CLAUSE_RE).map(p => p.trim()).filter(Boolean);
  if (parts.length <= 1) return [sentence]; // can't split further — return as-is

  // Accumulate clause parts up to SOFT_MAX
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

  // Step 1 — paragraph split (hard boundary)
  const paragraphs = text.split(/\n{2,}/).map(p => p.trim()).filter(Boolean);
  const allChunks = [];

  for (const para of paragraphs) {
    // Step 2 — sentence split within each paragraph
    const sentences = splitIntoSentences(para);
    let buffer = "";

    for (const sentence of sentences) {
      const candidate = buffer ? buffer + " " + sentence : sentence;

      if (candidate.length <= SOFT_MAX) {
        // Fits comfortably — accumulate
        buffer = candidate;
      } else {
        // Flush existing buffer first
        if (buffer) allChunks.push(buffer);

        if (sentence.length > HARD_MAX) {
          // Long sentence — split on clause boundaries rather than arbitrary position
          const clauses = splitOnClauses(sentence);
          // Accumulate clause-chunks
          let clauseBuf = "";
          for (const c of clauses) {
            const cc = clauseBuf ? clauseBuf + " " + c : c;
            if (cc.length <= SOFT_MAX) {
              clauseBuf = cc;
            } else {
              if (clauseBuf) allChunks.push(clauseBuf);
              clauseBuf = c;
            }
          }
          if (clauseBuf) allChunks.push(clauseBuf);
          buffer = "";
        } else {
          // Sentence fits on its own — start fresh buffer
          buffer = sentence;
        }
      }
    }

    if (buffer) allChunks.push(buffer);
  }

  return allChunks.filter(Boolean);
}

// ── Google TTS voice names ─────────────────────────────────────────────────
const GOOGLE_VOICE_FEMALE = "en-US-Journey-F";
const GOOGLE_VOICE_MALE   = "en-US-Journey-D";

// ── Browser voice preference lists (fallback only) ─────────────────────────
const MALE_VOICE_PREFS   = [
  "Microsoft Ryan Online (Natural) - English (United Kingdom)",
  "Microsoft Guy Online (Natural) - English (United States)",
  "Microsoft Eric Online (Natural) - English (United States)",
  "Google UK English Male",
  "Arthur", "Daniel", "Microsoft George - English (United Kingdom)",
];
const FEMALE_VOICE_PREFS = [
  "Microsoft Aria Online (Natural) - English (United States)",
  "Microsoft Jenny Online (Natural) - English (United States)",
  "Microsoft Sonia Online (Natural) - English (United Kingdom)",
  "Microsoft Libby Online (Natural) - English (United Kingdom)",
  "Google UK English Female",
  "Samantha", "Karen", "Moira", "Serena", "Kate",
];
const MALE_VOICE_KEYWORDS   = ["male","man","george","daniel","arthur","alex","david","james","ryan","guy","eric","liam"];
const FEMALE_VOICE_KEYWORDS = ["female","woman","aria","jenny","sonia","libby","mia","leah","clara","samantha","karen","moira","serena","kate","hazel","susan","zira","veena","victoria"];

function pickBestBrowserVoice(gender) {
  const voices = window.speechSynthesis?.getVoices() ?? [];
  if (!voices.length) return null;
  const prefs = gender === "male" ? MALE_VOICE_PREFS : FEMALE_VOICE_PREFS;
  for (const name of prefs) {
    const v = voices.find((v) => v.name === name);
    if (v) return v;
  }
  for (const name of prefs) {
    const v = voices.find((v) => v.name.includes(name) || name.includes(v.name));
    if (v) return v;
  }
  const keywords = gender === "male" ? MALE_VOICE_KEYWORDS : FEMALE_VOICE_KEYWORDS;
  for (const kw of keywords) {
    const v = voices.find((v) => v.name.toLowerCase().includes(kw));
    if (v) return v;
  }
  if (gender === "female") {
    const gb = voices.filter((v) => v.lang === "en-GB");
    if (gb.length) return gb[0];
  }
  return voices.find((v) => v.lang.startsWith("en-")) ?? voices[0] ?? null;
}

// ── Real-time waveform visualizer ─────────────────────────────────────────
// When Google TTS audio is playing, reads live FFT amplitude from an
// AnalyserNode (Web Audio API) via requestAnimationFrame and drives bar
// heights directly — no CSS animation, actual audio waveform.
// Falls back to CSS keyframe animation for browser SpeechSynthesis.
const BAR_SCALES = [0.35, 0.65, 1, 0.8, 0.55, 0.75, 0.95, 0.6, 0.4];
// Frequency bin indices (out of FFT size 128) mapped to each bar.
// Bins 2–22 cover roughly 300 Hz–3.4 kHz — the core speech range.
const FREQ_BINS   = [2, 3, 5, 7, 9, 11, 14, 17, 20, 23, 27];

function WaveVisualizer({ color, active, analyserRef, fallback }) {
  const barsRef = useRef([]);
  const rafRef  = useRef(null);

  useEffect(() => {
    const analyser = analyserRef?.current;
    // Use RAF + AnalyserNode only when Google TTS is active
    if (!active || fallback || !analyser) {
      cancelAnimationFrame(rafRef.current);
      // Smoothly reset bars to idle state
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
        const norm = raw / 255; // 0–1
        const px   = Math.max(3, Math.round(norm * 28) + 3);
        // No CSS transition during RAF — avoid fighting the animation frame
        el.style.transition = "none";
        el.style.height  = `${px}px`;
        el.style.opacity = String(Math.max(0.25, 0.35 + norm * 0.6));
        el.style.animation = "none";
      });
    }

    draw();
    return () => cancelAnimationFrame(rafRef.current);
  }, [active, fallback, analyserRef]);

  // Decide whether each bar uses CSS animation (fallback path) or is driven by RAF
  const useCss = active && fallback;

  return (
    <div className="flex items-end gap-[3px]" style={{ height: 32 }}>
      {BAR_SCALES.map((scale, i) => (
        <div
          key={i}
          ref={(el) => { barsRef.current[i] = el; }}
          style={{
            width: 3,
            borderRadius: 2,
            backgroundColor: color,
            // Initial heights — RAF or CSS animation overrides these while active
            height: useCss ? `${Math.round(scale * 30)}px` : 4,
            opacity: useCss ? 0.85 : 0.25,
            animation: useCss
              ? `cortexWave 0.65s ease-in-out ${(i * 0.08).toFixed(2)}s infinite alternate`
              : "none",
            transition: useCss ? "none" : "height 0.35s ease, opacity 0.35s ease",
          }}
        />
      ))}
    </div>
  );
}

// ── Play an Object URL (binary MP3 blob) via HTMLAudioElement ─────────────
// Routes audio through Web Audio API so the AnalyserNode in analyserRef
// receives live frequency data for the real-time waveform visualizer.
// The Object URL is revoked and AudioContext closed after playback.
function playAudioUrl(objectUrl, volume, analyserRef) {
  return new Promise((resolve, reject) => {
    const audio = new Audio(objectUrl);
    audio.volume = Math.min(1, Math.max(0, volume));

    // Wire up Web Audio API for real-time amplitude data
    let ctx = null;
    try {
      ctx = new (window.AudioContext || window.webkitAudioContext)();
      const source   = ctx.createMediaElementSource(audio);
      const analyser = ctx.createAnalyser();
      analyser.fftSize              = 128;   // 64 bins — plenty for 9 bars
      analyser.smoothingTimeConstant = 0.78;  // smooths jitter while staying reactive
      source.connect(analyser);
      analyser.connect(ctx.destination);
      if (analyserRef) analyserRef.current = analyser;
    } catch (_) {
      // Web Audio API unavailable or blocked — play normally, no waveform
      if (analyserRef) analyserRef.current = null;
    }

    const cleanup = () => {
      URL.revokeObjectURL(objectUrl);
      if (analyserRef) analyserRef.current = null;
      // Close context asynchronously to avoid blocking the next chunk
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
  const [actionsLog, setActionsLog]   = useState([]);
  const [detectedEmotion, setDetectedEmotion] = useState("neutral");
  const [usingFallback, setUsingFallback]     = useState(false);

  const { openApp } = useOS();

  const mountedRef     = useRef(true);
  const startedRef     = useRef(false);
  const recogRef       = useRef(null);
  const transcriptRef  = useRef("");
  const abortRef       = useRef(null);
  const voiceGenderRef = useRef("female");
  const speakTimerRef  = useRef(null);
  const currentAudioRef = useRef(null); // tracks active HTMLAudioElement for interruption
  const speakAbortRef  = useRef(null);  // AbortController for in-flight TTS requests
  const analyserRef    = useRef(null);  // Web Audio API AnalyserNode for waveform visualizer

  useEffect(() => { voiceGenderRef.current = voiceGender; }, [voiceGender]);

  // Preload browser voices (fallback) — Chrome fires voiceschanged asynchronously
  const [voicesLoaded, setVoicesLoaded] = useState(false);
  useEffect(() => {
    mountedRef.current = true;
    const synth = window.speechSynthesis;
    const reload = () => { if (mountedRef.current) setVoicesLoaded(true); };
    synth.addEventListener("voiceschanged", reload);
    if (synth.getVoices().length) reload();
    return () => {
      mountedRef.current = false;
      synth.removeEventListener("voiceschanged", reload);
      synth.cancel();
      clearTimeout(speakTimerRef.current);
      abortRef.current?.abort();
      speakAbortRef.current?.abort();
    };
  }, []);

  // ── Browser SpeechSynthesis speak (emergency fallback) ────────────────────
  const speakBrowser = useCallback((cleanText, emotion, gender, userVolume) => {
    const synth = window.speechSynthesis;
    if (!synth || !cleanText) return;
    synth.cancel();
    clearTimeout(speakTimerRef.current);

    const prosody = getBrowserProsody(emotion, gender);
    const chunks  = chunkText(cleanText);
    if (!chunks.length) return;
    if (mountedRef.current) setPhase("speaking");

    let chunkIdx = 0;

    function speakChunk() {
      if (!mountedRef.current || chunkIdx >= chunks.length) {
        if (mountedRef.current) setPhase("idle");
        return;
      }
      const utt   = new SpeechSynthesisUtterance(chunks[chunkIdx]);
      const voice = pickBestBrowserVoice(gender);
      if (voice) utt.voice = voice;
      utt.rate   = prosody.rate;
      utt.pitch  = prosody.pitch;
      utt.volume = Math.min(1, prosody.volume * userVolume);
      utt.lang   = "en-US";

      const resumeTimer = setInterval(() => {
        if (!synth.speaking) { clearInterval(resumeTimer); return; }
        synth.resume();
      }, 10_000);

      utt.onend = () => {
        clearInterval(resumeTimer);
        chunkIdx++;
        if (!mountedRef.current) return;
        if (chunkIdx < chunks.length) {
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
        if (chunkIdx < chunks.length) {
          speakTimerRef.current = setTimeout(speakChunk, 100);
        } else {
          if (mountedRef.current) setPhase("idle");
        }
      };
      synth.speak(utt);
    }

    speakTimerRef.current = setTimeout(speakChunk, 80);
  }, []);

  // ── Google Cloud TTS speak (primary) ──────────────────────────────────────
  // Pipeline: chunk → fetch TTS for chunk N → play chunk N → fetch chunk N+1
  const speakGoogle = useCallback(async (cleanText, emotion, gender, prefs) => {
    if (!cleanText) return;
    const chunks = chunkText(cleanText);
    if (!chunks.length) return;

    if (mountedRef.current) setPhase("speaking");

    const voiceName = gender === "male" ? GOOGLE_VOICE_MALE : GOOGLE_VOICE_FEMALE;
    const prosody   = getGoogleProsody(emotion, gender);
    const ctrl      = new AbortController();
    speakAbortRef.current = ctrl;

    // Pre-fetch first chunk immediately for low latency
    async function fetchChunk(text) {
      if (ctrl.signal.aborted) throw new DOMException("Aborted", "AbortError");
      const ssml = buildSsml(text, prosody);
      return ttsApi.synthesize({
        text: ssml,
        voiceName,
        speakingRate: prefs.rate,
        pitch: 0.0,        // prosody pitch is baked into SSML
        volumeGainDb: 0.0,
        useSsml: true,
      });
    }

    try {
      // Kick off first fetch
      let nextFetchPromise = fetchChunk(chunks[0]);

      for (let i = 0; i < chunks.length; i++) {
        if (!mountedRef.current || ctrl.signal.aborted) break;

        // Await the audio for this chunk
        const audioB64 = await nextFetchPromise;

        // Pre-fetch the next chunk while we play this one
        if (i + 1 < chunks.length) {
          nextFetchPromise = fetchChunk(chunks[i + 1]);
        }

        if (!mountedRef.current || ctrl.signal.aborted) break;

        // Play this chunk — passes analyserRef so WaveVisualizer gets live FFT data
        await playAudioUrl(audioB64, prefs.volume, analyserRef);
      }
    } catch (err) {
      if (err?.name === "AbortError") {
        return; // interrupted intentionally
      }
      throw err; // bubble up to caller for fallback
    } finally {
      if (mountedRef.current && !ctrl.signal.aborted) {
        setPhase("idle");
        setDetectedEmotion("neutral");
      }
    }
  }, []);

  // ── speak() — Voice Manager: Google TTS → Browser SpeechSynthesis ─────────
  const speak = useCallback(async (rawText) => {
    if (!rawText?.trim()) return;

    // Cancel anything currently playing
    speakAbortRef.current?.abort();
    window.speechSynthesis?.cancel();
    clearTimeout(speakTimerRef.current);

    const cleanText = stripMarkdown(rawText);
    if (!cleanText) return;

    const emotion = detectEmotion(rawText);
    setDetectedEmotion(emotion);

    const gender = voiceGenderRef.current;
    const prefs  = getVoicePrefs();

    if (prefs.provider === "browser") {
      // User explicitly chose browser — go directly, no fallback notification
      setUsingFallback(false);
      speakBrowser(cleanText, emotion, gender, prefs.volume);
      return;
    }

    // Try Google TTS first
    try {
      setUsingFallback(false);
      await speakGoogle(cleanText, emotion, gender, prefs);
    } catch (err) {
      if (!mountedRef.current) return;
      // Google TTS failed — fall back to browser SpeechSynthesis
      console.warn("[TTS] Google Cloud TTS failed, falling back to browser:", err?.message);
      setUsingFallback(true);
      toast.info("Using local voice", {
        duration: 2500,
        style: { fontSize: 12, padding: "6px 12px" },
      });
      speakBrowser(cleanText, emotion, gender, prefs.volume);
    }
  }, [speakGoogle, speakBrowser]);

  const stopSpeaking = useCallback(() => {
    speakAbortRef.current?.abort();
    window.speechSynthesis?.cancel();
    clearTimeout(speakTimerRef.current);
    if (mountedRef.current) {
      setPhase("idle");
      setDetectedEmotion("neutral");
      setUsingFallback(false);
    }
  }, []);

  // ── listen ────────────────────────────────────────────────────────────────
  const start = useCallback(() => {
    const SR = window.SpeechRecognition || window.webkitSpeechRecognition;
    if (!SR) return toast.error("Speech recognition is not supported in this browser.");
    if (startedRef.current) return;

    speakAbortRef.current?.abort();
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
    setUsingFallback(false);
    setPhase("listening");
    startedRef.current = true;

    r.onresult = (e) => {
      let finalText = "";
      let interim   = "";
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

        {/* Fallback indicator */}
        {usingFallback && isSpeaking && (
          <div className="flex items-center gap-1 text-[10px] font-mono px-2 py-1 rounded-full border border-yellow-400/30 bg-yellow-400/10 text-yellow-300">
            <i className="fa-solid fa-triangle-exclamation text-[9px]" />
            Local voice
          </div>
        )}

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
          <WaveVisualizer
            color={waveColor}
            active={waveActive}
            analyserRef={analyserRef}
            fallback={usingFallback}
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
