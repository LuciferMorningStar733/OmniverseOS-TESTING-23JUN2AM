from fastapi import FastAPI, APIRouter, HTTPException, Depends
from fastapi.responses import StreamingResponse, FileResponse, Response as FastAPIResponse
from fastapi.staticfiles import StaticFiles
from fastapi.security import HTTPBearer, HTTPAuthorizationCredentials
from dotenv import load_dotenv
from starlette.middleware.cors import CORSMiddleware
from motor.motor_asyncio import AsyncIOMotorClient
from google import genai
from google.genai import types as genai_types
import os
import logging
import base64
import hashlib
import httpx
from pathlib import Path
from pydantic import BaseModel, EmailStr, Field
from typing import Optional
import uuid
import re
import traceback
import bcrypt
import jwt as pyjwt
from datetime import datetime, timezone, timedelta
from providers import provider_manager

ROOT_DIR = Path(__file__).parent
load_dotenv(ROOT_DIR / ".env")
MONGO_URL = os.environ["MONGO_URL"]
DB_NAME = os.environ["DB_NAME"]
GEMINI_API_KEY = os.environ.get("GEMINI_API_KEY", "")
JWT_SECRET = os.environ.get("JWT_SECRET") or "omniverseos-dev-do-not-use-in-prod"
JWT_ALG = "HS256"
JWT_EXP_HOURS = 24 * 7
MAX_PROMPT_LEN = 4000
MAX_MESSAGE_LEN = 8000
gemini_client = genai.Client(api_key=GEMINI_API_KEY) if GEMINI_API_KEY else None
client = AsyncIOMotorClient(MONGO_URL)
db = client[DB_NAME]

from contextlib import asynccontextmanager
@asynccontextmanager
async def lifespan(_app: FastAPI):
    # startup
    await db.users.create_index("email", unique=True)
    for coll in ("notes", "tasks", "events", "transactions", "memories", "files", "images", "clipboard"):
        await db[coll].create_index([("user_id", 1), ("created_at", -1)])
    await db.chat_messages.create_index([("user_id", 1), ("session_id", 1), ("created_at", 1)])
    await db.cortex_memories.create_index([("user_id", 1), ("importance_score", -1)])
    await db.cortex_memories.create_index([("user_id", 1), ("category", 1)])
    await db.cortex_memories.create_index([("user_id", 1), ("never_forget", 1)])
    await db.cortex_memories.create_index([("user_id", 1), ("use_count", -1)])
    await db.memory_activity.create_index([("user_id", 1), ("date", -1)], unique=False)
    await db.memory_activity.create_index([("user_id", 1), ("date", 1)], unique=False)
    # Chat sessions
    await db.chat_sessions.create_index([("user_id", 1), ("updated_at", -1)])
    await db.chat_sessions.create_index([("user_id", 1), ("pinned", -1), ("updated_at", -1)])
    await db.chat_sessions.create_index("id", unique=True)
    # Phase 1: Intelligence Layer
    await db.project_dna.create_index([("user_id", 1), ("updated_at", -1)])
    await db.project_dna.create_index("id", unique=True)
    await db.decisions.create_index([("user_id", 1), ("created_at", -1)])
    await db.decisions.create_index([("user_id", 1), ("project_id", 1)])
    await db.decisions.create_index("id", unique=True)
    await db.timeline_events.create_index([("user_id", 1), ("created_at", -1)])
    await db.timeline_events.create_index([("user_id", 1), ("project_id", 1)])
    await db.timeline_events.create_index("id", unique=True)
    yield
    # shutdown
    client.close()

app = FastAPI(title="OmniverseOS API", lifespan=lifespan)
api = APIRouter(prefix="/api")
security = HTTPBearer(auto_error=False)

# ---------- Rate limiting (in-process token bucket) ----------
import time
import asyncio
from collections import defaultdict
_RATE_BUCKETS: dict[str, list[float]] = defaultdict(list)
_RATE_LOCK = asyncio.Lock()

async def rate_limit(key: str, max_per_min: int = 20):
    now = time.monotonic()
    cutoff = now - 60.0
    async with _RATE_LOCK:
        bucket = _RATE_BUCKETS[key]
        bucket[:] = [t for t in bucket if t > cutoff]
        if len(bucket) >= max_per_min:
            raise HTTPException(429, "Rate limit exceeded. Try again shortly.")
        bucket.append(now)

# ---------- Helpers ----------
def now_iso() -> str:
    return datetime.now(timezone.utc).isoformat()

def make_token(user_id: str, email: str) -> str:
    payload = {
        "sub": user_id,
        "email": email,
        "exp": datetime.now(timezone.utc) + timedelta(hours=JWT_EXP_HOURS),
    }
    return pyjwt.encode(payload, JWT_SECRET, algorithm=JWT_ALG)

async def get_current_user(
    creds: Optional[HTTPAuthorizationCredentials] = Depends(security),
) -> dict:
    if not creds:
        raise HTTPException(status_code=401, detail="Missing token")
    try:
        payload = pyjwt.decode(creds.credentials, JWT_SECRET, algorithms=[JWT_ALG])
    except Exception:
        raise HTTPException(status_code=401, detail="Invalid token")
    user = await db.users.find_one({"id": payload["sub"]}, {"_id": 0, "password": 0})
    if not user:
        raise HTTPException(status_code=401, detail="User not found")
    return user

# ---------- Models ----------
class SignupReq(BaseModel):
    email: EmailStr
    password: str
    name: str

class LoginReq(BaseModel):
    email: EmailStr
    password: str

class ChatHistoryMessage(BaseModel):
    role: str
    content: str = Field(..., max_length=3000)

class ChatReq(BaseModel):
    session_id: str = Field(..., max_length=120)
    message: str = Field(..., min_length=1, max_length=MAX_MESSAGE_LEN)
    provider: str = "gemini"
    model: str = "gemini-2.5-flash"
    preferred_provider: str = "auto"
    system: Optional[str] = Field(default=None, max_length=4000)
    history: list[ChatHistoryMessage] = Field(default=[], max_length=30)

class ImageGenReq(BaseModel):
    prompt: str = Field(..., min_length=1, max_length=MAX_PROMPT_LEN)

class NoteReq(BaseModel):
    title: str = "Untitled"
    content: str = ""
    color: str = "#00F0FF"

class TaskReq(BaseModel):
    title: str
    description: str = ""
    status: str = "todo"
    priority: str = "medium"

class EventReq(BaseModel):
    title: str
    date: str
    time: str = "09:00"
    color: str = "#00F0FF"
    description: str = ""

class TxnReq(BaseModel):
    title: str
    amount: float
    category: str = "general"
    type: str = "expense"
    date: str

class MemoryReq(BaseModel):
    content: str
    tag: str = "general"

# ── Cortex Persistent Memory Models ──────────────────────────────────────
CORTEX_MEMORY_CATEGORIES = {
    "Personal", "Preferences", "Devices", "Vehicles",
    "Projects", "Work", "Contacts", "Locations", "Other",
}

class CortexMemoryReq(BaseModel):
    title: str = ""
    content: str = Field(..., min_length=1, max_length=4000)
    category: str = "Other"
    importance_score: float = Field(default=0.5, ge=0.0, le=1.0)
    pinned: bool = False
    never_forget: bool = False
    source_message: str = ""

class CortexMemoryUpdateReq(BaseModel):
    title: str = ""
    content: str = Field(..., min_length=1, max_length=4000)
    category: str = "Other"
    importance_score: float = Field(default=0.5, ge=0.0, le=1.0)
    pinned: bool = False
    never_forget: bool = False

class MemoryExtractReq(BaseModel):
    user_message: str = Field(..., max_length=4000)
    assistant_response: str = Field(..., max_length=8000)

class MemoryRelevantReq(BaseModel):
    query: str = Field(..., max_length=2000)
    limit: int = Field(default=6, ge=1, le=20)

class FileReq(BaseModel):
    name: str
    type: str = "file"
    parent: str = "root"
    content: str = ""
    size: int = 0

class ClipboardReq(BaseModel):
    content: str = Field(..., min_length=1, max_length=20000)
    label: str = ""

# ── Chat Session Models ────────────────────────────────────────────────────
class ChatSessionCreateReq(BaseModel):
    title: str = Field(default="New Chat", max_length=200)
    provider: str = "gemini"
    model: str = "gemini-2.5-flash"

class ChatSessionUpdateReq(BaseModel):
    title: Optional[str] = Field(default=None, max_length=200)
    pinned: Optional[bool] = None

