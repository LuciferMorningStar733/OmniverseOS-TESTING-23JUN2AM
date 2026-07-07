import React, { useEffect, useState, useCallback } from "react";
import { motion, AnimatePresence } from "framer-motion";
import { crud } from "../lib/api";
import { toast } from "sonner";

const c = crud("events");
const EVENT_COLORS = ["#00F0FF","#FF003C","#FCEE09","#39FF14","#C778DD","#FF6B35","#F472B6"];
const VIEWS = [
  { id:"month",  label:"Month",  icon:"fa-calendar" },
  { id:"week",   label:"Week",   icon:"fa-calendar-week" },
  { id:"agenda", label:"Agenda", icon:"fa-list" },
];

function glassStyle(border="rgba(255,255,255,0.06)") {
  return { background:"rgba(6,8,16,0.55)", border:`1px solid ${border}`, backdropFilter:"blur(20px)", WebkitBackdropFilter:"blur(20px)" };
}

/* ── Event chip ───────────────────────────────────────────────────────── */
function EventChip({ event, onDelete, compact=false }) {
  return (
    <motion.div
      layout
      initial={{ opacity:0, scale:0.9 }} animate={{ opacity:1, scale:1 }}
      className={`group flex items-center gap-1.5 rounded-lg cursor-pointer overflow-hidden ${compact?"px-1 py-0.5":"px-2 py-1"}`}
      style={{ background:`${event.color}18`, border:`1px solid ${event.color}30` }}
      onClick={e=>{ e.stopPropagation(); onDelete(event.id); }}
      title={`${event.time} ${event.title} — click to delete`}
    >
      <div className="w-1.5 h-1.5 rounded-full flex-shrink-0" style={{ background:event.color }}/>
      {!compact && <span className="text-[9px] font-mono truncate" style={{ color:event.color }}>{event.time}</span>}
      <span className={`${compact?"text-[8px]":"text-[10px]"} font-medium truncate text-slate-200`}>{event.title}</span>
    </motion.div>
  );
}

/* ── Countdown badge ─────────────────────────────────────────────────── */
function CountdownBadge({ date }) {
  const diff = Math.ceil((new Date(date) - new Date()) / 86400000);
  if (isNaN(diff) || diff < 0) return null;
  const color = diff===0?"#39FF14":diff<=3?"#FCEE09":"#00F0FF";
  return (
    <span className="font-mono text-[9px] px-1.5 py-0.5 rounded-md" style={{ background:`${color}14`, color, border:`1px solid ${color}25` }}>
      {diff===0?"Today":diff===1?"Tomorrow":`${diff}d`}
    </span>
  );
}

/* ── Month grid ─────────────────────────────────────────────────────── */
function MonthView({ events, month, onDayClick }) {
  const y=month.getFullYear(), m=month.getMonth();
  const first=new Date(y,m,1).getDay(), days=new Date(y,m+1,0).getDate();
  const cells = Array.from({ length:42 }, (_,i)=>{ const d=i-first+1; return (d<1||d>days)?null:new Date(y,m,d); });
  const today = new Date(); today.setHours(0,0,0,0);

  return (
    <div className="flex-1 overflow-hidden flex flex-col">
      <div className="grid grid-cols-7 text-[10px] font-mono uppercase tracking-widest text-slate-500 mb-1 px-1">
        {["Sun","Mon","Tue","Wed","Thu","Fri","Sat"].map(d=>(
          <div key={d} className="text-center py-1.5">{d.slice(0,1)}<span className="hidden sm:inline">{d.slice(1)}</span></div>
        ))}
      </div>
      <div className="grid grid-cols-7 gap-1 flex-1 px-1 pb-1">
        {cells.map((d,i)=>{
          const dStr=d?.toISOString().slice(0,10);
          const evs=d?events.filter(e=>e.date===dStr):[];
          const isToday=d&&d.getTime()===today.getTime();
          const isPast=d&&d<today;
          return (
            <motion.button key={i} onClick={()=>d&&onDayClick(d)} disabled={!d}
              whileHover={d?{scale:1.02}:{}}
              className="relative rounded-xl p-1.5 sm:p-2 text-left transition-all"
              style={{
                visibility:d?"visible":"hidden",
                background:isToday?"rgba(0,240,255,0.08)":"rgba(255,255,255,0.02)",
                border:isToday?"1px solid rgba(0,240,255,0.35)":"1px solid rgba(255,255,255,0.04)",
                opacity:isPast?0.5:1,
                minHeight:56,
              }}>
              <div className={`text-[10px] sm:text-xs font-mono mb-1 ${isToday?"text-[#00F0FF] font-bold":"text-slate-400"}`}>
                {d?.getDate()}
              </div>
              <div className="space-y-0.5 hidden sm:block">
                {evs.slice(0,2).map(e=><EventChip key={e.id} event={e} onDelete={()=>{}} compact/>)}
                {evs.length>2 && <div className="text-[8px] font-mono text-slate-600 pl-1">+{evs.length-2}</div>}
              </div>
              {evs.length>0 && (
                <div className="sm:hidden flex gap-0.5 flex-wrap mt-0.5">
                  {evs.slice(0,3).map(e=><span key={e.id} className="w-1.5 h-1.5 rounded-full" style={{ background:e.color }}/>)}
                </div>
              )}
            </motion.button>
          );
        })}
      </div>
    </div>
  );
}

