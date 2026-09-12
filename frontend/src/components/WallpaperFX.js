// WallpaperFX.js — High-performance 4K & adaptive Canvas wallpaper animations for OmniverseOS
// Supports 10 3036-era Masterpiece themes + 6 legacy procedural effects.
// Features adaptive DPR (4K -> mobile eco), tab visibility pausing, and prefers-reduced-motion.

import React, { useEffect, useRef } from "react";

const CHARS = "01アイウエオカキクケコサシスセソタチツテトナニヌネノ日ABCDEFabcdef<>{}[]!@#$%^&*";
const HEX   = "0123456789ABCDEF";

function hex2(n) {
  return Math.floor(Math.max(0, Math.min(255, n))).toString(16).padStart(2, "0");
}

// ═══════════════════════════════════════════════════════════════════════════════
// 1. OMNI GENESIS — Living cosmic intelligence field with evolving structures
// ═══════════════════════════════════════════════════════════════════════════════
class GenesisFX {
  constructor(W, H, accent, isMobile) {
    this.accent = accent;
    this.isMobile = isMobile;
    this.t = 0;
    this.init(W, H);
  }
  init(W, H) {
    this.cx = W / 2;
    this.cy = H / 2;
    const count = this.isMobile ? 24 : 56;
    this.nodes = Array.from({ length: count }, (_, i) => ({
      angle: (i / count) * Math.PI * 2,
      radius: Math.min(W, H) * (0.12 + Math.random() * 0.38),
      orbitSpeed: (Math.random() - 0.5) * 0.0035,
      size: 1.8 + Math.random() * 2.8,
      phase: Math.random() * Math.PI * 2,
      depth: 0.3 + Math.random() * 0.7,
    }));
    this.stardust = Array.from({ length: this.isMobile ? 35 : 90 }, () => ({
      x: Math.random() * W,
      y: Math.random() * H,
      vx: (Math.random() - 0.5) * 0.25,
      vy: (Math.random() - 0.5) * 0.25,
      r: 0.8 + Math.random() * 1.5,
      alpha: 0.2 + Math.random() * 0.6,
    }));
  }
  draw(ctx, W, H) {
    ctx.clearRect(0, 0, W, H);
    this.t += 0.012;

    const cx = W / 2;
    const cy = H / 2;

    // Harmonic cosmic radial rings
    const ringCount = this.isMobile ? 3 : 5;
    for (let i = 1; i <= ringCount; i++) {
      const ringR = Math.min(W, H) * (0.08 * i) + Math.sin(this.t * 0.7 + i) * 6;
      ctx.beginPath();
      ctx.arc(cx, cy, ringR, 0, Math.PI * 2);
      ctx.strokeStyle = this.accent + hex2(Math.max(12, 45 - i * 8));
      ctx.lineWidth = 0.8;
      ctx.setLineDash([6, 14]);
      ctx.stroke();
    }
    ctx.setLineDash([]);

    // Stardust drift
    ctx.fillStyle = this.accent;
    for (const p of this.stardust) {
      p.x += p.vx;
      p.y += p.vy;
      if (p.x < 0) p.x = W; if (p.x > W) p.x = 0;
      if (p.y < 0) p.y = H; if (p.y > H) p.y = 0;
      ctx.globalAlpha = p.alpha * (0.6 + Math.sin(this.t + p.x) * 0.4);
      ctx.beginPath();
      ctx.arc(p.x, p.y, p.r, 0, Math.PI * 2);
      ctx.fill();
    }
    ctx.globalAlpha = 1.0;

    // Evolving intelligence nodes & filaments
    const activeNodes = [];
    for (const n of this.nodes) {
      n.angle += n.orbitSpeed;
      n.phase += 0.02;
      const wobble = Math.sin(n.phase) * 18;
      const r = n.radius + wobble;
      const x = cx + Math.cos(n.angle) * r;
      const y = cy + Math.sin(n.angle) * r;
      activeNodes.push({ x, y, size: n.size, depth: n.depth });
    }

    // Inter-node filaments
    const maxDist = this.isMobile ? 95 : 140;
    for (let i = 0; i < activeNodes.length; i++) {
      for (let j = i + 1; j < activeNodes.length; j++) {
        const a = activeNodes[i];
        const b = activeNodes[j];
        const dx = a.x - b.x;
        const dy = a.y - b.y;
        const dist = Math.sqrt(dx * dx + dy * dy);
        if (dist < maxDist) {
          const alpha = (1 - dist / maxDist) * 0.35 * a.depth * b.depth;
          ctx.beginPath();
          ctx.moveTo(a.x, a.y);
          ctx.lineTo(b.x, b.y);
          ctx.strokeStyle = this.accent + hex2(alpha * 255);
          ctx.lineWidth = 0.6;
          ctx.stroke();
        }
      }
    }

    // Node glow
    for (const an of activeNodes) {
      ctx.beginPath();
      ctx.arc(an.x, an.y, an.size * 2.8, 0, Math.PI * 2);
      ctx.fillStyle = this.accent + "33";
      ctx.fill();

      ctx.beginPath();
      ctx.arc(an.x, an.y, an.size, 0, Math.PI * 2);
      ctx.fillStyle = "#FFFFFF";
      ctx.fill();
    }
  }
}

