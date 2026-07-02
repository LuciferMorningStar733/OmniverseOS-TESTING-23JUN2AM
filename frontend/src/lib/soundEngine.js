// soundEngine.js — Procedural Web Audio sound effects for OmniverseOS
// Year 3038 aesthetic: all sounds synthesized, no audio files required.
// Per-category granular controls: clicks, notifications, startup, ai, ambient.

let _ctx = null;
let _master = null;

function getCtx() {
  if (!_ctx) {
    try {
      _ctx = new (window.AudioContext || window.webkitAudioContext)();
      _master = _ctx.createGain();
      _master.gain.value = 0.55;
      _master.connect(_ctx.destination);
    } catch { return null; }
  }
  if (_ctx.state === "suspended") {
    _ctx.resume().catch(() => {});
  }
  return _ctx;
}

function master() { getCtx(); return _master; }

// ── Global + per-category enable checks ──────────────────────────────────────

function get(key, def = true) {
  try {
    const v = localStorage.getItem(key);
    if (v === null) return def;
    return v !== "0";
  } catch { return def; }
}
function set(key, on) {
  try { localStorage.setItem(key, on ? "1" : "0"); } catch {}
}

const K = {
  master:   "omniverse_sounds",
  clicks:   "omniverse_sound_clicks",
  notifs:   "omniverse_sound_notifs",
  startup:  "omniverse_sound_startup",
  ai:       "omniverse_sound_ai",
  ambient:  "omniverse_sound_ambient",
};

function can(cat) {
  return get(K.master) && get(K[cat]);
}

// ── Public getters/setters ────────────────────────────────────────────────────

export function getSoundsEnabled()       { return get(K.master); }
export function setSoundsEnabled(on)     { set(K.master, on); }

export function getSoundCategory(cat)    { return get(K[cat]); }
export function setSoundCategory(cat, on){ set(K[cat], on); }

export function getAllSoundPrefs() {
  return {
    master:  get(K.master),
    clicks:  get(K.clicks),
    notifs:  get(K.notifs),
    startup: get(K.startup),
    ai:      get(K.ai),
    ambient: get(K.ambient),
  };
}

// ── Core oscillator helper ────────────────────────────────────────────────────

function osc({ type = "sine", freq, freqEnd = null, start, end, gain: gStart, gainEnd, detune = 0, filterType = null, filterFreq = null, filterQ = 1 }) {
  const c = getCtx();
  if (!c || !master()) return;
  try {
    const o = c.createOscillator();
    const g = c.createGain();
    o.type = type;
    o.frequency.setValueAtTime(freq, start);
    if (detune) o.detune.value = detune;
    if (freqEnd != null) {
      o.frequency.exponentialRampToValueAtTime(Math.max(freqEnd, 1), end);
    }
    g.gain.setValueAtTime(gStart, start);
    g.gain.exponentialRampToValueAtTime(Math.max(gainEnd, 0.00001), end);

    if (filterType) {
      const filt = c.createBiquadFilter();
      filt.type = filterType;
      filt.frequency.setValueAtTime(filterFreq || freq, start);
      filt.Q.value = filterQ;
      o.connect(filt);
      filt.connect(g);
    } else {
      o.connect(g);
    }
    g.connect(master());
    o.start(start);
    o.stop(end + 0.02);
  } catch {}
}

function noise({ start, end, gain: gStart, gainEnd, filterFreq = 2000 }) {
  const c = getCtx();
  if (!c || !master()) return;
  try {
    const bufLen = c.sampleRate * (end - start);
    const buf = c.createBuffer(1, bufLen, c.sampleRate);
    const data = buf.getChannelData(0);
    for (let i = 0; i < bufLen; i++) data[i] = Math.random() * 2 - 1;
    const src = c.createBufferSource();
    src.buffer = buf;
    const filt = c.createBiquadFilter();
    filt.type = "bandpass";
    filt.frequency.value = filterFreq;
    filt.Q.value = 0.5;
    const g = c.createGain();
    g.gain.setValueAtTime(gStart, start);
    g.gain.exponentialRampToValueAtTime(Math.max(gainEnd, 0.00001), end);
    src.connect(filt); filt.connect(g); g.connect(master());
    src.start(start);
    src.stop(end + 0.02);
  } catch {}
}

// ── PUBLIC SOUND API ──────────────────────────────────────────────────────────

export function playClick() {
  if (!can("clicks")) return;
  const c = getCtx(); if (!c) return;
  const t = c.currentTime;
  osc({ type: "square", freq: 1400, freqEnd: 700, start: t, end: t + 0.045, gain: 0.055, gainEnd: 0.001 });
  noise({ start: t, end: t + 0.025, gain: 0.03, gainEnd: 0.001, filterFreq: 3000 });
}

export function playHover() {
  if (!can("clicks")) return;
  const c = getCtx(); if (!c) return;
  const t = c.currentTime;
  osc({ type: "sine", freq: 1100, freqEnd: 1400, start: t, end: t + 0.035, gain: 0.018, gainEnd: 0.001 });
}

