import React, { useCallback, useEffect, useRef, useState } from "react";
import { conversationApi } from "../lib/api";

// ─── Helpers ─────────────────────────────────────────────────────────────────
function fmtDate(iso) {
  if (!iso) return "";
  try {
    const d = new Date(iso);
    const now = new Date();
    const diff = now - d;
    if (diff < 60_000) return "just now";
    if (diff < 3_600_000) return `${Math.floor(diff / 60_000)}m ago`;
    if (diff < 86_400_000) return `${Math.floor(diff / 3_600_000)}h ago`;
    if (diff < 604_800_000) return `${Math.floor(diff / 86_400_000)}d ago`;
    return d.toLocaleDateString("en-US", { month: "short", day: "numeric" });
  } catch {
    return "";
  }
}

function highlight(text, query) {
  if (!query || !text) return text;
  try {
    const escaped = query.replace(/[.*+?^${}()|[\]\\]/g, "\\$&");
    const parts = text.split(new RegExp(`(${escaped})`, "gi"));
    return parts.map((p, i) =>
      p.toLowerCase() === query.toLowerCase() ? (
        <mark key={i} style={{ background: "rgba(0,240,255,0.22)", color: "#00f0ff", borderRadius: 2, padding: "0 2px" }}>
          {p}
        </mark>
      ) : p
    );
  } catch {
    return text;
  }
}

