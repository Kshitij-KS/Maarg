from typing import Any


def _is_empty(value: Any) -> bool:
    if value is None:
        return True
    text = str(value).strip()
    return text in {"", "[]", "null", "None", "nan"}


def compute_data_completeness_flags(row: dict[str, Any]) -> list[str]:
    flags: list[str] = []
    metadata_fields = ["phone_numbers", "websites", "procedure", "capability", "equipment"]
    missing_count = sum(1 for field in metadata_fields if _is_empty(row.get(field)))

    if missing_count >= 3:
        flags.append("LOW_METADATA_COMPLETENESS")
    if _is_empty(row.get("latitude")) or _is_empty(row.get("longitude")):
        flags.append("MISSING_GEO")
    if _is_empty(row.get("equipment")):
        flags.append("NO_EQUIPMENT_LIST")

    return flags
