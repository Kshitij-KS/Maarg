"""Map-specific data endpoints."""

from __future__ import annotations

from fastapi import APIRouter, Query

from app.api.adapters.gold_reader import facilities
from app.reasoning.tracing.mlflow_setup import set_trace_attributes, traced
from app.shared.schemas import FacilityTrustRecord

router = APIRouter(prefix="/api/map", tags=["map"])


@router.get("/facilities", response_model=list[FacilityTrustRecord])
@traced("api.map_facilities")
def map_facilities(
    state: str | None = Query(default=None),
    capability: str | None = Query(default=None),
    limit: int = Query(default=10000, ge=1, le=10000),
) -> list[FacilityTrustRecord]:
    rows = facilities()
    if state is not None:
        rows = [row for row in rows if row.state.lower() == state.lower()]
    if capability is not None:
        rows = [
            row
            for row in rows
            if any(claim.capability == capability for claim in row.capabilities)
        ]
    limited = rows[:limit]
    set_trace_attributes(
        {
            "state": state,
            "capability": capability,
            "facility_row_count": len(limited),
            "facility_limit": limit,
        }
    )
    return limited
