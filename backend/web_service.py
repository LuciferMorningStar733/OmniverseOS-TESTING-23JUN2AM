"""
OmniverseOS — Web Intelligence Layer
=====================================
WebService is the single gateway for all live web operations in OmniverseOS.
Currently backed by TinyFish Search.

Workflow:
  User prompt → needs_web_search() → WebService.search() → build_context_block()
              → injected into system_msg → existing AI provider generates the answer

Adding future TinyFish services (Fetch, Browser Agent):
  1. Subclass WebSearchProvider (or create a parallel WebFetchProvider interface).
  2. Implement all abstract methods.
  3. Instantiate and call web_service.register_search() / register_fetch() / etc.
  No route or AI code changes required.

API (confirmed via live probe):
  Endpoint:  GET https://api.search.tinyfish.ai/?query=<query>
  Auth:      X-API-Key: <TINYFISH_API_KEY> header
  Response:  {
               "query": str,
               "results": [{ "position": int, "title": str, "url": str,
                              "snippet": str, "site_name": str }],
               "total_results": int,
               "page": int
             }
"""

from __future__ import annotations

import logging
import os
import re
from abc import ABC, abstractmethod
from dataclasses import dataclass, field
from typing import Optional

import httpx

logger = logging.getLogger(__name__)


# ── Result models ──────────────────────────────────────────────────────────────

@dataclass
class WebSearchResult:
    title: str
    url: str
    snippet: str
    site_name: str = ""
    position: int = 0


@dataclass
class WebSearchResponse:
    query: str
    results: list[WebSearchResult] = field(default_factory=list)
    total_results: int = 0
    provider: str = ""
    error: Optional[str] = None

    @property
    def ok(self) -> bool:
        """True when search succeeded and returned at least one result."""
        return self.error is None and len(self.results) > 0


# ── Provider interface ─────────────────────────────────────────────────────────

class WebSearchProvider(ABC):
    """
    Interface for web search providers.

    Implement this to add TinyFish Fetch, Browser Agent, or any future
    web-search backend without touching routes or AI code.
    """

    @property
    @abstractmethod
    def name(self) -> str:
        """Human-readable provider name, e.g. 'tinyfish-search'."""
        ...

    @property
    @abstractmethod
    def available(self) -> bool:
        """True when the provider is configured and ready to use."""
        ...

    @abstractmethod
    async def search(self, query: str, max_results: int = 5) -> WebSearchResponse:
        """Execute a search and return a WebSearchResponse. Must never raise."""
        ...


# ── TinyFish Search provider ───────────────────────────────────────────────────

_TINYFISH_SEARCH_BASE = "https://api.search.tinyfish.ai"
# Tight timeout keeps fallback fast — TinyFish unavailability must not stall the AI response
_TINYFISH_TIMEOUT_S = 8.0


