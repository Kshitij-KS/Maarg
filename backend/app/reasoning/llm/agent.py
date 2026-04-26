"""LLM-assisted query parsing and critic prose over deterministic Truth data."""

from __future__ import annotations

import json
from typing import Any, Literal

from app.reasoning.llm.client import OpenAIJSONClient
from app.reasoning.tracing.mlflow_setup import set_trace_attributes, traced
from app.shared.constants import CAPABILITY_TAXONOMY
from app.shared.schemas import FacilityTrustRecord, QueryRequest

CriticVerdict = Literal["supported", "partial", "unsupported"]
VALID_VERDICTS: set[str] = {"supported", "partial", "unsupported"}
VALID_CAPABILITIES = set(CAPABILITY_TAXONOMY)


class LLMReasoningAgent:
    """Optional LLM layer that cannot override deterministic facility records."""

    def __init__(self, client: OpenAIJSONClient | None = None) -> None:
        self.client = client or OpenAIJSONClient()

    @traced("llm.parse_query")
    def parse_query(self, request: QueryRequest) -> QueryRequest:
        payload = self.client.complete_json(
            system=(
                "You convert healthcare search text into strict JSON filters. "
                "Return only fields relevant to QueryRequest. Use capability names "
                f"only from this list: {', '.join(CAPABILITY_TAXONOMY)}."
            ),
            user=json.dumps(
                {
                    "query": request.text,
                    "current_request": request.model_dump(mode="json"),
                    "output_schema": {
                        "capabilities_filter": ["capability_name"],
                        "max_distance_km": "number|null",
                        "min_trust_score": "number|null",
                        "top_k": "integer|null",
                        "user_lat": "number|null",
                        "user_lon": "number|null",
                    },
                }
            ),
        )
        updated = request.model_copy(update=self._parse_updates(payload, request))
        set_trace_attributes(
            {
                "llm_parse_used": True,
                "llm_capability_count": len(updated.capabilities_filter or []),
            }
        )
        return updated

    @traced("llm.explain")
    def explain(
        self,
        request: QueryRequest,
        candidates: list[FacilityTrustRecord],
        deterministic_verdict: str,
        deterministic_reasoning: str,
    ) -> tuple[CriticVerdict, str]:
        payload = self.client.complete_json(
            system=(
                "You are the Maarg healthcare trust critic. Explain the already "
                "computed Truth Layer results for judges. You must stay grounded in "
                "the supplied candidates, flags, scores, citations, and deterministic "
                "verdict. Do not invent facilities or capabilities."
            ),
            user=json.dumps(
                {
                    "query_request": request.model_dump(mode="json"),
                    "deterministic_verdict": deterministic_verdict,
                    "deterministic_reasoning": deterministic_reasoning,
                    "candidates": [self._candidate_summary(candidate) for candidate in candidates],
                    "output_schema": {
                        "verdict": "supported|partial|unsupported",
                        "reasoning": "short judge-friendly explanation",
                    },
                }
            ),
        )
        verdict = str(payload.get("verdict", deterministic_verdict))
        if verdict not in VALID_VERDICTS:
            verdict = deterministic_verdict
        reasoning = str(payload.get("reasoning") or deterministic_reasoning).strip()
        set_trace_attributes({"llm_explain_used": True, "llm_verdict": verdict})
        return verdict, reasoning or deterministic_reasoning  # type: ignore[return-value]

    def _parse_updates(self, payload: dict[str, Any], request: QueryRequest) -> dict[str, Any]:
        updates: dict[str, Any] = {}
        capabilities = self._capabilities(payload.get("capabilities_filter"))
        if capabilities:
            updates["capabilities_filter"] = capabilities
        for field in ("max_distance_km", "min_trust_score", "user_lat", "user_lon"):
            value = payload.get(field)
            if isinstance(value, int | float):
                updates[field] = float(value)
        top_k = payload.get("top_k")
        if isinstance(top_k, int) and 0 < top_k <= 25:
            updates["top_k"] = top_k
        if request.capabilities_filter and not capabilities:
            updates["capabilities_filter"] = request.capabilities_filter
        return updates

    def _capabilities(self, value: object) -> list[str]:
        if not isinstance(value, list):
            return []
        capabilities = [str(item) for item in value if str(item) in VALID_CAPABILITIES]
        return sorted(set(capabilities))

    def _candidate_summary(self, candidate: FacilityTrustRecord) -> dict[str, Any]:
        return {
            "facility_id": candidate.facility_id,
            "facility_name": candidate.facility_name,
            "district": candidate.district,
            "state": candidate.state,
            "overall_trust_score": candidate.overall_trust_score,
            "capabilities": [
                {
                    "capability": claim.capability,
                    "claim_present": claim.claim_present,
                    "trust_score": claim.trust_score,
                    "inference_score": claim.inference_score,
                    "flags": claim.flags,
                    "contradictions": (
                        claim.inference_detail.contradictions
                        if claim.inference_detail is not None
                        else []
                    ),
                    "citation_count": len(claim.citations),
                    "sample_citation": claim.citations[0].sentence if claim.citations else None,
                }
                for claim in candidate.capabilities
            ],
        }
