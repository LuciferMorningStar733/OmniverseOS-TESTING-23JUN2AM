import React, { useEffect, useRef } from "react";

export default function OmniverseField({ activeAppId = null, isAIReasoning = false }) {
  const canvasRef = useRef(null);

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
    window.addEventListener("resize", handleResize, { passive: true });

    const nodeCount = mode === "writing" ? 12 : mode === "blackbox" ? 36 : 22;
    const nodes = Array.from({ length: nodeCount }, () => ({
      x: Math.random() * width,
      y: Math.random() * height,
      vx: (Math.random() - 0.5) * (mode === "writing" ? 0.12 : 0.25),
      vy: (Math.random() - 0.5) * (mode === "writing" ? 0.12 : 0.25),
      radius: Math.random() * 1.4 + 0.6,
      alpha: Math.random() * 0.35 + 0.1,
    }));

    let t = 0;
    const render = () => {
      t += 0.01;
      // Pure transparent clearing — allow underlying WallpaperFX canvas & CSS near-black navy to shine through
      ctx.clearRect(0, 0, width, height);

      // Render subtle environmental telemetry node points only
      for (let i = 0; i < nodes.length; i++) {
        const n = nodes[i];
        n.x += n.vx;
        n.y += n.vy;

        if (n.x < 0 || n.x > width) n.vx *= -1;
        if (n.y < 0 || n.y > height) n.vy *= -1;

        const breathe = Math.sin(t + i) * 0.35 + 0.65;
        const colorHex = mode === "mirror" ? "#A855F7" : mode === "blackbox" ? "#00F0FF" : "#00F0FF";

        ctx.beginPath();
        ctx.arc(n.x, n.y, n.radius, 0, Math.PI * 2);
        ctx.fillStyle = `${colorHex}${Math.floor(n.alpha * breathe * 180).toString(16).padStart(2, "0")}`;
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
        background: "transparent",
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
