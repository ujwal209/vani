from datetime import datetime, timedelta, timezone
from typing import Optional
from fastapi import APIRouter, HTTPException, Depends, Header, status
from pydantic import BaseModel, EmailStr
from bson import ObjectId

from db import get_database
from security import (
    hash_password, 
    verify_password, 
    generate_otp, 
    create_access_token, 
    decode_access_token
)
from services.email_service import send_verification_otp, send_password_reset_otp

router = APIRouter(prefix="/api/auth", tags=["Auth"])


class SignupRequest(BaseModel):
    name: str
    email: EmailStr
    password: str
    preferred_language: Optional[str] = "Hindi"
    state: Optional[str] = "India"


class VerifyEmailRequest(BaseModel):
    email: EmailStr
    otp_code: str


class ResendCodeRequest(BaseModel):
    email: EmailStr


class LoginRequest(BaseModel):
    email: EmailStr
    password: str


class ForgotPasswordRequest(BaseModel):
    email: EmailStr


class ResetPasswordRequest(BaseModel):
    email: EmailStr
    otp_code: str
    new_password: str


async def get_current_user(authorization: Optional[str] = Header(None)):
    if not authorization or not authorization.startswith("Bearer "):
        raise HTTPException(
            status_code=status.HTTP_401_UNAUTHORIZED,
            detail="Missing or invalid authorization header"
        )
    token = authorization.split(" ")[1]
    payload = decode_access_token(token)
    if not payload or "sub" not in payload:
        raise HTTPException(
            status_code=status.HTTP_401_UNAUTHORIZED,
            detail="Invalid or expired token"
        )
    
    db = get_database()
    user = await db.users.find_one({"email": payload["sub"]})
    if not user:
        raise HTTPException(status_code=404, detail="User not found")
    
    # Format ID
    user["_id"] = str(user["_id"])
    user.pop("password_hash", None)
    return user


@router.post("/signup")
async def signup(req: SignupRequest):
    db = get_database()
    existing_user = await db.users.find_one({"email": req.email.lower()})

    otp_code = generate_otp()
    expires_at = datetime.now(timezone.utc) + timedelta(minutes=15)

    if existing_user:
        if existing_user.get("is_verified"):
            raise HTTPException(status_code=400, detail="Account with this email already exists. Please login.")
        else:
            # Update unverified user with new code and details
            await db.users.update_one(
                {"_id": existing_user["_id"]},
                {
                    "$set": {
                        "name": req.name,
                        "password_hash": hash_password(req.password),
                        "preferred_language": req.preferred_language,
                        "state": req.state,
                        "verification_code": otp_code,
                        "verification_expires_at": expires_at,
                        "updated_at": datetime.now(timezone.utc)
                    }
                }
            )
    else:
        user_doc = {
            "name": req.name,
            "email": req.email.lower(),
            "password_hash": hash_password(req.password),
            "preferred_language": req.preferred_language or "Hindi",
            "state": req.state or "India",
            "is_verified": False,
            "verification_code": otp_code,
            "verification_expires_at": expires_at,
            "created_at": datetime.now(timezone.utc),
            "updated_at": datetime.now(timezone.utc)
        }
        await db.users.insert_one(user_doc)

    # Send verification email asynchronously
    email_sent = await send_verification_otp(req.email, req.name, otp_code)

    return {
        "success": True,
        "message": "Registration successful. A 6-digit verification code has been sent to your email.",
        "email_sent": email_sent
    }


@router.post("/verify-email")
async def verify_email(req: VerifyEmailRequest):
    db = get_database()
    user = await db.users.find_one({"email": req.email.lower()})

    if not user:
        raise HTTPException(status_code=404, detail="User not found")

    if user.get("is_verified"):
        return {"success": True, "message": "Email already verified."}

    stored_code = user.get("verification_code")
    expires_at = user.get("verification_expires_at")

    if not stored_code or stored_code != req.otp_code.strip():
        raise HTTPException(status_code=400, detail="Invalid verification code")

    if expires_at and datetime.now(timezone.utc) > expires_at.replace(tzinfo=timezone.utc):
        raise HTTPException(status_code=400, detail="Verification code has expired. Please request a new code.")

    # Mark user as verified
    await db.users.update_one(
        {"_id": user["_id"]},
        {
            "$set": {
                "is_verified": True,
                "verification_code": None,
                "verification_expires_at": None,
                "updated_at": datetime.now(timezone.utc)
            }
        }
    )

    token = create_access_token({"sub": user["email"]})
    return {
        "success": True,
        "message": "Email verified successfully!",
        "access_token": token,
        "user": {
            "id": str(user["_id"]),
            "name": user["name"],
            "email": user["email"],
            "preferred_language": user.get("preferred_language", "Hindi"),
            "state": user.get("state", "India")
        }
    }