# ── Gemini TTS constants ───────────────────────────────────────────────────
_GEMINI_TTS_FEMALE_VOICES = ["Kore", "Aoede", "Zephyr", "Leda", "Schedar"]
_GEMINI_TTS_MALE_VOICES   = ["Puck", "Charon", "Fenrir", "Orus"]
_GEMINI_TTS_ALL_VOICES    = set(_GEMINI_TTS_FEMALE_VOICES + _GEMINI_TTS_MALE_VOICES)
_GEMINI_TTS_MODEL         = "gemini-2.5-flash-preview-tts"

# ── Backend LRU cache for TTS audio ───────────────────────────────────────
# Keyed by MD5(voice + ":" + text). Stores raw WAV bytes + MIME type.
# Prevents duplicate Gemini API calls for identical text+voice combos across
# all users and sessions (voice previews, repeated phrases, replay).
# Max 200 entries (~200 × ~50 KB ≈ 10 MB RAM ceiling).
_TTS_CACHE_MAX    = 200
_tts_cache_data:  dict[str, bytes]          = {}
_tts_cache_mime:  dict[str, str]            = {}
_tts_cache_order: list[str]                 = []   # front = oldest, back = newest (LRU)
# In-flight dedup: prevents concurrent identical requests from all hitting Gemini.
# Each entry is an asyncio.Future that resolves to (bytes, mime_str) on success.
_tts_inflight:    dict[str, asyncio.Future] = {}

def _tts_cache_key(text: str, voice: str) -> str:
    return hashlib.md5(f"{voice}:{text}".encode()).hexdigest()

def _tts_cache_get(key: str) -> tuple[bytes, str] | None:
    if key not in _tts_cache_data:
        return None
    # Move to most-recently-used position
    try:
        _tts_cache_order.remove(key)
    except ValueError:
        pass
    _tts_cache_order.append(key)
    return _tts_cache_data[key], _tts_cache_mime[key]

def _tts_cache_set(key: str, data: bytes, mime: str) -> None:
    if key in _tts_cache_data:
        try:
            _tts_cache_order.remove(key)
        except ValueError:
            pass
    elif len(_tts_cache_data) >= _TTS_CACHE_MAX:
        # Evict least-recently-used entry
        oldest = _tts_cache_order.pop(0)
        _tts_cache_data.pop(oldest, None)
        _tts_cache_mime.pop(oldest, None)
    _tts_cache_data[key] = data
    _tts_cache_mime[key] = mime
    _tts_cache_order.append(key)

class GeminiTtsReq(BaseModel):
    text: str = Field(..., min_length=1, max_length=5000)
    voice: str = Field(default="Kore", max_length=30)

@api.post("/ai/tts-gemini")
async def ai_tts_gemini(req: GeminiTtsReq, user=Depends(get_current_user)):
    """
    Gemini TTS via direct REST API — uses GEMINI_API_KEY (same key as chat).
    No Google Cloud credentials needed. Returns raw WAV bytes (audio/wav).
    Available voices: Kore, Aoede, Zephyr, Leda, Schedar (female);
                      Puck, Charon, Fenrir, Orus (male).
    Backend LRU cache (200 entries) serves repeated text+voice combos without
    hitting the Gemini API, reducing quota usage significantly.
    """
    if not GEMINI_API_KEY:
        raise HTTPException(503, "Gemini API key not configured on this server")

    await rate_limit(f"tts_gemini:{user['id']}", max_per_min=60)

    voice_name = req.voice if req.voice in _GEMINI_TTS_ALL_VOICES else "Kore"

    # ── Backend cache check ────────────────────────────────────────────────
    cache_key = _tts_cache_key(req.text, voice_name)
    cached = _tts_cache_get(cache_key)
    if cached:
        audio_bytes, mime_type = cached
        logging.info(
            "Gemini TTS backend cache HIT | voice=%s | bytes=%d | key=%s",
            voice_name, len(audio_bytes), cache_key[:8],
        )
        return FastAPIResponse(
            content=audio_bytes,
            media_type=mime_type,
            headers={
                "X-Voice-Used":  voice_name,
                "X-TTS-Provider": "gemini-cache",
                "X-TTS-Model":   _GEMINI_TTS_MODEL,
                "X-Cache":       "HIT",
                "Cache-Control": "no-store",
            },
        )

    # ── In-flight dedup ────────────────────────────────────────────────────
    # If an identical request is already fetching from Gemini, wait for it
    # instead of firing a second API call. The future resolves to (bytes, mime).
    if cache_key in _tts_inflight:
        logging.info("Gemini TTS in-flight dedup | key=%s", cache_key[:8])
        try:
            audio_bytes, mime_type = await asyncio.shield(_tts_inflight[cache_key])
        except Exception:
            raise HTTPException(502, "Gemini TTS request failed. Please try again.")
        return FastAPIResponse(
            content=audio_bytes,
            media_type=mime_type,
            headers={
                "X-Voice-Used":  voice_name,
                "X-TTS-Provider": "gemini-dedup",
                "X-TTS-Model":   _GEMINI_TTS_MODEL,
                "X-Cache":       "HIT",
                "Cache-Control": "no-store",
            },
        )

    # Register a future so concurrent identical requests can piggyback
    inflight_fut: asyncio.Future = asyncio.get_running_loop().create_future()
    _tts_inflight[cache_key] = inflight_fut

    # ── Live Gemini API call ───────────────────────────────────────────────
    url = (
        f"https://generativelanguage.googleapis.com/v1beta/models/"
        f"{_GEMINI_TTS_MODEL}:generateContent?key={GEMINI_API_KEY}"
    )
    payload = {
        "contents": [{"parts": [{"text": req.text}]}],
        "generationConfig": {
            "responseModalities": ["AUDIO"],
            "speechConfig": {
                "voiceConfig": {
                    "prebuiltVoiceConfig": {
                        "voiceName": voice_name,
                    }
                }
            },
        },
    }

    try:
        async with httpx.AsyncClient(timeout=30.0) as http:
            resp = await http.post(url, json=payload)

        logging.info("Gemini TTS response: HTTP %s | voice=%s", resp.status_code, voice_name)

        if resp.status_code == 400:
            raise HTTPException(400, f"Gemini TTS bad request: {resp.text[:300]}")
        if resp.status_code == 403:
            raise HTTPException(403, "Gemini API key invalid or TTS access denied")
        if resp.status_code == 404:
            raise HTTPException(404, f"Gemini TTS model not found: {_GEMINI_TTS_MODEL}")
        if resp.status_code == 429:
            raise HTTPException(429, "Gemini TTS quota exceeded. Try again shortly.")
        if not resp.is_success:
            raise HTTPException(502, f"Gemini TTS HTTP {resp.status_code}: {resp.text[:200]}")

        data = resp.json()

        # Response shape:
        # { "candidates": [{ "content": { "parts": [{ "inlineData": {
        #     "mimeType": "audio/wav", "data": "<base64>" } }] } }] }
        try:
            inline    = data["candidates"][0]["content"]["parts"][0]["inlineData"]
            audio_b64 = inline["data"]
            mime_type = inline.get("mimeType", "audio/wav")
        except (KeyError, IndexError) as e:
            logging.error("Gemini TTS unexpected response shape: %s | body: %s", e, str(data)[:400])
            raise HTTPException(502, "Gemini TTS returned unexpected response — no audio data")

        audio_bytes = base64.b64decode(audio_b64)
        logging.info("Gemini TTS OK | voice=%s | mime=%s | bytes=%d", voice_name, mime_type, len(audio_bytes))

        # ── Store in backend cache + resolve in-flight future ──────────────
        _tts_cache_set(cache_key, audio_bytes, mime_type)
        if not inflight_fut.done():
            inflight_fut.set_result((audio_bytes, mime_type))

        return FastAPIResponse(
            content=audio_bytes,
            media_type=mime_type,
            headers={
                "X-Voice-Used":  voice_name,
                "X-TTS-Provider": "gemini",
                "X-TTS-Model":   _GEMINI_TTS_MODEL,
                "X-Cache":       "MISS",
                "Cache-Control": "no-store",
            },
        )

    except HTTPException as http_exc:
        if not inflight_fut.done():
            inflight_fut.set_exception(http_exc)
        raise
    except Exception as exc:
        logging.error("Gemini TTS unexpected error: %s", exc, exc_info=True)
        # Sanitize exception message — httpx errors can contain the full request
        # URL (which embeds the API key as a query parameter). Never reflect
        # raw exception text to the client.
        safe_exc = HTTPException(502, "Gemini TTS request failed. Please try again.")
        if not inflight_fut.done():
            inflight_fut.set_exception(safe_exc)
        raise safe_exc
    finally:
        # Always remove from in-flight map so future requests go through normally
        _tts_inflight.pop(cache_key, None)


