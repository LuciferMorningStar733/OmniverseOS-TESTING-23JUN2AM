import React, { useEffect, useState } from "react";
import { crud } from "../lib/api";

const c = crud("tasks");
const cols = [
  { id: "todo", name: "Todo", color: "#94A3B8" },
  { id: "doing", name: "In Progress", color: "#FCEE09" },
  { id: "done", name: "Done", color: "#39FF14" },
];

export default function Tasks() {
  const [tasks, setTasks] = useState([]);
  const [newTitle, setNewTitle] = useState("");

  const load = () => c.list().then(setTasks);
  useEffect(() => { load(); }, []);

  const add = async () => {
    if (!newTitle.trim()) return;
    await c.create({ title: newTitle, status: "todo", priority: "medium", description: "" });
    setNewTitle("");
    load();
  };

  const move = async (t, status) => {
    await c.update(t.id, { ...t, status });
    load();
  };

  const del = async (id) => { await c.remove(id); load(); };

  return (
    <div className="flex flex-col h-full text-white p-5" data-testid="tasks-app">
      <div className="flex items-center justify-between mb-4">
        <div>
          <div className="mono-label">// Workflow</div>
          <h2 className="font-heading text-2xl font-bold">Tasks Board</h2>
        </div>
        <div className="flex gap-2">
          <input data-testid="task-input" value={newTitle} onChange={(e) => setNewTitle(e.target.value)} placeholder="New task…" className="input-cyber !w-64" onKeyDown={(e) => e.key === "Enter" && add()} />
          <button data-testid="task-add" onClick={add} className="neon-btn primary">Add</button>
        </div>
      </div>

      <div className="grid grid-cols-3 gap-4 flex-1 overflow-hidden">
        {cols.map((col) => (
          <div key={col.id} className="glass-light rounded-xl flex flex-col overflow-hidden">
            <div className="px-4 py-3 border-b border-white/10 flex items-center justify-between">
              <div className="flex items-center gap-2">
                <span className="w-1.5 h-1.5 rounded-full" style={{ background: col.color }} />
                <span className="font-mono text-xs uppercase tracking-widest">{col.name}</span>
              </div>
              <span className="text-xs text-slate-500">{tasks.filter(t => t.status === col.id).length}</span>
            </div>
            <div className="flex-1 overflow-y-auto p-3 space-y-2">
              {tasks.filter((t) => t.status === col.id).map((t) => (
                <div key={t.id} data-testid={`task-card-${t.id}`} className="bg-white/[0.03] border border-white/5 rounded-lg p-3 hover:border-[#00F0FF]/30 transition group">
                  <div className="flex items-start justify-between">
                    <div className="text-sm flex-1">{t.title}</div>
                    <button onClick={() => del(t.id)} className="text-slate-600 opacity-0 group-hover:opacity-100 hover:text-[#FF003C]"><i className="fa-solid fa-xmark text-xs"></i></button>
                  </div>
                  <div className="flex gap-1 mt-2">
                    {cols.filter((c) => c.id !== col.id).map((c) => (
                      <button key={c.id} onClick={() => move(t, c.id)} className="text-[10px] font-mono uppercase px-1.5 py-0.5 rounded hover:bg-white/10 text-slate-400">
                        → {c.name}
                      </button>
                    ))}
                  </div>
                </div>
              ))}
            </div>
          </div>
        ))}
      </div>
    </div>
  );
}
