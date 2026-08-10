import uuid
from datetime import datetime, timezone
from fastapi import APIRouter, HTTPException, Depends
from pydantic import BaseModel, Field
from core.database import db, now_iso
from core.auth import get_current_user

router = APIRouter(tags=["memory"])

CORTEX_MEMORY_CATEGORIES = {
    "Personal", "Preferences", "Devices", "Vehicles",
    "Projects", "Work", "Contacts", "Locations", "Other",
}

class MemoryReq(BaseModel):
    content: str
    tag: str = "general"

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

class MemoryRelevantReq(BaseModel):
    query: str = Field(..., max_length=2000)
    limit: int = Field(default=6, ge=1, le=20)

@router.get("/memories")
async def list_cortex_memories(user=Depends(get_current_user)):
    return await db.cortex_memories.find(
        {"user_id": user["id"]}, {"_id": 0}
    ).sort("created_at", -1).to_list(500)

@router.post("/memories")
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

@router.put("/memories/{mid}")
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
    return await db.cortex_memories.find_one({"id": mid}, {"_id": 0})

@router.delete("/memories/{mid}")
async def delete_cortex_memory(mid: str, user=Depends(get_current_user)):
    res = await db.cortex_memories.delete_one({"id": mid, "user_id": user["id"]})
    if res.deleted_count == 0:
        raise HTTPException(404, "Memory not found")
    return {"ok": True}

@router.post("/memories/relevant")
async def get_relevant_memories(req: MemoryRelevantReq, user=Depends(get_current_user)):
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
    now_dt = datetime.now(timezone.utc)

    def hybrid_score(m):
        text = (m.get("title","") + " " + m.get("content","") + " " + m.get("category","")).lower()
        words = set(text.split()) - stop
        overlap = len(qwords & words) if qwords else 0
        similarity = (overlap * 2.5)

        created_str = m.get("created_at") or m.get("updated_at")
        hours_old = 720.0
        if created_str:
            try:
                dt = datetime.fromisoformat(created_str.replace("Z", "+00:00"))
                hours_old = max(0.0, (now_dt - dt).total_seconds() / 3600.0)
            except Exception:
                pass
        recency = max(0.1, 1.0 - (hours_old / 720.0))

        importance = float(m.get("importance_score", 0.5))
        nf_mult = 3.0 if m.get("never_forget") else 1.0
        pin_mult = 1.5 if m.get("pinned") else 1.0

        final_score = (similarity + recency + importance) * nf_mult * pin_mult

        reasons = []
        if overlap > 0:
            reasons.append(f"Matches {overlap} key term(s)")
        if m.get("never_forget"):
            reasons.append("Never Forget flag")
        if m.get("pinned"):
            reasons.append("Pinned")
        if recency > 0.8:
            reasons.append("Recent memory")
        m["relevance_reason"] = " · ".join(reasons) if reasons else "High importance score"
        m["hybrid_score"] = round(final_score, 2)
        return final_score

    scored = sorted(all_mems, key=hybrid_score, reverse=True)
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
        for m in top:
            m["use_count"] = int(m.get("use_count", 0)) + 1
        today_date = datetime.now(timezone.utc).strftime("%Y-%m-%d")
        await db.memory_activity.update_one(
            {"user_id": user["id"], "date": today_date},
            {"$inc": {"count": len(top)}, "$set": {"updated_at": now_iso()}},
            upsert=True,
        )
    return top
