/**
 * useChatSessions — manages the full lifecycle of chat sessions.
 *
 * Responsibilities:
 *  - Load session list from backend on mount
 *  - Track the active session ID
 *  - Expose create / rename / delete / pin / duplicate / search helpers
 *  - Auto-generate session titles after the first message
 *  - Persist activeSessionId in localStorage for cross-mount continuity
 */
import { useCallback, useEffect, useRef, useState } from "react";
import { sessionApi } from "../lib/sessionApi";

const LS_ACTIVE_SESSION = "omniverse_active_session_id";

function loadPersistedSessionId() {
  try { return localStorage.getItem(LS_ACTIVE_SESSION) || null; }
  catch { return null; }
}

function persistSessionId(id) {
  try { if (id) localStorage.setItem(LS_ACTIVE_SESSION, id); else localStorage.removeItem(LS_ACTIVE_SESSION); }
  catch {}
}

export function useChatSessions() {
  const [sessions, setSessions]           = useState([]);
  const [activeSessionId, _setActiveSessionId] = useState(loadPersistedSessionId);
  const [loading, setLoading]             = useState(true);
  const [searchQuery, setSearchQuery]     = useState("");
  const mountedRef = useRef(true);

  useEffect(() => { mountedRef.current = true; return () => { mountedRef.current = false; }; }, []);

  const setActiveSessionId = useCallback((id) => {
    _setActiveSessionId(id);
    persistSessionId(id);
  }, []);

  // ── Load sessions ──────────────────────────────────────────────────────
  const refresh = useCallback(async (search = searchQuery) => {
    try {
      const data = await sessionApi.list(search);
      if (!mountedRef.current) return;
      setSessions(data);
      // If no active session (first load / session was deleted), pick first or create one
      if (data.length === 0) {
        return; // let caller decide to create a new one
      }
      return data;
    } catch {
      // Non-blocking — sessions are optional UX enhancement
    }
  }, [searchQuery]);

  useEffect(() => {
    let cancelled = false;
    const load = async () => {
      setLoading(true);
      try {
        const data = await sessionApi.list("");
        if (cancelled || !mountedRef.current) return;
        setSessions(data);
        // Validate persisted active session still exists
        const persistedId = loadPersistedSessionId();
        const exists = data.some((s) => s.session_id === persistedId);
        if (!exists) {
          if (data.length > 0) {
            setActiveSessionId(data[0].session_id);
          }
          // else: caller should create a new session on first send
        }
      } catch {
        // backend may not be available yet — start fresh
      } finally {
        if (!cancelled && mountedRef.current) setLoading(false);
      }
    };
    load();
    return () => { cancelled = true; };
  // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  // ── Search ─────────────────────────────────────────────────────────────
  const search = useCallback(async (q) => {
    setSearchQuery(q);
    await refresh(q);
  }, [refresh]);

  // ── Create ─────────────────────────────────────────────────────────────
  const createSession = useCallback(async (opts = {}) => {
    try {
      const s = await sessionApi.create(opts);
      if (!mountedRef.current) return s;
      setSessions((prev) => [s, ...prev]);
      setActiveSessionId(s.session_id);
      return s;
    } catch (err) {
      throw err;
    }
  }, [setActiveSessionId]);

  // ── Switch ─────────────────────────────────────────────────────────────
  const switchSession = useCallback((sessionId) => {
    setActiveSessionId(sessionId);
    // Touch the session so it floats to top
    sessionApi.update(sessionId, {}).catch(() => {});
    setSessions((prev) =>
      prev.map((s) =>
        s.session_id === sessionId
          ? { ...s, updated_at: new Date().toISOString() }
          : s
      ).sort((a, b) => {
        if (a.pinned !== b.pinned) return b.pinned ? 1 : -1;
        return new Date(b.updated_at) - new Date(a.updated_at);
      })
    );
  }, [setActiveSessionId]);

  // ── Rename ─────────────────────────────────────────────────────────────
  const renameSession = useCallback(async (sessionId, title) => {
    setSessions((prev) =>
      prev.map((s) => s.session_id === sessionId ? { ...s, title } : s)
    );
    try {
      await sessionApi.update(sessionId, { title });
    } catch {
      await refresh();
    }
  }, [refresh]);

  // ── Delete ─────────────────────────────────────────────────────────────
  const deleteSession = useCallback(async (sessionId) => {
    // Functional update avoids stale closure over sessions/activeSessionId
    setSessions((prev) => prev.filter((s) => s.session_id !== sessionId));
    _setActiveSessionId((currentActive) => {
      if (currentActive !== sessionId) return currentActive;
      // Will pick first remaining after filter — resolved in the setSessions above
      // We can't inspect the new array here, so we defer via a microtask
      Promise.resolve().then(() => {
        setSessions((latest) => {
          const first = latest[0]?.session_id || null;
          persistSessionId(first);
          _setActiveSessionId(first);
          return latest; // no-op change, just to read latest
        });
      });
      return currentActive; // temp, will be updated immediately above
    });
    try {
      await sessionApi.delete(sessionId);
    } catch {
      await refresh();
    }
  // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [refresh]);

  // ── Pin / Unpin ────────────────────────────────────────────────────────
  const togglePin = useCallback(async (sessionId) => {
    const target = sessions.find((s) => s.session_id === sessionId);
    if (!target) return;
    const newPinned = !target.pinned;
    setSessions((prev) =>
      prev.map((s) => s.session_id === sessionId ? { ...s, pinned: newPinned } : s)
        .sort((a, b) => {
          const ap = s => s.session_id === sessionId ? newPinned : s.pinned;
          if (ap(a) !== ap(b)) return ap(b) ? 1 : -1;
          return new Date(b.updated_at) - new Date(a.updated_at);
        })
    );
    try {
      await sessionApi.update(sessionId, { pinned: newPinned });
    } catch {
      await refresh();
    }
  }, [sessions, refresh]);

  // ── Duplicate ──────────────────────────────────────────────────────────
  const duplicateSession = useCallback(async (sessionId) => {
    try {
      const newSession = await sessionApi.duplicate(sessionId);
      if (!mountedRef.current) return;
      setSessions((prev) => [newSession, ...prev]);
      setActiveSessionId(newSession.session_id);
      return newSession;
    } catch {
      throw new Error("Failed to duplicate session");
    }
  }, [setActiveSessionId]);

  // ── Auto-title ─────────────────────────────────────────────────────────
  const autoTitle = useCallback(async (sessionId) => {
    try {
      const { title } = await sessionApi.autoTitle(sessionId);
      if (!mountedRef.current || !title) return;
      setSessions((prev) =>
        prev.map((s) => s.session_id === sessionId ? { ...s, title } : s)
      );
      return title;
    } catch {
      // Non-critical — title stays as "New Chat"
    }
  }, []);

  // ── Touch session (update updated_at + preview after new message) ──────
  const touchSession = useCallback((sessionId, preview = "") => {
    const ts = new Date().toISOString();
    setSessions((prev) =>
      prev.map((s) =>
        s.session_id === sessionId
          ? {
              ...s,
              updated_at: ts,
              message_count: (s.message_count || 0) + 2,
              preview: preview.slice(0, 120),
            }
          : s
      ).sort((a, b) => {
        if (a.pinned !== b.pinned) return b.pinned ? 1 : -1;
        return new Date(b.updated_at) - new Date(a.updated_at);
      })
    );
  }, []);

  return {
    sessions,
    activeSessionId,
    loading,
    searchQuery,
    setSearchQuery,
    refresh,
    createSession,
    switchSession,
    renameSession,
    deleteSession,
    togglePin,
    duplicateSession,
    autoTitle,
    touchSession,
    search,
  };
}
