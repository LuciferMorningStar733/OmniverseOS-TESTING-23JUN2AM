import os
import logging
import jwt as pyjwt
from datetime import datetime, timezone, timedelta
from typing import Optional
from fastapi import HTTPException, Depends
from fastapi.security import HTTPBearer, HTTPAuthorizationCredentials
from passlib.context import CryptContext
from core.database import db, IS_PRODUCTION, APP_ENV

logger = logging.getLogger(__name__)

KNOWN_DEV_SECRETS = {
    "omniverseos-dev-do-not-use-in-prod",
    "omniverseos-dev-secret-do-not-use-in-prod",
    "dev",
    "secret",
    "change-me",
    "default",
    ""
}

raw_secret = os.environ.get("JWT_SECRET", "").strip()

if IS_PRODUCTION:
    if not raw_secret or raw_secret in KNOWN_DEV_SECRETS or len(raw_secret) < 32:
        raise RuntimeError(
            "[FATAL SECURITY ERROR] Production startup rejected: JWT_SECRET must be configured with a "
            "cryptographically secure secret key (minimum 32 characters) and cannot use known development fallbacks."
        )
    JWT_SECRET = raw_secret
    JWT_EXP_HOURS = int(os.environ.get("JWT_EXP_HOURS", "24"))
else:
    JWT_SECRET = raw_secret if (raw_secret and raw_secret not in KNOWN_DEV_SECRETS) else "omniverseos-dev-secret-do-not-use-in-prod"
    JWT_EXP_HOURS = int(os.environ.get("JWT_EXP_HOURS", "168"))

JWT_ALG = "HS256"

pwd_context = CryptContext(schemes=["bcrypt"], deprecated="auto")
security = HTTPBearer(auto_error=False)

def hash_password(password: str) -> str:
    return pwd_context.hash(password)

def verify_password(plain: str, hashed: str) -> bool:
    return pwd_context.verify(plain, hashed)

def create_token(user_id: str, email: str) -> str:
    payload = {
        "sub": user_id,
        "email": email,
        "exp": datetime.now(timezone.utc) + timedelta(hours=JWT_EXP_HOURS),
    }
    return pyjwt.encode(payload, JWT_SECRET, algorithm=JWT_ALG)

async def get_current_user(
    creds: Optional[HTTPAuthorizationCredentials] = Depends(security),
) -> dict:
    if not creds:
        raise HTTPException(status_code=401, detail="Missing token")
    try:
        payload = pyjwt.decode(creds.credentials, JWT_SECRET, algorithms=[JWT_ALG])
    except Exception:
        raise HTTPException(status_code=401, detail="Invalid token")
    user = await db.users.find_one({"id": payload["sub"]}, {"_id": 0, "password": 0})
    if not user:
        raise HTTPException(status_code=401, detail="User not found")
    return user
