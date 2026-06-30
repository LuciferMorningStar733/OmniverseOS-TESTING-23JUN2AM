import React from "react";

export default function DemoBadge({ note = "Static demo data — not yet connected to a real service." }) {
  return (
    <div className="m-3 px-3 py-2 rounded-lg border border-[#FCEE09]/40 bg-[#FCEE09]/10 flex items-center gap-2 text-[11px] font-mono">
      <i className="fa-solid fa-triangle-exclamation text-[#FCEE09]"></i>
      <span className="text-[#FCEE09] tracking-wider uppercase">Demo</span>
      <span className="text-slate-300">{note}</span>
    </div>
  );
}
