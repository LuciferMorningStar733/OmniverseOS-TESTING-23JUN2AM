// edgeTTS.js — Microsoft Edge Neural TTS client (free, no API key required)
//
// Calls the OmniverseOS backend proxy at /api/ai/tts-edge.
// Streams free Microsoft Edge Neural voices (Ava, Andrew, Emma, Brian, Sonia, etc.).
//
// Returns a cancel() function. Audio plays via HTMLAudioElement (MP3 blob URL).

import { API } from "./api";

const EDGE_FETCH_TIMEOUT_MS = 15_000;
const PREF_KEY = "cortex_edge_voice_id";

export const EDGE_VOICES = [
  { id: "en-US-AvaNeural",    label: "Ava",     accent: "American", gender: "F", note: "Expressive, smooth — default" },
  { id: "en-US-AndrewNeural", label: "Andrew",  accent: "American", gender: "M", note: "Warm, natural" },
  { id: "en-US-EmmaNeural",   label: "Emma",    accent: "American", gender: "F", note: "Clear, cheerful" },
  { id: "en-US-BrianNeural",  label: "Brian",   accent: "American", gender: "M", note: "Professional, steady" },
  { id: "en-GB-SoniaNeural",  label: "Sonia",   accent: "British",  gender: "F", note: "Refined, articulate" },
  { id: "en-GB-RyanNeural",   label: "Ryan",    accent: "British",  gender: "M", note: "Confident, crisp" },
  { id: "en-AU-NatashaNeural",label: "Natasha", accent: "Australian",gender: "F", note: "Friendly, casual" },
];

export const DEFAULT_EDGE_VOICE = "en-US-AvaNeural";

export function getEdgeVoiceId() {
  try { return localStorage.getItem(PREF_KEY) || DEFAULT_EDGE_VOICE; } catch { return DEFAULT_EDGE_VOICE; }
}

export function saveEdgeVoiceId(id) {
  try { localStorage.setItem(PREF_KEY, id); } catch {}
}

/**
 * Speak rawText via Microsoft Edge Neural TTS.
 *
 * @param {string} rawText      — Preprocessed speech-safe text
 * @param {object} options
 *   @param {function}      onStart  — Called when audio playback begins
 *   @param {function}      onEnd    — Called when playback completes
 *   @param {function}      onError  — Called on failure
 *   @param {AbortSignal}   signal   — Optional outer cancellation signal
 *   @param {number}        volume   — Playback volume 0.0–1.0
 *   @param {string}        voiceId  — Specific Edge voice ID
 * @returns {function} cancel()
 */
export function edgeSpeak(rawText, {
  onStart  = null,
  onEnd    = null,
  onError  = null,
  signal   = null,
  volume   = 1.0,
  voiceId  = null,
} = {}) {
  const voice = voiceId || getEdgeVoiceId();
  let cancelled = false;
  let audioEl   = null;
  let objectUrl = null;

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

      const ctrl  = new AbortController();
      const timer = setTimeout(
        () => ctrl.abort(new DOMException("Edge TTS fetch timeout", "TimeoutError")),
        EDGE_FETCH_TIMEOUT_MS,
      );
      const onOuter = () => ctrl.abort();
      signal?.addEventListener("abort", onOuter, { once: true });

      let res;
      try {
        res = await fetch(`${API}/ai/tts-edge`, {
          method: "POST",
          headers: {
            "Content-Type": "application/json",
            ...(token ? { Authorization: `Bearer ${token}` } : {}),
          },
          body: JSON.stringify({ text: rawText, voice }),
          signal: ctrl.signal,
        });
      } finally {
        clearTimeout(timer);
        signal?.removeEventListener("abort", onOuter);
      }

      if (cancelled) return;

      if (!res.ok) {
        const errMsg = `Edge TTS HTTP ${res.status}`;
        console.error("[EdgeTTS]", errMsg);
        throw new Error(errMsg);
      }

      const blob = await res.blob();
      if (cancelled) return;

      if (blob.size < 100) {
        throw new Error("Edge TTS returned empty or invalid audio payload");
      }

      objectUrl = URL.createObjectURL(blob);
      audioEl   = new Audio(objectUrl);
      audioEl.volume = Math.max(0, Math.min(1, volume));

      audioEl.onended = () => {
        if (cancelled) return;
        cleanup();
        onEnd?.();
      };

      audioEl.onerror = (e) => {
        if (cancelled) return;
        console.error("[EdgeTTS] Audio playback error:", e);
        cleanup();
        onError?.(new Error("Edge TTS audio element failed to play"));
      };

      await audioEl.play();
      if (!cancelled) {
        onStart?.();
      } else {
        cleanup();
      }
    } catch (err) {
      if (cancelled) return;
      cleanup();
      console.warn("[EdgeTTS] Synthesis failed:", err?.message || err);
      onError?.(err);
    }
  })();

  return cancel;
}
