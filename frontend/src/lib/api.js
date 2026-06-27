import axios from "axios";

const BASE = process.env.REACT_APP_BACKEND_URL || "";
export const API = `${BASE}/api`;

export const api = axios.create({ baseURL: API });

api.interceptors.request.use((cfg) => {
  const token = localStorage.getItem("omniverse_token");
  if (token) cfg.headers.Authorization = `Bearer ${token}`;
  return cfg;
});

export const authApi = {
  signup: (data) => api.post("/auth/signup", data).then((r) => r.data),
  login: (data) => api.post("/auth/login", data).then((r) => r.data),
  me: () => api.get("/auth/me").then((r) => r.data),
};

// ── AI resilience config ───────────────────────────────────────────────────
const REQUEST_TIMEOUT_MS = 45_000;
const RETRY_DELAYS_MS = [1_200, 2_500];
const RETRIABLE_STATUSES = new Set([429, 500, 502, 503]);

// Human-readable labels for model IDs (Gemini variants)
export const MODEL_LABELS = {
  "gemini-2.5-flash": "Flash",
  "gemini-2.5-flash-lite": "Flash Lite",
  "gemini-2.5-pro": "Pro",
};

// Human-readable labels for provider IDs
export const PROVIDER_LABELS = {
  "auto":       "Auto",
  "gemini":     "Gemini",
  "groq":       "Groq",
  "cerebras":   "Cerebras",
  "openrouter": "OpenRouter",
};

// Preferred provider — stored in localStorage
export const getPreferredProvider = () =>
  localStorage.getItem("omniverse_preferred_provider") || "auto";

export const setPreferredProvider = (p) =>
  localStorage.setItem("omniverse_preferred_provider", p);

// Fallback pool — Flash then Flash Lite only. Pro is never used as an automatic fallback.
const FALLBACK_MODEL_POOL = [
  "gemini-2.5-flash",
  "gemini-2.5-flash-lite",
];

// Build the sequence of models to try: [selected, ...fallbacks (excluding selected)]
function buildModelSequence(selectedModel) {
  const seq = [selectedModel];
  for (const m of FALLBACK_MODEL_POOL) {
    if (m !== selectedModel) seq.push(m);
  }
  return seq; // max 3 entries (Pro → Flash → Flash Lite), 2 for Flash/Flash Lite selections
}

function sleep(ms) {
  return new Promise((resolve) => setTimeout(resolve, ms));
}

// Combines an outer AbortSignal with an internal timeout signal
function makeTimedSignal(outerSignal, timeoutMs) {
  const ctrl = new AbortController();
  const timer = setTimeout(() => {
    ctrl.abort(new DOMException("Request timed out after " + timeoutMs + "ms", "TimeoutError"));
  }, timeoutMs);

  function onOuterAbort() {
    clearTimeout(timer);
    ctrl.abort(outerSignal.reason);
  }

  if (outerSignal.aborted) {
    clearTimeout(timer);
    ctrl.abort(outerSignal.reason);
  } else {
    outerSignal.addEventListener("abort", onOuterAbort, { once: true });
  }

  return {
    signal: ctrl.signal,
    cleanup: () => {
      clearTimeout(timer);
      outerSignal.removeEventListener("abort", onOuterAbort);
    },
  };
}

// Classifies an error string from the SSE stream body into an HTTP-like status code
function classifyStreamError(msg) {
  const s = msg.toLowerCase();
  if (s === "503" || s.includes("unavailable") || s.includes("overload") || s.includes("503")) return 503;
  if (s === "429" || s.includes("quota") || s.includes("resource_exhausted") || s.includes("429")) return 429;
  if (s === "502" || s.includes("502")) return 502;
  if (s === "timeout") return 408;
  return 500;
}

/**
 * Single attempt at the streaming endpoint.
 * Throws a classified Error on HTTP errors or backend-signalled stream errors.
 * Calls onFirstToken() the moment the first real content token arrives.
 * Calls onProvider(name) when the backend signals which provider is active.
 */
