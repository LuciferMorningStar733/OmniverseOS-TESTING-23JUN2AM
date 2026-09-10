// WallpaperFX.js — Living canvas wallpaper visual engines for OmniverseOS
// Multi-layered GPU-accelerated canvas physics with interactive cursor proximity

import React, { useEffect, useRef } from "react";

const CHARS = "01アイウエオカキクケコサシスセソタチツテトナニヌネノ日ABCDEFabcdef<>{}[]!@#$%^&*";
const HEX   = "0123456789ABCDEF";

function hex2(n) {
  return Math.floor(Math.max(0, Math.min(255, n))).toString(16).padStart(2, "0");
}

// ═══════════════════════════════════════════════════════════════════════════════
// 1. MATRIX RAIN ENGINE
// ═══════════════════════════════════════════════════════════════════════════════
class MatrixRain {
  constructor(W, H, accent) {
    this.accent = accent;
    this.fs = 14;
    this.reset(W, H);
  }
  reset(W, H) {
    this.cols = Math.ceil(W / this.fs);
    this.drops  = Array.from({ length: this.cols }, () => -(Math.random() * 40));
    this.speeds = Array.from({ length: this.cols }, () => 0.45 + Math.random() * 0.85);
    this.chars  = Array.from({ length: this.cols }, () => CHARS[Math.floor(Math.random() * CHARS.length)]);
    this.bright = Array.from({ length: this.cols }, () => Math.random() < 0.2);
  }
  draw(ctx, W, H, t, mouse) {
    ctx.fillStyle = "rgba(4, 6, 12, 0.08)";
    ctx.fillRect(0, 0, W, H);
    ctx.font = `bold ${this.fs}px 'JetBrains Mono', monospace`;

    for (let i = 0; i < this.cols; i++) {
      if (Math.random() < 0.03) this.chars[i] = CHARS[Math.floor(Math.random() * CHARS.length)];
      const x = i * this.fs;
      let y = this.drops[i] * this.fs;

      // Mouse proximity repulsion
      if (mouse.x > 0) {
        const dx = x - mouse.x;
        const dy = y - mouse.y;
        const dist = Math.sqrt(dx * dx + dy * dy);
        if (dist < 120) {
          const force = (1 - dist / 120) * 15;
          y += (dy / (dist || 1)) * force;
        }
      }

      // Leading glyph — pure white with intense glow
      if (y >= 0 && y < H) {
        ctx.shadowColor  = this.accent;
        ctx.shadowBlur   = this.bright[i] ? 16 : 8;
        ctx.fillStyle    = this.bright[i] ? "#FFFFFF" : this.accent;
        ctx.fillText(this.chars[i], x, y);
        ctx.shadowBlur   = 0;
      }

      // Fading tail
      const trailLen = 16 + Math.floor(Math.random() * 8);
      for (let j = 1; j < trailLen; j++) {
        const ty = y - j * this.fs;
        if (ty < -this.fs || ty > H) continue;
        const alpha = 1 - j / trailLen;
        ctx.fillStyle = this.accent + hex2(alpha * 200);
        ctx.fillText(CHARS[Math.floor(Math.random() * CHARS.length)], x, ty);
      }

      this.drops[i] += this.speeds[i];
      if (this.drops[i] * this.fs > H + 20 && Math.random() > 0.975) {
        this.drops[i] = -(5 + Math.random() * 25);
      }
    }
  }
}

