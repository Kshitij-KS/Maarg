"""Facility-to-Gold fuzzy matching for portal registrations."""

from __future__ import annotations

from difflib import SequenceMatcher

from app.shared.schemas import FacilityTrustRecord

MATCH_THRESHOLD = 0.75


def _normalize(value: str) -> str:
    return " ".join(value.lower().replace(",", " ").split())


def _token_sort_ratio(left: str, right: str) -> float:
    left_tokens = " ".join(sorted(_normalize(left).split()))
    right_tokens = " ".join(sorted(_normalize(right).split()))
    return SequenceMatcher(None, left_tokens, right_tokens).ratio()


def match_to_gold(
    facility_name: str,
    address_city: str,
    address_state: str,
    pin_code: str,
    gold_facilities: list[FacilityTrustRecord],
) -> tuple[str | None, float]:
    """Return the best matching Gold facility id and confidence."""

    best_id: str | None = None
    best_score = 0.0
    for record in gold_facilities:
        name_score = _token_sort_ratio(facility_name, record.facility_name)
        pin_score = 1.0 if record.pin_code == pin_code else 0.0
        city_score = max(
            _token_sort_ratio(address_city, record.district),
            _token_sort_ratio(address_state, record.state),
        )
        combined = (name_score * 0.5) + (pin_score * 0.3) + (city_score * 0.2)
        if combined > best_score:
            best_id = record.facility_id
            best_score = combined

    if best_score < MATCH_THRESHOLD:
        return None, round(best_score, 4)
    return best_id, round(best_score, 4)
