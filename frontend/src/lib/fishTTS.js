// fishTTS.js — Fish Audio TTS client
//
// SECURITY: FISH_AUDIO_API_KEY is NEVER sent to the browser.
// All Fish Audio requests go through the OmniverseOS backend proxy.
// The browser calls /api/ai/tts-fish — the backend calls Fish Audio.
//
// Returns a cancel() function. Audio plays via HTMLAudioElement (MP3 blob URL).
// Works on Safari/WebKit/iPadOS — no AudioContext required for playback.

import { API } from "./api";

const FISH_FETCH_TIMEOUT_MS = 12_000; // 12 s — includes cold-start headroom

/**
 * Speak rawText via Fish Audio (through the backend proxy).
 *
 * @param {string} rawText      — Already preprocessed speech-safe text
 * @param {object} options
 *   @param {function}      onStart  — Called when audio playback begins
 *   @param {function}      onEnd    — Called when playback completes (not called on cancel)
 *   @param {function}      onError  — Called with Error on any failure
 *   @param {AbortSignal}   signal   — Optional outer cancellation signal
 *   @param {number}        volume   — Playback volume 0.0–1.0
 * @returns {function} cancel() — Call to stop and discard in-flight/active audio immediately
 */
export function fishSpeak(rawText, {
  onStart  = null,
  onEnd    = null,
  onError  = null,
  signal   = null,
  volume   = 1.0,
} = {}) {
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

      // ── Build combined timeout + outer abort signal ─────────────────────
      const ctrl  = new AbortController();
      const timer = setTimeout(
        () => ctrl.abort(new DOMException("Fish TTS fetch timeout", "TimeoutError")),
        FISH_FETCH_TIMEOUT_MS,
      );
      const onOuter = () => ctrl.abort();
      signal?.addEventListener("abort", onOuter, { once: true });

      let res;
      try {
        res = await fetch(`${API}/ai/tts-fish`, {
          method: "POST",
          headers: {
            "Content-Type": "application/json",
            ...(token ? { Authorization: `Bearer ${token}` } : {}),
          },
          body: JSON.stringify({ text: rawText }),
          signal: ctrl.signal,
        });
      } finally {
        clearTimeout(timer);
        signal?.removeEventListener("abort", onOuter);
      }

      if (cancelled) return;

      if (!res.ok) {
        let errMsg = `Fish TTS HTTP ${res.status}`;
        if (res.status === 402) errMsg = "Fish Audio: Insufficient credits — add credits at fish.audio/app/developers";
        if (res.status === 401) errMsg = "Fish Audio: Invalid API key — check FISHAUDIO_API_KEY in Render environment";
        if (res.status === 403) errMsg = "Fish Audio: API key access denied";
        if (res.status === 429) errMsg = "Fish Audio: Rate limited — try again shortly";
        if (res.status === 503) errMsg = "Fish Audio: API key not configured on server";
        const err = new Error(errMsg);
        err.status = res.status;
        console.error("[FishTTS]", errMsg);
        throw err;
      }

      const blob = await res.blob();
      if (cancelled) return;

      if (!blob || blob.size === 0) {
        throw new Error("Fish TTS returned empty audio");
      }

      objectUrl = URL.createObjectURL(blob);
      if (cancelled) { cleanup(); return; }

      const audio = new Audio(objectUrl);
      audio.volume = Math.max(0, Math.min(1, volume));
      audioEl = audio;

      audio.onended = () => {
        const wasObjectUrl = objectUrl;
        cleanup();
        // Revoke the URL we just used (cleanup already nulled objectUrl,
        // so keep a local ref above)
        if (wasObjectUrl) {
          try { URL.revokeObjectURL(wasObjectUrl); } catch {}
        }
        if (!cancelled) onEnd?.();
      };

      audio.onerror = () => {
        cleanup();
        if (!cancelled) onError?.(new Error("Fish audio playback failed"));
      };

      if (cancelled) { cleanup(); return; }

      // Safari requires play() inside a user-gesture context. On the first
      // Cortex response the gesture is the user's mic tap — typically fine.
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
