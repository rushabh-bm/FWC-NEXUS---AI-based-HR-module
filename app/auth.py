import os
import time
from datetime import datetime, timedelta
from typing import Any, Dict

import jwt
from fastapi import HTTPException, status

# Secret key for JWT signing – in production use a strong secret from environment variables
SECRET_KEY = os.getenv("JWT_SECRET_KEY", "supersecretkey12345")
ALGORITHM = "HS256"
ACCESS_TOKEN_EXPIRE_MINUTES = int(os.getenv("ACCESS_TOKEN_EXPIRE_MINUTES", "15"))
REFRESH_TOKEN_EXPIRE_DAYS = int(os.getenv("REFRESH_TOKEN_EXPIRE_DAYS", "30"))


def _create_token(data: Dict[str, Any], expires_delta: timedelta) -> str:
    """Core token creation helper.
    Includes "exp" (expiration) claim and encodes using PyJWT.
    """
    to_encode = data.copy()
    expire = datetime.utcnow() + expires_delta
    to_encode.update({"exp": expire, "iat": datetime.utcnow()})
    return jwt.encode(to_encode, SECRET_KEY, algorithm=ALGORITHM)


def create_access_token(data: Dict[str, Any], expires_delta: timedelta | None = None) -> str:
    """Generate a short‑lived access token.
    ``data`` should contain at least a ``sub`` (subject / user id) field.
    """
    if expires_delta is None:
        expires_delta = timedelta(minutes=ACCESS_TOKEN_EXPIRE_MINUTES)
    return _create_token(data, expires_delta)


def create_refresh_token(data: Dict[str, Any], expires_delta: timedelta | None = None) -> str:
    """Generate a longer‑lived refresh token.
    ``data`` should contain at least a ``sub`` (subject / user id) field.
    """
    if expires_delta is None:
        expires_delta = timedelta(days=REFRESH_TOKEN_EXPIRE_DAYS)
    return _create_token(data, expires_delta)


def decode_token(token: str) -> Dict[str, Any]:
    """Decode a JWT and return its payload.
    Raises ``HTTPException`` with 401 status for any validation error.
    """
    try:
        payload = jwt.decode(token, SECRET_KEY, algorithms=[ALGORITHM])
        # jwt.decode already validates expiration; any error bubbles to except block.
        return payload
    except jwt.ExpiredSignatureError:
        raise HTTPException(
            status_code=status.HTTP_401_UNAUTHORIZED,
            detail="Token expired.",
            headers={"WWW-Authenticate": "Bearer"},
        )
    except jwt.InvalidTokenError:
        raise HTTPException(
            status_code=status.HTTP_401_UNAUTHORIZED,
            detail="Invalid token.",
            headers={"WWW-Authenticate": "Bearer"},
        )