async function _singleStreamAttempt(data, onDelta, onFirstToken, outerSignal, onProvider) {
  const token = localStorage.getItem("omniverse_token");
  const { signal, cleanup } = makeTimedSignal(outerSignal, REQUEST_TIMEOUT_MS);

  let res;
  try {
    res = await fetch(`${API}/ai/chat/stream`, {
      method: "POST",
      headers: {
        "Content-Type": "application/json",
        Authorization: `Bearer ${token}`,
      },
      body: JSON.stringify(data),
      signal,
    });
  } finally {
    cleanup();
  }

  if (!res.ok) {
    const err = new Error(`HTTP ${res.status}`);
    err.status = res.status;
    throw err;
  }

  if (!res.body) return;
  const reader = res.body.getReader();
  const decoder = new TextDecoder();
  let buf = "";
  let firstToken = false;

  try {
    while (true) {
      const { done, value } = await reader.read();
      if (done) break;
      buf += decoder.decode(value, { stream: true });
      const parts = buf.split("\n\n");
      buf = parts.pop() || "";
      for (const line of parts) {
        if (!line.startsWith("data: ")) continue;
        const payload = line.slice(6);

        if (payload === "[DONE]") return;

        // Structured error signals from the backend
        if (payload === "[quota_exceeded]") {
          const err = new Error("Gemini quota exceeded for this model.");
          err.status = 429;
          throw err;
        }
        if (payload.startsWith("[error:")) {
          const code = payload.slice(7, -1).trim();
          const status = classifyStreamError(code);
          const err = new Error(`Stream error: ${code}`);
          err.status = status;
          throw err;
        }
        // Legacy unstructured backend error — classify and throw for retry
        if (payload.startsWith("[error ")) {
          const inner = payload.slice(7, -1).trim();
          const status = classifyStreamError(inner);
          const err = new Error(inner);
          err.status = status;
          throw err;
        }

        // Active provider signal — pass to caller, do not emit as content
        if (payload.startsWith("[provider:")) {
          const providerName = payload.slice(10, -1).trim();
          onProvider?.(providerName);
          continue;
        }

        // Real content — notify on first token
        if (!firstToken) {
          firstToken = true;
          onFirstToken?.();
        }
        onDelta(payload);
      }
    }
  } finally {
    try { reader.releaseLock(); } catch { /* ignore */ }
  }
}

