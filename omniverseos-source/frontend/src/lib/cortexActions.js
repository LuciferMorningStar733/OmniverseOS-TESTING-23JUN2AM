import { crud } from "./api";

// ── URL map ────────────────────────────────────────────────────────────────
const URL_MAP = {
  youtube:          "https://www.youtube.com",
  gmail:            "https://mail.google.com",
  google:           "https://www.google.com",
  github:           "https://github.com",
  reddit:           "https://www.reddit.com",
  twitter:          "https://www.twitter.com",
  x:                "https://www.x.com",
  telegram:         "https://web.telegram.org",
  nebula:           "https://discord.com/app",
  netflix:          "https://www.netflix.com",
  spotify:          "https://open.spotify.com",
  wikipedia:        "https://en.wikipedia.org",
  amazon:           "https://www.amazon.com",
  weather:          "https://www.google.com/search?q=weather+today",
  news:             "https://news.google.com",
  maps:             "https://maps.google.com",
  instagram:        "https://www.instagram.com",
  linkedin:         "https://www.linkedin.com",
  notion:           "https://www.notion.so",
  figma:            "https://www.figma.com",
  stackoverflow:    "https://stackoverflow.com",
  mdn:              "https://developer.mozilla.org",
  producthunt:      "https://www.producthunt.com",
  hackernews:       "https://news.ycombinator.com",
  twitch:           "https://www.twitch.tv",
  tiktok:           "https://www.tiktok.com",
  pinterest:        "https://www.pinterest.com",
  drive:            "https://drive.google.com",
  // multi-word aliases
  "mdn docs":          "https://developer.mozilla.org",
  "stack overflow":    "https://stackoverflow.com",
  "hacker news":       "https://news.ycombinator.com",
  "google maps":       "https://maps.google.com",
  "google drive":      "https://drive.google.com",
  "speech api":        "https://developer.mozilla.org/en-US/docs/Web/API/Web_Speech_API",
  "web speech api":    "https://developer.mozilla.org/en-US/docs/Web/API/Web_Speech_API",
};

// ── Internal app ID map ────────────────────────────────────────────────────
const INTERNAL_APP_MAP = {
  "ai chat":        "chat",
  "chat":           "chat",
  "cortex":         "chat",
  "assistant":      "chat",
  "ai assistant":   "chat",
  "notes":          "notes",
  "note":           "notes",
  "tasks":          "tasks",
  "task":           "tasks",
  "task board":     "tasks",
  "kanban":         "tasks",
  "todo":           "tasks",
  "to do":          "tasks",
  "to-do":          "tasks",
  "roadmap":        "tasks",
  "calendar":       "calendar",
  "schedule":       "calendar",
  "events":         "calendar",
  "agenda":         "calendar",
  "files":          "files",
  "file manager":   "files",
  "file explorer":  "files",
  "music":          "music",
  "music player":   "music",
  "videos":         "videos",
  "video player":   "videos",
  "browser":        "browser",
  "web browser":    "browser",
  "web":            "browser",
  "internet":       "browser",
  "settings":       "settings",
  "setting":        "settings",
  "preferences":    "settings",
  "dashboard":      "dashboard",
  "home":           "dashboard",
  "desktop":        "dashboard",
  "main screen":    "dashboard",
  "analytics":      "analytics",
  "finance":        "finance",
  "money":          "finance",
  "wallet":         "finance",
  "code":           "code",
  "code editor":    "code",
  "editor":         "code",
  "image":          "image",
  "image gen":      "image",
  "image generator":"image",
  "ai image":       "image",
  "voice":          "voice",
  "voice assistant":"voice",
  "memory":         "memory",
  "clipboard":      "clipboard",
  "watchlist":      "watchlist",
  "watch list":     "watchlist",
  "nebula":         "nebula",
  "nebula chat":    "nebula",
  "weather":        "browser",
};

