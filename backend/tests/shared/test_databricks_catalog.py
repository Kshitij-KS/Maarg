from __future__ import annotations

import sys
import types

import pytest

from app.shared.databricks_catalog import DatabricksGoldCatalog


def test_databricks_catalog_explains_missing_sql_connector(monkeypatch) -> None:
    databricks_module = types.ModuleType("databricks")
    sql_module = types.ModuleType("databricks.sql")
    databricks_module.sql = sql_module
    monkeypatch.setitem(sys.modules, "databricks", databricks_module)
    monkeypatch.setitem(sys.modules, "databricks.sql", sql_module)

    monkeypatch.setenv("HACKATHON_MODE", "real")
    monkeypatch.setenv("DATABRICKS_SERVER_HOSTNAME", "adb.example.databricks.com")
    monkeypatch.setenv("DATABRICKS_HTTP_PATH", "/sql/1.0/warehouses/test")
    monkeypatch.setenv("DATABRICKS_TOKEN", "token")

    # Test that it raises RuntimeError when connector is not properly installed
    with pytest.raises(RuntimeError):
        DatabricksGoldCatalog().load_facility_trust()
