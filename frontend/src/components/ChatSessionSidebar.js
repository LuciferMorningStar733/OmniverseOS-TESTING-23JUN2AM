/**
 * ChatSessionSidebar — ChatGPT-style session management panel.
 *
 * Features:
 *  - Session list (pinned first, then by recency)
 *  - New Chat button
 *  - Per-session: rename, pin, duplicate, delete (right-click / kebab menu)
 *  - Inline search
 *  - Compact mode for narrow windows
 */
import React, { useCallback, useEffect, useRef, useState } from "react";
import { toast } from "sonner";
import { conversationSearchApi } from "../lib/intelligenceApi";

/* ── Utilities ────────────────────────────────────────────────────────── */
function relativeTime(isoStr) {
  if (!isoStr) return "";
  const diff = Date.now() - new Date(isoStr).getTime();
  const m = Math.floor(diff / 60_000);
  if (m < 1)  return "just now";
  if (m < 60) return `${m}m ago`;
  const h = Math.floor(m / 60);
  if (h < 24) return `${h}h ago`;
  const d = Math.floor(h / 24);
  if (d < 7)  return `${d}d ago`;
  return new Date(isoStr).toLocaleDateString("en-US", { month: "short", day: "numeric" });
}

/* ── Session context-menu ─────────────────────────────────────────────── */
function SessionMenu({ session, onRename, onPin, onDuplicate, onDelete, onClose, anchorRef }) {
  const menuRef = useRef(null);

  useEffect(() => {
    const handler = (e) => {
      if (menuRef.current && !menuRef.current.contains(e.target) &&
          anchorRef?.current && !anchorRef.current.contains(e.target)) {
        onClose();
      }
    };
    document.addEventListener("mousedown", handler);
    return () => document.removeEventListener("mousedown", handler);
  }, [onClose, anchorRef]);

  const items = [
    { icon: "fa-pen", label: "Rename", action: onRename },
    { icon: session.pinned ? "fa-thumbtack fa-rotate-90" : "fa-thumbtack", label: session.pinned ? "Unpin" : "Pin", action: onPin },
    { icon: "fa-copy", label: "Duplicate", action: onDuplicate },
    null, // divider
    { icon: "fa-trash", label: "Delete", action: onDelete, danger: true },
  ];

  return (
    <div
      ref={menuRef}
      style={{
        position: "absolute", right: 6, top: "calc(100% + 4px)",
        zIndex: 9999, minWidth: 168,
        background: "rgba(6,8,18,0.97)",
        border: "1px solid rgba(0,240,255,0.18)",
        borderRadius: 12,
        backdropFilter: "blur(32px)",
        boxShadow: "0 16px 48px rgba(0,0,0,0.75), 0 0 0 1px rgba(0,240,255,0.06)",
        overflow: "hidden",
        animation: "sessionMenuIn 0.14s ease both",
      }}
    >
      <style>{`@keyframes sessionMenuIn { from { opacity:0; transform:scale(0.95) translateY(-4px); } to { opacity:1; transform:scale(1) translateY(0); } }`}</style>
      {items.map((item, i) =>
        item === null ? (
          <div key={i} style={{ height: 1, background: "rgba(255,255,255,0.06)", margin: "2px 0" }} />
        ) : (
          <button
            key={i}
            onClick={() => { item.action(); onClose(); }}
            style={{
              display: "flex", alignItems: "center", gap: 10,
              width: "100%", padding: "9px 14px",
              background: "transparent", border: "none", cursor: "pointer",
              color: item.danger ? "#FF4466" : "rgba(255,255,255,0.75)",
              fontSize: 12.5, fontFamily: "'Outfit', sans-serif",
              textAlign: "left", transition: "background 0.1s",
            }}
            onMouseEnter={(e) => {
              e.currentTarget.style.background = item.danger
                ? "rgba(255,0,60,0.12)" : "rgba(0,240,255,0.08)";
            }}
            onMouseLeave={(e) => { e.currentTarget.style.background = "transparent"; }}
          >
            <i className={`fa-solid ${item.icon}`} style={{ width: 14, fontSize: 11, textAlign: "center" }} />
            {item.label}
          </button>
        )
      )}
    </div>
  );
}

