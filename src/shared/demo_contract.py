"""Canonical hackathon demo payloads shared by API and smoke runner."""

from __future__ import annotations

from dataclasses import dataclass

from src.shared.constants import (
    DEMO_CRITICAL_DESERT_PIN,
    DEMO_MADHEPURA_LAT,
    DEMO_MADHEPURA_LON,
)
from src.shared.schemas import QueryRequest

LIVE_CATCH_ID = "live-catch"
CONFIDENCE_INTERVAL_ID = "confidence-interval"
DESERT_MAP_ID = "desert-map"

CONFIDENCE_FACILITY_ID = "F00042"
FLAGGED_FACILITY_ID = "F00002"
EXPECTED_LIVE_CATCH_FLAG = "MISSING_ANESTHESIOLOGIST"
DESERT_CAPABILITY = "emergency_obstetric_care"


@dataclass(frozen=True)
class DemoScenarioSpec:
    id: str
    label: str
    description: str
    request: QueryRequest


def live_catch_request() -> QueryRequest:
    return QueryRequest(
        text="Emergency C-section near Madhepura within 50km",
        user_lat=DEMO_MADHEPURA_LAT,
        user_lon=DEMO_MADHEPURA_LON,
        max_distance_km=50,
        min_trust_score=0.3,
        capabilities_filter=["c_section", DESERT_CAPABILITY],
        top_k=10,
    )


def canonical_demo_scenarios() -> tuple[DemoScenarioSpec, ...]:
    return (
        DemoScenarioSpec(
            id=LIVE_CATCH_ID,
            label="Live Catch",
            description="Find a flagged near-miss beside verified emergency obstetric care.",
            request=live_catch_request(),
        ),
        DemoScenarioSpec(
            id=CONFIDENCE_INTERVAL_ID,
            label="Calibrated Confidence",
            description="Audit dialysis confidence and citation support.",
            request=QueryRequest(
                text=f"audit dialysis at facility {CONFIDENCE_FACILITY_ID}",
                min_trust_score=0.5,
                top_k=1,
            ),
        ),
        DemoScenarioSpec(
            id=DESERT_MAP_ID,
            label="Desert Map",
            description="Explore emergency obstetric deserts and population at risk.",
            request=QueryRequest(
                text=(
                    "desert score for emergency obstetric care in pin "
                    f"{DEMO_CRITICAL_DESERT_PIN}"
                ),
                capabilities_filter=[DESERT_CAPABILITY],
                top_k=10,
            ),
        ),
    )
