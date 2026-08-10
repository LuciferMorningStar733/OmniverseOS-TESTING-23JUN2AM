from abc import ABC, abstractmethod
import time
import os
import asyncio
import logging
from collections import defaultdict
from fastapi import HTTPException

logger = logging.getLogger(__name__)

class BaseRateLimiter(ABC):
    @abstractmethod
    async def check_rate_limit(self, key: str, max_per_min: int = 20) -> None:
        """Enforce rate limiting on key. Raises HTTPException(429) if exceeded."""
        ...

class MemoryRateLimiter(BaseRateLimiter):
    """In-memory sliding window rate limiter for local development & single-worker setups."""
    def __init__(self):
        self._buckets: dict[str, list[float]] = defaultdict(list)
        self._lock = asyncio.Lock()

    async def check_rate_limit(self, key: str, max_per_min: int = 20) -> None:
        now = time.monotonic()
        cutoff = now - 60.0
        async with self._lock:
            bucket = self._buckets[key]
            bucket[:] = [t for t in bucket if t > cutoff]
            if len(bucket) >= max_per_min:
                raise HTTPException(429, "Rate limit exceeded. Try again shortly.")
            bucket.append(now)

class RedisRateLimiter(BaseRateLimiter):
    """Production sliding window rate limiter backed by Redis."""
    def __init__(self, redis_url: str):
        self.redis_url = redis_url
        self._redis = None

    async def _get_client(self):
        if self._redis is None:
            import redis.asyncio as aioredis
            self._redis = aioredis.from_url(self.redis_url, decode_responses=True)
        return self._redis

    async def check_rate_limit(self, key: str, max_per_min: int = 20) -> None:
        try:
            client = await self._get_client()
            now = time.time()
            cutoff = now - 60.0
            pipe = client.pipeline()
            pipe.zremrangebyscore(key, 0, cutoff)
            pipe.zcard(key)
            pipe.zadd(key, {str(now): now})
            pipe.expire(key, 65)
            results = await pipe.execute()
            count = results[1]
            if count >= max_per_min:
                raise HTTPException(429, "Rate limit exceeded. Try again shortly.")
        except HTTPException:
            raise
        except Exception as exc:
            logger.warning("[RedisRateLimiter] Error: %s — falling back to memory allow", exc)

def get_rate_limiter() -> BaseRateLimiter:
    redis_url = os.environ.get("REDIS_URL", "")
    if redis_url:
        try:
            logger.info("[RateLimiter] Configuring RedisRateLimiter (%s)", redis_url)
            return RedisRateLimiter(redis_url)
        except Exception as e:
            logger.warning("[RateLimiter] Failed to initialize Redis: %s — falling back to MemoryRateLimiter", e)
    return MemoryRateLimiter()

# Singleton instance
rate_limiter = get_rate_limiter()