@api.get("/ai/tts-gemini/test")
async def ai_tts_gemini_test(user=Depends(get_current_user)):
    """
    Authenticated diagnostic — verifies the full Gemini TTS pipeline.
    Rate-limited to 5/min to prevent accidental quota drain.
    Also reports backend cache stats.
    """
    await rate_limit(f"tts_gemini_test:{user['id']}", max_per_min=5)
    if not GEMINI_API_KEY:
        return {"ok": False, "step": "config", "error": "GEMINI_API_KEY not set"}

    voice_name  = "Kore"
    sample_text = "Hello! Gemini TTS is working. Cortex voice is online."

    # Check backend cache first (test endpoint also benefits from caching)
    cache_key = _tts_cache_key(sample_text, voice_name)
    cached = _tts_cache_get(cache_key)
    if cached:
        audio_bytes, mime_type = cached
        return {
            "ok": True, "model": _GEMINI_TTS_MODEL, "voice": voice_name,
            "mime_type": mime_type, "audio_bytes": len(audio_bytes),
            "source": "backend_cache",
            "cache_entries": len(_tts_cache_data),
            "message": "Gemini TTS pipeline is fully operational (served from cache).",
        }

    url = (
        f"https://generativelanguage.googleapis.com/v1beta/models/"
        f"{_GEMINI_TTS_MODEL}:generateContent?key={GEMINI_API_KEY}"
    )
    payload = {
        "contents": [{"parts": [{"text": sample_text}]}],
        "generationConfig": {
            "responseModalities": ["AUDIO"],
            "speechConfig": {
                "voiceConfig": {
                    "prebuiltVoiceConfig": {"voiceName": voice_name}
                }
            },
        },
    }

    try:
        async with httpx.AsyncClient(timeout=30.0) as http:
            resp = await http.post(url, json=payload)

        if not resp.is_success:
            return {
                "ok": False, "step": "gemini_api",
                "http_status": resp.status_code, "error": resp.text[:400],
                "model": _GEMINI_TTS_MODEL, "voice": voice_name,
            }

        data = resp.json()
        try:
            inline     = data["candidates"][0]["content"]["parts"][0]["inlineData"]
            audio_b64  = inline["data"]
            mime_type  = inline.get("mimeType", "audio/wav")
            byte_count = len(base64.b64decode(audio_b64))
        except (KeyError, IndexError) as e:
            return {"ok": False, "step": "parse_response", "error": str(e),
                    "raw_keys": list(data.keys())}

        # Cache the test result so subsequent /test calls are free
        _tts_cache_set(cache_key, base64.b64decode(audio_b64), mime_type)

        return {
            "ok": True, "model": _GEMINI_TTS_MODEL, "voice": voice_name,
            "mime_type": mime_type, "audio_bytes": byte_count,
            "gemini_http_status": resp.status_code,
            "source": "live",
            "cache_entries": len(_tts_cache_data),
            "message": "Gemini TTS pipeline is fully operational.",
        }

    except Exception as exc:
        return {"ok": False, "step": "request", "error": str(exc)}


# ---------- Routes: Auth ----------
@api.get("/")
async def root():
    return {"status": "ok", "service": "OmniverseOS"}

@api.get("/health")
async def health():
    try:
        await db.command("ping")
        return {"status": "healthy", "db": "ok", "time": now_iso()}
    except Exception as e:
        raise HTTPException(503, f"DB unhealthy: {e}")

@api.post("/auth/signup")
async def signup(req: SignupReq):
    existing = await db.users.find_one({"email": req.email})
    if existing:
        raise HTTPException(400, "Email already registered")
    user_id = str(uuid.uuid4())
    hashed = bcrypt.hashpw(req.password.encode(), bcrypt.gensalt()).decode()
    user = {
        "id": user_id,
        "email": req.email,
        "name": req.name,
        "password": hashed,
        "created_at": now_iso(),
        "avatar": f"https://api.dicebear.com/7.x/bottts-neutral/svg?seed={req.email}",
    }
    try:
        await db.users.insert_one(user)
    except Exception:
        raise HTTPException(400, "Email already registered")
    token = make_token(user_id, req.email)
    user.pop("password")
    user.pop("_id", None)
    return {"token": token, "user": user}

@api.post("/auth/login")
async def login(req: LoginReq):
    user = await db.users.find_one({"email": req.email})
    if not user:
        raise HTTPException(401, "Invalid credentials")
    if not bcrypt.checkpw(req.password.encode(), user["password"].encode()):
        raise HTTPException(401, "Invalid credentials")
    token = make_token(user["id"], user["email"])
    user.pop("password")
    user.pop("_id", None)
    return {"token": token, "user": user}

@api.get("/auth/me")
async def me(user=Depends(get_current_user)):
    return user

class ForgotPasswordReq(BaseModel):
    email: EmailStr

class ResetPasswordReq(BaseModel):
    token: str
    new_password: str = Field(..., min_length=4)

class ChangePasswordReq(BaseModel):
    current_password: str
    new_password: str = Field(..., min_length=4)

@api.post("/auth/forgot-password")
async def forgot_password(req: ForgotPasswordReq):
    user = await db.users.find_one({"email": req.email})
    if not user:
        # Don't reveal if email exists
        return {"message": "If that email is registered, a reset link has been sent."}
    reset_token = str(uuid.uuid4())
    expires_at = (datetime.utcnow() + timedelta(hours=1)).isoformat()
    await db.users.update_one(
        {"email": req.email},
        {"$set": {"reset_token": reset_token, "reset_token_expires": expires_at}}
    )
    # In production: send email with reset link containing token
    # For dev: return token directly (remove before prod)
    return {
        "message": "If that email is registered, a reset link has been sent.",
        "dev_token": reset_token,  # Remove in production
    }

@api.post("/auth/reset-password")
async def reset_password(req: ResetPasswordReq):
    user = await db.users.find_one({"reset_token": req.token})
    if not user:
        raise HTTPException(400, "Invalid or expired reset token")
    expires_at = user.get("reset_token_expires", "")
    if expires_at and datetime.fromisoformat(expires_at) < datetime.utcnow():
        raise HTTPException(400, "Reset token has expired")
    hashed = bcrypt.hashpw(req.new_password.encode(), bcrypt.gensalt()).decode()
    await db.users.update_one(
        {"reset_token": req.token},
        {"$set": {"password": hashed}, "$unset": {"reset_token": "", "reset_token_expires": ""}}
    )
    return {"message": "Password reset successfully. You can now log in."}

@api.put("/auth/change-password")
async def change_password(req: ChangePasswordReq, user=Depends(get_current_user)):
    db_user = await db.users.find_one({"id": user["id"]})
    if not db_user:
        raise HTTPException(404, "User not found")
    if not bcrypt.checkpw(req.current_password.encode(), db_user["password"].encode()):
        raise HTTPException(400, "Current password is incorrect")
    hashed = bcrypt.hashpw(req.new_password.encode(), bcrypt.gensalt()).decode()
    await db.users.update_one({"id": user["id"]}, {"$set": {"password": hashed}})
    return {"message": "Password changed successfully"}

# ---------- Routes: AI Chat (Streaming SSE) ----------
ALLOWED_GEMINI_MODELS = {"gemini-2.5-flash", "gemini-2.5-pro", "gemini-2.5-flash-lite"}
ALLOWED_PREFERRED_PROVIDERS = {"auto", "gemini", "groq", "cerebras", "openrouter"}

def _validate_chat_req(req: "ChatReq") -> None:
    if req.model not in ALLOWED_GEMINI_MODELS:
        raise HTTPException(400, "Unsupported Gemini model")
    if req.preferred_provider not in ALLOWED_PREFERRED_PROVIDERS:
        raise HTTPException(400, "Unsupported preferred_provider")

@api.get("/ai/providers")
async def ai_providers(_user=Depends(get_current_user)):
    """Return health/availability of all AI providers."""
    return provider_manager.provider_statuses()

