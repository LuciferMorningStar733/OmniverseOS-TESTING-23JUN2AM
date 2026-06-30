import React, { useEffect, useState } from "react";
import { crud } from "../lib/api";
import { toast } from "sonner";

const c = crud("events");

export default function CalendarApp() {
  const [events,  setEvents]  = useState([]);
  const [month,   setMonth]   = useState(new Date());
  const [showAdd, setShowAdd] = useState(false);
  const [form,    setForm]    = useState({ title: "", date: "", time: "09:00", color: "#00F0FF", description: "" });

  const load = () => c.list().then(setEvents);
  useEffect(() => { load(); }, []);

  const y     = month.getFullYear();
  const m     = month.getMonth();
  const first = new Date(y, m, 1).getDay();
  const days  = new Date(y, m + 1, 0).getDate();
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
    <div className="flex flex-col h-full text-white p-3 sm:p-5 relative" data-testid="calendar-app">
      {/* Header */}
      <div className="flex flex-wrap items-center justify-between gap-2 mb-3">
        <div>
          <div className="mono-label">// Schedule</div>
          <h2 className="font-heading text-lg sm:text-2xl font-bold">
            {month.toLocaleString("default", { month: "long", year: "numeric" })}
          </h2>
        </div>
        <div className="flex gap-1.5">
          <button onClick={() => setMonth(new Date(y, m - 1))} className="neon-btn !py-1 !px-2.5">
            <i className="fa-solid fa-chevron-left text-xs"></i>
          </button>
          <button onClick={() => setMonth(new Date())} className="neon-btn !py-1 !px-2.5 text-xs">Today</button>
          <button onClick={() => setMonth(new Date(y, m + 1))} className="neon-btn !py-1 !px-2.5">
            <i className="fa-solid fa-chevron-right text-xs"></i>
          </button>
        </div>
      </div>

      {/* Day headers */}
      <div className="grid grid-cols-7 gap-0.5 text-[10px] sm:text-xs font-mono uppercase tracking-widest text-slate-500 mb-1">
        {["Sun", "Mon", "Tue", "Wed", "Thu", "Fri", "Sat"].map((d) => (
          <div key={d} className="text-center py-1">{d.slice(0, 1)}<span className="hidden sm:inline">{d.slice(1)}</span></div>
        ))}
      </div>

      {/* Calendar grid */}
      <div className="grid grid-cols-7 gap-0.5 flex-1">
        {cells.map((d, i) => {
          const dStr  = d?.toISOString().slice(0, 10);
          const evs   = d ? events.filter((e) => e.date === dStr) : [];
          const isToday = d && d.toDateString() === new Date().toDateString();
          return (
            <button
              key={i}
              onClick={() => onCellClick(d)}
              disabled={!d}
              className={`glass-light rounded p-1 sm:p-2 text-left transition hover:border-[#00F0FF]/40
                ${isToday ? "border border-[#00F0FF] ring-1 ring-[#00F0FF]/50" : "border border-transparent"}`}
              style={{ visibility: d ? "visible" : "hidden" }}
            >
              <div className="text-[10px] sm:text-xs font-mono mb-0.5">{d?.getDate()}</div>
              <div className="space-y-0.5 hidden sm:block">
                {evs.slice(0, 2).map((e) => (
                  <div
                    key={e.id}
                    onClick={(ev) => { ev.stopPropagation(); del(e.id); }}
                    className="text-[9px] px-1 rounded truncate cursor-pointer"
                    style={{ background: `${e.color}22`, color: e.color }}
                  >
                    {e.time} {e.title}
                  </div>
                ))}
                {evs.length > 2 && <div className="text-[9px] text-slate-500">+{evs.length - 2}</div>}
              </div>
              {/* Mobile: just show dot if has events */}
              {evs.length > 0 && (
                <div className="sm:hidden flex gap-0.5 mt-0.5 flex-wrap">
                  {evs.slice(0, 2).map((e) => (
                    <span key={e.id} className="w-1 h-1 rounded-full block" style={{ background: e.color }} />
                  ))}
                </div>
              )}
            </button>
          );
        })}
      </div>

      {/* Add event modal */}
      {showAdd && (
        <div
          className="absolute inset-0 bg-black/60 backdrop-blur-sm flex items-center justify-center z-10 p-4"
          onClick={() => setShowAdd(false)}
        >
          <div className="glass rounded-2xl p-5 w-full max-w-sm" onClick={(e) => e.stopPropagation()}>
            <div className="mono-label mb-3">// New Event • {form.date}</div>
            <input
              value={form.title}
              onChange={(e) => setForm({ ...form, title: e.target.value })}
              placeholder="Event title"
              className="input-cyber mb-2"
            />
            <input
              type="time"
              value={form.time}
              onChange={(e) => setForm({ ...form, time: e.target.value })}
              className="input-cyber mb-3"
            />
            <div className="flex gap-2 mb-3">
              {["#00F0FF", "#FF003C", "#FCEE09", "#39FF14"].map((col) => (
                <button
                  key={col}
                  onClick={() => setForm({ ...form, color: col })}
                  className="w-8 h-8 rounded-full flex-shrink-0"
                  style={{ background: col, outline: form.color === col ? "2px solid white" : "" }}
                />
              ))}
            </div>
            <div className="flex gap-2">
              <button onClick={() => setShowAdd(false)} className="neon-btn flex-1 justify-center">Cancel</button>
              <button onClick={addEvent} className="neon-btn primary flex-1 justify-center">Create</button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
