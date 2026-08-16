"""
OmniverseOS — LiteLLM Routing Engine
=====================================
LiteLLM is the routing engine for non-streaming / structured AI calls
(background tasks, single-shot generation, and Instructor-validated
structured extraction).

This module does NOT touch the live streaming chat path in providers.py
(ProviderManager._stream_provider / generate_stream), which keeps its
existing direct-SDK implementation (Gemini w/ Google Search grounding,
raw OpenAI-compatible streaming for DeepSeek/Groq/Cerebras/OpenRouter).
That path is already verified/working and is out of scope for this change
per project rules ("never refactor unrelated code", "never rewrite
architecture").

Model routing reuses the exact same environment variables already read by
ProviderManager — no new secrets, no duplicated key handling.
"""

from __future__ import annotations

import os
from typing import Optional

import litellm

# LiteLLM performs its own env var lookups per-provider; keep it quiet by
# default and let our own logging (in providers.py / server.py) own the logs.
litellm.suppress_debug_info = True
litellm.drop_params = True  # ignore provider-unsupported kwargs instead of erroring

# If the deployment provides EMERGENT_LLM_KEY instead of GEMINI_API_KEY, expose
# it under the canonical name so both our availability checks and LiteLLM's own
# internal key lookup find it without any other code changes.
_emergent = os.environ.get("EMERGENT_LLM_KEY", "")
if _emergent and not os.environ.get("GEMINI_API_KEY", ""):
    os.environ["GEMINI_API_KEY"] = _emergent


# ── litellm model-string mapping ───────────────────────────────────────────
# Maps OmniverseOS's internal provider names to LiteLLM's "<provider>/<model>"
# convention. Must stay in sync with providers.PROVIDER_DEFAULTS.
_LITELLM_MODEL = {
    "gemini":     "gemini/gemini-2.5-flash",
    "deepseek":   "deepseek/deepseek-chat",
    "groq":       "groq/llama-3.3-70b-versatile",
    "cerebras":   "cerebras/llama3.3-70b",
    "openrouter": "openrouter/meta-llama/llama-3.3-70b-instruct",
}

# Env vars LiteLLM expects per-provider (it reads these itself internally,
# but we check them here so we only include providers with keys configured).
_LITELLM_KEY_ENV = {
    "gemini":     "GEMINI_API_KEY",
    "deepseek":   "DEEPSEEK_API_KEY",
    "groq":       "GROQ_API_KEY",
    "cerebras":   "CEREBRAS_API_KEY",
    "openrouter": "OPENROUTER_API_KEY",
}


def available_litellm_providers(order: list[str]) -> list[str]:
    """Return the subset of `order` whose API key is present in the environment."""
    return [p for p in order if os.environ.get(_LITELLM_KEY_ENV.get(p, ""), "")]


def build_fallback_models(order: list[str]) -> list[str]:
    """Translate an internal provider order into LiteLLM model strings, skipping missing keys."""
    return [_LITELLM_MODEL[p] for p in available_litellm_providers(order) if p in _LITELLM_MODEL]


async def litellm_complete(
    order: list[str],
    message: str,
    system: str = "",
    max_tokens: int = 512,
    temperature: Optional[float] = None,
    response_format: Optional[dict] = None,
) -> str:
    """
    Non-streaming completion routed through LiteLLM with automatic fallback
    across `order` (a list of internal provider names, most-preferred first).

    Returns "" if every model in the fallback chain fails — callers already
    treat an empty string as "no provider available" (see AIProvider docs).
    """
    models = build_fallback_models(order)
    if not models:
        return ""

    primary, *fallbacks = models
    messages = []
    if system:
        messages.append({"role": "system", "content": system})
    messages.append({"role": "user", "content": message})

    kwargs: dict = {
        "model": primary,
        "messages": messages,
        "max_tokens": max_tokens,
        "fallbacks": fallbacks,
    }
    if temperature is not None:
        kwargs["temperature"] = temperature
    if response_format is not None:
        kwargs["response_format"] = response_format

    try:
        resp = await litellm.acompletion(**kwargs)
        return (resp.choices[0].message.content or "").strip()
    except Exception:
        return ""