@api.post("/ai/chat/stream")
async def ai_chat_stream(req: ChatReq, user=Depends(get_current_user)):
    _validate_chat_req(req)
    await rate_limit(f"chat:{user['id']}", max_per_min=30)
    ts = now_iso()
    # Upsert session record — keeps session list in sync without extra client calls
    await db.chat_sessions.update_one(
        {"user_id": user["id"], "session_id": req.session_id},
        {
            "$set": {"updated_at": ts},
            "$setOnInsert": {
                "id": str(uuid.uuid4()),
                "user_id": user["id"],
                "session_id": req.session_id,
                "title": "New Chat",
                "pinned": False,
                "provider": req.provider,
                "model": req.model,
                "created_at": ts,
            },
        },
        upsert=True,
    )
    await db.chat_messages.insert_one({
        "id": str(uuid.uuid4()),
        "user_id": user["id"],
        "session_id": req.session_id,
        "role": "user",
        "content": req.message,
        "created_at": ts,
    })
    system_msg = req.system or (
        "You are OmniverseOS Assistant — a friendly, witty cyberpunk AI living "
        "inside an operating system. Be concise, helpful, and creative."
    )

    async def event_gen():
        full = []
        try:
            async for kind, value in provider_manager.generate_stream(
                preferred=req.preferred_provider,
                gemini_model=req.model,
                message=req.message,
                system=system_msg,
                history=[{"role": m.role, "content": m.content} for m in req.history],
            ):
                if kind == "provider":
                    # Signal which provider is responding — frontend parses this
                    yield f"data: [provider:{value}]\n\n"
                elif kind == "chunk":
                    full.append(value)
                    yield f"data: {value}\n\n"
                elif kind == "error":
                    code = value or "500"
                    if code == "429":
                        yield "data: [quota_exceeded]\n\n"
                    else:
                        yield f"data: [error:{code}]\n\n"
        except Exception as e:
            logging.error("Unexpected error in event_gen: %s", e)
            yield "data: [error:500]\n\n"

        if full:
            await db.chat_messages.insert_one({
                "id": str(uuid.uuid4()),
                "user_id": user["id"],
                "session_id": req.session_id,
                "role": "assistant",
                "content": "".join(full),
                "created_at": now_iso(),
            })
        yield "data: [DONE]\n\n"

    return StreamingResponse(
        event_gen(),
        media_type="text/event-stream",
        headers={"Cache-Control": "no-cache", "X-Accel-Buffering": "no"},
    )

@api.post("/ai/chat")
async def ai_chat(req: ChatReq, user=Depends(get_current_user)):
    if not gemini_client:
        raise HTTPException(500, "LLM key not configured")
    _validate_chat_req(req)
    system_msg = req.system or "You are OmniverseOS Assistant. Be concise and helpful."
    response = await gemini_client.aio.models.generate_content(
        model=req.model,
        contents=req.message,
        config=genai_types.GenerateContentConfig(
            system_instruction=system_msg,
        ),
    )
    text = response.text or ""
    await db.chat_messages.insert_many([
        {"id": str(uuid.uuid4()), "user_id": user["id"], "session_id": req.session_id,
         "role": "user", "content": req.message, "created_at": now_iso()},
        {"id": str(uuid.uuid4()), "user_id": user["id"], "session_id": req.session_id,
         "role": "assistant", "content": text, "created_at": now_iso()},
    ])
    return {"response": text}

@api.get("/ai/chat/history/{session_id}")
async def chat_history(session_id: str, user=Depends(get_current_user)):
    msgs = await db.chat_messages.find(
        {"user_id": user["id"], "session_id": session_id}, {"_id": 0}
    ).sort("created_at", 1).to_list(500)
    return msgs

# ---------- Routes: Chat Sessions ----------

async def _upsert_session(user_id: str, session_id: str, **extra) -> dict:
    """Create or touch a session record — idempotent."""
    ts = now_iso()
    doc = {
        "user_id": user_id,
        "session_id": session_id,
        "updated_at": ts,
        **extra,
    }
    result = await db.chat_sessions.find_one_and_update(
        {"user_id": user_id, "session_id": session_id},
        {
            "$set": {"updated_at": ts, **extra},
            "$setOnInsert": {
                "id": str(uuid.uuid4()),
                "user_id": user_id,
                "session_id": session_id,
                "title": extra.get("title", "New Chat"),
                "pinned": False,
                "provider": extra.get("provider", "gemini"),
                "model": extra.get("model", "gemini-2.5-flash"),
                "created_at": ts,
            },
        },
        upsert=True,
        return_document=True,
        projection={"_id": 0},
    )
    return result or doc

@api.get("/ai/sessions")
async def list_sessions(search: str = "", user=Depends(get_current_user)):
    """List all sessions for the user, pinned first then by updated_at desc."""
    uid = user["id"]
    query: dict = {"user_id": uid}
    if search.strip():
        query["title"] = {"$regex": re.escape(search.strip()), "$options": "i"}
    sessions = await db.chat_sessions.find(query, {"_id": 0}).sort(
        [("pinned", -1), ("updated_at", -1)]
    ).to_list(200)
    # Attach message count & last message preview per session (batched)
    session_ids = [s["session_id"] for s in sessions]
    pipeline = [
        {"$match": {"user_id": uid, "session_id": {"$in": session_ids}}},
        {"$sort": {"created_at": 1}},
        {"$group": {
            "_id": "$session_id",
            "count": {"$sum": 1},
            "last_role": {"$last": "$role"},
            "last_content": {"$last": "$content"},
        }},
    ]
    stats_raw = await db.chat_messages.aggregate(pipeline).to_list(None)
    stats = {s["_id"]: s for s in stats_raw}
    for sess in sessions:
        sid = sess["session_id"]
        s = stats.get(sid, {})
        sess["message_count"] = s.get("count", 0)
        snippet = s.get("last_content", "")
        sess["preview"] = snippet[:120] if snippet else ""
    return sessions

@api.post("/ai/sessions")
async def create_session(req: ChatSessionCreateReq, user=Depends(get_current_user)):
    """Create a new chat session."""
    session_id = str(uuid.uuid4())
    ts = now_iso()
    doc = {
        "id": str(uuid.uuid4()),
        "user_id": user["id"],
        "session_id": session_id,
        "title": req.title,
        "pinned": False,
        "provider": req.provider,
        "model": req.model,
        "created_at": ts,
        "updated_at": ts,
        "message_count": 0,
        "preview": "",
    }
    await db.chat_sessions.insert_one({**doc, "_id": doc["id"]})
    doc.pop("_id", None)
    return doc

@api.patch("/ai/sessions/{session_id}")
async def update_session(session_id: str, req: ChatSessionUpdateReq, user=Depends(get_current_user)):
    """Rename or pin/unpin a session."""
    patch: dict = {"updated_at": now_iso()}
    if req.title is not None:
        patch["title"] = req.title.strip() or "New Chat"
    if req.pinned is not None:
        patch["pinned"] = req.pinned
    result = await db.chat_sessions.find_one_and_update(
        {"user_id": user["id"], "session_id": session_id},
        {"$set": patch},
        return_document=True,
        projection={"_id": 0},
    )
    if not result:
        raise HTTPException(404, "Session not found")
    return result

@api.delete("/ai/sessions/{session_id}")
async def delete_session(session_id: str, user=Depends(get_current_user)):
    """Delete a session and all its messages."""
    uid = user["id"]
    res = await db.chat_sessions.delete_one({"user_id": uid, "session_id": session_id})
    if res.deleted_count == 0:
        raise HTTPException(404, "Session not found")
    await db.chat_messages.delete_many({"user_id": uid, "session_id": session_id})
    return {"ok": True}

@api.post("/ai/sessions/{session_id}/duplicate")
async def duplicate_session(session_id: str, user=Depends(get_current_user)):
    """Duplicate a session (metadata + messages)."""
    uid = user["id"]
    original = await db.chat_sessions.find_one({"user_id": uid, "session_id": session_id}, {"_id": 0})
    if not original:
        raise HTTPException(404, "Session not found")
    new_session_id = str(uuid.uuid4())
    ts = now_iso()
    new_doc = {
        **original,
        "id": str(uuid.uuid4()),
        "session_id": new_session_id,
        "title": original.get("title", "New Chat") + " (copy)",
        "pinned": False,
        "created_at": ts,
        "updated_at": ts,
    }
    await db.chat_sessions.insert_one({**new_doc, "_id": new_doc["id"]})
    # Copy messages
    msgs = await db.chat_messages.find({"user_id": uid, "session_id": session_id}, {"_id": 0}).to_list(500)
    if msgs:
        new_msgs = [{**m, "id": str(uuid.uuid4()), "session_id": new_session_id} for m in msgs]
        await db.chat_messages.insert_many(new_msgs)
    new_doc.pop("_id", None)
    new_doc["message_count"] = len(msgs)
    return new_doc

@api.post("/ai/sessions/{session_id}/auto-title")
async def auto_title_session(session_id: str, user=Depends(get_current_user)):
    """Generate and set a title from the first user message in the session."""
    uid = user["id"]
    first_msg = await db.chat_messages.find_one(
        {"user_id": uid, "session_id": session_id, "role": "user"},
        {"_id": 0},
        sort=[("created_at", 1)],
    )
    if not first_msg:
        raise HTTPException(404, "No messages found")
    content = first_msg.get("content", "")[:300]
    if not gemini_client:
        title = content[:60].strip() or "New Chat"
    else:
        try:
            resp = await gemini_client.aio.models.generate_content(
                model="gemini-2.5-flash-lite",
                contents=f"Generate a short 3-6 word title for this conversation. Only output the title, nothing else. Message: {content}",
                config=genai_types.GenerateContentConfig(
                    system_instruction="You generate short chat titles. Max 6 words. No quotes. No punctuation at end. Just the title.",
                    max_output_tokens=20,
                ),
            )
            title = (resp.text or content[:60]).strip().strip('"').strip("'")
        except Exception:
            title = content[:60].strip() or "New Chat"
    await db.chat_sessions.update_one(
        {"user_id": uid, "session_id": session_id},
        {"$set": {"title": title, "updated_at": now_iso()}},
        upsert=True,
    )
    return {"session_id": session_id, "title": title}

