/**
 * ToolHistorySidebar — shared history panel for Adversary, War Room, Dead Reckoning.
 *
 * Props:
 *   sessions         array of session objects
 *   activeSessionId  string | null
 *   onSelect(id)     called when user clicks a session
 *   onNewRun()       called when user clicks "New Run"
 *   onRename(id, title)
 *   onDelete(id)     parent handles confirmation
 *   accentColor      CSS color string for the tool accent
 *   loading          bool — true while fetching sessions
 */
import React, { useState, useRef, useCallback } from "react";

function formatRelTime(iso) {
  if (!iso) return "";
  try {
    const ms = Date.now() - new Date(iso).getTime();
    const s = Math.floor(ms / 1000);
    if (s < 60)      return "just now";
    const m = Math.floor(s / 60);
    if (m < 60)      return `${m}m ago`;
    const h = Math.floor(m / 60);
    if (h < 24)      return `${h}h ago`;
    const d = Math.floor(h / 24);
    if (d < 7)       return `${d}d ago`;
    return new Date(iso).toLocaleDateString([], { month: "short", day: "numeric" });
  } catch { return ""; }
}

function SessionItem({ session, isActive, accentColor, onSelect, onRename, onDelete }) {
  const [hovered,      setHovered]      = useState(false);
  const [editing,      setEditing]      = useState(false);
  const [editValue,    setEditValue]    = useState(session.title || "New Run");
  const [confirmDel,   setConfirmDel]   = useState(false);
  const inputRef = useRef(null);

  const startEdit = useCallback((e) => {
    e.stopPropagation();
    setEditValue(session.title || "");
    setEditing(true);
    setTimeout(() => inputRef.current?.select(), 30);
  }, [session.title]);

  const commitEdit = useCallback(() => {
    setEditing(false);
    const trimmed = editValue.trim();
    if (trimmed && trimmed !== session.title) onRename(session.session_id, trimmed);
  }, [editValue, session, onRename]);

  const handleDelete = useCallback((e) => {
    e.stopPropagation();
    if (confirmDel) {
      onDelete(session.session_id);
      setConfirmDel(false);
    } else {
      setConfirmDel(true);
      setTimeout(() => setConfirmDel(false), 3000);
    }
  }, [confirmDel, onDelete, session.session_id]);

  return (
    <div
      onClick={() => !editing && onSelect(session.session_id)}
      onMouseEnter={() => setHovered(true)}
      onMouseLeave={() => { setHovered(false); setConfirmDel(false); }}
      style={{
        padding: "9px 12px",
        borderRadius: 8,
        cursor: editing ? "default" : "pointer",
        background: isActive
          ? `${accentColor}14`
          : hovered
          ? "rgba(255,255,255,0.04)"
          : "transparent",
        border: isActive
          ? `1px solid ${accentColor}28`
          : "1px solid transparent",
        transition: "background 0.15s, border 0.15s",
        position: "relative",
      }}
    >
      {editing ? (
        <input
          ref={inputRef}
          value={editValue}
          onChange={(e) => setEditValue(e.target.value)}
          onBlur={commitEdit}
          onKeyDown={(e) => {
            if (e.key === "Enter") commitEdit();
            if (e.key === "Escape") setEditing(false);
          }}
          onClick={(e) => e.stopPropagation()}
          style={{
            width: "100%", background: "rgba(255,255,255,0.07)", border: `1px solid ${accentColor}40`,
            borderRadius: 5, color: "#fff", fontSize: 12, padding: "3px 6px", outline: "none",
            fontFamily: "'Inter', sans-serif",
          }}
        />
      ) : (
        <>
          <div style={{
            fontSize: 12, color: isActive ? "#fff" : "rgba(255,255,255,0.70)",
            overflow: "hidden", textOverflow: "ellipsis", whiteSpace: "nowrap",
            paddingRight: (hovered || isActive) ? 44 : 0,
            fontFamily: "'Inter', sans-serif", lineHeight: 1.4,
          }}>
            {session.title || "Untitled Run"}
          </div>
          {session.preview && (
            <div style={{
              fontSize: 10.5, color: "rgba(255,255,255,0.28)", marginTop: 2,
              overflow: "hidden", textOverflow: "ellipsis", whiteSpace: "nowrap",
              fontFamily: "'Inter', sans-serif",
            }}>
              {session.preview}
            </div>
          )}
          <div style={{
            fontSize: 9.5, color: `${accentColor}60`, marginTop: 2,
            fontFamily: "'JetBrains Mono', monospace", letterSpacing: "0.04em",
          }}>
            {formatRelTime(session.updated_at)}
          </div>

          {/* Action buttons — visible on hover */}
          {(hovered || isActive) && (
            <div
              style={{
                position: "absolute", right: 8, top: "50%", transform: "translateY(-50%)",
                display: "flex", gap: 4,
              }}
              onClick={(e) => e.stopPropagation()}
            >
              <button
                title="Rename"
                onClick={startEdit}
                style={{
                  width: 22, height: 22, borderRadius: 5, border: "none", cursor: "pointer",
                  background: "rgba(255,255,255,0.07)",
                  color: "rgba(255,255,255,0.45)",
                  display: "flex", alignItems: "center", justifyContent: "center",
                  transition: "background 0.15s, color 0.15s",
                }}
                onMouseEnter={(e) => { e.currentTarget.style.background = "rgba(255,255,255,0.14)"; e.currentTarget.style.color = "#fff"; }}
                onMouseLeave={(e) => { e.currentTarget.style.background = "rgba(255,255,255,0.07)"; e.currentTarget.style.color = "rgba(255,255,255,0.45)"; }}
              >
                <i className="fa-solid fa-pencil" style={{ fontSize: 9 }} />
              </button>
              <button
                title={confirmDel ? "Click again to confirm" : "Delete"}
                onClick={handleDelete}
                style={{
                  width: 22, height: 22, borderRadius: 5, border: "none", cursor: "pointer",
                  background: confirmDel ? "rgba(255,0,60,0.18)" : "rgba(255,255,255,0.07)",
                  color: confirmDel ? "#FF003C" : "rgba(255,255,255,0.45)",
                  display: "flex", alignItems: "center", justifyContent: "center",
                  transition: "background 0.15s, color 0.15s",
                }}
                onMouseEnter={(e) => {
                  if (!confirmDel) {
                    e.currentTarget.style.background = "rgba(255,0,60,0.12)";
                    e.currentTarget.style.color = "#FF7090";
                  }
                }}
                onMouseLeave={(e) => {
                  if (!confirmDel) {
                    e.currentTarget.style.background = "rgba(255,255,255,0.07)";
                    e.currentTarget.style.color = "rgba(255,255,255,0.45)";
                  }
                }}
              >
                <i className={`fa-solid ${confirmDel ? "fa-check" : "fa-trash"}`} style={{ fontSize: 9 }} />
              </button>
            </div>
          )}
        </>
      )}
    </div>
  );
}

