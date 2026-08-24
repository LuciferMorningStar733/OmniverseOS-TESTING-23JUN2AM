/**
 * WindowTileEngine.js — PC-Grade Window Snapping & Tiling Helper
 * OmniverseOS Desktop Engine
 */

export function getScreenBounds() {
  const topBarHeight = 38;
  const dockHeight = 70;
  const w = window.innerWidth;
  const h = window.innerHeight - topBarHeight - dockHeight;
  return { topBarHeight, dockHeight, w, h };
}

export function tileLeft() {
  const { topBarHeight, w, h } = getScreenBounds();
  return { x: 8, y: topBarHeight + 8, w: Math.floor(w / 2) - 12, h: h - 16 };
}

export function tileRight() {
  const { topBarHeight, w, h } = getScreenBounds();
  return { x: Math.floor(w / 2) + 4, y: topBarHeight + 8, w: Math.floor(w / 2) - 12, h: h - 16 };
}

export function tileTopLeft() {
  const { topBarHeight, w, h } = getScreenBounds();
  const halfW = Math.floor(w / 2) - 12;
  const halfH = Math.floor(h / 2) - 12;
  return { x: 8, y: topBarHeight + 8, w: halfW, h: halfH };
}

export function tileTopRight() {
  const { topBarHeight, w, h } = getScreenBounds();
  const halfW = Math.floor(w / 2) - 12;
  const halfH = Math.floor(h / 2) - 12;
  return { x: Math.floor(w / 2) + 4, y: topBarHeight + 8, w: halfW, h: halfH };
}

export function tileBottomLeft() {
  const { topBarHeight, w, h } = getScreenBounds();
  const halfW = Math.floor(w / 2) - 12;
  const halfH = Math.floor(h / 2) - 12;
  return { x: 8, y: topBarHeight + Math.floor(h / 2) + 4, w: halfW, h: halfH };
}

export function tileBottomRight() {
  const { topBarHeight, w, h } = getScreenBounds();
  const halfW = Math.floor(w / 2) - 12;
  const halfH = Math.floor(h / 2) - 12;
  return { x: Math.floor(w / 2) + 4, y: topBarHeight + Math.floor(h / 2) + 4, w: halfW, h: halfH };
}

export function tileMaximize() {
  const { topBarHeight, w, h } = getScreenBounds();
  return { x: 8, y: topBarHeight + 8, w: w - 16, h: h - 16 };
}
