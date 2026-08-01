#!/usr/bin/env python3
"""
OmniverseOS Backend Regression Test Suite
Tests all critical backend endpoints after frontend changes.
"""

import requests
import json
import time
import sys
from datetime import datetime

# Base URL for backend API
BASE_URL = "http://localhost:8001/api"

# Test results tracking
test_results = []
test_credentials = {}

def log_test(name, passed, details=""):
    """Log test result"""
    status = "✅ PASS" if passed else "❌ FAIL"
    result = {
        "name": name,
        "passed": passed,
        "details": details,
        "timestamp": datetime.now().isoformat()
    }
    test_results.append(result)
    print(f"{status} | {name}")
    if details and not passed:
        print(f"   Details: {details}")
    return passed

def test_health():
    """Test 1: Health endpoint"""
    print("\n=== Test 1: Health Check ===")
    try:
        resp = requests.get(f"{BASE_URL}/health", timeout=10)
        data = resp.json()
        
        passed = (
            resp.status_code == 200 and
            data.get("status") == "healthy" and
            data.get("db") == "ok"
        )
        
        log_test("Health endpoint", passed, 
                f"Status: {resp.status_code}, Response: {json.dumps(data, indent=2)}")
        return passed
    except Exception as e:
        log_test("Health endpoint", False, f"Exception: {str(e)}")
        return False

def test_auth_signup():
    """Test 2: Auth signup"""
    print("\n=== Test 2: Auth Signup ===")
    try:
        # Generate unique email for this test run
        timestamp = int(time.time())
        email = f"testuser{timestamp}@example.com"  # Use standard TLD
        password = f"TestPass{timestamp}!"
        name = f"Test User {timestamp}"
        
        payload = {
            "email": email,
            "password": password,
            "name": name
        }
        
        resp = requests.post(f"{BASE_URL}/auth/signup", json=payload, timeout=10)
        
        # Handle error response
        try:
            data = resp.json()
        except Exception:
            data = {"error": resp.text}
        
        passed = (
            resp.status_code == 200 and
            "token" in data and
            "user" in data and
            data["user"].get("email") == email
        )
        
        if passed:
            test_credentials["email"] = email
            test_credentials["password"] = password
            test_credentials["token"] = data["token"]
            test_credentials["user_id"] = data["user"]["id"]
        
        details = f"Status: {resp.status_code}, Has token: {'token' in data}, Has user: {'user' in data}"
        if not passed and "detail" in data:
            details += f", Error: {data['detail']}"
        
        log_test("Auth signup", passed, details)
        return passed
    except Exception as e:
        log_test("Auth signup", False, f"Exception: {str(e)}")
        return False

def test_auth_login():
    """Test 3: Auth login"""
    print("\n=== Test 3: Auth Login ===")
    try:
        payload = {
            "email": test_credentials["email"],
            "password": test_credentials["password"]
        }
        
        resp = requests.post(f"{BASE_URL}/auth/login", json=payload, timeout=10)
        data = resp.json()
        
        passed = (
            resp.status_code == 200 and
            "token" in data and
            "user" in data and
            data["user"].get("email") == test_credentials["email"]
        )
        
        log_test("Auth login", passed, 
                f"Status: {resp.status_code}, Token matches: {data.get('token') == test_credentials['token']}")
        return passed
    except Exception as e:
        log_test("Auth login", False, f"Exception: {str(e)}")
        return False

def test_auth_me():
    """Test 4: Auth /me endpoint"""
    print("\n=== Test 4: Auth /me ===")
    try:
        headers = {"Authorization": f"Bearer {test_credentials['token']}"}
        resp = requests.get(f"{BASE_URL}/auth/me", headers=headers, timeout=10)
        data = resp.json()
        
        passed = (
            resp.status_code == 200 and
            data.get("email") == test_credentials["email"] and
            data.get("id") == test_credentials["user_id"]
        )
        
        log_test("Auth /me", passed, 
                f"Status: {resp.status_code}, Email matches: {data.get('email') == test_credentials['email']}")
        return passed
    except Exception as e:
        log_test("Auth /me", False, f"Exception: {str(e)}")
        return False

