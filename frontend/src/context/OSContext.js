import React, {
  createContext,
  useContext,
  useEffect,
  useState,
  useCallback,
} from "react";
import { authApi } from "../lib/api";

const OSContext = createContext();

export const OSProvider = ({ children }) => {
  const [user, setUser] = useState(null);
  const [loading, setLoading] = useState(true);

  const [windows, setWindows] = useState([]);
  const [activeId, setActiveId] = useState(null);
  const [zCounter, setZCounter] = useState(0);

  const [paletteOpen, setPaletteOpen] = useState(false);
  const [notifOpen, setNotifOpen] = useState(false);

  const [notifications, setNotifications] = useState([]);

  useEffect(() => {
    const init = async () => {
      const token = localStorage.getItem("omniverse_token");

      if (!token) {
        setLoading(false);
        return;
      }

      try {
        const me = await authApi.me();
        setUser(me);
      } catch {
        localStorage.removeItem("omniverse_token");
      }

      setLoading(false);
    };

    init();
  }, []);

  const login = async (email, password) => {
    const res = await authApi.login({ email, password });

    localStorage.setItem(
      "omniverse_token",
      res.token || res.access_token
    );

    const me = await authApi.me();
    setUser(me);
  };

  const signup = async (email, password, name) => {
    const res = await authApi.signup({
      email,
      password,
      name,
    });

    localStorage.setItem(
      "omniverse_token",
      res.token || res.access_token
    );

    const me = await authApi.me();
    setUser(me);
  };

  const logout = () => {
    localStorage.removeItem("omniverse_token");
    setUser(null);
    setWindows([]);
  };

  const openApp = useCallback((appId) => {
    let newZ = 0;

    setZCounter((z) => {
      newZ = z + 1;
      return newZ;
    });

    setWindows((prev) => {
      const existing = prev.find((w) => w.app === appId);

      if (existing) {
        setActiveId(existing.id);

        return prev.map((w) =>
          w.id === existing.id
            ? { ...w, z: newZ, minimized: false }
            : w
        );
      }

      const id = `${appId}-${Date.now()}`;

      setActiveId(id);

      const vw = window.innerWidth;
      const vh = window.innerHeight;

      const w = Math.min(920, vw * 0.85);
      const h = Math.min(600, vh * 0.8);

      const offset = (prev.length * 30) % 120;

      const win = {
        id,
        app: appId,
        x: (vw - w) / 2 + offset,
        y: (vh - h) / 2 + offset,
        w,
        h,
        z: newZ,
        minimized: false,
        maximized: false,
      };

      return [...prev, win];
    });
  }, []);

  const closeWindow = (id) => {
    setWindows((prev) => prev.filter((w) => w.id !== id));
  };

  const focusWindow = (id) => {
    setActiveId(id);

    setWindows((prev) =>
      prev.map((w) =>
        w.id === id
          ? {
              ...w,
              z: zCounter + 1,
            }
          : w
      )
    );
  };

  const updateWindow = (id, updates) => {
    setWindows((prev) =>
      prev.map((w) =>
        w.id === id ? { ...w, ...updates } : w
      )
    );
  };

  const minimize = (id) => {
    updateWindow(id, {
      minimized: true,
    });
  };

  const toggleMaximize = (id) => {
    setWindows((prev) =>
      prev.map((w) =>
        w.id === id
          ? {
              ...w,
              maximized: !w.maximized,
            }
          : w
      )
    );
  };

  const clearNotifications = () => {
    setNotifications([]);
  };

  return (
    <OSContext.Provider
      value={{
        user,
        loading,

        windows,
        activeId,

        paletteOpen,
        notifOpen,

        notifications,

        login,
        signup,
        logout,

        openApp,
        closeWindow,
        focusWindow,
        updateWindow,
        toggleMaximize,
        minimize,

        setPaletteOpen,
        setNotifOpen,

        clearNotifications,
      }}
    >
      {children}
    </OSContext.Provider>
  );
};

export const useOS = () => useContext(OSContext);