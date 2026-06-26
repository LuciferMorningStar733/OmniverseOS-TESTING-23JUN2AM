import React, {
  createContext,
  useContext,
  useEffect,
  useState,
  useCallback,
} from "react";
import { authApi } from "../lib/api";
import { DEFAULT_WALLPAPER } from "../lib/wallpapers";

const OSContext = createContext(null);

// ─── localStorage keys ────────────────────────────────────────────────────────
const LS_TOKEN    = "omniverse_token";
const LS_WINDOWS  = "omniverse_windows";
const LS_NOTIFS   = "omniverse_notifs";
const LS_WALLPAPER = "omniverse_wallpaper";

// ─── helpers ──────────────────────────────────────────────────────────────────
const safeJSON = (key, fallback) => {
  try { return JSON.parse(localStorage.getItem(key) || "null") ?? fallback; }
  catch { return fallback; }
};

export const OSProvider = ({ children }) => {
  // ── auth ──────────────────────────────────────────────────────────────────
  const [user,    setUser]    = useState(null);
  const [loading, setLoading] = useState(true);

  // ── window manager ────────────────────────────────────────────────────────
  const [windows,  setWindows]  = useState(() => safeJSON(LS_WINDOWS, []));
  const [activeId, setActiveId] = useState(null);
  const [zCounter, setZCounter] = useState(100);

  // ── UI overlays ───────────────────────────────────────────────────────────
  const [paletteOpen, setPaletteOpen] = useState(false);
  const [notifOpen,   setNotifOpen]   = useState(false);

  // ── notifications ─────────────────────────────────────────────────────────
  const [notifications, setNotifications] = useState(() =>
    safeJSON(LS_NOTIFS, [])
  );

  // ── wallpaper ─────────────────────────────────────────────────────────────
  const [wallpaper, setWallpaperState] = useState(
    () => localStorage.getItem(LS_WALLPAPER) || DEFAULT_WALLPAPER
  );

  const setWallpaper = useCallback((id) => {
    setWallpaperState(id);
    localStorage.setItem(LS_WALLPAPER, id);
  }, []);

  // ── persistence effects ───────────────────────────────────────────────────
  useEffect(() => {
    // Only persist geometry — keep sensitive z / minimized state out of LS
    localStorage.setItem(
      LS_WINDOWS,
      JSON.stringify(
        windows.map(({ id, app, x, y, w, h }) => ({ id, app, x, y, w, h }))
      )
    );
  }, [windows]);

  useEffect(() => {
    localStorage.setItem(LS_NOTIFS, JSON.stringify(notifications.slice(0, 30)));
  }, [notifications]);

  // ── auth init ─────────────────────────────────────────────────────────────
  useEffect(() => {
    const init = async () => {
      const token = localStorage.getItem(LS_TOKEN);
      if (!token) { setLoading(false); return; }
      try {
        const me = await authApi.me();
        setUser(me);
      } catch {
        localStorage.removeItem(LS_TOKEN);
      } finally {
        setLoading(false);
      }
    };
    init();
  }, []);

  // ── auth actions ──────────────────────────────────────────────────────────
  // Supports both { token, user } and { access_token } backend response shapes.
  const login = useCallback(async (email, password) => {
    const res = await authApi.login({ email, password });
    const token = res.token || res.access_token;
    localStorage.setItem(LS_TOKEN, token);
    // Use user from response when available; fall back to /me
    const me = res.user ? res.user : await authApi.me();
    setUser(me);
    return me;
  }, []);

  const signup = useCallback(async (email, password, name) => {
    const res = await authApi.signup({ email, password, name });
    const token = res.token || res.access_token;
    localStorage.setItem(LS_TOKEN, token);
    const me = res.user ? res.user : await authApi.me();
    setUser(me);
    return me;
  }, []);

  const logout = useCallback(() => {
    localStorage.removeItem(LS_TOKEN);
    setUser(null);
    setWindows([]);
  }, []);

  // ── window manager ────────────────────────────────────────────────────────
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
      const cascadeOffset = (prev.length * 30) % 120;
      const x = Math.max(0, (vw - width)  / 2) + cascadeOffset;
      const y = Math.max(0, (vh - height) / 2) + cascadeOffset;

      return [
        ...prev,
        { id, app: appId, x, y, w: width, h: height, z: newZ, minimized: false, maximized: false },
      ];
    });
  }, []);

  const closeWindow = useCallback((id) => {
    setWindows((prev) => prev.filter((w) => w.id !== id));
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
  }, []);

  // ── notifications ─────────────────────────────────────────────────────────
  const pushNotification = useCallback((title, message, type = "info") => {
    const n = {
      id:      `n-${Date.now()}`,
      title,
      message,
      type,
      time:    new Date().toISOString(),
    };
    setNotifications((prev) => [n, ...prev].slice(0, 50));
  }, []);

  const clearNotifications = useCallback(() => setNotifications([]), []);

  // ── context value ─────────────────────────────────────────────────────────
  return (
    <OSContext.Provider
      value={{
        // auth
        user, loading, login, signup, logout,
        // windows
        windows, activeId,
        openApp, closeWindow, focusWindow, updateWindow, toggleMaximize, minimize,
        // overlays
        paletteOpen, setPaletteOpen,
        notifOpen,   setNotifOpen,
        // notifications
        notifications, pushNotification, clearNotifications,
        // wallpaper
        wallpaper, setWallpaper,
      }}
    >
      {children}
    </OSContext.Provider>
  );
};

export const useOS = () => useContext(OSContext);
