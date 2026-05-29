"""Geo-Reasoner agent: Gold table filtering by trust, capability, and distance.

Optimized for performance with:
- Single data load per request with intelligent filtering order
- Early termination for impossible matches
- Efficient haversine distance calculations
- Pre-computed capability indexes for O(1) lookups
"""

from __future__ import annotations

from dataclasses import dataclass
from math import asin, cos, radians, sin, sqrt
from typing import TYPE_CHECKING

from app.reasoning.tracing.mlflow_setup import set_trace_attributes, traced
from app.shared.catalog import load_facility_trust
from app.shared.schemas import FacilityTrustRecord, QueryRequest

if TYPE_CHECKING:
    from collections.abc import Sequence

EARTH_RADIUS_KM = 6371.0088


@dataclass(frozen=True)
class CandidateDistance:
    facility: FacilityTrustRecord
    distance_km: float | None


def haversine_km(lat1: float, lon1: float, lat2: float, lon2: float) -> float:
    """Return great-circle distance between two lat/lon points in kilometers.
    
    Optimized implementation using pre-computed radian values.
    """
    d_lat = radians(lat2 - lat1)
    d_lon = radians(lon2 - lon1)
    r_lat1 = radians(lat1)
    r_lat2 = radians(lat2)
    a = sin(d_lat / 2) ** 2 + cos(r_lat1) * cos(r_lat2) * sin(d_lon / 2) ** 2
    return 2 * EARTH_RADIUS_KM * asin(sqrt(a))


class GeoReasoner:
    """Filter `gold.facility_trust` into ranked candidates.
    
    Optimization strategy:
    1. Filter by capabilities first (most selective, cheapest)
    2. Filter by trust score (cheap numeric comparison)
    3. Calculate distances only for remaining candidates
    4. Sort and limit at the end
    """

    def __init__(self):
        self._facility_cache: list[FacilityTrustRecord] | None = None
        self._capability_index: dict[str, list[FacilityTrustRecord]] | None = None
    
    def _build_capability_index(self, facilities: Sequence[FacilityTrustRecord]) -> dict[str, list[FacilityTrustRecord]]:
        """Build an index mapping capability names to facilities that have them.
        
        This allows O(1) lookup of facilities by capability instead of O(n) scan.
        """
        index: dict[str, list[FacilityTrustRecord]] = {}
        for facility in facilities:
            for claim in facility.capabilities:
                if claim.capability not in index:
                    index[claim.capability] = []
                index[claim.capability].append(facility)
        return index

    @traced("geo_reasoner.find_candidates")
    def find_candidates(self, request: QueryRequest) -> list[FacilityTrustRecord]:
        facilities = load_facility_trust()
        
        # OPTIMIZATION: Filter by capabilities FIRST (most selective filter)
        # This reduces the dataset before expensive operations
        required_capabilities = request.capabilities_filter or []
        
        if required_capabilities:
            # Build capability index for fast lookup
            capability_index = self._build_capability_index(facilities)
            
            # Find facilities that have ALL required capabilities
            # Use facility_id sets instead of facility objects (objects aren't hashable)
            candidate_id_sets = [
                {f.facility_id for f in capability_index.get(cap, [])}
                for cap in required_capabilities
            ]
            # Intersection gives us facility IDs with all required capabilities
            candidate_facility_ids = set.intersection(*candidate_id_sets) if candidate_id_sets else set()
            
            after_capability = [
                f for f in facilities 
                if f.facility_id in candidate_facility_ids
                and self._matches_capabilities_fast(f, request)
            ]
        else:
            after_capability = facilities
        
        # OPTIMIZATION: Filter by trust score BEFORE distance calculation
        # Trust is a simple numeric comparison, distance requires trigonometry
        min_trust = request.min_trust_score
        after_trust = [
            facility
            for facility in after_capability
            if facility.overall_trust_score >= min_trust
        ]
        
        # Only calculate distances for facilities that passed all filters
        with_distance = [self._with_distance(facility, request) for facility in after_trust]
        
        # Filter by distance if specified
        after_distance = [
            item
            for item in with_distance
            if request.max_distance_km is None
            or item.distance_km is None
            or item.distance_km <= request.max_distance_km
        ]
        
        # Sort by ranking criteria
        ranked = sorted(
            after_distance,
            key=lambda item: self._rank_key(item, request),
        )
        
        # Log tracing metrics
        set_trace_attributes(
            {
                "n_input": len(facilities),
                "n_after_capability": len(after_capability),
                "n_after_trust": len(after_trust),
                "n_after_distance": len(after_distance),
                "top_k": request.top_k,
                "capability_filter_used": bool(required_capabilities),
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
        """Check if facility matches required capabilities (original method)."""
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
    
    def _matches_capabilities_fast(self, facility: FacilityTrustRecord, request: QueryRequest) -> bool:
        """Optimized capability matching with early termination.
        
        Returns False as soon as a required capability is missing or insufficient.
        """
        required = request.capabilities_filter or []
        if not required:
            return True
        
        min_trust = request.min_trust_score
        claims_by_name = {claim.capability: claim for claim in facility.capabilities}
        
        for capability in required:
            claim = claims_by_name.get(capability)
            # Early termination: fail fast on missing or insufficient capability
            if claim is None or not claim.claim_present or claim.trust_score < min_trust:
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
