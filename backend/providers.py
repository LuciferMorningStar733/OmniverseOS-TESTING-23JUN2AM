"""
OmniverseOS — AI Provider Manager
Gemini → DeepSeek → Groq → Cerebras → OpenRouter
"""

import asyncio
import json
import logging
import os
import time
from typing import AsyncGenerator, Optional

import httpx
from google import genai
from google.genai import types as genai_types

logger = logging.getLogger(__name__)

PROVIDER_COOLDOWN_RATE_LIMITED = 300  # 5 min on 429
PROVIDER_COOLDOWN_ERROR = 60          # 1 min on other errors

CORTEX_SYSTEM = (
    "You are OmniverseOS Assistant — a friendly, witty cyberpunk AI living "
    "inside an operating system. Be concise, helpful, and creative."
)

# ── Provider default models ────────────────────────────────────────────────
PROVIDER_DEFAULTS = {
    "gemini":     "gemini-2.5-flash",
    "deepseek":   "deepseek-chat",           # DeepSeek V3
    "groq":       "llama-3.3-70b-versatile",
    "cerebras":   "llama-3.3-70b",
    "openrouter": "meta-llama/llama-3.3-70b-instruct",
}

PROVIDER_DISPLAY = {
    "gemini":     "Gemini Flash",
    "deepseek":   "DeepSeek V3",
    "groq":       "Groq",
    "cerebras":   "Cerebras",
    "openrouter": "OpenRouter",
}


class ProviderHealth:
    def __init__(self, name: str):
        self.name = name
        self._status = "healthy"
        self._cooldown_until: float = 0.0

    def mark_rate_limited(self):
        self._status = "cooldown"
        self._cooldown_until = time.monotonic() + PROVIDER_COOLDOWN_RATE_LIMITED
        logger.warning("[Cortex] %s → 429 rate-limited, cooldown %.0fs", self.name, PROVIDER_COOLDOWN_RATE_LIMITED)

    def mark_error(self):
        self._status = "unavailable"
        self._cooldown_until = time.monotonic() + PROVIDER_COOLDOWN_ERROR

    def mark_healthy(self):
        self._status = "healthy"
        self._cooldown_until = 0.0

    def is_available(self) -> bool:
        if self._status == "healthy":
            return True
        if time.monotonic() > self._cooldown_until:
            self._status = "healthy"
            self._cooldown_until = 0.0
            return True
        return False

    @property
    def status(self) -> str:
        if self._status != "healthy" and time.monotonic() > self._cooldown_until:
            return "healthy"
        return self._status


# ── Shared HTTP client ─────────────────────────────────────────────────────
_http: Optional[httpx.AsyncClient] = None


def get_http() -> httpx.AsyncClient:
    global _http
    if _http is None or _http.is_closed:
        _http = httpx.AsyncClient(timeout=55.0)
    return _http


# ── Per-provider streaming generators ─────────────────────────────────────

async def _stream_gemini(
    gemini_client: genai.Client,
    model: str,
    message: str,
    system: str,
    history: list | None = None,
) -> AsyncGenerator[str, None]:
    """Yields text chunks from Gemini streaming API.
    
    Passes full conversation history for multi-turn context awareness.
    Enables Google Search grounding so Gemini fetches live web data
    instead of relying on potentially stale training knowledge.
    """
    # Build multi-turn contents from history so Gemini remembers earlier messages
    contents = []
    for msg in (history or []):
        role = "user" if msg.get("role") == "user" else "model"
        content = (msg.get("content") or "").strip()
        if content:
            contents.append(genai_types.Content(
                role=role,
                parts=[genai_types.Part(text=content)],
            ))
    # Append the current user message
    contents.append(genai_types.Content(
        role="user",
        parts=[genai_types.Part(text=message)],
    ))

    response = await asyncio.wait_for(
        gemini_client.aio.models.generate_content_stream(
            model=model,
            contents=contents,
            config=genai_types.GenerateContentConfig(
                system_instruction=system,
                # Google Search grounding — Gemini fetches real web data when
                # it needs current or factual info (e.g. product specs, prices)
                tools=[genai_types.Tool(google_search=genai_types.GoogleSearch())],
            ),
        ),
        timeout=50.0,
    )
    async for chunk in response:
        piece = chunk.text or ""
        if piece:
            yield piece


