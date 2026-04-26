"""Gold table access for the Reasoning Layer.

Hour 0-28 uses JSON fixtures so Person B never blocks on Person A's pipeline.
Hour 28+ swaps to Unity Catalog by setting `HACKATHON_MODE=real`.
"""

from __future__ import annotations

import json
import os
from pathlib import Path
from typing import Any, TypeVar

from pydantic import BaseModel

from src.shared.schemas import FacilityTrustRecord, PinCodeDesert

PROJECT_ROOT = Path(__file__).resolve().parents[2]
FIXTURES_DIR = PROJECT_ROOT / "fixtures"
MOCK_FACILITY_TRUST_PATH = FIXTURES_DIR / "mock_gold_facility_trust.json"
MOCK_PIN_DESERT_PATH = FIXTURES_DIR / "mock_gold_pin_desert.json"

T = TypeVar("T", bound=BaseModel)


def use_mock_gold() -> bool:
    """Return whether the reasoning layer should read JSON fixtures."""

    return os.getenv("HACKATHON_MODE", "mock").lower() == "mock"


def current_mode() -> str:
    """Return the externally visible mode string used by `/healthz`."""

    return "mock" if use_mock_gold() else "real"


def _load_json_records(path: Path, model: type[T]) -> list[T]:
    if not path.exists():
        raise FileNotFoundError(
            f"Missing mock Gold fixture: {path}. "
            "Ask Person A for fixtures/mock_gold_*.json or run scripts/seed_fixtures.py."
        )
    with path.open("r", encoding="utf-8") as handle:
        payload: Any = json.load(handle)
    if not isinstance(payload, list):
        raise ValueError(f"Fixture {path} must contain a JSON list.")
    return [model.model_validate(row) for row in payload]


def load_facility_trust() -> list[FacilityTrustRecord]:
    """Load `gold.facility_trust` through the mock/real switch."""

    if use_mock_gold():
        return _load_json_records(MOCK_FACILITY_TRUST_PATH, FacilityTrustRecord)
    raise NotImplementedError(
        "HACKATHON_MODE=real is reserved for Hour 28+. "
        "Wire Databricks SQL reads from main.gold.facility_trust here."
    )


def load_pin_desert() -> list[PinCodeDesert]:
    """Load `gold.pin_code_desert` through the mock/real switch."""

    if use_mock_gold():
        return _load_json_records(MOCK_PIN_DESERT_PATH, PinCodeDesert)
    raise NotImplementedError(
        "HACKATHON_MODE=real is reserved for Hour 28+. "
        "Wire Databricks SQL reads from main.gold.pin_code_desert here."
    )