/* ── Week view ─────────────────────────────────────────────────────── */
function WeekView({ events, anchor }) {
  const mon = new Date(anchor);
  mon.setDate(anchor.getDate() - (anchor.getDay()||7) + 1);
  const days = Array.from({ length:7 }, (_,i)=>{ const d=new Date(mon); d.setDate(mon.getDate()+i); return d; });
  const today = new Date(); today.setHours(0,0,0,0);

  return (
    <div className="flex-1 overflow-y-auto overflow-x-auto px-1 pb-1" style={{ WebkitOverflowScrolling: "touch" }}>
      <div className="grid grid-cols-7 gap-1" style={{ minWidth: "calc(7 * 44px)" }}>
        {days.map((d,i)=>{
          const dStr=d.toISOString().slice(0,10);
          const evs=events.filter(e=>e.date===dStr);
          const isToday=d.getTime()===today.getTime();
          return (
            <div key={i} className="rounded-xl overflow-hidden" style={{ border:isToday?"1px solid rgba(0,240,255,0.3)":"1px solid rgba(255,255,255,0.04)", minHeight:120 }}>
              <div className={`px-2 py-1.5 text-center text-[10px] font-mono ${isToday?"bg-[rgba(0,240,255,0.1)] text-[#00F0FF] font-bold":"text-slate-500"}`}
                style={{ borderBottom:"1px solid rgba(255,255,255,0.04)" }}>
                <div>{["M","T","W","T","F","S","S"][i]}</div>
                <div className="text-sm font-bold">{d.getDate()}</div>
              </div>
              <div className="p-1 space-y-0.5">
                {evs.map(e=><EventChip key={e.id} event={e} onDelete={()=>{}}/>)}
              </div>
            </div>
          );
        })}
      </div>
    </div>
  );
}

/* ── Agenda view ─────────────────────────────────────────────────────── */
function AgendaView({ events }) {
  const now = new Date();
  const upcoming = [...events]
    .filter(e=>new Date(e.date)>=now)
    .sort((a,b)=>new Date(a.date)-new Date(b.date))
    .slice(0,20);

  if (!upcoming.length) return (
    <div className="flex-1 flex flex-col items-center justify-center gap-3 text-slate-500">
      <i className="fa-solid fa-calendar-xmark text-2xl opacity-30"/>
      <div className="text-sm">No upcoming events</div>
      <div className="text-xs text-slate-600">Click any day to add an event</div>
    </div>
  );

  return (
    <div className="flex-1 overflow-y-auto px-1 pb-1 space-y-2">
      {upcoming.map((e,i)=>{
        const d=new Date(e.date);
        return (
          <motion.div key={e.id} initial={{opacity:0,x:-8}} animate={{opacity:1,x:0}} transition={{delay:i*0.04}}
            className="flex gap-3 items-start p-3 rounded-xl"
            style={{ background:"rgba(255,255,255,0.025)", border:`1px solid ${e.color}20` }}>
            <div className="flex-shrink-0 text-center w-12">
              <div className="font-mono text-[9px] uppercase text-slate-500">{d.toLocaleDateString("en",{month:"short"})}</div>
              <div className="font-heading text-2xl font-black leading-none" style={{ color:e.color }}>{d.getDate()}</div>
              <div className="font-mono text-[9px] text-slate-600">{d.toLocaleDateString("en",{weekday:"short"})}</div>
            </div>
            <div className="flex-1 min-w-0">
              <div className="flex items-center gap-2 mb-0.5">
                <span className="text-sm font-semibold text-white">{e.title}</span>
                <CountdownBadge date={e.date}/>
              </div>
              <div className="flex items-center gap-1.5 text-[10px] font-mono text-slate-500">
                <i className="fa-solid fa-clock text-[8px]"/>
                {e.time}
              </div>
              {e.description && <p className="text-xs text-slate-400 mt-1 leading-relaxed">{e.description}</p>}
            </div>
            <div className="flex-shrink-0 w-2 h-full">
              <div className="w-1 h-full rounded-full" style={{ background:e.color, minHeight:32 }}/>
            </div>
          </motion.div>
        );
      })}
    </div>
  );
}

