"""Frontend-safe presenters over locked shared contract models."""

from __future__ import annotations

from collections import defaultdict
from collections.abc import Iterable

from app.api.schemas import (
    CriticIssue,
    CriticSummary,
    DesertGroupSummary,
    DesertPinSummary,
    DesertSummary,
    EvidenceSnippet,
    FacilityEvidenceResponse,
    SignalBreakdown,
    TraceResponse,
    TraceSpan,
    TraceTimelineNode,
    TraceTimelineResponse,
)
from app.shared.schemas import CapabilityClaim, FacilityTrustRecord, PinCodeDesert

CRITICAL_DESERT_THRESHOLD = 0.85
WIDE_INTERVAL_THRESHOLD = 0.35


def humanize_flag(flag: str) -> str:
    """Turn stable machine flags into calm, frontend-ready copy."""

    normalized = flag.strip().lower().replace("_", " ")
    if normalized == "missing anesthesiologist":
        return "Coherence violation: surgery claim, no anesthesiologist evidence."
    if normalized == "low confidence":
        return "Wide uncertainty: the extracted evidence is sparse or inconsistent."
    if normalized == "no c section":
        return "Capability gap: C-section support is not verified."
    return normalized.capitalize()


def signal_breakdown(claim: CapabilityClaim) -> SignalBreakdown:
    interval_width = claim.confidence_interval_high - claim.confidence_interval_low
    return SignalBreakdown(
        capability=claim.capability,
        claim_present=claim.claim_present,
        self_consistency_score=claim.self_consistency_score,
        coherence_score=claim.coherence_score,
        peer_anomaly_score=claim.peer_anomaly_score,
        inference_score=claim.inference_score,
        trust_score=claim.trust_score,
        confidence_interval_low=claim.confidence_interval_low,
        confidence_interval_high=claim.confidence_interval_high,
        confidence_interval_width=interval_width,
        inference_contradictions=(
            claim.inference_detail.contradictions if claim.inference_detail is not None else []
        ),
        flags=claim.flags,
        citation_count=len(claim.citations),
    )


def evidence_snippets(facility: FacilityTrustRecord) -> list[EvidenceSnippet]:
    snippets: list[EvidenceSnippet] = []
    for claim in facility.capabilities:
        for citation in claim.citations:
            snippets.append(
                EvidenceSnippet(
                    facility_id=facility.facility_id,
                    capability=claim.capability,
                    source_field=citation.source_field,
                    sentence=citation.sentence,
                    char_start=citation.char_start,
                    char_end=citation.char_end,
                    flags=claim.flags,
                )
            )
    return snippets


def facility_evidence(facility: FacilityTrustRecord) -> FacilityEvidenceResponse:
    flags = sorted({flag for claim in facility.capabilities for flag in claim.flags})
    flag_summary = "; ".join(humanize_flag(flag) for flag in flags) if flags else None
    if flags:
        audit_summary = f"{facility.facility_name} has {len(flags)} flagged trust issue(s)."
    else:
        audit_summary = f"{facility.facility_name} has cited evidence for rendered claims."
    return FacilityEvidenceResponse(
        facility_id=facility.facility_id,
        facility_name=facility.facility_name,
        pin_code=facility.pin_code,
        state=facility.state,
        district=facility.district,
        facility_type=facility.facility_type,
        overall_trust_score=facility.overall_trust_score,
        has_flags=bool(flags),
        flags=flags,
        flag_summary=flag_summary,
        signals=[signal_breakdown(claim) for claim in facility.capabilities],
        evidence=evidence_snippets(facility),
        audit_summary=audit_summary,
    )


def critic_summary(
    verdict: str, reasoning: str, candidates: Iterable[FacilityTrustRecord]
) -> CriticSummary:
    issues: list[CriticIssue] = []
    for facility in candidates:
        for claim in facility.capabilities:
            if claim.claim_present and not claim.citations:
                issues.append(
                    CriticIssue(
                        facility_id=facility.facility_id,
                        facility_name=facility.facility_name,
                        capability=claim.capability,
                        issue_type="missing_citation",
                        severity="critical",
                        message="Claim-present capability has no citation support.",
                    )
                )
            for flag in claim.flags:
                issues.append(
                    CriticIssue(
                        facility_id=facility.facility_id,
                        facility_name=facility.facility_name,
                        capability=claim.capability,
                        issue_type="flagged_claim",
                        severity="warn",
                        message=humanize_flag(flag),
                    )
                )
            interval_width = claim.confidence_interval_high - claim.confidence_interval_low
            if interval_width >= WIDE_INTERVAL_THRESHOLD:
                issues.append(
                    CriticIssue(
                        facility_id=facility.facility_id,
                        facility_name=facility.facility_name,
                        capability=claim.capability,
                        issue_type="wide_interval",
                        severity="info",
                        message=(
                            "Confidence interval is wide; present this as calibrated uncertainty."
                        ),
                    )
                )
    return CriticSummary(verdict=verdict, reasoning=reasoning, issues=issues)


