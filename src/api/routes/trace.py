"""Trace endpoint for frontend narrative rendering."""

from __future__ import annotations

from fastapi import APIRouter

from src.api.adapters.mlflow_reader import get_trace
from src.api.presenters import trace_timeline
from src.api.schemas import TraceResponse, TraceTimelineResponse
from src.reasoning.tracing.mlflow_setup import traced

router = APIRouter(prefix="/api/trace", tags=["trace"])


@router.get("/{trace_id}", response_model=TraceResponse)
@traced("api.trace")
def trace(trace_id: str) -> TraceResponse:
    return get_trace(trace_id)


@router.get("/{trace_id}/timeline", response_model=TraceTimelineResponse)
@traced("api.trace_timeline")
def timeline(trace_id: str) -> TraceTimelineResponse:
    return trace_timeline(get_trace(trace_id))
