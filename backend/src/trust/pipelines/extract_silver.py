from typing import Any

from src.trust.extraction.extractor import LocalExtractorAdapter, NormalizedFacilityText
from src.trust.extraction.normalizer import normalize_facility_text


def _is_blank(raw_text_blob: Any) -> bool:
    if raw_text_blob is None:
        return True
    text = str(raw_text_blob).strip()
    return text in {"", "nan", "None"}


def _validate_silver_row(row: dict[str, Any]) -> dict[str, Any]:
    required_list_fields = ["capabilities", "equipment", "staff", "flags"]
    for field in required_list_fields:
        value = row.get(field)
        if not isinstance(value, list):
            raise TypeError(f"Silver row field {field} must be a list")
    if "facility_id" not in row or not row["facility_id"]:
        raise ValueError("Silver row requires facility_id")
    if "normalization_version" not in row:
        raise ValueError("Silver row requires normalization_version")
    return row


def extract_facility_to_silver_row(
    facility_id: str,
    raw_text_blob: Any,
    extractor: LocalExtractorAdapter | None = None,
) -> dict[str, Any]:
    if _is_blank(raw_text_blob):
        return _validate_silver_row(
            {
                "facility_id": facility_id,
                "normalization_version": "none",
                "capabilities": [],
                "equipment": [],
                "staff": [],
                "citations": [],
                "flags": ["EMPTY_RAW_TEXT"],
            }
        )

    normalized_text, normalization_version = normalize_facility_text(str(raw_text_blob))
    normalized = NormalizedFacilityText(
        facility_id=facility_id,
        text=normalized_text,
        normalization_version=normalization_version,
    )
    return _validate_silver_row((extractor or LocalExtractorAdapter()).extract(normalized))
