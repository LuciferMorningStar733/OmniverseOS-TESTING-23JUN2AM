from fastapi import FastAPI, APIRouter, HTTPException, Depends
from fastapi.responses import StreamingResponse, FileResponse
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
from pathlib import Path
from pydantic import BaseModel, EmailStr, Field
from typing import Optional
import uuid
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

class ChatReq(BaseModel):
    session_id: str = Field(..., max_length=120)
    message: str = Field(..., min_length=1, max_length=MAX_MESSAGE_LEN)
    provider: str = "gemini"
    model: str = "gemini-2.5-flash"
    preferred_provider: str = "auto"
    system: Optional[str] = Field(default=None, max_length=4000)

class ImageGenReq(BaseModel):
    prompt: str = Field(..., min_length=1, max_length=MAX_PROMPT_LEN)

class TtsReq(BaseModel):
    text: str = Field(..., min_length=1, max_length=5000)
    voice_name: str = Field(default="en-US-Journey-F", max_length=60)
    speaking_rate: float = Field(default=1.0, ge=0.25, le=4.0)
    pitch: float = Field(default=0.0, ge=-20.0, le=20.0)
    volume_gain_db: float = Field(default=0.0, ge=-96.0, le=16.0)
    use_ssml: bool = False

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

class FileReq(BaseModel):
    name: str
    type: str = "file"
    parent: str = "root"
    content: str = ""
    size: int = 0

class ClipboardReq(BaseModel):
    content: str = Field(..., min_length=1, max_length=20000)
    label: str = ""

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

# ---------- Routes: TTS (Google Cloud Text-to-Speech proxy) ----------
_ALLOWED_TTS_VOICES = {
    "en-US-Journey-F", "en-US-Journey-D",
    "en-US-Neural2-F", "en-US-Neural2-D", "en-US-Neural2-A",
    "en-US-Studio-O", "en-US-Studio-M",
    "en-GB-Journey-F", "en-GB-Neural2-A", "en-GB-Neural2-B",
}

@api.post("/ai/tts")
async def ai_tts(req: TtsReq, user=Depends(get_current_user)):
    """Proxy Google Cloud TTS. Returns base64-encoded MP3 audio."""
    tts_key = os.environ.get("GOOGLE_CLOUD_TTS_API_KEY", "")
    if not tts_key:
        raise HTTPException(503, "Google Cloud TTS not configured on this server")

    await rate_limit(f"tts:{user['id']}", max_per_min=30)

    voice_name = req.voice_name if req.voice_name in _ALLOWED_TTS_VOICES else "en-US-Journey-F"
    lang_code = "-".join(voice_name.split("-")[:2])

    if req.use_ssml:
        input_block = {"ssml": req.text}
    else:
        input_block = {"text": req.text}

    payload = {
        "input": input_block,
        "voice": {
            "languageCode": lang_code,
            "name": voice_name,
        },
        "audioConfig": {
            "audioEncoding": "MP3",
            "speakingRate": req.speaking_rate,
            "pitch": req.pitch,
            "volumeGainDb": req.volume_gain_db,
            "effectsProfileId": ["headphone-class-device"],
        },
    }

    try:
        async with httpx.AsyncClient(timeout=15.0) as client:
            resp = await client.post(
                f"https://texttospeech.googleapis.com/v1/text:synthesize?key={tts_key}",
                json=payload,
            )
        if resp.status_code == 400:
            raise HTTPException(400, f"Google TTS rejected request: {resp.text[:200]}")
        if resp.status_code == 403:
            raise HTTPException(403, "Google TTS API key invalid or quota exceeded")
        if resp.status_code == 429:
            raise HTTPException(429, "Google TTS rate limited")
        if not resp.is_success:
            raise HTTPException(502, f"Google TTS error {resp.status_code}")
        data = resp.json()
        audio_b64 = data.get("audioContent", "")
        if not audio_b64:
            raise HTTPException(502, "Google TTS returned empty audio")
        # Decode base64 → raw MP3 bytes and return directly.
        # This avoids re-encoding the audio as base64 in a JSON wrapper,
        # saving ~33% bandwidth and eliminating JSON parse overhead on the client.
        from fastapi.responses import Response as FastAPIResponse
        audio_bytes = base64.b64decode(audio_b64)
        return FastAPIResponse(
            content=audio_bytes,
            media_type="audio/mpeg",
            headers={
                "X-Voice-Used": voice_name,
                "Cache-Control": "no-store",
            },
        )
    except HTTPException:
        raise
    except Exception as exc:
        logger.error("Google TTS proxy error: %s", exc)
        raise HTTPException(502, "Google TTS request failed")

