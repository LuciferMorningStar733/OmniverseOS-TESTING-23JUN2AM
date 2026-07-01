/**
 * appNames.js — Static app ID → display name registry
 *
 * Intentionally has ZERO imports so it can be safely imported by any module
 * without creating circular dependencies.
 *
 * cortexContext.js imports this instead of apps.js to break the cycle:
 *   AIChat → cortexContext → apps → (lazy) AIChat   ← TDZ in production
 *
 * When you add a new app to apps.js, add its name here too.
 */

export const APP_NAMES = {
  dashboard:  "Dashboard",
  chat:       "AI Chat",
  image:      "Image Gen",
  voice:      "Cortex",
  memory:     "Memory",
  notes:      "Notes",
  tasks:      "Tasks",
  calendar:   "Calendar",
  clipboard:  "Clipboard",
  music:      "Music",
  videos:     "Videos",
  watchlist:  "Watchlist",
  files:      "Files",
  code:       "Code",
  browser:    "Browser",
  settings:   "Settings",
  finance:    "Finance",
  analytics:  "Analytics",
  nebula:     "Nebula Chat",
};

/**
 * Returns the human-readable app name for an app ID.
 * Falls back to the raw ID if the app is unknown.
 *
 * @param {string|null} id - App ID (e.g. "voice", "chat")
 * @returns {string|null}
 */
export function getAppName(id) {
  if (!id) return null;
  return APP_NAMES[id] || id;
}
