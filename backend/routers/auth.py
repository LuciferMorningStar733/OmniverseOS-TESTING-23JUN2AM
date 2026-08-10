import uuid
from fastapi import APIRouter, HTTPException, Depends
from pydantic import BaseModel, EmailStr
from core.database import db, now_iso
from core.auth import (
    hash_password,
    verify_password,
    create_token,
    get_current_user,
)

router = APIRouter(prefix="/auth", tags=["auth"])

class SignupReq(BaseModel):
    email: EmailStr
    password: str
    name: str

class LoginReq(BaseModel):
    email: EmailStr
    password: str

@router.post("/signup")
async def signup(req: SignupReq):
    email = req.email.lower().strip()
    existing = await db.users.find_one({"email": email})
    if existing:
        raise HTTPException(400, "User already exists")

    uid = str(uuid.uuid4())
    user_doc = {
        "id": uid,
        "email": email,
        "password": hash_password(req.password),
        "name": req.name.strip(),
        "created_at": now_iso(),
        "role": "user",
    }
    await db.users.insert_one(user_doc)
    token = create_token(uid, email)
    return {
        "token": token,
        "user": {"id": uid, "email": email, "name": req.name.strip()},
    }

@router.post("/login")
async def login(req: LoginReq):
    email = req.email.lower().strip()
    user = await db.users.find_one({"email": email})
    if not user or not verify_password(req.password, user["password"]):
        raise HTTPException(401, "Invalid email or password")

    token = create_token(user["id"], user["email"])
    return {
        "token": token,
        "user": {
            "id": user["id"],
            "email": user["email"],
            "name": user.get("name", ""),
        },
    }

@router.get("/me")
async def me(user=Depends(get_current_user)):
    return user
