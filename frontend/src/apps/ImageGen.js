import React, { useEffect, useState } from "react";
import { aiApi } from "../lib/api";
import { toast } from "sonner";

export default function ImageGen() {
  const [prompt, setPrompt] = useState("");
  const [loading, setLoading] = useState(false);
  const [history, setHistory] = useState([]);
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
    } catch (e) {
      toast.error("Generation failed");
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="grid grid-cols-3 h-full text-white" data-testid="imagegen-app">
      <div className="col-span-2 flex flex-col p-5 border-r border-white/10">
        <div className="mono-label">// Visual Synthesis</div>
        <h2 className="font-heading text-2xl font-bold mb-3">Image Generation</h2>

        <div className="flex-1 flex items-center justify-center glass-light rounded-xl overflow-hidden mb-4">
          {selected ? (
            <img src={`data:image/png;base64,${selected.image_b64}`} alt={selected.prompt} className="w-full h-full object-contain" />
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

        <div className="flex gap-2">
          <input
            data-testid="image-prompt"
            value={prompt}
            onChange={(e) => setPrompt(e.target.value)}
            onKeyDown={(e) => e.key === "Enter" && generate()}
            placeholder="A cyberpunk samurai meditating on a neon rooftop, cinematic…"
            className="input-cyber flex-1"
          />
          <button data-testid="image-generate" disabled={loading} onClick={generate} className="neon-btn primary">
            {loading ? "…" : "Generate"}
          </button>
        </div>
      </div>

      <div className="overflow-y-auto p-4">
        <div className="mono-label mb-3">// History ({history.length})</div>
        <div className="grid grid-cols-2 gap-2">
          {history.map((h) => (
            <button key={h.id} onClick={() => setSelected(h)} className="aspect-square rounded-lg overflow-hidden hover:ring-1 hover:ring-[#00F0FF] transition">
              <img src={`data:image/png;base64,${h.image_b64}`} alt="" className="w-full h-full object-cover" />
            </button>
          ))}
          {history.length === 0 && <div className="col-span-2 text-xs text-slate-500 text-center py-6">No generations yet</div>}
        </div>
      </div>
    </div>
  );
}
