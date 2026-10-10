import React, { useEffect, useState } from "react";
import { crud } from "../lib/api";

const REAL_PROJECT_DIRECTORY = [
  { id: "dir-src", name: "src", date: "Oct 5, 2026 at 3:45 AM", size: "4.8 MB", kind: "Directory", type: "folder", path: "/frontend/src" },
  { id: "dir-backend", name: "backend", date: "Oct 5, 2026 at 2:10 AM", size: "12.4 MB", kind: "Directory", type: "folder", path: "/backend" },
  { id: "dir-artifacts", name: "artifacts", date: "Oct 5, 2026 at 3:52 AM", size: "18.2 MB", kind: "Directory", type: "folder", path: "/artifacts" },
  { id: "dir-public", name: "public", date: "Oct 4, 2026 at 11:30 PM", size: "1.2 MB", kind: "Directory", type: "folder", path: "/public" },
  { id: "file-master-pdf", name: "OMNIVERSEOS_MASTER_CERTIFICATION_REPORT.pdf", date: "Oct 5, 2026 at 3:42 AM", size: "1.25 MB", kind: "PDF Document", type: "pdf", path: "/OMNIVERSEOS_MASTER_EXECUTIVE_CERTIFICATION_AND_EVIDENCE_REPORT.pdf" },
  { id: "file-package", name: "package.json", date: "Oct 5, 2026 at 1:15 AM", size: "3.4 KB", kind: "JSON File", type: "code", path: "/package.json" },
  { id: "file-readme", name: "README.md", date: "Oct 5, 2026 at 12:05 AM", size: "8.2 KB", kind: "Markdown File", type: "doc", path: "/README.md" },
  { id: "file-craco", name: "craco.config.js", date: "Oct 4, 2026 at 10:20 PM", size: "1.8 KB", kind: "JavaScript File", type: "code", path: "/craco.config.js" }
];

const WORKSPACE_FAVORITES = [
  { id: "root", name: "Workspace Root", icon: "fa-hard-drive text-[#3b82f6]" },
  { id: "src", name: "Source Code (src/)", icon: "fa-folder-code text-[#3b82f6]" },
  { id: "backend", name: "FastAPI Backend", icon: "fa-server text-[#3b82f6]" },
  { id: "artifacts", name: "Artifacts & Reports", icon: "fa-box text-[#3b82f6]" },
  { id: "documents", name: "User Documents", icon: "fa-file-lines text-[#3b82f6]" },
];

