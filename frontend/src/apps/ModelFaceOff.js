import React, { useRef, useState } from "react";
import { faceOffApi } from "../lib/api";
import MarkdownRenderer from "../components/MarkdownRenderer";
import { toast } from "sonner";

const PROVIDERS = [
  { id: "gemini",   label: "Gemini Flash",  model: "gemini-2.5-flash",          color: "#00F0FF", icon: "fa-bolt" },
  { id: "deepseek", label: "DeepSeek V3",   model: "deepseek-chat",             color: "#CF9EFF", icon: "fa-water" },
  { id: "groq",     label: "Groq Llama",    model: "llama-3.3-70b-versatile",   color: "#39FF14", icon: "fa-microchip" },
  { id: "cerebras", label: "Cerebras",      model: "llama-3.3-70b",             color: "#FFA000", icon: "fa-brain" },
];

const EXAMPLE_PROMPTS = [
  { label: "⚡ Speed test", text: "In one sentence: what is the speed of light?" },
  { label: "🧠 Logic trap", text: "A rooster lays an egg on the peak of a roof. Which way does it roll?" },
  { label: "💻 Debug this", text: "Why does `0.1 + 0.2 !== 0.3` in JavaScript? How do you fix it?" },
  { label: "🔥 Controversial", text: "Is Python or JavaScript the better first programming language to learn? Give a direct verdict." },
  { label: "🌍 Factual", text: "How many bones does a human adult have, and which bone is the longest?" },
  { label: "🤯 Trick Q", text: "If you have a 3-gallon jug and a 5-gallon jug, how do you measure exactly 4 gallons?" },
];

function jaccard(a, b) {
  const setA = new Set(a.toLowerCase().split(/\s+/).filter(w => w.length > 4));
  const setB = new Set(b.toLowerCase().split(/\s+/).filter(w => w.length > 4));
  const intersection = [...setA].filter(w => setB.has(w)).length;
  const union = new Set([...setA, ...setB]).size;
  return union === 0 ? 0 : intersection / union;
}

function computeAgreement(results) {
  const valid = results.filter(r => r.text && !r.error);
  if (valid.length < 2) return {};
  const pairs = {};
  for (let i = 0; i < valid.length; i++)
    for (let j = i + 1; j < valid.length; j++)
      pairs[`${valid[i].provider}__${valid[j].provider}`] = jaccard(valid[i].text, valid[j].text);
  const avgScores = {};
  for (const r of valid) {
    const scores = Object.entries(pairs).filter(([k]) => k.includes(r.provider)).map(([, v]) => v);
    avgScores[r.provider] = scores.length ? scores.reduce((a, b) => a + b, 0) / scores.length : 0;
  }
  return avgScores;
}

function AgreementBadge({ score }) {
  if (score == null) return null;
  const pct = Math.round(score * 100);
  const [label, color] = pct >= 55 ? ["HIGH CONSENSUS", "#39FF14"] : pct >= 30 ? ["PARTIAL MATCH", "#FFA000"] : ["DIVERGING", "#FF003C"];
  return (
    <span style={{ fontSize: 9, fontFamily: "monospace", fontWeight: 700, padding: "2px 5px", borderRadius: 4, letterSpacing: 1, background: `${color}18`, border: `1px solid ${color}55`, color }}>
      {label} {pct}%
    </span>
  );
}

