// browserTTS.js — Free browser-based TTS engine using Web Speech API
// No paid APIs. No Google Cloud TTS. No ElevenLabs. Pure SpeechSynthesis.

// ── Voice quality scoring ─────────────────────────────────────────────────
// Higher score = better quality voice
function scoreVoice(voice) {
  const name = voice.name.toLowerCase();
  const lang = (voice.lang || "").toLowerCase();
  const isEnglish = lang.startsWith("en");
  const base = isEnglish ? 0 : -30;

  // Microsoft Edge Neural voices — best quality (Chromium Edge)
  const edgeNeural = [
    "aria", "jenny", "guy", "andrew", "ava", "emma", "brian",
    "michelle", "ryan", "roger", "steffan", "ana", "christopher",
    "eric", "jacob", "jane", "jason", "jenny", "julia", "liam",
    "libby", "luna", "maisie", "neerja", "sara", "tony",
  ];
  if (name.includes("microsoft") && edgeNeural.some((n) => name.includes(n))) {
    return base + 100;
  }
  if (name.includes("microsoft") && (name.includes("neural") || name.includes("natural"))) {
    return base + 95;
  }
  if (name.includes("microsoft") && isEnglish) return base + 75;
  if (name.includes("microsoft")) return base + 55;

  // Google Chrome voices
  if (name.startsWith("google") && isEnglish) {
    if (name.includes("uk")) return base + 85;
    if (name.includes("us")) return base + 83;
    return base + 80;
  }

  // Apple SpeechSynthesis voices (Safari / macOS / iOS)
  const appleHighQuality = ["samantha", "daniel", "karen", "moira", "alex", "siri", "fiona", "tessa", "veena", "nicky", "ava"];
  if (appleHighQuality.some((n) => name === n || name.startsWith(n + " "))) {
    return base + 78;
  }

  // Other English voices with "Enhanced" / "Premium" in name
  if (isEnglish && (name.includes("enhanced") || name.includes("premium"))) {
    return base + 72;
  }

  // Compact / offline / low-quality indicators
  if (name.includes("compact") || name.includes("lite") || name.includes("basic")) {
    return base + 15;
  }

  if (isEnglish) return base + 40;
  return base + 10;
}

function detectEngine(voice) {
  const name = voice.name.toLowerCase();
  if (name.includes("microsoft")) return "Microsoft Edge";
  if (name.startsWith("google")) return "Google Chrome";

  const ua = navigator.userAgent || "";
  const isSafariBased = ua.includes("Safari") && !ua.includes("Chrome");
  const appleNames = ["samantha", "alex", "daniel", "karen", "moira", "siri", "fiona", "tessa", "veena", "nicky", "ava"];
  if (isSafariBased || appleNames.some((n) => name.includes(n))) return "Apple";

  return "System";
}

function detectQuality(voice) {
  const name = voice.name.toLowerCase();
  const score = scoreVoice(voice);
  if (name.includes("neural") || name.includes("natural")) return "Neural";
  if (score >= 90) return "Neural";
  if (score >= 70) return "Enhanced";
  if (score >= 35) return "Standard";
  return "Basic";
}

// ── Voice list helpers ────────────────────────────────────────────────────

export function getRawVoices() {
  if (typeof window === "undefined" || !window.speechSynthesis) return [];
  return window.speechSynthesis.getVoices();
}

export function getAvailableVoices() {
  return getRawVoices()
    .map((v) => ({
      voice: v,
      name: v.name,
      lang: v.lang,
      local: v.localService,
      default: v.default,
      score: scoreVoice(v),
      engine: detectEngine(v),
      quality: detectQuality(v),
    }))
    .sort((a, b) => b.score - a.score);
}

export function getBestVoice() {
  const list = getAvailableVoices();
  return list.length > 0 ? list[0] : null;
}

// ── Preferences ───────────────────────────────────────────────────────────

const PREF_KEY = "cortex_browser_voice_name";

export function getPreferredVoiceName() {
  try { return localStorage.getItem(PREF_KEY) || null; } catch { return null; }
}

export function savePreferredVoiceName(name) {
  try { localStorage.setItem(PREF_KEY, name); } catch {}
}

export function getPreferredVoiceObject() {
  const saved = getPreferredVoiceName();
  if (!saved) return null;
  return getRawVoices().find((v) => v.name === saved) || null;
}

