from __future__ import annotations

import pytest

from src.shared.schemas import FacilityTrustRecord
from src.trust.pipelines.build_gold_from_bronze import (
    build_facility_trust_records,
    parse_list_field,
)


def test_parse_list_field_handles_jsonish_and_null_values() -> None:
    assert parse_list_field('["dialysis", "icu"]') == ["dialysis", "icu"]
    assert parse_list_field("null") == []
    assert parse_list_field("") == []
    assert parse_list_field(None) == []
    assert parse_list_field("dialysis") == ["dialysis"]


def test_build_facility_trust_record_from_real_csv_row() -> None:
    records = build_facility_trust_records(
        [
            {
                "name": "Kidney Care Hospital",
                "address_city": "Noida",
                "address_stateOrRegion": "Uttar Pradesh",
                "address_zipOrPostcode": "201307",
                "facilityTypeId": "hospital",
                "description": "Hospital with dialysis and ICU support.",
                "specialties": '["nephrology"]',
                "procedure": '["Dialysis"]',
                "equipment": '["dialysis machine", "patient monitor"]',
                "capability": '["Dialysis services"]',
                "latitude": "28.57222366",
                "longitude": "77.36903381",
            }
        ]
    )

    assert len(records) == 1
    record = FacilityTrustRecord.model_validate(records[0])
    assert record.facility_name == "Kidney Care Hospital"
    assert record.pin_code == "201307"
    assert record.state == "Uttar Pradesh"
    assert record.district == "Noida"
    assert record.lat == 28.57222366
    assert record.lon == 77.36903381
    assert {claim.capability for claim in record.capabilities} >= {"dialysis", "icu"}
    assert record.overall_trust_score > 0
    assert record.capabilities[0].citations


def test_rows_without_coordinates_are_rejected_for_map_gold() -> None:
    with pytest.raises(ValueError, match="CSV row requires latitude"):
        build_facility_trust_records(
            [
                {
                    "name": "Missing Coordinates",
                    "address_city": "Noida",
                    "address_stateOrRegion": "Uttar Pradesh",
                    "address_zipOrPostcode": "201307",
                    "facilityTypeId": "clinic",
                    "description": "Clinic with family medicine.",
                    "latitude": "",
                    "longitude": "",
                }
            ]
        )


def test_batch_builder_can_skip_invalid_rows() -> None:
    records = build_facility_trust_records(
        [
            {
                "name": "Missing Coordinates",
                "address_city": "Noida",
                "address_stateOrRegion": "Uttar Pradesh",
                "address_zipOrPostcode": "201307",
                "facilityTypeId": "clinic",
                "description": "Clinic with family medicine.",
                "latitude": "",
                "longitude": "",
            }
        ],
        skip_invalid=True,
    )

    assert records == []
