/**
 * NeuralWallpaper.js
 * Living AI environment: neural network + particles + aurora pulses.
 * Reactive to: time of day, touch, weather (via localStorage cache),
 * battery level, and charging state — all detected internally.
 */

import React, { useEffect, useRef, useMemo, useState, useCallback } from "react";

// ─── Time-of-day palette ──────────────────────────────────────────────────────
function getBaseColors(hour) {
  if (hour >= 5  && hour < 8)  return ["#FF8C42", "#FF4F00", "#FFB347"]; // dawn
  if (hour >= 8  && hour < 12) return ["#00F0FF", "#0077FF", "#00FFA3"]; // morning
  if (hour >= 12 && hour < 17) return ["#A78BFA", "#7C3AED", "#00F0FF"]; // afternoon
  if (hour >= 17 && hour < 21) return ["#F59E0B", "#FB923C", "#FFDE59"]; // evening
  return                               ["#4F46E5", "#818CF8", "#2DD4BF"]; // night
}

// ─── Weather-based overlay color ─────────────────────────────────────────────
function getWeatherOverlay(code) {
  if (code == null) return null;
  if (code >= 95) return "#A78BFA"; // thunderstorm — purple/electric
  if (code >= 71) return "#BAE6FD"; // snow — ice blue
  if (code >= 61) return "#0EA5E9"; // rain — deep blue
  if (code >= 45) return "#94A3B8"; // fog  — grey
  return null;
}

// ─── Self-contained battery hook ──────────────────────────────────────────────
function useBattery() {
  const [bat, setBat] = useState(null);
  useEffect(() => {
    let mounted = true; let mgr = null;
    const update = () => { if (mounted && mgr) setBat({ level: Math.round(mgr.level * 100), charging: mgr.charging }); };
    if (navigator.getBattery) {
      navigator.getBattery().then((b) => {
        if (!mounted) return;
        mgr = b; update();
        b.addEventListener("levelchange",    update);
        b.addEventListener("chargingchange", update);
      }).catch(() => {});
    }
    return () => {
      mounted = false;
      if (mgr) { mgr.removeEventListener("levelchange", update); mgr.removeEventListener("chargingchange", update); }
    };
  }, []);
  return bat;
}

// ─── Read weather from localStorage cache (populated by MobileHomeScreen) ────
function useWeatherCode() {
  const [code, setCode] = useState(() => {
    try { return JSON.parse(localStorage.getItem("omni_wx_v3") || "null")?.code ?? null; } catch { return null; }
  });
  useEffect(() => {
    // Re-read every 2 minutes in case it was fetched by another component
    const id = setInterval(() => {
      try { setCode(JSON.parse(localStorage.getItem("omni_wx_v3") || "null")?.code ?? null); } catch {}
    }, 120_000);
    return () => clearInterval(id);
  }, []);
  return code;
}

// ─── Neural network simulation ───────────────────────────────────────────────
const BASE_NODE_COUNT     = 42;
const BASE_PARTICLE_COUNT = 60;

class NeuralNetwork {
  constructor(W, H, colors, weatherCode, battery) {
    this.W = W;
    this.H = H;
    this.colors = colors;
    this.weatherCode = weatherCode;
    this.battery = battery;          // { level, charging } | null
    this.mouse = { x: W / 2, y: H / 2, active: false };
    this.time = 0;
    this.chargeBolts = [];           // lightning bolts when charging
    this.nodes     = this.createNodes();
    this.particles = this.createParticles();
    this.pulses    = [];
  }

  // Extra nodes / activity during storms
  get nodeCount()     { return this.weatherCode != null && this.weatherCode >= 95 ? BASE_NODE_COUNT + 14 : BASE_NODE_COUNT; }
  get particleCount() { return BASE_PARTICLE_COUNT; }

  createNodes() {
    const N = this.nodeCount;
    return Array.from({ length: N }, () => ({
      x:        Math.random() * this.W,
      y:        Math.random() * this.H,
      vx:       (Math.random() - 0.5) * 0.25,
      vy:       (Math.random() - 0.5) * 0.25,
      r:        1.5 + Math.random() * 2,
      pulse:    Math.random() * Math.PI * 2,
      pSpeed:   0.018 + Math.random() * 0.022,
      colorIdx: Math.floor(Math.random() * 3),
      brightness: 0.4 + Math.random() * 0.6,
    }));
  }