// ═══════════════════════════════════════════════════════════════════════════════
// 2. CORTEX NEURAL OCEAN — Deep dimensional neural structures forming & reorganizing
// ═══════════════════════════════════════════════════════════════════════════════
class NeuralOceanFX {
  constructor(W, H, accent, isMobile) {
    this.accent = accent;
    this.isMobile = isMobile;
    this.t = 0;
    this.waveLayers = this.isMobile ? 3 : 5;
  }
  draw(ctx, W, H) {
    ctx.clearRect(0, 0, W, H);
    this.t += 0.014;

    const baseH = H * 0.65;
    const step = this.isMobile ? 40 : 25;

    for (let l = 0; l < this.waveLayers; l++) {
      const layerOffset = l * 40;
      const speedMult = 0.8 + l * 0.3;
      const amp = 28 + l * 12;
      const freq = 0.003 + l * 0.001;
      const alpha = 0.12 + l * 0.08;

      ctx.beginPath();
      ctx.moveTo(0, H);
      for (let x = 0; x <= W + step; x += step) {
        const y = baseH + layerOffset + Math.sin(x * freq + this.t * speedMult) * amp + Math.cos(x * 0.002 - this.t * 0.5) * (amp * 0.5);
        ctx.lineTo(x, y);
      }
      ctx.lineTo(W, H);
      ctx.closePath();

      const grad = ctx.createLinearGradient(0, baseH - 50, 0, H);
      grad.addColorStop(0, this.accent + hex2(alpha * 255));
      grad.addColorStop(1, "transparent");
      ctx.fillStyle = grad;
      ctx.fill();

      // Synapse points on the crest
      if (l >= 1) {
        for (let x = 30; x < W; x += (this.isMobile ? 120 : 70)) {
          const y = baseH + layerOffset + Math.sin(x * freq + this.t * speedMult) * amp + Math.cos(x * 0.002 - this.t * 0.5) * (amp * 0.5);
          ctx.beginPath();
          ctx.arc(x, y, 2.2, 0, Math.PI * 2);
          ctx.fillStyle = "#FFFFFF";
          ctx.shadowColor = this.accent;
          ctx.shadowBlur = 8;
          ctx.fill();
          ctx.shadowBlur = 0;
        }
      }
    }
  }
}

// ═══════════════════════════════════════════════════════════════════════════════
// 3. QUANTUM HORIZON — Spacetime curvature with dimensional distortion
// ═══════════════════════════════════════════════════════════════════════════════
class QuantumHorizonFX {
  constructor(W, H, accent, isMobile) {
    this.accent = accent;
    this.isMobile = isMobile;
    this.t = 0;
  }
  draw(ctx, W, H) {
    ctx.clearRect(0, 0, W, H);
    this.t += 0.01;

    const cx = W / 2;
    const cy = H * 0.58;
    const gridCols = this.isMobile ? 12 : 22;

    // Perspective spacetime grid
    ctx.lineWidth = 0.7;
    for (let i = -gridCols; i <= gridCols; i++) {
      const xTop = cx + i * (W / (gridCols * 3.5));
      const xBottom = cx + i * (W / gridCols) * 2.2;
      const alpha = Math.max(0.04, 0.28 - Math.abs(i) / gridCols * 0.22);
      ctx.beginPath();
      ctx.moveTo(xTop, cy);
      ctx.lineTo(xBottom, H);
      ctx.strokeStyle = this.accent + hex2(alpha * 255);
      ctx.stroke();
    }

    // Horizontal spacetime contours with gravitational warp
    const rings = this.isMobile ? 7 : 14;
    for (let r = 1; r <= rings; r++) {
      const p = r / rings;
      const y = cy + Math.pow(p, 1.8) * (H - cy);
      const curve = Math.sin(this.t * 1.2 + r * 0.4) * 8;
      ctx.beginPath();
      ctx.moveTo(0, y + curve);
      ctx.quadraticCurveTo(cx, y - 16 * (1 - p), W, y + curve);
      ctx.strokeStyle = this.accent + hex2((0.15 + p * 0.25) * 255);
      ctx.stroke();
    }

    // Central horizon glow
    const g = ctx.createRadialGradient(cx, cy, 0, cx, cy, Math.min(W, H) * 0.4);
    g.addColorStop(0, this.accent + "40");
    g.addColorStop(0.3, this.accent + "12");
    g.addColorStop(1, "transparent");
    ctx.fillStyle = g;
    ctx.fillRect(0, 0, W, H);
  }
}

