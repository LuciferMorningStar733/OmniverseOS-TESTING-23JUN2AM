import pytest
import asyncio
from fastapi import HTTPException
from rate_limiter import MemoryRateLimiter, RedisRateLimiter, get_rate_limiter

def test_memory_rate_limiter_pass_and_block():
    async def run_test():
        limiter = MemoryRateLimiter()
        key = "test_user_key"

        # First 3 requests should pass
        await limiter.check_rate_limit(key, max_per_min=3)
        await limiter.check_rate_limit(key, max_per_min=3)
        await limiter.check_rate_limit(key, max_per_min=3)

        # 4th request must raise 429
        with pytest.raises(HTTPException) as exc_info:
            await limiter.check_rate_limit(key, max_per_min=3)
        assert exc_info.value.status_code == 429

    asyncio.run(run_test())

def test_redis_rate_limiter_fallback():
    async def run_test():
        # Provide invalid Redis URL to test fallback resilience
        limiter = RedisRateLimiter("redis://localhost:9999/0")
        
        # Should catch connection exception internally and allow request safely
        await limiter.check_rate_limit("test_redis_key", max_per_min=5)

    asyncio.run(run_test())

def test_get_rate_limiter_default():
    limiter = get_rate_limiter()
    assert limiter is not None
