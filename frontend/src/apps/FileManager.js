import React, { useEffect, useState } from "react";
import { crud } from "../lib/api";

const c = crud("files");

export default function FileManager() {
  const [files,   setFiles]   = useState([]);
  const [folder,  setFolder]  = useState("root");
  const [showNew, setShowNew] = useState(null);
  const [name,    setName]    = useState("");

  const load = () => c.list().then(setFiles);
  useEffect(() => { load(); }, []);

  const create = async (type) => {
    if (!name.trim()) return;
    await c.create({ name, type, parent: folder, content: "", size: Math.floor(Math.random() * 5000) });
    setName(""); setShowNew(null); load();
  };

  const del = async (id) => { await c.remove(id); load(); };

  const here   = files.filter((f) => f.parent === folder);
  const folders = files.filter((f) => f.type === "folder");

  return (
    <div className="flex flex-col sm:flex-row h-full text-white" data-testid="files-app">
      {/* Sidebar */}
      <div className="sm:w-56 border-b sm:border-b-0 sm:border-r border-white/10 p-3 flex-shrink-0">
        <div className="mono-label mb-2">// Folders</div>
        {/* Mobile: horizontal scroll */}
        <div className="flex sm:flex-col gap-1 overflow-x-auto sm:overflow-x-visible pb-1 sm:pb-0"
          style={{ WebkitOverflowScrolling: "touch" }}>
          <button
            onClick={() => setFolder("root")}
            className={`flex-shrink-0 sm:w-full text-left px-2 py-1.5 rounded text-sm whitespace-nowrap
              ${folder === "root" ? "bg-[#00F0FF]/10 text-[#00F0FF]" : "hover:bg-white/5"}`}
          >
            <i className="fa-solid fa-house mr-2"></i>Root
          </button>
          {folders.map((f) => (
            <button
              key={f.id}
              onClick={() => setFolder(f.id)}
              className={`flex-shrink-0 sm:w-full text-left px-2 py-1.5 rounded text-sm whitespace-nowrap
                ${folder === f.id ? "bg-[#00F0FF]/10 text-[#00F0FF]" : "hover:bg-white/5"}`}
            >
              <i className="fa-solid fa-folder mr-2 text-[#FCEE09]"></i>{f.name}
            </button>
          ))}
        </div>
      </div>

      {/* Main area */}
      <div className="flex-1 flex flex-col min-h-0">
        <div className="p-3 border-b border-white/10 flex items-center justify-between flex-shrink-0">
          <div className="font-mono text-xs text-slate-400 truncate">
            / {folder === "root" ? "root" : folders.find((f) => f.id === folder)?.name}
          </div>
          <div className="flex gap-1.5 flex-shrink-0">
            <button data-testid="new-folder" onClick={() => setShowNew("folder")} className="neon-btn !py-1 !px-2 text-xs">
              <i className="fa-solid fa-folder-plus mr-1"></i>
              <span className="hidden sm:inline">Folder</span>
            </button>
            <button data-testid="new-file" onClick={() => setShowNew("file")} className="neon-btn !py-1 !px-2 text-xs">
              <i className="fa-solid fa-file-circle-plus mr-1"></i>
              <span className="hidden sm:inline">File</span>
            </button>
          </div>
        </div>

        {showNew && (
          <div className="p-3 border-b border-white/10 flex gap-2 flex-shrink-0">
            <input
              autoFocus
              value={name}
              onChange={(e) => setName(e.target.value)}
              placeholder={`${showNew} name`}
              className="input-cyber flex-1 min-w-0"
              onKeyDown={(e) => e.key === "Enter" && create(showNew)}
            />
            <button onClick={() => create(showNew)} className="neon-btn primary flex-shrink-0">Create</button>
            <button onClick={() => setShowNew(null)} className="neon-btn flex-shrink-0">Cancel</button>
          </div>
        )}

        {/* File grid — 3 cols mobile, 5 desktop */}
        <div className="flex-1 overflow-y-auto p-3 sm:p-4 grid grid-cols-3 sm:grid-cols-5 gap-2 sm:gap-3 content-start">
          {here.map((f) => (
            <div key={f.id} className="group flex flex-col items-center p-2 sm:p-3 rounded-lg hover:bg-white/5 cursor-pointer relative">
              <i className={`fa-solid ${f.type === "folder" ? "fa-folder text-[#FCEE09]" : "fa-file text-[#00F0FF]"} text-3xl sm:text-4xl mb-1 sm:mb-2`}></i>
              <div className="text-xs text-center truncate w-full">{f.name}</div>
              <button
                onClick={(e) => { e.stopPropagation(); del(f.id); }}
                className="absolute top-1 right-1 opacity-0 group-hover:opacity-100 text-slate-500 hover:text-[#FF003C]"
              >
                <i className="fa-solid fa-xmark text-xs"></i>
              </button>
            </div>
          ))}
          {here.length === 0 && (
            <div className="col-span-3 sm:col-span-5 flex flex-col items-center justify-center text-center py-12 px-4 max-w-sm mx-auto">
              <div className="w-14 h-14 rounded-2xl flex items-center justify-center mb-3" style={{ background: "rgba(96,165,250,0.08)", border: "1px solid rgba(96,165,250,0.2)" }}>
                <i className="fa-solid fa-folder-open text-[#60A5FA]/70 text-2xl"></i>
              </div>
              <div className="text-white/90 font-bold text-sm mb-1">Folder is Empty</div>
              <div className="text-slate-400 text-xs leading-relaxed mb-4">
                Store virtual system assets, documents, and exported project files in this folder.
              </div>
              <div className="flex gap-2">
                <button
                  onClick={() => setShowNew("file")}
                  aria-label="Create a new file"
                  className="neon-btn primary !py-1.5 !px-3 text-xs"
                >
                  <i className="fa-solid fa-file-circle-plus mr-1.5" />
                  New File
                </button>
                <button
                  onClick={() => setShowNew("folder")}
                  aria-label="Create a new folder"
                  className="neon-btn !py-1.5 !px-3 text-xs"
                >
                  <i className="fa-solid fa-folder-plus mr-1.5" />
                  New Folder
                </button>
              </div>
            </div>
          )}
        </div>
      </div>
    </div>
  );
}
