from datetime import datetime
from typing import Any

from src.shared.schemas import FacilityTrustRecord
from src.trust.trust_engine.aggregator import aggregate_trust_score, provisional_interval
from src.trust.trust_engine.data_completeness import compute_data_completeness_flags
from src.trust.trust_engine.evidence_quality import (
    evaluate_citation_quality,
    evidence_quality_penalty,
)


def _dedupe_flags(flags: list[str]) -> list[str]:
    return list(dict.fromkeys(flags))


def _inference_flags(row: dict[str, Any]) -> list[str]:
    detail = row.get("inference_detail") or {}
    if not isinstance(detail, dict):
        return []
    return list(detail.get("inference_flags", []))


def build_facility_trust_record(
    facility_id: str,
    facility_name: str,
    pin_code: str,
    state: str,
    district: str,
    lat: float,
    lon: float,
    facility_type: str,
    normalization_version: str,
    extraction_run_id: str,
    last_updated: datetime,
    capability_rows: list[dict[str, Any]],
) -> dict[str, Any]:
    capabilities: list[dict[str, Any]] = []
    for row in capability_rows:
        flags = _dedupe_flags(list(row.get("flags", [])) + _inference_flags(row))
        if "peer_anomaly_score" not in row:
            row = {**row, "peer_anomaly_score": 0.5}
            flags.append("PEER_ANOMALY_NOT_COMPUTED")
        citation_flags = evaluate_citation_quality(
            list(row.get("citations", [])),
            row.get("source_fields") if isinstance(row.get("source_fields"), dict) else None,
        )
        flags.extend(citation_flags)
        metadata = row.get("facility_metadata")
        if isinstance(metadata, dict):
            flags.extend(compute_data_completeness_flags(metadata))
        trust_score = aggregate_trust_score(
            self_consistency=float(row["self_consistency_score"]),
            coherence=float(row["coherence_score"]),
            peer_anomaly=float(row["peer_anomaly_score"]),
            inference=float(row["inference_score"]),
            flags=_dedupe_flags(flags),
        )
        trust_score = max(0.0, round(trust_score - evidence_quality_penalty(flags), 4))
        low, high, flags = provisional_interval(trust_score, existing_flags=_dedupe_flags(flags))
        capabilities.append(
            {
                **row,
                "trust_score": trust_score,
                "confidence_interval_low": low,
                "confidence_interval_high": high,
                "flags": flags,
            }
        )

    overall = (
        round(sum(claim["trust_score"] for claim in capabilities) / len(capabilities), 4)
        if capabilities
        else 0.0
    )
    record = {
        "facility_id": facility_id,
        "facility_name": facility_name,
        "pin_code": pin_code,
        "state": state,
        "district": district,
        "lat": lat,
        "lon": lon,
        "facility_type": facility_type,
        "normalization_version": normalization_version,
        "capabilities": capabilities,
        "overall_trust_score": overall,
        "extraction_run_ids": [extraction_run_id],
        "last_updated": last_updated,
    }
    return FacilityTrustRecord.model_validate(record).model_dump(mode="json")
