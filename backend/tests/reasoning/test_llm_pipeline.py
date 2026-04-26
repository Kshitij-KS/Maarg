from __future__ import annotations

from datetime import UTC, datetime
from typing import Literal

from app.reasoning.pipeline import ReasoningPipeline
from app.shared.schemas import Citation, FacilityTrustRecord, QueryRequest


class FakeCoordinator:
    def route(self, text: str, **overrides: object) -> tuple[Literal["search"], QueryRequest]:
        return (
            "search",
            QueryRequest(
                text=text,
                min_trust_score=float(overrides.get("min_trust_score", 0.5)),
                top_k=int(overrides.get("top_k", 10)),
            ),
        )


class FakeGeoReasoner:
    def __init__(self) -> None:
        self.last_request: QueryRequest | None = None

    def find_candidates(self, request: QueryRequest) -> list[FacilityTrustRecord]:
        self.last_request = request
        return [_facility()]


class FakeVectorClient:
    def citations_for(self, facility_id: str, query: str) -> list[Citation]:
        return []


class FakeCritic:
    def verify(
        self, request: QueryRequest, candidates: list[FacilityTrustRecord]
    ) -> tuple[Literal["supported"], str]:
        return "supported", "Deterministic fallback reasoning."


class SuccessfulLLMAgent:
    def parse_query(self, request: QueryRequest) -> QueryRequest:
        return request.model_copy(
            update={"capabilities_filter": ["dialysis"], "top_k": 3}
        )

    def explain(
        self,
        request: QueryRequest,
        candidates: list[FacilityTrustRecord],
        deterministic_verdict: str,
        deterministic_reasoning: str,
    ) -> tuple[Literal["partial"], str]:
        return "partial", "LLM explanation grounded in Truth Layer evidence."


class FailingLLMAgent:
    def parse_query(self, request: QueryRequest) -> QueryRequest:
        raise RuntimeError("LLM offline")

    def explain(
        self,
        request: QueryRequest,
        candidates: list[FacilityTrustRecord],
        deterministic_verdict: str,
        deterministic_reasoning: str,
    ) -> tuple[Literal["partial"], str]:
        raise RuntimeError("LLM offline")


def test_pipeline_uses_llm_for_query_parsing_and_reasoning_when_available() -> None:
    geo_reasoner = FakeGeoReasoner()
    pipeline = ReasoningPipeline(
        coordinator=FakeCoordinator(),  # type: ignore[arg-type]
        geo_reasoner=geo_reasoner,  # type: ignore[arg-type]
        vector_client=FakeVectorClient(),  # type: ignore[arg-type]
        critic=FakeCritic(),  # type: ignore[arg-type]
        llm_agent=SuccessfulLLMAgent(),  # type: ignore[arg-type]
    )

    response = pipeline.answer_query(QueryRequest(text="find kidney care", top_k=10))

    assert geo_reasoner.last_request is not None
    assert geo_reasoner.last_request.capabilities_filter == ["dialysis"]
    assert geo_reasoner.last_request.top_k == 3
    assert response.critic_verdict == "partial"
    assert response.critic_reasoning == "LLM explanation grounded in Truth Layer evidence."


def test_pipeline_falls_back_when_llm_agent_fails() -> None:
    geo_reasoner = FakeGeoReasoner()
    pipeline = ReasoningPipeline(
        coordinator=FakeCoordinator(),  # type: ignore[arg-type]
        geo_reasoner=geo_reasoner,  # type: ignore[arg-type]
        vector_client=FakeVectorClient(),  # type: ignore[arg-type]
        critic=FakeCritic(),  # type: ignore[arg-type]
        llm_agent=FailingLLMAgent(),  # type: ignore[arg-type]
    )

    response = pipeline.answer_query(QueryRequest(text="find care", top_k=10))

    assert geo_reasoner.last_request is not None
    assert geo_reasoner.last_request.capabilities_filter is None
    assert geo_reasoner.last_request.top_k == 10
    assert response.critic_verdict == "supported"
    assert response.critic_reasoning == "Deterministic fallback reasoning."


def _facility() -> FacilityTrustRecord:
    return FacilityTrustRecord(
        facility_id="F00001",
        facility_name="Madhepura District Hospital",
        pin_code="852113",
        state="Bihar",
        district="Madhepura",
        lat=25.921,
        lon=86.792,
        facility_type="District Hospital",
        normalization_version="normalizer_v1",
        capabilities=[],
        overall_trust_score=0.9,
        extraction_run_ids=["mock-run-001"],
        last_updated=datetime(2026, 4, 26, tzinfo=UTC),
    )
