import React, { createContext, useCallback, useContext, useState } from "react";
import { DEFAULT_LAYOUT } from "./widgetRegistry";

const WidgetManagerContext = createContext(null);

const LS_LAYOUT  = "omniverse_widget_layout";
const LS_VISIBLE = "omniverse_widgets_visible";

const safeJSON = (key, fallback) => {
  try { return JSON.parse(localStorage.getItem(key) ?? "null") ?? fallback; }
  catch { return fallback; }
};

export const WidgetManagerProvider = ({ children }) => {
  const [visible, setVisible] = useState(() => safeJSON(LS_VISIBLE, true));
  const [layout,  setLayout]  = useState(() => safeJSON(LS_LAYOUT, DEFAULT_LAYOUT));

  const toggleVisible = useCallback(() => {
    setVisible((v) => {
      const next = !v;
      localStorage.setItem(LS_VISIBLE, JSON.stringify(next));
      return next;
    });
  }, []);

  const updateWidget = useCallback((id, patch) => {
    setLayout((prev) => {
      const next = prev.map((w) => w.id === id ? { ...w, ...patch } : w);
      localStorage.setItem(LS_LAYOUT, JSON.stringify(next));
      return next;
    });
  }, []);

  const resetLayout = useCallback(() => {
    setLayout(DEFAULT_LAYOUT);
    localStorage.setItem(LS_LAYOUT, JSON.stringify(DEFAULT_LAYOUT));
  }, []);

  const toggleCollapse = useCallback((id) => {
    setLayout((prev) => {
      const next = prev.map((w) => w.id === id ? { ...w, collapsed: !w.collapsed } : w);
      localStorage.setItem(LS_LAYOUT, JSON.stringify(next));
      return next;
    });
  }, []);

  const togglePin = useCallback((id) => {
    setLayout((prev) => {
      const next = prev.map((w) => w.id === id ? { ...w, pinned: !w.pinned } : w);
      localStorage.setItem(LS_LAYOUT, JSON.stringify(next));
      return next;
    });
  }, []);

  const removeWidget = useCallback((id) => {
    setLayout((prev) => {
      const next = prev.filter((w) => w.id !== id);
      localStorage.setItem(LS_LAYOUT, JSON.stringify(next));
      return next;
    });
  }, []);

  const addWidget = useCallback((def) => {
    setLayout((prev) => {
      if (prev.find((w) => w.id === def.id)) return prev;
      const next = [...prev, {
        id: def.id, x: 0, y: 0,
        w: def.defaultW, h: def.defaultH,
        collapsed: false, pinned: false,
      }];
      localStorage.setItem(LS_LAYOUT, JSON.stringify(next));
      return next;
    });
  }, []);

  return (
    <WidgetManagerContext.Provider value={{
      visible, toggleVisible,
      layout, updateWidget, resetLayout,
      toggleCollapse, togglePin,
      removeWidget, addWidget,
    }}>
      {children}
    </WidgetManagerContext.Provider>
  );
};

export const useWidgetManager = () => useContext(WidgetManagerContext);