function ProviderPanel({ info, result, loading, agreement, elapsed, isFastest }) {
  const isEmpty = !result && !loading;
  const hasError = result?.error;
  const hasText = result?.text;

  return (
    <div style={{
      flex: 1, minWidth: 0,
      background: "rgba(255,255,255,0.025)",
      border: `1px solid ${isFastest && hasText ? "#39FF14" : loading ? info.color + "66" : hasError ? "#FF003C44" : hasText ? info.color + "33" : "rgba(255,255,255,0.07)"}`,
      borderRadius: 12, display: "flex", flexDirection: "column", overflow: "hidden",
      transition: "border-color 0.3s",
      boxShadow: isFastest && hasText ? "0 0 18px rgba(57,255,20,0.15)" : loading ? `0 0 20px ${info.color}18` : "none",
    }}>
      <div style={{ padding: "9px 13px", borderBottom: "1px solid rgba(255,255,255,0.06)", display: "flex", alignItems: "center", gap: 7, background: `${info.color}08`, flexWrap: "wrap", rowGap: 4 }}>
        <i className={`fa-solid ${info.icon}`} style={{ color: info.color, fontSize: 11 }} />
        <span style={{ color: info.color, fontSize: 11, fontFamily: "monospace", fontWeight: 700 }}>{info.label}</span>
        <span style={{ fontSize: 9, color: "rgba(255,255,255,0.28)", fontFamily: "monospace" }}>{info.model}</span>
        <div style={{ marginLeft: "auto", display: "flex", alignItems: "center", gap: 5, flexWrap: "wrap" }}>
          {isFastest && hasText && (
            <span style={{ fontSize: 9, fontFamily: "monospace", fontWeight: 700, padding: "2px 5px", borderRadius: 4, letterSpacing: 1, background: "rgba(57,255,20,0.15)", border: "1px solid rgba(57,255,20,0.5)", color: "#39FF14" }}>
              ⚡ FASTEST
            </span>
          )}
          {elapsed != null && hasText && (
            <span style={{ fontSize: 9, fontFamily: "monospace", color: "rgba(255,255,255,0.35)", padding: "2px 5px", borderRadius: 4, background: "rgba(255,255,255,0.04)", border: "1px solid rgba(255,255,255,0.08)" }}>
              {(elapsed / 1000).toFixed(1)}s
            </span>
          )}
          {agreement != null && hasText && <AgreementBadge score={agreement} />}
          {loading && <span style={{ display: "flex", alignItems: "center", gap: 4, color: info.color, fontSize: 9, fontFamily: "monospace" }}><span className="animate-pulse">●</span> THINKING</span>}
          {hasError && <span style={{ color: "#FF003C", fontSize: 9, fontFamily: "monospace" }}>✗ FAILED</span>}
        </div>
      </div>

      <div style={{ flex: 1, padding: 13, overflowY: "auto", minHeight: 100 }}>
        {isEmpty && (
          <div style={{ color: "rgba(255,255,255,0.18)", fontSize: 12, fontFamily: "monospace", textAlign: "center", marginTop: 28 }}>
            <i className="fa-solid fa-robot" style={{ fontSize: 22, marginBottom: 8, display: "block" }} />
            waiting for prompt…
          </div>
        )}
        {loading && !hasText && (
          <div style={{ display: "flex", flexDirection: "column", gap: 8, marginTop: 8 }}>
            {[78, 58, 68, 42].map((w, i) => (
              <div key={i} style={{ height: 11, borderRadius: 6, width: `${w}%`, background: `linear-gradient(90deg,${info.color}22,${info.color}44,${info.color}22)`, backgroundSize: "200% 100%", animation: "shimmer 1.5s infinite" }} />
            ))}
          </div>
        )}
        {hasError && (
          <div style={{ color: "#FF003C", fontSize: 12, fontFamily: "monospace", padding: "8px 0" }}>
            <i className="fa-solid fa-triangle-exclamation" style={{ marginRight: 6 }} />
            {result.error === "timeout" ? "Request timed out (30s)" : result.error}
          </div>
        )}
        {hasText && <div style={{ fontSize: 13, color: "rgba(255,255,255,0.85)", lineHeight: 1.65 }}><MarkdownRenderer content={result.text} /></div>}
      </div>
    </div>
  );
}

