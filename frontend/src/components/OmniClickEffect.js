import React, { useEffect, useRef, useState } from "react";
import { playClick, playGlassTap, playSwitch } from "../lib/soundEngine";

/**
 * OmniClickEffect — 2026 Next-Gen Micro-Interactions:
 * 1. Global tactile click sound for buttons, tabs, switches and interactive elements.
 * 2. Luminous spatial click ripple with chromatic radial flare at pointer coordinates.
 * 3. Spatial ambient cursor aura on desktop with magnetic illumination on interactive targets.
 */
export default function OmniClickEffect() {
  const [ripples, setRipples] = useState([]);
  const auraRef = useRef(null);
  const auraPos = useRef({ x: -200, y: -200, targetX: -200, targetY: -200 });
  const isHoveringInteractive = useRef(false);
  const lastSoundTime = useRef(0);

  useEffect(() => {
    // Only run on non-touch or when pointer is available
    const isTouchOnly = window.matchMedia("(pointer: coarse)").matches && !window.matchMedia("(pointer: fine)").matches;

    // ── Click & Tactile Sound Trigger ──────────────────────────────────────────
    const handlePointerDown = (e) => {
      // 1. Generate visual ripple flare at click coordinate
      const id = Date.now() + Math.random();
      const x = e.clientX;
      const y = e.clientY;

      setRipples((prev) => [...prev.slice(-8), { id, x, y }]);
      setTimeout(() => {
        setRipples((prev) => prev.filter((r) => r.id !== id));
      }, 550);

      // 2. Play tactile micro-interaction sound if interactive target
      const now = performance.now();
      if (now - lastSoundTime.current < 45) return; // Debounce rapid bursts

      const target = e.target;
      if (!target) return;

      const button = target.closest?.("button, a, [role='button'], input[type='button'], input[type='submit'], .os-control, .neon-btn, [data-interactive='true'], .traffic-light, [role='tab'], [role='menuitem']");
      const isSwitch = target.closest?.("[role='switch'], input[type='checkbox']");
      const isTab = target.closest?.("[role='tab'], .tab-item");

      if (isSwitch) {
        playSwitch();
        lastSoundTime.current = now;
      } else if (isTab) {
        playGlassTap();
        lastSoundTime.current = now;
      } else if (button) {
        playClick();
        lastSoundTime.current = now;
      }
    };

    // ── 2026 Spatial Cursor Aura Follower (Desktop only) ───────────────────────
    let rafId = null;
    const handlePointerMove = (e) => {
      auraPos.current.targetX = e.clientX;
      auraPos.current.targetY = e.clientY;

      // Check if hovering interactive element for magnetic aura expansion
      const hovered = e.target?.closest?.("button, a, [role='button'], .dock-item, .window-drag-handle, [role='tab'], .glass-card, .neon-btn");
      isHoveringInteractive.current = !!hovered;
    };

    const animateAura = () => {
      if (auraRef.current && !isTouchOnly) {
        // Smooth lerp (linear interpolation)
        auraPos.current.x += (auraPos.current.targetX - auraPos.current.x) * 0.22;
        auraPos.current.y += (auraPos.current.targetY - auraPos.current.y) * 0.22;

        const isHovered = isHoveringInteractive.current;
        const scale = isHovered ? 1.45 : 1.0;
        const opacity = isHovered ? 0.38 : 0.22;

        auraRef.current.style.transform = `translate3d(${auraPos.current.x}px, ${auraPos.current.y}px, 0) translate(-50%, -50%) scale(${scale})`;
        auraRef.current.style.opacity = opacity;
      }
      rafId = requestAnimationFrame(animateAura);
    };

    window.addEventListener("pointerdown", handlePointerDown, { passive: true });
    if (!isTouchOnly) {
      window.addEventListener("pointermove", handlePointerMove, { passive: true });
      rafId = requestAnimationFrame(animateAura);
    }

    return () => {
      window.removeEventListener("pointerdown", handlePointerDown);
      if (!isTouchOnly) {
        window.removeEventListener("pointermove", handlePointerMove);
        if (rafId) cancelAnimationFrame(rafId);
      }
    };
  }, []);

  return (
    <div
      className="pointer-events-none fixed inset-0 overflow-hidden"
      style={{ zIndex: 99999 }}
      aria-hidden="true"
    >
      {/* 2026 Spatial Cursor Illumination Aura */}
      <div
        ref={auraRef}
        className="fixed top-0 left-0 w-36 h-36 rounded-full pointer-events-none transition-[width,height,opacity] duration-300"
        style={{
          background: "radial-gradient(circle, rgba(0,240,255,0.40) 0%, rgba(138,43,226,0.18) 45%, transparent 70%)",
          filter: "blur(18px)",
          willChange: "transform, opacity",
          opacity: 0,
        }}
      />

      {/* Luminous Ripple Flares */}
      {ripples.map((r) => (
        <span
          key={r.id}
          className="absolute rounded-full pointer-events-none animate-omni-ripple-2026"
          style={{
            left: r.x,
            top: r.y,
            transform: "translate(-50%, -50%)",
          }}
        />
      ))}
    </div>
  );
}