// ─── Styles ───────────────────────────────────────────────────────────────────
const S = {
  panel: {
    position: "absolute",
    top: 0,
    right: 0,
    bottom: 0,
    width: 340,
    background: "rgba(5,5,14,0.97)",
    borderLeft: "1px solid rgba(0,240,255,0.12)",
    display: "flex",
    flexDirection: "column",
    zIndex: 50,
    backdropFilter: "blur(20px)",
    boxShadow: "-8px 0 32px rgba(0,0,0,0.5)",
    animation: "slideInRight 0.2s ease",
  },
  panelMobile: {
    position: "absolute",
    top: 0,
    left: 0,
    right: 0,
    bottom: 0,
    background: "rgba(5,5,14,0.98)",
    display: "flex",
    flexDirection: "column",
    zIndex: 50,
    backdropFilter: "blur(20px)",
    animation: "fadeIn 0.2s ease",
  },
  header: {
    display: "flex",
    alignItems: "center",
    justifyContent: "space-between",
    padding: "12px 14px 10px",
    borderBottom: "1px solid rgba(0,240,255,0.08)",
    flexShrink: 0,
  },
  title: {
    fontSize: 11,
    fontFamily: "'JetBrains Mono', monospace",
    fontWeight: 600,
    letterSpacing: "0.12em",
    textTransform: "uppercase",
    color: "rgba(0,240,255,0.7)",
  },
  closeBtn: {
    background: "none",
    border: "1px solid rgba(0,240,255,0.15)",
    borderRadius: 6,
    color: "rgba(0,240,255,0.5)",
    cursor: "pointer",
    padding: "3px 8px",
    fontSize: 11,
    fontFamily: "'JetBrains Mono', monospace",
    transition: "all 0.15s",
  },
  searchBox: {
    padding: "10px 12px",
    flexShrink: 0,
    borderBottom: "1px solid rgba(0,240,255,0.06)",
  },
  input: {
    width: "100%",
    background: "rgba(0,240,255,0.04)",
    border: "1px solid rgba(0,240,255,0.2)",
    borderRadius: 8,
    color: "#e0f7ff",
    fontFamily: "'JetBrains Mono', monospace",
    fontSize: 12,
    padding: "8px 12px",
    outline: "none",
    boxSizing: "border-box",
    transition: "border-color 0.2s",
  },
  status: {
    padding: "8px 14px",
    fontSize: 10,
    fontFamily: "'JetBrains Mono', monospace",
    color: "rgba(0,240,255,0.4)",
    flexShrink: 0,
  },
  list: {
    flex: 1,
    overflowY: "auto",
    padding: "4px 0",
  },
  result: (hovered) => ({
    padding: "10px 14px",
    borderBottom: "1px solid rgba(0,240,255,0.04)",
    cursor: "pointer",
    background: hovered ? "rgba(0,240,255,0.05)" : "transparent",
    transition: "background 0.15s",
  }),
  resultMeta: {
    display: "flex",
    alignItems: "center",
    gap: 6,
    marginBottom: 4,
  },
  roleBadge: (role) => ({
    fontSize: 9,
    fontFamily: "'JetBrains Mono', monospace",
    fontWeight: 600,
    letterSpacing: "0.08em",
    textTransform: "uppercase",
    padding: "1px 5px",
    borderRadius: 3,
    background: role === "user" ? "rgba(0,240,255,0.10)" : "rgba(168,85,247,0.12)",
    color: role === "user" ? "rgba(0,240,255,0.7)" : "rgba(168,85,247,0.8)",
    border: `1px solid ${role === "user" ? "rgba(0,240,255,0.18)" : "rgba(168,85,247,0.2)"}`,
  }),
  sessionId: {
    fontSize: 9,
    fontFamily: "'JetBrains Mono', monospace",
    color: "rgba(0,240,255,0.3)",
    overflow: "hidden",
    textOverflow: "ellipsis",
    whiteSpace: "nowrap",
    flex: 1,
  },
  timestamp: {
    fontSize: 9,
    fontFamily: "'JetBrains Mono', monospace",
    color: "rgba(0,240,255,0.3)",
    flexShrink: 0,
  },
  excerpt: {
    fontSize: 11.5,
    color: "rgba(200,230,240,0.75)",
    lineHeight: 1.55,
    display: "-webkit-box",
    WebkitLineClamp: 3,
    WebkitBoxOrient: "vertical",
    overflow: "hidden",
  },
  relevanceDot: (score) => ({
    width: 5,
    height: 5,
    borderRadius: "50%",
    flexShrink: 0,
    background: score >= 0.7 ? "#39FF14" : score >= 0.4 ? "#f59e0b" : "rgba(0,240,255,0.4)",
    boxShadow: `0 0 4px ${score >= 0.7 ? "#39FF14" : score >= 0.4 ? "#f59e0b" : "rgba(0,240,255,0.4)"}55`,
  }),
  empty: {
    padding: "32px 14px",
    textAlign: "center",
    color: "rgba(0,240,255,0.3)",
    fontSize: 12,
    fontFamily: "'JetBrains Mono', monospace",
  },
};

