import os
import socket
import logging
from datetime import datetime, timezone
from motor.motor_asyncio import AsyncIOMotorClient
from pathlib import Path
from dotenv import load_dotenv

ROOT_DIR = Path(__file__).parent.parent
load_dotenv(ROOT_DIR / ".env")

logger = logging.getLogger(__name__)

MONGO_URL = os.environ.get("MONGO_URL", "mongodb://localhost:27017")
DB_NAME = os.environ.get("DB_NAME", "omniverseos")

APP_ENV = os.environ.get("APP_ENV", os.environ.get("ENVIRONMENT", os.environ.get("NODE_ENV", "development"))).strip().lower()
IS_PRODUCTION = APP_ENV in ("production", "prod")

def _is_mongo_online(url: str) -> bool:
    try:
        if "localhost" in url or "127.0.0.1" in url:
            port = 27017
            s = socket.socket(socket.AF_INET, socket.SOCK_STREAM)
            s.settimeout(0.5)
            r = s.connect_ex(("127.0.0.1", port))
            s.close()
            return r == 0
        return True
    except Exception:
        return False

# Database client instantiation
IS_MOCK_DB = False

if IS_PRODUCTION:
    # In production: NEVER silently fall back to ephemeral in-memory mock.
    client = AsyncIOMotorClient(MONGO_URL, serverSelectionTimeoutMS=5000)
    db = client[DB_NAME]
    IS_MOCK_DB = False
else:
    # In development/testing: permit mongomock_motor only if local MongoDB is not running
    if _is_mongo_online(MONGO_URL):
        client = AsyncIOMotorClient(MONGO_URL, serverSelectionTimeoutMS=2000)
        db = client[DB_NAME]
        IS_MOCK_DB = False
    else:
        try:
            from mongomock_motor import AsyncMongoMockClient
            client = AsyncMongoMockClient()
            db = client[DB_NAME]
            IS_MOCK_DB = True
            logger.warning(
                "[DEV PERSISTENCE WARNING] Local MongoDB is offline at %s. "
                "Using in-memory mongomock_motor client for development/test ONLY. "
                "Data will not persist across restarts.", MONGO_URL
            )
        except Exception:
            client = AsyncIOMotorClient(MONGO_URL, serverSelectionTimeoutMS=2000)
            db = client[DB_NAME]
            IS_MOCK_DB = False

def now_iso() -> str:
    return datetime.now(timezone.utc).isoformat()
