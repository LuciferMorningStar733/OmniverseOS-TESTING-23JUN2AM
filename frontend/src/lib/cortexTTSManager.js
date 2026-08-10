// cortexTTSManager.js — Cortex TTS 3-tier provider orchestration
//
// Provider chain:
//   Level 1 — Fish Audio          (high-quality, server-proxied, API key-protected)
//   Level 2 — Puter.js            (user-pays, no extra key, browser-side)
//   Level 3 — StreamElements/Web  (StreamElements Amazon Polly → browser SpeechSynthesis)
//
// Features:
//   • In-memory circuit breaker: consecutive Fish/Puter failures temporarily
//     bypass that provider (resets after cooldown so recovery is automatic)
//   • Speech generation ID guard: every async callback checks it still owns
//     the active generation before acting — prevents stale audio talking over
//     a newer response
//   • Text preprocessing: strips Markdown + [CMD:*] tags, collapses code blocks
//   • Internal observability: non-sensitive diagnostics only (no API keys, no text)
//
// SECURITY: FISH_AUDIO_API_KEY is never read here — it lives in the backend.

import { fishSpeak }                         from "./fishTTS";
import { puterSpeak }                        from "./puterTTS";
import { streamSpeak, isStreamTTSAvailable, getStreamVoiceId } from "./streamTTS";
import { browserSpeak, isBrowserTTSSupported, getPreferredVoiceObject } from "./browserTTS";

// ── In-memory circuit breakers ──────────────────────────────────────────────
// Keyed by provider name. Not persisted — resets on page load.
const _circuit = {
  fish:  { failures: 0, openUntil: 0, THRESHOLD: 3, COOLDOWN_MS: 60_000 },
  puter: { failures: 0, openUntil: 0, THRESHOLD: 2, COOLDOWN_MS: 30_000 },
};

function _isOpen(provider) {
  const c = _circuit[provider];
  if (!c) return false;
  if (Date.now() < c.openUntil) return true;
  if (c.openUntil > 0) {
    // Cooldown expired — half-open probe: reset and allow one attempt
    c.failures  = 0;
    c.openUntil = 0;
  }
  return false;
}

function _onFailure(provider) {
  const c = _circuit[provider];
  if (!c) return;
  c.failures += 1;
  if (c.failures >= c.THRESHOLD) {
    c.openUntil = Date.now() + c.COOLDOWN_MS;
    console.warn(
      `[CortexTTS] Circuit OPEN: "${provider}" — ${c.failures} consecutive failures. ` +
      `Bypassing for ${c.COOLDOWN_MS / 1000}s then probing again.`,
    );
  }
}

function _onSuccess(provider) {
  const c = _circuit[provider];
  if (!c) return;
  c.failures  = 0;
  c.openUntil = 0;
}

// ── Text preprocessing ──────────────────────────────────────────────────────
/**
 * Strip speech-hostile syntax from a Cortex response before sending to TTS.
 * Returns a new string — never mutates the original (visible chat text must be unaffected).
 */
