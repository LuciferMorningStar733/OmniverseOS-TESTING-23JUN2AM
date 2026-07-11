import React, { useEffect, useState } from "react";
import { motion, AnimatePresence } from "framer-motion";
import { useOS } from "../context/OSContext";
import { analytics } from "../lib/api";
import { APPS } from "../lib/apps";
import { AreaChart, Area, ResponsiveContainer, Tooltip } from "recharts";

const fakeActivity = Array.from({ length:14 }, (_,i) => ({ x:i, y:30+Math.sin(i/2)*25+Math.random()*20 }));

const QUICK_APP_IDS_DEFAULT = ["chat","image","notes","tasks","calendar","music","code","finance","analytics","memory"];
const LS_QUICK = "omni_quick_apps";

function getQuickApps() {
  try { const s=localStorage.getItem(LS_QUICK); return s?JSON.parse(s):QUICK_APP_IDS_DEFAULT; } catch { return QUICK_APP_IDS_DEFAULT; }
}

/* ── Cortex Insight banner ─────────────────────────────────────────────── */
function CortexBanner({ user }) {
  const hour = new Date().getHours();
  const greeting = hour<12?"Good morning":hour<17?"Good afternoon":"Good evening";
  const tips = [
    "Resume yesterday's work? Your Notes app has 3 unsaved drafts.",
    "You have no meetings today — perfect for deep work.",
    "Productivity is up 12% this week. Keep the momentum going.",
    "Memory is growing. Cortex has learned 5 new facts this week.",
  ];
  const [tip] = useState(() => tips[Math.floor(Math.random()*tips.length)]);

  return (
    <motion.div
      initial={{ opacity:0, y:-10 }}
      animate={{ opacity:1, y:0 }}
      transition={{ duration:0.4, ease:[0.22,1,0.36,1] }}
      className="rounded-2xl p-5 mb-5 relative overflow-hidden"
      style={{
        background:"linear-gradient(135deg, rgba(0,240,255,0.08), rgba(0,240,255,0.02))",
        border:"1px solid rgba(0,240,255,0.18)",
      }}
    >
      <div className="absolute -top-8 -right-8 w-32 h-32 rounded-full pointer-events-none"
        style={{ background:"radial-gradient(circle, rgba(0,240,255,0.12), transparent 70%)" }}/>
      <div className="flex items-start justify-between gap-4">
        <div className="flex-1 min-w-0">
          <div className="font-mono text-[9px] uppercase tracking-[0.18em] text-slate-500 mb-1">
            // Cortex Morning Brief
          </div>
          <h1 className="font-heading text-2xl sm:text-3xl font-black tracking-tight mb-1">
            {greeting}, {user?.name?.split(" ")[0] || "User"}.
          </h1>
          <p className="text-sm text-slate-400 leading-relaxed max-w-md">{tip}</p>
        </div>
        <div className="flex-shrink-0 w-10 h-10 rounded-2xl flex items-center justify-center"
          style={{ background:"rgba(0,240,255,0.12)", border:"1px solid rgba(0,240,255,0.2)" }}>
          <i className="fa-solid fa-wand-magic-sparkles text-sm" style={{ color:"#00F0FF" }}/>
        </div>
      </div>
    </motion.div>
  );
}

