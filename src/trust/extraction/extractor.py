from dataclasses import dataclass
from typing import Any


@dataclass(frozen=True)
class NormalizedFacilityText:
    facility_id: str
    text: str
    normalization_version: str


class LocalExtractorAdapter:
    """
    Local placeholder for the Agent Bricks extractor boundary.

    Real Agent Bricks calls stay behind this adapter until Databricks APIs are verified.
    """

    def extract(self, normalized: NormalizedFacilityText) -> dict[str, Any]:
        if not isinstance(normalized, NormalizedFacilityText):
            raise TypeError("extract() requires NormalizedFacilityText")
        text = normalized.text
        text_lower = text.lower()
        equipment = _extract_terms(
            text,
            [
                "anesthesia machine",
                "operation theatre",
                "baby warmer",
                "incubator",
                "dialysis machine",
                "RO water system",
                "trauma bay",
                "defibrillator",
                "ventilator",
                "patient monitor",
                "Oxygen Cylinders",
            ],
        )
        staff = _extract_terms(
            text,
            [
                "anesthesiologist",
                "anaesthetist",
                "gynaecologist",
                "obstetrician",
                "emergency physician",
                "medical officer",
            ],
        )
        capabilities = _infer_claimed_capabilities(text_lower, equipment, staff)
        return {
            "facility_id": normalized.facility_id,
            "normalization_version": normalized.normalization_version,
            "normalized_text": normalized.text,
            "capabilities": capabilities,
            "equipment": equipment,
            "staff": staff,
            "citations": [_citation_for(text)] if capabilities or equipment or staff else [],
            "flags": [],
        }


def _extract_terms(text: str, terms: list[str]) -> list[str]:
    text_lower = text.lower()
    return [term for term in terms if term.lower() in text_lower]


def _infer_claimed_capabilities(
    text_lower: str,
    equipment: list[str],
    staff: list[str],
) -> list[str]:
    capabilities: list[str] = []
    if "advanced surgery" in text_lower or (
        "anesthesia machine" in equipment and "anesthesiologist" in staff
    ):
        capabilities.append("advanced_surgery")
    if (
        "lower segment caesarean section" in text_lower
        or "lscs" in text_lower
        or "emergency obstetric" in text_lower
    ):
        capabilities.append("emergency_obstetric_care")
    if any(item in equipment for item in ["incubator", "baby warmer"]):
        capabilities.append("neonatal_icu")
    if "dialysis machine" in equipment:
        capabilities.append("dialysis")
    if "trauma bay" in equipment:
        capabilities.append("emergency_trauma")
    return list(dict.fromkeys(capabilities))


def _citation_for(text: str) -> dict[str, Any]:
    sentence = text.split(".")[0].strip() or text.strip()
    return {
        "source_field": "normalized_text",
        "sentence": sentence,
        "char_start": 0,
        "char_end": len(sentence),
    }
