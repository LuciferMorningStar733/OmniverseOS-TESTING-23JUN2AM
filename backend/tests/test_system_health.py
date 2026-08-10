import pytest
from fastapi import FastAPI
from fastapi.testclient import TestClient
from routers.system import router as system_router

app = FastAPI()
app.include_router(system_router, prefix="/api")

client = TestClient(app)

def test_system_health_endpoint():
    response = client.get("/api/system/health")
    assert response.status_code == 200
    data = response.json()
    assert "status" in data
    assert "database" in data
    assert "rate_limiter" in data
    assert "ai_providers" in data
