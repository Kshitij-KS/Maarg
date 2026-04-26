"""Seed fallback mock Gold fixtures for local backend development.

This script is a temporary unblocker when Person A's fixtures are not available.
It writes JSON matching `app.shared.schemas` so all Person B code stays mock-first.
"""

# ruff: noqa: E402

from __future__ import annotations

import json
import sys
from datetime import UTC, datetime
from pathlib import Path

PROJECT_ROOT = Path(__file__).resolve().parents[1]
sys.path.insert(0, str(PROJECT_ROOT))

from app.shared.schemas import CapabilityClaim, Citation, FacilityTrustRecord, PinCodeDesert

FIXTURES_DIR = PROJECT_ROOT / "fixtures"


def citation(sentence: str, source_field: str = "free_text_notes") -> Citation:
    return Citation(
        source_field=source_field,
        sentence=sentence,
        char_start=0,
        char_end=len(sentence),
    )


def capability(
    name: str,
    trust: float,
    *,
    present: bool = True,
    flags: list[str] | None = None,
    sentence: str | None = None,
) -> CapabilityClaim:
    return CapabilityClaim(
        capability=name,
        claim_present=present,
        self_consistency_score=max(0.0, min(1.0, trust + 0.02)),
        coherence_score=max(0.0, min(1.0, trust)),
        peer_anomaly_score=max(0.0, min(1.0, trust - 0.03)),
        inference_score=max(0.0, min(1.0, trust - 0.01)),
        trust_score=trust,
        confidence_interval_low=max(0.0, trust - 0.12),
        confidence_interval_high=min(1.0, trust + 0.08),
        citations=[
            citation(sentence or f"Facility record states {name.replace('_', ' ')} is available.")
        ],
        flags=flags or [],
    )


def facilities() -> list[FacilityTrustRecord]:
    now = datetime(2026, 4, 26, tzinfo=UTC)
    return [
        FacilityTrustRecord(
            facility_id="F00001",
            facility_name="Madhepura District Hospital",
            pin_code="852113",
            state="Bihar",
            district="Madhepura",
            lat=25.921,
            lon=86.792,
            facility_type="District Hospital",
            normalization_version="1.0",
            capabilities=[
                capability(
                    "emergency_obstetric_care",
                    0.92,
                    sentence=(
                        "Emergency obstetric care is available 24x7 with operating theatre support."
                    ),
                ),
                capability(
                    "c_section",
                    0.91,
                    sentence="Emergency OT supports C-section procedures around the clock.",
                ),
                capability(
                    "anesthesiologist_coverage",
                    0.88,
                    sentence="Anesthesiologist is on call for emergency C-section cases.",
                ),
                capability("dialysis", 0.78, sentence="Dialysis unit runs six days per week."),
            ],
            overall_trust_score=0.9,
            extraction_run_ids=["mock-run-001"],
            last_updated=now,
        ),
        FacilityTrustRecord(
            facility_id="F00002",
            facility_name="Saharsa Medical Centre",
            pin_code="852201",
            state="Bihar",
            district="Saharsa",
            lat=25.883,
            lon=86.597,
            facility_type="Private Hospital",
            normalization_version="1.0",
            capabilities=[
                capability("c_section", 0.86),
                capability("emergency_obstetric_care", 0.84),
                capability(
                    "anesthesiologist_coverage",
                    0.41,
                    present=False,
                    flags=["MISSING_ANESTHESIOLOGIST"],
                    sentence="No full-time anesthesiologist is listed in the staffing notes.",
                ),
            ],
            overall_trust_score=0.74,
            extraction_run_ids=["mock-run-001"],
            last_updated=now,
        ),
        FacilityTrustRecord(
            facility_id="F00003",
            facility_name="Purnea City Hospital",
            pin_code="854301",
            state="Bihar",
            district="Purnea",
            lat=25.777,
            lon=87.475,
            facility_type="Multi-specialty Hospital",
            normalization_version="1.0",
            capabilities=[
                capability("emergency_obstetric_care", 0.87),
                capability("c_section", 0.9),
                capability("anesthesiologist_coverage", 0.89),
                capability("nicu", 0.82),
            ],
            overall_trust_score=0.88,
            extraction_run_ids=["mock-run-001"],
            last_updated=now,
        ),
        FacilityTrustRecord(
            facility_id="F00042",
            facility_name="Kosi Dialysis and Critical Care",
            pin_code="852113",
            state="Bihar",
            district="Madhepura",
            lat=25.913,
            lon=86.806,
            facility_type="Specialty Clinic",
            normalization_version="1.0",
            capabilities=[
                capability(
                    "dialysis",
                    0.78,
                    sentence=(
                        "Dialysis capability is reported with two functional hemodialysis machines."
                    ),
                ),
                capability("icu", 0.67),
            ],
            overall_trust_score=0.76,
            extraction_run_ids=["mock-run-001"],
            last_updated=now,
        ),
        FacilityTrustRecord(
            facility_id="F00099",
            facility_name="Rural Health Sub-Centre Singheshwar",
            pin_code="852128",
            state="Bihar",
            district="Madhepura",
            lat=26.032,
            lon=86.755,
            facility_type="Sub-Centre",
            normalization_version="1.0",
            capabilities=[
                capability(
                    "emergency_obstetric_care",
                    0.33,
                    present=False,
                    flags=["LOW_CONFIDENCE", "NO_C_SECTION"],
                    sentence=(
                        "Sub-centre provides antenatal checkups but refers delivery complications."
                    ),
                )
            ],
            overall_trust_score=0.42,
            extraction_run_ids=["mock-run-001"],
            last_updated=now,
        ),
    ]


