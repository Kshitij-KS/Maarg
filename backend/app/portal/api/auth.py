"""Small JWT and password helpers for the Facility Portal."""

from __future__ import annotations

import base64
import hashlib
import hmac
import json
import os
from datetime import UTC, datetime, timedelta
from typing import Any
from uuid import uuid4

ACCESS_TOKEN_TTL_SECONDS = 60 * 60
REFRESH_TOKEN_TTL_SECONDS = 14 * 24 * 60 * 60
TOKEN_TTL_SECONDS = ACCESS_TOKEN_TTL_SECONDS


def _secret() -> bytes:
    return os.getenv("PORTAL_JWT_SECRET", "hacknation-demo-portal-secret").encode()


def _b64url(data: bytes) -> str:
    return base64.urlsafe_b64encode(data).rstrip(b"=").decode()


def _b64url_decode(data: str) -> bytes:
    padded = data + ("=" * (-len(data) % 4))
    return base64.urlsafe_b64decode(padded.encode())


def hash_password(password: str) -> str:
    salt = os.urandom(16)
    digest = hashlib.pbkdf2_hmac("sha256", password.encode(), salt, 310_000)
    return f"pbkdf2_sha256_v2${_b64url(salt)}${_b64url(digest)}"


def verify_password(password: str, password_hash: str) -> bool:
    try:
        algorithm, salt_b64, digest_b64 = password_hash.split("$", 2)
    except ValueError:
        return False
    iterations_by_algorithm = {"pbkdf2_sha256": 120_000, "pbkdf2_sha256_v2": 310_000}
    iterations = iterations_by_algorithm.get(algorithm)
    if iterations is None:
        return False
    salt = _b64url_decode(salt_b64)
    expected = _b64url_decode(digest_b64)
    actual = hashlib.pbkdf2_hmac("sha256", password.encode(), salt, iterations)
    return hmac.compare_digest(expected, actual)


def validate_password_policy(password: str) -> None:
    if len(password) < 12:
        raise ValueError("Password must be at least 12 characters.")
    checks = [
        any(char.islower() for char in password),
        any(char.isupper() for char in password),
        any(char.isdigit() for char in password),
        any(not char.isalnum() for char in password),
    ]
    if sum(checks) < 3:
        raise ValueError(
            "Password must include at least three of: lowercase, uppercase, number, symbol."
        )


def _create_token(
    *,
    user_id: str,
    organization_id: str,
    facility_id: str,
    role: str,
    session_id: str,
    token_use: str,
    expires_delta: timedelta,
) -> str:
    header = {"alg": "HS256", "typ": "JWT"}
    expires_at = datetime.now(UTC) + expires_delta
    payload = {
        "jti": str(uuid4()),
        "user_id": user_id,
        "organization_id": organization_id,
        "facility_id": facility_id,
        "role": role,
        "session_id": session_id,
        "token_use": token_use,
        "exp": int(expires_at.timestamp()),
    }
    signing_input = ".".join(
        [
            _b64url(json.dumps(header, separators=(",", ":")).encode()),
            _b64url(json.dumps(payload, separators=(",", ":")).encode()),
        ]
    )
    signature = hmac.new(_secret(), signing_input.encode(), hashlib.sha256).digest()
    return f"{signing_input}.{_b64url(signature)}"


def create_access_token(
    *,
    user_id: str,
    organization_id: str,
    facility_id: str,
    role: str,
    session_id: str,
    expires_delta: timedelta = timedelta(seconds=ACCESS_TOKEN_TTL_SECONDS),
) -> str:
    return _create_token(
        user_id=user_id,
        organization_id=organization_id,
        facility_id=facility_id,
        role=role,
        session_id=session_id,
        token_use="access",
        expires_delta=expires_delta,
    )


def create_refresh_token(
    *,
    user_id: str,
    organization_id: str,
    facility_id: str,
    role: str,
    session_id: str,
    expires_delta: timedelta = timedelta(seconds=REFRESH_TOKEN_TTL_SECONDS),
) -> str:
    return _create_token(
        user_id=user_id,
        organization_id=organization_id,
        facility_id=facility_id,
        role=role,
        session_id=session_id,
        token_use="refresh",
        expires_delta=expires_delta,
    )


def decode_access_token(token: str) -> dict[str, Any]:
    try:
        header_b64, payload_b64, signature_b64 = token.split(".", 2)
    except ValueError as exc:
        raise ValueError("Invalid token format.") from exc
    signing_input = f"{header_b64}.{payload_b64}"
    expected = hmac.new(_secret(), signing_input.encode(), hashlib.sha256).digest()
    actual = _b64url_decode(signature_b64)
    if not hmac.compare_digest(expected, actual):
        raise ValueError("Invalid token signature.")
    payload = json.loads(_b64url_decode(payload_b64))
    if int(payload.get("exp", 0)) < int(datetime.now(UTC).timestamp()):
        raise ValueError("Token has expired.")
    return payload


def admin_token() -> str:
    return os.getenv("PORTAL_ADMIN_TOKEN", "portal-demo-admin-token")
