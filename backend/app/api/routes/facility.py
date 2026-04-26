"""Facility drill-in endpoint."""

from __future__ import annotations

from fastapi import APIRouter, HTTPException

from app.api.adapters.gold_reader import facility_by_id
from app.api.presenters import facility_evidence
from app.api.schemas import FacilityEvidenceResponse
from app.reasoning.tracing.mlflow_setup import set_trace_attributes, traced
from app.shared.schemas import FacilityTrustRecord

router = APIRouter(prefix="/api/facility", tags=["facility"])


@router.get("/{facility_id}", response_model=FacilityTrustRecord)
@traced("api.facility")
def facility(facility_id: str) -> FacilityTrustRecord:
    record = facility_by_id(facility_id)
    set_trace_attributes({"facility_found": record is not None})
    if record is None:
        raise HTTPException(status_code=404, detail=f"Facility not found: {facility_id}")
    return record


@router.get("/{facility_id}/evidence", response_model=FacilityEvidenceResponse)
@traced("api.facility_evidence")
def evidence(facility_id: str) -> FacilityEvidenceResponse:
    record = facility_by_id(facility_id)
    set_trace_attributes({"facility_found": record is not None})
    if record is None:
        raise HTTPException(status_code=404, detail=f"Facility not found: {facility_id}")
    return facility_evidence(record)
