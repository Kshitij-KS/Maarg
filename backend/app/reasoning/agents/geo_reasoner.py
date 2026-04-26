"""Geo-Reasoner agent: Gold table filtering by trust, capability, and distance."""

from __future__ import annotations

from dataclasses import dataclass
from math import asin, cos, radians, sin, sqrt

from app.reasoning.tracing.mlflow_setup import set_trace_attributes, traced
from app.shared.catalog import load_facility_trust
from app.shared.schemas import FacilityTrustRecord, QueryRequest

EARTH_RADIUS_KM = 6371.0088


@dataclass(frozen=True)
class CandidateDistance:
    facility: FacilityTrustRecord
    distance_km: float | None


def haversine_km(lat1: float, lon1: float, lat2: float, lon2: float) -> float:
    """Return great-circle distance between two lat/lon points in kilometers."""

    d_lat = radians(lat2 - lat1)
    d_lon = radians(lon2 - lon1)
    r_lat1 = radians(lat1)
    r_lat2 = radians(lat2)
    a = sin(d_lat / 2) ** 2 + cos(r_lat1) * cos(r_lat2) * sin(d_lon / 2) ** 2
    return 2 * EARTH_RADIUS_KM * asin(sqrt(a))


class GeoReasoner:
    """Filter `gold.facility_trust` into ranked candidates."""

    @traced("geo_reasoner.find_candidates")
    def find_candidates(self, request: QueryRequest) -> list[FacilityTrustRecord]:
        facilities = load_facility_trust()
        after_capability = [
            facility for facility in facilities if self._matches_capabilities(facility, request)
        ]
        after_trust = [
            facility
            for facility in after_capability
            if facility.overall_trust_score >= request.min_trust_score
        ]
        with_distance = [self._with_distance(facility, request) for facility in after_trust]
        after_distance = [
            item
            for item in with_distance
            if request.max_distance_km is None
            or item.distance_km is None
            or item.distance_km <= request.max_distance_km
        ]
        ranked = sorted(
            after_distance,
            key=lambda item: self._rank_key(item, request),
        )
        set_trace_attributes(
            {
                "n_input": len(facilities),
                "n_after_capability": len(after_capability),
                "n_after_trust": len(after_trust),
                "n_after_distance": len(after_distance),
                "top_k": request.top_k,
            }
        )
        return [item.facility for item in ranked[: request.top_k]]

    def _rank_key(
        self, item: CandidateDistance, request: QueryRequest
    ) -> tuple[float, float, float, float]:
        facility = item.facility
        capability_score = self._capability_score(facility, request)
        flag_penalty = sum(len(claim.flags) for claim in facility.capabilities) * 0.08
        uncertainty_penalty = self._average_interval_width(facility) * 0.05
        ranking_score = capability_score - flag_penalty - uncertainty_penalty
        distance = float("inf") if item.distance_km is None else item.distance_km
        return (-ranking_score, distance, -facility.overall_trust_score, flag_penalty)

    def _capability_score(self, facility: FacilityTrustRecord, request: QueryRequest) -> float:
        required = request.capabilities_filter or []
        if not required:
            return facility.overall_trust_score
        claims_by_name = {claim.capability: claim for claim in facility.capabilities}
        scores = [
            claims_by_name[capability].trust_score
            for capability in required
            if capability in claims_by_name
        ]
        return sum(scores) / len(scores) if scores else 0

    def _average_interval_width(self, facility: FacilityTrustRecord) -> float:
        if not facility.capabilities:
            return 1
        widths = [
            claim.confidence_interval_high - claim.confidence_interval_low
            for claim in facility.capabilities
        ]
        return sum(widths) / len(widths)

    def _matches_capabilities(self, facility: FacilityTrustRecord, request: QueryRequest) -> bool:
        required = request.capabilities_filter or []
        if not required:
            return True
        claims_by_name = {claim.capability: claim for claim in facility.capabilities}
        for capability in required:
            claim = claims_by_name.get(capability)
            claim_is_supported = (
                claim is not None
                and claim.claim_present
                and claim.trust_score >= request.min_trust_score
            )
            if not claim_is_supported:
                return False
        return True

    def _with_distance(
        self, facility: FacilityTrustRecord, request: QueryRequest
    ) -> CandidateDistance:
        if request.user_lat is None or request.user_lon is None:
            return CandidateDistance(facility=facility, distance_km=None)
        return CandidateDistance(
            facility=facility,
            distance_km=haversine_km(
                request.user_lat,
                request.user_lon,
                facility.lat,
                facility.lon,
            ),
        )
