from __future__ import annotations

from app.api.settings import get_settings


def test_databricks_settings_parse_real_mode_env(monkeypatch) -> None:
    get_settings.cache_clear()
    monkeypatch.setenv("HACKATHON_MODE", "real")
    monkeypatch.setenv("DATABRICKS_SERVER_HOSTNAME", "adb-123.azuredatabricks.net")
    monkeypatch.setenv("DATABRICKS_HTTP_PATH", "/sql/1.0/warehouses/abc")
    monkeypatch.setenv("DATABRICKS_TOKEN", "token")
    monkeypatch.setenv("DATABRICKS_CATALOG", "maarg")
    monkeypatch.setenv("DATABRICKS_SCHEMA", "truth_layer")
    monkeypatch.setenv("DATABRICKS_FACILITY_TRUST_TABLE", "gold_facility_trust")
    monkeypatch.setenv("DATABRICKS_PIN_DESERT_TABLE", "gold_pin_desert")

    settings = get_settings()

    assert settings.hackathon_mode == "real"
    assert settings.databricks_server_hostname == "adb-123.azuredatabricks.net"
    assert settings.databricks_http_path == "/sql/1.0/warehouses/abc"
    assert settings.databricks_token == "token"
    assert settings.databricks_facility_trust_table_full_name == (
        "maarg.truth_layer.gold_facility_trust"
    )
    assert settings.databricks_pin_desert_table_full_name == (
        "maarg.truth_layer.gold_pin_desert"
    )
    assert settings.databricks_configured is True


def test_databricks_settings_are_optional_in_mock_mode(monkeypatch) -> None:
    get_settings.cache_clear()
    monkeypatch.setenv("HACKATHON_MODE", "mock")
    monkeypatch.delenv("DATABRICKS_SERVER_HOSTNAME", raising=False)
    monkeypatch.delenv("DATABRICKS_HTTP_PATH", raising=False)
    monkeypatch.delenv("DATABRICKS_TOKEN", raising=False)

    settings = get_settings()

    assert settings.hackathon_mode == "mock"
    assert settings.databricks_configured is False
