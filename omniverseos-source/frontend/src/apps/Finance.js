import React, { useEffect, useState, useCallback } from "react";
import { motion, AnimatePresence } from "framer-motion";
import * as SelectPrimitive from "@radix-ui/react-select";
import { crud } from "../lib/api";
import {
  BarChart, Bar, XAxis, YAxis, Tooltip,
  ResponsiveContainer, CartesianGrid, Cell,
} from "recharts";

/* ─────────────────────────────────────────────────────────────────────────────
   Data
   ───────────────────────────────────────────────────────────────────────────── */
const c = crud("transactions");

const CATEGORIES = [
  { value: "food",          label: "Food",          icon: "🍜", color: "#00F0FF" },
  { value: "transport",     label: "Transport",      icon: "🚌", color: "#FCEE09" },
  { value: "shopping",      label: "Shopping",       icon: "🛍️", color: "#FF003C" },
  { value: "rent",          label: "Rent",           icon: "🏠", color: "#C778DD" },
  { value: "salary",        label: "Salary",         icon: "💼", color: "#39FF14" },
  { value: "freelance",     label: "Freelance",      icon: "💻", color: "#FF6B35" },
  { value: "entertainment", label: "Entertainment",  icon: "🎮", color: "#00F0FF" },
];

const TYPES = [
  { value: "expense", label: "Expense", color: "#FF003C", icon: "fa-arrow-trend-down" },
  { value: "income",  label: "Income",  color: "#39FF14", icon: "fa-arrow-trend-up"   },
];

const BAR_COLORS = ["#00F0FF", "#FF003C", "#FCEE09", "#39FF14", "#C778DD", "#FF6B35", "#00F0FF"];

/* ─────────────────────────────────────────────────────────────────────────────
   CyberSelect — themed Radix Select (self-contained)
   ───────────────────────────────────────────────────────────────────────────── */
function CyberSelect({ value, onValueChange, options, placeholder }) {
  return (
    <SelectPrimitive.Root value={value} onValueChange={onValueChange}>
      <SelectPrimitive.Trigger
        className="input-cyber flex items-center justify-between gap-2 cursor-pointer"
        style={{ userSelect: "none" }}
      >
        <SelectPrimitive.Value placeholder={placeholder}>
          {/* Show icon + label for selected option */}
          {(() => {
            const opt = options.find((o) => o.value === value);
            if (!opt) return placeholder;
            return (
              <span className="flex items-center gap-2">
                {opt.emoji && <span>{opt.emoji}</span>}
                {opt.label}
              </span>
            );
          })()}
        </SelectPrimitive.Value>
        <SelectPrimitive.Icon>
          <i className="fa-solid fa-chevron-down text-[9px] opacity-40 flex-shrink-0" />
        </SelectPrimitive.Icon>
      </SelectPrimitive.Trigger>

      <SelectPrimitive.Portal>
        <SelectPrimitive.Content
          position="popper"
          sideOffset={6}
          style={{
            background: "rgba(8,10,18,0.97)",
            backdropFilter: "blur(28px)",
            border: "1px solid rgba(0,240,255,0.18)",
            borderRadius: 14, padding: "6px",
            boxShadow: "0 20px 60px rgba(0,0,0,0.75), 0 0 0 1px rgba(0,240,255,0.06)",
            zIndex: 9999, minWidth: 200,
            animation: "selectSlide 0.15s ease",
          }}
        >
          <SelectPrimitive.Viewport>
            {options.map((opt) => (
              <SelectPrimitive.Item key={opt.value} value={opt.value} style={{ outline: "none" }}>
                {({ isSelected }) => (
                  <div
                    style={{
                      display: "flex", alignItems: "center", justifyContent: "space-between",
                      gap: 10, padding: "8px 12px", borderRadius: 9, cursor: "pointer",
                      fontFamily: "'Outfit', sans-serif", fontSize: 13,
                      color: isSelected ? (opt.color ?? "#00F0FF") : "rgba(255,255,255,0.85)",
                      background: isSelected ? `${opt.color ?? "#00F0FF"}14` : "transparent",
                      transition: "background 0.1s",
                    }}
                    onMouseEnter={e => { if (!isSelected) e.currentTarget.style.background = "rgba(255,255,255,0.05)"; }}
                    onMouseLeave={e => { e.currentTarget.style.background = isSelected ? `${opt.color ?? "#00F0FF"}14` : "transparent"; }}
                  >
                    <span className="flex items-center gap-2.5">
                      {opt.emoji && <span style={{ fontSize: 15 }}>{opt.emoji}</span>}
                      {opt.icon && <i className={`fa-solid ${opt.icon} text-[11px]`} style={{ color: opt.color, width: 14 }} />}
                      <SelectPrimitive.ItemText>{opt.label}</SelectPrimitive.ItemText>
                    </span>
                    {isSelected && (
                      <i className="fa-solid fa-check text-[10px]" style={{ color: opt.color ?? "#00F0FF" }} />
                    )}
                  </div>
                )}
              </SelectPrimitive.Item>
            ))}
          </SelectPrimitive.Viewport>
        </SelectPrimitive.Content>
      </SelectPrimitive.Portal>
    </SelectPrimitive.Root>
  );
}

