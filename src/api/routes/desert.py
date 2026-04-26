"""Medical desert endpoint."""

from __future__ import annotations

from fastapi import APIRouter, Query

from src.api.adapters.gold_reader import desert_rows
from src.api.presenters import desert_summary
from src.api.schemas import DesertSummary
from src.reasoning.tracing.mlflow_setup import set_trace_attributes, traced
from src.shared.schemas import PinCodeDesert

router = APIRouter(prefix="/api", tags=["desert"])


@router.get("/desert", response_model=list[PinCodeDesert])
@traced("api.desert")
def desert(
    capability: str | None = Query(default=None),
    state: str | None = Query(default=None),
    pin_code: str | None = Query(default=None),
) -> list[PinCodeDesert]:
    rows = desert_rows(capability=capability, state=state, pin_code=pin_code)
    set_trace_attributes(
        {
            "capability": capability,
            "state": state,
            "pin_code": pin_code,
            "desert_row_count": len(rows),
        }
    )
    return rows


@router.get("/desert/summary", response_model=DesertSummary)
@traced("api.desert_summary")
def summary(
    capability: str | None = Query(default=None),
    state: str | None = Query(default=None),
) -> DesertSummary:
    rows = desert_rows(capability=capability, state=state)
    set_trace_attributes(
        {
            "capability": capability,
            "state": state,
            "desert_row_count": len(rows),
        }
    )
    return desert_summary(rows, capability=capability, state=state)