// ═══════════════════════════════════════════════════════════════════════════════
// 4. DIGITAL AURORA — Volumetric atmospheric ribbons with glowing depth
// ═══════════════════════════════════════════════════════════════════════════════
class DigitalAuroraFX {
  constructor(W, H, accent, isMobile) {
    this.accent = accent;
    this.isMobile = isMobile;
    this.t = 0;
  }
  draw(ctx, W, H) {
    ctx.clearRect(0, 0, W, H);
    this.t += 0.008;

    const bands = this.isMobile ? 3 : 5;
    const step = this.isMobile ? 35 : 20;

    for (let b = 0; b < bands; b++) {
      const baseY = H * (0.18 + b * 0.08);
      const amp = 45 + b * 15;
      const speed = 0.5 + b * 0.25;

      ctx.beginPath();
      ctx.moveTo(0, 0);
      for (let x = 0; x <= W + step; x += step) {
        const y = baseY + Math.sin(x * 0.0022 + this.t * speed) * amp + Math.cos(x * 0.0015 - this.t * 0.4) * 25;
        ctx.lineTo(x, y);
      }
      ctx.lineTo(W, 0);
      ctx.closePath();

      const grad = ctx.createLinearGradient(0, 0, 0, baseY + amp);
      grad.addColorStop(0, "transparent");
      grad.addColorStop(0.7, this.accent + (b % 2 === 0 ? "25" : "15"));
      grad.addColorStop(1, "transparent");
      ctx.fillStyle = grad;
      ctx.fill();
    }
  }
}

// ═══════════════════════════════════════════════════════════════════════════════
// 5. SENTIENT CITY 3036 — Autonomous megacity skyline with intelligent light networks
// ═══════════════════════════════════════════════════════════════════════════════
class SentientCityFX {
  constructor(W, H, accent, isMobile) {
    this.accent = accent;
    this.isMobile = isMobile;
    this.t = 0;
    this.init(W, H);
  }
  init(W, H) {
    const buildingCount = this.isMobile ? 14 : 28;
    const bw = W / buildingCount;
    this.buildings = Array.from({ length: buildingCount }, (_, i) => ({
      x: i * bw,
      w: bw + 2,
      h: H * (0.25 + Math.random() * 0.35),
      windows: Math.random() > 0.3,
    }));
    this.pulses = Array.from({ length: this.isMobile ? 12 : 26 }, () => ({
      x: Math.random() * W,
      y: H * (0.55 + Math.random() * 0.4),
      speed: 1.5 + Math.random() * 3.5,
      len: 12 + Math.random() * 25,
      color: Math.random() > 0.4 ? this.accent : "#00F0FF",
    }));
  }
  draw(ctx, W, H) {
    ctx.clearRect(0, 0, W, H);
    this.t += 0.015;

    // Skyline silhouettes
    ctx.fillStyle = "rgba(4, 8, 16, 0.72)";
    for (const b of this.buildings) {
      ctx.fillRect(b.x, H - b.h, b.w, b.h);
      ctx.strokeStyle = this.accent + "18";
      ctx.lineWidth = 1;
      ctx.strokeRect(b.x, H - b.h, b.w, b.h);
    }

    // Skyway transit bridges
    const bridges = [H * 0.72, H * 0.84];
    for (const by of bridges) {
      ctx.beginPath();
      ctx.moveTo(0, by);
      ctx.lineTo(W, by);
      ctx.strokeStyle = this.accent + "22";
      ctx.lineWidth = 1.2;
      ctx.stroke();
    }

    // Traffic light pulses
    for (const p of this.pulses) {
      p.x += p.speed;
      if (p.x > W + p.len) p.x = -p.len;

      ctx.beginPath();
      ctx.moveTo(p.x - p.len, p.y);
      ctx.lineTo(p.x, p.y);
      ctx.strokeStyle = p.color;
      ctx.lineWidth = 1.5;
      ctx.stroke();

      ctx.beginPath();
      ctx.arc(p.x, p.y, 2, 0, Math.PI * 2);
      ctx.fillStyle = "#FFFFFF";
      ctx.fill();
    }
  }
}

// ═══════════════════════════════════════════════════════════════════════════════
// 6. EVENT HORIZON — Gravitational singularity & relativistic accretion disk
// ═══════════════════════════════════════════════════════════════════════════════
class EventHorizonFX {
  constructor(W, H, accent, isMobile) {
    this.accent = accent;
    this.isMobile = isMobile;
    this.angle = 0;
  }
  draw(ctx, W, H) {
    ctx.clearRect(0, 0, W, H);
    this.angle += 0.018;

    const cx = W / 2;
    const cy = H / 2;
    const r = Math.min(W, H) * (this.isMobile ? 0.22 : 0.28);

    // Accretion disk rings
    const ringCount = this.isMobile ? 12 : 24;
    for (let i = 0; i < ringCount; i++) {
      const rad = r * (1.1 + i * 0.045);
      const alpha = Math.sin((i / ringCount) * Math.PI) * 0.45;
      ctx.save();
      ctx.translate(cx, cy);
      ctx.scale(1.0, 0.38);
      ctx.rotate(this.angle * 0.3 + i * 0.05);

      ctx.beginPath();
      ctx.arc(0, 0, rad, 0, Math.PI * 2);
      ctx.strokeStyle = this.accent + hex2(alpha * 255);
      ctx.lineWidth = 1.2;
      ctx.stroke();
      ctx.restore();
    }

    // Photon sphere
    ctx.beginPath();
    ctx.arc(cx, cy, r * 1.05, 0, Math.PI * 2);
    ctx.strokeStyle = "#FFFFFF";
    ctx.lineWidth = 1.5;
    ctx.shadowColor = this.accent;
    ctx.shadowBlur = 18;
    ctx.stroke();
    ctx.shadowBlur = 0;

    // Black hole shadow
    ctx.beginPath();
    ctx.arc(cx, cy, r, 0, Math.PI * 2);
    ctx.fillStyle = "#010103";
    ctx.fill();
  }
}