export function playWindowOpen() {
  if (!can("clicks")) return;
  const c = getCtx(); if (!c) return;
  const t = c.currentTime;
  osc({ type: "sawtooth", freq: 80, freqEnd: 700, start: t, end: t + 0.2, gain: 0.055, gainEnd: 0.001, filterType: "lowpass", filterFreq: 1200 });
  osc({ type: "sine", freq: 1800, freqEnd: 3600, start: t + 0.10, end: t + 0.28, gain: 0.04, gainEnd: 0.001 });
  noise({ start: t, end: t + 0.18, gain: 0.025, gainEnd: 0.001, filterFreq: 1600 });
}

export function playWindowClose() {
  if (!can("clicks")) return;
  const c = getCtx(); if (!c) return;
  const t = c.currentTime;
  osc({ type: "sawtooth", freq: 700, freqEnd: 60, start: t, end: t + 0.16, gain: 0.05, gainEnd: 0.001, filterType: "lowpass", filterFreq: 900 });
  noise({ start: t, end: t + 0.12, gain: 0.02, gainEnd: 0.001, filterFreq: 800 });
}

export function playMinimize() {
  if (!can("clicks")) return;
  const c = getCtx(); if (!c) return;
  const t = c.currentTime;
  osc({ type: "sine", freq: 900, freqEnd: 300, start: t, end: t + 0.12, gain: 0.04, gainEnd: 0.001 });
}

export function playNotification() {
  if (!can("notifs")) return;
  const c = getCtx(); if (!c) return;
  const t = c.currentTime;
  const seq = [[0, 880, 1760, 0.11], [0.14, 1100, 2200, 0.10], [0.28, 1320, 1320, 0.18]];
  for (const [delay, f1, f2, dur] of seq) {
    osc({ type: "sine", freq: f1, freqEnd: f2, start: t + delay, end: t + delay + dur, gain: 0.09, gainEnd: 0.001 });
    osc({ type: "triangle", freq: f1 * 1.5, start: t + delay, end: t + delay + dur * 0.6, gain: 0.025, gainEnd: 0.001 });
  }
}

export function playError() {
  if (!can("notifs")) return;
  const c = getCtx(); if (!c) return;
  const t = c.currentTime;
  osc({ type: "sawtooth", freq: 160, freqEnd: 90, start: t, end: t + 0.32, gain: 0.09, gainEnd: 0.001 });
  osc({ type: "square", freq: 240, freqEnd: 120, start: t + 0.06, end: t + 0.30, gain: 0.04, gainEnd: 0.001 });
  noise({ start: t + 0.1, end: t + 0.28, gain: 0.03, gainEnd: 0.001, filterFreq: 400 });
}

export function playBoot() {
  if (!can("startup")) return;
  const c = getCtx(); if (!c) return;
  const t = c.currentTime;
  osc({ type: "sawtooth", freq: 35, freqEnd: 180, start: t, end: t + 0.7, gain: 0.07, gainEnd: 0.002, filterType: "lowpass", filterFreq: 400 });
  osc({ type: "sine", freq: 220, freqEnd: 880, start: t + 0.35, end: t + 0.85, gain: 0.06, gainEnd: 0.001 });
  osc({ type: "sine", freq: 880, freqEnd: 1760, start: t + 0.65, end: t + 1.05, gain: 0.08, gainEnd: 0.001 });
  osc({ type: "triangle", freq: 2200, freqEnd: 4400, start: t + 0.95, end: t + 1.45, gain: 0.055, gainEnd: 0.001 });
  noise({ start: t, end: t + 0.22, gain: 0.045, gainEnd: 0.001, filterFreq: 2000 });
}

export function playAIProcess() {
  if (!can("ai")) return;
  const c = getCtx(); if (!c) return;
  const t = c.currentTime;
  // Subtle neural pulse — three staggered sine pings
  osc({ type: "sine", freq: 440, freqEnd: 880,  start: t,       end: t + 0.12, gain: 0.035, gainEnd: 0.001 });
  osc({ type: "sine", freq: 660, freqEnd: 1320, start: t + 0.08, end: t + 0.20, gain: 0.025, gainEnd: 0.001 });
  osc({ type: "triangle", freq: 1320, freqEnd: 2640, start: t + 0.16, end: t + 0.30, gain: 0.018, gainEnd: 0.001 });
}

export function playAIReady() {
  if (!can("ai")) return;
  const c = getCtx(); if (!c) return;
  const t = c.currentTime;
  // Warm ascending chime — AI done processing
  osc({ type: "sine", freq: 523, freqEnd: 1046, start: t,       end: t + 0.22, gain: 0.06, gainEnd: 0.001 });
  osc({ type: "sine", freq: 659, freqEnd: 1318, start: t + 0.12, end: t + 0.32, gain: 0.04, gainEnd: 0.001 });
  osc({ type: "triangle", freq: 1046, start: t + 0.22, end: t + 0.50, gain: 0.035, gainEnd: 0.001 });
}

export function playAmbientTick() {
  if (!can("ambient")) return;
  const c = getCtx(); if (!c) return;
  const t = c.currentTime;
  // Very subtle — a gentle neural heartbeat
  osc({ type: "sine", freq: 200, freqEnd: 180, start: t, end: t + 0.08, gain: 0.008, gainEnd: 0.001 });
}
