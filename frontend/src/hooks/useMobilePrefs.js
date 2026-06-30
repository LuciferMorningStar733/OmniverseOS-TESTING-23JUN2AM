import { useState, useCallback } from "react";

const LS_KEY = "omniverse_mobile_prefs";

export const LOCK_TIMEOUT_OPTIONS = [
  { label: "Never",   value: 0 },
  { label: "30 sec",  value: 30 },
  { label: "1 min",   value: 60 },
  { label: "2 min",   value: 120 },
  { label: "5 min",   value: 300 },
];

const DEFAULTS = {
  lockTimeout:   60,
  swipeNav:      true,
  reduceMotion:  false,
  lockEnabled:   true,
};

function load() {
  try { return { ...DEFAULTS, ...JSON.parse(localStorage.getItem(LS_KEY) || "{}") }; }
  catch { return DEFAULTS; }
}

export function useMobilePrefs() {
  const [prefs, setPrefsState] = useState(load);

  const setPref = useCallback((key, value) => {
    setPrefsState((prev) => {
      const next = { ...prev, [key]: value };
      localStorage.setItem(LS_KEY, JSON.stringify(next));
      return next;
    });
  }, []);

  const readPrefs = useCallback(() => load(), []);

  return { prefs, setPref, readPrefs };
}

export function loadMobilePrefs() {
  return load();
}
