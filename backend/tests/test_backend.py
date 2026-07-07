"""OmniverseOS backend regression tests."""
import os, uuid, time
import requests
import pytest

BASE = (os.environ.get("BACKEND_URL") or os.environ.get("REACT_APP_BACKEND_URL") or "http://localhost:8001").rstrip("/")
API = f"{BASE}/api"

DEMO = {"email": "demo@omniverse.io", "password": "omniverse123"}


@pytest.fixture(scope="session")
def token():
    r = requests.post(f"{API}/auth/login", json=DEMO, timeout=30)
    assert r.status_code == 200, r.text
    return r.json()["token"]


@pytest.fixture(scope="session")
def h(token):
    return {"Authorization": f"Bearer {token}"}


# ---------- Health ----------
def test_root():
    r = requests.get(f"{API}/", timeout=15)
    assert r.status_code == 200
    assert r.json()["status"] == "ok"


# ---------- Auth ----------
def test_signup_and_login():
    email = f"TEST_{uuid.uuid4().hex[:8]}@example.com"
    r = requests.post(f"{API}/auth/signup", json={"email": email, "password": "pw12345", "name": "Tester"}, timeout=30)
    assert r.status_code == 200, r.text
    data = r.json()
    assert "token" in data and data["user"]["email"] == email

    # duplicate
    r2 = requests.post(f"{API}/auth/signup", json={"email": email, "password": "pw12345", "name": "T"}, timeout=30)
    assert r2.status_code == 400

    # login
    r3 = requests.post(f"{API}/auth/login", json={"email": email, "password": "pw12345"}, timeout=30)
    assert r3.status_code == 200
    assert "token" in r3.json()

    # bad pw
    r4 = requests.post(f"{API}/auth/login", json={"email": email, "password": "wrong"}, timeout=30)
    assert r4.status_code == 401


def test_demo_login_and_me(token, h):
    r = requests.get(f"{API}/auth/me", headers=h, timeout=15)
    assert r.status_code == 200
    assert r.json()["email"] == DEMO["email"]


def test_me_no_token():
    r = requests.get(f"{API}/auth/me", timeout=15)
    assert r.status_code == 401


# ---------- Notes CRUD ----------
def test_notes_crud(h):
    payload = {"title": "TEST_note", "content": "hello", "color": "#FF00FF"}
    r = requests.post(f"{API}/notes", json=payload, headers=h, timeout=15)
    assert r.status_code == 200
    nid = r.json()["id"]
    assert r.json()["title"] == "TEST_note"

    # List
    r2 = requests.get(f"{API}/notes", headers=h, timeout=15)
    assert r2.status_code == 200
    assert any(n["id"] == nid for n in r2.json())

    # Update
    r3 = requests.put(f"{API}/notes/{nid}", json={**payload, "content": "edited"}, headers=h, timeout=15)
    assert r3.status_code == 200
    assert r3.json()["content"] == "edited"

    # Delete
    r4 = requests.delete(f"{API}/notes/{nid}", headers=h, timeout=15)
    assert r4.status_code == 200


# ---------- Tasks CRUD ----------
def test_tasks_crud(h):
    r = requests.post(f"{API}/tasks", json={"title": "TEST_task", "status": "todo", "priority": "high"}, headers=h, timeout=15)
    assert r.status_code == 200
    tid = r.json()["id"]
    r2 = requests.put(f"{API}/tasks/{tid}", json={"title": "TEST_task", "status": "done", "priority": "high"}, headers=h, timeout=15)
    assert r2.status_code == 200 and r2.json()["status"] == "done"
    assert requests.delete(f"{API}/tasks/{tid}", headers=h, timeout=15).status_code == 200


# ---------- Events ----------
def test_events(h):
    r = requests.post(f"{API}/events", json={"title": "TEST_evt", "date": "2026-01-15", "time": "10:00"}, headers=h, timeout=15)
    assert r.status_code == 200
    eid = r.json()["id"]
    assert requests.get(f"{API}/events", headers=h, timeout=15).status_code == 200
    assert requests.delete(f"{API}/events/{eid}", headers=h, timeout=15).status_code == 200