export const aiApi = {
  chat: (data) => api.post("/ai/chat", data).then((r) => r.data),
  history: (sid) => api.get(`/ai/chat/history/${sid}`).then((r) => r.data),
  image: (prompt) => api.post("/ai/image", { prompt }).then((r) => r.data),
  imageHistory: () => api.get("/ai/image/history").then((r) => r.data),

  // Legacy wrapper — kept for backward compatibility with Voice.js and others
  chatStream: async (data, onDelta, signal) => {
    await aiApi.chatStreamResilient(data, onDelta, null, signal);
  },

  /**
   * Resilient streaming with automatic retry + model fallback.
   *
   * Fallback order: user-selected → Flash → Flash Lite → friendly error.
   * Pro is NEVER used as an automatic fallback.
   *
   * @param {object}      data          - { session_id, message, provider, model, preferred_provider, ... }
   * @param {function}    onDelta       - Called with each streamed text chunk
   * @param {function}    onStatus      - Called with { stage, text, model } objects (null = clear)
   * @param {AbortSignal} outerSignal   - Caller-owned AbortSignal for cancellation
   * @param {function}    onProvider    - Called with the active provider name once it's known
   * @returns {{ modelUsed: string }}   - Which model actually produced the response
   */
  chatStreamResilient: async (data, onDelta, onStatus, outerSignal, onProvider) => {
    if (!navigator.onLine) {
      const err = new Error("No internet connection. Please check your network and try again.");
      err.code = "OFFLINE";
      throw err;
    }

    const models = buildModelSequence(data.model || "gemini-2.5-flash");
    const maxAttempts = models.length;
    let lastError = null;

    for (let attempt = 0; attempt < maxAttempts; attempt++) {
      const modelName = models[attempt];
      const modelLabel = MODEL_LABELS[modelName] || modelName;
      const attemptData = { ...data, model: modelName };

      if (outerSignal?.aborted) {
        throw new DOMException("Cancelled", "AbortError");
      }

      if (attempt === 0) {
        console.log(`[AI] Attempt 1/${maxAttempts} | model: "${modelName}"`);
        onStatus?.({ stage: "connecting", text: "Connecting...", model: modelLabel });
      } else {
        const delay = RETRY_DELAYS_MS[attempt - 1] ?? 2500;
        const prevLabel = MODEL_LABELS[models[attempt - 1]] || models[attempt - 1];
        console.log(
          `[AI Retry] Attempt ${attempt + 1}/${maxAttempts} | model: "${modelName}" | delay: ${delay}ms | reason: ${lastError?.message}`
        );
        onStatus?.({ stage: "unavailable", text: `${prevLabel} unavailable`, model: null });
        await sleep(400);
        onStatus?.({ stage: "switching", text: `Switching to ${modelLabel}...`, model: modelLabel });
        await sleep(delay - 400);

        if (outerSignal?.aborted) {
          throw new DOMException("Cancelled", "AbortError");
        }
      }

      try {
        await _singleStreamAttempt(
          attemptData,
          onDelta,
          // onFirstToken — fires when first real content arrives
          () => onStatus?.({ stage: "generating", text: "Generating response...", model: modelLabel }),
          outerSignal ?? new AbortController().signal,
          onProvider,
        );

        onStatus?.(null);
        console.log(`[AI] Attempt ${attempt + 1} succeeded | model: "${modelName}"`);
        return { modelUsed: modelName };
      } catch (err) {
        // Only propagate AbortErrors that the CALLER initiated (outerSignal aborted).
        // AbortErrors from our internal timeout signal should retry with the next model.
        if (err?.name === "AbortError" && outerSignal?.aborted) throw err;

        lastError = err;
        const status = err.status;
        const isOffline = !navigator.onLine;
        // Treat internal-timeout AbortErrors (outerSignal not aborted) as retriable
        const isTimeout =
          err?.name === "TimeoutError" ||
          err?.message?.includes("timed out") ||
          (err?.name === "AbortError" && !outerSignal?.aborted);
        const isRetriable =
          isOffline || isTimeout || !status || RETRIABLE_STATUSES.has(status);

        console.warn(
          `[AI] Attempt ${attempt + 1}/${maxAttempts} FAILED | model: "${modelName}" | status: ${status ?? "network"} | message: ${err.message} | retriable: ${isRetriable}`
        );

        if (!isRetriable) {
          // Non-retriable errors (400, 401, 403, 404) — fail immediately, no more attempts
          throw err;
        }

        if (attempt === maxAttempts - 1) {
          console.error(`[AI] All ${maxAttempts} attempts failed. Giving up.`);
          throw err;
        }
        // Continue loop → next model
      }
    }

    throw lastError || new Error("All retry attempts failed");
  },
};

// ── Voice settings helpers (localStorage) ─────────────────────────────────
const VOICE_PREFS_KEY = "omniverse_voice_prefs";

const DEFAULT_VOICE_PREFS = {
  provider: "google",   // "google" | "browser"
  rate: 1.0,
  volume: 1.0,
};

export function getVoicePrefs() {
  try {
    const stored = localStorage.getItem(VOICE_PREFS_KEY);
    if (!stored) return { ...DEFAULT_VOICE_PREFS };
    return { ...DEFAULT_VOICE_PREFS, ...JSON.parse(stored) };
  } catch {
    return { ...DEFAULT_VOICE_PREFS };
  }
}

export function setVoicePrefs(prefs) {
  localStorage.setItem(VOICE_PREFS_KEY, JSON.stringify(prefs));
}

// ── TTS API ───────────────────────────────────────────────────────────────

// Gemini TTS voice catalogue — used by VoiceSelector UI and speakGemini()
export const GEMINI_VOICES = {
  female: [
    { name: "Kore",   label: "Kore",   desc: "Warm · expressive" },
    { name: "Aoede",  label: "Aoede",  desc: "Bright · clear"    },
    { name: "Zephyr", label: "Zephyr", desc: "Airy · soft"       },
    { name: "Leda",   label: "Leda",   desc: "Smooth · refined"  },
  ],
  male: [
    { name: "Puck",   label: "Puck",   desc: "Lively · playful"  },
    { name: "Charon", label: "Charon", desc: "Deep · resonant"   },
    { name: "Fenrir", label: "Fenrir", desc: "Strong · bold"     },
  ],
};

