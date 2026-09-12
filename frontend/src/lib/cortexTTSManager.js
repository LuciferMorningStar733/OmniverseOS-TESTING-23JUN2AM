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

import { kokoroSpeak, getKokoroVoiceId }      from "./kokoroTTS";
import { edgeSpeak }                           from "./edgeTTS";
import { fishSpeak }                           from "./fishTTS";
import { puterSpeak }                        from "./puterTTS";
import { streamSpeak, isStreamTTSAvailable, getStreamVoiceId } from "./streamTTS";
import { browserSpeak, isBrowserTTSSupported, getPreferredVoiceObject } from "./browserTTS";

// ── In-memory circuit breakers ──────────────────────────────────────────────
// Keyed by provider name. Not persisted — resets on page load.
const _circuit = {
  kokoro: { failures: 0, openUntil: 0, THRESHOLD: 2, COOLDOWN_MS: 120_000 }, // longer cooldown — model may be cold-starting
  edge:   { failures: 0, openUntil: 0, THRESHOLD: 3, COOLDOWN_MS: 45_000 },
  fish:   { failures: 0, openUntil: 0, THRESHOLD: 3, COOLDOWN_MS: 60_000 },
  puter:  { failures: 0, openUntil: 0, THRESHOLD: 2, COOLDOWN_MS: 30_000 },
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

// ── Text preprocessing & Humanization ───────────────────────────────────────
/**
 * Strip speech-hostile syntax and normalize text for natural, human-like Cortex TTS.
 * Returns a new string — never mutates the original.
 */
export function preprocessForTTS(rawText) {
  if (!rawText) return "";

  let text = rawText;

  // 1. Remove internal OS action tags — these are never spoken
  text = text.replace(/\[CMD:[^\]]*\]/gi, "");

  // 2. Collapse code blocks to a natural conversational phrase
  text = text.replace(/```[\s\S]*?```/g, " I have provided the code in chat. ");

  // 3. Strip inline code ticks — speak the content naturally
  text = text.replace(/`([^`]+)`/g, "$1");

  // 4. Markdown tables: remove table formatting grids and headers
  text = text.replace(/\|[\s-:]+\|[\s-:|]*/g, " ");
  text = text.replace(/\|/g, ", ");

  // 5. Blockquotes and horizontal rules
  text = text.replace(/^>\s*/gm, "");
  text = text.replace(/^[-*_]{3,}\s*$/gm, " ");

  // 6. Headings & List items: convert to clean sentence pauses before stripping inline markers
  text = text.replace(/^#{1,6}\s+(.+)$/gm, "$1. ");
  text = text.replace(/^[\s]*[-*+]\s+(.+)$/gm, "$1. ");
  text = text.replace(/^[\s]*\d+\.\s+(.+)$/gm, "$1. ");

  // 7. Strip Markdown bold / italic / strikethrough
  text = text
    .replace(/\*\*(.+?)\*\*/gs, "$1")
    .replace(/__(.+?)__/gs, "$1")
    .replace(/\*(.+?)\*/gs, "$1")
    .replace(/_(.+?)_/gs, "$1")
    .replace(/~~(.+?)~~/gs, "$1");

  // 8. Markdown links: speak only link label, omit raw URLs
  text = text.replace(/\[([^\]]+)\]\([^)]+\)/g, "$1");
  text = text.replace(/\[([^\]]+)\]/g, "$1");

  // 9. Strip HTML tags
  text = text.replace(/<[^>]+>/g, " ");

  // 10. Shorten URLs to conversational phrases
  text = text.replace(/https?:\/\/\S+/g, "the referenced link");

  // 11. Strip unicode emojis so TTS engine doesn't read symbol names aloud
  // eslint-disable-next-line no-misleading-character-class
  text = text.replace(/[\u{1F300}-\u{1FAD6}\u{1F600}-\u{1F64F}\u{1F680}-\u{1F6FF}\u{2600}-\u{26FF}\u{2700}-\u{27BF}\u{FE00}-\u{FE0F}]/gu, "");

  // 12. Humanized pronunciation for common technical acronyms and units
  text = text.replace(/\bv(\d+)\.(\d+)\b/gi, "version $1 point $2");
  text = text.replace(/\bAI\b/g, "A.I.");
  text = text.replace(/\bOS\b/g, "O.S.");
  text = text.replace(/\bAPI\b/g, "A.P.I.");
  text = text.replace(/\bAPIs\b/g, "A.P.I.s");
  text = text.replace(/\bUI\b/g, "U.I.");
  text = text.replace(/\bUX\b/g, "U.X.");
  text = text.replace(/\bTTS\b/g, "T.T.S.");
  text = text.replace(/\bURL\b/g, "U.R.L.");
  text = text.replace(/\bURLs\b/g, "U.R.L.s");
  text = text.replace(/\bSDK\b/g, "S.D.K.");
  text = text.replace(/\bCLI\b/g, "C.L.I.");
  text = text.replace(/\bCPU\b/g, "C.P.U.");
  text = text.replace(/\bGPU\b/g, "G.P.U.");
  text = text.replace(/\bHTML\b/g, "H.T.M.L.");
  text = text.replace(/\bCSS\b/g, "C.S.S.");
  text = text.replace(/\b(\d+)\s*ms\b/gi, "$1 milliseconds");
  text = text.replace(/\b(\d+)\s*px\b/gi, "$1 pixels");
  text = text.replace(/\$(\d+(?:\.\d+)?)\b/g, "$1 dollars");
  text = text.replace(/(\d+)%/g, "$1 percent");
  text = text.replace(/&/g, " and ");

  // 13. Normalize consecutive punctuation & whitespace
  text = text.replace(/\.{2,}/g, ".");
  text = text.replace(/\s*([,;?!])\s*/g, "$1 ");
  text = text.replace(/\n{2,}/g, ". ").replace(/\n/g, " ").replace(/\s{2,}/g, " ").trim();

  return text;
}

/**
 * Split long responses into natural speech cadence chunks at sentence or clause boundaries.
 * Enables low-latency streaming speech without mid-word or mid-sentence cuts.
 */
export function splitIntoSpeechChunks(text, maxChunkLen = 200) {
  if (!text) return [];
  if (text.length <= maxChunkLen) return [text];

  const sentences = text.match(/[^.!?]+[.!?]+(?:\s|$)|[^.!?]+$/g) || [text];
  const chunks = [];
  let currentChunk = "";

  for (const sentence of sentences) {
    const trimmed = sentence.trim();
    if (!trimmed) continue;

    if (currentChunk.length + trimmed.length + 1 <= maxChunkLen) {
      currentChunk = currentChunk ? `${currentChunk} ${trimmed}` : trimmed;
    } else {
      if (currentChunk) chunks.push(currentChunk);
      if (trimmed.length > maxChunkLen) {
        // If a single sentence exceeds maxChunkLen, split on commas or clauses
        const subParts = trimmed.split(/,\s+/);
        let subChunk = "";
        for (const part of subParts) {
          if (subChunk.length + part.length + 2 <= maxChunkLen) {
            subChunk = subChunk ? `${subChunk}, ${part}` : part;
          } else {
            if (subChunk) chunks.push(subChunk);
            subChunk = part;
          }
        }
        if (subChunk) currentChunk = subChunk;
      } else {
        currentChunk = trimmed;
      }
    }
  }

  if (currentChunk) chunks.push(currentChunk);
  return chunks;
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
 *   voiceEngine === "kokoro"  → Level 0 (Kokoro-82M, free) → 1 → 2 → 3 (full chain)
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
 *   @param {string}   voiceEngine       — "kokoro" | "fish" | "stream" | "browser"
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
  voiceEngine    = "kokoro",
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

  // ── Level 1 — Edge TTS (Microsoft free neural) ─────────────────────────
  const tryEdge = () => {
    if (cancelled || isStale()) return;

    if (_isOpen("edge")) {
      _log({ level: 1, provider: "edge", status: "circuit-open", latency_ms: Date.now() - t0 });
      tryFish();
      return;
    }

    _log({ level: 1, provider: "edge", latency_ms: Date.now() - t0 });

    const cancelFn = edgeSpeak(text, {
      volume,
      onStart: () => {
        if (cancelled || isStale()) { cancelFn?.(); return; }
        _onSuccess("edge");
        onStart?.();
        onProviderUsed?.("edge");
      },
      onEnd: () => {
        if (isStale() || cancelled) return;
        onEnd?.();
      },
      onError: (err) => {
        if (cancelled || isStale()) return;
        _log({ level: 1, provider: "edge", status: "failed", error: err?.message, latency_ms: Date.now() - t0 });
        _onFailure("edge");
        tryFish();
      },
    });
    cancelActive = cancelFn;
  };

  // ── Level 0 — Kokoro (free, open-source) ───────────────────────────────
  const tryKokoro = () => {
    if (cancelled || isStale()) return;

    if (_isOpen("kokoro")) {
      _log({ level: 0, provider: "kokoro", status: "circuit-open", latency_ms: Date.now() - t0 });
      tryEdge();
      return;
    }

    _log({ level: 0, provider: "kokoro", latency_ms: Date.now() - t0 });

    const cancelFn = kokoroSpeak(text, {
      volume,
      speed: rate, // Kokoro accepts speed natively — maps cleanly from rate
      onStart: () => {
        if (cancelled || isStale()) { cancelFn?.(); return; }
        _onSuccess("kokoro");
        onStart?.();
        onProviderUsed?.("kokoro");
      },
      onEnd: () => {
        if (isStale() || cancelled) return;
        onEnd?.();
      },
      onError: (err) => {
        if (cancelled || isStale()) return;
        _log({ level: 0, provider: "kokoro", status: "failed", error: err?.message, latency_ms: Date.now() - t0 });
        _onFailure("kokoro");
        tryEdge();
      },
    });
    cancelActive = cancelFn;
  };

  // ── Dispatch based on voiceEngine setting ──────────────────────────────
  if (voiceEngine === "kokoro") {
    // Level 0 chain: Kokoro → Edge → Fish → Puter → Stream → Browser
    tryKokoro();
  } else if (voiceEngine === "edge") {
    // Level 1 chain: Edge → Fish → Puter → Stream → Browser
    tryEdge();
  } else if (voiceEngine === "fish") {
    // Level 2 chain: Fish → Puter → Stream → Browser
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

