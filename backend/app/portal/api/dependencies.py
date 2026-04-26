"""FastAPI dependencies for portal authentication."""

from __future__ import annotations

from datetime import UTC, datetime
from typing import Annotated

from fastapi import Depends, Header, HTTPException
from fastapi.security import HTTPAuthorizationCredentials, HTTPBearer

from app.portal.api.auth import admin_token, decode_access_token
from app.portal.db.portal_tables import organization_by_id, session_by_id, user_by_id
from app.portal.schemas.portal_schemas import PortalUser

bearer = HTTPBearer(auto_error=False)
BearerCredentials = Annotated[HTTPAuthorizationCredentials | None, Depends(bearer)]


def current_user(credentials: BearerCredentials) -> PortalUser:
    if credentials is None:
        raise HTTPException(status_code=401, detail="Missing bearer token.")
    try:
        payload = decode_access_token(credentials.credentials)
    except ValueError as exc:
        raise HTTPException(status_code=401, detail=str(exc)) from exc
    if payload.get("token_use") != "access":
        raise HTTPException(status_code=401, detail="Access token required.")
    session = session_by_id(str(payload.get("session_id", "")))
    if session is None or session.status != "active":
        raise HTTPException(status_code=401, detail="Portal session is not active.")
    if session.expires_at < datetime.now(UTC):
        raise HTTPException(status_code=401, detail="Portal session has expired.")
    user = user_by_id(str(payload.get("user_id", "")))
    if user is None or not user.is_active:
        raise HTTPException(status_code=401, detail="Portal user not found or inactive.")
    if user.organization_id and organization_by_id(user.organization_id) is None:
        raise HTTPException(status_code=401, detail="Organization not found.")
    return user


def require_org_editor(user: Annotated[PortalUser, Depends(current_user)]) -> PortalUser:
    if user.role not in {"org_owner", "org_admin", "org_editor", "facility_admin"}:
        raise HTTPException(status_code=403, detail="Organization editor role required.")
    return user


def require_admin(authorization: str | None = Header(default=None)) -> str:
    expected = f"Bearer {admin_token()}"
    if authorization != expected:
        raise HTTPException(status_code=401, detail="Invalid admin token.")
    return "portal_admin"
