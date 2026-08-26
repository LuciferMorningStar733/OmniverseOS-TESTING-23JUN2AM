import React, { useEffect, useRef } from "react";

export default function OmniverseField({ activeAppId = null, isAIReasoning = false }) {
  const canvasRef = useRef(null);

  // Derive environment mode
  const mode = useMemoMode(activeAppId, isAIReasoning);

  useEffect(() => {
    const canvas = canvasRef.current;
    if (!canvas) return;
    const ctx = canvas.getContext("2d");
    let animationFrameId;

    let width = (canvas.width = window.innerWidth);
    let height = (canvas.height = window.innerHeight);

    const handleResize = () => {
      if (!canvas) return;
      width = canvas.width = window.innerWidth;
      height = canvas.height = window.innerHeight;
    };
    window.addEventListener("resize", handleResize);

    const nodeCount = mode === "writing" ? 15 : mode === "blackbox" ? 45 : 28;
    const nodes = Array.from({ length: nodeCount }, () => ({
      x: Math.random() * width,
      y: Math.random() * height,
      vx: (Math.random() - 0.5) * (mode === "writing" ? 0.15 : 0.35),
      vy: (Math.random() - 0.5) * (mode === "writing" ? 0.15 : 0.35),
      radius: Math.random() * 1.5 + 0.5,
      alpha: Math.random() * 0.4 + 0.1,
    }));

    let t = 0;
    const render = () => {
      t += 0.01;
      ctx.clearRect(0, 0, width, height);

      // Deep Spatial Radial Void Base
      const gradient = ctx.createRadialGradient(
        width / 2,
        height / 2,
        100,
        width / 2,
        height / 2,
        Math.max(width, height) * 0.75
      );

      if (mode === "writing") {
        gradient.addColorStop(0, "#05070D");
        gradient.addColorStop(1, "#020305");
      } else if (mode === "blackbox") {
        gradient.addColorStop(0, "rgba(0, 240, 255, 0.06)");
        gradient.addColorStop(0.5, "rgba(168, 85, 247, 0.03)");
        gradient.addColorStop(1, "#030407");
      } else if (mode === "mirror") {
        gradient.addColorStop(0, "rgba(168, 85, 247, 0.08)");
        gradient.addColorStop(0.6, "rgba(0, 240, 255, 0.03)");
        gradient.addColorStop(1, "#030407");
      } else {
        gradient.addColorStop(0, "rgba(0, 240, 255, 0.03)");
        gradient.addColorStop(1, "#030407");
      }

      ctx.fillStyle = gradient;
      ctx.fillRect(0, 0, width, height);

      // Render subtle Nodes
      for (let i = 0; i < nodes.length; i++) {
        const n = nodes[i];
        n.x += n.vx;
        n.y += n.vy;

        if (n.x < 0 || n.x > width) n.vx *= -1;
        if (n.y < 0 || n.y > height) n.vy *= -1;

        const breathe = Math.sin(t + i) * 0.3 + 0.7;
        const colorHex = mode === "mirror" ? "#A855F7" : mode === "blackbox" ? "#00F0FF" : "#00F0FF";

        ctx.beginPath();
        ctx.arc(n.x, n.y, n.radius, 0, Math.PI * 2);
        ctx.fillStyle = `${colorHex}${Math.floor(n.alpha * breathe * 255).toString(16).padStart(2, "0")}`;
        ctx.fill();
      }

      animationFrameId = requestAnimationFrame(render);
    };

    render();

    return () => {
      window.removeEventListener("resize", handleResize);
      cancelAnimationFrame(animationFrameId);
    };
  }, [mode]);

  return (
    <canvas
      ref={canvasRef}
      style={{
        position: "absolute",
        inset: 0,
        width: "100%",
        height: "100%",
        pointerEvents: "none",
        zIndex: 0,
      }}
      data-testid="omniverse-field"
    />
  );
}

function useMemoMode(activeAppId, isAIReasoning) {
  if (isAIReasoning) return "reasoning";
  if (!activeAppId) return "idle";
  if (activeAppId === "notes") return "writing";
  if (activeAppId === "blackbox" || activeAppId === "zero") return "blackbox";
  if (activeAppId === "mirror") return "mirror";
  return "active";
}
