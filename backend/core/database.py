import os
from datetime import datetime, timezone
from motor.motor_asyncio import AsyncIOMotorClient
from pathlib import Path
from dotenv import load_dotenv

ROOT_DIR = Path(__file__).parent.parent
load_dotenv(ROOT_DIR / ".env")

MONGO_URL = os.environ.get("MONGO_URL", "mongodb://localhost:27017")
DB_NAME = os.environ.get("DB_NAME", "omniverse_os")

client = AsyncIOMotorClient(MONGO_URL)
db = client[DB_NAME]

def now_iso() -> str:
    return datetime.now(timezone.utc).isoformat()