export default function ToolHistorySidebar({
  sessions = [],
  activeSessionId,
  onSelect,
  onNewRun,
  onRename,
  onDelete,
  accentColor = "#7B2FFF",
  loading = false,
  label = "History",
}) {
  return (
    <div
      style={{
        width: 220, flexShrink: 0, display: "flex", flexDirection: "column",
        borderRight: "1px solid rgba(255,255,255,0.06)",
        background: "rgba(0,0,0,0.25)",
        height: "100%",
      }}
    >
      {/* Header */}
      <div style={{
        padding: "14px 12px 10px",
        borderBottom: "1px solid rgba(255,255,255,0.05)",
        flexShrink: 0,
      }}>
        <button
          onClick={onNewRun}
          style={{
            width: "100%", padding: "8px 12px", borderRadius: 8, cursor: "pointer",
            background: `${accentColor}12`, border: `1px solid ${accentColor}28`,
            color: accentColor, fontFamily: "'JetBrains Mono', monospace",
            fontSize: 11, fontWeight: 700, letterSpacing: "0.08em",
            display: "flex", alignItems: "center", justifyContent: "center", gap: 7,
            transition: "background 0.15s",
          }}
          onMouseEnter={(e) => { e.currentTarget.style.background = `${accentColor}22`; }}
          onMouseLeave={(e) => { e.currentTarget.style.background = `${accentColor}12`; }}
        >
          <i className="fa-solid fa-plus" style={{ fontSize: 10 }} />
          NEW RUN
        </button>
      </div>

      {/* Session list */}
      <div style={{ flex: 1, overflowY: "auto", padding: "6px 6px 12px" }}>
        {loading && sessions.length === 0 && (
          <div style={{
            padding: "16px 12px", textAlign: "center",
            fontSize: 11, color: "rgba(255,255,255,0.2)",
            fontFamily: "'JetBrains Mono', monospace",
          }}>
            loading…
          </div>
        )}

        {!loading && sessions.length === 0 && (
          <div style={{
            padding: "20px 12px", textAlign: "center",
            fontSize: 11, color: "rgba(255,255,255,0.18)",
            fontFamily: "'JetBrains Mono', monospace", lineHeight: 1.7,
          }}>
            No runs yet.<br />
            Start your first run.
          </div>
        )}

        {sessions.map((s) => (
          <SessionItem
            key={s.session_id}
            session={s}
            isActive={s.session_id === activeSessionId}
            accentColor={accentColor}
            onSelect={onSelect}
            onRename={onRename}
            onDelete={onDelete}
          />
        ))}
      </div>

      {/* Footer label */}
      <div style={{
        padding: "8px 12px",
        borderTop: "1px solid rgba(255,255,255,0.04)",
        fontFamily: "'JetBrains Mono', monospace", fontSize: 9,
        color: "rgba(255,255,255,0.15)", letterSpacing: "0.12em",
        textTransform: "uppercase",
      }}>
        {label}
      </div>
    </div>
  );
}
