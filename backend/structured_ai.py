"""
OmniverseOS — Instructor-Validated Structured AI Output
==========================================================
Every structured AI response written to MongoDB MUST pass through this
module. Raw AI JSON is never allowed to reach the database directly:
Instructor + Pydantic validate (and reject malformed) output before any
caller sees it.

Backed by LiteLLM (see litellm_router.py) so the same provider fallback
chain used for background/non-streaming calls is reused here.
"""

from __future__ import annotations

import logging
from typing import Optional, Type, TypeVar

import instructor
import litellm
from pydantic import BaseModel

from litellm_router import build_fallback_models

logger = logging.getLogger(__name__)

T = TypeVar("T", bound=BaseModel)

# Patch litellm's acompletion with Instructor once, at import time.
_client = instructor.from_litellm(litellm.acompletion)


async def extract_structured(
    order: list[str],
    prompt: str,
    response_model: Type[T],
    system: str = "",
    max_tokens: int = 800,
    max_retries: int = 1,
) -> Optional[T]:
    """
    Ask an LLM (via LiteLLM + Instructor) to produce `response_model` and
    validate the result against its Pydantic schema.

    Returns None if every model in the fallback chain fails or produces
    output that fails validation — callers must treat None as "nothing
    extracted" and MUST NOT fall back to parsing raw JSON themselves.
    """
    models = build_fallback_models(order)
    if not models:
        return None

    messages = []
    if system:
        messages.append({"role": "system", "content": system})
    messages.append({"role": "user", "content": prompt})

    for model in models:
        try:
            result = await _client.chat.completions.create(
                model=model,
                messages=messages,
                response_model=response_model,
                max_tokens=max_tokens,
                max_retries=max_retries,
            )
            return result
        except Exception as exc:
            logger.warning(
                "[StructuredAI] %s failed to produce valid %s: %s",
                model, response_model.__name__, exc,
            )
            continue

    logger.error(
        "[StructuredAI] All providers exhausted for %s — rejecting malformed output.",
        response_model.__name__,
    )
    return None
