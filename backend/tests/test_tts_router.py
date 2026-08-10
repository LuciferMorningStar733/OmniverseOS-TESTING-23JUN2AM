import pytest
from fastapi.testclient import TestClient
from routers.tts import router, _tts_cache_set, _tts_cache_get, _tts_cache_key

client = TestClient(router)

def test_tts_cache_set_and_get():
    key = _tts_cache_key("hello world", "Kore")
    _tts_cache_set(key, b"fake_wav_data", "audio/wav")

    cached = _tts_cache_get(key)
    assert cached is not None
    audio_bytes, mime = cached
    assert audio_bytes == b"fake_wav_data"
    assert mime == "audio/wav"

def test_fish_tts_status_endpoint():
    response = client.get("/ai/tts-fish/status")
    assert response.status_code == 200
    data = response.json()
    assert "configured" in data
    assert "status" in data

def test_gemini_tts_test_endpoint():
    response = client.get("/ai/tts-gemini/test")
    assert response.status_code == 200
    data = response.json()
    assert data["status"] == "ok"
    assert "cache_entries" in data