// ── Search engine builders ─────────────────────────────────────────────────
const SEARCH_ENGINES = {
  google:        (q) => `https://www.google.com/search?q=${encodeURIComponent(q)}`,
  youtube:       (q) => `https://www.youtube.com/results?search_query=${encodeURIComponent(q)}`,
  github:        (q) => `https://github.com/search?q=${encodeURIComponent(q)}`,
  reddit:        (q) => `https://www.reddit.com/search?q=${encodeURIComponent(q)}`,
  wikipedia:     (q) => `https://en.wikipedia.org/wiki/Special:Search?search=${encodeURIComponent(q)}`,
  amazon:        (q) => `https://www.amazon.com/s?k=${encodeURIComponent(q)}`,
  stackoverflow: (q) => `https://stackoverflow.com/search?q=${encodeURIComponent(q)}`,
  twitter:       (q) => `https://www.twitter.com/search?q=${encodeURIComponent(q)}`,
  x:             (q) => `https://www.x.com/search?q=${encodeURIComponent(q)}`,
  twitch:        (q) => `https://www.twitch.tv/search?term=${encodeURIComponent(q)}`,
  mdn:           (q) => `https://developer.mozilla.org/en-US/search?q=${encodeURIComponent(q)}`,
  "stack overflow": (q) => `https://stackoverflow.com/search?q=${encodeURIComponent(q)}`,
};

// Maps a URL's domain to a SEARCH_ENGINES key for context-aware search
const DOMAIN_TO_ENGINE = {
  "youtube.com":              "youtube",
  "github.com":               "github",
  "reddit.com":               "reddit",
  "en.wikipedia.org":         "wikipedia",
  "amazon.com":               "amazon",
  "stackoverflow.com":        "stackoverflow",
  "twitter.com":              "twitter",
  "x.com":                    "x",
  "twitch.tv":                "twitch",
  "developer.mozilla.org":    "mdn",
};

function engineFromUrl(url) {
  try {
    const host = new URL(url).hostname.replace(/^www\./, "");
    return DOMAIN_TO_ENGINE[host] || "google";
  } catch { return "google"; }
}

// ── Date & time parsers ────────────────────────────────────────────────────
const MONTHS = {
  january: 0, jan: 0,
  february: 1, feb: 1,
  march: 2, mar: 2,
  april: 3, apr: 3,
  may: 4,
  june: 5, jun: 5,
  july: 6, jul: 6,
  august: 7, aug: 7,
  september: 8, sep: 8, sept: 8,
  october: 9, oct: 9,
  november: 10, nov: 10,
  december: 11, dec: 11,
};

function parseDateString(str) {
  if (!str) return null;
  const s = str.toLowerCase().trim();
  const today = new Date();

  if (s === "today")     return today.toISOString().slice(0, 10);
  if (s === "yesterday") { const d = new Date(today); d.setDate(d.getDate() - 1); return d.toISOString().slice(0, 10); }
  if (s === "tomorrow")  { const d = new Date(today); d.setDate(d.getDate() + 1); return d.toISOString().slice(0, 10); }
  if (s === "next week") { const d = new Date(today); d.setDate(d.getDate() + 7); return d.toISOString().slice(0, 10); }
  if (s.startsWith("next ")) {
    const days = ["sunday","monday","tuesday","wednesday","thursday","friday","saturday"];
    const idx = days.indexOf(s.slice(5).trim());
    if (idx !== -1) {
      const d = new Date(today);
      const diff = (idx - d.getDay() + 7) % 7 || 7;
      d.setDate(d.getDate() + diff);
      return d.toISOString().slice(0, 10);
    }
  }

  // "July 12", "July 12th", "12 July", "12th July"
  const mD = s.match(/([a-z]+)\s+(\d{1,2})(?:st|nd|rd|th)?/);
  if (mD && MONTHS[mD[1]] !== undefined) {
    return new Date(today.getFullYear(), MONTHS[mD[1]], parseInt(mD[2])).toISOString().slice(0, 10);
  }
  const dM = s.match(/(\d{1,2})(?:st|nd|rd|th)?\s+([a-z]+)/);
  if (dM && MONTHS[dM[2]] !== undefined) {
    return new Date(today.getFullYear(), MONTHS[dM[2]], parseInt(dM[1])).toISOString().slice(0, 10);
  }

  const d = new Date(str);
  if (!isNaN(d.getTime())) return d.toISOString().slice(0, 10);
  return null;
}

