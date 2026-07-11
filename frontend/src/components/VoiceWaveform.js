/**
 * VoiceWaveform — Real-time audio visualization for Cortex Voice.
 *
 * Uses Web Audio API AnalyserNode when actively listening/speaking.
 * Falls back to a gentle CSS animation when no stream is available.
 */
import React, { useEffect, useRef, useCallback } from "react";

const BAR_COUNT  = 32;
const MIN_HEIGHT = 3;
const MAX_HEIGHT = 52;

export default function VoiceWaveform({
  /** "listening" | "speaking" | "thinking" | "idle" */
  mode = "idle",
  /** Optional MediaStream (from STT mic) to drive the visualizer */
  stream = null,
  /** Primary accent color */
  color = "#00F0FF",
  /** Width of the waveform container in px */
  width = 220,
  /** Height of the waveform container in px */
  height = 60,
}) {
  const canvasRef   = useRef(null);
  const rafRef      = useRef(null);
  const analyserRef = useRef(null);
  const audioCtxRef = useRef(null);
  const sourceRef   = useRef(null);
  const dataRef     = useRef(new Uint8Array(BAR_COUNT * 2));
  const phaseRef    = useRef(0);

  // ── Tear-down helper ────────────────────────────────────────────────────
  const teardown = useCallback(() => {
    cancelAnimationFrame(rafRef.current);
    try { sourceRef.current?.disconnect(); } catch {}
    try { analyserRef.current?.disconnect(); } catch {}
    sourceRef.current   = null;
    analyserRef.current = null;
  }, []);

  // ── Close AudioContext on unmount ────────────────────────────────────────
  useEffect(() => {
    return () => {
      teardown();
      cancelAnimationFrame(rafRef.current);
      try {
        if (audioCtxRef.current && audioCtxRef.current.state !== "closed") {
          audioCtxRef.current.close();
        }
      } catch {}
    };
  // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  // ── Wire AudioContext when a live MediaStream is supplied ───────────────
  useEffect(() => {
    if (!stream) { teardown(); return; }
    const AudioContext = window.AudioContext || window.webkitAudioContext;
    if (!AudioContext) return;

    teardown();
    try {
      if (!audioCtxRef.current || audioCtxRef.current.state === "closed") {
        audioCtxRef.current = new AudioContext();
      }
      const ctx      = audioCtxRef.current;
      const analyser = ctx.createAnalyser();
      analyser.fftSize = BAR_COUNT * 4;
      analyser.smoothingTimeConstant = 0.75;
      const src = ctx.createMediaStreamSource(stream);
      src.connect(analyser);
      sourceRef.current   = src;
      analyserRef.current = analyser;
      dataRef.current     = new Uint8Array(analyser.frequencyBinCount);
    } catch {
      // AudioContext blocked (autoplay policy) — fall back gracefully
    }
    return teardown;
  // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [stream]);

  // ── Animation loop ──────────────────────────────────────────────────────
  useEffect(() => {
    const canvas = canvasRef.current;
    if (!canvas) return;
    const ctx  = canvas.getContext("2d");
    const dpr  = window.devicePixelRatio || 1;
    canvas.width  = width  * dpr;
    canvas.height = height * dpr;
    ctx.scale(dpr, dpr);

    const barW  = width / BAR_COUNT - 1.5;
    const baseY = height / 2;

    function draw() {
      rafRef.current = requestAnimationFrame(draw);
      ctx.clearRect(0, 0, width, height);

      phaseRef.current += 0.08;
      const phase = phaseRef.current;

      const analyser = analyserRef.current;
      let freqData = null;
      if (analyser && (mode === "listening" || mode === "speaking")) {
        analyser.getByteFrequencyData(dataRef.current);
        freqData = dataRef.current;
      }

      for (let i = 0; i < BAR_COUNT; i++) {
        const t = i / BAR_COUNT;
        let barH;

        if (freqData) {
          // Real microphone / speaker data
          const freqIdx  = Math.floor((i / BAR_COUNT) * freqData.length * 0.6);
          const raw      = freqData[freqIdx] / 255;
          const smooth   = raw * MAX_HEIGHT;
          barH = Math.max(MIN_HEIGHT, smooth);
        } else if (mode === "listening") {
          // Simulated wave — breathing + gentle randomness
          barH = MIN_HEIGHT + (Math.sin(t * Math.PI * 4 + phase) * 0.5 + 0.5) * 18
               + Math.sin(t * Math.PI * 8 - phase * 1.3) * 6;
        } else if (mode === "speaking") {
          // Richer speaking animation
          barH = MIN_HEIGHT
               + (Math.sin(t * Math.PI * 6 + phase * 1.4) * 0.5 + 0.5) * 28
               + (Math.sin(t * Math.PI * 3 - phase) * 0.5 + 0.5) * 14
               + Math.abs(Math.sin(phase * 0.7 + t)) * 8;
        } else if (mode === "thinking") {
          // Slow scanning pulse
          const scanPos  = (phase * 0.4) % 1;
          const dist     = Math.abs(t - scanPos);
          const wrapped  = Math.min(dist, 1 - dist);
          barH = MIN_HEIGHT + Math.exp(-wrapped * 12) * 24 + Math.sin(t * Math.PI * 2 + phase * 0.5) * 4;
        } else {
          // Idle — gentle heartbeat
          barH = MIN_HEIGHT + (Math.sin(t * Math.PI * 2 + phase * 0.3) * 0.5 + 0.5) * 5;
        }

        barH = Math.min(MAX_HEIGHT * 0.9, Math.max(MIN_HEIGHT, barH));

        const x   = i * (barW + 1.5);
        const y   = baseY - barH / 2;
        const alpha = mode === "idle" ? 0.25 : 0.85;

        // Gradient per bar: bright at top, fades out
        const grad = ctx.createLinearGradient(x, y, x, y + barH);
        grad.addColorStop(0, `${color}${Math.round(alpha * 255).toString(16).padStart(2, "0")}`);
        grad.addColorStop(1, `${color}22`);

        ctx.fillStyle = grad;
        ctx.beginPath();
        ctx.roundRect
          ? ctx.roundRect(x, y, barW, barH, barW / 2)
          : ctx.rect(x, y, barW, barH);
        ctx.fill();

        // Glow dot at tip when active
        if (mode !== "idle") {
          ctx.beginPath();
          ctx.arc(x + barW / 2, y, barW / 2, 0, Math.PI * 2);
          ctx.fillStyle = color + "cc";
          ctx.fill();
        }
      }
    }

    rafRef.current = requestAnimationFrame(draw);
    return () => cancelAnimationFrame(rafRef.current);
  }, [mode, color, width, height]);

  return (
    <canvas
      ref={canvasRef}
      style={{
        width,
        height,
        display: "block",
        pointerEvents: "none",
        filter: mode !== "idle"
          ? `drop-shadow(0 0 8px ${color}66)`
          : "none",
        transition: "filter 0.4s ease",
      }}
    />
  );
}
