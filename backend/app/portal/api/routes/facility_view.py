"""Facility-owned dashboard routes."""

from __future__ import annotations

from typing import Annotated

from fastapi import APIRouter, Depends, HTTPException

from app.portal.api.dependencies import current_user
from app.portal.db.gold_reader import facility_by_id
from app.portal.db.portal_tables import update_requests
from app.portal.schemas.portal_schemas import FacilityDashboardResponse, PortalUser
from app.portal.services.dashboard_service import dashboard_response

router = APIRouter()
CurrentPortalUser = Annotated[PortalUser, Depends(current_user)]


@router.get("/facility/me", response_model=FacilityDashboardResponse)
def facility_me(user: CurrentPortalUser) -> FacilityDashboardResponse:
    record = facility_by_id(user.facility_id)
    if record is None:
        raise HTTPException(status_code=404, detail="Linked Gold facility not found.")
    own_requests = [
        request for request in update_requests() if request.facility_id == user.facility_id
    ]
    return dashboard_response(record, own_requests)


@router.get("/facility/me/score", response_model=FacilityDashboardResponse)
def facility_score(user: CurrentPortalUser) -> FacilityDashboardResponse:
    return facility_me(user)