/* ── Inline rename input ──────────────────────────────────────────────── */
function RenameInput({ initialValue, onSave, onCancel }) {
  const [val, setVal] = useState(initialValue);
  const inputRef = useRef(null);

  useEffect(() => { inputRef.current?.focus(); inputRef.current?.select(); }, []);

  const save = useCallback(() => {
    const trimmed = val.trim();
    if (trimmed && trimmed !== initialValue) onSave(trimmed);
    else onCancel();
  }, [val, initialValue, onSave, onCancel]);

  return (
    <input
      ref={inputRef}
      value={val}
      onChange={(e) => setVal(e.target.value)}
      onKeyDown={(e) => { if (e.key === "Enter") save(); if (e.key === "Escape") onCancel(); }}
      onBlur={save}
      style={{
        flex: 1, minWidth: 0,
        background: "rgba(0,240,255,0.07)",
        border: "1px solid rgba(0,240,255,0.35)",
        borderRadius: 6,
        color: "#fff", fontSize: 12.5,
        fontFamily: "'Outfit', sans-serif",
        padding: "3px 8px",
        outline: "none",
      }}
      onClick={(e) => e.stopPropagation()}
    />
  );
}

/* ── Single session row ───────────────────────────────────────────────── */
const SessionRow = React.memo(function SessionRow({
  session, isActive, onSelect, onRename, onPin, onDuplicate, onDelete,
}) {
  const [menuOpen, setMenuOpen] = useState(false);
  const [renaming, setRenaming] = useState(false);
  const kebabRef = useRef(null);
  const rowRef   = useRef(null);

  const handleContextMenu = useCallback((e) => {
    e.preventDefault();
    setMenuOpen(true);
  }, []);

  const doRename = useCallback((title) => {
    onRename(session.session_id, title);
    setRenaming(false);
  }, [session.session_id, onRename]);

  return (
    <div
      ref={rowRef}
      style={{ position: "relative" }}
      onContextMenu={handleContextMenu}
    >
      <div
        onClick={() => !renaming && onSelect(session.session_id)}
        style={{
          display: "flex", alignItems: "center", gap: 10,
          padding: "9px 10px 9px 12px",
          borderRadius: 10,
          background: isActive
            ? "rgba(0,240,255,0.1)"
            : "transparent",
          border: isActive
            ? "1px solid rgba(0,240,255,0.22)"
            : "1px solid transparent",
          cursor: "pointer",
          transition: "all 0.15s ease",
          position: "relative",
        }}
        onMouseEnter={(e) => {
          if (!isActive) {
            e.currentTarget.style.background = "rgba(255,255,255,0.04)";
            e.currentTarget.style.borderColor = "rgba(255,255,255,0.07)";
          }
        }}
        onMouseLeave={(e) => {
          if (!isActive) {
            e.currentTarget.style.background = "transparent";
            e.currentTarget.style.borderColor = "transparent";
          }
        }}
      >
        {/* Pin indicator */}
        {session.pinned && (
          <i className="fa-solid fa-thumbtack" style={{
            fontSize: 8, color: "rgba(207,158,255,0.6)",
            flexShrink: 0, position: "absolute", top: 6, right: 28,
          }} />
        )}

        {/* Icon */}
        <div style={{
          width: 28, height: 28, borderRadius: 8, flexShrink: 0,
          background: isActive
            ? "radial-gradient(circle at 38% 35%, rgba(0,240,255,0.5) 0%, rgba(0,240,255,0.12) 100%)"
            : "rgba(255,255,255,0.04)",
          display: "flex", alignItems: "center", justifyContent: "center",
          border: isActive ? "1px solid rgba(0,240,255,0.2)" : "1px solid rgba(255,255,255,0.06)",
          transition: "all 0.15s",
        }}>
          <i className="fa-solid fa-message" style={{
            fontSize: 11,
            color: isActive ? "#00F0FF" : "rgba(255,255,255,0.35)",
          }} />
        </div>

        {/* Content */}
        <div style={{ flex: 1, minWidth: 0 }}>
          {renaming ? (
            <RenameInput
              initialValue={session.title || "New Chat"}
              onSave={doRename}
              onCancel={() => setRenaming(false)}
            />
          ) : (
            <>
              <div style={{
                fontSize: 12.5, fontFamily: "'Outfit', sans-serif",
                color: isActive ? "#fff" : "rgba(255,255,255,0.72)",
                fontWeight: isActive ? 500 : 400,
                whiteSpace: "nowrap", overflow: "hidden", textOverflow: "ellipsis",
                lineHeight: 1.3,
              }}>
                {session.title || "New Chat"}
              </div>
              <div style={{
                fontSize: 10, color: "rgba(255,255,255,0.28)",
                fontFamily: "'JetBrains Mono', monospace",
                marginTop: 1,
                whiteSpace: "nowrap", overflow: "hidden", textOverflow: "ellipsis",
              }}>
                {session.preview
                  ? session.preview.slice(0, 40)
                  : relativeTime(session.updated_at)}
              </div>
            </>
          )}
        </div>

        {/* Kebab button */}
        {!renaming && (
          <button
            ref={kebabRef}
            onClick={(e) => { e.stopPropagation(); setMenuOpen((v) => !v); }}
            style={{
              width: 22, height: 22, flexShrink: 0,
              background: "transparent", border: "none",
              cursor: "pointer", display: "flex", alignItems: "center", justifyContent: "center",
              borderRadius: 6, color: "rgba(255,255,255,0.3)",
              opacity: isActive || menuOpen ? 1 : 0,
              transition: "opacity 0.15s, background 0.1s",
            }}
            onMouseEnter={(e) => {
              e.currentTarget.style.background = "rgba(255,255,255,0.08)";
              e.currentTarget.style.color = "#fff";
            }}
            onMouseLeave={(e) => {
              e.currentTarget.style.background = "transparent";
              e.currentTarget.style.color = "rgba(255,255,255,0.3)";
            }}
            className="session-kebab"
          >
            <i className="fa-solid fa-ellipsis-vertical" style={{ fontSize: 11 }} />
          </button>
        )}
      </div>

      {menuOpen && (
        <SessionMenu
          session={session}
          anchorRef={kebabRef}
          onClose={() => setMenuOpen(false)}
          onRename={() => setRenaming(true)}
          onPin={() => onPin(session.session_id)}
          onDuplicate={() => onDuplicate(session.session_id)}
          onDelete={() => onDelete(session.session_id)}
        />
      )}

      {/* Reveal kebab on hover via CSS */}
      <style>{`
        div:hover .session-kebab { opacity: 1 !important; }
      `}</style>
    </div>
  );
});

