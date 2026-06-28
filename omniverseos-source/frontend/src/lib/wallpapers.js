// Iconic wallpapers — handcrafted scenes with OMNIVERSE OS branding.
  // id used in localStorage; className applied to wp-base layer.

  export const WALLPAPER_CATEGORIES = [
    "All", "Tech", "Minimal", "Sci-Fi", "Space", "Cyber Grid", "Abstract", "Night", "Favorites", "Custom"
  ];

  export const WALLPAPERS = [
    // ─── Original 4 ──────────────────────────────────────────────────────────
    { id: "neural-core",      name: "Neural Core",       className: "wp-neural-core",      accent: "#00F0FF", category: "Tech",      typo: { main: "OMNIVERSE\u00A0OS", sub: "AI CORE • v.2.6" } },
    { id: "blueprint",        name: "Blueprint Matrix",  className: "wp-blueprint",         accent: "#00F0FF", category: "Tech",      typo: { main: "OMNIVERSE", line2: "OS", sub: "SYSTEM SCHEMATIC // 2026" } },
    { id: "quantum-horizon",  name: "Quantum Horizon",   className: "wp-quantum-horizon",   accent: "#00F0FF", category: "Sci-Fi",    typo: { main: "OMNIVERSE\u00A0OS", sub: "QUANTUM HORIZON" } },
    { id: "ai-nexus",         name: "AI Nexus",          className: "wp-ai-nexus",          accent: "#00F0FF", category: "Tech",      typo: { main: "OMNIVERSE", line2: "OS", sub: "NEURAL NEXUS" } },

    // ─── New Collection ───────────────────────────────────────────────────────
    { id: "void-matrix",      name: "Void Matrix",       className: "wp-void-matrix",       accent: "#39FF14", category: "Cyber Grid", typo: { main: "OMNIVERSE\u00A0OS", sub: "VOID PROTOCOL" } },
    { id: "neon-grid",        name: "Neon Grid",         className: "wp-neon-grid",         accent: "#C778DD", category: "Cyber Grid", typo: { main: "OMNIVERSE", line2: "OS", sub: "NEON GRID // 2026" } },
    { id: "dark-matter",      name: "Dark Matter",       className: "wp-dark-matter",       accent: "#C778DD", category: "Space",      typo: { main: "OMNIVERSE\u00A0OS", sub: "DARK MATTER" } },
    { id: "holographic",      name: "Holographic",       className: "wp-holographic",       accent: "#00F0FF", category: "Abstract",   typo: { main: "OMNIVERSE\u00A0OS", sub: "HOLOGRAPHIC" } },
    { id: "cyber-pulse",      name: "Cyber Pulse",       className: "wp-cyber-pulse",       accent: "#FF003C", category: "Abstract",   typo: { main: "OMNIVERSE", line2: "OS", sub: "PULSE ACTIVE" } },
    { id: "midnight-circuit", name: "Midnight Circuit",  className: "wp-midnight-circuit",  accent: "#00F0FF", category: "Tech",      typo: { main: "OMNIVERSE\u00A0OS", sub: "CIRCUIT // ONLINE" } },
    { id: "aurora-code",      name: "Aurora Code",       className: "wp-aurora-code",       accent: "#39FF14", category: "Abstract",   typo: { main: "OMNIVERSE\u00A0OS", sub: "AURORA PROTOCOL" } },
    { id: "plasma-field",     name: "Plasma Field",      className: "wp-plasma-field",      accent: "#C778DD", category: "Abstract",   typo: { main: "OMNIVERSE\u00A0OS", sub: "PLASMA FIELD" } },
    { id: "nebula-dark",      name: "Nebula Dark",       className: "wp-nebula-dark",       accent: "#C778DD", category: "Space",      typo: { main: "OMNIVERSE", line2: "OS", sub: "NEBULA SECTOR" } },
    { id: "chrome-void",      name: "Chrome Void",       className: "wp-chrome-void",       accent: "#94A3B8", category: "Minimal",    typo: { main: "OMNIVERSE\u00A0OS", sub: "CHROME EDITION" } },
    { id: "quantum-dark",     name: "Quantum Dark",      className: "wp-quantum-dark",      accent: "#00F0FF", category: "Sci-Fi",     typo: { main: "OMNIVERSE\u00A0OS", sub: "QUANTUM DARK" } },
    { id: "obsidian-hex",     name: "Obsidian Hex",      className: "wp-obsidian-hex",      accent: "#FF003C", category: "Night",      typo: { main: "OMNIVERSE\u00A0OS", sub: "OBSIDIAN // HEX" } },
    { id: "ghost-signal",     name: "Ghost Signal",      className: "wp-ghost-signal",      accent: "#94A3B8", category: "Minimal",    typo: { main: "OMNIVERSE\u00A0OS", sub: "SIGNAL VOID" } },
    { id: "signal-wave",      name: "Signal Wave",       className: "wp-signal-wave",       accent: "#00F0FF", category: "Abstract",   typo: { main: "OMNIVERSE\u00A0OS", sub: "SIGNAL WAVE" } },
    { id: "dark-fiber",       name: "Dark Fiber",        className: "wp-dark-fiber",        accent: "#39FF14", category: "Night",      typo: { main: "OMNIVERSE\u00A0OS", sub: "DARK FIBER" } },
    { id: "stellar-map",      name: "Stellar Map",       className: "wp-stellar-map",       accent: "#FCEE09", category: "Space",      typo: { main: "OMNIVERSE\u00A0OS", sub: "STELLAR CHART" } },
    { id: "cyber-storm",      name: "Cyber Storm",       className: "wp-cyber-storm",       accent: "#FF003C", category: "Night",      typo: { main: "OMNIVERSE", line2: "OS", sub: "STORM PROTOCOL" } },
    { id: "vector-space",     name: "Vector Space",      className: "wp-vector-space",      accent: "#00F0FF", category: "Minimal",    typo: { main: "OMNIVERSE\u00A0OS", sub: "VECTOR" } },
    { id: "grid-zero",        name: "Grid Zero",         className: "wp-grid-zero",         accent: "#39FF14", category: "Minimal",    typo: { main: "OMNIVERSE\u00A0OS", sub: "GRID ZERO" } },
    { id: "abyss",            name: "Abyss",             className: "wp-abyss",             accent: "#C778DD", category: "Night",      typo: { main: "OMNIVERSE\u00A0OS", sub: "ABYSS" } },
  ];

  export const DEFAULT_WALLPAPER = "neural-core";

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
    if (hour >= 5 && hour < 9)  return "aurora-code";
    if (hour >= 9 && hour < 17) return "blueprint";
    if (hour >= 17 && hour < 20) return "cyber-pulse";
    return "abyss";
  };
  