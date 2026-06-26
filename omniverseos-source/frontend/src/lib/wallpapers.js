// Iconic wallpapers — handcrafted scenes, each with integrated OMNIVERSE OS branding.
// id used in localStorage; className applied to wp-base layer.
export const WALLPAPERS = [
  {
    id: "neural-core",
    name: "Neural Core",
    className: "wp-neural-core",
    accent: "#00F0FF",
    typo: { main: "OMNIVERSE\u00A0OS", sub: "AI CORE • v.2.6" },
  },
  {
    id: "blueprint",
    name: "Blueprint Matrix",
    className: "wp-blueprint",
    accent: "#00F0FF",
    typo: { main: "OMNIVERSE", line2: "OS", sub: "SYSTEM SCHEMATIC // 2026" },
  },
  {
    id: "quantum-horizon",
    name: "Quantum Horizon",
    className: "wp-quantum-horizon",
    accent: "#00F0FF",
    typo: { main: "OMNIVERSE\u00A0OS", sub: "QUANTUM HORIZON" },
  },
  {
    id: "ai-nexus",
    name: "AI Nexus",
    className: "wp-ai-nexus",
    accent: "#00F0FF",
    typo: { main: "OMNIVERSE", line2: "OS", sub: "NEURAL NEXUS" },
  },
];

export const DEFAULT_WALLPAPER = "neural-core";

export const getWallpaper = (id) =>
  WALLPAPERS.find((w) => w.id === id) || WALLPAPERS[0];
