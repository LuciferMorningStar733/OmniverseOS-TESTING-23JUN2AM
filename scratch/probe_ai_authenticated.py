import requests
import json
import time

BASE = "http://127.0.0.1:8001/api"
DEMO = {"email": "demo@omniverse.io", "password": "omniverse123"}

def get_auth_token():
    r = requests.post(f"{BASE}/auth/login", json=DEMO, timeout=10)
    if r.status_code != 200:
        requests.post(f"{BASE}/auth/signup", json={"email": DEMO["email"], "password": DEMO["password"], "name": "Demo User"}, timeout=10)
        r = requests.post(f"{BASE}/auth/login", json=DEMO, timeout=10)
    if r.status_code == 200:
        return r.json()["token"]
    raise Exception(f"Login failed: {r.status_code} {r.text}")

token = get_auth_token()
headers = {"Authorization": f"Bearer {token}", "Content-Type": "application/json"}
print(f"Authenticated successfully! Token starts with: {token[:15]}...")

tests = [
    {
        "name": "Image Engine Status",
        "method": "GET",
        "url": "/ai/image/engine/status",
        "payload": None
    },
    {
        "name": "AI Consensus (Evaluates Multi-Model Agreement)",
        "method": "POST",
        "url": "/ai/consensus",
        "payload": {
            "topic": "Microservices vs Modular Monolith",
            "perspectives": ["Microservices offer independent scalability", "Monoliths reduce network latency and ops complexity"]
        }
    },
    {
        "name": "AI Chat Stream (Cortex Core)",
        "method": "POST",
        "url": "/ai/chat/stream",
        "payload": {
            "message": "Explain quantum decoherence in 1 sentence.",
            "session_id": "test_session_01"
        }
    },
    {
        "name": "Model Face-Off Arena",
        "method": "POST",
        "url": "/ai/faceoff",
        "payload": {
            "prompt": "State the speed of light in vacuum."
        }
    },
    {
        "name": "The Adversary (Red-Team)",
        "method": "POST",
        "url": "/ai/adversary",
        "payload": {
            "proposal": "Deploy SQLite in distributed production"
        }
    },
    {
        "name": "War Room (Multi-Persona)",
        "method": "POST",
        "url": "/ai/warroom",
        "payload": {
            "topic": "Increase cloud infrastructure budget by 50%"
        }
    },
    {
        "name": "Cortex Memory Engine (Create Memory)",
        "method": "POST",
        "url": "/memories",
        "payload": {
            "title": "Quantum Milestone",
            "content": "Project Orion target launch date is November 14.",
            "category": "project"
        }
    },
    {
        "name": "Cortex Memory Engine (List Memories)",
        "method": "GET",
        "url": "/memories",
        "payload": None
    },
    {
        "name": "Image Generation (FLUX / Local)",
        "method": "POST",
        "url": "/ai/image/generate",
        "payload": {
            "prompt": "Cyberpunk terminal neon"
        }
    }
]

audit_results = []

for t in tests:
    start_t = time.time()
    try:
        if t["method"] == "GET":
            r = requests.get(f"{BASE}{t['url']}", headers=headers, timeout=15)
        else:
            r = requests.post(f"{BASE}{t['url']}", headers=headers, json=t["payload"], timeout=15)
        elapsed = round(time.time() - start_t, 3)
        status = r.status_code
        content_type = r.headers.get("content-type", "")
        text = r.text[:350]
        
        try:
            parsed = r.json()
        except:
            parsed = None
            
        print(f"\n==================================================")
        print(f"SERVICE: {t['name']}")
        print(f"ENDPOINT: {t['url']} ({t['method']})")
        print(f"HTTP STATUS: {status} | TIME: {elapsed}s | TYPE: {content_type}")
        print(f"RESPONSE PREVIEW:\n{text}")
        
        audit_results.append({
            "service": t["name"],
            "endpoint": t["url"],
            "method": t["method"],
            "http_status": status,
            "latency_s": elapsed,
            "content_type": content_type,
            "preview": text,
            "json": parsed
        })
    except Exception as e:
        elapsed = round(time.time() - start_t, 3)
        print(f"\n==================================================")
        print(f"SERVICE: {t['name']}")
        print(f"ERROR: {str(e)} | TIME: {elapsed}s")
        audit_results.append({
            "service": t["name"],
            "endpoint": t["url"],
            "error": str(e),
            "latency_s": elapsed
        })

with open("scratch/authenticated_ai_audit.json", "w", encoding="utf-8") as f:
    json.dump(audit_results, f, indent=2)

print("\nAudit complete! Saved to scratch/authenticated_ai_audit.json")
