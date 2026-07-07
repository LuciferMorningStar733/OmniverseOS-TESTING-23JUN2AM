/**
 * TimelineApp — Cortex Timeline: chronological intelligence log.
 *
 * Shows both server-persisted events (from /api/timeline)
 * and local activity events (from activityTimeline.js).
 * Grouped by day, filterable by type.
 */
import React, { useCallback, useEffect, useRef, useState } from "react";
import { motion, AnimatePresence } from "framer-motion";
import { timelineApi } from "../lib/intelligenceApi";
import { getTimeline } from "../lib/activityTimeline";

// ─── Helpers ──────────────────────────────────────────────────────────────────

function formatDay(iso) {
  const d = new Date(iso);
  const now = new Date();
  const diff = Math.floor((now - d) / 86_400_000);
  if (diff === 0) return "Today";
  if (diff === 1) return "Yesterday";
  return d.toLocaleDateString("en-US", { weekday: "long", month: "long", day: "numeric" });
}

function formatTime(ts) {
  const d = new Date(typeof ts === "number" ? ts : ts);
  return d.toLocaleTimeString("en-US", { hour: "numeric", minute: "2-digit" });
}

function dayKey(ts) {
  return new Date(typeof ts === "number" ? ts : ts).toDateString();
}

// ─── Event type configs ───────────────────────────────────────────────────────

const TYPE_CONFIG = {
  // Server events
  note_created:      { icon: "fa-note-sticky",       color: "#F59E0B", label: "Note Created" },
  note_updated:      { icon: "fa-pen",                color: "#F59E0B", label: "Note Updated" },
  task_created:      { icon: "fa-list-check",         color: "#39FF14", label: "Task Created" },
  task_completed:    { icon: "fa-circle-check",       color: "#39FF14", label: "Task Done" },
  decision_logged:   { icon: "fa-scale-balanced",     color: "#7B2FFF", label: "Decision Logged" },
  project_created:   { icon: "fa-diagram-project",    color: "#00F0FF", label: "Project Created" },
  session_started:   { icon: "fa-comments",           color: "#00F0FF", label: "Chat Started" },
  memory_extracted:  { icon: "fa-brain",              color: "#2DD4BF", label: "Memory Extracted" },
  // Local events
  app_open:          { icon: "fa-window-restore",     color: "#60A5FA", label: "App Opened" },
  app_close:         { icon: "fa-window-minimize",    color: "#64748b", label: "App Closed" },
  url_visit:         { icon: "fa-globe",              color: "#6bffb8", label: "URL Visited" },
  voice_command:     { icon: "fa-microphone",         color: "#c084fc", label: "Voice Command" },
  workspace_restore: { icon: "fa-rotate-left",        color: "#fbbf24", label: "Workspace Restored" },
};

function getTypeConfig(type) {
  return TYPE_CONFIG[type] || { icon: "fa-circle-dot", color: "#94a3b8", label: type };
}

// ─── Filter bar ───────────────────────────────────────────────────────────────
const FILTER_OPTIONS = [
  { id: "all",         label: "All" },
  { id: "ai",          label: "AI",          types: ["session_started", "memory_extracted", "voice_command"] },
  { id: "notes",       label: "Notes",       types: ["note_created", "note_updated"] },
  { id: "tasks",       label: "Tasks",       types: ["task_created", "task_completed"] },
  { id: "projects",    label: "Projects",    types: ["project_created", "decision_logged"] },
  { id: "apps",        label: "Apps",        types: ["app_open", "app_close", "url_visit"] },
];

function FilterBar({ active, onChange }) {
  return (
    <div style={{
      display: "flex", gap: 4, padding: "10px 16px",
      borderBottom: "1px solid rgba(255,255,255,0.06)",
      flexShrink: 0, flexWrap: "wrap",
    }}>
      {FILTER_OPTIONS.map((f) => (
        <button
          key={f.id}
          onClick={() => onChange(f.id)}
          style={{
            padding: "4px 10px",
            background: active === f.id ? "rgba(0,240,255,0.1)" : "transparent",
            border: `1px solid ${active === f.id ? "rgba(0,240,255,0.3)" : "rgba(255,255,255,0.07)"}`,
            borderRadius: 20, cursor: "pointer",
            color: active === f.id ? "#00F0FF" : "rgba(255,255,255,0.45)",
            fontSize: 11.5, fontFamily: "'Outfit', sans-serif",
            transition: "all 0.15s",
          }}
        >
          {f.label}
        </button>
      ))}
    </div>
  );
}

