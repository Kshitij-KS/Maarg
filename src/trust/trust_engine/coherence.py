from dataclasses import dataclass
from pathlib import Path
from typing import Any

import yaml

_YAML_PATH = Path(__file__).resolve().parents[2] / "shared" / "capability_requirements.yaml"


@dataclass(frozen=True)
class CoherenceResult:
    score: float
    flags: list[str]


def _load_config() -> dict[str, Any]:
    with _YAML_PATH.open(encoding="utf-8") as file:
        return yaml.safe_load(file)


def _has_any(required: list[str], observed: list[str]) -> bool:
    observed_lower = [item.lower() for item in observed]
    return any(req.lower() in item for req in required for item in observed_lower)


def compute_coherence_signal(
    capability: str,
    claim_present: bool,
    extracted_equipment: list[str],
    extracted_staff: list[str],
) -> CoherenceResult:
    if not claim_present:
        return CoherenceResult(score=0.5, flags=["CAPABILITY_NOT_CLAIMED"])

    requirements = _load_config().get("requirements", {}).get(capability)
    if requirements is None:
        return CoherenceResult(score=0.5, flags=["CAPABILITY_NOT_IN_REQUIREMENTS"])

    flags: list[str] = []
    score = 1.0

    if not _has_any(requirements.get("required_equipment_any", []), extracted_equipment):
        flags.append(str(requirements.get("missing_equipment_flag", "missing_required_equipment")))
        score -= 0.4

    if not _has_any(requirements.get("required_staff_any", []), extracted_staff):
        flags.append(str(requirements.get("missing_staff_flag", "missing_required_staff")))
        score -= 0.55

    return CoherenceResult(score=max(0.0, round(score, 4)), flags=flags)