/* ── Add Event Modal ─────────────────────────────────────────────────── */
function AddEventModal({ date, onSave, onClose }) {
  const [form, setForm] = useState({ title:"", time:"09:00", color:"#00F0FF", description:"" });
  return (
    <motion.div className="fixed inset-0 z-50 flex items-center justify-center p-4"
      style={{ background:"rgba(0,0,0,0.7)", backdropFilter:"blur(8px)" }}
      initial={{opacity:0}} animate={{opacity:1}} exit={{opacity:0}} onClick={onClose}>
      <motion.div initial={{opacity:0,scale:0.88,y:16}} animate={{opacity:1,scale:1,y:0}} exit={{opacity:0,scale:0.88}}
        transition={{type:"spring",stiffness:380,damping:28}}
        className="w-full max-w-sm rounded-2xl overflow-hidden"
        style={glassStyle("rgba(0,240,255,0.2)")}
        onClick={e=>e.stopPropagation()}>
        <div className="px-5 py-4" style={{ borderBottom:"1px solid rgba(255,255,255,0.07)" }}>
          <div className="mono-label text-[9px] mb-0.5">// New Event</div>
          <h3 className="font-heading text-lg font-bold">{date?.toLocaleDateString(undefined,{weekday:"long",month:"long",day:"numeric"})}</h3>
        </div>
        <div className="p-5 space-y-3">
          <input value={form.title} onChange={e=>setForm({...form,title:e.target.value})}
            placeholder="Event title" className="input-cyber" autoFocus
            onKeyDown={e=>e.key==="Enter"&&form.title&&onSave({...form,date:date?.toISOString().slice(0,10)})}/>
          <input type="time" value={form.time} onChange={e=>setForm({...form,time:e.target.value})} className="input-cyber"/>
          <textarea value={form.description} onChange={e=>setForm({...form,description:e.target.value})}
            placeholder="Description (optional)" className="input-cyber resize-none h-16" style={{ lineHeight:1.5 }}/>
          <div>
            <div className="text-[10px] font-mono text-slate-500 uppercase tracking-widest mb-2">Color</div>
            <div className="flex gap-2 flex-wrap">
              {EVENT_COLORS.map(col=>(
                <button key={col} onClick={()=>setForm({...form,color:col})}
                  className="w-7 h-7 rounded-full transition-transform"
                  style={{ background:col, transform:form.color===col?"scale(1.2)":"scale(1)", outline:form.color===col?"2px solid white":"none", outlineOffset:2 }}/>
              ))}
            </div>
          </div>
        </div>
        <div className="flex gap-2 px-5 pb-5">
          <button onClick={onClose} className="neon-btn flex-1 justify-center">Cancel</button>
          <button onClick={()=>{ if(form.title) onSave({...form,date:date?.toISOString().slice(0,10)}); }}
            className="neon-btn primary flex-1 justify-center">
            <i className="fa-solid fa-plus text-[10px]"/> Create Event
          </button>
        </div>
      </motion.div>
    </motion.div>
  );
}

