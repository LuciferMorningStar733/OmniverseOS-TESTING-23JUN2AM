// WallpaperFX.js — Canvas-based living wallpaper animations for OmniverseOS
// Six distinct effects: matrix | circuit | neural | radar | hologram | plasma

import React, { useEffect, useRef } from "react";

const CHARS = "01アイウエオカキクケコサシスセソタチツテトナニヌネノ日ABCDEFabcdef<>{}[]!@#$%^&*";
const HEX   = "0123456789ABCDEF";

// ── hex() helper ──────────────────────────────────────────────────────────────
function hex2(n) { return Math.floor(Math.max(0, Math.min(255, n))).toString(16).padStart(2, "0"); }

// ═══════════════════════════════════════════════════════════════════════════════
// EFFECT: MATRIX RAIN
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

      // Leading glyph — pure white with accent glow
      if (y >= 0 && y < H) {
        ctx.shadowColor  = this.accent;
        ctx.shadowBlur   = this.bright[i] ? 14 : 6;
        ctx.fillStyle    = this.bright[i] ? "#FFFFFF" : this.accent + "EE";
        ctx.fillText(this.chars[i], x, y);
        ctx.shadowBlur   = 0;
      }

      // Trail — fading accent color
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

// ═══════════════════════════════════════════════════════════════════════════════
// EFFECT: CIRCUIT SPARKS
// ═══════════════════════════════════════════════════════════════════════════════
class CircuitSparks {
  constructor(W, H, accent) {
    this.accent = accent;
    this.sparks = [];
    this.glitch = 0;
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
          lit: false,
          litTimer: 0,
        });
      }
    }
    this.edges = [];
    for (let i = 0; i < this.nodes.length; i++) {
      if (i % GX < GX - 1 && Math.random() < 0.72) this.edges.push([i, i + 1]);
      if (i + GX < this.nodes.length && Math.random() < 0.62) this.edges.push([i, i + GX]);
      if (i % GX < GX - 1 && i + GX + 1 < this.nodes.length && Math.random() < 0.18)
        this.edges.push([i, i + GX + 1]);
    }
  }
  spawnSpark() {
    if (this.sparks.length >= 40 || !this.edges.length) return;
    const e = this.edges[Math.floor(Math.random() * this.edges.length)];
    this.sparks.push({ e, p: 0, spd: 0.007 + Math.random() * 0.016, trail: [] });
  }
  draw(ctx, W, H) {
    ctx.clearRect(0, 0, W, H);

    // Dim base grid lines
    ctx.lineWidth = 0.7;
    for (const [a, b] of this.edges) {
      const na = this.nodes[a], nb = this.nodes[b];
      ctx.beginPath(); ctx.moveTo(na.x, na.y); ctx.lineTo(nb.x, nb.y);
      ctx.strokeStyle = this.accent + "14"; ctx.stroke();
    }

    // Nodes
    for (const n of this.nodes) {
      n.pulse += 0.028;
      if (n.litTimer > 0) n.litTimer -= 0.03;
      const r = 2.2 + Math.sin(n.pulse) * 0.8;
      ctx.beginPath(); ctx.arc(n.x, n.y, r, 0, Math.PI * 2);
      const alpha = n.litTimer > 0 ? 0.9 : 0.22;
      ctx.fillStyle = this.accent + hex2(alpha * 255);
      if (n.litTimer > 0) { ctx.shadowColor = this.accent; ctx.shadowBlur = 10; }
      ctx.fill(); ctx.shadowBlur = 0;
    }

    // Spawn
    if (Math.random() < 0.14) this.spawnSpark();

    // Draw sparks
    this.sparks = this.sparks.filter((s) => {
      const na = this.nodes[s.e[0]], nb = this.nodes[s.e[1]];
      s.trail.push({ x: na.x + (nb.x - na.x) * s.p, y: na.y + (nb.y - na.y) * s.p });
      if (s.trail.length > 12) s.trail.shift();
      const cx = na.x + (nb.x - na.x) * s.p;
      const cy = na.y + (nb.y - na.y) * s.p;

      // Lit edge behind spark
      ctx.beginPath(); ctx.moveTo(na.x, na.y); ctx.lineTo(cx, cy);
      ctx.strokeStyle = this.accent + "88"; ctx.lineWidth = 1.4; ctx.stroke();

      // Trail fade
      for (let i = 0; i < s.trail.length - 1; i++) {
        const alpha = (i / s.trail.length) * 0.55;
        ctx.beginPath(); ctx.moveTo(s.trail[i].x, s.trail[i].y); ctx.lineTo(s.trail[i+1].x, s.trail[i+1].y);
        ctx.strokeStyle = this.accent + hex2(alpha * 255); ctx.lineWidth = 1; ctx.stroke();
      }

      // Spark head glow
      const g = ctx.createRadialGradient(cx, cy, 0, cx, cy, 10);
      g.addColorStop(0, this.accent + "FF"); g.addColorStop(0.5, this.accent + "60"); g.addColorStop(1, "transparent");
      ctx.beginPath(); ctx.arc(cx, cy, 10, 0, Math.PI * 2); ctx.fillStyle = g; ctx.fill();

      s.p += s.spd;
      if (s.p >= 1) { const n = this.nodes[s.e[1]]; n.lit = true; n.litTimer = 1.0; return false; }
      return true;
    });

    // Occasional glitch bar
    if (Math.random() < 0.018) {
      try {
        const gy = Math.random() * H; const gh = 2 + Math.random() * 6;
        const d = ctx.getImageData(0, gy, W, gh);
        ctx.putImageData(d, (Math.random() - 0.5) * 36, gy);
      } catch {}
    }
  }
}