class TinyFishSearchProvider(WebSearchProvider):
    """
    TinyFish Search API adapter.

    Auth:     X-API-Key header (read from TINYFISH_API_KEY env var)
    Endpoint: GET / with ?query=<query> query param
    Docs:     https://tinyfish.ai (see search endpoint section)
    """

    def __init__(self) -> None:
        self._api_key: str = ""
        self._client: Optional[httpx.AsyncClient] = None
        self._initialised = False

    def _init(self) -> None:
        if self._initialised:
            return
        self._api_key = os.environ.get("TINYFISH_API_KEY", "")
        if self._api_key:
            self._client = httpx.AsyncClient(
                base_url=_TINYFISH_SEARCH_BASE,
                headers={"X-API-Key": self._api_key},
                timeout=_TINYFISH_TIMEOUT_S,
            )
            logger.info("[WebService] TinyFishSearchProvider initialised")
        else:
            logger.warning("[WebService] TINYFISH_API_KEY not set — web search unavailable")
        self._initialised = True

    @property
    def name(self) -> str:
        return "tinyfish-search"

    @property
    def available(self) -> bool:
        self._init()
        return bool(self._api_key)

    async def search(self, query: str, max_results: int = 5) -> WebSearchResponse:
        """
        Run a TinyFish web search. Always returns WebSearchResponse; never raises.
        On any error the response carries a non-None .error and .ok == False,
        allowing the caller to fall back gracefully.
        """
        self._init()
        if not self._api_key:
            return WebSearchResponse(
                query=query,
                provider=self.name,
                error="TINYFISH_API_KEY not configured",
            )

        try:
            resp = await self._client.get("/", params={"query": query})
            resp.raise_for_status()
            data = resp.json()

            raw = data.get("results", [])[:max_results]
            results = [
                WebSearchResult(
                    title=_sanitize(r.get("title", "")),
                    url=_sanitize(r.get("url", "")),
                    snippet=_sanitize(r.get("snippet", "")),
                    site_name=_sanitize(r.get("site_name", "")),
                    position=r.get("position", i + 1),
                )
                for i, r in enumerate(raw)
                if r.get("url")  # skip results without a URL
            ]
            logger.info(
                "[WebService] TinyFish returned %d results for query=%r",
                len(results), query[:80],
            )
            return WebSearchResponse(
                query=query,
                results=results,
                total_results=data.get("total_results", len(results)),
                provider=self.name,
            )

        except httpx.TimeoutException:
            logger.warning("[WebService] TinyFish search timed out | query=%r", query[:80])
            return WebSearchResponse(query=query, provider=self.name, error="timeout")

        except httpx.HTTPStatusError as exc:
            logger.warning(
                "[WebService] TinyFish HTTP %s | query=%r",
                exc.response.status_code, query[:80],
            )
            return WebSearchResponse(
                query=query, provider=self.name, error=f"HTTP {exc.response.status_code}"
            )

        except Exception as exc:
            logger.warning(
                "[WebService] TinyFish search failed | query=%r | error=%s",
                query[:80], exc,
            )
            return WebSearchResponse(query=query, provider=self.name, error=str(exc))


# ── Result sanitization ────────────────────────────────────────────────────────

def _sanitize(text: str) -> str:
    """Strip null bytes and control characters from API-sourced strings."""
    if not text:
        return ""
    # Remove null bytes and non-printable ASCII control chars (keep newlines/tabs)
    cleaned = re.sub(r"[\x00-\x08\x0b\x0c\x0e-\x1f\x7f]", "", text)
    return cleaned.strip()


# ── Context block formatter ────────────────────────────────────────────────────

def _format_context_block(resp: WebSearchResponse) -> str:
    """Format search results as a system-prompt context block for the AI."""
    lines = [
        "=== WEB SEARCH RESULTS (TinyFish) ===",
        f"Query: {resp.query}",
        "",
    ]
    for r in resp.results:
        lines.append(f"{r.position}. {r.title}")
        lines.append(f"   URL: {r.url}")
        if r.snippet:
            lines.append(f"   {r.snippet}")
        lines.append("")
    lines += [
        "Use these results to ground your answer with current, accurate information.",
        "Cite URLs where relevant. Do not fabricate information beyond what is shown.",
        "=== END WEB SEARCH RESULTS ===",
    ]
    return "\n".join(lines)


# ── Web Service gateway ────────────────────────────────────────────────────────

class WebService:
    """
    Single gateway for all live web intelligence operations in OmniverseOS.

    Currently wraps TinyFish Search. Call register_search() to swap or extend
    the search backend. Future register_fetch() / register_agent() methods can
    be added here without changing any existing code.

    Usage::

        from web_service import web_service, needs_web_search

        if needs_web_search(user_message):
            ctx = await web_service.build_context_block(user_message)
            if ctx:
                system_msg += "\\n\\n" + ctx
    """

    def __init__(self) -> None:
        self._search_provider: Optional[WebSearchProvider] = None

    def register_search(self, provider: WebSearchProvider) -> None:
        """Register (or swap) the active search provider. Call once at startup."""
        if not isinstance(provider, WebSearchProvider):
            raise TypeError(
                f"Expected a WebSearchProvider, got {type(provider).__name__}"
            )
        self._search_provider = provider
        logger.info("[WebService] Search provider registered: %s", provider.name)

    async def search(self, query: str, max_results: int = 5) -> WebSearchResponse:
        """
        Execute a web search. Returns WebSearchResponse with ok=False on any failure.
        Never raises.
        """
        if self._search_provider is None:
            return WebSearchResponse(query=query, error="No search provider registered")
        return await self._search_provider.search(query, max_results)

    async def build_context_block(self, query: str, max_results: int = 5) -> str:
        """
        Run a search and return a formatted system-prompt context block.
        Returns an empty string if the search fails or returns no results —
        the caller should proceed with the normal AI response in that case.
        """
        resp = await self.search(query, max_results)
        if not resp.ok:
            if resp.error:
                logger.info("[WebService] Search skipped: %s | query=%r", resp.error, query[:80])
            return ""
        return _format_context_block(resp)


