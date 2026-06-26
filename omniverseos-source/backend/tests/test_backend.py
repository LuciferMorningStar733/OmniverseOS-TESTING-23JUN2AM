"""OmniverseOS backend regression tests."""
import os, uuid, time
import requests
import pytest

BASE = os.environ["REACT_APP_BACKEND_URL"].rstrip("/") if os.environ.get("REACT_APP_BACKEND_URL") else "https://unified-ai-hub-32.preview.emergentagent.com"
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


# ---------- AI Chat (non-stream) ----------
def test_ai_chat(h):
    sid = f"test-{uuid.uuid4().hex[:6]}"
    r = requests.post(f"{API}/ai/chat", json={"session_id": sid, "message": "Say hi in 3 words"}, headers=h, timeout=120)
    assert r.status_code == 200, r.text
    assert isinstance(r.json().get("response"), str) and len(r.json()["response"]) > 0
    # history
    h2 = requests.get(f"{API}/ai/chat/history/{sid}", headers=h, timeout=15)
    assert h2.status_code == 200 and len(h2.json()) >= 2


# ---------- AI Image Gen ----------
def test_ai_image(h):
    r = requests.post(f"{API}/ai/image", json={"prompt": "a tiny neon cube on black bg"}, headers=h, timeout=180)
    assert r.status_code == 200, r.text
    assert r.json().get("image_b64") and len(r.json()["image_b64"]) > 1000
