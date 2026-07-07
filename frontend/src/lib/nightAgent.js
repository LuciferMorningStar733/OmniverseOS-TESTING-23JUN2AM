/**
 * nightAgent.js — Cortex overnight autonomous analysis
 *
 * Runs when the user returns after ≥ 3 hours away.
 * Reads their notes, tasks, and calendar — calls Gemini —
 * returns a structured morning briefing they can act on.
 *
 * Nothing is committed or sent without user approval.
 */
import { crud, aiApi } from "./api";

const LS_LAST_SEEN  = "omniverse_last_seen";
const LS_BRIEF      = "omniverse_night_brief";
const AWAY_THRESHOLD_MS = 3 * 60 * 60 * 1000; // 3 hours

/* ── Timestamp helpers ──────────────────────────────────────────────────── */
export function stampLastSeen() {
  try { localStorage.setItem(LS_LAST_SEEN, Date.now().toString()); } catch {}
}

export function getLastSeen() {
  try { return parseInt(localStorage.getItem(LS_LAST_SEEN) || "0", 10); } catch { return 0; }
}

export function shouldRunNightAgent() {
  const last = getLastSeen();
  if (!last) return false; // first ever visit — don't brief
  return (Date.now() - last) >= AWAY_THRESHOLD_MS;
}

export function clearNightBrief() {
  try { localStorage.removeItem(LS_BRIEF); } catch {}
}

export function getStoredBrief() {
  try {
    const raw = localStorage.getItem(LS_BRIEF);
    return raw ? JSON.parse(raw) : null;
  } catch { return null; }
}

function storeNightBrief(brief) {
  try { localStorage.setItem(LS_BRIEF, JSON.stringify(brief)); } catch {}
}

/* ── Gap-aware greeting ──────────────────────────────────────────────────── */
function buildGreeting(gapMs) {
  const h = gapMs / 3_600_000;
  const hour = new Date().getHours();
  const tod = hour < 12 ? "morning" : hour < 18 ? "afternoon" : "evening";
  if (h >= 20) return `Good ${tod}. I worked while you were away.`;
  if (h >= 10) return `Welcome back. Here's what I prepared for you.`;
  return `You were gone for ${Math.round(h)} hours. I put the time to use.`;
}

/* ── Core agent ─────────────────────────────────────────────────────────── */
/**
 * Run the night agent.
 * @param {object} opts
 * @param {function} opts.onStatus   — called with status string while running
 * @returns {Promise<object|null>}   — brief object or null if nothing to report
 */