// ═══════════════════════════════════════════════════════════════════════════════
// EFFECT: NEURAL PULSES
// ═══════════════════════════════════════════════════════════════════════════════
class NeuralPulses {
  constructor(W, H, accent) {
    this.accent = accent;
    this.pulses = [];
    this.t = 0;
    this.init(W, H);
  }
  init(W, H) {
    const N = 26;
    this.nodes = Array.from({ length: N }, () => ({
      x: W * 0.06 + Math.random() * W * 0.88,
      y: H * 0.08 + Math.random() * H * 0.84,
      r: 3.5 + Math.random() * 4.5,
      phase: Math.random() * Math.PI * 2,
      speed: 0.018 + Math.random() * 0.03,
      firing: false, fire: 0,
    }));
    this.links = [];
    const N2 = this.nodes.length;
    for (let i = 0; i < N2; i++) {
      for (let j = i + 1; j < N2; j++) {
        const dx = this.nodes[i].x - this.nodes[j].x;
        const dy = this.nodes[i].y - this.nodes[j].y;
        const d  = Math.sqrt(dx * dx + dy * dy);
        if (d < W * 0.30 && Math.random() < 0.52) this.links.push([i, j, d]);
      }
    }
  }
  fire(i) {
    const n = this.nodes[i]; if (n.firing) return;
    n.firing = true; n.fire = 1.0;
    for (const [a, b] of this.links) {
      if (a === i || b === i) {
        const tgt = a === i ? b : a;
        const delay = 250 + Math.random() * 450;
        setTimeout(() => { if (this.nodes[tgt]) this.fire(tgt); }, delay);
        this.pulses.push({ from: i, to: tgt, p: 0, spd: 0.004 + Math.random() * 0.009 });
      }
    }
  }
  draw(ctx, W, H) {
    ctx.clearRect(0, 0, W, H);
    this.t += 0.016;
    if (Math.random() < 0.007) this.fire(Math.floor(Math.random() * this.nodes.length));

    // Links
    for (const [a, b, d] of this.links) {
      const na = this.nodes[a], nb = this.nodes[b];
      const alpha = Math.max(0.04, 0.22 - d / (W * 1.8));
      ctx.beginPath(); ctx.moveTo(na.x, na.y); ctx.lineTo(nb.x, nb.y);
      ctx.strokeStyle = this.accent + hex2(alpha * 255); ctx.lineWidth = 0.55; ctx.stroke();
    }

    // Pulses
    this.pulses = this.pulses.filter((p) => {
      const na = this.nodes[p.from], nb = this.nodes[p.to]; if (!na || !nb) return false;
      const px = na.x + (nb.x - na.x) * p.p;
      const py = na.y + (nb.y - na.y) * p.p;
      ctx.beginPath(); ctx.arc(px, py, 4.5, 0, Math.PI * 2);
      ctx.fillStyle = this.accent; ctx.shadowColor = this.accent; ctx.shadowBlur = 14;
      ctx.fill(); ctx.shadowBlur = 0;
      // Lit edge
      ctx.beginPath(); ctx.moveTo(na.x, na.y); ctx.lineTo(px, py);
      ctx.strokeStyle = this.accent + "55"; ctx.lineWidth = 1; ctx.stroke();
      p.p += p.spd;
      return p.p < 1;
    });

    // Nodes
    for (const n of this.nodes) {
      n.phase += n.speed;
      if (n.firing) { n.fire -= 0.022; if (n.fire <= 0) n.firing = false; }
      const scale = n.firing ? 1 + n.fire * 2.2 : 1;
      const r = n.r * scale;
      const pulse = Math.sin(n.phase) * 0.5 + 0.5;

      if (n.firing || pulse > 0.75) {
        const gr = ctx.createRadialGradient(n.x, n.y, 0, n.x, n.y, r * 4.5);
        gr.addColorStop(0, this.accent + hex2((n.firing ? 0.7 : 0.35) * 255));
        gr.addColorStop(1, "transparent");
        ctx.beginPath(); ctx.arc(n.x, n.y, r * 4.5, 0, Math.PI * 2); ctx.fillStyle = gr; ctx.fill();
      }
      ctx.beginPath(); ctx.arc(n.x, n.y, r, 0, Math.PI * 2);
      ctx.fillStyle = n.firing ? "#FFFFFF" : this.accent + hex2((0.55 + pulse * 0.45) * 255);
      ctx.fill();
    }
  }
}

