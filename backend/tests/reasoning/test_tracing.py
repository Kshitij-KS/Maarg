from __future__ import annotations

from pathlib import Path

from app.reasoning.tracing.mlflow_setup import (
    current_trace_id,
    fallback_trace_spans,
    traced,
)


@traced("tests.traced_noop")
def traced_noop() -> str:
    trace_id = current_trace_id()
    assert trace_id
    return trace_id


def test_traced_function_exposes_trace_id_and_creates_local_store() -> None:
    trace_id = traced_noop()

    assert trace_id
    assert Path("mlruns").exists()


def test_fallback_trace_store_evicts_old_entries(monkeypatch) -> None:
    monkeypatch.setenv("MLFLOW_FALLBACK_TRACE_LIMIT", "2")
    first = traced_noop()
    second = traced_noop()
    third = traced_noop()

    assert fallback_trace_spans(first) == []
    assert fallback_trace_spans(second)
    assert fallback_trace_spans(third)
