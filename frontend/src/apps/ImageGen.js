import React, { useState, useEffect, useRef, useCallback } from "react";
import { toast } from "sonner";
import { aiApi } from "../lib/api";

// ── Helpers ────────────────────────────────────────────────────────────────
function formatTime(ts) {
  if (!ts) return null;
  try {
    return new Date(ts).toLocaleTimeString([], { hour: "2-digit", minute: "2-digit" });
  } catch { return null; }
}

export default function ImageGen() {
  const [prompt,       setPrompt]       = useState("");
  const [loading,      setLoading]      = useState(false);
  const [history,      setHistory]      = useState([]);
  const [selected,     setSelected]     = useState(null);
  const [historyLoaded,setHistoryLoaded] = useState(false);
  const [error,        setError]        = useState(null);
  const promptInputRef = useRef(null);

  // ── Load persisted history from backend on mount ─────────────────────────
  useEffect(() => {
    aiApi.imageHistory()
      .then((items) => {
        if (Array.isArray(items) && items.length > 0) {
          setHistory(items);
          setSelected(items[0]);
        }
      })
      .catch(() => {/* non-critical — ignore if history unavailable */})
      .finally(() => setHistoryLoaded(true));
  }, []);

  // ── Generate ──────────────────────────────────────────────────────────────
  const generate = useCallback(async () => {
    const p = prompt.trim();
    if (!p || loading) return;

    setLoading(true);
    setError(null);

    try {
      // POST to backend → Imagen-4 via Google's generative AI API.
      // The EXACT prompt is forwarded unchanged — no summarisation, no rewriting.
      const result = await aiApi.image(p);

      // Backend returns { id, prompt, image_b64, created_at, ... }
      setHistory((h) => [result, ...h]);
      setSelected(result);
    } catch (err) {
      const status = err?.response?.status ?? err?.status;
      if (status === 429) {
        setError("AI quota reached — please wait a moment and try again.");
        toast.error("Image generation quota reached. Try again shortly.", { duration: 5000 });
      } else if (status === 400) {
        setError("Prompt blocked by safety filters. Try rephrasing.");
        toast.error("Prompt blocked by content filters.");
      } else {
        const msg = err?.response?.data?.detail || err?.message || "Unknown error";
        setError(`Generation failed: ${msg}`);
        toast.error("Image generation failed — check the prompt and try again.");
      }
    } finally {
      setLoading(false);
    }
  }, [prompt, loading]);

  const handleKeyDown = useCallback((e) => {
    if (e.key === "Enter" && !e.shiftKey) { e.preventDefault(); generate(); }
  }, [generate]);

  // ── Image source from entry ────────────────────────────────────────────────
  // Backend stores base64 PNG. Pollinations entries (old, pre-migration) store a URL.
  const imgSrc = (entry) => {
    if (!entry) return null;
    if (entry.image_b64) return `data:image/png;base64,${entry.image_b64}`;
    if (entry.url)       return entry.url; // legacy Pollinations entries
    return null;
  };

  return (
    <div className="flex flex-col sm:grid sm:grid-cols-3 h-full text-white" data-testid="imagegen-app">

      {/* ── Main panel ─────────────────────────────────────────────────── */}
      <div
        className="sm:col-span-2 flex flex-col p-4 sm:p-5 border-b sm:border-b-0 sm:border-r border-white/10"
        style={{ flex: "1 1 auto", minHeight: "55%" }}
      >
        <div className="mono-label">// Visual Synthesis</div>
        <h2 className="font-heading text-xl sm:text-2xl font-bold mb-1">Image Generation</h2>
        <div style={{ fontSize: 10, fontFamily: "'JetBrains Mono', monospace", color: "rgba(255,255,255,0.25)", marginBottom: 16 }}>
          Powered by Imagen-4 · Semantic fidelity preserved
        </div>

        {/* Image viewport */}
        <div
          className="flex-1 flex items-center justify-center glass-light rounded-xl overflow-hidden mb-4"
          style={{ minHeight: 160, position: "relative" }}
        >
          {loading ? (
            <div className="text-center">
              <div className="inline-block w-12 h-12 rounded-full border-2 border-[#00F0FF] border-t-transparent animate-spin" />
              <div className="mono-label mt-3 text-[#00F0FF]">// SYNTHESIZING</div>
              <div style={{ fontSize: 11, fontFamily: "'JetBrains Mono', monospace", color: "rgba(0,240,255,0.45)", marginTop: 4, maxWidth: 300, textAlign: "center", padding: "0 16px" }}>
                Generating from exact prompt…
              </div>
            </div>
          ) : selected && imgSrc(selected) ? (
            <>
              <img
                src={imgSrc(selected)}
                alt={selected.prompt}
                className="w-full h-full object-contain"
                onError={(e) => {
                  e.currentTarget.style.display = "none";
                  setError("Could not load image. The file may be unavailable.");
                }}
              />
              {/* Prompt overlay — bottom */}
              <div style={{
                position: "absolute", bottom: 0, left: 0, right: 0,
                padding: "24px 14px 10px",
                background: "linear-gradient(transparent, rgba(0,0,0,0.72))",
                pointerEvents: "none",
              }}>
                <div style={{
                  fontSize: 11, fontFamily: "'JetBrains Mono', monospace",
                  color: "rgba(255,255,255,0.65)", lineHeight: 1.5,
                  overflow: "hidden", textOverflow: "ellipsis",
                  display: "-webkit-box", WebkitLineClamp: 2, WebkitBoxOrient: "vertical",
                }}>
                  {selected.prompt}
                </div>
                {selected.created_at && (
                  <div style={{ fontSize: 9, color: "rgba(255,255,255,0.28)", marginTop: 2, fontFamily: "'JetBrains Mono', monospace" }}>
                    {formatTime(selected.created_at)} · Imagen-4
                  </div>
                )}
              </div>
            </>
          ) : error ? (
            <div className="text-center px-6">
              <i className="fa-solid fa-triangle-exclamation text-4xl" style={{ color: "rgba(255,100,80,0.6)" }} />
              <div style={{ marginTop: 10, fontSize: 12, color: "rgba(255,160,140,0.8)", fontFamily: "'JetBrains Mono', monospace", lineHeight: 1.6 }}>
                {error}
              </div>
              <button
                onClick={() => { setError(null); promptInputRef.current?.focus(); }}
                style={{
                  marginTop: 10, fontSize: 11, fontFamily: "'JetBrains Mono', monospace",
                  padding: "5px 14px", borderRadius: 8,
                  background: "rgba(255,100,80,0.08)", border: "1px solid rgba(255,100,80,0.25)",
                  color: "rgba(255,160,140,0.7)", cursor: "pointer",
                }}
              >
                Dismiss
              </button>
            </div>
          ) : (
            <div className="text-center text-slate-500">
              <i className="fa-solid fa-image text-5xl opacity-30" />
              <div className="mt-3 text-sm">Describe what you want to see</div>
              <div style={{ marginTop: 6, fontSize: 11, color: "rgba(255,255,255,0.2)", fontFamily: "'JetBrains Mono', monospace" }}>
                Your exact prompt reaches the model unchanged
              </div>
            </div>
          )}
        </div>

        {/* Input row */}
        <div className="flex gap-2 flex-shrink-0">
          <input
            ref={promptInputRef}
            data-testid="image-prompt"
            value={prompt}
            onChange={(e) => { setPrompt(e.target.value); setError(null); }}
            onKeyDown={handleKeyDown}
            placeholder="Ducati Multistrada V4S red side profile…"
            className="input-cyber flex-1 min-w-0"
          />
          <button
            data-testid="image-generate"
            disabled={loading || !prompt.trim()}
            onClick={generate}
            className="neon-btn primary flex-shrink-0"
          >
            {loading ? "…" : "Generate"}
          </button>
        </div>

        {/* Tip */}
        <div style={{ marginTop: 8, fontSize: 10, fontFamily: "'JetBrains Mono', monospace", color: "rgba(255,255,255,0.18)", lineHeight: 1.5 }}>
          Tip: Include brand names, model numbers, colors, and viewpoints — they are preserved verbatim.
        </div>
      </div>

      {/* ── History sidebar ─────────────────────────────────────────────── */}
      <div className="p-3 sm:p-4 overflow-y-auto flex-shrink-0">
        <div className="mono-label mb-2">// History</div>

        {!historyLoaded ? (
          <div className="text-center text-slate-600 text-xs py-4">Loading…</div>
        ) : history.length === 0 ? (
          <div className="text-center text-slate-500 text-xs py-4">No images yet</div>
        ) : (
          <div className="grid grid-cols-3 sm:grid-cols-2 gap-2">
            {history.map((img, i) => {
              const src = imgSrc(img);
              const isSelected = selected === img || (selected?.id && selected.id === img.id);
              return (
                <button
                  key={img.id || i}
                  onClick={() => { setSelected(img); setError(null); }}
                  title={img.prompt}
                  className={`rounded-lg overflow-hidden aspect-square border transition ${
                    isSelected ? "border-[#00F0FF]" : "border-white/10 hover:border-white/30"
                  }`}
                  style={{ position: "relative" }}
                >
                  {src ? (
                    <img
                      src={src}
                      alt={img.prompt}
                      className="w-full h-full object-cover"
                      onError={(e) => {
                        // Gracefully degrade broken thumbnails — show placeholder
                        e.currentTarget.style.display = "none";
                        e.currentTarget.nextSibling.style.display = "flex";
                      }}
                    />
                  ) : null}
                  {/* Broken image placeholder */}
                  <div
                    style={{
                      display: src ? "none" : "flex",
                      position: "absolute", inset: 0,
                      alignItems: "center", justifyContent: "center",
                      background: "rgba(255,255,255,0.04)",
                      color: "rgba(255,255,255,0.2)", fontSize: 18,
                    }}
                  >
                    <i className="fa-solid fa-image-slash" />
                  </div>
                </button>
              );
            })}
          </div>
        )}
      </div>
    </div>
  );
}
