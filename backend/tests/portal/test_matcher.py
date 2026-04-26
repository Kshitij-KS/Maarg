from __future__ import annotations

from app.api.adapters.gold_reader import facilities
from app.portal.services.matcher import match_to_gold


def test_match_to_gold_finds_demo_facility() -> None:
    facility_id, confidence = match_to_gold(
        "Madhepura District Hospital",
        "Madhepura",
        "Bihar",
        "852113",
        facilities(),
    )

    assert facility_id == "F00001"
    assert confidence >= 0.75


def test_match_to_gold_rejects_weak_match() -> None:
    facility_id, confidence = match_to_gold(
        "Completely Unknown Clinic",
        "Mumbai",
        "Maharashtra",
        "400001",
        facilities(),
    )

    assert facility_id is None
    assert confidence < 0.75
