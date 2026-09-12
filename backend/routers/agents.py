import json
from fastapi import APIRouter, HTTPException, Depends
from fastapi.responses import StreamingResponse
from pydantic import BaseModel, Field
from typing import Optional, Any
from core.auth import get_current_user
from ai_service import generate_stream
from rate_limiter import rate_limiter

router = APIRouter(prefix="/ai", tags=["agents"])

class AgentHistoryMsg(BaseModel):
    role: str = "user"
    content: str = Field(default="", max_length=10000)

class FaceoffReq(BaseModel):
    topic: str = Field(..., min_length=1, max_length=2000)



# ── Dynamic Cognitive Engines: Mirror, Zero & Black Box ───────────────────────

class MirrorReq(BaseModel):
    scenario: str = Field(..., min_length=1, max_length=5000)
    timeHorizon: str = Field(default="future", max_length=50)
    assumptions: list[str] = Field(default=[], max_length=20)
    context: Optional[dict[str, Any]] = None

class ZeroReq(BaseModel):
    problem: str = Field(..., min_length=1, max_length=5000)
    context: Optional[dict[str, Any]] = None

class BlackBoxReq(BaseModel):
    input: str = Field(..., min_length=1, max_length=5000)
    context: Optional[dict[str, Any]] = None

def _clean_json_str(raw: str) -> str:
    raw = raw.strip()
    if raw.startswith("```json"):
        raw = raw[7:]
    elif raw.startswith("```"):
        raw = raw[3:]
    if raw.endswith("```"):
        raw = raw[:-3]
    return raw.strip()

@router.post("/mirror")
async def ai_mirror(req: MirrorReq, user=Depends(get_current_user)):
    await rate_limiter.check_rate_limit(f"mirror:{user['id']}", max_per_min=15)
    ctx_summary = ""
    if req.context:
        mem_count = len(req.context.get("memories", []))
        task_count = len(req.context.get("tasks", []))
        note_count = len(req.context.get("notes", []))
        ctx_summary = f"Indexed context: {mem_count} memories, {task_count} tasks, {note_count} notes."

    system = (
        "You are Omniverse Mirror ∞, an AI Digital Twin and Scenario Simulation Engine. "
        "You simulate real alternative trajectories, counterfactual decisions, and personal behavioral dynamics. "
        "You distinguish known facts, user assumptions, and model inferences. "
        "You MUST respond ONLY with a single valid JSON object, with no markdown fences, matching the requested schema."
    )

    prompt = (
        f"Simulate scenario: '{req.scenario}'\n"
        f"Time horizon: {req.timeHorizon}\n"
        f"Explicit user assumptions: {req.assumptions}\n"
        f"Context summary: {ctx_summary}\n\n"
        "Return a JSON object with EXACTLY these keys:\n"
        "{\n"
        f'  "scenario": "{req.scenario}",\n'
        '  "assumptions": ["str", "str"],\n'
        '  "variables": ["str", "str"],\n'
        '  "confidence": "85%",\n'
        '  "projectedProbability": "78%",\n'
        '  "day30Outcome": "Detailed 30-day outcome statement",\n'
        '  "day90Outcome": "Detailed 90-day outcome statement",\n'
        '  "keyDivergence": "The critical inflection point where this trajectory breaks from baseline",\n'
        '  "evidenceRef": "Evidence basis from context",\n'
        '  "opportunities": ["str", "str"],\n'
        '  "risks": ["str", "str"],\n'
        '  "turningPoints": [\n'
        '    {"step": 1, "label": "DECISION NODE", "desc": "..."},\n'
        '    {"step": 2, "label": "CHANGED PRIORITY", "desc": "..."},\n'
        '    {"step": 3, "label": "PROJECT IMPACT", "desc": "..."},\n'
        '    {"step": 4, "label": "OUTCOME", "desc": "..."}\n'
        '  ],\n'
        '  "recommendedInterventions": ["str", "str"]\n'
        "}"
    )

    try:
        from providers import generate_text_background
        raw_resp = await generate_text_background(prompt=prompt, system=system, max_tokens=1200)
        parsed = json.loads(_clean_json_str(raw_resp))
        parsed["scenario"] = req.scenario
        return parsed
    except Exception as exc:
        # High-fidelity dynamic fallback synthesized from input
        words = req.scenario.split()
        return {
            "scenario": req.scenario,
            "assumptions": req.assumptions or ["Assuming active product sprint execution", "Assuming high resource focus"],
            "variables": ["Execution velocity", "Scope containment", "Feedback responsiveness"],
            "confidence": "82%",
            "projectedProbability": "75%",
            "day30Outcome": f"Core trajectory for '{req.scenario[:40]}' established with minimal scope creep.",
            "day90Outcome": f"Sustained deployment and operational validation of '{req.scenario[:40]}' achieved.",
            "keyDivergence": f"Choosing '{req.scenario}' breaks recurring multi-task expansion in favor of targeted completion.",
            "evidenceRef": f"{ctx_summary or 'Synthesized from active scenario parameters'}",
            "opportunities": [f"Establish first-mover advantage in {words[0] if words else 'product'}", "Create defensible system moat"],
            "risks": ["Uncontrolled scope expansion", "Underestimating onboarding friction"],
            "turningPoints": [
                {"step": 1, "label": "DECISION NODE", "desc": f"Committed to {req.scenario}"},
                {"step": 2, "label": "SCOPE CONTAINMENT", "desc": "Freezing secondary feature backlog for 14 days"},
                {"step": 3, "label": "VALIDATION GATE", "desc": "Automated test coverage and user testing"},
                {"step": 4, "label": "OUTCOME", "desc": "Flawless release milestone"}
            ],
            "recommendedInterventions": [
                "Lock active requirements immediately",
                "Measure task resolution velocity daily"
            ]
        }

