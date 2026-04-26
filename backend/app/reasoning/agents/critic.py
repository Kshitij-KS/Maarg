"""Critic agent: citation-grounding review of a candidate answer.

Hour 0-8 uses deterministic citation checks. The LLM grounding critic lands later
behind this same API surface.
"""

from __future__ import annotations

from typing import Literal

from app.reasoning.tracing.mlflow_setup import set_trace_attributes, traced
from app.shared.schemas import FacilityTrustRecord, QueryRequest

CriticVerdict = Literal["supported", "partial", "unsupported"]
WIDE_INTERVAL_THRESHOLD = 0.35


class Critic:
    """Check whether returned claims have citation support."""

    @traced("critic.verify")
    def verify(
        self, request: QueryRequest, candidates: list[FacilityTrustRecord]
    ) -> tuple[CriticVerdict, str]:
        if not candidates:
            set_trace_attributes({"critic_verdict": "unsupported", "candidate_count": 0})
            return "unsupported", "No candidate facilities were returned for this query."

        missing_citations: list[str] = []
        flagged_claims: list[str] = []
        wide_intervals: list[str] = []
        for facility in candidates:
            for claim in facility.capabilities:
                if claim.claim_present and not claim.citations:
                    missing_citations.append(f"{facility.facility_id}:{claim.capability}")
                if claim.flags:
                    flagged_claims.append(
                        f"{facility.facility_id}:{claim.capability} ({', '.join(claim.flags)})"
                    )
                interval_width = claim.confidence_interval_high - claim.confidence_interval_low
                if interval_width >= WIDE_INTERVAL_THRESHOLD:
                    wide_intervals.append(f"{facility.facility_id}:{claim.capability}")

        if missing_citations or flagged_claims:
            set_trace_attributes(
                {
                    "critic_verdict": "partial",
                    "candidate_count": len(candidates),
                    "missing_citation_count": len(missing_citations),
                    "flagged_claim_count": len(flagged_claims),
                    "wide_interval_count": len(wide_intervals),
                }
            )
            reasons = []
            if flagged_claims:
                reasons.append("flagged trust issues: " + "; ".join(flagged_claims[:5]))
            if missing_citations:
                reasons.append("missing citations: " + "; ".join(missing_citations[:5]))
            if wide_intervals:
                reasons.append("wide calibrated intervals: " + "; ".join(wide_intervals[:5]))
            return (
                "partial",
                "Candidate set is usable but needs evidence review because it includes "
                + " | ".join(reasons),
            )

        set_trace_attributes(
            {
                "critic_verdict": "supported",
                "candidate_count": len(candidates),
                "wide_interval_count": len(wide_intervals),
            }
        )
        if wide_intervals:
            return (
                "supported",
                "All returned claim-present capabilities include citations. "
                "Some confidence intervals are wide and should be rendered as "
                "calibrated uncertainty.",
            )
        return (
            "supported",
            "All returned claim-present capabilities include citations and no flags.",
        )