// ═══════════════════════════════════════════════════════════════════════════════
// EFFECT: RADAR SWEEP
// ═══════════════════════════════════════════════════════════════════════════════
class RadarSweep {
  constructor(W, H, accent) {
    this.accent = accent;
    this.angle = 0;
    this.init(W, H);
  }
  init(W, H) {
    const cx = W / 2, cy = H / 2, r = Math.min(W, H) * 0.38;
    this.cx = cx; this.cy = cy; this.r = r;
    this.blips = Array.from({ length: 9 }, () => {
      const a = Math.random() * Math.PI * 2, d = 0.12 + Math.random() * 0.88;
      return { x: cx + Math.cos(a) * r * d, y: cy + Math.sin(a) * r * d, life: 0, sz: 1.5 + Math.random() * 2 };
    });
    this.hud = [
      { x: W * 0.03, y: H * 0.07,  lines: ["SYSTEM ONLINE", "CORTEX v3.8", "AI CORE: ACTIVE"] },
      { x: W * 0.03, y: H * 0.86,  lines: ["SECTOR: Ω-7", "LAT 31.2°N", "LON 121.5°E"] },
      { x: W * 0.74, y: H * 0.07,  lines: ["THREATS: 0", "UPTIME: 99.97%", "ENC: AES-4096"] },
      { x: W * 0.74, y: H * 0.86,  lines: ["SIGNAL: ████ 100%", "FREQ: 2.4GHz", "NET: SECURE"] },
    ];
    this.dataStream = Array.from({ length: 6 }, (_, i) => ({
      y: H * (0.15 + i * 0.12), val: Array.from({ length: 24 }, () => HEX[Math.floor(Math.random() * 16)]).join(" "),
      timer: Math.random() * 60,
    }));
  }
  draw(ctx, W, H, t) {
    ctx.clearRect(0, 0, W, H);
    const { cx, cy, r } = this;
    this.angle += 0.011;

    // Range rings
    ctx.setLineDash([4, 6]);
    for (let i = 1; i <= 4; i++) {
      ctx.beginPath(); ctx.arc(cx, cy, r * i / 4, 0, Math.PI * 2);
      ctx.strokeStyle = this.accent + hex2(i === 4 ? 50 : 28); ctx.lineWidth = 0.9; ctx.stroke();
    }
    ctx.setLineDash([]);

    // Cross-hairs
    ctx.strokeStyle = this.accent + "1A"; ctx.lineWidth = 0.6;
    ctx.beginPath(); ctx.moveTo(cx - r, cy); ctx.lineTo(cx + r, cy); ctx.stroke();
    ctx.beginPath(); ctx.moveTo(cx, cy - r); ctx.lineTo(cx, cy + r); ctx.stroke();

    // Sweep fill (cone trail)
    const sweepLen = Math.PI / 2.2;
    for (let step = 0; step < 64; step++) {
      const a = this.angle - (step / 64) * sweepLen;
      const alpha = (1 - step / 64) * 0.42;
      ctx.beginPath(); ctx.moveTo(cx, cy);
      ctx.arc(cx, cy, r, a, a + 0.06); ctx.closePath();
      ctx.fillStyle = this.accent + hex2(alpha * 255); ctx.fill();
    }

    // Sweep arm
    ctx.beginPath(); ctx.moveTo(cx, cy);
    ctx.lineTo(cx + Math.cos(this.angle) * r, cy + Math.sin(this.angle) * r);
    ctx.strokeStyle = this.accent; ctx.lineWidth = 1.6;
    ctx.shadowColor = this.accent; ctx.shadowBlur = 16; ctx.stroke(); ctx.shadowBlur = 0;

    // Blips
    for (const b of this.blips) {
      const ba = Math.atan2(b.y - cy, b.x - cx);
      const diff = ((this.angle - ba) % (Math.PI * 2) + Math.PI * 2) % (Math.PI * 2);
      if (diff < 0.09) b.life = 1;
      if (b.life > 0) {
        b.life -= 0.004;
        ctx.beginPath(); ctx.arc(b.x, b.y, b.sz + (1 - b.life) * 8, 0, Math.PI * 2);
        ctx.fillStyle = this.accent + hex2(b.life * 180); ctx.fill();
        ctx.beginPath(); ctx.arc(b.x, b.y, b.sz, 0, Math.PI * 2);
        ctx.fillStyle = "#FFFFFF"; ctx.fill();
      }
    }

    // HUD text
    ctx.font = "9px 'JetBrains Mono', monospace";
    ctx.fillStyle = this.accent + "65";
    for (const h of this.hud) h.lines.forEach((l, i) => ctx.fillText(l, h.x, h.y + i * 14));

    // Data stream lines (random hex)
    ctx.font = "8px 'JetBrains Mono', monospace";
    for (const ds of this.dataStream) {
      ds.timer++;
      if (ds.timer % 18 === 0) ds.val = Array.from({ length: 24 }, () => HEX[Math.floor(Math.random() * 16)]).join(" ");
      ctx.fillStyle = this.accent + "30";
      ctx.fillText(ds.val, W * 0.03, ds.y);
    }

    // Full-width scan line
    const sy = (t * 0.45 % H);
    const sg = ctx.createLinearGradient(0, sy - 24, 0, sy + 4);
    sg.addColorStop(0, "transparent"); sg.addColorStop(1, this.accent + "18");
    ctx.fillStyle = sg; ctx.fillRect(0, sy - 24, W, 28);
  }
}

