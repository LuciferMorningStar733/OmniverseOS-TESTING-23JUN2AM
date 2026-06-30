# OmniverseOS — Staff Engineer Code Review & Refactor

**Date**: 2026-06-21
**Scope**: Quality-only audit. No features added.
**Tests**: Backend 13/13 pass · Frontend smoke verified.

---

## Findings & Resolutions

### Security

| Sev | Issue | Resolution |
|-----|-------|------------|
| 🔴 High | `CORSMiddleware` used `allow_origins=["*"]` with `allow_credentials=True`. Browsers silently reject credentialed requests with wildcard origins — also bad practice. | Split logic in `server.py`: when `CORS_ORIGINS=*`, use `allow_origin_regex=".*"`; otherwise honour the explicit list. |
| 🟠 Med | `JWT_SECRET` defaulted to a hard-coded dev secret. | Now reads `JWT_SECRET → EMERGENT_LLM_KEY → static fallback`. Still has a fallback (to keep dev frictionless), but prod can override cleanly. |
| 🟠 Med | No size caps on AI chat / image-gen inputs → token-abuse vector. | Added `Field(max_length=…)` on `ChatReq.message`, `ChatReq.system`, `ChatReq.session_id`, `ImageGenReq.prompt`. |
| 🟠 Med | `provider`/`model` were free-form strings → user could request any model. | Added `ALLOWED_MODELS` whitelist and `_validate_model()` enforced on both chat endpoints. |
| 🟡 Low | Signup had TOCTOU race (find_one → insert_one). | Created **unique index on `users.email`** in startup hook; wrapped insert in try/except returning a clean 400. |

### Architecture

| Issue | Resolution |
|-------|------------|
| Dead imports (`status`, `Any`, `List`) in `server.py`. | Removed. |
| No DB indexes → linear scans on every list/history call. | Added compound indexes `(user_id, created_at)` on six collections and `(user_id, session_id, created_at)` on `chat_messages`. |
| `@app.on_event("shutdown")` is deprecated FastAPI API. | Kept (works on installed version) — flagged for future migration to `lifespan` context manager. |

### Race Conditions

| Location | Bug | Fix |
|----------|-----|-----|
| `apps/Voice.js` `r.onend` | `transcript` captured by closure was always the empty initial value, so the first voice query sent `""` to the LLM. Also possible double-start race. | Added `transcriptRef` (mutable) and `startedRef` (guard). Added `onerror` handler. Wrapped `r.start()` in try/catch. |
| `context/OSContext.js` `openApp` / `focusWindow` | `zCounter` read from closure → rapid consecutive opens could assign **identical z-indexes**, breaking window stacking. | Switched to functional `setZCounter((z) => z+1)` and stored result in a local before applying to `setWindows`. Removed `zCounter` from dependency arrays. |

### Memory Leaks

| Location | Leak | Fix |
|----------|------|-----|
| `apps/AIChat.js` streaming | Closing the Chat window mid-stream left the `fetch` reader running; `setMessages` called on unmounted component → React warning + memory retention. | Added `mountedRef`, `abortRef = new AbortController()` per request. `chatStream` API now accepts a `signal` and releases reader in `finally`. Aborts on unmount. |
| `apps/Dashboard.js`, `components/TopBar.js` `setInterval` | Already had `clearInterval` cleanup. ✓ | No change. |

### Performance

- DB indexes (above) eliminate the only realistic backend bottleneck for v1.
- `OSContext` persists window-state to localStorage on every change. For v1 with ≤18 windows this is sub-millisecond; flagged but not throttled.
- `Window.js` uses Framer Motion's `drag` with `dragMomentum={false}` and updates state only on `onDragEnd` — already optimal.

### Unused / Dead Code

- Removed 3 unused Python imports.
- Removed 1 unused `eslint-disable` in `CodeEditor.js`, 1 in `Desktop.js`.
- Shadcn UI components in `/components/ui/` are unused but kept by template convention; they're tree-shaken from the production bundle and ignored by lint.

### Circular Dependencies

None found. Module graph:
```
App → OSContext → api.js
App → Desktop → {Window, Dock, TopBar, CommandPalette, NotificationCenter} → OSContext
App → apps/* → {api.js, OSContext (none import each other)}
lib/apps.js → apps/* (one-way)
```

---

## Files Changed

**Backend** (1):
- `backend/server.py` — CORS, JWT defaults, model whitelist, input caps, indexes, signup race, dead imports.

**Frontend** (5):
- `frontend/src/apps/Voice.js` — stale-closure race, double-start guard, onerror.
- `frontend/src/apps/AIChat.js` — abort controller, mount guard.
- `frontend/src/apps/Notes.js` — useCallback for `load`, fixed exhaustive-deps warning.
- `frontend/src/apps/CodeEditor.js` — removed unused eslint-disable.
- `frontend/src/components/Desktop.js` — fixed useEffect deps.
- `frontend/src/context/OSContext.js` — z-counter race fix via functional updater.
- `frontend/src/lib/api.js` — `chatStream` accepts `signal`, releases reader in finally.

---

## Verification

```
Backend pytest:  13 passed in 14.69s
Python lint:     No errors
JS lint (src):   No errors (shadcn ui ignored by config)
E2E smoke:       login → dashboard → open 3 windows rapidly → all stacked correctly
```

## Not Addressed (Out of Scope — Feature work)

- Rate limiting on AI endpoints (would require middleware/Redis).
- Move `server.py` (~500 LOC) into `routers/` packages.
- Replace deprecated `@app.on_event` with `lifespan`.
- Persist Music player audio.
- Drag-resize for windows.
