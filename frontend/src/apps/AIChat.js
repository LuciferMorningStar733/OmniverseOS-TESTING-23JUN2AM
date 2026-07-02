import React, { useCallback, useEffect, useRef, useState } from "react";
import * as SelectPrimitive from "@radix-ui/react-select";
import { aiApi, memoryApi, MODEL_LABELS, PROVIDER_LABELS, getPreferredProvider } from "../lib/api";
import { parseActions, executeActions, buildActionSummary } from "../lib/cortexActions";
import { buildCortexSystemPrompt } from "../lib/cortexContext";
import { trackEvent } from "../lib/activityTimeline";
import { rememberTranscript } from "../lib/memoryEngine";
import { useOS } from "../context/OSContext";
import { toast } from "sonner";
import MarkdownRenderer from "../components/MarkdownRenderer";
import { normalizeTranscript } from "../lib/speechCorrection.js";
import { detectAmbiguity } from "../lib/ambiguityDetector";
import CortexClarificationModal from "../components/CortexClarificationModal";
import { playAIProcess, playAIReady } from "../lib/soundEngine";

const SESSION_ID = "main";

/* ── Cyberpunk Radix Select (replaces native <select>) ─────────────────────── */
const MODEL_OPTIONS = [
  { value: "gemini|gemini-2.5-flash",      label: "Gemini 2.5 Flash",      badge: "FAST"    },
  { value: "gemini|gemini-2.5-pro",        label: "Gemini 2.5 Pro",        badge: "SMART"   },
  { value: "gemini|gemini-2.5-flash-lite", label: "Gemini 2.5 Flash Lite", badge: "LITE"    },
  { value: "deepseek|deepseek-chat",       label: "DeepSeek V3",           badge: "V3"      },
];

const BADGE_COLORS = {
  FAST:  { bg: "rgba(0,240,255,0.12)",  border: "rgba(0,240,255,0.35)",  text: "#00F0FF"  },
  SMART: { bg: "rgba(207,158,255,0.12)",border: "rgba(207,158,255,0.35)",text: "#CF9EFF"  },
  LITE:  { bg: "rgba(57,255,20,0.10)",  border: "rgba(57,255,20,0.35)",  text: "#39FF14"  },
  V3:    { bg: "rgba(255,160,0,0.12)",  border: "rgba(255,160,0,0.35)",  text: "#FFA000"  },
};

