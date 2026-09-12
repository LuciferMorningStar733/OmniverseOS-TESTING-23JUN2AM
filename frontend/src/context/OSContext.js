import React, {
  createContext,
  useContext,
  useEffect,
  useState,
  useCallback,
} from "react";
import {
  authApi,
  getAuthToken,
  setAuthToken,
  setAuthenticatingState,
  setLoggingOutState,
} from "../lib/api";
import { DEFAULT_WALLPAPER } from "../lib/wallpapers";
import { trackEvent }  from "../lib/activityTimeline";
import { autoSave }    from "../lib/workspaceSnapshot";
import { rememberActiveApp, rememberLastUrl, memClear } from "../lib/memoryEngine";
import { autoRestore, saveSnapshot, loadSnapshot, getAutoSnapshot, deleteSnapshot } from "../lib/workspaceSnapshot";
import { playWindowOpen, playWindowClose, playNotification } from "../lib/soundEngine";
import { cortexScheduler } from "../lib/cortexScheduler";

const OSContext = createContext(null);

// ─── localStorage keys ────────────────────────────────────────────────────────
const LS_TOKEN    = "omniverse_token";
const LS_WINDOWS  = "omniverse_windows";
const LS_NOTIFS   = "omniverse_notifs";
const LS_WALLPAPER = "omniverse_wallpaper";

// ─── initial default windows (spatial desktop cascade) ───────────────────────
const INITIAL_DEFAULT_WINDOWS = [
  { id: "photos-init", app: "photos", x: 60, y: 35, w: 760, h: 540, z: 100, minimized: false, maximized: false },
  { id: "files-init", app: "files", x: 220, y: 270, w: 720, h: 420, z: 101, minimized: false, maximized: false },
  { id: "chat-init", app: "chat", x: 310, y: 130, w: 400, h: 520, z: 102, minimized: false, maximized: false },
];

// ─── helpers ──────────────────────────────────────────────────────────────────
const safeJSON = (key, fallback) => {
  try {
    const raw = localStorage.getItem(key);
    if (!raw) return fallback;
    const parsed = JSON.parse(raw);
    return Array.isArray(parsed) && parsed.length > 0 ? parsed : fallback;
  }
  catch { return fallback; }
};

