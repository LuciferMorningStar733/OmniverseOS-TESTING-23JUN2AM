import React, { useEffect, useRef, useState } from "react";
import { api } from "../../lib/api";

export default function QuickNotesWidget() {
  const [notes, setNotes] = useState([]);
  const [draft, setDraft] = useState("");
  const [saving, setSaving] = useState(false);
  const inputRef = useRef(null);

  const fetchNotes = () => {
    api.get("/notes").then((r) => setNotes((r.data || []).slice(0, 5))).catch(() => {});
  };

  useEffect(() => { fetchNotes(); }, []);

  const save = async () => {
    if (!draft.trim()) return;
    setSaving(true);
    try {
      await api.post("/notes", { title: draft.trim().slice(0, 60), content: draft.trim() });
      setDraft("");
      fetchNotes();
    } catch { /* ignore */ } finally {
      setSaving(false);
    }
  };

  return (
    <div className="w-full h-full flex flex-col px-3 py-2 gap-2 select-none">
      {/* Quick input */}
      <div className="flex gap-1.5">
        <input
          ref={inputRef}
          value={draft}
          onChange={(e) => setDraft(e.target.value)}
          onKeyDown={(e) => e.key === "Enter" && save()}
          placeholder="Quick note…"
          className="flex-1 text-[11px] font-mono px-2 py-1.5 rounded-lg outline-none"
          style={{
            background: "rgba(255,255,255,0.05)",
            border: "1px solid rgba(255,255,255,0.1)",
            color: "#fff",
            WebkitTapHighlightColor: "transparent",
          }}
          onFocus={(e) => { e.target.style.borderColor = "rgba(0,240,255,0.4)"; }}
          onBlur={(e)  => { e.target.style.borderColor = "rgba(255,255,255,0.1)"; }}
        />
        <button
          onClick={save}
          disabled={saving || !draft.trim()}
          className="w-8 h-8 rounded-lg flex items-center justify-center flex-shrink-0 transition-all"
          style={{
            background: draft.trim() ? "rgba(0,240,255,0.15)" : "rgba(255,255,255,0.05)",
            border: `1px solid ${draft.trim() ? "rgba(0,240,255,0.3)" : "rgba(255,255,255,0.08)"}`,
            color: draft.trim() ? "#00F0FF" : "rgba(255,255,255,0.25)",
            cursor: draft.trim() ? "pointer" : "not-allowed",
          }}
        >
          <i className={`fa-solid ${saving ? "fa-spinner fa-spin" : "fa-plus"} text-[11px]`} />
        </button>
      </div>

      {/* Notes list */}
      <div className="flex flex-col gap-1 flex-1 overflow-y-auto">
        {notes.map((note) => (
          <div
            key={note.id}
            className="px-2 py-1.5 rounded-lg text-[11px] font-mono truncate"
            style={{
              background: "rgba(252,238,9,0.06)",
              border: "1px solid rgba(252,238,9,0.1)",
              color: "rgba(255,255,255,0.65)",
            }}
          >
            <i className="fa-solid fa-note-sticky text-[8px] mr-1.5" style={{ color: "#FCEE09" }} />
            {note.title || note.content?.slice(0, 50) || "Untitled"}
          </div>
        ))}
        {notes.length === 0 && (
          <div className="flex-1 flex items-center justify-center">
            <span className="text-[10px] font-mono" style={{ color: "rgba(255,255,255,0.2)" }}>No notes yet</span>
          </div>
        )}
      </div>
    </div>
  );
}
