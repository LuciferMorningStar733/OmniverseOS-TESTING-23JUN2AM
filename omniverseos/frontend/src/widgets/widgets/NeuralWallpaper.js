/**
 * NeuralWallpaper.js — Priority 13
 * Living AI environment: animated neural network + particles + aurora pulses.
 * Touch-reactive, time-adaptive, hardware-accelerated canvas.
 */

import React, { useEffect, useRef, useMemo } from "react";

function getThemeColors(hour) {
  if (hour >= 5  && hour < 8)  return ["#FF8C42", "#FF4F00", "#FFB347"];
  if (hour >= 8  && hour < 12) return ["#00F0FF", "#0077FF", "#00FFA3"];
  if (hour >= 12 && hour < 17) return ["#A78BFA", "#7C3AED", "#00F0FF"];
  if (hour >= 17 && hour < 21) return ["#F59E0B", "#FB923C", "#FFDE59"];
  return ["#4F46E5", "#818CF8", "#2DD4BF"];
}

const NODE_COUNT = 42;
const PARTICLE_COUNT = 60;

class NeuralNetwork {
  constructor(W, H, colors) {
    this.W = W;
    this.H = H;
    this.colors = colors;
    this.mouse = { x: W / 2, y: H / 2, active: false };
    this.nodes = this.createNodes();
    this.particles = this.createParticles();
    this.pulses = [];
    this.time = 0;
  }

  createNodes() {
    return Array.from({ length: NODE_COUNT }, (_, i) => ({
      x: Math.random() * this.W,
      y: Math.random() * this.H,
      vx: (Math.random() - 0.5) * 0.25,
      vy: (Math.random() - 0.5) * 0.25,
      r: 1.5 + Math.random() * 2,
      pulse: Math.random() * Math.PI * 2,
      pSpeed: 0.018 + Math.random() * 0.022,
      colorIdx: Math.floor(Math.random() * 3),
      brightness: 0.4 + Math.random() * 0.6,
    }));
  }

  createParticles() {
    return Array.from({ length: PARTICLE_COUNT }, () => ({
      x: Math.random() * this.W,
      y: Math.random() * this.H,
      vx: (Math.random() - 0.5) * 0.5,
      vy: (Math.random() - 0.5) * 0.5,
      r: 0.5 + Math.random() * 1.2,
      life: Math.random(),
      decay: 0.002 + Math.random() * 0.003,
    }));
  }

  resize(W, H) {
    this.W = W;
    this.H = H;
  }

  setMouse(x, y, active) {
    this.mouse = { x, y, active };
  }

  spawnPulse(x, y) {
    this.pulses.push({ x, y, r: 0, maxR: 80 + Math.random() * 60, alpha: 0.6, speed: 2 + Math.random() * 2 });
  }

  update() {
    this.time += 0.012;
    const { W, H, mouse } = this;

    // Update nodes
    for (const n of this.nodes) {
      n.pulse += n.pSpeed;

      // Drift + gentle mouse repulsion
      if (mouse.active) {
        const dx = n.x - mouse.x;
        const dy = n.y - mouse.y;
        const dist = Math.sqrt(dx * dx + dy * dy);
        if (dist < 120 && dist > 0) {
          const force = (120 - dist) / 120 * 0.08;
          n.vx += (dx / dist) * force;
          n.vy += (dy / dist) * force;
        }
      }

      n.x += n.vx;
      n.y += n.vy;

      // Damping
      n.vx *= 0.98;
      n.vy *= 0.98;

      // Boundary bounce
      if (n.x < 0) { n.x = 0; n.vx = Math.abs(n.vx); }
      if (n.x > W) { n.x = W; n.vx = -Math.abs(n.vx); }
      if (n.y < 0) { n.y = 0; n.vy = Math.abs(n.vy); }
      if (n.y > H) { n.y = H; n.vy = -Math.abs(n.vy); }
    }

    // Update particles
    for (const p of this.particles) {
      p.x += p.vx;
      p.y += p.vy;
      p.life -= p.decay;
      if (p.life <= 0 || p.x < 0 || p.x > W || p.y < 0 || p.y > H) {
        p.x = Math.random() * W;
        p.y = Math.random() * H;
        p.vx = (Math.random() - 0.5) * 0.5;
        p.vy = (Math.random() - 0.5) * 0.5;
        p.life = 0.7 + Math.random() * 0.3;
      }
    }

    // Update pulses
    for (const pu of this.pulses) {
      pu.r += pu.speed;
      pu.alpha *= 0.94;
    }
    this.pulses = this.pulses.filter((pu) => pu.alpha > 0.01 && pu.r < pu.maxR);
  }