def test_sessions_crud():
    """Test 5-10: Chat Sessions CRUD operations"""
    print("\n=== Test 5-10: Chat Sessions CRUD ===")
    headers = {"Authorization": f"Bearer {test_credentials['token']}"}
    session_ids = []
    
    try:
        # Test 5: GET sessions (should be empty initially)
        resp = requests.get(f"{BASE_URL}/ai/sessions", headers=headers, timeout=10)
        initial_sessions = resp.json()
        log_test("GET /ai/sessions (initial)", resp.status_code == 200, 
                f"Status: {resp.status_code}, Count: {len(initial_sessions)}")
        
        # Test 6: POST create session A
        payload_a = {"title": "Test Session A"}
        resp = requests.post(f"{BASE_URL}/ai/sessions", json=payload_a, headers=headers, timeout=10)
        session_a = resp.json()
        passed_a = resp.status_code == 200 and "id" in session_a and "session_id" in session_a
        if passed_a:
            session_ids.append(session_a["session_id"])
        log_test("POST /ai/sessions (Session A)", passed_a, 
                f"Status: {resp.status_code}, Title: {session_a.get('title')}")
        
        # Test 7: POST create session B
        payload_b = {"title": "Test Session B"}
        resp = requests.post(f"{BASE_URL}/ai/sessions", json=payload_b, headers=headers, timeout=10)
        session_b = resp.json()
        passed_b = resp.status_code == 200 and "id" in session_b and "session_id" in session_b
        if passed_b:
            session_ids.append(session_b["session_id"])
        log_test("POST /ai/sessions (Session B)", passed_b, 
                f"Status: {resp.status_code}, Title: {session_b.get('title')}")
        
        # Test 8: GET sessions (should have 2 now)
        resp = requests.get(f"{BASE_URL}/ai/sessions", headers=headers, timeout=10)
        sessions = resp.json()
        log_test("GET /ai/sessions (after create)", 
                resp.status_code == 200 and len(sessions) >= 2, 
                f"Status: {resp.status_code}, Count: {len(sessions)}")
        
        # Test 9: PATCH rename session A
        patch_payload = {"title": "Renamed Session A"}
        resp = requests.patch(f"{BASE_URL}/ai/sessions/{session_ids[0]}", 
                            json=patch_payload, headers=headers, timeout=10)
        updated_session = resp.json()
        log_test("PATCH /ai/sessions (rename)", 
                resp.status_code == 200 and updated_session.get("title") == "Renamed Session A", 
                f"Status: {resp.status_code}, New title: {updated_session.get('title')}")
        
        # Test 10: PATCH pin session A
        pin_payload = {"pinned": True}
        resp = requests.patch(f"{BASE_URL}/ai/sessions/{session_ids[0]}", 
                            json=pin_payload, headers=headers, timeout=10)
        pinned_session = resp.json()
        log_test("PATCH /ai/sessions (pin)", 
                resp.status_code == 200 and pinned_session.get("pinned") == True, 
                f"Status: {resp.status_code}, Pinned: {pinned_session.get('pinned')}")
        
        # Test 11: GET sessions (pinned should be first)
        resp = requests.get(f"{BASE_URL}/ai/sessions", headers=headers, timeout=10)
        sessions = resp.json()
        first_pinned = sessions[0].get("pinned") if sessions else False
        log_test("GET /ai/sessions (pinned first)", 
                resp.status_code == 200 and first_pinned, 
                f"Status: {resp.status_code}, First session pinned: {first_pinned}")
        
        # Test 12: POST duplicate session A
        resp = requests.post(f"{BASE_URL}/ai/sessions/{session_ids[0]}/duplicate", 
                           headers=headers, timeout=10)
        duplicated = resp.json()
        passed_dup = resp.status_code == 200 and "session_id" in duplicated
        if passed_dup:
            session_ids.append(duplicated["session_id"])
        log_test("POST /ai/sessions/duplicate", passed_dup, 
                f"Status: {resp.status_code}, Title: {duplicated.get('title')}")
        
        # Test 13: DELETE session A
        resp = requests.delete(f"{BASE_URL}/ai/sessions/{session_ids[0]}", 
                             headers=headers, timeout=10)
        log_test("DELETE /ai/sessions", 
                resp.status_code in [200, 204], 
                f"Status: {resp.status_code}")
        
        # Test 14: Verify session B still exists
        resp = requests.get(f"{BASE_URL}/ai/sessions", headers=headers, timeout=10)
        sessions = resp.json()
        session_b_exists = any(s["session_id"] == session_ids[1] for s in sessions)
        log_test("Session B still exists after A deleted", session_b_exists, 
                f"Session B found: {session_b_exists}")
        
        # Store session B ID for later tests
        test_credentials["test_session_id"] = session_ids[1]
        
        return True
    except Exception as e:
        log_test("Sessions CRUD", False, f"Exception: {str(e)}")
        return False

