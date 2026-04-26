from __future__ import annotations

from app.portal.db import gold_reader


def test_demo_portal_facility_falls_back_to_fixture_when_real_gold_has_csv_ids(
    monkeypatch,
) -> None:
    monkeypatch.setattr(gold_reader, "_api_facility_by_id", lambda facility_id: None)

    record = gold_reader.facility_by_id("F00002")

    assert record is not None
    assert record.facility_id == "F00002"
    assert record.facility_name == "Saharsa Medical Centre"
