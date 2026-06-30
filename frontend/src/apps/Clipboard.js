import React, { useEffect, useState, useCallback, useRef } from "react";
import { crud } from "../lib/api";
import { toast } from "sonner";

const c = crud("clipboard");
const POLL_MS = 5000;

export default function Clipboard() {
  const [items, setItems] = useState([]);
  const [input, setInput] = useState("");
  const [label, setLabel] = useState("");
  const [loading, setLoading] = useState(true);
  const mountedRef = useRef(true);

  const load = useCallback(async () => {
    try {
      const list = await c.list();
      if (mountedRef.current) setItems(list);
    } catch {
      /* silent — polling tolerates transient failures */
    } finally {
      if (mountedRef.current) setLoading(false);
    }
  }, []);

  useEffect(() => {
    mountedRef.current = true;
    load();
    const t = setInterval(load, POLL_MS);
    return () => {
      mountedRef.current = false;
      clearInterval(t);
    };
  }, [load]);

  const push = async () => {
    const trimmed = input.trim();
    if (!trimmed) return;
    try {
      const created = await c.create({ content: trimmed, label: label.trim() });
      setItems((prev) => [created, ...prev]);
      setInput("");
      setLabel("");
      toast.success("Saved to universal clipboard");
    } catch (e) {
      toast.error(e?.response?.data?.detail || "Failed to save");
    }
  };

  const pasteFromBrowser = async () => {
    try {
      const text = await navigator.clipboard.readText();
      if (text) setInput(text);
    } catch {
      toast.error("Browser blocked clipboard read. Paste manually.");
    }
  };

  const copyItem = async (item) => {
    try {
      await navigator.clipboard.writeText(item.content);
      toast.success("Copied to this device");
    } catch {
      toast.error("Clipboard write blocked. Long-press to copy on mobile.");
    }
  };

  const del = async (id) => {
    try {
      await c.remove(id);
      setItems((prev) => prev.filter((x) => x.id !== id));
    } catch {
      toast.error("Delete failed");
    }
  };

  const fmtAge = (iso) => {
    const s = Math.floor((Date.now() - new Date(iso).getTime()) / 1000);
    if (s < 60) return `${s}s ago`;
    if (s < 3600) return `${Math.floor(s / 60)}m ago`;
    if (s < 86400) return `${Math.floor(s / 3600)}h ago`;
    return `${Math.floor(s / 86400)}d ago`;
  };

  return (
    <div className="flex flex-col h-full text-white" data-testid="clipboard-app">
      <div className="p-4 border-b border-white/10">
        <div className="mono-label">// Universal Clipboard</div>
        <h2 className="font-heading text-xl font-bold">Copy here, paste anywhere</h2>
        <p className="text-xs text-slate-500 mt-1 font-mono">
          Synced across every device signed into your account · refreshes every {POLL_MS / 1000}s
        </p>
      </div>

      <div className="p-4 border-b border-white/10 space-y-2">
        <input
          data-testid="clipboard-label"
          value={label}
          onChange={(e) => setLabel(e.target.value)}
          placeholder="Optional label (e.g. 'wifi password')"
          className="input-cyber"
          maxLength={120}
        />
        <textarea
          data-testid="clipboard-input"
          value={input}
          onChange={(e) => setInput(e.target.value)}
          onKeyDown={(e) => { if (e.key === "Enter" && (e.metaKey || e.ctrlKey)) { e.preventDefault(); push(); } }}
          placeholder="Paste or type anything… (Cmd/Ctrl+Enter to save)"
          className="input-cyber min-h-20 resize-y font-mono text-sm"
          maxLength={20000}
        />
        <div className="flex gap-2">
          <button data-testid="clipboard-paste" onClick={pasteFromBrowser} className="neon-btn !py-1.5 text-xs">
            <i className="fa-solid fa-paste mr-1"></i>From device clipboard
          </button>
          <button data-testid="clipboard-save" onClick={push} disabled={!input.trim()} className="neon-btn primary !py-1.5 text-xs ml-auto">
            <i className="fa-solid fa-cloud-arrow-up mr-1"></i>Save to cloud
          </button>
        </div>
      </div>

      <div className="flex-1 overflow-y-auto p-3">
        {loading && items.length === 0 && (
          <div className="text-center text-slate-500 text-sm py-8 font-mono">// LOADING…</div>
        )}
        {!loading && items.length === 0 && (
          <div className="text-center text-slate-500 pt-10">
            <i className="fa-solid fa-clipboard text-4xl opacity-30"></i>
            <div className="mt-3 text-sm">No saved snippets yet.</div>
            <div className="text-xs mt-1 font-mono opacity-60">Paste something above to start.</div>
          </div>
        )}
        <div className="space-y-2">
          {items.map((it) => (
            <div key={it.id} data-testid={`clipboard-item-${it.id}`} className="glass-light rounded-lg p-3 group">
              <div className="flex items-center justify-between mb-1.5">
                <div className="flex items-center gap-2 min-w-0">
                  {it.label && (
                    <span className="px-1.5 py-0.5 rounded text-[10px] font-mono bg-[#00F0FF]/15 text-[#00F0FF] truncate max-w-40">
                      {it.label}
                    </span>
                  )}
                  <span className="text-[10px] text-slate-500 font-mono">{fmtAge(it.created_at)}</span>
                </div>
                <div className="flex gap-1 opacity-0 group-hover:opacity-100 transition">
                  <button onClick={() => copyItem(it)} title="Copy to this device" className="w-7 h-7 rounded hover:bg-white/10 text-[#00F0FF]">
                    <i className="fa-solid fa-copy text-xs"></i>
                  </button>
                  <button onClick={() => del(it.id)} title="Delete" className="w-7 h-7 rounded hover:bg-white/10 text-slate-500 hover:text-[#FF003C]">
                    <i className="fa-solid fa-trash text-xs"></i>
                  </button>
                </div>
              </div>
              <button
                onClick={() => copyItem(it)}
                className="w-full text-left text-sm font-mono whitespace-pre-wrap break-words text-slate-200 hover:text-white"
                style={{ display: "-webkit-box", WebkitLineClamp: 4, WebkitBoxOrient: "vertical", overflow: "hidden" }}
              >
                {it.content}
              </button>
            </div>
          ))}
        </div>
      </div>
    </div>
  );
}
