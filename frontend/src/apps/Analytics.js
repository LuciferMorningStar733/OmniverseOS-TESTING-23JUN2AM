import React, { useEffect, useState } from "react";
import { motion, AnimatePresence } from "framer-motion";
import { analytics } from "../lib/api";
import {
  AreaChart, Area, BarChart, Bar, LineChart, Line,
  XAxis, YAxis, Tooltip, ResponsiveContainer, CartesianGrid, Cell,
  RadarChart, Radar, PolarGrid, PolarAngleAxis,
} from "recharts";

const C = { cyan:"#00F0FF", green:"#39FF14", red:"#FF003C", yellow:"#FCEE09", purple:"#C778DD", orange:"#FF6B35", blue:"#60A5FA" };

const genTimeline = () =>
  Array.from({ length: 14 }, (_, i) => {
    const d = new Date(); d.setDate(d.getDate() - 13 + i);
    return { day: d.toLocaleDateString("en",{weekday:"short"}), notes: Math.floor(Math.random()*8+1), tasks: Math.floor(Math.random()*12+2), messages: Math.floor(Math.random()*40+10), memories: Math.floor(Math.random()*5) };
  });
const TIMELINE = genTimeline();
const RADAR_KEYS = ["Focus","Output","Velocity","Recall","Efficiency"];

function MetricCard({ label, value, sub, color, icon, delay=0, trend }) {
  return (
    <motion.div
      initial={{ opacity:0, y:12, scale:0.96 }} animate={{ opacity:1, y:0, scale:1 }}
      transition={{ delay, duration:0.38, ease:[0.22,1,0.36,1] }}
      className="relative overflow-hidden rounded-2xl p-4"
      style={{ background:"rgba(6,8,16,0.6)", border:`1px solid ${color}22`, boxShadow:`0 0 24px ${color}0A` }}
      whileHover={{ scale:1.02, transition:{ duration:0.15 } }}
    >
      <div className="absolute -top-6 -right-6 w-20 h-20 rounded-full pointer-events-none"
        style={{ background:`radial-gradient(circle, ${color}20, transparent 70%)` }} />
      <div className="flex items-center justify-between mb-1">
        <span className="font-mono text-[9px] uppercase tracking-[0.15em] text-slate-500">{label}</span>
        <div className="w-6 h-6 rounded-lg flex items-center justify-center" style={{ background:`${color}18` }}>
          <i className={`fa-solid ${icon} text-[10px]`} style={{ color }} />
        </div>
      </div>
      <div className="font-heading text-2xl font-black tabular-nums" style={{ color }}>{value}</div>
      {sub && <div className="text-[10px] font-mono text-slate-500 mt-0.5">{sub}</div>}
      {trend !== undefined && (
        <div className="flex items-center gap-1 mt-1">
          <i className={`fa-solid fa-arrow-trend-${trend>=0?"up":"down"} text-[9px]`} style={{ color: trend>=0?C.green:C.red }} />
          <span className="text-[9px] font-mono" style={{ color: trend>=0?C.green:C.red }}>{trend>=0?"+":""}{trend}% vs last week</span>
        </div>
      )}
    </motion.div>
  );
}

function GlassPanel({ children, className="", style={} }) {
  return (
    <div className={`rounded-2xl p-4 ${className}`}
      style={{ background:"rgba(6,8,16,0.55)", border:"1px solid rgba(255,255,255,0.06)", backdropFilter:"blur(20px)", WebkitBackdropFilter:"blur(20px)", ...style }}>
      {children}
    </div>
  );
}

function SectionHeader({ label, title }) {
  return (
    <div className="mb-3">
      <div className="font-mono text-[9px] uppercase tracking-[0.18em] text-slate-600 mb-0.5">{label}</div>
      <h3 className="font-heading text-lg font-bold tracking-tight">{title}</h3>
    </div>
  );
}

