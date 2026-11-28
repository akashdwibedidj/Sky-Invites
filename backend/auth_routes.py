"""
auth_routes.py – FastAPI router for /api/auth/* endpoints.
POST /api/auth/signup
POST /api/auth/login
POST /api/auth/google
GET  /api/auth/me
"""

import os
from typing import Optional

from fastapi import APIRouter, Depends, HTTPException, Request, status
from fastapi.security import HTTPAuthorizationCredentials, HTTPBearer
from pydantic import BaseModel
from slowapi import Limiter
from slowapi.util import get_remote_address

_limiter = Limiter(key_func=get_remote_address, enabled=False)

from auth import (
    create_access_token,
    decode_access_token,
    hash_password,
    verify_google_id_token,
    verify_password,
)
from config import PASSWORD_MAX_LENGTH, PASSWORD_MIN_LENGTH, RATE_LIMIT_GOOGLE_AUTH
from db import User, get_session

router = APIRouter(prefix="/api/auth", tags=["auth"])
_bearer = HTTPBearer(auto_error=False)

# ── Request / Response models ──────────────────────────────────────────────────

class SignupRequest(BaseModel):
    name: str
    email: str
    password: str
    accountType: Optional[str] = "individual"


class LoginRequest(BaseModel):
    email: str
    password: str


class GoogleAuthRequest(BaseModel):
    idToken: Optional[str] = None


class UserOut(BaseModel):
    id: str
    name: str
    email: str
    accountType: Optional[str] = None


class AuthResponse(BaseModel):
    access_token: str
    token_type: str = "bearer"
    user: UserOut


# ── Shared invalid-creds error (never reveals whether email exists) ────────────
_INVALID_CREDS = HTTPException(
    status_code=status.HTTP_401_UNAUTHORIZED,
    detail="Invalid email or password.",
)


# ── Auth dependency (get current user from Bearer token) ──────────────────────

def get_current_user(
    credentials: Optional[HTTPAuthorizationCredentials] = Depends(_bearer),
) -> "User":
    if not credentials:
        raise HTTPException(status_code=status.HTTP_401_UNAUTHORIZED, detail="Not authenticated")
    user_id = decode_access_token(credentials.credentials)
    if not user_id:
        raise HTTPException(status_code=status.HTTP_401_UNAUTHORIZED, detail="Not authenticated")
    with get_session() as session:
        user = session.query(User).filter(User.id == user_id).first()
        if not user:
            raise HTTPException(status_code=status.HTTP_401_UNAUTHORIZED, detail="Not authenticated")
        # Detach from session so it's usable after the context manager exits
        session.expunge(user)
        return user


def _user_out(user: "User") -> UserOut:
    return UserOut(
        id=user.id,
        name=user.name,
        email=user.email,
        accountType=user.account_type,
    )


def _auth_response(user: "User") -> AuthResponse:
    from credits import grant_free_tier_credits
    grant_free_tier_credits(user.id)
    token = create_access_token(user.id)
    return AuthResponse(access_token=token, user=_user_out(user))


# ── Endpoints ──────────────────────────────────────────────────────────────────

@router.post("/signup", response_model=AuthResponse)
@_limiter.limit("5/minute")
def signup(request: Request, req: SignupRequest):
    email = req.email.strip().lower()
    name = req.name.strip()
    account_type = req.accountType or "individual"
    if account_type not in ("individual", "business"):
        account_type = "individual"

    if not email or not name or not req.password:
        raise HTTPException(status_code=422, detail="Name, email, and password are required.")
    if len(req.password) < PASSWORD_MIN_LENGTH or len(req.password) > PASSWORD_MAX_LENGTH:
        raise HTTPException(
            status_code=422,
            detail=f"Password must be between {PASSWORD_MIN_LENGTH} and {PASSWORD_MAX_LENGTH} characters.",
        )

    with get_session() as session:
        existing = session.query(User).filter(User.email == email).first()
        if existing:
            # Generic message — don't reveal the email is taken
            raise HTTPException(
                status_code=422,
                detail="Could not create account. Please check your details and try again.",
            )
        import uuid
        user = User(
            id=str(uuid.uuid4()),
            email=email,
            name=name,
            password_hash=hash_password(req.password),
            account_type=account_type,
        )
        session.add(user)
        session.flush()
        session.expunge(user)

    return _auth_response(user)


@router.post("/login", response_model=AuthResponse)
@_limiter.limit("10/minute")
def login(request: Request, req: LoginRequest):
    email = req.email.strip().lower()
    with get_session() as session:
        user = session.query(User).filter(User.email == email).first()
        if not user:
            # Constant-time dummy check to avoid timing attacks
            verify_password("__dummy__", "$argon2id$v=19$m=65536,t=3,p=4$dummysalt1234$dummyhash1234")
            raise _INVALID_CREDS
        if not user.password_hash or not verify_password(req.password, user.password_hash):
            raise _INVALID_CREDS
        session.expunge(user)

    return _auth_response(user)


@router.post("/google", response_model=AuthResponse)
@_limiter.limit(RATE_LIMIT_GOOGLE_AUTH)
def google_login(request: Request, req: GoogleAuthRequest):
    if not req.idToken:
        raise HTTPException(status_code=422, detail="idToken is required.")

    claims = verify_google_id_token(req.idToken)
    if not claims:
        raise HTTPException(
            status_code=401,
            detail="Google sign-in failed. Please try again.",
        )

    google_id = claims["sub"]
    email = claims.get("email", "").strip().lower()
    name = claims.get("name", email.split("@")[0])

    import uuid
    with get_session() as session:
        # 1. Existing account with same google_id
        user = session.query(User).filter(User.google_id == google_id).first()
        if user:
            session.expunge(user)
            return _auth_response(user)

        # 2. Existing email/password account → link Google, clear password
        user = session.query(User).filter(User.email == email).first()
        if user:
            user.google_id = google_id
            user.password_hash = None  # per spec: clear password on link
            session.flush()
            session.expunge(user)
            return _auth_response(user)

        # 3. New user
        user = User(
            id=str(uuid.uuid4()),
            email=email,
            name=name,
            google_id=google_id,
            password_hash=None,
            account_type="individual",
        )
        session.add(user)
        session.flush()
        session.expunge(user)

    return _auth_response(user)


@router.get("/me", response_model=UserOut)
def get_me(current_user: "User" = Depends(get_current_user)):
    return _user_out(current_user)
