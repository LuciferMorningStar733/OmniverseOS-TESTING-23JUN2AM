/**
 * useToolSessions — manages run/session lifecycle for Adversary, War Room, Dead Reckoning.
 *
 * @param {string} appType  "adversary" | "warroom" | "deadreckoning"
 */
import { useCallback, useEffect, useRef, useState } from "react";
import { toolSessionApi } from "../lib/toolSessionApi";

const LS_KEY = (appType) => `omniverse_tool_session_${appType}`;

export function useToolSessions(appType) {
  const [sessions, setSessions]         = useState([]);
  const [activeSessionId, _setActive]   = useState(() => {
    try { return localStorage.getItem(LS_KEY(appType)) || null; }
    catch { return null; }
  });
  const [loading, setLoading]           = useState(true);
  const mountedRef = useRef(true);

  useEffect(() => {
    mountedRef.current = true;
    return () => { mountedRef.current = false; };
  }, []);

  const setActive = useCallback((id) => {
    _setActive(id);
    try {
      if (id) localStorage.setItem(LS_KEY(appType), id);
      else localStorage.removeItem(LS_KEY(appType));
    } catch {}
  }, [appType]);

  // ── Load on mount ──────────────────────────────────────────────────────
  useEffect(() => {
    let cancelled = false;
    (async () => {
      setLoading(true);
      try {
        const raw = await toolSessionApi.list(appType);
        if (cancelled || !mountedRef.current) return;
        const arr = Array.isArray(raw) ? raw : [];
        setSessions(arr);
        // Validate persisted active session still exists
        const saved = localStorage.getItem(LS_KEY(appType));
        if (saved && !arr.some((s) => s.session_id === saved)) setActive(null);
      } catch {
        // Backend may be down; continue without history
      } finally {
        if (!cancelled && mountedRef.current) setLoading(false);
      }
    })();
    return () => { cancelled = true; };
  // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [appType]);

  // ── Create new session ─────────────────────────────────────────────────
  const createSession = useCallback(async (title = "New Run") => {
    try {
      const s = await toolSessionApi.create(appType, title);
      if (!mountedRef.current || !s) return null;
      setSessions((prev) => [s, ...prev]);
      setActive(s.session_id);
      return s;
    } catch { return null; }
  }, [appType, setActive]);

  // ── Switch active session ──────────────────────────────────────────────
  const switchSession = useCallback((id) => {
    setActive(id);
  }, [setActive]);

  // ── Rename ─────────────────────────────────────────────────────────────
  const renameSession = useCallback(async (sessionId, title) => {
    const trimmed = title?.trim();
    if (!trimmed) return;
    try {
      await toolSessionApi.update(sessionId, { title: trimmed });
      setSessions((prev) =>
        prev.map((s) => s.session_id === sessionId ? { ...s, title: trimmed } : s)
      );
    } catch {}
  }, []);

  // ── Delete ─────────────────────────────────────────────────────────────
  const deleteSession = useCallback(async (sessionId) => {
    try {
      await toolSessionApi.delete(sessionId);
      setSessions((prev) => {
        const next = prev.filter((s) => s.session_id !== sessionId);
        if (activeSessionId === sessionId) {
          setActive(next[0]?.session_id || null);
        }
        return next;
      });
    } catch {}
  }, [activeSessionId, setActive]);

  // ── Save run data to active session ───────────────────────────────────
  const saveRun = useCallback(async (sessionId, messages, preview = "") => {
    if (!sessionId || !messages?.length) return;
    try {
      await toolSessionApi.saveMessages(sessionId, messages);
      const ts = new Date().toISOString();
      setSessions((prev) =>
        prev
          .map((s) =>
            s.session_id === sessionId
              ? { ...s, updated_at: ts, preview: preview.slice(0, 120), message_count: messages.length }
              : s
          )
          .sort((a, b) => new Date(b.updated_at) - new Date(a.updated_at))
      );
    } catch {}
  }, []);

  // ── Load run data ──────────────────────────────────────────────────────
  const loadRun = useCallback(async (sessionId) => {
    if (!sessionId) return [];
    try {
      const msgs = await toolSessionApi.loadMessages(sessionId);
      return Array.isArray(msgs) ? msgs : [];
    } catch { return []; }
  }, []);

  return {
    sessions,
    activeSessionId,
    loading,
    createSession,
    switchSession,
    renameSession,
    deleteSession,
    saveRun,
    loadRun,
    setActive,
  };
}
