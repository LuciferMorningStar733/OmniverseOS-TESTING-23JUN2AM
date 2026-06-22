import React, { useEffect, useState } from "react";
import { crud } from "../lib/api";
import { BarChart, Bar, XAxis, YAxis, Tooltip, ResponsiveContainer, CartesianGrid, Cell } from "recharts";

const c = crud("transactions");
const cats = ["food", "transport", "shopping", "rent", "salary", "freelance", "entertainment"];

export default function Finance() {
  const [txns, setTxns] = useState([]);
  const [form, setForm] = useState({ title: "", amount: "", category: "food", type: "expense", date: new Date().toISOString().slice(0, 10) });

  const load = () => c.list().then(setTxns);
  useEffect(() => { load(); }, []);

  const add = async () => {
    if (!form.title || !form.amount) return;
    await c.create({ ...form, amount: parseFloat(form.amount) });
    setForm({ ...form, title: "", amount: "" });
    load();
  };
  const del = async (id) => { await c.remove(id); load(); };

  const income = txns.filter((t) => t.type === "income").reduce((s, t) => s + t.amount, 0);
  const expense = txns.filter((t) => t.type === "expense").reduce((s, t) => s + t.amount, 0);
  const byCat = cats.map((c) => ({ name: c, amount: txns.filter((t) => t.category === c && t.type === "expense").reduce((s, t) => s + t.amount, 0) }));

  return (
    <div className="grid grid-cols-3 h-full text-white" data-testid="finance-app">
      <div className="col-span-2 p-5 overflow-y-auto">
        <div className="mono-label">// Wealth Index</div>
        <h2 className="font-heading text-2xl font-bold mb-4">Finance</h2>
        <div className="grid grid-cols-3 gap-3 mb-5">
          {[
            { l: "Income", v: income, c: "#39FF14", i: "fa-arrow-trend-up" },
            { l: "Expense", v: expense, c: "#FF003C", i: "fa-arrow-trend-down" },
            { l: "Net", v: income - expense, c: "#00F0FF", i: "fa-coins" },
          ].map((s) => (
            <div key={s.l} className="glass-light rounded-xl p-4">
              <div className="flex items-center justify-between mb-2"><span className="mono-label">{s.l}</span><i className={`fa-solid ${s.i}`} style={{ color: s.c }}></i></div>
              <div className="font-heading text-2xl font-bold" style={{ color: s.c }}>${s.v.toFixed(2)}</div>
            </div>
          ))}
        </div>

        <div className="glass-light rounded-xl p-4 mb-4">
          <div className="mono-label mb-2">// Spending by Category</div>
          <div className="h-48">
            <ResponsiveContainer>
              <BarChart data={byCat}>
                <CartesianGrid stroke="rgba(255,255,255,0.05)" />
                <XAxis dataKey="name" tick={{ fill: "#94A3B8", fontSize: 10 }} />
                <YAxis tick={{ fill: "#94A3B8", fontSize: 10 }} />
                <Tooltip contentStyle={{ background: "#0A0A0F", border: "1px solid rgba(0,240,255,0.3)" }} />
                <Bar dataKey="amount" radius={[6, 6, 0, 0]}>
                  {byCat.map((_, i) => <Cell key={i} fill={["#00F0FF", "#FF003C", "#FCEE09", "#39FF14"][i % 4]} />)}
                </Bar>
              </BarChart>
            </ResponsiveContainer>
          </div>
        </div>

        <div className="space-y-1">
          {txns.map((t) => (
            <div key={t.id} className="flex items-center justify-between glass-light rounded-lg px-3 py-2">
              <div>
                <div className="text-sm">{t.title}</div>
                <div className="text-[10px] font-mono text-slate-500 uppercase">{t.category} • {t.date}</div>
              </div>
              <div className="flex items-center gap-3">
                <span className={`font-mono font-bold ${t.type === "income" ? "text-[#39FF14]" : "text-[#FF003C]"}`}>{t.type === "income" ? "+" : "-"}${t.amount.toFixed(2)}</span>
                <button onClick={() => del(t.id)} className="text-slate-600 hover:text-[#FF003C]"><i className="fa-solid fa-xmark text-xs"></i></button>
              </div>
            </div>
          ))}
          {txns.length === 0 && <div className="text-center text-slate-500 text-sm py-6">No transactions yet</div>}
        </div>
      </div>

      <div className="border-l border-white/10 p-5">
        <div className="mono-label mb-3">// New Transaction</div>
        <div className="space-y-2">
          <input data-testid="txn-title" value={form.title} onChange={(e) => setForm({ ...form, title: e.target.value })} placeholder="Title" className="input-cyber" />
          <input data-testid="txn-amount" type="number" value={form.amount} onChange={(e) => setForm({ ...form, amount: e.target.value })} placeholder="Amount" className="input-cyber" />
          <select value={form.category} onChange={(e) => setForm({ ...form, category: e.target.value })} className="input-cyber">{cats.map((c) => <option key={c}>{c}</option>)}</select>
          <select value={form.type} onChange={(e) => setForm({ ...form, type: e.target.value })} className="input-cyber"><option value="expense">Expense</option><option value="income">Income</option></select>
          <input type="date" value={form.date} onChange={(e) => setForm({ ...form, date: e.target.value })} className="input-cyber" />
          <button data-testid="txn-add" onClick={add} className="neon-btn primary w-full">Add</button>
        </div>
      </div>
    </div>
  );
}
