import React, { useEffect, useState, useCallback, useRef } from "react";
import { motion, AnimatePresence } from "framer-motion";
import { crud } from "../lib/api";

const c = crud("notes");

const NOTE_COLORS = [
  { hex: "#00F0FF", label: "Cyan"    },
  { hex: "#FF003C", label: "Crimson" },
  { hex: "#FCEE09", label: "Yellow"  },
  { hex: "#39FF14", label: "Green"   },
  { hex: "#C778DD", label: "Purple"  },
];

/* ─────────────────────────────────────────────────────────────────────────────
   Auto-save indicator
   ───────────────────────────────────────────────────────────────────────────── */
function SaveIndicator({ saving }) {
  return (
    <AnimatePresence>
      {saving && (
        <motion.span
          key="saving"
          initial={{ opacity: 0, scale: 0.85 }}
          animate={{ opacity: 1, scale: 1 }}
          exit={{ opacity: 0, scale: 0.85 }}
          className="flex items-center gap-1 text-[10px] font-mono text-slate-500"
        >
          <i className="fa-solid fa-spinner fa-spin text-[9px]" />
          Saving…
        </motion.span>
      )}
    </AnimatePresence>
  );
}

/* ─────────────────────────────────────────────────────────────────────────────
   Sidebar note item
   ───────────────────────────────────────────────────────────────────────────── */
function NoteItem({ note, isSelected, onClick }) {
  return (
    <motion.button
      layout
      initial={{ opacity: 0, x: -8 }}
      animate={{ opacity: 1, x: 0 }}
      exit={{ opacity: 0, x: -8, scale: 0.95 }}
      transition={{ duration: 0.2, ease: [0.22, 1, 0.36, 1] }}
      onClick={onClick}
      className="flex-shrink-0 sm:flex-shrink text-left px-3 py-2.5 sm:w-full rounded-xl transition-colors"
      style={{
        background: isSelected ? "rgba(255,255,255,0.06)" : "transparent",
        borderLeft: `2px solid ${isSelected ? note.color : "transparent"}`,
      }}
    >
      <div className="flex items-center gap-2 min-w-0">
        <span
          className="w-1.5 h-1.5 rounded-full flex-shrink-0"
          style={{ background: note.color, boxShadow: isSelected ? `0 0 6px ${note.color}88` : "none" }}
        />
        <span className="text-sm font-medium truncate text-white/85">
          {note.title || "Untitled"}
        </span>
      </div>
      <p className="text-[11px] text-slate-500 truncate mt-0.5 pl-3.5 hidden sm:block leading-tight">
        {note.content?.slice(0, 48) || "No content yet"}
      </p>
    </motion.button>
  );
}

/* ─────────────────────────────────────────────────────────────────────────────
   Empty state
   ───────────────────────────────────────────────────────────────────────────── */
function EmptyState({ onNew }) {
  return (
    <motion.div
      initial={{ opacity: 0, scale: 0.95 }}
      animate={{ opacity: 1, scale: 1 }}
      className="flex flex-col items-center justify-center h-full gap-4 p-8 text-center"
    >
      <div
        className="w-16 h-16 rounded-2xl flex items-center justify-center"
        style={{
            background: "rgba(0,240,255,0.07)",
            border: "1px solid rgba(0,240,255,0.18)",
            boxShadow: "0 0 20px rgba(0,240,255,0.06), inset 0 0 20px rgba(0,240,255,0.04)",
          }}
      >
        <i className="fa-solid fa-note-sticky text-[#00F0FF]/60 text-2xl" />
      </div>
      <div>
        <div className="text-white/70 font-medium mb-1">No note selected</div>
        <div className="text-slate-500 text-sm">Create a note to get started</div>
      </div>
      <motion.button
        whileTap={{ scale: 0.94 }}
        onClick={onNew}
        className="neon-btn primary"
      >
        <i className="fa-solid fa-plus text-[11px]" />
        New Note
      </motion.button>
    </motion.div>
  );
}

/* ─────────────────────────────────────────────────────────────────────────────
   Color swatch
   ───────────────────────────────────────────────────────────────────────────── */
function ColorSwatch({ color, isActive, onClick }) {
  return (
    <motion.button
      whileTap={{ scale: 0.82 }}
      whileHover={{ scale: 1.15 }}
      onClick={onClick}
      title={color.label}
      className="flex-shrink-0"
      style={{
        width: 16, height: 16, borderRadius: "50%",
        background: color.hex,
        outline: isActive ? `2px solid white` : "2px solid transparent",
        outlineOffset: 2,
        boxShadow: isActive ? `0 0 10px ${color.hex}88` : "none",
        transition: "box-shadow 0.2s, outline-color 0.2s",
      }}
    />
  );
}

/* ─────────────────────────────────────────────────────────────────────────────
   Notes
   ───────────────────────────────────────────────────────────────────────────── */
