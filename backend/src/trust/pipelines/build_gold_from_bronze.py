from __future__ import annotations

import ast
import hashlib
from datetime import UTC, datetime
from typing import Any

from src.shared.schemas import FacilityTrustRecord

P0_CAPABILITY_KEYWORDS: dict[str, tuple[str, ...]] = {
    "emergency_obstetric_care": (
        "emergency obstetric",
        "obstetric",
        "maternal",
        "delivery",
        "gynaec",
        "gynec",
    ),
    "advanced_surgery": ("advanced surgery", "major surgery", "surgery", "surgical"),
    "emergency_trauma": ("trauma", "accident", "emergency care", "casualty"),
    "dialysis": ("dialysis", "hemodialysis", "haemodialysis", "nephrology"),
    "neonatal_icu": ("neonatal icu", "nicu", "neonatal intensive"),
    "c_section": ("c-section", "c section", "cesarean", "caesarean"),
    "icu": ("icu", "intensive care", "critical care"),
}


def parse_list_field(value: Any) -> list[str]:
    if value is None:
        return []
    text = str(value).strip()
    if not text or text.lower() in {"null", "none", "nan", "[]"}:
        return []
    try:
        parsed = ast.literal_eval(text)
    except (SyntaxError, ValueError):
        return [text]
    if isinstance(parsed, list):
        return [str(item).strip() for item in parsed if str(item).strip()]
    if parsed is None:
        return []
    return [str(parsed).strip()]


def build_facility_trust_records(
    rows: list[dict[str, Any]],
    *,
    skip_invalid: bool = False,
) -> list[dict[str, Any]]:
    records: list[dict[str, Any]] = []
    for index, row in enumerate(rows):
        try:
            records.append(_build_record(index, row))
        except (TypeError, ValueError):
            if not skip_invalid:
                raise
    return records


def _build_record(index: int, row: dict[str, Any]) -> dict[str, Any]:
    facility_name = _required_text(row, "name")
    pin_code = _required_text(row, "address_zipOrPostcode")
    lat = _required_float(row, "latitude")
    lon = _required_float(row, "longitude")
    text_blob = _text_blob(row)
    capabilities = _capabilities(text_blob)
    capability_rows = [
        _capability_claim(capability, row, text_blob)
        for capability in capabilities
    ]
    if not capability_rows:
        capability_rows = [_capability_claim("family_medicine", row, text_blob, weak=True)]

    record = {
        "facility_id": _facility_id(index, row),
        "facility_name": facility_name,
        "pin_code": pin_code,
        "state": _text(row.get("address_stateOrRegion")) or "Unknown",
        "district": _text(row.get("address_city")) or "Unknown",
        "lat": lat,
        "lon": lon,
        "facility_type": _text(row.get("facilityTypeId")) or "unknown",
        "normalization_version": "csv_databricks_v1",
        "capabilities": capability_rows,
        "overall_trust_score": round(
            sum(claim["trust_score"] for claim in capability_rows) / len(capability_rows),
            4,
        ),
        "extraction_run_ids": ["csv-databricks-v1"],
        "last_updated": datetime.now(UTC),
    }
    return FacilityTrustRecord.model_validate(record).model_dump(mode="json")


def _capability_claim(
    capability: str,
    row: dict[str, Any],
    text_blob: str,
    *,
    weak: bool = False,
) -> dict[str, Any]:
    metadata_score = _metadata_score(row)
    evidence_score = 0.55 if weak else 0.75
    score = round(min(0.95, (metadata_score + evidence_score) / 2), 4)
    citation = _citation(capability, row, text_blob)
    return {
        "capability": capability,
        "claim_present": not weak,
        "self_consistency_score": score,
        "coherence_score": score,
        "peer_anomaly_score": 0.5,
        "inference_score": score,
        "trust_score": score,
        "confidence_interval_low": max(0.0, round(score - 0.2, 4)),
        "confidence_interval_high": min(1.0, round(score + 0.2, 4)),
        "citations": [citation] if citation["sentence"] else [],
        "inference_detail": {
            "inferred_present": not weak,
            "inference_confidence": score,
            "supporting_equipment": parse_list_field(row.get("equipment")),
            "contradictions": [],
            "inference_flags": [],
        },
        "flags": ["NON_P0_CAPABILITY"] if weak else [],
    }


def _capabilities(text_blob: str) -> list[str]:
    lower = text_blob.lower()
    matches = [
        capability
        for capability, keywords in P0_CAPABILITY_KEYWORDS.items()
        if any(keyword in lower for keyword in keywords)
    ]
    return sorted(set(matches))


def _citation(capability: str, row: dict[str, Any], text_blob: str) -> dict[str, Any]:
    sentence = _text(row.get("description")) or text_blob[:180]
    return {
        "source_field": "description",
        "sentence": sentence,
        "char_start": 0,
        "char_end": len(sentence),
    }


def _metadata_score(row: dict[str, Any]) -> float:
    fields = [
        "officialPhone",
        "email",
        "officialWebsite",
        "description",
        "latitude",
        "longitude",
    ]
    present = sum(1 for field in fields if _text(row.get(field)))
    return round(present / len(fields), 4)


def _text_blob(row: dict[str, Any]) -> str:
    parts = [
        _text(row.get("description")),
        " ".join(parse_list_field(row.get("specialties"))),
        " ".join(parse_list_field(row.get("procedure"))),
        " ".join(parse_list_field(row.get("equipment"))),
        " ".join(parse_list_field(row.get("capability"))),
    ]
    return " ".join(part for part in parts if part).strip()


def _facility_id(index: int, row: dict[str, Any]) -> str:
    key = "|".join(
        [
            _text(row.get("name")),
            _text(row.get("address_zipOrPostcode")),
            _text(row.get("latitude")),
            _text(row.get("longitude")),
            str(index),
        ]
    )
    digest = hashlib.sha1(key.encode("utf-8")).hexdigest()[:12]
    return f"csv-{digest}"


def _required_text(row: dict[str, Any], field: str) -> str:
    value = _text(row.get(field))
    if not value:
        raise ValueError(f"CSV row requires {field}")
    return value


def _required_float(row: dict[str, Any], field: str) -> float:
    value = _text(row.get(field))
    if not value:
        raise ValueError(f"CSV row requires {field}")
    return float(value)


def _text(value: Any) -> str:
    if value is None:
        return ""
    text = str(value).strip()
    return "" if text.lower() in {"null", "none", "nan"} else text
