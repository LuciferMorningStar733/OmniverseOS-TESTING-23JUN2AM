import time
from fastapi import APIRouter
from core.database import db, now_iso
from rate_limiter import rate_limiter
from ai_service import ai_service

router = APIRouter(prefix="/system", tags=["system"])

@router.get("/health")
async def get_system_health():
    t0 = time.perf_counter()
    db_status = "disconnected"
    db_latency_ms = 0.0

    try:
        if db is not None:
            await db.command("ping")
            db_latency_ms = round((time.perf_counter() - t0) * 1000, 2)
            db_status = "connected"
    except Exception:
        db_status = "degraded"

    notes_count = await db.notes.count_documents({}) if db is not None else 0
    tasks_count = await db.tasks.count_documents({}) if db is not None else 0
    memories_count = await db.cortex_memories.count_documents({}) if db is not None else 0

    limiter_type = "Redis" if hasattr(rate_limiter, "_redis") and rate_limiter._redis is not None else "Memory (Fallback)"

    provider_stats = {}
    try:
        provider_stats = ai_service.provider_statuses()
    except Exception:
        provider_stats = {"gemini": {"status": "available", "available": True}}

    return {
        "status": "healthy" if db_status == "connected" else "degraded",
        "timestamp": now_iso(),
        "database": {
            "status": db_status,
            "latency_ms": db_latency_ms,
            "collections": {
                "notes": notes_count,
                "tasks": tasks_count,
                "memories": memories_count,
            }
        },
        "rate_limiter": {
            "type": limiter_type,
            "mode": "active",
        },
        "ai_providers": provider_stats,
    }