/* ── Stat card ─────────────────────────────────────────────────────────── */
function StatCard({ label, value, color, icon, delay=0, sub }) {
  return (
    <motion.div
      initial={{ opacity:0, y:10, scale:0.97 }}
      animate={{ opacity:1, y:0, scale:1 }}
      transition={{ delay, duration:0.32, ease:[0.22,1,0.36,1] }}
      className="glass-light rounded-2xl p-4 relative overflow-hidden"
      style={{ border:`1px solid ${color}16` }}
      whileHover={{ scale:1.02, transition:{ duration:0.15 } }}
    >
      <div className="absolute -top-4 -right-4 w-16 h-16 rounded-full pointer-events-none"
        style={{ background:`radial-gradient(circle, ${color}1A, transparent 70%)` }}/>
      <div className="flex items-center justify-between mb-2 relative">
        <span className="mono-label text-[10px]">{label}</span>
        <div className="w-7 h-7 rounded-xl flex items-center justify-center flex-shrink-0" style={{ background:`${color}18` }}>
          <i className={`fa-solid ${icon} text-[11px]`} style={{ color }}/>
        </div>
      </div>
      <div className="font-heading text-2xl font-bold relative" style={{ color }}>{value}</div>
      {sub && <div className="text-[10px] font-mono text-slate-600 mt-0.5">{sub}</div>}
    </motion.div>
  );
}

/* ── Quick app icon ─────────────────────────────────────────────────────── */
function QuickApp({ app, onClick, delay, onRemove, editing }) {
  return (
    <motion.div className="relative" initial={{ opacity:0, scale:0.8 }} animate={{ opacity:1, scale:1 }}
      transition={{ delay, duration:0.22, ease:[0.22,1,0.36,1] }}>
      <motion.button
        data-testid={`quick-${app.id}`}
        onClick={onClick}
        whileHover={{ scale:1.06, y:-2 }}
        whileTap={{ scale:0.9 }}
        className="w-full aspect-square rounded-xl flex flex-col items-center justify-center gap-1.5 transition-colors"
        style={{ background:"rgba(255,255,255,0.03)", border:"1px solid rgba(255,255,255,0.06)", minHeight:52 }}
      >
        <i className={`fa-solid ${app.icon} text-base`} style={{ color:app.color }}/>
        <span className="text-[9px] font-mono text-slate-400 uppercase tracking-wide leading-none">{app.name}</span>
      </motion.button>
      {editing && (
        <motion.button
          initial={{ scale:0 }} animate={{ scale:1 }}
          onClick={(e) => { e.stopPropagation(); onRemove(app.id); }}
          className="absolute -top-1.5 -right-1.5 w-4 h-4 rounded-full flex items-center justify-center"
          style={{ background:"#FF003C", border:"1px solid rgba(255,255,255,0.2)", zIndex:10 }}
        >
          <i className="fa-solid fa-xmark text-[8px] text-white"/>
        </motion.button>
      )}
    </motion.div>
  );
}

/* ── Activity tooltip ───────────────────────────────────────────────────── */
function ActivityTooltip({ active, payload }) {
  if (!active||!payload?.length) return null;
  return (
    <div style={{ background:"rgba(8,10,18,0.95)", border:"1px solid rgba(0,240,255,0.2)", borderRadius:10, padding:"6px 12px", fontFamily:"'JetBrains Mono',monospace", fontSize:11, color:"#00F0FF" }}>
      {Math.round(payload[0].value)} events
    </div>
  );
}

/* ── Progress bar ───────────────────────────────────────────────────────── */
function ProgressBar({ pct, color="#00F0FF" }) {
  return (
    <div className="mt-3 h-1.5 rounded-full overflow-hidden" style={{ background:"rgba(255,255,255,0.05)" }}>
      <motion.div className="h-full rounded-full" initial={{width:0}} animate={{width:`${pct}%`}}
        transition={{ duration:0.9, ease:[0.22,1,0.36,1], delay:0.3 }}
        style={{ background:`linear-gradient(90deg, ${color}, #39FF14)` }}/>
    </div>
  );
}

