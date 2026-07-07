/**
 * cortexContext.js — Unified OS Context Assembler
 * OmniverseOS Cortex Intelligence Layer
 * 
 * Builds comprehensive OS context for AI system prompts.
 * Aggregates live state from:
 *   - activityTimeline (recent apps, URLs)
 *   - memoryEngine (lastActiveApp, lastUrl, clipboard)
 *   - workspaceSnapshot (window count, last session)
 *   - OSContext (open windows, active app)
 * 
 * Target execution: <5ms
 * Zero network calls. Pure read-only aggregation.
 */

import { getRecentApps, getRecentUrls, getTimeline } from "./activityTimeline";
import { memGet } from "./memoryEngine";
import { getAutoSnapshot } from "./workspaceSnapshot";
import { getAppName } from "./appNames";
// NOTE: do NOT import from "./apps" here — apps.js lazy-imports AI apps (AIChat, Voice, etc.)
// which statically import this file, creating a circular dependency that causes
// "Cannot access '...' before initialization" TDZ crashes in production builds.
// Use ./appNames instead (zero imports, pure static map).

const CORTEX_URL_KEY = "cortex_current_url"; // Unified localStorage key

/**
 * Assembles full OS context for AI system prompts.
 * 
 * @param {Object} osContext - OSContext from useOS()
 * @param {Array} osContext.windows - Open windows
 * @param {string} osContext.activeId - Active window ID
 * @returns {Object} Structured OS context
 */
export function assembleCortexContext(osContext = {}) {
  const { windows = [], activeId = null } = osContext;
  
  // ── Active window detection ──────────────────────────────────────────────
  const activeWindow = windows.find(w => w.id === activeId) || null;
  const activeAppId = activeWindow?.app || null;
  const activeAppName = getAppName(activeAppId);
  
  // ── Browser URL (unified key) ─────────────────────────────────────────────
  const browserUrl = localStorage.getItem(CORTEX_URL_KEY) || null;
  
  // ── Recent activity from activityTimeline ──────────────────────────────────
  const recentApps = getRecentApps(5).map(id => getAppName(id));
  const recentUrls = getRecentUrls(3);
  
  // ── Workspace snapshot ────────────────────────────────────────────────────
  const autoSnap = getAutoSnapshot();
  
  // ── Memory (last active, last URL) ─────────────────────────────────────────
  const lastActiveApp = memGet("lastActiveApp", null);
  const lastUrl = memGet("lastUrl", null);
  const lastTranscript = memGet("lastTranscript", null);
  const lastTranscriptTime = memGet("lastTranscriptTime", null);
  
  // ── Timeline summary (last 10 events) ──────────────────────────────────────
  const timeline = getTimeline(10);
  
  // ── Open windows summary ────────────────────────────────────────────────────
  const openApps = windows.map(w => getAppName(w.app));
  
  return {
    // Current state
    activeApp: activeAppName,
    activeAppId,
    browserUrl,
    openApps,
    windowCount: windows.length,
    
    // Recent activity
    recentApps,
    recentUrls,
    
    // Last actions
    lastActiveApp,
    lastUrl,
    lastTranscript,
    lastTranscriptTime,
    
    // Workspace
    lastSession: autoSnap.hasSnapshot ? {
      apps: autoSnap.appIds,
      windowCount: autoSnap.windowCount,
      savedAt: autoSnap.savedAt,
    } : null,
    
    // Timeline
    recentEvents: timeline.map(e => ({
      type: e.type,
      ts: e.ts,
      appId: e.appId,
      url: e.url,
    })),
  };
}

/**
 * Generates AI system prompt with live OS context.
 * 
 * @param {Object} osContext - OSContext from useOS()
 * @returns {string} System prompt text
 */
