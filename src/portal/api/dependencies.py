"""FastAPI dependencies for portal authentication."""

from __future__ import annotations

from typing import Annotated

from fastapi import Depends, Header, HTTPException
from fastapi.security import HTTPAuthorizationCredentials, HTTPBearer

from src.portal.api.auth import admin_token, decode_access_token
from src.portal.db.portal_tables import user_by_id
from src.portal.schemas.portal_schemas import PortalUser

bearer = HTTPBearer(auto_error=False)
BearerCredentials = Annotated[HTTPAuthorizationCredentials | None, Depends(bearer)]


def current_user(credentials: BearerCredentials) -> PortalUser:
    if credentials is None:
        raise HTTPException(status_code=401, detail="Missing bearer token.")
    try:
        payload = decode_access_token(credentials.credentials)
    except ValueError as exc:
        raise HTTPException(status_code=401, detail=str(exc)) from exc
    user = user_by_id(str(payload.get("user_id", "")))
    if user is None or not user.is_active:
        raise HTTPException(status_code=401, detail="Portal user not found or inactive.")
    return user


def require_admin(authorization: str | None = Header(default=None)) -> str:
    expected = f"Bearer {admin_token()}"
    if authorization != expected:
        raise HTTPException(status_code=401, detail="Invalid admin token.")
    return "portal_admin"
