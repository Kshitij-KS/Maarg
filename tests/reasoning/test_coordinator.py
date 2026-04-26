from __future__ import annotations

from src.reasoning.agents.coordinator import Coordinator


def test_coordinator_extracts_search_request() -> None:
    intent, request = Coordinator().route(
        "Find emergency C-section near Madhepura within 50km with anesthesiologist"
    )

    assert intent == "search"
    assert request.max_distance_km == 50
    assert request.user_lat is not None
    assert request.user_lon is not None
    assert "c_section" in (request.capabilities_filter or [])
    assert "anesthesiologist_coverage" in (request.capabilities_filter or [])


def test_coordinator_routes_audit() -> None:
    intent, request = Coordinator().route("audit facility F00042 trust evidence")

    assert intent == "audit"
    assert request.text == "audit facility F00042 trust evidence"


def test_coordinator_routes_map() -> None:
    intent, request = Coordinator().route("show desert map for emergency obstetric coverage")

    assert intent == "map"
    assert "emergency_obstetric_care" in (request.capabilities_filter or [])