export function buildCortexSystemPrompt(osContext = {}) {
  const ctx = assembleCortexContext(osContext);
  const now = new Date();
  const timeStr = now.toLocaleTimeString("en-US", { hour: "numeric", minute: "2-digit", hour12: true });
  const dateStr = now.toLocaleDateString("en-US", { weekday: "long", month: "long", day: "numeric" });

  // ── User location (stored by AIChat on mount via Geolocation API + Nominatim) ──
  const userLocation = (() => {
    try {
      const raw = localStorage.getItem("cortex_user_location");
      return raw ? JSON.parse(raw) : null;
    } catch { return null; }
  })();
  
  let prompt = `You are OmniverseOS Cortex — a friendly, witty cyberpunk AI assistant living inside an operating system.\n\n`;
  prompt += `Current time: ${timeStr}, ${dateStr}\n`;
  if (userLocation?.city) {
    const loc = [userLocation.city, userLocation.region, userLocation.country].filter(Boolean).join(", ");
    prompt += `User location: ${loc}\n`;
    prompt += `Always tailor answers to this region (prices, availability, local brands, variants) unless the user specifies otherwise.\n`;
  }
  prompt += `\n`;
  
  // ── Current state ──────────────────────────────────────────────────────────
  prompt += `=== CURRENT OS STATE ===\n`;
  if (ctx.activeApp) {
    prompt += `Active app: ${ctx.activeApp}\n`;
  }
  if (ctx.browserUrl) {
    prompt += `Browser: ${ctx.browserUrl}\n`;
  }
  if (ctx.windowCount > 0) {
    prompt += `Open apps (${ctx.windowCount}): ${ctx.openApps.join(", ")}\n`;
  } else {
    prompt += `No apps currently open.\n`;
  }
  
  // ── Recent activity ────────────────────────────────────────────────────────
  if (ctx.recentApps.length > 0 || ctx.recentUrls.length > 0) {
    prompt += `\n=== RECENT ACTIVITY ===\n`;
    if (ctx.recentApps.length > 0) {
      prompt += `Recently used: ${ctx.recentApps.join(", ")}\n`;
    }
    if (ctx.recentUrls.length > 0) {
      prompt += `Recently visited: ${ctx.recentUrls.map(u => {
        try { return new URL(u).hostname.replace(/^www\\./, ""); }
        catch { return u.slice(0, 40); }
      }).join(", ")}\n`;
    }
  }
  
  // ── Last session ────────────────────────────────────────────────────────────
  if (ctx.lastSession) {
    const elapsed = Date.now() - ctx.lastSession.savedAt;
    const mins = Math.floor(elapsed / 60000);
    const timeAgo = mins < 60 ? `${mins}m ago` : `${Math.floor(mins / 60)}h ago`;
    prompt += `\n=== LAST SESSION ===\n`;
    prompt += `${ctx.lastSession.windowCount} windows were open ${timeAgo}: ${ctx.lastSession.apps.join(", ")}\n`;
  }
  
  // ── Behavioral guidelines ──────────────────────────────────────────────────
  prompt += `\n=== YOUR ROLE ===\n`;
  prompt += `- Be concise, helpful, and creative\n`;
  prompt += `- Reference the user's current context naturally\n`;
  prompt += `- Suggest actions based on what's open or recent\n`;
  prompt += `- When the user says "open X" or "search Y", acknowledge it briefly\n`;
  prompt += `- Maintain a friendly, slightly witty cyberpunk persona\n`;

  // ── P9: CMD tag instructions ───────────────────────────────────────────────
  prompt += `\n=== APP LAUNCHER (CMD TAGS) ===\n`;
  prompt += `When the user asks you to open, close, switch to, or navigate somewhere, embed a machine-readable CMD tag INLINE in your response text. The tag is stripped before display — the user never sees it.\n\n`;
  prompt += `Tag syntax:\n`;
  prompt += `  [CMD:OPEN_APP:appId]        — open an OS app\n`;
  prompt += `  [CMD:CLOSE_APP:appId]       — close an OS app\n`;
  prompt += `  [CMD:FOCUS_APP:appId]       — focus/bring an app to the foreground\n`;
  prompt += `  [CMD:OPEN_URL:https://...]  — open a URL in the browser\n\n`;
  prompt += `Valid app IDs: chat, notes, tasks, calendar, files, music, videos, browser, settings, dashboard, analytics, finance, code, image, voice, memory, clipboard, watchlist, nebula\n\n`;
  prompt += `Usage rules:\n`;
  prompt += `  - Embed the tag inline with your reply. Example: "Sure, opening Notes for you! [CMD:OPEN_APP:notes]"\n`;
  prompt += `  - Only emit a CMD tag when you are ACTUALLY performing the action — not in hypothetical, informational, or conditional answers.\n`;
  prompt += `  - One tag per action. If the user asks to open multiple things, emit one tag per app/URL.\n`;
  prompt += `  - For web searches or external sites, use OPEN_URL with a full URL rather than OPEN_APP:browser.\n`;

  return prompt;
}

export default {
  assembleCortexContext,
  buildCortexSystemPrompt,
};
