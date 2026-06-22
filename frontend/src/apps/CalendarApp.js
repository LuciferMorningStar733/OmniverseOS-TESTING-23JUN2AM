import React, { useEffect, useState } from "react";
import { crud } from "../lib/api";
import { toast } from "sonner";

const c = crud("events");

export default function CalendarApp() {
  const [events, setEvents] = useState([]);
  const [month, setMonth] = useState(new Date());
  const [showAdd, setShowAdd] = useState(false);
  const [form, setForm] = useState({ title: "", date: "", time: "09:00", color: "#00F0FF", description: "" });

  const load = () => c.list().then(setEvents);
  useEffect(() => { load(); }, []);

  const y = month.getFullYear(); const m = month.getMonth();
  const first = new Date(y, m, 1).getDay();
  const days = new Date(y, m + 1, 0).getDate();
  const cells = Array.from({ length: 42 }, (_, i) => {
    const dnum = i - first + 1;
    if (dnum < 1 || dnum > days) return null;
    return new Date(y, m, dnum);
  });

  const onCellClick = (d) => {
    if (!d) return;
    setForm({ ...form, date: d.toISOString().slice(0, 10) });
    setShowAdd(true);
  };

  const addEvent = async () => {
    if (!form.title || !form.date) return;
    await c.create(form);
    setShowAdd(false);
    setForm({ title: "", date: "", time: "09:00", color: "#00F0FF", description: "" });
    load();
    toast.success("Event added");
  };

  const del = async (id) => { await c.remove(id); load(); };

  return (
    <div className="flex flex-col h-full text-white p-5" data-testid="calendar-app">
      <div className="flex items-center justify-between mb-4">
        <div>
          <div className="mono-label">// Schedule</div>
          <h2 className="font-heading text-2xl font-bold">{month.toLocaleString("default", { month: "long", year: "numeric" })}</h2>
        </div>
        <div className="flex gap-2">
          <button onClick={() => setMonth(new Date(y, m - 1))} className="neon-btn !py-1 !px-3"><i className="fa-solid fa-chevron-left"></i></button>
          <button onClick={() => setMonth(new Date())} className="neon-btn !py-1 !px-3">Today</button>
          <button onClick={() => setMonth(new Date(y, m + 1))} className="neon-btn !py-1 !px-3"><i className="fa-solid fa-chevron-right"></i></button>
        </div>
      </div>

      <div className="grid grid-cols-7 gap-1 text-xs font-mono uppercase tracking-widest text-slate-500 mb-2">
        {["Sun", "Mon", "Tue", "Wed", "Thu", "Fri", "Sat"].map((d) => <div key={d} className="text-center">{d}</div>)}
      </div>

      <div className="grid grid-cols-7 gap-1 flex-1">
        {cells.map((d, i) => {
          const dStr = d?.toISOString().slice(0, 10);
          const evs = d ? events.filter((e) => e.date === dStr) : [];
          const isToday = d && d.toDateString() === new Date().toDateString();
          return (
            <button key={i} onClick={() => onCellClick(d)} disabled={!d} className={`glass-light rounded-lg p-2 text-left transition hover:border-[#00F0FF]/40 ${isToday ? "border-[#00F0FF] ring-1 ring-[#00F0FF]/50" : ""}`} style={{ visibility: d ? "visible" : "hidden" }}>
              <div className="text-xs font-mono mb-1">{d?.getDate()}</div>
              <div className="space-y-0.5">
                {evs.slice(0, 2).map((e) => (
                  <div key={e.id} onClick={(ev) => { ev.stopPropagation(); del(e.id); }} className="text-[10px] px-1 rounded truncate cursor-pointer" style={{ background: `${e.color}22`, color: e.color }}>{e.time} {e.title}</div>
                ))}
                {evs.length > 2 && <div className="text-[10px] text-slate-500">+{evs.length - 2}</div>}
              </div>
            </button>
          );
        })}
      </div>

      {showAdd && (
        <div className="absolute inset-0 bg-black/60 backdrop-blur-sm flex items-center justify-center z-10" onClick={() => setShowAdd(false)}>
          <div className="glass rounded-2xl p-6 w-96" onClick={(e) => e.stopPropagation()}>
            <div className="mono-label mb-3">// New Event • {form.date}</div>
            <input value={form.title} onChange={(e) => setForm({ ...form, title: e.target.value })} placeholder="Event title" className="input-cyber mb-2" />
            <input type="time" value={form.time} onChange={(e) => setForm({ ...form, time: e.target.value })} className="input-cyber mb-3" />
            <div className="flex gap-2 mb-3">
              {["#00F0FF", "#FF003C", "#FCEE09", "#39FF14"].map((c) => <button key={c} onClick={() => setForm({ ...form, color: c })} className="w-7 h-7 rounded-full" style={{ background: c, outline: form.color === c ? "2px solid white" : "" }} />)}
            </div>
            <div className="flex gap-2">
              <button onClick={() => setShowAdd(false)} className="neon-btn flex-1">Cancel</button>
              <button onClick={addEvent} className="neon-btn primary flex-1">Create</button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
