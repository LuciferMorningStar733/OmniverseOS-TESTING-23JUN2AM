// puterTTS.js — Puter.js TTS fallback
//
// Uses window.puter.ai.txt2speech() as a no-API-key Level 2 fallback.
// Puter uses a "user-pays" model — on first use, the user may be prompted
// to log in or grant permission.  We time-box the entire call to
// PUTER_SPEAK_TIMEOUT_MS so Cortex never hangs waiting for a Puter auth UI.
// If the call doesn't complete in time we fail fast and fall through to Level 3.
//
// DO NOT add a PUTER_API_KEY — Puter's intended architecture for txt2speech
// doesn't require one. Do not add OpenAI/ElevenLabs/Gemini keys either.
//
// UX behaviour on first use:
//   • Puter may open a small popup requesting authorization.
//   • If the user approves: audio plays, Puter becomes a reliable fallback.
//   • If the user dismisses / ignores: timeout fires → Level 3 (Stream/Browser).
//   • If Puter is unavailable at all: onError fires → Level 3 immediately.

const PUTER_SPEAK_TIMEOUT_MS = 7_000; // 7 s — auth popup window before giving up

function isPuterReady() {
  return (
    typeof window !== "undefined" &&
    typeof window.puter !== "undefined" &&
    typeof window.puter?.ai?.txt2speech === "function"
  );
}

/**
 * Speak rawText via Puter.js TTS.
 *
 * @param {string} rawText      — Already preprocessed speech-safe text
 * @param {object} options
 *   @param {function}  onStart  — Called when playback begins
 *   @param {function}  onEnd    — Called when playback completes (not on cancel)
 *   @param {function}  onError  — Called with Error on any failure
 *   @param {number}    volume   — 0.0–1.0
 * @returns {function} cancel() — Stop and discard audio immediately
 */
export function puterSpeak(rawText, {
  onStart = null,
  onEnd   = null,
  onError = null,
  volume  = 1.0,
} = {}) {
  let cancelled = false;
  let audioEl   = null;

  const cancel = () => {
    cancelled = true;
    if (audioEl) {
      try { audioEl.pause(); } catch {}
      audioEl.onended = null;
      audioEl.onerror = null;
      audioEl.src = "";
      audioEl = null;
    }
  };

  (async () => {
    try {
      if (!isPuterReady()) {
        throw new Error("Puter.js not available");
      }

      // Race: Puter call vs timeout (auth popup guard)
      let timedOut = false;
      const timeoutPromise = new Promise((_, reject) => {
        setTimeout(() => {
          timedOut = true;
          reject(new Error("Puter TTS timeout — auth or synthesis too slow"));
        }, PUTER_SPEAK_TIMEOUT_MS);
      });

      const audio = await Promise.race([
        window.puter.ai.txt2speech(rawText),
        timeoutPromise,
      ]);

      if (cancelled) return;
      if (!audio) throw new Error("Puter TTS returned no audio element");

      audioEl = audio;

      if (typeof audio.volume !== "undefined") {
        audio.volume = Math.max(0, Math.min(1, volume));
      }

      audio.onended = () => {
        audioEl = null;
        if (!cancelled) onEnd?.();
      };

      audio.onerror = () => {
        audioEl = null;
        if (!cancelled) onError?.(new Error("Puter audio playback failed"));
      };

      if (cancelled) { cancel(); return; }

      try {
        await audio.play();
        onStart?.();
      } catch (playErr) {
        cancel();
        if (!cancelled) onError?.(playErr);
      }

    } catch (err) {
      if (cancelled) return;
      onError?.(err);
    }
  })();

  return cancel;
}

/** Quick availability probe — does NOT make a network call. */
export function isPuterTTSAvailable() {
  return isPuterReady();
}