/* ─────────────────────────────────────────────────────────────────────────────
   Stat card
   ───────────────────────────────────────────────────────────────────────────── */
function StatCard({ label, value, color, icon }) {
  return (
    <motion.div
      initial={{ opacity: 0, y: 8 }}
      animate={{ opacity: 1, y: 0 }}
      className="glass-light rounded-2xl p-4"
      style={{ border: `1px solid ${color}18` }}
    >
      <div className="flex items-center justify-between mb-2">
        <span className="mono-label text-[10px]">{label}</span>
        <div
          className="w-7 h-7 rounded-lg flex items-center justify-center"
          style={{ background: `${color}18` }}
        >
          <i className={`fa-solid ${icon} text-[11px]`} style={{ color }} />
        </div>
      </div>
      <div className="font-heading text-2xl font-bold tracking-tight" style={{ color }}>
        ₹{Math.abs(value).toFixed(2)}
      </div>
      {value < 0 && (
        <div className="text-[10px] font-mono text-red-400 mt-0.5 opacity-70">deficit</div>
      )}
    </motion.div>
  );
}

/* ─────────────────────────────────────────────────────────────────────────────
   Custom chart tooltip
   ───────────────────────────────────────────────────────────────────────────── */
function ChartTooltip({ active, payload }) {
  if (!active || !payload?.length) return null;
  return (
    <div style={{
      background: "rgba(8,10,18,0.95)", border: "1px solid rgba(0,240,255,0.2)",
      borderRadius: 10, padding: "8px 12px", fontFamily: "'JetBrains Mono', monospace", fontSize: 11,
    }}>
      <div style={{ color: "#94A3B8", textTransform: "uppercase", letterSpacing: "0.08em", marginBottom: 2 }}>
        {payload[0]?.payload?.name}
      </div>
      <div style={{ color: "#00F0FF", fontWeight: 700 }}>₹{payload[0]?.value?.toFixed(2)}</div>
    </div>
  );
}

/* ─────────────────────────────────────────────────────────────────────────────
   Finance
   ───────────────────────────────────────────────────────────────────────────── */
