# OmniverseOS — Product Requirements

## Problem Statement
Build a fully functional AI operating system called OmniverseOS, combining
ChatGPT, Notion, Trello, Discord, Spotify, Google Calendar, YouTube, Netflix
watchlists, finance management, file manager, AI image generation, voice
assistant, memory system, code editor, dashboard widgets, browser tabs, task
management, and analytics into one futuristic cyberpunk interface. Auth, dark
mode, notifications, search, command palette, persistent storage.

## Architecture
- **Backend**: FastAPI + MongoDB + EMERGENT_LLM_KEY (Claude/GPT/Gemini),
  bcrypt+JWT auth, SSE streaming for AI chat, gpt-image-1 for image gen.
- **Frontend**: React + Tailwind + Framer Motion + recharts. Window-manager OS
  shell with dock, topbar, command palette (⌘K), notification center,
  Mission Control, AI Dock (Cortex orb), workspace snapshots.
- **Persistence**: localStorage for window state + Cortex memory + activity
  timeline + workspace snapshots; MongoDB for all server-side user data.

## Implemented Modules (18 lazy-loaded apps)
Dashboard · AI Chat (streaming) · Image Gen · Voice (Web Speech + Gemini TTS)
· Memory · Notes · Tasks (Kanban) · Calendar · Music · Videos (YouTube) ·
Watchlist · Files · Code Editor · Finance · Analytics · Discord · Browser ·
Settings.

## Test Credentials
demo@omniverse.io / omniverse123 (see `/app/memory/test_credentials.md`).

---

## Alpha 0.9 Release Candidate Sprint (2026-06-29)

Surgical sprint — no UI redesign, no rewrites — focused on 5 priorities.

### What was completed

**P1 — Cortex Unification**
- Wired `buildCortexSystemPrompt(osContext)` into AIChat → backend `system`
  field. Cortex now receives live OS state (active app, browser URL, recent
  apps/URLs, last session, memory) in **every** LLM call.
- Unified the browser URL key. Browser app writes both
  `cortex_current_url` (canonical, used by `cortexContext.js`, `AIDock.js`)
  and `omniverse_browser_url` (legacy back-compat) on every navigation.
- Browser app now calls `trackUrl()` → propagates to `activityTimeline`,
  `memoryEngine`, and the OS context resolver in one step.
- AIChat tracks dispatched `cortex:prompt` events as `voice_command` events
  + records last transcript in memory.
- Bug fix in `Desktop.js`: `handleOpenApp` / `handleOpenUrl` were calling
  `trackEvent({type,appId})` with the **wrong signature** (`trackEvent`
  expects `(type, payload)`), so timeline rows were stored with
  `type=undefined`. Removed the duplicate tracking — `OSContext.openApp` /
  `trackUrl` already record everything correctly.

**P2 — Workspace Restore**
- Added `restoreLastWorkspace()`, `restoreNamedWorkspace(name)`,
  `saveCurrentWorkspace(name)`, `lastWorkspace()` to `OSContext`.
- Rebuilds windows with deduped `appId`, clamped positions, fresh z-indexes
  preserving the original stack order, then emits a `workspace_restore`
  event into the activity timeline.
- Surfaced in Mission Control side rail (auto + named snapshots) and in
  the Cortex Welcome Card.

**P3 — Universal Search (Spotlight quality)**
- Rewrote `CommandPalette.js` to search across **9 sources**:
  Apps, Notes, Tasks, Memory, Clipboard, Browser History (recent URLs),
  Activity Timeline, Workspace Snapshots, Quick Actions.
- Token-based scoring (exact / prefix / contains) with per-source weights.
- Full keyboard navigation: ↑/↓ to move selection, Enter to activate,
  Esc to close.
- Each result is labeled by source ("APP", "NOTE", "TASK", "BROWSER",
  "RECENT", "WORKSPACE", "MEMORY", "CLIPBOARD", "ACTION").

