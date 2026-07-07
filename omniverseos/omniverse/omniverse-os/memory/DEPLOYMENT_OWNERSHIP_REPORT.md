# OmniverseOS — Deployment Ownership Report

**Audit date:** 2026-06-29 · **Scope:** /app (full codebase) · **Verdict:** ✅ FULLY OWNED — no Emergent/Replit runtime dependency.

---

## 1. Findings

| Concern | Status | Detail |
|---|---|---|
| Hardcoded API keys | ✅ None | grep for `sk-…`, `AIza…`, `gsk_…`, `csk-…`, `or-…` returned 0 results |
| Emergent LLM key / `emergentintegrations` | ✅ None | not imported, not in `requirements.txt` |
| Replit secrets | ✅ None | `.replit` is config-only (run button); no secret refs |
| Sandbox-only tokens | ✅ None | none found |
| Placeholder credentials | ✅ None | only `JWT_SECRET` dev-fallback (you MUST set in prod, see §3) |
| Hardcoded localhost in src | ✅ None | only `MONGO_URL=mongodb://localhost:27017` inside `backend/.env` (your local dev default, override in prod) |
| Hardcoded preview URLs in src | ✅ Cleaned this audit | removed `unified-ai-hub-32.preview.emergentagent.com` fallback from `backend/tests/test_backend.py` |
| Dead emergent testid constant | ✅ Cleaned this audit | removed `home-emergent-link` from `frontend/src/constants/testIds/home.js` |
| Temporary OAuth / email / webhook / CDN providers | ✅ None | none configured |
| Temporary file storage / buckets | ✅ None | all files persisted in your MongoDB |
| Temporary session secrets | ✅ None except `JWT_SECRET` fallback (see §3) |
| `replit.com` reference | ℹ️ Product data only | `contextResolver.js` lists `replit.com` alongside `vercel.com`/`netlify.com` as known dev hosts — not a dependency |

### AI providers verified unchanged
Reading from your env vars only, via `backend/providers.py`:
- ✅ **Gemini** → `GEMINI_API_KEY`
- ✅ **DeepSeek** → `DEEPSEEK_API_KEY`
- ✅ **Groq** → `GROQ_API_KEY`
- ✅ **Cerebras** → `CEREBRAS_API_KEY`
- ✅ **OpenRouter** → `OPENROUTER_API_KEY`