# ---------- Routes: AI Image Generation ----------
@api.post("/ai/image")
async def ai_image(req: ImageGenReq, user=Depends(get_current_user)):
    await rate_limit(user["id"])
    try:
        import asyncio as _asyncio
        response = await _asyncio.to_thread(
            gemini_client.models.generate_images,
            model="imagen-4.0-generate-001",
            prompt=req.prompt,
            config=genai_types.GenerateImagesConfig(
                number_of_images=1,
                output_mime_type="image/png",
            ),
        )
        image_bytes = response.generated_images[0].image.image_bytes
        image_b64 = base64.b64encode(image_bytes).decode()
        doc = await db.ai_images.insert_one({
            "id": str(uuid.uuid4()),
            "user_id": user["id"],
            "prompt": req.prompt,
            "image_b64": image_b64,
            "created_at": datetime.now(timezone.utc),
        })
        result = await db.ai_images.find_one({"_id": doc.inserted_id})
        result.pop("_id", None)
        return result
    except Exception as e:
        err_str = str(e)
        logging.exception("IMAGE GENERATION FAILURE")
        if "429" in err_str or "quota" in err_str.lower() or "RESOURCE_EXHAUSTED" in err_str:
            raise HTTPException(429, "AI quota exceeded. Try again later")
        if "400" in err_str or "safety" in err_str.lower() or "INVALID_ARGUMENT" in err_str:
            raise HTTPException(400, "Prompt blocked by safety filters")
        raise HTTPException(500, f"Image generation failed: {err_str}")

@api.get("/ai/image/history")
async def image_history(user=Depends(get_current_user)):
    items = await db.ai_images.find({"user_id": user["id"]}, {"_id": 0}).sort(
        "created_at", -1
    ).to_list(50)
    return items

# ---------- Generic CRUD factory ----------
async def list_for_user(coll_name: str, user_id: str, limit: int = 200, skip: int = 0):
    limit = max(1, min(limit, 500))
    skip = max(0, skip)
    docs = (
        await db[coll_name]
        .find({"user_id": user_id}, {"_id": 0})
        .sort("created_at", -1)
        .skip(skip)
        .limit(limit)
        .to_list(limit)
    )
    return docs

async def create_for_user(coll_name: str, user_id: str, data: dict):
    doc = {
        "id": str(uuid.uuid4()),
        "user_id": user_id,
        "created_at": now_iso(),
        "updated_at": now_iso(),
        **data,
    }
    await db[coll_name].insert_one(doc)
    doc.pop("_id", None)
    return doc

async def update_for_user(coll_name: str, user_id: str, item_id: str, data: dict):
    data["updated_at"] = now_iso()
    res = await db[coll_name].update_one(
        {"id": item_id, "user_id": user_id}, {"$set": data}
    )
    if res.matched_count == 0:
        raise HTTPException(404, "Not found")
    doc = await db[coll_name].find_one({"id": item_id}, {"_id": 0})
    return doc

async def delete_for_user(coll_name: str, user_id: str, item_id: str):
    res = await db[coll_name].delete_one({"id": item_id, "user_id": user_id})
    if res.deleted_count == 0:
        raise HTTPException(404, "Not found")
    return {"ok": True}

# Notes
@api.get("/notes")
async def list_notes(user=Depends(get_current_user)):
    return await list_for_user("notes", user["id"])

@api.post("/notes")
async def create_note(req: NoteReq, user=Depends(get_current_user)):
    return await create_for_user("notes", user["id"], req.model_dump())

@api.put("/notes/{nid}")
async def update_note(nid: str, req: NoteReq, user=Depends(get_current_user)):
    return await update_for_user("notes", user["id"], nid, req.model_dump())

@api.delete("/notes/{nid}")
async def delete_note(nid: str, user=Depends(get_current_user)):
    return await delete_for_user("notes", user["id"], nid)

# Tasks
@api.get("/tasks")
async def list_tasks(user=Depends(get_current_user)):
    return await list_for_user("tasks", user["id"])

@api.post("/tasks")
async def create_task(req: TaskReq, user=Depends(get_current_user)):
    return await create_for_user("tasks", user["id"], req.model_dump())

@api.put("/tasks/{tid}")
async def update_task(tid: str, req: TaskReq, user=Depends(get_current_user)):
    return await update_for_user("tasks", user["id"], tid, req.model_dump())

@api.delete("/tasks/{tid}")
async def delete_task(tid: str, user=Depends(get_current_user)):
    return await delete_for_user("tasks", user["id"], tid)

# Events
@api.get("/events")
async def list_events(user=Depends(get_current_user)):
    return await list_for_user("events", user["id"])

@api.post("/events")
async def create_event(req: EventReq, user=Depends(get_current_user)):
    return await create_for_user("events", user["id"], req.model_dump())

@api.delete("/events/{eid}")
async def delete_event(eid: str, user=Depends(get_current_user)):
    return await delete_for_user("events", user["id"], eid)

# Transactions
@api.get("/transactions")
async def list_txns(user=Depends(get_current_user)):
    return await list_for_user("transactions", user["id"])

@api.post("/transactions")
async def create_txn(req: TxnReq, user=Depends(get_current_user)):
    return await create_for_user("transactions", user["id"], req.model_dump())

@api.delete("/transactions/{tid}")
async def delete_txn(tid: str, user=Depends(get_current_user)):
    return await delete_for_user("transactions", user["id"], tid)

# ── Cortex Persistent Memory ──────────────────────────────────────────────

@api.get("/memories")
async def list_memories(user=Depends(get_current_user)):
    docs = await db.cortex_memories.find(
        {"user_id": user["id"]}, {"_id": 0}
    ).sort([("pinned", -1), ("importance_score", -1), ("created_at", -1)]).to_list(500)
    return docs

@api.post("/memories")
async def create_cortex_memory(req: CortexMemoryReq, user=Depends(get_current_user)):
    category = req.category if req.category in CORTEX_MEMORY_CATEGORIES else "Other"
    doc = {
        "id": str(uuid.uuid4()),
        "user_id": user["id"],
        "title": req.title or req.content[:60],
        "content": req.content,
        "category": category,
        "importance_score": req.importance_score,
        "pinned": req.pinned,
        "never_forget": req.never_forget,
        "source_message": req.source_message,
        "use_count": 0,
        "created_at": now_iso(),
        "updated_at": now_iso(),
        "last_used": now_iso(),
    }
    await db.cortex_memories.insert_one(doc)
    doc.pop("_id", None)
    return doc

@api.put("/memories/{mid}")
async def update_cortex_memory(mid: str, req: CortexMemoryUpdateReq, user=Depends(get_current_user)):
    category = req.category if req.category in CORTEX_MEMORY_CATEGORIES else "Other"
    update_data = {
        "title": req.title or req.content[:60],
        "content": req.content,
        "category": category,
        "importance_score": req.importance_score,
        "pinned": req.pinned,
        "never_forget": req.never_forget,
        "updated_at": now_iso(),
    }
    res = await db.cortex_memories.update_one(
        {"id": mid, "user_id": user["id"]}, {"$set": update_data}
    )
    if res.matched_count == 0:
        raise HTTPException(404, "Memory not found")
    doc = await db.cortex_memories.find_one({"id": mid}, {"_id": 0})
    return doc

@api.delete("/memories/{mid}")
async def delete_cortex_memory(mid: str, user=Depends(get_current_user)):
    res = await db.cortex_memories.delete_one({"id": mid, "user_id": user["id"]})
    if res.deleted_count == 0:
        raise HTTPException(404, "Memory not found")
    return {"ok": True}