async def _stream_openai_compat(
    base_url: str,
    api_key: str,
    model: str,
    message: str,
    system: str,
    extra_headers: Optional[dict] = None,
) -> AsyncGenerator[str, None]:
    """Yields text chunks from any OpenAI-compatible streaming API."""
    headers = {
        "Authorization": f"Bearer {api_key}",
        "Content-Type": "application/json",
        **(extra_headers or {}),
    }
    body = {
        "model": model,
        "messages": [
            {"role": "system", "content": system},
            {"role": "user",   "content": message},
        ],
        "stream": True,
        "max_tokens": 4096,
    }
    client = get_http()
    async with client.stream("POST", f"{base_url}/chat/completions", headers=headers, json=body) as resp:
        resp.raise_for_status()
        async for raw_line in resp.aiter_lines():
            if not raw_line or not raw_line.startswith("data: "):
                continue
            payload = raw_line[6:]
            if payload.strip() == "[DONE]":
                break
            try:
                data = json.loads(payload)
                delta = data.get("choices", [{}])[0].get("delta", {}).get("content") or ""
                if delta:
                    yield delta
            except (json.JSONDecodeError, KeyError, IndexError):
                continue


# ── Provider Manager ───────────────────────────────────────────────────────

class ProviderManager:
    PROVIDER_ORDER = ["gemini", "deepseek", "groq", "cerebras", "openrouter"]

    def __init__(self):
        self.health: dict[str, ProviderHealth] = {
            p: ProviderHealth(p) for p in self.PROVIDER_ORDER
        }
        self._gemini_client: Optional[genai.Client] = None
        self._deepseek_key: str = ""
        self._groq_key: str = ""
        self._cerebras_key: str = ""
        self._openrouter_key: str = ""
        self._initialised = False

    def init(self):
        if self._initialised:
            return
        gemini_key = os.environ.get("GEMINI_API_KEY", "")
        if gemini_key:
            self._gemini_client = genai.Client(api_key=gemini_key)
        self._deepseek_key = os.environ.get("DEEPSEEK_API_KEY", "")
        self._groq_key = os.environ.get("GROQ_API_KEY", "")
        self._cerebras_key = os.environ.get("CEREBRAS_API_KEY", "")
        self._openrouter_key = os.environ.get("OPENROUTER_API_KEY", "")
        self._initialised = True
        available = [
            p for p in self.PROVIDER_ORDER
            if self._has_key(p)
        ]
        logger.info("[Cortex] ProviderManager ready. Available providers: %s", available)

    def _has_key(self, provider: str) -> bool:
        if provider == "gemini":
            return self._gemini_client is not None
        if provider == "deepseek":
            return bool(self._deepseek_key)
        if provider == "groq":
            return bool(self._groq_key)
        if provider == "cerebras":
            return bool(self._cerebras_key)
        if provider == "openrouter":
            return bool(self._openrouter_key)
        return False

    def _build_order(self, preferred: str) -> list[str]:
        """Return provider order starting with preferred (if available), then rest."""
        order = []
        if preferred and preferred != "auto" and preferred in self.PROVIDER_ORDER:
            order.append(preferred)
        for p in self.PROVIDER_ORDER:
            if p not in order:
                order.append(p)
        return order

    async def _stream_provider(
        self,
        provider: str,
        gemini_model: str,
        message: str,
        system: str,
        history: list | None = None,
    ) -> AsyncGenerator[str, None]:
        if provider == "gemini":
            async for chunk in _stream_gemini(self._gemini_client, gemini_model, message, system, history):
                yield chunk
        elif provider == "deepseek":
            async for chunk in _stream_openai_compat(
                "https://api.deepseek.com/v1",
                self._deepseek_key,
                PROVIDER_DEFAULTS["deepseek"],
                message, system,
            ):
                yield chunk
        elif provider == "groq":
            async for chunk in _stream_openai_compat(
                "https://api.groq.com/openai/v1",
                self._groq_key,
                PROVIDER_DEFAULTS["groq"],
                message, system,
            ):
                yield chunk
        elif provider == "cerebras":
            async for chunk in _stream_openai_compat(
                "https://api.cerebras.ai/v1",
                self._cerebras_key,
                PROVIDER_DEFAULTS["cerebras"],
                message, system,
            ):
                yield chunk
        elif provider == "openrouter":
            async for chunk in _stream_openai_compat(
                "https://openrouter.ai/api/v1",
                self._openrouter_key,
                PROVIDER_DEFAULTS["openrouter"],
                message, system,
                extra_headers={
                    "HTTP-Referer": "https://omniverseos.app",
                    "X-Title": "OmniverseOS",
                },
            ):
                yield chunk

    async def generate_stream(
        self,
        preferred: str,
        gemini_model: str,
        message: str,
        system: str,
        history: list | None = None,
    ) -> AsyncGenerator[tuple[str, Optional[str]], None]:
        """
        Main entry point.  Yields (chunk_type, value) tuples:
          ("provider", provider_name)   — emitted once before first chunk
          ("chunk",    text)            — text content
          ("error",    code_str)        — terminal error signal

        Handles failover automatically. Caller should persist content chunks.
        """
        self.init()
        order = self._build_order(preferred)
        last_error: Optional[Exception] = None

        for provider in order:
            if not self._has_key(provider):
                continue
            if not self.health[provider].is_available():
                remaining = max(0, int(self.health[provider]._cooldown_until - time.monotonic()))
                logger.info("[Cortex] Skipping %s (cooldown %ds)", provider, remaining)
                continue

            logger.info("[Cortex] Trying provider: %s", provider)
            got_content = False

            try:
                # Signal provider before first chunk
                provider_signalled = False
                async for chunk in self._stream_provider(provider, gemini_model, message, system, history):
                    if not provider_signalled:
                        yield ("provider", provider)
                        provider_signalled = True
                    got_content = True
                    yield ("chunk", chunk)

                if got_content:
                    # Success — reset health and return
                    self.health[provider].mark_healthy()
                    logger.info("[Cortex] %s responded successfully", provider)
                    return
                else:
                    # Provider returned empty stream — treat as failure and try next
                    logger.warning("[Cortex] %s returned empty stream, trying next provider", provider)
                    print(f"Primary engine failed. Routing prompt to fallback provider...")
                    self.health[provider].mark_error()
                    last_error = Exception(f"{provider} returned empty stream")

            except httpx.HTTPStatusError as e:
                status = e.response.status_code
                logger.warning("[Cortex] %s HTTP %s", provider, status)
                if status == 429:
                    self.health[provider].mark_rate_limited()
                    print(f"Primary engine failed. Routing prompt to fallback provider...")
                    logger.info("[Cortex] %s → 429, switching to next provider", provider)
                else:
                    self.health[provider].mark_error()
                    print(f"Primary engine failed. Routing prompt to fallback provider...")
                last_error = e

            except asyncio.TimeoutError:
                logger.warning("[Cortex] %s timed out", provider)
                print(f"Primary engine failed. Routing prompt to fallback provider...")
                self.health[provider].mark_error()
                last_error = asyncio.TimeoutError(f"{provider} timed out")

            except Exception as e:
                err_str = str(e)
                logger.warning("[Cortex] %s error: %s", provider, err_str)
                print(f"Primary engine failed. Routing prompt to fallback provider...")
                if "429" in err_str or "RESOURCE_EXHAUSTED" in err_str or "quota" in err_str.lower():
                    self.health[provider].mark_rate_limited()
                    logger.info("[Cortex] %s → rate limited, switching", provider)
                elif "UNAVAILABLE" in err_str or "503" in err_str or "overload" in err_str.lower():
                    self.health[provider].mark_error()
                elif "502" in err_str or "Bad Gateway" in err_str:
                    self.health[provider].mark_error()
                else:
                    self.health[provider].mark_error()
                last_error = e

        # All providers exhausted
        logger.error("[Cortex] All providers exhausted. Last error: %s", last_error)
        yield ("error", "500")

    async def _call_openai_compat_text(
        self,
        base_url: str,
        api_key: str,
        model: str,
        message: str,
        system: str,
    ) -> str:
        """Non-streaming single-shot text generation via OpenAI-compatible API."""
        headers = {
            "Authorization": f"Bearer {api_key}",
            "Content-Type": "application/json",
        }
        body = {
            "model": model,
            "messages": [
                {"role": "system", "content": system},
                {"role": "user", "content": message},
            ],
            "stream": False,
            "max_tokens": 512,
        }
        client = get_http()
        resp = await client.post(
            f"{base_url}/chat/completions", headers=headers, json=body
        )
        resp.raise_for_status()
        data = resp.json()
        return data["choices"][0]["message"]["content"] or ""

    async def generate_text_background(self, prompt: str, system: str = "") -> str:
        """
        Non-streaming text generation for background tasks (e.g. Cortex Interrupts).
        Tries Cerebras → Groq → Gemini in that order to preserve Gemini quota
        for foreground chat and Ghost Writing workflows.
        """
        self.init()
        # Background-safe order: fast/generous free-tier providers first
        bg_order = ["cerebras", "groq", "gemini"]
        last_error = None

        for provider in bg_order:
            if not self._has_key(provider):
                continue
            if not self.health[provider].is_available():
                remaining = max(0, int(self.health[provider]._cooldown_until - time.monotonic()))
                logger.info("[Cortex] Skipping %s for background task (cooldown %ds)", provider, remaining)
                continue

            try:
                if provider == "cerebras":
                    text = await self._call_openai_compat_text(
                        "https://api.cerebras.ai/v1",
                        self._cerebras_key,
                        PROVIDER_DEFAULTS["cerebras"],
                        prompt, system,
                    )
                elif provider == "groq":
                    text = await self._call_openai_compat_text(
                        "https://api.groq.com/openai/v1",
                        self._groq_key,
                        PROVIDER_DEFAULTS["groq"],
                        prompt, system,
                    )
                else:  # gemini fallback
                    resp = await self._gemini_client.aio.models.generate_content(
                        model="gemini-2.0-flash-lite",
                        contents=prompt,
                    )
                    text = resp.text or ""

                if not text or not text.strip():
                    # Empty response — treat as failure and try next provider
                    logger.warning("[Cortex] Background provider %s returned empty output, trying next", provider)
                    print(f"Primary engine failed. Routing prompt to fallback provider...")
                    self.health[provider].mark_error()
                    continue

                self.health[provider].mark_healthy()
                logger.info("[Cortex] Background task served by %s", provider)
                return text

            except Exception as e:
                err_str = str(e)
                logger.warning("[Cortex] Background provider %s failed: %s", provider, err_str)
                print(f"Primary engine failed. Routing prompt to fallback provider...")
                if "429" in err_str or "RESOURCE_EXHAUSTED" in err_str or "quota" in err_str.lower():
                    self.health[provider].mark_rate_limited()
                else:
                    self.health[provider].mark_error()
                last_error = e

        logger.error("[Cortex] All background providers exhausted: %s", last_error)
        return ""

    def provider_statuses(self) -> dict:
        self.init()
        return {
            p: {
                "status":    self.health[p].status,
                "available": self.health[p].is_available(),
                "hasKey":    self._has_key(p),
                "display":   PROVIDER_DISPLAY.get(p, p),
            }
            for p in self.PROVIDER_ORDER
        }


# Singleton
provider_manager = ProviderManager()
