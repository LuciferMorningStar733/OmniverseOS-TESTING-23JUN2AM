import React, { useCallback, useEffect, useState } from "react";
import { activityApi } from "../lib/api";

// ─── Palette ──────────────────────────────────────────────────────────────────
const C = {
  cyan:      "#00F0FF",
  cyanDim:   "rgba(0,240,255,0.5)",
  cyanBg:    "rgba(0,240,255,0.07)",
  cyanBdr:   "rgba(0,240,255,0.2)",
  text:      "#deeeff",
  textMuted: "rgba(180,210,240,0.45)",
  surface:   "rgba(8,8,20,0.97)",
  border:    "rgba(0,240,255,0.08)",
};

// ─── Filter chips definition ──────────────────────────────────────────────────
const FILTERS = [
  { id: null,       label: "All",      icon: "◈", color: C.cyan },
  { id: "ai",       label: "AI",       icon: "✦", color: "#CF9EFF" },
  { id: "notes",    label: "Notes",    icon: "◻", color: "#FCEE09" },
  { id: "tasks",    label: "Tasks",    icon: "◇", color: "#39FF14" },
  { id: "projects", label: "Projects", icon: "⬡", color: "#A855F7" },
  { id: "apps",     label: "Apps",     icon: "⊞", color: "#60A5FA" },
];

const CATEGORY_COLOR = {
  ai:       "#CF9EFF",
  notes:    "#FCEE09",
  tasks:    "#39FF14",
  projects: "#A855F7",
  apps:     "#60A5FA",
};

const EVENT_ICON = {
  app_open:          "⊞",
  app_close:         "□",
  url_visit:         "⇗",
  voice_command:     "▶",
  workspace_restore: "↺",
  note_created:      "✎",
  note_updated:      "✏",
  task_created:      "◇",
  task_updated:      "◈",
  task_completed:    "✔",
  project_created:   "⬡",
  project_updated:   "⬡",
  decision_logged:   "⊕",
  ai_chat:           "✦",
  image_generated:   "⬚",
  memory_added:      "◉",
};

// ─── Helpers ──────────────────────────────────────────────────────────────────
function fmtTime(iso) {
  if (!iso) return "";
  try {
    return new Date(iso).toLocaleTimeString("en-US", { hour: "numeric", minute: "2-digit", hour12: true });
  } catch { return ""; }
}

function fmtDayLabel(iso) {
  if (!iso) return "Unknown";
  try {
    const d = new Date(iso);
    const now = new Date();
    const today    = new Date(now.getFullYear(), now.getMonth(), now.getDate());
    const eventDay = new Date(d.getFullYear(), d.getMonth(), d.getDate());
    const diff = today - eventDay;
    if (diff === 0)       return "Today";
    if (diff === 86400000) return "Yesterday";
    return d.toLocaleDateString("en-US", { weekday: "long", month: "long", day: "numeric" });
  } catch { return iso.slice(0, 10); }
}

function groupByDay(events) {
  const groups = [];
  let currentLabel = null;
  let currentGroup = null;
  for (const e of events) {
    const label = fmtDayLabel(e.created_at);
    if (label !== currentLabel) {
      currentLabel = label;
      currentGroup = { label, events: [] };
      groups.push(currentGroup);
    }
    currentGroup.events.push(e);
  }
  return groups;
}

function Spinner() {
  return (
    <div style={{ display: "flex", alignItems: "center", justifyContent: "center", padding: "60px 0" }}>
      <div style={{
        width: 28, height: 28, border: `2px solid ${C.cyanBdr}`,
        borderTopColor: C.cyan, borderRadius: "50%",
        animation: "tlSpin 0.7s linear infinite",
      }} />
    </div>
  );
}

