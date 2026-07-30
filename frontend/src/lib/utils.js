import { clsx } from "clsx";
import { twMerge } from "tailwind-merge";

export function cn(...inputs) {
  return twMerge(clsx(inputs));
}

/** Clamp a number between min and max (inclusive). */
export function clamp(val, min, max) {
  return Math.min(max, Math.max(min, val));
}

/**
 * Format a timestamp as a locale time string.
 * @param {number|string|Date} ts
 * @returns {string} e.g. "2:34 PM"
 */
export function formatTime(ts) {
  const d = new Date(typeof ts === "number" ? ts : ts);
  return d.toLocaleTimeString("en-US", { hour: "numeric", minute: "2-digit" });
}