  draw(ctx) {
    const { W, H, nodes, particles, pulses, colors, time } = this;

    // Clear with deep space fade
    ctx.fillStyle = "rgba(3, 4, 12, 0.22)";
    ctx.fillRect(0, 0, W, H);

    // Aurora layers
    const auroraColor1 = colors[0];
    const auroraColor2 = colors[1];
    const t = time * 0.5;
    const g1 = ctx.createRadialGradient(
      W * (0.65 + 0.15 * Math.sin(t)),
      H * (0.18 + 0.08 * Math.cos(t * 0.7)),
      0,
      W * (0.65 + 0.15 * Math.sin(t)),
      H * (0.18 + 0.08 * Math.cos(t * 0.7)),
      W * 0.55
    );
    g1.addColorStop(0, auroraColor1 + "16");
    g1.addColorStop(1, "transparent");
    ctx.fillStyle = g1;
    ctx.fillRect(0, 0, W, H);

    const g2 = ctx.createRadialGradient(
      W * (0.22 + 0.12 * Math.cos(t * 0.8)),
      H * (0.72 + 0.10 * Math.sin(t * 0.6)),
      0,
      W * (0.22 + 0.12 * Math.cos(t * 0.8)),
      H * (0.72 + 0.10 * Math.sin(t * 0.6)),
      W * 0.45
    );
    g2.addColorStop(0, auroraColor2 + "10");
    g2.addColorStop(1, "transparent");
    ctx.fillStyle = g2;
    ctx.fillRect(0, 0, W, H);

    // Draw neural connections
    const MAX_DIST = Math.min(W, H) * 0.28;
    for (let i = 0; i < nodes.length; i++) {
      for (let j = i + 1; j < nodes.length; j++) {
        const dx = nodes[i].x - nodes[j].x;
        const dy = nodes[i].y - nodes[j].y;
        const dist = Math.sqrt(dx * dx + dy * dy);
        if (dist < MAX_DIST) {
          const alpha = (1 - dist / MAX_DIST) * 0.18;
          const col = colors[nodes[i].colorIdx];
          ctx.beginPath();
          ctx.strokeStyle = col + Math.round(alpha * 255).toString(16).padStart(2, "0");
          ctx.lineWidth = 0.6;
          ctx.moveTo(nodes[i].x, nodes[i].y);
          ctx.lineTo(nodes[j].x, nodes[j].y);
          ctx.stroke();
        }
      }
    }

    // Draw nodes
    for (const n of nodes) {
      const pulseFactor = 0.7 + 0.3 * Math.sin(n.pulse);
      const col = colors[n.colorIdx];
      const alpha = n.brightness * pulseFactor;
      const r = n.r * pulseFactor;

      ctx.beginPath();
      ctx.arc(n.x, n.y, r + 3, 0, Math.PI * 2);
      ctx.fillStyle = col + Math.round(alpha * 0.08 * 255).toString(16).padStart(2, "0");
      ctx.fill();

      ctx.beginPath();
      ctx.arc(n.x, n.y, r, 0, Math.PI * 2);
      ctx.fillStyle = col + Math.round(alpha * 255).toString(16).padStart(2, "0");
      ctx.fill();
    }

    // Draw floating particles
    for (const p of particles) {
      const alpha = p.life * 0.55;
      const col = colors[Math.floor(Math.random() * 3)];
      ctx.beginPath();
      ctx.arc(p.x, p.y, p.r, 0, Math.PI * 2);
      ctx.fillStyle = col + Math.round(alpha * 255).toString(16).padStart(2, "0");
      ctx.fill();
    }

    // Draw pulse rings
    for (const pu of pulses) {
      const col = colors[0];
      ctx.beginPath();
      ctx.arc(pu.x, pu.y, pu.r, 0, Math.PI * 2);
      ctx.strokeStyle = col + Math.round(pu.alpha * 255).toString(16).padStart(2, "0");
      ctx.lineWidth = 1.5;
      ctx.stroke();
    }
  }
}