// ═══════════════════════════════════════════════════════════════════════════════
// 2. CIRCUIT SPARKS ENGINE
// ═══════════════════════════════════════════════════════════════════════════════
class CircuitSparks {
  constructor(W, H, accent) {
    this.accent = accent;
    this.sparks = [];
    this.init(W, H);
  }
  init(W, H) {
    const GX = 16, GY = 10;
    const px = W * 0.04, py = H * 0.08;
    const sx = (W - px * 2) / (GX - 1);
    const sy = (H - py * 2) / (GY - 1);

    this.nodes = [];
    for (let gy = 0; gy < GY; gy++) {
      for (let gx = 0; gx < GX; gx++) {
        this.nodes.push({
          x: px + gx * sx + (Math.random() - 0.5) * sx * 0.3,
          y: py + gy * sy + (Math.random() - 0.5) * sy * 0.3,
          pulse: Math.random() * Math.PI * 2,
          litTimer: 0,
        });
      }
    }
    this.edges = [];
    for (let i = 0; i < this.nodes.length; i++) {
      if (i % GX < GX - 1 && Math.random() < 0.75) this.edges.push([i, i + 1]);
      if (i + GX < this.nodes.length && Math.random() < 0.65) this.edges.push([i, i + GX]);
    }
  }
  spawnSpark() {
    if (this.sparks.length >= 45 || !this.edges.length) return;
    const e = this.edges[Math.floor(Math.random() * this.edges.length)];
    this.sparks.push({ e, p: 0, spd: 0.01 + Math.random() * 0.02, trail: [] });
  }
  draw(ctx, W, H, t, mouse) {
    ctx.clearRect(0, 0, W, H);

    // Dim circuit lines
    ctx.lineWidth = 0.8;
    for (const [a, b] of this.edges) {
      const na = this.nodes[a], nb = this.nodes[b];
      ctx.beginPath(); ctx.moveTo(na.x, na.y); ctx.lineTo(nb.x, nb.y);
      ctx.strokeStyle = this.accent + "1C"; ctx.stroke();
    }

    // Nodes
    for (const n of this.nodes) {
      n.pulse += 0.03;
      if (n.litTimer > 0) n.litTimer -= 0.03;
      let r = 2.5 + Math.sin(n.pulse) * 0.9;

      // Mouse proximity interaction
      if (mouse.x > 0) {
        const d = Math.hypot(n.x - mouse.x, n.y - mouse.y);
        if (d < 140) {
          n.litTimer = Math.max(n.litTimer, (1 - d / 140));
          r += (1 - d / 140) * 3;
        }
      }

      ctx.beginPath(); ctx.arc(n.x, n.y, r, 0, Math.PI * 2);
      const alpha = n.litTimer > 0 ? 0.95 : 0.25;
      ctx.fillStyle = this.accent + hex2(alpha * 255);
      if (n.litTimer > 0) {
        ctx.shadowColor = this.accent;
        ctx.shadowBlur = 12 * n.litTimer;
      }
      ctx.fill(); ctx.shadowBlur = 0;
    }

    if (Math.random() < 0.16) this.spawnSpark();

    this.sparks = this.sparks.filter((s) => {
      const na = this.nodes[s.e[0]], nb = this.nodes[s.e[1]];
      const cx = na.x + (nb.x - na.x) * s.p;
      const cy = na.y + (nb.y - na.y) * s.p;

      s.trail.push({ x: cx, y: cy });
      if (s.trail.length > 14) s.trail.shift();

      ctx.beginPath(); ctx.moveTo(na.x, na.y); ctx.lineTo(cx, cy);
      ctx.strokeStyle = this.accent + "AA"; ctx.lineWidth = 1.6; ctx.stroke();

      const g = ctx.createRadialGradient(cx, cy, 0, cx, cy, 12);
      g.addColorStop(0, "#FFFFFF");
      g.addColorStop(0.4, this.accent + "FF");
      g.addColorStop(1, "transparent");
      ctx.beginPath(); ctx.arc(cx, cy, 12, 0, Math.PI * 2); ctx.fillStyle = g; ctx.fill();

      s.p += s.spd;
      if (s.p >= 1) { this.nodes[s.e[1]].litTimer = 1.0; return false; }
      return true;
    });
  }
}

