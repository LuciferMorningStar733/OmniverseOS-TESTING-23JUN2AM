import React, { useEffect, useState, useCallback } from "react";
import { motion, AnimatePresence } from "framer-motion";
import * as SelectPrimitive from "@radix-ui/react-select";
import { crud } from "../lib/api";
import {
  BarChart, Bar, XAxis, YAxis, Tooltip, ResponsiveContainer, CartesianGrid, Cell,
  AreaChart, Area, PieChart, Pie,
} from "recharts";

/* ── Data ─────────────────────────────────────────────────────────────────── */
const c = crud("transactions");

const CATEGORIES = [
  { value:"food",          label:"Food",          icon:"🍜", color:"#00F0FF" },
  { value:"transport",     label:"Transport",      icon:"🚌", color:"#FCEE09" },
  { value:"shopping",      label:"Shopping",       icon:"🛍️", color:"#FF003C" },
  { value:"rent",          label:"Rent",           icon:"🏠", color:"#C778DD" },
  { value:"salary",        label:"Salary",         icon:"💼", color:"#39FF14" },
  { value:"freelance",     label:"Freelance",      icon:"💻", color:"#FF6B35" },
  { value:"entertainment", label:"Entertainment",  icon:"🎮", color:"#00F0FF" },
  { value:"health",        label:"Health",         icon:"💊", color:"#F472B6" },
  { value:"utilities",     label:"Utilities",      icon:"⚡", color:"#60A5FA" },
  { value:"savings",       label:"Savings",        icon:"🏦", color:"#39FF14" },
];

const TYPES = [
  { value:"expense", label:"Expense", color:"#FF003C", icon:"fa-arrow-trend-down" },
  { value:"income",  label:"Income",  color:"#39FF14", icon:"fa-arrow-trend-up"   },
];

/* ── CyberSelect (fixed Radix UI render) ─────────────────────────────────── */
function CyberSelect({ value, onValueChange, options, placeholder }) {
  return (
    <SelectPrimitive.Root value={value} onValueChange={onValueChange}>
      <SelectPrimitive.Trigger
        className="input-cyber flex items-center justify-between gap-2 cursor-pointer"
        style={{ userSelect:"none" }}>
        <SelectPrimitive.Value placeholder={placeholder}>
          {(() => {
            const opt = options.find(o=>o.value===value);
            if (!opt) return placeholder;
            return (
              <span className="flex items-center gap-2">
                {opt.emoji && <span>{opt.emoji}</span>}
                {opt.icon && !opt.emoji && <i className={`fa-solid ${opt.icon} text-[11px]`} style={{ color:opt.color }}/>}
                {opt.label}
              </span>
            );
          })()}
        </SelectPrimitive.Value>
        <SelectPrimitive.Icon>
          <i className="fa-solid fa-chevron-down text-[9px] opacity-40 flex-shrink-0"/>
        </SelectPrimitive.Icon>
      </SelectPrimitive.Trigger>
      <SelectPrimitive.Portal>
        <SelectPrimitive.Content position="popper" sideOffset={6} style={{
          background:"rgba(8,10,18,0.97)", backdropFilter:"blur(28px)",
          border:"1px solid rgba(0,240,255,0.18)", borderRadius:14, padding:"6px",
          boxShadow:"0 20px 60px rgba(0,0,0,0.75)", zIndex:9999, minWidth:200,
        }}>
          <SelectPrimitive.Viewport>
            {options.map(opt=>(
              <SelectPrimitive.Item key={opt.value} value={opt.value}
                style={{ outline:"none", listStyle:"none" }}>
                <div style={{ display:"flex", alignItems:"center", justifyContent:"space-between",
                  gap:10, padding:"8px 12px", borderRadius:9, cursor:"pointer",
                  fontFamily:"'Outfit',sans-serif", fontSize:13, color:"rgba(255,255,255,0.85)" }}
                  onMouseEnter={e=>{ e.currentTarget.style.background="rgba(255,255,255,0.05)"; }}
                  onMouseLeave={e=>{ e.currentTarget.style.background="transparent"; }}>
                  <span style={{ display:"flex", alignItems:"center", gap:10 }}>
                    {opt.emoji && <span style={{ fontSize:15 }}>{opt.emoji}</span>}
                    {opt.icon && !opt.emoji && <i className={`fa-solid ${opt.icon} text-[11px]`} style={{ color:opt.color, width:14 }}/>}
                    <SelectPrimitive.ItemText>{opt.label}</SelectPrimitive.ItemText>
                  </span>
                  <SelectPrimitive.ItemIndicator>
                    <i className="fa-solid fa-check text-[10px]" style={{ color:opt.color||"#00F0FF" }}/>
                  </SelectPrimitive.ItemIndicator>
                </div>
              </SelectPrimitive.Item>
            ))}
          </SelectPrimitive.Viewport>
        </SelectPrimitive.Content>
      </SelectPrimitive.Portal>
    </SelectPrimitive.Root>
  );
}

