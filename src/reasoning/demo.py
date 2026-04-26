"""No-UI Hour 8 demo runner for the three Money Shot paths."""

from __future__ import annotations

import json
from pathlib import Path
from typing import Any

from src.reasoning.pipeline import ReasoningPipeline
from src.shared.constants import DEMO_CRITICAL_DESERT_PIN
from src.shared.demo_contract import CONFIDENCE_FACILITY_ID, live_catch_request

PROJECT_ROOT = Path(__file__).resolve().parents[2]
OUTPUT_PATH = PROJECT_ROOT / "outputs" / "hour8_smoke.json"


def build_demo_payload() -> dict[str, Any]:
    pipeline = ReasoningPipeline()
    live_catch = pipeline.answer_query(live_catch_request())
    confidence_interval = pipeline.audit_facility(CONFIDENCE_FACILITY_ID)
    desert = pipeline.pin_desert(DEMO_CRITICAL_DESERT_PIN)

    return {
        "live_catch_query_response": live_catch.model_dump(mode="json"),
        "confidence_interval_audit": (
            confidence_interval.model_dump(mode="json") if confidence_interval else None
        ),
        "desert_pin_drill_in": [row.model_dump(mode="json") for row in desert],
    }


def main() -> None:
    OUTPUT_PATH.parent.mkdir(parents=True, exist_ok=True)
    payload = build_demo_payload()
    OUTPUT_PATH.write_text(json.dumps(payload, indent=2), encoding="utf-8")
    print(f"Wrote Hour 8 smoke artifact to {OUTPUT_PATH}")


if __name__ == "__main__":
    main()
