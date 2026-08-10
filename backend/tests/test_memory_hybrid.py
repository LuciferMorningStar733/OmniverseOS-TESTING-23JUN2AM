import pytest
import asyncio
from datetime import datetime, timezone, timedelta
from core.vector_service import _fallback_vector, cosine_similarity, generate_embedding_async

def test_fallback_vector_generation():
    vec1 = _fallback_vector("python programming")
    vec2 = _fallback_vector("python programming")
    vec3 = _fallback_vector("grocery shopping list")

    assert len(vec1) == 128
    assert len(vec2) == 128

    sim_same = cosine_similarity(vec1, vec2)
    sim_diff = cosine_similarity(vec1, vec3)

    assert sim_same == pytest.approx(1.0, abs=1e-3)
    assert sim_same > sim_diff

def test_async_embedding_generation():
    async def run_test():
        vec = await generate_embedding_async("Cortex memory test")
        assert isinstance(vec, list)
        assert len(vec) > 0

    asyncio.run(run_test())
