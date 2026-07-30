/**
 * BrightnessContext — single source of truth for screen brightness.
 * Wrap <App> (or at least <Desktop>) with <BrightnessProvider>.
 * Consume with useBrightnessContext() anywhere: Desktop, TopBar, Settings.
 */
import React, { createContext, useContext, useState, useCallback, useEffect } from "react";
import { clamp } from "../lib/utils";

const LS_KEY = "omniverse_brightness";
const DEFAULT_BRIGHTNESS = 100;

const BrightnessContext = createContext(null);

export function BrightnessProvider({ children }) {
  const [brightness, setBrightnessState] = useState(() => {
    const saved = parseInt(localStorage.getItem(LS_KEY) ?? "", 10);
    return isNaN(saved) ? DEFAULT_BRIGHTNESS : clamp(saved, 10, 100);
  });
  const [open, setOpen] = useState(false);

  const setBrightness = useCallback((val) => {
    const clamped = clamp(Math.round(val), 10, 100);
    setBrightnessState(clamped);
    localStorage.setItem(LS_KEY, String(clamped));
  }, []);

  const openOverlay   = useCallback(() => setOpen(true),  []);
  const closeOverlay  = useCallback(() => setOpen(false), []);
  const toggleOverlay = useCallback(() => setOpen((v) => !v), []);

  return (
    <BrightnessContext.Provider value={{ brightness, setBrightness, open, openOverlay, closeOverlay, toggleOverlay }}>
      {children}
    </BrightnessContext.Provider>
  );
}

export function useBrightnessContext() {
  const ctx = useContext(BrightnessContext);
  if (!ctx) throw new Error("useBrightnessContext must be used inside <BrightnessProvider>");
  return ctx;
}