// ─── Single event row ─────────────────────────────────────────────────────────
function EventRow({ event, isLast }) {
  const cfg = getTypeConfig(event.type);
  const time = formatTime(event.created_at || event.ts);

  // Build display text
  const title = event.title || event.appId || event.text || event.type;
  const subtitle = event.details || (event.url ? (() => {
    try { return new URL(event.url).hostname.replace(/^www\./, ""); } catch { return event.url; }
  })() : null);

  return (
    <div style={{
      display: "flex", alignItems: "flex-start", gap: 12,
      padding: "10px 20px",
      borderBottom: isLast ? "none" : "1px solid rgba(255,255,255,0.03)",
    }}>
      {/* Timeline line + dot */}
      <div style={{
        display: "flex", flexDirection: "column", alignItems: "center",
        flexShrink: 0, marginTop: 2,
      }}>
        <div style={{
          width: 28, height: 28, borderRadius: 8,
          background: `${cfg.color}14`,
          border: `1px solid ${cfg.color}30`,
          display: "flex", alignItems: "center", justifyContent: "center",
          flexShrink: 0,
        }}>
          <i className={`fa-solid ${cfg.icon}`}
             style={{ fontSize: 11, color: cfg.color }} />
        </div>
        {!isLast && (
          <div style={{
            width: 1, flex: 1, minHeight: 8, marginTop: 4,
            background: "rgba(255,255,255,0.06)",
          }} />
        )}
      </div>

      {/* Content */}
      <div style={{ flex: 1, minWidth: 0, paddingBottom: 8 }}>
        <div style={{
          display: "flex", alignItems: "center", gap: 8, marginBottom: 2,
        }}>
          <span style={{
            fontSize: 12.5, fontFamily: "'Outfit', sans-serif",
            color: "rgba(255,255,255,0.8)", fontWeight: 500,
            overflow: "hidden", textOverflow: "ellipsis", whiteSpace: "nowrap",
            flex: 1,
          }}>
            {title}
          </span>
          <span style={{
            fontSize: 10, color: "rgba(255,255,255,0.25)",
            fontFamily: "'JetBrains Mono', monospace", flexShrink: 0,
          }}>
            {time}
          </span>
        </div>
        {subtitle && (
          <div style={{
            fontSize: 11, color: "rgba(255,255,255,0.35)",
            fontFamily: "'Outfit', sans-serif",
            overflow: "hidden", textOverflow: "ellipsis", whiteSpace: "nowrap",
          }}>
            {subtitle}
          </div>
        )}
        <div style={{
          fontSize: 9.5, color: cfg.color, opacity: 0.7,
          fontFamily: "'JetBrains Mono', monospace",
          textTransform: "uppercase", letterSpacing: "0.06em",
          marginTop: 3,
        }}>
          {cfg.label}
          {event.source === "cortex" && (
            <span style={{ marginLeft: 6, color: "#7B2FFF" }}>· CORTEX</span>
          )}
        </div>
      </div>
    </div>
  );
}

// ─── Day group ────────────────────────────────────────────────────────────────
function DayGroup({ dayLabel, events }) {
  return (
    <div style={{ marginBottom: 4 }}>
      <div style={{
        padding: "8px 20px 4px",
        fontSize: 10, fontWeight: 700,
        fontFamily: "'JetBrains Mono', monospace",
        color: "rgba(255,255,255,0.25)",
        textTransform: "uppercase", letterSpacing: "0.1em",
        position: "sticky", top: 0,
        background: "rgba(5,6,18,0.92)",
        backdropFilter: "blur(8px)",
        zIndex: 1,
      }}>
        {dayLabel}
        <span style={{ marginLeft: 8, fontWeight: 400 }}>
          ({events.length})
        </span>
      </div>
      {events.map((e, i) => (
        <EventRow
          key={e.id || `${e.ts}-${i}`}
          event={e}
          isLast={i === events.length - 1}
        />
      ))}
    </div>
  );
}