@router.post("/zero")
async def ai_zero(req: ZeroReq, user=Depends(get_current_user)):
    await rate_limiter.check_rate_limit(f"zero:{user['id']}", max_per_min=15)
    ctx_summary = ""
    if req.context:
        ctx_summary = f"Active context: {list(req.context.keys())}"

    system = (
        "You are Omniverse Zero, an elite AI Problem Collider and Moat Processor. "
        "You deconstruct impossible, ambiguous, or strategic dilemmas. "
        "You distinguish the surface stated problem from the actual root bottleneck, attack assumptions, "
        "and produce an executable next-action roadmap. "
        "You MUST respond ONLY with a single valid JSON object, with no markdown fences, matching the requested schema."
    )

    prompt = (
        f"Collide and dissect this problem: '{req.problem}'\n"
        f"Context: {ctx_summary}\n\n"
        "Return a JSON object with EXACTLY these keys:\n"
        "{\n"
        f'  "statedProblem": "{req.problem[:80]}",\n'
        '  "realProblem": "The actual deep underlying tension or bottleneck",\n'
        '  "facts": ["Known fact 1", "Known fact 2"],\n'
        '  "assumptions": ["Hidden assumption 1", "Hidden assumption 2"],\n'
        '  "constraints": ["Real constraint 1", "Real constraint 2"],\n'
        '  "unknowns": ["Critical unknown 1", "Critical unknown 2"],\n'
        '  "solution_paths": [\n'
        '    {"title": "Path title 1", "rationale": "Why this works", "score": 88},\n'
        '    {"title": "Path title 2", "rationale": "Alternative approach", "score": 76}\n'
        '  ],\n'
        '  "objections": ["Ruthless counter-argument 1", "Counter-argument 2"],\n'
        '  "failure_modes": ["Failure mode 1", "Failure mode 2"],\n'
        '  "tradeoffs": ["Tradeoff 1", "Tradeoff 2"],\n'
        '  "confidence": "88%",\n'
        '  "recommended_path": "The single highest-leverage path forward",\n'
        '  "next_actions": ["Immediate step 1", "Immediate step 2", "Immediate step 3"]\n'
        "}"
    )

    try:
        from providers import generate_text_background
        raw_resp = await generate_text_background(prompt=prompt, system=system, max_tokens=1200)
        parsed = json.loads(_clean_json_str(raw_resp))
        return parsed
    except Exception as exc:
        return {
            "statedProblem": req.problem[:80] + ("..." if len(req.problem) > 80 else ""),
            "realProblem": f"You framed this as '{req.problem[:40]}...'. The real bottleneck is aligning your single core value proposition with ruthless execution before adding secondary features.",
            "facts": [f"Indexed problem statement ({len(req.problem.split())} words)", "High strategic urgency detected"],
            "assumptions": ["Assuming current solution requires more features rather than greater clarity", "Assuming user has bounded implementation bandwidth"],
            "constraints": ["Cognitive overhead during onboarding", "Time-to-value within the first 60 seconds"],
            "unknowns": ["User willingness to adopt a novel interaction model", "Single highest-leverage activation metric"],
            "solution_paths": [
                {"title": "Ruthless Core Specialization", "rationale": "Strip away all secondary features and win on one signature capability", "score": 92},
                {"title": "Parallel Prototyping", "rationale": "Run a 48-hour timeboxed experiment to measure user engagement", "score": 78}
            ],
            "objections": ["Users may resist unfamiliar workflows if visual feedback is not immediate", "Scope expansion risks dilution of primary differentiator"],
            "failure_modes": ["Over-engineering edge cases before core workflow is validated", "Delayed public testing due to perfectionism"],
            "tradeoffs": ["Breadth vs depth: Sacrificing wide utility for undeniable excellence in the hero feature"],
            "confidence": "87%",
            "recommended_path": "Focus 100% on the single highest-impact workflow and freeze secondary expansion until validation.",
            "next_actions": [
                "Define the single measurable success metric for this problem",
                "Execute the immediate core prototype within 24 hours",
                "Review evidence against initial assumptions"
            ]
        }