# ---------- Routes: Gemini TTS (primary voice provider) ----------
# Supported voices: Kore/Aoede/Zephyr/Leda (female), Puck/Charon/Fenrir (male)
_GEMINI_TTS_FEMALE_VOICES = ["Kore", "Aoede", "Zephyr", "Leda"]
_GEMINI_TTS_MALE_VOICES   = ["Puck", "Charon", "Fenrir"]
_GEMINI_TTS_ALL_VOICES    = set(_GEMINI_TTS_FEMALE_VOICES + _GEMINI_TTS_MALE_VOICES)
_GEMINI_TTS_MODEL         = "gemini-2.5-flash-preview-tts"

class GeminiTtsReq(BaseModel):
    text: str = Field(..., min_length=1, max_length=5000)
    voice: str = Field(default="Kore", max_length=30)

@api.post("/ai/tts-gemini")
async def ai_tts_gemini(req: GeminiTtsReq, user=Depends(get_current_user)):
    """
    Gemini TTS endpoint — uses the caller's existing GEMINI_API_KEY.
    No Google Cloud credentials required.
    Returns raw WAV bytes (audio/wav).
    """
    if not gemini_client:
        raise HTTPException(503, "Gemini API key not configured on this server")

    await rate_limit(f"tts:{user['id']}", max_per_min=30)

    voice_name = req.voice if req.voice in _GEMINI_TTS_ALL_VOICES else "Kore"

    try:
        response = await gemini_client.aio.models.generate_content(
            model=_GEMINI_TTS_MODEL,
            contents=req.text,
            config=genai_types.GenerateContentConfig(
                response_modalities=["AUDIO"],
                speech_config=genai_types.SpeechConfig(
                    voice_config=genai_types.VoiceConfig(
                        prebuilt_voice_config=genai_types.PrebuiltVoiceConfig(
                            voice_name=voice_name,
                        )
                    )
                ),
            ),
        )

        # Extract raw audio data from the response
        audio_data = None
        mime_type = "audio/wav"
        for part in response.candidates[0].content.parts:
            if part.inline_data and part.inline_data.data:
                audio_data = part.inline_data.data
                mime_type = part.inline_data.mime_type or "audio/wav"
                break

        if not audio_data:
            raise HTTPException(502, "Gemini TTS returned no audio data")

        from fastapi.responses import Response as FastAPIResponse
        return FastAPIResponse(
            content=audio_data,
            media_type=mime_type,
            headers={
                "X-Voice-Used": voice_name,
                "X-TTS-Provider": "gemini",
                "X-TTS-Model": _GEMINI_TTS_MODEL,
                "Cache-Control": "no-store",
            },
        )

    except HTTPException:
        raise
    except Exception as exc:
        err_str = str(exc)
        logger.error("Gemini TTS error: %s", exc)
        if "429" in err_str or "quota" in err_str.lower() or "RESOURCE_EXHAUSTED" in err_str:
            raise HTTPException(429, "Gemini TTS quota exceeded. Try again shortly.")
        if "404" in err_str or "NOT_FOUND" in err_str:
            raise HTTPException(404, f"Gemini TTS model not found: {_GEMINI_TTS_MODEL}")
        raise HTTPException(502, f"Gemini TTS failed: {err_str[:200]}")


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
    await db.chat_messages.insert_one({
        "id": str(uuid.uuid4()),
        "user_id": user["id"],
        "session_id": req.session_id,
        "role": "user",
        "content": req.message,
        "created_at": now_iso(),
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
            logger.error("Unexpected error in event_gen: %s", e)
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
    _validate_model(req.provider, req.model)
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

# ---------- Routes: AI Image Generation ----------
@api.post("/ai/image")
async def ai_image(req: ImageGenReq, user=Depends(get_current_user)):
    await rate_limit(user["id"])
    try:
        response = gemini_client.models.generate_images(
            model="imagen-4.0-generate-001",
            prompt=req.prompt,
            config=genai_types.GenerateImagesConfig(
                number_of_images=1,
                output_mime_type="image/png"
            )
                    )
        image_bytes = response.generated_images[0].image.image_bytes        
        image_b64 = base64.b64encode(image_bytes).decode()
        doc = await db.ai_images.insert_one({
            "id": str(uuid.uuid4()),
            "user_id": user["id"],
            "prompt": req.prompt,
            "image_b64": image_b64,
            "created_at": datetime.now(timezone.utc)
        })
        result = await db.ai_images.find_one({"_id": doc.inserted_id})
        result.pop("_id")
        return result
    except Exception as e:
        err_str = str(e)
        logging.exception("IMAGE GENERATION FAILURE")
        if "429" in err_str or "quota" in err_str.lower() or "RESOURCE_EXHAUSTED" in err_str:
            raise HTTPException(429, "AI quota exceeded. Try again later")
        if "400" in err_str or "safety" in err_str.lower() or "INVALID_ARGUMENT" in err_str:
            raise HTTPException(400, "Prompt blocked by safety filters")
        raise HTTPException(500, f"Image generation failed: {err_str}")

# --------- Diagnostic: Image Model Test Endpoint ---------
@api.post("/api/ai/image-test")
async def image_test():
    """Test multiple Google image generation models"""
    models_to_test = [
        "imagen-4.0-generate-001",
        "gemini-2.5-flash-image",
        "gemini-2.5-flash-image-preview",
        "gemini-2.0-flash-preview-image-generation",
    ]
    
    test_prompt = "A simple red circle"
    results = []
    
    for model_name in models_to_test:
        test_result = {
            "model": model_name,
            "success": False,
            "http_status": None,
            "error": None
        }
        
        try:
            response = gemini_client.models.generate_images(
                model=model_name,
                prompt=test_prompt,
                config=genai_types.GenerateImagesConfig(
                    number_of_images=1,
                    output_mime_type="image/png"
                )
            )
            test_result["success"] = True
            test_result["http_status"] = 200
            logging.info(f"✓ {model_name}: SUCCESS")
        except Exception as e:
            test_result["error"] = str(e)
            if "404" in str(e) or "NOT_FOUND" in str(e):
                test_result["http_status"] = 404
            elif "400" in str(e) or "INVALID_ARGUMENT" in str(e):
                test_result["http_status"] = 400
            elif "403" in str(e) or "PERMISSION_DENIED" in str(e):
                test_result["http_status"] = 403
            else:
                test_result["http_status"] = 500
            logging.error(f"✗ {model_name}: {str(e)}")
        
        results.append(test_result)
    
    return {"tested_models": results}
@api.get("/ai/image/history")
async def image_history(user=Depends(get_current_user)):
    items = await db.images.find({"user_id": user["id"]}, {"_id": 0}).sort(
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

# Memory
@api.get("/memories")
async def list_memories(user=Depends(get_current_user)):
    return await list_for_user("memories", user["id"])

@api.post("/memories")
async def create_memory(req: MemoryReq, user=Depends(get_current_user)):
    return await create_for_user("memories", user["id"], req.model_dump())

@api.delete("/memories/{mid}")
async def delete_memory(mid: str, user=Depends(get_current_user)):
    return await delete_for_user("memories", user["id"], mid)

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
