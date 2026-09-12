// Iconic wallpapers — handcrafted scenes with OMNIVERSE OS branding.
  // id used in localStorage; className applied to wp-base layer.

  export const WALLPAPER_CATEGORIES = [
    "All", "3036 Masterpieces", "Tech", "Minimal", "Sci-Fi", "Space", "Cyber Grid", "Abstract", "Night", "Favorites", "Custom"
  ];

  export const WALLPAPERS = [
    // ─── 3036 Masterpiece Collection (4K Futuristic Live Wallpapers) ────────
    {
      id: "golden-gate-sunset",
      name: "Golden Gate Sunset",
      className: "wp-golden-gate-sunset",
      accent: "#FB923C",
      category: "3036 Masterpieces",
      fx: "aurora",
      typo: { main: "OMNIVERSE OS", sub: "SAN FRANCISCO // GOLDEN HOUR" },
      description: "Iconic Golden Gate bridge coastal sunset wallpaper."
    },
    {
      id: "omni-genesis",
      name: "Omni Genesis",
      className: "wp-omni-genesis",
      accent: "#00F0FF",
      category: "3036 Masterpieces",
      fx: "genesis",
      typo: { main: "OMNI GENESIS", sub: "COSMIC INTELLIGENCE FIELD // 3036" },
      description: "A living cosmic intelligence field with evolving structures."
    },
    {
      id: "cortex-neural-ocean",
      name: "Cortex Neural Ocean",
      className: "wp-cortex-neural-ocean",
      accent: "#A855F7",
      category: "3036 Masterpieces",
      fx: "neural-ocean",
      typo: { main: "CORTEX", line2: "OCEAN", sub: "DEEP DIMENSIONAL NEURAL FIELD" },
      description: "Deep dimensional neural structures continuously forming and reorganizing."
    },
    {
      id: "quantum-horizon",
      name: "Quantum Horizon",
      className: "wp-quantum-horizon",
      accent: "#00F0FF",
      category: "3036 Masterpieces",
      fx: "quantum",
      typo: { main: "OMNIVERSE\u00A0OS", sub: "QUANTUM HORIZON // D-7 SPACETIME" },
      description: "A futuristic spacetime environment with subtle dimensional distortion."
    },
    {
      id: "digital-aurora",
      name: "Digital Aurora",
      className: "wp-digital-aurora",
      accent: "#39FF14",
      category: "3036 Masterpieces",
      fx: "aurora",
      typo: { main: "DIGITAL AURORA", sub: "VOLUMETRIC ATMOSPHERE // 3036" },
      description: "A slow-moving intelligent atmospheric field with volumetric depth."
    },
    {
      id: "sentient-city",
      name: "Sentient City 3036",
      className: "wp-sentient-city",
      accent: "#FCEE09",
      category: "3036 Masterpieces",
      fx: "city",
      typo: { main: "SENTIENT CITY", sub: "AUTONOMOUS LIGHT NETWORKS // 3036" },
      description: "A distant autonomous megacity with intelligent light networks."
    },
    {
      id: "event-horizon",
      name: "Event Horizon",
      className: "wp-event-horizon",
      accent: "#FF0055",
      category: "3036 Masterpieces",
      fx: "singularity",
      typo: { main: "EVENT HORIZON", sub: "GRAVITATIONAL SINGULARITY" },
      description: "Elegant gravitational visual effects and deep-space geometry."
    },
    {
      id: "neural-bloom",
      name: "Neural Bloom",
      className: "wp-neural-bloom",
      accent: "#E056FD",
      category: "3036 Masterpieces",
      fx: "bloom",
      typo: { main: "NEURAL BLOOM", sub: "ORGANIC SYNAPSE MORPHOGENESIS" },
      description: "Organic computational structures growing and reorganizing."
    },
    {
      id: "temporal-archive",
      name: "Temporal Archive",
      className: "wp-temporal-archive",
      accent: "#60A5FA",
      category: "3036 Masterpieces",
      fx: "archive",
      typo: { main: "TEMPORAL ARCHIVE", sub: "LAYERED MEMORY TRACES // T-CHRONO" },
      description: "Layered timelines and memory traces moving through dimensional space."
    },
    {
      id: "omniverse-void",
      name: "Omniverse Void",
      className: "wp-omniverse-void",
      accent: "#94A3B8",
      category: "3036 Masterpieces",
      fx: "void",
      typo: { main: "OMNIVERSE VOID", sub: "ZERO-POINT INTELLIGENCE" },
      description: "Minimal premium black-space environment with extremely subtle intelligent motion."
    },
    {
      id: "cortex-singularity",
      name: "Cortex Singularity",
      className: "wp-cortex-singularity",
      accent: "#00F0FF",
      category: "3036 Masterpieces",
      fx: "singularity-core",
      typo: { main: "CORTEX SINGULARITY", sub: "INTELLIGENCE CORE // 1.0 THz" },
      description: "A central intelligence core with controlled gravitational/neural dynamics."
    },

    // ─── Legacy Iconic Collection ───────────────────────────────────────────
    { id: "neural-core",      name: "Neural Core",       className: "wp-neural-core",      accent: "#00F0FF", category: "Tech",       fx: "neural",   typo: { main: "OMNIVERSE\u00A0OS", sub: "AI CORE • v.2.6" } },
    { id: "blueprint",        name: "Blueprint Matrix",  className: "wp-blueprint",         accent: "#00F0FF", category: "Tech",       fx: "circuit",  typo: { main: "OMNIVERSE", line2: "OS", sub: "SYSTEM SCHEMATIC // 2026" } },
    { id: "ai-nexus",         name: "AI Nexus",          className: "wp-ai-nexus",          accent: "#00F0FF", category: "Tech",       fx: "neural",   typo: { main: "OMNIVERSE", line2: "OS", sub: "NEURAL NEXUS" } },
    { id: "void-matrix",      name: "Void Matrix",       className: "wp-void-matrix",       accent: "#39FF14", category: "Cyber Grid", fx: "matrix",   typo: { main: "OMNIVERSE\u00A0OS", sub: "VOID PROTOCOL" } },
    { id: "neon-grid",        name: "Neon Grid",         className: "wp-neon-grid",         accent: "#C778DD", category: "Cyber Grid", fx: "hologram", typo: { main: "OMNIVERSE", line2: "OS", sub: "NEON GRID // 2026" } },
    { id: "dark-matter",      name: "Dark Matter",       className: "wp-dark-matter",       accent: "#C778DD", category: "Space",      fx: "plasma",   typo: { main: "OMNIVERSE\u00A0OS", sub: "DARK MATTER" } },
    { id: "holographic",      name: "Holographic",       className: "wp-holographic",       accent: "#00F0FF", category: "Abstract",   fx: "hologram", typo: { main: "OMNIVERSE\u00A0OS", sub: "HOLOGRAPHIC" } },
    { id: "cyber-pulse",      name: "Cyber Pulse",       className: "wp-cyber-pulse",       accent: "#FF003C", category: "Abstract",   fx: "radar",    typo: { main: "OMNIVERSE", line2: "OS", sub: "PULSE ACTIVE" } },
    { id: "midnight-circuit", name: "Midnight Circuit",  className: "wp-midnight-circuit",  accent: "#00F0FF", category: "Tech",       fx: "circuit",  typo: { main: "OMNIVERSE\u00A0OS", sub: "CIRCUIT // ONLINE" } },
    { id: "aurora-code",      name: "Aurora Code",       className: "wp-aurora-code",       accent: "#39FF14", category: "Abstract",   fx: "matrix",   typo: { main: "OMNIVERSE\u00A0OS", sub: "AURORA PROTOCOL" } },
    { id: "plasma-field",     name: "Plasma Field",      className: "wp-plasma-field",      accent: "#C778DD", category: "Abstract",   fx: "plasma",   typo: { main: "OMNIVERSE\u00A0OS", sub: "PLASMA FIELD" } },
    { id: "nebula-dark",      name: "Nebula Dark",       className: "wp-nebula-dark",       accent: "#C778DD", category: "Space",      fx: "plasma",   typo: { main: "OMNIVERSE", line2: "OS", sub: "NEBULA SECTOR" } },
    { id: "chrome-void",      name: "Chrome Void",       className: "wp-chrome-void",       accent: "#94A3B8", category: "Minimal",    fx: "hologram", typo: { main: "OMNIVERSE\u00A0OS", sub: "CHROME EDITION" } },
    { id: "quantum-dark",     name: "Quantum Dark",      className: "wp-quantum-dark",      accent: "#00F0FF", category: "Sci-Fi",     fx: "radar",    typo: { main: "OMNIVERSE\u00A0OS", sub: "QUANTUM DARK" } },
    { id: "obsidian-hex",     name: "Obsidian Hex",      className: "wp-obsidian-hex",      accent: "#FF003C", category: "Night",      fx: "circuit",  typo: { main: "OMNIVERSE\u00A0OS", sub: "OBSIDIAN // HEX" } },
    { id: "ghost-signal",     name: "Ghost Signal",      className: "wp-ghost-signal",      accent: "#94A3B8", category: "Minimal",    fx: "hologram", typo: { main: "OMNIVERSE\u00A0OS", sub: "SIGNAL VOID" } },
    { id: "signal-wave",      name: "Signal Wave",       className: "wp-signal-wave",       accent: "#00F0FF", category: "Abstract",   fx: "radar",    typo: { main: "OMNIVERSE\u00A0OS", sub: "SIGNAL WAVE" } },
    { id: "dark-fiber",       name: "Dark Fiber",        className: "wp-dark-fiber",        accent: "#39FF14", category: "Night",      fx: "circuit",  typo: { main: "OMNIVERSE\u00A0OS", sub: "DARK FIBER" } },
    { id: "stellar-map",      name: "Stellar Map",       className: "wp-stellar-map",       accent: "#FCEE09", category: "Space",      fx: "plasma",   typo: { main: "OMNIVERSE\u00A0OS", sub: "STELLAR CHART" } },
    { id: "cyber-storm",      name: "Cyber Storm",       className: "wp-cyber-storm",       accent: "#FF003C", category: "Night",      fx: "neural",   typo: { main: "OMNIVERSE", line2: "OS", sub: "STORM PROTOCOL" } },
    { id: "vector-space",     name: "Vector Space",      className: "wp-vector-space",      accent: "#00F0FF", category: "Minimal",    fx: "hologram", typo: { main: "OMNIVERSE\u00A0OS", sub: "VECTOR" } },
    { id: "grid-zero",        name: "Grid Zero",         className: "wp-grid-zero",         accent: "#39FF14", category: "Minimal",    fx: "circuit",  typo: { main: "OMNIVERSE\u00A0OS", sub: "GRID ZERO" } },
    { id: "abyss",            name: "Abyss",             className: "wp-abyss",             accent: "#C778DD", category: "Night",      fx: "plasma",   typo: { main: "OMNIVERSE\u00A0OS", sub: "ABYSS" } },
    { id: "oled-void",        name: "OLED Void",         className: "wp-oled-void",         accent: "#00F0FF", category: "Minimal",    fx: "hologram", typo: { main: "OMNIVERSE\u00A0OS", sub: "VOID // 2038" } },
    { id: "aurora-boreal",    name: "Aurora Borealis",   className: "wp-aurora-boreal",     accent: "#39FF14", category: "Sci-Fi",     fx: "plasma",   typo: { main: "OMNIVERSE\u00A0OS", sub: "AURORA SECTOR" } },
    { id: "cyber-rain",       name: "Cyber Rain",        className: "wp-cyber-rain",        accent: "#00F0FF", category: "Cyber Grid", fx: "matrix",   typo: { main: "OMNIVERSE\u00A0OS", sub: "RAIN PROTOCOL" } },
    { id: "nova-burst",       name: "Nova Burst",        className: "wp-nova-burst",        accent: "#FF003C", category: "Space",      fx: "radar",    typo: { main: "OMNIVERSE\u00A0OS", sub: "NOVA // IGNITION" } },
    { id: "iris-neural",      name: "Iris Neural",       className: "wp-iris-neural",       accent: "#A855F7", category: "Tech",       fx: "neural",   typo: { main: "OMNIVERSE\u00A0OS", sub: "IRIS // ONLINE" } },
    { id: "glacier",          name: "Glacier",           className: "wp-glacier",           accent: "#60A5FA", category: "Minimal",    fx: "hologram", typo: { main: "OMNIVERSE\u00A0OS", sub: "GLACIER PROTOCOL" } },
    { id: "crimson-arc",      name: "Crimson Arc",       className: "wp-crimson-arc",       accent: "#FF003C", category: "Abstract",   fx: "radar",    typo: { main: "OMNIVERSE\u00A0OS", sub: "CRIMSON ARC" } },
    { id: "solar-wind",       name: "Solar Wind",        className: "wp-solar-wind",        accent: "#FCEE09", category: "Space",      fx: "plasma",   typo: { main: "OMNIVERSE\u00A0OS", sub: "SOLAR WIND" } },
  ];

  export const DEFAULT_WALLPAPER = "golden-gate-sunset";

  // ─── Hooks: localStorage persistence ─────────────────────────────────────────
  const LS_FAVORITES  = "omni_wp_favorites";
  const LS_RECENT     = "omni_wp_recent";
  const LS_CUSTOM     = "omni_wp_custom";

  export const getWallpaper = (id) =>
    WALLPAPERS.find((w) => w.id === id) || getCustomWallpaper(id) || WALLPAPERS[0];

  export const getWallpapersByCategory = (cat) =>
    cat === "All" ? WALLPAPERS
    : cat === "Favorites" ? WALLPAPERS.filter((w) => getFavorites().includes(w.id))
    : cat === "Custom" ? getCustomWallpapers()
    : WALLPAPERS.filter((w) => w.category === cat);

  // ─── Favorites ────────────────────────────────────────────────────────────────
  export const getFavorites = () => {
    try { return JSON.parse(localStorage.getItem(LS_FAVORITES) || "[]"); }
    catch { return []; }
  };
  export const toggleFavorite = (id) => {
    const favs = getFavorites();
    const next = favs.includes(id) ? favs.filter((f) => f !== id) : [id, ...favs];
    localStorage.setItem(LS_FAVORITES, JSON.stringify(next));
    return next;
  };

  // ─── Recently used ────────────────────────────────────────────────────────────
  export const getRecentWallpapers = () => {
    try { return JSON.parse(localStorage.getItem(LS_RECENT) || "[]"); }
    catch { return []; }
  };
  export const trackRecentWallpaper = (id) => {
    const recent = getRecentWallpapers().filter((r) => r !== id);
    const next   = [id, ...recent].slice(0, 8);
    localStorage.setItem(LS_RECENT, JSON.stringify(next));
  };

  // ─── Custom wallpapers (user uploaded) ───────────────────────────────────────
  export const getCustomWallpapers = () => {
    try { return JSON.parse(localStorage.getItem(LS_CUSTOM) || "[]"); }
    catch { return []; }
  };
  export const addCustomWallpaper = (name, dataURL) => {
    const existing = getCustomWallpapers();
    const id = `custom-${Date.now()}`;
    const wp = { id, name, className: "wp-custom", accent: "#00F0FF", dataURL, category: "Custom", typo: {} };
    localStorage.setItem(LS_CUSTOM, JSON.stringify([wp, ...existing].slice(0, 20)));
    return wp;
  };

  /** Add an AI-generated wallpaper (base64 PNG from Imagen-4) */
  export const addAIWallpaper = (prompt, image_b64) => {
    const existing = getCustomWallpapers();
    const id = `ai-wp-${Date.now()}`;
    const shortPrompt = prompt.length > 32 ? prompt.slice(0, 32) + "…" : prompt;
    const wp = {
      id,
      name: shortPrompt,
      className: "wp-custom",
      accent: "#A855F7",
      dataURL: `data:image/png;base64,${image_b64}`,
      category: "Custom",
      typo: {},
      aiGenerated: true,
      prompt,
    };
    localStorage.setItem(LS_CUSTOM, JSON.stringify([wp, ...existing].slice(0, 20)));
    return wp;
  };

  export const deleteCustomWallpaper = (id) => {
    const filtered = getCustomWallpapers().filter((w) => w.id !== id);
    localStorage.setItem(LS_CUSTOM, JSON.stringify(filtered));
  };
  export const getCustomWallpaper = (id) => getCustomWallpapers().find((w) => w.id === id);

  // ─── Dynamic wallpaper architecture (future-ready) ───────────────────────────
  // Register a dynamic wallpaper resolver: fn(context) => wallpaperId
  // Context: { hour, weather, music }
  const dynamicResolvers = [];
  export const registerDynamicResolver = (fn) => { dynamicResolvers.push(fn); };
  export const resolveDynamicWallpaper = (context) => {
    for (const fn of dynamicResolvers) {
      const id = fn(context);
      if (id) return id;
    }
    return null;
  };

  // Built-in time-of-day resolver (disabled by default — call registerDynamicResolver to enable)
  export const timeOfDayResolver = ({ hour }) => {
    if (hour >= 5 && hour < 9)  return "digital-aurora";
    if (hour >= 9 && hour < 17) return "omni-genesis";
    if (hour >= 17 && hour < 20) return "sentient-city";
    return "omniverse-void";
  };

  // ─── Quality & Motion Controls ────────────────────────────────────────────────
  const LS_QUALITY = "omni_wp_quality"; // "auto" | "high" | "medium" | "low"
  const LS_MOTION  = "omni_wp_motion";  // "playing" | "paused"

  export const getWallpaperQuality = () => {
    try { return localStorage.getItem(LS_QUALITY) || "auto"; } catch { return "auto"; }
  };

  export const setWallpaperQuality = (quality) => {
    try {
      localStorage.setItem(LS_QUALITY, quality);
      if (typeof window !== "undefined") {
        window.dispatchEvent(new CustomEvent("omni:wallpaper-settings-changed", { detail: { quality } }));
      }
    } catch {}
  };

  export const getWallpaperMotion = () => {
    try { return localStorage.getItem(LS_MOTION) || "playing"; } catch { return "playing"; }
  };

  export const setWallpaperMotion = (motion) => {
    try {
      localStorage.setItem(LS_MOTION, motion);
      if (typeof window !== "undefined") {
        window.dispatchEvent(new CustomEvent("omni:wallpaper-settings-changed", { detail: { motion } }));
      }
    } catch {}
  };

  export const getAdjacentWallpaperId = (currentId, direction = 1) => {
    const list = WALLPAPERS;
    const currentIndex = list.findIndex((w) => w.id === currentId);
    if (currentIndex === -1) return list[0]?.id || "omni-genesis";
    const nextIndex = (currentIndex + direction + list.length) % list.length;
    return list[nextIndex]?.id || list[0]?.id;
  };

  