@api.post("/memories/relevant")
async def get_relevant_memories(req: MemoryRelevantReq, user=Depends(get_current_user)):
    """Keyword-score all user memories and return the most relevant to the query."""
    all_mems = await db.cortex_memories.find(
        {"user_id": user["id"]}, {"_id": 0}
    ).sort("importance_score", -1).to_list(500)
    if not all_mems:
        return []
    stop = {"i","a","an","the","is","it","my","me","you","do","did",
            "what","which","who","how","when","where","was","are","be",
            "have","has","can","could","would","should","will","and","or",
            "of","in","on","at","to","for","with","about","that","this"}
    qwords = set(req.query.lower().split()) - stop
    def score(m):
        text = (m.get("title","") + " " + m.get("content","") + " " + m.get("category","")).lower()
        words = set(text.split()) - stop
        overlap = len(qwords & words)
        imp = float(m.get("importance_score", 0.5))
        nf  = 3.0 if m.get("never_forget") else 1.0
        pin = 1.5 if m.get("pinned") else 1.0
        return (overlap * 2 + imp) * nf * pin
    scored = sorted(all_mems, key=score, reverse=True)
    nf_mems = [m for m in all_mems if m.get("never_forget")]
    top = scored[:req.limit]
    seen = {m["id"] for m in top}
    for m in nf_mems:
        if m["id"] not in seen:
            top.append(m)
            seen.add(m["id"])
    top = top[:req.limit]
    if top:
        ids = [m["id"] for m in top]
        await db.cortex_memories.update_many(
            {"id": {"$in": ids}, "user_id": user["id"]},
            {"$set": {"last_used": now_iso()}, "$inc": {"use_count": 1}}
        )
        # Update local copies with incremented count
        for m in top:
            m["use_count"] = int(m.get("use_count", 0)) + 1
        # Track daily activity for the heatmap
        today_date = datetime.now(timezone.utc).strftime("%Y-%m-%d")
        await db.memory_activity.update_one(
            {"user_id": user["id"], "date": today_date},
            {"$inc": {"count": len(top)}, "$set": {"updated_at": now_iso()}},
            upsert=True,
        )
    return top

@api.post("/memories/extract")
async def extract_memories(req: MemoryExtractReq, user=Depends(get_current_user)):
    """Use Gemini to auto-extract long-term memorable facts from a conversation turn."""
    if not gemini_client:
        return {"extracted": []}
    await rate_limit(f"mem_extract:{user['id']}", max_per_min=30)
    prompt = (
        "Extract long-term memorable facts from this conversation. Return a JSON array only.\n\n"
        f"User: {req.user_message}\nAssistant: {req.assistant_response[:1500]}\n\n"
        "Rules:\n"
        "- Extract ONLY personal facts worth permanently remembering: owned items, preferences, projects, profession, location, contacts.\n"
        "- Skip: questions, weather, time queries, temporary facts, general knowledge.\n"
        "- Each item: {title: 5 words max, content: one sentence fact, category: one of [Personal,Preferences,Devices,Vehicles,Projects,Work,Contacts,Locations,Other], importance_score: 0.0-1.0}\n"
        "- 0.9+ for critical personal info, 0.7 for preferences, 0.5 general.\n"
        "Return ONLY valid JSON array, no markdown fences, no explanation. Return [] if nothing memorable."
    )
    try:
        resp = await gemini_client.aio.models.generate_content(
            model="gemini-2.5-flash-lite",
            contents=prompt,
            config=genai_types.GenerateContentConfig(temperature=0.1, max_output_tokens=800),
        )
        raw = (resp.text or "").strip()
        if raw.startswith("```"):
            raw = raw.split("\n", 1)[-1].rsplit("```", 1)[0].strip()
        import json as _json
        items = _json.loads(raw)
        if not isinstance(items, list):
            return {"extracted": []}
        saved = []
        for item in items[:5]:
            if not isinstance(item, dict) or not item.get("content"):
                continue
            cat = item.get("category", "Other")
            if cat not in CORTEX_MEMORY_CATEGORIES:
                cat = "Other"
            imp = min(1.0, max(0.0, float(item.get("importance_score", 0.6))))
            existing = await db.cortex_memories.find_one({
                "user_id": user["id"],
                "content": {"$regex": f"^{re.escape(item['content'][:40])}", "$options": "i"}
            })
            if existing:
                continue
            doc = {
                "id": str(uuid.uuid4()), "user_id": user["id"],
                "title": item.get("title", item["content"][:60]),
                "content": item["content"], "category": cat,
                "importance_score": imp, "pinned": False, "never_forget": False,
                "source_message": req.user_message[:200],
                "use_count": 0,
                "created_at": now_iso(), "updated_at": now_iso(), "last_used": now_iso(),
            }
            await db.cortex_memories.insert_one(doc)
            doc.pop("_id", None)
            saved.append(doc)
        return {"extracted": saved}
    except Exception as exc:
        logging.warning("Memory extraction failed: %s", exc)
        return {"extracted": []}


@api.get("/memories/stats")
async def memory_stats(user=Depends(get_current_user)):
    """Return memory usage stats for the Strength graph."""
    all_mems = await db.cortex_memories.find(
        {"user_id": user["id"]}, {"_id": 0}
    ).sort("use_count", -1).to_list(500)
    if not all_mems:
        return {"top_by_usage": [], "by_category": {}, "total": 0, "total_uses": 0}

    total_uses = sum(int(m.get("use_count", 0)) for m in all_mems)
    by_cat: dict = {}
    for m in all_mems:
        cat = m.get("category", "Other")
        if cat not in by_cat:
            by_cat[cat] = {"count": 0, "uses": 0}
        by_cat[cat]["count"] += 1
        by_cat[cat]["uses"] += int(m.get("use_count", 0))

    top_by_usage = [
        {
            "id": m["id"],
            "title": m.get("title") or m.get("content", "")[:50],
            "category": m.get("category", "Other"),
            "use_count": int(m.get("use_count", 0)),
            "importance_score": m.get("importance_score", 0.5),
            "never_forget": m.get("never_forget", False),
            "pinned": m.get("pinned", False),
            "last_used": m.get("last_used"),
        }
        for m in all_mems[:20]
        if int(m.get("use_count", 0)) > 0
    ]

    return {
        "top_by_usage": top_by_usage,
        "by_category": by_cat,
        "total": len(all_mems),
        "total_uses": total_uses,
    }

@api.get("/memories/timeline")
async def memory_timeline(user=Depends(get_current_user)):
    """Return 52 weeks of daily memory-retrieval activity for the heatmap."""
    from datetime import date, timedelta
    today = date.today()
    # Start from the most recent Sunday going back 52 full weeks (364 days)
    days_since_sunday = today.weekday() + 1  # Monday=0 so Sun offset = weekday+1; handle Sunday
    if today.weekday() == 6:
        days_since_sunday = 0
    start_date = today - timedelta(days=days_since_sunday + 363)
    start_str = start_date.strftime("%Y-%m-%d")

    docs = await db.memory_activity.find(
        {"user_id": user["id"], "date": {"$gte": start_str}},
        {"_id": 0, "date": 1, "count": 1}
    ).to_list(400)

    # Build a dict date -> count
    activity: dict[str, int] = {d["date"]: int(d.get("count", 0)) for d in docs}

    # Generate all days from start_date to today
    days = []
    cursor = start_date
    while cursor <= today:
        ds = cursor.strftime("%Y-%m-%d")
        days.append({"date": ds, "count": activity.get(ds, 0)})
        cursor += timedelta(days=1)

    total_active_days = sum(1 for d in days if d["count"] > 0)
    total_retrievals   = sum(d["count"] for d in days)
    max_count          = max((d["count"] for d in days), default=0)

    return {
        "days": days,
        "total_active_days": total_active_days,
        "total_retrievals": total_retrievals,
        "max_count": max_count,
        "start_date": start_date.strftime("%Y-%m-%d"),
        "end_date": today.strftime("%Y-%m-%d"),
    }

# Files (virtual file manager)
@api.get("/files")
async def list_files(user=Depends(get_current_user)):
    return await list_for_user("files", user["id"])

@api.post("/files")
async def create_file(req: FileReq, user=Depends(get_current_user)):
    return await create_for_user("files", user["id"], req.model_dump())

@api.delete("/files/{fid}")
async def delete_file(fid: str, user=Depends(get_current_user)):
    return await delete_for_user("files", user["id"], fid)

# Clipboard
@api.get("/clipboard")
async def list_clipboard(user=Depends(get_current_user)):
    return await list_for_user("clipboard", user["id"])

@api.post("/clipboard")
async def create_clipboard(req: ClipboardReq, user=Depends(get_current_user)):
    return await create_for_user("clipboard", user["id"], req.model_dump())

@api.put("/clipboard/{cid}")
async def update_clipboard(cid: str, req: ClipboardReq, user=Depends(get_current_user)):
    return await update_for_user("clipboard", user["id"], cid, req.model_dump())

@api.delete("/clipboard/{cid}")
async def delete_clipboard(cid: str, user=Depends(get_current_user)):
    return await delete_for_user("clipboard", user["id"], cid)

# ═══════════════════════════════════════════════════════════════════════════
#  PHASE 1 — INTELLIGENCE LAYER
# ═══════════════════════════════════════════════════════════════════════════

