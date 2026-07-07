import React, { useMemo, useState } from "react";
import { getTimeline } from "../lib/activityTimeline";

// ─── Helpers ─────────────────────────────────────────────────────────────────

const EVENT_META = {
  app_open:           { icon: "⊞", label: "Opened",   color: "#00f0ff" },
  app_close:          { icon: "□", label: "Closed",   color: "#ff6b6b" },
  url_visit:          { icon: "⇗", label: "Visited",  color: "#6bffb8" },
  voice_command:      { icon: "▶", label: "Voice",    color: "#c084fc" },
  workspace_restore:  { icon: "↺", label: "Restored", color: "#fbbf24" },
};

function timeAgo(ts) {
  const diff = Date.now() - ts;
  const s = Math.floor(diff / 1000);
  if (s < 60)  return `${s}s ago`;
  const m = Math.floor(s / 60);
  if (m < 60)  return `${m}m ago`;
  const h = Math.floor(m / 60);
  if (h < 24)  return `${h}h ago`;
  return `${Math.floor(h / 24)}d ago`;
}

function eventLabel(e) {
  const meta = EVENT_META[e.type] || { label: e.type, color: "#aaa" };
  const detail =
    e.appId  ? e.appId :
    e.url    ? (() => { try { return new URL(e.url).hostname.replace(/^www\./, ""); } catch { return e.url.slice(0, 24); } })() :
    e.text   ? `"${e.text.slice(0, 30)}${e.text.length > 30 ? '...' : ''}"` :
    "";
  return { label: meta.label, detail, color: meta.color, icon: meta.icon };
}

// ─── Styles ────────────────────────────────────────────────────────────────────

const S = {
  container: {
    fontFamily: "'SF Pro Display', 'Inter', sans-serif",
    color: "#e0f7ff",
    padding: "12px 0",
  },
  header: {
    fontSize: 11,
    fontWeight: 600,
    letterSpacing: "0.08em",
    textTransform: "uppercase",
    color: "rgba(0,240,255,0.5)",
    marginBottom: 10,
    paddingLeft: 4,
  },
  list: {
    listStyle: "none",
    margin: 0,
    padding: 0,
    maxHeight: 260,
    overflowY: "auto",
  },
  item: {
    display: "flex",
    alignItems: "flex-start",
    gap: 10,
    padding: "6px 4px",
    borderBottom: "1px solid rgba(0,240,255,0.05)",
  },
  dot: (color) => ({
    width: 8,
    height: 8,
    borderRadius: "50%",
    background: color,
    marginTop: 5,
    flexShrink: 0,
    boxShadow: `0 0 6px ${color}55`,
  }),
  body: {
    flex: 1,
    minWidth: 0,
  },
  labelRow: {
    fontSize: 12,
    color: "#c8f6ff",
    display: "flex",
    gap: 6,
    alignItems: "baseline",
  },
  detail: {
    fontSize: 11,
    color: "rgba(200,246,255,0.55)",
    overflow: "hidden",
    textOverflow: "ellipsis",
    whiteSpace: "nowrap",
  },
  ts: {
    fontSize: 10,
    color: "rgba(0,240,255,0.35)",
    flexShrink: 0,
    marginTop: 2,
  },
  empty: {
    fontSize: 12,
    color: "rgba(0,240,255,0.3)",
    padding: "8px 4px",
    textAlign: "center",
  },
};

/**
 * CortexTimeline
 * Displays the activity timeline (from activityTimeline.js).
 * Designed to be embedded inside an OS panel, app, or widget.
 *
 * Props:
 *   limit  {number}  Max events to show (default 30)
 *   title  {string}  Section header text (optional)
 */
export default function CortexTimeline({ limit = 30, title = "Activity" }) {
  const [tick, setTick] = useState(0);
  const events = useMemo(() => getTimeline(limit), [limit, tick]); // eslint-disable-line react-hooks/exhaustive-deps

  return (
    <div style={S.container}>
      <div style={S.header}>
        {title}
        <span
          style={{ marginLeft: 8, cursor: "pointer", opacity: 0.6, fontSize: 10 }}
          onClick={() => setTick(t => t + 1)}
          title="Refresh"
        >
          ↻
        </span>
      </div>

      {events.length === 0 ? (
        <div style={S.empty}>No activity recorded yet.</div>
      ) : (
        <ul style={S.list}>
          {events.map((e, i) => {
            const { label, detail, color, icon } = eventLabel(e);
            return (
              <li key={`${e.ts}-${i}`} style={S.item}>
                <div style={S.dot(color)} title={e.type} />
                <div style={S.body}>
                  <div style={S.labelRow}>
                    <span style={{ color }}>{icon}</span>
                    <span>{label}</span>
                    {detail && <span style={S.detail}>{detail}</span>}
                  </div>
                </div>
                <div style={S.ts}>{timeAgo(e.ts)}</div>
              </li>
            );
          })}
        </ul>
      )}
    </div>
  );
}
