import json
from pathlib import Path
from typing import Any

NOW = "2026-04-26T00:00:00Z"
DEFAULT_CITATION = {
    "source_field": "description",
    "sentence": "Facility notes mention verified service evidence.",
    "char_start": 0,
    "char_end": 49,
}


def inference(
    present: bool | None,
    confidence: float,
    support: list[str] | None = None,
    contradictions: list[str] | None = None,
    flags: list[str] | None = None,
) -> dict[str, Any]:
    return {
        "inferred_present": present,
        "inference_confidence": confidence,
        "supporting_equipment": support or [],
        "contradictions": contradictions or [],
        "inference_flags": flags or [],
    }


def claim(
    capability: str,
    claim_present: bool,
    self_consistency: float,
    coherence: float,
    peer_anomaly: float,
    inference_score: float,
    trust_score: float,
    low: float,
    high: float,
    citations: list[dict[str, Any]] | None = None,
    detail: dict[str, Any] | None = None,
    flags: list[str] | None = None,
) -> dict[str, Any]:
    return {
        "capability": capability,
        "claim_present": claim_present,
        "self_consistency_score": self_consistency,
        "coherence_score": coherence,
        "peer_anomaly_score": peer_anomaly,
        "inference_score": inference_score,
        "trust_score": trust_score,
        "confidence_interval_low": low,
        "confidence_interval_high": high,
        "citations": citations or [DEFAULT_CITATION],
        "inference_detail": detail,
        "flags": flags or [],
    }


def facility(
    facility_id: str,
    facility_name: str,
    pin_code: str,
    state: str,
    district: str,
    lat: float,
    lon: float,
    facility_type: str,
    claims: list[dict[str, Any]],
) -> dict[str, Any]:
    overall = round(sum(row["trust_score"] for row in claims) / len(claims), 4)
    return {
        "facility_id": facility_id,
        "facility_name": facility_name,
        "pin_code": pin_code,
        "state": state,
        "district": district,
        "lat": lat,
        "lon": lon,
        "facility_type": facility_type,
        "normalization_version": "1.0",
        "capabilities": claims,
        "overall_trust_score": overall,
        "extraction_run_ids": ["mock-run-001"],
        "last_updated": NOW,
    }


