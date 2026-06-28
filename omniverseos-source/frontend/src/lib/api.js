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

export const crud = (resource) => ({
  list: () => api.get(`/${resource}`).then((r) => r.data),
  create: (data) => api.post(`/${resource}`, data).then((r) => r.data),
  update: (id, data) => api.put(`/${resource}/${id}`, data).then((r) => r.data),
  remove: (id) => api.delete(`/${resource}/${id}`).then((r) => r.data),
});

export const analytics = () => api.get("/analytics/summary").then((r) => r.data);

// ── Voice preferences (localStorage) ──────────────────────────────────────
const VOICE_PREFS_KEY = "omniverse_voice_prefs";
const DEFAULT_VOICE_PREFS = { provider: "gemini", volume: 1.0 };

export function getVoicePrefs() {
  try {
    const stored = localStorage.getItem(VOICE_PREFS_KEY);
    return stored ? { ...DEFAULT_VOICE_PREFS, ...JSON.parse(stored) } : { ...DEFAULT_VOICE_PREFS };
  } catch {
    return { ...DEFAULT_VOICE_PREFS };
  }
}

export function setVoicePrefs(prefs) {
  localStorage.setItem(VOICE_PREFS_KEY, JSON.stringify(prefs));
}

// ── Gemini TTS voice catalogue ─────────────────────────────────────────────
// All voices available via gemini-2.5-flash-preview-tts with standard API key.
// No Google Cloud credentials required.
export const GEMINI_VOICES = {
  female: [
    { name: "Kore",    label: "Kore",    desc: "Warm · expressive" },
    { name: "Aoede",   label: "Aoede",   desc: "Bright · clear"    },
    { name: "Zephyr",  label: "Zephyr",  desc: "Airy · soft"       },
    { name: "Leda",    label: "Leda",    desc: "Smooth · refined"  },
    { name: "Schedar", label: "Schedar", desc: "Bold · confident"  },
  ],
  male: [
    { name: "Puck",   label: "Puck",   desc: "Lively · playful" },
    { name: "Charon", label: "Charon", desc: "Deep · resonant"  },
    { name: "Fenrir", label: "Fenrir", desc: "Strong · bold"    },
    { name: "Orus",   label: "Orus",   desc: "Clear · steady"  },
  ],
};

export const GEMINI_VOICE_FEMALE = "Kore";
export const GEMINI_VOICE_MALE   = "Puck";

// ── TTS blob cache + in-flight deduplication ──────────────────────────────
// _ttsBlobCache:  voice+text → Blob
//   Re-creates an ObjectURL from the cached Blob on every replay/re-preview
//   so playAudioUrl can revoke each URL after use while keeping the Blob alive.
// _ttsInflight:   voice+text → Promise<Blob>
//   If a fetch is already in progress for the same key, new callers await the
//   same Promise instead of firing a duplicate request to the backend.
const _ttsBlobCache = new Map();
const _ttsInflight  = new Map();
const _TTS_CACHE_MAX = 50; // max distinct text+voice combos kept in memory

function _ttsEvictOldest() {
  if (_ttsBlobCache.size > _TTS_CACHE_MAX) {
    const oldest = _ttsBlobCache.keys().next().value;
    _ttsBlobCache.delete(oldest);
  }
}

// ── TTS API ────────────────────────────────────────────────────────────────
export const ttsApi = {
  /**
   * Synthesize text via Gemini TTS backend proxy.
   * Returns a Blob Object URL for direct use in HTMLAudioElement.
   * Caller (playAudioUrl) revokes the URL after playback — the underlying
   * Blob stays cached so replays never hit the backend again.
   *
   * Quota-saving optimisations:
   *  1. Frontend blob cache  — cache hit returns immediately, zero network
   *  2. In-flight dedup      — concurrent identical requests share one fetch
   *  3. Backend LRU cache    — server-side cache for cross-session hits
   *
   * @param {string}       text   - Plain text (max 5000 chars)
   * @param {string}       voice  - Gemini voice name (see GEMINI_VOICES above)
   * @param {AbortSignal}  signal - Optional cancellation signal
   * @returns {Promise<string>}   - Object URL pointing to audio blob
   */
  synthesizeGemini: async ({ text, voice = "Kore", signal }) => {
    const cacheKey = `${voice}:${text}`;

    // ── 1. Frontend blob cache hit — zero network ─────────────────────────
    if (_ttsBlobCache.has(cacheKey)) {
      // Refresh to most-recently-used position (true LRU — Map preserves insertion order)
      const blob = _ttsBlobCache.get(cacheKey);
      _ttsBlobCache.delete(cacheKey);
      _ttsBlobCache.set(cacheKey, blob);
      console.log(`[GeminiTTS] Frontend cache HIT | voice=${voice} | chars=${text.length}`);
      return URL.createObjectURL(blob);
    }

    // ── 2. In-flight dedup — share an existing fetch ──────────────────────
    if (_ttsInflight.has(cacheKey)) {
      console.log(`[GeminiTTS] Dedup — awaiting in-flight | voice=${voice}`);
      try {
        const blob = await _ttsInflight.get(cacheKey);
        // The in-flight promise completed — blob is now in _ttsBlobCache.
        // Create a fresh URL (the first caller's URL may already be revoked).
        return URL.createObjectURL(blob);
      } catch (err) {
        throw err; // propagate the original failure
      }
    }

    // ── 3. New fetch ──────────────────────────────────────────────────────
    const token = localStorage.getItem("omniverse_token");

    // 20 s timeout — avoids hanging indefinitely on slow cold starts
    const ctrl  = new AbortController();
    const timer = setTimeout(
      () => ctrl.abort(new DOMException("TTS timeout", "TimeoutError")),
      20_000,
    );
    const onOuter = () => ctrl.abort();
    signal?.addEventListener("abort", onOuter, { once: true });

    // The blob promise is registered BEFORE the await so any concurrent
    // caller that arrives mid-fetch is deduplicated immediately.
    const blobPromise = (async () => {
      let res;
      try {
        res = await fetch(`${API}/ai/tts-gemini`, {
          method: "POST",
          headers: {
            "Content-Type": "application/json",
            Authorization: `Bearer ${token}`,
          },
          body: JSON.stringify({ text, voice }),
          signal: ctrl.signal,
        });
      } finally {
        clearTimeout(timer);
        signal?.removeEventListener("abort", onOuter);
      }

      if (!res.ok) {
        const err = new Error(`Gemini TTS HTTP ${res.status}`);
        err.status = res.status;
        throw err;
      }

      const isBackendCacheHit = res.headers.get("X-Cache") === "HIT";
      const voiceUsed = res.headers.get("X-Voice-Used") || voice;
      const model     = res.headers.get("X-TTS-Model")  || "gemini-tts";
      console.log(
        `[GeminiTTS] ${isBackendCacheHit ? "Backend-cache HIT" : "Live"} | voice=${voiceUsed} | model=${model}`,
      );

      return res.blob();
    })();

    _ttsInflight.set(cacheKey, blobPromise);

    try {
      const blob = await blobPromise;
      // Store blob — future replays create new URLs from this without fetching
      _ttsBlobCache.set(cacheKey, blob);
      _ttsEvictOldest();
      return URL.createObjectURL(blob);
    } finally {
      // Always clean up the in-flight entry, success or failure
      _ttsInflight.delete(cacheKey);
    }
  },
};
