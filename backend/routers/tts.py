from fastapi import APIRouter, HTTPException, Depends, Response as FastAPIResponse
from pydantic import BaseModel, Field
import os
import asyncio
import logging
import base64
import hashlib
import httpx
from typing import Optional
from pathlib import Path
from dotenv import load_dotenv

ROOT_DIR = Path(__file__).parent.parent
load_dotenv(ROOT_DIR / ".env")

GEMINI_API_KEY = os.environ.get("GEMINI_API_KEY", "")
_GEMINI_TTS_MODEL = "gemini-2.5-flash"
_GEMINI_TTS_ALL_VOICES = {
    "Kore", "Aoede", "Zephyr", "Leda", "Schedar",
    "Puck", "Charon", "Fenrir", "Orus",
}

router = APIRouter(tags=["tts"])

# Inline TTS cache
_tts_cache: dict[str, tuple[bytes, str]] = {}
_tts_cache_keys: list[str] = []
_TTS_CACHE_MAX = 200
_tts_inflight: dict[str, asyncio.Future] = {}

def _tts_cache_key(text: str, voice: str) -> str:
    h = hashlib.sha256(f"{voice}:{text.strip()}".encode()).hexdigest()
    return f"{voice}_{h[:16]}"

def _tts_cache_get(key: str) -> Optional[tuple[bytes, str]]:
    return _tts_cache.get(key)

def _tts_cache_set(key: str, audio_bytes: bytes, mime_type: str) -> None:
    if key in _tts_cache:
        return
    if len(_tts_cache_keys) >= _TTS_CACHE_MAX:
        oldest = _tts_cache_keys.pop(0)
        _tts_cache.pop(oldest, None)
    _tts_cache[key] = (audio_bytes, mime_type)
    _tts_cache_keys.append(key)

class GeminiTtsReq(BaseModel):
    text: str = Field(..., min_length=1, max_length=5000)
    voice: str = Field(default="Kore", max_length=30)

class FishTtsReq(BaseModel):
    text: str = Field(..., min_length=1, max_length=5000)
    reference_id: Optional[str] = Field(default=None, max_length=100)

@router.post("/ai/tts-gemini")
async def ai_tts_gemini(req: GeminiTtsReq):
    if not GEMINI_API_KEY:
        raise HTTPException(503, "Gemini API key not configured on this server")

    voice_name = req.voice if req.voice in _GEMINI_TTS_ALL_VOICES else "Kore"
    cache_key = _tts_cache_key(req.text, voice_name)
    cached = _tts_cache_get(cache_key)
    if cached:
        audio_bytes, mime_type = cached
        return FastAPIResponse(
            content=audio_bytes,
            media_type=mime_type,
            headers={
                "X-Voice-Used": voice_name,
                "X-TTS-Provider": "gemini-cache",
                "X-TTS-Model": _GEMINI_TTS_MODEL,
                "X-Cache": "HIT",
                "Cache-Control": "no-store",
            },
        )

    if cache_key in _tts_inflight:
        try:
            audio_bytes, mime_type = await asyncio.shield(_tts_inflight[cache_key])
        except Exception:
            raise HTTPException(502, "Gemini TTS request failed. Please try again.")
        return FastAPIResponse(
            content=audio_bytes,
            media_type=mime_type,
            headers={
                "X-Voice-Used": voice_name,
                "X-TTS-Provider": "gemini-dedup",
                "X-TTS-Model": _GEMINI_TTS_MODEL,
                "X-Cache": "HIT",
                "Cache-Control": "no-store",
            },
        )

    inflight_fut: asyncio.Future = asyncio.get_running_loop().create_future()
    _tts_inflight[cache_key] = inflight_fut

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

        if resp.status_code != 200:
            raise HTTPException(resp.status_code, f"Gemini TTS error: {resp.text[:200]}")

        data = resp.json()
        inline = data["candidates"][0]["content"]["parts"][0]["inlineData"]
        audio_b64 = inline["data"]
        mime_type = inline.get("mimeType", "audio/wav")

        audio_bytes = base64.b64decode(audio_b64)
        _tts_cache_set(cache_key, audio_bytes, mime_type)
        if not inflight_fut.done():
            inflight_fut.set_result((audio_bytes, mime_type))

        return FastAPIResponse(
            content=audio_bytes,
            media_type=mime_type,
            headers={
                "X-Voice-Used": voice_name,
                "X-TTS-Provider": "gemini",
                "X-TTS-Model": _GEMINI_TTS_MODEL,
                "X-Cache": "MISS",
                "Cache-Control": "no-store",
            },
        )
    except Exception as exc:
        safe_exc = HTTPException(502, "Gemini TTS request failed.")
        if not inflight_fut.done():
            inflight_fut.set_exception(safe_exc)
        raise safe_exc
    finally:
        _tts_inflight.pop(cache_key, None)