/* ── Helpers ─────────────────────────────────────────────────────────────── */
function WealthCard({ label, value, color, icon, sub, trend }) {
  return (
    <motion.div initial={{opacity:0,y:8}} animate={{opacity:1,y:0}}
      className="rounded-2xl p-4 relative overflow-hidden"
      style={{ background:`linear-gradient(135deg, ${color}0A, rgba(6,8,16,0.6))`, border:`1px solid ${color}22` }}
      whileHover={{ scale:1.02, transition:{ duration:0.15 } }}>
      <div className="absolute -top-4 -right-4 w-14 h-14 rounded-full pointer-events-none"
        style={{ background:`radial-gradient(circle, ${color}20, transparent 70%)` }}/>
      <div className="flex items-center justify-between mb-2">
        <span className="font-mono text-[9px] uppercase tracking-[0.15em] text-slate-500">{label}</span>
        <div className="w-7 h-7 rounded-xl flex items-center justify-center" style={{ background:`${color}18` }}>
          <i className={`fa-solid ${icon} text-[11px]`} style={{ color }}/>
        </div>
      </div>
      <div className="font-heading text-2xl font-bold tracking-tight" style={{ color }}>
        ₹{Math.abs(value).toFixed(0)}
      </div>
      {sub && <div className="text-[9px] font-mono text-slate-500 mt-0.5">{sub}</div>}
      {trend !== undefined && (
        <div className="flex items-center gap-1 mt-1.5">
          <i className={`fa-solid fa-arrow-trend-${trend>=0?"up":"down"} text-[9px]`} style={{ color:trend>=0?"#39FF14":"#FF003C" }}/>
          <span className="text-[9px] font-mono" style={{ color:trend>=0?"#39FF14":"#FF003C" }}>{trend>=0?"+":""}{trend}% vs last month</span>
        </div>
      )}
    </motion.div>
  );
}

function ChartTooltip({ active, payload }) {
  if (!active||!payload?.length) return null;
  return (
    <div style={{ background:"rgba(8,10,18,0.95)", border:"1px solid rgba(0,240,255,0.2)", borderRadius:10, padding:"8px 12px", fontFamily:"'JetBrains Mono',monospace", fontSize:11 }}>
      <div style={{ color:"#94A3B8", textTransform:"uppercase", letterSpacing:"0.08em", marginBottom:2 }}>{payload[0]?.payload?.name}</div>
      <div style={{ color:"#00F0FF", fontWeight:700 }}>₹{payload[0]?.value?.toFixed(0)}</div>
    </div>
  );
}

function AIInsight({ text, type="info" }) {
  const colors = { info:"#00F0FF", warn:"#FCEE09", good:"#39FF14", bad:"#FF003C" };
  const icons  = { info:"fa-wand-magic-sparkles", warn:"fa-triangle-exclamation", good:"fa-circle-check", bad:"fa-circle-xmark" };
  const col = colors[type]||colors.info;
  return (
    <motion.div initial={{opacity:0,x:-6}} animate={{opacity:1,x:0}}
      className="flex items-start gap-2.5 p-3 rounded-xl"
      style={{ background:`${col}08`, border:`1px solid ${col}18` }}>
      <i className={`fa-solid ${icons[type]} text-[11px] mt-0.5 flex-shrink-0`} style={{ color:col }}/>
      <p className="text-[11px] text-slate-300 leading-relaxed">{text}</p>
    </motion.div>
  );
}