def test_ai_chat_nonstream():
    """Test 15: AI chat non-streaming"""
    print("\n=== Test 15: AI Chat Non-Stream ===")
    headers = {"Authorization": f"Bearer {test_credentials['token']}"}
    
    try:
        payload = {
            "session_id": test_credentials["test_session_id"],
            "message": "Say hi in one word.",
            "model": "gemini-2.5-flash",
            "provider": "gemini"
        }
        
        resp = requests.post(f"{BASE_URL}/ai/chat", json=payload, headers=headers, timeout=30)
        data = resp.json()
        
        # Check response structure
        has_response = "response" in data
        response_text = data.get("response", "")
        no_cmd_tags = "[CMD:" not in response_text
        
        passed = (
            resp.status_code == 200 and
            has_response and
            len(response_text) > 0 and
            no_cmd_tags
        )
        
        log_test("AI chat non-stream", passed, 
                f"Status: {resp.status_code}, Has response: {has_response}, "
                f"Length: {len(response_text)}, No CMD tags: {no_cmd_tags}, "
                f"Response preview: {response_text[:100]}")
        
        return passed
    except Exception as e:
        log_test("AI chat non-stream", False, f"Exception: {str(e)}")
        return False

def test_chat_history():
    """Test 16: Chat history"""
    print("\n=== Test 16: Chat History ===")
    headers = {"Authorization": f"Bearer {test_credentials['token']}"}
    
    try:
        session_id = test_credentials["test_session_id"]
        resp = requests.get(f"{BASE_URL}/ai/chat/history/{session_id}", 
                          headers=headers, timeout=10)
        messages = resp.json()
        
        # Should have at least user + assistant messages from previous test
        has_messages = len(messages) >= 2
        has_user_msg = any(m.get("role") == "user" for m in messages)
        has_assistant_msg = any(m.get("role") == "assistant" for m in messages)
        
        passed = (
            resp.status_code == 200 and
            has_messages and
            has_user_msg and
            has_assistant_msg
        )
        
        log_test("Chat history", passed, 
                f"Status: {resp.status_code}, Message count: {len(messages)}, "
                f"Has user msg: {has_user_msg}, Has assistant msg: {has_assistant_msg}")
        
        return passed
    except Exception as e:
        log_test("Chat history", False, f"Exception: {str(e)}")
        return False