// ═══════════════════════════════════════════════════════════════════════════════
// 7. NEURAL BLOOM — Organic computational morphogenesis
// ═══════════════════════════════════════════════════════════════════════════════
class NeuralBloomFX {
  constructor(W, H, accent, isMobile) {
    this.accent = accent;
    this.isMobile = isMobile;
    this.t = 0;
    this.petals = this.isMobile ? 6 : 10;
  }
  draw(ctx, W, H) {
    ctx.clearRect(0, 0, W, H);
    this.t += 0.012;

    const cx = W / 2;
    const cy = H / 2;
    const maxR = Math.min(W, H) * 0.35;

    for (let i = 0; i < this.petals; i++) {
      const baseAngle = (i / this.petals) * Math.PI * 2 + this.t * 0.2;
      const breathe = Math.sin(this.t * 1.5 + i) * 20;
      const r = maxR + breathe;

      const xEnd = cx + Math.cos(baseAngle) * r;
      const yEnd = cy + Math.sin(baseAngle) * r;
      const cAngle = baseAngle + 0.35;
      const cR = r * 0.6;
      const cx1 = cx + Math.cos(cAngle) * cR;
      const cy1 = cy + Math.sin(cAngle) * cR;

      ctx.beginPath();
      ctx.moveTo(cx, cy);
      ctx.quadraticCurveTo(cx1, cy1, xEnd, yEnd);
      ctx.strokeStyle = this.accent + "55";
      ctx.lineWidth = 1.2;
      ctx.stroke();

      ctx.beginPath();
      ctx.arc(xEnd, yEnd, 3.5, 0, Math.PI * 2);
      ctx.fillStyle = "#FFFFFF";
      ctx.shadowColor = this.accent;
      ctx.shadowBlur = 10;
      ctx.fill();
      ctx.shadowBlur = 0;
    }
  }
}

// ═══════════════════════════════════════════════════════════════════════════════
// 8. TEMPORAL ARCHIVE — Layered timelines and chronological memory traces
// ═══════════════════════════════════════════════════════════════════════════════
class TemporalArchiveFX {
  constructor(W, H, accent, isMobile) {
    this.accent = accent;
    this.isMobile = isMobile;
    this.t = 0;
    this.traces = Array.from({ length: this.isMobile ? 12 : 24 }, () => ({
      y: Math.random() * H,
      x: Math.random() * W,
      speed: 0.8 + Math.random() * 2.0,
      code: "T-" + Math.floor(1000 + Math.random() * 9000),
    }));
  }
  draw(ctx, W, H) {
    ctx.clearRect(0, 0, W, H);
    this.t += 0.01;

    // Vertical chronological grid lines
    const vCols = this.isMobile ? 6 : 12;
    ctx.lineWidth = 0.6;
    for (let c = 1; c < vCols; c++) {
      const x = (c / vCols) * W;
      ctx.beginPath();
      ctx.moveTo(x, 0);
      ctx.lineTo(x, H);
      ctx.strokeStyle = this.accent + "12";
      ctx.stroke();
    }

    // Drifting chronological traces
    ctx.font = "9px 'JetBrains Mono', monospace";
    for (const tr of this.traces) {
      tr.x += tr.speed;
      if (tr.x > W + 80) tr.x = -80;

      ctx.fillStyle = this.accent + "50";
      ctx.fillText(tr.code, tr.x, tr.y);

      ctx.beginPath();
      ctx.moveTo(tr.x - 30, tr.y - 3);
      ctx.lineTo(tr.x - 5, tr.y - 3);
      ctx.strokeStyle = this.accent + "30";
      ctx.stroke();
    }
  }
}

// ═══════════════════════════════════════════════════════════════════════════════
// 9. OMNIVERSE VOID — Minimal OLED black with subtle quantum fluctuations
// ═══════════════════════════════════════════════════════════════════════════════
class OmniverseVoidFX {
  constructor(W, H, accent, isMobile) {
    this.accent = accent;
    this.isMobile = isMobile;
    this.t = 0;
    this.sparks = Array.from({ length: this.isMobile ? 18 : 40 }, () => ({
      x: Math.random() * W,
      y: Math.random() * H,
      phase: Math.random() * Math.PI * 2,
      speed: 0.01 + Math.random() * 0.02,
      r: 1.0 + Math.random() * 1.5,
    }));
  }
  draw(ctx, W, H) {
    ctx.clearRect(0, 0, W, H);
    this.t += 0.008;

    for (const sp of this.sparks) {
      sp.phase += sp.speed;
      const alpha = Math.max(0, Math.sin(sp.phase)) * 0.65;
      if (alpha > 0.02) {
        ctx.beginPath();
        ctx.arc(sp.x, sp.y, sp.r, 0, Math.PI * 2);
        ctx.fillStyle = this.accent + hex2(alpha * 255);
        ctx.fill();
      }
    }
  }
}

