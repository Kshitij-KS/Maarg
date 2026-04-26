from __future__ import annotations

import json

from app.reasoning import demo
from app.shared.demo_contract import EXPECTED_LIVE_CATCH_FLAG, FLAGGED_FACILITY_ID
from app.shared.schemas import FacilityTrustRecord, PinCodeDesert, QueryResponse


def test_demo_writes_hour8_smoke_artifact() -> None:
    demo.main()

    assert demo.OUTPUT_PATH.exists()
    payload = json.loads(demo.OUTPUT_PATH.read_text(encoding="utf-8"))

    query_response = QueryResponse.model_validate(payload["live_catch_query_response"])
    assert query_response.critic_verdict == "partial"
    flagged = next(c for c in query_response.candidates if c.facility_id == FLAGGED_FACILITY_ID)
    assert any(EXPECTED_LIVE_CATCH_FLAG in claim.flags for claim in flagged.capabilities)
    FacilityTrustRecord.model_validate(payload["confidence_interval_audit"])
    desert_rows = payload["desert_pin_drill_in"]
    assert desert_rows
    assert {row["pin_code"] for row in desert_rows} == {"855107"}
    for row in desert_rows:
        PinCodeDesert.model_validate(row)