function ModelSelect({ value, onChange, disabled }) {
  const current = MODEL_OPTIONS.find((o) => o.value === value) || MODEL_OPTIONS[0];

  return (
    <SelectPrimitive.Root value={value} onValueChange={onChange} disabled={disabled}>
      <SelectPrimitive.Trigger
        data-testid="model-select"
        className="flex items-center gap-1.5 px-2.5 py-1 rounded-lg text-xs font-mono outline-none
          border border-white/10 bg-white/[0.04]
          hover:border-[#00F0FF]/35 hover:bg-[#00F0FF]/[0.06]
          focus:border-[#00F0FF]/50 focus:ring-0
          data-[disabled]:opacity-30 data-[disabled]:cursor-not-allowed
          transition-all duration-200 select-none"
        style={{ color: "rgba(255,255,255,0.7)", minWidth: 0 }}
      >
        <SelectPrimitive.Value>
          <span style={{ display: "flex", alignItems: "center", gap: 6 }}>
            <span style={{ color: "#E2E8F0", fontFamily: "'JetBrains Mono',monospace", fontSize: 11 }}>
              {current.label}
            </span>
            {current.badge && (
              <span style={{
                fontSize: 8, fontFamily: "monospace", fontWeight: 700,
                padding: "1px 4px", borderRadius: 3,
                background: BADGE_COLORS[current.badge]?.bg,
                border: `1px solid ${BADGE_COLORS[current.badge]?.border}`,
                color: BADGE_COLORS[current.badge]?.text,
                letterSpacing: "0.08em",
              }}>
                {current.badge}
              </span>
            )}
          </span>
        </SelectPrimitive.Value>
        <SelectPrimitive.Icon>
          <i className="fa-solid fa-chevron-down" style={{ fontSize: 8, color: "rgba(255,255,255,0.35)", marginLeft: 2 }} />
        </SelectPrimitive.Icon>
      </SelectPrimitive.Trigger>

      <SelectPrimitive.Portal>
        <SelectPrimitive.Content
          position="popper"
          sideOffset={6}
          style={{
            zIndex: 9999,
            minWidth: 210,
            borderRadius: 12,
            background: "rgba(8,10,18,0.96)",
            border: "1px solid rgba(0,240,255,0.18)",
            backdropFilter: "blur(32px) saturate(180%)",
            WebkitBackdropFilter: "blur(32px) saturate(180%)",
            boxShadow: "0 24px 60px rgba(0,0,0,0.75), 0 0 0 1px rgba(0,240,255,0.06)",
            overflow: "hidden",
            animation: "selectSlide 0.14s ease",
          }}
        >
          <style>{`
            @keyframes selectSlide {
              from { opacity: 0; transform: translateY(-4px) scale(0.97); }
              to   { opacity: 1; transform: translateY(0) scale(1); }
            }
          `}</style>
          <SelectPrimitive.Viewport style={{ padding: "4px 0" }}>
            {MODEL_OPTIONS.map((opt) => {
              const bc = BADGE_COLORS[opt.badge];
              return (
                <SelectPrimitive.Item
                  key={opt.value}
                  value={opt.value}
                  style={{
                    display: "flex", alignItems: "center", justifyContent: "space-between",
                    padding: "9px 14px",
                    cursor: "pointer",
                    outline: "none",
                    transition: "background 0.12s",
                    fontFamily: "'JetBrains Mono', monospace",
                    fontSize: 12,
                    color: "rgba(255,255,255,0.8)",
                    userSelect: "none",
                    borderBottom: "1px solid rgba(255,255,255,0.04)",
                  }}
                  onMouseEnter={(e) => { e.currentTarget.style.background = "rgba(0,240,255,0.07)"; }}
                  onMouseLeave={(e) => { e.currentTarget.style.background = "transparent"; }}
                >
                  <div style={{ display: "flex", alignItems: "center", gap: 10 }}>
                    <SelectPrimitive.ItemIndicator>
                      <i className="fa-solid fa-check" style={{ fontSize: 9, color: "#00F0FF", width: 10 }} />
                    </SelectPrimitive.ItemIndicator>
                    <span style={{ minWidth: 10 }}></span>
                    <SelectPrimitive.ItemText>{opt.label}</SelectPrimitive.ItemText>
                  </div>
                  {opt.badge && bc && (
                    <span style={{
                      fontSize: 8, fontFamily: "monospace", fontWeight: 700,
                      padding: "1px 5px", borderRadius: 3,
                      background: bc.bg, border: `1px solid ${bc.border}`, color: bc.text,
                      letterSpacing: "0.08em",
                    }}>
                      {opt.badge}
                    </span>
                  )}
                </SelectPrimitive.Item>
              );
            })}
          </SelectPrimitive.Viewport>
        </SelectPrimitive.Content>
      </SelectPrimitive.Portal>
    </SelectPrimitive.Root>
  );
}

/* ── System status panel ────────────────────────────────────────────────────── */
const StatusPanel = React.memo(function StatusPanel({ status }) {
  if (!status) return null;

  const isFailover   = status.stage === "unavailable" || status.stage === "switching";
  const isGenerating = status.stage === "generating";
  const isConnecting = status.stage === "connecting";

  const accentColor = isFailover ? "#F59E0B" : isGenerating ? "#39FF14" : "#00F0FF";
  const glowColor   = isFailover ? "rgba(245,158,11,0.3)" : isGenerating ? "rgba(57,255,20,0.25)" : "rgba(0,240,255,0.25)";

  const stageLabel = {
    connecting:  "Connecting",
    generating:  "Generating",
    unavailable: "Rerouting",
    switching:   "Switching",
  }[status.stage] || "Processing";

  return (
    <div className="flex justify-start" style={{ animation: "fadeSlideUp 0.2s ease both" }}>
      <div style={{
        display: "flex", alignItems: "flex-start", gap: 10,
        padding: "10px 14px",
        borderRadius: 14,
        background: "rgba(6,8,16,0.75)",
        border: `1px solid ${accentColor}22`,
        backdropFilter: "blur(16px)",
        boxShadow: `0 0 20px ${glowColor}, 0 4px 16px rgba(0,0,0,0.3)`,
        maxWidth: 320,
        minWidth: 160,
      }}>
        {/* Animated orb indicator */}
        <div style={{
          width: 28, height: 28, borderRadius: "50%", flexShrink: 0, marginTop: 1,
          background: `radial-gradient(circle at 38% 35%, ${accentColor}cc 0%, ${accentColor}44 60%, transparent 100%)`,
          boxShadow: `0 0 12px ${glowColor}`,
          animation: isGenerating ? "thinkingOrb 1.4s ease-in-out infinite" : "orbPulse 2s ease-in-out infinite",
          display: "flex", alignItems: "center", justifyContent: "center",
        }}>
          <i className={`fa-solid ${isFailover ? "fa-arrow-right-arrow-left" : "fa-wand-magic-sparkles"}`}
            style={{ fontSize: 10, color: "rgba(255,255,255,0.9)", textShadow: `0 0 6px ${accentColor}` }} />
        </div>
        <div style={{ flex: 1, minWidth: 0 }}>
          <div style={{
            fontSize: 9, fontFamily: "'JetBrains Mono', monospace",
            letterSpacing: "0.14em", textTransform: "uppercase",
            color: `${accentColor}88`, marginBottom: 3,
          }}>
            {stageLabel}
          </div>
          <div style={{
            fontSize: 12.5, color: isFailover ? "#FCD34D" : isGenerating ? "rgba(255,255,255,0.75)" : "rgba(0,240,255,0.8)",
            lineHeight: 1.4, fontFamily: "'Outfit', sans-serif",
          }}>
            {status.text}
          </div>
          {status.model && !isGenerating && (
            <div style={{ fontSize: 10, color: "rgba(255,255,255,0.22)", marginTop: 3, fontFamily: "'JetBrains Mono', monospace" }}>
              {status.model}
            </div>
          )}
          {/* Progress bar during generation */}
          {isGenerating && (
            <div style={{
              marginTop: 6, height: 2, borderRadius: 2,
              background: "rgba(255,255,255,0.06)",
              overflow: "hidden",
            }}>
              <div style={{
                height: "100%", width: "40%",
                background: `linear-gradient(90deg, transparent, ${accentColor}, transparent)`,
                animation: "scanline 1.2s linear infinite",
                backgroundSize: "200% 100%",
              }} />
            </div>
          )}
        </div>
      </div>
    </div>
  );
});

/* ── Fallback model badge ────────────────────────────────────────────────────── */
const FallbackBadge = React.memo(function FallbackBadge({ modelId }) {
  const label = MODEL_LABELS[modelId] || modelId;
  return (
    <div className="flex items-center gap-1 text-[10px] font-mono text-[#00F0FF]/40 mb-1 pl-0.5">
      <i className="fa-solid fa-arrow-right-arrow-left text-[8px]" />
      <span>routed via {label}</span>
    </div>
  );
});

/* ── Active provider badge ───────────────────────────────────────────────────── */
const PROVIDER_ICONS = {
  gemini:     "fa-google",
  deepseek:   "fa-brain",
  groq:       "fa-bolt",
  cerebras:   "fa-microchip",
  openrouter: "fa-route",
};

const PROVIDER_DISPLAY_LABELS = {
  gemini:     "Using Gemini",
  deepseek:   "Switched to DeepSeek",
  groq:       "Using Groq",
  cerebras:   "Using Cerebras",
  openrouter: "Using OpenRouter",
};

const ActiveProviderBadge = React.memo(function ActiveProviderBadge({ provider, prevProvider }) {
  if (!provider) return null;
  const switched = prevProvider && prevProvider !== provider;
  const label = switched
    ? (PROVIDER_DISPLAY_LABELS[provider] || `Switched to ${provider}`)
    : (PROVIDER_DISPLAY_LABELS[provider] || `Using ${provider}`);
  const icon  = PROVIDER_ICONS[provider] || "fa-circle-nodes";
  return (
    <div
      className="flex items-center gap-1.5 text-[10px] font-mono px-2 py-0.5 rounded-full border border-[#00F0FF]/20 bg-[#00F0FF]/5 text-[#00F0FF]/50 select-none"
      style={{ animation: "fadeSlideUp 0.2s ease both" }}
      title={`Responding via ${label}`}
    >
      <i className={`fa-brands ${icon} text-[9px]`} />
      <span>{label}</span>
    </div>
  );
});

/* ── Copy button ─────────────────────────────────────────────────────────────── */
function CopyButton({ text }) {
  const [copied, setCopied] = useState(false);

  const handleCopy = useCallback(() => {
    if (!text) return;
    navigator.clipboard.writeText(text).then(() => {
      setCopied(true);
      toast.success("Response copied!", { duration: 1500, style: { fontSize: 13 } });
      setTimeout(() => setCopied(false), 2000);
    }).catch(() => {
      try {
        const el = document.createElement("textarea");
        el.value = text;
        el.style.position = "fixed";
        el.style.opacity = "0";
        document.body.appendChild(el);
        el.select();
        document.execCommand("copy");
        document.body.removeChild(el);
        setCopied(true);
        setTimeout(() => setCopied(false), 2000);
      } catch {
        toast.error("Copy failed");
      }
    });
  }, [text]);

  return (
    <button
      onClick={handleCopy}
      title="Copy response"
      className="flex items-center gap-1 text-[10px] font-mono px-2 py-1 rounded-lg transition-all duration-200 flex-shrink-0 select-none"
      style={{
        background: copied ? "rgba(57,255,20,0.12)" : "rgba(255,255,255,0.04)",
        border: copied
          ? "1px solid rgba(57,255,20,0.35)"
          : "1px solid rgba(255,255,255,0.08)",
        color: copied ? "#39FF14" : "rgba(255,255,255,0.4)",
        opacity: copied ? 1 : undefined,
        transform: copied ? "scale(0.95)" : "scale(1)",
        boxShadow: copied ? "0 0 10px rgba(57,255,20,0.2)" : "none",
        transition: "all 0.18s ease",
      }}
      onMouseEnter={(e) => {
        if (!copied) {
          e.currentTarget.style.background = "rgba(0,240,255,0.08)";
          e.currentTarget.style.border = "1px solid rgba(0,240,255,0.25)";
          e.currentTarget.style.color = "#00F0FF";
          e.currentTarget.style.boxShadow = "0 0 8px rgba(0,240,255,0.15)";
        }
      }}
      onMouseLeave={(e) => {
        if (!copied) {
          e.currentTarget.style.background = "rgba(255,255,255,0.04)";
          e.currentTarget.style.border = "1px solid rgba(255,255,255,0.08)";
          e.currentTarget.style.color = "rgba(255,255,255,0.4)";
          e.currentTarget.style.boxShadow = "none";
        }
      }}
    >
      {copied ? (
        <>
          <i className="fa-solid fa-check text-[9px]" />
          Copied!
        </>
      ) : (
        <>
          <i className="fa-regular fa-copy text-[9px]" />
          Copy
        </>
      )}
    </button>
  );
}

/* ── Action chips strip ───────────────────────────────────────────────────────── */
const ActionChips = React.memo(function ActionChips({ actions }) {
  if (!actions?.length) return null;
  return (
    <div className="flex flex-wrap gap-1.5 mt-2">
      {actions.map((a, i) => (
        <span
          key={i}
          className="text-[10px] font-mono px-2 py-0.5 rounded-full border flex items-center gap-1.5"
          style={{
            background: a.success ? "rgba(57,255,20,0.1)" : "rgba(255,0,60,0.1)",
            border: a.success ? "1px solid rgba(57,255,20,0.3)" : "1px solid rgba(255,0,60,0.3)",
            color: a.success ? "#39FF14" : "#FF4466",
            animation: `fadeSlideUp 0.2s ease ${i * 0.06}s both`,
          }}
        >
          <i className={`fa-solid ${a.success ? "fa-check" : "fa-xmark"} text-[8px]`} />
          {a.label}
        </span>
      ))}
    </div>
  );
});

/* ── Timestamp formatter ─────────────────────────────────────────────────────── */
function formatMessageTime(ts) {
  if (!ts) return null;
  const diffMin = Math.floor((Date.now() - ts) / 60000);
  if (diffMin < 1)  return "just now";
  if (diffMin < 60) return `${diffMin}m ago`;
  return new Date(ts).toLocaleTimeString("en-US", { hour: "numeric", minute: "2-digit", hour12: true });
}

/* ── Main component ──────────────────────────────────────────────────────────── */
export default function AIChat() {
  const [messages, setMessages]             = useState([]);
  const [input, setInput]                   = useState("");
  const [streaming, setStreaming]           = useState(false);
  const [streamStatus, setStreamStatus]     = useState(null);
  const [activeProvider, setActiveProvider] = useState(null);
  const [prevProvider,  setPrevProvider]    = useState(null);
  const [modelValue, setModelValue]         = useState("gemini|gemini-2.5-flash");
  const [clarification, setClarification]   = useState(null);
  const [pendingMessage, setPendingMessage] = useState("");
  const [hoveredMsgIdx, setHoveredMsgIdx]   = useState(null);
  const [relevantMemories, setRelevantMemories] = useState([]);
  const [showMemoryPanel, setShowMemoryPanel]   = useState(false);
  const endRef             = useRef();
  const scrollContainerRef = useRef(null);
  const mountedRef = useRef(true);
  const abortRef  = useRef(null);
  const [showScrollBottom, setShowScrollBottom] = useState(false);
  const reqIdRef  = useRef(0);
  const inputRef  = useRef("");
  const sendRef   = useRef(null);
  const micBaseRef = useRef("");
  const micInputSnapshotRef = useRef("");

  const { openApp, closeWindow, focusWindow, minimize, windows, activeId } = useOS();
  const windowsRef    = useRef([]);
  const activeIdRef   = useRef(null);
  const messagesRef   = useRef([]);
  useEffect(() => { windowsRef.current = windows; }, [windows]);
  useEffect(() => { activeIdRef.current = activeId; }, [activeId]);
  useEffect(() => { inputRef.current = input; }, [input]);
  useEffect(() => { messagesRef.current = messages; }, [messages]);
  const sessionCtxRef = useRef({ lastUrl: null, lastApp: null });

  // ── Context floor: messages before this index are excluded from history ──────
  // Using a ref so send() always reads the latest value without re-creating itself.
  const contextFloorRef = useRef(0);
  const [contextFloor, setContextFloor] = useState(0);

  const clearContext = useCallback(() => {
    const newFloor = messagesRef.current.length;
    contextFloorRef.current = newFloor;
    setContextFloor(newFloor);
    toast.success("Context cleared — fresh start", { duration: 2000 });
  }, []);

  // Derived model object
  const model = React.useMemo(() => {
    const [provider, m] = modelValue.split("|");
    return { provider, model: m };
  }, [modelValue]);

  // ── Push-to-talk mic ────────────────────────────────────────────────────────
  const [isRecording, setIsRecording] = useState(false);
  const micRecogRef   = useRef(null);
  const micActiveRef  = useRef(false);
  const startMicRef   = useRef(null);  // stable ref for auto-resume after AI response
  const voiceModeRef  = useRef(false); // true = in voice conversation mode (auto-resume mic)

  const startMic = useCallback(() => {
    const SR = window.SpeechRecognition || window.webkitSpeechRecognition;
    if (!SR || micActiveRef.current) return;

    // Interrupt any active AI response so the user can speak immediately
    abortRef.current?.abort();
    voiceModeRef.current = true;

    const r = new SR();
    r.continuous      = false;
    r.interimResults  = true;
    r.lang            = "en-US";
    r.maxAlternatives = 3;
    micActiveRef.current = true;
    micBaseRef.current = "";
    micInputSnapshotRef.current = inputRef.current;
    setIsRecording(true);

    r.onresult = (e) => {
      let finalText = "";
      let interim   = "";
      for (let i = e.resultIndex; i < e.results.length; i++) {
        const res  = e.results[i];
        const best = Array.from({ length: res.length }, (_, j) => res[j])
          .reduce((a, b) => (a.confidence >= b.confidence ? a : b));
        if (res.isFinal) finalText += normalizeTranscript(best.transcript, { browserUrl: window.location.href, activeAppId: "chat" });
        else interim += best.transcript;
      }
      if (finalText) {
        micBaseRef.current = (micBaseRef.current ? micBaseRef.current + " " : "") + finalText.trim();
      }
      if (mountedRef.current) {
        const preBase   = micInputSnapshotRef.current;
        const committed = preBase
          ? preBase + (micBaseRef.current ? " " + micBaseRef.current : "")
          : micBaseRef.current;
        const display = interim
          ? committed + (committed ? " " : "") + interim
          : committed;
        setInput(display);
      }
    };

    r.onend = () => {
      micActiveRef.current = false;
      if (mountedRef.current) setIsRecording(false);
      // Auto-submit recognized text — enables Gemini-Live-style continuous conversation.
      // Use micBaseRef (final transcript) first, fall back to whatever is in the input field.
      const transcribed = (micBaseRef.current || inputRef.current || "").trim();
      if (transcribed && voiceModeRef.current && sendRef.current && mountedRef.current) {
        sendRef.current(transcribed);
      }
    };
    r.onerror = () => { micActiveRef.current = false; if (mountedRef.current) setIsRecording(false); };

    micRecogRef.current = r;
    r.start();
  }, []);

  const stopMic = useCallback(() => {
    micRecogRef.current?.stop();
    micActiveRef.current = false;
    setIsRecording(false);
  }, []);

  const toggleMic = useCallback(() => {
    if (isRecording) stopMic();
    else startMic();
  }, [isRecording, startMic, stopMic]);

  useEffect(() => {
    aiApi.history(SESSION_ID).then((m) => mountedRef.current && setMessages(m)).catch(() => {});
    return () => {
      mountedRef.current = false;
      abortRef.current?.abort();
    };
  }, []);

  // ── Geolocation: fetch once on mount, cache 24h in localStorage ─────────────
  // Gives Cortex location context so answers are region-aware (e.g. India not Brazil)
  useEffect(() => {
    if (!navigator.geolocation) return;
    const LOCATION_KEY = "cortex_user_location";
    const MAX_AGE_MS = 24 * 60 * 60 * 1000;
    try {
      const cached = JSON.parse(localStorage.getItem(LOCATION_KEY) || "null");
      if (cached?.ts && Date.now() - cached.ts < MAX_AGE_MS) return;
    } catch { /* corrupt cache — re-fetch */ }

    navigator.geolocation.getCurrentPosition(
      async (pos) => {
        try {
          const { latitude: lat, longitude: lng } = pos.coords;
          const res = await fetch(
            `https://nominatim.openstreetmap.org/reverse?lat=${lat}&lon=${lng}&format=json`,
            { headers: { "Accept-Language": "en" } }
          );
          const data = await res.json();
          const addr = data.address || {};
          const location = {
            city: addr.city || addr.town || addr.village || addr.county || "",
            region: addr.state || "",
            country: addr.country || "",
            lat, lng,
            ts: Date.now(),
          };
          localStorage.setItem(LOCATION_KEY, JSON.stringify(location));
        } catch { /* location is optional — never block UI */ }
      },
      () => { /* user denied / unavailable — ignore */ },
      { maximumAge: MAX_AGE_MS, timeout: 8000 }
    );
  }, []);

  // ── Scroll position tracker — shows "jump to bottom" when scrolled up ────────
  useEffect(() => {
    const container = scrollContainerRef.current;
    if (!container) return;
    const onScroll = () => {
      const distFromBottom = container.scrollHeight - container.scrollTop - container.clientHeight;
      setShowScrollBottom(distFromBottom > 120);
    };
    container.addEventListener("scroll", onScroll, { passive: true });
    return () => container.removeEventListener("scroll", onScroll);
  }, []);

  // ── Auto-scroll to bottom when new content arrives (unless user scrolled up) ──
  useEffect(() => {
    const container = scrollContainerRef.current;
    if (!container) return;
    const distFromBottom = container.scrollHeight - container.scrollTop - container.clientHeight;
    if (distFromBottom < 180) {
      container.scrollTo({ top: container.scrollHeight, behavior: "smooth" });
    }
  }, [messages, streamStatus]);

  const send = useCallback(async (forcedText) => {
    const rawText = typeof forcedText === "string" ? forcedText : input;
    if (!rawText.trim()) return;

    const text = rawText.trim();

    // ── Ambiguity detection — runs before any LLM call ──────────────────────
    // Uses current conversation history to auto-resolve when context is clear.
    const ambiguityResult = detectAmbiguity(text, messagesRef.current);
    if (ambiguityResult.needs_clarification) {
      setPendingMessage(text);
      setClarification(ambiguityResult);
      setInput("");
      return;
    }

    abortRef.current?.abort();
    setInput("");
    setStreamStatus(null);
    const myReqId = ++reqIdRef.current;

    const detectedActions = parseActions(text, sessionCtxRef.current);
    let actionResults = [];
    if (detectedActions.length > 0) {
      actionResults = await executeActions(detectedActions, {
        openApp, closeWindow, focusWindow, minimize,
        windows: windowsRef.current,
      }).catch(() => []);
      for (const r of actionResults) {
        if (!r.success) continue;
        if (r.action.type === "open_url") sessionCtxRef.current.lastUrl  = r.action.url;
        if (r.action.type === "open_app" || r.action.type === "focus_app")
          sessionCtxRef.current.lastApp = r.action.appId;
      }
    }

    const actionChips = actionResults.map((r) => ({
      label: r.action.label || r.action.appId || r.action.title || r.action.type,
      success: r.success,
    }));

    const actionSummary = buildActionSummary(actionResults);
    const messageForAI  = actionSummary
      ? `${text}\n\n[OS: ${actionSummary}. Briefly acknowledge in your own voice — natural, not robotic.]`
      : text;

    const msgTs = Date.now();
    setMessages((prev) => [
      ...prev,
      { role: "user", content: text, actions: actionChips, ts: msgTs },
      { role: "assistant", content: "", pending: true, ts: msgTs },
    ]);
    setStreaming(true);
    setActiveProvider(null);
    playAIProcess();

    const ctrl = new AbortController();
    abortRef.current = ctrl;

    try {
      const preferredProvider = getPreferredProvider();
      // ── Fetch relevant Cortex memories for this message ──────────────
      let fetchedMemories = [];
      try {
        fetchedMemories = await memoryApi.relevant(text, 6);
        if (mountedRef.current) setRelevantMemories(fetchedMemories);
      } catch { /* non-blocking */ }

      // ── Cortex Unification: build live OS context system prompt ─────────
      // Aggregates active app, browser URL, recent apps/URLs, last session,
      // memory state — gives the LLM real awareness of the user's workspace.
      let systemPrompt = buildCortexSystemPrompt({
        windows: windowsRef.current,
        activeId: activeIdRef.current,
      });

      // Inject relevant memories into system prompt
      if (fetchedMemories.length > 0) {
        systemPrompt += "\n\n=== CORTEX LONG-TERM MEMORY ===\n";
        systemPrompt += "The following facts are permanently remembered about this user. Use them naturally without re-asking.\n";
        fetchedMemories.forEach((m, i) => {
          systemPrompt += `${i + 1}. [${m.category}] ${m.content}\n`;
        });
      }
      // Build conversation history starting from the context floor (respects
      // "Clear context" — messages before the floor are excluded).
      const history = messagesRef.current
        .slice(contextFloorRef.current)
        .filter((m) => m.content && !m.pending && !m.error)
        .slice(-20)
        .map((m) => ({ role: m.role, content: String(m.content).slice(0, 2000) }));

      const result = await aiApi.chatStreamResilient(
        { session_id: SESSION_ID, message: messageForAI, ...model, preferred_provider: preferredProvider, system: systemPrompt, history },
        (delta) => {
          if (!mountedRef.current || ctrl.signal.aborted) return;
          setMessages((prev) => {
            const copy = [...prev];
            const last = copy[copy.length - 1];
            copy[copy.length - 1] = { ...last, content: last.content + delta, pending: false };
            return copy;
          });
        },
        (status) => {
          if (!mountedRef.current || ctrl.signal.aborted) return;
          setStreamStatus(status);
        },
        ctrl.signal,
        (providerName) => {
          if (!mountedRef.current || ctrl.signal.aborted) return;
          setActiveProvider((prev) => {
            setPrevProvider(prev);
            return providerName;
          });
        },
      );

      if (result?.modelUsed && result.modelUsed !== model.model) {
        setMessages((prev) => {
          const copy = [...prev];
          const last = copy[copy.length - 1];
          if (last?.role === "assistant") copy[copy.length - 1] = { ...last, modelUsed: result.modelUsed };
          return copy;
        });
      }

      // ── Fire-and-forget memory extraction ───────────────────────────────
      // Get the full assistant response from messages state for extraction
      const lastAssistantContent = (() => {
        const msgs = messagesRef.current;
        for (let i = msgs.length - 1; i >= 0; i--) {
          if (msgs[i].role === "assistant" && msgs[i].content && !msgs[i].pending) {
            return msgs[i].content;
          }
        }
        return "";
      })();
      if (lastAssistantContent) {
        memoryApi.extract(text, lastAssistantContent); // fire-and-forget
      }
    } catch (err) {
      if (err?.name === "AbortError") return;
      if (!mountedRef.current) return;

      setMessages((prev) => {
        const copy = [...prev];
        const last = copy[copy.length - 1];
        if (last?.role === "assistant") copy[copy.length - 1] = { ...last, pending: false, error: true };
        return copy;
      });

      if (err?.code === "OFFLINE") {
        toast.error("You appear to be offline. Check your connection and try again.");
      } else if (err?.status === 429) {
        toast.error("Flash and Flash Lite are both rate-limited. Please wait a moment and try again.", { duration: 7000 });
      } else if (err?.status === 503 || err?.status === 502) {
        toast.error("Gemini is experiencing high demand. All nodes exhausted — please try again shortly.", { duration: 7000 });
      } else {
        const detail = err?.message ? `: ${err.message}` : "";
        toast.error(`Cortex is unresponsive after all retries${detail}`, { duration: 8000 });
      }
    } finally {
      if (mountedRef.current && myReqId === reqIdRef.current) {
        setStreaming(false);
        setStreamStatus(null);
        setActiveProvider(null);
        playAIReady();
        // Auto-resume listening after AI responds — continuous voice conversation.
        // Only fires in voice mode and only when the stream wasn't manually aborted.
        if (voiceModeRef.current && !ctrl.signal.aborted) {
          setTimeout(() => { if (mountedRef.current) startMicRef.current?.(); }, 600);
        }
      }
    }
  // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [input, model]);

  useEffect(() => { sendRef.current = send; }, [send]);
  useEffect(() => { startMicRef.current = startMic; }, [startMic]);

  // ── Clarification modal: user selected an option ──────────────────────────
  const handleClarificationSelect = useCallback((option) => {
    setClarification(null);
    if (!pendingMessage) return;
    // Build an enriched message that includes the user's clarification so the
    // LLM answers the right thing, while showing the original text in the chat.
    const enrichedText = `${pendingMessage}\n[Clarification: ${option.label}]`;
    // Dispatch through send() bypassing ambiguity check (clarification resolved)
    sendRef.current?.(enrichedText);
    setPendingMessage("");
  }, [pendingMessage]);

  useEffect(() => {
    const handler = (e) => {
      const text = e.detail?.text;
      if (!text?.trim()) return;
      // Cortex unification: record dispatched prompt in timeline + memory.
      trackEvent("voice_command", { text: text.slice(0, 120) });
      rememberTranscript(text);
      sendRef.current?.(text);
    };
    window.addEventListener("cortex:prompt", handler);
    return () => window.removeEventListener("cortex:prompt", handler);
  }, []);

  // ── Context memory bar state ──────────────────────────────────────────────
  const contextCount = Math.min(
    messages.slice(contextFloor).filter((m) => m.content && !m.pending && !m.error).length,
    20
  );
  const userLocation = (() => {
    try { return JSON.parse(localStorage.getItem("cortex_user_location") || "null"); }
    catch { return null; }
  })();

  return (
    <div className="flex flex-col h-full text-white" data-testid="ai-chat-app">
      {/* Cortex clarification modal — shown before ambiguous requests reach the LLM */}
      <CortexClarificationModal
        open={!!clarification}
        question={clarification?.question}
        options={clarification?.options || []}
        onSelect={handleClarificationSelect}
        onClose={() => { setClarification(null); setPendingMessage(""); }}
      />

      <style>{`
        @keyframes fadeSlideUp {
          from { opacity: 0; transform: translateY(8px); }
          to   { opacity: 1; transform: translateY(0); }
        }
        @keyframes msgEntrance {
          from { opacity: 0; transform: translateY(10px) scale(0.98); }
          to   { opacity: 1; transform: translateY(0) scale(1); }
        }
        @keyframes providerFade {
          from { opacity: 0; transform: scale(0.9); }
          to   { opacity: 1; transform: scale(1); }
        }
        @keyframes cortexCursorBlink {
          0%, 100% { opacity: 1; }
          50%       { opacity: 0; }
        }
        @keyframes typingWave {
          0%, 60%, 100% { transform: translateY(0); opacity: 0.3; }
          30%           { transform: translateY(-6px); opacity: 1; }
        }
        @keyframes streamPulse {
          0%, 100% { box-shadow: 0 0 4px rgba(0,240,255,0.4); }
          50%       { box-shadow: 0 0 16px rgba(0,240,255,0.9); }
        }
        @keyframes orbPulse {
          0%, 100% { box-shadow: 0 0 0 0 rgba(0,240,255,0.25), 0 0 12px rgba(0,240,255,0.15); }
          50%       { box-shadow: 0 0 0 8px rgba(0,240,255,0), 0 0 28px rgba(0,240,255,0.35); }
        }
        @keyframes orbGlow {
          0%, 100% { opacity: 0.6; transform: scale(1); }
          50%       { opacity: 1; transform: scale(1.08); }
        }
        @keyframes listenRipple {
          0%   { transform: scale(1);   opacity: 0.6; }
          100% { transform: scale(2.4); opacity: 0; }
        }
        @keyframes cortexIdleFloat {
          0%, 100% { transform: translateY(0px); }
          50%       { transform: translateY(-6px); }
        }
        @keyframes promptChipIn {
          from { opacity: 0; transform: translateY(12px) scale(0.95); }
          to   { opacity: 1; transform: translateY(0) scale(1); }
        }
        @keyframes scanline {
          0%   { background-position: 0 0; }
          100% { background-position: 0 100px; }
        }
        @keyframes thinkingOrb {
          0%, 100% { opacity: 0.5; transform: scale(0.92); filter: blur(0px); }
          50%       { opacity: 1;   transform: scale(1.08); filter: blur(1px); }
        }
        @keyframes statusBarIn {
          from { opacity: 0; transform: scaleX(0); transform-origin: left; }
          to   { opacity: 1; transform: scaleX(1); }
        }
        .copy-reveal-row { opacity: 0; transition: opacity 0.18s ease; }
        .group:hover .copy-reveal-row { opacity: 1; }
        .cortex-msg-user   { animation: msgEntrance 0.22s cubic-bezier(0.34,1.56,0.64,1) both; }
        .cortex-msg-ai     { animation: msgEntrance 0.28s cubic-bezier(0.34,1.56,0.64,1) both; }
        .cortex-prompt-chip { animation: promptChipIn 0.3s cubic-bezier(0.34,1.56,0.64,1) both; }
      `}</style>

      {/* Header */}
      <div className="px-4 py-3 border-b border-white/[0.07] flex items-center justify-between gap-3 flex-shrink-0"
        style={{ background: "rgba(0,0,0,0.25)", backdropFilter: "blur(10px)" }}>
        <div className="flex items-center gap-3">
          {/* Cortex orb indicator */}
          <div style={{
            position: "relative",
            width: 36, height: 36, flexShrink: 0,
          }}>
            <div style={{
              width: 36, height: 36, borderRadius: "50%",
              background: streaming
                ? "radial-gradient(circle at 40% 35%, rgba(207,158,255,0.8) 0%, rgba(0,240,255,0.6) 60%, rgba(0,0,0,0.3) 100%)"
                : "radial-gradient(circle at 40% 35%, rgba(0,240,255,0.9) 0%, rgba(0,180,220,0.5) 60%, rgba(0,0,0,0.4) 100%)",
              boxShadow: streaming
                ? "0 0 0 1px rgba(207,158,255,0.3), 0 0 20px rgba(207,158,255,0.25)"
                : "0 0 0 1px rgba(0,240,255,0.25), 0 0 16px rgba(0,240,255,0.18)",
              animation: streaming ? "thinkingOrb 1.4s ease-in-out infinite" : "orbPulse 3s ease-in-out infinite",
              display: "flex", alignItems: "center", justifyContent: "center",
              cursor: "default",
            }}>
              <i className="fa-solid fa-wand-magic-sparkles" style={{
                fontSize: 13,
                color: streaming ? "rgba(255,255,255,0.95)" : "rgba(255,255,255,0.9)",
                textShadow: "0 0 8px rgba(0,240,255,0.8)",
              }} />
            </div>
            {isRecording && (
              <>
                <span style={{ position: "absolute", inset: -2, borderRadius: "50%", border: "2px solid rgba(255,0,60,0.6)", animation: "listenRipple 1.2s ease-out infinite" }} />
                <span style={{ position: "absolute", inset: -2, borderRadius: "50%", border: "2px solid rgba(255,0,60,0.4)", animation: "listenRipple 1.2s ease-out 0.4s infinite" }} />
              </>
            )}
          </div>
          <div>
            <div style={{ fontSize: 16, fontWeight: 700, color: "#fff", letterSpacing: "-0.3px", lineHeight: 1.1 }}>
              Cortex
            </div>
            <div style={{
              fontSize: 10, fontFamily: "'JetBrains Mono', monospace",
              letterSpacing: "0.12em", textTransform: "uppercase",
              color: streaming ? "rgba(207,158,255,0.7)" : isRecording ? "rgba(255,80,80,0.8)" : "rgba(0,240,255,0.55)",
              marginTop: 1,
            }}>
              {streaming ? "thinking…" : isRecording ? "● listening" : "● online"}
            </div>
          </div>
        </div>
        <div className="flex items-center gap-2">
          {activeProvider && <ActiveProviderBadge provider={activeProvider} prevProvider={prevProvider} />}
          <ModelSelect
            value={modelValue}
            onChange={setModelValue}
            disabled={streaming}
          />
        </div>
      </div>

      {/* Messages */}
      <div className="relative flex-1 overflow-hidden">
      <div ref={scrollContainerRef} className="h-full overflow-y-auto p-4 space-y-4">
        {messages.length === 0 && !streaming && (
          <div className="flex flex-col items-center justify-center h-full text-center px-6" style={{ minHeight: 200, paddingTop: 24, paddingBottom: 32 }}>
            {/* Animated Cortex orb hero */}
            <div style={{ position: "relative", marginBottom: 28 }}>
              {/* Outer glow rings */}
              <div style={{
                position: "absolute", inset: -20, borderRadius: "50%",
                border: "1px solid rgba(0,240,255,0.08)",
                animation: "listenRipple 3s ease-out infinite",
              }} />
              <div style={{
                position: "absolute", inset: -12, borderRadius: "50%",
                border: "1px solid rgba(0,240,255,0.12)",
                animation: "listenRipple 3s ease-out 1s infinite",
              }} />
              {/* Main orb */}
              <div style={{
                width: 72, height: 72, borderRadius: "50%",
                background: "radial-gradient(circle at 38% 32%, rgba(0,240,255,0.95) 0%, rgba(0,160,200,0.6) 45%, rgba(100,80,200,0.4) 100%)",
                boxShadow: "0 0 0 1px rgba(0,240,255,0.3), 0 0 40px rgba(0,240,255,0.25), 0 8px 32px rgba(0,0,0,0.4)",
                display: "flex", alignItems: "center", justifyContent: "center",
                animation: "cortexIdleFloat 4s ease-in-out infinite",
              }}>
                <i className="fa-solid fa-wand-magic-sparkles" style={{
                  fontSize: 26, color: "rgba(255,255,255,0.95)",
                  textShadow: "0 0 16px rgba(0,240,255,1), 0 0 32px rgba(0,240,255,0.5)",
                }} />
              </div>
            </div>

            {/* Greeting */}
            <div style={{ fontSize: 22, fontWeight: 700, color: "#fff", letterSpacing: "-0.4px", marginBottom: 6, animation: "fadeSlideUp 0.4s ease 0.1s both" }}>
              {(() => { const h = new Date().getHours(); return h < 5 ? "Good night." : h < 12 ? "Good morning." : h < 17 ? "Good afternoon." : "Good evening."; })()}
            </div>
            <div style={{
              fontSize: 13, color: "rgba(148,163,184,0.7)", marginBottom: 32, maxWidth: 280, lineHeight: 1.55,
              animation: "fadeSlideUp 0.4s ease 0.18s both",
            }}>
              Ask me anything — I have context on your whole OS.
            </div>

            {/* Suggested prompts */}
            <div className="flex flex-wrap gap-2 justify-center" style={{ maxWidth: 340, animation: "fadeSlideUp 0.4s ease 0.26s both" }}>
              {[
                { label: "Summarize my day", icon: "fa-sun" },
                { label: "Help me focus", icon: "fa-brain" },
                { label: "What can you do?", icon: "fa-wand-magic-sparkles" },
                { label: "Open my last app", icon: "fa-clock-rotate-left" },
              ].map((p, idx) => (
                <button
                  key={p.label}
                  className="cortex-prompt-chip"
                  onClick={() => sendRef.current?.(p.label)}
                  style={{
                    animationDelay: `${0.32 + idx * 0.06}s`,
                    display: "flex", alignItems: "center", gap: 7,
                    padding: "8px 14px",
                    borderRadius: 24,
                    background: "rgba(0,240,255,0.06)",
                    border: "1px solid rgba(0,240,255,0.16)",
                    color: "rgba(200,246,255,0.75)",
                    fontSize: 12.5,
                    cursor: "pointer",
                    transition: "all 0.2s ease",
                    letterSpacing: "0.01em",
                    backdropFilter: "blur(8px)",
                  }}
                  onMouseEnter={(e) => {
                    e.currentTarget.style.background = "rgba(0,240,255,0.13)";
                    e.currentTarget.style.borderColor = "rgba(0,240,255,0.35)";
                    e.currentTarget.style.color = "#00F0FF";
                    e.currentTarget.style.transform = "translateY(-2px)";
                    e.currentTarget.style.boxShadow = "0 4px 16px rgba(0,240,255,0.15)";
                  }}
                  onMouseLeave={(e) => {
                    e.currentTarget.style.background = "rgba(0,240,255,0.06)";
                    e.currentTarget.style.borderColor = "rgba(0,240,255,0.16)";
                    e.currentTarget.style.color = "rgba(200,246,255,0.75)";
                    e.currentTarget.style.transform = "translateY(0)";
                    e.currentTarget.style.boxShadow = "none";
                  }}
                >
                  <i className={`fa-solid ${p.icon}`} style={{ fontSize: 10, opacity: 0.8 }} />
                  {p.label}
                </button>
              ))}
            </div>
          </div>
        )}

        {messages.map((m, i) => (
          <div
            key={i}
            className={`flex ${m.role === "user" ? "justify-end cortex-msg-user" : "justify-start cortex-msg-ai"}`}
            style={{ animationDelay: `${Math.min(i * 0.03, 0.15)}s` }}
            onMouseEnter={() => setHoveredMsgIdx(i)}
            onMouseLeave={() => setHoveredMsgIdx(null)}
          >
            {m.error ? (
              <div
                className="max-w-[80%] rounded-2xl text-sm"
                style={{
                  padding: "10px 16px",
                  background: "rgba(255,0,60,0.07)",
                  border: "1px solid rgba(255,0,60,0.28)",
                  color: "#FF7090",
                  lineHeight: 1.6,
                  display: "flex", alignItems: "flex-start", gap: 10,
                  animation: "fadeSlideUp 0.2s ease",
                }}
              >
                <i className="fa-solid fa-triangle-exclamation" style={{ color: "#FF003C", fontSize: 13, marginTop: 1, flexShrink: 0 }} />
                <span>
                  {m.content || "Cortex encountered an error."}
                  <button
                    onClick={() => sendRef.current?.(messages[i - 1]?.content || "")}
                    style={{
                      display: "inline-flex", alignItems: "center", gap: 4,
                      marginLeft: 8, fontSize: 10, fontFamily: "'JetBrains Mono', monospace",
                      background: "rgba(255,0,60,0.12)", border: "1px solid rgba(255,0,60,0.3)",
                      borderRadius: 5, padding: "1px 7px", color: "#FF7090", cursor: "pointer",
                      verticalAlign: "middle", transition: "background 0.15s",
                    }}
                    onMouseEnter={(e) => { e.currentTarget.style.background = "rgba(255,0,60,0.22)"; }}
                    onMouseLeave={(e) => { e.currentTarget.style.background = "rgba(255,0,60,0.12)"; }}
                  >
                    <i className="fa-solid fa-rotate-right" style={{ fontSize: 8 }} />
                    retry
                  </button>
                </span>
              </div>
            ) : m.role === "assistant" ? (
              <div className="max-w-[82%] w-full" style={{ maxWidth: "min(82%, 680px)" }}>
                {m.modelUsed && <FallbackBadge modelId={m.modelUsed} />}
                <div
                  className="group relative glass-light rounded-2xl"
                  style={{ padding: "12px 16px 10px" }}
                >
                  {/* Thinking indicator — premium wave when waiting for first token */}
                  {m.pending && !m.content && i === messages.length - 1 && (
                    <div style={{ display: "flex", alignItems: "center", gap: 8, padding: "4px 0" }}>
                      <div style={{ display: "flex", alignItems: "flex-end", gap: 3, height: 16 }}>
                        {[0, 1, 2, 3, 4].map((di) => (
                          <span
                            key={di}
                            style={{
                              display: "inline-block",
                              width: 3,
                              height: [10, 14, 16, 14, 10][di],
                              borderRadius: 3,
                              background: `rgba(0,240,255,${[0.4,0.6,0.9,0.6,0.4][di]})`,
                              animation: `typingWave 1.4s ease-in-out ${di * 0.1}s infinite`,
                              boxShadow: `0 0 6px rgba(0,240,255,${[0.3,0.4,0.6,0.4,0.3][di]})`,
                            }}
                          />
                        ))}
                      </div>
                      <span style={{
                        fontSize: 10, fontFamily: "'JetBrains Mono', monospace",
                        color: "rgba(0,240,255,0.45)", letterSpacing: "0.1em",
                        textTransform: "uppercase",
                      }}>
                        thinking
                      </span>
                    </div>
                  )}

                  {/* Streaming cursor — premium blinking cursor during generation */}
                  {m.pending && m.content && i === messages.length - 1 && (
                    <span style={{
                      display: "inline-block",
                      width: 2.5, height: "1.1em",
                      background: "linear-gradient(180deg, #00F0FF, #CF9EFF)",
                      verticalAlign: "text-bottom",
                      marginLeft: 3,
                      borderRadius: 2,
                      animation: "cortexCursorBlink 0.75s ease-in-out infinite",
                      boxShadow: "0 0 8px rgba(0,240,255,0.7)",
                    }} />
                  )}

                  {/* Rendered markdown */}
                  {(m.content || (!m.pending)) && (
                    <MarkdownRenderer
                      content={m.content}
                      streaming={m.pending && i === messages.length - 1}
                    />
                  )}

                  {/* Copy button row — reveals on message hover via CSS .copy-reveal-row */}
                  {m.content && !m.pending && (
                    <div className="copy-reveal-row flex justify-end mt-2 -mb-1">
                      <CopyButton text={m.content} />
                    </div>
                  )}
                </div>
                {/* Timestamp — fades in on hover */}
                {hoveredMsgIdx === i && formatMessageTime(m.ts) && (
                  <div style={{ fontSize: 9.5, color: "rgba(255,255,255,0.28)", marginTop: 3, paddingLeft: 4, fontFamily: "'JetBrains Mono',monospace", animation: "fadeSlideUp 0.15s ease" }}>
                    {formatMessageTime(m.ts)}
                  </div>
                )}
              </div>
            ) : (
              <div className="max-w-[80%]">
                <div
                  className="rounded-2xl text-sm"
                  style={{
                    padding: "10px 16px",
                    background: "rgba(0,240,255,0.10)",
                    border: "1px solid rgba(0,240,255,0.22)",
                    color: "#E2E8F0",
                    lineHeight: 1.65,
                    wordBreak: "break-word",
                  }}
                >
                  {m.content}
                </div>
                {/* Timestamp — fades in on hover */}
                {hoveredMsgIdx === i && formatMessageTime(m.ts) && (
                  <div style={{ fontSize: 9.5, color: "rgba(255,255,255,0.28)", marginTop: 3, textAlign: "right", paddingRight: 4, fontFamily: "'JetBrains Mono',monospace", animation: "fadeSlideUp 0.15s ease" }}>
                    {formatMessageTime(m.ts)}
                  </div>
                )}
                <ActionChips actions={m.actions} />
              </div>
            )}
          </div>
        ))}

        <StatusPanel status={streamStatus} />
        <div ref={endRef} />
      </div>

      {/* Jump to bottom — floats inside messages area when user scrolls up */}
      {showScrollBottom && (
        <button
          onClick={() => scrollContainerRef.current?.scrollTo({ top: scrollContainerRef.current.scrollHeight, behavior: "smooth" })}
          title="Jump to latest message"
          style={{
            position: "absolute",
            bottom: 12,
            left: "50%",
            transform: "translateX(-50%)",
            display: "flex",
            alignItems: "center",
            gap: 6,
            padding: "5px 14px 5px 10px",
            background: "rgba(0,10,20,0.82)",
            border: "1px solid rgba(0,240,255,0.35)",
            borderRadius: 20,
            color: "#00F0FF",
            fontSize: 11,
            fontFamily: "'JetBrains Mono', monospace",
            letterSpacing: "0.03em",
            cursor: "pointer",
            backdropFilter: "blur(8px)",
            boxShadow: "0 4px 20px rgba(0,240,255,0.12)",
            animation: "fadeSlideUp 0.2s ease",
            zIndex: 10,
            whiteSpace: "nowrap",
          }}
        >
          <svg width="12" height="12" viewBox="0 0 12 12" fill="none">
            <path d="M6 2v8M2 7l4 4 4-4" stroke="#00F0FF" strokeWidth="1.5" strokeLinecap="round" strokeLinejoin="round"/>
          </svg>
          jump to latest
        </button>
      )}
      </div>

      {/* 🧠 Relevant memory indicator */}
      {relevantMemories.length > 0 && (
        <div style={{ position: "relative" }}>
          <button
            onClick={() => setShowMemoryPanel(p => !p)}
            style={{
              width: "100%", textAlign: "left",
              padding: "4px 14px",
              background: showMemoryPanel ? "rgba(0,240,255,0.08)" : "rgba(0,240,255,0.04)",
              borderTop: "1px solid rgba(0,240,255,0.10)",
              borderBottom: showMemoryPanel ? "none" : "1px solid rgba(0,240,255,0.06)",
              borderLeft: "none", borderRight: "none",
              display: "flex", alignItems: "center", gap: 7,
              fontSize: "10.5px", color: "rgba(0,240,255,0.70)",
              fontFamily: "'JetBrains Mono', monospace",
              cursor: "pointer", transition: "background 0.15s",
            }}
          >
            <i className="fa-solid fa-brain" style={{ fontSize: 10 }} />
            <span>Using {relevantMemories.length} relevant {relevantMemories.length === 1 ? "memory" : "memories"}</span>
            <i className={"fa-solid fa-chevron-" + (showMemoryPanel ? "up" : "down")} style={{ fontSize: 8, marginLeft: "auto", opacity: 0.5 }} />
          </button>
          {showMemoryPanel && (
            <div style={{
              padding: "8px 14px 10px",
              background: "rgba(0,240,255,0.04)",
              borderBottom: "1px solid rgba(0,240,255,0.08)",
              display: "flex", flexDirection: "column", gap: 4,
              animation: "fadeSlideUp 0.15s ease",
            }}>
              {relevantMemories.map((m, i) => (
                <div key={m.id || i} style={{
                  fontSize: 11, fontFamily: "'JetBrains Mono', monospace",
                  color: "rgba(255,255,255,0.55)", display: "flex", gap: 6, alignItems: "flex-start",
                }}>
                  <span style={{ color: "rgba(0,240,255,0.4)", flexShrink: 0 }}>[{m.category}]</span>
                  <span>{m.content}</span>
                </div>
              ))}
            </div>
          )}
        </div>
      )}

      {/* Context memory bar — shows how many messages Gemini has as context + user location */}
      {contextCount > 0 && (
        <div
          style={{
            display: "flex",
            alignItems: "center",
            justifyContent: "space-between",
            padding: "4px 14px",
            background: "rgba(0,240,255,0.04)",
            borderTop: "1px solid rgba(0,240,255,0.08)",
            borderBottom: "1px solid rgba(0,240,255,0.06)",
            fontSize: "10.5px",
            color: "rgba(0,240,255,0.55)",
            fontFamily: "'JetBrains Mono', monospace",
            letterSpacing: "0.02em",
            userSelect: "none",
            animation: "fadeSlideUp 0.3s ease",
          }}
        >
          <span style={{ display: "flex", alignItems: "center", gap: 5 }}>
            <svg width="10" height="10" viewBox="0 0 10 10" fill="none" style={{ flexShrink: 0 }}>
              <circle cx="5" cy="5" r="4" stroke="#00F0FF" strokeWidth="1.2" strokeOpacity="0.7"/>
              <circle cx="5" cy="5" r="1.8" fill="#00F0FF" fillOpacity="0.6"/>
            </svg>
            {contextCount === 20
              ? "memory: 20 msgs (max context)"
              : `memory: ${contextCount} msg${contextCount !== 1 ? "s" : ""} in context`}
          </span>
          <span style={{ display: "flex", alignItems: "center", gap: 10 }}>
            {userLocation?.city && (
              <span style={{ display: "flex", alignItems: "center", gap: 4 }}>
                <svg width="9" height="9" viewBox="0 0 10 13" fill="none" style={{ flexShrink: 0 }}>
                  <path d="M5 0C2.24 0 0 2.24 0 5c0 3.75 5 8 5 8s5-4.25 5-8c0-2.76-2.24-5-5-5zm0 6.5A1.5 1.5 0 1 1 5 3.5 1.5 1.5 0 0 1 5 6.5z" fill="#00F0FF" fillOpacity="0.6"/>
                </svg>
                {[userLocation.city, userLocation.country].filter(Boolean).join(", ")}
              </span>
            )}
            <button
              onClick={clearContext}
              title="Clear context — Cortex starts fresh from next message (chat history stays visible)"
              style={{
                background: "none",
                border: "1px solid rgba(0,240,255,0.18)",
                borderRadius: 4,
                color: "rgba(0,240,255,0.5)",
                fontFamily: "'JetBrains Mono', monospace",
                fontSize: 9,
                letterSpacing: "0.04em",
                padding: "1px 6px",
                cursor: "pointer",
                lineHeight: 1.6,
                transition: "all 0.15s",
              }}
              onMouseEnter={(e) => {
                e.currentTarget.style.borderColor = "rgba(255,80,80,0.45)";
                e.currentTarget.style.color = "rgba(255,100,100,0.8)";
              }}
              onMouseLeave={(e) => {
                e.currentTarget.style.borderColor = "rgba(0,240,255,0.18)";
                e.currentTarget.style.color = "rgba(0,240,255,0.5)";
              }}
            >
              clear context
            </button>
          </span>
        </div>
      )}

      {/* Input bar */}
      <div className="p-3 border-t border-white/10 flex items-center gap-2 flex-shrink-0">
        {/* Mic button */}
        <button
          onClick={toggleMic}
          disabled={streaming}
          title={isRecording ? "Stop recording" : "Speak to Cortex"}
          className="flex-shrink-0 rounded-xl flex items-center justify-center transition-all duration-200"
          style={{
            position: "relative",
            width: 36, height: 36,
            background: isRecording
              ? "radial-gradient(circle, rgba(255,0,60,0.2) 0%, rgba(255,0,60,0.08) 100%)"
              : "rgba(255,255,255,0.04)",
            border: isRecording ? "1px solid rgba(255,0,60,0.55)" : "1px solid rgba(255,255,255,0.09)",
            color: isRecording ? "#FF4466" : "#64748B",
            boxShadow: isRecording ? "0 0 20px rgba(255,0,60,0.28), inset 0 0 12px rgba(255,0,60,0.1)" : "none",
            opacity: streaming ? 0.3 : 1,
            cursor: streaming ? "not-allowed" : "pointer",
          }}
        >
          {isRecording && (
            <>
              <span style={{ position:"absolute", inset:-4, borderRadius:"50%", border:"1.5px solid rgba(255,0,60,0.4)", animation:"listenRipple 1.2s ease-out infinite", pointerEvents:"none" }} />
              <span style={{ position:"absolute", inset:-4, borderRadius:"50%", border:"1.5px solid rgba(255,0,60,0.25)", animation:"listenRipple 1.2s ease-out 0.5s infinite", pointerEvents:"none" }} />
            </>
          )}
          <i className={`fa-solid ${isRecording ? "fa-stop" : "fa-microphone"} text-sm`} />
        </button>

        <input
          data-testid="chat-input"
          value={input}
          onChange={(e) => setInput(e.target.value)}
          onKeyDown={(e) => {
            if (e.key === "Enter" && !e.shiftKey) {
              e.preventDefault();
              if (isRecording) stopMic();
              voiceModeRef.current = false; // manual keyboard send exits voice mode
              send();
            }
          }}
          placeholder={isRecording ? "Listening…" : "Message Cortex…"}
          className="input-cyber flex-1 transition-all duration-200"
          style={isRecording ? { borderColor: "rgba(255,0,60,0.4)", background: "rgba(255,0,60,0.04)" } : {}}
        />

        <button
          data-testid="chat-send"
          onClick={() => { voiceModeRef.current = false; send(); }} // manual click exits voice mode
          disabled={streaming || !input.trim()}
          className="neon-btn primary !py-2 flex-shrink-0"
        >
          <i className="fa-solid fa-paper-plane" />
        </button>
      </div>
    </div>
  );
}