  createParticles() {
    const isRain  = this.weatherCode != null && this.weatherCode >= 61 && this.weatherCode < 71;
    const isSnow  = this.weatherCode != null && this.weatherCode >= 71 && this.weatherCode < 80;
    return Array.from({ length: this.particleCount }, () => {
      const p = {
        x: Math.random() * this.W,
        y: Math.random() * this.H,
        vx: (Math.random() - 0.5) * 0.5,
        vy: (Math.random() - 0.5) * 0.5,
        r: 0.5 + Math.random() * 1.2,
        life: Math.random(),
        decay: 0.002 + Math.random() * 0.003,
      };
      if (isRain) {
        // Rain particles fall downward with slight diagonal drift
        p.vx =  (Math.random() - 0.5) * 0.3;
        p.vy =  0.6 + Math.random() * 0.8;
        p.r  =  0.3 + Math.random() * 0.6;
      } else if (isSnow) {
        // Snow particles: slow, gentle drift
        p.vx = (Math.random() - 0.5) * 0.2;
        p.vy = 0.15 + Math.random() * 0.25;
        p.r  = 0.8 + Math.random() * 1.6;
      }
      return p;
    });
  }

  resize(W, H) { this.W = W; this.H = H; }

  setMouse(x, y, active) { this.mouse = { x, y, active }; }

  spawnPulse(x, y) {
    this.pulses.push({ x, y, r: 0, maxR: 80 + Math.random() * 60, alpha: 0.6, speed: 2 + Math.random() * 2 });
  }

  // Spawn an upward-shooting charge bolt (visible when charging)
  spawnChargeBolt() {
    const x = Math.random() * this.W;
    this.chargeBolts.push({
      x,
      y: this.H + 10,
      points: this.generateBoltPoints(x, this.H),
      alpha: 0.8 + Math.random() * 0.2,
      speed: 8 + Math.random() * 6,
      life: 1.0,
    });
  }

  generateBoltPoints(startX, startY) {
    const points = [{ x: startX, y: startY }];
    let cx = startX;
    let cy = startY;
    const segments = 6 + Math.floor(Math.random() * 4);
    for (let i = 0; i < segments; i++) {
      cx += (Math.random() - 0.5) * 28;
      cy -= (this.H / segments) * (0.8 + Math.random() * 0.4);
      points.push({ x: Math.max(0, Math.min(this.W, cx)), y: cy });
    }
    return points;
  }

  update() {
    this.time += 0.012;
    const { W, H, mouse } = this;

    // Speed multiplier based on weather (storm = faster) and battery (low = slower)
    const isStorm  = this.weatherCode != null && this.weatherCode >= 95;
    const isLowBat = this.battery && this.battery.level <= 20 && !this.battery.charging;
    const speedMul = isStorm ? 1.5 : isLowBat ? 0.55 : 1.0;

    for (const n of this.nodes) {
      n.pulse += n.pSpeed * speedMul;

      if (mouse.active) {
        const dx = n.x - mouse.x, dy = n.y - mouse.y;
        const dist = Math.sqrt(dx * dx + dy * dy);
        if (dist < 120 && dist > 0) {
          const force = (120 - dist) / 120 * 0.08;
          n.vx += (dx / dist) * force;
          n.vy += (dy / dist) * force;
        }
      }

      n.x  += n.vx * speedMul;
      n.y  += n.vy * speedMul;
      n.vx *= 0.98;
      n.vy *= 0.98;

      if (n.x < 0) { n.x = 0; n.vx = Math.abs(n.vx); }
      if (n.x > W) { n.x = W; n.vx = -Math.abs(n.vx); }
      if (n.y < 0) { n.y = 0; n.vy = Math.abs(n.vy); }
      if (n.y > H) { n.y = H; n.vy = -Math.abs(n.vy); }
    }

    const isRain = this.weatherCode != null && this.weatherCode >= 61 && this.weatherCode < 71;
    const isSnow = this.weatherCode != null && this.weatherCode >= 71 && this.weatherCode < 80;

    for (const p of this.particles) {
      p.x    += p.vx;
      p.y    += p.vy;
      p.life -= p.decay;
      const outOfBounds = p.x < -4 || p.x > W + 4 || p.y < -4 || p.y > H + 8;
      if (p.life <= 0 || outOfBounds) {
        // Respawn at top for rain/snow, random for normal
        p.x = Math.random() * W;
        p.y = (isRain || isSnow) ? -4 : Math.random() * H;
        p.vx = (Math.random() - 0.5) * (isRain ? 0.3 : isSnow ? 0.2 : 0.5);
        p.vy = isRain ? 0.6 + Math.random() * 0.8 : isSnow ? 0.15 + Math.random() * 0.25 : (Math.random() - 0.5) * 0.5;
        p.life = 0.7 + Math.random() * 0.3;
      }
    }

    for (const pu of this.pulses) {
      pu.r    += pu.speed;
      pu.alpha *= 0.94;
    }
    this.pulses = this.pulses.filter((pu) => pu.alpha > 0.01 && pu.r < pu.maxR);

    // Charge bolt lifecycle
    for (const bolt of this.chargeBolts) {
      bolt.life -= 0.045;
      bolt.alpha = bolt.life * 0.9;
    }
    this.chargeBolts = this.chargeBolts.filter((b) => b.life > 0);
  }