// ─── Event row ────────────────────────────────────────────────────────────────
function EventRow({ event, isLast }) {
  const color    = CATEGORY_COLOR[event.category] || C.cyan;
  const icon     = EVENT_ICON[event.type] || "·";
  const meta     = event.meta || {};

  let subtitle = "";
  if (meta.appId)  subtitle = meta.appId;
  else if (meta.url) { try { subtitle = new URL(meta.url).hostname; } catch { subtitle = meta.url.slice(0, 36); } }
  else if (meta.text) subtitle = String(meta.text).slice(0, 60);

  return (
    <div style={{
      display: "flex", alignItems: "flex-start", gap: 12,
      padding: "8px 0",
      borderBottom: isLast ? "none" : `1px solid ${C.border}`,
    }}>
      {/* Colored icon dot */}
      <div style={{
        width: 28, height: 28, borderRadius: 8, flexShrink: 0,
        background: `${color}14`,
        border: `1px solid ${color}30`,
        display: "flex", alignItems: "center", justifyContent: "center",
        fontSize: 13, color, marginTop: 1,
      }}>
        {icon}
      </div>

      {/* Body */}
      <div style={{ flex: 1, minWidth: 0 }}>
        <div style={{ fontSize: 13, color: C.text, fontWeight: 500, lineHeight: 1.3 }}>
          {event.title}
        </div>
        {subtitle && (
          <div style={{ fontSize: 11, color: C.textMuted, marginTop: 2, overflow: "hidden", textOverflow: "ellipsis", whiteSpace: "nowrap" }}>
            {subtitle}
          </div>
        )}
      </div>

      {/* Time + category badge */}
      <div style={{ display: "flex", flexDirection: "column", alignItems: "flex-end", gap: 4, flexShrink: 0 }}>
        <span style={{ fontSize: 10, fontFamily: "'JetBrains Mono', monospace", color: C.cyanDim }}>
          {fmtTime(event.created_at)}
        </span>
        <span style={{
          fontSize: 9, fontFamily: "'JetBrains Mono', monospace",
          fontWeight: 600, letterSpacing: "0.07em", textTransform: "uppercase",
          padding: "1px 6px", borderRadius: 20,
          background: `${color}14`, border: `1px solid ${color}28`,
          color: `${color}cc`,
        }}>
          {event.category || "apps"}
        </span>
      </div>
    </div>
  );
}

// ─── Day group ────────────────────────────────────────────────────────────────
function DayGroup({ group }) {
  return (
    <div style={{ marginBottom: 20 }}>
      {/* Day header */}
      <div style={{
        display: "flex", alignItems: "center", gap: 10, marginBottom: 8,
        position: "sticky", top: 0, zIndex: 2,
        background: "rgba(8,8,20,0.92)", backdropFilter: "blur(8px)",
        padding: "4px 0",
      }}>
        <div style={{ flex: 1, height: 1, background: `linear-gradient(to right, ${C.cyanBdr}, transparent)` }} />
        <span style={{
          fontSize: 10, fontFamily: "'JetBrains Mono', monospace", fontWeight: 600,
          letterSpacing: "0.12em", textTransform: "uppercase",
          color: C.cyanDim, padding: "2px 10px",
          border: `1px solid ${C.cyanBdr}`, borderRadius: 20,
          background: C.cyanBg,
        }}>
          {group.label} · {group.events.length}
        </span>
        <div style={{ flex: 1, height: 1, background: `linear-gradient(to left, ${C.cyanBdr}, transparent)` }} />
      </div>

      {/* Events */}
      {group.events.map((e, i) => (
        <EventRow key={e.id || `${e.type}-${e.created_at}-${i}`} event={e} isLast={i === group.events.length - 1} />
      ))}
    </div>
  );
}

