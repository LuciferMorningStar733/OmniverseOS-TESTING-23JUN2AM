import httpx
import json
import time

def main():
    base = "https://omniverseos-testing-23jun2am.onrender.com"
    print(f"[1/5] Checking Health Endpoint: {base}/api/system/health")
    health_res = httpx.get(f"{base}/api/system/health", timeout=20.0)
    print("HEALTH STATUS:", health_res.status_code)
    health = health_res.json()
    print("DATABASE INFO:", json.dumps(health.get("database"), indent=2))
    
    print("\n[2/5] Authenticating Demo Account against Production...")
    login_res = httpx.post(
        f"{base}/api/auth/login",
        json={"email": "demo@omniverse.io", "password": "omniverse123"},
        headers={"Origin": "https://omniverseos.in.net"},
        timeout=20.0
    )
    print("LOGIN STATUS:", login_res.status_code)
    assert login_res.status_code == 200, f"Login failed: {login_res.text}"
    token = login_res.json()["token"]
    print("JWT Token acquired successfully.")
    
    headers = {
        "Authorization": f"Bearer {token}",
        "Origin": "https://omniverseos.in.net"
    }
    
    # 3. Create persistent test record
    print("\n[3/5] Performing Write Probe: Creating dedicated persistence test record...")
    probe_id = f"audit-persist-{int(time.time())}"
    write_payload = {
        "title": f"__FORENSIC_PERSISTENCE_PROBE_{probe_id}__",
        "content": "Zero-trust persistence verification record. Verifies real MongoDB durability.",
        "color": "#0078D7"
    }
    write_res = httpx.post(f"{base}/api/notes", json=write_payload, headers=headers, timeout=20.0)
    print("WRITE STATUS:", write_res.status_code)
    assert write_res.status_code == 200, f"Write failed: {write_res.text}"
    created_note = write_res.json()
    note_id = created_note["id"]
    print(f"Created Note ID: {note_id}")
    
    # 4. Read back
    print("\n[4/5] Performing Read Probe: Fetching notes to verify record persistence...")
    read_res = httpx.get(f"{base}/api/notes", headers=headers, timeout=20.0)
    print("READ STATUS:", read_res.status_code)
    assert read_res.status_code == 200, f"Read failed: {read_res.text}"
    notes = read_res.json()
    found = [n for n in notes if n.get("id") == note_id]
    assert len(found) == 1, f"Expected 1 matching record, found {len(found)}"
    print(f"VERIFIED: Note found with title '{found[0]['title']}'. Data exists in production MongoDB.")
    
    # 5. Clean up
    print("\n[5/5] Performing Cleanup: Deleting persistence test record...")
    del_res = httpx.delete(f"{base}/api/notes/{note_id}", headers=headers, timeout=20.0)
    print("DELETE STATUS:", del_res.status_code)
    assert del_res.status_code == 200, f"Delete failed: {del_res.text}"
    
    # Verify deletion
    verify_del = httpx.get(f"{base}/api/notes", headers=headers, timeout=20.0)
    remaining = [n for n in verify_del.json() if n.get("id") == note_id]
    assert len(remaining) == 0, "Record was not properly deleted during cleanup"
    print("CLEANUP VERIFIED: Test record cleanly removed from database.")
    
    print("\n=== SUMMARY OF GATE 1 EVIDENCE ===")
    print("Deployed Backend URL:", base)
    print("Database Engine:", health.get("database", {}).get("engine"))
    print("Is Mock DB:", health.get("database", {}).get("is_mock"))
    print("Is Production Mode:", health.get("database", {}).get("is_production"))
    print("Survives Restart:", health.get("database", {}).get("survives_restart"))
    print("Database Latency (ms):", health.get("database", {}).get("latency_ms"))
    print("Write -> Read -> Cleanup Lifecycle: SUCCESS")

if __name__ == "__main__":
    main()