export default function Finance() {
  const [txns, setTxns] = useState([]);
  const [form, setForm] = useState({
    title: "", amount: "", category: "food", type: "expense",
    date: new Date().toISOString().slice(0, 10),
  });
  const [adding, setAdding] = useState(false);

  const load = useCallback(() => c.list().then(setTxns).catch(() => {}), []);
  useEffect(() => { load(); }, [load]);

  const add = async () => {
    if (!form.title.trim() || !form.amount) return;
    setAdding(true);
    try {
      await c.create({ ...form, amount: parseFloat(form.amount) });
      setForm((f) => ({ ...f, title: "", amount: "" }));
      load();
    } finally {
      setAdding(false);
    }
  };

  const del = async (id) => { await c.remove(id); load(); };

  const income  = txns.filter((t) => t.type === "income").reduce((s, t) => s + t.amount, 0);
  const expense = txns.filter((t) => t.type === "expense").reduce((s, t) => s + t.amount, 0);
  const net     = income - expense;

  const byCat = CATEGORIES.map((cat) => ({
    name: cat.label,
    amount: txns
      .filter((t) => t.category === cat.value && t.type === "expense")
      .reduce((s, t) => s + t.amount, 0),
  }));

  const catInfo  = (v) => CATEGORIES.find((c) => c.value === v);
  const typeInfo = (v) => TYPES.find((t) => t.value === v);

  const catOpts  = CATEGORIES.map((c) => ({ ...c, emoji: c.icon }));
  const typeOpts = TYPES.map((t)      => ({ ...t }));

  return (
    <div className="flex flex-col md:grid md:grid-cols-3 h-full text-white" data-testid="finance-app">

      {/* ── Main panel ──────────────────────────────────────────── */}
      <div className="md:col-span-2 p-4 sm:p-5 overflow-y-auto scrollbar-none">
        <div className="mono-label mb-0.5">// Wealth Index</div>
        <h2 className="font-heading text-2xl font-bold tracking-tight mb-4">Finance</h2>

        {/* Stats */}
        <div className="grid grid-cols-1 sm:grid-cols-3 gap-3 mb-5">
          <StatCard label="Income"  value={income}  color="#39FF14" icon="fa-arrow-trend-up"   />
          <StatCard label="Expense" value={expense} color="#FF003C" icon="fa-arrow-trend-down" />
          <StatCard label="Net"     value={net}     color={net >= 0 ? "#00F0FF" : "#FF003C"} icon="fa-coins" />
        </div>

        {/* Bar chart */}
        <div className="glass-light rounded-2xl p-4 mb-4" style={{ border: "1px solid rgba(255,255,255,0.05)" }}>
          <div className="mono-label mb-3 text-[10px]">// Spending by Category</div>
          <div className="h-44">
            <ResponsiveContainer width="100%" height="100%">
              <BarChart data={byCat} margin={{ top: 2, right: 4, bottom: 0, left: -18 }}>
                <CartesianGrid stroke="rgba(255,255,255,0.04)" vertical={false} />
                <XAxis
                  dataKey="name" tick={{ fill: "#64748B", fontSize: 9, fontFamily: "'JetBrains Mono',monospace" }}
                  axisLine={false} tickLine={false}
                />
                <YAxis
                  tick={{ fill: "#64748B", fontSize: 9, fontFamily: "'JetBrains Mono',monospace" }}
                  axisLine={false} tickLine={false}
                />
                <Tooltip content={<ChartTooltip />} cursor={{ fill: "rgba(255,255,255,0.03)" }} />
                <Bar dataKey="amount" radius={[6, 6, 0, 0]} maxBarSize={32}>
                  {byCat.map((_, i) => <Cell key={i} fill={BAR_COLORS[i % BAR_COLORS.length]} fillOpacity={0.85} />)}
                </Bar>
              </BarChart>
            </ResponsiveContainer>
          </div>
        </div>

        {/* Transaction list */}
        <div className="space-y-1.5">
          <AnimatePresence initial={false}>
            {txns.map((t) => {
              const ci = catInfo(t.category);
              const ti = typeInfo(t.type);
              return (
                <motion.div
                  key={t.id}
                  initial={{ opacity: 0, y: -6, scale: 0.98 }}
                  animate={{ opacity: 1, y: 0, scale: 1 }}
                  exit={{ opacity: 0, x: 20, scale: 0.96 }}
                  transition={{ duration: 0.2, ease: [0.22, 1, 0.36, 1] }}
                  className="group flex items-center gap-3 rounded-xl px-3 py-2.5"
                  style={{
                    background: "rgba(255,255,255,0.025)",
                    border: "1px solid rgba(255,255,255,0.05)",
                    transition: "border-color 0.18s",
                  }}
                  onMouseEnter={e => { e.currentTarget.style.borderColor = "rgba(255,255,255,0.10)"; }}
                  onMouseLeave={e => { e.currentTarget.style.borderColor = "rgba(255,255,255,0.05)"; }}
                >
                  {/* Category icon */}
                  <div
                    className="w-8 h-8 rounded-xl flex items-center justify-center flex-shrink-0 text-sm"
                    style={{ background: `${ci?.color ?? "#00F0FF"}14` }}
                  >
                    {ci?.icon ?? "💸"}
                  </div>

                  {/* Info */}
                  <div className="flex-1 min-w-0">
                    <div className="text-sm font-medium truncate">{t.title}</div>
                    <div className="flex items-center gap-1.5 mt-0.5">
                      <span className="text-[10px] font-mono text-slate-500 uppercase">{t.category}</span>
                      <span className="text-slate-700 text-[10px]">·</span>
                      <span className="text-[10px] font-mono text-slate-600">{t.date}</span>
                    </div>
                  </div>

                  {/* Amount + delete */}
                  <div className="flex items-center gap-2 flex-shrink-0">
                    <span
                      className="font-mono font-bold text-sm"
                      style={{ color: ti?.color ?? "#fff" }}
                    >
                      {t.type === "income" ? "+" : "−"}₹{t.amount.toFixed(2)}
                    </span>
                    <motion.button
                      whileTap={{ scale: 0.85 }}
                      onClick={() => del(t.id)}
                      className="w-6 h-6 rounded-lg flex items-center justify-center opacity-0 group-hover:opacity-100 transition-opacity"
                      style={{ color: "#FF003C" }}
                      title="Delete"
                    >
                      <i className="fa-solid fa-xmark text-[11px]" />
                    </motion.button>
                  </div>
                </motion.div>
              );
            })}
          </AnimatePresence>

          {txns.length === 0 && (
            <motion.div
              initial={{ opacity: 0 }}
              animate={{ opacity: 1 }}
              className="flex flex-col items-center justify-center py-12 gap-3"
            >
              <div className="w-12 h-12 rounded-2xl flex items-center justify-center"
                style={{ background: "rgba(0,240,255,0.07)", border: "1px solid rgba(0,240,255,0.12)" }}>
                <i className="fa-solid fa-coins text-[#00F0FF]" />
              </div>
              <div className="text-slate-500 text-sm text-center">
                No transactions yet.<br />
                <span className="text-slate-600 text-xs">Add your first one from the panel →</span>
              </div>
            </motion.div>
          )}
        </div>
      </div>

      {/* ── Sidebar: Add transaction ─────────────────────────────── */}
      <div
        className="p-4 sm:p-5 overflow-y-auto scrollbar-none"
        style={{ borderTop: "1px solid rgba(255,255,255,0.06)" }}
      >
        <div className="mono-label mb-4 text-[10px]">// New Transaction</div>
        <div className="space-y-3">

          <div>
            <label className="text-[10px] font-mono text-slate-500 uppercase tracking-widest block mb-1.5">Title</label>
            <input
              data-testid="txn-title"
              value={form.title}
              onChange={(e) => setForm({ ...form, title: e.target.value })}
              onKeyDown={(e) => e.key === "Enter" && add()}
              placeholder="e.g. Grocery run"
              className="input-cyber"
            />
          </div>

          <div>
            <label className="text-[10px] font-mono text-slate-500 uppercase tracking-widest block mb-1.5">Amount (₹)</label>
            <input
              data-testid="txn-amount"
              type="number"
              min="0"
              step="0.01"
              value={form.amount}
              onChange={(e) => setForm({ ...form, amount: e.target.value })}
              placeholder="0.00"
              className="input-cyber"
            />
          </div>

          <div>
            <label className="text-[10px] font-mono text-slate-500 uppercase tracking-widest block mb-1.5">Category</label>
            <CyberSelect
              value={form.category}
              onValueChange={(v) => setForm({ ...form, category: v })}
              options={catOpts}
              placeholder="Select category"
            />
          </div>

          <div>
            <label className="text-[10px] font-mono text-slate-500 uppercase tracking-widest block mb-1.5">Type</label>
            <CyberSelect
              value={form.type}
              onValueChange={(v) => setForm({ ...form, type: v })}
              options={typeOpts}
              placeholder="Select type"
            />
          </div>

          <div>
            <label className="text-[10px] font-mono text-slate-500 uppercase tracking-widest block mb-1.5">Date</label>
            <input
              type="date"
              value={form.date}
              onChange={(e) => setForm({ ...form, date: e.target.value })}
              className="input-cyber"
            />
          </div>

          <motion.button
            data-testid="txn-add"
            onClick={add}
            whileTap={{ scale: 0.96 }}
            disabled={adding || !form.title.trim() || !form.amount}
            className="neon-btn primary w-full justify-center mt-1"
          >
            {adding
              ? <><i className="fa-solid fa-spinner fa-spin text-[11px]" /> Adding…</>
              : <><i className="fa-solid fa-plus text-[11px]" /> Add Transaction</>
            }
          </motion.button>
        </div>
      </div>
    </div>
  );
}