/* ── Status row ─────────────────────────────────────────────────────────── */
function StatusRow({ name, uptime, delay }) {
  return (
    <motion.div initial={{opacity:0,x:-6}} animate={{opacity:1,x:0}} transition={{delay,duration:0.2,ease:"easeOut"}}
      className="flex items-center justify-between py-1.5" style={{ borderBottom:"1px solid rgba(255,255,255,0.04)" }}>
      <span className="text-sm text-slate-300">{name}</span>
      <div className="flex items-center gap-2">
        <motion.span className="w-1.5 h-1.5 rounded-full" style={{ background:"#39FF14" }}
          animate={{ boxShadow:["0 0 4px #39FF14aa","0 0 10px #39FF14","0 0 4px #39FF14aa"] }}
          transition={{ duration:2, repeat:Infinity, ease:"easeInOut" }}/>
        <span className="font-mono text-xs text-[#39FF14]">ONLINE</span>
        <span className="text-slate-600 font-mono text-xs">{uptime}%</span>
      </div>
    </motion.div>
  );
}

/* ── Focus item ─────────────────────────────────────────────────────────── */
function FocusItem({ text, tag, color, icon, delay }) {
  return (
    <motion.div initial={{opacity:0,x:-6}} animate={{opacity:1,x:0}} transition={{delay,duration:0.22}}
      className="flex items-center gap-3 py-2 px-3 rounded-xl"
      style={{ background:"rgba(255,255,255,0.025)", border:"1px solid rgba(255,255,255,0.04)" }}
      whileHover={{ borderColor:"rgba(255,255,255,0.09)", background:"rgba(255,255,255,0.04)", transition:{ duration:0.12 } }}>
      <div className="w-7 h-7 rounded-lg flex items-center justify-center flex-shrink-0" style={{ background:`${color}14` }}>
        <i className={`fa-solid ${icon} text-[11px]`} style={{ color }}/>
      </div>
      <span className="text-sm flex-1 text-slate-300">{text}</span>
      <span className="font-mono text-[9px] px-2 py-0.5 rounded-md" style={{ background:`${color}10`, color, border:`1px solid ${color}20` }}>{tag}</span>
    </motion.div>
  );
}

/* ── Quick launch customization modal ──────────────────────────────────── */
function AppPickerModal({ current, onSave, onClose }) {
  const [selected, setSelected] = useState(current);
  const allApps = APPS.filter(a => a.id !== "settings");
  const toggle = (id) => setSelected(s => s.includes(id) ? s.filter(x=>x!==id) : [...s, id]);
  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-4"
      style={{ background:"rgba(0,0,0,0.7)", backdropFilter:"blur(8px)" }} onClick={onClose}>
      <motion.div initial={{opacity:0,scale:0.9}} animate={{opacity:1,scale:1}} transition={{type:"spring",stiffness:380,damping:28}}
        className="w-full max-w-sm rounded-2xl overflow-hidden"
        style={{ background:"rgba(6,8,16,0.97)", border:"1px solid rgba(0,240,255,0.18)", boxShadow:"0 32px 80px rgba(0,0,0,0.85)" }}
        onClick={e=>e.stopPropagation()}>
        <div className="flex items-center justify-between p-4" style={{ borderBottom:"1px solid rgba(255,255,255,0.07)" }}>
          <div>
            <div className="mono-label text-[9px]">// Quick Launch</div>
            <h3 className="font-heading text-lg font-bold">Customize Apps</h3>
          </div>
          <button onClick={onClose} className="neon-btn !py-1 !px-2.5"><i className="fa-solid fa-xmark text-xs"/></button>
        </div>
        <div className="p-4 grid grid-cols-4 gap-2 max-h-64 overflow-y-auto scrollbar-none">
          {allApps.map(app=>(
            <motion.button key={app.id} onClick={()=>toggle(app.id)} whileTap={{scale:0.9}}
              className="aspect-square rounded-xl flex flex-col items-center justify-center gap-1 relative"
              style={{ background:selected.includes(app.id)?`${app.color}14`:"rgba(255,255,255,0.03)", border:selected.includes(app.id)?`1px solid ${app.color}40`:"1px solid rgba(255,255,255,0.06)" }}>
              <i className={`fa-solid ${app.icon} text-sm`} style={{ color:app.color }}/>
              <span className="text-[8px] font-mono text-slate-400 leading-none text-center px-1 truncate w-full">{app.name}</span>
              {selected.includes(app.id) && (
                <div className="absolute top-1 right-1 w-3.5 h-3.5 rounded-full flex items-center justify-center"
                  style={{ background:app.color }}>
                  <i className="fa-solid fa-check text-[7px] text-black"/>
                </div>
              )}
            </motion.button>
          ))}
        </div>
        <div className="p-4 flex gap-2" style={{ borderTop:"1px solid rgba(255,255,255,0.07)" }}>
          <button onClick={onClose} className="neon-btn flex-1 justify-center">Cancel</button>
          <button onClick={()=>{ onSave(selected); onClose(); }} className="neon-btn primary flex-1 justify-center">Save</button>
        </div>
      </motion.div>
    </div>
  );
}