// ─── Component ────────────────────────────────────────────────────────────────
export default function ConversationSearchPanel({ onClose, onSelectSession, isMobile = false }) {
  const [query, setQuery] = useState("");
  const [results, setResults] = useState([]);
  const [loading, setLoading] = useState(false);
  const [searched, setSearched] = useState(false);
  const [hoveredIdx, setHoveredIdx] = useState(-1);
  const debounceRef = useRef(null);
  const inputRef = useRef(null);

  useEffect(() => {
    inputRef.current?.focus();
  }, []);

  const doSearch = useCallback(async (q) => {
    if (q.trim().length < 3) {
      setResults([]);
      setSearched(false);
      return;
    }
    setLoading(true);
    setSearched(true);
    try {
      const data = await conversationApi.search(q.trim(), 20);
      setResults(data || []);
    } catch {
      setResults([]);
    } finally {
      setLoading(false);
    }
  }, []);

  const handleChange = useCallback((e) => {
    const val = e.target.value;
    setQuery(val);
    clearTimeout(debounceRef.current);
    debounceRef.current = setTimeout(() => doSearch(val), 400);
  }, [doSearch]);

  const handleKeyDown = useCallback((e) => {
    if (e.key === "Escape") onClose?.();
    if (e.key === "Enter" && query.trim().length >= 3) {
      clearTimeout(debounceRef.current);
      doSearch(query);
    }
  }, [query, doSearch, onClose]);

  useEffect(() => () => clearTimeout(debounceRef.current), []);

  const panelStyle = isMobile ? S.panelMobile : S.panel;

  return (
    <div style={panelStyle}>
      <style>{`
        @keyframes slideInRight { from { transform: translateX(24px); opacity: 0; } to { transform: translateX(0); opacity: 1; } }
        @keyframes fadeIn { from { opacity: 0; } to { opacity: 1; } }
        .csp-input:focus { border-color: rgba(0,240,255,0.45) !important; box-shadow: 0 0 0 2px rgba(0,240,255,0.08); }
        .csp-close:hover { border-color: rgba(255,80,80,0.4) !important; color: rgba(255,100,100,0.8) !important; }
        .csp-scroll::-webkit-scrollbar { width: 3px; }
        .csp-scroll::-webkit-scrollbar-track { background: transparent; }
        .csp-scroll::-webkit-scrollbar-thumb { background: rgba(0,240,255,0.15); border-radius: 2px; }
      `}</style>

      {/* Header */}
      <div style={S.header}>
        <div style={{ display: "flex", alignItems: "center", gap: 8 }}>
          <svg width="14" height="14" viewBox="0 0 16 16" fill="none">
            <circle cx="6.5" cy="6.5" r="5" stroke="rgba(0,240,255,0.6)" strokeWidth="1.5"/>
            <line x1="10.5" y1="10.5" x2="14.5" y2="14.5" stroke="rgba(0,240,255,0.6)" strokeWidth="1.5" strokeLinecap="round"/>
          </svg>
          <span style={S.title}>Conversation Archaeology</span>
        </div>
        <button className="csp-close" style={S.closeBtn} onClick={onClose}>✕</button>
      </div>

      {/* Search input */}
      <div style={S.searchBox}>
        <input
          ref={inputRef}
          className="csp-input"
          style={S.input}
          type="text"
          value={query}
          onChange={handleChange}
          onKeyDown={handleKeyDown}
          placeholder="Search across all conversations…"
          spellCheck={false}
        />
      </div>

      {/* Status line */}
      <div style={S.status}>
        {loading && "searching…"}
        {!loading && searched && results.length === 0 && "no results"}
        {!loading && searched && results.length > 0 && `${results.length} result${results.length !== 1 ? "s" : ""} found`}
        {!loading && !searched && query.length > 0 && query.length < 3 && "type at least 3 characters"}
        {!loading && !searched && query.length === 0 && "type to search all conversations"}
      </div>

      {/* Results */}
      <div className="csp-scroll" style={S.list}>
        {!searched && !loading && (
          <div style={S.empty}>
            <div style={{ fontSize: 24, marginBottom: 10, opacity: 0.4 }}>⊙</div>
            Search your entire AI conversation history
          </div>
        )}

        {results.map((r, i) => (
          <div
            key={`${r.session_id}-${r.created_at}-${i}`}
            style={S.result(hoveredIdx === i)}
            onMouseEnter={() => setHoveredIdx(i)}
            onMouseLeave={() => setHoveredIdx(-1)}
            onClick={() => {
              onSelectSession?.(r.session_id);
              onClose?.();
            }}
          >
            <div style={S.resultMeta}>
              <div style={S.relevanceDot(r.relevance)} title={`Relevance: ${(r.relevance * 100).toFixed(0)}%`} />
              <span style={S.roleBadge(r.role)}>{r.role}</span>
              <span style={S.sessionId}>{r.session_id}</span>
              <span style={S.timestamp}>{fmtDate(r.created_at)}</span>
            </div>
            <div style={S.excerpt}>{highlight(r.excerpt, query)}</div>
          </div>
        ))}
      </div>
    </div>
  );
}
