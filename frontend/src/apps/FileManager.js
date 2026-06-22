import React, { useEffect, useState } from "react";
import { crud } from "../lib/api";

const c = crud("files");

export default function FileManager() {
  const [files, setFiles] = useState([]);
  const [folder, setFolder] = useState("root");
  const [showNew, setShowNew] = useState(null);
  const [name, setName] = useState("");

  const load = () => c.list().then(setFiles);
  useEffect(() => { load(); }, []);

  const create = async (type) => {
    if (!name.trim()) return;
    await c.create({ name, type, parent: folder, content: "", size: Math.floor(Math.random() * 5000) });
    setName(""); setShowNew(null); load();
  };

  const del = async (id) => { await c.remove(id); load(); };

  const here = files.filter((f) => f.parent === folder);
  const folders = files.filter((f) => f.type === "folder");

  return (
    <div className="flex h-full text-white" data-testid="files-app">
      <div className="w-56 border-r border-white/10 p-3">
        <div className="mono-label mb-2">// Folders</div>
        <button onClick={() => setFolder("root")} className={`w-full text-left px-2 py-1.5 rounded text-sm ${folder === "root" ? "bg-[#00F0FF]/10 text-[#00F0FF]" : "hover:bg-white/5"}`}>
          <i className="fa-solid fa-house mr-2"></i>Root
        </button>
        {folders.map((f) => (
          <button key={f.id} onClick={() => setFolder(f.id)} className={`w-full text-left px-2 py-1.5 rounded text-sm ${folder === f.id ? "bg-[#00F0FF]/10 text-[#00F0FF]" : "hover:bg-white/5"}`}>
            <i className="fa-solid fa-folder mr-2 text-[#FCEE09]"></i>{f.name}
          </button>
        ))}
      </div>

      <div className="flex-1 flex flex-col">
        <div className="p-3 border-b border-white/10 flex items-center justify-between">
          <div className="font-mono text-xs text-slate-400">/ {folder === "root" ? "root" : folders.find(f => f.id === folder)?.name}</div>
          <div className="flex gap-2">
            <button data-testid="new-folder" onClick={() => setShowNew("folder")} className="neon-btn !py-1 !px-2 text-xs"><i className="fa-solid fa-folder-plus mr-1"></i>Folder</button>
            <button data-testid="new-file" onClick={() => setShowNew("file")} className="neon-btn !py-1 !px-2 text-xs"><i className="fa-solid fa-file-circle-plus mr-1"></i>File</button>
          </div>
        </div>

        {showNew && (
          <div className="p-3 border-b border-white/10 flex gap-2">
            <input autoFocus value={name} onChange={(e) => setName(e.target.value)} placeholder={`${showNew} name`} className="input-cyber" onKeyDown={(e) => e.key === "Enter" && create(showNew)} />
            <button onClick={() => create(showNew)} className="neon-btn primary">Create</button>
            <button onClick={() => setShowNew(null)} className="neon-btn">Cancel</button>
          </div>
        )}

        <div className="flex-1 overflow-y-auto p-4 grid grid-cols-5 gap-3">
          {here.map((f) => (
            <div key={f.id} className="group flex flex-col items-center p-3 rounded-lg hover:bg-white/5 cursor-pointer relative">
              <i className={`fa-solid ${f.type === "folder" ? "fa-folder text-[#FCEE09]" : "fa-file text-[#00F0FF]"} text-4xl mb-2`}></i>
              <div className="text-xs text-center truncate w-full">{f.name}</div>
              {f.type === "file" && <div className="text-[10px] text-slate-500 font-mono">{(f.size / 1024).toFixed(1)}KB</div>}
              <button onClick={() => del(f.id)} className="absolute top-1 right-1 opacity-0 group-hover:opacity-100 text-slate-500 hover:text-[#FF003C]"><i className="fa-solid fa-xmark text-xs"></i></button>
            </div>
          ))}
          {here.length === 0 && <div className="col-span-5 text-center text-slate-500 text-sm py-12">Empty folder</div>}
        </div>
      </div>
    </div>
  );
}