/* ── Dashboard ─────────────────────────────────────────────────────────── */
const SERVICES = [
  { name:"AI Cortex",    uptime:99.9  },
  { name:"Memory Layer", uptime:99.7  },
  { name:"Network Mesh", uptime:100.0 },
  { name:"Storage Pool", uptime:98.8  },
];

const TODAY_FOCUS = [
  { text:"Review AI model integrations",   tag:"Dev",    color:"#00F0FF", icon:"fa-code"         },
  { text:"Update project roadmap notes",   tag:"Notes",  color:"#FCEE09", icon:"fa-note-sticky"  },
  { text:"Weekly sync — 3:00 PM",          tag:"Event",  color:"#FF003C", icon:"fa-calendar"     },
  { text:"Deploy v2.1 final build",        tag:"Task",   color:"#39FF14", icon:"fa-list-check"   },
];

export default function Dashboard() {
  const { user, openApp } = useOS();
  const [stats, setStats]   = useState({});
  const [now, setNow]       = useState(new Date());
  const [quickIds, setQuickIds] = useState(getQuickApps);
  const [editingQuick, setEditingQuick] = useState(false);
  const [showPicker, setShowPicker] = useState(false);

  useEffect(() => {
    analytics().then(setStats).catch(()=>{});
    const t = setInterval(()=>setNow(new Date()),1000);
    return () => clearInterval(t);
  }, []);

  const saveQuick = (ids) => {
    setQuickIds(ids);
    localStorage.setItem(LS_QUICK, JSON.stringify(ids));
  };
  const removeQuickApp = (id) => {
    const next = quickIds.filter(x=>x!==id);
    saveQuick(next);
  };

  const completionPct = stats.tasks ? Math.round((stats.tasks_done/stats.tasks)*100) : 0;
  const quickApps = quickIds.map(id=>APPS.find(a=>a.id===id)).filter(Boolean).slice(0,10);

  const STATS = [
    { label:"Notes",     value:stats.notes??0,                                          color:"#FCEE09", icon:"fa-note-sticky" },
    { label:"Tasks",     value:`${stats.tasks_done??0}/${stats.tasks??0}`,               color:"#00F0FF", icon:"fa-list-check"  },
    { label:"Events",    value:stats.events??0,                                          color:"#FF003C", icon:"fa-calendar"    },
    { label:"Memories",  value:stats.memories??0,                                        color:"#C778DD", icon:"fa-brain"       },
  ];

  return (
    <div className="w-full h-full overflow-y-auto p-4 sm:p-6 text-white scrollbar-none" data-testid="dashboard-app">

      {/* Morning Brief */}
      <CortexBanner user={user}/>

      {/* Time + date */}
      <motion.div initial={{opacity:0}} animate={{opacity:1}} transition={{delay:0.1}}
        className="flex items-center justify-between mb-5">
        <div className="mono-label text-[10px]">
          {now.toLocaleDateString(undefined,{weekday:"long",month:"long",day:"numeric",year:"numeric"})}
        </div>
        <div className="font-mono text-xl font-bold tabular-nums" style={{ color:"#00F0FF" }}>
          {now.toLocaleTimeString([],{hour:"2-digit",minute:"2-digit",second:"2-digit"})}
        </div>
      </motion.div>

      {/* Stat cards */}
      <div className="grid grid-cols-2 sm:grid-cols-4 gap-3 mb-5">
        {STATS.map((s,i)=><StatCard key={s.label} {...s} delay={i*0.07}/>)}
      </div>

      {/* Today's Focus + Activity */}
      <div className="grid grid-cols-1 md:grid-cols-3 gap-4 mb-4">
        <motion.div initial={{opacity:0,y:8}} animate={{opacity:1,y:0}} transition={{delay:0.28,duration:0.32,ease:[0.22,1,0.36,1]}}
          className="glass-light rounded-2xl p-5 md:col-span-2" style={{ border:"1px solid rgba(255,255,255,0.05)" }}>
          <div className="flex items-center justify-between mb-3">
            <div>
              <div className="mono-label text-[10px]">// Cortex</div>
              <h3 className="font-heading text-lg font-bold">Today's Focus</h3>
            </div>
            <span className="text-[9px] font-mono px-2 py-1 rounded-lg" style={{ background:"rgba(0,240,255,0.08)", color:"#00F0FF" }}>
              {new Date().toLocaleDateString(undefined,{weekday:"long"})}
            </span>
          </div>
          <div className="space-y-1.5">
            {TODAY_FOCUS.map((f,i)=><FocusItem key={i} {...f} delay={0.32+i*0.05}/>)}
          </div>
        </motion.div>

        {/* Activity sparkline */}
        <motion.div initial={{opacity:0,y:8}} animate={{opacity:1,y:0}} transition={{delay:0.33,duration:0.32,ease:[0.22,1,0.36,1]}}
          className="glass-light rounded-2xl p-5" style={{ border:"1px solid rgba(255,255,255,0.05)" }}>
          <div className="mono-label text-[10px] mb-0.5">// Activity</div>
          <h3 className="font-heading text-lg font-bold mb-2">14-day trend</h3>
          <div className="h-28">
            <ResponsiveContainer width="100%" height="100%">
              <AreaChart data={fakeActivity} margin={{top:2,right:2,bottom:0,left:-24}}>
                <defs>
                  <linearGradient id="actGrad2" x1="0" y1="0" x2="0" y2="1">
                    <stop offset="0%" stopColor="#00F0FF" stopOpacity={0.5}/>
                    <stop offset="100%" stopColor="#00F0FF" stopOpacity={0}/>
                  </linearGradient>
                </defs>
                <Tooltip content={<ActivityTooltip/>} cursor={{stroke:"rgba(0,240,255,0.2)",strokeWidth:1}}/>
                <Area dataKey="y" stroke="#00F0FF" fill="url(#actGrad2)" strokeWidth={2} dot={false} isAnimationActive animationDuration={1200}/>
              </AreaChart>
            </ResponsiveContainer>
          </div>
          <div className="mt-2 text-[10px] font-mono text-slate-500">+{stats.messages??0} AI messages this period</div>
        </motion.div>
      </div>

      {/* Quick launch + System status + Productivity */}
      <div className="grid grid-cols-1 md:grid-cols-3 gap-4 mb-4">

        {/* Quick launch */}
        <motion.div initial={{opacity:0,y:8}} animate={{opacity:1,y:0}} transition={{delay:0.36,duration:0.32,ease:[0.22,1,0.36,1]}}
          className="glass-light rounded-2xl p-5" style={{ border:"1px solid rgba(255,255,255,0.05)" }}>
          <div className="flex items-center justify-between mb-3">
            <div>
              <div className="mono-label text-[10px]">// Quick Launch</div>
              <h3 className="font-heading text-lg font-bold">Apps</h3>
            </div>
            <div className="flex gap-1.5">
              {editingQuick && (
                <button onClick={()=>setShowPicker(true)} className="neon-btn !py-1 !px-2 text-[10px]">
                  <i className="fa-solid fa-plus"/>
                </button>
              )}
              <button onClick={()=>setEditingQuick(e=>!e)}
                className="neon-btn !py-1 !px-2 text-[10px]"
                style={editingQuick?{ borderColor:"rgba(0,240,255,0.4)", color:"#00F0FF" }:{}}>
                <i className={`fa-solid ${editingQuick?"fa-check":"fa-pen"} text-[9px]`}/>
              </button>
            </div>
          </div>
          <div className="grid grid-cols-5 gap-2">
            {quickApps.map((app,i)=>(
              <QuickApp key={app.id} app={app} onClick={()=>{ if(!editingQuick) openApp(app.id); }}
                delay={0.38+i*0.03} editing={editingQuick} onRemove={removeQuickApp}/>
            ))}
          </div>
        </motion.div>

        {/* System status */}
        <motion.div initial={{opacity:0,y:8}} animate={{opacity:1,y:0}} transition={{delay:0.42,duration:0.3}}
          className="glass-light rounded-2xl p-5" style={{ border:"1px solid rgba(255,255,255,0.05)" }}>
          <div className="mono-label text-[10px] mb-0.5">// System Status</div>
          <h3 className="font-heading text-lg font-bold mb-3">All systems nominal</h3>
          {SERVICES.map((s,i)=><StatusRow key={s.name} name={s.name} uptime={s.uptime} delay={0.44+i*0.06}/>)}
        </motion.div>

        {/* Productivity */}
        <motion.div initial={{opacity:0,y:8}} animate={{opacity:1,y:0}} transition={{delay:0.46,duration:0.3}}
          className="glass-light rounded-2xl p-5" style={{ border:"1px solid rgba(255,255,255,0.05)" }}>
          <div className="mono-label text-[10px] mb-0.5">// Workspace</div>
          <h3 className="font-heading text-lg font-bold mb-2">Productivity</h3>
          <div className="font-mono text-3xl font-bold tabular-nums"
            style={{ color:completionPct>=80?"#39FF14":completionPct>=40?"#FCEE09":"#FF003C" }}>
            {completionPct}%
          </div>
          <div className="text-xs text-slate-400 mt-0.5">Task completion rate</div>
          <ProgressBar pct={completionPct} color={completionPct>=80?"#39FF14":completionPct>=40?"#FCEE09":"#FF003C"}/>
          <div className="mt-3 flex items-center gap-1.5 text-[11px] font-mono text-slate-500">
            <i className="fa-solid fa-check-double text-[#39FF14] text-[10px]"/>
            {stats.tasks_done??0} of {stats.tasks??0} done
          </div>

          {/* AI suggestion */}
          <div className="mt-4 pt-3" style={{ borderTop:"1px solid rgba(255,255,255,0.05)" }}>
            <div className="flex items-center gap-1.5 mb-1.5">
              <i className="fa-solid fa-wand-magic-sparkles text-[10px]" style={{ color:"#00F0FF" }}/>
              <span className="font-mono text-[9px] text-slate-500 uppercase tracking-widest">Cortex</span>
            </div>
            <p className="text-[11px] text-slate-400 leading-relaxed">
              {completionPct >= 80 ? "Excellent progress today! You're in the top 20% of your weekly average." :
               completionPct >= 40 ? "Solid momentum — complete 2 more tasks to hit your daily goal." :
               "Let's pick up the pace. Open Tasks to see your priorities."}
            </p>
          </div>
        </motion.div>
      </div>

      {/* App picker modal */}
      <AnimatePresence>
        {showPicker && (
          <AppPickerModal current={quickIds} onSave={saveQuick} onClose={()=>setShowPicker(false)}/>
        )}
      </AnimatePresence>
    </div>
  );
}
