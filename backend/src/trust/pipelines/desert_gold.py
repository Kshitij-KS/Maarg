from __future__ import annotations

from collections import defaultdict
from typing import Any

from src.shared.schemas import FacilityTrustRecord, PinCodeDesert

DEFAULT_DESERT_CAPABILITIES = [
    "emergency_obstetric_care",
    "advanced_surgery",
    "emergency_trauma",
    "dialysis",
    "neonatal_icu",
    "c_section",
    "icu",
]


def build_pin_desert_records(
    facilities: list[dict[str, Any] | FacilityTrustRecord],
    *,
    capabilities: list[str] | None = None,
) -> list[dict[str, Any]]:
    facility_models = [
        facility
        if isinstance(facility, FacilityTrustRecord)
        else FacilityTrustRecord.model_validate(facility)
        for facility in facilities
    ]
    target_capabilities = capabilities or DEFAULT_DESERT_CAPABILITIES
    grouped: dict[tuple[str, str], list[FacilityTrustRecord]] = defaultdict(list)
    for facility in facility_models:
        grouped[(facility.pin_code, facility.state, facility.district)].append(facility)

    deserts: list[dict[str, Any]] = []
    for (pin_code, state, district), pin_facilities in grouped.items():
        representative = pin_facilities[0]
        for capability in target_capabilities:
            best = _best_facility_for_capability(pin_facilities, capability)
            best_score = _best_capability_score(best, capability) if best else 0.0
            record = {
                "pin_code": pin_code,
                "state": state,
                "district": district,
                "lat": representative.lat,
                "lon": representative.lon,
                "population": None,
                "capability": capability,
                "nearest_verified_facility_id": best.facility_id if best else None,
                "distance_km": 0.0 if best else None,
                "desert_score": round(1.0 - best_score, 4),
            }
            deserts.append(PinCodeDesert.model_validate(record).model_dump(mode="json"))
    return deserts


def _best_facility_for_capability(
    facilities: list[FacilityTrustRecord],
    capability: str,
) -> FacilityTrustRecord | None:
    candidates = [
        facility
        for facility in facilities
        if any(claim.capability == capability for claim in facility.capabilities)
    ]
    if not candidates:
        return None
    return max(candidates, key=lambda facility: _best_capability_score(facility, capability))


def _best_capability_score(facility: FacilityTrustRecord | None, capability: str) -> float:
    if facility is None:
        return 0.0
    scores = [
        claim.trust_score
        for claim in facility.capabilities
        if claim.capability == capability
    ]
    return max(scores) if scores else 0.0
