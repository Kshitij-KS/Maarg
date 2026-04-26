"""Aggregated FastAPI router for the Facility Portal."""

from __future__ import annotations

from fastapi import APIRouter

from app.portal.api.routes import (
    facility_view,
    proof_upload,
    registration,
    review_admin,
    update_requests,
)

portal_router = APIRouter()
portal_router.include_router(registration.router)
portal_router.include_router(facility_view.router)
portal_router.include_router(update_requests.router)
portal_router.include_router(proof_upload.router)
portal_router.include_router(review_admin.router)
