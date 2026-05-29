from __future__ import annotations

from app.shared import catalog


def _facility_row() -> dict:
    return {
        "facility_id": "real-1",
        "facility_name": "Real Hospital",
        "pin_code": "800001",
        "state": "Bihar",
        "district": "Patna",
        "lat": 25.61,
        "lon": 85.14,
        "facility_type": "hospital",
        "normalization_version": "csv_databricks_v1",
        "capabilities": [],
        "overall_trust_score": 0.8,
        "extraction_run_ids": ["test"],
        "last_updated": "2026-01-01T00:00:00Z",
    }


def test_real_mode_loads_facility_trust_from_databricks(monkeypatch) -> None:
    class FakeDatabricksGoldCatalog:
        def load_facility_trust(self, *, limit: int | None = None):
            return [_facility_row()]

    monkeypatch.setenv("HACKATHON_MODE", "real")
    monkeypatch.setattr(catalog, "DatabricksGoldCatalog", FakeDatabricksGoldCatalog)
    
    # Invalidate cache to ensure fresh load with new mode
    catalog.invalidate_facility_cache()

    records = catalog.load_facility_trust()

    assert len(records) == 1
    assert records[0].facility_id == "real-1"


def test_real_mode_falls_back_to_mock_when_databricks_fails(monkeypatch) -> None:
    class FailingDatabricksGoldCatalog:
        def load_facility_trust(self, *, limit: int | None = None):
            raise RuntimeError("warehouse unavailable")

    monkeypatch.setenv("HACKATHON_MODE", "real")
    monkeypatch.setattr(catalog, "DatabricksGoldCatalog", FailingDatabricksGoldCatalog)
    
    # Invalidate cache to ensure fresh load with new mode
    catalog.invalidate_facility_cache()

    records = catalog.load_facility_trust()

    assert records
    assert records[0].facility_id.startswith("F")  # Mock facility IDs start with F
