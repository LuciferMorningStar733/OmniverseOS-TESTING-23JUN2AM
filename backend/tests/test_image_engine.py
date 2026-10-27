import pytest
import asyncio
from unittest.mock import AsyncMock
from local_image_engine import OmniLocalImageEngine

class MotorDatabaseSimulator:
    """Simulates Motor AsyncIOMotorDatabase which disallows truth-value testing."""
    def __init__(self):
        self.ai_images = AsyncMock()
        self.ai_images.insert_one = AsyncMock(return_value=None)

    def __bool__(self):
        raise NotImplementedError("Database objects do not implement truth value testing or bool(). Please compare with None instead: database is not None")

@pytest.mark.asyncio
async def test_motor_database_truth_testing_resilience():
    """Verify OmniLocalImageEngine does not evaluate truth value of Motor database object."""
    engine = OmniLocalImageEngine()
    simulated_db = MotorDatabaseSimulator()
    
    # Enqueue a job with our Motor simulator
    job_id = await engine.enqueue_generation(
        prompt="A vibrant holographic reticle on obsidian background",
        db_instance=simulated_db,
        user_id="test-user"
    )
    
    # Wait for processing
    for _ in range(25):
        await asyncio.sleep(0.5)
        status = engine.get_job_status(job_id)
        if status and status.get("status") in ("completed", "failed"):
            break
            
    final_status = engine.get_job_status(job_id)
    assert final_status is not None
    # Must NOT have failed due to Database truth value testing
    if final_status.get("status") == "failed":
        assert "Database objects do not implement truth value testing" not in (final_status.get("error") or "")
    else:
        assert final_status.get("status") == "completed"
        assert final_status.get("image_b64") is not None
        assert len(final_status.get("image_b64")) > 1000
        # Verify simulated insert_one was called
        simulated_db.ai_images.insert_one.assert_awaited_once()
