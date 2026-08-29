import uuid
from datetime import datetime, timezone, timedelta
from fastapi import APIRouter, HTTPException, Depends
from pydantic import BaseModel, EmailStr, Field
from core.database import db, now_iso
from core.auth import (
    normalize_email,
    hash_password,
    verify_password,
    create_token,
    get_current_user,
)

router = APIRouter(prefix="/auth", tags=["auth"])

class SignupReq(BaseModel):
    email: EmailStr
    password: str = Field(..., min_length=4)
    name: str = Field(default="Agent")

class LoginReq(BaseModel):
    email: EmailStr
    password: str

class ForgotPasswordReq(BaseModel):
    email: EmailStr

class ResetPasswordReq(BaseModel):
    token: str
    new_password: str = Field(..., min_length=4)

class ChangePasswordReq(BaseModel):
    current_password: str
    new_password: str = Field(..., min_length=4)

@router.post("/signup")
async def signup(req: SignupReq):
    clean_email = normalize_email(req.email)
    existing = await db.users.find_one({"email": clean_email})
    if existing:
        raise HTTPException(status_code=400, detail="Email already registered")

    user_id = str(uuid.uuid4())
    hashed_pwd = hash_password(req.password)
    user_doc = {
        "id": user_id,
        "email": clean_email,
        "name": req.name.strip() if req.name else "Agent",
        "password": hashed_pwd,
        "created_at": now_iso(),
        "role": "user",
        "avatar": f"https://api.dicebear.com/7.x/bottts-neutral/svg?seed={clean_email}",
    }

    try:
        await db.users.insert_one(user_doc)
    except Exception:
        raise HTTPException(status_code=400, detail="Email already registered")

    token = create_token(user_id, clean_email)
    user_out = {
        "id": user_id,
        "email": clean_email,
        "name": user_doc["name"],
        "created_at": user_doc["created_at"],
        "avatar": user_doc["avatar"],
        "role": "user",
    }
    return {"token": token, "user": user_out}

@router.post("/login")
async def login(req: LoginReq):
    clean_email = normalize_email(req.email)
    user = await db.users.find_one({"email": clean_email})
    
    # Secure check: don't reveal whether email exists
    if not user or not user.get("password") or not verify_password(req.password, user["password"]):
        raise HTTPException(status_code=401, detail="Invalid credentials")

    token = create_token(user["id"], user["email"])
    user_out = {
        "id": user["id"],
        "email": user["email"],
        "name": user.get("name", ""),
        "created_at": user.get("created_at", ""),
        "avatar": user.get("avatar", ""),
        "role": user.get("role", "user"),
    }
    return {"token": token, "user": user_out}

@router.get("/me")
async def me(user=Depends(get_current_user)):
    return user

@router.post("/forgot-password")
async def forgot_password(req: ForgotPasswordReq):
    clean_email = normalize_email(req.email)
    user = await db.users.find_one({"email": clean_email})
    if not user:
        # Secure: don't reveal if email exists
        return {"message": "If this email is registered, password reset instructions have been created."}

    reset_token = str(uuid.uuid4())
    expires_at = (datetime.now(timezone.utc) + timedelta(hours=1)).isoformat()
    await db.users.update_one(
        {"id": user["id"]},
        {"$set": {"reset_token": reset_token, "reset_token_expires": expires_at}},
    )
    return {
        "message": "Password reset token generated.",
        "reset_token": reset_token,
    }

@router.post("/reset-password")
async def reset_password(req: ResetPasswordReq):
    user = await db.users.find_one({"reset_token": req.token})
    if not user:
        raise HTTPException(status_code=400, detail="Invalid or expired reset token")

    exp_str = user.get("reset_token_expires", "")
    if exp_str:
        try:
            exp = datetime.fromisoformat(exp_str)
            if datetime.now(timezone.utc) > exp:
                raise HTTPException(status_code=400, detail="Reset token has expired")
        except Exception:
            pass

    new_hash = hash_password(req.new_password)
    await db.users.update_one(
        {"id": user["id"]},
        {"$set": {"password": new_hash}, "$unset": {"reset_token": "", "reset_token_expires": ""}},
    )
    return {"message": "Password reset successfully. You can now log in."}

@router.put("/change-password")
async def change_password(req: ChangePasswordReq, user=Depends(get_current_user)):
    db_user = await db.users.find_one({"id": user["id"]})
    if not db_user or not verify_password(req.current_password, db_user.get("password", "")):
        raise HTTPException(status_code=400, detail="Current password is incorrect")

    new_hash = hash_password(req.new_password)
    await db.users.update_one({"id": user["id"]}, {"$set": {"password": new_hash}})
    return {"message": "Password changed successfully"}