# ─── Priority 1: Conversation Archaeology ──────────────────────────────────

class ConversationSearchReq(BaseModel):
    query: str = Field(..., min_length=1, max_length=500)
    limit: int = Field(default=8, ge=1, le=20)

@api.post("/ai/search/conversations")
async def search_conversations(req: ConversationSearchReq, user=Depends(get_current_user)):
    """Semantic search across all chat sessions and messages."""
    uid = user["id"]
    q = req.query.strip()
    limit = req.limit

    # Step 1: keyword regex search across messages
    pattern = re.compile(re.escape(q), re.IGNORECASE)
    raw_messages = await db.chat_messages.find(
        {"user_id": uid, "content": {"$regex": pattern}},
        {"_id": 0, "session_id": 1, "content": 1, "role": 1, "created_at": 1},
    ).sort("created_at", -1).limit(60).to_list(60)

    # Step 2: also search session titles
    title_sessions = await db.chat_sessions.find(
        {"user_id": uid, "title": {"$regex": pattern}},
        {"_id": 0, "id": 1, "title": 1, "updated_at": 1},
    ).limit(20).to_list(20)

    # Step 3: gather all relevant session_ids
    session_ids_from_msgs = list({m["session_id"] for m in raw_messages})
    session_ids_from_titles = [s["id"] for s in title_sessions]
    all_session_ids = list({*session_ids_from_msgs, *session_ids_from_titles})

    if not all_session_ids:
        return {"results": [], "query": q}

    # Step 4: enrich with session metadata
    sessions_list = await db.chat_sessions.find(
        {"user_id": uid, "id": {"$in": all_session_ids}},
        {"_id": 0, "id": 1, "title": 1, "updated_at": 1, "created_at": 1},
    ).to_list(len(all_session_ids))
    session_map = {s["id"]: s for s in sessions_list}

    # Step 5: build result set with excerpts
    results = []
    seen_sessions = set()

    # Messages first (most semantically rich)
    for msg in raw_messages:
        sid = msg["session_id"]
        if sid in seen_sessions:
            continue
        seen_sessions.add(sid)
        sess = session_map.get(sid, {})
        content = msg.get("content", "")
        # Find the matching excerpt window
        idx = content.lower().find(q.lower())
        start = max(0, idx - 60)
        end = min(len(content), idx + len(q) + 120)
        excerpt = ("…" if start > 0 else "") + content[start:end] + ("…" if end < len(content) else "")
        results.append({
            "session_id": sid,
            "session_title": sess.get("title") or "Untitled",
            "updated_at": sess.get("updated_at") or msg.get("created_at"),
            "excerpt": excerpt,
            "match_type": "message",
            "role": msg.get("role", "user"),
        })

    # Title-matched sessions without message matches
    for sess in title_sessions:
        sid = sess["id"]
        if sid in seen_sessions:
            continue
        seen_sessions.add(sid)
        results.append({
            "session_id": sid,
            "session_title": sess.get("title") or "Untitled",
            "updated_at": sess.get("updated_at"),
            "excerpt": f'Session title matches "{q}"',
            "match_type": "title",
            "role": None,
        })

    # Step 6: Gemini semantic reranking (if we have enough results and Gemini is available)
    if gemini_client and len(results) > limit:
        try:
            candidates = "\n".join(
                f"[{i}] {r['session_title']}: {r['excerpt'][:100]}"
                for i, r in enumerate(results[:30])
            )
            rerank_prompt = (
                f"Given the user's search query: \"{q}\"\n\n"
                f"Rank these conversation excerpts by relevance (0-based indices, most relevant first).\n"
                f"Return ONLY a JSON array of indices like [3,0,1,5,...] — nothing else.\n\n"
                f"Candidates:\n{candidates}"
            )
            rerank_resp = gemini_client.models.generate_content(
                model="gemini-2.0-flash-lite",
                contents=rerank_prompt,
            )
            raw_text = (rerank_resp.text or "").strip().replace("```json", "").replace("```", "").strip()
            import json as _json
            indices = _json.loads(raw_text)
            if isinstance(indices, list) and all(isinstance(x, int) for x in indices):
                reranked = [results[i] for i in indices if i < len(results)]
                # Add any not in reranked list
                seen = set(indices)
                for i, r in enumerate(results):
                    if i not in seen:
                        reranked.append(r)
                results = reranked
        except Exception:
            pass  # fall back to original ordering

    return {"results": results[:limit], "query": q}


# ─── Priority 2: Project DNA ───────────────────────────────────────────────

class ProjectDNAReq(BaseModel):
    name: str = Field(..., min_length=1, max_length=200)
    description: str = ""
    goals: list = []
    roadmap: str = ""
    architecture_decisions: list = []
    terminology: dict = {}
    rejected_ideas: list = []
    unresolved_questions: list = []
    color: str = "#00F0FF"
    icon: str = "fa-diagram-project"
    status: str = "active"  # active | archived | completed

class ProjectDNAPatch(BaseModel):
    name: Optional[str] = None
    description: Optional[str] = None
    goals: Optional[list] = None
    roadmap: Optional[str] = None
    architecture_decisions: Optional[list] = None
    terminology: Optional[dict] = None
    rejected_ideas: Optional[list] = None
    unresolved_questions: Optional[list] = None
    color: Optional[str] = None
    icon: Optional[str] = None
    status: Optional[str] = None

@api.get("/projects")
async def list_projects(user=Depends(get_current_user)):
    uid = user["id"]
    items = await db.project_dna.find(
        {"user_id": uid},
        {"_id": 0}
    ).sort("updated_at", -1).to_list(100)
    return items

@api.post("/projects", status_code=201)
async def create_project(req: ProjectDNAReq, user=Depends(get_current_user)):
    uid = user["id"]
    doc = {
        "id": str(uuid.uuid4()),
        "user_id": uid,
        **req.model_dump(),
        "created_at": now_iso(),
        "updated_at": now_iso(),
    }
    await db.project_dna.insert_one(doc)
    doc.pop("_id", None)
    return doc

@api.get("/projects/{pid}")
async def get_project(pid: str, user=Depends(get_current_user)):
    uid = user["id"]
    doc = await db.project_dna.find_one({"id": pid, "user_id": uid}, {"_id": 0})
    if not doc:
        raise HTTPException(404, "Project not found")
    return doc

@api.patch("/projects/{pid}")
async def update_project(pid: str, req: ProjectDNAPatch, user=Depends(get_current_user)):
    uid = user["id"]
    patch = {k: v for k, v in req.model_dump().items() if v is not None}
    if not patch:
        raise HTTPException(400, "No fields to update")
    patch["updated_at"] = now_iso()
    result = await db.project_dna.update_one({"id": pid, "user_id": uid}, {"$set": patch})
    if result.matched_count == 0:
        raise HTTPException(404, "Project not found")
    return await db.project_dna.find_one({"id": pid, "user_id": uid}, {"_id": 0})

@api.delete("/projects/{pid}")
async def delete_project(pid: str, user=Depends(get_current_user)):
    uid = user["id"]
    result = await db.project_dna.delete_one({"id": pid, "user_id": uid})
    if result.deleted_count == 0:
        raise HTTPException(404, "Project not found")
    # Also delete associated decisions
    await db.decisions.delete_many({"project_id": pid, "user_id": uid})
    return {"ok": True}


# ─── Priority 3: Decision Memory ───────────────────────────────────────────

class DecisionReq(BaseModel):
    project_id: str = ""
    title: str = Field(..., min_length=1, max_length=300)
    summary: str = ""
    reasoning: str = ""
    alternatives: list = []
    outcome: str = ""  # what happened as a result
    related_conversation_ids: list = []
    related_note_ids: list = []
    related_task_ids: list = []
    tags: list = []
    status: str = "active"  # active | superseded | reversed

class DecisionPatch(BaseModel):
    project_id: Optional[str] = None
    title: Optional[str] = None
    summary: Optional[str] = None
    reasoning: Optional[str] = None
    alternatives: Optional[list] = None
    outcome: Optional[str] = None
    related_conversation_ids: Optional[list] = None
    related_note_ids: Optional[list] = None
    related_task_ids: Optional[list] = None
    tags: Optional[list] = None
    status: Optional[str] = None

@api.get("/decisions")
async def list_decisions(
    project_id: Optional[str] = None,
    user=Depends(get_current_user)
):
    uid = user["id"]
    query: dict = {"user_id": uid}
    if project_id:
        query["project_id"] = project_id
    items = await db.decisions.find(query, {"_id": 0}).sort("created_at", -1).to_list(200)
    return items