export const OSProvider = ({ children }) => {
  // ── auth ────────────────────────────────────────────────────────────────────
  const [user,    setUser]    = useState(null);
  const [loading, setLoading] = useState(true);

  // ── window manager ──────────────────────────────────────────────────────────
  const [windows,  setWindows]  = useState(() => safeJSON(LS_WINDOWS, INITIAL_DEFAULT_WINDOWS));
  const [activeId, setActiveId] = useState("chat-init");
  const [zCounter, setZCounter] = useState(105);

  // ── UI overlays ─────────────────────────────────────────────────────────────
  const [paletteOpen, setPaletteOpen] = useState(false);
  const [notifOpen,   setNotifOpen]   = useState(false);

  // ── notifications ───────────────────────────────────────────────────────────
  const [notifications, setNotifications] = useState(() =>
    safeJSON(LS_NOTIFS, [])
  );

  // ── wallpaper ───────────────────────────────────────────────────────────────
  const [wallpaper, setWallpaperState] = useState(
    () => { try { return localStorage.getItem(LS_WALLPAPER) || DEFAULT_WALLPAPER; } catch { return DEFAULT_WALLPAPER; } }
  );
  const setWallpaper = useCallback((id) => {
    setWallpaperState(id);
    localStorage.setItem(LS_WALLPAPER, id);
  }, []);

  // ── persistence effects ─────────────────────────────────────────────────────
  useEffect(() => {
    // Persist geometry — keep sensitive z / minimized state out of LS
    localStorage.setItem(
      LS_WINDOWS,
      JSON.stringify(
        windows.map(({ id, app, x, y, w, h }) => ({ id, app, x, y, w, h }))
      )
    );
    // Cortex: auto-save workspace snapshot whenever windows change
    autoSave(windows);
  }, [windows]);

  useEffect(() => {
    localStorage.setItem(LS_NOTIFS, JSON.stringify(notifications.slice(0, 30)));
  }, [notifications]);

  // ── auth actions ─────────────────────────────────────────────────────────────
  const logout = useCallback(() => {
    setLoggingOutState(true);
    try {
      setAuthToken(null);
      setUser(null);
      setWindows([]);
      // Wipe memory and user-scoped transient state on logout to prevent state leakage
      memClear();
      try {
        localStorage.removeItem(LS_WINDOWS);
        localStorage.removeItem(LS_NOTIFS);
        localStorage.removeItem("omniverse_cortex_snapshots");
        localStorage.removeItem("omniverse_active_session");
        localStorage.removeItem("cortex_current_url");
        localStorage.removeItem("cortex_activity_timeline");
      } catch { /* ignore */ }
    } finally {
      setLoggingOutState(false);
    }
  }, []);

  // ── auth init ────────────────────────────────────────────────────────────────
  useEffect(() => {
    const init = async () => {
      const token = getAuthToken();
      if (!token) {
        setLoading(false);
        return;
      }
      setAuthToken(token); // Synchronize Axios headers immediately
      try {
        const me = await authApi.me();
        setUser(me);
      } catch (err) {
        // ONLY invalidate session if server explicitly returns 401 Unauthorized
        if (err?.response?.status === 401) {
          console.warn("[Auth] Stored session invalid (401), resetting token.");
          setAuthToken(null);
          setUser(null);
        } else {
          console.warn("[Auth] Non-fatal error verifying session at startup:", err?.message || err);
          // Retain token so network glitches or dev restarts do not drop session
        }
      } finally {
        setLoading(false);
      }
    };
    init();
  }, []);

  // ── session expiration listener ──────────────────────────────────────────
  useEffect(() => {
    const handleAuthExpired = () => {
      console.warn("[Auth] Session expired event received — resetting session.");
      logout();
    };
    window.addEventListener("omniverse:auth-expired", handleAuthExpired);
    return () => window.removeEventListener("omniverse:auth-expired", handleAuthExpired);
  }, [logout]);

  // ── Cortex Scheduler init ─────────────────────────────────────────────────
  useEffect(() => {
    // Wire the scheduler's fire callback to pushNotification BEFORE hydrating
    // so missed reminders (negative remaining time) fire with a notification immediately.
    cortexScheduler.setOnFire((job) => {
      playNotification();
      const missed = job.missed;
      const title = missed ? `⏰ Missed: ${job.title}` : `⏰ ${job.title}`;
      const message = missed
        ? `This reminder fired while you were away.`
        : `Cortex reminder — tap to open chat.`;
      const actions = [{ label: "Open Chat", type: "open_app", payload: "chat" }];
      const n = {
        id:   `n-sched-${Date.now()}`,
        title,
        message,
        type: "info",
        time: new Date().toISOString(),
        actions,
      };
      setNotifications((prev) => [n, ...prev].slice(0, 50));
    });
    cortexScheduler.hydrate();
  }, []); // eslint-disable-line react-hooks/exhaustive-deps

  const login = useCallback(async (email, password) => {
    setAuthenticatingState(true);
    try {
      const res   = await authApi.login({ email, password });
      const token = res.token || res.access_token;
      if (!token) throw new Error("Authentication response did not contain a token");
      
      // Synchronously set token in storage & Axios default headers
      setAuthToken(token);
      
      const me = res.user ? res.user : await authApi.me();
      try {
        localStorage.setItem("omniverse_last_user", me?.email || email);
      } catch { /* ignore */ }
      
      setUser(me);
      return me;
    } finally {
      setAuthenticatingState(false);
    }
  }, []);

  const signup = useCallback(async (email, password, name) => {
    setAuthenticatingState(true);
    try {
      const res   = await authApi.signup({ email, password, name });
      const token = res.token || res.access_token;
      if (!token) throw new Error("Signup response did not contain a token");
      
      setAuthToken(token);
      const me = res.user ? res.user : await authApi.me();
      try {
        localStorage.setItem("omniverse_last_user", me?.email || email);
      } catch { /* ignore */ }
      
      setUser(me);
      return me;
    } finally {
      setAuthenticatingState(false);
    }
  }, []);

  // ── window manager ───────────────────────────────────────────────────────────
  const openApp = useCallback((appId) => {
    let newZ = 0;
    setZCounter((z) => { newZ = z + 1; return newZ; });
    setWindows((prev) => {
      const existing = prev.find((w) => w.app === appId);
      if (existing) {
        setActiveId(existing.id);
        return prev.map((w) =>
          w.id === existing.id ? { ...w, z: newZ, minimized: false } : w
        );
      }
      const id = `${appId}-${Date.now()}`;
      setActiveId(id);
      const vw = window.innerWidth;
      const vh = window.innerHeight;
      const width  = Math.min(920, vw * 0.85);
      const height = Math.min(600, vh * 0.80);

      // ── Smart cascade: never fully overlap an existing window ────────────
      const TOP_PAD    = 60;   // topbar height
      const BOTTOM_PAD = 96;   // dock height
      const safeH = vh - TOP_PAD - BOTTOM_PAD;

      // Ideal starting position: centered
      const idealX = Math.max(0, (vw - width)  / 2);
      const idealY = Math.max(TOP_PAD, (vh - height) / 2);

      // Cascade step: 36px per existing non-minimised window
      const visible = prev.filter((w) => !w.minimized);
      const step  = 36;
      const limit = Math.floor(Math.min(vw * 0.4, safeH * 0.4) / step);

      let bestX = idealX, bestY = idealY;

      // Try cascade offsets and pick the first that doesn't heavily overlap
      for (let attempt = 0; attempt <= visible.length; attempt++) {
        const offX = (attempt * step) % (limit * step + 1);
        const offY = (attempt * step) % (limit * step + 1);
        const tryX = Math.min(idealX + offX, vw - width  - 8);
        const tryY = Math.min(idealY + offY, vh - BOTTOM_PAD - height);
        const clampX = Math.max(0, tryX);
        const clampY = Math.max(TOP_PAD, tryY);

        // Check overlap: allow the attempt if no window covers the title bar area
        const overlapsFocus = visible.some((w) => {
          const ox = Math.abs(w.x - clampX);
          const oy = Math.abs(w.y - clampY);
          return ox < step * 0.5 && oy < step * 0.5;
        });

        bestX = clampX;
        bestY = clampY;
        if (!overlapsFocus) break;
      }

      return [
        ...prev,
        { id, app: appId, x: Math.round(bestX), y: Math.round(bestY), w: width, h: height, z: newZ, minimized: false, maximized: false },
      ];
    });
    // Sound + Cortex
    playWindowOpen();
    trackEvent("app_open", { appId });
    rememberActiveApp(appId);
  }, []);

  const closeWindow = useCallback((id) => {
    playWindowClose();
    setWindows((prev) => {
      const win = prev.find((w) => w.id === id);
      if (win) trackEvent("app_close", { appId: win.app });
      return prev.filter((w) => w.id !== id);
    });
  }, []);

  const focusWindow = useCallback((id) => {
    let newZ = 0;
    setZCounter((z) => { newZ = z + 1; return newZ; });
    setActiveId(id);
    setWindows((prev) =>
      prev.map((w) => w.id === id ? { ...w, z: newZ, minimized: false } : w)
    );
  }, []);

  const updateWindow = useCallback((id, patch) => {
    setWindows((prev) =>
      prev.map((w) => w.id === id ? { ...w, ...patch } : w)
    );
  }, []);

  const toggleMaximize = useCallback((id) => {
    setWindows((prev) =>
      prev.map((w) => w.id === id ? { ...w, maximized: !w.maximized } : w)
    );
  }, []);

  const minimize = useCallback((id) => {
    setWindows((prev) =>
      prev.map((w) => w.id === id ? { ...w, minimized: true } : w)
    );
    setActiveId((cur) => (cur === id ? null : cur));
  }, []);

  const restoreApp = useCallback((appId) => {
    setWindows((prev) =>
      prev.map((w) => w.app === appId ? { ...w, minimized: false } : w)
    );
  }, []);

  useEffect(() => {
    const handleOpenApp = (e) => {
      const appId = e.detail?.appId || e.detail;
      if (appId) openApp(appId);
    };
    const handleCloseApp = (e) => {
      const appId = e.detail?.appId || e.detail;
      if (appId) {
        setWindows((prev) => {
          const win = prev.find((w) => w.app === appId);
          if (win) {
            playWindowClose();
            trackEvent("app_close", { appId });
            return prev.filter((w) => w.id !== win.id);
          }
          return prev;
        });
      }
    };
    const handleRestoreApp = (e) => {
      const appId = e.detail?.appId || e.detail;
      if (appId) restoreApp(appId);
    };
    window.addEventListener("omniverse:open-app", handleOpenApp);
    window.addEventListener("omniverse:close-app", handleCloseApp);
    window.addEventListener("omniverse:restore-app", handleRestoreApp);
    window.__omniverse_openApp = openApp;
    window.__omniverse_closeApp = (appId) => handleCloseApp({ detail: { appId } });
    window.__omniverse_restoreApp = restoreApp;
    return () => {
      window.removeEventListener("omniverse:open-app", handleOpenApp);
      window.removeEventListener("omniverse:close-app", handleCloseApp);
      window.removeEventListener("omniverse:restore-app", handleRestoreApp);
      delete window.__omniverse_openApp;
      delete window.__omniverse_closeApp;
      delete window.__omniverse_restoreApp;
    };
  }, [openApp, restoreApp]);

  useEffect(() => {
    window.__omniverse_windows = windows;
  }, [windows]);

  // ── Cortex: URL tracking helper (call this from the Browser app) ─────────────
  const trackUrl = useCallback((url) => {
    trackEvent("url_visit", { url });
    rememberLastUrl(url);
  }, []);

  // ── Workspace Restore (Priority 2) ───────────────────────────────────────────
  // Rebuilds the window stack from a snapshot.
  // - Dedupes by appId (a single window per app on restore)
  // - Clamps positions to the viewport so nothing lands off-screen
  // - Assigns fresh z-indexes preserving original stack order
  // - Records a `workspace_restore` event in the activity timeline
  const restoreFromWindowsList = useCallback((snapWindows) => {
    if (!Array.isArray(snapWindows) || snapWindows.length === 0) return 0;
    const vw = window.innerWidth;
    const vh = window.innerHeight;
    const seen = new Set();
    const sorted = [...snapWindows].sort((a, b) => (a.z ?? a.zIndex ?? 0) - (b.z ?? b.zIndex ?? 0));
    const rebuilt = [];
    let baseZ = 100;
    for (const w of sorted) {
      if (!w?.app || seen.has(w.app)) continue;
      seen.add(w.app);
      const width  = Math.min(Math.max(w.w ?? 800, 320), vw);
      const height = Math.min(Math.max(w.h ?? 540, 240), vh - 100);
      const x = Math.max(0, Math.min(w.x ?? 80, vw - 160));
      const y = Math.max(40, Math.min(w.y ?? 80, vh - 160));
      baseZ += 1;
      rebuilt.push({
        id: `${w.app}-${Date.now()}-${rebuilt.length}`,
        app: w.app,
        x, y, w: width, h: height,
        z: baseZ,
        minimized: false,
        maximized: false,
      });
    }
    setWindows(rebuilt);
    setZCounter(baseZ + 1);
    setActiveId(rebuilt[rebuilt.length - 1]?.id ?? null);
    trackEvent("workspace_restore", { count: rebuilt.length });
    return rebuilt.length;
  }, []);

  const restoreLastWorkspace = useCallback(() => {
    const snap = autoRestore();
    return restoreFromWindowsList(snap);
  }, [restoreFromWindowsList]);

  const saveCurrentWorkspace = useCallback((name) => {
    if (!name || !name.trim()) return false;
    saveSnapshot(windows, name.trim());
    return true;
  }, [windows]);

  const deleteNamedWorkspace = useCallback((name) => {
    if (!name) return;
    deleteSnapshot(name);
  }, []);

  const restoreNamedWorkspace = useCallback((name) => {
    const snap = loadSnapshot(name);
    if (!snap?.windows?.length) return 0;
    return restoreFromWindowsList(snap.windows);
  }, [restoreFromWindowsList]);

  const lastWorkspace = useCallback(() => getAutoSnapshot(), []);

  // ── notifications ────────────────────────────────────────────────────────────
  /**
   * @param {string} title
   * @param {string} message
   * @param {string} [type="info"] — "info"|"success"|"warning"|"error"
   * @param {Array<{label:string, type:string, payload:string}>} [actions] — optional action buttons
   */
  const pushNotification = useCallback((title, message, type = "info", actions = []) => {
    playNotification();
    const n = {
      id:   `n-${Date.now()}`,
      title,
      message,
      type,
      time: new Date().toISOString(),
      actions: actions || [],
    };
    setNotifications((prev) => [n, ...prev].slice(0, 50));
  }, []);

  const clearNotifications = useCallback(() => setNotifications([]), []);

  const dismissNotification = useCallback(
    (id) => setNotifications((prev) => prev.filter((n) => n.id !== id)),
    []
  );

  // ── context value ────────────────────────────────────────────────────────────
  return (
    <OSContext.Provider
      value={{
        user, loading,
        login, signup, logout,
        windows, setWindows, activeId,
        openApp, closeWindow, focusWindow, updateWindow, toggleMaximize, minimize,
        paletteOpen, setPaletteOpen,
        notifOpen,   setNotifOpen,
        notifications, pushNotification, clearNotifications, dismissNotification,
        wallpaper, setWallpaper,
        trackUrl,
        // Workspace Restore (Priority 2)
        restoreLastWorkspace, restoreNamedWorkspace, saveCurrentWorkspace, lastWorkspace,
        deleteNamedWorkspace,
      }}
    >
      {children}
    </OSContext.Provider>
  );
};

export const useOS = () => useContext(OSContext);
