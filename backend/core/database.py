import os
from datetime import datetime, timezone
from motor.motor_asyncio import AsyncIOMotorClient
from pathlib import Path
from dotenv import load_dotenv

ROOT_DIR = Path(__file__).parent.parent
load_dotenv(ROOT_DIR / ".env")

MONGO_URL = os.environ.get("MONGO_URL", "mongodb://localhost:27017")
DB_NAME = os.environ.get("DB_NAME", "omniverseos")

import socket

def _is_mongo_online(url: str) -> bool:
    try:
        if "localhost" in url or "127.0.0.1" in url:
            port = 27017
            if ":" in url.split("/")[-1]:
                pass
            s = socket.socket(socket.AF_INET, socket.SOCK_STREAM)
            s.settimeout(0.3)
            r = s.connect_ex(("127.0.0.1", port))
            s.close()
            return r == 0
        return True
    except Exception:
        return False

if _is_mongo_online(MONGO_URL):
    client = AsyncIOMotorClient(MONGO_URL, serverSelectionTimeoutMS=2000)
    db = client[DB_NAME]
else:
    try:
        from mongomock_motor import AsyncMongoMockClient
        client = AsyncMongoMockClient()
        db = client[DB_NAME]
    except Exception:
        client = AsyncIOMotorClient(MONGO_URL, serverSelectionTimeoutMS=2000)
        db = client[DB_NAME]

def now_iso() -> str:
    return datetime.now(timezone.utc).isoformat()