OpenAI is **not** wired in `providers.py` (image-gen uses Gemini's `imagen` path through `GEMINI_API_KEY`). If you want OpenAI as a sixth provider, that's a code addition — currently not present.

### Auth / DB / Hosting
- ✅ MongoDB via `MONGO_URL` (your value)
- ✅ FastAPI app `backend/server.py` — unchanged this sprint
- ✅ Vercel config `vercel.json` — points to `frontend/` only, pnpm + CRA build (your project)
- ✅ Render — no `render.yaml` shipped (you provision manually, see §3)
- ✅ Auth flow: pure JWT + bcrypt in `server.py`. **No Emergent / Replit identity provider.**
- ✅ Demo credentials `demo@omniverse.io / omniverse123` — created via your own `/api/auth/signup`, no external IdP

### .env audit
- `/app/backend/.env` — preserved **byte-for-byte** as you provided. Contains: `MONGO_URL`, `DB_NAME`, `CORS_ORIGINS`. No keys.
- `/app/frontend/.env` — preserved. Contains: `REACT_APP_BACKEND_URL`, `WDS_SOCKET_PORT`, `ENABLE_HEALTH_CHECK`.

The current `REACT_APP_BACKEND_URL` points at the Emergent preview pod purely because **that's where the sandbox runs**. On Vercel you set it to your Render backend URL (see §3). No code change needed.

---

## 2. Every environment variable in use

| Variable | Consumed by | Yours / Temporary | Required? |
|---|---|---|---|
| `MONGO_URL` | backend/server.py, providers.py | **YOURS** (MongoDB Atlas connection string) | ✅ required prod |
| `DB_NAME` | backend/server.py | **YOURS** | ✅ required prod |
| `CORS_ORIGINS` | backend/server.py (default `*`) | **YOURS** (set to your Vercel domain) | recommended prod |
| `JWT_SECRET` | backend/server.py | **YOURS** (currently falls back to dev value) | ✅ required prod |
| `JWT_ALG` | backend/server.py | optional, default `HS256` | optional |
| `GEMINI_API_KEY` | backend/providers.py | **YOURS** (Google AI Studio) | optional per-provider |
| `DEEPSEEK_API_KEY` | backend/providers.py | **YOURS** | optional per-provider |
| `GROQ_API_KEY` | backend/providers.py | **YOURS** | optional per-provider |
| `CEREBRAS_API_KEY` | backend/providers.py | **YOURS** | optional per-provider |
| `OPENROUTER_API_KEY` | backend/providers.py | **YOURS** | optional per-provider |
| `REACT_APP_BACKEND_URL` | frontend (build-time) | **YOURS** (set to Render URL on Vercel) | ✅ required prod |
| `WDS_SOCKET_PORT` | webpack-dev-server | dev only | dev only |
| `ENABLE_HEALTH_CHECK` | unused (legacy) | n/a | n/a |
| `BACKEND_URL` | pytest only (`test_backend.py`) | yours | tests only |

> At least **one** of the five `*_API_KEY` providers must be set or AI chat will return 500. Auth + CRUD + Workspace Restore + Universal Search + Browser Intelligence work fully without any AI key.

---

## 3. Deployment Steps (your infrastructure only)

### Render — Backend
1. New Web Service → connect your GitHub repo → root = `backend/`
2. Build cmd: `pip install -r requirements.txt`
3. Start cmd: `uvicorn server:app --host 0.0.0.0 --port $PORT`
4. Env vars to set in Render dashboard:
   ```
   MONGO_URL=<your MongoDB Atlas URI>
   DB_NAME=omniverseos_prod
   CORS_ORIGINS=https://<your-vercel-domain>
   JWT_SECRET=<openssl rand -hex 64>
   GEMINI_API_KEY=<optional>
   DEEPSEEK_API_KEY=<optional>
   GROQ_API_KEY=<optional>
   CEREBRAS_API_KEY=<optional>
   OPENROUTER_API_KEY=<optional>
   ```
5. Note the public URL (e.g. `https://omniverseos-api.onrender.com`).

### Vercel — Frontend
1. Import repo → root = `frontend/`, framework = CRA.
2. Build cmd (already set by `vercel.json`): `pnpm run build` → output `build/`.
3. Env vars:
   ```
   REACT_APP_BACKEND_URL=https://omniverseos-api.onrender.com
   ```
4. Deploy. Done.

### MongoDB Atlas
- Free M0 cluster, allow IP `0.0.0.0/0` (or Render's egress range), create DB user.
- Paste the connection string into Render's `MONGO_URL`.

### Post-deploy smoke test
```bash
curl https://omniverseos-api.onrender.com/api/health
# → {"status":"healthy","db":"ok",…}
```
Then sign up your owner account through the UI and you're done.

---

## 4. Secrets you must configure manually
- `JWT_SECRET` (Render) — **mandatory** before public launch.
- `MONGO_URL` (Render) — **mandatory**.
- `REACT_APP_BACKEND_URL` (Vercel) — **mandatory** (must point to your Render URL).
- At least one of `GEMINI_API_KEY` / `DEEPSEEK_API_KEY` / `GROQ_API_KEY` / `CEREBRAS_API_KEY` / `OPENROUTER_API_KEY` if you want AI chat / image gen.
- `CORS_ORIGINS` set to your Vercel domain (don't keep `*` in production).

## 5. Remaining deployment risks
1. **`JWT_SECRET` dev fallback** in `server.py:30`. If you forget to set the env var, tokens become predictable. Mitigation: set it in Render before first deploy.
2. **CORS=`*`** in shipped `.env`. Tighten to your Vercel domain in Render.
3. **Render free tier cold-starts** (~30s). Consider Render's Starter plan or use a small uptime ping if first-request latency matters.
4. **MongoDB Atlas IP allowlist** — Render egress IPs change; using `0.0.0.0/0` is convenient but you should rotate to Atlas Private Endpoint for sensitive deployments.
5. **No backend `render.yaml`** committed — you provision Render manually. Adding `render.yaml` later would let you blueprint-deploy, but is not required.
6. **`.replit` file** is harmless config but you can delete it once you fully leave Replit; nothing in the running app reads it.

---

## 6. Files changed in this audit
- `backend/tests/test_backend.py` — removed `unified-ai-hub-32.preview.emergentagent.com` sandbox fallback; now defaults to `http://localhost:8001`.
- `frontend/src/constants/testIds/home.js` — removed dead `home-emergent-link` constant.

No runtime behaviour changed. Production build still passes.

---

## Verdict
**OmniverseOS is fully portable to your Render + Vercel infrastructure using only your own API keys.** No Emergent, Replit, or sandbox dependency remains in code. The only Emergent-domain string left anywhere is `REACT_APP_BACKEND_URL` inside `frontend/.env`, which is correct because **this sandbox** is where the app currently runs — you override it on Vercel at deploy time.