export const GEMINI_VOICE_FEMALE = "Kore";
export const GEMINI_VOICE_MALE   = "Puck";

export const ttsApi = {
  /**
   * Synthesize text via the backend Google Cloud TTS proxy.
   * Returns a Blob Object URL pointing to raw MP3 audio.
   * Caller must call URL.revokeObjectURL() after use (playAudioUrl handles this).
   * NOTE: Kept for backward compatibility — requires GOOGLE_CLOUD_TTS_API_KEY on server.
   */
  synthesize: async ({ text, voiceName, speakingRate = 1.0, pitch = 0.0, volumeGainDb = 0.0, useSsml = false }) => {
    const token = localStorage.getItem("omniverse_token");
    const res = await fetch(`${API}/ai/tts`, {
      method: "POST",
      headers: {
        "Content-Type": "application/json",
        Authorization: `Bearer ${token}`,
      },
      body: JSON.stringify({
        text,
        voice_name: voiceName,
        speaking_rate: speakingRate,
        pitch,
        volume_gain_db: volumeGainDb,
        use_ssml: useSsml,
      }),
      signal: AbortSignal.timeout(12000),
    });
    if (!res.ok) {
      const err = new Error(`TTS HTTP ${res.status}`);
      err.status = res.status;
      throw err;
    }
    // Backend returns raw MP3 bytes (audio/mpeg) — wrap in Blob URL
    const blob = await res.blob();
    return URL.createObjectURL(blob);
  },

  /**
   * Synthesize text via Gemini TTS (primary voice provider).
   * Uses your existing GEMINI_API_KEY — no Google Cloud credentials needed.
   * Returns a Blob Object URL pointing to raw WAV audio.
   * Caller must call URL.revokeObjectURL() after use (playAudioUrl handles this).
   *
   * @param {string} text   - Plain text to synthesize (max 5000 chars)
   * @param {string} voice  - Gemini voice name: "Kore"|"Aoede"|"Zephyr"|"Leda" (female)
   *                          or "Puck"|"Charon"|"Fenrir" (male). Default: "Kore"
   * @param {AbortSignal} [signal] - Optional AbortSignal for cancellation
   */
  synthesizeGemini: async ({ text, voice = "Kore", signal }) => {
    const token = localStorage.getItem("omniverse_token");
    const res = await fetch(`${API}/ai/tts-gemini`, {
      method: "POST",
      headers: {
        "Content-Type": "application/json",
        Authorization: `Bearer ${token}`,
      },
      body: JSON.stringify({ text, voice }),
      signal: signal ?? AbortSignal.timeout(20000),
    });
    if (!res.ok) {
      const err = new Error(`Gemini TTS HTTP ${res.status}`);
      err.status = res.status;
      // Log diagnostic headers when available
      const provider = res.headers.get("X-TTS-Provider");
      const voiceUsed = res.headers.get("X-Voice-Used");
      console.error(
        `[GeminiTTS] HTTP ${res.status} | provider=${provider} | voice=${voiceUsed}`
      );
      throw err;
    }
    // Log which voice/model was used (from response headers)
    const voiceUsed  = res.headers.get("X-Voice-Used")  || voice;
    const modelUsed  = res.headers.get("X-TTS-Model")   || "gemini-tts";
    const mimeType   = res.headers.get("Content-Type")  || "audio/wav";
    console.log(`[GeminiTTS] OK | voice=${voiceUsed} | model=${modelUsed} | mime=${mimeType}`);

    // Backend returns raw WAV/audio bytes — wrap in Blob URL for HTMLAudioElement
    const blob = await res.blob();
    return URL.createObjectURL(blob);
  },
};

export const crud = (resource) => ({
  list: () => api.get(`/${resource}`).then((r) => r.data),
  create: (data) => api.post(`/${resource}`, data).then((r) => r.data),
  update: (id, data) => api.put(`/${resource}/${id}`, data).then((r) => r.data),
  remove: (id) => api.delete(`/${resource}/${id}`).then((r) => r.data),
});

export const analytics = () => api.get("/analytics/summary").then((r) => r.data);
