from src.trust.extraction.normalizer import normalize_facility_text


def test_normalizes_demo_critical_terms() -> None:
    normalized, version = normalize_facility_text(
        "Sarkari CHC with LSCS, OT 24x7, O2 cyl 2 nos and visiting consultant"
    )

    assert version == "1.0"
    assert "Government" in normalized
    assert "Community Health Centre" in normalized
    assert "Lower Segment Caesarean Section (Caesarean Surgery)" in normalized
    assert "Operation Theatre" in normalized
    assert "24/7 Availability" in normalized
    assert "2 Oxygen Cylinders" in normalized
    assert "part_time_specialist" in normalized


def test_unknown_text_is_preserved() -> None:
    text = "Facility has a calm waiting area"

    normalized, _ = normalize_facility_text(text)

    assert normalized == text