@router.post("/resend-code")
async def resend_code(req: ResendCodeRequest):
    db = get_database()
    user = await db.users.find_one({"email": req.email.lower()})

    if not user:
        raise HTTPException(status_code=404, detail="User not found")

    if user.get("is_verified"):
        raise HTTPException(status_code=400, detail="Account is already verified.")

    otp_code = generate_otp()
    expires_at = datetime.now(timezone.utc) + timedelta(minutes=15)

    await db.users.update_one(
        {"_id": user["_id"]},
        {
            "$set": {
                "verification_code": otp_code,
                "verification_expires_at": expires_at
            }
        }
    )

    email_sent = await send_verification_otp(user["email"], user["name"], otp_code)
    return {
        "success": True,
        "message": "Verification code resent to your email.",
        "email_sent": email_sent
    }


@router.post("/login")
async def login(req: LoginRequest):
    db = get_database()
    user = await db.users.find_one({"email": req.email.lower()})

    if not user or not verify_password(req.password, user.get("password_hash", "")):
        raise HTTPException(status_code=401, detail="Invalid email or password")

    if not user.get("is_verified"):
        raise HTTPException(
            status_code=403, 
            detail="Email address not verified yet. Please verify your email first."
        )

    token = create_access_token({"sub": user["email"]})
    return {
        "success": True,
        "message": "Login successful",
        "access_token": token,
        "user": {
            "id": str(user["_id"]),
            "name": user["name"],
            "email": user["email"],
            "preferred_language": user.get("preferred_language", "Hindi"),
            "state": user.get("state", "India")
        }
    }


@router.post("/forgot-password")
async def forgot_password(req: ForgotPasswordRequest):
    db = get_database()
    user = await db.users.find_one({"email": req.email.lower()})

    if not user:
        # Don't reveal user existence for security
        return {
            "success": True, 
            "message": "If an account with that email exists, password reset instructions have been sent."
        }

    otp_code = generate_otp()
    expires_at = datetime.now(timezone.utc) + timedelta(minutes=15)

    await db.users.update_one(
        {"_id": user["_id"]},
        {
            "$set": {
                "reset_code": otp_code,
                "reset_expires_at": expires_at
            }
        }
    )

    email_sent = await send_password_reset_otp(user["email"], user["name"], otp_code)
    return {
        "success": True,
        "message": "Password reset code sent to your email.",
        "email_sent": email_sent
    }


@router.post("/reset-password")
async def reset_password(req: ResetPasswordRequest):
    db = get_database()
    user = await db.users.find_one({"email": req.email.lower()})

    if not user:
        raise HTTPException(status_code=404, detail="User not found")

    stored_code = user.get("reset_code")
    expires_at = user.get("reset_expires_at")

    if not stored_code or stored_code != req.otp_code.strip():
        raise HTTPException(status_code=400, detail="Invalid reset code")

    if expires_at and datetime.now(timezone.utc) > expires_at.replace(tzinfo=timezone.utc):
        raise HTTPException(status_code=400, detail="Reset code has expired. Please request a new code.")

    # Update password and clear reset code
    await db.users.update_one(
        {"_id": user["_id"]},
        {
            "$set": {
                "password_hash": hash_password(req.new_password),
                "reset_code": None,
                "reset_expires_at": None,
                "updated_at": datetime.now(timezone.utc)
            }
        }
    )

    return {
        "success": True,
        "message": "Password reset successful! You can now login with your new password."
    }


@router.get("/me")
async def get_me(current_user: dict = Depends(get_current_user)):
    return {
        "success": True,
        "user": current_user
    }