export default function ModelFaceOff() {
  const [prompt, setPrompt] = useState("");
  const [results, setResults] = useState({});
  const [loading, setLoading] = useState(false);
  const [ran, setRan] = useState(false);
  const [agreement, setAgreement] = useState({});
  const [timings, setTimings] = useState({});

  async function runFaceOff(overridePrompt) {
    const p = (overridePrompt || prompt).trim();
    if (!p) { toast.error("Enter a prompt first"); return; }
    if (loading) return;
    if (overridePrompt) setPrompt(overridePrompt);
    setLoading(true);
    setRan(true);
    setResults({});
    setAgreement({});
    setTimings({});
    const t0 = Date.now();

    try {
      const data = await faceOffApi.run(p);
      const tEnd = Date.now();
      const byProvider = {};
      const newTimings = {};
      for (const r of data.results) {
        byProvider[r.provider] = r;
        if (r.text && !r.error) newTimings[r.provider] = r.elapsed_ms ?? (tEnd - t0);
      }
      setResults(byProvider);
      setTimings(newTimings);
      setAgreement(computeAgreement(data.results));
      const successful = data.results.filter(r => r.text && !r.error).length;
      const failed = data.results.filter(r => r.error).length;
      if (failed > 0 && successful === 0) toast.error("All providers failed — check API keys");
      else if (failed > 0) toast.warning(`${failed} provider(s) unavailable`);
      else toast.success(`All ${successful} models responded`);
    } catch (err) {
      toast.error(err?.response?.data?.detail || "Face-Off request failed");
    } finally {
      setLoading(false);
    }
  }

  function handleKey(e) { if (e.key === "Enter" && (e.metaKey || e.ctrlKey)) runFaceOff(); }

  const successCount = Object.values(results).filter(r => r.text && !r.error).length;
  const fastestProvider = Object.keys(timings).length ? Object.entries(timings).sort((a, b) => a[1] - b[1])[0][0] : null;

  return (
    <div style={{ height: "100%", display: "flex", flexDirection: "column", background: "radial-gradient(ellipse at 10% 0%, rgba(0,240,255,0.04) 0%, transparent 60%)", padding: "14px 16px", gap: 11, fontFamily: "sans-serif" }}>
      <style>{`@keyframes shimmer{0%{background-position:200% 0}100%{background-position:-200% 0}}`}</style>

      {/* Header */}
      <div style={{ display: "flex", alignItems: "center", gap: 10, flexShrink: 0 }}>
        <div style={{ width: 30, height: 30, borderRadius: 8, background: "rgba(0,240,255,0.12)", border: "1px solid rgba(0,240,255,0.3)", display: "flex", alignItems: "center", justifyContent: "center" }}>
          <i className="fa-solid fa-bolt-lightning" style={{ color: "#00F0FF", fontSize: 13 }} />
        </div>
        <div>
          <div style={{ color: "#E2E8F0", fontWeight: 700, fontSize: 14, letterSpacing: 0.5 }}>Model Face-Off</div>
          <div style={{ color: "rgba(255,255,255,0.4)", fontSize: 10 }}>One prompt · All models · Side by side</div>
        </div>
        {ran && !loading && successCount > 0 && (
          <div style={{ marginLeft: "auto", display: "flex", gap: 5 }}>
            {Object.entries(agreement).map(([provider, score]) => (
              <div key={provider} style={{ fontSize: 9, fontFamily: "monospace", color: "rgba(255,255,255,0.45)", background: "rgba(255,255,255,0.04)", border: "1px solid rgba(255,255,255,0.08)", padding: "2px 7px", borderRadius: 4 }}>
                {PROVIDERS.find(p => p.id === provider)?.label?.split(" ")[0]}{" "}
                <span style={{ color: score >= 0.55 ? "#39FF14" : score >= 0.30 ? "#FFA000" : "#FF003C" }}>{Math.round(score * 100)}%</span>
              </div>
            ))}
          </div>
        )}
      </div>

      {/* Prompt input */}
      <div style={{ borderRadius: 10, border: "1px solid rgba(255,255,255,0.1)", background: "rgba(255,255,255,0.03)", overflow: "hidden", flexShrink: 0 }}>
        <textarea
          value={prompt}
          onChange={e => setPrompt(e.target.value)}
          onKeyDown={handleKey}
          disabled={loading}
          placeholder={"Ask anything… every model answers simultaneously.\nTry a coding question or controversial topic to see where they diverge."}
          rows={2}
          style={{ width: "100%", boxSizing: "border-box", background: "transparent", border: "none", outline: "none", color: "#E2E8F0", fontSize: 13, lineHeight: 1.6, padding: "10px 13px", resize: "none", fontFamily: "inherit" }}
        />
        <div style={{ padding: "6px 10px", borderTop: "1px solid rgba(255,255,255,0.06)", display: "flex", alignItems: "center", justifyContent: "space-between" }}>
          <span style={{ color: "rgba(255,255,255,0.22)", fontSize: 10, fontFamily: "monospace" }}>⌘↵ · {prompt.length}/4000</span>
          <button onClick={() => runFaceOff()} disabled={loading || !prompt.trim()} style={{ background: loading ? "rgba(0,240,255,0.06)" : "rgba(0,240,255,0.14)", border: "1px solid rgba(0,240,255,0.35)", color: loading ? "rgba(0,240,255,0.45)" : "#00F0FF", borderRadius: 7, padding: "5px 14px", fontSize: 11, fontFamily: "monospace", fontWeight: 700, cursor: loading ? "not-allowed" : "pointer", display: "flex", alignItems: "center", gap: 5, transition: "all 0.2s", letterSpacing: 0.5 }}>
            {loading ? <><i className="fa-solid fa-circle-notch fa-spin" style={{ fontSize: 10 }} /> RUNNING…</> : <><i className="fa-solid fa-bolt-lightning" style={{ fontSize: 10 }} /> RUN FACE-OFF</>}
          </button>
        </div>
      </div>

      {/* Example prompt chips */}
      <div style={{ display: "flex", flexWrap: "wrap", gap: 6, flexShrink: 0 }}>
        {EXAMPLE_PROMPTS.map(ex => (
          <button
            key={ex.label}
            onClick={() => runFaceOff(ex.text)}
            disabled={loading}
            style={{ fontSize: 10, fontFamily: "monospace", padding: "4px 10px", borderRadius: 20, border: "1px solid rgba(255,255,255,0.12)", background: "rgba(255,255,255,0.04)", color: "rgba(255,255,255,0.6)", cursor: loading ? "not-allowed" : "pointer", transition: "all 0.15s", whiteSpace: "nowrap", opacity: loading ? 0.4 : 1 }}
            onMouseEnter={e => { if (!loading) { e.target.style.background = "rgba(0,240,255,0.08)"; e.target.style.borderColor = "rgba(0,240,255,0.3)"; e.target.style.color = "#00F0FF"; }}}
            onMouseLeave={e => { e.target.style.background = "rgba(255,255,255,0.04)"; e.target.style.borderColor = "rgba(255,255,255,0.12)"; e.target.style.color = "rgba(255,255,255,0.6)"; }}
          >
            {ex.label}
          </button>
        ))}
      </div>

      {/* Panel grid */}
      <div style={{ flex: 1, display: "grid", gridTemplateColumns: "1fr 1fr", gridTemplateRows: "1fr 1fr", gap: 9, minHeight: 0 }}>
        {PROVIDERS.map(info => (
          <ProviderPanel
            key={info.id}
            info={info}
            result={results[info.id] || null}
            loading={loading}
            agreement={agreement[info.id]}
            elapsed={timings[info.id]}
            isFastest={fastestProvider === info.id}
          />
        ))}
      </div>

      {/* Legend */}
      {ran && !loading && successCount > 1 && (
        <div style={{ flexShrink: 0, display: "flex", gap: 12, alignItems: "center", padding: "5px 11px", borderRadius: 6, background: "rgba(255,255,255,0.02)", border: "1px solid rgba(255,255,255,0.05)", fontSize: 9, fontFamily: "monospace", color: "rgba(255,255,255,0.35)" }}>
          <span>CONSENSUS:</span>
          <span><span style={{ color: "#39FF14" }}>≥55%</span> agree</span>
          <span><span style={{ color: "#FFA000" }}>30–54%</span> partial</span>
          <span><span style={{ color: "#FF003C" }}>&lt;30%</span> diverge</span>
          <span style={{ marginLeft: "auto" }}>{successCount}/{PROVIDERS.length} responded{fastestProvider && ` · ⚡ ${PROVIDERS.find(p => p.id === fastestProvider)?.label} fastest (${(timings[fastestProvider]/1000).toFixed(1)}s)`}</span>
        </div>
      )}
    </div>
  );
}
