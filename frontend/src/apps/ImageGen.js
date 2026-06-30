import React, { useEffect, useState } from "react";
import { aiApi } from "../lib/api";
import { toast } from "sonner";

export default function ImageGen() {
  const [prompt,   setPrompt]   = useState("");
  const [loading,  setLoading]  = useState(false);
  const [history,  setHistory]  = useState([]);
  const [selected, setSelected] = useState(null);

  useEffect(() => { aiApi.imageHistory().then(setHistory).catch(() => {}); }, []);

  const generate = async () => {
    if (!prompt.trim()) return;
    setLoading(true);
    try {
      const res = await aiApi.image(prompt);
      setHistory((h) => [res, ...h]);
      setSelected(res);
      toast.success("Generated");
    } catch {
      toast.error("Generation failed");
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="flex flex-col sm:grid sm:grid-cols-3 h-full text-white" data-testid="imagegen-app">
      {/* Main panel */}
      <div
        className="sm:col-span-2 flex flex-col p-4 sm:p-5 border-b sm:border-b-0 sm:border-r border-white/10"
        style={{ flex: "1 1 auto", minHeight: "55%" }}
      >
        <div className="mono-label">// Visual Synthesis</div>
        <h2 className="font-heading text-xl sm:text-2xl font-bold mb-3">Image Generation</h2>

        <div
          className="flex-1 flex items-center justify-center glass-light rounded-xl overflow-hidden mb-4"
          style={{ minHeight: 160 }}
        >
          {selected ? (
            <img
              src={`data:image/png;base64,${selected.image_b64}`}
              alt={selected.prompt}
              className="w-full h-full object-contain"
            />
          ) : loading ? (
            <div className="text-center">
              <div className="inline-block w-12 h-12 rounded-full border-2 border-[#00F0FF] border-t-transparent animate-spin"></div>
              <div className="mono-label mt-3 text-[#00F0FF]">// SYNTHESIZING</div>
            </div>
          ) : (
            <div className="text-center text-slate-500">
              <i className="fa-solid fa-image text-5xl opacity-30"></i>
              <div className="mt-3 text-sm">Describe what you want to see</div>
            </div>
          )}
        </div>

        <div className="flex gap-2 flex-shrink-0">
          <input
            data-testid="image-prompt"
            value={prompt}
            onChange={(e) => setPrompt(e.target.value)}
            onKeyDown={(e) => e.key === "Enter" && generate()}
            placeholder="A cyberpunk samurai meditating on a neon rooftop…"
            className="input-cyber flex-1 min-w-0"
          />
          <button
            data-testid="image-generate"
            disabled={loading}
            onClick={generate}
            className="neon-btn primary flex-shrink-0"
          >
            {loading ? "…" : "Generate"}
          </button>
        </div>
      </div>

      {/* History sidebar */}
      <div className="p-3 sm:p-4 overflow-y-auto flex-shrink-0">
        <div className="mono-label mb-2">// History</div>
        {history.length === 0 && (
          <div className="text-center text-slate-500 text-xs py-4">No images yet</div>
        )}
        <div className="grid grid-cols-3 sm:grid-cols-2 gap-2">
          {history.map((img, i) => (
            <button
              key={i}
              onClick={() => setSelected(img)}
              className={`rounded-lg overflow-hidden aspect-square border transition ${
                selected === img ? "border-[#00F0FF]" : "border-white/10 hover:border-white/30"
              }`}
            >
              <img
                src={`data:image/png;base64,${img.image_b64}`}
                alt={img.prompt}
                className="w-full h-full object-cover"
              />
            </button>
          ))}
        </div>
      </div>
    </div>
  );
}
