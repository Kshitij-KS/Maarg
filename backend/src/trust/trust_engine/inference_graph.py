from pathlib import Path
from typing import Any

import yaml

from src.shared.schemas import InferenceResult

_YAML_PATH = Path(__file__).resolve().parents[2] / "shared" / "capability_inference.yaml"
_NEGATION_MARKERS = ("no ", "without ", "not available", "absent", "lack of ", "lacks ")


def _load_config() -> dict[str, Any]:
    with _YAML_PATH.open(encoding="utf-8") as file:
        return yaml.safe_load(file)


def _find_matches(required: list[str], observed: list[str]) -> list[str]:
    observed_lower = [item.lower() for item in observed]
    return [
        item.lower()
        for item in required
        if any(
            item.lower() in observed_item and not _is_negated(item.lower(), observed_item)
            for observed_item in observed_lower
        )
    ]


def _is_negated(term: str, observed_item: str) -> bool:
    term_index = observed_item.find(term)
    if term_index == -1:
        return False
    prefix = observed_item[max(0, term_index - 20) : term_index]
    return any(marker in prefix for marker in _NEGATION_MARKERS)


def _missing_required_groups(
    cap_config: dict[str, Any],
    found_required_eq: list[str],
    found_required_staff: list[str],
) -> bool:
    needs_equipment = bool(cap_config.get("required_any_equipment"))
    needs_staff = bool(cap_config.get("required_any_staff"))
    equipment_missing = needs_equipment and not found_required_eq
    staff_missing = needs_staff and not found_required_staff
    return equipment_missing or staff_missing


def compute_inference_signal(
    capability: str,
    claim_present: bool,
    extracted_equipment: list[str],
    extracted_staff: list[str],
) -> InferenceResult:
    """
    Signal 4: determine whether extracted equipment/staff supports a capability claim.
    """
    config = _load_config()
    cap_config = config.get("inferences", {}).get(capability)
    if cap_config is None:
        return InferenceResult(
            inferred_present=None,
            inference_confidence=0.5,
            supporting_equipment=[],
            contradictions=[],
            inference_flags=["CAPABILITY_NOT_IN_INFERENCE_GRAPH"],
        )

    found_required_eq = _find_matches(
        cap_config.get("required_any_equipment", []),
        extracted_equipment,
    )
    found_required_staff = _find_matches(cap_config.get("required_any_staff", []), extracted_staff)
    found_supporting = _find_matches(
        cap_config.get("supporting_equipment", []),
        extracted_equipment,
    )

    has_required = not _missing_required_groups(cap_config, found_required_eq, found_required_staff)
    base_confidence = float(cap_config.get("base_confidence", 0.5))

    contradictions: list[str] = []
    flags: list[str] = []

    if has_required:
        support_boost = min(0.2, len(found_supporting) * 0.04)
        confidence = min(0.95, base_confidence + support_boost)
        inferred_present = True
    else:
        confidence = 0.1
        inferred_present = False
        if claim_present:
            contradiction_config = config.get("contradictions", {}).get(capability, {})
            contradictions.append(
                str(
                    contradiction_config.get(
                        "description",
                        f"Claims {capability} but no required equipment found",
                    )
                )
            )
            flag = contradiction_config.get("claim_flag", "EQUIPMENT_CLAIM_MISMATCH")
            flags.append(str(flag))
            score_cap = float(contradiction_config.get("inference_score_cap", 0.15))
            confidence = min(confidence, score_cap)

    return InferenceResult(
        inferred_present=inferred_present,
        inference_confidence=confidence,
        supporting_equipment=found_required_eq + found_required_staff + found_supporting,
        contradictions=contradictions,
        inference_flags=flags,
    )
