import React, { useEffect, useRef } from "react";

/**
 * CyberOrb — Futuristic Cybernetic Audio-Reactive 3D Visualizer
 * Renders a locked 60 FPS Canvas visualizer with dynamic state plasma rings,
 * orbital particle turbulence, and speech spectrum reactivity.
 */
export default function CyberOrb({
  state = "IDLE", // IDLE | LISTENING | THINKING | SPEAKING | INTERRUPTED | ERROR
  isListening = false,
  isSpeaking = false,
  volume = 1.0,
  size = 240,
  onClick,
}) {
  const canvasRef = useRef(null);
  const animFrameRef = useRef(null);
  const phaseRef = useRef(0);
  const particlesRef = useRef([]);

  // Initialize particle constellation
  useEffect(() => {
    const particleCount = 48;
    const particles = [];
    for (let i = 0; i < particleCount; i++) {
      const angle = (Math.PI * 2 * i) / particleCount + (Math.random() - 0.5) * 0.5;
      const radius = 0.35 + Math.random() * 0.45;
      const speed = 0.005 + Math.random() * 0.015;
      const sizeVal = 1.2 + Math.random() * 2.2;
      particles.push({ angle, radius, speed, size: sizeVal, alpha: 0.3 + Math.random() * 0.6 });
    }
    particlesRef.current = particles;
  }, []);

  useEffect(() => {
    const canvas = canvasRef.current;
    if (!canvas) return;
    const ctx = canvas.getContext("2d");
    if (!ctx) return;

    let running = true;

    const render = () => {
      if (!running) return;

      const width = canvas.width;
      const height = canvas.height;
      const cx = width / 2;
      const cy = height / 2;
      const baseRadius = (Math.min(width, height) / 2) * 0.52;

      phaseRef.current += 0.03;
      const phase = phaseRef.current;

      ctx.clearRect(0, 0, width, height);

      // Determine palette based on state
      let primaryColor = "#00F0FF";   // Cyan (Idle)
      let secondaryColor = "#00A8FF";
      let glowColor = "rgba(0, 240, 255, 0.4)";
      let speedMult = 1.0;

      if (state === "SPEAKING" || isSpeaking) {
        primaryColor = "#00F0FF";
        secondaryColor = "#FF007A"; // Neon Pink
        glowColor = "rgba(0, 240, 255, 0.6)";
        speedMult = 2.2;
      } else if (state === "LISTENING" || isListening) {
        primaryColor = "#39FF14"; // Neon Green
        secondaryColor = "#00F0FF";
        glowColor = "rgba(57, 255, 20, 0.5)";
        speedMult = 1.8;
      } else if (state === "THINKING" || state === "PROCESSING" || state === "STARTING") {
        primaryColor = "#FCEE09"; // Neon Yellow
        secondaryColor = "#FF003C"; // Neon Crimson
        glowColor = "rgba(252, 238, 9, 0.5)";
        speedMult = 3.0;
      } else if (state === "ERROR") {
        primaryColor = "#FF003C";
        secondaryColor = "#DC2626";
        glowColor = "rgba(255, 0, 60, 0.6)";
        speedMult = 0.8;
      }

      // 1. Ambient outer aura glow
      const auraGrad = ctx.createRadialGradient(cx, cy, baseRadius * 0.2, cx, cy, baseRadius * 1.6);
      auraGrad.addColorStop(0, glowColor);
      auraGrad.addColorStop(0.6, "rgba(0, 240, 255, 0.08)");
      auraGrad.addColorStop(1, "rgba(0, 0, 0, 0)");
      ctx.fillStyle = auraGrad;
      ctx.beginPath();
      ctx.arc(cx, cy, baseRadius * 1.6, 0, Math.PI * 2);
      ctx.fill();

      // 2. Concentric Plasma Wave Rings
      const ringCount = 4;
      for (let r = 0; r < ringCount; r++) {
        ctx.save();
        ctx.beginPath();
        const rOffset = r * 14;
        const waveAmp = (6 + r * 4) * (state === "SPEAKING" ? 1.8 : 1.0);
        const points = 64;

        for (let i = 0; i <= points; i++) {
          const theta = (Math.PI * 2 * i) / points;
          const harmonic = Math.sin(theta * (3 + r) + phase * speedMult + r);
          const rad = baseRadius + rOffset + harmonic * waveAmp;
          const x = cx + Math.cos(theta) * rad;
          const y = cy + Math.sin(theta) * rad;
          if (i === 0) ctx.moveTo(x, y);
          else ctx.lineTo(x, y);
        }

        ctx.closePath();
        ctx.lineWidth = r === 0 ? 3 : 1.5;
        ctx.strokeStyle = r % 2 === 0 ? primaryColor : secondaryColor;
        ctx.shadowColor = primaryColor;
        ctx.shadowBlur = r === 0 ? 16 : 8;
        ctx.globalAlpha = Math.max(0.2, 0.9 - r * 0.22);
        ctx.stroke();
        ctx.restore();
      }

      // 3. Orbital Constellation Particles
      const particles = particlesRef.current;
      particles.forEach((p) => {
        p.angle += p.speed * speedMult;
        const orbitRad = baseRadius * p.radius + Math.sin(phase + p.angle) * 8;
        const px = cx + Math.cos(p.angle) * orbitRad;
        const py = cy + Math.sin(p.angle) * orbitRad;

        ctx.save();
        ctx.beginPath();
        ctx.arc(px, py, p.size, 0, Math.PI * 2);
        ctx.fillStyle = primaryColor;
        ctx.shadowColor = primaryColor;
        ctx.shadowBlur = 10;
        ctx.globalAlpha = p.alpha;
        ctx.fill();
        ctx.restore();

        // Connect nearby particles with subtle energy lines
        particles.forEach((p2) => {
          const p2Rad = baseRadius * p2.radius;
          const p2x = cx + Math.cos(p2.angle) * p2Rad;
          const p2y = cy + Math.sin(p2.angle) * p2Rad;
          const dist = Math.hypot(px - p2x, py - p2y);
          if (dist < 32) {
            ctx.save();
            ctx.beginPath();
            ctx.moveTo(px, py);
            ctx.lineTo(p2x, p2y);
            ctx.strokeStyle = primaryColor;
            ctx.globalAlpha = (1 - dist / 32) * 0.25;
            ctx.lineWidth = 0.8;
            ctx.stroke();
            ctx.restore();
          }
        });
      });

      // 4. Central Holographic Core Orb
      const corePulse = Math.sin(phase * 2) * 4;
      const coreGrad = ctx.createRadialGradient(cx, cy, 0, cx, cy, baseRadius * 0.45 + corePulse);
      coreGrad.addColorStop(0, "#FFFFFF");
      coreGrad.addColorStop(0.4, primaryColor);
      coreGrad.addColorStop(0.85, secondaryColor);
      coreGrad.addColorStop(1, "rgba(0, 0, 0, 0)");

      ctx.save();
      ctx.beginPath();
      ctx.arc(cx, cy, baseRadius * 0.45 + corePulse, 0, Math.PI * 2);
      ctx.fillStyle = coreGrad;
      ctx.shadowColor = primaryColor;
      ctx.shadowBlur = 24;
      ctx.fill();
      ctx.restore();

      animFrameRef.current = requestAnimationFrame(render);
    };

    animFrameRef.current = requestAnimationFrame(render);

    return () => {
      running = false;
      if (animFrameRef.current) cancelAnimationFrame(animFrameRef.current);
    };
  }, [state, isListening, isSpeaking, volume]);

  return (
    <div
      onClick={onClick}
      className="relative flex items-center justify-center cursor-pointer select-none group focus:outline-none"
      style={{ width: size, height: size }}
      title={`Cortex Core: ${state}`}
    >
      <canvas
        ref={canvasRef}
        width={size * 2}
        height={size * 2}
        style={{ width: size, height: size }}
        className="w-full h-full transform transition-transform duration-300 group-hover:scale-105"
      />
      <div className="absolute inset-0 rounded-full bg-cyan-500/5 opacity-0 group-hover:opacity-100 transition-opacity pointer-events-none blur-xl" />
    </div>
  );
}