function GoalBar({ label, current, target, color }) {
  const pct = Math.min((current/target)*100, 100);
  return (
    <div className="space-y-1.5">
      <div className="flex items-center justify-between">
        <span className="text-sm text-slate-300">{label}</span>
        <span className="font-mono text-xs" style={{ color }}>₹{current.toFixed(0)} / ₹{target.toFixed(0)}</span>
      </div>
      <div className="h-2 rounded-full overflow-hidden" style={{ background:"rgba(255,255,255,0.05)" }}>
        <motion.div className="h-full rounded-full"
          initial={{width:0}} animate={{width:`${pct}%`}}
          transition={{ duration:0.9, ease:[0.22,1,0.36,1], delay:0.2 }}
          style={{ background:`linear-gradient(90deg, ${color}, ${color}80)`, boxShadow:`0 0 8px ${color}40` }}/>
      </div>
      <div className="text-[10px] font-mono text-slate-600">{pct.toFixed(0)}% of goal</div>
    </div>
  );
}

/* ── Sparkline data ─────────────────────────────────────────────────────── */
const genSparkline = (base, variance) =>
  Array.from({ length:7 }, (_, i) => ({ day:["Mon","Tue","Wed","Thu","Fri","Sat","Sun"][i], value: Math.max(0, base + (Math.random()-0.5)*variance) }));

/* ── Finance ─────────────────────────────────────────────────────────────── */
const TABS = [
  { id:"overview",  label:"Overview",  icon:"fa-chart-pie"    },
  { id:"cashflow",  label:"Cashflow",  icon:"fa-chart-line"   },
  { id:"goals",     label:"Goals",     icon:"fa-bullseye"     },
  { id:"add",       label:"Add",       icon:"fa-plus"         },
];

