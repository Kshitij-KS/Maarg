import pytest

from src.trust.extraction.extractor import LocalExtractorAdapter, NormalizedFacilityText


def test_local_extractor_requires_normalized_text_object() -> None:
    extractor = LocalExtractorAdapter()

    with pytest.raises(TypeError):
        extractor.extract("raw text")  # type: ignore[arg-type]


def test_local_extractor_preserves_normalization_version() -> None:
    extractor = LocalExtractorAdapter()

    result = extractor.extract(
        NormalizedFacilityText(
            facility_id="facility-1",
            text="Facility has Operation Theatre and anesthesia machine",
            normalization_version="1.0",
        )
    )

    assert result["facility_id"] == "facility-1"
    assert result["normalization_version"] == "1.0"
