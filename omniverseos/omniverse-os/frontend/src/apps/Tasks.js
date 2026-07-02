import React, { useEffect, useState, useCallback } from "react";
import { motion, AnimatePresence } from "framer-motion";
import { crud } from "../lib/api";

const c = crud("tasks");

/* ─────────────────────────────────────────────────────────────────────────────
   Column definitions
   ───────────────────────────────────────────────────────────────────────────── */
const COLS = [
  { id: "todo",  name: "Todo",        color: "#94A3B8", icon: "fa-circle-dashed",  bg: "rgba(148,163,184,0.08)" },
  { id: "doing", name: "In Progress", color: "#FCEE09", icon: "fa-spinner",        bg: "rgba(252,238,9,0.07)"   },
  { id: "done",  name: "Done",        color: "#39FF14", icon: "fa-circle-check",   bg: "rgba(57,255,20,0.07)"   },
];

/* ─────────────────────────────────────────────────────────────────────────────
   Task card
   ───────────────────────────────────────────────────────────────────────────── */
function TaskCard({ task, cols, onMove, onDelete }) {
  const [hovering, setHovering] = useState(false);
  const otherCols = cols.filter((c) => c.id !== task.status);

  return (
    <motion.div
      layout
      initial={{ opacity: 0, y: -8, scale: 0.97 }}
      animate={{ opacity: 1, y: 0, scale: 1 }}
      exit={{ opacity: 0, scale: 0.93, y: 6 }}
      transition={{ duration: 0.22, ease: [0.22, 1, 0.36, 1] }}
      data-testid={`task-card-${task.id}`}
      className="relative rounded-xl p-3 cursor-default"
      style={{
        background: hovering ? "rgba(255,255,255,0.04)" : "rgba(255,255,255,0.025)",
        border: `1px solid ${hovering ? "rgba(255,255,255,0.10)" : "rgba(255,255,255,0.05)"}`,
        transition: "background 0.18s, border-color 0.18s",
      }}
      onMouseEnter={() => setHovering(true)}
      onMouseLeave={() => setHovering(false)}
    >
      {/* Title + delete */}
      <div className="flex items-start gap-2 mb-2.5">
        <p className="text-[13px] leading-snug flex-1 break-words text-white/90">{task.title}</p>
        <motion.button
          whileTap={{ scale: 0.8 }}
          onClick={() => onDelete(task.id)}
          className="flex-shrink-0 w-5 h-5 rounded-md flex items-center justify-center mt-0.5"
          style={{
            color: "#FF003C",
            opacity: hovering ? 1 : 0,
            transition: "opacity 0.15s",
            background: "rgba(255,0,60,0.08)",
          }}
          title="Delete task"
        >
          <i className="fa-solid fa-xmark text-[9px]" />
        </motion.button>
      </div>

      {/* Move buttons */}
      <div
        className="flex flex-wrap gap-1"
        style={{
          opacity: hovering ? 1 : 0,
          transform: hovering ? "translateY(0)" : "translateY(3px)",
          transition: "opacity 0.18s, transform 0.18s",
        }}
      >
        {otherCols.map((col) => (
          <motion.button
            key={col.id}
            whileTap={{ scale: 0.9 }}
            onClick={() => onMove(task, col.id)}
            className="flex items-center gap-1 text-[10px] font-mono rounded-lg px-2 py-1"
            style={{
              color: col.color,
              background: `${col.color}10`,
              border: `1px solid ${col.color}25`,
              letterSpacing: "0.03em",
            }}
          >
            <i className={`fa-solid ${col.icon} text-[8px]`} />
            {col.name}
          </motion.button>
        ))}
      </div>
    </motion.div>
  );
}

/* ─────────────────────────────────────────────────────────────────────────────
   Column header
   ───────────────────────────────────────────────────────────────────────────── */
function ColHeader({ col, count }) {
  return (
    <div
      className="px-4 py-3 flex items-center justify-between flex-shrink-0"
      style={{ borderBottom: "1px solid rgba(255,255,255,0.06)" }}
    >
      <div className="flex items-center gap-2">
        <i className={`fa-solid ${col.icon} text-[11px]`} style={{ color: col.color }} />
        <span className="font-mono text-[11px] uppercase tracking-widest text-white/70">{col.name}</span>
      </div>
      <AnimatePresence mode="popLayout">
        <motion.span
          key={count}
          initial={{ scale: 0.7, opacity: 0 }}
          animate={{ scale: 1, opacity: 1 }}
          exit={{ scale: 0.7, opacity: 0 }}
          transition={{ duration: 0.2 }}
          className="font-mono text-xs font-bold rounded-lg px-2 py-0.5"
          style={{
            background: count > 0 ? `${col.color}18` : "rgba(255,255,255,0.04)",
            color: count > 0 ? col.color : "#475569",
            minWidth: 24, textAlign: "center",
          }}
        >
          {count}
        </motion.span>
      </AnimatePresence>
    </div>
  );
}