  draw(ctx) {
    const { W, H, nodes, particles, pulses, colors, time } = this;

    // Dim the background more when battery is low (save power feel)
    const isLowBat = this.battery && this.battery.level <= 20 && !this.battery.charging;
    ctx.fillStyle = isLowBat ? "rgba(2, 3, 10, 0.28)" : "rgba(3, 4, 12, 0.22)";
    ctx.fillRect(0, 0, W, H);

    // Aurora layers (time-of-day)
    const t  = time * 0.5;
    const aC = colors[0];
    const bC = colors[1];
    const wxOverlay = getWeatherOverlay(this.weatherCode);

    // Main aurora
    const g1 = ctx.createRadialGradient(
      W * (0.65 + 0.15 * Math.sin(t)),  H * (0.18 + 0.08 * Math.cos(t * 0.7)), 0,
      W * (0.65 + 0.15 * Math.sin(t)),  H * (0.18 + 0.08 * Math.cos(t * 0.7)), W * 0.55,
    );
    g1.addColorStop(0, aC + "16");
    g1.addColorStop(1, "transparent");
    ctx.fillStyle = g1;
    ctx.fillRect(0, 0, W, H);

    const g2 = ctx.createRadialGradient(
      W * (0.22 + 0.12 * Math.cos(t * 0.8)), H * (0.72 + 0.10 * Math.sin(t * 0.6)), 0,
      W * (0.22 + 0.12 * Math.cos(t * 0.8)), H * (0.72 + 0.10 * Math.sin(t * 0.6)), W * 0.45,
    );
    g2.addColorStop(0, bC + "10");
    g2.addColorStop(1, "transparent");
    ctx.fillStyle = g2;
    ctx.fillRect(0, 0, W, H);

    // Weather overlay layer
    if (wxOverlay) {
      const gWx = ctx.createLinearGradient(0, 0, 0, H);
      gWx.addColorStop(0, wxOverlay + "10");
      gWx.addColorStop(1, wxOverlay + "05");
      ctx.fillStyle = gWx;
      ctx.fillRect(0, 0, W, H);
    }

    // Charging glow: green energy rising from bottom
    if (this.battery?.charging) {
      const gChg = ctx.createLinearGradient(0, H, 0, H * 0.55);
      gChg.addColorStop(0, "#39FF14" + "12");
      gChg.addColorStop(1, "transparent");
      ctx.fillStyle = gChg;
      ctx.fillRect(0, 0, W, H);
    }

    // Neural connections
    const MAX_DIST = Math.min(W, H) * 0.28;
    for (let i = 0; i < nodes.length; i++) {
      for (let j = i + 1; j < nodes.length; j++) {
        const dx = nodes[i].x - nodes[j].x;
        const dy = nodes[i].y - nodes[j].y;
        const dist = Math.sqrt(dx * dx + dy * dy);
        if (dist < MAX_DIST) {
          const alpha = (1 - dist / MAX_DIST) * (isLowBat ? 0.10 : 0.18);
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

    // Neural nodes
    for (const n of nodes) {
      const pf  = 0.7 + 0.3 * Math.sin(n.pulse);
      const col = colors[n.colorIdx];
      const alpha = n.brightness * pf * (isLowBat ? 0.55 : 1);
      const r   = n.r * pf;

      ctx.beginPath();
      ctx.arc(n.x, n.y, r + 3, 0, Math.PI * 2);
      ctx.fillStyle = col + Math.round(alpha * 0.08 * 255).toString(16).padStart(2, "0");
      ctx.fill();

      ctx.beginPath();
      ctx.arc(n.x, n.y, r, 0, Math.PI * 2);
      ctx.fillStyle = col + Math.round(alpha * 255).toString(16).padStart(2, "0");
      ctx.fill();
    }

    // Weather particles (rain / snow)
    const isRain = this.weatherCode != null && this.weatherCode >= 61 && this.weatherCode < 71;
    const isSnow = this.weatherCode != null && this.weatherCode >= 71 && this.weatherCode < 80;
    const rainCol = "#0EA5E9";
    const snowCol = "#BAE6FD";
    for (const p of particles) {
      const alpha = p.life * (isLowBat ? 0.35 : 0.55);
      let col;
      if (isRain)      col = rainCol;
      else if (isSnow) col = snowCol;
      else             col = colors[Math.floor(time * 0.5 + p.x * 0.01) % 3];
      ctx.beginPath();
      if (isRain) {
        // Rain streaks
        ctx.moveTo(p.x, p.y);
        ctx.lineTo(p.x + p.vx * 3, p.y + p.vy * 3);
        ctx.strokeStyle = col + Math.round(alpha * 0.7 * 255).toString(16).padStart(2, "0");
        ctx.lineWidth = p.r * 0.6;
        ctx.stroke();
      } else {
        ctx.arc(p.x, p.y, p.r, 0, Math.PI * 2);
        ctx.fillStyle = col + Math.round(alpha * 255).toString(16).padStart(2, "0");
        ctx.fill();
      }
    }

    // Pulse rings
    for (const pu of pulses) {
      const col = this.battery?.charging ? "#39FF14" : colors[0];
      ctx.beginPath();
      ctx.arc(pu.x, pu.y, pu.r, 0, Math.PI * 2);
      ctx.strokeStyle = col + Math.round(pu.alpha * 255).toString(16).padStart(2, "0");
      ctx.lineWidth = this.battery?.charging ? 2 : 1.5;
      ctx.stroke();
    }

    // Charge bolts (lightning streaks upward when charging)
    for (const bolt of this.chargeBolts) {
      if (bolt.points.length < 2) continue;
      ctx.beginPath();
      ctx.moveTo(bolt.points[0].x, bolt.points[0].y);
      for (let i = 1; i < bolt.points.length; i++) ctx.lineTo(bolt.points[i].x, bolt.points[i].y);
      ctx.strokeStyle = "#39FF14" + Math.round(bolt.alpha * 255).toString(16).padStart(2, "0");
      ctx.lineWidth = 1.2;
      ctx.shadowColor = "#39FF14";
      ctx.shadowBlur = 8;
      ctx.stroke();
      ctx.shadowBlur = 0;
    }

    // Storm lightning flash effect (rare, atmospheric)
    if (this.weatherCode != null && this.weatherCode >= 95 && Math.random() < 0.003) {
      ctx.fillStyle = "rgba(180,160,255,0.04)";
      ctx.fillRect(0, 0, W, H);
    }
  }
}

// ─── React component ──────────────────────────────────────────────────────────
export default function NeuralWallpaper({ style }) {
  const canvasRef    = useRef(null);
  const netRef       = useRef(null);
  const rafRef       = useRef(null);
  const lastPulseRef = useRef(0);

  const battery     = useBattery();
  const weatherCode = useWeatherCode();
  const hour        = new Date().getHours();
  const baseColors  = useMemo(() => getBaseColors(hour), [hour]);

  // When battery/weather state changes, patch the live network (no teardown)
  useEffect(() => {
    if (netRef.current) {
      netRef.current.battery     = battery;
      netRef.current.weatherCode = weatherCode;
    }
  }, [battery, weatherCode]);

  // Spawn charge bolts automatically when charging
  const lastBoltRef = useRef(0);
  useEffect(() => {
    if (!battery?.charging) return;
    const id = setInterval(() => {
      if (netRef.current && Date.now() - lastBoltRef.current > 550) {
        netRef.current.spawnChargeBolt();
        lastBoltRef.current = Date.now();
      }
    }, 600);
    return () => clearInterval(id);
  }, [battery?.charging]);

  // Auto-pulse more frequently during storms
  const isStorm = weatherCode != null && weatherCode >= 95;
  const pulseMsRef = useRef(6000);
  useEffect(() => { pulseMsRef.current = isStorm ? 2000 : 6000; }, [isStorm]);

  const onTouch = useCallback((e) => {
    const canvas = canvasRef.current;
    if (!canvas || !netRef.current) return;
    const rect  = canvas.getBoundingClientRect();
    const touch = e.touches?.[0] || e;
    const x = touch.clientX - rect.left;
    const y = touch.clientY - rect.top;
    netRef.current.setMouse(x, y, true);
    if (Date.now() - lastPulseRef.current > 300) {
      netRef.current.spawnPulse(x, y);
      lastPulseRef.current = Date.now();
    }
  }, []);

  const onEnd = useCallback(() => netRef.current?.setMouse(0, 0, false), []);

  useEffect(() => {
    const canvas = canvasRef.current;
    if (!canvas) return;
    const ctx = canvas.getContext("2d", { alpha: true });

    const resize = () => {
      const dpr = window.devicePixelRatio || 1;
      canvas.width  = canvas.offsetWidth  * dpr;
      canvas.height = canvas.offsetHeight * dpr;
      ctx.scale(dpr, dpr);
      if (netRef.current) {
        netRef.current.resize(canvas.offsetWidth, canvas.offsetHeight);
      } else {
        netRef.current = new NeuralNetwork(
          canvas.offsetWidth,
          canvas.offsetHeight,
          baseColors,
          weatherCode,
          battery,
        );
      }
    };
    resize();

    const ro = new ResizeObserver(resize);
    ro.observe(canvas);

    canvas.addEventListener("touchstart",  onTouch, { passive: true });
    canvas.addEventListener("touchmove",   onTouch, { passive: true });
    canvas.addEventListener("touchend",    onEnd,   { passive: true });
    canvas.addEventListener("mousemove",   onTouch, { passive: true });
    canvas.addEventListener("mouseleave",  onEnd,   { passive: true });

    // Auto-pulse interval (adjusts dynamically based on pulseMsRef)
    const pulseInterval = setInterval(() => {
      if (!netRef.current) return;
      const { W, H } = netRef.current;
      netRef.current.spawnPulse(Math.random() * W, Math.random() * H);
    }, 2200); // check frequently, pulseMsRef controls actual rate

    // Throttled pulse using pulseMsRef
    let lastAutoPulse = 0;
    const checkPulse = () => {
      const now = Date.now();
      if (now - lastAutoPulse > pulseMsRef.current && netRef.current) {
        const { W, H } = netRef.current;
        netRef.current.spawnPulse(Math.random() * W, Math.random() * H);
        lastAutoPulse = now;
      }
    };
    const pulseTimer = setInterval(checkPulse, 600);
    clearInterval(pulseInterval); // remove the old coarse interval

    const FPS  = 1000 / 48; // ~48 fps
    let lastTs = 0;

    const loop = (ts) => {
      rafRef.current = requestAnimationFrame(loop);
      if (ts - lastTs < FPS) return;
      lastTs = ts;
      if (!netRef.current) return;
      netRef.current.update();
      netRef.current.draw(ctx);
    };
    rafRef.current = requestAnimationFrame(loop);

    return () => {
      cancelAnimationFrame(rafRef.current);
      clearInterval(pulseTimer);
      ro.disconnect();
      canvas.removeEventListener("touchstart",  onTouch);
      canvas.removeEventListener("touchmove",   onTouch);
      canvas.removeEventListener("touchend",    onEnd);
      canvas.removeEventListener("mousemove",   onTouch);
      canvas.removeEventListener("mouseleave",  onEnd);
    };
  }, [baseColors, onTouch, onEnd]); // weatherCode/battery patched via separate effect

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
