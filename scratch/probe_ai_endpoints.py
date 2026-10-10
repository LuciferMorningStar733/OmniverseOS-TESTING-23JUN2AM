import requests
import json

BASE = "http://127.0.0.1:8001"

def test_endpoint(name, method, url, payload=None, headers=None):
    try:
        if method == "GET":
            r = requests.get(f"{BASE}{url}", headers=headers, timeout=5)
        else:
            r = requests.post(f"{BASE}{url}", json=payload, headers=headers, timeout=5)
        
        status = r.status_code
        content_type = r.headers.get("content-type", "")
        body_sample = r.text[:300]
        
        try:
            parsed = r.json()
            is_json = True
        except:
            parsed = None
            is_json = False

        print(f"=== {name} ===")
        print(f"URL: {url}")
        print(f"Status: {status}")
        print(f"Content-Type: {content_type}")
        print(f"Body: {body_sample}")
        print("--------------------------------------------------")
        return {"name": name, "url": url, "status": status, "body": body_sample, "is_json": is_json, "parsed": parsed}
    except Exception as e:
        print(f"=== {name} ===")
        print(f"Error: {str(e)}")
        print("--------------------------------------------------")
        return {"name": name, "url": url, "error": str(e)}

results = []

# 1. System Health
results.append(test_endpoint("System Health", "GET", "/api/health"))

# 2. Image Engine Status
results.append(test_endpoint("Image Engine Status", "GET", "/api/ai/image/engine/status"))

# 3. AI Consensus
results.append(test_endpoint("AI Consensus", "POST", "/api/ai/consensus", {
    "topic": "Quantum Encryption",
    "perspectives": ["Optimistic", "Pessimistic"]
}))

# 4. AI Chat Stream (without auth)
results.append(test_endpoint("AI Chat Stream (Unauth)", "POST", "/api/ai/chat/stream", {
    "message": "Hello world"
}))

# 5. Model Face-Off
results.append(test_endpoint("Model Face-Off", "POST", "/api/ai/faceoff", {
    "prompt": "Compare functional vs OOP programming"
}))

# 6. Memories List (Unauth)
results.append(test_endpoint("Memories List (Unauth)", "GET", "/api/memories"))

# 7. Live Web / Search
results.append(test_endpoint("Live Web / Search", "POST", "/api/web/search", {
    "query": "Quantum computing news"
}))

# 8. The Adversary Stream
results.append(test_endpoint("The Adversary Stream", "POST", "/api/ai/adversary/stream", {
    "proposal": "Migrate all infrastructure to serverless"
}))

# 9. War Room Stream
results.append(test_endpoint("War Room Stream", "POST", "/api/ai/warroom/stream", {
    "topic": "Pivot to B2B enterprise tier"
}))

# 10. Image Generate
results.append(test_endpoint("Image Generate", "POST", "/api/ai/image/generate", {
    "prompt": "Cyberpunk terminal neon"
}))