// ═══════════════════════════════════════════════════════════════════════════════
// 3. NEURAL PULSES ENGINE
// ═══════════════════════════════════════════════════════════════════════════════
class NeuralPulses {
  constructor(W, H, accent) {
    this.accent = accent;
    this.pulses = [];
    this.t = 0;
    this.init(W, H);
  }
  init(W, H) {
    const N = 32;
    this.nodes = Array.from({ length: N }, () => ({
      x: W * 0.05 + Math.random() * W * 0.9,
      y: H * 0.06 + Math.random() * H * 0.88,
      r: 3.5 + Math.random() * 4,
      phase: Math.random() * Math.PI * 2,
      speed: 0.02 + Math.random() * 0.03,
      firing: false, fire: 0,
    }));
    this.links = [];
    for (let i = 0; i < N; i++) {
      for (let j = i + 1; j < N; j++) {
        const d = Math.hypot(this.nodes[i].x - this.nodes[j].x, this.nodes[i].y - this.nodes[j].y);
        if (d < W * 0.28 && Math.random() < 0.55) this.links.push([i, j, d]);
      }
    }
  }
  fire(i) {
    const n = this.nodes[i]; if (!n || n.firing) return;
    n.firing = true; n.fire = 1.0;
    for (const [a, b] of this.links) {
      if (a === i || b === i) {
        const tgt = a === i ? b : a;
        setTimeout(() => { if (this.nodes[tgt]) this.fire(tgt); }, 200 + Math.random() * 350);
        this.pulses.push({ from: i, to: tgt, p: 0, spd: 0.006 + Math.random() * 0.01 });
      }
    }
  }
  draw(ctx, W, H, t, mouse) {
    ctx.clearRect(0, 0, W, H);
    this.t += 0.016;
    if (Math.random() < 0.01) this.fire(Math.floor(Math.random() * this.nodes.length));

    // Links
    for (const [a, b, d] of this.links) {
      const na = this.nodes[a], nb = this.nodes[b];
      let alpha = Math.max(0.05, 0.24 - d / (W * 1.5));
      ctx.beginPath(); ctx.moveTo(na.x, na.y); ctx.lineTo(nb.x, nb.y);
      ctx.strokeStyle = this.accent + hex2(alpha * 255); ctx.lineWidth = 0.6; ctx.stroke();
    }

    // Pulses
    this.pulses = this.pulses.filter((p) => {
      const na = this.nodes[p.from], nb = this.nodes[p.to]; if (!na || !nb) return false;
      const px = na.x + (nb.x - na.x) * p.p;
      const py = na.y + (nb.y - na.y) * p.p;
      ctx.beginPath(); ctx.arc(px, py, 5, 0, Math.PI * 2);
      ctx.fillStyle = this.accent; ctx.shadowColor = this.accent; ctx.shadowBlur = 14;
      ctx.fill(); ctx.shadowBlur = 0;
      p.p += p.spd;
      return p.p < 1;
    });

    // Nodes
    for (const n of this.nodes) {
      n.phase += n.speed;
      if (n.firing) { n.fire -= 0.025; if (n.fire <= 0) n.firing = false; }

      // Mouse attraction & pulse trigger
      if (mouse.x > 0) {
        const md = Math.hypot(n.x - mouse.x, n.y - mouse.y);
        if (md < 100 && Math.random() < 0.05) this.fire(this.nodes.indexOf(n));
      }

      const scale = n.firing ? 1 + n.fire * 2.2 : 1;
      const r = n.r * scale;
      const pulse = Math.sin(n.phase) * 0.5 + 0.5;

      if (n.firing || pulse > 0.7) {
        const gr = ctx.createRadialGradient(n.x, n.y, 0, n.x, n.y, r * 4);
        gr.addColorStop(0, this.accent + hex2((n.firing ? 0.8 : 0.4) * 255));
        gr.addColorStop(1, "transparent");
        ctx.beginPath(); ctx.arc(n.x, n.y, r * 4, 0, Math.PI * 2); ctx.fillStyle = gr; ctx.fill();
      }
      ctx.beginPath(); ctx.arc(n.x, n.y, r, 0, Math.PI * 2);
      ctx.fillStyle = n.firing ? "#FFFFFF" : this.accent + hex2((0.6 + pulse * 0.4) * 255);
      ctx.fill();
    }
  }
}