export default function NeuralWallpaper({ style }) {
  const canvasRef = useRef(null);
  const netRef    = useRef(null);
  const rafRef    = useRef(null);
  const lastPulse = useRef(0);

  const hour = new Date().getHours();
  const colors = useMemo(() => getThemeColors(hour), [hour]);

  useEffect(() => {
    const canvas = canvasRef.current;
    if (!canvas) return;
    const ctx = canvas.getContext("2d", { alpha: true });

    const resize = () => {
      canvas.width  = canvas.offsetWidth  * (window.devicePixelRatio || 1);
      canvas.height = canvas.offsetHeight * (window.devicePixelRatio || 1);
      ctx.scale(window.devicePixelRatio || 1, window.devicePixelRatio || 1);
      if (netRef.current) {
        netRef.current.resize(canvas.offsetWidth, canvas.offsetHeight);
      } else {
        netRef.current = new NeuralNetwork(canvas.offsetWidth, canvas.offsetHeight, colors);
      }
    };
    resize();

    const ro = new ResizeObserver(resize);
    ro.observe(canvas);

    // Touch / mouse interaction
    const onTouch = (e) => {
      const rect = canvas.getBoundingClientRect();
      const touch = e.touches?.[0] || e;
      const x = touch.clientX - rect.left;
      const y = touch.clientY - rect.top;
      netRef.current?.setMouse(x, y, true);
      if (Date.now() - lastPulse.current > 300) {
        netRef.current?.spawnPulse(x, y);
        lastPulse.current = Date.now();
      }
    };
    const onEnd = () => netRef.current?.setMouse(0, 0, false);

    canvas.addEventListener("touchstart",  onTouch, { passive: true });
    canvas.addEventListener("touchmove",   onTouch, { passive: true });
    canvas.addEventListener("touchend",    onEnd,   { passive: true });
    canvas.addEventListener("mousemove",   onTouch, { passive: true });
    canvas.addEventListener("mouseleave",  onEnd,   { passive: true });

    // Auto-pulse every 6 seconds
    const pulseInterval = setInterval(() => {
      if (netRef.current) {
        const { W, H } = netRef.current;
        netRef.current.spawnPulse(Math.random() * W, Math.random() * H);
      }
    }, 6000);

    let last = 0;
    const FPS = 1000 / 48; // ~48fps target

    const loop = (ts) => {
      rafRef.current = requestAnimationFrame(loop);
      if (ts - last < FPS) return;
      last = ts;
      if (!netRef.current) return;
      netRef.current.update();
      netRef.current.draw(ctx);
    };
    rafRef.current = requestAnimationFrame(loop);

    return () => {
      cancelAnimationFrame(rafRef.current);
      clearInterval(pulseInterval);
      ro.disconnect();
      canvas.removeEventListener("touchstart",  onTouch);
      canvas.removeEventListener("touchmove",   onTouch);
      canvas.removeEventListener("touchend",    onEnd);
      canvas.removeEventListener("mousemove",   onTouch);
      canvas.removeEventListener("mouseleave",  onEnd);
    };
  }, [colors]);

  return (
    <canvas
      ref={canvasRef}
      style={{
        position: "absolute",
        inset: 0,
        width: "100%",
        height: "100%",
        pointerEvents: "auto",
        ...style,
      }}
    />
  );
}