export async function runNightAgent({ onStatus } = {}) {
  onStatus?.("Reading your notes…");

  // Fetch all three data sources in parallel — silently ignore failures
  const [notes, tasks, events] = await Promise.all([
    crud("notes").list().catch(() => []),
    crud("tasks").list().catch(() => []),
    crud("events").list().catch(() => []),
  ]);

  const now    = new Date();
  const gapMs  = Date.now() - getLastSeen();
  const todayStr = now.toISOString().slice(0, 10);

  // Filter to what's relevant
  const recentNotes = notes
    .filter(n => n.content && n.content.trim().length > 40)
    .slice(0, 6);

  const openTasks = tasks.filter(t => t.status !== "done");

  const overdueTasks = tasks.filter(t => {
    if (t.status === "done" || !t.due_date) return false;
    return new Date(t.due_date) < now;
  });

  const upcomingEvents = events.filter(e => {
    const d = e.date || e.start_date || e.datetime;
    if (!d) return false;
    const eDate = new Date(d);
    const diff = eDate - now;
    return diff > 0 && diff < 24 * 60 * 60 * 1000; // next 24h
  });

  // If there's genuinely nothing to work with, skip
  if (recentNotes.length === 0 && openTasks.length === 0 && upcomingEvents.length === 0) {
    return null;
  }

  onStatus?.("Cortex is thinking…");

  // Build the prompt
  const notesBlock = recentNotes.map(n =>
    `NOTE "${n.title || "Untitled"}":\n${n.content.slice(0, 400)}`
  ).join("\n\n");

  const tasksBlock = openTasks.slice(0, 8).map(t =>
    `- [${t.status}] ${t.title}${t.due_date ? ` (due: ${t.due_date})` : ""}`
  ).join("\n");

  const eventsBlock = upcomingEvents.slice(0, 5).map(e =>
    `- ${e.title} at ${e.time || e.start_time || "TBD"}`
  ).join("\n");

  const prompt =
    `You are Cortex, the AI inside OmniverseOS. The user was away for ${Math.round(gapMs / 3_600_000)} hours. ` +
    `You analysed their data overnight and must now deliver a morning briefing.\n\n` +
    `Return ONLY valid JSON — no markdown, no explanation outside the JSON.\n\n` +
    `FORMAT:\n` +
    `{\n` +
    `  "greeting": "one sentence max",\n` +
    `  "items": [\n` +
    `    {\n` +
    `      "type": "insight|prep|warning|action",\n` +
    `      "icon": "fa-solid fa-ICON_NAME",\n` +
    `      "title": "short title",\n` +
    `      "body": "2-3 sentence specific insight. Be concrete, reference real content.",\n` +
    `      "urgency": "high|normal|low"\n` +
    `    }\n` +
    `  ]\n` +
    `}\n\n` +
    `ICON GUIDE: insights→fa-lightbulb, calendar→fa-calendar-check, ` +
    `overdue→fa-triangle-exclamation, action→fa-bolt, note→fa-note-sticky\n\n` +
    `RULES:\n` +
    `- Maximum 4 items. Quality over quantity.\n` +
    `- Each item must reference SPECIFIC content from their actual data.\n` +
    `- "warning" type for overdue tasks. "prep" type for upcoming events.\n` +
    `- "insight" type for patterns or action items extracted from notes.\n` +
    `- Do not invent data. Only use what is provided.\n` +
    `- Be direct and useful, not cheerful or verbose.\n\n` +
    (notesBlock  ? `NOTES:\n${notesBlock}\n\n`    : "") +
    (tasksBlock  ? `TASKS:\n${tasksBlock}\n\n`    : "") +
    (eventsBlock ? `TODAY:\n${eventsBlock}\n\n`   : "") +
    (overdueTasks.length ? `OVERDUE: ${overdueTasks.length} task(s) past deadline.\n` : "");

  try {
    const res = await aiApi.chat({
      session_id: `night-agent-${todayStr}`,
      message: prompt,
      provider: "gemini",
      model: "gemini-2.0-flash",
    });

    // Parse response — strip any accidental markdown fences
    const raw = (res?.response || res?.message || "").trim()
      .replace(/^```json\s*/i, "").replace(/```\s*$/i, "");

    const parsed = JSON.parse(raw);

    const brief = {
      greeting: parsed.greeting || buildGreeting(gapMs),
      items:    (parsed.items || []).slice(0, 4),
      gapMs,
      generatedAt: Date.now(),
    };

    storeNightBrief(brief);
    return brief;
  } catch {
    // JSON parse or API failure — return a minimal brief from raw data
    const fallbackItems = [];

    if (overdueTasks.length > 0) {
      fallbackItems.push({
        type: "warning",
        icon: "fa-solid fa-triangle-exclamation",
        title: `${overdueTasks.length} overdue task${overdueTasks.length > 1 ? "s" : ""}`,
        body: overdueTasks.slice(0, 3).map(t => t.title).join(", "),
        urgency: "high",
      });
    }
    if (upcomingEvents.length > 0) {
      fallbackItems.push({
        type: "prep",
        icon: "fa-solid fa-calendar-check",
        title: `${upcomingEvents.length} event${upcomingEvents.length > 1 ? "s" : ""} today`,
        body: upcomingEvents.slice(0, 3).map(e => e.title).join(", "),
        urgency: "normal",
      });
    }

    if (fallbackItems.length === 0) return null;

    const brief = {
      greeting: buildGreeting(gapMs),
      items: fallbackItems,
      gapMs,
      generatedAt: Date.now(),
    };
    storeNightBrief(brief);
    return brief;
  }
}
