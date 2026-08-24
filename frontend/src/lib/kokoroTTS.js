// kokoroTTS.js — Kokoro TTS client (free, no API key)
//
// Calls the OmniverseOS backend proxy at /api/ai/tts-kokoro.
// The backend runs Kokoro-82M (Apache 2.0) locally — no external service,
// no API key, completely free forever.
//
// Model quality: ⭐⭐⭐⭐½ — beats Amazon Polly, rival of ElevenLabs standard.
// First request triggers a one-time ~320MB model download on the backend.
// Every subsequent request is served from the in-memory singleton: ~200–500ms.
//
// Returns a cancel() function. Audio plays via HTMLAudioElement (WAV blob URL).

import { API } from "./api";

const KOKORO_FETCH_TIMEOUT_MS = 30_000; // 30s — generous for first cold-start
const PREF_KEY = "cortex_kokoro_voice_id";

// ── Voice catalogue ───────────────────────────────────────────────────────
export const KOKORO_VOICES = [
  // American Female
  { id: "af_heart",   label: "Heart",    accent: "American", gender: "F", note: "Warm, expressive — default" },
  { id: "af_bella",   label: "Bella",    accent: "American", gender: "F", note: "Bright, friendly" },
  { id: "af_nicole",  label: "Nicole",   accent: "American", gender: "F", note: "Soft, professional" },
  { id: "af_sarah",   label: "Sarah",    accent: "American", gender: "F", note: "Clear, articulate" },
  { id: "af_sky",     label: "Sky",      accent: "American", gender: "F", note: "Airy, youthful" },
  // American Male
  { id: "am_michael", label: "Michael",  accent: "American", gender: "M", note: "Deep, conversational" },
  { id: "am_adam",    label: "Adam",     accent: "American", gender: "M", note: "Natural, smooth" },
  { id: "am_puck",    label: "Puck",     accent: "American", gender: "M", note: "Energetic, lively" },
  { id: "am_liam",    label: "Liam",     accent: "American", gender: "M", note: "Warm, casual" },
  { id: "am_eric",    label: "Eric",     accent: "American", gender: "M", note: "Steady, clear" },
  // British Female
  { id: "bf_emma",    label: "Emma",     accent: "British",  gender: "F", note: "Refined, warm" },
  { id: "bf_isabella",label: "Isabella", accent: "British",  gender: "F", note: "Elegant, precise" },
  // British Male
  { id: "bm_george",  label: "George",   accent: "British",  gender: "M", note: "Authoritative, clear" },
  { id: "bm_lewis",   label: "Lewis",    accent: "British",  gender: "M", note: "Smooth, confident" },
];

export const DEFAULT_KOKORO_VOICE = "af_heart";

export function getKokoroVoiceId() {
  try { return localStorage.getItem(PREF_KEY) || DEFAULT_KOKORO_VOICE; } catch { return DEFAULT_KOKORO_VOICE; }
}

export function saveKokoroVoiceId(id) {
  try { localStorage.setItem(PREF_KEY, id); } catch {}
}

// ── Core speak function ───────────────────────────────────────────────────
/**
 * Speak rawText via Kokoro TTS (through the backend proxy).
 *
 * @param {string} rawText      — Already preprocessed speech-safe text
 * @param {object} options
 *   @param {function}      onStart  — Called when audio playback begins
 *   @param {function}      onEnd    — Called when playback completes (not on cancel)
 *   @param {function}      onError  — Called with Error on any failure
 *   @param {AbortSignal}   signal   — Optional outer cancellation signal
 *   @param {number}        volume   — 0.0–1.0
 *   @param {number}        speed    — 0.5–2.0 (Kokoro native speed parameter)
 * @returns {function} cancel() — Stop and discard audio immediately
 */
export function kokoroSpeak(rawText, {
  onStart  = null,
  onEnd    = null,
  onError  = null,
  signal   = null,
  volume   = 1.0,
  speed    = 1.0,
} = {}) {
  const voiceId = getKokoroVoiceId();
  let cancelled  = false;
  let audioEl    = null;
  let objectUrl  = null;

  const cleanup = () => {
    if (audioEl) {
      audioEl.onended = null;
      audioEl.onerror = null;
      try { audioEl.pause(); } catch {}
      audioEl.src = "";
      audioEl = null;
    }
    if (objectUrl) {
      try { URL.revokeObjectURL(objectUrl); } catch {}
      objectUrl = null;
    }
  };

  const cancel = () => {
    cancelled = true;
    cleanup();
  };

  (async () => {
    try {
      const token = localStorage.getItem("omniverse_token");

      // ── Timeout + outer abort signal ───────────────────────────────────
      const ctrl  = new AbortController();
      const timer = setTimeout(
        () => ctrl.abort(new DOMException("Kokoro TTS fetch timeout", "TimeoutError")),
        KOKORO_FETCH_TIMEOUT_MS,
      );
      const onOuter = () => ctrl.abort();
      signal?.addEventListener("abort", onOuter, { once: true });

      let res;
      try {
        res = await fetch(`${API}/ai/tts-kokoro`, {
          method: "POST",
          headers: {
            "Content-Type": "application/json",
            ...(token ? { Authorization: `Bearer ${token}` } : {}),
          },
          body: JSON.stringify({
            text:  rawText,
            voice: voiceId,
            speed: Math.max(0.5, Math.min(2.0, speed)),
          }),
          signal: ctrl.signal,
        });
      } finally {
        clearTimeout(timer);
        signal?.removeEventListener("abort", onOuter);
      }

      if (cancelled) return;

      if (!res.ok) {
        let errMsg = `Kokoro TTS HTTP ${res.status}`;
        if (res.status === 503) errMsg = "Kokoro TTS: model not yet installed on server — run: pip install kokoro-onnx soundfile";
        if (res.status === 502) errMsg = "Kokoro TTS synthesis failed — check backend logs";
        const err = new Error(errMsg);
        err.status = res.status;
        console.error("[KokoroTTS]", errMsg);
        throw err;
      }

      const blob = await res.blob();
      if (cancelled) return;

      if (!blob || blob.size === 0) {
        throw new Error("Kokoro TTS returned empty audio");
      }

      objectUrl = URL.createObjectURL(blob);
      if (cancelled) { cleanup(); return; }

      const audio = new Audio(objectUrl);
      audio.volume = Math.max(0, Math.min(1, volume));
      audioEl = audio;

      audio.onended = () => {
        const wasUrl = objectUrl;
        cleanup();
        if (wasUrl) { try { URL.revokeObjectURL(wasUrl); } catch {} }
        if (!cancelled) onEnd?.();
      };

      audio.onerror = () => {
        cleanup();
        if (!cancelled) onError?.(new Error("Kokoro audio playback failed"));
      };

      if (cancelled) { cleanup(); return; }

      try {
        await audio.play();
        onStart?.();
      } catch (playErr) {
        cleanup();
        if (!cancelled) onError?.(playErr);
      }

    } catch (err) {
      if (cancelled) return;
      onError?.(err);
    }
  })();

  return cancel;
}
