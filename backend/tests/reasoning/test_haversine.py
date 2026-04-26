from __future__ import annotations

from app.reasoning.agents.geo_reasoner import haversine_km


def test_haversine_madhepura_to_patna_is_reasonable() -> None:
    # Madhepura, Bihar -> Patna, Bihar is roughly 170-180 km by great-circle distance.
    distance = haversine_km(25.92, 86.79, 25.61, 85.14)

    assert 160 <= distance <= 180
