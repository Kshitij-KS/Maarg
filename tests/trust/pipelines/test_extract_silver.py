from math import nan
from typing import Any

from src.trust.extraction.extractor import LocalExtractorAdapter, NormalizedFacilityText
from src.trust.pipelines.extract_silver import extract_facility_to_silver_row


class RecordingExtractor:
    def __init__(self) -> None:
        self.seen: NormalizedFacilityText | None = None

    def extract(self, normalized: NormalizedFacilityText) -> dict[str, Any]:
        self.seen = normalized
        return LocalExtractorAdapter().extract(normalized)


def test_extract_silver_normalizes_before_extractor_call() -> None:
    extractor = RecordingExtractor()

    row = extract_facility_to_silver_row(
        facility_id="facility-1",
        raw_text_blob="Sarkari CHC with LSCS, OT 24x7, O2 cyl 2 nos",
        extractor=extractor,
    )

    assert extractor.seen is not None
    assert isinstance(extractor.seen, NormalizedFacilityText)
    assert "Government" in extractor.seen.text
    assert "Lower Segment Caesarean Section" in extractor.seen.text
    assert "2 Oxygen Cylinders" in extractor.seen.text
    assert row["normalization_version"] == "1.0"


def test_extract_silver_handles_empty_and_nan_text() -> None:
    for raw_text in (None, "", nan):
        row = extract_facility_to_silver_row("facility-empty", raw_text)
        assert row["capabilities"] == []
        assert row["equipment"] == []
        assert row["staff"] == []
        assert "EMPTY_RAW_TEXT" in row["flags"]


def test_local_extractor_produces_demo_evidence_and_citations() -> None:
    row = extract_facility_to_silver_row(
        "facility-demo",
        "Facility claims LSCS with Operation Theatre, anesthesia machine, "
        "anesthesiologist and baby warmer.",
    )

    assert "advanced_surgery" in row["capabilities"]
    assert row["equipment"]
    assert row["staff"]
    assert row["citations"]