// ═══════════════════════════════════════════════════════════════════════════════
// 10. CORTEX SINGULARITY — Rotating dual-axis tensor rings & intelligence core
// ═══════════════════════════════════════════════════════════════════════════════
class CortexSingularityFX {
  constructor(W, H, accent, isMobile) {
    this.accent = accent;
    this.isMobile = isMobile;
    this.angle = 0;
  }
  draw(ctx, W, H) {
    ctx.clearRect(0, 0, W, H);
    this.angle += 0.016;

    const cx = W / 2;
    const cy = H / 2;
    const r = Math.min(W, H) * (this.isMobile ? 0.20 : 0.25);

    // Axis 1 Ring
    ctx.save();
    ctx.translate(cx, cy);
    ctx.rotate(this.angle);
    ctx.scale(1.0, 0.45);
    ctx.beginPath();
    ctx.arc(0, 0, r * 1.25, 0, Math.PI * 2);
    ctx.strokeStyle = this.accent + "88";
    ctx.lineWidth = 1.4;
    ctx.stroke();
    ctx.restore();

    // Axis 2 Ring
    ctx.save();
    ctx.translate(cx, cy);
    ctx.rotate(-this.angle * 1.3);
    ctx.scale(0.45, 1.0);
    ctx.beginPath();
    ctx.arc(0, 0, r * 1.25, 0, Math.PI * 2);
    ctx.strokeStyle = "#FFFFFF88";
    ctx.lineWidth = 1.2;
    ctx.stroke();
    ctx.restore();

    // Central Core Pulse
    const pulse = 1 + Math.sin(this.angle * 3) * 0.08;
    const g = ctx.createRadialGradient(cx, cy, 0, cx, cy, r * pulse);
    g.addColorStop(0, "#FFFFFF");
    g.addColorStop(0.35, this.accent + "AA");
    g.addColorStop(1, "transparent");

    ctx.beginPath();
    ctx.arc(cx, cy, r * pulse, 0, Math.PI * 2);
    ctx.fillStyle = g;
    ctx.fill();
  }
}

// ═══════════════════════════════════════════════════════════════════════════════
// LEGACY COMPATIBILITY EFFECTS (Matrix, Circuit, Neural, Radar, Hologram, Plasma)
// ═══════════════════════════════════════════════════════════════════════════════
class MatrixRain {
  constructor(W, H, accent) {
    this.accent = accent;
    this.fs = 13;
    this.reset(W, H);
  }
  reset(W, H) {
    this.cols = Math.ceil(W / this.fs);
    this.drops  = Array.from({ length: this.cols }, () => -(Math.random() * 40));
    this.speeds = Array.from({ length: this.cols }, () => 0.35 + Math.random() * 0.75);
    this.chars  = Array.from({ length: this.cols }, () => CHARS[Math.floor(Math.random() * CHARS.length)]);
    this.bright = Array.from({ length: this.cols }, () => Math.random() < 0.15);
  }
  draw(ctx, W, H) {
    ctx.fillStyle = "rgba(0,0,0,0.055)";
    ctx.fillRect(0, 0, W, H);
    ctx.font = `bold ${this.fs}px 'JetBrains Mono', monospace`;

    for (let i = 0; i < this.cols; i++) {
      if (Math.random() < 0.025) this.chars[i] = CHARS[Math.floor(Math.random() * CHARS.length)];
      const x = i * this.fs;
      const y = this.drops[i] * this.fs;

      if (y >= 0 && y < H) {
        ctx.shadowColor  = this.accent;
        ctx.shadowBlur   = this.bright[i] ? 14 : 6;
        ctx.fillStyle    = this.bright[i] ? "#FFFFFF" : this.accent + "EE";
        ctx.fillText(this.chars[i], x, y);
        ctx.shadowBlur   = 0;
      }

      const trailLen = 14 + Math.floor(Math.random() * 6);
      for (let j = 1; j < trailLen; j++) {
        const ty = y - j * this.fs;
        if (ty < -this.fs || ty > H) continue;
        const alpha = 1 - j / trailLen;
        ctx.fillStyle = this.accent + hex2(alpha * 180);
        ctx.fillText(CHARS[Math.floor(Math.random() * CHARS.length)], x, ty);
      }

      this.drops[i] += this.speeds[i];
      if (this.drops[i] * this.fs > H + 20 && Math.random() > 0.975)
        this.drops[i] = -(5 + Math.random() * 25);
    }
  }
}

