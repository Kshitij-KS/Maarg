import json
from pathlib import Path

from src.shared.schemas import FacilityTrustRecord, PinCodeDesert

ROOT = Path(__file__).resolve().parents[1]


def _load_json(path: str) -> list[dict]:
    with (ROOT / path).open(encoding="utf-8") as file:
        return json.load(file)


def test_mock_facility_trust_validates_contract() -> None:
    records = _load_json("fixtures/mock_gold_facility_trust.json")

    assert len(records) >= 50
    for record in records:
        parsed = FacilityTrustRecord(**record)
        assert parsed.normalization_version
        for claim in parsed.capabilities:
            assert claim.citations


def test_mock_pin_desert_validates_contract() -> None:
    records = _load_json("fixtures/mock_gold_pin_desert.json")

    assert len(records) >= 30
    for record in records:
        PinCodeDesert(**record)


def test_canonical_demo_records_are_stable() -> None:
    records = _load_json("fixtures/mock_gold_facility_trust.json")
    by_id = {record["facility_id"]: record for record in records}

    assert {"demo-clean-001", "demo-live-catch-001", "demo-uncertain-001"} <= set(by_id)

    live_catch = by_id["demo-live-catch-001"]["capabilities"][0]
    assert live_catch["capability"] == "advanced_surgery"
    assert live_catch["inference_score"] < 0.15
    assert live_catch["trust_score"] < 0.4
    assert "EQUIPMENT_CLAIM_MISMATCH" in live_catch["flags"]
    assert live_catch["inference_detail"]["contradictions"] == [
        "Claims Advanced Surgery but no anesthesia machine or anesthesiologist found"
    ]

    clean = by_id["demo-clean-001"]
    assert clean["overall_trust_score"] > 0.85
    assert clean["capabilities"][0]["inference_detail"]["supporting_equipment"]

    uncertain = by_id["demo-uncertain-001"]["capabilities"][0]
    assert uncertain["confidence_interval_high"] - uncertain["confidence_interval_low"] >= 0.4
