import json
from fastapi import APIRouter, HTTPException, Depends
from fastapi.responses import StreamingResponse
from pydantic import BaseModel, Field
from typing import Optional
from core.auth import get_current_user
from ai_service import generate_stream
from rate_limiter import rate_limiter

router = APIRouter(prefix="/ai", tags=["agents"])

class AgentHistoryMsg(BaseModel):
    role: str
    content: str = Field(..., max_length=5000)

class FaceoffReq(BaseModel):
    topic: str = Field(..., min_length=1, max_length=2000)

class AdversaryReq(BaseModel):
    idea: str = Field(..., min_length=1, max_length=3000)
    persona: str = "Ruthless VC"
    history: list[AgentHistoryMsg] = Field(default=[], max_length=20)

class WarRoomReq(BaseModel):
    dilemma: str = Field(..., min_length=1, max_length=3000)
    history: list[AgentHistoryMsg] = Field(default=[], max_length=20)

class DeadReckoningReq(BaseModel):
    assessment: str = Field(..., min_length=1, max_length=4000)
    history: list[AgentHistoryMsg] = Field(default=[], max_length=20)

class FollowupReq(BaseModel):
    tool: str = Field(..., max_length=50)
    context: str = Field(default="", max_length=8000)
    message: str = Field(..., min_length=1, max_length=3000)
    history: list[AgentHistoryMsg] = Field(default=[], max_length=30)

@router.post("/faceoff")
async def ai_faceoff(req: FaceoffReq, user=Depends(get_current_user)):
    await rate_limiter.check_rate_limit(f"faceoff:{user['id']}", max_per_min=10)
    prompt = (
        f"Generate an intense debate between model Alpha and model Beta on the topic: '{req.topic}'.\n"
        "Format output as structured SSE chunks."
    )

    async def sse_gen():
        async for chunk in generate_stream(prompt=prompt):
            yield f"data: {chunk}\n\n"
        yield "data: [DONE]\n\n"

    return StreamingResponse(sse_gen(), media_type="text/event-stream")

@router.post("/adversary")
async def ai_adversary(req: AdversaryReq, user=Depends(get_current_user)):
    await rate_limiter.check_rate_limit(f"adversary:{user['id']}", max_per_min=10)
    system = f"You are an Adversary AI operating as '{req.persona}'. Attack weak points relentlessly."

    history_dicts = [{"role": m.role, "content": m.content} for m in req.history]

    async def sse_gen():
        async for chunk in generate_stream(prompt=req.idea, system=system, history=history_dicts):
            yield f"data: {chunk}\n\n"
        yield "data: [DONE]\n\n"

    return StreamingResponse(sse_gen(), media_type="text/event-stream")

@router.post("/warroom")
async def ai_warroom(req: WarRoomReq, user=Depends(get_current_user)):
    await rate_limiter.check_rate_limit(f"warroom:{user['id']}", max_per_min=10)
    system = "You are a 5-perspective War Room (Investor, Customer, Competitor, Critic, Journalist)."
    history_dicts = [{"role": m.role, "content": m.content} for m in req.history]

    async def sse_gen():
        async for chunk in generate_stream(prompt=req.dilemma, system=system, history=history_dicts):
            yield f"data: {chunk}\n\n"
        yield "data: [DONE]\n\n"

    return StreamingResponse(sse_gen(), media_type="text/event-stream")

@router.post("/deadreckoning")
async def ai_deadreckoning(req: DeadReckoningReq, user=Depends(get_current_user)):
    await rate_limiter.check_rate_limit(f"deadreckoning:{user['id']}", max_per_min=10)
    system = "You are a Cold Trajectory Analyst mapping ruthless long-term projections."
    history_dicts = [{"role": m.role, "content": m.content} for m in req.history]

    async def sse_gen():
        async for chunk in generate_stream(prompt=req.assessment, system=system, history=history_dicts):
            yield f"data: {chunk}\n\n"
        yield "data: [DONE]\n\n"

    return StreamingResponse(sse_gen(), media_type="text/event-stream")

@router.post("/tool/followup")
async def ai_tool_followup(req: FollowupReq, user=Depends(get_current_user)):
    await rate_limiter.check_rate_limit(f"followup:{user['id']}", max_per_min=15)
    system = f"You are continuing a follow-up conversation for tool: '{req.tool}'."
    history_dicts = [{"role": m.role, "content": m.content} for m in req.history]

    async def sse_gen():
        async for chunk in generate_stream(prompt=req.message, system=system, history=history_dicts):
            yield f"data: {chunk}\n\n"
        yield "data: [DONE]\n\n"

    return StreamingResponse(sse_gen(), media_type="text/event-stream")
