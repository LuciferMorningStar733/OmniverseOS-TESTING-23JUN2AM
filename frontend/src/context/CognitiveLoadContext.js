/**
 * CognitiveLoadContext — P13: React context for live cognitive load state.
 *
 * Recalculates the load score every 30 seconds and injects CSS custom
 * properties on <html> so any component can adapt via CSS without re-rendering.
 *
 * Usage:
 *   const { score, state } = useCognitiveLoad();
 *   // state: "flow" | "normal" | "scattered"
 */
import React, { createContext, useContext, useEffect, useRef, useState } from "react";
import { initCognitiveLoad, computeScore, getLoadState } from "../lib/cognitiveLoad";

const CognitiveLoadContext = createContext({ score: 50, state: "normal" });

const RECALC_INTERVAL_MS = 30_000;

// ── CSS custom property injection ─────────────────────────────────────────
function applyAdaptation(state) {
  const root = document.documentElement;
  if (state === "flow") {
    // Quiet mode: soften motion, reduce opacity of non-essential chrome
    root.style.setProperty("--cortex-motion-scale",  "0.5");
    root.style.setProperty("--cortex-chrome-opacity", "0.6");
  } else {
    root.style.setProperty("--cortex-motion-scale",  "1");
    root.style.setProperty("--cortex-chrome-opacity", "1");
  }
}

export function CognitiveLoadProvider({ children }) {
  const [score, setScore] = useState(50);
  const [state, setState] = useState("normal");
  const prevStateRef = useRef("normal");

  useEffect(() => {
    initCognitiveLoad();

    const tick = () => {
      const s  = computeScore();
      const st = getLoadState(s);
      setScore(s);
      setState(st);
      applyAdaptation(st);

      if (st !== prevStateRef.current) {
        window.dispatchEvent(new CustomEvent("cortex:load-state-change", {
          detail: { score: s, state: st, prev: prevStateRef.current },
        }));
        prevStateRef.current = st;
      }
    };

    tick(); // immediate first sample
    const id = setInterval(tick, RECALC_INTERVAL_MS);
    return () => clearInterval(id);
  }, []);

  return (
    <CognitiveLoadContext.Provider value={{ score, state }}>
      {children}
    </CognitiveLoadContext.Provider>
  );
}

export function useCognitiveLoad() {
  return useContext(CognitiveLoadContext);
}
