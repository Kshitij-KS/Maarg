from datetime import UTC, datetime

from src.shared.schemas import FacilityTrustRecord
from src.trust.pipelines.trust_gold import build_facility_trust_record


def test_gold_assembly_preserves_normalization_and_inference_detail() -> None:
    record = build_facility_trust_record(
        facility_id="facility-1",
        facility_name="Sample Hospital",
        pin_code="852113",
        state="Bihar",
        district="Madhepura",
        lat=25.92,
        lon=86.79,
        facility_type="govt",
        normalization_version="1.0",
        extraction_run_id="run-1",
        last_updated=datetime(2026, 4, 26, tzinfo=UTC),
        capability_rows=[
            {
                "capability": "advanced_surgery",
                "claim_present": True,
                "self_consistency_score": 0.9,
                "coherence_score": 0.2,
                "peer_anomaly_score": 0.5,
                "inference_score": 0.05,
                "citations": [
                    {
                        "source_field": "description",
                        "sentence": "Claims advanced surgery.",
                        "char_start": 0,
                        "char_end": 24,
                    }
                ],
                "inference_detail": {
                    "inferred_present": False,
                    "inference_confidence": 0.05,
                    "supporting_equipment": [],
                    "contradictions": [
                        "Claims Advanced Surgery but no anesthesia machine "
                        "or anesthesiologist found"
                    ],
                    "inference_flags": ["EQUIPMENT_CLAIM_MISMATCH"],
                },
                "flags": ["missing_anesthesiologist", "EQUIPMENT_CLAIM_MISMATCH"],
            }
        ],
    )

    parsed = FacilityTrustRecord.model_validate(record)
    claim = parsed.capabilities[0]
    assert parsed.normalization_version == "1.0"
    assert claim.trust_score < 0.4
    assert claim.inference_detail is not None


def test_gold_assembly_merges_inference_flags_before_scoring() -> None:
    record = build_facility_trust_record(
        facility_id="facility-2",
        facility_name="Flag Merge Hospital",
        pin_code="852113",
        state="Bihar",
        district="Madhepura",
        lat=25.92,
        lon=86.79,
        facility_type="private",
        normalization_version="1.0",
        extraction_run_id="run-1",
        last_updated=datetime(2026, 4, 26, tzinfo=UTC),
        capability_rows=[
            {
                "capability": "advanced_surgery",
                "claim_present": True,
                "self_consistency_score": 0.95,
                "coherence_score": 0.8,
                "inference_score": 0.05,
                "citations": [
                    {
                        "source_field": "description",
                        "sentence": "Advanced surgery claimed.",
                        "char_start": 0,
                        "char_end": 25,
                    }
                ],
                "inference_detail": {
                    "inferred_present": False,
                    "inference_confidence": 0.05,
                    "supporting_equipment": [],
                    "contradictions": [
                        "Claims Advanced Surgery but no anesthesia machine "
                        "or anesthesiologist found"
                    ],
                    "inference_flags": ["EQUIPMENT_CLAIM_MISMATCH"],
                },
                "flags": [],
            }
        ],
    )

    claim = FacilityTrustRecord.model_validate(record).capabilities[0]
    assert "EQUIPMENT_CLAIM_MISMATCH" in claim.flags
    assert "PEER_ANOMALY_NOT_COMPUTED" in claim.flags
    assert claim.peer_anomaly_score == 0.5
    assert claim.trust_score <= 0.35


def test_gold_assembly_flags_weak_citations_and_empty_rows() -> None:
    empty_record = build_facility_trust_record(
        facility_id="facility-empty",
        facility_name="Empty Facility",
        pin_code="852113",
        state="Bihar",
        district="Madhepura",
        lat=25.92,
        lon=86.79,
        facility_type="unknown",
        normalization_version="1.0",
        extraction_run_id="run-1",
        last_updated=datetime(2026, 4, 26, tzinfo=UTC),
        capability_rows=[],
    )
    assert empty_record["overall_trust_score"] == 0.0
    assert empty_record["capabilities"] == []

    weak_record = build_facility_trust_record(
        facility_id="facility-weak",
        facility_name="Weak Citation Facility",
        pin_code="852113",
        state="Bihar",
        district="Madhepura",
        lat=25.92,
        lon=86.79,
        facility_type="unknown",
        normalization_version="1.0",
        extraction_run_id="run-1",
        last_updated=datetime(2026, 4, 26, tzinfo=UTC),
        capability_rows=[
            {
                "capability": "dialysis",
                "claim_present": True,
                "self_consistency_score": 0.8,
                "coherence_score": 0.8,
                "inference_score": 0.8,
                "citations": [],
                "flags": [],
            }
        ],
    )

    claim = FacilityTrustRecord.model_validate(weak_record).capabilities[0]
    assert "MISSING_CITATION" in claim.flags
    assert claim.trust_score < 0.8
