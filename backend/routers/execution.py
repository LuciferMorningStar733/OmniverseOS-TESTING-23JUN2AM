"""Account-owned execution checkpoints, never a certification of client-side gameplay."""
from datetime import datetime, timedelta, timezone
from typing import Literal
from uuid import UUID
import re
from fastapi import APIRouter, Depends, HTTPException
from pydantic import BaseModel, Field
from core.auth import get_current_user
from core.database import db, IS_MOCK_DB

router = APIRouter(prefix="/execution", tags=["execution"])


def redact(value: str) -> str:
    value = re.sub(r"(?i)(bearer\s+)[\w.\-]+", r"\1[REDACTED]", value)
    return re.sub(r"(?i)((?:api[_-]?key|token|password|secret)\s*[=:]\s*)[^\s,;]+", r"\1[REDACTED]", value)[:4000]


class CreateTask(BaseModel):
    id: UUID
    intent: str = Field(min_length=1, max_length=4000)


class Checkpoint(BaseModel):
    revision: int = Field(ge=0)
    stage: Literal["inspecting", "generating", "saving", "previewing", "needs_verification", "blocked", "cancelled"]
    attempt: int = Field(default=0, ge=0, le=3)
    project: str | None = Field(default=None, max_length=100)
    detail: str = Field(default="", max_length=1000)


@router.on_event("startup")
async def task_retention():
    await db.execution_tasks.create_index("expires_at", expireAfterSeconds=0)
    await db.execution_tasks.create_index([("user_id", 1), ("created_at", -1)])


def visible(doc):
    doc.pop("_id", None)
    doc.pop("user_id", None)
    doc["durable"] = not IS_MOCK_DB
    doc["evidence_kind"] = "client_checkpoint_not_independent_verification"
    return doc


@router.post("/tasks")
async def create_task(req: CreateTask, user=Depends(get_current_user)):
    now = datetime.now(timezone.utc)
    task_id = str(req.id)
    # Single upsert: retries cannot reset budgets or replace another account's task.
    await db.execution_tasks.update_one({"id": task_id, "user_id": user["id"]}, {"$setOnInsert": {
        "id": task_id, "user_id": user["id"], "intent": redact(req.intent),
        "plan": {"applications": ["code"], "tools": ["code.inspect", "code.preview"],
            "runtime": "isolated_browser_html", "steps": ["inspect", "preserve", "generate", "save_readback", "preview", "independent_verification"],
            "completion_criteria": ["saved_files_read_back", "independent_functionality_verdict"],
            "approval_policy": "No shell, deletion, overwrite, installation or deployment tools available"},
        "revision": 0, "stage": "inspecting", "attempt": 0, "project": None, "events": [],
        "created_at": now, "expires_at": now + timedelta(days=30),
    }}, upsert=True)
    return visible(await db.execution_tasks.find_one({"id": task_id, "user_id": user["id"]}))


async def owned(task_id: UUID, user):
    doc = await db.execution_tasks.find_one({"id": str(task_id), "user_id": user["id"],
        "expires_at": {"$gt": datetime.now(timezone.utc)}})
    if not doc:
        raise HTTPException(404, "Task not found")
    return doc


@router.get("/tasks/{task_id}")
async def get_task(task_id: UUID, user=Depends(get_current_user)):
    return visible(await owned(task_id, user))


@router.patch("/tasks/{task_id}")
async def checkpoint(task_id: UUID, req: Checkpoint, user=Depends(get_current_user)):
    current = await owned(task_id, user)
    if current["revision"] != req.revision or req.attempt < current["attempt"]:
        raise HTTPException(409, "Stale checkpoint or attempt budget reset")
    if current["revision"] >= 60:
        raise HTTPException(409, "Task checkpoint budget exhausted")
    if req.project and not re.fullmatch(r"cortex-project-[a-zA-Z0-9-]+", req.project):
        raise HTTPException(422, "Invalid project scope")
    event = {"stage": req.stage, "attempt": req.attempt, "detail": redact(req.detail), "at": datetime.now(timezone.utc)}
    result = await db.execution_tasks.update_one({"id": str(task_id), "user_id": user["id"], "revision": req.revision}, {
        "$set": {"stage": req.stage, "attempt": req.attempt, "project": req.project or current.get("project")},
        "$inc": {"revision": 1}, "$push": {"events": {"$each": [event], "$slice": -60}},
    })
    if result.modified_count != 1:
        raise HTTPException(409, "Concurrent task update")
    return visible(await owned(task_id, user))
