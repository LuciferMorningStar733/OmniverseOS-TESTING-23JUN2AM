import React, { useEffect, useState, useCallback } from "react";
import { crud } from "../lib/api";

const c = crud("notes");
const colors = ["#00F0FF", "#FF003C", "#FCEE09", "#39FF14"];

export default function Notes() {
  const [notes, setNotes] = useState([]);
  const [sel, setSel] = useState(null);

  const load = useCallback(() => c.list().then((n) => { setNotes(n); setSel((s) => s || n[0] || null); }), []);
  useEffect(() => { load(); }, [load]);

  const add = async () => {
    const n = await c.create({ title: "Untitled", content: "", color: colors[notes.length % 4] });
    setNotes((p) => [n, ...p]); setSel(n);
  };

  const save = async (patch) => {
    if (!sel) return;
    const updated = { ...sel, ...patch };
    setSel(updated);
    setNotes((ns) => ns.map((x) => x.id === sel.id ? updated : x));
    await c.update(sel.id, { title: updated.title, content: updated.content, color: updated.color });
  };

  const del = async (id) => {
    await c.remove(id);
    const next = notes.filter((n) => n.id !== id);
    setNotes(next);
    if (sel?.id === id) setSel(next[0] || null);
  };

  return (
    <div className="flex h-full text-white" data-testid="notes-app">
      <div className="w-64 border-r border-white/10 flex flex-col">
        <div className="p-3 border-b border-white/10 flex items-center justify-between">
          <div className="mono-label">// Notes</div>
          <button data-testid="notes-new" onClick={add} className="neon-btn !py-1 !px-2 text-xs"><i className="fa-solid fa-plus"></i></button>
        </div>
        <div className="flex-1 overflow-y-auto">
          {notes.map((n) => (
            <button key={n.id} onClick={() => setSel(n)} className={`w-full text-left px-3 py-2.5 border-l-2 transition ${sel?.id === n.id ? "bg-white/5" : "hover:bg-white/[0.03]"}`} style={{ borderColor: sel?.id === n.id ? n.color : "transparent" }}>
              <div className="text-sm font-medium truncate">{n.title || "Untitled"}</div>
              <div className="text-xs text-slate-500 truncate">{n.content?.slice(0, 40) || "—"}</div>
            </button>
          ))}
        </div>
      </div>
      <div className="flex-1 flex flex-col">
        {sel ? (
          <>
            <div className="p-4 border-b border-white/10 flex items-center gap-3">
              <input value={sel.title} onChange={(e) => save({ title: e.target.value })} className="bg-transparent outline-none font-heading text-xl font-bold flex-1" placeholder="Title" />
              <div className="flex gap-1">
                {colors.map((col) => (
                  <button key={col} onClick={() => save({ color: col })} className="w-5 h-5 rounded-full" style={{ background: col, outline: sel.color === col ? "2px solid white" : "" }} />
                ))}
              </div>
              <button onClick={() => del(sel.id)} className="text-slate-500 hover:text-[#FF003C]"><i className="fa-solid fa-trash"></i></button>
            </div>
            <textarea data-testid="note-content" value={sel.content} onChange={(e) => save({ content: e.target.value })} className="flex-1 bg-transparent outline-none p-5 resize-none text-sm leading-relaxed font-body" placeholder="Start writing…" />
          </>
        ) : (
          <div className="flex-1 flex items-center justify-center text-slate-500"><div className="text-center"><i className="fa-solid fa-note-sticky text-4xl opacity-30"></i><div className="mt-3 text-sm">No note selected</div></div></div>
        )}
      </div>
    </div>
  );
}
