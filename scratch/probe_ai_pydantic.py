import requests
import json

BASE = "http://127.0.0.1:8001/api"
DEMO = {"email": "demo@omniverse.io", "password": "omniverse123"}
token = requests.post(f"{BASE}/auth/login", json=DEMO).json()["token"]
headers = {"Authorization": f"Bearer {token}", "Content-Type": "application/json"}

# 1. AI Consensus with exact fields
r_consensus = requests.post(f"{BASE}/ai/consensus", headers=headers, json={
    "question": "Should we use microservices?",
    "responses": [
        {"model": "Model A", "text": "Microservices allow independent deployment and isolated failure domains."},
        {"model": "Model B", "text": "Microservices introduce distributed system complexity and network hops."}
    ]
})
print("=== AI Consensus ===")
print("Status:", r_consensus.status_code)
print("Response:", r_consensus.text)

# 2. Adversary with exact fields
r_adv = requests.post(f"{BASE}/ai/adversary", headers=headers, json={
    "idea": "Migrate all relational databases to unindexed key-value stores."
})
print("\n=== The Adversary ===")
print("Status:", r_adv.status_code)
print("Response:", r_adv.text[:300])

# 3. War Room with exact fields
r_wr = requests.post(f"{BASE}/ai/warroom", headers=headers, json={
    "situation": "Competitor launched an open-source alternative to our flagship product."
})
print("\n=== War Room ===")
print("Status:", r_wr.status_code)
print("Response:", r_wr.text[:300])
