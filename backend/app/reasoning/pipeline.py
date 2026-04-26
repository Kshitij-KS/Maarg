"""Composable reasoning pipeline shared by API, smoke tests, and demo runner."""

from __future__ import annotations

from app.reasoning.agents.coordinator import Coordinator
from app.reasoning.agents.critic import Critic
from app.reasoning.agents.geo_reasoner import GeoReasoner
from app.reasoning.llm.agent import LLMReasoningAgent
from app.reasoning.retrieval.vector_client import VectorClient
from app.reasoning.tracing.mlflow_setup import current_trace_id, set_trace_attributes, traced
from app.shared.catalog import load_facility_trust, load_pin_desert
from app.shared.schemas import FacilityTrustRecord, PinCodeDesert, QueryRequest, QueryResponse


class ReasoningPipeline:
    """Single source of truth for answering requests over Gold records."""

    def __init__(
        self,
        coordinator: Coordinator | None = None,
        geo_reasoner: GeoReasoner | None = None,
        vector_client: VectorClient | None = None,
        critic: Critic | None = None,
        llm_agent: LLMReasoningAgent | None = None,
    ) -> None:
        self.coordinator = coordinator or Coordinator()
        self.geo_reasoner = geo_reasoner or GeoReasoner()
        self.vector_client = vector_client or VectorClient()
        self.critic = critic or Critic()
        self.llm_agent = llm_agent or LLMReasoningAgent()

    @traced("pipeline.answer_query")
    def answer_query(self, request: QueryRequest) -> QueryResponse:
        intent, routed = self.coordinator.route(
            request.text,
            user_lat=request.user_lat,
            user_lon=request.user_lon,
            max_distance_km=request.max_distance_km,
            min_trust_score=request.min_trust_score,
            capabilities_filter=request.capabilities_filter,
            top_k=request.top_k,
        )
        routed = self._llm_parse_or_fallback(routed)
        candidates = self.geo_reasoner.find_candidates(routed)
        citations = {
            candidate.facility_id: self.vector_client.citations_from_facility(
                candidate, routed.text
            )
            for candidate in candidates
        }
        verdict, reasoning = self.critic.verify(routed, candidates)
        verdict, reasoning = self._llm_explain_or_fallback(
            routed, candidates, verdict, reasoning
        )
        set_trace_attributes(
            {
                "intent": intent,
                "candidate_count": len(candidates),
                "critic_verdict": verdict,
            }
        )
        return QueryResponse(
            query=routed.text,
            candidates=candidates,
            citations_per_candidate=citations,
            critic_verdict=verdict,
            critic_reasoning=reasoning,
            trace_id=current_trace_id(),
        )

    def _llm_parse_or_fallback(self, request: QueryRequest) -> QueryRequest:
        try:
            return self.llm_agent.parse_query(request)
        except Exception as exc:
            set_trace_attributes(
                {"llm_parse_used": False, "llm_parse_fallback": type(exc).__name__}
            )
            return request

    def _llm_explain_or_fallback(
        self,
        request: QueryRequest,
        candidates: list[FacilityTrustRecord],
        verdict: str,
        reasoning: str,
    ) -> tuple[str, str]:
        try:
            return self.llm_agent.explain(request, candidates, verdict, reasoning)
        except Exception as exc:
            set_trace_attributes(
                {"llm_explain_used": False, "llm_explain_fallback": type(exc).__name__}
            )
            return verdict, reasoning

    @traced("pipeline.audit_facility")
    def audit_facility(self, facility_id: str) -> FacilityTrustRecord | None:
        facility = next(
            (record for record in load_facility_trust() if record.facility_id == facility_id),
            None,
        )
        set_trace_attributes({"facility_found": facility is not None})
        return facility

    @traced("pipeline.pin_desert")
    def pin_desert(self, pin_code: str) -> list[PinCodeDesert]:
        rows = [record for record in load_pin_desert() if record.pin_code == pin_code]
        set_trace_attributes({"pin_code": pin_code, "desert_row_count": len(rows)})
        return rows
