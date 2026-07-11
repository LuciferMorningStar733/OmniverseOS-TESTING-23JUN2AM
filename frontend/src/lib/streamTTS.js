// streamTTS.js — Free human-quality TTS via StreamElements (Amazon Polly Neural voices)
// No API key. No account. Backed by Amazon Neural voices (same engine as Alexa).
// Works in all modern browsers via Web Audio API (AudioContext).

const SE_URL  = "https://api.streamelements.com/kappa/v2/speech";
const MAX_CHUNK = 200; // chars per API call (conservative for reliability)
const PREF_KEY  = "cortex_stream_voice_id";

// ── Voice catalogue ────────────────────────────────────────────────────────
// These are Amazon Polly Neural voices served free by StreamElements.
export const STREAM_VOICES = [
  { id: "Brian",    label: "Brian",    accent: "British",    gender: "M", note: "Warm, authoritative" },
  { id: "Amy",      label: "Amy",      accent: "British",    gender: "F", note: "Clear, professional" },
  { id: "Emma",     label: "Emma",     accent: "British",    gender: "F", note: "Friendly, natural" },
  { id: "Joanna",   label: "Joanna",   accent: "American",   gender: "F", note: "Confident, smooth" },
  { id: "Matthew",  label: "Matthew",  accent: "American",   gender: "M", note: "Deep, conversational" },
  { id: "Kendra",   label: "Kendra",   accent: "American",   gender: "F", note: "Bright, articulate" },
  { id: "Kimberly", label: "Kimberly", accent: "American",   gender: "F", note: "Warm, approachable" },
  { id: "Salli",    label: "Salli",    accent: "American",   gender: "F", note: "Expressive, clear" },
  { id: "Joey",     label: "Joey",     accent: "American",   gender: "M", note: "Casual, relaxed" },
  { id: "Justin",   label: "Justin",   accent: "American",   gender: "M", note: "Young, energetic" },
  { id: "Russell",  label: "Russell",  accent: "Australian", gender: "M", note: "Laid-back, friendly" },
  { id: "Nicole",   label: "Nicole",   accent: "Australian", gender: "F", note: "Soft, professional" },
];

export const DEFAULT_STREAM_VOICE = "Brian";

export function getStreamVoiceId() {
  try { return localStorage.getItem(PREF_KEY) || DEFAULT_STREAM_VOICE; } catch { return DEFAULT_STREAM_VOICE; }
}
export function saveStreamVoiceId(id) {
  try { localStorage.setItem(PREF_KEY, id); } catch {}
}

// ── Text chunking ──────────────────────────────────────────────────────────
// Split at sentence boundaries so no chunk cuts mid-word/mid-thought.
function splitIntoChunks(text, maxLen = MAX_CHUNK) {
  const clean = text
    .replace(/[*#_`~>|]/g, "")    // strip markdown
    .replace(/\s+/g, " ")
    .trim();

  if (clean.length <= maxLen) return [clean];

  const chunks = [];
  let remaining = clean;

  while (remaining.length > maxLen) {
    const sub = remaining.slice(0, maxLen);

    // Prefer splitting at: . ? ! followed by space, then \n
    let cut = Math.max(
      sub.lastIndexOf(". "),
      sub.lastIndexOf("? "),
      sub.lastIndexOf("! "),
      sub.lastIndexOf(".\n"),
    );

    // Fall back to comma / semicolon
    if (cut < maxLen * 0.35) {
      cut = Math.max(sub.lastIndexOf(", "), sub.lastIndexOf("; "));
    }

    // Hard split if no good boundary
    const splitAt = cut > maxLen * 0.25 ? cut + 1 : maxLen;
    const piece = remaining.slice(0, splitAt).trim();
    if (piece) chunks.push(piece);
    remaining = remaining.slice(splitAt).trim();
  }

  if (remaining) chunks.push(remaining);
  return chunks.filter(Boolean);
}

// ── Support check ──────────────────────────────────────────────────────────
export function isStreamTTSAvailable() {
  return !!(window.AudioContext || window.webkitAudioContext);
}

// ── Core speak function ────────────────────────────────────────────────────
// Returns a cancel() function (synchronous). Audio fetches/plays async.
//
// Options:
//   voiceId  — one of the STREAM_VOICES ids (default: stored preference)
//   rate     — playback speed 0.5–2.0 (applied via AudioContext playbackRate)
//   volume   — 0.0–1.0
//   onStart  — called when first chunk starts playing
//   onEnd    — called after all chunks finish (or cancel is NOT called)
//   onError  — called if fetch or decode fails
//
export function streamSpeak(rawText, {
  voiceId  = null,
  rate     = 1.0,
  volume   = 1.0,
  onStart  = null,
  onEnd    = null,
  onError  = null,
} = {}) {
  const selectedVoice = voiceId || getStreamVoiceId();
  const chunks = splitIntoChunks(rawText);

  let cancelled   = false;
  let audioCtx    = null;
  let currentSrc  = null;

  const cancel = () => {
    cancelled = true;
    try { currentSrc?.stop(); }  catch {}
    try { audioCtx?.close(); }   catch {}
  };

  (async () => {
    try {
      audioCtx = new (window.AudioContext || window.webkitAudioContext)();
      if (audioCtx.state === "suspended") await audioCtx.resume();

      let started = false;

      for (const chunk of chunks) {
        if (cancelled) break;

        // ── Fetch MP3 from StreamElements ───────────────────────────────
        const url = `${SE_URL}?voice=${encodeURIComponent(selectedVoice)}&text=${encodeURIComponent(chunk)}`;
        const res = await fetch(url, { mode: "cors" });
        if (!res.ok) throw new Error(`StreamTTS HTTP ${res.status}`);

        const arrayBuf = await res.arrayBuffer();
        if (cancelled) break;

        const audioBuf = await audioCtx.decodeAudioData(arrayBuf);
        if (cancelled) break;

        // ── Play chunk ─────────────────────────────────────────────────
        await new Promise((resolve, reject) => {
          if (cancelled) { resolve(); return; }

          const gain = audioCtx.createGain();
          gain.gain.value = Math.max(0, Math.min(1, volume));
          gain.connect(audioCtx.destination);

          const src = audioCtx.createBufferSource();
          src.buffer = audioBuf;
          src.playbackRate.value = Math.max(0.5, Math.min(2.0, rate));
          src.connect(gain);
          currentSrc = src;

          src.onended = resolve;
          src.onerror = reject;
          src.start(0);

          if (!started) {
            started = true;
            onStart?.();
          }
        });
      }

      try { audioCtx.close(); } catch {}
      if (!cancelled) onEnd?.();

    } catch (err) {
      try { audioCtx?.close(); } catch {}
      if (!cancelled) onError?.(err);
    }
  })();

  return cancel;
}