def test_ai_chat_stream():
    """Test 17: AI chat streaming (SSE)"""
    print("\n=== Test 17: AI Chat Stream (SSE) ===")
    headers = {"Authorization": f"Bearer {test_credentials['token']}"}
    
    try:
        payload = {
            "session_id": test_credentials["test_session_id"],
            "message": "Say hello in one word.",
            "model": "gemini-2.5-flash",
            "provider": "gemini"
        }
        
        resp = requests.post(f"{BASE_URL}/ai/chat/stream", json=payload, 
                           headers=headers, stream=True, timeout=30)
        
        # Check content type
        content_type = resp.headers.get("content-type", "")
        is_sse = "text/event-stream" in content_type
        
        # Collect streaming chunks
        chunks = []
        full_content = ""
        
        for line in resp.iter_lines(decode_unicode=True):
            if line and line.startswith("data: "):
                data = line[6:]  # Remove "data: " prefix
                chunks.append(data)
                
                # Stop after reasonable amount of data or [DONE]
                if data == "[DONE]" or len(chunks) > 50:
                    break
                
                # Collect actual content (not metadata)
                if not data.startswith("[") and data != "[DONE]":
                    full_content += data
        
        has_chunks = len(chunks) > 1
        no_cmd_tags = "[CMD:" not in full_content
        has_done = "[DONE]" in chunks
        
        passed = (
            resp.status_code == 200 and
            is_sse and
            has_chunks and
            no_cmd_tags
        )
        
        log_test("AI chat stream", passed, 
                f"Status: {resp.status_code}, Is SSE: {is_sse}, "
                f"Chunks: {len(chunks)}, Has [DONE]: {has_done}, "
                f"No CMD tags: {no_cmd_tags}, Content preview: {full_content[:100]}")
        
        return passed
    except Exception as e:
        log_test("AI chat stream", False, f"Exception: {str(e)}")
        return False

def test_session_auto_title():
    """Test 18: Session auto-title"""
    print("\n=== Test 18: Session Auto-Title ===")
    headers = {"Authorization": f"Bearer {test_credentials['token']}"}
    
    try:
        session_id = test_credentials["test_session_id"]
        resp = requests.post(f"{BASE_URL}/ai/sessions/{session_id}/auto-title", 
                           headers=headers, timeout=30)
        data = resp.json()
        
        title = data.get("title", "")
        not_default = title != "New Chat"
        
        passed = (
            resp.status_code == 200 and
            "title" in data and
            not_default
        )
        
        log_test("Session auto-title", passed, 
                f"Status: {resp.status_code}, Title: {title}, Not default: {not_default}")
        
        return passed
    except Exception as e:
        log_test("Session auto-title", False, f"Exception: {str(e)}")
        return False

def test_memories():
    """Test 19-20: Memories endpoints"""
    print("\n=== Test 19-20: Memories ===")
    headers = {"Authorization": f"Bearer {test_credentials['token']}"}
    
    try:
        # Test 19: POST create memory
        memory_payload = {
            "content": "User works at Acme Corporation as a senior software engineer",
            "category": "Work",
            "importance_score": 0.8
        }
        
        resp = requests.post(f"{BASE_URL}/memories", json=memory_payload, 
                           headers=headers, timeout=10)
        memory = resp.json()
        
        passed_create = (
            resp.status_code == 200 and
            "id" in memory and
            memory.get("content") == memory_payload["content"]
        )
        
        log_test("POST /memories", passed_create, 
                f"Status: {resp.status_code}, Has ID: {'id' in memory}")
        
        # Test 20: POST get relevant memories
        relevant_payload = {
            "query": "Where do I work",
            "limit": 6
        }
        
        resp = requests.post(f"{BASE_URL}/memories/relevant", json=relevant_payload, 
                           headers=headers, timeout=10)
        relevant_memories = resp.json()
        
        is_list = isinstance(relevant_memories, list)
        # It's acceptable if empty, but if not empty, should contain our memory
        found_memory = False
        if is_list and len(relevant_memories) > 0:
            found_memory = any("Acme" in m.get("content", "") for m in relevant_memories)
        
        passed_relevant = resp.status_code == 200 and is_list
        
        log_test("POST /memories/relevant", passed_relevant, 
                f"Status: {resp.status_code}, Is list: {is_list}, "
                f"Count: {len(relevant_memories) if is_list else 0}, "
                f"Found memory: {found_memory}")
        
        return passed_create and passed_relevant
    except Exception as e:
        log_test("Memories", False, f"Exception: {str(e)}")
        return False

