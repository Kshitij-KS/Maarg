"""Coordinator agent: query text to intent + structured `QueryRequest`."""

from __future__ import annotations

import re
from typing import Literal

from app.reasoning.tracing.mlflow_setup import set_trace_attributes, traced
from app.shared.constants import CAPABILITY_KEYWORDS, DEMO_MADHEPURA_LAT, DEMO_MADHEPURA_LON
from app.shared.schemas import QueryRequest

Intent = Literal["search", "audit", "map"]

LOCATION_ALIASES: dict[str, tuple[float, float]] = {
    "madhepura": (DEMO_MADHEPURA_LAT, DEMO_MADHEPURA_LON),
    "madhepura bihar": (DEMO_MADHEPURA_LAT, DEMO_MADHEPURA_LON),
}


class Coordinator:
    """Deterministic Hour 0-8 coordinator.

    Regex first keeps smoke tests stable. A small LLM fallback can be added later
    without changing the returned contract.
    """

    @traced("coordinator.route")
    def route(self, text: str, **overrides: object) -> tuple[Intent, QueryRequest]:
        normalized = text.strip()
        lower = normalized.lower()
        intent = self._classify_intent(lower)

        max_distance = overrides.get("max_distance_km")
        if max_distance is None:
            max_distance = self._extract_distance_km(lower)

        capabilities = overrides.get("capabilities_filter")
        if capabilities is None:
            capabilities = self._extract_capabilities(lower)

        user_lat = overrides.get("user_lat")
        user_lon = overrides.get("user_lon")
        if user_lat is None or user_lon is None:
            coordinates = self._extract_location(lower)
            if coordinates is not None:
                user_lat, user_lon = coordinates

        request = QueryRequest(
            text=normalized,
            user_lat=self._optional_float(user_lat),
            user_lon=self._optional_float(user_lon),
            max_distance_km=self._optional_float(max_distance),
            min_trust_score=float(overrides.get("min_trust_score", 0.5)),
            capabilities_filter=list(capabilities) if capabilities else None,
            top_k=int(overrides.get("top_k", 10)),
        )
        set_trace_attributes(
            {
                "intent": intent,
                "max_distance_km": request.max_distance_km,
                "min_trust_score": request.min_trust_score,
                "top_k": request.top_k,
                "capability_count": len(request.capabilities_filter or []),
            }
        )
        return intent, request

    def _classify_intent(self, text: str) -> Intent:
        if re.search(r"\b(map|desert|coverage|underserved)\b", text):
            return "map"
        if re.search(r"\b(audit|trust|why|explain|facility\s+[a-z0-9-]+|f\d{5})\b", text):
            return "audit"
        return "search"

    def _extract_distance_km(self, text: str) -> float | None:
        match = re.search(r"\b(?:within|under|inside)\s+(\d+(?:\.\d+)?)\s*km\b", text)
        return float(match.group(1)) if match else None

    def _extract_capabilities(self, text: str) -> list[str]:
        capabilities: list[str] = []
        for capability, keywords in CAPABILITY_KEYWORDS.items():
            if any(keyword in text for keyword in keywords):
                capabilities.append(capability)
        if "emergency" in text and "c_section" in capabilities:
            capabilities.append("emergency_obstetric_care")
        if "maternal" in text and "emergency_obstetric_care" not in capabilities:
            capabilities.append("emergency_obstetric_care")
        if "newborn" in text and "nicu" not in capabilities:
            capabilities.append("nicu")
        return sorted(set(capabilities))

    def _extract_location(self, text: str) -> tuple[float, float] | None:
        for alias, coordinates in LOCATION_ALIASES.items():
            if alias in text:
                return coordinates
        return None

    def _optional_float(self, value: object) -> float | None:
        if value is None:
            return None
        return float(value)