// ═══════════════════════════════════════════════════════════════════════════════
// 4. NEURAL SINGULARITY ENGINE (BLACK HOLE GRAVITY WELL)
// ═══════════════════════════════════════════════════════════════════════════════
class SingularityFX {
  constructor(W, H, accent) {
    this.accent = accent;
    this.particles = [];
    this.init(W, H);
  }
  init(W, H) {
    this.cx = W / 2;
    this.cy = H / 2;
    const count = 180;
    for (let i = 0; i < count; i++) {
      const angle = Math.random() * Math.PI * 2;
      const dist = 60 + Math.random() * Math.max(W, H) * 0.45;
      this.particles.push({
        angle,
        dist,
        speed: 0.005 + Math.random() * 0.015,
        radialSpeed: 0.2 + Math.random() * 0.8,
        size: 1 + Math.random() * 2.5,
        alpha: 0.2 + Math.random() * 0.8,
      });
    }
  }
  draw(ctx, W, H, t, mouse) {
    ctx.fillStyle = "rgba(3, 4, 8, 0.15)";
    ctx.fillRect(0, 0, W, H);

    let targetCx = W / 2;
    let targetCy = H / 2;
    if (mouse.x > 0) {
      targetCx += (mouse.x - W / 2) * 0.12;
      targetCy += (mouse.y - H / 2) * 0.12;
    }
    this.cx += (targetCx - this.cx) * 0.05;
    this.cy += (targetCy - this.cy) * 0.05;

    // Black hole core & event horizon
    const coreR = 48 + Math.sin(t * 0.05) * 6;
    const coreGlow = ctx.createRadialGradient(this.cx, this.cy, coreR * 0.5, this.cx, this.cy, coreR * 3.5);
    coreGlow.addColorStop(0, "#000000");
    coreGlow.addColorStop(0.3, "rgba(0,0,0,0.95)");
    coreGlow.addColorStop(0.65, this.accent + "88");
    coreGlow.addColorStop(1, "transparent");
    ctx.beginPath(); ctx.arc(this.cx, this.cy, coreR * 3.5, 0, Math.PI * 2);
    ctx.fillStyle = coreGlow; ctx.fill();

    // Event horizon ring
    ctx.beginPath(); ctx.arc(this.cx, this.cy, coreR, 0, Math.PI * 2);
    ctx.strokeStyle = this.accent; ctx.lineWidth = 3;
    ctx.shadowColor = this.accent; ctx.shadowBlur = 24;
    ctx.stroke(); ctx.shadowBlur = 0;

    // Orbiting particles
    for (const p of this.particles) {
      p.angle += p.speed * (150 / Math.max(30, p.dist));
      p.dist -= p.radialSpeed;
      if (p.dist < coreR * 0.8) {
        p.dist = 80 + Math.random() * Math.max(W, H) * 0.45;
        p.angle = Math.random() * Math.PI * 2;
      }

      const px = this.cx + Math.cos(p.angle) * p.dist;
      const py = this.cy + Math.sin(p.angle) * (p.dist * 0.55);

      ctx.beginPath(); ctx.arc(px, py, p.size, 0, Math.PI * 2);
      ctx.fillStyle = this.accent + hex2(p.alpha * 255);
      ctx.fill();
    }
  }
}

// ═══════════════════════════════════════════════════════════════════════════════
// 5. FLUID AURORA RIBBON ENGINE
// ═══════════════════════════════════════════════════════════════════════════════
class AuroraRibbonFX {
  constructor(W, H, accent) {
    this.accent = accent;
    this.t = 0;
  }
  draw(ctx, W, H, t, mouse) {
    ctx.clearRect(0, 0, W, H);
    this.t += 0.012;

    const layers = [
      { color: this.accent, alpha: 0.15, speed: 1.0, waveHeight: 90 },
      { color: "#A855F7", alpha: 0.12, speed: 0.8, waveHeight: 120 },
      { color: "#39FF14", alpha: 0.10, speed: 1.3, waveHeight: 70 },
    ];

    let mouseShift = 0;
    if (mouse.x > 0) mouseShift = (mouse.x / W - 0.5) * 60;

    for (let l = 0; l < layers.length; l++) {
      const layer = layers[l];
      ctx.beginPath();
      ctx.moveTo(0, H);

      for (let x = 0; x <= W; x += 25) {
        const sin1 = Math.sin((x * 0.003) + this.t * layer.speed + l * 2 + mouseShift * 0.02);
        const sin2 = Math.cos((x * 0.006) - this.t * 0.7 * layer.speed);
        const y = H * 0.45 + sin1 * layer.waveHeight + sin2 * 35;
        ctx.lineTo(x, y);
      }

      ctx.lineTo(W, H);
      ctx.closePath();

      const grad = ctx.createLinearGradient(0, H * 0.2, 0, H);
      grad.addColorStop(0, layer.color + hex2(layer.alpha * 255));
      grad.addColorStop(0.5, layer.color + hex2(layer.alpha * 120));
      grad.addColorStop(1, "transparent");

      ctx.fillStyle = grad;
      ctx.fill();
    }
  }
}

