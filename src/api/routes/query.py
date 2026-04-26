"""Query endpoint for the v2 API."""

from __future__ import annotations

from fastapi import APIRouter, Body

from src.reasoning.pipeline import ReasoningPipeline
from src.reasoning.tracing.mlflow_setup import set_trace_attributes, traced
from src.shared.schemas import QueryRequest, QueryResponse

router = APIRouter(prefix="/api", tags=["query"])
pipeline = ReasoningPipeline()
QUERY_BODY = Body(...)


@router.post("/query", response_model=QueryResponse)
@traced("api.query")
def query(request: QueryRequest = QUERY_BODY) -> QueryResponse:
    response = pipeline.answer_query(request)
    set_trace_attributes(
        {
            "candidate_count": len(response.candidates),
            "critic_verdict": response.critic_verdict,
        }
    )
    return response
