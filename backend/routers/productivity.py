import uuid
from fastapi import APIRouter, HTTPException, Depends
from pydantic import BaseModel, Field
from typing import Optional
from core.database import db, now_iso
from core.auth import get_current_user
from rate_limiter import rate_limiter

router = APIRouter(tags=["productivity"])

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

class FileReq(BaseModel):
    name: str
    type: str = "file"
    parent: str = "root"
    content: str = ""
    size: int = 0

class ClipboardReq(BaseModel):
    content: str = Field(..., min_length=1, max_length=20000)
    label: str = ""

# ── Notes Endpoints ────────────────────────────────────────────────────────
@router.get("/notes")
async def list_notes(user=Depends(get_current_user)):
    return await db.notes.find({"user_id": user["id"]}, {"_id": 0}).to_list(500)

@router.post("/notes")
async def create_note(req: NoteReq, user=Depends(get_current_user)):
    doc = {
        "id": str(uuid.uuid4()),
        "user_id": user["id"],
        "title": req.title,
        "content": req.content,
        "color": req.color,
        "created_at": now_iso(),
        "updated_at": now_iso(),
    }
    await db.notes.insert_one(doc)
    doc.pop("_id", None)
    return doc

@router.put("/notes/{nid}")
async def update_note(nid: str, req: NoteReq, user=Depends(get_current_user)):
    data = {
        "title": req.title,
        "content": req.content,
        "color": req.color,
        "updated_at": now_iso(),
    }
    res = await db.notes.update_one({"id": nid, "user_id": user["id"]}, {"$set": data})
    if res.matched_count == 0:
        raise HTTPException(404, "Note not found")
    return await db.notes.find_one({"id": nid}, {"_id": 0})

@router.delete("/notes/{nid}")
async def delete_note(nid: str, user=Depends(get_current_user)):
    res = await db.notes.delete_one({"id": nid, "user_id": user["id"]})
    if res.deleted_count == 0:
        raise HTTPException(404, "Note not found")
    return {"ok": True}

# ── Tasks Endpoints ────────────────────────────────────────────────────────
@router.get("/tasks")
async def list_tasks(user=Depends(get_current_user)):
    return await db.tasks.find({"user_id": user["id"]}, {"_id": 0}).to_list(500)

@router.post("/tasks")
async def create_task(req: TaskReq, user=Depends(get_current_user)):
    doc = {
        "id": str(uuid.uuid4()),
        "user_id": user["id"],
        "title": req.title,
        "description": req.description,
        "status": req.status,
        "priority": req.priority,
        "created_at": now_iso(),
    }
    await db.tasks.insert_one(doc)
    doc.pop("_id", None)
    return doc

@router.put("/tasks/{tid}")
async def update_task(tid: str, req: TaskReq, user=Depends(get_current_user)):
    data = {
        "title": req.title,
        "description": req.description,
        "status": req.status,
        "priority": req.priority,
    }
    res = await db.tasks.update_one({"id": tid, "user_id": user["id"]}, {"$set": data})
    if res.matched_count == 0:
        raise HTTPException(404, "Task not found")
    return await db.tasks.find_one({"id": tid}, {"_id": 0})

@router.delete("/tasks/{tid}")
async def delete_task(tid: str, user=Depends(get_current_user)):
    res = await db.tasks.delete_one({"id": tid, "user_id": user["id"]})
    if res.deleted_count == 0:
        raise HTTPException(404, "Task not found")
    return {"ok": True}

# ── Events Endpoints ───────────────────────────────────────────────────────
@router.get("/events")
async def list_events(user=Depends(get_current_user)):
    return await db.events.find({"user_id": user["id"]}, {"_id": 0}).to_list(500)

@router.post("/events")
async def create_event(req: EventReq, user=Depends(get_current_user)):
    doc = {
        "id": str(uuid.uuid4()),
        "user_id": user["id"],
        "title": req.title,
        "date": req.date,
        "time": req.time,
        "color": req.color,
        "description": req.description,
        "created_at": now_iso(),
    }
    await db.events.insert_one(doc)
    doc.pop("_id", None)
    return doc

@router.delete("/events/{eid}")
async def delete_event(eid: str, user=Depends(get_current_user)):
    res = await db.events.delete_one({"id": eid, "user_id": user["id"]})
    if res.deleted_count == 0:
        raise HTTPException(404, "Event not found")
    return {"ok": True}