// ── Support detection ─────────────────────────────────────────────────────

export function isBrowserTTSSupported() {
  return !!(
    typeof window !== "undefined" &&
    window.speechSynthesis &&
    window.SpeechSynthesisUtterance
  );
}

// ── Async voice loader ────────────────────────────────────────────────────
// Browsers (especially Chrome) load voices asynchronously. This Promise
// resolves once the voice list is populated (or times out after 3 s).

export function loadVoices() {
  return new Promise((resolve) => {
    if (typeof window === "undefined" || !window.speechSynthesis) {
      resolve([]);
      return;
    }

    const immediate = window.speechSynthesis.getVoices();
    if (immediate.length > 0) {
      resolve(immediate);
      return;
    }

    let settled = false;
    const finish = (voices) => {
      if (settled) return;
      settled = true;
      window.speechSynthesis.removeEventListener("voiceschanged", onChanged);
      resolve(voices);
    };

    const onChanged = () => finish(window.speechSynthesis.getVoices());
    window.speechSynthesis.addEventListener("voiceschanged", onChanged);

    // Fallback timeout
    setTimeout(() => finish(window.speechSynthesis.getVoices()), 3000);
  });
}

// ── Core speak function ───────────────────────────────────────────────────
// Returns a cancel() function. Handles:
//   - Chrome's ~15 s stall bug (keepAlive interval)
//   - utterance error classification
//   - interrupted / cancelled → treated as normal end (not an error)

export function browserSpeak(text, {
  voice       = null,   // SpeechSynthesisVoice | null
  rate        = 1.0,
  pitch       = 1.0,
  volume      = 1.0,
  onStart     = null,
  onEnd       = null,
  onError     = null,
  onBoundary  = null,
} = {}) {
  if (!isBrowserTTSSupported()) {
    onError?.(new Error("SpeechSynthesis is not supported in this browser"));
    return () => {};
  }

  // Cancel any ongoing speech before starting
  window.speechSynthesis.cancel();

  const utterance = new window.SpeechSynthesisUtterance(text);
  utterance.rate   = Math.min(2.0, Math.max(0.1, rate));
  utterance.pitch  = Math.min(2.0, Math.max(0.0, pitch));
  utterance.volume = Math.min(1.0, Math.max(0.0, volume));

  // Voice selection: explicit > preferred > auto-best
  const targetVoice = voice || getPreferredVoiceObject() || getBestVoice()?.voice || null;
  if (targetVoice) utterance.voice = targetVoice;

  let keepAliveTimer = null;
  let cancelled = false;

  utterance.onstart = () => { onStart?.(); };

  utterance.onend = () => {
    clearInterval(keepAliveTimer);
    onEnd?.();
  };

  utterance.onerror = (event) => {
    clearInterval(keepAliveTimer);
    const err = event.error || "";
    // interrupted / cancelled are intentional stops — treat as normal end
    if (err === "interrupted" || err === "cancelled" || err === "cancel") {
      onEnd?.();
    } else {
      onError?.(new Error(`SpeechSynthesis error: ${err}`));
    }
  };

  if (onBoundary) utterance.onboundary = onBoundary;

  window.speechSynthesis.speak(utterance);

  // ── Chrome keepAlive workaround ───────────────────────────────────────
  // Chrome cancels speech after ~15 s in some versions. Pausing and
  // immediately resuming every 10 s prevents this without audible glitch.
  const ua = navigator.userAgent || "";
  const isChrome = ua.includes("Chrome") && !ua.includes("Edg");
  if (isChrome) {
    keepAliveTimer = setInterval(() => {
      if (!window.speechSynthesis.speaking) {
        clearInterval(keepAliveTimer);
        return;
      }
      window.speechSynthesis.pause();
      window.speechSynthesis.resume();
    }, 10000);
  }

  const cancel = () => {
    cancelled = true;
    clearInterval(keepAliveTimer);
    window.speechSynthesis.cancel();
  };

  return cancel;
}

// ── Convenience: is TTS currently speaking? ───────────────────────────────
export function isSpeaking() {
  return !!(window.speechSynthesis?.speaking);
}

export function cancelSpeech() {
  window.speechSynthesis?.cancel();
}