/* ── Main ────────────────────────────────────────────────────────────── */
export default function CalendarApp() {
  const [events,    setEvents]    = useState([]);
  const [month,     setMonth]     = useState(new Date());
  const [view,      setView]      = useState("month");
  const [showAdd,   setShowAdd]   = useState(false);
  const [addDate,   setAddDate]   = useState(null);

  const load = useCallback(()=>c.list().then(setEvents).catch(()=>{}),[]);
  useEffect(()=>{ load(); },[load]);

  const y=month.getFullYear(), m=month.getMonth();

  const handleDayClick = (d) => { setAddDate(d); setShowAdd(true); };

  const addEvent = async (form) => {
    if (!form.title) return;
    await c.create(form);
    setShowAdd(false);
    load();
    toast.success("Event created");
  };

  const del = async (id) => { await c.remove(id); load(); toast.success("Event removed"); };

  const upcoming = [...events].filter(e=>new Date(e.date)>=new Date()).sort((a,b)=>new Date(a.date)-new Date(b.date)).slice(0,3);

  return (
    <div className="flex flex-col h-full text-white" data-testid="calendar-app"
      style={{ background:"linear-gradient(135deg, rgba(251,146,60,0.02) 0%, transparent 60%)" }}>

      {/* Header */}
      <div className="flex-shrink-0 px-3 sm:px-5 pt-4 pb-3" style={{ borderBottom:"1px solid rgba(255,255,255,0.06)" }}>
        <div className="flex flex-wrap items-center gap-2 sm:gap-3">
          <div className="min-w-0 flex-1 basis-full sm:basis-auto">
            <div className="font-mono text-[9px] uppercase tracking-[0.18em] text-slate-500 mb-0.5">// Schedule</div>
            <div className="flex items-center gap-2 sm:gap-3 min-w-0">
              <button onClick={()=>setMonth(new Date(y,m-1))} className="neon-btn !py-1 !px-2 sm:!px-2.5 flex-shrink-0">
                <i className="fa-solid fa-chevron-left text-xs"/>
              </button>
              <h2 className="font-heading text-base sm:text-xl md:text-2xl font-black min-w-0 flex-1 truncate whitespace-nowrap text-center sm:text-left">
                {month.toLocaleString("default",{month:"long",year:"numeric"})}
              </h2>
              <button onClick={()=>setMonth(new Date(y,m+1))} className="neon-btn !py-1 !px-2 sm:!px-2.5 flex-shrink-0">
                <i className="fa-solid fa-chevron-right text-xs"/>
              </button>
            </div>
          </div>
          <div className="flex items-center gap-2 flex-shrink-0 w-full sm:w-auto justify-center sm:justify-end order-3 sm:order-none">
            <button onClick={()=>setMonth(new Date())} className="neon-btn !py-1 !px-2.5 text-xs">Today</button>
            <button onClick={()=>{ setAddDate(new Date()); setShowAdd(true); }} className="neon-btn primary !py-1.5 !px-3 text-xs">
              <i className="fa-solid fa-plus text-[10px]"/> Add
            </button>
          </div>
        </div>

        {/* View tabs */}
        <div className="flex gap-1 mt-3 overflow-x-auto" style={{ WebkitOverflowScrolling:"touch", scrollbarWidth:"none" }}>
          {VIEWS.map(v=>(
            <button key={v.id} onClick={()=>setView(v.id)}
              className="flex items-center gap-1.5 px-3 py-1.5 rounded-lg text-[11px] font-mono transition-all flex-shrink-0 whitespace-nowrap"
              style={{ background:view===v.id?"rgba(251,146,60,0.12)":"rgba(255,255,255,0.04)", border:view===v.id?"1px solid rgba(251,146,60,0.3)":"1px solid rgba(255,255,255,0.06)", color:view===v.id?"#FB923C":"rgba(255,255,255,0.45)", cursor:"pointer" }}>
              <i className={`fa-solid ${v.icon} text-[10px]`}/>{v.label}
            </button>
          ))}
        </div>
      </div>

      {/* Upcoming ribbon */}
      {upcoming.length>0 && (
        <div className="flex-shrink-0 px-4 sm:px-5 py-2 flex gap-2 overflow-x-auto" style={{ borderBottom:"1px solid rgba(255,255,255,0.04)" }}>
          {upcoming.map(e=>(
            <motion.div key={e.id} initial={{opacity:0,y:-4}} animate={{opacity:1,y:0}}
              className="flex items-center gap-2 px-3 py-1.5 rounded-xl flex-shrink-0"
              style={{ background:`${e.color}10`, border:`1px solid ${e.color}25` }}>
              <div className="w-1.5 h-1.5 rounded-full" style={{ background:e.color }}/>
              <span className="text-[10px] font-medium text-slate-200 whitespace-nowrap">{e.title}</span>
              <CountdownBadge date={e.date}/>
            </motion.div>
          ))}
        </div>
      )}

      {/* Calendar body */}
      <div className="flex-1 overflow-hidden flex flex-col p-2 sm:p-3">
        <AnimatePresence mode="wait">
          <motion.div key={view} initial={{opacity:0,y:6}} animate={{opacity:1,y:0}} exit={{opacity:0,y:-6}}
            transition={{duration:0.22}} className="flex flex-col flex-1 overflow-hidden">
            {view==="month"  && <MonthView  events={events} month={month}  onDayClick={handleDayClick}/>}
            {view==="week"   && <WeekView   events={events} anchor={month}/>}
            {view==="agenda" && <AgendaView events={events}/>}
          </motion.div>
        </AnimatePresence>
      </div>

      {/* Add modal */}
      <AnimatePresence>
        {showAdd && (
          <AddEventModal date={addDate} onSave={addEvent} onClose={()=>setShowAdd(false)}/>
        )}
      </AnimatePresence>
    </div>
  );
}
