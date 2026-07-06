---
name: OmniverseOS Phase 1 Intelligence Layer
description: What was pre-existing vs. newly built in Phase 1; repo structure, key integration patterns
---

## Pre-existing (already built before Phase 1 started)
- Priority 5 (Morning Briefing): `MorningBriefing.js` + `nightAgent.js` + wired in `Desktop.js`
- Priority 6 (Ghost Draft): `GhostTextArea.js` + `useGhostWriter.js` + integrated in `Notes.js`
- Basic `CortexTimeline.js` (local activity only, no backend)

## Newly built in Phase 1
- **P1 Conversation Archaeology**: `POST /api/ai/search/conversations` (regex + Gemini reranking); `ChatSessionSidebar.js` deep search panel (triggers at ≥3 chars)
- **P2 Project DNA**: `POST/GET/PATCH/DELETE /api/projects` → `project_dna` collection; `ProjectDNA.js` full app (Overview/Goals/Decisions/Settings tabs)
- **P3 Decision Memory**: `POST/GET/PATCH/DELETE /api/decisions` → `decisions` collection; embedded in ProjectDNA Decisions tab
- **P4 Cortex Timeline**: `POST/GET/DELETE /api/timeline` → `timeline_events` collection; `TimelineApp.js` (merges server + local events, day-grouped)
- **P7 Cortex Interrupts**: `GET /api/ai/interrupts/check` (Gemini Flash Lite, rate-limited 4/min); `CortexInterrupts.js` (8-min interval, 45s auto-dismiss, silenced in focus mode)
- **P8 Focus Tunnel**: `FocusTunnel.js` (picker→active→summary phases, Ctrl+Shift+F toggle, Gemini post-focus reflection)

## Key integration points
- New apps registered in `frontend/src/lib/apps.js` with `group: "ai"`
- `Desktop.js` imports and renders `CortexInterrupts` + `FocusTunnel`; `focusActive` state gates both
- `om:open-focus` custom event allows external triggers for Focus Tunnel
- All backend routes use `user=Depends(get_current_user)` — no public endpoints

## Intelligence API client
`frontend/src/lib/intelligenceApi.js` — central client for all Phase 1 endpoints:
- `conversationSearchApi.search(query, limit)`
- `projectsApi.{list, create, get, update, remove}`
- `decisionsApi.{list, create, update, remove}`
- `timelineApi.{list, log, remove}`
- `interruptsApi.check()`

**Why:** All Phase 1 endpoints are grouped here to keep `api.js` focused on core AI/auth/CRUD and avoid bloat.

## MongoDB collections added
- `project_dna`: indexed on `(user_id, updated_at)` and `id` (unique)
- `decisions`: indexed on `(user_id, created_at)`, `(user_id, project_id)`, `id` (unique)
- `timeline_events`: indexed on `(user_id, created_at)`, `(user_id, project_id)`, `id` (unique)
- Lifespan function in `server.py` creates all indexes on startup