function parseTimeString(str) {
  if (!str) return "09:00";
  const s = str.toLowerCase().replace(/\s+/g, "");
  const m = s.match(/^(\d{1,2})(?::(\d{2}))?\s*(am|pm)?$/);
  if (!m) return "09:00";
  let h = parseInt(m[1]);
  const min = m[2] ? parseInt(m[2]) : 0;
  if (m[3] === "pm" && h < 12) h += 12;
  else if (m[3] === "am" && h === 12) h = 0;
  return `${String(h).padStart(2, "0")}:${String(min).padStart(2, "0")}`;
}

// ── Fuzzy title matching for task/event lookup ─────────────────────────────
function fuzzyMatch(items, query) {
  if (!query || !items?.length) return null;
  const q = query.toLowerCase().trim();
  return (
    items.find(i => i.title?.toLowerCase() === q) ||
    items.find(i => i.title?.toLowerCase().includes(q)) ||
    items.find(i => q.includes(i.title?.toLowerCase())) ||
    null
  );
}

// ── Extract actions from a single normalised segment ───────────────────────
function extractFromSegment(seg, context = {}) {
  const s   = seg.toLowerCase().trim();
  const raw = seg.trim();
  const actions = [];

  // Helper: resolve a target string against internal app map or URL map
  const resolveTarget = (target) => {
    const t = target.trim().replace(/\s+/g, " ");
    if (INTERNAL_APP_MAP[t]) return { type: "open_app", appId: INTERNAL_APP_MAP[t], label: t };
    for (const [key, url] of Object.entries(URL_MAP)) {
      if (t === key || t.startsWith(key + " ") || t.endsWith(" " + key) || t.includes(key)) {
        return { type: "open_url", url, label: key };
      }
    }
    return null;
  };

  // ── OPEN ──────────────────────────────────────────────────────────────────
  const openM = s.match(/(?:open|launch|go to|start|show me|bring up|navigate to)\s+(?:the\s+)?(.+?)(?:\s*$|\s*,|\s+and\b|\s+then\b)/);
  if (openM) {
    const resolved = resolveTarget(openM[1]);
    if (resolved) actions.push(resolved);
  }

  // ── CLOSE ─────────────────────────────────────────────────────────────────
  const closeM = s.match(/(?:close|exit|quit|hide|kill)\s+(?:the\s+)?(.+?)(?:\s*$|\s*,|\s+and\b|\s+then\b)/);
  if (closeM) {
    const t = closeM[1].trim().replace(/\s+/g, " ");
    if (INTERNAL_APP_MAP[t]) {
      actions.push({ type: "close_app", appId: INTERNAL_APP_MAP[t], label: t });
    }
  }

  // ── MINIMIZE ──────────────────────────────────────────────────────────────
  const minM = s.match(/(?:minimize|minimise|collapse|hide in taskbar)\s+(?:the\s+)?(.+?)(?:\s*$|\s*,|\s+and\b|\s+then\b)/);
  if (minM) {
    const t = minM[1].trim().replace(/\s+/g, " ");
    if (INTERNAL_APP_MAP[t]) {
      actions.push({ type: "minimize_app", appId: INTERNAL_APP_MAP[t], label: t });
    }
  }

  // ── FOCUS / SWITCH TO ─────────────────────────────────────────────────────
  const focusM = s.match(/(?:switch to|focus|activate|return to|jump to)\s+(?:the\s+)?(.+?)(?:\s*$|\s*,|\s+and\b|\s+then\b)/);
  if (focusM) {
    const t = focusM[1].trim().replace(/\s+/g, " ");
    if (INTERNAL_APP_MAP[t]) {
      actions.push({ type: "focus_app", appId: INTERNAL_APP_MAP[t], label: t });
    }
  }

  // ── SEARCH ────────────────────────────────────────────────────────────────
  // "search youtube for Family Guy" / "search YouTube Family Guy"
  const sm1 = s.match(/search\s+([a-z ]+?)\s+(?:for\s+)?(.+?)(?:\s*$)/);
  // "search for X on YouTube" / "look up X" / "find X on github"
  const sm2 = s.match(/(?:search\s+(?:for\s+)?|look up\s+|find\s+)(.+?)(?:\s+on\s+([a-z ]+?))?(?:\s*$)/);
  // "play Family Guy on YouTube"
  const pm  = s.match(/play\s+(.+?)\s+(?:on\s+)?(?:youtube|videos?)(?:\s*$)/);

  if (sm1 && SEARCH_ENGINES[sm1[1].toLowerCase().trim()]) {
    const eng = sm1[1].toLowerCase().trim();
    const q   = sm1[2].trim();
    actions.push({ type: "open_url", url: SEARCH_ENGINES[eng](q), label: `Search ${eng}: ${q}` });
  } else if (sm2) {
    const q   = sm2[1].trim();
    const eng = sm2[2]?.toLowerCase().trim();
    const builder = (eng && SEARCH_ENGINES[eng]) ? SEARCH_ENGINES[eng]
      : (context.lastUrl ? (SEARCH_ENGINES[engineFromUrl(context.lastUrl)] || SEARCH_ENGINES.google)
      : SEARCH_ENGINES.google);
    actions.push({ type: "open_url", url: builder(q), label: `Search: ${q}` });
  }
  if (pm) {
    actions.push({ type: "open_url", url: SEARCH_ENGINES.youtube(pm[1].trim()), label: `Play: ${pm[1]}` });
  }

  // ── ADD CALENDAR EVENT ────────────────────────────────────────────────────
  // "add tomorrow at 8pm as Watch Family Guy"
  // "add July 12 as Blackbaud joining"
  const calWithTime = s.match(/add\s+(.+?)\s+at\s+(\d{1,2}(?::\d{2})?\s*(?:am|pm)?)\s+as\s+(.+?)(?:\s*$)/);
  const calPlain    = !calWithTime && s.match(/add\s+(.+?)\s+as\s+(.+?)(?:\s*$)/);

  if (calWithTime) {
    const date = parseDateString(calWithTime[1].trim());
    if (date) {
      const title = calWithTime[3].trim();
      actions.push({ type: "add_event", title, date, time: parseTimeString(calWithTime[2].trim()), label: `Event: ${title}` });
    }
  } else if (calPlain) {
    const date = parseDateString(calPlain[1].trim());
    if (date) {
      const title = calPlain[2].trim();
      actions.push({ type: "add_event", title, date, time: "09:00", label: `Event: ${title}` });
    }
  }

  // ── ADD TASK ──────────────────────────────────────────────────────────────
  // "add X to my todo list" / "add X to roadmap" etc.
  const addTaskRe = /add\s+(?:"([^"]+)"|(.+?))\s+to\s+(?:my\s+)?(?:todo|tasks?|to-do|to do|roadmap|task list|omniverseos\s+(?:todo|roadmap|tasks?)|the\s+(?:todo|task|roadmap))(?:\s*$)/;
  const addTaskM  = s.match(addTaskRe);
  if (addTaskM && !calWithTime && !calPlain) {
    const title = (addTaskM[1] || addTaskM[2]).trim();
    actions.push({ type: "add_task", title, label: `Task: ${title}` });
  }
  // "create task X" / "create a new todo X"
  const createM = s.match(/(?:create|new)\s+(?:a\s+)?(?:new\s+)?(?:task|todo|to-do)\s+(?:"([^"]+)"|(.+?))(?:\s*$)/);
  if (createM && !addTaskM) {
    const title = (createM[1] || createM[2]).trim();
    actions.push({ type: "add_task", title, label: `Task: ${title}` });
  }

  // ── COMPLETE TASK ─────────────────────────────────────────────────────────
  // "mark X complete" / "complete X" / "set X as done"
  const completeM = s.match(/(?:mark|set|complete|finish|check off)\s+(?:"([^"]+)"|(.+?))\s+(?:as\s+)?(?:complete|done|finished)(?:\s*$)/);
  if (completeM) {
    const title = (completeM[1] || completeM[2]).trim();
    actions.push({ type: "complete_task", title, label: `Done: ${title}` });
  }

  // ── DELETE TASK ───────────────────────────────────────────────────────────
  const delTaskM = !completeM && s.match(/(?:delete|remove)\s+(?:the\s+)?(?:task\s+)?(?:"([^"]+)"|(.+?))(?:\s+from\s+(?:tasks?|todo|roadmap))?(?:\s*$)/);
  if (delTaskM && !s.includes("event") && !calWithTime && !calPlain) {
    const title = (delTaskM[1] || delTaskM[2]).trim();
    if (title.length > 1) {
      actions.push({ type: "delete_task", title, label: `Delete task: ${title}` });
    }
  }

  // ── DELETE EVENT ──────────────────────────────────────────────────────────
  const delEventM = s.match(/(?:delete|remove|cancel)\s+(?:the\s+)?(?:event\s+)?(?:"([^"]+)"|(.+?))(?:\s+from\s+(?:calendar|schedule|events?))?(?:\s*$)/);
  if (delEventM && (s.includes("event") || s.includes("calendar") || s.includes("schedule"))) {
    const title = (delEventM[1] || delEventM[2]).trim();
    actions.push({ type: "delete_event", title, label: `Delete event: ${title}` });
  }

  return actions;
}

