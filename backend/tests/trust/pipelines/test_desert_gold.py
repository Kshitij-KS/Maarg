from __future__ import annotations

from src.shared.schemas import PinCodeDesert
from src.trust.pipelines.desert_gold import build_pin_desert_records


def _facility(
    facility_id: str,
    pin_code: str,
    capability: str,
    trust_score: float,
) -> dict:
    return {
        "facility_id": facility_id,
        "facility_name": facility_id,
        "pin_code": pin_code,
        "state": "Bihar",
        "district": "Patna",
        "lat": 25.61,
        "lon": 85.14,
        "facility_type": "hospital",
        "normalization_version": "csv_databricks_v1",
        "capabilities": [
            {
                "capability": capability,
                "claim_present": True,
                "self_consistency_score": trust_score,
                "coherence_score": trust_score,
                "peer_anomaly_score": 0.5,
                "inference_score": trust_score,
                "trust_score": trust_score,
                "confidence_interval_low": max(0, trust_score - 0.2),
                "confidence_interval_high": min(1, trust_score + 0.2),
                "citations": [],
                "inference_detail": None,
                "flags": [],
            }
        ],
        "overall_trust_score": trust_score,
        "extraction_run_ids": ["test"],
        "last_updated": "2026-01-01T00:00:00Z",
    }


def test_build_pin_desert_records_aggregates_duplicate_pin_capability() -> None:
    records = build_pin_desert_records(
        [
            _facility("low", "800001", "dialysis", 0.4),
            _facility("high", "800001", "dialysis", 0.9),
        ],
        capabilities=["dialysis"],
    )

    assert len(records) == 1
    desert = PinCodeDesert.model_validate(records[0])
    assert desert.pin_code == "800001"
    assert desert.nearest_verified_facility_id == "high"
    assert desert.desert_score == 0.1


def test_build_pin_desert_records_marks_missing_capability_as_desert() -> None:
    records = build_pin_desert_records(
        [_facility("facility-1", "800001", "icu", 0.8)],
        capabilities=["dialysis"],
    )

    desert = PinCodeDesert.model_validate(records[0])
    assert desert.capability == "dialysis"
    assert desert.nearest_verified_facility_id is None
    assert desert.population is None
    assert desert.desert_score == 1.0
