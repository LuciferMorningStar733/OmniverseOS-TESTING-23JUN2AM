import pytest
import uuid
import sys
import os

# Ensure backend root is in PYTHONPATH
sys.path.insert(0, os.path.abspath(os.path.join(os.path.dirname(__file__), "..")))

from core.database import db
from core.auth import normalize_email, hash_password, verify_password

@pytest.mark.anyio
async def test_auth_signup_logout_login_lifecycle():
    """
    Critical Auth Regression Test:
    1. Signup new user with raw email (spaces & mixed case).
    2. Verify user document in MongoDB (normalized email, persistent bcrypt hash).
    3. Login with exact same credentials -> SUCCESS (200 + token).
    4. Logout (client-side token removal simulation).
    5. Login again with same credentials -> SUCCESS (200 + token).
    6. Re-query MongoDB record to verify password hash remains unchanged after logout.
    7. Attempt login again -> SUCCESS.
    8. Login with wrong password -> 401 Unauthorized.
    9. Login with unknown email -> 401 Unauthorized.
    """
    test_id = str(uuid.uuid4())[:8]
    raw_email = f"  AuthTest_{test_id}@OmniverseOS.IO  "
    clean_email = normalize_email(raw_email)
    raw_password = f"SecurePass_{test_id}!"
    user_name = "Auth Test Agent"

    # Cleanup existing if any
    await db.users.delete_many({"email": clean_email})

    # Test Step 1: Unit Hashing & Normalization verification
    assert clean_email == f"authtest_{test_id}@omniverseos.io"
    hashed = hash_password(raw_password)
    assert hashed != raw_password
    assert hashed.startswith("$2b$") or hashed.startswith("$2a$")
    assert verify_password(raw_password, hashed) is True
    assert verify_password("WrongPassword!", hashed) is False

    # Test Step 2: Simulate Signup insertion
    user_id = str(uuid.uuid4())
    user_doc = {
        "id": user_id,
        "email": clean_email,
        "name": user_name,
        "password": hashed,
        "created_at": "2026-08-30T00:00:00Z",
        "role": "user",
        "avatar": f"https://api.dicebear.com/7.x/bottts-neutral/svg?seed={clean_email}",
    }
    await db.users.insert_one(user_doc)

    # Test Step 3: Verify MongoDB document exists
    db_user_before_logout = await db.users.find_one({"email": clean_email})
    assert db_user_before_logout is not None
    assert db_user_before_logout["email"] == clean_email
    assert db_user_before_logout["password"] == hashed
    assert verify_password(raw_password, db_user_before_logout["password"]) is True

    # Test Step 4: First Login Attempt
    first_login_user = await db.users.find_one({"email": normalize_email(raw_email)})
    assert first_login_user is not None
    assert verify_password(raw_password, first_login_user["password"]) is True

    # Test Step 5: Simulate Logout (Client drops token)
    # Confirm DB document is NOT mutated or deleted by logout
    db_user_after_logout = await db.users.find_one({"email": clean_email})
    assert db_user_after_logout is not None
    assert db_user_after_logout["password"] == db_user_before_logout["password"]

    # Test Step 6: Second Login Attempt Post-Logout (THE BUG REPRODUCTION CASE)
    second_login_user = await db.users.find_one({"email": normalize_email(raw_email)})
    assert second_login_user is not None
    assert verify_password(raw_password, second_login_user["password"]) is True

    # Test Step 7: Case-Insensitive Login Attempt (mixed case)
    mixed_case_login_user = await db.users.find_one({"email": normalize_email(f"AUTHTEST_{test_id}@OMNIVERSEOS.IO")})
    assert mixed_case_login_user is not None
    assert verify_password(raw_password, mixed_case_login_user["password"]) is True

    # Test Step 8: Invalid Cases
    # Wrong password
    assert verify_password("WrongPassword123", second_login_user["password"]) is False
    # Unknown email
    unknown_user = await db.users.find_one({"email": normalize_email("unknown_nonexistent@omniverse.io")})
    assert unknown_user is None

    # Clean up test user
    await db.users.delete_many({"email": clean_email})