function CyberTooltip({ active, payload, label }) {
  if (!active||!payload?.length) return null;
  return (
    <div style={{ background:"rgba(4,6,14,0.97)", border:"1px solid rgba(0,240,255,0.2)", borderRadius:10, padding:"8px 12px", fontFamily:"'JetBrains Mono',monospace", fontSize:10.5, boxShadow:"0 16px 40px rgba(0,0,0,0.7)" }}>
      <div style={{ color:"rgba(255,255,255,0.35)", marginBottom:4, textTransform:"uppercase", letterSpacing:"0.1em" }}>{label}</div>
      {payload.map((p,i) => (
        <div key={i} style={{ color:p.color||"#fff", display:"flex", gap:8, alignItems:"center" }}>
          <span style={{ width:6, height:6, borderRadius:"50%", background:p.color, display:"inline-block", flexShrink:0 }} />
          {p.name}: <strong>{p.value}</strong>
        </div>
      ))}
    </div>
  );
}

function ActivityHeatmap() {
  const weeks=16, days=7;
  const cells = Array.from({ length:weeks*days }, () => ({ value: Math.random()<0.3?0:Math.floor(Math.random()*10) }));
  const maxV = Math.max(...cells.map(c=>c.value),1);
  const col = (v) => v===0 ? "rgba(255,255,255,0.04)" : `rgba(0,240,255,${0.15+v/maxV*0.75})`;
  return (
    <div>
      <div className="flex gap-0.5">
        <div className="flex flex-col gap-0.5 mr-1">
          {["Su","Mo","Tu","We","Th","Fr","Sa"].map(d=>(
            <div key={d} style={{ height:10, fontSize:8, fontFamily:"monospace", color:"rgba(255,255,255,0.2)", lineHeight:"10px" }}>{d}</div>
          ))}
        </div>
        {Array.from({ length:weeks }).map((_,w)=>(
          <div key={w} className="flex flex-col gap-0.5">
            {Array.from({ length:days }).map((_,d)=>(
              <div key={d} style={{ width:10, height:10, borderRadius:2, background:col(cells[w*days+d].value) }} />
            ))}
          </div>
        ))}
      </div>
      <div className="flex items-center gap-1.5 mt-2">
        <span className="font-mono text-[8px] text-slate-600">Less</span>
        {[0,2,4,7,10].map((v,i)=><div key={i} style={{ width:9, height:9, borderRadius:2, background:col(v) }} />)}
        <span className="font-mono text-[8px] text-slate-600">More</span>
      </div>
    </div>
  );
}

function Gauge({ value, max=100, color=C.cyan, label, size=80 }) {
  const pct=Math.min(value/max,1), r=(size-10)/2, circ=2*Math.PI*r;
  const dash=circ*pct*0.75, rot=-225;
  return (
    <div className="flex flex-col items-center gap-1.5">
      <svg width={size} height={size} viewBox={`0 0 ${size} ${size}`}>
        <circle cx={size/2} cy={size/2} r={r} fill="none" stroke="rgba(255,255,255,0.05)" strokeWidth={8}
          strokeDasharray={`${circ*0.75} ${circ*0.25}`} strokeLinecap="round"
          style={{ transform:`rotate(${rot}deg)`, transformOrigin:"center" }} />
        <motion.circle cx={size/2} cy={size/2} r={r} fill="none" stroke={color} strokeWidth={8}
          strokeLinecap="round"
          initial={{ strokeDasharray:`0 ${circ}` }}
          animate={{ strokeDasharray:`${dash} ${circ-dash+circ*0.25}` }}
          transition={{ duration:1.2, ease:[0.22,1,0.36,1], delay:0.3 }}
          style={{ transform:`rotate(${rot}deg)`, transformOrigin:"center", filter:`drop-shadow(0 0 4px ${color}80)` }} />
        <text x="50%" y="52%" textAnchor="middle" dominantBaseline="middle"
          fill={color} fontSize={size*0.22} fontWeight={800} fontFamily="'JetBrains Mono',monospace">
          {Math.round(pct*100)}%
        </text>
      </svg>
      <div className="font-mono text-[9px] uppercase tracking-widest text-slate-500">{label}</div>
    </div>
  );
}

function Counter({ target, duration=1200 }) {
  const [val, setVal] = useState(0);
  useEffect(() => {
    const start=Date.now();
    const tick=()=>{ const p=Math.min((Date.now()-start)/duration,1), e=1-Math.pow(1-p,3); setVal(Math.round(e*target)); if(p<1) requestAnimationFrame(tick); };
    requestAnimationFrame(tick);
  }, [target, duration]);
  return <>{val.toLocaleString()}</>;
}

