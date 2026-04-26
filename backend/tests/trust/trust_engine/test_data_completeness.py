from src.trust.trust_engine.data_completeness import compute_data_completeness_flags


def test_data_completeness_flags_missing_demo_sensitive_fields() -> None:
    flags = compute_data_completeness_flags(
        {
            "phone_numbers": "",
            "websites": "",
            "latitude": None,
            "longitude": None,
            "equipment": "[]",
            "procedure": "[]",
            "capability": "[]",
        }
    )

    assert "LOW_METADATA_COMPLETENESS" in flags
    assert "MISSING_GEO" in flags
    assert "NO_EQUIPMENT_LIST" in flags


def test_data_completeness_is_quiet_for_well_described_facility() -> None:
    flags = compute_data_completeness_flags(
        {
            "phone_numbers": '["+911234567890"]',
            "websites": '["https://example.org"]',
            "latitude": 25.92,
            "longitude": 86.79,
            "equipment": '["operation theatre"]',
            "procedure": '["LSCS"]',
            "capability": '["emergency_obstetric_care"]',
        }
    )

    assert flags == []
