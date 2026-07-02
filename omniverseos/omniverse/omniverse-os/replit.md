# OmniverseOS

A cyberpunk-themed web-based desktop OS with a FastAPI backend, React frontend, AI chat (multi-provider), voice interface, browser, notes, tasks, and a widget system.

## Run & Operate

- Frontend (CRA/CRACO): `cd frontend && yarn start` (port 3000)
- Backend (FastAPI): `cd backend && uvicorn server:app --reload` (port 8000)
- Backend needs `.env` with `MONGO_URL`, `DB_NAME`, `GEMINI_API_KEY`, `JWT_SECRET`
- Frontend needs `REACT_APP_BACKEND_URL=http://localhost:8000` (or empty for same-origin)

## Stack

- **Frontend**: React 18 (CRA/CRACO), Tailwind CSS, Framer Motion 11, Radix UI (full suite), FontAwesome (CDN), sonner (toasts)
- **Backend**: FastAPI (Python), MongoDB (motor async), multi-provider AI (Gemini, Groq, Cerebras, OpenRouter)
- **Auth**: JWT (bcrypt hash, 7-day expiry)
- **AI**: Streaming SSE with automatic model fallback (Flash → Flash Lite → error)

## Where things live

```
frontend/src/
  apps/          — AIChat, Voice, Browser, Notes, Tasks, Finance, Calendar, Files, Images, Clipboard
  components/    — Desktop, Dock, Window, TopBar, LockScreen, MarkdownRenderer, …
  widgets/       — WidgetCanvas, WidgetShell, WidgetManagerContext, widgetRegistry, widgets/
  lib/           — api.js (DO NOT EDIT), cortexActions.js (DO NOT EDIT), wallpapers, apps
  hooks/         — useOS, useBreakpoint, useMobilePrefs
  context/       — OSContext.js (DO NOT EDIT)
  styles/        — wallpapers.css, responsive.css
backend/
  server.py (DO NOT EDIT)
  providers.py (DO NOT EDIT)
```

## Architecture decisions

- **Contract-first AI**: `api.js` owns all AI resilience (retry, fallback, timeout) — UI code calls `aiApi.chatStreamResilient` only.
- **Markdown rendered client-side**: `MarkdownRenderer.js` is a custom zero-dependency inline parser that handles all GitHub-flavoured markdown without adding react-markdown to the bundle.
- **Emotion-aware TTS**: `Voice.js` detects emotion from AI response text and adjusts speech `pitch`/`rate`/`volume` accordingly; chunks long text for natural pauses and Chrome stall resilience.
- **Radix Select in AI Chat**: The model selector uses `@radix-ui/react-select` (already in the bundle) instead of a native `<select>`, matching the OS aesthetic.
- **Ambient desktop layer**: Desktop renders a `<canvas>` (pointer-events-none, z-index 1) with drifting particles and a subtle grid — disabled on mobile for performance.
- **Dock bounce**: `useAnimate` (framer-motion 11) drives a multi-keyframe spring bounce on every app launch.
- **Window focus ring**: Active window border uses the app's own accent color (not a fixed cyan).
- **Never modify**: `OSContext.js`, `api.js`, `cortexActions.js`, `providers.py`, `server.py`, `apps.js`, `TopBar.js`, `AuthScreen.js`.

## Product

- Desktop OS with a wallpaper engine, widget canvas, floating windows, and mobile-adaptive layout
- AI assistant (Cortex) with streaming responses, model selector, markdown rendering, and voice input
- Voice interface with emotion-aware speech synthesis (gender + emotional prosody)
- Browser with iframe embedding, history, quick-links, and a polished blocked-site panel
- Notes, Tasks, Finance, Calendar, Files, Images, Clipboard, Settings apps

## User preferences

- Surgical edits only — never rewrite files that aren't part of the improvement plan
- Preserve all `data-testid` attributes for regression testing
- No new packages unless absolutely necessary (yarn install times out at 60s)
- CSS-only hover reveals preferred over ref-based DOM manipulation

## Gotchas

- `yarn add` times out in this environment (>60s) — use existing deps (`@radix-ui/*`, `framer-motion`, `sonner`)
- `pnpm run dev` / root-level dev scripts don't work — use the Replit workflow system
- `useAnimate` requires framer-motion ≥ 10.16 — available at 11.18.0 ✓
- Radix Select portal renders outside React tree — needs `z-index: 9999` on `[data-radix-popper-content-wrapper]` (done in index.css)
- Voice `speechSynthesis.getVoices()` is async on Chrome — must wait for `voiceschanged` event
- Chrome TTS stall bug: long utterances need a `setInterval(() => synth.resume(), 10000)` workaround
- WidgetCanvas/WidgetShell/etc. live in `src/widgets/`, not `src/components/`