// ═══════════════════════════════════════════════════════════════════════════════
// EFFECT: HOLOGRAM
// ═══════════════════════════════════════════════════════════════════════════════
class Hologram {
  constructor(W, H, accent) {
    this.accent = accent;
    this.scanY = 0;
    this.dataLines = Array.from({ length: 28 }, () => ({
      x: Math.random() * W * 0.78 + W * 0.11,
      y: Math.random() * H,
      spd: 0.4 + Math.random() * 1.8,
      txt: Array.from({ length: 12 }, () => HEX[Math.floor(Math.random() * 16)]).join(""),
      life: Math.random(),
    }));
    this.cornerSize = 28;
    this.init(W, H);
  }
  init(W, H) {
    this.W = W; this.H = H;
    this.corners = [[22, 22, 1, 1], [W - 22, 22, -1, 1], [22, H - 22, 1, -1], [W - 22, H - 22, -1, -1]];
  }
  draw(ctx, W, H, t) {
    ctx.clearRect(0, 0, W, H);

    // CRT scanline overlay (every 4px)
    for (let y = 0; y < H; y += 4) {
      ctx.fillStyle = "rgba(0,0,0,0.028)"; ctx.fillRect(0, y, W, 2);
    }

    // Moving horizontal scan beam
    this.scanY = (this.scanY + 0.9) % H;
    const sg = ctx.createLinearGradient(0, this.scanY - 50, 0, this.scanY + 6);
    sg.addColorStop(0, "transparent");
    sg.addColorStop(0.65, this.accent + "0E");
    sg.addColorStop(1, this.accent + "2A");
    ctx.fillStyle = sg; ctx.fillRect(0, this.scanY - 50, W, 56);

    // Floating data lines
    ctx.font = "9px 'JetBrains Mono', monospace";
    for (const dl of this.dataLines) {
      dl.y -= dl.spd; dl.life += 0.006;
      if (dl.y < -16 || dl.life > 1) {
        dl.y = H + 16; dl.x = Math.random() * W * 0.78 + W * 0.11;
        dl.txt = Array.from({ length: 14 }, () => HEX[Math.floor(Math.random() * 16)]).join("");
        dl.life = 0;
      }
      const alpha = Math.sin(dl.life * Math.PI);
      ctx.fillStyle = this.accent + hex2(alpha * 145);
      ctx.fillText(dl.txt, dl.x, dl.y);
    }

    // Glitch bars
    if (Math.random() < 0.022) {
      try {
        const gy = Math.random() * H, gh = 2 + Math.random() * 9;
        const d = ctx.getImageData(0, gy, W, gh);
        const shift = (Math.random() - 0.5) * 44;
        ctx.putImageData(d, shift, gy);
        // RGB chromatic aberration on strong glitches
        if (Math.random() < 0.4) {
          const d2 = ctx.getImageData(0, gy, W, gh);
          for (let k = 0; k < d2.data.length; k += 4) {
            d2.data[k]   = Math.min(255, d2.data[k] + 60);
            d2.data[k+2] = Math.max(0,   d2.data[k+2] - 60);
          }
          ctx.putImageData(d2, shift + 5, gy);
        }
      } catch {}
    }

    // Corner bracket HUD frames
    ctx.lineWidth = 2; ctx.strokeStyle = this.accent + "55";
    for (const [x, y, sx, sy] of this.corners) {
      ctx.beginPath();
      ctx.moveTo(x + sx * this.cornerSize, y);
      ctx.lineTo(x, y); ctx.lineTo(x, y + sy * this.cornerSize);
      ctx.stroke();
    }
    // Corner dots
    for (const [x, y] of this.corners) {
      ctx.beginPath(); ctx.arc(x, y, 2.5, 0, Math.PI * 2);
      ctx.fillStyle = this.accent + "90"; ctx.fill();
    }

    // Full scan line
    const sy2 = (t * 0.38 % H);
    const sg2 = ctx.createLinearGradient(0, sy2 - 20, 0, sy2 + 3);
    sg2.addColorStop(0, "transparent"); sg2.addColorStop(1, this.accent + "16");
    ctx.fillStyle = sg2; ctx.fillRect(0, sy2 - 20, W, 23);
  }
}