function PulseDot({ color=C.cyan }) {
  return (
    <motion.span className="inline-block w-1.5 h-1.5 rounded-full" style={{ background:color }}
      animate={{ boxShadow:[`0 0 3px ${color}80`,`0 0 10px ${color}`,`0 0 3px ${color}80`] }}
      transition={{ duration:1.6, repeat:Infinity, ease:"easeInOut" }} />
  );
}

const TABS = [
  { id:"overview",    label:"Overview",    icon:"fa-chart-line"     },
  { id:"activity",    label:"Activity",    icon:"fa-bolt"           },
  { id:"performance", label:"Performance", icon:"fa-gauge-high"     },
  { id:"telemetry",   label:"Telemetry",   icon:"fa-satellite-dish" },
];

export default function Analytics() {
  const [s, setS]       = useState({});
  const [tab, setTab]   = useState("overview");
  const [live, setLive] = useState({ cpu:42, ram:61, net:12 });

  useEffect(() => { analytics().then(setS).catch(()=>{}); }, []);

  useEffect(() => {
    const tick = setInterval(() => setLive({
      cpu: Math.max(10,Math.min(95, 42+(Math.random()-0.5)*16)),
      ram: Math.max(30,Math.min(90, 61+(Math.random()-0.5)*10)),
      net: Math.max(1, Math.min(80, 12+(Math.random()-0.5)*20)),
    }), 1800);
    return () => clearInterval(tick);
  }, []);

  const radarData = RADAR_KEYS.map(k=>({ subject:k, score:Math.round(55+Math.random()*40), fullMark:100 }));
  const barData = [
    { name:"Notes",    v:s.notes    ||0, fill:C.yellow },
    { name:"Tasks",    v:s.tasks    ||0, fill:C.cyan   },
    { name:"Events",   v:s.events   ||0, fill:C.orange },
    { name:"Memories", v:s.memories ||0, fill:C.purple },
    { name:"AI Msgs",  v:s.messages ||0, fill:C.green  },
  ];

  return (
    <div className="flex flex-col h-full text-white overflow-hidden" data-testid="analytics-app"
      style={{ background:"linear-gradient(135deg, rgba(0,240,255,0.02) 0%, transparent 60%)" }}>

      {/* Header */}
      <div className="flex-shrink-0 px-5 pt-4 pb-3" style={{ borderBottom:"1px solid rgba(255,255,255,0.06)" }}>
        <div className="flex items-center justify-between">
          <div>
            <div className="flex items-center gap-2 mb-0.5">
              <PulseDot />
              <span className="font-mono text-[9px] uppercase tracking-[0.18em] text-slate-500">// Live Telemetry</span>
            </div>
            <h2 className="font-heading text-2xl font-black tracking-tight">Analytics</h2>
          </div>
          <div className="flex items-center gap-2 text-[10px] font-mono"
            style={{ color:C.green, background:"rgba(57,255,20,0.08)", border:"1px solid rgba(57,255,20,0.15)", borderRadius:8, padding:"4px 10px" }}>
            <i className="fa-solid fa-circle text-[7px]" /> LIVE
          </div>
        </div>
        <div className="flex gap-1 mt-3 overflow-x-auto">
          {TABS.map(t=>(
            <button key={t.id} onClick={()=>setTab(t.id)}
              className="flex items-center gap-1.5 px-3 py-1.5 rounded-lg text-[11px] font-mono transition-all flex-shrink-0"
              style={{ background:tab===t.id?"rgba(0,240,255,0.12)":"rgba(255,255,255,0.04)", border:tab===t.id?"1px solid rgba(0,240,255,0.28)":"1px solid rgba(255,255,255,0.06)", color:tab===t.id?C.cyan:"rgba(255,255,255,0.45)", cursor:"pointer" }}>
              <i className={`fa-solid ${t.icon} text-[10px]`} />{t.label}
            </button>
          ))}
        </div>
      </div>

      {/* Body */}
      <div className="flex-1 overflow-y-auto p-4 sm:p-5 scrollbar-none">
        <AnimatePresence mode="wait">

          {tab==="overview" && (
            <motion.div key="overview" initial={{opacity:0,y:10}} animate={{opacity:1,y:0}} exit={{opacity:0,y:-6}} transition={{duration:0.3}} className="space-y-4">
              <div className="grid grid-cols-2 sm:grid-cols-3 lg:grid-cols-5 gap-3">
                <MetricCard label="Notes"    value={<Counter target={s.notes    ||0}/>} icon="fa-note-sticky" color={C.yellow} delay={0.0}  trend={12}  />
                <MetricCard label="Tasks"    value={<Counter target={s.tasks    ||0}/>} icon="fa-list-check"  color={C.cyan}   delay={0.05} trend={5}   />
                <MetricCard label="Events"   value={<Counter target={s.events   ||0}/>} icon="fa-calendar"    color={C.orange} delay={0.1}  trend={-3}  />
                <MetricCard label="Memories" value={<Counter target={s.memories ||0}/>} icon="fa-brain"       color={C.purple} delay={0.15} trend={22}  />
                <MetricCard label="AI Msgs"  value={<Counter target={s.messages ||0}/>} icon="fa-message"     color={C.green}  delay={0.2}  trend={18}  />
              </div>

              <GlassPanel>
                <SectionHeader label="// 14-Day Trend" title="Activity Timeline" />
                <div className="h-48">
                  <ResponsiveContainer>
                    <AreaChart data={TIMELINE} margin={{top:4,right:4,bottom:0,left:-22}}>
                      <defs>
                        {[["msgs",C.cyan],["tasks",C.green],["notes",C.yellow]].map(([id,c])=>(
                          <linearGradient key={id} id={`g${id}`} x1="0" y1="0" x2="0" y2="1">
                            <stop offset="0%" stopColor={c} stopOpacity={0.4}/>
                            <stop offset="100%" stopColor={c} stopOpacity={0}/>
                          </linearGradient>
                        ))}
                      </defs>
                      <CartesianGrid stroke="rgba(255,255,255,0.03)" vertical={false}/>
                      <XAxis dataKey="day" tick={{fill:"#475569",fontSize:8.5,fontFamily:"'JetBrains Mono',monospace"}} axisLine={false} tickLine={false}/>
                      <YAxis tick={{fill:"#475569",fontSize:8.5,fontFamily:"'JetBrains Mono',monospace"}} axisLine={false} tickLine={false}/>
                      <Tooltip content={<CyberTooltip/>}/>
                      <Area dataKey="messages" name="AI Msgs" stroke={C.cyan}   fill="url(#gmsgs)"  strokeWidth={2} dot={false}/>
                      <Area dataKey="tasks"    name="Tasks"   stroke={C.green}  fill="url(#gtasks)" strokeWidth={1.5} dot={false}/>
                      <Area dataKey="notes"    name="Notes"   stroke={C.yellow} fill="url(#gnotes)" strokeWidth={1.5} dot={false}/>
                    </AreaChart>
                  </ResponsiveContainer>
                </div>
              </GlassPanel>

              <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                <GlassPanel>
                  <SectionHeader label="// Distribution" title="Data Footprint" />
                  <div className="h-44">
                    <ResponsiveContainer>
                      <BarChart data={barData} margin={{top:4,right:4,bottom:0,left:-18}}>
                        <CartesianGrid stroke="rgba(255,255,255,0.03)" vertical={false}/>
                        <XAxis dataKey="name" tick={{fill:"#475569",fontSize:8.5,fontFamily:"monospace"}} axisLine={false} tickLine={false}/>
                        <YAxis tick={{fill:"#475569",fontSize:8,fontFamily:"monospace"}} axisLine={false} tickLine={false}/>
                        <Tooltip content={<CyberTooltip/>} cursor={{fill:"rgba(255,255,255,0.03)"}}/>
                        <Bar dataKey="v" radius={[5,5,0,0]} maxBarSize={28}>
                          {barData.map((d,i)=><Cell key={i} fill={d.fill} fillOpacity={0.85}/>)}
                        </Bar>
                      </BarChart>
                    </ResponsiveContainer>
                  </div>
                </GlassPanel>
                <GlassPanel>
                  <SectionHeader label="// Spatial Map" title="Activity Heatmap" />
                  <ActivityHeatmap/>
                </GlassPanel>
              </div>
            </motion.div>
          )}

          {tab==="activity" && (
            <motion.div key="activity" initial={{opacity:0,y:10}} animate={{opacity:1,y:0}} exit={{opacity:0,y:-6}} transition={{duration:0.3}} className="space-y-4">
              <GlassPanel>
                <SectionHeader label="// Live Feed" title="Productivity Timeline" />
                <div className="h-56">
                  <ResponsiveContainer>
                    <LineChart data={TIMELINE} margin={{top:4,right:4,bottom:0,left:-22}}>
                      <CartesianGrid stroke="rgba(255,255,255,0.03)" vertical={false}/>
                      <XAxis dataKey="day" tick={{fill:"#475569",fontSize:8.5,fontFamily:"monospace"}} axisLine={false} tickLine={false}/>
                      <YAxis tick={{fill:"#475569",fontSize:8.5,fontFamily:"monospace"}} axisLine={false} tickLine={false}/>
                      <Tooltip content={<CyberTooltip/>}/>
                      <Line dataKey="messages" name="AI Msgs" stroke={C.cyan}   strokeWidth={2} dot={false}/>
                      <Line dataKey="tasks"    name="Tasks"   stroke={C.green}  strokeWidth={2} dot={false} strokeDasharray="4 2"/>
                      <Line dataKey="notes"    name="Notes"   stroke={C.yellow} strokeWidth={2} dot={false} strokeDasharray="2 3"/>
                      <Line dataKey="memories" name="Memories" stroke={C.purple} strokeWidth={1.5} dot={false}/>
                    </LineChart>
                  </ResponsiveContainer>
                </div>
              </GlassPanel>

              <GlassPanel>
                <SectionHeader label="// Daily Detail" title="This Week" />
                <div className="space-y-2">
                  {TIMELINE.slice(-7).map((d,i)=>(
                    <motion.div key={i} initial={{opacity:0,x:-10}} animate={{opacity:1,x:0}} transition={{delay:i*0.05}} className="flex items-center gap-3">
                      <div className="w-8 text-[10px] font-mono text-slate-500 flex-shrink-0">{d.day}</div>
                      <div className="flex-1 flex gap-1 h-2">
                        {[{v:d.messages,max:60,c:C.cyan},{v:d.tasks,max:20,c:C.green},{v:d.notes,max:12,c:C.yellow}].map((bar,j)=>(
                          <motion.div key={j} className="h-2 rounded-sm"
                            style={{ background:bar.c, opacity:0.75, flex:1 }}
                            initial={{scaleX:0}} animate={{scaleX:1}} transition={{delay:0.1+i*0.05+j*0.03, duration:0.6}}/>
                        ))}
                      </div>
                      <div className="text-[10px] font-mono text-slate-600 w-12 text-right">{d.messages+d.tasks+d.notes} ev</div>
                    </motion.div>
                  ))}
                </div>
                <div className="flex gap-4 mt-3 pt-3" style={{ borderTop:"1px solid rgba(255,255,255,0.05)" }}>
                  {[["AI Msgs",C.cyan],["Tasks",C.green],["Notes",C.yellow]].map(([l,c])=>(
                    <div key={l} className="flex items-center gap-1.5">
                      <div className="w-2 h-2 rounded-sm" style={{ background:c }}/>
                      <span className="text-[9px] font-mono text-slate-500">{l}</span>
                    </div>
                  ))}
                </div>
              </GlassPanel>
            </motion.div>
          )}

          {tab==="performance" && (
            <motion.div key="performance" initial={{opacity:0,y:10}} animate={{opacity:1,y:0}} exit={{opacity:0,y:-6}} transition={{duration:0.3}} className="space-y-4">
              <GlassPanel>
                <SectionHeader label="// Cognitive Profile" title="Performance Radar" />
                <div className="flex flex-col sm:flex-row items-center gap-6">
                  <div className="h-56 flex-1 w-full">
                    <ResponsiveContainer>
                      <RadarChart data={radarData}>
                        <PolarGrid stroke="rgba(255,255,255,0.06)"/>
                        <PolarAngleAxis dataKey="subject" tick={{fill:"#64748B",fontSize:10,fontFamily:"monospace"}}/>
                        <Radar name="Score" dataKey="score" stroke={C.cyan} fill={C.cyan} fillOpacity={0.15} strokeWidth={2}/>
                        <Tooltip contentStyle={{ background:"rgba(4,6,14,0.96)", border:"1px solid rgba(0,240,255,0.2)", borderRadius:8, fontFamily:"monospace", fontSize:11 }}/>
                      </RadarChart>
                    </ResponsiveContainer>
                  </div>
                  <div className="flex gap-4 flex-wrap justify-center">
                    {radarData.map(d=><Gauge key={d.subject} value={d.score} label={d.subject} color={C.cyan} size={72}/>)}
                  </div>
                </div>
              </GlassPanel>

              <GlassPanel>
                <SectionHeader label="// Breakdown" title="Skill Metrics" />
                <div className="space-y-3">
                  {radarData.map((d,i)=>(
                    <div key={d.subject}>
                      <div className="flex items-center justify-between mb-1">
                        <span className="text-sm font-medium">{d.subject}</span>
                        <span className="font-mono text-sm" style={{ color:d.score>=80?C.green:d.score>=60?C.cyan:C.yellow }}>{d.score}</span>
                      </div>
                      <div className="h-1.5 rounded-full overflow-hidden" style={{ background:"rgba(255,255,255,0.05)" }}>
                        <motion.div className="h-full rounded-full"
                          initial={{width:0}} animate={{width:`${d.score}%`}}
                          transition={{ delay:0.1+i*0.07, duration:0.9, ease:[0.22,1,0.36,1] }}
                          style={{ background:`linear-gradient(90deg, ${C.cyan}, ${C.green})` }}/>
                      </div>
                    </div>
                  ))}
                </div>
              </GlassPanel>
            </motion.div>
          )}

          {tab==="telemetry" && (
            <motion.div key="telemetry" initial={{opacity:0,y:10}} animate={{opacity:1,y:0}} exit={{opacity:0,y:-6}} transition={{duration:0.3}} className="space-y-4">
              <GlassPanel>
                <div className="flex items-center justify-between mb-4">
                  <SectionHeader label="// System" title="Live Telemetry"/>
                  <div className="flex items-center gap-1.5 text-[9px] font-mono" style={{ color:C.green }}>
                    <PulseDot color={C.green}/> STREAMING
                  </div>
                </div>
                <div className="grid grid-cols-3 gap-4">
                  {[{label:"CPU",value:live.cpu,color:C.cyan,icon:"fa-microchip"},{label:"RAM",value:live.ram,color:C.purple,icon:"fa-memory"},{label:"NET",value:live.net,color:C.green,icon:"fa-wifi"}].map(m=>(
                    <div key={m.label} className="flex flex-col items-center gap-2">
                      <Gauge value={m.value} color={m.color} label={m.label} size={80}/>
                      <span className="font-mono text-[10px]" style={{ color:m.color }}>{m.value.toFixed(1)}%</span>
                    </div>
                  ))}
                </div>
              </GlassPanel>

              <div className="grid grid-cols-2 sm:grid-cols-4 gap-3">
                {[
                  {label:"Uptime",value:"12d 4h",icon:"fa-server",color:C.cyan},
                  {label:"Processes",value:"34",icon:"fa-circle-nodes",color:C.green},
                  {label:"DB Queries",value:"1.2k",icon:"fa-database",color:C.yellow},
                  {label:"API Calls",value:"847",icon:"fa-bolt",color:C.orange},
                ].map((s,i)=><MetricCard key={s.label} {...s} delay={i*0.05}/>)}
              </div>

              <motion.div initial={{opacity:0,y:8}} animate={{opacity:1,y:0}} transition={{delay:0.3}}
                className="rounded-2xl p-4"
                style={{ background:"linear-gradient(135deg, rgba(0,240,255,0.06), rgba(0,240,255,0.02))", border:"1px solid rgba(0,240,255,0.15)" }}>
                <div className="flex items-center gap-2 mb-2">
                  <i className="fa-solid fa-wand-magic-sparkles text-[11px]" style={{ color:C.cyan }}/>
                  <span className="font-mono text-[9px] uppercase tracking-widest" style={{ color:C.cyan }}>Cortex Insight</span>
                </div>
                <p className="text-sm text-slate-300 leading-relaxed">
                  Your productivity increased <strong style={{ color:C.green }}>+18%</strong> this week. AI message volume is up significantly — 
                  Cortex is being engaged more frequently. System telemetry is nominal across all nodes.
                </p>
              </motion.div>
            </motion.div>
          )}

        </AnimatePresence>
      </div>
    </div>
  );
}
