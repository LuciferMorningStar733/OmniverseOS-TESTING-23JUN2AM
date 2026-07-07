import React, { useEffect, useState } from "react";
import { analytics } from "../lib/api";
import { PieChart, Pie, Cell, ResponsiveContainer, RadialBarChart, RadialBar, Legend, Tooltip } from "recharts";

const colors = ["#00F0FF", "#FF003C", "#FCEE09", "#39FF14", "#94A3B8"];

export default function Analytics() {
  const [s, setS] = useState({});
  useEffect(() => { analytics().then(setS); }, []);

  const data = [
    { name: "Notes",    v: s.notes    || 0 },
    { name: "Tasks",    v: s.tasks    || 0 },
    { name: "Events",   v: s.events   || 0 },
    { name: "Memories", v: s.memories || 0 },
    { name: "Images",   v: s.images   || 0 },
  ];

  const radial = data.map((d, i) => ({ ...d, fill: colors[i] }));

  return (
    <div className="p-4 sm:p-6 h-full overflow-y-auto text-white" data-testid="analytics-app">
      <div className="mono-label">// Telemetry</div>
      <h2 className="font-heading text-2xl font-bold mb-4">Analytics</h2>

      {/* Charts — 1 col mobile, 2 col desktop */}
      <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
        <div className="glass-light rounded-xl p-5">
          <div className="mono-label mb-2">// Distribution</div>
          <div className="h-56 sm:h-64">
            <ResponsiveContainer>
              <PieChart>
                <Pie data={data} dataKey="v" cx="50%" cy="50%" innerRadius={40} outerRadius={80}>
                  {data.map((_, i) => <Cell key={i} fill={colors[i]} />)}
                </Pie>
                <Tooltip contentStyle={{ background: "#0A0A0F", border: "1px solid rgba(0,240,255,0.3)" }} />
              </PieChart>
            </ResponsiveContainer>
          </div>
        </div>
        <div className="glass-light rounded-xl p-5">
          <div className="mono-label mb-2">// Footprint</div>
          <div className="h-56 sm:h-64">
            <ResponsiveContainer>
              <RadialBarChart innerRadius="20%" outerRadius="100%" data={radial} startAngle={90} endAngle={-270}>
                <RadialBar background dataKey="v" />
                <Legend iconType="circle" wrapperStyle={{ fontSize: 11, color: "#94A3B8" }} />
              </RadialBarChart>
            </ResponsiveContainer>
          </div>
        </div>
      </div>

      {/* Stats — 2 col mobile, 4 col desktop */}
      <div className="grid grid-cols-2 sm:grid-cols-4 gap-3 mt-4">
        <div className="glass-light rounded-xl p-4">
          <div className="mono-label">Messages</div>
          <div className="font-heading text-2xl sm:text-3xl font-bold mt-1">{s.messages || 0}</div>
        </div>
        <div className="glass-light rounded-xl p-4">
          <div className="mono-label">Income</div>
          <div className="font-heading text-2xl sm:text-3xl font-bold mt-1 text-[#39FF14]">${(s.income || 0).toFixed(0)}</div>
        </div>
        <div className="glass-light rounded-xl p-4">
          <div className="mono-label">Expense</div>
          <div className="font-heading text-2xl sm:text-3xl font-bold mt-1 text-[#FF003C]">${(s.expense || 0).toFixed(0)}</div>
        </div>
        <div className="glass-light rounded-xl p-4">
          <div className="mono-label">Completion</div>
          <div className="font-heading text-2xl sm:text-3xl font-bold mt-1 text-[#00F0FF]">
            {s.tasks ? Math.round((s.tasks_done / s.tasks) * 100) : 0}%
          </div>
        </div>
      </div>
    </div>
  );
}