class CircuitSparks {
  constructor(W, H, accent) {
    this.accent = accent;
    this.sparks = [];
    this.init(W, H);
  }
  init(W, H) {
    const GX = 14, GY = 8;
    const px = W * 0.04, py = H * 0.08;
    const sx = (W - px * 2) / (GX - 1);
    const sy = (H - py * 2) / (GY - 1);

    this.nodes = [];
    for (let gy = 0; gy < GY; gy++) {
      for (let gx = 0; gx < GX; gx++) {
        this.nodes.push({
          x: px + gx * sx + (Math.random() - 0.5) * sx * 0.28,
          y: py + gy * sy + (Math.random() - 0.5) * sy * 0.28,
          pulse: Math.random() * Math.PI * 2,
          litTimer: 0,
        });
      }
    }
    this.edges = [];
    for (let i = 0; i < this.nodes.length; i++) {
      if (i % GX < GX - 1 && Math.random() < 0.72) this.edges.push([i, i + 1]);
      if (i + GX < this.nodes.length && Math.random() < 0.62) this.edges.push([i, i + GX]);
    }
  }
  spawnSpark() {
    if (this.sparks.length >= 30 || !this.edges.length) return;
    const e = this.edges[Math.floor(Math.random() * this.edges.length)];
    this.sparks.push({ e, p: 0, spd: 0.01 + Math.random() * 0.018 });
  }
  draw(ctx, W, H) {
    ctx.clearRect(0, 0, W, H);
    ctx.lineWidth = 0.7;
    for (const [a, b] of this.edges) {
      const na = this.nodes[a], nb = this.nodes[b];
      ctx.beginPath(); ctx.moveTo(na.x, na.y); ctx.lineTo(nb.x, nb.y);
      ctx.strokeStyle = this.accent + "16"; ctx.stroke();
    }
    if (Math.random() < 0.15) this.spawnSpark();
    this.sparks = this.sparks.filter((s) => {
      const na = this.nodes[s.e[0]], nb = this.nodes[s.e[1]];
      const cx = na.x + (nb.x - na.x) * s.p;
      const cy = na.y + (nb.y - na.y) * s.p;
      ctx.beginPath(); ctx.arc(cx, cy, 3, 0, Math.PI * 2);
      ctx.fillStyle = "#FFFFFF"; ctx.fill();
      s.p += s.spd;
      return s.p < 1;
    });
  }
}

class NeuralPulses {
  constructor(W, H, accent) {
    this.accent = accent;
    this.init(W, H);
  }
  init(W, H) {
    this.nodes = Array.from({ length: 22 }, () => ({
      x: W * 0.08 + Math.random() * W * 0.84,
      y: H * 0.08 + Math.random() * H * 0.84,
      r: 3 + Math.random() * 4,
    }));
  }
  draw(ctx, W, H) {
    ctx.clearRect(0, 0, W, H);
    for (let i = 0; i < this.nodes.length; i++) {
      for (let j = i + 1; j < this.nodes.length; j++) {
        const dx = this.nodes[i].x - this.nodes[j].x;
        const dy = this.nodes[i].y - this.nodes[j].y;
        const d = Math.sqrt(dx * dx + dy * dy);
        if (d < W * 0.22) {
          ctx.beginPath(); ctx.moveTo(this.nodes[i].x, this.nodes[i].y); ctx.lineTo(this.nodes[j].x, this.nodes[j].y);
          ctx.strokeStyle = this.accent + hex2((1 - d / (W * 0.22)) * 50);
          ctx.stroke();
        }
      }
    }
    for (const n of this.nodes) {
      ctx.beginPath(); ctx.arc(n.x, n.y, n.r, 0, Math.PI * 2);
      ctx.fillStyle = this.accent; ctx.fill();
    }
  }
}

class RadarSweep {
  constructor(W, H, accent, isMobile = false) {
    this.accent = accent;
    this.isMobile = isMobile;
    this.angle = 0;
    this.init(W, H);
  }

  init(W, H) {
    const count = this.isMobile ? 6 : 10;
    const maxR = Math.min(W, H) * (this.isMobile ? 0.30 : 0.36);
    this.signals = Array.from({ length: count }, () => ({
      angle: Math.random() * Math.PI * 2,
      radius: maxR * (0.22 + Math.random() * 0.72),
      intensity: 0,
      pulseR: 0,
    }));
  }

