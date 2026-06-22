import React, { useEffect, useState } from "react";
import { crud } from "../lib/api";
import { toast } from "sonner";

const c = crud("memories");

export default function Memory() {
  const [items, setItems] = useState([]);
  const [text, setText] = useState("");
  const [tag, setTag] = useState("personal");

  const load = () => c.list().then(setItems);
  useEffect(() => { load(); }, []);

  const add = async () => {
    if (!text.trim()) return;
    await c.create({ content: text, tag });
    setText("");
    load();
    toast.success("Memory stored");
  };

  const del = async (id) => { await c.remove(id); load(); };

  const tags = ["personal", "work", "ideas", "facts", "preferences"];

  return (
    <div className="flex h-full text-white" data-testid="memory-app">
      <div className="w-64 border-r border-white/10 p-4">
        <div className="mono-label">// Memory Bank</div>
        <h2 className="font-heading text-xl font-bold mb-4">Knowledge</h2>
        <div className="space-y-1">
          {tags.map((t) => (
            <button key={t} onClick={() => setTag(t)} className={`w-full text-left px-3 py-2 rounded-lg text-sm transition ${tag === t ? "bg-[#00F0FF]/15 text-[#00F0FF]" : "hover:bg-white/5 text-slate-300"}`}>
              <i className="fa-solid fa-tag mr-2 text-xs"></i>{t}
            </button>
          ))}
        </div>
      </div>

      <div className="flex-1 flex flex-col">
        <div className="p-4 border-b border-white/10 flex gap-2">
          <input data-testid="memory-input" value={text} onChange={(e) => setText(e.target.value)} placeholder={`Add a memory for #${tag}…`} className="input-cyber flex-1" onKeyDown={(e) => e.key === "Enter" && add()} />
          <button data-testid="memory-add" onClick={add} className="neon-btn primary">Store</button>
        </div>
        <div className="flex-1 overflow-y-auto p-4 space-y-2">
          {items.filter((i) => i.tag === tag).map((m) => (
            <div key={m.id} className="glass-light rounded-lg p-3 flex justify-between items-start group">
              <div>
                <div className="text-sm">{m.content}</div>
                <div className="mono-label opacity-50 mt-1">{new Date(m.created_at).toLocaleDateString()}</div>
              </div>
              <button onClick={() => del(m.id)} className="text-slate-600 opacity-0 group-hover:opacity-100 hover:text-[#FF003C] transition">
                <i className="fa-solid fa-trash"></i>
              </button>
            </div>
          ))}
          {items.filter(i => i.tag === tag).length === 0 && <div className="text-center text-slate-500 text-sm pt-8">No memories in #{tag}</div>}
        </div>
      </div>
    </div>
  );
}