# ── Transactions Endpoints ─────────────────────────────────────────────────
@router.get("/transactions")
async def list_transactions(user=Depends(get_current_user)):
    return await db.transactions.find({"user_id": user["id"]}, {"_id": 0}).to_list(500)

@router.post("/transactions")
async def create_transaction(req: TxnReq, user=Depends(get_current_user)):
    doc = {
        "id": str(uuid.uuid4()),
        "user_id": user["id"],
        "title": req.title,
        "amount": req.amount,
        "category": req.category,
        "type": req.type,
        "date": req.date,
        "created_at": now_iso(),
    }
    await db.transactions.insert_one(doc)
    doc.pop("_id", None)
    return doc

@router.delete("/transactions/{tid}")
async def delete_transaction(tid: str, user=Depends(get_current_user)):
    res = await db.transactions.delete_one({"id": tid, "user_id": user["id"]})
    if res.deleted_count == 0:
        raise HTTPException(404, "Transaction not found")
    return {"ok": True}

# ── Clipboard Endpoints ────────────────────────────────────────────────────
@router.get("/clipboard")
async def list_clipboard(user=Depends(get_current_user)):
    return await db.clipboard.find({"user_id": user["id"]}, {"_id": 0}).to_list(500)

@router.post("/clipboard")
async def create_clipboard(req: ClipboardReq, user=Depends(get_current_user)):
    doc = {
        "id": str(uuid.uuid4()),
        "user_id": user["id"],
        "content": req.content,
        "label": req.label,
        "created_at": now_iso(),
    }
    await db.clipboard.insert_one(doc)
    doc.pop("_id", None)
    return doc

@router.put("/clipboard/{cid}")
async def update_clipboard(cid: str, req: ClipboardReq, user=Depends(get_current_user)):
    data = {"content": req.content, "label": req.label}
    res = await db.clipboard.update_one({"id": cid, "user_id": user["id"]}, {"$set": data})
    if res.matched_count == 0:
        raise HTTPException(404, "Clipboard item not found")
    return await db.clipboard.find_one({"id": cid}, {"_id": 0})

@router.delete("/clipboard/{cid}")
async def delete_clipboard(cid: str, user=Depends(get_current_user)):
    res = await db.clipboard.delete_one({"id": cid, "user_id": user["id"]})
    if res.deleted_count == 0:
        raise HTTPException(404, "Clipboard item not found")
    return {"ok": True}

# ── Files Endpoints ────────────────────────────────────────────────────────
@router.get("/files")
async def list_files(user=Depends(get_current_user)):
    return await db.files.find({"user_id": user["id"]}, {"_id": 0}).to_list(500)

@router.post("/files")
async def create_file(req: FileReq, user=Depends(get_current_user)):
    doc = {
        "id": str(uuid.uuid4()),
        "user_id": user["id"],
        "name": req.name,
        "type": req.type,
        "parent": req.parent,
        "content": req.content,
        "size": req.size,
        "created_at": now_iso(),
    }
    await db.files.insert_one(doc)
    doc.pop("_id", None)
    return doc

@router.delete("/files/{fid}")
async def delete_file(fid: str, user=Depends(get_current_user)):
    res = await db.files.delete_one({"id": fid, "user_id": user["id"]})
    if res.deleted_count == 0:
        raise HTTPException(404, "File not found")
    return {"ok": True}

# ── Analytics Endpoint ─────────────────────────────────────────────────────
@router.get("/analytics/summary")
async def get_analytics_summary(user=Depends(get_current_user)):
    uid = user["id"]
    notes_count = await db.notes.count_documents({"user_id": uid})
    tasks_count = await db.tasks.count_documents({"user_id": uid})
    events_count = await db.events.count_documents({"user_id": uid})
    txns = await db.transactions.find({"user_id": uid}, {"_id": 0}).to_list(5000)

    income = sum(t["amount"] for t in txns if t.get("type") == "income")
    expense = sum(t["amount"] for t in txns if t.get("type") == "expense")

    return {
        "notes": notes_count,
        "tasks": tasks_count,
        "events": events_count,
        "income": income,
        "expense": expense,
        "net": income - expense,
    }