@api.post("/decisions", status_code=201)
async def create_decision(req: DecisionReq, user=Depends(get_current_user)):
    uid = user["id"]
    doc = {
        "id": str(uuid.uuid4()),
        "user_id": uid,
        **req.model_dump(),
        "created_at": now_iso(),
        "updated_at": now_iso(),
    }
    await db.decisions.insert_one(doc)
    doc.pop("_id", None)
    return doc

@api.patch("/decisions/{did}")
async def update_decision(did: str, req: DecisionPatch, user=Depends(get_current_user)):
    uid = user["id"]
    patch = {k: v for k, v in req.model_dump().items() if v is not None}
    if not patch:
        raise HTTPException(400, "No fields to update")
    patch["updated_at"] = now_iso()
    result = await db.decisions.update_one({"id": did, "user_id": uid}, {"$set": patch})
    if result.matched_count == 0:
        raise HTTPException(404, "Decision not found")
    return await db.decisions.find_one({"id": did, "user_id": uid}, {"_id": 0})

@api.delete("/decisions/{did}")
async def delete_decision(did: str, user=Depends(get_current_user)):
    uid = user["id"]
    result = await db.decisions.delete_one({"id": did, "user_id": uid})
    if result.deleted_count == 0:
        raise HTTPException(404, "Decision not found")
    return {"ok": True}


# ─── Priority 4: Cortex Timeline ──────────────────────────────────────────

class TimelineEventReq(BaseModel):
    type: str = Field(..., min_length=1, max_length=80)
    title: str = Field(..., min_length=1, max_length=300)
    details: str = ""
    project_id: str = ""
    entity_id: str = ""
    entity_type: str = ""  # note | task | decision | session | file
    source: str = "client"  # client | cortex | system
    icon: str = ""

@api.get("/timeline")
async def list_timeline(
    limit: int = 50,
    project_id: Optional[str] = None,
    event_type: Optional[str] = None,
    user=Depends(get_current_user),
):
    uid = user["id"]
    query: dict = {"user_id": uid}
    if project_id:
        query["project_id"] = project_id
    if event_type:
        query["type"] = event_type
    items = await db.timeline_events.find(query, {"_id": 0}).sort("created_at", -1).limit(min(limit, 200)).to_list(200)
    return items

@api.post("/timeline", status_code=201)
async def create_timeline_event(req: TimelineEventReq, user=Depends(get_current_user)):
    uid = user["id"]
    doc = {
        "id": str(uuid.uuid4()),
        "user_id": uid,
        **req.model_dump(),
        "created_at": now_iso(),
    }
    await db.timeline_events.insert_one(doc)
    doc.pop("_id", None)
    return doc

@api.delete("/timeline/{eid}")
async def delete_timeline_event(eid: str, user=Depends(get_current_user)):
    uid = user["id"]
    result = await db.timeline_events.delete_one({"id": eid, "user_id": uid})
    if result.deleted_count == 0:
        raise HTTPException(404, "Event not found")
    return {"ok": True}


# ─── Priority 7: Cortex Interrupts ────────────────────────────────────────

@api.get("/ai/interrupts/check")
async def check_interrupts(user=Depends(get_current_user)):
    """
    Proactive Cortex insight check.
    Analyzes recent notes + tasks + memories and returns
    a single contextual suggestion when one is warranted.
    Returns null if nothing noteworthy.
    """
    uid = user["id"]
    await rate_limit(f"interrupts:{uid}", max_per_min=4)

    if not gemini_client:
        return {"interrupt": None}

    # Gather recent data (lightweight — only what changed recently)
    recent_notes = await db.notes.find(
        {"user_id": uid},
        {"_id": 0, "title": 1, "content": 1, "updated_at": 1}
    ).sort("updated_at", -1).limit(4).to_list(4)

    open_tasks = await db.tasks.find(
        {"user_id": uid, "status": {"$nin": ["done", "cancelled"]}},
        {"_id": 0, "title": 1, "due_date": 1, "status": 1}
    ).sort("updated_at", -1).limit(6).to_list(6)

    recent_memories = await db.cortex_memories.find(
        {"user_id": uid},
        {"_id": 0, "content": 1, "category": 1}
    ).sort("importance_score", -1).limit(4).to_list(4)

    # Build compact context
    context_parts = []
    if recent_notes:
        context_parts.append("RECENT NOTES:\n" + "\n".join(
            f"- {n.get('title','Untitled')}: {(n.get('content','')[:120])}"
            for n in recent_notes
        ))
    if open_tasks:
        now_dt = datetime.now(timezone.utc)
        overdue = [t for t in open_tasks if t.get("due_date") and datetime.fromisoformat(t["due_date"].replace("Z", "+00:00")) < now_dt]
        if overdue:
            context_parts.append("OVERDUE TASKS:\n" + "\n".join(f"- {t['title']}" for t in overdue))
        else:
            context_parts.append("OPEN TASKS:\n" + "\n".join(f"- {t['title']}" for t in open_tasks[:3]))
    if recent_memories:
        context_parts.append("KEY MEMORIES:\n" + "\n".join(
            f"- {m.get('content','')[:100]}" for m in recent_memories
        ))

    if not context_parts:
        return {"interrupt": None}

    prompt = (
        "You are Cortex, a respectful AI assistant. Based on the context below, "
        "decide if there is ONE genuinely useful observation worth surfacing to the user RIGHT NOW. "
        "Be brief, concrete, and non-intrusive. Do NOT generate trivial suggestions.\n\n"
        "Return ONLY valid JSON:\n"
        '{"should_interrupt": true/false, "type": "reminder|insight|warning|tip", '
        '"title": "short title", "body": "1-2 sentences max", "icon": "fa-solid fa-ICON", "urgency": "high|normal|low"}\n\n'
        "Return {\"should_interrupt\": false} if nothing is truly worth surfacing.\n\n"
        + "\n\n".join(context_parts)
    )

    try:
        resp = gemini_client.models.generate_content(
            model="gemini-2.0-flash-lite",
            contents=prompt,
        )
        raw = (resp.text or "").strip().replace("```json","").replace("```","").strip()
        import json as _json
        parsed = _json.loads(raw)
        if not parsed.get("should_interrupt"):
            return {"interrupt": None}
        return {"interrupt": {
            "type":    parsed.get("type", "insight"),
            "title":   parsed.get("title", "Cortex"),
            "body":    parsed.get("body", ""),
            "icon":    parsed.get("icon", "fa-solid fa-lightbulb"),
            "urgency": parsed.get("urgency", "normal"),
            "id":      str(uuid.uuid4()),
        }}
    except Exception:
        return {"interrupt": None}


# Analytics summary
@api.get("/analytics/summary")
async def analytics_summary(user=Depends(get_current_user)):
    uid = user["id"]
    notes = await db.notes.count_documents({"user_id": uid})
    tasks = await db.tasks.count_documents({"user_id": uid})
    done = await db.tasks.count_documents({"user_id": uid, "status": "done"})
    events = await db.events.count_documents({"user_id": uid})
    memories = await db.memories.count_documents({"user_id": uid})
    images = await db.images.count_documents({"user_id": uid})
    messages = await db.chat_messages.count_documents({"user_id": uid})
    txns = await db.transactions.find({"user_id": uid}, {"_id": 0}).to_list(1000)
    income = sum(t["amount"] for t in txns if t.get("type") == "income")
    expense = sum(t["amount"] for t in txns if t.get("type") == "expense")
    return {
        "notes": notes,
        "tasks": tasks,
        "tasks_done": done,
        "events": events,
        "memories": memories,
        "images": images,
        "messages": messages,
        "income": income,
        "expense": expense,
        "net": income - expense,
    }

app.include_router(api)

_cors_env = os.environ.get("CORS_ORIGINS", "*")
if _cors_env.strip() == "*":
    app.add_middleware(
        CORSMiddleware,
        allow_origin_regex=".*",
        allow_credentials=True,
        allow_methods=["*"],
        allow_headers=["*"],
    )
else:
    app.add_middleware(
        CORSMiddleware,
        allow_origins=[o.strip() for o in _cors_env.split(",") if o.strip()],
        allow_credentials=True,
        allow_methods=["*"],
        allow_headers=["*"],
    )

logging.basicConfig(level=logging.INFO)
logger = logging.getLogger(__name__)

# ── Serve built React frontend (production) ───────────────────────────────
_FRONTEND_BUILD = Path(__file__).parent.parent / "frontend" / "build"
if _FRONTEND_BUILD.exists():
    app.mount("/static", StaticFiles(directory=str(_FRONTEND_BUILD / "static")), name="static")

    @app.get("/{full_path:path}", include_in_schema=False)
    async def serve_spa(full_path: str):
        file = _FRONTEND_BUILD / full_path
        if file.exists() and file.is_file():
            return FileResponse(str(file))
        return FileResponse(str(_FRONTEND_BUILD / "index.html"))