/* ─────────────────────────────────────────────────────────────────────────────
   Empty column
   ───────────────────────────────────────────────────────────────────────────── */
function EmptyCol({ col }) {
  return (
    <motion.div
      initial={{ opacity: 0 }}
      animate={{ opacity: 1 }}
      className="flex flex-col items-center justify-center gap-2 py-8 px-4"
    >
      <div
        className="w-9 h-9 rounded-xl flex items-center justify-center"
        style={{ background: col.bg, border: `1px solid ${col.color}20` }}
      >
        <i className={`fa-solid ${col.icon} text-[13px]`} style={{ color: col.color, opacity: 0.5 }} />
      </div>
      <span className="text-[11px] font-mono text-slate-600 text-center leading-relaxed">
        {col.id === "todo" ? "Add a task above" : `Move tasks here`}
      </span>
    </motion.div>
  );
}

/* ─────────────────────────────────────────────────────────────────────────────
   Tasks
   ───────────────────────────────────────────────────────────────────────────── */
export default function Tasks() {
  const [tasks, setTasks]       = useState([]);
  const [newTitle, setNewTitle] = useState("");
  const [adding, setAdding]     = useState(false);

  const load = useCallback(() => c.list().then(setTasks).catch(() => {}), []);
  useEffect(() => { load(); }, [load]);

  const add = async () => {
    if (!newTitle.trim()) return;
    setAdding(true);
    try {
      await c.create({ title: newTitle.trim(), status: "todo", priority: "medium", description: "" });
      setNewTitle("");
      load();
    } finally {
      setAdding(false);
    }
  };

  const move = useCallback(async (task, status) => {
    await c.update(task.id, { ...task, status });
    load();
  }, [load]);

  const del = useCallback(async (id) => {
    await c.remove(id);
    load();
  }, [load]);

  return (
    <div className="flex flex-col h-full text-white p-3 sm:p-5" data-testid="tasks-app">

      {/* ── Header ──────────────────────────────────────────────── */}
      <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between mb-4 gap-2 flex-shrink-0">
        <div>
          <div className="mono-label text-[10px] mb-0.5">// Workflow</div>
          <h2 className="font-heading text-xl sm:text-2xl font-bold tracking-tight">Tasks Board</h2>
        </div>

        <div className="flex items-center gap-2">
          <div className="relative flex-1 sm:flex-none">
            <input
              data-testid="task-input"
              value={newTitle}
              onChange={(e) => setNewTitle(e.target.value)}
              placeholder="New task…"
              className="input-cyber sm:!w-64 pr-8"
              onKeyDown={(e) => e.key === "Enter" && add()}
            />
          </div>
          <motion.button
            data-testid="task-add"
            onClick={add}
            whileTap={{ scale: 0.93 }}
            disabled={adding || !newTitle.trim()}
            className="neon-btn primary flex-shrink-0"
          >
            {adding
              ? <i className="fa-solid fa-spinner fa-spin text-[11px]" />
              : <><i className="fa-solid fa-plus text-[11px]" /> Add</>
            }
          </motion.button>
        </div>
      </div>

      {/* ── Kanban board ────────────────────────────────────────── */}
      <div
        className="flex-1 overflow-hidden"
        style={{ overflowX: "auto", WebkitOverflowScrolling: "touch" }}
      >
        <div
          className="grid gap-3 h-full"
          style={{
            gridTemplateColumns: "repeat(3, minmax(230px, 1fr))",
            minWidth: "min(700px, 100%)",
            height: "100%",
          }}
        >
          {COLS.map((col) => {
            const colTasks = tasks.filter((t) => t.status === col.id);
            return (
              <div
                key={col.id}
                className="flex flex-col rounded-2xl overflow-hidden"
                style={{
                  background: "rgba(255,255,255,0.02)",
                  border: "1px solid rgba(255,255,255,0.06)",
                }}
              >
                <ColHeader col={col} count={colTasks.length} />

                <div className="flex-1 overflow-y-auto p-2.5 space-y-2 scrollbar-none">
                  <AnimatePresence initial={false}>
                    {colTasks.length === 0
                      ? <EmptyCol col={col} />
                      : colTasks.map((task) => (
                          <TaskCard
                            key={task.id}
                            task={task}
                            cols={COLS}
                            onMove={move}
                            onDelete={del}
                          />
                        ))
                    }
                  </AnimatePresence>
                </div>
              </div>
            );
          })}
        </div>
      </div>
    </div>
  );
}