export default function Notes() {
  const [notes, setNotes] = useState([]);
  const [sel, setSel]     = useState(null);
  const [saving, setSaving] = useState(false);
  const saveTimer = useRef(null);

  const load = useCallback(() =>
    c.list().then((n) => {
      setNotes(n);
      setSel((s) => s ? (n.find((x) => x.id === s.id) || n[0] || null) : (n[0] || null));
    }).catch(() => {})
  , []);

  useEffect(() => { load(); }, [load]);

  const add = async () => {
    const n = await c.create({
      title: "Untitled",
      content: "",
      color: NOTE_COLORS[notes.length % NOTE_COLORS.length].hex,
    });
    setNotes((p) => [n, ...p]);
    setSel(n);
  };

  /* Debounced save — fires 600ms after last keystroke */
  const save = useCallback((patch) => {
    if (!sel) return;
    const updated = { ...sel, ...patch };
    setSel(updated);
    setNotes((ns) => ns.map((x) => x.id === sel.id ? updated : x));

    clearTimeout(saveTimer.current);
    setSaving(true);
    saveTimer.current = setTimeout(async () => {
      try {
        await c.update(sel.id, {
          title:   updated.title,
          content: updated.content,
          color:   updated.color,
        });
      } finally {
        setSaving(false);
      }
    }, 600);
  }, [sel]);

  const del = async (id) => {
    await c.remove(id);
    const next = notes.filter((n) => n.id !== id);
    setNotes(next);
    if (sel?.id === id) setSel(next[0] || null);
  };

  const wordCount = sel?.content
    ? sel.content.trim().split(/\s+/).filter(Boolean).length
    : 0;

  return (
    <div className="flex flex-col sm:flex-row h-full text-white" data-testid="notes-app" style={{ background: "rgba(5,5,16,0.6)" }}>

      {/* ── Sidebar ──────────────────────────────────────────────── */}
      <div
        className="sm:w-60 flex flex-col flex-shrink-0"
        style={{ borderRight: "1px solid rgba(255,255,255,0.07)" }}
      >
        {/* Sidebar header */}
        <div
          className="px-3 py-3 flex items-center justify-between flex-shrink-0"
          style={{ borderBottom: "1px solid rgba(255,255,255,0.07)" }}
        >
          <div className="mono-label text-[10px]">// Notes</div>
          <motion.button
            data-testid="notes-new"
            whileTap={{ scale: 0.88 }}
            onClick={add}
            className="w-7 h-7 rounded-xl flex items-center justify-center"
            style={{
              background: "rgba(0,240,255,0.08)",
              border: "1px solid rgba(0,240,255,0.2)",
              color: "#00F0FF",
            }}
            title="New note"
          >
            <i className="fa-solid fa-plus text-[11px]" />
          </motion.button>
        </div>

        {/* Note list */}
        <div
          className="flex sm:flex-col overflow-x-auto sm:overflow-x-hidden overflow-y-visible sm:overflow-y-auto
                     flex-shrink-0 sm:flex-1 p-1.5 gap-0.5 scrollbar-none"
          style={{ WebkitOverflowScrolling: "touch" }}
        >
          <AnimatePresence initial={false}>
            {notes.length === 0 ? (
              <motion.div
                initial={{ opacity: 0 }}
                animate={{ opacity: 1 }}
                className="w-full py-6 text-center text-slate-600 text-xs font-mono"
              >
                No notes yet
              </motion.div>
            ) : notes.map((n) => (
              <NoteItem
                key={n.id}
                note={n}
                isSelected={sel?.id === n.id}
                onClick={() => setSel(n)}
              />
            ))}
          </AnimatePresence>
        </div>
      </div>

      {/* ── Editor ───────────────────────────────────────────────── */}
      <div className="flex-1 flex flex-col min-h-0">
        <AnimatePresence mode="wait">
          {sel ? (
            <motion.div
              key={sel.id}
              initial={{ opacity: 0 }}
              animate={{ opacity: 1 }}
              exit={{ opacity: 0 }}
              transition={{ duration: 0.15 }}
              className="flex flex-col h-full min-h-0"
            >
              {/* Toolbar */}
              <div
                className="px-4 py-3 flex items-center gap-3 flex-shrink-0"
                style={{ borderBottom: "1px solid rgba(255,255,255,0.07)" }}
              >
                <input
                  value={sel.title}
                  onChange={(e) => save({ title: e.target.value })}
                  className="bg-transparent outline-none font-heading text-lg sm:text-xl font-bold flex-1 min-w-0"
                    style={{ letterSpacing: "-0.01em" }}
                  placeholder="Untitled"
                  style={{ caretColor: sel.color }}
                />

                {/* Color swatches */}
                <div className="flex items-center gap-1.5 flex-shrink-0">
                  {NOTE_COLORS.map((col) => (
                    <ColorSwatch
                      key={col.hex}
                      color={col}
                      isActive={sel.color === col.hex}
                      onClick={() => save({ color: col.hex })}
                    />
                  ))}
                </div>

                <SaveIndicator saving={saving} />

                <motion.button
                  whileTap={{ scale: 0.85 }}
                  onClick={() => del(sel.id)}
                  className="w-7 h-7 rounded-lg flex items-center justify-center flex-shrink-0"
                  style={{ color: "#FF003C" }}
                  title="Delete note"
                >
                  <i className="fa-solid fa-trash-can text-[11px]" />
                </motion.button>
              </div>

              {/* Text area */}
              <textarea
                data-testid="note-content"
                value={sel.content}
                onChange={(e) => save({ content: e.target.value })}
                className="flex-1 bg-transparent outline-none p-4 sm:p-5 resize-none text-sm leading-relaxed
                           font-body min-h-0 scrollbar-none"
                placeholder="Start writing…"
                style={{ caretColor: sel.color }}
              />

              {/* Footer — word count */}
              <div
                className="px-5 py-2 flex items-center justify-end gap-3 flex-shrink-0"
                style={{ borderTop: "1px solid rgba(255,255,255,0.05)" }}
              >
                <span className="text-[10px] font-mono text-slate-600">
                  {wordCount} {wordCount === 1 ? "word" : "words"}
                </span>
                <span className="text-[10px] font-mono text-slate-700">
                  {sel.content?.length ?? 0} chars
                </span>
              </div>
            </motion.div>
          ) : (
            <motion.div
              key="empty"
              initial={{ opacity: 0 }}
              animate={{ opacity: 1 }}
              exit={{ opacity: 0 }}
              className="flex-1"
            >
              <EmptyState onNew={add} />
            </motion.div>
          )}
        </AnimatePresence>
      </div>
    </div>
  );
}
