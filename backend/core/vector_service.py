import os
import math
import hashlib
import httpx
import logging
from typing import Optional

logger = logging.getLogger(__name__)

GEMINI_API_KEY = os.environ.get("GEMINI_API_KEY", "")
EMBEDDING_MODEL = "text-embedding-004"
VECTOR_DIM = 128

def _fallback_vector(text: str, dim: int = VECTOR_DIM) -> list[float]:
    """Generates a deterministic 128-dim normalized dense vector for offline/fallback mode."""
    words = text.lower().split()
    vec = [0.0] * dim
    for w in words:
        h = int(hashlib.md5(w.encode("utf-8")).hexdigest(), 16)
        idx = h % dim
        val = ((h >> 8) % 1000) / 1000.0
        vec[idx] += val + 1.0

    mag = math.sqrt(sum(x * x for x in vec))
    if mag > 0:
        vec = [x / mag for x in vec]
    else:
        vec = [1.0 / math.sqrt(dim)] * dim
    return vec

async def generate_embedding_async(text: str) -> list[float]:
    """Generates a dense vector embedding via Gemini text-embedding-004 or fallback."""
    if not text or not text.strip():
        return _fallback_vector("empty")

    key = os.environ.get("GEMINI_API_KEY", "")
    if key:
        url = f"https://generativelanguage.googleapis.com/v1beta/models/{EMBEDDING_MODEL}:embedContent?key={key}"
        payload = {
            "model": f"models/{EMBEDDING_MODEL}",
            "content": {"parts": [{"text": text[:2000]}]},
        }
        try:
            async with httpx.AsyncClient(timeout=10.0) as http:
                resp = await http.post(url, json=payload)
                if resp.status_code == 200:
                    data = resp.json()
                    values = data.get("embedding", {}).get("values", [])
                    if values:
                        mag = math.sqrt(sum(x * x for x in values))
                        if mag > 0:
                            return [x / mag for x in values]
                        return values
        except Exception as exc:
            logger.warning("[VectorService] Gemini API embedding error: %s — using fallback vector", exc)

    return _fallback_vector(text)

def cosine_similarity(v1: list[float], v2: list[float]) -> float:
    """Computes cosine similarity between two float vectors."""
    if not v1 or not v2:
        return 0.0

    min_len = min(len(v1), len(v2))
    dot = sum(v1[i] * v2[i] for i in range(min_len))
    mag1 = math.sqrt(sum(v1[i] * v1[i] for i in range(min_len)))
    mag2 = math.sqrt(sum(v2[i] * v2[i] for i in range(min_len)))

    if mag1 == 0 or mag2 == 0:
        return 0.0

    sim = dot / (mag1 * mag2)
    return max(0.0, min(1.0, sim))