export default function Finance() {
  const [txns, setTxns] = useState([]);
  const [tab,  setTab]  = useState("overview");
  const [form, setForm] = useState({ title:"", amount:"", category:"food", type:"expense", date:new Date().toISOString().slice(0,10) });
  const [adding, setAdding] = useState(false);

  const load = useCallback(()=>c.list().then(setTxns).catch(()=>{}),[]);
  useEffect(()=>{ load(); },[load]);

  const add = async () => {
    if (!form.title.trim()||!form.amount) return;
    setAdding(true);
    try {
      await c.create({ ...form, amount:parseFloat(form.amount) });
      setForm(f=>({ ...f, title:"", amount:"" }));
      setTab("overview");
      load();
    } finally { setAdding(false); }
  };

  const del = async (id) => { await c.remove(id); load(); };

  const income  = txns.filter(t=>t.type==="income").reduce((s,t)=>s+t.amount,0);
  const expense = txns.filter(t=>t.type==="expense").reduce((s,t)=>s+t.amount,0);
  const net     = income - expense;
  const burnRate= expense / Math.max(new Date().getDate(),1);
  const savingsRate = income>0 ? ((income-expense)/income*100) : 0;

  const byCat = CATEGORIES.map(cat=>({
    name:cat.label,
    amount:txns.filter(t=>t.category===cat.value&&t.type==="expense").reduce((s,t)=>s+t.amount,0),
  })).filter(d=>d.amount>0);

  const pieCat = byCat.slice(0,5);
  const PIE_COLORS = ["#00F0FF","#FF003C","#FCEE09","#C778DD","#39FF14"];

  const catInfo  = v => CATEGORIES.find(c=>c.value===v);
  const typeInfo = v => TYPES.find(t=>t.value===v);

  const sparklineData = genSparkline(expense/7||200, 150);
  const catOpts  = CATEGORIES.map(c=>({ ...c, emoji:c.icon }));
  const typeOpts = TYPES.map(t=>({ ...t }));

  const wealthScore = Math.max(0, Math.min(100, Math.round(savingsRate*0.6 + (net>=0?30:0) + (txns.length>5?10:0))));
  const wsColor = wealthScore>=70?"#39FF14":wealthScore>=40?"#FCEE09":"#FF003C";

  const insights = [
    net>=0
      ? { text:`Net balance is positive (+₹${net.toFixed(0)}). You're staying within budget.`, type:"good" }
      : { text:`You're spending ₹${Math.abs(net).toFixed(0)} more than you earn this period. Review your expenses.`, type:"bad" },
    burnRate>0
      ? { text:`Daily burn rate is ₹${burnRate.toFixed(0)}/day. Projected monthly spend: ₹${(burnRate*30).toFixed(0)}.`, type:"info" }
      : null,
    savingsRate > 20
      ? { text:`Excellent savings rate at ${savingsRate.toFixed(0)}%. You're building long-term wealth.`, type:"good" }
      : savingsRate > 0
      ? { text:`Savings rate is ${savingsRate.toFixed(0)}%. Aim for 20%+ for healthy financial growth.`, type:"warn" }
      : null,
  ].filter(Boolean);

  return (
    <div className="flex flex-col h-full text-white" data-testid="finance-app"
      style={{ background:"linear-gradient(135deg, rgba(57,255,20,0.02) 0%, transparent 60%)" }}>

      {/* Header */}
      <div className="flex-shrink-0 px-5 pt-4 pb-3 flex items-center justify-between"
        style={{ borderBottom:"1px solid rgba(255,255,255,0.06)" }}>
        <div>
          <div className="font-mono text-[9px] uppercase tracking-[0.18em] text-slate-500 mb-0.5">// AI Wealth Center</div>
          <h2 className="font-heading text-2xl font-black tracking-tight" style={{ color:"#39FF14" }}>Finance</h2>
        </div>
        {/* Wealth score ring */}
        <div className="flex flex-col items-center">
          <div className="relative w-14 h-14">
            <svg width={56} height={56} viewBox="0 0 56 56">
              <circle cx={28} cy={28} r={23} fill="none" stroke="rgba(255,255,255,0.05)" strokeWidth={5}/>
              <motion.circle cx={28} cy={28} r={23} fill="none" stroke={wsColor} strokeWidth={5}
                strokeLinecap="round"
                initial={{ strokeDasharray:"0 145" }}
                animate={{ strokeDasharray:`${(wealthScore/100)*108} 145` }}
                transition={{ duration:1.2, delay:0.3, ease:[0.22,1,0.36,1] }}
                style={{ transform:"rotate(-90deg)", transformOrigin:"center", filter:`drop-shadow(0 0 4px ${wsColor}80)` }}/>
              <text x="50%" y="52%" textAnchor="middle" dominantBaseline="middle"
                fill={wsColor} fontSize={13} fontWeight={800} fontFamily="'JetBrains Mono',monospace">
                {wealthScore}
              </text>
            </svg>
          </div>
          <div className="font-mono text-[8px] uppercase tracking-widest text-slate-500 mt-0.5">AI Score</div>
        </div>
      </div>

      {/* Tab bar */}
      <div className="flex gap-1 px-5 py-2.5 overflow-x-auto" style={{ borderBottom:"1px solid rgba(255,255,255,0.05)" }}>
        {TABS.map(t=>(
          <button key={t.id} onClick={()=>setTab(t.id)}
            className="flex items-center gap-1.5 px-3 py-1.5 rounded-lg text-[11px] font-mono transition-all flex-shrink-0"
            style={{ background:tab===t.id?"rgba(57,255,20,0.12)":"rgba(255,255,255,0.04)", border:tab===t.id?"1px solid rgba(57,255,20,0.28)":"1px solid rgba(255,255,255,0.06)", color:tab===t.id?"#39FF14":"rgba(255,255,255,0.45)", cursor:"pointer" }}>
            <i className={`fa-solid ${t.icon} text-[10px]`}/>{t.label}
          </button>
        ))}
      </div>

      {/* Body */}
      <div className="flex-1 overflow-y-auto scrollbar-none">
        <AnimatePresence mode="wait">

          {tab==="overview" && (
            <motion.div key="overview" initial={{opacity:0,y:8}} animate={{opacity:1,y:0}} exit={{opacity:0}} transition={{duration:0.25}} className="p-4 sm:p-5 space-y-4">

              {/* KPIs */}
              <div className="grid grid-cols-2 sm:grid-cols-3 gap-3">
                <WealthCard label="Total Income"  value={income}   color="#39FF14" icon="fa-arrow-trend-up"   trend={8}  sub="This period"/>
                <WealthCard label="Total Expense" value={expense}  color="#FF003C" icon="fa-arrow-trend-down" trend={-12} sub="Spending"/>
                <WealthCard label="Net Balance"   value={net}      color={net>=0?"#00F0FF":"#FF003C"} icon="fa-coins" sub="Cash position"
                  className="col-span-2 sm:col-span-1"/>
              </div>

              {/* Burn rate + savings */}
              <div className="grid grid-cols-2 gap-3">
                <div className="rounded-xl p-3" style={{ background:"rgba(255,255,255,0.025)", border:"1px solid rgba(255,255,255,0.06)" }}>
                  <div className="font-mono text-[9px] uppercase tracking-widest text-slate-500 mb-1">Daily Burn</div>
                  <div className="font-heading text-xl font-bold" style={{ color:"#FCEE09" }}>₹{burnRate.toFixed(0)}<span className="text-sm font-normal text-slate-500">/day</span></div>
                </div>
                <div className="rounded-xl p-3" style={{ background:"rgba(255,255,255,0.025)", border:"1px solid rgba(255,255,255,0.06)" }}>
                  <div className="font-mono text-[9px] uppercase tracking-widest text-slate-500 mb-1">Savings Rate</div>
                  <div className="font-heading text-xl font-bold" style={{ color:savingsRate>=20?"#39FF14":"#FF003C" }}>{savingsRate.toFixed(0)}%</div>
                </div>
              </div>

              {/* Category bar chart */}
              <div className="rounded-2xl p-4" style={{ background:"rgba(6,8,16,0.55)", border:"1px solid rgba(255,255,255,0.06)" }}>
                <div className="font-mono text-[9px] uppercase tracking-[0.15em] text-slate-500 mb-3">// Spending by Category</div>
                <div className="h-40">
                  <ResponsiveContainer width="100%" height="100%">
                    <BarChart data={byCat} margin={{top:2,right:4,bottom:0,left:-18}}>
                      <CartesianGrid stroke="rgba(255,255,255,0.04)" vertical={false}/>
                      <XAxis dataKey="name" tick={{fill:"#64748B",fontSize:9,fontFamily:"'JetBrains Mono',monospace"}} axisLine={false} tickLine={false}/>
                      <YAxis tick={{fill:"#64748B",fontSize:9,fontFamily:"'JetBrains Mono',monospace"}} axisLine={false} tickLine={false}/>
                      <Tooltip content={<ChartTooltip/>} cursor={{fill:"rgba(255,255,255,0.03)"}}/>
                      <Bar dataKey="amount" radius={[6,6,0,0]} maxBarSize={28}>
                        {byCat.map((_,i)=><Cell key={i} fill={CATEGORIES[i%CATEGORIES.length]?.color||"#00F0FF"} fillOpacity={0.85}/>)}
                      </Bar>
                    </BarChart>
                  </ResponsiveContainer>
                </div>
              </div>

              {/* AI Insights */}
              <div className="space-y-2">
                <div className="font-mono text-[9px] uppercase tracking-[0.18em] text-slate-600">// Cortex Insights</div>
                {insights.map((ins,i)=><AIInsight key={i} {...ins}/>)}
              </div>

              {/* Transaction list */}
              <div>
                <div className="font-mono text-[9px] uppercase tracking-[0.15em] text-slate-500 mb-2">// Recent Transactions</div>
                <div className="space-y-1.5">
                  <AnimatePresence initial={false}>
                    {txns.slice(0,8).map(t=>{
                      const ci=catInfo(t.category); const ti=typeInfo(t.type);
                      return (
                        <motion.div key={t.id}
                          initial={{opacity:0,y:-6,scale:0.98}} animate={{opacity:1,y:0,scale:1}} exit={{opacity:0,x:20,scale:0.96}}
                          transition={{duration:0.2,ease:[0.22,1,0.36,1]}}
                          className="group flex items-center gap-3 rounded-xl px-3 py-2.5"
                          style={{ background:"rgba(255,255,255,0.025)", border:"1px solid rgba(255,255,255,0.05)" }}
                          onMouseEnter={e=>{e.currentTarget.style.borderColor="rgba(255,255,255,0.10)";}}
                          onMouseLeave={e=>{e.currentTarget.style.borderColor="rgba(255,255,255,0.05)";}}>
                          <div className="w-8 h-8 rounded-xl flex items-center justify-center flex-shrink-0 text-sm"
                            style={{ background:`${ci?.color??"#00F0FF"}14` }}>
                            {ci?.icon??"💸"}
                          </div>
                          <div className="flex-1 min-w-0">
                            <div className="text-sm font-medium truncate">{t.title}</div>
                            <div className="flex items-center gap-1.5 mt-0.5">
                              <span className="text-[10px] font-mono text-slate-500 uppercase">{t.category}</span>
                              <span className="text-slate-700 text-[10px]">·</span>
                              <span className="text-[10px] font-mono text-slate-600">{t.date}</span>
                            </div>
                          </div>
                          <div className="flex items-center gap-2 flex-shrink-0">
                            <span className="font-mono font-bold text-sm" style={{ color:ti?.color??"#fff" }}>
                              {t.type==="income"?"+":"−"}₹{t.amount.toFixed(0)}
                            </span>
                            <motion.button whileTap={{scale:0.85}} onClick={()=>del(t.id)}
                              className="w-6 h-6 rounded-lg flex items-center justify-center opacity-0 group-hover:opacity-100 transition-opacity"
                              style={{ color:"#FF003C" }}>
                              <i className="fa-solid fa-xmark text-[11px]"/>
                            </motion.button>
                          </div>
                        </motion.div>
                      );
                    })}
                  </AnimatePresence>
                  {txns.length===0 && (
                    <div className="flex flex-col items-center justify-center py-10 gap-3">
                      <div className="w-12 h-12 rounded-2xl flex items-center justify-center"
                        style={{ background:"rgba(57,255,20,0.07)", border:"1px solid rgba(57,255,20,0.12)" }}>
                        <i className="fa-solid fa-coins text-[#39FF14]"/>
                      </div>
                      <div className="text-slate-500 text-sm text-center">
                        No transactions yet.<br/>
                        <span className="text-slate-600 text-xs">Use the Add tab to track your first transaction.</span>
                      </div>
                    </div>
                  )}
                </div>
              </div>
            </motion.div>
          )}

          {tab==="cashflow" && (
            <motion.div key="cashflow" initial={{opacity:0,y:8}} animate={{opacity:1,y:0}} exit={{opacity:0}} transition={{duration:0.25}} className="p-4 sm:p-5 space-y-4">
              <div className="rounded-2xl p-4" style={{ background:"rgba(6,8,16,0.55)", border:"1px solid rgba(255,255,255,0.06)" }}>
                <div className="font-mono text-[9px] uppercase tracking-[0.15em] text-slate-500 mb-1">// 7-Day Expense Trend</div>
                <h3 className="font-heading text-lg font-bold mb-3">Cashflow Timeline</h3>
                <div className="h-48">
                  <ResponsiveContainer>
                    <AreaChart data={sparklineData} margin={{top:4,right:4,bottom:0,left:-18}}>
                      <defs>
                        <linearGradient id="cashGrad" x1="0" y1="0" x2="0" y2="1">
                          <stop offset="0%" stopColor="#FF003C" stopOpacity={0.4}/>
                          <stop offset="100%" stopColor="#FF003C" stopOpacity={0}/>
                        </linearGradient>
                      </defs>
                      <CartesianGrid stroke="rgba(255,255,255,0.04)" vertical={false}/>
                      <XAxis dataKey="day" tick={{fill:"#64748B",fontSize:9,fontFamily:"monospace"}} axisLine={false} tickLine={false}/>
                      <YAxis tick={{fill:"#64748B",fontSize:9,fontFamily:"monospace"}} axisLine={false} tickLine={false}/>
                      <Tooltip contentStyle={{ background:"rgba(8,10,18,0.95)", border:"1px solid rgba(255,0,60,0.2)", borderRadius:8, fontFamily:"monospace", fontSize:11 }}/>
                      <Area dataKey="value" name="Spend" stroke="#FF003C" fill="url(#cashGrad)" strokeWidth={2} dot={false}/>
                    </AreaChart>
                  </ResponsiveContainer>
                </div>
              </div>

              {/* Category pie */}
              {pieCat.length>0 && (
                <div className="rounded-2xl p-4" style={{ background:"rgba(6,8,16,0.55)", border:"1px solid rgba(255,255,255,0.06)" }}>
                  <div className="font-mono text-[9px] uppercase tracking-[0.15em] text-slate-500 mb-1">// Category Breakdown</div>
                  <h3 className="font-heading text-lg font-bold mb-3">Expense Distribution</h3>
                  <div className="flex items-center gap-4">
                    <div className="h-44 flex-1">
                      <ResponsiveContainer>
                        <PieChart>
                          <Pie data={pieCat} dataKey="amount" cx="50%" cy="50%" innerRadius={36} outerRadius={72} paddingAngle={2}>
                            {pieCat.map((_,i)=><Cell key={i} fill={PIE_COLORS[i%PIE_COLORS.length]}/>)}
                          </Pie>
                          <Tooltip contentStyle={{ background:"rgba(8,10,18,0.95)", border:"1px solid rgba(0,240,255,0.2)", borderRadius:8, fontFamily:"monospace", fontSize:11 }}/>
                        </PieChart>
                      </ResponsiveContainer>
                    </div>
                    <div className="space-y-2 flex-shrink-0">
                      {pieCat.map((d,i)=>(
                        <div key={d.name} className="flex items-center gap-2">
                          <div className="w-2.5 h-2.5 rounded-sm flex-shrink-0" style={{ background:PIE_COLORS[i%PIE_COLORS.length] }}/>
                          <span className="text-xs text-slate-300 flex-1">{d.name}</span>
                          <span className="font-mono text-[10px] text-slate-400">₹{d.amount.toFixed(0)}</span>
                        </div>
                      ))}
                    </div>
                  </div>
                </div>
              )}

              {/* Monthly forecast */}
              <div className="rounded-2xl p-4" style={{ background:"linear-gradient(135deg, rgba(0,240,255,0.06), rgba(0,240,255,0.01))", border:"1px solid rgba(0,240,255,0.15)" }}>
                <div className="flex items-center gap-2 mb-2">
                  <i className="fa-solid fa-wand-magic-sparkles text-[11px]" style={{ color:"#00F0FF" }}/>
                  <span className="font-mono text-[9px] uppercase tracking-widest" style={{ color:"#00F0FF" }}>Cortex Forecast</span>
                </div>
                <p className="text-sm text-slate-300 leading-relaxed">
                  Based on current burn rate of <strong className="text-white">₹{burnRate.toFixed(0)}/day</strong>, 
                  you're projected to spend <strong style={{ color:"#FF003C" }}>₹{(burnRate*30).toFixed(0)}</strong> this month. 
                  {income>0 ? ` That leaves ₹${(income-burnRate*30).toFixed(0)} for savings and investments.` : " Add income transactions to see your full financial picture."}
                </p>
              </div>
            </motion.div>
          )}

          {tab==="goals" && (
            <motion.div key="goals" initial={{opacity:0,y:8}} animate={{opacity:1,y:0}} exit={{opacity:0}} transition={{duration:0.25}} className="p-4 sm:p-5 space-y-4">
              <div className="rounded-2xl p-5" style={{ background:"rgba(6,8,16,0.55)", border:"1px solid rgba(255,255,255,0.06)" }}>
                <div className="font-mono text-[9px] uppercase tracking-[0.15em] text-slate-500 mb-1">// Financial Goals</div>
                <h3 className="font-heading text-lg font-bold mb-4">Progress Tracker</h3>
                <div className="space-y-5">
                  <GoalBar label="Emergency Fund"   current={Math.min(income*0.3,30000)} target={50000}  color="#00F0FF"/>
                  <GoalBar label="Monthly Savings"  current={Math.max(0,net)}             target={10000}  color="#39FF14"/>
                  <GoalBar label="Investment Fund"  current={income*0.1}                  target={25000}  color="#C778DD"/>
                  <GoalBar label="Vacation Budget"  current={income*0.05}                 target={15000}  color="#FCEE09"/>
                </div>
              </div>

              <div className="rounded-2xl p-4" style={{ background:"rgba(6,8,16,0.55)", border:"1px solid rgba(255,255,255,0.06)" }}>
                <div className="font-mono text-[9px] uppercase tracking-[0.15em] text-slate-500 mb-3">// AI Wealth Score Breakdown</div>
                <div className="space-y-3">
                  {[
                    { label:"Savings Discipline", value:Math.round(savingsRate*2), color:"#39FF14" },
                    { label:"Budget Adherence",   value:net>=0?75:30,             color:"#00F0FF" },
                    { label:"Transaction History",value:Math.min(txns.length*8,100), color:"#C778DD" },
                  ].map((m,i)=>(
                    <div key={m.label}>
                      <div className="flex justify-between mb-1"><span className="text-sm text-slate-300">{m.label}</span><span className="font-mono text-xs" style={{ color:m.color }}>{m.value}/100</span></div>
                      <div className="h-1.5 rounded-full overflow-hidden" style={{ background:"rgba(255,255,255,0.05)" }}>
                        <motion.div className="h-full rounded-full" initial={{width:0}} animate={{width:`${m.value}%`}}
                          transition={{delay:0.1+i*0.07,duration:0.9,ease:[0.22,1,0.36,1]}}
                          style={{ background:`linear-gradient(90deg, ${m.color}, ${m.color}70)` }}/>
                      </div>
                    </div>
                  ))}
                </div>
              </div>
            </motion.div>
          )}

          {tab==="add" && (
            <motion.div key="add" initial={{opacity:0,y:8}} animate={{opacity:1,y:0}} exit={{opacity:0}} transition={{duration:0.25}} className="p-4 sm:p-5 max-w-sm mx-auto space-y-3">
              <div className="font-mono text-[9px] uppercase tracking-[0.15em] text-slate-500 mb-1">// New Transaction</div>
              <h3 className="font-heading text-lg font-bold mb-3">Add Entry</h3>

              <div>
                <label className="text-[10px] font-mono text-slate-500 uppercase tracking-widest block mb-1.5">Title</label>
                <input data-testid="txn-title" value={form.title} onChange={e=>setForm({...form,title:e.target.value})}
                  onKeyDown={e=>e.key==="Enter"&&add()} placeholder="e.g. Grocery run" className="input-cyber"/>
              </div>
              <div>
                <label className="text-[10px] font-mono text-slate-500 uppercase tracking-widest block mb-1.5">Amount (₹)</label>
                <input data-testid="txn-amount" type="number" min="0" step="0.01" value={form.amount}
                  onChange={e=>setForm({...form,amount:e.target.value})} placeholder="0.00" className="input-cyber"/>
              </div>
              <div>
                <label className="text-[10px] font-mono text-slate-500 uppercase tracking-widest block mb-1.5">Category</label>
                <CyberSelect value={form.category} onValueChange={v=>setForm({...form,category:v})} options={catOpts} placeholder="Select category"/>
              </div>
              <div>
                <label className="text-[10px] font-mono text-slate-500 uppercase tracking-widest block mb-1.5">Type</label>
                <CyberSelect value={form.type} onValueChange={v=>setForm({...form,type:v})} options={typeOpts} placeholder="Select type"/>
              </div>
              <div>
                <label className="text-[10px] font-mono text-slate-500 uppercase tracking-widest block mb-1.5">Date</label>
                <input type="date" value={form.date} onChange={e=>setForm({...form,date:e.target.value})} className="input-cyber"/>
              </div>
              <motion.button data-testid="txn-add" onClick={add} whileTap={{scale:0.96}}
                disabled={adding||!form.title.trim()||!form.amount}
                className="neon-btn primary w-full justify-center mt-2">
                {adding ? <><i className="fa-solid fa-spinner fa-spin text-[11px]"/> Adding…</> : <><i className="fa-solid fa-plus text-[11px]"/> Add Transaction</>}
              </motion.button>
            </motion.div>
          )}

        </AnimatePresence>
      </div>
    </div>
  );
}
