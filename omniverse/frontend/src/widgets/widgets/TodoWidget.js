import React, { useEffect, useState } from "react";
import { api } from "../../lib/api";

const PRIORITY_COLOR = { high: "#FF003C", medium: "#FCEE09", low: "#39FF14" };

export default function TodoWidget() {
  const [tasks, setTasks] = useState([]);
  const [loading, setLoading] = useState(true);

  const fetchTasks = () => {
    api.get("/tasks").then((r) => { setTasks(r.data || []); setLoading(false); }).catch(() => setLoading(false));
  };

  useEffect(() => { fetchTasks(); }, []);

  const pending = tasks.filter((t) => t.status !== "done").slice(0, 6);
  const done    = tasks.filter((t) => t.status === "done").length;

  const toggleDone = (task) => {
    const newStatus = task.status === "done" ? "todo" : "done";
    api.put(`/tasks/${task.id}`, { ...task, status: newStatus })
      .then(() => fetchTasks()).catch(() => {});
  };

  return (
    <div className="w-full h-full flex flex-col px-3 py-2 gap-1.5 select-none">
      <div className="flex items-center justify-between mb-1">
        <span className="text-[10px] font-mono" style={{ color: "rgba(255,255,255,0.3)" }}>
          {done} done · {pending.length} pending
        </span>
      </div>

      {loading ? (
        <div className="flex-1 flex items-center justify-center">
          <span className="w-1.5 h-1.5 rounded-full bg-[#00F0FF] animate-ping" />
        </div>
      ) : pending.length === 0 ? (
        <div className="flex-1 flex items-center justify-center flex-col gap-2">
          <i className="fa-solid fa-check-double text-2xl" style={{ color: "rgba(57,255,20,0.4)" }} />
          <div className="text-[10px] font-mono" style={{ color: "rgba(255,255,255,0.2)" }}>All caught up!</div>
        </div>
      ) : (
        <div className="flex flex-col gap-1 flex-1 overflow-y-auto">
          {pending.map((task) => (
            <button
              key={task.id}
              onClick={() => toggleDone(task)}
              className="flex items-center gap-2 px-2 py-1.5 rounded-lg text-left w-full transition-all"
              style={{ background: "rgba(255,255,255,0.03)", border: "1px solid rgba(255,255,255,0.06)", cursor: "pointer" }}
              onMouseEnter={(e) => { e.currentTarget.style.background = "rgba(255,255,255,0.06)"; }}
              onMouseLeave={(e) => { e.currentTarget.style.background = "rgba(255,255,255,0.03)"; }}
            >
              <div
                className="w-3.5 h-3.5 rounded-full flex-shrink-0 border flex items-center justify-center"
                style={{
                  borderColor: PRIORITY_COLOR[task.priority] || "#00F0FF",
                  background: task.status === "done" ? (PRIORITY_COLOR[task.priority] || "#00F0FF") : "transparent",
                }}
              >
                {task.status === "done" && <i className="fa-solid fa-check text-[7px] text-black" />}
              </div>
              <span
                className="text-[11px] font-mono flex-1 truncate"
                style={{
                  color: task.status === "done" ? "rgba(255,255,255,0.25)" : "rgba(255,255,255,0.75)",
                  textDecoration: task.status === "done" ? "line-through" : "none",
                }}
              >
                {task.title}
              </span>
            </button>
          ))}
        </div>
      )}
    </div>
  );
}