/* ── Semantic search results ──────────────────────────────────────────── */
function SemanticResultRow({ result, onSelect }) {
  const ts = result.updated_at
    ? relativeTime(result.updated_at)
    : null;
  return (
    <div
      onClick={() => onSelect(result.session_id)}
      style={{
        padding: "9px 12px",
        borderRadius: 10,
        cursor: "pointer",
        background: "transparent",
        border: "1px solid transparent",
        transition: "all 0.13s",
        marginBottom: 2,
      }}
      onMouseEnter={(e) => {
        e.currentTarget.style.background = "rgba(0,240,255,0.06)";
        e.currentTarget.style.borderColor = "rgba(0,240,255,0.12)";
      }}
      onMouseLeave={(e) => {
        e.currentTarget.style.background = "transparent";
        e.currentTarget.style.borderColor = "transparent";
      }}
    >
      <div style={{
        fontSize: 12, fontFamily: "'Outfit', sans-serif",
        color: "rgba(255,255,255,0.8)", fontWeight: 500,
        whiteSpace: "nowrap", overflow: "hidden", textOverflow: "ellipsis",
        marginBottom: 3,
      }}>
        {result.session_title || "Untitled"}
      </div>
      {result.excerpt && (
        <div style={{
          fontSize: 10.5, fontFamily: "'Outfit', sans-serif",
          color: "rgba(255,255,255,0.38)",
          overflow: "hidden",
          display: "-webkit-box",
          WebkitLineClamp: 2,
          WebkitBoxOrient: "vertical",
          lineHeight: 1.4,
        }}>
          {result.excerpt}
        </div>
      )}
      <div style={{
        fontSize: 9.5, fontFamily: "'JetBrains Mono', monospace",
        color: result.match_type === "message" ? "rgba(0,240,255,0.35)" : "rgba(207,158,255,0.35)",
        marginTop: 3,
      }}>
        {result.match_type === "message" ? "↳ message match" : "↳ title match"}
        {ts && ` · ${ts}`}
      </div>
    </div>
  );
}

