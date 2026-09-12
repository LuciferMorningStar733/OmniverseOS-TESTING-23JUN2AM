import React, { useEffect, useState } from "react";
import { crud } from "../lib/api";

const c = crud("files");

const MACOS_FAVORITES = [
  { id: "stories", name: "Stories", icon: "fa-folder text-[#3b82f6]" },
  { id: "designed", name: "Designed in Calif...", icon: "fa-folder text-[#3b82f6]" },
  { id: "legopolis", name: "Legopolis Transfer", icon: "fa-folder text-[#3b82f6]" },
  { id: "upgrade", name: "Upgrade", icon: "fa-folder text-[#3b82f6]" },
  { id: "transfer", name: "Transfer Folders", icon: "fa-folder text-[#3b82f6]" },
  { id: "screenshots", name: "Screenshots", icon: "fa-folder text-[#3b82f6]" },
  { id: "audio", name: "Audio Hijack", icon: "fa-folder text-[#3b82f6]" },
  { id: "applications", name: "Applications", icon: "fa-folder text-[#3b82f6]" },
  { id: "documents", name: "Documents", icon: "fa-folder text-[#3b82f6]" },
];

const DEFAULT_FINDER_ROWS = [
  { id: "row-1", name: "The Incomparable Episode Archive", date: "Jul 3, 2026 at 3:55 PM", size: "142.49 GB", kind: "Folder" },
  { id: "row-2", name: "Game Show", date: "Jun 4, 2026 at 4:06 PM", size: "1.16 TB", kind: "Folder" },
  { id: "row-3", name: "Works in Progress", date: "Jun 4, 2026 at 4:06 PM", size: "Zero bytes", kind: "Folder" },
  { id: "row-4", name: "Total Party Kill", date: "May 12, 2026 at 8:51 AM", size: "1.25 TB", kind: "Folder" },
  { id: "row-5", name: "Robot Or Not", date: "Apr 21, 2026 at 9:12 AM", size: "659.64 GB", kind: "Folder" },
];

export default function FileManager() {
  const [files, setFiles] = useState([]);
  const [folder, setFolder] = useState("root");
  const [activeFav, setActiveFav] = useState("documents");
  const [search, setSearch] = useState("");

  const load = () => c.list().then(setFiles).catch(() => {});
  useEffect(() => { load(); }, []);

  const here = files.filter((f) => f.parent === folder);

  return (
    <div className="flex h-full w-full bg-[#f8fafc] text-[#1e293b] font-sans overflow-hidden select-none" data-testid="files-app">
      {/* ── macOS Finder Sidebar ── */}
      <div className="w-52 bg-[#ebedf0]/90 border-r border-[#cbd5e1] flex flex-col p-3 flex-shrink-0 backdrop-blur-md">
        <div className="text-[10px] font-bold uppercase tracking-wider text-[#94a3b8] mb-2 px-2">
          Favorites
        </div>
        <div className="flex-1 overflow-y-auto space-y-0.5">
          {MACOS_FAVORITES.map((fav) => {
            const active = activeFav === fav.id;
            return (
              <button
                key={fav.id}
                onClick={() => setActiveFav(fav.id)}
                className={`w-full flex items-center gap-2.5 px-2.5 py-1.5 rounded-md text-xs transition-colors text-left font-medium ${
                  active ? "bg-[#3b82f6] text-white shadow-sm" : "hover:bg-[#e2e8f0] text-[#334155]"
                }`}
              >
                <i className={`fa-solid ${fav.icon} ${active ? "text-white" : ""}`} />
                <span className="truncate">{fav.name}</span>
              </button>
            );
          })}
        </div>
      </div>

      {/* ── Main List Area ── */}
      <div className="flex-1 flex flex-col min-w-0 bg-white">
        {/* Toolbar & Search */}
        <div className="h-10 border-b border-[#e2e8f0] px-3 flex items-center justify-between bg-[#f8fafc]">
          <div className="flex items-center gap-1 text-slate-400 text-xs">
            <button className="p-1 hover:text-slate-700">
              <i className="fa-solid fa-chevron-left" />
            </button>
            <button className="p-1 hover:text-slate-700">
              <i className="fa-solid fa-chevron-right" />
            </button>
          </div>

          <div className="flex items-center gap-2">
            <div className="relative flex items-center">
              <i className="fa-solid fa-magnifying-glass absolute left-2.5 text-slate-400 text-xs" />
              <input
                type="text"
                placeholder="Search"
                value={search}
                onChange={(e) => setSearch(e.target.value)}
                className="pl-7 pr-3 py-1 bg-white border border-[#cbd5e1] rounded-md text-xs text-slate-700 focus:outline-none focus:ring-1 focus:ring-[#3b82f6] w-40"
              />
            </div>
          </div>
        </div>

        {/* Column Headers */}
        <div className="grid grid-cols-12 px-4 py-1.5 border-b border-[#e2e8f0] bg-[#f1f5f9] text-[11px] font-semibold text-[#64748b]">
          <div className="col-span-5 flex items-center gap-1">
            <span>Name</span>
            <i className="fa-solid fa-chevron-down text-[9px]" />
          </div>
          <div className="col-span-3">Date Modified</div>
          <div className="col-span-2">Size</div>
          <div className="col-span-2">Kind</div>
        </div>

        {/* Table Rows */}
        <div className="flex-1 overflow-y-auto divide-y divide-slate-100">
          {DEFAULT_FINDER_ROWS.map((row) => (
            <div
              key={row.id}
              className="grid grid-cols-12 px-4 py-2 text-xs text-[#1e293b] hover:bg-[#eff6ff] cursor-pointer items-center transition-colors"
            >
              <div className="col-span-5 flex items-center gap-2 truncate font-medium">
                <i className="fa-solid fa-folder text-[#3b82f6] text-sm" />
                <span className="truncate">{row.name}</span>
              </div>
              <div className="col-span-3 text-slate-500 text-[11px]">{row.date}</div>
              <div className="col-span-2 text-slate-500 text-[11px]">{row.size}</div>
              <div className="col-span-2 text-slate-500 text-[11px]">{row.kind}</div>
            </div>
          ))}

          {/* Render any additional user created files */}
          {here.map((f) => (
            <div
              key={f.id}
              className="grid grid-cols-12 px-4 py-2 text-xs text-[#1e293b] hover:bg-[#eff6ff] cursor-pointer items-center transition-colors"
            >
              <div className="col-span-5 flex items-center gap-2 truncate font-medium">
                <i className={`fa-solid ${f.type === "folder" ? "fa-folder text-[#3b82f6]" : "fa-file text-[#64748b]"} text-sm`} />
                <span className="truncate">{f.name}</span>
              </div>
              <div className="col-span-3 text-slate-500 text-[11px]">Just now</div>
              <div className="col-span-2 text-slate-500 text-[11px]">{f.size || "Zero bytes"}</div>
              <div className="col-span-2 text-slate-500 text-[11px]">{f.type === "folder" ? "Folder" : "Document"}</div>
            </div>
          ))}
        </div>

        {/* Footer Status Bar */}
        <div className="h-7 border-t border-[#e2e8f0] px-4 flex items-center justify-center bg-[#f8fafc] text-[11px] text-[#64748b]">
          9 items, 4.05 TB available
        </div>
      </div>
    </div>
  );
}
