"""
auth.py – Authentication utilities: JWT (PyJWT/HS256), argon2 password hashing,
          Google ID token verification, and signed media URL helpers.
"""

import hashlib
import hmac
import os
import time
from pathlib import Path
from typing import Optional

import jwt
from argon2 import PasswordHasher
from argon2.exceptions import VerifyMismatchError, VerificationError, InvalidHashError
from google.auth.transport import requests as google_requests
from google.oauth2 import id_token as google_id_token

# ── Secrets (must be set in backend/.env) ─────────────────────────────────────
JWT_SECRET = os.environ.get("JWT_SECRET_KEY", "")
JWT_ALGORITHM = "HS256"
JWT_EXPIRY_SECONDS = 7 * 24 * 3600  # 7 days

MEDIA_SIGNING_SECRET = os.environ.get("MEDIA_SIGNING_SECRET", "")
MEDIA_LINK_EXPIRY_SECONDS = 3600  # 1 hour

GOOGLE_CLIENT_ID = os.environ.get("GOOGLE_CLIENT_ID", "")

# ── Argon2 password hasher (memory-conservative defaults for dev) ──────────────
_ph = PasswordHasher()


def hash_password(plain: str) -> str:
    return _ph.hash(plain)


def verify_password(plain: str, hashed: str) -> bool:
    """Returns True if password matches; False on any verification failure."""
    try:
        return _ph.verify(hashed, plain)
    except (VerifyMismatchError, VerificationError, InvalidHashError):
        return False


# ── JWT ────────────────────────────────────────────────────────────────────────

def create_access_token(user_id: str) -> str:
    if not JWT_SECRET:
        raise RuntimeError("JWT_SECRET_KEY is not configured in backend/.env")
    payload = {
        "sub": user_id,
        "iat": int(time.time()),
        "exp": int(time.time()) + JWT_EXPIRY_SECONDS,
    }
    return jwt.encode(payload, JWT_SECRET, algorithm=JWT_ALGORITHM)


def decode_access_token(token: str) -> Optional[str]:
    """
    Decodes and validates a JWT. Returns the user_id (sub) on success.
    Returns None on any failure (expired, invalid signature, missing sub).
    """
    if not JWT_SECRET:
        return None
    try:
        payload = jwt.decode(token, JWT_SECRET, algorithms=[JWT_ALGORITHM])
        return payload.get("sub")
    except jwt.PyJWTError:
        return None


# ── Google ID token verification ───────────────────────────────────────────────

def verify_google_id_token(id_token_str: str) -> Optional[dict]:
    """
    Verifies a Google ID token server-side.
    Returns the claims dict (sub, email, email_verified, name) on success.
    Returns None if verification fails or email_verified is not True.
    """
    if not GOOGLE_CLIENT_ID:
        raise RuntimeError("GOOGLE_CLIENT_ID is not configured in backend/.env")
    try:
        claims = google_id_token.verify_oauth2_token(
            id_token_str,
            google_requests.Request(),
            GOOGLE_CLIENT_ID,
        )
        if not claims.get("email_verified"):
            return None
        return claims
    except Exception:
        return None


# ── Signed media URLs ──────────────────────────────────────────────────────────

def sign_media_url(invitation_id: str, filename: str) -> str:
    """
    Returns a URL path like /api/media/{id}/{file}?exp=<ts>&sig=<hmac>
    The sig covers invitation_id + filename + exp, using MEDIA_SIGNING_SECRET.
    """
    if not MEDIA_SIGNING_SECRET:
        raise RuntimeError("MEDIA_SIGNING_SECRET is not configured in backend/.env")
    exp = int(time.time()) + MEDIA_LINK_EXPIRY_SECONDS
    sig = _compute_media_sig(invitation_id, filename, exp)
    return f"/api/media/{invitation_id}/{filename}?exp={exp}&sig={sig}"


def verify_media_signature(invitation_id: str, filename: str, exp: str, sig: str) -> bool:
    """
    Returns True if the HMAC is valid and not expired.
    Returns False on any failure (expired, bad sig, missing secret).
    """
    if not MEDIA_SIGNING_SECRET:
        return False
    try:
        exp_int = int(exp)
    except (ValueError, TypeError):
        return False
    if int(time.time()) > exp_int:
        return False
    expected = _compute_media_sig(invitation_id, filename, exp_int)
    return hmac.compare_digest(expected, sig)


def _compute_media_sig(invitation_id: str, filename: str, exp: int) -> str:
    msg = f"{invitation_id}:{filename}:{exp}".encode()
    return hmac.new(MEDIA_SIGNING_SECRET.encode(), msg, hashlib.sha256).hexdigest()