  draw(ctx, W, H) {
    ctx.clearRect(0, 0, W, H);
    this.angle = (this.angle + (this.isMobile ? 0.012 : 0.016)) % (Math.PI * 2);

    const cx = W / 2;
    const cy = H / 2;
    const r = Math.min(W, H) * (this.isMobile ? 0.30 : 0.36);

    // 1. Dark Precision Outer Rings
    ctx.beginPath();
    ctx.arc(cx, cy, r, 0, Math.PI * 2);
    ctx.strokeStyle = this.accent + "33";
    ctx.lineWidth = 1.2;
    ctx.stroke();

    ctx.beginPath();
    ctx.arc(cx, cy, r * 0.70, 0, Math.PI * 2);
    ctx.strokeStyle = this.accent + "1D";
    ctx.lineWidth = 0.8;
    ctx.setLineDash([4, 8]);
    ctx.stroke();

    ctx.beginPath();
    ctx.arc(cx, cy, r * 0.42, 0, Math.PI * 2);
    ctx.strokeStyle = this.accent + "18";
    ctx.lineWidth = 0.8;
    ctx.stroke();
    ctx.setLineDash([]);

    // Crosshairs
    ctx.strokeStyle = this.accent + "1A";
    ctx.lineWidth = 0.8;
    ctx.beginPath();
    ctx.moveTo(cx - r * 1.08, cy); ctx.lineTo(cx + r * 1.08, cy);
    ctx.moveTo(cx, cy - r * 1.08); ctx.lineTo(cx, cy + r * 1.08);
    ctx.stroke();

    // 2. Rotating Scan Cone Gradient
    const coneGrad = ctx.createConicGradient(this.angle - Math.PI / 3, cx, cy);
    coneGrad.addColorStop(0, "transparent");
    coneGrad.addColorStop(0.75, this.accent + "04");
    coneGrad.addColorStop(0.92, this.accent + "18");
    coneGrad.addColorStop(1, this.accent + "40");

    ctx.fillStyle = coneGrad;
    ctx.beginPath();
    ctx.arc(cx, cy, r, 0, Math.PI * 2);
    ctx.fill();

    // 3. Rotating Sweep Arm Line
    const sweepX = cx + Math.cos(this.angle) * r;
    const sweepY = cy + Math.sin(this.angle) * r;
    ctx.beginPath();
    ctx.moveTo(cx, cy);
    ctx.lineTo(sweepX, sweepY);
    ctx.strokeStyle = "#FFFFFF";
    ctx.lineWidth = 1.5;
    ctx.shadowColor = this.accent;
    ctx.shadowBlur = 10;
    ctx.stroke();
    ctx.shadowBlur = 0;

    // 4. Signal Detections
    for (const sig of this.signals) {
      const sigX = cx + Math.cos(sig.angle) * sig.radius;
      const sigY = cy + Math.sin(sig.angle) * sig.radius;

      let angleDiff = this.angle - sig.angle;
      if (angleDiff < 0) angleDiff += Math.PI * 2;

      if (angleDiff < 0.12) {
        sig.intensity = 1.0;
        sig.pulseR = 3;
      } else {
        sig.intensity = Math.max(0, sig.intensity - 0.014);
        sig.pulseR += 0.35;
      }

      if (sig.intensity > 0.04) {
        ctx.beginPath();
        ctx.arc(sigX, sigY, 3, 0, Math.PI * 2);
        ctx.fillStyle = "#FF003C";
        ctx.shadowColor = "#FF003C";
        ctx.shadowBlur = 12 * sig.intensity;
        ctx.fill();

        ctx.beginPath();
        ctx.arc(sigX, sigY, sig.pulseR, 0, Math.PI * 2);
        ctx.strokeStyle = `rgba(255, 0, 60, ${(sig.intensity * 0.65).toFixed(2)})`;
        ctx.lineWidth = 0.9;
        ctx.stroke();
        ctx.shadowBlur = 0;
      } else {
        ctx.beginPath();
        ctx.arc(sigX, sigY, 1.5, 0, Math.PI * 2);
        ctx.fillStyle = this.accent + "28";
        ctx.fill();
      }
    }
  }
}

class Hologram {
  constructor(W, H, accent) {
    this.accent = accent;
    this.scanY = 0;
  }
  draw(ctx, W, H) {
    ctx.clearRect(0, 0, W, H);
    this.scanY = (this.scanY + 1.2) % H;
    const g = ctx.createLinearGradient(0, this.scanY - 40, 0, this.scanY + 4);
    g.addColorStop(0, "transparent");
    g.addColorStop(1, this.accent + "22");
    ctx.fillStyle = g; ctx.fillRect(0, this.scanY - 40, W, 44);
  }
}

class PlasmaParticles {
  constructor(W, H, accent) {
    this.accent = accent;
    this.pts = Array.from({ length: 50 }, () => ({
      x: Math.random() * W, y: Math.random() * H,
      vx: (Math.random() - 0.5) * 0.6, vy: (Math.random() - 0.5) * 0.6,
      r: 1.5 + Math.random() * 2,
    }));
  }
  draw(ctx, W, H) {
    ctx.clearRect(0, 0, W, H);
    for (const p of this.pts) {
      p.x += p.vx; p.y += p.vy;
      if (p.x < 0) p.x = W; if (p.x > W) p.x = 0;
      if (p.y < 0) p.y = H; if (p.y > H) p.y = 0;
      ctx.beginPath(); ctx.arc(p.x, p.y, p.r, 0, Math.PI * 2);
      ctx.fillStyle = this.accent + "88"; ctx.fill();
    }
  }
}

