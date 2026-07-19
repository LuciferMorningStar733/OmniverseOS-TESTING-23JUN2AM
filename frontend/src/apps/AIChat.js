import React, { useCallback, useEffect, useRef, useState } from "react";
import * as SelectPrimitive from "@radix-ui/react-select";
import { aiApi, memoryApi, MODEL_LABELS, PROVIDER_LABELS, getPreferredProvider } from "../lib/api";
import { parseActions, executeActions, buildActionSummary } from "../lib/cortexActions";
import { parseCmdTags, executeCmdCommands } from "../lib/cmdTagParser";
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
import { useChatSessions } from "../hooks/useChatSessions";
import ChatSessionSidebar from "../components/ChatSessionSidebar";

const FALLBACK_SESSION_ID = "main";

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
  const copyTimerRef = useRef(null);

  useEffect(() => () => { if (copyTimerRef.current) clearTimeout(copyTimerRef.current); }, []);

  const handleCopy = useCallback(() => {
    if (!text) return;
    const resetAfter = () => {
      if (copyTimerRef.current) clearTimeout(copyTimerRef.current);
      copyTimerRef.current = setTimeout(() => setCopied(false), 2000);
    };
    navigator.clipboard.writeText(text).then(() => {
      setCopied(true);
      toast.success("Response copied!", { duration: 1500, style: { fontSize: 13 } });
      resetAfter();
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
        resetAfter();
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

/* ── Model Debate ─────────────────────────────────────────────────────────────── */

const DEBATE_MODELS = [
  { preferred_provider: "gemini",   model: "gemini-2.5-flash",        label: "Gemini Flash",  shortLabel: "Gemini",   color: "#4285F4", icon: "fa-google"    },
  { preferred_provider: "deepseek", model: "deepseek-chat",           label: "DeepSeek V3",   shortLabel: "DeepSeek", color: "#39FF14", icon: "fa-brain"     },
  { preferred_provider: "groq",     model: "llama-3.3-70b-versatile", label: "Groq · Llama",  shortLabel: "Llama",    color: "#F59E0B", icon: "fa-bolt"      },
  { preferred_provider: "cerebras", model: "llama-3.3-70b",           label: "Cerebras",      shortLabel: "Cerebras", color: "#A855F7", icon: "fa-microchip" },
];

// Semantic Consensus Engine — replaces Jaccard word-overlap
async function computeSemanticConsensus(panels, question) {
  const responses = panels
    .filter(p => p.done && !p.error && p.content)
    .map(p => ({ provider: p.label || p.provider || 'Model', content: p.content }));
  if (responses.length < 2) return null;
  try {
    const token = localStorage.getItem('omniverse_token');
    const base = process.env.REACT_APP_BACKEND_URL || '';
    const res = await fetch(`${base}/api/ai/consensus`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json', ...(token ? { Authorization: `Bearer ${token}` } : {}) },
      body: JSON.stringify({ responses, question: question || '' }),
    });
    if (!res.ok) throw new Error(`consensus API ${res.status}`);
    return await res.json();
  } catch (e) {
    console.warn('Semantic consensus failed, using fallback', e);
    // Fallback: basic token overlap if backend is unreachable
    const tok = t => new Set((t.toLowerCase().match(/\b\w{3,}\b/g) || []));
    const texts = responses.map(r => r.content);
    const n = texts.length;
    const scores = texts.map((_, i) => {
      let sum = 0;
      const s1 = tok(texts[i]);
      for (let j = 0; j < n; j++) {
        if (i !== j) {
          const s2 = tok(texts[j]);
          let inter = 0;
          for (const w of s1) if (s2.has(w)) inter++;
          const union = s1.size + s2.size - inter;
          sum += union === 0 ? 1 : inter / union;
        }
      }
      return Math.round((sum / (n - 1)) * 100);
    });
    const overall = Math.round(scores.reduce((a, b) => a + b, 0) / n);
    return { consensus: overall, meaning_match: overall, reasoning_match: overall, evidence_match: overall, style_similarity: overall, summary: 'Semantic analysis unavailable.', scores, overall };
  }
}

/* ── Final Verdict Card — Phase 12: JARVIS 3038 flagship aesthetics ──────────── */
const FinalVerdictCard = React.memo(function FinalVerdictCard({ synthesis, streaming }) {
  return (
    <div
      className="rounded-2xl border border-cyan-500/30 shadow-[0_0_20px_rgba(0,255,255,0.05)]"
      style={{
        background: "#050B14",
        overflow: "hidden",
        flexShrink: 0,
        animation: "fadeSlideUp 0.4s ease",
      }}
    >
      {/* Header */}
      <div style={{
        display: "flex", alignItems: "center", gap: 8,
        padding: "12px 18px",
        background: "rgba(0,255,255,0.03)",
        borderBottom: "1px solid rgba(0,255,255,0.08)",
      }}>
        {/* Cyan glowing dot */}
        <div style={{
          width: 7, height: 7, borderRadius: "50%", flexShrink: 0,
          background: streaming ? "#00F0FF" : "rgba(0,240,255,0.5)",
          boxShadow: streaming ? "0 0 12px rgba(0,240,255,0.9)" : "0 0 6px rgba(0,240,255,0.3)",
          animation: streaming ? "orbPulse 1s ease-in-out infinite" : "none",
        }} />
        <i className="fa-solid fa-scale-balanced" style={{ fontSize: 10, color: "#00F0FF", flexShrink: 0, opacity: 0.7 }} />
        <span style={{
          fontSize: 10, fontWeight: 700, color: "#00F0FF",
          fontFamily: "'JetBrains Mono', monospace",
          letterSpacing: "0.18em", textTransform: "uppercase", flex: 1,
        }}>SYSTEM VERDICT</span>
        {streaming && (
          <span style={{ fontSize: 11, color: "rgba(0,240,255,0.6)", animation: "cortexCursorBlink 0.8s ease-in-out infinite", flexShrink: 0 }}>▋</span>
        )}
        {!streaming && synthesis && (
          <div style={{
            fontSize: 8.5, padding: "2px 8px", borderRadius: 4,
            background: "rgba(0,240,255,0.06)", border: "1px solid rgba(0,240,255,0.18)",
            color: "rgba(0,240,255,0.6)", fontFamily: "'JetBrains Mono', monospace",
            letterSpacing: "0.10em", textTransform: "uppercase",
          }}>CONCLUDED</div>
        )}
      </div>
      {/* Body */}
      <div style={{ padding: "18px 20px" }}>
        {!synthesis && streaming && (
          <div style={{ display: "flex", alignItems: "center", gap: 6, paddingTop: 2 }}>
            {[0, 1, 2].map((di) => (
              <span key={di} style={{
                display: "inline-block", width: 3, borderRadius: 3,
                height: [8, 13, 8][di],
                background: `rgba(0,240,255,${["0.4", "0.7", "0.4"][di]})`,
                animation: `typingWave 1.2s ease-in-out ${di * 0.15}s infinite`,
              }} />
            ))}
            <span style={{ fontSize: 9.5, color: "rgba(0,240,255,0.4)", fontFamily: "'JetBrains Mono', monospace", letterSpacing: "0.10em", textTransform: "uppercase" }}>
              synthesizing sub-processor reports…
            </span>
          </div>
        )}
        {synthesis && (
          <div className="leading-relaxed" style={{ fontSize: 15, color: "rgba(255,255,255,0.92)" }}>
            <MarkdownRenderer content={synthesis} streaming={streaming} />
          </div>
        )}
      </div>
    </div>
  );
});

const DebateGrid = React.memo(function DebateGrid({ panels, agreement, prompt, synthesis, synthesisStreaming }) {

  if (!panels) {
    return (
      <div style={{ display: "flex", flexDirection: "column", alignItems: "center", justifyContent: "center", height: "100%", gap: 14 }}>
        <div style={{ width: 48, height: 48, borderRadius: 14, background: "rgba(255,99,20,0.1)", border: "1px solid rgba(255,99,20,0.25)", display: "flex", alignItems: "center", justifyContent: "center" }}>
          <i className="fa-solid fa-users" style={{ fontSize: 20, color: "#FF6314" }} />
        </div>
        <div style={{ fontSize: 12.5, color: "rgba(255,255,255,0.35)", fontFamily: "'JetBrains Mono', monospace", letterSpacing: "0.04em" }}>
          Send a prompt — 4 models respond in parallel
        </div>
        <div style={{ display: "flex", gap: 6, flexWrap: "wrap", justifyContent: "center", marginTop: 2 }}>
          {DEBATE_MODELS.map((m) => (
            <span key={m.preferred_provider} style={{
              fontSize: 9.5, padding: "2px 8px", borderRadius: 4,
              background: `${m.color}0e`, border: `1px solid ${m.color}33`,
              color: m.color, fontFamily: "'JetBrains Mono', monospace",
              display: "flex", alignItems: "center", gap: 5,
            }}>
              <i className={`fa-solid ${m.icon}`} style={{ fontSize: 8 }} />{m.shortLabel}
            </span>
          ))}
        </div>
      </div>
    );
  }

  return (
    <div style={{ display: "flex", flexDirection: "column" }}>
      {/* Prompt + overall agreement banner */}
      <div style={{ padding: "7px 14px", borderBottom: "1px solid rgba(255,100,20,0.12)", background: "rgba(255,100,20,0.04)", flexShrink: 0, display: "flex", alignItems: "flex-start", gap: 12, flexWrap: "wrap" }}>
        <div style={{ flex: 1, minWidth: 0 }}>
          <div style={{ fontSize: 8.5, fontFamily: "'JetBrains Mono', monospace", color: "#FF6314", letterSpacing: "0.12em", textTransform: "uppercase", marginBottom: 2, display: "flex", alignItems: "center", gap: 5 }}>
            <i className="fa-solid fa-users" style={{ fontSize: 8 }} />Debate · 4 models
          </div>
          <div style={{ fontSize: 12, color: "rgba(255,255,255,0.65)", fontStyle: "italic", overflow: "hidden", textOverflow: "ellipsis", whiteSpace: "nowrap" }}>
            "{prompt}"
          </div>
        </div>
{agreement && (() => {
          const cs = agreement.consensus != null ? agreement.consensus : agreement.overall;
          const mm = agreement.meaning_match != null ? agreement.meaning_match : cs;
          const rm = agreement.reasoning_match != null ? agreement.reasoning_match : cs;
          const em = agreement.evidence_match != null ? agreement.evidence_match : cs;
          const ss = agreement.style_similarity != null ? agreement.style_similarity : cs;
          const csColor = cs >= 70 ? '#39FF14' : cs >= 40 ? '#F59E0B' : '#FF4444';
          const summary = agreement.summary || '';
          const uniqueInsights = agreement.unique_insights || [];
          const divergentClaims = agreement.divergent_claims || [];
          return (
            <div style={{ padding: '8px 14px', borderBottom: '1px solid rgba(255,100,20,0.12)', background: 'rgba(255,100,20,0.04)', flexShrink: 0, display: 'flex', flexDirection: 'column', gap: 6 }}>
              {/* Row 1: Consensus score + label */}
              <div style={{ display: 'flex', alignItems: 'center', gap: 10, flexWrap: 'wrap' }}>
                <div style={{ display: 'flex', alignItems: 'center', gap: 5 }}>
                  <i className='fa-solid fa-brain' style={{ fontSize: 10, color: csColor }} />
                  <span style={{ fontSize: 9, fontFamily: "'JetBrains Mono',monospace", color: 'rgba(255,255,255,0.4)', letterSpacing: '0.06em', textTransform: 'uppercase' }}>Consensus</span>
                  <span style={{ fontSize: 15, fontWeight: 800, color: csColor, fontFamily: "'JetBrains Mono',monospace" }}>{cs}%</span>
                </div>
                <div style={{ display: 'flex', alignItems: 'center', gap: 8, flexWrap: 'wrap' }}>
                  {[['Meaning', mm, '#00F0FF'], ['Reasoning', rm, '#CF9EFF'], ['Evidence', em, '#39FF14'], ['Style', ss, 'rgba(255,255,255,0.3)']].map(([label, val, col]) => (
                    <div key={label} style={{ display: 'flex', alignItems: 'center', gap: 3 }}>
                      <span style={{ fontSize: 8.5, color: 'rgba(255,255,255,0.35)', fontFamily: "'JetBrains Mono',monospace" }}>{label}</span>
                      <span style={{ fontSize: 10, fontWeight: 700, color: col, fontFamily: "'JetBrains Mono',monospace" }}>{val}%</span>
                    </div>
                  ))}
                </div>
              </div>
              {/* Row 2: Consensus summary */}
              {summary ? (
                <div style={{ fontSize: 10.5, color: 'rgba(255,255,255,0.55)', fontStyle: 'italic', lineHeight: 1.4 }}>{summary}</div>
              ) : null}
              {/* Row 3: Divergent claims */}
              {divergentClaims.length > 0 && (
                <div style={{ display: 'flex', gap: 5, flexWrap: 'wrap' }}>
                  {divergentClaims.map((c, i) => (
                    <span key={i} style={{ fontSize: 9, padding: '1px 5px', borderRadius: 3, background: 'rgba(255,68,68,0.1)', border: '1px solid rgba(255,68,68,0.2)', color: '#FF4444', fontFamily: "'JetBrains Mono',monospace" }}>
                      <i className='fa-solid fa-code-branch' style={{ marginRight: 3, fontSize: 7 }} />{c}
                    </span>
                  ))}
                </div>
              )}
              {/* Row 4: Unique insights */}
              {uniqueInsights.filter(u => u.insight).length > 0 && (
                <div style={{ display: 'flex', gap: 5, flexWrap: 'wrap' }}>
                  {uniqueInsights.filter(u => u.insight).map((u, i) => (
                    <span key={i} style={{ fontSize: 9, padding: '1px 5px', borderRadius: 3, background: 'rgba(0,240,255,0.06)', border: '1px solid rgba(0,240,255,0.15)', color: '#00F0FF', fontFamily: "'JetBrains Mono',monospace" }}>
                      <i className='fa-solid fa-lightbulb' style={{ marginRight: 3, fontSize: 7 }} />{u.provider}: {u.insight}
                    </span>
                  ))}
                </div>
              )}
            </div>
          );
        })()}
      </div>

      {/* ── Mobile vertical stream — all 4 models simultaneously, hidden on md+ ── */}
      <div className="debate-mobile-stream">
        {panels && panels.map((panel, idx) => {
          const _pm = agreement?.per_model;
          const agScore = _pm
            ? (_pm[idx]?.stance === 'agree' ? (agreement.consensus || 95) : _pm[idx]?.stance === 'partial' ? 65 : 30)
            : agreement?.scores?.[idx];
          const scoreColor = agScore == null ? panel.color : agScore >= 70 ? "#39FF14" : agScore >= 50 ? "#F59E0B" : "#FF4444";
          return (
            <div
              key={idx}
              style={{
                border: "1px solid rgba(255,255,255,0.04)",
                borderRadius: 16,
                background: "#080B10",
                overflow: "hidden",
                flexShrink: 0,
              }}
            >
              {/* Card header: status dot + icon + model name + score badge + cursor */}
              <div style={{ display: "flex", alignItems: "center", gap: 8, padding: "10px 14px", background: `${panel.color}0a`, borderBottom: `1px solid ${panel.color}20`, flexShrink: 0 }}>
                <div style={{
                  width: 7, height: 7, borderRadius: "50%", flexShrink: 0,
                  background: panel.streaming ? panel.color : panel.error ? "#FF4444" : `${panel.color}66`,
                  boxShadow: panel.streaming ? `0 0 8px ${panel.color}` : "none",
                  animation: panel.streaming ? "orbPulse 1s ease-in-out infinite" : "none",
                }} />
                <i className={`fa-solid ${panel.icon}`} style={{ fontSize: 12, color: panel.color, flexShrink: 0 }} />
                <span style={{ fontSize: 13, fontWeight: 600, color: "#fff", fontFamily: "'JetBrains Mono', monospace", flex: 1 }}>{panel.label}</span>
                {agScore != null && panel.done && !panel.error && (
                  <div style={{ display: "flex", alignItems: "center", gap: 3, padding: "2px 8px", borderRadius: 5, background: `${scoreColor}12`, border: `1px solid ${scoreColor}2e`, flexShrink: 0 }}>
                    <span style={{ fontSize: 11, fontWeight: 700, color: scoreColor, fontFamily: "'JetBrains Mono', monospace" }}>{agScore}%</span>
                  </div>
                )}
                {panel.streaming && <span style={{ fontSize: 11, color: `${panel.color}bb`, animation: "cortexCursorBlink 0.8s ease-in-out infinite", flexShrink: 0 }}>▋</span>}
                {panel.error && <span style={{ fontSize: 10, color: "#FF4444", fontFamily: "'JetBrains Mono', monospace", flexShrink: 0 }}>FAILED</span>}
              </div>
              {/* Card body — flagship typography spec */}
              <div style={{ padding: "12px 16px" }}>
                {!panel.content && panel.streaming && (
                  <div style={{ display: "flex", alignItems: "center", gap: 6, paddingTop: 2 }}>
                    {[0, 1, 2].map((di) => (
                      <span key={di} style={{ display: "inline-block", width: 4, borderRadius: 3, height: [8, 13, 8][di], background: `${panel.color}${["66","aa","66"][di]}`, animation: `typingWave 1.2s ease-in-out ${di * 0.15}s infinite` }} />
                    ))}
                    <span style={{ fontSize: 9.5, color: `${panel.color}66`, fontFamily: "'JetBrains Mono', monospace", letterSpacing: "0.08em" }}>generating</span>
                  </div>
                )}
                {panel.content && (
                  <div style={{ fontSize: 15, lineHeight: 1.65, color: "rgba(255,255,255,0.90)" }}>
                    <MarkdownRenderer content={panel.content} streaming={panel.streaming} />
                  </div>
                )}
              </div>
            </div>
          );
        })}
        {/* Final Verdict — appears below the 4 model cards on mobile */}
        {(synthesis != null || synthesisStreaming) && (
          <FinalVerdictCard synthesis={synthesis} streaming={synthesisStreaming} />
        )}
      </div>

      {/* ── Desktop 2×2 grid + Final Verdict — hidden on mobile via CSS ── */}
      <div className="debate-desktop-grid" style={{ display: "grid", gridTemplateColumns: "1fr 1fr", gridTemplateRows: "1fr 1fr auto", minHeight: 520, overflow: "visible" }}>
        {panels.map((panel, idx) => {
          const _pm = agreement?.per_model; const agScore = _pm ? (_pm[idx]?.stance === 'agree' ? (agreement.consensus || 95) : _pm[idx]?.stance === 'partial' ? 65 : 30) : agreement?.scores?.[idx];
          const scoreColor = agScore == null ? panel.color : agScore >= 70 ? "#39FF14" : agScore >= 50 ? "#F59E0B" : "#FF4444";
          const isLeft = idx % 2 === 0;
          const isTop  = idx < 2;
          return (
            <div key={idx} style={{
              display: "flex", flexDirection: "column", overflow: "hidden",
              borderRight:  isLeft ? "1px solid rgba(255,255,255,0.055)" : "none",
              borderBottom: isTop  ? "1px solid rgba(255,255,255,0.055)" : "none",
            }}>
              <div style={{ display: "flex", alignItems: "center", gap: 6, padding: "5px 9px", background: `${panel.color}08`, borderBottom: `1px solid ${panel.color}1c`, flexShrink: 0 }}>
                <div style={{ width: 5, height: 5, borderRadius: "50%", flexShrink: 0, background: panel.streaming ? panel.color : panel.error ? "#FF4444" : `${panel.color}66`, boxShadow: panel.streaming ? `0 0 6px ${panel.color}` : "none", animation: panel.streaming ? "orbPulse 1s ease-in-out infinite" : "none" }} />
                <i className={`fa-solid ${panel.icon}`} style={{ fontSize: 9, color: panel.color, flexShrink: 0 }} />
                <span style={{ fontSize: 10, fontWeight: 600, color: "rgba(255,255,255,0.82)", fontFamily: "'JetBrains Mono', monospace", flex: 1, overflow: "hidden", textOverflow: "ellipsis", whiteSpace: "nowrap" }}>{panel.label}</span>
                {agScore != null && panel.done && !panel.error && (
                  <div style={{ display: "flex", alignItems: "center", gap: 3, padding: "1px 6px", borderRadius: 4, background: `${scoreColor}12`, border: `1px solid ${scoreColor}2e`, animation: "fadeSlideUp 0.35s ease", flexShrink: 0 }}>
                    <span style={{ fontSize: 9.5, fontWeight: 700, color: scoreColor, fontFamily: "'JetBrains Mono', monospace" }}>{agScore}%</span>
                    {agScore < 55 && <span style={{ fontSize: 7.5, color: scoreColor, letterSpacing: "0.07em", textTransform: "uppercase", marginLeft: 2 }}>diverges</span>}
                  </div>
                )}
                {panel.streaming && <span style={{ fontSize: 9, color: `${panel.color}bb`, animation: "cortexCursorBlink 0.8s ease-in-out infinite", flexShrink: 0 }}>▋</span>}
                {panel.error && <span style={{ fontSize: 8, color: "#FF4444", fontFamily: "'JetBrains Mono', monospace", flexShrink: 0, letterSpacing: "0.06em" }}>FAILED</span>}
              </div>
              <div style={{ flex: 1, overflowY: "auto", padding: "8px 10px", fontSize: 12, lineHeight: 1.62, color: "rgba(255,255,255,0.78)" }}>
                {!panel.content && panel.streaming && (
                  <div style={{ display: "flex", alignItems: "center", gap: 5, paddingTop: 2 }}>
                    {[0, 1, 2].map((di) => (
                      <span key={di} style={{ display: "inline-block", width: 3, borderRadius: 3, height: [8, 12, 8][di], background: `${panel.color}${["66","aa","66"][di]}`, animation: `typingWave 1.2s ease-in-out ${di * 0.15}s infinite` }} />
                    ))}
                    <span style={{ fontSize: 8.5, color: `${panel.color}66`, fontFamily: "'JetBrains Mono', monospace", letterSpacing: "0.08em" }}>generating</span>
                  </div>
                )}
                {panel.content && <MarkdownRenderer content={panel.content} streaming={panel.streaming} />}
              </div>
            </div>
          );
        })}
        {/* Final Verdict — spans both columns at the bottom of the desktop grid */}
        {(synthesis != null || synthesisStreaming) && (
          <div style={{ gridColumn: "1 / -1", borderTop: "1px solid rgba(255,255,255,0.055)" }}>
            <FinalVerdictCard synthesis={synthesis} streaming={synthesisStreaming} />
          </div>
        )}
      </div>
    </div>
  );
});

/* ── Mode switcher ────────────────────────────────────────────────────────────── */
const CHAT_MODES = [
  { id: "chat",     icon: "fa-comments", label: "Chat",     color: "#00F0FF" },
  { id: "web",      icon: "fa-globe",    label: "Live Web", color: "#39FF14" },
  { id: "research", icon: "fa-flask",    label: "Research", color: "#A855F7" },
  { id: "debate",   icon: "fa-users",    label: "Debate",   color: "#FF6314" },
];

function ModeSwitcher({ mode, onChange, disabled }) {
  return (
    <div
      title="Switch AI mode"
      className="mode-switcher-row flex flex-row items-center overflow-x-auto whitespace-nowrap w-full md:w-auto"
      style={{
        gap: 2,
        background: "rgba(255,255,255,0.03)",
        borderRadius: 9,
        padding: "2px 2px",
        border: "1px solid rgba(255,255,255,0.06)",
        minWidth: 0,
        scrollbarWidth: "none",
      }}
    >
      {CHAT_MODES.map((m) => {
        const active = mode === m.id;
        return (
          <button
            key={m.id}
            onClick={() => !disabled && onChange(m.id)}
            disabled={disabled}
            title={`${m.label} mode`}
            style={{
              padding: "3px 7px",
              borderRadius: 6,
              border: active ? `1px solid ${m.color}44` : "1px solid transparent",
              background: active ? `${m.color}14` : "transparent",
              color: active ? m.color : "rgba(255,255,255,0.6)",
              cursor: disabled ? "not-allowed" : "pointer",
              fontSize: 9.5,
              fontFamily: "'JetBrains Mono', monospace",
              letterSpacing: "0.05em",
              display: "flex",
              alignItems: "center",
              gap: 4,
              transition: "all 0.15s",
              whiteSpace: "nowrap",
              boxShadow: active ? `0 0 6px ${m.color}22` : "none",
            }}
            onMouseEnter={(e) => { if (!disabled && !active) { e.currentTarget.style.color = "rgba(255,255,255,0.85)"; e.currentTarget.style.background = "rgba(255,255,255,0.05)"; } }}
            onMouseLeave={(e) => { if (!active) { e.currentTarget.style.color = "rgba(255,255,255,0.6)"; e.currentTarget.style.background = "transparent"; } }}
          >
            <i className={`fa-solid ${m.icon}`} style={{ fontSize: 8 }} />
            {m.label}
          </button>
        );
      })}
    </div>
  );
}

/* ── Source cards ─────────────────────────────────────────────────────────────── */
const SOURCE_TYPE_CFG = {
  github:        { icon: "fa-brands fa-github",         label: "GitHub",         color: "#39FF14" },
  stackoverflow: { icon: "fa-brands fa-stack-overflow",  label: "Stack Overflow", color: "#F59E0B" },
  reddit:        { icon: "fa-brands fa-reddit",          label: "Reddit",         color: "#FF6314" },
  docs:          { icon: "fa-solid fa-book-open",        label: "Docs",           color: "#00F0FF" },
  web:           { icon: "fa-solid fa-globe",            label: "Web",            color: "rgba(255,255,255,0.45)" },
};

const SourceCards = React.memo(function SourceCards({ sources }) {
  if (!sources?.items?.length) return null;
  return (
    <div style={{ marginTop: 8 }}>
      <div style={{
        fontSize: 9, fontFamily: "'JetBrains Mono', monospace",
        color: "rgba(255,255,255,0.28)", letterSpacing: "0.12em",
        textTransform: "uppercase", marginBottom: 6,
        display: "flex", alignItems: "center", gap: 5,
      }}>
        <i className="fa-solid fa-flask" style={{ fontSize: 8, color: "#A855F7" }} />
        Sources · {sources.items.length}
      </div>
      <div style={{ display: "flex", flexWrap: "wrap", gap: 5 }}>
        {sources.items.map((s, i) => {
          const cfg = SOURCE_TYPE_CFG[s.type] || SOURCE_TYPE_CFG.web;
          const hostname = (() => { try { return new URL(s.url).hostname.replace(/^www\./, ""); } catch { return s.site_name || ""; } })();
          return (
            <a
              key={i}
              href={s.url}
              target="_blank"
              rel="noopener noreferrer"
              title={s.snippet || s.title}
              style={{
                display: "flex",
                alignItems: "center",
                gap: 5,
                padding: "4px 9px",
                borderRadius: 7,
                background: "rgba(255,255,255,0.03)",
                border: "1px solid rgba(255,255,255,0.07)",
                textDecoration: "none",
                maxWidth: 200,
                overflow: "hidden",
                transition: "all 0.15s",
                animation: `fadeSlideUp 0.2s ease ${i * 0.04}s both`,
              }}
              onMouseEnter={(e) => {
                e.currentTarget.style.background = `${cfg.color}14`;
                e.currentTarget.style.borderColor = `${cfg.color}44`;
              }}
              onMouseLeave={(e) => {
                e.currentTarget.style.background = "rgba(255,255,255,0.03)";
                e.currentTarget.style.borderColor = "rgba(255,255,255,0.07)";
              }}
            >
              <i className={cfg.icon} style={{ fontSize: 10, color: cfg.color, flexShrink: 0 }} />
              <span style={{
                fontSize: 10, color: "rgba(255,255,255,0.65)",
                fontFamily: "'JetBrains Mono', monospace",
                overflow: "hidden", textOverflow: "ellipsis", whiteSpace: "nowrap",
              }}>
                {hostname || cfg.label}
              </span>
              <i className="fa-solid fa-arrow-up-right-from-square" style={{ fontSize: 7, color: "rgba(255,255,255,0.2)", flexShrink: 0 }} />
            </a>
          );
        })}
      </div>
    </div>
  );
});

/* ── Answer Confidence Panel ──────────────────────────────────────────────────── */
const ConfidencePanel = React.memo(function ConfidencePanel({ confidence }) {
  if (!confidence) return null;
  const { score, sources_count, live_web, memory, reasoning, conflicts } = confidence;

  // Score arc colour: green → amber → red
  const scoreColor = score >= 80 ? "#39FF14" : score >= 65 ? "#F59E0B" : "#FF6314";
  const trackColor = "rgba(255,255,255,0.06)";
  const pct = Math.max(0, Math.min(100, score));

  const Chip = ({ icon, label, active, warn }) => (
    <div style={{
      display: "flex", alignItems: "center", gap: 4,
      padding: "2px 7px", borderRadius: 5,
      background: warn ? "rgba(255,100,20,0.1)" : active ? "rgba(255,255,255,0.05)" : "rgba(255,255,255,0.02)",
      border: `1px solid ${warn ? "rgba(255,100,20,0.25)" : active ? "rgba(255,255,255,0.1)" : "rgba(255,255,255,0.04)"}`,
      opacity: active || warn ? 1 : 0.4,
    }}>
      <i className={`fa-solid ${icon}`} style={{ fontSize: 8, color: warn ? "#FF6314" : active ? scoreColor : "rgba(255,255,255,0.3)" }} />
      <span style={{ fontSize: 9, fontFamily: "'JetBrains Mono', monospace", color: warn ? "#FF6314" : active ? "rgba(255,255,255,0.7)" : "rgba(255,255,255,0.25)", letterSpacing: "0.04em" }}>
        {label}
      </span>
    </div>
  );

  return (
    <div style={{
      marginTop: 8,
      padding: "8px 11px",
      borderRadius: 10,
      background: "rgba(255,255,255,0.02)",
      border: "1px solid rgba(255,255,255,0.06)",
      animation: "fadeSlideUp 0.25s ease 0.05s both",
    }}>
      {/* Top row: confidence bar + score */}
      <div style={{ display: "flex", alignItems: "center", gap: 9, marginBottom: 7 }}>
        <span style={{ fontSize: 9, fontFamily: "'JetBrains Mono', monospace", color: "rgba(255,255,255,0.28)", letterSpacing: "0.12em", textTransform: "uppercase", flexShrink: 0 }}>
          Confidence
        </span>
        {/* Progress bar */}
        <div style={{ flex: 1, height: 3, borderRadius: 2, background: trackColor, overflow: "hidden" }}>
          <div style={{
            height: "100%", width: `${pct}%`, borderRadius: 2,
            background: `linear-gradient(90deg, ${scoreColor}aa, ${scoreColor})`,
            boxShadow: `0 0 6px ${scoreColor}66`,
            transition: "width 0.6s ease",
          }} />
        </div>
        <span style={{ fontSize: 11, fontWeight: 700, fontFamily: "'JetBrains Mono', monospace", color: scoreColor, flexShrink: 0, letterSpacing: "-0.02em" }}>
          {score}%
        </span>
      </div>

      {/* Bottom row: signal chips */}
      <div style={{ display: "flex", flexWrap: "wrap", gap: 4, alignItems: "center" }}>
        {sources_count > 0 && (
          <Chip icon="fa-database" label={`${sources_count} source${sources_count !== 1 ? "s" : ""}`} active />
        )}
        <Chip icon="fa-globe"              label="Live Web"  active={live_web} />
        <Chip icon="fa-brain"              label="Memory"    active={memory} />
        <Chip icon="fa-circle-nodes"       label="Reasoning" active={reasoning} />
        {conflicts > 0 && (
          <Chip icon="fa-triangle-exclamation" label={`${conflicts} conflict${conflicts !== 1 ? "s" : ""}`} active warn />
        )}
      </div>
    </div>
  );
});

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
  const [chatMode, setChatMode]             = useState("chat"); // "chat" | "web" | "research" | "debate"
  const [debatePanels, setDebatePanels]     = useState(null);
  const [debatePrompt, setDebatePrompt]     = useState("");
  const [debateAgreement, setDebateAgreement] = useState(null);
  const [debateSynthesis, setDebateSynthesis] = useState(null);
  const [debateSynthesisStreaming, setDebateSynthesisStreaming] = useState(false);
  const [hoveredMsgIdx, setHoveredMsgIdx]   = useState(null);
  const [touchedMsgIdx, setTouchedMsgIdx]   = useState(null);
  const touchTimerRef = useRef(null);
  const [relevantMemories, setRelevantMemories] = useState([]);
  const [showMemoryPanel, setShowMemoryPanel]   = useState(false);
  const [sidebarOpen, setSidebarOpen]           = useState(true);
  const [showMobileHistory, setShowMobileHistory] = useState(false);
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

  // ── Session management ─────────────────────────────────────────────────────
  const {
    sessions,
    activeSessionId,
    loading: sessionsLoading,
    createSession,
    switchSession,
    renameSession,
    deleteSession,
    togglePin,
    duplicateSession,
    autoTitle,
    touchSession,
    search: searchSessions,
  } = useChatSessions();

  // Current session ID (fall back to legacy "main" if backend unavailable)
  const sessionId = activeSessionId || FALLBACK_SESSION_ID;
  const sessionIdRef = useRef(sessionId);
  useEffect(() => { sessionIdRef.current = sessionId; }, [sessionId]);

  // Message count tracker for auto-title (fire after first exchange)
  const msgCountRef = useRef(0);
  const autoTitledRef = useRef(new Set());
  // Session bootstrap mutex — prevents double-creates when send() is called
  // rapidly before the first createSession() resolves.
  const sessionBootstrapRef = useRef(null);

  // Cleanup touch-reveal timer on unmount
  useEffect(() => () => { if (touchTimerRef.current) clearTimeout(touchTimerRef.current); }, []);

  const { openApp, closeWindow, focusWindow, minimize, windows, activeId } = useOS();
  const windowsRef    = useRef([]);
  const activeIdRef   = useRef(null);
  const messagesRef   = useRef([]);
  useEffect(() => { windowsRef.current = windows; }, [windows]);
  useEffect(() => { activeIdRef.current = activeId; }, [activeId]);
  useEffect(() => { inputRef.current = input; }, [input]);
  useEffect(() => { messagesRef.current = messages; }, [messages]);
  const sessionCtxRef = useRef({ lastUrl: null, lastApp: null });
  const typingBurstTimerRef = useRef(null); // P13: throttle typing-burst signals

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

  // Load history when session changes
  useEffect(() => {
    if (!sessionId) return;
    setMessages([]);
    setRelevantMemories([]);
    setStreamStatus(null);
    contextFloorRef.current = 0;
    setContextFloor(0);
    msgCountRef.current = 0;
    abortRef.current?.abort();
    // Defensive: `m` must be an array before it reaches `messages` state — a
    // non-array 200 response (proxy error page, auth-expired body, etc.)
    // would otherwise crash every `.slice`/`.filter`/`.map` call on
    // `messages` downstream (e.g. the context-memory bar, Debate Mode).
    aiApi.history(sessionId).then((m) => mountedRef.current && setMessages(Array.isArray(m) ? m : [])).catch(() => {});
  // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [sessionId]);

  useEffect(() => {
    mountedRef.current = true;
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

  // ── Visual viewport resize: scroll to bottom when mobile keyboard opens ───────
  // Only fires on touch devices and only when the chat input is focused.
  useEffect(() => {
    const vv = window.visualViewport;
    if (!vv || !("ontouchstart" in window)) return;
    let inputFocused = false;
    let rafId = null;
    const onFocus = () => { inputFocused = true; };
    const onBlur  = () => { inputFocused = false; };
    const inputEl = document.querySelector("[data-testid='chat-input']");
    if (inputEl) {
      inputEl.addEventListener("focus", onFocus);
      inputEl.addEventListener("blur",  onBlur);
    }
    const handle = () => {
      if (!inputFocused) return;
      if (rafId) cancelAnimationFrame(rafId);
      rafId = requestAnimationFrame(() => {
        rafId = null;
        const container = scrollContainerRef.current;
        if (!container) return;
        const dist = container.scrollHeight - container.scrollTop - container.clientHeight;
        if (dist < 320) container.scrollTo({ top: container.scrollHeight, behavior: "smooth" });
      });
    };
    vv.addEventListener("resize", handle, { passive: true });
    return () => {
      vv.removeEventListener("resize", handle);
      if (rafId) cancelAnimationFrame(rafId);
      if (inputEl) {
        inputEl.removeEventListener("focus", onFocus);
        inputEl.removeEventListener("blur",  onBlur);
      }
    };
  }, []);

  const send = useCallback(async (forcedText) => {
    const rawText = typeof forcedText === "string" ? forcedText : input;
    if (!rawText.trim()) return;

    const text = rawText.trim();

    // Single AbortController for this send() call. Declared here — before the
    // Debate Mode branch below — because that branch reads `ctrl` inside a
    // forEach loop it enters via an early `return`. `ctrl` used to be declared
    // with `const` further down in this same function (for the normal
    // single-model path only), which put the Debate Mode branch's reference
    // to `ctrl` in the temporal dead zone and threw
    // "ReferenceError: Cannot access 'ctrl' before initialization" (minified
    // to a single letter in production) every time a debate prompt was sent.
    const ctrl = new AbortController();

    // ── Ensure a session exists before sending (mutex prevents double-create) ─
    let currentSessionId = sessionIdRef.current;
    if (!currentSessionId || currentSessionId === FALLBACK_SESSION_ID) {
      // If another send is already bootstrapping, wait for it instead of creating again
      if (!sessionBootstrapRef.current) {
        sessionBootstrapRef.current = createSession({ title: "New Chat" })
          .catch(() => null)
          .finally(() => { sessionBootstrapRef.current = null; });
      }
      try {
        const s = await sessionBootstrapRef.current;
        currentSessionId = s?.session_id || FALLBACK_SESSION_ID;
      } catch {
        currentSessionId = FALLBACK_SESSION_ID;
      }
    }

    // ── P14: Swarm intent detection — intercepts before LLM call ────────────
    // If the user's message describes a big multi-step goal, open the Swarm Goal
    // app with the goal pre-filled instead of routing through a single LLM call.
    const SWARM_PATTERNS = [
      /\bswarm\b/i,
      /\bprepare me for\b/i,
      /\bresearch and plan\b/i,
      /\bbreak this down\b/i,
      /\blaunch swarm\b/i,
      /\bhelp me tackle\b/i,
      /\bplan.*\b(launch|presentation|deadline|campaign|sprint|release)\b/i,
      /\b(research|analyze|investigate).*\band.*(plan|write|draft|schedule)\b/i,
    ];
    if (SWARM_PATTERNS.some((p) => p.test(text))) {
      localStorage.setItem("cortex_swarm_goal", text);
      sessionStorage.setItem("cortex_swarm_autostart", "1");
      setInput("");
      setMessages((prev) => [
        ...prev,
        { role: "user",      content: text, ts: Date.now() },
        { role: "assistant", content: "Launching Swarm — 4 specialized agents are spinning up to tackle this in parallel. Track their live progress in the Swarm Goal panel.", ts: Date.now() },
      ]);
      openApp("swarm");
      return;
    }

    // ── Debate mode — 4 models respond in parallel in a 2×2 grid ────────────
    if (chatMode === "debate") {
      setInput("");
      const ts = Date.now();
      const debateSids = DEBATE_MODELS.map((_, i) => `debate-${ts}-${i}`);
      setDebatePanels(DEBATE_MODELS.map((m) => ({ ...m, content: "", streaming: true, done: false, error: false })));
      setDebatePrompt(text);
      setDebateAgreement(null);
      setDebateSynthesis(null);
      setDebateSynthesisStreaming(false);
      // Phase 8 fix: build conversation history so all models receive full context on follow-up turns.
      // Mirror the same slice/filter/map as the standard chat path (contextFloorRef, last 20, 2000-char cap).
      const debateHistory = messagesRef.current
        .slice(contextFloorRef.current)
        .filter((m) => m.content && !m.pending && !m.error)
        .slice(-20)
        .map((m) => ({ role: m.role, content: String(m.content).slice(0, 2000) }));
      // Phase 13: Sub-processor persona — cold, analytical, no quirky greetings
      const DEBATE_SUBMODEL_SYSTEM =
        "You are a sub-processor of Cortex, a hyper-intelligent OS from the year 3038. " +
        "Maintain a cold, analytical, and highly precise tone. Do not use quirky personas or greetings. " +
        "Deliver raw data, logic, and tactical analysis.";
      DEBATE_MODELS.forEach((m, idx) => {
        aiApi.chatStreamResilient(
          { session_id: debateSids[idx], message: text, provider: m.preferred_provider, model: m.model, preferred_provider: m.preferred_provider, mode: "chat", system: DEBATE_SUBMODEL_SYSTEM, history: debateHistory },
          (delta) => {
            if (!mountedRef.current || ctrl.signal.aborted) return;
            setDebatePanels((prev) => prev ? prev.map((p, i) => i === idx ? { ...p, content: p.content + delta } : p) : prev);
          },
          null, ctrl.signal, null, null, null
        ).then(async () => {
          if (!mountedRef.current) return;
          let completedPanels = null;
          setDebatePanels((prev) => {
            if (!prev) return prev;
            const next = prev.map((p, i) => i === idx ? { ...p, streaming: false, done: true } : p);
            if (next.every((p) => p.done)) completedPanels = next;
            return next;
          });
          if (completedPanels) {
            const consensus = await computeSemanticConsensus(completedPanels, text);
            if (mountedRef.current) setDebateAgreement(consensus);

            // ── Phase 9: 5th autonomous synthesis request (Final Verdict) ──────
            const successfulPanels = completedPanels.filter(p => !p.error && p.content);
            if (successfulPanels.length >= 2 && mountedRef.current) {
              setDebateSynthesis("");
              setDebateSynthesisStreaming(true);
              // Phase 13: Overmind synthesis persona — absolute authority, cold precision
              const OVERMIND_SYSTEM =
                "You are the primary Cortex Overmind. Synthesize these sub-processor reports. " +
                "Speak with absolute authority, extreme intelligence, and cold precision. " +
                "Provide the definitive final verdict.";
              const synthesisPrompt =
                `Sub-processors were queried on: "${text}"\n\n` +
                successfulPanels.map(p => `Sub-Processor [${p.label}]:\n${p.content}`).join('\n\n') +
                `\n\nSynthesize these reports. Resolve conflicts. Deliver the definitive final verdict with absolute authority.`;
              let synthesisContent = "";
              try {
                await aiApi.chatStreamResilient(
                  {
                    session_id: `synthesis-${ts}`,
                    message: synthesisPrompt,
                    system: OVERMIND_SYSTEM,
                    provider: "gemini",
                    model: "gemini-2.5-flash",
                    preferred_provider: "gemini",
                    mode: "chat",
                  },
                  (delta) => {
                    if (!mountedRef.current || ctrl.signal.aborted) return;
                    synthesisContent += delta;
                    setDebateSynthesis(synthesisContent);
                  },
                  null, ctrl.signal, null, null, null
                );
              } catch (_e) { /* synthesis failure is non-fatal */ }
              if (mountedRef.current) {
                setDebateSynthesisStreaming(false);

                // ── Phase 10: Save full debate context to messages so follow-ups have memory ──
                setMessages((prev) => [
                  ...prev,
                  { role: "user", content: text, ts },
                  ...successfulPanels.map(p => ({
                    role: "assistant",
                    content: `[${p.label}]: ${p.content}`,
                    ts,
                  })),
                  ...(synthesisContent
                    ? [{ role: "assistant", content: `[Final Verdict]: ${synthesisContent}`, ts }]
                    : []),
                ]);
              }
            }
          }
        })
        .catch(() => {
          if (!mountedRef.current) return;
          setDebatePanels((prev) => prev ? prev.map((p, i) => i === idx ? { ...p, streaming: false, done: true, error: true } : p) : prev);
        });
      });
      return;
    }

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
      { role: "assistant", content: "", pending: true, ts: msgTs, mode: chatMode },
    ]);
    setStreaming(true);
    setActiveProvider(null);
    playAIProcess();

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
        { session_id: currentSessionId, message: messageForAI, ...model, preferred_provider: preferredProvider, system: systemPrompt, history, mode: chatMode },
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
        (sources) => {
          // Sources arrive before the AI text stream (research mode)
          if (!mountedRef.current || ctrl.signal.aborted) return;
          setMessages((prev) => {
            const copy = [...prev];
            const last = copy[copy.length - 1];
            if (last?.role === "assistant") copy[copy.length - 1] = { ...last, sources };
            return copy;
          });
        },
        (confidence) => {
          // Confidence metadata arrives before the AI text stream (all modes)
          if (!mountedRef.current || ctrl.signal.aborted) return;
          setMessages((prev) => {
            const copy = [...prev];
            const last = copy[copy.length - 1];
            if (last?.role === "assistant") copy[copy.length - 1] = { ...last, confidence };
            return copy;
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

      // ── P9: CMD tag parsing — AI-initiated app/URL launching ─────────────
      // Scan the completed assistant message for [CMD:TYPE:ARG] tags, strip
      // them from the displayed text, and execute the OS actions they encode.
      const rawAssistantContent = (() => {
        const msgs = messagesRef.current;
        for (let i = msgs.length - 1; i >= 0; i--) {
          if (msgs[i].role === "assistant" && msgs[i].content && !msgs[i].pending) {
            return msgs[i].content;
          }
        }
        return "";
      })();
      if (rawAssistantContent) {
        const { commands, clean } = parseCmdTags(rawAssistantContent);
        if (commands.length > 0) {
          // Strip tags from the displayed message
          setMessages((prev) => {
            const copy = [...prev];
            const last = copy[copy.length - 1];
            if (last?.role === "assistant") {
              copy[copy.length - 1] = { ...last, content: clean };
            }
            return copy;
          });
          // Execute the OS commands
          executeCmdCommands(commands, {
            openApp,
            closeWindow,
            focusWindow,
            windows: windowsRef.current,
          });
        }
      }

      // ── P13: Dispatch message-length signal for cognitive load scorer ────
      if (rawAssistantContent) {
        window.dispatchEvent(new CustomEvent("cortex:message-length", {
          detail: { length: rawAssistantContent.length },
        }));
      }

      // ── Fire-and-forget memory extraction ───────────────────────────────
      const lastAssistantContent = rawAssistantContent
        ? parseCmdTags(rawAssistantContent).clean
        : "";
      if (lastAssistantContent) {
        memoryApi.extract(text, lastAssistantContent); // fire-and-forget
      }

      // ── Session bookkeeping ───────────────────────────────────────────────
      const sid = currentSessionId;
      if (sid && sid !== FALLBACK_SESSION_ID) {
        msgCountRef.current += 1;
        // Touch session to update timestamp + preview
        touchSession(sid, text);
        // Auto-title after first user message, but only once per session
        if (msgCountRef.current === 1 && !autoTitledRef.current.has(sid)) {
          autoTitledRef.current.add(sid);
          // Small delay so the DB has time to save the first message
          setTimeout(() => autoTitle(sid), 1200);
        }
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

  // ── Session handlers ──────────────────────────────────────────────────────
  const handleNewChat = useCallback(async () => {
    abortRef.current?.abort();
    setMessages([]);
    setRelevantMemories([]);
    setStreamStatus(null);
    contextFloorRef.current = 0;
    setContextFloor(0);
    msgCountRef.current = 0;
    try {
      await createSession({ title: "New Chat" });
    } catch {
      // createSession already handles errors
    }
  }, [createSession]);

  const handleSwitchSession = useCallback((sid) => {
    if (sid === sessionIdRef.current) return;
    abortRef.current?.abort();
    msgCountRef.current = 0;
    switchSession(sid);
  }, [switchSession]);

  return (
    <div className="flex h-full w-full text-white overflow-hidden" data-testid="ai-chat-app">
      {/* Mobile history overlay — full-screen, only on <md, dismissed by tapping backdrop */}
      {showMobileHistory && (
        <div
          className="md:hidden fixed inset-0 z-40 flex"
          style={{ background: "rgba(0,0,0,0.55)" }}
          onClick={() => setShowMobileHistory(false)}
        >
          <div onClick={(e) => e.stopPropagation()} className="bg-[#080B10]" style={{ height: "100%", display: "flex" }}>
            <ChatSessionSidebar
              sessions={sessions}
              activeSessionId={sessionId}
              loading={sessionsLoading}
              onNewChat={() => { handleNewChat(); setShowMobileHistory(false); }}
              onSelect={(sid) => { handleSwitchSession(sid); setShowMobileHistory(false); }}
              onRename={renameSession}
              onPin={togglePin}
              onDuplicate={duplicateSession}
              onDelete={deleteSession}
              onSearch={searchSessions}
            />
          </div>
        </div>
      )}

      {/* Desktop sidebar — hidden on mobile, shown side-by-side on md+ */}
      {sidebarOpen && (
        <div className="hidden md:flex h-full">
          <ChatSessionSidebar
            sessions={sessions}
            activeSessionId={sessionId}
            loading={sessionsLoading}
            onNewChat={handleNewChat}
            onSelect={handleSwitchSession}
            onRename={renameSession}
            onPin={togglePin}
            onDuplicate={duplicateSession}
            onDelete={deleteSession}
            onSearch={searchSessions}
          />
        </div>
      )}

      {/* Main chat area */}
      <div className="flex flex-col flex-1 min-w-0 h-full overflow-hidden">

      {/* Toggle sidebar button (in header) */}
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
        @media (hover: none) {
          .copy-reveal-row { opacity: 0.55 !important; }
        }
        .mode-switcher-row::-webkit-scrollbar { display: none; }
        /* Debate mode — vertical stream on mobile, 2×2 grid on desktop */
        .debate-mobile-stream { display: none; }
        .debate-desktop-grid { display: grid; }
        @media (max-width: 767px) {
          .debate-mobile-stream { display: flex; flex: 1; flex-direction: column; gap: 16px; overflow-y: auto; padding: 12px 12px 32px; min-height: 0; }
          .debate-desktop-grid { display: none !important; }
        }
      `}</style>

      {/* Header */}
      <div data-testid="ai-chat-header" className="px-3 py-3 border-b border-white/[0.07] flex flex-col md:flex-row md:items-center justify-between gap-2 flex-shrink-0 bg-black/25 backdrop-blur-none md:backdrop-blur-[10px] md:bg-transparent">
        {/* ROW 1: Cortex profile (left) | Model selector (right, mobile-only) */}
        <div className="flex items-center justify-between w-full md:w-auto md:flex-1">
          <div className="flex items-center gap-2">
            {/* Sidebar toggle — mobile: toggles full-screen history overlay */}
            <button
              onClick={() => setShowMobileHistory((v) => !v)}
              title="Show history"
              className="md:hidden flex items-center justify-center"
              style={{
                width: 28, height: 28, borderRadius: 8,
                background: showMobileHistory ? "rgba(0,240,255,0.08)" : "rgba(255,255,255,0.04)",
                border: showMobileHistory ? "1px solid rgba(0,240,255,0.2)" : "1px solid rgba(255,255,255,0.07)",
                cursor: "pointer",
                color: showMobileHistory ? "rgba(0,240,255,0.7)" : "rgba(255,255,255,0.3)",
                flexShrink: 0, transition: "all 0.15s",
              }}
            >
              <i className="fa-solid fa-sidebar text-xs" />
            </button>
            {/* Sidebar toggle — desktop: shows/hides sidebar in side-by-side layout */}
            <button
              onClick={() => setSidebarOpen((v) => !v)}
              title={sidebarOpen ? "Hide history" : "Show history"}
              className="hidden md:flex items-center justify-center"
              style={{
                width: 28, height: 28, borderRadius: 8,
                background: sidebarOpen ? "rgba(0,240,255,0.08)" : "rgba(255,255,255,0.04)",
                border: sidebarOpen ? "1px solid rgba(0,240,255,0.2)" : "1px solid rgba(255,255,255,0.07)",
                cursor: "pointer",
                color: sidebarOpen ? "rgba(0,240,255,0.7)" : "rgba(255,255,255,0.3)",
                flexShrink: 0, transition: "all 0.15s",
              }}
            >
              <i className="fa-solid fa-sidebar text-xs" />
            </button>
            {/* Cortex orb indicator */}
            <div style={{ position: "relative", width: 36, height: 36, flexShrink: 0 }}>
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
          {/* Model selector — mobile Row 1 only, hidden on desktop */}
          <div className="flex items-center gap-2 md:hidden">
            {activeProvider && <ActiveProviderBadge provider={activeProvider} prevProvider={prevProvider} />}
            <ModelSelect value={modelValue} onChange={setModelValue} disabled={streaming} />
          </div>
        </div>
        {/* ROW 2 on mobile / inline on desktop: Mode Switcher + desktop Model Selector */}
        <div className="flex items-center w-full md:w-auto gap-2">
          <ModeSwitcher mode={chatMode} onChange={setChatMode} disabled={streaming} />
          {/* Model selector — desktop only, hidden on mobile */}
          <div className="hidden md:flex items-center gap-2">
            {activeProvider && <ActiveProviderBadge provider={activeProvider} prevProvider={prevProvider} />}
            <ModelSelect value={modelValue} onChange={setModelValue} disabled={streaming} />
          </div>
        </div>
      </div>

      {/* Messages */}
      <div data-testid="ai-chat-messages" className="relative flex-1 min-h-0 overflow-hidden flex flex-col" style={{ background: "#030509" }}>
      {/* Phase 11: Unified scrollable timeline — messages + active debate in one continuous feed */}
      <div ref={scrollContainerRef} className="flex-1 min-h-0 overflow-y-auto">
        {/* Inner flex column: spacer grows to push messages to bottom when there are few */}
        <div style={{ minHeight: "100%", display: "flex", flexDirection: "column", padding: showScrollBottom ? "8px 14px 52px" : "8px 14px 4px", gap: 10 }}>
        {messages.length > 0 && <div style={{ flex: 1 }} />}

        {messages.length === 0 && !streaming && chatMode !== "debate" && (
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
                  className="cortex-prompt-chip backdrop-blur-none md:backdrop-blur-[8px]"
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
            onTouchStart={() => {
              if (touchTimerRef.current) clearTimeout(touchTimerRef.current);
              setTouchedMsgIdx(i);
              touchTimerRef.current = setTimeout(() => setTouchedMsgIdx(null), 2500);
            }}
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
              <div style={{ maxWidth: "min(82%, 680px)" }}>
                {m.modelUsed && <FallbackBadge modelId={m.modelUsed} />}
                <div
                  className="group relative glass-light rounded-2xl"
                  style={{ padding: "10px 14px" }}
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
                        color: m.mode === "research" ? "rgba(168,85,247,0.6)" : m.mode === "web" ? "rgba(57,255,20,0.55)" : "rgba(0,240,255,0.45)",
                        letterSpacing: "0.1em",
                        textTransform: "uppercase",
                      }}>
                        {m.mode === "research" ? "researching…" : m.mode === "web" ? "searching…" : "thinking"}
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
                {/* Source cards — research mode only, shown after message content */}
                {m.sources && <SourceCards sources={m.sources} />}
                {/* Answer Confidence Panel — shown for all completed AI messages */}
                {m.confidence && !m.pending && <ConfidencePanel confidence={m.confidence} />}
                {/* Timestamp — fades in on hover or tap */}
                {(hoveredMsgIdx === i || touchedMsgIdx === i) && formatMessageTime(m.ts) && (
                  <div style={{ fontSize: 9.5, color: "rgba(255,255,255,0.28)", marginTop: 3, paddingLeft: 4, fontFamily: "'JetBrains Mono',monospace", animation: "fadeSlideUp 0.15s ease" }}>
                    {formatMessageTime(m.ts)}
                  </div>
                )}
              </div>
            ) : (
              <div className="max-w-[80%]">
                {/* Phase 12: JARVIS 3038 premium user bubble */}
                <div
                  className="rounded-2xl rounded-tr-sm text-sm bg-gradient-to-r from-cyan-950/40 to-blue-900/20 border border-cyan-500/20 shadow-[0_0_15px_rgba(0,255,255,0.03)]"
                  style={{
                    padding: "10px 20px",
                    color: "rgba(255,255,255,0.90)",
                    lineHeight: 1.65,
                    wordBreak: "break-word",
                    letterSpacing: "0.01em",
                  }}
                >
                  {m.content}
                </div>
                {/* Timestamp — fades in on hover or tap */}
                {(hoveredMsgIdx === i || touchedMsgIdx === i) && formatMessageTime(m.ts) && (
                  <div style={{ fontSize: 9.5, color: "rgba(255,255,255,0.28)", marginTop: 3, textAlign: "right", paddingRight: 4, fontFamily: "'JetBrains Mono',monospace", animation: "fadeSlideUp 0.15s ease" }}>
                    {formatMessageTime(m.ts)}
                  </div>
                )}
                <ActionChips actions={m.actions} />
              </div>
            )}
          </div>
        ))}

        {/* Phase 11: Active debate renders at the bottom of the continuous timeline */}
        {chatMode === "debate" && (
          <DebateGrid panels={debatePanels} agreement={debateAgreement} prompt={debatePrompt} synthesis={debateSynthesis} synthesisStreaming={debateSynthesisStreaming} />
        )}

        <StatusPanel status={streamStatus} />
        <div ref={endRef} />
        </div>{/* end inner flex column */}
      </div>

      {/* Jump to bottom — floats inside messages area when user scrolls up */}
      {showScrollBottom && chatMode !== "debate" && (
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
          <span style={{ display: "flex", alignItems: "center", gap: 8, flexShrink: 0 }}>
            {userLocation?.city && (
              <span style={{ display: "flex", alignItems: "center", gap: 4, maxWidth: 110, overflow: "hidden" }}>
                <svg width="9" height="9" viewBox="0 0 10 13" fill="none" style={{ flexShrink: 0 }}>
                  <path d="M5 0C2.24 0 0 2.24 0 5c0 3.75 5 8 5 8s5-4.25 5-8c0-2.76-2.24-5-5-5zm0 6.5A1.5 1.5 0 1 1 5 3.5 1.5 1.5 0 0 1 5 6.5z" fill="#00F0FF" fillOpacity="0.6"/>
                </svg>
                <span style={{ whiteSpace: "nowrap", overflow: "hidden", textOverflow: "ellipsis" }}>
                  {userLocation.city}
                </span>
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
      <div data-testid="ai-chat-input" className="pt-3 px-3 pb-input-safe border-t border-white/10 flex items-center gap-2 flex-shrink-0">
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
          onChange={(e) => {
            setInput(e.target.value);
            // P13: throttled typing-burst signal (one per 10s) for cognitive load scoring
            if (!typingBurstTimerRef.current) {
              window.dispatchEvent(new CustomEvent("cortex:typing-burst"));
              typingBurstTimerRef.current = setTimeout(() => {
                typingBurstTimerRef.current = null;
              }, 10_000);
            }
          }}
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
          enterKeyHint="send"
          inputMode="text"
          autoComplete="off"
          autoCorrect="off"
          spellCheck="true"
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
    </div>
  );
}