def pin_desert() -> list[PinCodeDesert]:
    rows = [
        (
            "852113",
            "Madhepura",
            25.92,
            86.79,
            184900,
            "emergency_obstetric_care",
            "F00001",
            3.2,
            0.18,
        ),
        ("852113", "Madhepura", 25.92, 86.79, 184900, "dialysis", "F00042", 1.9, 0.32),
        (
            "852128",
            "Madhepura",
            26.03,
            86.76,
            87500,
            "emergency_obstetric_care",
            "F00001",
            15.1,
            0.51,
        ),
        (
            "852201",
            "Saharsa",
            25.88,
            86.60,
            210000,
            "emergency_obstetric_care",
            "F00002",
            2.5,
            0.39,
        ),
        ("854301", "Purnea", 25.78, 87.47, 295000, "emergency_obstetric_care", "F00003", 4.0, 0.22),
        ("854301", "Purnea", 25.78, 87.47, 295000, "nicu", "F00003", 4.0, 0.27),
        (
            "852101",
            "Supaul",
            26.12,
            86.60,
            162000,
            "emergency_obstetric_care",
            "F00001",
            38.7,
            0.68,
        ),
        (
            "855107",
            "Kishanganj",
            26.10,
            87.95,
            128000,
            "emergency_obstetric_care",
            None,
            None,
            0.91,
        ),
        ("848101", "Samastipur", 25.86, 85.78, 305000, "dialysis", None, None, 0.86),
        (
            "800001",
            "Patna",
            25.61,
            85.14,
            690000,
            "emergency_obstetric_care",
            "F00003",
            180.0,
            0.42,
        ),
    ]
    return [
        PinCodeDesert(
            pin_code=pin,
            state="Bihar",
            district=district,
            lat=lat,
            lon=lon,
            population=population,
            capability=cap,
            nearest_verified_facility_id=facility_id,
            distance_km=distance,
            desert_score=score,
        )
        for pin, district, lat, lon, population, cap, facility_id, distance, score in rows
    ]


def write_json(path: Path, records: list[FacilityTrustRecord] | list[PinCodeDesert]) -> None:
    path.write_text(
        json.dumps([record.model_dump(mode="json") for record in records], indent=2),
        encoding="utf-8",
    )


def main() -> None:
    FIXTURES_DIR.mkdir(parents=True, exist_ok=True)
    write_json(FIXTURES_DIR / "mock_gold_facility_trust.json", facilities())
    write_json(FIXTURES_DIR / "mock_gold_pin_desert.json", pin_desert())
    print("Wrote fallback mock Gold fixtures to backend/fixtures/.")


if __name__ == "__main__":
    main()