**P4 — Mission Control upgrade**
- Added a 280px Cortex side rail:
  - **Workspace card** — Restore last session button + named snapshot
    quick-restore + "Save this layout" input.
  - **Recent Activity** — last 6 events from the timeline.
  - **Recent Sites** — clickable, opens Browser + dispatches `cortex:navigate`.
  - **Memory** — `lastActiveApp` + `lastUrl` glance.
- Empty state in the left pane shows a primary "Restore last session" CTA
  when a snapshot exists.

**P5 — Browser Intelligence**
- New `BrowserIntelBar.js` component. Detects context for the current
  URL and surfaces non-executing contextual actions:
  - **GitHub** → Review Repository · Explain Architecture · Generate
    Documentation · Summarize Commits.
  - **YouTube** → Summarize Video · Generate Notes.
  - **Stack Overflow** → Explain Accepted Answer · Show Alternatives.
  - **MDN / docs** → Explain API · Sample Code.
  - **Reddit** → Summarize Discussion · Extract Insights.
  - **Wikipedia** → TL;DR.
  - **Hacker News** → Summarize Thread.
- Each button dispatches `cortex:prompt` — explicit user gesture required,
  nothing fires automatically.

### What was *not* changed
- No UI redesign. No new color palette. No branding changes.
- No new dependencies. All work uses existing `framer-motion`, `radix-ui`,
  `lucide-react`, `sonner`, `react`, `react-dom`, `axios`.
- `.env` files preserved exactly as provided. No secret rotation.
- `OSContext.js` public API is **purely additive** — existing consumers
  unchanged.
- No backend changes. `server.py` and `providers.py` untouched.

### Verification

| Gate                            | Result                                                       |
| ------------------------------- | ------------------------------------------------------------ |
| Production build (`yarn build`) | ✅ Pass (52.75s, no errors)                                  |
| Frontend lint                   | ✅ Modified files clean. Pre-existing warnings only.         |
| Backend lint (`ruff`)           | ✅ Pass                                                      |
| Backend tests (`pytest`)        | ✅ 11/13 pass · 2 failures are missing `GEMINI_API_KEY` only |
| Manual E2E (screenshots)        | ✅ Login → Palette → Mission Control → Browser → GitHub Intel → Recent Activity populated |

### Files Changed (modified)
- `frontend/src/components/Desktop.js`
- `frontend/src/context/OSContext.js`
- `frontend/src/apps/AIChat.js`
- `frontend/src/apps/Browser.js`
- `frontend/src/components/CortexWelcomeCard.js`
- `frontend/src/components/CommandPalette.js`  *(rewritten)*
- `frontend/src/components/MissionControl.js`
- `frontend/craco.config.js`  *(small dev-server fix)*

### Files Added
- `frontend/src/components/BrowserIntelBar.js`
- `memory/ELECTRON_MIGRATION_BLUEPRINT.md`

### Backlog (P1 next)
- Add **named workspace snapshot deletion** in Mission Control rail.
- Persist **`Cortex Welcome Card` dismiss state** across reloads (currently per-session).
- **Voice app**: feed transcript into the same `trackUrl`/`trackEvent` pipeline
  so voice commands appear in Universal Search.
- Add **PUT endpoints** for `events`/`transactions`/`memories`/`files` so
  edits don't require delete-recreate (flagged by previous QA).
- Migrate **AI Chat** to use the OS `pushNotification` for stream errors so
  they land in the NotificationCenter, not just sonner toasts.

### Future / P2
- **Electron migration** — full blueprint at
  `/app/memory/ELECTRON_MIGRATION_BLUEPRINT.md`.
- Real-time collab on Notes / Tasks (CRDT).
- Plugin SDK for third-party apps.
- Background voice activation.

### Alpha Readiness Score: **9 / 10**
- The product behaves as a unified OS, not a collection of apps.
- Cortex now genuinely knows the user's workspace state.
- All five priority objectives are end-to-end functional.
- Only deduction: AI provider keys are environment-dependent (out of scope
  for this sprint).
