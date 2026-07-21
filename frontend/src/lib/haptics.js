// ============================================================
// OmniverseOS — Sentient Haptic Engine
// Web Vibration API wrapper for mobile tactile feedback
// ============================================================

/**
 * Trigger a short haptic pulse on supported mobile devices.
 * Uses the Web Vibration API (navigator.vibrate).
 * Silently no-ops on desktop / unsupported browsers.
 *
 * @param {number} [duration=40] - Vibration duration in milliseconds
 */
export const triggerHaptic = (duration = 40) => {
  if (typeof navigator !== 'undefined' && navigator.vibrate) {
    navigator.vibrate(duration);
  }
};

/**
 * Trigger a double-tap haptic (for confirmations / destructive actions).
 */
export const triggerHapticDouble = () => {
  if (typeof navigator !== 'undefined' && navigator.vibrate) {
    navigator.vibrate([30, 60, 30]);
  }
};