def test_rate_limiting():
    """Test 21: Rate limiting"""
    print("\n=== Test 21: Rate Limiting ===")
    headers = {"Authorization": f"Bearer {test_credentials['token']}"}
    
    try:
        # Send 5 quick requests
        responses = []
        for i in range(5):
            payload = {
                "session_id": test_credentials["test_session_id"],
                "message": f"Quick test {i}",
                "model": "gemini-2.5-flash",
                "provider": "gemini"
            }
            resp = requests.post(f"{BASE_URL}/ai/chat", json=payload, 
                               headers=headers, timeout=30)
            responses.append(resp.status_code)
        
        # Check that none returned 500 (429 is acceptable)
        no_500_errors = all(status != 500 for status in responses)
        has_429 = any(status == 429 for status in responses)
        
        passed = no_500_errors
        
        log_test("Rate limiting", passed, 
                f"Status codes: {responses}, No 500s: {no_500_errors}, Has 429: {has_429}")
        
        return passed
    except Exception as e:
        log_test("Rate limiting", False, f"Exception: {str(e)}")
        return False

def save_test_credentials():
    """Save test credentials to file"""
    try:
        with open("/app/memory/test_credentials.md", "w") as f:
            f.write("# Test Credentials\n\n")
            f.write(f"Email: {test_credentials.get('email', 'N/A')}\n")
            f.write(f"Password: {test_credentials.get('password', 'N/A')}\n")
            f.write(f"User ID: {test_credentials.get('user_id', 'N/A')}\n")
            f.write(f"Token: {test_credentials.get('token', 'N/A')}\n")
            f.write(f"\nGenerated: {datetime.now().isoformat()}\n")
        print("\n✅ Test credentials saved to /app/memory/test_credentials.md")
        return True
    except Exception as e:
        print(f"\n❌ Failed to save test credentials: {str(e)}")
        return False

def print_summary():
    """Print test summary"""
    print("\n" + "="*70)
    print("TEST SUMMARY")
    print("="*70)
    
    passed = sum(1 for t in test_results if t["passed"])
    total = len(test_results)
    
    print(f"\nTotal Tests: {total}")
    print(f"Passed: {passed}")
    print(f"Failed: {total - passed}")
    print(f"Success Rate: {(passed/total*100):.1f}%")
    
    if total - passed > 0:
        print("\n❌ FAILED TESTS:")
        for t in test_results:
            if not t["passed"]:
                print(f"  - {t['name']}")
                if t["details"]:
                    print(f"    {t['details']}")
    
    print("\n" + "="*70)
    
    return passed == total

def main():
    """Run all tests"""
    print("="*70)
    print("OmniverseOS Backend Regression Test Suite")
    print("="*70)
    print(f"Base URL: {BASE_URL}")
    print(f"Started: {datetime.now().isoformat()}")
    
    # Create memory directory if it doesn't exist
    import os
    os.makedirs("/app/memory", exist_ok=True)
    
    # Run tests in order
    all_passed = True
    
    all_passed &= test_health()
    all_passed &= test_auth_signup()
    all_passed &= test_auth_login()
    all_passed &= test_auth_me()
    all_passed &= test_sessions_crud()
    all_passed &= test_ai_chat_nonstream()
    all_passed &= test_chat_history()
    all_passed &= test_ai_chat_stream()
    all_passed &= test_session_auto_title()
    all_passed &= test_memories()
    all_passed &= test_rate_limiting()
    
    # Save credentials
    save_test_credentials()
    
    # Print summary
    summary_passed = print_summary()
    
    # Exit with appropriate code
    sys.exit(0 if summary_passed else 1)

if __name__ == "__main__":
    main()
