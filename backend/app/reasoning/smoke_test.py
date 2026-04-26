"""Backend-only Hour 2-6 smoke test."""

from __future__ import annotations

from app.reasoning.pipeline import ReasoningPipeline
from app.shared.constants import DEMO_MADHEPURA_LAT, DEMO_MADHEPURA_LON
from app.shared.schemas import QueryRequest


def main() -> None:
    response = ReasoningPipeline().answer_query(
        QueryRequest(
            text="emergency C-section near Madhepura within 50km with anesthesiologist",
            user_lat=DEMO_MADHEPURA_LAT,
            user_lon=DEMO_MADHEPURA_LON,
            max_distance_km=50,
            min_trust_score=0.5,
            top_k=10,
        )
    )
    print(response.model_dump_json(indent=2))


if __name__ == "__main__":
    main()