@router.get("/ai/tts-gemini/test")
async def ai_tts_gemini_test():
    return {
        "status": "ok",
        "gemini_api_key_configured": bool(GEMINI_API_KEY),
        "cache_entries": len(_tts_cache),
        "inflight_requests": len(_tts_inflight),
    }

@router.get("/ai/tts-fish/status")
async def ai_tts_fish_status():
    key = os.environ.get("FISH_AUDIO_API_KEY", "")
    return {
        "configured": bool(key),
        "status": "ready" if key else "unconfigured",
    }

@router.post("/ai/tts-fish")
async def ai_tts_fish(req: FishTtsReq):
    key = os.environ.get("FISH_AUDIO_API_KEY", "")
    if not key:
        raise HTTPException(503, "Fish Audio API key not configured on server")

    ref_id = req.reference_id or "default"
    cache_key = _tts_cache_key(req.text, f"fish_{ref_id}")
    cached = _tts_cache_get(cache_key)
    if cached:
        audio_bytes, mime_type = cached
        return FastAPIResponse(
            content=audio_bytes,
            media_type=mime_type,
            headers={
                "X-TTS-Provider": "fish-cache",
                "X-Cache": "HIT",
                "Cache-Control": "no-store",
            },
        )

    if cache_key in _tts_inflight:
        try:
            audio_bytes, mime_type = await asyncio.shield(_tts_inflight[cache_key])
        except Exception:
            raise HTTPException(502, "Fish TTS request failed. Please try again.")
        return FastAPIResponse(
            content=audio_bytes,
            media_type=mime_type,
            headers={
                "X-TTS-Provider": "fish-dedup",
                "X-Cache": "HIT",
                "Cache-Control": "no-store",
            },
        )

    inflight_fut: asyncio.Future = asyncio.get_running_loop().create_future()
    _tts_inflight[cache_key] = inflight_fut

    url = "https://api.fish.audio/v1/tts"
    headers = {
        "Authorization": f"Bearer {key}",
        "Content-Type": "application/json",
    }
    payload = {
        "text": req.text,
        "format": "mp3",
    }
    if req.reference_id:
        payload["reference_id"] = req.reference_id

    try:
        async with httpx.AsyncClient(timeout=12.0) as http:
            resp = await http.post(url, headers=headers, json=payload)

        if resp.status_code != 200:
            logging.error("[FishTTS] Backend request failed with status HTTP %s", resp.status_code)
            raise HTTPException(resp.status_code, "Fish Audio synthesis error")

        audio_bytes = resp.content
        mime_type = resp.headers.get("content-type", "audio/mpeg")

        _tts_cache_set(cache_key, audio_bytes, mime_type)
        if not inflight_fut.done():
            inflight_fut.set_result((audio_bytes, mime_type))

        return FastAPIResponse(
            content=audio_bytes,
            media_type=mime_type,
            headers={
                "X-TTS-Provider": "fish",
                "X-Cache": "MISS",
                "Cache-Control": "no-store",
            },
        )
    except HTTPException:
        raise
    except Exception as exc:
        logging.error("[FishTTS] Exception during synthesis: %s", exc)
        safe_exc = HTTPException(502, "Fish TTS request failed")
        if not inflight_fut.done():
            inflight_fut.set_exception(safe_exc)
        raise safe_exc
    finally:
        _tts_inflight.pop(cache_key, None)