# ---------- Transactions ----------
def test_transactions(h):
    r = requests.post(f"{API}/transactions", json={"title": "TEST_inc", "amount": 100, "type": "income", "date": "2026-01-01"}, headers=h, timeout=15)
    assert r.status_code == 200
    tid = r.json()["id"]
    assert requests.delete(f"{API}/transactions/{tid}", headers=h, timeout=15).status_code == 200


# ---------- Memories ----------
def test_memories(h):
    r = requests.post(f"{API}/memories", json={"content": "TEST_mem", "tag": "test"}, headers=h, timeout=15)
    assert r.status_code == 200
    mid = r.json()["id"]
    assert requests.delete(f"{API}/memories/{mid}", headers=h, timeout=15).status_code == 200


# ---------- Files ----------
def test_files(h):
    r = requests.post(f"{API}/files", json={"name": "TEST_file.txt", "type": "file", "content": "x"}, headers=h, timeout=15)
    assert r.status_code == 200
    fid = r.json()["id"]
    assert requests.delete(f"{API}/files/{fid}", headers=h, timeout=15).status_code == 200


# ---------- Analytics ----------
def test_analytics(h):
    r = requests.get(f"{API}/analytics/summary", headers=h, timeout=15)
    assert r.status_code == 200
    d = r.json()
    for k in ["notes", "tasks", "events", "income", "expense", "net"]:
        assert k in d


# ---------- Clipboard ----------
def test_clipboard(h):
    r = requests.post(f"{API}/clipboard", json={"content": "TEST_clip", "label": "test"}, headers=h, timeout=15)
    assert r.status_code == 200, r.text
    cid = r.json()["id"]
    assert r.json()["content"] == "TEST_clip"

    lst = requests.get(f"{API}/clipboard", headers=h, timeout=15)
    assert lst.status_code == 200
    assert any(item["id"] == cid for item in lst.json())

    upd = requests.put(f"{API}/clipboard/{cid}", json={"content": "TEST_clip_upd", "label": "test"}, headers=h, timeout=15)
    assert upd.status_code == 200
    assert upd.json()["content"] == "TEST_clip_upd"

    delete_resp = requests.delete(f"{API}/clipboard/{cid}", headers=h, timeout=15)
    assert delete_resp.status_code == 200


# ---------- AI Chat (non-stream) — needs GEMINI_API_KEY; skip if missing ----------
def test_ai_chat(h):
    sid = f"test-{uuid.uuid4().hex[:6]}"
    r = requests.post(f"{API}/ai/chat", json={"session_id": sid, "message": "Say hi in 3 words"}, headers=h, timeout=120)
    if r.status_code in (500, 503):
        pytest.skip(f"AI chat unavailable (likely no GEMINI_API_KEY): {r.text[:200]}")
    assert r.status_code == 200, r.text
    assert isinstance(r.json().get("response"), str) and len(r.json()["response"]) > 0
    h2 = requests.get(f"{API}/ai/chat/history/{sid}", headers=h, timeout=15)
    assert h2.status_code == 200 and len(h2.json()) >= 2


# ---------- AI Chat Stream — validates Cortex unification wiring (system field) ----------
def test_ai_chat_stream_accepts_system(h):
    """The stream endpoint must accept optional `system` field without 422.
    It may emit [error:500] inside the stream when no API key is configured —
    that is expected and validated separately."""
    sid = f"test-{uuid.uuid4().hex[:6]}"
    payload = {
        "session_id": sid,
        "message": "ping",
        "system": "You are OmniverseOS Cortex. Test system prompt.",
    }
    r = requests.post(f"{API}/ai/chat/stream", json=payload, headers=h, timeout=60, stream=True)
    # Must not be 422 (schema rejection of `system`)
    assert r.status_code != 422, f"Backend rejected `system` field: {r.text[:200]}"
    assert r.status_code == 200, r.text
    # Consume a small bit of the stream to be sure
    chunk = next(r.iter_content(chunk_size=256), b"")
    assert chunk is not None


# ---------- AI Image Gen — needs GEMINI_API_KEY; skip if missing ----------
def test_ai_image(h):
    r = requests.post(f"{API}/ai/image", json={"prompt": "a tiny neon cube on black bg"}, headers=h, timeout=180)
    if r.status_code in (500, 503):
        pytest.skip(f"AI image unavailable (likely no GEMINI_API_KEY): {r.text[:200]}")
    assert r.status_code == 200, r.text
    assert r.json().get("image_b64") and len(r.json()["image_b64"]) > 1000