// ─── Main App ─────────────────────────────────────────────────────────────────
export default function TimelineApp() {
  const [serverEvents, setServerEvents] = useState([]);
  const [localEvents,  setLocalEvents]  = useState([]);
  const [loading,      setLoading]      = useState(true);
  const [filter,       setFilter]       = useState("all");
  const [refreshKey,   setRefreshKey]   = useState(0);
  const scrollRef = useRef(null);

  const load = useCallback(async () => {
    setLoading(true);
    try {
      const server = await timelineApi.list({ limit: 200 });
      setServerEvents(server);
    } catch {
      // server events optional — local events still show
    }
    // Load local activity
    const local = getTimeline(150);
    setLocalEvents(local);
    setLoading(false);
  }, []);

  useEffect(() => { load(); }, [load, refreshKey]);

  // Merge and sort all events
  const allEvents = React.useMemo(() => {
    const normalized = [
      ...serverEvents.map((e) => ({
        ...e,
        _ts: new Date(e.created_at).getTime(),
        _source: "server",
      })),
      ...localEvents.map((e) => ({
        id: `local-${e.ts}`,
        type: e.type,
        title: e.appId || e.text || e.type,
        details: e.url,
        created_at: new Date(e.ts).toISOString(),
        _ts: e.ts,
        _source: "local",
        ...e,
      })),
    ];
    return normalized.sort((a, b) => b._ts - a._ts);
  }, [serverEvents, localEvents]);

  // Apply filter
  const filteredEvents = React.useMemo(() => {
    if (filter === "all") return allEvents;
    const opt = FILTER_OPTIONS.find((f) => f.id === filter);
    if (!opt?.types) return allEvents;
    return allEvents.filter((e) => opt.types.includes(e.type));
  }, [allEvents, filter]);

  // Group by day
  const dayGroups = React.useMemo(() => {
    const groups = new Map();
    for (const e of filteredEvents) {
      const key = dayKey(e._ts);
      if (!groups.has(key)) groups.set(key, { label: formatDay(e.created_at), events: [] });
      groups.get(key).events.push(e);
    }
    return Array.from(groups.values());
  }, [filteredEvents]);

  return (
    <div style={{
      display: "flex", flexDirection: "column", height: "100%",
      background: "rgba(5,6,18,0.7)", color: "#fff",
    }}>
      {/* Header */}
      <div style={{
        padding: "14px 20px 10px",
        borderBottom: "1px solid rgba(255,255,255,0.06)",
        flexShrink: 0,
        display: "flex", alignItems: "center", justifyContent: "space-between",
      }}>
        <div>
          <div style={{
            fontSize: 15, fontWeight: 600,
            fontFamily: "'Outfit', sans-serif", color: "#fff",
          }}>
            <i className="fa-solid fa-timeline" style={{ marginRight: 8, color: "#00F0FF", fontSize: 13 }} />
            Cortex Timeline
          </div>
          <div style={{
            fontSize: 10, color: "rgba(255,255,255,0.3)",
            fontFamily: "'JetBrains Mono', monospace", marginTop: 2,
          }}>
            {filteredEvents.length} events
          </div>
        </div>
        <button
          onClick={() => setRefreshKey((k) => k + 1)}
          style={{
            width: 32, height: 32,
            background: "rgba(255,255,255,0.04)",
            border: "1px solid rgba(255,255,255,0.08)",
            borderRadius: 9, cursor: "pointer",
            display: "flex", alignItems: "center", justifyContent: "center",
            color: "rgba(255,255,255,0.4)",
          }}
        >
          <i className="fa-solid fa-arrows-rotate" style={{ fontSize: 12 }} />
        </button>
      </div>

      {/* Filter bar */}
      <FilterBar active={filter} onChange={setFilter} />

      {/* Event list */}
      <div ref={scrollRef} style={{ flex: 1, overflowY: "auto" }}>
        {loading ? (
          <div style={{
            display: "flex", alignItems: "center", justifyContent: "center",
            height: 200,
          }}>
            <i className="fa-solid fa-spinner fa-spin"
               style={{ color: "rgba(0,240,255,0.4)", fontSize: 22 }} />
          </div>
        ) : dayGroups.length === 0 ? (
          <div style={{
            padding: "60px 20px", textAlign: "center",
            color: "rgba(255,255,255,0.2)",
            fontFamily: "'Outfit', sans-serif",
          }}>
            <i className="fa-solid fa-timeline"
               style={{ fontSize: 32, marginBottom: 12, display: "block", opacity: 0.15 }} />
            No timeline events yet.
            <br />
            <span style={{ fontSize: 12 }}>
              Events appear automatically as you work.
            </span>
          </div>
        ) : (
          <AnimatePresence>
            {dayGroups.map((group, i) => (
              <motion.div
                key={group.label}
                initial={{ opacity: 0 }}
                animate={{ opacity: 1 }}
                transition={{ delay: i * 0.04 }}
              >
                <DayGroup dayLabel={group.label} events={group.events} />
              </motion.div>
            ))}
          </AnimatePresence>
        )}
      </div>
    </div>
  );
}