// ═══════════════════════════════════════════════════════════════════════════════
// 6. 3D CYBER GRID ENGINE (INFINITE SCROLLING SYNTHWAVE GRID)
// ═══════════════════════════════════════════════════════════════════════════════
class CyberGrid3DFX {
  constructor(W, H, accent) {
    this.accent = accent;
    this.offsetY = 0;
  }
  draw(ctx, W, H, t, mouse) {
    ctx.clearRect(0, 0, W, H);
    this.offsetY = (this.offsetY + 1.2) % 40;

    const horizon = H * 0.52;
    const fov = 320;

    // Horizon glowing sun / aura
    const sunGrad = ctx.createRadialGradient(W / 2, horizon, 0, W / 2, horizon, 220);
    sunGrad.addColorStop(0, this.accent + "55");
    sunGrad.addColorStop(0.4, this.accent + "18");
    sunGrad.addColorStop(1, "transparent");
    ctx.fillStyle = sunGrad;
    ctx.fillRect(0, horizon - 220, W, 440);

    // Horizon line
    ctx.beginPath(); ctx.moveTo(0, horizon); ctx.lineTo(W, horizon);
    ctx.strokeStyle = this.accent; ctx.lineWidth = 2;
    ctx.shadowColor = this.accent; ctx.shadowBlur = 14; ctx.stroke(); ctx.shadowBlur = 0;

    // Perspective vertical grid lines
    ctx.lineWidth = 1;
    ctx.strokeStyle = this.accent + "40";
    const lineSpacing = 60;
    const center = W / 2 + (mouse.x > 0 ? (mouse.x - W / 2) * 0.08 : 0);

    for (let x = -W * 1.5; x <= W * 2.5; x += lineSpacing) {
      ctx.beginPath();
      ctx.moveTo(center + (x - center) * 0.08, horizon);
      ctx.lineTo(x, H);
      ctx.stroke();
    }

    // Horizontal moving grid lines
    for (let z = 0; z < H - horizon; z += 40) {
      const gz = z + this.offsetY;
      const y = horizon + (gz * gz) / (H - horizon);
      if (y > H) continue;

      const alpha = Math.min(1, (y - horizon) / 100);
      ctx.beginPath(); ctx.moveTo(0, y); ctx.lineTo(W, y);
      ctx.strokeStyle = this.accent + hex2(alpha * 120);
      ctx.stroke();
    }
  }
}

// ═══════════════════════════════════════════════════════════════════════════════
// 7. PLASMA PARTICLES ENGINE (PERLIN VECTOR DRIFT)
// ═══════════════════════════════════════════════════════════════════════════════
class PlasmaParticles {
  constructor(W, H, accent) {
    this.accent = accent;
    this.t = 0;
    const N = 140;
    this.pts = Array.from({ length: N }, () => ({
      x: Math.random() * W, y: Math.random() * H,
      vx: (Math.random() - 0.5) * 0.6,
      vy: (Math.random() - 0.5) * 0.6,
      r: 1.5 + Math.random() * 3,
      phase: Math.random() * Math.PI * 2,
    }));
  }
  draw(ctx, W, H, t, mouse) {
    ctx.clearRect(0, 0, W, H);
    this.t += 0.012;

    for (const p of this.pts) {
      const nx = Math.sin(p.x * 0.003 + this.t * 0.3) * 0.25;
      const ny = Math.cos(p.y * 0.003 + this.t * 0.25) * 0.25;
      p.vx = p.vx * 0.98 + nx; p.vy = p.vy * 0.98 + ny;

      // Mouse repulsion
      if (mouse.x > 0) {
        const d = Math.hypot(p.x - mouse.x, p.y - mouse.y);
        if (d < 120) {
          const force = (1 - d / 120) * 2.5;
          p.vx += ((p.x - mouse.x) / d) * force;
          p.vy += ((p.y - mouse.y) / d) * force;
        }
      }

      p.x += p.vx; p.y += p.vy;
      if (p.x < -12) p.x = W + 12; if (p.x > W + 12) p.x = -12;
      if (p.y < -12) p.y = H + 12; if (p.y > H + 12) p.y = -12;
    }

    const CONNECT = 90;
    for (let i = 0; i < this.pts.length; i++) {
      for (let j = i + 1; j < this.pts.length; j++) {
        const pa = this.pts[i], pb = this.pts[j];
        const d = Math.hypot(pa.x - pb.x, pa.y - pb.y);
        if (d < CONNECT) {
          ctx.beginPath(); ctx.moveTo(pa.x, pa.y); ctx.lineTo(pb.x, pb.y);
          ctx.strokeStyle = this.accent + hex2((1 - d / CONNECT) * 0.4 * 255);
          ctx.lineWidth = 0.5; ctx.stroke();
        }
      }
    }

    for (const p of this.pts) {
      p.phase += 0.02;
      const pulse = Math.sin(p.phase) * 0.5 + 0.5;
      ctx.beginPath(); ctx.arc(p.x, p.y, p.r * (0.8 + pulse * 0.5), 0, Math.PI * 2);
      ctx.fillStyle = this.accent + hex2((0.5 + pulse * 0.5) * 180);
      ctx.shadowColor = this.accent; ctx.shadowBlur = pulse * 8;
      ctx.fill(); ctx.shadowBlur = 0;
    }
  }
}