# ── Query detection ────────────────────────────────────────────────────────────

# Patterns indicating time-sensitive or current-events queries
_TIME_SIGNALS = re.compile(
    r"\b(today|tonight|right\s+now|currently|current\s+(price|rate|status|score|weather)|"
    r"latest|recent(ly)?|just\s+now|this\s+(week|month|year)|yesterday|"
    r"last\s+(week|month|year)|202[4-9]|203\d|breaking|live|"
    r"real[-\s]?time|up[-\s]?to[-\s]?date)\b",
    re.IGNORECASE,
)

# Patterns indicating factual lookups that benefit from live data
_LOOKUP_SIGNALS = re.compile(
    r"\b(what('?s| is) (the )?(price|cost|stock|weather|temperature|news|score|"
    r"exchange rate|population|age|net worth)|"
    r"who (won|is winning|leads|is (the )?(ceo|president|pm|prime minister|founder|cto))|"
    r"(stock|share) price|weather (in|for|at)|"
    r"(news|updates?|announcements?) (about|on|for|of)|"
    r"(latest|newest|recent)\s+\w{3,}\s+(news|update|version|model|release|patch)|"
    r"when (does|did|will) .{1,50} (release|launch|open|close|happen|drop))\b",
    re.IGNORECASE,
)

# Explicit search intent from the user
_SEARCH_INTENT = re.compile(
    r"\b(search (for|about|on)|look\s+up|find\s+(me\s+)?(information|info|details|news)|"
    r"google|browse|check\s+(online|the\s+web|the\s+internet|the\s+news))\b",
    re.IGNORECASE,
)

# Patterns that clearly do NOT need web search — avoids false positives
_NO_SEARCH_SIGNALS = re.compile(
    r"\b(write\s+(me\s+)?(a\s+|an\s+|the\s+)?(poem|story|email|code|function|script|essay|letter|message)|"
    r"explain\s+(how|why|what)|summarize\s+(this|the\s+following|my)|"
    r"translate|convert\s+\d|calculate|what\s+is\s+\d|"
    r"open\s+(app|browser|file|the)|remind\s+me|"
    r"set\s+(a\s+|an\s+)?(timer|alarm|reminder)|play\s+(music|song|video)|"
    r"generate\s+(an?\s+)?(image|picture|photo)|swarm|"
    r"help\s+me\s+(write|code|create|build|design))\b",
    re.IGNORECASE,
)


def needs_web_search(message: str) -> bool:
    """
    Heuristic: does this user message likely benefit from live web search?

    Errs on the side of NOT searching to preserve AI and TinyFish quota.
    Only returns True when there are clear signals of time-sensitive or
    factual-lookup queries where current web data adds real value.
    """
    msg = message.strip()
    if len(msg) < 5:
        return False

    # Hard no — creative/code/personal tasks never need web search
    if _NO_SEARCH_SIGNALS.search(msg):
        return False

    # Hard yes — user explicitly asked to search
    if _SEARCH_INTENT.search(msg):
        return True

    # Yes if time-sensitive OR factual lookup signals are present
    return bool(_TIME_SIGNALS.search(msg)) or bool(_LOOKUP_SIGNALS.search(msg))


# ── Singletons ─────────────────────────────────────────────────────────────────

tinyfish_search = TinyFishSearchProvider()

# Global gateway — import this in server.py
web_service = WebService()
web_service.register_search(tinyfish_search)