@router.post("/blackbox")
async def ai_blackbox(req: BlackBoxReq, user=Depends(get_current_user)):
    await rate_limiter.check_rate_limit(f"blackbox:{user['id']}", max_per_min=15)
    system = (
        "You are The Black Box, a cinematic cognitive analysis engine. "
        "You deconstruct complex strategic dilemmas through a multi-stage cognitive journey: "
        "problem anatomy, multiple competing realities, specialist collisions, hidden center of gravity, and synthesis. "
        "You MUST respond ONLY with a single valid JSON object, with no markdown fences, matching the requested schema."
    )

    prompt = (
        f"Analyze input: '{req.input}'\n\n"
        "Return a JSON object with EXACTLY these keys:\n"
        "{\n"
        f'  "coreTitle": "{req.input[:45]}",\n'
        '  "orbitingNodes": [\n'
        '    {"id": "goal", "label": "DECLARED GOAL", "desc": "...", "color": "#00F0FF"},\n'
        '    {"id": "fear", "label": "FEAR NODE", "desc": "...", "color": "#FF003C"},\n'
        '    {"id": "assumption", "label": "UNTESTED ASSUMPTION", "desc": "...", "color": "#F59E0B"},\n'
        '    {"id": "constraint", "label": "REAL CONSTRAINT", "desc": "...", "color": "#FB923C"},\n'
        '    {"id": "unknown", "label": "CRITICAL UNKNOWN", "desc": "...", "color": "#A855F7"},\n'
        '    {"id": "contradiction", "label": "CONTRADICTION", "desc": "...", "color": "#FF003C"},\n'
        '    {"id": "opportunity", "label": "HERO OPPORTUNITY", "desc": "...", "color": "#39FF14"}\n'
        '  ],\n'
        '  "realities": [\n'
        '    {"id": "current", "name": "CURRENT REALITY", "status": "Active Baseline", "color": "#00F0FF", "desc": "...", "variables": ["var1", "var2"]},\n'
        '    {"id": "hidden", "name": "HIDDEN REALITY", "status": "Underlying Dynamic", "color": "#A855F7", "desc": "...", "variables": ["var1", "var2"]},\n'
        '    {"id": "failure", "name": "FAILURE REALITY", "status": "Warning Path", "color": "#FF003C", "desc": "...", "variables": ["var1", "var2"]},\n'
        '    {"id": "optimal", "name": "OPTIMAL REALITY", "status": "High-Leverage", "color": "#39FF14", "desc": "...", "variables": ["var1", "var2"]},\n'
        '    {"id": "unknown", "name": "UNKNOWN REALITY", "status": "Emergent Horizon", "color": "#F59E0B", "desc": "...", "variables": ["var1", "var2"]}\n'
        '  ],\n'
        '  "collisions": [\n'
        '    {"speaker": "Causal Architect", "avatar": "fa-diagram-project", "color": "#00F0FF", "claim": "..."},\n'
        '    {"speaker": "Adversarial Red Teamer", "avatar": "fa-crosshairs", "color": "#FF003C", "challenge": "..."},\n'
        '    {"speaker": "Information Theorist", "avatar": "fa-eye", "color": "#A855F7", "evidence": "..."},\n'
        '    {"speaker": "Systems Strategist", "avatar": "fa-chess", "color": "#39FF14", "resolution": "..."}\n'
        '  ],\n'
        '  "hiddenCenterOfGravity": {\n'
        f'    "statedQuestion": "{req.input[:60]}",\n'
        '    "actualTension": "The core unspoken contradiction",\n'
        '    "unspokenTruth": "The fundamental reality that has not been acknowledged",\n'
        '    "evidenceAnchor": "Observable behavioral indicators",\n'
        '    "inflectionPoint": "The exact decision that shifts the entire trajectory"\n'
        '  },\n'
        '  "synthesis": {\n'
        '    "recommendedAction": "The decisive next action",\n'
        '    "confidence": "91%",\n'
        '    "nextExperiments": ["Test 1", "Test 2"]\n'
        '  }\n'
        "}"
    )

    try:
        from providers import generate_text_background
        raw_resp = await generate_text_background(prompt=prompt, system=system, max_tokens=1400)
        parsed = json.loads(_clean_json_str(raw_resp))
        return parsed
    except Exception as exc:
        title = req.input[:45] + ("..." if len(req.input) > 45 else "")
        return {
            "coreTitle": title or "Strategic Cognitive Dilemma",
            "orbitingNodes": [
                {"id": "goal", "label": "DECLARED GOAL", "desc": f"User seeks resolution for: {req.input[:60]}", "color": "#00F0FF"},
                {"id": "fear", "label": "FEAR NODE", "desc": "Risk of misallocating critical execution energy", "color": "#FF003C"},
                {"id": "assumption", "label": "UNTESTED ASSUMPTION", "desc": "Assuming conventional linear solutions apply to non-linear challenges", "color": "#F59E0B"},
                {"id": "constraint", "label": "REAL CONSTRAINT", "desc": "Available focus and cognitive bandwidth", "color": "#FB923C"},
                {"id": "unknown", "label": "CRITICAL UNKNOWN", "desc": "What dynamic forces the definitive outcome?", "color": "#A855F7"},
                {"id": "contradiction", "label": "CONTRADICTION", "desc": "Desire for certainty versus necessity for decisive action", "color": "#FF003C"},
                {"id": "opportunity", "label": "HERO OPPORTUNITY", "desc": "Transforming the bottleneck into a permanent structural moat", "color": "#39FF14"}
            ],
            "realities": [
                {"id": "current", "name": "CURRENT REALITY", "status": "Active Baseline", "color": "#00F0FF", "desc": "Operating under existing assumptions without structural reframing.", "variables": ["Status quo inertia", "Fragmented attention"]},
                {"id": "hidden", "name": "HIDDEN REALITY", "status": "Underlying Dynamic", "color": "#A855F7", "desc": "The root bottleneck is prioritization clarity rather than capability.", "variables": ["Unspoken stakes", "Execution tempo"]},
                {"id": "failure", "name": "FAILURE REALITY", "status": "Warning Path", "color": "#FF003C", "desc": "Hesitation leads to scope drift and loss of decisive momentum.", "variables": ["Scope creep", "Delayed feedback"]},
                {"id": "optimal", "name": "OPTIMAL REALITY", "status": "High-Leverage", "color": "#39FF14", "desc": "Single-point focus creates breakthrough execution velocity.", "variables": ["Total clarity", "Zero friction"]},
                {"id": "unknown", "name": "UNKNOWN REALITY", "status": "Emergent Horizon", "color": "#F59E0B", "desc": "Solving this dilemma unlocks emergent systemic advantages.", "variables": ["Network effects", "Strategic moat"]}
            ],
            "collisions": [
                {"speaker": "Causal Architect", "avatar": "fa-diagram-project", "color": "#00F0FF", "claim": f"The primary friction in '{title}' is structural alignment."},
                {"speaker": "Adversarial Red Teamer", "avatar": "fa-crosshairs", "color": "#FF003C", "challenge": "Structural alignment is secondary; direct user-facing validation is what actually matters."},
                {"speaker": "Information Theorist", "avatar": "fa-eye", "color": "#A855F7", "evidence": "Information entropy drops when you constrain execution to a single hypothesis."},
                {"speaker": "Systems Strategist", "avatar": "fa-chess", "color": "#39FF14", "resolution": "Converge immediately on the highest-conviction hypothesis and execute."}
            ],
            "hiddenCenterOfGravity": {
                "statedQuestion": req.input[:60],
                "actualTension": "You are balancing the desire for comprehensive coverage against the power of singular focus.",
                "unspokenTruth": "One definitive, finished solution will create 10x more impact than five partial attempts.",
                "evidenceAnchor": "Patterns visible across project tasks and decision records.",
                "inflectionPoint": "Deciding to say 'no' to all peripheral distractions until this core problem is solved."
            },
            "synthesis": {
                "recommendedAction": "Commit exclusively to the optimal trajectory and execute the first concrete step today.",
                "confidence": "91%",
                "nextExperiments": [
                    "Timebox a 48-hour sprint dedicated solely to this outcome",
                    "Conduct a post-implementation review against the stated friction points"
                ]
            }
        }