// ─── Main App ─────────────────────────────────────────────────────────────────
export default function TimelineApp() {
  const [activeFilter, setActiveFilter] = useState(null);
  const [events, setEvents]             = useState([]);
  const [loading, setLoading]           = useState(true);
  const [total, setTotal]               = useState(0);

  const load = useCallback(async (cat) => {
    setLoading(true);
    try {
      const data = await activityApi.timeline(cat, 300);
      setEvents(data || []);
      setTotal(data?.length || 0);
    } catch {
      setEvents([]);
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => { load(activeFilter); }, [activeFilter, load]);

  const groups = groupByDay(events);
  const activeFilterMeta = FILTERS.find(f => f.id === activeFilter) || FILTERS[0];

  return (
    <div style={{
      width: "100%", height: "100%",
      display: "flex", flexDirection: "column",
      background: "linear-gradient(160deg, #050510 0%, #080516 60%, #050510 100%)",
      color: C.text,
      fontFamily: "'Outfit', 'Inter', sans-serif",
      overflow: "hidden",
    }}>
      <style>{`
        @keyframes tlSpin { to { transform: rotate(360deg); } }
        .tl-chip:hover { opacity: 1 !important; }
        .tl-scroll::-webkit-scrollbar { width: 3px; }
        .tl-scroll::-webkit-scrollbar-track { background: transparent; }
        .tl-scroll::-webkit-scrollbar-thumb { background: ${C.cyanBdr}; border-radius: 2px; }
      `}</style>

      {/* Header */}
      <div style={{
        padding: "14px 20px 0",
        borderBottom: `1px solid ${C.border}`,
        background: "rgba(0,0,0,0.3)",
        flexShrink: 0,
      }}>
        <div style={{ display: "flex", alignItems: "center", gap: 10, marginBottom: 12 }}>
          <div style={{
            width: 32, height: 32, borderRadius: "50%",
            background: `radial-gradient(circle at 40% 35%, ${C.cyan} 0%, rgba(0,120,180,0.7) 100%)`,
            display: "flex", alignItems: "center", justifyContent: "center",
            fontSize: 15, boxShadow: `0 0 14px ${C.cyan}40`,
          }}>⟁</div>
          <div>
            <div style={{ fontWeight: 700, fontSize: 16, letterSpacing: "-0.3px" }}>Cortex Timeline</div>
            <div style={{ fontSize: 10, color: C.textMuted, fontFamily: "'JetBrains Mono', monospace", letterSpacing: "0.1em", textTransform: "uppercase" }}>
              {loading ? "loading…" : `${total} event${total !== 1 ? "s" : ""} · ${activeFilterMeta.label}`}
            </div>
          </div>
        </div>

        {/* Filter chips */}
        <div style={{ display: "flex", gap: 6, paddingBottom: 12, overflowX: "auto", flexShrink: 0 }}>
          {FILTERS.map(f => {
            const active = activeFilter === f.id;
            return (
              <button
                key={String(f.id)}
                className="tl-chip"
                onClick={() => setActiveFilter(f.id)}
                style={{
                  background: active ? `${f.color}18` : "none",
                  border: `1px solid ${active ? f.color + "55" : C.border}`,
                  borderRadius: 20,
                  color: active ? f.color : C.textMuted,
                  cursor: "pointer",
                  fontSize: 11, fontWeight: active ? 600 : 400,
                  padding: "4px 12px",
                  transition: "all 0.15s",
                  whiteSpace: "nowrap",
                  display: "flex", alignItems: "center", gap: 5,
                  opacity: active ? 1 : 0.7,
                  flexShrink: 0,
                }}
              >
                <span>{f.icon}</span>
                {f.label}
              </button>
            );
          })}

          <button
            onClick={() => load(activeFilter)}
            style={{
              marginLeft: "auto",
              background: "none",
              border: `1px solid ${C.border}`,
              borderRadius: 20, color: C.cyanDim,
              cursor: "pointer", fontSize: 11,
              padding: "4px 12px", flexShrink: 0,
              transition: "all 0.15s",
            }}
            title="Refresh timeline"
          >
            ↻ Refresh
          </button>
        </div>
      </div>

      {/* Timeline body */}
      <div className="tl-scroll" style={{ flex: 1, overflowY: "auto", padding: "16px 20px" }}>
        {loading && <Spinner />}

        {!loading && events.length === 0 && (
          <div style={{ textAlign: "center", color: C.textMuted, padding: "60px 20px" }}>
            <div style={{ fontSize: 32, marginBottom: 12, opacity: 0.3 }}>⟁</div>
            <div style={{ fontSize: 14, marginBottom: 6 }}>No events yet</div>
            <div style={{ fontSize: 12, opacity: 0.6 }}>
              Events are recorded as you use OmniverseOS. Try opening an app or chatting with Cortex.
            </div>
          </div>
        )}

        {!loading && groups.map((g, i) => (
          <DayGroup key={`${g.label}-${i}`} group={g} />
        ))}
      </div>
    </div>
  );
}