def desert_summary(
    rows: list[PinCodeDesert],
    *,
    capability: str | None = None,
    state: str | None = None,
) -> DesertSummary:
    total_score = sum(row.desert_score for row in rows)
    critical = [row for row in rows if row.desert_score >= CRITICAL_DESERT_THRESHOLD]
    population_at_risk = sum(row.population or 0 for row in critical)

    top_deserts = [
        DesertPinSummary(
            pin_code=row.pin_code,
            state=row.state,
            district=row.district,
            capability=row.capability,
            population=row.population,
            desert_score=row.desert_score,
            nearest_verified_facility_id=row.nearest_verified_facility_id,
            distance_km=row.distance_km,
        )
        for row in sorted(rows, key=lambda item: item.desert_score, reverse=True)[:10]
    ]

    return DesertSummary(
        capability=capability,
        state=state,
        total_rows=len(rows),
        critical_pin_count=len(critical),
        population_at_risk=population_at_risk,
        average_desert_score=round(total_score / len(rows), 4) if rows else 0,
        top_deserts=top_deserts,
        by_state=_group_desert_rows(rows, key_name="state"),
        by_capability=_group_desert_rows(rows, key_name="capability"),
    )


def _group_desert_rows(rows: list[PinCodeDesert], *, key_name: str) -> list[DesertGroupSummary]:
    grouped: dict[str, list[PinCodeDesert]] = defaultdict(list)
    for row in rows:
        grouped[str(getattr(row, key_name))].append(row)

    summaries = []
    for key, items in grouped.items():
        critical = [row for row in items if row.desert_score >= CRITICAL_DESERT_THRESHOLD]
        summaries.append(
            DesertGroupSummary(
                key=key,
                row_count=len(items),
                critical_pin_count=len(critical),
                population_at_risk=sum(row.population or 0 for row in critical),
                average_desert_score=round(
                    sum(row.desert_score for row in items) / len(items), 4
                ),
            )
        )
    return sorted(summaries, key=lambda item: item.average_desert_score, reverse=True)


def trace_timeline(trace: TraceResponse) -> TraceTimelineResponse:
    return TraceTimelineResponse(
        trace_id=trace.trace_id,
        found=trace.found,
        nodes=[_timeline_node(index, span) for index, span in enumerate(trace.spans)],
    )


def _timeline_node(index: int, span: TraceSpan) -> TraceTimelineNode:
    latency = _latency_ms(span)
    status = _status(span)
    return TraceTimelineNode(
        id=f"node-{index + 1}",
        agent=_agent_name(span.name),
        label=span.name,
        status=status,
        latency_ms=latency,
        token_count=_token_count(span),
        summary=_summary(span, status),
        detail=None,
        attributes=span.attributes,
    )


def _latency_ms(span: TraceSpan) -> int | None:
    if span.start_time_ms is None or span.end_time_ms is None:
        return None
    return max(0, span.end_time_ms - span.start_time_ms)


def _token_count(span: TraceSpan) -> int | None:
    for key in ("token_count", "tokens", "total_tokens"):
        value = span.attributes.get(key)
        if isinstance(value, int):
            return value
    return None


def _status(span: TraceSpan) -> str:
    verdict = span.attributes.get("critic_verdict")
    if verdict in {"supported", "partial", "unsupported"}:
        return str(verdict)
    return "complete" if span.name else "unknown"


def _agent_name(span_name: str) -> str:
    if "coordinator" in span_name:
        return "Coordinator"
    if "geo_reasoner" in span_name:
        return "Geo-Reasoner"
    if "vector_client" in span_name:
        return "Evidence Retriever"
    if "critic" in span_name:
        return "Critic"
    if "pipeline" in span_name:
        return "Pipeline"
    if "api" in span_name:
        return "API"
    return "Trace"


def _summary(span: TraceSpan, status: str) -> str:
    if "coordinator" in span.name:
        return "Parsed query intent, filters, distance, and capability constraints."
    if "geo_reasoner" in span.name:
        count = span.attributes.get("n_after_distance") or span.attributes.get("candidate_count")
        return f"Ranked candidate facilities after trust and distance filters: {count}."
    if "vector_client" in span.name:
        return f"Retrieved cited evidence snippets: {span.attributes.get('citation_count', 0)}."
    if "critic" in span.name:
        return f"Reviewed answer support and returned verdict: {status}."
    return "Captured execution step for auditability."
