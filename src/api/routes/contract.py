"""Frontend contract endpoint for Claude Design handoff."""

from __future__ import annotations

from fastapi import APIRouter

from src.api.schemas import EndpointContract, FrontendContractResponse

router = APIRouter(prefix="/api", tags=["contract"])


@router.get("/frontend-contract", response_model=FrontendContractResponse)
def frontend_contract() -> FrontendContractResponse:
    return FrontendContractResponse(
        product_name="Veritas Health",
        frontend_owner="Claude Design",
        backend_owner="Person B Reasoning Layer",
        constraints=[
            "Do not invent response fields; consume these endpoints or request a backend addition.",
            "Treat src/shared/schemas.py as locked shared contract data.",
            "Render confidence intervals as calibrated ranges, not binary truth labels.",
            "Every trust claim should have a visible evidence affordance.",
            "Frontend implementation owns web/**; backend owns API and reasoning behavior.",
        ],
        endpoints=[
            EndpointContract(
                method="POST",
                path="/api/query",
                purpose="Search facilities through Coordinator -> Geo-Reasoner -> Critic.",
                response_model="src.shared.schemas.QueryResponse",
                notes=[
                    "Use candidates for result cards.",
                    "Use citations_per_candidate for inline evidence affordances.",
                    "Use critic_verdict and critic_reasoning for the verdict panel.",
                ],
            ),
            EndpointContract(
                method="GET",
                path="/api/facility/{facility_id}",
                purpose="Fetch the locked Gold facility record.",
                response_model="src.shared.schemas.FacilityTrustRecord",
            ),
            EndpointContract(
                method="GET",
                path="/api/facility/{facility_id}/evidence",
                purpose=(
                    "Fetch audit-page evidence, signal breakdowns, flags, "
                    "and citation snippets."
                ),
                response_model="src.api.schemas.FacilityEvidenceResponse",
            ),
            EndpointContract(
                method="GET",
                path="/api/desert",
                purpose="Fetch raw PIN-code desert rows for map rendering.",
                response_model="list[src.shared.schemas.PinCodeDesert]",
            ),
            EndpointContract(
                method="GET",
                path="/api/desert/summary",
                purpose="Fetch headline map metrics, top deserts, and state/capability rollups.",
                response_model="src.api.schemas.DesertSummary",
            ),
            EndpointContract(
                method="GET",
                path="/api/trace/{trace_id}/timeline",
                purpose="Fetch trace spans as frontend narrative nodes.",
                response_model="src.api.schemas.TraceTimelineResponse",
            ),
            EndpointContract(
                method="GET",
                path="/api/demo-moments",
                purpose="Fetch the three pitch-critical demo moments and expected outcomes.",
                response_model="src.api.schemas.DemoMomentsResponse",
            ),
        ],
        demo_sequence=[
            "Run /api/demo-moments and select live-catch.",
            "POST the live-catch request to /api/query.",
            "Open /api/facility/F00002/evidence to show the contradiction.",
            "Open /api/facility/F00042/evidence to show calibrated confidence.",
            "Open /api/desert/summary?capability=emergency_obstetric_care for map impact.",
        ],
        field_notes={
            "overall_trust_score": "Facility-level trust score from Person A Gold data.",
            "trust_score": "Capability-level aggregate score; render with CI.",
            "confidence_interval_low": "Lower calibrated confidence bound.",
            "confidence_interval_high": "Upper calibrated confidence bound.",
            "flags": "Machine-readable issues such as MISSING_ANESTHESIOLOGIST.",
            "citations": "Exact source sentence and char range for evidence display.",
            "desert_score": "Higher means more medically deserted.",
            "trace_id": "Use with /api/trace/{trace_id}/timeline for reasoning narrative.",
        },
    )