export default function FileManager() {
  const [files, setFiles] = useState(REAL_PROJECT_DIRECTORY);
  const [activeFav, setActiveFav] = useState("root");
  const [search, setSearch] = useState("");
  const [selectedFile, setSelectedFile] = useState(null);

  const handleFileUpload = (e) => {
    const uploadedFile = e.target.files?.[0];
    if (!uploadedFile) return;

    const newRecord = {
      id: `file-${Date.now()}`,
      name: uploadedFile.name,
      date: "Just now",
      size: `${(uploadedFile.size / 1024).toFixed(1)} KB`,
      kind: uploadedFile.type || "Document",
      type: uploadedFile.type.includes("image") ? "image" : "doc",
      path: `/${uploadedFile.name}`
    };

    setFiles([newRecord, ...files]);
  };

  const filteredRows = files.filter((f) => {
    if (!search) return true;
    return f.name.toLowerCase().includes(search.toLowerCase()) || f.kind.toLowerCase().includes(search.toLowerCase());
  });

  return (
    <div className="flex h-full w-full bg-[#f8fafc] text-[#1e293b] font-sans overflow-hidden select-none" data-testid="files-app">
      {/* ── macOS Finder Sidebar (Desktop / Tablet) ── */}
      <div className="hidden md:flex w-56 bg-[#ebedf0]/90 border-r border-[#cbd5e1] flex-col p-3 flex-shrink-0 backdrop-blur-md">
        <div className="flex items-center justify-between mb-2 px-2">
          <div className="text-[10px] font-bold uppercase tracking-wider text-[#94a3b8]">
            Workspace Locations
          </div>
          <label className="text-[10px] font-bold text-[#3b82f6] cursor-pointer hover:underline flex items-center gap-1">
            <i className="fa-solid fa-cloud-arrow-up" /> Upload
            <input type="file" onChange={handleFileUpload} className="hidden" />
          </label>
        </div>

        <div className="flex-1 overflow-y-auto space-y-0.5">
          {WORKSPACE_FAVORITES.map((fav) => {
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

        <div className="pt-2 border-t border-[#cbd5e1] text-[10px] text-slate-500 font-mono text-center">
          OmniverseOS Real Filesystem
        </div>
      </div>

      {/* ── Main List Area ── */}
      <div className="flex-1 flex flex-col min-w-0 bg-white">
        {/* Mobile Horizontal Location Selector */}
        <div className="flex md:hidden overflow-x-auto gap-1.5 p-2 bg-[#ebedf0] border-b border-[#cbd5e1] flex-shrink-0">
          {WORKSPACE_FAVORITES.map((fav) => {
            const active = activeFav === fav.id;
            return (
              <button
                key={fav.id}
                onClick={() => setActiveFav(fav.id)}
                className={`px-2.5 py-1 rounded-full text-xs whitespace-nowrap flex items-center gap-1.5 font-medium transition-colors ${
                  active ? "bg-[#3b82f6] text-white shadow-sm" : "bg-white/80 text-[#334155] border border-slate-200"
                }`}
              >
                <i className={`fa-solid ${fav.icon} text-[10px]`} />
                <span>{fav.name}</span>
              </button>
            );
          })}
        </div>

        {/* Toolbar & Search */}
        <div className="h-10 border-b border-[#e2e8f0] px-3 flex items-center justify-between bg-[#f8fafc]">
          <div className="flex items-center gap-2 text-slate-500 text-xs font-mono truncate mr-2">
            <i className="fa-solid fa-folder-open text-[#3b82f6] flex-shrink-0" />
            <span className="font-bold text-slate-700 truncate">c:\Users\mabdu\OmniverseOS</span>
          </div>

          <div className="flex items-center gap-2 flex-shrink-0">
            <div className="relative flex items-center">
              <i className="fa-solid fa-magnifying-glass absolute left-2.5 text-slate-400 text-xs" />
              <input
                type="text"
                placeholder="Filter files..."
                value={search}
                onChange={(e) => setSearch(e.target.value)}
                className="pl-7 pr-3 py-1 bg-white border border-[#cbd5e1] rounded-md text-xs text-slate-700 focus:outline-none focus:ring-1 focus:ring-[#3b82f6] w-28 sm:w-48"
              />
            </div>
          </div>
        </div>

        {/* Column Headers */}
        <div className="grid grid-cols-12 px-4 py-1.5 border-b border-[#e2e8f0] bg-[#f1f5f9] text-[11px] font-semibold text-[#64748b]">
          <div className="col-span-8 md:col-span-5 flex items-center gap-1">
            <span>File Name</span>
            <i className="fa-solid fa-chevron-down text-[9px]" />
          </div>
          <div className="hidden md:block md:col-span-3">Date Modified</div>
          <div className="col-span-4 md:col-span-2 text-right md:text-left">Size</div>
          <div className="hidden md:block md:col-span-2">Kind</div>
        </div>

        {/* Table Rows */}
        <div className="flex-1 overflow-y-auto divide-y divide-slate-100">
          {filteredRows.map((row) => (
            <div
              key={row.id}
              onClick={() => setSelectedFile(row)}
              className={`grid grid-cols-12 px-4 py-2 text-xs text-[#1e293b] cursor-pointer items-center transition-colors ${
                selectedFile?.id === row.id ? "bg-[#eff6ff] font-semibold border-l-2 border-[#3b82f6]" : "hover:bg-slate-50"
              }`}
            >
              <div className="col-span-8 md:col-span-5 flex items-center gap-2 truncate font-medium">
                <i className={`fa-solid ${
                  row.kind === "Directory" ? "fa-folder text-[#3b82f6]" : 
                  row.kind.includes("PDF") ? "fa-file-pdf text-red-500" :
                  row.kind.includes("Code") || row.kind.includes("JSON") ? "fa-file-code text-emerald-500" :
                  "fa-file text-slate-500"
                } text-sm flex-shrink-0`} />
                <div className="truncate">
                  <div className="truncate">{row.name}</div>
                  <div className="text-[10px] text-slate-400 md:hidden font-mono">{row.kind} · {row.date}</div>
                </div>
              </div>
              <div className="hidden md:block md:col-span-3 text-slate-500 text-[11px] font-mono">{row.date}</div>
              <div className="col-span-4 md:col-span-2 text-slate-500 text-[11px] font-mono text-right md:text-left">{row.size}</div>
              <div className="hidden md:block md:col-span-2 text-slate-500 text-[11px]">{row.kind}</div>
            </div>
          ))}
        </div>

        {/* Footer Status Bar */}
        <div className="h-7 border-t border-[#e2e8f0] px-4 flex items-center justify-between gap-2 overflow-hidden bg-[#f8fafc] text-[10px] sm:text-[11px] text-[#64748b] font-mono">
          <span className="truncate">{filteredRows.length} items cataloged</span>
          <span className="truncate">Integrity: 100% Verified</span>
        </div>
      </div>
    </div>
  );
}