def build_facility_records() -> list[dict[str, Any]]:
    records = [
        facility(
            "demo-clean-001",
            "Madhepura District Women and Child Hospital",
            "852113",
            "Bihar",
            "Madhepura",
            25.92,
            86.79,
            "govt",
            [
                claim(
                    "emergency_obstetric_care",
                    True,
                    0.95,
                    0.9,
                    0.85,
                    0.85,
                    0.89,
                    0.82,
                    0.96,
                    detail=inference(
                        True,
                        0.85,
                        ["operation theatre", "gynaecologist", "baby warmer"],
                    ),
                )
            ],
        ),
        facility(
            "demo-live-catch-001",
            "Shiv Shakti Advanced Surgery Centre",
            "852114",
            "Bihar",
            "Madhepura",
            25.93,
            86.8,
            "private",
            [
                claim(
                    "advanced_surgery",
                    True,
                    0.9,
                    0.2,
                    0.5,
                    0.05,
                    0.35,
                    0.15,
                    0.55,
                    citations=[
                        {
                            "source_field": "description",
                            "sentence": (
                                "Claims advanced surgery but lists only minor procedure room "
                                "and medical officer."
                            ),
                            "char_start": 0,
                            "char_end": 75,
                        }
                    ],
                    detail=inference(
                        False,
                        0.05,
                        [],
                        [
                            "Claims Advanced Surgery but no anesthesia machine or "
                            "anesthesiologist found"
                        ],
                        ["EQUIPMENT_CLAIM_MISMATCH"],
                    ),
                    flags=[
                        "missing_anesthesiologist",
                        "EQUIPMENT_CLAIM_MISMATCH",
                        "PROVISIONAL_INTERVAL",
                    ],
                )
            ],
        ),
        facility(
            "demo-uncertain-001",
            "Kosi Border Critical Care Unit",
            "852115",
            "Bihar",
            "Madhepura",
            25.91,
            86.77,
            "charitable",
            [
                claim(
                    "icu",
                    True,
                    0.55,
                    0.65,
                    0.5,
                    0.65,
                    0.6,
                    0.45,
                    0.91,
                    detail=inference(True, 0.65, ["ventilator", "patient monitor"]),
                    flags=["PROVISIONAL_INTERVAL"],
                )
            ],
        ),
    ]

    states = [
        ("Bihar", "Madhepura", 25.92, 86.79),
        ("Jharkhand", "Ranchi", 23.34, 85.31),
        ("Odisha", "Koraput", 18.81, 82.71),
        ("Maharashtra", "Mumbai", 19.08, 72.88),
        ("Karnataka", "Bengaluru", 12.97, 77.59),
    ]
    capabilities = [
        "advanced_surgery",
        "emergency_obstetric_care",
        "neonatal_icu",
        "dialysis",
        "emergency_trauma",
    ]
    facility_types = ["govt", "private", "charitable", "unknown"]

    for index in range(47):
        state, district, lat, lon = states[index % len(states)]
        capability = capabilities[index % len(capabilities)]
        score = round(0.58 + ((index % 7) * 0.04), 2)
        records.append(
            facility(
                f"mock-facility-{index + 4:03d}",
                f"Mock {district} {capability.replace('_', ' ').title()} Facility {index + 4:03d}",
                str(800000 + index),
                state,
                district,
                round(lat + (index % 5) * 0.01, 5),
                round(lon + (index % 4) * 0.01, 5),
                facility_types[index % len(facility_types)],
                [
                    claim(
                        capability,
                        True,
                        score,
                        score,
                        0.5,
                        score,
                        score,
                        max(0, round(score - 0.2, 2)),
                        min(1, round(score + 0.2, 2)),
                        detail=inference(True, score, [capability.replace("_", " ")]),
                        flags=["PEER_ANOMALY_NOT_COMPUTED", "PROVISIONAL_INTERVAL"],
                    )
                ],
            )
        )
    return records


def build_desert_records() -> list[dict[str, Any]]:
    capabilities = ["neonatal_icu", "dialysis", "emergency_obstetric_care", "advanced_surgery"]
    pins = [
        ("852113", "Bihar", "Madhepura", 25.92, 86.79, 65000, 0.92),
        ("814133", "Jharkhand", "Godda", 24.83, 87.21, 58000, 0.9),
        ("835210", "Jharkhand", "Khunti", 23.08, 85.28, 52000, 0.88),
        ("764020", "Odisha", "Koraput", 18.81, 82.71, 61000, 0.87),
        ("847408", "Bihar", "Madhubani", 26.35, 86.07, 72000, 0.91),
        ("400001", "Maharashtra", "Mumbai", 18.94, 72.84, 120000, 0.12),
        ("560001", "Karnataka", "Bengaluru", 12.98, 77.6, 140000, 0.1),
        ("110001", "Delhi", "New Delhi", 28.63, 77.22, 150000, 0.08),
        ("700001", "West Bengal", "Kolkata", 22.57, 88.36, 130000, 0.15),
        ("600001", "Tamil Nadu", "Chennai", 13.09, 80.29, 125000, 0.14),
    ]

    records = []
    for index in range(30):
        pin, state, district, lat, lon, population, base_score = pins[index % len(pins)]
        records.append(
            {
                "pin_code": pin,
                "state": state,
                "district": district,
                "lat": lat,
                "lon": lon,
                "population": population,
                "capability": capabilities[index % len(capabilities)],
                "nearest_verified_facility_id": None
                if base_score > 0.85
                else "demo-clean-001",
                "distance_km": None if base_score > 0.85 else round(3.5 + index, 1),
                "desert_score": base_score,
            }
        )
    return records


def main() -> None:
    fixtures = Path("fixtures")
    fixtures.mkdir(exist_ok=True)
    (fixtures / "mock_gold_facility_trust.json").write_text(
        json.dumps(build_facility_records(), indent=2),
        encoding="utf-8",
    )
    (fixtures / "mock_gold_pin_desert.json").write_text(
        json.dumps(build_desert_records(), indent=2),
        encoding="utf-8",
    )


if __name__ == "__main__":
    main()