// ═══════════════════════════════════════════════════════════════════════════════
// REACT COMPONENT WRAPPER
// ═══════════════════════════════════════════════════════════════════════════════
export default function WallpaperFX({ fxType, accent = "#00F0FF" }) {
  const canvasRef = useRef(null);
  const frameRef  = useRef(null);
  const fxRef     = useRef(null);
  const mouseRef  = useRef({ x: -1000, y: -1000 });

  useEffect(() => {
    const handleMouseMove = (e) => {
      mouseRef.current = { x: e.clientX, y: e.clientY };
    };
    window.addEventListener("mousemove", handleMouseMove, { passive: true });
    return () => window.removeEventListener("mousemove", handleMouseMove);
  }, []);

  useEffect(() => {
    if (!fxType) return;
    const canvas = canvasRef.current;
    if (!canvas) return;
    if (window.matchMedia?.("(prefers-reduced-motion: reduce)").matches) return;

    const ctx2d = canvas.getContext("2d");

    function build(W, H) {
      switch (fxType) {
        case "matrix":
        case "rain":        return new MatrixRain(W, H, accent);
        case "circuit":
        case "grid":       return new CircuitSparks(W, H, accent);
        case "neural":     return new NeuralPulses(W, H, accent);
        case "singularity": return new SingularityFX(W, H, accent);
        case "aurora":     return new AuroraRibbonFX(W, H, accent);
        case "cybergrid":
        case "3dgrid":     return new CyberGrid3DFX(W, H, accent);
        case "plasma":
        case "space":
        case "reactor":
        case "chrono":
        case "orbital":    return new PlasmaParticles(W, H, accent);
        default:           return new PlasmaParticles(W, H, accent);
      }
    }

    function resize() {
      canvas.width  = window.innerWidth;
      canvas.height = window.innerHeight;
      fxRef.current = build(canvas.width, canvas.height);
    }
    resize();

    const ro = typeof ResizeObserver !== "undefined"
      ? new ResizeObserver(resize)
      : null;
    if (ro) ro.observe(document.documentElement);
    else window.addEventListener("resize", resize, { passive: true });

    let tick = 0;
    function loop() {
      tick++;
      if (fxRef.current && canvas.width > 0) {
        fxRef.current.draw(ctx2d, canvas.width, canvas.height, tick, mouseRef.current);
      }
      frameRef.current = requestAnimationFrame(loop);
    }
    frameRef.current = requestAnimationFrame(loop);

    return () => {
      cancelAnimationFrame(frameRef.current);
      if (ro) ro.disconnect(); else window.removeEventListener("resize", resize);
    };
  }, [fxType, accent]);

  if (!fxType) return null;

  return (
    <canvas
      ref={canvasRef}
      style={{
        position: "absolute",
        inset: 0,
        width: "100%",
        height: "100%",
        pointerEvents: "none",
        zIndex: 1,
        opacity: 0.95,
        mixBlendMode: "screen",
      }}
    />
  );
}
