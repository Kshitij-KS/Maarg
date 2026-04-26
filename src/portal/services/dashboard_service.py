"""Facility-facing presentation helpers for Gold trust records."""

from __future__ import annotations

from src.portal.schemas.portal_schemas import (
    CapabilityDashboardRow,
    FacilityDashboardResponse,
    ImprovementSuggestion,
    UpdateRequest,
)
from src.shared.schemas import CapabilityClaim, FacilityTrustRecord

FLAG_LABELS = {
    "EQUIPMENT_CLAIM_MISMATCH": "Equipment proof needed",
    "LOW_CONFIDENCE": "Needs stronger evidence",
    "PEER_ANOMALY": "Unusual compared with similar facilities",
    "STAFFING_GAP": "Staffing evidence missing",
}


def labelize(value: str) -> str:
    return value.replace("_", " ").replace("-", " ").title()


def plain_flag(flag: str) -> str:
    return FLAG_LABELS.get(flag, labelize(flag))


def _capability_explanation(claim: CapabilityClaim) -> str:
    if claim.trust_score >= 0.75:
        return "Verified by the available record evidence."
    if claim.flags:
        return f"Our system found a concern: {', '.join(plain_flag(flag) for flag in claim.flags)}."
    if claim.claim_present:
        return "Claim present, but the supporting evidence is incomplete."
    return "No clear claim found in the source records."


def _status_label(score: float) -> str:
    if score >= 0.75:
        return "Verified"
    if score >= 0.45:
        return "Needs review"
    return "Evidence missing"


def capability_row(claim: CapabilityClaim) -> CapabilityDashboardRow:
    citation = claim.citations[0].sentence if claim.citations else None
    return CapabilityDashboardRow(
        capability=claim.capability,
        label=labelize(claim.capability),
        trust_score_percent=round(claim.trust_score * 100),
        claim_present=claim.claim_present,
        status_label=_status_label(claim.trust_score),
        explanation=_capability_explanation(claim),
        citation_sentence=citation,
        flags=claim.flags,
        plain_english_flags=[plain_flag(flag) for flag in claim.flags],
    )


def improvement_suggestions(record: FacilityTrustRecord) -> list[ImprovementSuggestion]:
    suggestions: list[ImprovementSuggestion] = []
    for claim in record.capabilities:
        if claim.trust_score >= 0.75 and not claim.flags:
            continue
        has_equipment_flag = any("EQUIPMENT" in flag for flag in claim.flags)
        field_name = "equipment" if has_equipment_flag else "capability"
        severity = "high" if claim.trust_score < 0.45 else "medium"
        suggestions.append(
            ImprovementSuggestion(
                severity=severity,
                title=f"Improve evidence for {labelize(claim.capability)}",
                description=(
                    f"{_capability_explanation(claim)} Submit a correction with supporting "
                    "documents or a location-tagged proof photo."
                ),
                field_name=field_name,
            )
        )
    if not suggestions:
        suggestions.append(
            ImprovementSuggestion(
                severity="low",
                title="Your current record is well supported",
                description="No urgent corrections are needed based on the available evidence.",
                field_name=None,
            )
        )
    return suggestions


def dashboard_response(
    record: FacilityTrustRecord,
    requests: list[UpdateRequest],
) -> FacilityDashboardResponse:
    return FacilityDashboardResponse(
        facility_id=record.facility_id,
        facility_name=record.facility_name,
        pin_code=record.pin_code,
        state=record.state,
        district=record.district,
        facility_type=record.facility_type,
        last_updated=record.last_updated,
        trust_score_percent=round(record.overall_trust_score * 100),
        capabilities=[capability_row(claim) for claim in record.capabilities],
        update_requests=requests,
        improvement_suggestions=improvement_suggestions(record),
    )
