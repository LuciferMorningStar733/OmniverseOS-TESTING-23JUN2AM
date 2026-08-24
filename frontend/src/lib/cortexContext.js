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
import { getActivePersona } from "./cortexPersonas";
import { cortexScheduler } from "./cortexScheduler";
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
  
  // ── Active persona preamble ────────────────────────────────────────────────
  const persona = getActivePersona();
  let prompt = `${persona.preamble}\n\n`;
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
  
  // ── Active persona reminder ────────────────────────────────────────────────
  prompt += `\n=== YOUR ROLE ===\n`;
  prompt += `Active persona: ${persona.name}\n`;
  prompt += `- Be concise, helpful, and creative\n`;
  prompt += `- Reference the user's current context naturally\n`;
  prompt += `- Suggest actions based on what's open or recent\n`;
  prompt += `- When the user says "open X" or "search Y", acknowledge it briefly\n`;
  prompt += `- Stay in character for the "${persona.name}" persona\n`;

  // ── Active Scheduler Jobs ─────────────────────────────────────────────────
  const scheduledJobs = cortexScheduler.listJobs();
  if (scheduledJobs.length > 0) {
    prompt += `\n=== ACTIVE SCHEDULED REMINDERS (do NOT re-schedule these) ===\n`;
    for (const job of scheduledJobs) {
      const remaining = cortexScheduler.formatRemaining(job);
      const recur = job.recur !== "none" ? ` [${job.recur}]` : "";
      prompt += `- "${job.title}" fires in ${remaining}${recur} (id: ${job.id})\n`;
    }
  }

  // ── P9: CMD tag instructions ───────────────────────────────────────────────
  prompt += `\n=== OS ACTIONS (CMD TAGS) ===\n`;
  prompt += `Embed machine-readable CMD tags INLINE in your response to trigger real OS actions. Tags are stripped before display — the user never sees them.\n\n`;
  prompt += `Tag syntax:\n`;
  prompt += `  [CMD:OPEN_APP:appId]                                          — open an OS app\n`;
  prompt += `  [CMD:CLOSE_APP:appId]                                         — close an OS app\n`;
  prompt += `  [CMD:FOCUS_APP:appId]                                         — focus/bring an app to the foreground\n`;
  prompt += `  [CMD:OPEN_URL:https://...]                                    — open a URL in the browser\n`;
  prompt += `  [CMD:SCHEDULE:{"id":"<uid>","title":"<text>","delay_ms":<ms>,"recur":"none|daily|weekly"}]  — schedule a reminder\n\n`;
  prompt += `Valid app IDs: chat, notes, tasks, calendar, files, music, videos, browser, settings, dashboard, analytics, finance, code, image, voice, memory, clipboard, watchlist, nebula\n\n`;
  prompt += `Usage rules:\n`;
  prompt += `  - Embed the tag inline with your reply. Example: "Sure, opening Notes! [CMD:OPEN_APP:notes]"\n`;
  prompt += `  - Only emit CMD tags when ACTUALLY performing the action — not hypothetically.\n`;
  prompt += `  - One tag per action. Multiple actions = multiple tags.\n`;
  prompt += `  - For reminders: convert natural language time to delay_ms. "in 2 hours" = 7200000. "tomorrow morning" ≈ ms until 9am next day.\n`;
  prompt += `  - id for SCHEDULE must be a short unique slug (e.g. "remind-call-john-1").\n`;
  prompt += `  - Do NOT schedule something already in the ACTIVE SCHEDULED REMINDERS list above.\n`;

  return prompt;
}

export default {
  assembleCortexContext,
  buildCortexSystemPrompt,
};