// ═══════════════════════════════════════════════════════════════════════════════
// EFFECT: PLASMA PARTICLES
// ═══════════════════════════════════════════════════════════════════════════════
class PlasmaParticles {
  constructor(W, H, accent) {
    this.accent = accent;
    this.t = 0;
    const N = 130;
    this.pts = Array.from({ length: N }, () => ({
      x: Math.random() * W, y: Math.random() * H,
      vx: (Math.random() - 0.5) * 0.55,
      vy: (Math.random() - 0.5) * 0.55,
      r: 1.4 + Math.random() * 2.6,
      phase: Math.random() * Math.PI * 2,
    }));
  }
  draw(ctx, W, H) {
    ctx.clearRect(0, 0, W, H);
    this.t += 0.011;

    for (const p of this.pts) {
      const nx = Math.sin(p.x * 0.0035 + this.t * 0.28) * 0.22;
      const ny = Math.cos(p.y * 0.0035 + this.t * 0.22) * 0.22;
      p.vx = p.vx * 0.985 + nx; p.vy = p.vy * 0.985 + ny;
      p.x += p.vx; p.y += p.vy;
      if (p.x < -12) p.x = W + 12; if (p.x > W + 12) p.x = -12;
      if (p.y < -12) p.y = H + 12; if (p.y > H + 12) p.y = -12;
    }

    const CONNECT = 88;
    for (let i = 0; i < this.pts.length; i++) {
      for (let j = i + 1; j < this.pts.length; j++) {
        const pa = this.pts[i], pb = this.pts[j];
        const dx = pa.x - pb.x, dy = pa.y - pb.y;
        const d = Math.sqrt(dx * dx + dy * dy);
        if (d < CONNECT) {
          ctx.beginPath(); ctx.moveTo(pa.x, pa.y); ctx.lineTo(pb.x, pb.y);
          ctx.strokeStyle = this.accent + hex2((1 - d / CONNECT) * 0.38 * 255);
          ctx.lineWidth = 0.45; ctx.stroke();
        }
      }
    }

    for (const p of this.pts) {
      p.phase += 0.018;
      const pulse = Math.sin(p.phase) * 0.5 + 0.5;
      ctx.beginPath(); ctx.arc(p.x, p.y, p.r * (0.7 + pulse * 0.55), 0, Math.PI * 2);
      ctx.fillStyle = this.accent + hex2((0.45 + pulse * 0.55) * 168);
      ctx.shadowColor = this.accent; ctx.shadowBlur = pulse * 7;
      ctx.fill(); ctx.shadowBlur = 0;
    }
  }
}

// ═══════════════════════════════════════════════════════════════════════════════
// REACT COMPONENT
// ═══════════════════════════════════════════════════════════════════════════════
export default function WallpaperFX({ fxType, accent = "#00F0FF" }) {
  const canvasRef = useRef(null);
  const frameRef  = useRef(null);
  const fxRef     = useRef(null);

  useEffect(() => {
    if (!fxType) return;
    const canvas = canvasRef.current;
    if (!canvas) return;
    if (window.matchMedia?.("(prefers-reduced-motion: reduce)").matches) return;

    const ctx2d = canvas.getContext("2d");

    function build(W, H) {
      switch (fxType) {
        case "matrix":   return new MatrixRain(W, H, accent);
        case "circuit":  return new CircuitSparks(W, H, accent);
        case "neural":   return new NeuralPulses(W, H, accent);
        case "radar":    return new RadarSweep(W, H, accent);
        case "hologram": return new Hologram(W, H, accent);
        case "plasma":   return new PlasmaParticles(W, H, accent);
        default:         return null;
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
        fxRef.current.draw(ctx2d, canvas.width, canvas.height, tick);
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
        opacity: 0.82,
      }}
    />
  );
}