export function preprocessForTTS(rawText) {
  if (!rawText) return "";

  let text = rawText;

  // 1. Remove internal OS action tags — these are never spoken
  text = text.replace(/\[CMD:[^\]]*\]/gi, "");

  // 2. Collapse large code blocks to a brief spoken summary
  //    (prevents Cortex reading 200 lines of code aloud character by character)
  text = text.replace(/```[\s\S]*?```/g, " I've added the code in chat. ");

  // 3. Strip inline code ticks — speak the content, not the backticks
  text = text.replace(/`([^`]+)`/g, "$1");

  // 4. Strip Markdown bold / italic / underline
  text = text
    .replace(/\*\*(.+?)\*\*/gs, "$1")
    .replace(/__(.+?)__/gs, "$1")
    .replace(/\*(.+?)\*/gs, "$1")
    .replace(/_(.+?)_/gs, "$1");

  // 5. Strip Markdown headers
  text = text.replace(/^#{1,6}\s+/gm, "");

  // 6. Strip list markers
  text = text.replace(/^[\s]*[-*+]\s+/gm, "");
  text = text.replace(/^[\s]*\d+\.\s+/gm, "");

  // 7. Strip Markdown links — speak the link text, not the URL
  text = text.replace(/\[([^\]]+)\]\([^)]+\)/g, "$1");
  text = text.replace(/\[([^\]]+)\]/g, "$1");

  // 8. Strip HTML tags
  text = text.replace(/<[^>]+>/g, "");

  // 9. Shorten very long bare URLs (>40 chars) to "the link"
  text = text.replace(/https?:\/\/\S{40,}/g, "the link");

  // 10. Normalize whitespace
  text = text.replace(/\n{2,}/g, ". ").replace(/\n/g, " ").replace(/\s{2,}/g, " ").trim();

  return text;
}

// ── Internal diagnostics logger ─────────────────────────────────────────────
// Logs NON-SENSITIVE data only: provider name, latency, error category.
// Never logs API keys, authorization headers, or user speech content.
function _log(event) {
  if (process.env.NODE_ENV !== "production") {
    console.debug("[CortexTTS]", event);
  }
}

// ── Main entry point ────────────────────────────────────────────────────────
/**
 * speakCortex — dispatch text through the 3-tier provider chain.
 *
 * Provider selection:
 *   voiceEngine === "fish"    → Level 1 → 2 → 3 (full chain)
 *   voiceEngine === "stream"  → Level 3A only (StreamElements, existing behaviour)
 *   voiceEngine === "browser" → Level 3B only (Web Speech API, existing behaviour)
 *
 * @param {string} rawText           — Cortex response (will be preprocessed inside)
 * @param {object} opts
 *   @param {React.MutableRefObject<number>} generationRef
 *       Shared ref from Voice.js. speakCortex reads .current to detect staleness;
 *       Voice.js must increment it BEFORE calling speakCortex so stale callbacks
 *       from the previous generation are automatically discarded.
 *   @param {number}   speechGeneration  — The generation ID captured BEFORE the call
 *   @param {function} onStart           — Called when audio playback begins
 *   @param {function} onEnd             — Called when playback ends naturally
 *   @param {function} onError           — Called if all providers fail
 *   @param {function} onProviderUsed    — Called with provider name string
 *   @param {number}   volume            — 0.0–1.0
 *   @param {string}   voiceEngine       — "fish" | "stream" | "browser"
 *   @param {string}   streamVoiceId     — StreamElements voice ID
 *   @param {number}   rate              — Speech rate 0.5–2.0
 *   @param {number}   pitch             — Pitch 0.0–2.0 (browser engine only)
 *
 * @returns {{ cancel: function }} — Immediately stops and discards audio
 */
export function speakCortex(rawText, {
  generationRef,
  speechGeneration,
  onStart        = null,
  onEnd          = null,
  onError        = null,
  onProviderUsed = null,
  volume         = 1.0,
  voiceEngine    = "fish",
  streamVoiceId  = null,
  rate           = 1.0,
  pitch          = 1.0,
} = {}) {
  const text = preprocessForTTS(rawText);

  if (!text) {
    setTimeout(() => onEnd?.(), 0);
    return { cancel: () => {} };
  }

  let cancelActive = null;
  let cancelled    = false;
  const t0 = Date.now();

  const cancel = () => {
    cancelled = true;
    cancelActive?.();
    cancelActive = null;
  };

  // Returns true if this generation has been superseded (stop was called, or
  // a new response started). Async callbacks must check this before acting.
  const isStale = () =>
    generationRef
      ? generationRef.current !== speechGeneration
      : false;

  // ── Level 3B — Browser Web Speech API ──────────────────────────────────
  const tryBrowser = () => {
    if (cancelled || isStale()) return;
    onProviderUsed?.("browser");
    _log({ level: "3B", provider: "browser", latency_ms: Date.now() - t0 });

    if (!isBrowserTTSSupported()) {
      onError?.(new Error("No TTS available in this browser"));
      return;
    }

    const preferredVoice = getPreferredVoiceObject();
    let retries = 0;

    const attempt = (voiceObj) => {
      const cancelFn = browserSpeak(text, {
        voice: voiceObj,
        rate, pitch, volume,
        onStart: () => {
          if (cancelled || isStale()) { cancelFn?.(); return; }
          onStart?.();
        },
        onEnd: () => {
          if (isStale() || cancelled) return;
          onEnd?.();
        },
        onError: () => {
          if (cancelled || isStale()) return;
          cancelActive = null;
          if (retries < 1) {
            retries++;
            // Retry with default browser voice
            setTimeout(() => attempt(null), 100);
          } else {
            onError?.(new Error("Browser TTS failed after retry"));
          }
        },
      });
      cancelActive = cancelFn;
    };

    attempt(preferredVoice);
  };

  // ── Level 3A — StreamElements (Amazon Polly Neural) ────────────────────
  const tryStream = () => {
    if (cancelled || isStale()) return;
    onProviderUsed?.("stream");
    _log({ level: "3A", provider: "stream", latency_ms: Date.now() - t0 });

    if (!isStreamTTSAvailable()) {
      tryBrowser();
      return;
    }

    const cancelFn = streamSpeak(text, {
      voiceId: streamVoiceId || getStreamVoiceId(),
      rate,
      volume,
      onStart: () => {
        if (cancelled || isStale()) { cancelFn?.(); return; }
        onStart?.();
      },
      onEnd: () => {
        if (isStale() || cancelled) return;
        onEnd?.();
      },
      onError: () => {
        if (cancelled || isStale()) return;
        _log({ level: "3A", provider: "stream", status: "failed", latency_ms: Date.now() - t0 });
        tryBrowser();
      },
    });
    cancelActive = cancelFn;
  };

  // ── Level 2 — Puter.js ─────────────────────────────────────────────────
  const tryPuter = () => {
    if (cancelled || isStale()) return;

    if (_isOpen("puter")) {
      _log({ level: 2, provider: "puter", status: "circuit-open", latency_ms: Date.now() - t0 });
      tryStream();
      return;
    }

    _log({ level: 2, provider: "puter", latency_ms: Date.now() - t0 });

    const cancelFn = puterSpeak(text, {
      volume,
      onStart: () => {
        if (cancelled || isStale()) { cancelFn?.(); return; }
        _onSuccess("puter");
        onStart?.();
        onProviderUsed?.("puter");
      },
      onEnd: () => {
        if (isStale() || cancelled) return;
        onEnd?.();
      },
      onError: (err) => {
        if (cancelled || isStale()) return;
        _log({ level: 2, provider: "puter", status: "failed", error: err?.message, latency_ms: Date.now() - t0 });
        _onFailure("puter");
        tryStream();
      },
    });
    cancelActive = cancelFn;
  };

  // ── Level 1 — Fish Audio ────────────────────────────────────────────────
  const tryFish = () => {
    if (cancelled || isStale()) return;

    if (_isOpen("fish")) {
      _log({ level: 1, provider: "fish", status: "circuit-open", latency_ms: Date.now() - t0 });
      tryPuter();
      return;
    }

    _log({ level: 1, provider: "fish", latency_ms: Date.now() - t0 });

    const cancelFn = fishSpeak(text, {
      volume,
      onStart: () => {
        if (cancelled || isStale()) { cancelFn?.(); return; }
        _onSuccess("fish");
        onStart?.();
        onProviderUsed?.("fish");
      },
      onEnd: () => {
        if (isStale() || cancelled) return;
        onEnd?.();
      },
      onError: (err) => {
        if (cancelled || isStale()) return;
        _log({ level: 1, provider: "fish", status: "failed", error: err?.message, latency_ms: Date.now() - t0 });
        _onFailure("fish");
        tryPuter();
      },
    });
    cancelActive = cancelFn;
  };

  // ── Dispatch based on voiceEngine setting ──────────────────────────────
  if (voiceEngine === "fish") {
    // Full 3-tier chain: Fish → Puter → Stream → Browser
    tryFish();
  } else if (voiceEngine === "browser") {
    // Existing behaviour: Browser only
    tryBrowser();
  } else {
    // voiceEngine === "stream" (default existing behaviour)
    // Stream → Browser
    tryStream();
  }

  return { cancel };
}