/* ── Main sidebar component ───────────────────────────────────────────── */
export default function ChatSessionSidebar({
  sessions,
  activeSessionId,
  loading,
  onNewChat,
  onSelect,
  onRename,
  onPin,
  onDuplicate,
  onDelete,
  onSearch,
  compact = false,
}) {
  const [searchVal, setSearchVal] = useState("");
  const [semanticResults, setSemanticResults] = useState(null); // null = not searched
  const [semanticLoading, setSemanticLoading] = useState(false);
  const searchTimeout = useRef(null);
  const semanticTimeout = useRef(null);

  const handleSearch = useCallback((q) => {
    setSearchVal(q);
    clearTimeout(searchTimeout.current);
    clearTimeout(semanticTimeout.current);

    // Pass to parent (title filter) immediately
    searchTimeout.current = setTimeout(() => onSearch?.(q), 300);

    // Trigger semantic search when query is ≥ 3 chars
    if (q.trim().length >= 3) {
      setSemanticLoading(true);
      semanticTimeout.current = setTimeout(async () => {
        try {
          const data = await conversationSearchApi.search(q.trim(), 10);
          setSemanticResults(data.results || []);
        } catch {
          setSemanticResults(null);
        } finally {
          setSemanticLoading(false);
        }
      }, 600);
    } else {
      setSemanticResults(null);
      setSemanticLoading(false);
    }
  }, [onSearch]);

  const handleDelete = useCallback(async (sessionId) => {
    onDelete(sessionId);
    toast.success("Conversation deleted", { duration: 2000 });
  }, [onDelete]);

  const handleDuplicate = useCallback(async (sessionId) => {
    await onDuplicate(sessionId);
    toast.success("Conversation duplicated", { duration: 2000 });
  }, [onDuplicate]);

  if (compact) {
    return (
      <div style={{
        width: 48, flexShrink: 0,
        display: "flex", flexDirection: "column", alignItems: "center",
        padding: "8px 0", gap: 6,
        borderRight: "1px solid rgba(255,255,255,0.06)",
      }}>
        <button
          onClick={onNewChat}
          title="New Chat"
          style={{
            width: 36, height: 36, borderRadius: 10, flexShrink: 0,
            background: "rgba(0,240,255,0.12)", border: "1px solid rgba(0,240,255,0.25)",
            cursor: "pointer", display: "flex", alignItems: "center", justifyContent: "center",
            color: "#00F0FF", marginBottom: 4,
          }}
        >
          <i className="fa-solid fa-plus" style={{ fontSize: 13 }} />
        </button>
        {sessions.slice(0, 12).map((s) => (
          <button
            key={s.session_id}
            onClick={() => onSelect(s.session_id)}
            title={s.title || "New Chat"}
            style={{
              width: 36, height: 36, borderRadius: 10, flexShrink: 0,
              background: s.session_id === activeSessionId ? "rgba(0,240,255,0.1)" : "rgba(255,255,255,0.03)",
              border: s.session_id === activeSessionId ? "1px solid rgba(0,240,255,0.25)" : "1px solid transparent",
              cursor: "pointer", display: "flex", alignItems: "center", justifyContent: "center",
              color: s.session_id === activeSessionId ? "#00F0FF" : "rgba(255,255,255,0.3)",
            }}
          >
            <i className="fa-solid fa-message" style={{ fontSize: 11 }} />
          </button>
        ))}
      </div>
    );
  }

  return (
    <div style={{
      width: 228, flexShrink: 0,
      display: "flex", flexDirection: "column",
      borderRight: "1px solid rgba(255,255,255,0.06)",
      background: "rgba(0,0,0,0.18)",
      overflow: "hidden",
    }}>
      {/* Header */}
      <div style={{
        padding: "10px 10px 8px",
        borderBottom: "1px solid rgba(255,255,255,0.05)",
        flexShrink: 0,
      }}>
        {/* New Chat button */}
        <button
          onClick={onNewChat}
          style={{
            display: "flex", alignItems: "center", gap: 8,
            width: "100%", padding: "8px 12px",
            background: "rgba(0,240,255,0.08)",
            border: "1px solid rgba(0,240,255,0.22)",
            borderRadius: 10, cursor: "pointer",
            color: "#00F0FF", fontSize: 12.5,
            fontFamily: "'Outfit', sans-serif", fontWeight: 500,
            transition: "all 0.15s",
          }}
          onMouseEnter={(e) => {
            e.currentTarget.style.background = "rgba(0,240,255,0.14)";
            e.currentTarget.style.boxShadow = "0 0 12px rgba(0,240,255,0.12)";
          }}
          onMouseLeave={(e) => {
            e.currentTarget.style.background = "rgba(0,240,255,0.08)";
            e.currentTarget.style.boxShadow = "none";
          }}
        >
          <i className="fa-solid fa-plus" style={{ fontSize: 11 }} />
          New Chat
        </button>

        {/* Search */}
        <div style={{ position: "relative", marginTop: 8 }}>
          <i className="fa-solid fa-magnifying-glass" style={{
            position: "absolute", left: 9, top: "50%", transform: "translateY(-50%)",
            fontSize: 10, color: "rgba(255,255,255,0.25)",
          }} />
          <input
            value={searchVal}
            onChange={(e) => handleSearch(e.target.value)}
            placeholder="Search chats…"
            style={{
              width: "100%", padding: "6px 8px 6px 28px",
              background: "rgba(255,255,255,0.04)",
              border: "1px solid rgba(255,255,255,0.08)",
              borderRadius: 8, color: "rgba(255,255,255,0.7)",
              fontSize: 11.5, fontFamily: "'Outfit', sans-serif",
              outline: "none", boxSizing: "border-box",
              transition: "border-color 0.15s",
            }}
            onFocus={(e) => { e.target.style.borderColor = "rgba(0,240,255,0.3)"; }}
            onBlur={(e) => { e.target.style.borderColor = "rgba(255,255,255,0.08)"; }}
          />
          {searchVal && (
            <button
              onClick={() => handleSearch("")}
              style={{
                position: "absolute", right: 7, top: "50%", transform: "translateY(-50%)",
                background: "none", border: "none", cursor: "pointer",
                color: "rgba(255,255,255,0.3)", padding: 2, lineHeight: 1,
              }}
            >
              <i className="fa-solid fa-xmark" style={{ fontSize: 9 }} />
            </button>
          )}
        </div>
      </div>

      {/* Session list */}
      <div style={{ flex: 1, overflowY: "auto", padding: "6px 6px" }}>

        {/* Semantic search results panel */}
        {searchVal.trim().length >= 3 && (
          <div style={{ marginBottom: 6 }}>
            <div style={{
              padding: "4px 12px 3px",
              fontSize: 9.5, fontFamily: "'JetBrains Mono', monospace",
              letterSpacing: "0.1em", textTransform: "uppercase",
              color: "rgba(0,240,255,0.4)",
              display: "flex", alignItems: "center", gap: 6,
            }}>
              <i className="fa-solid fa-magnifying-glass-waveform" style={{ fontSize: 8 }} />
              Deep Search
              {semanticLoading && (
                <i className="fa-solid fa-spinner fa-spin" style={{ fontSize: 8, marginLeft: 2 }} />
              )}
            </div>
            {semanticResults === null && !semanticLoading ? null : (
              semanticResults?.length === 0 ? (
                <div style={{
                  padding: "8px 12px", fontSize: 11,
                  color: "rgba(255,255,255,0.2)",
                  fontFamily: "'Outfit', sans-serif",
                }}>
                  No matches in message history
                </div>
              ) : (
                semanticResults?.map((r) => (
                  <SemanticResultRow
                    key={`sem-${r.session_id}`}
                    result={r}
                    onSelect={(sid) => { onSelect(sid); handleSearch(""); }}
                  />
                ))
              )
            )}
            <div style={{ height: 1, background: "rgba(255,255,255,0.05)", margin: "6px 4px" }} />
          </div>
        )}

        {loading ? (
          <div style={{ padding: "20px 12px" }}>
            {[1, 2, 3].map((i) => (
              <div key={i} style={{
                height: 52, borderRadius: 10, marginBottom: 4,
                background: "rgba(255,255,255,0.04)",
                animation: `skeletonPulse 1.5s ease-in-out ${i * 0.15}s infinite alternate`,
              }} />
            ))}
            <style>{`@keyframes skeletonPulse { from { opacity: 0.3; } to { opacity: 0.7; } }`}</style>
          </div>
        ) : sessions.length === 0 ? (
          <div style={{
            padding: "32px 16px", textAlign: "center",
            color: "rgba(255,255,255,0.2)", fontSize: 12,
            fontFamily: "'JetBrains Mono', monospace",
          }}>
            {searchVal ? "No title matches" : "No chats yet"}
          </div>
        ) : (
          <>
            {/* Label for title-filtered results */}
            {searchVal.trim().length >= 3 && sessions.length > 0 && (
              <div style={{
                padding: "4px 12px 3px",
                fontSize: 9.5, fontFamily: "'JetBrains Mono', monospace",
                letterSpacing: "0.1em", textTransform: "uppercase",
                color: "rgba(255,255,255,0.2)",
              }}>
                Title matches
              </div>
            )}

            {/* Pinned group */}
            {sessions.some((s) => s.pinned) && (
              <>
                {!searchVal && (
                  <div style={{
                    padding: "6px 12px 3px",
                    fontSize: 9.5, fontFamily: "'JetBrains Mono', monospace",
                    letterSpacing: "0.1em", textTransform: "uppercase",
                    color: "rgba(207,158,255,0.45)",
                  }}>
                    Pinned
                  </div>
                )}
                {sessions.filter((s) => s.pinned).map((s) => (
                  <SessionRow
                    key={s.session_id}
                    session={s}
                    isActive={s.session_id === activeSessionId}
                    onSelect={onSelect}
                    onRename={onRename}
                    onPin={onPin}
                    onDuplicate={handleDuplicate}
                    onDelete={handleDelete}
                  />
                ))}
                <div style={{ height: 1, background: "rgba(255,255,255,0.05)", margin: "6px 4px" }} />
              </>
            )}

            {/* Recents group */}
            {sessions.some((s) => !s.pinned) && (
              <>
                {sessions.some((s) => s.pinned) && !searchVal && (
                  <div style={{
                    padding: "3px 12px 3px",
                    fontSize: 9.5, fontFamily: "'JetBrains Mono', monospace",
                    letterSpacing: "0.1em", textTransform: "uppercase",
                    color: "rgba(255,255,255,0.2)",
                  }}>
                    Recent
                  </div>
                )}
                {sessions.filter((s) => !s.pinned).map((s) => (
                  <SessionRow
                    key={s.session_id}
                    session={s}
                    isActive={s.session_id === activeSessionId}
                    onSelect={onSelect}
                    onRename={onRename}
                    onPin={onPin}
                    onDuplicate={handleDuplicate}
                    onDelete={handleDelete}
                  />
                ))}
              </>
            )}
          </>
        )}
      </div>

      {/* Footer — session count */}
      <div style={{
        padding: "6px 12px",
        borderTop: "1px solid rgba(255,255,255,0.05)",
        fontSize: 10, fontFamily: "'JetBrains Mono', monospace",
        color: "rgba(255,255,255,0.18)", textAlign: "center",
        flexShrink: 0,
      }}>
        {sessions.length} conversation{sessions.length !== 1 ? "s" : ""}
      </div>
    </div>
  );
}
