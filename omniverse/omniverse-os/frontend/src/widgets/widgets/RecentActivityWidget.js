import React, { useEffect, useState } from "react";
import { api } from "../../lib/api";

function timeAgo(iso) {
  const diff = Date.now() - new Date(iso).getTime();
  const m = Math.floor(diff / 60000);
  if (m < 1)  return "just now";
  if (m < 60) return `${m}m ago`;
  const h = Math.floor(m / 60);
  if (h < 24) return `${h}h ago`;
  return `${Math.floor(h / 24)}d ago`;
}

const TYPE_META = {
  note:  { icon: "fa-note-sticky",  color: "#FCEE09" },
  task:  { icon: "fa-list-check",   color: "#00F0FF" },
  event: { icon: "fa-calendar",     color: "#FF003C" },
  chat:  { icon: "fa-comments",     color: "#00F0FF" },
};

export default function RecentActivityWidget() {
  const [items, setItems] = useState([]);

  useEffect(() => {
    const merge = async () => {
      try {
        const [notes, tasks, events] = await Promise.allSettled([
          api.get("/notes"),
          api.get("/tasks"),
          api.get("/events"),
        ]);
        const all = [
          ...(notes.status === "fulfilled" ? (notes.value.data || []).slice(0, 3).map((n) => ({ ...n, _type: "note",  label: n.title   || "Note"  })) : []),
          ...(tasks.status === "fulfilled" ? (tasks.value.data || []).slice(0, 3).map((t) => ({ ...t, _type: "task",  label: t.title   || "Task"  })) : []),
          ...(events.status === "fulfilled" ? (events.value.data || []).slice(0, 3).map((e) => ({ ...e, _type: "event", label: e.title  || "Event" })) : []),
        ];
        all.sort((a, b) => new Date(b.created_at) - new Date(a.created_at));
        setItems(all.slice(0, 8));
      } catch { /* ignore */ }
    };
    merge();
  }, []);

  return (
    <div className="w-full h-full flex flex-col px-3 py-2 gap-1 select-none overflow-y-auto">
      {items.length === 0 ? (
        <div className="flex-1 flex items-center justify-center">
          <span className="text-[10px] font-mono" style={{ color: "rgba(255,255,255,0.2)" }}>No recent activity</span>
        </div>
      ) : (
        items.map((item, i) => {
          const meta = TYPE_META[item._type] || { icon: "fa-circle", color: "#94A3B8" };
          return (
            <div key={item.id || i} className="flex items-center gap-2 py-1">
              <i
                className={`fa-solid ${meta.icon} text-[10px] flex-shrink-0`}
                style={{ color: meta.color }}
              />
              <span className="text-[11px] font-mono flex-1 truncate" style={{ color: "rgba(255,255,255,0.65)" }}>
                {item.label}
              </span>
              <span className="text-[9px] font-mono flex-shrink-0" style={{ color: "rgba(255,255,255,0.2)" }}>
                {timeAgo(item.created_at)}
              </span>
            </div>
          );
        })
      )}
    </div>
  );
}