// ── Public: parse full text into ordered action list ──────────────────────
export function parseActions(text, context = {}) {
  if (!text?.trim()) return [];

  // Pronoun resolution using session context
  let resolved = text;
  if (context.lastUrl && /\b(it|that|there|this)\b/i.test(text)) {
    try {
      const host = new URL(context.lastUrl).hostname.replace(/^www\./, "");
      resolved = resolved.replace(/\b(it|that|there|this)\b/gi, host);
    } catch { /* ignore */ }
  }

  // Split on natural conjunctions / sequencers
  const segments = resolved
    .replace(/[.!?]+/g, " . ")
    .split(/\band\b|\bthen\b|\balso\b|\bafter that\b|\bnext\b|\bfirst\b/i)
    .map(s => s.replace(/^\s*[.,]\s*/, "").trim())
    .filter(Boolean);

  const all = [];
  for (const seg of segments) all.push(...extractFromSegment(seg, context));
  // Full sentence pass catches cross-segment patterns
  all.push(...extractFromSegment(resolved, context));

  // Deduplicate by serialised key
  const seen = new Set();
  return all.filter(a => {
    const k = JSON.stringify(a);
    if (seen.has(k)) return false;
    seen.add(k);
    return true;
  });
}

// ── Public: human-readable summary of executed actions ────────────────────
export function buildActionSummary(results) {
  const ok = results.filter(r => r.success);
  if (!ok.length) return null;

  return ok.map(r => {
    const a = r.action;
    switch (a.type) {
      case "open_app":      return `opened ${a.label || a.appId}`;
      case "open_url":      return `navigated to ${a.label || a.url}`;
      case "close_app":     return `closed ${a.label || a.appId}`;
      case "minimize_app":  return `minimized ${a.label || a.appId}`;
      case "focus_app":     return `switched to ${a.label || a.appId}`;
      case "add_task":      return `added task "${a.title}"`;
      case "complete_task": return `marked "${a.title}" as done`;
      case "delete_task":   return `deleted task "${a.title}"`;
      case "add_event": {
        const timeStr = a.time && a.time !== "09:00" ? ` at ${a.time}` : "";
        return `added event "${a.title}" on ${a.date}${timeStr}`;
      }
      case "delete_event":  return `deleted event "${a.title}"`;
      default:              return a.type.replace(/_/g, " ");
    }
  }).join(", ");
}