// ═══════════════════════════════════════════════════════════════════════════════
// REACT COMPONENT — Adaptive Resolution, Battery/Tab Awareness, Reduced Motion
// ═══════════════════════════════════════════════════════════════════════════════
export default function WallpaperFX({ fxType, accent = "#00F0FF", isMobile = false }) {
  const canvasRef = useRef(null);
  const frameRef  = useRef(null);
  const fxRef     = useRef(null);

  useEffect(() => {
    if (!fxType) return;
    const canvas = canvasRef.current;
    if (!canvas) return;

    // Check motion preference & user setting
    let isMotionAllowed = true;
    try {
      if (window.matchMedia?.("(prefers-reduced-motion: reduce)").matches) {
        isMotionAllowed = false;
      }
      if (localStorage.getItem("omni_wp_motion") === "paused") {
        isMotionAllowed = false;
      }
    } catch {}

    const ctx2d = canvas.getContext("2d");

    function build(W, H) {
      switch (fxType) {
        case "genesis":          return new GenesisFX(W, H, accent, isMobile);
        case "neural-ocean":     return new NeuralOceanFX(W, H, accent, isMobile);
        case "quantum":          return new QuantumHorizonFX(W, H, accent, isMobile);
        case "aurora":           return new DigitalAuroraFX(W, H, accent, isMobile);
        case "city":             return new SentientCityFX(W, H, accent, isMobile);
        case "singularity":      return new EventHorizonFX(W, H, accent, isMobile);
        case "bloom":            return new NeuralBloomFX(W, H, accent, isMobile);
        case "archive":          return new TemporalArchiveFX(W, H, accent, isMobile);
        case "void":             return new OmniverseVoidFX(W, H, accent, isMobile);
        case "singularity-core": return new CortexSingularityFX(W, H, accent, isMobile);
        // Legacy compatibility
        case "matrix":           return new MatrixRain(W, H, accent);
        case "circuit":          return new CircuitSparks(W, H, accent);
        case "neural":           return new NeuralPulses(W, H, accent);
        case "radar":            return new RadarSweep(W, H, accent, isMobile);
        case "hologram":         return new Hologram(W, H, accent);
        case "plasma":           return new PlasmaParticles(W, H, accent);
        default:                 return new GenesisFX(W, H, accent, isMobile);
      }
    }

    function resize() {
      const q = (() => {
        try { return localStorage.getItem("omni_wp_quality") || "auto"; } catch { return "auto"; }
      })();

      let dpr = 1.0;
      if (q === "high") {
        dpr = Math.min(window.devicePixelRatio || 1, 2.0);
      } else if (q === "medium") {
        dpr = 1.0;
      } else if (q === "low" || isMobile) {
        dpr = 0.75;
      } else {
        // Auto
        dpr = isMobile ? 0.8 : Math.min(window.devicePixelRatio || 1, 1.5);
      }

      const clientW = window.innerWidth;
      const clientH = window.innerHeight;
      canvas.width  = Math.floor(clientW * dpr);
      canvas.height = Math.floor(clientH * dpr);

      // Normalize coordinate system so draw calls work naturally in client dimensions
      ctx2d.setTransform(dpr, 0, 0, dpr, 0, 0);

      fxRef.current = build(clientW, clientH);

      // If reduced motion, draw once immediately
      if (!isMotionAllowed && fxRef.current) {
        fxRef.current.draw(ctx2d, clientW, clientH);
      }
    }

    resize();

    const ro = typeof ResizeObserver !== "undefined"
      ? new ResizeObserver(resize)
      : null;
    if (ro) ro.observe(document.documentElement);
    else window.addEventListener("resize", resize, { passive: true });

    let isTabVisible = !document.hidden;
    const handleVisibility = () => {
      isTabVisible = !document.hidden;
      if (isTabVisible && isMotionAllowed && !frameRef.current) {
        loop();
      }
    };
    document.addEventListener("visibilitychange", handleVisibility);

    const handleSettings = (e) => {
      if (e?.detail?.motion) {
        isMotionAllowed = e.detail.motion !== "paused";
        if (isMotionAllowed && !frameRef.current) {
          loop();
        }
      }
      if (e?.detail?.quality) {
        resize();
      }
    };
    window.addEventListener("omni:wallpaper-settings-changed", handleSettings);

    function loop() {
      if (!isTabVisible || !isMotionAllowed) {
        frameRef.current = null;
        return;
      }
      if (fxRef.current && canvas.width > 0) {
        fxRef.current.draw(ctx2d, window.innerWidth, window.innerHeight);
      }
      frameRef.current = requestAnimationFrame(loop);
    }

    if (isMotionAllowed) {
      frameRef.current = requestAnimationFrame(loop);
    }

    return () => {
      if (frameRef.current) cancelAnimationFrame(frameRef.current);
      if (ro) ro.disconnect(); else window.removeEventListener("resize", resize);
      document.removeEventListener("visibilitychange", handleVisibility);
      window.removeEventListener("omni:wallpaper-settings-changed", handleSettings);
    };
  }, [fxType, accent, isMobile]);

  if (!fxType) return null;

  return (
    <canvas
      ref={canvasRef}
      id="wallpaper-fx-canvas"
      data-testid="wallpaper-fx-canvas"
      style={{
        position: "absolute",
        inset: 0,
        width: "100%",
        height: "100%",
        pointerEvents: "none",
        zIndex: 1,
        opacity: 0.88,
      }}
    />
  );
}
