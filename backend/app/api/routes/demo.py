"""Demo scenarios used by the frontend and pitch rehearsal."""

from __future__ import annotations

from fastapi import APIRouter

from app.api.schemas import DemoMoment, DemoMomentsResponse, DemoScenario, DemoScenariosResponse
from app.shared.constants import DEMO_CRITICAL_DESERT_PIN
from app.shared.demo_contract import (
    CONFIDENCE_FACILITY_ID,
    DESERT_CAPABILITY,
    EXPECTED_LIVE_CATCH_FLAG,
    FLAGGED_FACILITY_ID,
    canonical_demo_scenarios,
    live_catch_request,
)

router = APIRouter(prefix="/api", tags=["demo"])


@router.get("/demo-scenarios", response_model=DemoScenariosResponse)
def demo_scenarios() -> DemoScenariosResponse:
    return DemoScenariosResponse(
        scenarios=[
            DemoScenario(
                id=scenario.id,
                label=scenario.label,
                description=scenario.description,
                request=scenario.request,
            )
            for scenario in canonical_demo_scenarios()
        ]
    )


@router.get("/demo-moments", response_model=DemoMomentsResponse)
def demo_moments() -> DemoMomentsResponse:
    return DemoMomentsResponse(
        moments=[
            DemoMoment(
                id="live-catch",
                title="The Live Catch",
                endpoint="/api/query",
                request=live_catch_request(),
                target_facility_id=FLAGGED_FACILITY_ID,
                expected_flag=EXPECTED_LIVE_CATCH_FLAG,
                success_criteria=[
                    "Query returns a nearby flagged facility alongside verified candidates.",
                    (
                        "The flagged facility evidence endpoint exposes the "
                        "missing anesthesiologist flag."
                    ),
                    "Critic verdict is partial when flagged claims appear in the candidate set.",
                ],
                design_notes=[
                    "Render F00002 dimmed with an amber flag badge.",
                    (
                        "Open /api/facility/F00002/evidence to show the "
                        "contradicting staffing sentence."
                    ),
                ],
            ),
            DemoMoment(
                id="confidence-interval",
                title="Calibrated Confidence",
                endpoint=f"/api/facility/{CONFIDENCE_FACILITY_ID}/evidence",
                target_facility_id=CONFIDENCE_FACILITY_ID,
                success_criteria=[
                    "Dialysis claim exposes trust score, CI low, CI high, and signal scores.",
                    "Frontend renders interval as range, not a hard yes/no.",
                ],
                design_notes=[
                    "Use mono numerals for 0.78 and CI 0.66-0.86.",
                    "Explain wider intervals as calibrated uncertainty, not model weakness.",
                ],
            ),
            DemoMoment(
                id="desert-map",
                title="The Desert Map",
                endpoint=f"/api/desert/summary?capability={DESERT_CAPABILITY}",
                target_pin_code=DEMO_CRITICAL_DESERT_PIN,
                success_criteria=[
                    "Summary includes at least one critical Bihar/Jharkhand desert row.",
                    "Population at risk is computed from critical desert rows.",
                    "Top deserts are sorted by desert_score descending.",
                ],
                design_notes=[
                    "Use the top_deserts array for hover cards and side-sheet seed data.",
                    "Use population_at_risk as the map headline metric.",
                ],
            ),
        ]
    )