// ── Public: execute a list of actions ─────────────────────────────────────
export async function executeActions(actions, osContext = {}) {
  const { openApp, closeWindow, focusWindow, minimize, windows = [] } = osContext;
  const results = [];

  for (const action of actions) {
    try {
      switch (action.type) {

        // ── Open app ────────────────────────────────────────────────────────
        case "open_app":
          if (openApp) openApp(action.appId);
          results.push({ action, success: true });
          break;

        // ── Open URL in browser app ──────────────────────────────────────
        case "open_url":
          window.dispatchEvent(new CustomEvent("cortex:navigate", { detail: { url: action.url } }));
          if (openApp) openApp("browser");
          else window.open(action.url, "_blank", "noopener,noreferrer");
          results.push({ action, success: true });
          break;

        // ── Close app ────────────────────────────────────────────────────
        case "close_app": {
          const win = windows.find(w => w.app === action.appId);
          if (win && closeWindow) {
            closeWindow(win.id);
            results.push({ action, success: true });
          } else {
            results.push({ action, success: false, error: `${action.appId} is not open` });
          }
          break;
        }

        // ── Minimize app ─────────────────────────────────────────────────
        case "minimize_app": {
          const win = windows.find(w => w.app === action.appId && !w.minimized);
          if (win && minimize) {
            minimize(win.id);
            results.push({ action, success: true });
          } else {
            results.push({ action, success: false, error: `${action.appId} is not open or already minimized` });
          }
          break;
        }

        // ── Focus / switch to app ────────────────────────────────────────
        case "focus_app": {
          const win = windows.find(w => w.app === action.appId);
          if (win && focusWindow) {
            focusWindow(win.id);
            results.push({ action, success: true });
          } else if (openApp) {
            // App not open — open it
            openApp(action.appId);
            results.push({ action, success: true });
          } else {
            results.push({ action, success: false, error: "Window manager unavailable" });
          }
          break;
        }

        // ── Add task ─────────────────────────────────────────────────────
        case "add_task":
          await crud("tasks").create({
            title: action.title,
            status: "todo",
            priority: "medium",
            description: "",
          });
          results.push({ action, success: true });
          break;

        // ── Complete task ────────────────────────────────────────────────
        case "complete_task": {
          const tasks = await crud("tasks").list();
          const t = fuzzyMatch(tasks, action.title);
          if (t) {
            await crud("tasks").update(t.id, { ...t, status: "done" });
            results.push({ action: { ...action, title: t.title }, success: true });
          } else {
            results.push({ action, success: false, error: `Task "${action.title}" not found` });
          }
          break;
        }

        // ── Delete task ──────────────────────────────────────────────────
        case "delete_task": {
          const tasks = await crud("tasks").list();
          const t = fuzzyMatch(tasks, action.title);
          if (t) {
            await crud("tasks").remove(t.id);
            results.push({ action: { ...action, title: t.title }, success: true });
          } else {
            results.push({ action, success: false, error: `Task "${action.title}" not found` });
          }
          break;
        }

        // ── Add event ────────────────────────────────────────────────────
        case "add_event":
          await crud("events").create({
            title: action.title,
            date:  action.date,
            time:  action.time || "09:00",
            color: "#00F0FF",
            description: "",
          });
          results.push({ action, success: true });
          break;

        // ── Delete event ─────────────────────────────────────────────────
        case "delete_event": {
          const events = await crud("events").list();
          const ev = fuzzyMatch(events, action.title);
          if (ev) {
            await crud("events").remove(ev.id);
            results.push({ action: { ...action, title: ev.title }, success: true });
          } else {
            results.push({ action, success: false, error: `Event "${action.title}" not found` });
          }
          break;
        }

        default:
          results.push({ action, success: false, error: `Unknown action type: ${action.type}` });
      }
    } catch (err) {
      results.push({ action, success: false, error: err.message });
    }
  }

  return results;
}
