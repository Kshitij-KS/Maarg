import re
from pathlib import Path
from typing import Any

import yaml

_YAML_PATH = Path(__file__).resolve().parents[2] / "shared" / "indian_medical_normalizations.yaml"
_config: dict[str, Any] | None = None


def _load_config() -> dict[str, Any]:
    global _config
    if _config is None:
        with _YAML_PATH.open(encoding="utf-8") as file:
            _config = yaml.safe_load(file)
    return _config


def _substitute_terms(result: str, terms: dict[str, str]) -> str:
    # Longer keys first prevents "OT" from touching terms already expanded by longer patterns.
    for raw, normalized in sorted(terms.items(), key=lambda item: len(item[0]), reverse=True):
        result = re.sub(rf"\b{re.escape(raw)}\b", normalized, result, flags=re.IGNORECASE)
    return result


def normalize_facility_text(text: str, version: str = "1.0") -> tuple[str, str]:
    """
    Apply Indian-English normalization to a raw facility text blob.
    Returns (normalized_text, normalization_version).
    """
    config = _load_config()
    result = text

    eq_config = config.get("equipment_counts", {})
    known_items = eq_config.get("known_items", {})
    sorted_items = sorted(known_items.items(), key=lambda item: len(item[0]), reverse=True)
    for raw_item, clean_item in sorted_items:
        pattern = rf"({re.escape(raw_item)})\s+(\d+)\s+nos"
        result = re.sub(
            pattern,
            lambda match, item=clean_item: f"{match.group(2)} {item}",
            result,
            flags=re.I,
        )

    result = _substitute_terms(result, config.get("abbreviations", {}))
    result = _substitute_terms(result, config.get("availability", {}))
    result = _substitute_terms(result, config.get("regional_terms", {}))
    result = _substitute_terms(result, config.get("ownership", {}))
    result = _substitute_terms(result, config.get("staff", {}))

    return result, str(config.get("version", version))
