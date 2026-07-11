"""
OmniverseOS — AI Abstraction Layer
===================================
AIService is the single gateway for all AI operations in OmniverseOS.
Routes, background tasks, and any future module MUST go through AIService.
Providers (Gemini, DeepSeek, Groq, Cerebras, OpenRouter, etc.) are plugged in
via the AIProvider interface — they must never be called directly from routes.

To add a new provider (LiteLLM, TinyFish, Ollama, …):
  1. Subclass AIProvider and implement all abstract methods.
  2. Instantiate the subclass and call ai_service.register(instance) at startup.
  3. No route or UI code changes required.
"""

from __future__ import annotations

from abc import ABC, abstractmethod
from typing import AsyncGenerator, Optional


class AIProvider(ABC):
    """
    Interface that every AI provider adapter must implement.

    Each concrete provider is responsible for:
    - Streaming generation with automatic failover (generate_stream)
    - Background/internal non-streaming generation (generate_text_background)
    - Single-shot non-streaming generation with explicit model (generate_once)
    - Reporting provider health and availability (provider_statuses)
    """

    @abstractmethod
    async def generate_stream(
        self,
        preferred: str,
        gemini_model: str,
        message: str,
        system: str,
        history: list | None = None,
    ) -> AsyncGenerator[tuple[str, Optional[str]], None]:
        """
        Streaming generation with automatic provider failover.

        Yields (kind, value) tuples:
          ("provider", provider_name)  — emitted once before the first content chunk
          ("chunk",    text)           — streamed text content
          ("error",    code_str)       — terminal error signal ("429", "500", …)

        Callers should consume the stream and persist content chunks themselves.
        """
        ...

    @abstractmethod
    async def generate_text_background(
        self,
        prompt: str,
        system: str = "",
    ) -> str:
        """
        Non-streaming generation for background / internal tasks.

        Uses a background-safe provider ordering (fast, generous free-tier
        providers first) so foreground chat quota is preserved.
        Returns an empty string if all providers fail.
        """
        ...

    @abstractmethod
    async def generate_once(
        self,
        model: str,
        message: str,
        system: str = "",
        max_tokens: int = 512,
    ) -> str:
        """
        Single non-streaming generation with an explicit model choice.

        Used for deterministic, low-latency internal calls (e.g. auto-titling,
        non-streaming chat). Falls back to generate_text_background if the
        preferred model / primary provider is unavailable.
        Returns an empty string if all options fail.
        """
        ...

    @abstractmethod
    def provider_statuses(self) -> dict:
        """
        Return health and availability status for all configured providers.

        Expected shape per provider key:
          { "status": str, "available": bool, "hasKey": bool, "display": str }
        """
        ...


class AIService:
    """
    Single gateway for all AI operations in OmniverseOS.

    Backed by a registered AIProvider.  Swap or extend providers by calling
    register() at startup — no route or UI code needs to change.

    Example
    -------
    At startup::

        from ai_service import ai_service
        from my_provider import MyProviderAdapter
        ai_service.register(MyProviderAdapter())

    In route handlers::

        async for kind, value in ai_service.generate_stream(...):
            ...

        text = await ai_service.generate_text_background(prompt)
        text = await ai_service.generate_once(model, message, system)
        statuses = ai_service.provider_statuses()
    """

    def __init__(self) -> None:
        self._provider: Optional[AIProvider] = None

    def register(self, provider: AIProvider) -> None:
        """Register the active AI provider.  Call exactly once at startup."""
        if not isinstance(provider, AIProvider):
            raise TypeError(
                f"Expected an AIProvider instance, got {type(provider).__name__}"
            )
        self._provider = provider

    @property
    def _p(self) -> AIProvider:
        if self._provider is None:
            raise RuntimeError(
                "No AIProvider registered with AIService. "
                "Call ai_service.register(provider) at startup."
            )
        return self._provider

    async def generate_stream(
        self,
        preferred: str,
        gemini_model: str,
        message: str,
        system: str,
        history: list | None = None,
    ) -> AsyncGenerator[tuple[str, Optional[str]], None]:
        """Streaming generation — delegates to the registered provider."""
        async for item in self._p.generate_stream(
            preferred, gemini_model, message, system, history
        ):
            yield item

    async def generate_text_background(
        self,
        prompt: str,
        system: str = "",
    ) -> str:
        """Background text generation — delegates to the registered provider."""
        return await self._p.generate_text_background(prompt, system)

    async def generate_once(
        self,
        model: str,
        message: str,
        system: str = "",
        max_tokens: int = 512,
    ) -> str:
        """Single non-streaming generation — delegates to the registered provider."""
        return await self._p.generate_once(model, message, system, max_tokens)

    def provider_statuses(self) -> dict:
        """Provider health/availability — delegates to the registered provider."""
        return self._p.provider_statuses()


# Singleton — import and use this throughout the codebase
ai_service = AIService()
